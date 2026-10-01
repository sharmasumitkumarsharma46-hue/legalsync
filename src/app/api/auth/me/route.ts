import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/pool';
import { getUserFromRequest, unauthorized } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  const session = getUserFromRequest(request);
  if (!session) {
    return unauthorized();
  }

  const result = await pool.query(
    `SELECT id, email, name, firm_name, email_verified
     FROM users
     WHERE id = $1`,
    [session.userId]
  );

  if (result.rows.length === 0) {
    return unauthorized();
  }

  const row = result.rows[0];

  return NextResponse.json({
    success: true,
    user: {
      id: row.id,
      email: row.email,
      name: row.name,
      firmName: row.firm_name,
      emailVerified: row.email_verified,
    },
  });
}
