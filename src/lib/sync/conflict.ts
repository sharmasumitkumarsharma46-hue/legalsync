import pool from '@/lib/db/pool';
import { ClioClient } from '@/lib/integrations/clio/client';
import { getValidAccessToken } from '@/lib/integrations/token-refresh';
import {
  createAdapter,
  DESTINATION_INTEGRATION_TYPES,
  DESTINATION_PROVIDERS,
  type DestinationProvider,
  type NormalizedEvent,
} from '@/lib/sync/engine';
import { logger } from '@/lib/logger';

export interface ConflictRecord {
  id: string;
  eventId: string | null;
  eventTitle: string | null;
  conflictType: string;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
  clioVersion: unknown;
  calendarVersion: unknown;
}

export interface EventSnapshot {
  title: string;
  description?: string;
  start?: string;
  end?: string;
  location?: string;
}

export type ResolutionChoice = 'last_write_wins' | 'clio' | 'calendar';

export const RESOLUTION_CHOICES: ResolutionChoice[] = ['last_write_wins', 'clio', 'calendar'];

/** Conflicts are detected by comparing live content, so the scan is capped. */
const MAX_EVENTS_SCANNED_PER_RUN = 25;

function snapshotOf(event: NormalizedEvent): EventSnapshot {
  return {
    title: event.title,
    description: event.description,
    start: event.start,
    end: event.end,
    location: event.location,
  };
}

function normalise(value: string | undefined | null): string {
  return (value ?? '').trim();
}

function differs(a: EventSnapshot, b: EventSnapshot): boolean {
  return (
    normalise(a.title) !== normalise(b.title) ||
    normalise(a.description) !== normalise(b.description) ||
    normalise(a.start) !== normalise(b.start) ||
    normalise(a.end) !== normalise(b.end) ||
    normalise(a.location) !== normalise(b.location)
  );
}

function parseSnapshot(value: unknown): EventSnapshot | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = value as Partial<EventSnapshot>;
  if (typeof record.title !== 'string') {
    return null;
  }
  return {
    title: record.title,
    description: typeof record.description === 'string' ? record.description : undefined,
    start: typeof record.start === 'string' ? record.start : undefined,
    end: typeof record.end === 'string' ? record.end : undefined,
    location: typeof record.location === 'string' ? record.location : undefined,
  };
}

interface MappedEventRow {
  id: string;
  title: string;
  clio_event_id: string;
  google_event_id: string | null;
  outlook_event_id: string | null;
  synced_snapshot: unknown;
}

interface DestinationLink {
  provider: DestinationProvider;
  integrationId: string;
  calendarId: string;
  providerEventId: string;
}

export class ConflictDetector {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Compare live Clio and calendar content against the snapshot captured at the
   * last successful sync. A conflict is only raised when BOTH sides moved, so
   * ordinary one-sided edits keep flowing through normal sync.
   */
  async detectConflicts(): Promise<ConflictRecord[]> {
    const clioToken = await getValidAccessToken(this.userId, 'clio');
    if (!clioToken) {
      return this.listConflicts();
    }

    const events = await pool.query(
      `SELECT id, title, clio_event_id, google_event_id, outlook_event_id, synced_snapshot
       FROM events
       WHERE user_id = $1
         AND clio_event_id IS NOT NULL
         AND synced_snapshot IS NOT NULL
         AND (google_event_id IS NOT NULL OR outlook_event_id IS NOT NULL)
       ORDER BY updated_at DESC
       LIMIT $2`,
      [this.userId, MAX_EVENTS_SCANNED_PER_RUN]
    );

    const clio = new ClioClient(clioToken);

    for (const row of events.rows as MappedEventRow[]) {
      const snapshot = parseSnapshot(row.synced_snapshot);
      if (!snapshot) {
        continue;
      }

      const links = await this.loadDestinationLinks(row);
      if (links.length === 0) {
        continue;
      }

      try {
        const clioEvent = await clio.getEvent(row.clio_event_id);
        const clioSnapshot: EventSnapshot = {
          title: clioEvent.title || '(untitled)',
          description: clioEvent.description,
          start: clioEvent.start?.date_time,
          end: clioEvent.end?.date_time,
          location: clioEvent.location,
        };

        if (!differs(clioSnapshot, snapshot)) {
          continue;
        }

        for (const link of links) {
          const token = await getValidAccessToken(
            this.userId,
            DESTINATION_INTEGRATION_TYPES[link.provider]
          );
          if (!token) {
            continue;
          }

          const adapter = createAdapter(link.provider, token);
          const calendarEvent = await adapter.getEvent(link.calendarId, link.providerEventId);
          const calendarSnapshot = snapshotOf(calendarEvent);

          if (!differs(calendarSnapshot, snapshot)) {
            continue;
          }

          await pool.query(
            `INSERT INTO conflicts (user_id, event_id, conflict_type, clio_version, calendar_version)
             VALUES ($1, $2, 'modification_conflict', $3, $4)
             ON CONFLICT (event_id) WHERE resolved_at IS NULL DO NOTHING`,
            [this.userId, row.id, JSON.stringify(clioSnapshot), JSON.stringify(calendarSnapshot)]
          );
        }
      } catch (error) {
        logger.warn('Conflict scan skipped an event', {
          eventId: row.id,
          error: String(error),
        });
      }
    }

    return this.listConflicts();
  }

