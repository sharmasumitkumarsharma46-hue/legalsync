import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/pool';
import { getUserFromRequest, unauthorized } from '@/lib/auth/session';
import { PROVIDERS, isProvider } from '@/lib/integrations/registry';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  if (!isProvider(provider)) {
    return NextResponse.json({ error: 'Unsupported integration provider' }, { status: 400 });
  }
  const session = getUserFromRequest(request);
  if (!session) return unauthorized();

  await pool.query(
    `UPDATE integrations SET status = 'disconnected', updated_at = NOW()
     WHERE user_id = $1 AND integration_type = $2`,
    [session.userId, PROVIDERS[provider].integrationType]
  );

  return NextResponse.json({ success: true, provider, status: 'disconnected' });
}
