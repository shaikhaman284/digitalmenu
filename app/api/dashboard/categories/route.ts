import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

async function getRestaurantId(sessionCookie: string): Promise<string | null> {
  const adminAuth = getAdminAuth();
  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  const adminDb = getAdminDb();
  const snap = await adminDb.collection('restaurants').where('uid', '==', decoded.uid).limit(1).get();
  return snap.empty ? null : snap.docs[0].id;
}

// GET — list categories with item counts
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('mq_session')?.value;
  if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const restaurantId = await getRestaurantId(sessionCookie);
    if (!restaurantId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const adminDb = getAdminDb();
    const [catsSnap, itemsSnap] = await Promise.all([
      adminDb.collection('restaurants').doc(restaurantId).collection('categories').orderBy('display_order', 'asc').get(),
      adminDb.collection('restaurants').doc(restaurantId).collection('menu_items').get(),
    ]);

    const items = itemsSnap.docs.map((d) => d.data());
    const categories = catsSnap.docs.map((d) => {
      const name = (d.data() as { name: string }).name;
      return {
        id: d.id,
        name,
        display_order: (d.data() as { display_order: number }).display_order,
        itemCount: items.filter((i) => (i as { category: string }).category === name).length,
      };
    });

    return NextResponse.json({ restaurantId, categories });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}

// POST — add / rename / delete category
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('mq_session')?.value;
  if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const restaurantId = await getRestaurantId(sessionCookie);
    if (!restaurantId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { action, categoryId, name } = await request.json() as {
      action: 'add' | 'rename' | 'delete';
      categoryId?: string;
      name?: string;
    };

    const adminDb = getAdminDb();
    const col = adminDb.collection('restaurants').doc(restaurantId).collection('categories');

    if (action === 'add' && name) {
      const ref = await col.add({ name: name.trim(), display_order: Date.now() });
      return NextResponse.json({ id: ref.id });
    }
    if (action === 'rename' && categoryId && name) {
      await col.doc(categoryId).update({ name: name.trim() });
      return NextResponse.json({ success: true });
    }
    if (action === 'delete' && categoryId) {
      await col.doc(categoryId).delete();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}
