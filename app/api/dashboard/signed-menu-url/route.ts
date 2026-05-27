import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { buildMenuUrl } from '@/lib/qr-token';

export const runtime = 'nodejs';

/**
 * GET /api/dashboard/signed-menu-url
 * Returns the HMAC-signed menu URL for the authenticated restaurant owner's QR slug.
 * Keeps QR_SLUG_SECRET server-side only.
 */
export async function GET(_request: NextRequest) {
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

  const adminDb = getAdminDb();
  const snap = await adminDb.collection('restaurants').where('uid', '==', uid).limit(1).get();
  if (snap.empty) {
    return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
  }

  const data = snap.docs[0].data();
  const qrSlug = (data.qr_slug as string | undefined) || '';
  if (!qrSlug) {
    return NextResponse.json({ signedUrl: null, qrSlug: '' });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  const signedUrl = buildMenuUrl(baseUrl, qrSlug);
  return NextResponse.json({ signedUrl, qrSlug });
}
