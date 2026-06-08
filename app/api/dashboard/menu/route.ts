import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

async function getRestaurantId(sessionCookie: string): Promise<{ uid: string; restaurantId: string } | null> {
  const adminAuth = getAdminAuth();
  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  const uid = decoded.uid;

  const adminDb = getAdminDb();
  const snap = await adminDb.collection('restaurants').where('uid', '==', uid).limit(1).get();
  if (snap.empty) return null;

  return { uid, restaurantId: snap.docs[0].id };
}

// GET /api/dashboard/menu — fetch all items and categories
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('mq_session')?.value;
  if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const ids = await getRestaurantId(sessionCookie);
    if (!ids) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });

    const adminDb = getAdminDb();
    const { restaurantId } = ids;

    const [itemsSnap, catsSnap] = await Promise.all([
      adminDb.collection('restaurants').doc(restaurantId).collection('menu_items').orderBy('display_order', 'asc').get(),
      adminDb.collection('restaurants').doc(restaurantId).collection('categories').orderBy('display_order', 'asc').get(),
    ]);

    const items = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const categories = catsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return NextResponse.json({ restaurantId, items, categories });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}

// POST /api/dashboard/menu — add/edit/delete/toggle item
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('mq_session')?.value;
  if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const ids = await getRestaurantId(sessionCookie);
    if (!ids) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });

    const { action, itemId, itemIds, data } = await request.json() as {
      action: 'add' | 'update' | 'delete' | 'bulk_delete' | 'bulk_update_category' | 'toggle';
      itemId?: string;
      itemIds?: string[];
      data?: Record<string, unknown>;
    };

    const adminDb = getAdminDb();
    const { restaurantId } = ids;
    const col = adminDb.collection('restaurants').doc(restaurantId).collection('menu_items');

    if (action === 'add') {
      const ref = await col.add({ ...data, created_at: new Date(), display_order: Date.now() });
      return NextResponse.json({ id: ref.id });
    }
    if (action === 'update' && itemId) {
      await col.doc(itemId).update(data as Record<string, unknown>);
      return NextResponse.json({ success: true });
    }
    if (action === 'delete' && itemId) {
      await col.doc(itemId).delete();
      return NextResponse.json({ success: true });
    }
    if (action === 'bulk_delete' && Array.isArray(itemIds) && itemIds.length > 0) {
      await Promise.all(itemIds.map((id) => col.doc(id).delete()));
      return NextResponse.json({ success: true, deleted: itemIds.length });
    }
    if (action === 'bulk_update_category' && Array.isArray(itemIds) && itemIds.length > 0 && data?.category) {
      const batch = adminDb.batch();
      itemIds.forEach((id) => batch.update(col.doc(id), { category: data.category as string }));
      await batch.commit();
      return NextResponse.json({ success: true, updated: itemIds.length });
    }
    if (action === 'toggle' && itemId && data) {
      await col.doc(itemId).update({ is_available: data.is_available });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}
