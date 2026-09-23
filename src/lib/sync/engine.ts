import pool from '@/lib/db/pool';
import { ClioClient, ClioEvent } from '@/lib/integrations/clio/client';
import { GoogleCalendarClient, GoogleEvent } from '@/lib/integrations/google/client';
import { OutlookClient, OutlookEvent } from '@/lib/integrations/outlook/client';

export interface SyncResult {
  success: boolean;
  eventsSynced: number;
  errors: string[];
  conflicts: number;
}

export class SyncEngine {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async syncClioToGoogle(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      eventsSynced: 0,
      errors: [],
      conflicts: 0,
    };

    try {
      // Get user's integrations
      const integrations = await pool.query(
        `SELECT id, access_token FROM integrations 
         WHERE user_id = $1 AND integration_type IN ('clio', 'google_calendar') AND status = 'connected'`,
        [this.userId]
      );

      const clioIntegration = integrations.rows.find((i: any) => i.integration_type === 'clio');
      const googleIntegration = integrations.rows.find((i: any) => i.integration_type === 'google_calendar');

      if (!clioIntegration || !googleIntegration) {
        result.success = false;
        result.errors.push('Clio or Google Calendar not connected');
        return result;
      }

      // Initialize clients
      const clioClient = new ClioClient(clioIntegration.access_token);
      const googleClient = new GoogleCalendarClient(googleIntegration.access_token);

      // Get selected calendars
      const calendars = await pool.query(
        `SELECT calendar_id FROM calendar_mappings 
         WHERE user_id = $1 AND integration_id = $2 AND is_selected = TRUE`,
        [this.userId, googleIntegration.id]
      );

      if (calendars.rows.length === 0) {
        result.success = false;
        result.errors.push('No calendars selected for sync');
        return result;
      }

      // Fetch events from Clio
      const clioEvents = await clioClient.getEvents();
      const googleCalendarId = calendars.rows[0].calendar_id;

      // Sync each event
      for (const clioEvent of clioEvents) {
        try {
          // Check if event already exists in our database
          const existingEvent = await pool.query(
            `SELECT google_event_id FROM events 
             WHERE user_id = $1 AND clio_event_id = $2`,
            [this.userId, clioEvent.id]
          );

          const googleEvent = this.convertClioToGoogle(clioEvent);

          if (existingEvent.rows.length > 0) {
            // Update existing event
            await googleClient.updateEvent(googleCalendarId, existingEvent.rows[0].google_event_id, googleEvent);
          } else {
            // Create new event
            const createdEvent = await googleClient.createEvent(googleCalendarId, googleEvent);
            
            // Save mapping to database
            await pool.query(
              `INSERT INTO events (user_id, clio_event_id, google_event_id, title, description, start_time, end_time, location, case_name, case_id)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
              [
                this.userId,
                clioEvent.id,
                createdEvent.id,
                clioEvent.title,
                clioEvent.description,
                clioEvent.start.date_time,
                clioEvent.end.date_time,
                clioEvent.location,
                clioEvent.matter?.name,
                clioEvent.matter?.id,
              ]
            );
          }

          result.eventsSynced++;
        } catch (error) {
          result.errors.push(`Failed to sync event ${clioEvent.id}: ${error}`);
        }
      }

      // Log sync history
      await pool.query(
        `INSERT INTO sync_history (user_id, source_integration_id, target_integration_id, sync_type, events_synced, status, error_message, completed_at)
         VALUES ($1, $2, $3, 'clio_to_google', $4, $5, $6, NOW())`,
        [
          this.userId,
          clioIntegration.id,
          googleIntegration.id,
          result.eventsSynced,
          result.errors.length > 0 ? 'warning' : 'success',
          result.errors.length > 0 ? result.errors.join(', ') : null,
        ]
      );

    } catch (error) {
      result.success = false;
      result.errors.push(`Sync failed: ${error}`);
    }

    return result;
  }

  async syncGoogleToClio(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      eventsSynced: 0,
      errors: [],
      conflicts: 0,
    };

    try {
      // Get user's integrations
      const integrations = await pool.query(
        `SELECT id, access_token FROM integrations 
         WHERE user_id = $1 AND integration_type IN ('clio', 'google_calendar') AND status = 'connected'`,
        [this.userId]
      );

      const clioIntegration = integrations.rows.find((i: any) => i.integration_type === 'clio');
      const googleIntegration = integrations.rows.find((i: any) => i.integration_type === 'google_calendar');

      if (!clioIntegration || !googleIntegration) {
        result.success = false;
        result.errors.push('Clio or Google Calendar not connected');
        return result;
      }

      // Initialize clients
      const clioClient = new ClioClient(clioIntegration.access_token);
      const googleClient = new GoogleCalendarClient(googleIntegration.access_token);

      // Get selected calendars
      const calendars = await pool.query(
        `SELECT calendar_id FROM calendar_mappings 
         WHERE user_id = $1 AND integration_id = $2 AND is_selected = TRUE`,
        [this.userId, googleIntegration.id]
      );

      if (calendars.rows.length === 0) {
        result.success = false;
        result.errors.push('No calendars selected for sync');
        return result;
      }

      // Fetch events from Google
      const googleCalendarId = calendars.rows[0].calendar_id;
      const googleEvents = await googleClient.getEvents(googleCalendarId);

      // Sync each event
      for (const googleEvent of googleEvents) {
        try {
          // Check if event already exists in our database
          const existingEvent = await pool.query(
            `SELECT clio_event_id FROM events 
             WHERE user_id = $1 AND google_event_id = $2`,
            [this.userId, googleEvent.id]
          );

          const clioEvent = this.convertGoogleToClio(googleEvent);

          if (existingEvent.rows.length > 0) {
            // Update existing event
            await clioClient.updateEvent(existingEvent.rows[0].clio_event_id, clioEvent);
          } else {
            // Create new event
            const createdEvent = await clioClient.createEvent(clioEvent);
            
            // Save mapping to database
            await pool.query(
              `INSERT INTO events (user_id, clio_event_id, google_event_id, title, description, start_time, end_time, location)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                this.userId,
                createdEvent.id,
                googleEvent.id,
                googleEvent.summary,
                googleEvent.description,
                googleEvent.start.dateTime || googleEvent.start.date,
                googleEvent.end.dateTime || googleEvent.end.date,
                googleEvent.location,
              ]
            );
          }

          result.eventsSynced++;
        } catch (error) {
          result.errors.push(`Failed to sync event ${googleEvent.id}: ${error}`);
        }
      }