  private async loadDestinationLinks(row: MappedEventRow): Promise<DestinationLink[]> {
    const result = await pool.query(
      `SELECT provider, integration_id, calendar_id, provider_event_id
       FROM calendar_event_map
       WHERE user_id = $1 AND event_id = $2`,
      [this.userId, row.id]
    );

    const links: DestinationLink[] = [];
    for (const link of result.rows as Array<{
      provider: string;
      integration_id: string;
      calendar_id: string;
      provider_event_id: string;
    }>) {
      if (!DESTINATION_PROVIDERS.includes(link.provider as DestinationProvider)) {
        continue;
      }
      links.push({
        provider: link.provider as DestinationProvider,
        integrationId: link.integration_id,
        calendarId: link.calendar_id,
        providerEventId: link.provider_event_id,
      });
    }

    if (links.length > 0) {
      return links;
    }

    // Fall back to the primary provider id stored on the event when the
    // per-calendar map has not been written yet.
    for (const provider of DESTINATION_PROVIDERS) {
      const providerEventId = provider === 'google' ? row.google_event_id : row.outlook_event_id;
      if (!providerEventId) {
        continue;
      }

      const integrationRes = await pool.query(
        `SELECT id FROM integrations
         WHERE user_id = $1 AND integration_type = $2 AND status = 'connected'`,
        [this.userId, DESTINATION_INTEGRATION_TYPES[provider]]
      );
      const integration = integrationRes.rows[0] as { id: string } | undefined;
      if (!integration) {
        continue;
      }

      const calendarRes = await pool.query(
        `SELECT calendar_id FROM calendar_mappings
         WHERE user_id = $1 AND integration_id = $2 AND is_selected = TRUE
         ORDER BY created_at ASC LIMIT 1`,
        [this.userId, integration.id]
      );
      const calendarRow = calendarRes.rows[0] as { calendar_id: string } | undefined;
      if (!calendarRow) {
        continue;
      }

      links.push({
        provider,
        integrationId: integration.id,
        calendarId: calendarRow.calendar_id,
        providerEventId,
      });
    }

    return links;
  }

  async listConflicts(): Promise<ConflictRecord[]> {
    const result = await pool.query(
      `SELECT c.id, c.event_id, c.conflict_type, c.resolution, c.resolved_at, c.created_at,
              c.clio_version, c.calendar_version, e.title AS event_title
       FROM conflicts c
       LEFT JOIN events e ON e.id = c.event_id
       WHERE c.user_id = $1 AND c.resolved_at IS NULL
       ORDER BY c.created_at DESC
       LIMIT 100`,
      [this.userId]
    );

    return (
      result.rows as Array<{
        id: string;
        event_id: string | null;
        event_title: string | null;
        conflict_type: string;
        resolution: string | null;
        resolved_at: Date | null;
        created_at: Date;
        clio_version: unknown;
        calendar_version: unknown;
      }>
    ).map((row) => ({
      id: row.id,
      eventId: row.event_id,
      eventTitle: row.event_title,
      conflictType: row.conflict_type,
      resolution: row.resolution,
      resolvedAt: row.resolved_at ? new Date(row.resolved_at).toISOString() : null,
      createdAt: new Date(row.created_at).toISOString(),
      clioVersion: row.clio_version,
      calendarVersion: row.calendar_version,
    }));
  }

