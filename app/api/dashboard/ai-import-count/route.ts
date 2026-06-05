import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

async function verifySession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('mq_session')?.value;
  if (!sessionCookie) throw new Error('Unauthorized');
  const decoded = await getAdminAuth().verifySessionCookie(sessionCookie, true);
  return decoded.uid;
}

// GET — return current month's AI import count + per-restaurant limit
export async function GET(request: NextRequest) {
  try {
    await verifySession();
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    if (!restaurantId) return NextResponse.json({ count: 0, limit: 5 });

    const adminDb = getAdminDb();
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [countSnap, restSnap] = await Promise.all([
      adminDb
        .collection('restaurants').doc(restaurantId)
        .collection('ai_import_counts').doc(monthKey)
        .get(),
      adminDb.collection('restaurants').doc(restaurantId).get(),
    ]);

    const count = countSnap.exists ? (countSnap.data() as { count: number }).count : 0;
    const limit: number = restSnap.exists
      ? ((restSnap.data() as Record<string, unknown>).ai_import_limit as number) ?? 5
      : 5;

    return NextResponse.json({ count, limit });
  } catch {
    return NextResponse.json({ count: 0, limit: 5 });
  }
}

// POST — increment AI import count (server also validates quota)
export async function POST(request: NextRequest) {
  try {
    await verifySession();
    const { restaurantId } = await request.json() as { restaurantId: string };
    if (!restaurantId) return NextResponse.json({ error: 'Missing restaurantId' }, { status: 400 });

    const adminDb = getAdminDb();
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [countSnap, restSnap] = await Promise.all([
      adminDb.collection('restaurants').doc(restaurantId).collection('ai_import_counts').doc(monthKey).get(),
      adminDb.collection('restaurants').doc(restaurantId).get(),
    ]);

    const currentCount = countSnap.exists ? (countSnap.data() as { count: number }).count : 0;
    const limit: number = restSnap.exists
      ? ((restSnap.data() as Record<string, unknown>).ai_import_limit as number) ?? 5
      : 5;

    if (currentCount >= limit) {
      return NextResponse.json({ error: `Monthly limit reached (${limit} imports/month)` }, { status: 429 });
    }

    await adminDb
      .collection('restaurants').doc(restaurantId)
      .collection('ai_import_counts').doc(monthKey)
      .set({ count: FieldValue.increment(1) }, { merge: true });

    return NextResponse.json({ success: true, count: currentCount + 1, limit });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}
