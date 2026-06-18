import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

async function getRestaurantCtx(sessionCookie: string): Promise<{ uid: string; restaurantId: string; billingEnabled: boolean } | null> {
  const adminAuth = getAdminAuth();
  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  const uid = decoded.uid;

  const adminDb = getAdminDb();
  const snap = await adminDb.collection('restaurants').where('uid', '==', uid).limit(1).get();
  if (snap.empty) return null;

  const data = snap.docs[0].data();
  return {
    uid,
    restaurantId: snap.docs[0].id,
    billingEnabled: (data.billing_enabled as boolean) ?? false,
  };
}

// GET /api/dashboard/bills — list recent bills
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('mq_session')?.value;
  if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const ctx = await getRestaurantCtx(sessionCookie);
    if (!ctx) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    if (!ctx.billingEnabled) return NextResponse.json({ error: 'Billing not enabled for this account' }, { status: 403 });

    const adminDb = getAdminDb();
    const billsSnap = await adminDb
      .collection('restaurants')
      .doc(ctx.restaurantId)
      .collection('bills')
      .orderBy('created_at', 'desc')
      .limit(50)
      .get();

    const bills = billsSnap.docs.map((d) => {
      const b = d.data();
      return {
        id: d.id,
        invoice_no: b.invoice_no,
        items: b.items,
        subtotal: b.subtotal,
        total: b.total,
        note: b.note || '',
        created_at: b.created_at?.toDate?.()?.toISOString?.() ?? null,
      };
    });

    return NextResponse.json({ bills });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}

// POST /api/dashboard/bills — save a new bill
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('mq_session')?.value;
  if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const ctx = await getRestaurantCtx(sessionCookie);
    if (!ctx) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    if (!ctx.billingEnabled) return NextResponse.json({ error: 'Billing not enabled for this account' }, { status: 403 });

    const body = await request.json() as {
      items: Array<{ id: string; name: string; category: string; price: number; qty: number; subtotal: number }>;
      subtotal: number;
      total: number;
      note?: string;
    };

    if (!body.items || body.items.length === 0) {
      return NextResponse.json({ error: 'No items in bill' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const restRef = adminDb.collection('restaurants').doc(ctx.restaurantId);

    // Atomically increment bill_counter and get the new number
    let invoiceNo = '';
    await adminDb.runTransaction(async (tx) => {
      const restSnap = await tx.get(restRef);
      const counter: number = (restSnap.data()?.bill_counter as number) || 0;
      const newCounter = counter + 1;
      invoiceNo = `INV-${String(newCounter).padStart(4, '0')}`;
      tx.update(restRef, { bill_counter: newCounter });
    });

    const billRef = await restRef.collection('bills').add({
      invoice_no: invoiceNo,
      items: body.items,
      subtotal: body.subtotal,
      total: body.total,
      note: body.note || '',
      created_at: new Date(),
    });

    return NextResponse.json({ id: billRef.id, invoice_no: invoiceNo });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}
