import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';

const SESSION_COOKIE_NAME = 'mq_session';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin routes protection
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    return await verifySession(request, 'admin');
  }

  // Dashboard routes protection
  if (pathname.startsWith('/dashboard') && !pathname.startsWith('/dashboard/login')) {
    return await verifySession(request, 'restaurant');
  }

  return NextResponse.next();
}

async function verifySession(request: NextRequest, requiredRole: 'admin' | 'restaurant') {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const loginPath = requiredRole === 'admin' ? '/admin/login' : '/dashboard/login';

  if (!sessionCookie) {
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

  try {
    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);

    if (requiredRole === 'admin' && decoded.admin !== true) {
      return NextResponse.redirect(new URL(loginPath, request.url));
    }

    if (requiredRole === 'restaurant' && decoded.role !== 'restaurant') {
      return NextResponse.redirect(new URL(loginPath, request.url));
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL(loginPath, request.url));
  }
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*'],
};
