import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/pool';
import { hashPassword, generateEmailVerificationToken, generateToken } from '@/lib/auth/utils';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, firmName } = await request.json();

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
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

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, firm_name, email_verification_token, email_verification_expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, name, firm_name, email_verified`,
      [email.toLowerCase(), passwordHash, name, firmName || null, verificationToken, verificationExpiresAt]
    );

    const user = result.rows[0];

    // Create default user settings
    await pool.query(
      `INSERT INTO user_settings (user_id)
       VALUES ($1)`,
      [user.id]
    );

    // Create trial subscription
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days
    await pool.query(
      `INSERT INTO subscriptions (user_id, plan, status, trial_ends_at, current_period_start, current_period_end)
       VALUES ($1, 'solo', 'trial', $2, NOW(), $2)`,
      [user.id, trialEndsAt]
    );

    // TODO: Send verification email
    console.log('Verification token:', verificationToken);

    const token = generateToken({ userId: user.id, email: user.email });

    return NextResponse.json(
      {
        token,
        message: 'Account created successfully. Please check your email to verify your account.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          firmName: user.firm_name,
          emailVerified: user.email_verified,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
