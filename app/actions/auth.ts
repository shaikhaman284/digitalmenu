'use server';

import { cookies } from 'next/headers';
import { getAdminAuth } from '@/lib/firebase-admin';

const SESSION_COOKIE_NAME = 'mq_session';
const SESSION_DURATION_MS = 60 * 60 * 24 * 5 * 1000; // 5 days

export async function createSession(idToken: string): Promise<{ success: boolean; error?: string }> {
  try {
    const adminAuth = getAdminAuth();
    // Verify the ID token first
    const decoded = await adminAuth.verifyIdToken(idToken);

    // Check role claims
    const isAdmin = decoded.admin === true;
    const isRestaurant = decoded.role === 'restaurant';

    if (!isAdmin && !isRestaurant) {
      return { success: false, error: 'Unauthorized: no valid role' };
    }

    // Create session cookie
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION_MS,
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
      maxAge: SESSION_DURATION_MS / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return { success: true };
  } catch (error) {
    console.error('createSession error:', error);
    return { success: false, error: 'Failed to create session' };
  }
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSession() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!cookie) return null;

  try {
    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifySessionCookie(cookie.value, true);
    return decoded;
  } catch {
    return null;
  }
}

export async function setRestaurantClaim(uid: string): Promise<void> {
  const adminAuth = getAdminAuth();
  await adminAuth.setCustomUserClaims(uid, { role: 'restaurant' });
}

export async function setAdminClaim(uid: string): Promise<void> {
  const adminAuth = getAdminAuth();
  await adminAuth.setCustomUserClaims(uid, { admin: true });
}
