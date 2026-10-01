import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/pool';
import { requireSession } from '@/lib/auth/session';

const ALLOWED_FREQUENCIES = [5, 15, 30, 60];
const ALLOWED_RULES = ['last_write_wins', 'clio', 'calendar', 'manual'];

export interface UserSettings {
  syncFrequency: number;
  conflictResolutionRule: string;
  emailNotifications: boolean;
  syncFailureNotifications: boolean;
  conflictNotifications: boolean;
  dailySummary: boolean;
  timezone: string;
}

const DEFAULT_SETTINGS: UserSettings = {
  syncFrequency: 5,
  conflictResolutionRule: 'last_write_wins',
  emailNotifications: true,
  syncFailureNotifications: true,
  conflictNotifications: true,
  dailySummary: false,
  timezone: 'UTC',
};

function toResponse(row: Record<string, unknown>): UserSettings {
  return {
    syncFrequency: Number(row.sync_frequency ?? DEFAULT_SETTINGS.syncFrequency),
    conflictResolutionRule: String(
      row.conflict_resolution_rule ?? DEFAULT_SETTINGS.conflictResolutionRule
    ),
    emailNotifications: Boolean(row.email_notifications ?? true),
    syncFailureNotifications: Boolean(row.sync_failure_notifications ?? true),
    conflictNotifications: Boolean(row.conflict_notifications ?? true),
    dailySummary: Boolean(row.daily_summary ?? false),
    timezone: String(row.timezone ?? DEFAULT_SETTINGS.timezone),
  };
}

export async function GET(request: NextRequest) {
  const { session, response } = requireSession(request);
  if (!session) return response;

  const result = await pool.query(`SELECT * FROM user_settings WHERE user_id = $1`, [
    session.userId,
  ]);

  if (result.rows.length === 0) {
    return NextResponse.json({ success: true, settings: DEFAULT_SETTINGS });
  }

  return NextResponse.json({ success: true, settings: toResponse(result.rows[0]) });
}

export async function PUT(request: NextRequest) {
  const { session, response } = requireSession(request);
  if (!session) return response;

  let body: Partial<UserSettings>;
  try {
    body = (await request.json()) as Partial<UserSettings>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (body.syncFrequency !== undefined && !ALLOWED_FREQUENCIES.includes(Number(body.syncFrequency))) {
    return NextResponse.json(
      { error: `Sync frequency must be one of ${ALLOWED_FREQUENCIES.join(', ')} minutes` },
      { status: 400 }
    );
  }

  if (
    body.conflictResolutionRule !== undefined &&
    !ALLOWED_RULES.includes(String(body.conflictResolutionRule))
  ) {
    return NextResponse.json(
      { error: `Conflict resolution rule must be one of ${ALLOWED_RULES.join(', ')}` },
      { status: 400 }
    );
  }

  const current = await pool.query(`SELECT * FROM user_settings WHERE user_id = $1`, [
    session.userId,
  ]);
  const merged = {
    ...toResponse(current.rows[0] ?? {}),
    ...body,
  };

  await pool.query(
    `INSERT INTO user_settings (
       user_id, sync_frequency, conflict_resolution_rule, email_notifications,
       sync_failure_notifications, conflict_notifications, daily_summary, timezone
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (user_id) DO UPDATE SET
       sync_frequency = EXCLUDED.sync_frequency,
       conflict_resolution_rule = EXCLUDED.conflict_resolution_rule,
       email_notifications = EXCLUDED.email_notifications,
       sync_failure_notifications = EXCLUDED.sync_failure_notifications,
       conflict_notifications = EXCLUDED.conflict_notifications,
       daily_summary = EXCLUDED.daily_summary,
       timezone = EXCLUDED.timezone,
       updated_at = NOW()`,
    [
      session.userId,
      merged.syncFrequency,
      merged.conflictResolutionRule,
      merged.emailNotifications,
      merged.syncFailureNotifications,
      merged.conflictNotifications,
      merged.dailySummary,
      merged.timezone,
    ]
  );

  return NextResponse.json({ success: true, settings: merged });
}
