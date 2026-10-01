import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/pool';
import { requireSession } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  const { session, response } = requireSession(request);
  if (!session) return response;

  const limitParam = Number(request.nextUrl.searchParams.get('limit') ?? 12);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 50) : 12;

  const result = await pool.query(
    `SELECT id, subscription_id, amount, currency, status, due_date, paid_at, created_at
     FROM invoices
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [session.userId, limit]
  );

  const invoices = (
    result.rows as Array<{
      id: string;
      subscription_id: string | null;
      amount: string | number;
      currency: string | null;
      status: string;
      due_date: Date | null;
      paid_at: Date | null;
      created_at: Date;
    }>
  ).map((row) => ({
    id: row.id,
    subscriptionId: row.subscription_id,
    amount: Number(row.amount),
    currency: row.currency || 'USD',
    status: row.status,
    dueDate: row.due_date ? new Date(row.due_date).toISOString() : null,
    paidAt: row.paid_at ? new Date(row.paid_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString(),
  }));

  return NextResponse.json({ success: true, invoices });
}
