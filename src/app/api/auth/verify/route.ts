import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/pool';
import { logger } from '@/lib/logger';

async function verifyEmailToken(
  token: string
): Promise<{ ok: boolean; error?: string; email?: string }> {
  const result = await pool.query(
    `SELECT id, email, email_verification_expires_at FROM users
     WHERE email_verification_token = $1`,
    [token]
  );

  if (result.rows.length === 0) {
    return { ok: false, error: 'This verification link is not valid.' };
  }

  const user = result.rows[0] as {
    id: string;
    email: string;
    email_verification_expires_at: Date | null;
  };

  const expiresAt = user.email_verification_expires_at
    ? new Date(user.email_verification_expires_at)
    : null;

  if (!expiresAt || expiresAt.getTime() < Date.now()) {
    return { ok: false, error: 'This verification link has expired. Request a new one below.' };
  }

  await pool.query(
    `UPDATE users
     SET email_verified = TRUE,
         email_verification_token = NULL,
         email_verification_expires_at = NULL,
         updated_at = NOW()
     WHERE id = $1`,
    [user.id]
  );

  return { ok: true, email: user.email };
}

/** Redirects to the verification screen, which owns the user-facing UI. */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const appUrl = process.env.APP_URL || request.nextUrl.origin;

  const target = new URL('/verify-email', appUrl);
  if (token) {
    target.searchParams.set('token', token);
  }

  return NextResponse.redirect(target);
}

export async function POST(request: NextRequest) {
  let body: { token?: string };
  try {
    body = (await request.json()) as { token?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.token) {
    return NextResponse.json({ error: 'Verification token is required' }, { status: 400 });
  }

  try {
    const result = await verifyEmailToken(body.token);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ message: 'Email verified successfully', email: result.email });
  } catch (error) {
    logger.error('Email verification failed', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}