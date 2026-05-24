import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

async function verifyAdmin(sessionCookie: string) {
  const adminAuth = getAdminAuth();
  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  if (!decoded.admin) throw new Error('Forbidden');
}

/**
 * GET /api/admin/qr-batches
 *   → Returns list of all batches with counts
 *
 * GET /api/admin/qr-batches?batch=BATCH-01
 *   → Returns all QR codes in that batch with bind status
 *
 * GET /api/admin/qr-batches?nextStart=1
 *   → Returns the next available start number (highest slug num + 1)
 */
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('mq_session')?.value;
  if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await verifyAdmin(sessionCookie);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const batchFilter = searchParams.get('batch');
  const nextStartMode = searchParams.get('nextStart');
  const adminDb = getAdminDb();

  try {
    // ── Mode: get next available start number ─────────────────────────────
    if (nextStartMode !== null) {
      const snap = await adminDb.collection('qr_codes').get();
      let maxNum = 0;
      for (const doc of snap.docs) {
        // Slug format: MQ-0001
        const match = doc.id.match(/^MQ-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      return NextResponse.json({ nextStart: maxNum + 1 });
    }

    // ── Mode: get individual QR codes in a batch ───────────────────────────
    if (batchFilter) {
      const snap = await adminDb
        .collection('qr_codes')
        .where('batch', '==', batchFilter)
        .get();

      // Fetch bound restaurant names for display
      const restaurantIds = [...new Set(
        snap.docs
          .map((d) => d.data().restaurant_id as string | null)
          .filter(Boolean) as string[]
      )];

      const restaurantNames: Record<string, string> = {};
      if (restaurantIds.length > 0) {
        await Promise.all(
          restaurantIds.map(async (id) => {
            const rSnap = await adminDb.collection('restaurants').doc(id).get();
            if (rSnap.exists) {
              restaurantNames[id] = (rSnap.data()?.name as string) || id;
            }
          })
        );
      }

      const qrCodes = snap.docs
        .map((d) => {
          const data = d.data();
          const boundAt = data.bound_at?.toDate?.()?.toISOString() ?? null;
          const createdAt = data.created_at?.toDate?.()?.toISOString() ?? null;
          return {
            slug: d.id,
            status: data.status as string,
            restaurant_id: data.restaurant_id as string | null,
            restaurant_name: data.restaurant_id ? (restaurantNames[data.restaurant_id] ?? null) : null,
            bound_at: boundAt,
            created_at: createdAt,
          };
        })
        .sort((a, b) => a.slug.localeCompare(b.slug));

      return NextResponse.json({ qrCodes });
    }

    // ── Mode: list all batches with summary counts ─────────────────────────
    const snap = await adminDb.collection('qr_codes').get();

    const batchMap: Record<string, {
      batch: string;
      total: number;
      bound: number;
      unbound: number;
      createdAt: string | null;
    }> = {};

    for (const doc of snap.docs) {
      const data = doc.data();
      const batch = (data.batch as string) || 'Unknown';
      if (!batchMap[batch]) {
        batchMap[batch] = { batch, total: 0, bound: 0, unbound: 0, createdAt: null };
      }
      batchMap[batch].total++;
      if (data.status === 'bound') {
        batchMap[batch].bound++;
      } else {
        batchMap[batch].unbound++;
      }
      // Use earliest created_at as batch creation time
      const createdAt = data.created_at?.toDate?.()?.toISOString() ?? null;
      if (createdAt && (!batchMap[batch].createdAt || createdAt < batchMap[batch].createdAt!)) {
        batchMap[batch].createdAt = createdAt;
      }
    }

    const batches = Object.values(batchMap).sort((a, b) =>
      (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
    );

    return NextResponse.json({ batches });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
