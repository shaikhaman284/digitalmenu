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
            // If rSnap doesn't exist, restaurantNames[id] stays undefined
            // — the QR is orphaned (restaurant was deleted)
          })
        );
      }

      const qrCodes = snap.docs
        .map((d) => {
          const data = d.data();
          const rid = data.restaurant_id as string | null;
          // Detect orphaned QRs: status is 'bound' but restaurant no longer exists
          const isOrphaned = data.status === 'bound' && !!rid && !restaurantNames[rid];
          return {
            slug: d.id,
            status: data.status as string,
            restaurant_id: rid,
            restaurant_name: rid ? (restaurantNames[rid] ?? null) : null,
            is_orphaned: isOrphaned,
            bound_at: data.bound_at?.toDate?.()?.toISOString() ?? null,
            created_at: data.created_at?.toDate?.()?.toISOString() ?? null,
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

/**
 * PATCH /api/admin/qr-batches?slug=MQ-0001
 *   → Unbind a single QR code (reset to unbound without deleting it).
 *     Useful for fixing orphaned QR codes whose restaurant was deleted.
 */
export async function PATCH(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('mq_session')?.value;
  if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await verifyAdmin(sessionCookie);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: 'Provide ?slug=MQ-xxxx' }, { status: 400 });

  try {
    const adminDb = getAdminDb();
    const qrRef = adminDb.collection('qr_codes').doc(slug);
    const qrSnap = await qrRef.get();
    if (!qrSnap.exists) return NextResponse.json({ error: 'QR code not found' }, { status: 404 });

    await qrRef.update({
      status: 'unbound',
      restaurant_id: null,
      bound_at: null,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/qr-batches?slug=MQ-0001
 *   → Delete a single QR code. If it was bound, clears qr_slug on the restaurant too.
 *
 * DELETE /api/admin/qr-batches?batch=BATCH-01
 *   → Delete ALL QR codes in a batch. Releases any bound restaurants.
 */
export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('mq_session')?.value;
  if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await verifyAdmin(sessionCookie);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const batchName = searchParams.get('batch');
  const adminDb = getAdminDb();

  try {
    // ── Delete a single QR code ────────────────────────────────────────────
    if (slug) {
      const qrRef = adminDb.collection('qr_codes').doc(slug);
      const qrSnap = await qrRef.get();

      if (!qrSnap.exists) {
        return NextResponse.json({ error: 'QR code not found' }, { status: 404 });
      }

      const qrData = qrSnap.data()!;
      const writeBatch = adminDb.batch();

      // If it was bound, clear the restaurant's qr_slug so menu goes offline
      if (qrData.status === 'bound' && qrData.restaurant_id) {
        const restRef = adminDb.collection('restaurants').doc(qrData.restaurant_id as string);
        const restSnap = await restRef.get();
        // Only clear if this restaurant still points to this slug
        if (restSnap.exists && restSnap.data()?.qr_slug === slug) {
          writeBatch.update(restRef, { qr_slug: '' });
        }
      }

      writeBatch.delete(qrRef);
      await writeBatch.commit();

      return NextResponse.json({ success: true, deleted: 1 });
    }

    // ── Delete entire batch ────────────────────────────────────────────────
    if (batchName) {
      const snap = await adminDb
        .collection('qr_codes')
        .where('batch', '==', batchName)
        .get();

      if (snap.empty) {
        return NextResponse.json({ error: 'Batch not found or already empty' }, { status: 404 });
      }

      // Firestore batch supports up to 500 ops — chunk if needed
      const CHUNK = 400; // 2 ops per bound QR (delete + update restaurant)
      let deleted = 0;

      for (let i = 0; i < snap.docs.length; i += CHUNK) {
        const chunk = snap.docs.slice(i, i + CHUNK);
        const writeBatch = adminDb.batch();

        for (const doc of chunk) {
          const data = doc.data();
          // Release restaurant if this QR was its active slug
          if (data.status === 'bound' && data.restaurant_id) {
            const restRef = adminDb.collection('restaurants').doc(data.restaurant_id as string);
            const restSnap = await restRef.get();
            if (restSnap.exists && restSnap.data()?.qr_slug === doc.id) {
              writeBatch.update(restRef, { qr_slug: '' });
            }
          }
          writeBatch.delete(doc.ref);
          deleted++;
        }

        await writeBatch.commit();
      }

      return NextResponse.json({ success: true, deleted });
    }

    return NextResponse.json(
      { error: 'Provide ?slug=MQ-xxxx or ?batch=BATCH-xx' },
      { status: 400 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
