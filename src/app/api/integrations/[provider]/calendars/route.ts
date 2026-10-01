import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/pool';
import { requireSession } from '@/lib/auth/session';
import { PROVIDERS, isProvider } from '@/lib/integrations/registry';
import { getValidAccessToken } from '@/lib/integrations/token-refresh';
import { logger } from '@/lib/logger';

interface IntegrationRow {
  id: string;
  integration_type: string;
  status: string;
}

const MAX_SELECTED_CALENDARS = 50;

async function loadIntegration(
  userId: string,
  integrationType: string
): Promise<IntegrationRow | null> {
  const result = await pool.query(
    `SELECT id, integration_type, status FROM integrations
     WHERE user_id = $1 AND integration_type = $2`,
    [userId, integrationType]
  );
  return (result.rows[0] as IntegrationRow | undefined) ?? null;
}

/** Lists the calendars available on the provider and marks the saved selection. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  if (!isProvider(provider)) {
    return NextResponse.json({ error: 'Unsupported integration provider' }, { status: 400 });
  }

  const { session, response } = requireSession(request);
  if (!session) return response;

  const config = PROVIDERS[provider];
  const integration = await loadIntegration(session.userId, config.integrationType);

  if (!integration || integration.status !== 'connected') {
    return NextResponse.json(
      { error: `Connect ${config.label} before selecting calendars.` },
      { status: 409 }
    );
  }

  const accessToken = await getValidAccessToken(session.userId, config.integrationType);
  if (!accessToken) {
    return NextResponse.json(
      { error: `Stored ${config.label} credentials are no longer valid. Please reconnect.` },
      { status: 409 }
    );
  }

  try {
    const [available, saved] = await Promise.all([
      config.listCalendars(accessToken),
      pool.query(
        `SELECT calendar_id, is_selected FROM calendar_mappings
         WHERE user_id = $1 AND integration_id = $2`,
        [session.userId, integration.id]
      ),
    ]);

    const selectedIds = new Set(
      (saved.rows as Array<{ calendar_id: string; is_selected: boolean }>)
        .filter((row) => row.is_selected)
        .map((row) => row.calendar_id)
    );

    const calendars = available.map((calendar) => ({
      id: calendar.id,
      name: calendar.name,
      isPrimary: calendar.isPrimary,
      selected: selectedIds.has(calendar.id),
    }));

    return NextResponse.json({
      success: true,
      provider,
      canSyncEvents: config.supportsEventSync,
      calendars,
      selectedCount: selectedIds.size,
    });
  } catch (error) {
    logger.error('Failed to list provider calendars', {
      provider,
      userId: session.userId,
      error: String(error),
    });
    return NextResponse.json(
      { error: `Could not load calendars from ${config.label}.` },
      { status: 502 }
    );
  }
}
/** Replaces the saved calendar selection for this provider. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  if (!isProvider(provider)) {
    return NextResponse.json({ error: 'Unsupported integration provider' }, { status: 400 });
  }

  const { session, response } = requireSession(request);
  if (!session) return response;

  const config = PROVIDERS[provider];
  if (!config.supportsEventSync) {
    return NextResponse.json(
      { error: `${config.label} is a source system and cannot receive calendar events.` },
      { status: 400 }
    );
  }

  let body: { calendars?: unknown };
  try {
    body = (await request.json()) as { calendars?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!Array.isArray(body.calendars)) {
    return NextResponse.json({ error: 'A calendars array is required' }, { status: 400 });
  }

  const selection = body.calendars
    .map((entry) => {
      if (typeof entry === 'string') {
        return { id: entry, name: entry };
      }
      if (typeof entry === 'object' && entry !== null) {
        const record = entry as { id?: unknown; name?: unknown };
        if (typeof record.id === 'string' && record.id.length > 0) {
          return {
            id: record.id,
            name: typeof record.name === 'string' ? record.name : record.id,
          };
        }
      }
      return null;
    })
    .filter((entry): entry is { id: string; name: string } => entry !== null);

  if (selection.length !== body.calendars.length) {
    return NextResponse.json({ error: 'Each calendar needs a string id' }, { status: 400 });
  }

  if (selection.length > MAX_SELECTED_CALENDARS) {
    return NextResponse.json(
      { error: `Select at most ${MAX_SELECTED_CALENDARS} calendars` },
      { status: 400 }
    );
  }

  if (selection.length === 0) {
    return NextResponse.json(
      { error: 'Select at least one calendar so sync has a destination.' },
      { status: 400 }
    );
  }

  const integration = await loadIntegration(session.userId, config.integrationType);
  if (!integration || integration.status !== 'connected') {
    return NextResponse.json(
      { error: `Connect ${config.label} before selecting calendars.` },
      { status: 409 }
    );
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM calendar_mappings WHERE user_id = $1 AND integration_id = $2`, [
      session.userId,
      integration.id,
    ]);

    for (const calendar of selection) {
      await client.query(
        `INSERT INTO calendar_mappings (user_id, integration_id, calendar_id, calendar_name, is_selected)
         VALUES ($1, $2, $3, $4, TRUE)`,
        [session.userId, integration.id, calendar.id, calendar.name]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to save calendar selection', {
      provider,
      userId: session.userId,
      error: String(error),
    });
    return NextResponse.json({ error: 'Could not save calendar selection' }, { status: 500 });
  } finally {
    client.release();
  }

  logger.info('Calendar selection saved', {
    provider,
    userId: session.userId,
    count: selection.length,
  });

  return NextResponse.json({ success: true, provider, selectedCount: selection.length });
}
