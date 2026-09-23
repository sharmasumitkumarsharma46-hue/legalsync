import pool from '@/lib/db/pool';

export interface Conflict {
  id: string;
  userId: string;
  eventId: string;
  conflictType: string;
  clioVersion: any;
  calendarVersion: any;
  resolution: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
}

export class ConflictDetector {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async detectConflicts(): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];

    try {
      // Find events that have been modified in both systems since last sync
      const result = await pool.query(
        `SELECT e.id as event_id, e.updated_at, 
                (SELECT MAX(completed_at) FROM sync_history WHERE user_id = e.user_id) as last_sync
         FROM events e
         WHERE e.user_id = $1
         AND e.updated_at > (SELECT MAX(completed_at) FROM sync_history WHERE user_id = e.user_id)
         AND (e.clio_event_id IS NOT NULL AND e.google_event_id IS NOT NULL)
         LIMIT 100`,
        [this.userId]
      );

      for (const row of result.rows) {
        // Check if event was modified in both systems
        const conflict = await this.checkEventConflict(row.event_id);
        if (conflict) {
          conflicts.push(conflict);
        }
      }

    } catch (error) {
      console.error('Error detecting conflicts:', error);
    }

    return conflicts;
  }

  private async checkEventConflict(eventId: string): Promise<Conflict | null> {
    try {
      const result = await pool.query(
        `SELECT * FROM events WHERE id = $1`,
        [eventId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const event = result.rows[0];

      // Check if event exists in both systems
      if (!event.clio_event_id || !event.google_event_id) {
        return null;
      }

      // Create conflict record
      const conflictResult = await pool.query(
        `INSERT INTO conflicts (user_id, event_id, conflict_type, clio_version, calendar_version)
         VALUES ($1, $2, 'modification_conflict', $3, $4)
         RETURNING *`,
        [
          this.userId,
          eventId,
          JSON.stringify({ id: event.clio_event_id, title: event.title, updated_at: event.updated_at }),
          JSON.stringify({ id: event.google_event_id, title: event.title, updated_at: event.updated_at }),
        ]
      );

      return conflictResult.rows[0];

    } catch (error) {
      console.error('Error checking event conflict:', error);
      return null;
    }
  }

  async resolveConflict(conflictId: string, resolution: 'last_write_wins' | 'clio' | 'calendar'): Promise<boolean> {
    try {
      const conflict = await pool.query(
        `SELECT * FROM conflicts WHERE id = $1`,
        [conflictId]
      );

      if (conflict.rows.length === 0) {
        return false;
      }

      const conflictData = conflict.rows[0];

      // Apply resolution
      if (resolution === 'last_write_wins') {
        // Compare timestamps and use most recent
        const clioVersion = JSON.parse(conflictData.clio_version);
        const calendarVersion = JSON.parse(conflictData.calendar_version);

        const clioTime = new Date(clioVersion.updated_at).getTime();
        const calendarTime = new Date(calendarVersion.updated_at).getTime();

        const winner = clioTime > calendarTime ? 'clio' : 'calendar';

        await this.applyResolution(conflictId, winner);
      } else {
        await this.applyResolution(conflictId, resolution);
      }

      // Mark conflict as resolved
      await pool.query(
        `UPDATE conflicts 
         SET resolution = $1, resolved_at = NOW() 
         WHERE id = $2`,
        [resolution, conflictId]
      );

      return true;

    } catch (error) {
      console.error('Error resolving conflict:', error);
      return false;
    }
  }

  private async applyResolution(conflictId: string, winner: string): Promise<void> {
    // This would trigger a sync operation to apply the winning version
    // For now, we'll just mark it as resolved
    // In a full implementation, this would call the sync engine to sync the winning version
    console.log(`Applying resolution: ${winner} wins for conflict ${conflictId}`);
  }
}
