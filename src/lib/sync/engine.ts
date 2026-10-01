import pool from '@/lib/db/pool';
import { ClioClient, ClioEvent } from '@/lib/integrations/clio/client';
import { GoogleCalendarClient } from '@/lib/integrations/google/client';
import { OutlookClient } from '@/lib/integrations/outlook/client';
import { getValidAccessToken } from '@/lib/integrations/token-refresh';
import { ConflictDetector } from '@/lib/sync/conflict';
import { defaultRetryHandler } from '@/lib/sync/retry';
import { logger } from '@/lib/logger';

export interface SyncResult {
  success: boolean;
  eventsSynced: number;
  eventsCreated: number;
  eventsUpdated: number;
  errors: string[];
  conflicts: number;
  destinations: string[];
}

export type DestinationProvider = 'google' | 'outlook';

/** Provider-neutral event shape used across adapters. */
export interface NormalizedEvent {
  id: string;
  title: string;
  description?: string;
  start?: string;
  end?: string;
  location?: string;
  /** Provider "last modified" timestamp, used by last-write-wins conflict resolution. */
  updatedAt?: string;
}

export interface DestinationAdapter {
  provider: DestinationProvider;
  label: string;
  integrationType: string;
  eventIdColumn: 'google_event_id' | 'outlook_event_id';
  forwardSyncType: 'clio_to_google' | 'clio_to_outlook';
  reverseSyncType: 'google_to_clio' | 'outlook_to_clio';
  listEvents(calendarId: string, start: Date, end: Date): Promise<NormalizedEvent[]>;
  getEvent(calendarId: string, eventId: string): Promise<NormalizedEvent>;
  createEvent(calendarId: string, event: NormalizedEvent): Promise<NormalizedEvent>;
  updateEvent(calendarId: string, eventId: string, event: NormalizedEvent): Promise<NormalizedEvent>;
}

interface IntegrationRow {
  id: string;
  integration_type: string;
  status: string;
}

/** Sync reaches 30 days back and 180 days forward so the window stays bounded. */
const SYNC_WINDOW_PAST_DAYS = 30;
const SYNC_WINDOW_FUTURE_DAYS = 180;

function syncWindow(): { start: Date; end: Date } {
  const start = new Date();
  start.setDate(start.getDate() - SYNC_WINDOW_PAST_DAYS);
  const end = new Date();
  end.setDate(end.getDate() + SYNC_WINDOW_FUTURE_DAYS);
  return { start, end };
}

function emptyResult(): SyncResult {
  return {
    success: true,
    eventsSynced: 0,
    eventsCreated: 0,
    eventsUpdated: 0,
    errors: [],
    conflicts: 0,
    destinations: [],
  };
}


export function createGoogleAdapter(accessToken: string): DestinationAdapter {
  const client = new GoogleCalendarClient(accessToken);

  return {
    provider: 'google',
    label: 'Google Calendar',
    integrationType: 'google_calendar',
    eventIdColumn: 'google_event_id',
    forwardSyncType: 'clio_to_google',
    reverseSyncType: 'google_to_clio',

    async listEvents(calendarId, start, end) {
      const events = await client.getEvents(calendarId, start, end);
      return events.map((event) => ({
        id: event.id || '',
        title: event.summary || '(untitled)',
        description: event.description,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        location: event.location,
        updatedAt: event.updated,
      }));
    },

    async getEvent(calendarId, eventId) {
      const event = await client.getEvent(calendarId, eventId);
      return {
        id: event.id || eventId,
        title: event.summary || '(untitled)',
        description: event.description,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        location: event.location,
        updatedAt: event.updated,
      };
    },

    async createEvent(calendarId, event) {
      const created = await client.createEvent(calendarId, {
        summary: event.title,
        description: event.description,
        start: { dateTime: event.start },
        end: { dateTime: event.end },
        location: event.location,
      });
      return { ...event, id: created.id || '' };
    },

    async updateEvent(calendarId, eventId, event) {
      const updated = await client.updateEvent(calendarId, eventId, {
        summary: event.title,
        description: event.description,
        start: { dateTime: event.start },
        end: { dateTime: event.end },
        location: event.location,
      });
      return { ...event, id: updated.id || eventId };
    },
  };
}

