import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/pool';
import { getUserFromRequest, unauthorized } from '@/lib/auth/session';
import { PROVIDER_BY_INTEGRATION_TYPE, type ProviderKey } from '@/lib/integrations/registry';

export interface IntegrationStatus {
  provider: ProviderKey | string;
  integrationType: string;
  status: string;
  lastSyncAt: string | null;
}

export async function GET(request: NextRequest) {
  const session = getUserFromRequest(request);
  if (!session) return unauthorized();

  const result = await pool.query(
    `SELECT integration_type, status, last_sync_at FROM integrations WHERE user_id = $1`,
    [session.userId]
  );

  const integrations: IntegrationStatus[] = (
    result.rows as Array<{ integration_type: string; status: string; last_sync_at: Date | null }>
  ).map((row) => ({
    provider: PROVIDER_BY_INTEGRATION_TYPE[row.integration_type] || row.integration_type,
    integrationType: row.integration_type,
    status: row.status,
    lastSyncAt: row.last_sync_at ? new Date(row.last_sync_at).toISOString() : null,
  }));

  const byProvider: Record<string, string> = {};
  for (const item of integrations) {
    byProvider[item.provider] = item.status;
  }

  return NextResponse.json({ success: true, integrations, byProvider });
}
