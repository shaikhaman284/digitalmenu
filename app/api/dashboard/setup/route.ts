import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { FieldValue } from 'firebase-admin/firestore';

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

// POST — update restaurant profile (name, phone, location, logo_url) or bind QR slug
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('mq_session')?.value;
  if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const rest = await getRestaurant(sessionCookie);
    if (!rest) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json() as {
      name?: string;
      phone?: string;
      location?: string;
      logo_url?: string;
      qr_slug?: string;
    };
    const adminDb = getAdminDb();

    // ── Special handling for QR binding ──────────────────────────────────────
    // When binding a QR slug we must update BOTH:
    //   1. qr_codes/{slug}  → status='bound', restaurant_id, bound_at
    //   2. restaurants/{id} → qr_slug
    // Without updating qr_codes the menu page sees status='unbound' and returns 404.
    if ('qr_slug' in body && body.qr_slug) {
      const slug = body.qr_slug;
      const qrRef = adminDb.collection('qr_codes').doc(slug);
      const qrSnap = await qrRef.get();

      if (!qrSnap.exists) {
        return NextResponse.json({ error: 'QR code not found in system' }, { status: 404 });
      }

      const qrData = qrSnap.data()!;
      if (qrData.status === 'bound' && qrData.restaurant_id !== rest.id) {
        return NextResponse.json(
          { error: 'This QR code is already bound to another restaurant' },
          { status: 409 }
        );
      }

      // Atomic write to both docs
      const writeBatch = adminDb.batch();

      writeBatch.update(qrRef, {
        status: 'bound',
        restaurant_id: rest.id,
        bound_at: FieldValue.serverTimestamp(),
      });

      writeBatch.update(adminDb.collection('restaurants').doc(rest.id), {
        qr_slug: slug,
      });

      await writeBatch.commit();
      return NextResponse.json({ success: true });
    }

    // ── General profile update ────────────────────────────────────────────────
    const allowed = ['name', 'phone', 'location', 'logo_url'];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) update[key] = (body as Record<string, unknown>)[key];
    }

    if (Object.keys(update).length > 0) {
      await adminDb.collection('restaurants').doc(rest.id).update(update);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}
