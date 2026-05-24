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

// POST — update restaurant profile OR bind a new QR slug
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

    // ── QR Binding ────────────────────────────────────────────────────────────
    // Full atomic sequence:
    //  1. Verify the new QR exists and is not already bound to a DIFFERENT restaurant
    //  2. If the restaurant already has a current qr_slug (different from the new one),
    //     release it back to 'unbound' so the old QR stops serving the menu
    //  3. Bind the new QR (status='bound', restaurant_id, bound_at)
    //  4. Update restaurants/{id}.qr_slug to the new slug
    // All steps happen in a single Firestore batch write — atomic, no half-state.
    if ('qr_slug' in body && body.qr_slug) {
      const newSlug = body.qr_slug;
      const newQrRef = adminDb.collection('qr_codes').doc(newSlug);
      const newQrSnap = await newQrRef.get();

      if (!newQrSnap.exists) {
        return NextResponse.json({ error: 'QR code not found in system' }, { status: 404 });
      }

      const newQrData = newQrSnap.data()!;

      // Reject if this QR is already bound to a DIFFERENT restaurant
      if (newQrData.status === 'bound' && newQrData.restaurant_id !== rest.id) {
        return NextResponse.json(
          { error: 'This QR code is already bound to another restaurant' },
          { status: 409 }
        );
      }

      const writeBatch = adminDb.batch();
      const restRef = adminDb.collection('restaurants').doc(rest.id);

      // Step 1 — Release the old QR slug (if any and different from the new one)
      const currentSlug = rest.qr_slug as string | undefined;
      if (currentSlug && currentSlug !== newSlug) {
        const oldQrRef = adminDb.collection('qr_codes').doc(currentSlug);
        const oldQrSnap = await oldQrRef.get();
        // Only release if the old doc still points to THIS restaurant
        if (oldQrSnap.exists && oldQrSnap.data()?.restaurant_id === rest.id) {
          writeBatch.update(oldQrRef, {
            status: 'unbound',
            restaurant_id: null,
            bound_at: null,
          });
        }
      }

      // Step 2 — Bind the new QR
      writeBatch.update(newQrRef, {
        status: 'bound',
        restaurant_id: rest.id,
        bound_at: FieldValue.serverTimestamp(),
      });

      // Step 3 — Update restaurant's active slug
      writeBatch.update(restRef, { qr_slug: newSlug });

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
