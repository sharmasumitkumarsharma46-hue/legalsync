import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/pool';
import { getUserFromRequest, unauthorized } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  const session = getUserFromRequest(request);
  if (!session) return unauthorized();

  const limitParam = Number(request.nextUrl.searchParams.get('limit') || 20);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 20;

  const result = await pool.query(
    `SELECT id, sync_type, events_synced, status, error_message, started_at, completed_at
     FROM sync_history WHERE user_id = $1 ORDER BY started_at DESC LIMIT $2`,
    [session.userId, limit]
  );

  const history = (
    result.rows as Array<{
      id: string; sync_type: string; events_synced: number; status: string;
      error_message: string | null; started_at: Date | null; completed_at: Date | null;
    }>
  ).map((row) => ({
    id: row.id, syncType: row.sync_type, eventsSynced: row.events_synced,
    status: row.status, errorMessage: row.error_message,
    startedAt: row.started_at ? new Date(row.started_at).toISOString() : null,
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
  }));

  return NextResponse.json({ success: true, history });
}