export function createOutlookAdapter(accessToken: string): DestinationAdapter {
  const client = new OutlookClient(accessToken);

  return {
    provider: 'outlook',
    label: 'Outlook',
    integrationType: 'outlook',
    eventIdColumn: 'outlook_event_id',
    forwardSyncType: 'clio_to_outlook',
    reverseSyncType: 'outlook_to_clio',

    async listEvents(calendarId, start, end) {
      const events = await client.getEvents(calendarId, start, end);
      return events.map((event) => ({
        id: event.id || '',
        title: event.subject || '(untitled)',
        description: event.body?.content,
        start: event.start?.dateTime,
        end: event.end?.dateTime,
        location: event.location?.displayName,
        updatedAt: event.lastModifiedDateTime,
      }));
    },

    async getEvent(calendarId, eventId) {
      const event = await client.getEvent(eventId);
      return {
        id: event.id || eventId,
        title: event.subject || '(untitled)',
        description: event.body?.content,
        start: event.start?.dateTime,
        end: event.end?.dateTime,
        location: event.location?.displayName,
        updatedAt: event.lastModifiedDateTime,
      };
    },

    async createEvent(calendarId, event) {
      const created = await client.createEvent(calendarId, {
        subject: event.title,
        body: event.description ? { content: event.description } : undefined,
        start: { dateTime: event.start || '', timeZone: 'UTC' },
        end: { dateTime: event.end || '', timeZone: 'UTC' },
        location: event.location ? { displayName: event.location } : undefined,
      });
      return { ...event, id: created.id || '' };
    },

    async updateEvent(calendarId, eventId, event) {
      const updated = await client.updateEvent(calendarId, eventId, {
        subject: event.title,
        body: event.description ? { content: event.description } : undefined,
        start: { dateTime: event.start || '', timeZone: 'UTC' },
        end: { dateTime: event.end || '', timeZone: 'UTC' },
        location: event.location ? { displayName: event.location } : undefined,
      });
      return { ...event, id: updated.id || eventId };
    },
  };
}

export function createAdapter(provider: DestinationProvider, accessToken: string): DestinationAdapter {
  return provider === 'outlook' ? createOutlookAdapter(accessToken) : createGoogleAdapter(accessToken);
}

export const DESTINATION_PROVIDERS: DestinationProvider[] = ['google', 'outlook'];
export const DESTINATION_LABELS: Record<DestinationProvider, string> = {
  google: 'Google Calendar',
  outlook: 'Outlook',
};
export const DESTINATION_INTEGRATION_TYPES: Record<DestinationProvider, string> = {
  google: 'google_calendar',
  outlook: 'outlook',
};

export class SyncEngine {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  private async loadIntegration(integrationType: string): Promise<IntegrationRow | null> {
    const result = await pool.query(
      `SELECT id, integration_type, status
       FROM integrations
       WHERE user_id = $1 AND integration_type = $2 AND status = 'connected'`,
      [this.userId, integrationType]
    );
    return (result.rows[0] as IntegrationRow | undefined) ?? null;
  }

  private async loadSelectedCalendars(
    integrationId: string
  ): Promise<Array<{ calendar_id: string; calendar_name: string | null }>> {
    const result = await pool.query(
      `SELECT calendar_id, calendar_name
       FROM calendar_mappings
       WHERE user_id = $1 AND integration_id = $2 AND is_selected = TRUE
       ORDER BY created_at ASC`,
      [this.userId, integrationId]
    );
    return result.rows as Array<{ calendar_id: string; calendar_name: string | null }>;
  }

  private async loadClioClient(): Promise<{ client: ClioClient; integrationId: string } | null> {
    const integration = await this.loadIntegration('clio');
    if (!integration) {
      return null;
    }

    const accessToken = await getValidAccessToken(this.userId, 'clio');
    if (!accessToken) {
      return null;
    }

    return { client: new ClioClient(accessToken), integrationId: integration.id };
  }

  /** Primary Clio calendar used when an event has to be created in Clio. */
  private async loadClioTargetCalendar(): Promise<string | undefined> {
    const integration = await this.loadIntegration('clio');
    if (!integration) {
      return undefined;
    }
    const selected = await this.loadSelectedCalendars(integration.id);
    if (selected.length > 0) {
      return selected[0].calendar_id;
    }

    try {
      const accessToken = await getValidAccessToken(this.userId, 'clio');
      if (!accessToken) return undefined;
      const calendars = await new ClioClient(accessToken).getCalendars();
      return calendars[0]?.id;
    } catch (error) {
      logger.warn('Unable to resolve a Clio calendar', { error: String(error) });
      return undefined;
    }
  }