  async resolveConflict(conflictId: string, resolution: ResolutionChoice): Promise<boolean> {
    const conflictRes = await pool.query(
      `SELECT id, event_id FROM conflicts
       WHERE id = $1 AND user_id = $2 AND resolved_at IS NULL`,
      [conflictId, this.userId]
    );
    const conflict = conflictRes.rows[0] as { id: string; event_id: string | null } | undefined;
    if (!conflict?.event_id) {
      return false;
    }

    const eventRes = await pool.query(
      `SELECT id, clio_event_id, google_event_id, outlook_event_id, synced_snapshot
       FROM events WHERE id = $1 AND user_id = $2`,
      [conflict.event_id, this.userId]
    );
    const event = eventRes.rows[0] as MappedEventRow | undefined;
    if (!event?.clio_event_id) {
      return false;
    }

    const links = await this.loadDestinationLinks(event);
    if (links.length === 0) {
      return false;
    }

    try {
      const winner =
        resolution === 'last_write_wins' ? await this.pickLastWriter(event, links) : resolution;
      await this.applyWinner(event, links, winner);
    } catch (error) {
      logger.error('Failed to apply conflict resolution', {
        conflictId,
        resolution,
        error: String(error),
      });
      return false;
    }

    await pool.query(
      `UPDATE conflicts SET resolution = $1, resolved_at = NOW() WHERE id = $2 AND user_id = $3`,
      [resolution, conflictId, this.userId]
    );

    return true;
  }

  private async pickLastWriter(
    event: MappedEventRow,
    links: DestinationLink[]
  ): Promise<'clio' | 'calendar'> {
    const link = links[0];
    const [clioToken, destinationToken] = await Promise.all([
      getValidAccessToken(this.userId, 'clio'),
      getValidAccessToken(this.userId, DESTINATION_INTEGRATION_TYPES[link.provider]),
    ]);

    if (!clioToken || !destinationToken) {
      return 'clio';
    }

    const [clioEvent, calendarEvent] = await Promise.all([
      new ClioClient(clioToken).getEvent(event.clio_event_id),
      createAdapter(link.provider, destinationToken).getEvent(link.calendarId, link.providerEventId),
    ]);

    const clioTime = Date.parse(clioEvent.updated_at ?? '');
    const calendarTime = Date.parse(calendarEvent.updatedAt ?? '');

    if (Number.isNaN(clioTime)) return 'calendar';
    if (Number.isNaN(calendarTime)) return 'clio';
    return clioTime >= calendarTime ? 'clio' : 'calendar';
  }

  private async applyWinner(
    event: MappedEventRow,
    links: DestinationLink[],
    winner: 'clio' | 'calendar'
  ): Promise<void> {
    const clioToken = await getValidAccessToken(this.userId, 'clio');
    if (!clioToken) {
      throw new Error('Clio credentials are unavailable');
    }
    const clio = new ClioClient(clioToken);

    let resolved: NormalizedEvent;

    if (winner === 'clio') {
      const clioEvent = await clio.getEvent(event.clio_event_id);
      resolved = {
        id: clioEvent.id,
        title: clioEvent.title || '(untitled)',
        description: clioEvent.description,
        start: clioEvent.start?.date_time,
        end: clioEvent.end?.date_time,
        location: clioEvent.location,
      };

      for (const target of links) {
        const token = await getValidAccessToken(
          this.userId,
          DESTINATION_INTEGRATION_TYPES[target.provider]
        );
        if (!token) {
          continue;
        }
        await createAdapter(target.provider, token).updateEvent(
          target.calendarId,
          target.providerEventId,
          resolved
        );
      }
    } else {
      const link = links[0];
      const token = await getValidAccessToken(
        this.userId,
        DESTINATION_INTEGRATION_TYPES[link.provider]
      );
      if (!token) {
        throw new Error(`${link.provider} credentials are unavailable`);
      }

      resolved = await createAdapter(link.provider, token).getEvent(
        link.calendarId,
        link.providerEventId
      );

      await clio.updateEvent(event.clio_event_id, {
        title: resolved.title,
        description: resolved.description,
        start: { date_time: resolved.start },
        end: { date_time: resolved.end },
        location: resolved.location,
      });
    }

    await pool.query(
      `UPDATE events
       SET title = $1, description = $2, start_time = $3, end_time = $4, location = $5,
           synced_snapshot = $6, updated_at = NOW()
       WHERE id = $7 AND user_id = $8`,
      [
        resolved.title,
        resolved.description ?? null,
        resolved.start ?? null,
        resolved.end ?? null,
        resolved.location ?? null,
        JSON.stringify({
          title: resolved.title,
          description: resolved.description ?? null,
          start: resolved.start ?? null,
          end: resolved.end ?? null,
          location: resolved.location ?? null,
        }),
        event.id,
        this.userId,
      ]
    );
  }

}

export { differs, parseSnapshot, snapshotOf };
