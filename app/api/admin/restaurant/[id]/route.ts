import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

async function verifyAdmin() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('mq_session')?.value;
  if (!sessionCookie) throw new Error('Unauthorized');
  const decoded = await getAdminAuth().verifySessionCookie(sessionCookie, true);
  if (!decoded.admin) throw new Error('Forbidden');
}

// GET /api/admin/restaurant/[id]
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await verifyAdmin();
    const { id } = await params;
    const adminDb = getAdminDb();

    const [restSnap, itemsSnap] = await Promise.all([
      adminDb.collection('restaurants').doc(id).get(),
      adminDb.collection('restaurants').doc(id).collection('menu_items').orderBy('display_order', 'asc').get(),
    ]);

    if (!restSnap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const r = restSnap.data()!;
    const expiresAt = r.plan_expires_at?.toDate?.() ?? null;

    // Fetch current month's AI import count
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const countSnap = await adminDb
      .collection('restaurants').doc(id)
      .collection('ai_import_counts').doc(monthKey)
      .get();
    const aiImportsThisMonth = countSnap.exists ? (countSnap.data() as { count: number }).count : 0;

    return NextResponse.json({
      restaurant: {
        id: restSnap.id,
        name: r.name,
        phone: r.phone,
        location: r.location || '',
        plan: r.plan,
        is_active: r.is_active,
        plan_expires_at: expiresAt?.toISOString() ?? null,
        qr_slug: r.qr_slug || '',
        uid: r.uid,
        ai_import_limit: (r.ai_import_limit as number) ?? 5,
        ai_imports_this_month: aiImportsThisMonth,
      },
      menuItems: itemsSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name,
          category: data.category,
          price: data.price,
          is_available: data.is_available,
          like_count: data.like_count || 0,
        };
      }),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: msg }, { status: msg === 'Unauthorized' ? 401 : 500 });
  }
}

// POST /api/admin/restaurant/[id] — update plan/status/ai_import_limit
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await verifyAdmin();
    const { id } = await params;
    const body = await request.json() as { plan?: string; plan_expires_at?: string; is_active?: boolean; ai_import_limit?: number };

    const adminDb = getAdminDb();
    const update: Record<string, unknown> = {};
    if (body.plan) update.plan = body.plan;
    if (body.plan_expires_at) update.plan_expires_at = new Date(body.plan_expires_at);
    if (typeof body.is_active === 'boolean') update.is_active = body.is_active;
    if (typeof body.ai_import_limit === 'number' && body.ai_import_limit >= 0) {
      update.ai_import_limit = body.ai_import_limit;
    }

    await adminDb.collection('restaurants').doc(id).update(update);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}
