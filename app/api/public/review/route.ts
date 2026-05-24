import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

// POST /api/public/review
// Body: { restaurantId, itemId, visitorToken, rating, text }
// No auth required — public endpoint
export async function POST(request: NextRequest) {
  try {
    const { restaurantId, itemId, visitorToken, rating, text } = await request.json() as {
      restaurantId: string;
      itemId: string;
      visitorToken: string;
      rating: number;
      text: string;
    };

    if (!restaurantId || !itemId || !visitorToken || !rating) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const itemRef = adminDb.collection('restaurants').doc(restaurantId).collection('menu_items').doc(itemId);

    // Check if already reviewed
    const existingSnap = await itemRef.collection('reviews').where('visitor_token', '==', visitorToken).limit(1).get();
    if (!existingSnap.empty) {
      return NextResponse.json({ error: 'Already reviewed' }, { status: 409 });
    }

    // Add review
    await itemRef.collection('reviews').add({
      visitor_token: visitorToken,
      rating,
      text: text || '',
      created_at: new Date(),
    });

    // Recalculate avg_rating and review_count
    const allReviews = await itemRef.collection('reviews').get();
    const reviewCount = allReviews.size;
    const avgRating = allReviews.docs.reduce((sum, d) => sum + (d.data() as { rating: number }).rating, 0) / reviewCount;

    await itemRef.update({
      review_count: reviewCount,
      avg_rating: Math.round(avgRating * 10) / 10,
    });

    return NextResponse.json({ success: true, review_count: reviewCount, avg_rating: avgRating });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}

// GET /api/public/review?restaurantId=&itemId=&visitorToken=
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get('restaurantId');
  const itemId = searchParams.get('itemId');
  const visitorToken = searchParams.get('visitorToken');

  if (!restaurantId || !itemId) return NextResponse.json({ reviews: [], hasReviewed: false });

  try {
    const adminDb = getAdminDb();
    const col = adminDb.collection('restaurants').doc(restaurantId).collection('menu_items').doc(itemId).collection('reviews');

    const snap = await col.orderBy('created_at', 'desc').limit(20).get();
    const reviews = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        rating: data.rating,
        text: data.text || '',
        created_at: data.created_at?.toDate?.()?.toISOString?.() ?? null,
      };
    });

    const hasReviewed = visitorToken
      ? !(await col.where('visitor_token', '==', visitorToken).limit(1).get()).empty
      : false;

    return NextResponse.json({ reviews, hasReviewed });
  } catch {
    return NextResponse.json({ reviews: [], hasReviewed: false });
  }
}
