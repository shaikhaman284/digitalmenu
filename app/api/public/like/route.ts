import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

// POST /api/public/like
// Body: { restaurantId, itemId, visitorToken }
// No auth required — public endpoint
export async function POST(request: NextRequest) {
  try {
    const { restaurantId, itemId, visitorToken } = await request.json() as {
      restaurantId: string;
      itemId: string;
      visitorToken: string;
    };

    if (!restaurantId || !itemId || !visitorToken) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const itemRef = adminDb.collection('restaurants').doc(restaurantId).collection('menu_items').doc(itemId);
    const likeRef = itemRef.collection('likes').doc(visitorToken);

    const likeDoc = await likeRef.get();
    const liked = likeDoc.exists;

    if (liked) {
      // Unlike
      await Promise.all([
        likeRef.delete(),
        itemRef.update({ like_count: FieldValue.increment(-1) }),
      ]);
      return NextResponse.json({ liked: false });
    } else {
      // Like
      await Promise.all([
        likeRef.set({ visitor_token: visitorToken, liked_at: new Date() }),
        itemRef.update({ like_count: FieldValue.increment(1) }),
      ]);
      return NextResponse.json({ liked: true });
    }
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}

// GET /api/public/like?restaurantId=&itemId=&visitorToken=
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get('restaurantId');
  const itemId = searchParams.get('itemId');
  const visitorToken = searchParams.get('visitorToken');

  if (!restaurantId || !itemId || !visitorToken) {
    return NextResponse.json({ liked: false });
  }

  try {
    const adminDb = getAdminDb();
    const likeRef = adminDb
      .collection('restaurants').doc(restaurantId)
      .collection('menu_items').doc(itemId)
      .collection('likes').doc(visitorToken);

    const doc = await likeRef.get();
    return NextResponse.json({ liked: doc.exists });
  } catch {
    return NextResponse.json({ liked: false });
  }
}