  private async loadMapping(
    eventId: string,
    integrationId: string,
    calendarId: string
  ): Promise<string | null> {
    const result = await pool.query(
      `SELECT provider_event_id FROM calendar_event_map
       WHERE event_id = $1 AND integration_id = $2 AND calendar_id = $3`,
      [eventId, integrationId, calendarId]
    );
    const row = result.rows[0] as { provider_event_id: string } | undefined;
    return row?.provider_event_id ?? null;
  }

  private async saveMapping(params: {
    eventId: string;
    integrationId: string;
    calendarId: string;
    provider: string;
    providerEventId: string;
  }): Promise<void> {
    await pool.query(
      `INSERT INTO calendar_event_map
         (user_id, event_id, integration_id, calendar_id, provider, provider_event_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (event_id, integration_id, calendar_id)
       DO UPDATE SET provider_event_id = EXCLUDED.provider_event_id, updated_at = NOW()`,
      [
        this.userId,
        params.eventId,
        params.integrationId,
        params.calendarId,
        params.provider,
        params.providerEventId,
      ]
    );
  }

  private async recordHistory(params: {
    sourceIntegrationId: string | null;
    targetIntegrationId: string | null;
    syncType: string;
    eventsSynced: number;
    errors: string[];
  }): Promise<void> {
    await pool.query(
      `INSERT INTO sync_history
         (user_id, source_integration_id, target_integration_id, sync_type, events_synced, status, error_message, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        this.userId,
        params.sourceIntegrationId,
        params.targetIntegrationId,
        params.syncType,
        params.eventsSynced,
        params.errors.length > 0 ? 'warning' : 'success',
        params.errors.length > 0 ? params.errors.join('; ') : null,
      ]
    );
  }

  private async detectConflicts(): Promise<number> {
    try {
      const conflicts = await new ConflictDetector(this.userId).detectConflicts();
      return conflicts.length;
    } catch (error) {
      logger.warn('Conflict detection failed', { error: String(error) });
      return 0;
    }
  }

  private toNormalized(clioEvent: ClioEvent): NormalizedEvent {
    return {
      id: clioEvent.id,
      title: clioEvent.title || '(untitled)',
      description: clioEvent.description,
      start: clioEvent.start?.date_time,
      end: clioEvent.end?.date_time,
      location: clioEvent.location,
    };
  }

  /** Upsert the local event row and return its database id. */
  private async upsertEventRow(clioEvent: ClioEvent): Promise<string> {
    const start = clioEvent.start?.date_time ?? clioEvent.end?.date_time ?? null;
    const end = clioEvent.end?.date_time ?? clioEvent.start?.date_time ?? null;

    const result = await pool.query(
      `INSERT INTO events
         (user_id, clio_event_id, title, description, start_time, end_time, location, case_name, case_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (user_id, clio_event_id)
       DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         start_time = EXCLUDED.start_time,
         end_time = EXCLUDED.end_time,
         location = EXCLUDED.location,
         case_name = EXCLUDED.case_name,
         case_id = EXCLUDED.case_id,
         updated_at = NOW()
       RETURNING id`,
      [
        this.userId,
        clioEvent.id,
        clioEvent.title || '(untitled)',
        clioEvent.description ?? null,
        start,
        end,
        clioEvent.location ?? null,
        clioEvent.matter?.name ?? null,
        clioEvent.matter?.id ?? null,
      ]
    );

    return (result.rows[0] as { id: string }).id;
  }

  /** Store the destination event id used by the conflict resolver and the UI. */
  private async setPrimaryDestinationId(
    eventRowId: string,
    provider: DestinationProvider,
    providerEventId: string
  ): Promise<void> {
    if (provider === 'google') {
      await pool.query(`UPDATE events SET google_event_id = $1, updated_at = NOW() WHERE id = $2`, [
        providerEventId,
        eventRowId,
      ]);
      return;
    }

    await pool.query(`UPDATE events SET outlook_event_id = $1, updated_at = NOW() WHERE id = $2`, [
      providerEventId,
      eventRowId,
    ]);
  }

  /**
   * Record the content both sides agreed on at the end of a successful sync.
   * Conflict detection compares live provider content against this snapshot.
   */
  private async saveSnapshot(eventRowId: string, event: NormalizedEvent): Promise<void> {
    await pool.query(`UPDATE events SET synced_snapshot = $1 WHERE id = $2`, [
      JSON.stringify({
        title: event.title,
        description: event.description ?? null,
        start: event.start ?? null,
        end: event.end ?? null,
        location: event.location ?? null,
      }),
      eventRowId,
    ]);
  }

  /**
   * Push Clio events into one destination provider. Safe to run repeatedly:
   * every write is keyed by the stored provider event id.
   */
  async syncClioTo(destination: DestinationProvider): Promise<SyncResult> {
    const result = emptyResult();
    const label = DESTINATION_LABELS[destination];
    const integrationType = DESTINATION_INTEGRATION_TYPES[destination];
    const syncType = destination === 'google' ? 'clio_to_google' : 'clio_to_outlook';
    result.destinations = [label];

    const destinationIntegration = await this.loadIntegration(integrationType);
    if (!destinationIntegration) {
      result.success = false;
      result.errors.push(`${label} is not connected.`);
      return result;
    }

    const destinationToken = await getValidAccessToken(this.userId, integrationType);
    if (!destinationToken) {
      result.success = false;
      result.errors.push(`${label} credentials are invalid. Please reconnect ${label}.`);
      return result;
    }

    const calendars = await this.loadSelectedCalendars(destinationIntegration.id);
    if (calendars.length === 0) {
      result.success = false;
      result.errors.push(`No ${label} calendar is selected for sync.`);
      await this.recordHistory({
        sourceIntegrationId: null,
        targetIntegrationId: destinationIntegration.id,
        syncType,
        eventsSynced: 0,
        errors: result.errors,
      });
      return result;
    }

    const clio = await this.loadClioClient();
    if (!clio) {
      result.success = false;
      result.errors.push('Clio is not connected or its credentials are invalid.');
      return result;
    }

    const adapter = createAdapter(destination, destinationToken);
    const { start, end } = syncWindow();

    const fetchResult = await defaultRetryHandler.execute(() => clio.client.getEvents(undefined, start, end));
    if (!fetchResult.success) {
      result.success = false;
      result.errors.push(`Failed to read Clio events: ${fetchResult.error?.message}`);
      await this.recordHistory({
        sourceIntegrationId: clio.integrationId,
        targetIntegrationId: destinationIntegration.id,
        syncType,
        eventsSynced: 0,
        errors: result.errors,
      });
      return result;
    }

    const clioEvents = (fetchResult.data as ClioEvent[] | undefined) ?? [];

    for (const clioEvent of clioEvents) {
      if (!clioEvent?.id) {
        continue;
      }

      try {
        const eventRowId = await this.upsertEventRow(clioEvent);
        const normalized = this.toNormalized(clioEvent);

        for (const calendar of calendars) {
          const existingProviderEventId = await this.loadMapping(
            eventRowId,
            destinationIntegration.id,
            calendar.calendar_id
          );

          if (existingProviderEventId) {
            await adapter.updateEvent(calendar.calendar_id, existingProviderEventId, normalized);
            result.eventsUpdated += 1;
          } else {
            const created = await adapter.createEvent(calendar.calendar_id, normalized);
            await this.saveMapping({
              eventId: eventRowId,
              integrationId: destinationIntegration.id,
              calendarId: calendar.calendar_id,
              provider: destination,
              providerEventId: created.id,
            });
            result.eventsCreated += 1;
            await this.setPrimaryDestinationId(eventRowId, destination, created.id);
          }
        }

        await this.saveSnapshot(eventRowId, normalized);
        result.eventsSynced += 1;
      } catch (error) {
        result.errors.push(`Event ${clioEvent.id}: ${error}`);
        logger.error('Event sync failed', {
          provider: destination,
          eventId: clioEvent.id,
          error: String(error),
        });
      }
    }

    await this.recordHistory({
      sourceIntegrationId: clio.integrationId,
      targetIntegrationId: destinationIntegration.id,
      syncType,
      eventsSynced: result.eventsSynced,
      errors: result.errors,
    });

    result.conflicts = await this.detectConflicts();
    return result;
  }


  /**
   * Pull destination calendar events back into Clio. Existing Clio event
   * links are reused so repeated runs update instead of duplicating.
   */
  async syncDestinationToClio(destination: DestinationProvider): Promise<SyncResult> {
    const result = emptyResult();
    const label = DESTINATION_LABELS[destination];
    const integrationType = DESTINATION_INTEGRATION_TYPES[destination];
    const syncType = destination === 'google' ? 'google_to_clio' : 'outlook_to_clio';
    result.destinations = [label];

    const destinationIntegration = await this.loadIntegration(integrationType);
    if (!destinationIntegration) {
      result.success = false;
      result.errors.push(`${label} is not connected.`);
      return result;
    }

    const destinationToken = await getValidAccessToken(this.userId, integrationType);
    if (!destinationToken) {
      result.success = false;
      result.errors.push(`${label} credentials are invalid. Please reconnect ${label}.`);
      return result;
    }

    const calendars = await this.loadSelectedCalendars(destinationIntegration.id);
    if (calendars.length === 0) {
      result.success = false;
      result.errors.push(`No ${label} calendar is selected for sync.`);
      return result;
    }

    const clio = await this.loadClioClient();
    if (!clio) {
      result.success = false;
      result.errors.push('Clio is not connected or its credentials are invalid.');
      return result;
    }

    const adapter = createAdapter(destination, destinationToken);
    const { start, end } = syncWindow();
    const clioCalendarId = await this.loadClioTargetCalendar();

    for (const calendar of calendars) {
      const fetchResult = await defaultRetryHandler.execute(() =>
        adapter.listEvents(calendar.calendar_id, start, end)
      );

      if (!fetchResult.success) {
        result.errors.push(
          `Failed to read ${label} calendar ${calendar.calendar_id}: ${fetchResult.error?.message}`
        );
        continue;
      }

      for (const event of fetchResult.data ?? []) {
        if (!event.id) {
          continue;
        }

        try {
          const mapping = await pool.query(
            `SELECT e.id AS event_id, e.clio_event_id
             FROM calendar_event_map m
             JOIN events e ON e.id = m.event_id
             WHERE m.user_id = $1 AND m.integration_id = $2
               AND m.calendar_id = $3 AND m.provider_event_id = $4`,
            [this.userId, destinationIntegration.id, calendar.calendar_id, event.id]
          );

          const existing = mapping.rows[0] as
            | { event_id: string; clio_event_id: string | null }
            | undefined;

          let rowId: string;

          if (existing?.clio_event_id) {
            await clio.client.updateEvent(existing.clio_event_id, {
              title: event.title,
              description: event.description,
              start: { date_time: event.start },
              end: { date_time: event.end },
              location: event.location,
            });

            await this.upsertEventRow({
              id: existing.clio_event_id,
              title: event.title,
              description: event.description,
              start: { date_time: event.start },
              end: { date_time: event.end },
              location: event.location,
            });

            rowId = existing.event_id;
            result.eventsUpdated += 1;
          } else {
            const created = await clio.client.createEvent({
              title: event.title,
              description: event.description,
              start: { date_time: event.start },
              end: { date_time: event.end },
              location: event.location,
              calendar: clioCalendarId ? { id: clioCalendarId } : undefined,
            });

            rowId = await this.upsertEventRow({
              id: created.id,
              title: event.title,
              description: event.description,
              start: { date_time: event.start },
              end: { date_time: event.end },
              location: event.location,
            });

            await this.saveMapping({
              eventId: rowId,
              integrationId: destinationIntegration.id,
              calendarId: calendar.calendar_id,
              provider: destination,
              providerEventId: event.id,
            });
            await this.setPrimaryDestinationId(rowId, destination, event.id);
            result.eventsCreated += 1;
          }

          await this.saveSnapshot(rowId, event);
          result.eventsSynced += 1;
        } catch (error) {
          result.errors.push(`Event ${event.id}: ${error}`);
          logger.error('Reverse sync failed', {
            provider: destination,
            eventId: event.id,
            error: String(error),
          });
        }
      }
    }

    await this.recordHistory({
      sourceIntegrationId: destinationIntegration.id,
      targetIntegrationId: clio.integrationId,
      syncType,
      eventsSynced: result.eventsSynced,
      errors: result.errors,
    });

    result.conflicts = await this.detectConflicts();
    return result;
  }

  async syncClioToGoogle(): Promise<SyncResult> {
    return this.syncClioTo('google');
  }

  async syncClioToOutlook(): Promise<SyncResult> {
    return this.syncClioTo('outlook');
  }

  async syncGoogleToClio(): Promise<SyncResult> {
    return this.syncDestinationToClio('google');
  }

  async syncOutlookToClio(): Promise<SyncResult> {
    return this.syncDestinationToClio('outlook');
  }

  /** Forward sync into every connected calendar destination. */
  async syncAllDestinations(): Promise<SyncResult[]> {
    const results: SyncResult[] = [];
    for (const provider of DESTINATION_PROVIDERS) {
      results.push(await this.syncClioTo(provider));
    }
    return results;
  }
}

