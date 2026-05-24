import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // Verify restaurant session
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('mq_session')?.value;
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let uid: string;
  try {
    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  try {
    const adminDb = getAdminDb();

    // Find restaurant by uid
    const restSnap = await adminDb
      .collection('restaurants')
      .where('uid', '==', uid)
      .limit(1)
      .get();

    if (restSnap.empty) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    const restDoc = restSnap.docs[0];
    const restData = restDoc.data();
    const restaurantId = restDoc.id;

    // Serialize plan_expires_at
    const expiresAt = restData.plan_expires_at?.toDate?.() ?? null;

    const restaurant = {
      id: restaurantId,
      name: restData.name,
      phone: restData.phone,
      location: restData.location || '',
      logo_url: restData.logo_url || '',
      qr_slug: restData.qr_slug || '',
      plan: restData.plan,
      is_active: restData.is_active,
      plan_expires_at: expiresAt ? expiresAt.toISOString() : null,
    };

    // Fetch menu items
    const itemsSnap = await adminDb
      .collection('restaurants')
      .doc(restaurantId)
      .collection('menu_items')
      .orderBy('like_count', 'desc')
      .get();

    const menuItems = itemsSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name,
        category: data.category,
        price: data.price,
        like_count: data.like_count || 0,
        avg_rating: data.avg_rating || 0,
        review_count: data.review_count || 0,
        image_url: data.image_url || null,
      };
    });

    // Fetch recent reviews across all items (top 5 items only, latest 6 reviews each)
    const topItems = menuItems.slice(0, 5);
    const allReviews: Array<{
      id: string;
      itemId: string;
      itemName: string;
      rating: number;
      text: string;
      created_at: string | null;
    }> = [];

    await Promise.all(
      topItems.map(async (item) => {
        const reviewSnap = await adminDb
          .collection('restaurants')
          .doc(restaurantId)
          .collection('menu_items')
          .doc(item.id)
          .collection('reviews')
          .orderBy('created_at', 'desc')
          .limit(6)
          .get();

        reviewSnap.docs.forEach((d) => {
          const r = d.data();
          allReviews.push({
            id: d.id,
            itemId: item.id,
            itemName: item.name,
            rating: r.rating,
            text: r.text || '',
            created_at: r.created_at?.toDate?.()?.toISOString?.() ?? null,
          });
        });
      })
    );

    // Sort all reviews by date desc
    allReviews.sort((a, b) => {
      if (!a.created_at) return 1;
      if (!b.created_at) return -1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return NextResponse.json({ restaurant, menuItems, reviews: allReviews.slice(0, 30) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load dashboard data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
