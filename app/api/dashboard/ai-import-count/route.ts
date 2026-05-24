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

// GET — return current month's AI import count for a restaurant
export async function GET(request: NextRequest) {
  try {
    await verifySession();
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    if (!restaurantId) return NextResponse.json({ count: 0 });

    const adminDb = getAdminDb();
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const snap = await adminDb
      .collection('restaurants').doc(restaurantId)
      .collection('ai_import_counts').doc(monthKey)
      .get();

    return NextResponse.json({ count: snap.exists ? (snap.data() as { count: number }).count : 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}

// POST — increment AI import count
export async function POST(request: NextRequest) {
  try {
    await verifySession();
    const { restaurantId } = await request.json() as { restaurantId: string };
    if (!restaurantId) return NextResponse.json({ error: 'Missing restaurantId' }, { status: 400 });

    const adminDb = getAdminDb();
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    await adminDb
      .collection('restaurants').doc(restaurantId)
      .collection('ai_import_counts').doc(monthKey)
      .set({ count: FieldValue.increment(1) }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}
