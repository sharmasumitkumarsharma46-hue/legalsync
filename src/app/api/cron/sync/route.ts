import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/pool';
import { SyncEngine } from '@/lib/sync/engine';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Any user with Clio plus at least one calendar destination is a sync target.
  const result = await pool.query(
    `SELECT DISTINCT i1.user_id
     FROM integrations i1
     JOIN integrations i2 ON i1.user_id = i2.user_id
     WHERE i1.integration_type = 'clio' AND i1.status = 'connected'
       AND i2.integration_type IN ('google_calendar', 'outlook') AND i2.status = 'connected'`
  );

  const rows = result.rows as Array<{ user_id: string }>;
  const results: Array<{
    userId: string;
    success: boolean;
    eventsSynced: number;
    conflicts: number;
    errors: string[];
  }> = [];

  for (const row of rows) {
    try {
      const engine = new SyncEngine(row.user_id);
      const syncResults = await engine.syncAllDestinations();

      const eventsSynced = syncResults.reduce((sum, item) => sum + item.eventsSynced, 0);
      const conflicts = syncResults.reduce((sum, item) => sum + item.conflicts, 0);
      const errors = syncResults.flatMap((item) => item.errors);

      results.push({
        userId: row.user_id,
        success: syncResults.every((item) => item.success),
        eventsSynced,
        conflicts,
        errors,
      });

      logger.info('Cron sync complete', { userId: row.user_id, eventsSynced, conflicts });
    } catch (error) {
      results.push({
        userId: row.user_id,
        success: false,
        eventsSynced: 0,
        conflicts: 0,
        errors: [String(error)],
      });
      logger.error('Cron sync failed', { userId: row.user_id, error: String(error) });
    }
  }

  return NextResponse.json({ success: true, usersProcessed: results.length, results });
}

