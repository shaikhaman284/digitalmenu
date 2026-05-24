import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

async function getRestaurant(sessionCookie: string) {
  const adminAuth = getAdminAuth();
  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  const adminDb = getAdminDb();
  const snap = await adminDb.collection('restaurants').where('uid', '==', decoded.uid).limit(1).get();
  if (snap.empty) return null;

  interface RestaurantData {
    name: string;
    phone: string;
    location?: string;
    logo_url?: string;
    qr_slug?: string;
    plan: string;
    is_active: boolean;
    plan_expires_at?: { toDate?: () => Date };
    uid: string;
  }

  const data = snap.docs[0].data() as RestaurantData;
  return { id: snap.docs[0].id, ...data };
}

// GET — fetch restaurant profile
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('mq_session')?.value;
  if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const rest = await getRestaurant(sessionCookie);
    if (!rest) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const expiresAt = rest.plan_expires_at?.toDate?.() ?? null;

    return NextResponse.json({
      id: rest.id,
      name: rest.name,
      phone: rest.phone,
      location: rest.location || '',
      logo_url: rest.logo_url || '',
      qr_slug: rest.qr_slug || '',
      plan_expires_at: expiresAt ? expiresAt.toISOString() : null,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}


// POST — update restaurant profile (name, phone, location)
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('mq_session')?.value;
  if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const rest = await getRestaurant(sessionCookie);
    if (!rest) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json() as { name?: string; phone?: string; location?: string; logo_url?: string; qr_slug?: string };
    const allowed = ['name', 'phone', 'location', 'logo_url', 'qr_slug'];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) update[key] = (body as Record<string, unknown>)[key];
    }

    const adminDb = getAdminDb();
    await adminDb.collection('restaurants').doc((rest as { id: string }).id).update(update);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}
