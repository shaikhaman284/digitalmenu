import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { buildMenuUrl } from '@/lib/qr-token';

export const runtime = 'nodejs';

/**
 * POST /api/admin/signed-qr-urls
 * Body: { slugs: string[] }
 * Returns: { urls: Record<slug, signedUrl> }
 *
 * Generates HMAC-signed menu URLs for a list of QR slugs.
 * Restricted to admin session only — keeps QR_SLUG_SECRET server-side.
 */
export async function POST(request: NextRequest) {
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

  const { slugs } = await request.json() as { slugs: string[] };
  if (!Array.isArray(slugs)) {
    return NextResponse.json({ error: 'slugs must be an array' }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  const urls: Record<string, string> = {};
  for (const slug of slugs) {
    urls[slug] = buildMenuUrl(baseUrl, slug);
  }

  return NextResponse.json({ urls });
}