      // Log sync history
      await pool.query(
        `INSERT INTO sync_history (user_id, source_integration_id, target_integration_id, sync_type, events_synced, status, error_message, completed_at)
         VALUES ($1, $2, $3, 'google_to_clio', $4, $5, $6, NOW())`,
        [
          this.userId,
          googleIntegration.id,
          clioIntegration.id,
          result.eventsSynced,
          result.errors.length > 0 ? 'warning' : 'success',
          result.errors.length > 0 ? result.errors.join(', ') : null,
        ]
      );

    } catch (error) {
      result.success = false;
      result.errors.push(`Sync failed: ${error}`);
    }

    return result;
  }

  private convertClioToGoogle(clioEvent: ClioEvent): GoogleEvent {
    return {
      id: clioEvent.id,
      summary: clioEvent.title,
      description: clioEvent.description,
      start: {
        dateTime: clioEvent.start.date_time,
      },
      end: {
        dateTime: clioEvent.end.date_time,
      },
      location: clioEvent.location,
      attendees: clioEvent.attendees?.map(a => ({
        email: a.email,
        displayName: a.name,
      })),
    };
  }

  private convertGoogleToClio(googleEvent: GoogleEvent): Partial<ClioEvent> {
    return {
      title: googleEvent.summary,
      description: googleEvent.description,
      start: {
        date_time: googleEvent.start.dateTime || googleEvent.start.date || '',
      },
      end: {
        date_time: googleEvent.end.dateTime || googleEvent.end.date || '',
      },
      location: googleEvent.location,
      attendees: googleEvent.attendees?.map(a => ({
        email: a.email,
        name: a.displayName,
      })),
    };
  }
}
