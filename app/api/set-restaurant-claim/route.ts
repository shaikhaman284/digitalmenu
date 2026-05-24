import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { uid } = await request.json() as { uid: string };
    if (!uid) return NextResponse.json({ error: 'uid required' }, { status: 400 });

    const adminAuth = getAdminAuth();
    await adminAuth.setCustomUserClaims(uid, { role: 'restaurant' });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
