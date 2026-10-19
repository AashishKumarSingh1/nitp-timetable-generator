import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'nitp-scheduler-ultra-secure-key-2026-production'
);

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/departments',
  '/rooms',
  '/faculty',
  '/schedule',
  '/seating',
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('nitp_session')?.value;

  let isAuthenticated = false;
  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET);
      isAuthenticated = true;
    } catch {
      isAuthenticated = false;
    }
  }

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isAuthPage = pathname === '/login' || pathname === '/signup';

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/departments/:path*',
    '/rooms/:path*',
    '/faculty/:path*',
    '/schedule/:path*',
    '/seating/:path*',
    '/login',
    '/signup',
  ],
};
