import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const setupSecret = process.env.SETUP_SECRET;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!setupSecret || !adminEmail) {
    return NextResponse.json(
      { error: 'SETUP_SECRET or ADMIN_EMAIL not configured' },
      { status: 500 }
    );
  }

  const body = await request.json();
  if (body.secret !== setupSecret) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  try {
    const adminAuth = getAdminAuth();
    const user = await adminAuth.getUserByEmail(adminEmail);
    await adminAuth.setCustomUserClaims(user.uid, { admin: true });
    return NextResponse.json({
      success: true,
      message: `Admin claim set for ${adminEmail} (uid: ${user.uid})`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
