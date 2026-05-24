import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  // 1. Verify admin session
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

  const { name, phone, email, password, plan, planExpiry } = await request.json() as {
    name: string;
    phone: string;
    email: string;
    password: string;
    plan: string;
    planExpiry: string;
  };

  try {
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    // 2. Create Firebase Auth user
    const userRecord = await adminAuth.createUser({ email, password });

    // 3. Set restaurant custom claim
    await adminAuth.setCustomUserClaims(userRecord.uid, { role: 'restaurant' });

    // 4. Find next unbound QR code (no orderBy — avoids composite index requirement)
    const qrSnap = await adminDb
      .collection('qr_codes')
      .where('status', '==', 'unbound')
      .limit(1)
      .get();

    const slug = qrSnap.empty ? null : qrSnap.docs[0].id;

    // 5. Create restaurant document
    const expiryDate = new Date(planExpiry);
    const restRef = await adminDb.collection('restaurants').add({
      uid: userRecord.uid,
      name,
      phone,
      location: '',
      logo_url: '',
      qr_slug: slug || '',
      plan,
      plan_expires_at: expiryDate,
      is_active: true,
      created_at: new Date(),
    });

    // 6. Bind QR code if available
    if (slug) {
      await adminDb.collection('qr_codes').doc(slug).update({
        status: 'bound',
        restaurant_id: restRef.id,
        bound_at: new Date(),
      });
    }

    return NextResponse.json({ success: true, restaurantId: restRef.id, slug });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create restaurant';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
