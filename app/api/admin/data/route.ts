import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
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

  try {
    const adminDb = getAdminDb();

    const [restSnap, qrSnap] = await Promise.all([
      adminDb.collection('restaurants').get(),
      adminDb.collection('qr_codes').where('status', '==', 'unbound').get(),
    ]);

    const now = new Date();
    const restaurants = restSnap.docs.map((d) => {
      const data = d.data();
      const expiresAt = data.plan_expires_at?.toDate?.() ?? null;
      return {
        id: d.id,
        name: data.name,
        phone: data.phone,
        plan: data.plan,
        qr_slug: data.qr_slug || '',
        is_active: data.is_active,
        plan_expires_at: expiresAt ? expiresAt.toISOString() : null,
      };
    });

    const active = restaurants.filter(
      (r) => r.is_active && r.plan_expires_at && new Date(r.plan_expires_at) > now
    ).length;
    const expired = restaurants.filter(
      (r) => r.is_active && r.plan_expires_at && new Date(r.plan_expires_at) <= now
    ).length;

    return NextResponse.json({
      restaurants,
      stats: {
        total: restaurants.length,
        active,
        expired,
        unboundQRs: qrSnap.size,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
