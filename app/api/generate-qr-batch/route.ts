import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  // Verify admin session
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('mq_session')?.value;
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    if (!decoded.admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  const { batch, startNum, count } = await request.json() as {
    batch: string;
    startNum: number;
    count: number;
  };

  const safeCount = Math.min(count, 100);
  const adminDb = getAdminDb();
  const firestoreBatch = adminDb.batch();
  const slugs: string[] = [];

  for (let i = 0; i < safeCount; i++) {
    const num = startNum + i;
    const slug = `MQ-${String(num).padStart(4, '0')}`;
    const ref = adminDb.collection('qr_codes').doc(slug);
    firestoreBatch.set(ref, {
      status: 'unbound',
      restaurant_id: null,
      batch,
      bound_at: null,
      created_at: new Date(),
    });
    slugs.push(slug);
  }

  await firestoreBatch.commit();
  return NextResponse.json({ success: true, slugs });
}
