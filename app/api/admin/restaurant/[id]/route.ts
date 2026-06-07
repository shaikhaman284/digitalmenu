import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

async function verifyAdmin() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('mq_session')?.value;
  if (!sessionCookie) throw new Error('Unauthorized');
  const decoded = await getAdminAuth().verifySessionCookie(sessionCookie, true);
  if (!decoded.admin) throw new Error('Forbidden');
}

// GET /api/admin/restaurant/[id]
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await verifyAdmin();
    const { id } = await params;
    const adminDb = getAdminDb();

    const [restSnap, itemsSnap] = await Promise.all([
      adminDb.collection('restaurants').doc(id).get(),
      adminDb.collection('restaurants').doc(id).collection('menu_items').orderBy('display_order', 'asc').get(),
    ]);

    if (!restSnap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const r = restSnap.data()!;
    const expiresAt = r.plan_expires_at?.toDate?.() ?? null;

    // Fetch current month's AI import count
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const countSnap = await adminDb
      .collection('restaurants').doc(id)
      .collection('ai_import_counts').doc(monthKey)
      .get();
    const aiImportsThisMonth = countSnap.exists ? (countSnap.data() as { count: number }).count : 0;

    return NextResponse.json({
      restaurant: {
        id: restSnap.id,
        name: r.name,
        phone: r.phone,
        location: r.location || '',
        plan: r.plan,
        is_active: r.is_active,
        plan_expires_at: expiresAt?.toISOString() ?? null,
        qr_slug: r.qr_slug || '',
        uid: r.uid,
        ai_import_limit: (r.ai_import_limit as number) ?? 5,
        ai_imports_this_month: aiImportsThisMonth,
      },
      menuItems: itemsSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name,
          category: data.category,
          price: data.price,
          is_available: data.is_available,
          like_count: data.like_count || 0,
        };
      }),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: msg }, { status: msg === 'Unauthorized' ? 401 : 500 });
  }
}

// POST /api/admin/restaurant/[id] — update plan/status/ai_import_limit
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await verifyAdmin();
    const { id } = await params;
    const body = await request.json() as { plan?: string; plan_expires_at?: string; is_active?: boolean; ai_import_limit?: number };

    const adminDb = getAdminDb();
    const update: Record<string, unknown> = {};
    if (body.plan) update.plan = body.plan;
    if (body.plan_expires_at) update.plan_expires_at = new Date(body.plan_expires_at);
    if (typeof body.is_active === 'boolean') update.is_active = body.is_active;
    if (typeof body.ai_import_limit === 'number' && body.ai_import_limit >= 0) {
      update.ai_import_limit = body.ai_import_limit;
    }

    await adminDb.collection('restaurants').doc(id).update(update);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}

// DELETE /api/admin/restaurant/[id] — permanently delete restaurant and all data
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await verifyAdmin();
    const { id } = await params;
    const adminDb = getAdminDb();

    // Verify the restaurant exists first and get its data
    const restaurantRef = adminDb.collection('restaurants').doc(id);
    const snap = await restaurantRef.get();
    if (!snap.exists) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });

    const data = snap.data()!;
    const qrSlug = data.qr_slug as string | undefined;

    // If a QR code was bound to this restaurant, release it back to 'unbound'
    // so it can be reused and the QR management panel shows it correctly.
    if (qrSlug) {
      const qrRef = adminDb.collection('qr_codes').doc(qrSlug);
      const qrSnap = await qrRef.get();
      // Only update if the QR still points to this restaurant (sanity check)
      if (qrSnap.exists && qrSnap.data()?.restaurant_id === id) {
        await qrRef.update({
          status: 'unbound',
          restaurant_id: null,
          bound_at: null,
        });
      }
    }

    // Use Firebase Admin's recursiveDelete to remove the restaurant doc
    // and ALL subcollections (menu_items, categories, ai_import_counts, etc.)
    await adminDb.recursiveDelete(restaurantRef);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: msg }, { status: msg === 'Unauthorized' ? 401 : msg === 'Forbidden' ? 403 : 500 });
  }
}

