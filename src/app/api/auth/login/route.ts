import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/pool';
import { verifyPassword, generateToken } from '@/lib/auth/utils';
import { attachSession } from '@/lib/auth/session';
import { clientKey, rateLimit } from '@/lib/auth/rate-limit';
import { logger } from '@/lib/logger';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { email, password } = body;

  // Validate input
  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required' },
      { status: 400 }
    );
  }

  if (typeof email !== 'string' || !EMAIL_PATTERN.test(email) || typeof password !== 'string') {
    return NextResponse.json(
      { error: 'Enter a valid email address and password' },
      { status: 400 }
    );
  }

  const throttle = rateLimit(clientKey(request, 'login', email), 8, 15 * 60 * 1000);
  if (!throttle.allowed) {
    return NextResponse.json(
      { error: 'Too many sign-in attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(throttle.retryAfterSeconds) } }
    );
  }

  try {
    // Find user
    const result = await pool.query(
      'SELECT id, email, password_hash, name, firm_name, email_verified FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = result.rows[0] as {
      id: string;
      email: string;
      password_hash: string;
      name: string | null;
      firm_name: string | null;
      email_verified: boolean;
    };

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = generateToken({ userId: user.id, email: user.email });

    // Log login to audit
    await pool.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, ip_address, user_agent)
       VALUES ($1, 'login', 'user', $2, $3, $4)`,
      [user.id, user.id, request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null, request.headers.get('user-agent') || null]
    );

    return attachSession(
      NextResponse.json(
        {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            firmName: user.firm_name,
            emailVerified: user.email_verified,
          },
        },
        { status: 200 }
      ),
      token
    );
  } catch (error) {
    logger.error('Login failed', { error: String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
