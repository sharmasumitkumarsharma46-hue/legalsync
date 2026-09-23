import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './utils';

export function authMiddleware(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json(
      { error: 'Authorization token required' },
      { status: 401 }
    );
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }

  // Add user info to request headers for downstream use
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', decoded.userId);
  requestHeaders.set('x-user-email', decoded.email);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export function getUserIdFromRequest(request: NextRequest): string | null {
  return request.headers.get('x-user-id');
}
