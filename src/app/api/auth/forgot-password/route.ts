import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/pool';
import { generatePasswordResetToken } from '@/lib/auth/utils';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { message: 'If an account exists for that email, a reset link has been sent.' },
        { status: 200 }
      );
    }

    const user = result.rows[0];
    const resetToken = generatePasswordResetToken();
    const resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      `UPDATE users
       SET password_reset_token = $1,
           password_reset_expires_at = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [resetToken, resetExpiresAt, user.id]
    );

    await sendPasswordResetEmail(user.email, resetToken);

    return NextResponse.json(
      { message: 'If an account exists for that email, a reset link has been sent.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
