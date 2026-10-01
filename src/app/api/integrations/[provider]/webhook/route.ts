import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import pool from '@/lib/db/pool';
import { SyncEngine, DESTINATION_PROVIDERS } from '@/lib/sync/engine';
import { isProvider, PROVIDERS } from '@/lib/integrations/registry';
import { logger } from '@/lib/logger';

const MAX_WEBHOOK_AGE_MS = 5 * 60 * 1000;

function verifyHmac(payload: string, signature: string, secret: string): boolean {
  try {
    const expected = createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
    const sigBuf = Buffer.from((signature || '').trim().toLowerCase(), 'utf8');
    const expBuf = Buffer.from(expected, 'utf8');
    if (sigBuf.length !== expBuf.length) return false;
    return timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

function extractEventId(request: NextRequest, body: Record<string, unknown> | null): string {
  const headerId =
    request.headers.get('x-goog-message-number') ||
    request.headers.get('x-ms-client-request-id') ||
    request.headers.get('x-clio-webhook-id') ||
    request.headers.get('x-request-id');

  if (headerId) {
    return headerId;
  }

  const bodyId = body?.['id'];
  return typeof bodyId === 'string' ? bodyId : `no-id-${Date.now()}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  if (!isProvider(provider)) {
    return NextResponse.json({ error: 'Unknown provider' }, { status: 400 });
  }

  const tsHeader =
    request.headers.get('x-webhook-timestamp') ||
    request.headers.get('x-ms-timestamp') ||
    request.headers.get('x-goog-resource-state-timestamp');

  if (tsHeader) {
    const ts = parseInt(tsHeader, 10);
    if (!Number.isNaN(ts) && Math.abs(Date.now() - ts * 1000) > MAX_WEBHOOK_AGE_MS) {
      return NextResponse.json({ error: 'Webhook timestamp too old' }, { status: 400 });
    }
  }

  const rawBody = await request.text();
  const webhookSecret = process.env[`${provider.toUpperCase()}_WEBHOOK_SECRET`];

  if (!webhookSecret) {
    logger.error('Provider webhook rejected: secret is not configured', { provider });
    return NextResponse.json({ error: 'Webhook is not configured' }, { status: 503 });
  }

  if (provider === 'google') {
    const channelToken = request.headers.get('x-goog-channel-token') || '';
    if (channelToken !== webhookSecret) {
      return NextResponse.json({ error: 'Invalid channel token' }, { status: 401 });
    }
  } else {
    const signature =
      request.headers.get('x-clio-signature') || request.headers.get('x-ms-signature') || '';
    if (!verifyHmac(rawBody, signature, webhookSecret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    body = null;
  }

  // Idempotency: a replayed delivery maps to an existing row and is skipped.
  const eventId = extractEventId(request, body);
  const inserted = await pool.query(
    `INSERT INTO webhook_events (provider, event_id)
     VALUES ($1, $2)
     ON CONFLICT (provider, event_id) DO NOTHING
     RETURNING id`,
    [provider, eventId]
  );

  if (inserted.rows.length === 0) {
    return NextResponse.json({ success: true, duplicate: true });
  }

  const data = body?.['data'] as Record<string, unknown> | undefined;
  const userId =
    (data?.['user_id'] as string | undefined) || (body?.['userId'] as string | undefined) || null;

  if (!userId) {
    return NextResponse.json({ success: true, ignored: 'no user reference in payload' });
  }

  const integrationType = PROVIDERS[provider].integrationType;
  const ownsIntegration = await pool.query(
    `SELECT id FROM integrations
     WHERE user_id = $1 AND integration_type = $2 AND status = 'connected'`,
    [userId, integrationType]
  );

  if (ownsIntegration.rows.length === 0) {
    return NextResponse.json({ success: true, ignored: 'no connected integration for user' });
  }

  try {
    const engine = new SyncEngine(userId);

    if (provider === 'clio') {
      for (const destination of DESTINATION_PROVIDERS) {
        await engine.syncClioTo(destination);
      }
    } else {
      await engine.syncDestinationToClio(provider);
    }

    logger.info('Webhook sync triggered', { provider, userId });
  } catch (error) {
    logger.error('Webhook sync error', { provider, userId, error: String(error) });
  }

  return NextResponse.json({ success: true });
}

// Google Calendar validates a push subscription with a GET challenge.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  if (provider !== 'google') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const challenge = request.nextUrl.searchParams.get('hub.challenge');
  if (challenge) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ ok: true });
}