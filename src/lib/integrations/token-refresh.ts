import pool from '@/lib/db/pool';
import { refreshClioToken } from './clio/client';
import { refreshGoogleToken } from './google/client';
import { refreshMicrosoftToken } from './outlook/client';

const REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

type RefreshFn = (refreshToken: string) => Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}>;

const REFRESH_FNS: Record<string, RefreshFn> = {
  clio: refreshClioToken,
  google_calendar: refreshGoogleToken,
  outlook: refreshMicrosoftToken,
};

export async function getValidAccessToken(
  userId: string,
  integrationType: string
): Promise<string | null> {
  const result = await pool.query(
    `SELECT id, access_token, refresh_token, token_expires_at
     FROM integrations
     WHERE user_id = $1 AND integration_type = $2 AND status = 'connected'`,
    [userId, integrationType]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0] as {
    id: string;
    access_token: string;
    refresh_token: string | null;
    token_expires_at: Date | null;
  };

  const needsRefresh =
    row.token_expires_at != null &&
    row.refresh_token != null &&
    new Date(row.token_expires_at).getTime() - Date.now() < REFRESH_BUFFER_MS;

  if (!needsRefresh) return row.access_token;

  const refreshFn = REFRESH_FNS[integrationType];
  if (!refreshFn || !row.refresh_token) return row.access_token;

  try {
    const tokens = await refreshFn(row.refresh_token);
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    await pool.query(
      `UPDATE integrations
       SET access_token = $1, refresh_token = $2, token_expires_at = $3, updated_at = NOW()
       WHERE id = $4`,
      [tokens.access_token, tokens.refresh_token ?? row.refresh_token, expiresAt, row.id]
    );

    return tokens.access_token;
  } catch (error) {
    console.error(`Token refresh failed for ${integrationType}:`, error);
    return row.access_token;
  }
}
