import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/pool';
import { hashPassword, generateEmailVerificationToken, generateToken } from '@/lib/auth/utils';
import { PLAN_DEFINITIONS } from '@/lib/billing/plans';
import { sendVerificationEmail } from '@/lib/email';
import { attachSession } from '@/lib/auth/session';
import { clientKey, rateLimit } from '@/lib/auth/rate-limit';
import { logger } from '@/lib/logger';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const throttle = rateLimit(clientKey(request, 'signup'), 5, 15 * 60 * 1000);
  if (!throttle.allowed) {
    return NextResponse.json(
      { error: 'Too many signup attempts from this network. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(throttle.retryAfterSeconds) } }
    );
  }

  try {
    const { email, password, name, firmName, plan } = await request.json();

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    if (typeof email !== 'string' || !EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    if (typeof name !== 'string' || name.trim().length === 0 || name.length > 255) {
      return NextResponse.json({ error: 'Enter a valid name' }, { status: 400 });
    }

    if (firmName !== undefined && typeof firmName !== 'string') {
      return NextResponse.json({ error: 'Firm name must be text' }, { status: 400 });
    }

    const selectedPlan = typeof plan === 'string' ? plan : 'solo';
    const validPlans = Object.keys(PLAN_DEFINITIONS);

    if (!validPlans.includes(selectedPlan)) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate email verification token
    const verificationToken = generateEmailVerificationToken();
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const client = await pool.connect();
    let user: Record<string, unknown>;
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO users (email, password_hash, name, firm_name, email_verification_token, email_verification_expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, email, name, firm_name, email_verified`,
        [email.toLowerCase(), passwordHash, name.trim(), firmName || null, verificationToken, verificationExpiresAt]
      );
      user = result.rows[0] as Record<string, unknown>;

      await client.query(`INSERT INTO user_settings (user_id) VALUES ($1)`, [user.id]);

      const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days
      await client.query(
        `INSERT INTO subscriptions (user_id, plan, status, trial_ends_at, current_period_start, current_period_end)
         VALUES ($1, $2, 'trial', $3, NOW(), $3)`,
        [user.id, selectedPlan, trialEndsAt]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    // Send verification email (non-blocking for account creation)
    try {
      await sendVerificationEmail(user.email as string, verificationToken);
    } catch (emailError) {
      logger.error('Failed to send verification email', { error: String(emailError) });
    }

    const token = generateToken({ userId: user.id as string, email: user.email as string });

    return attachSession(
      NextResponse.json(
        {
          message: 'Account created successfully. Please check your email to verify your account.',
          plan: selectedPlan,
          emailVerificationRequired: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            firmName: user.firm_name,
            emailVerified: user.email_verified,
          },
        },
        { status: 201 }
      ),
      token
    );
  } catch (error) {
    logger.error('Signup failed', { error: String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
