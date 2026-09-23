import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/pool';
import { verifyPassword, generateToken } from '@/lib/auth/utils';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

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

    const user = result.rows[0];

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

    return NextResponse.json(
      {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          firmName: user.firm_name,
          emailVerified: user.email_verified,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
