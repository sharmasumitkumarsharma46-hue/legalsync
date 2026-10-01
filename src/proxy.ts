import { NextResponse, type NextProxy } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth/session';
import { verifySessionTokenEdge } from '@/lib/auth/edge';

/** Pages that require an authenticated session. */
const PROTECTED_PREFIXES = ['/dashboard', '/onboarding'];

/** Pages that a signed-in user should be bounced away from. */
const GUEST_ONLY_PREFIXES = ['/login', '/signup'];

function matches(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export const proxy: NextProxy = async (request) => {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  const secret = process.env.JWT_SECRET;
  const session = token && secret ? await verifySessionTokenEdge(token, secret) : null;

  if (matches(pathname, PROTECTED_PREFIXES) && !session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (matches(pathname, GUEST_ONLY_PREFIXES) && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
};

export const config = {
  matcher: ['/dashboard/:path*', '/onboarding/:path*', '/login', '/signup'],
};
