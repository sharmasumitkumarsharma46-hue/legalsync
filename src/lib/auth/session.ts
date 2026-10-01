import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './utils';

export const SESSION_COOKIE = 'ls_session';

// Must stay in sync with the JWT expiry ("7d") configured in auth/utils.
const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

function isSecure(): boolean {
  return process.env.NODE_ENV === 'production';
}

export interface SessionUser {
  userId: string;
  email: string;
}

export function attachSession(response: NextResponse, token: string): NextResponse {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure(),
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}

export function clearSession(response: NextResponse): NextResponse {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure(),
    path: '/',
    maxAge: 0,
  });
  return response;
}

export function getSessionToken(request: NextRequest): string | null {
  const cookieToken = request.cookies.get(SESSION_COOKIE)?.value;
  if (cookieToken) {
    return cookieToken;
  }

  const header = request.headers.get('authorization');
  if (!header) {
    return null;
  }

  const headerToken = header.replace(/^Bearer\s+/i, '').trim();
  // Guard against the historic `Bearer undefined` client bug.
  if (!headerToken || headerToken === 'undefined' || headerToken === 'null') {
    return null;
  }

  return headerToken;
}

export function getUserFromRequest(request: NextRequest): SessionUser | null {
  const token = getSessionToken(request);
  if (!token) {
    return null;
  }

  const decoded = verifyToken(token);
  if (!decoded || !decoded.userId) {
    return null;
  }

  return { userId: decoded.userId, email: decoded.email || '' };
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

/**
 * Session guard for route handlers: returns the session, or a ready-to-return
 * 401 response. Keeps protected endpoints one line instead of three.
 */
export function requireSession(
  request: NextRequest
): { session: SessionUser; response?: never } | { session?: never; response: NextResponse } {
  const session = getUserFromRequest(request);
  if (!session) {
    return { response: unauthorized() };
  }
  return { session };
}

