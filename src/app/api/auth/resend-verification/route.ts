import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/pool';
import { generateEmailVerificationToken } from '@/lib/auth/utils';
import { sendVerificationEmail } from '@/lib/email';
import { clientKey, rateLimit } from '@/lib/auth/rate-limit';
import { logger } from '@/lib/logger';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_COOLDOWN_MS = 60 * 1000;

export async function POST(request: NextRequest) {
  const throttle = rateLimit(clientKey(request, 'resend-verification'), 5, 15 * 60 * 1000);
  if (!throttle.allowed) {
    return NextResponse.json(
      { error: 'Too many resend requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(throttle.retryAfterSeconds) } }
    );
  }

  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
  }

  try {
    const result = await pool.query(
      `SELECT id, email, email_verified, email_verification_expires_at
       FROM users WHERE email = $1`,
      [email]
    );

    // Neutral response so the endpoint cannot confirm whether an account exists.
    const genericMessage = 'If the address needs verification, a fresh link has been sent.';

    if (result.rows.length === 0) {
      return NextResponse.json({ message: genericMessage }, { status: 200 });
    }

    const user = result.rows[0] as {
      id: string;
      email: string;
      email_verified: boolean;
      email_verification_expires_at: Date | null;
    };

    if (user.email_verified) {
      return NextResponse.json({ message: genericMessage }, { status: 200 });
    }

    // Do not allow token spamming while a valid link is still live.
    const expiresAt = user.email_verification_expires_at
      ? new Date(user.email_verification_expires_at)
      : null;
    if (expiresAt && expiresAt.getTime() - Date.now() > 23 * 60 * 60 * 1000) {
      const issuedRecently = expiresAt.getTime() - (24 * 60 * 60 * 1000 - RESEND_COOLDOWN_MS);
      if (issuedRecently > Date.now()) {
        return NextResponse.json({ message: genericMessage }, { status: 200 });
      }
    }

    const token = generateEmailVerificationToken();
    const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
      `UPDATE users
       SET email_verification_token = $1,
           email_verification_expires_at = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [token, newExpiry, user.id]
    );

    try {
      await sendVerificationEmail(user.email, token);
    } catch (emailError) {
      logger.error('Failed to send verification email', { error: String(emailError) });
    }

    return NextResponse.json({ message: genericMessage }, { status: 200 });
  } catch (error) {
    logger.error('Resend verification failed', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}