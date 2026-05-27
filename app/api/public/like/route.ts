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

/**
 * GET /api/public/like
 *
 * Two modes:
 * 1. Batch check (preferred): ?restaurantId=&itemIds=id1,id2,id3&visitorToken=
 *    Returns: { liked: { [itemId]: boolean } }
 *
 * 2. Single check (legacy): ?restaurantId=&itemId=&visitorToken=
 *    Returns: { liked: boolean }
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get('restaurantId');
  const visitorToken = searchParams.get('visitorToken');
  const itemId = searchParams.get('itemId');
  const itemIds = searchParams.get('itemIds'); // comma-separated for batch

  if (!restaurantId || !visitorToken) {
    return NextResponse.json({ liked: false });
  }

  try {
    const adminDb = getAdminDb();

    // ── Batch mode: check multiple items in parallel ───────────────────────
    if (itemIds) {
      const ids = itemIds.split(',').filter(Boolean).slice(0, 100); // max 100
      const results = await Promise.all(
        ids.map(async (id) => {
          const likeRef = adminDb
            .collection('restaurants').doc(restaurantId)
            .collection('menu_items').doc(id)
            .collection('likes').doc(visitorToken);
          const doc = await likeRef.get();
          return [id, doc.exists] as [string, boolean];
        })
      );
      const liked: Record<string, boolean> = Object.fromEntries(results);
      return NextResponse.json({ liked });
    }

    // ── Single mode (legacy) ───────────────────────────────────────────────
    if (!itemId) return NextResponse.json({ liked: false });
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
