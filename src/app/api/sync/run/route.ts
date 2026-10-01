import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { SyncEngine, DESTINATION_PROVIDERS, type DestinationProvider } from '@/lib/sync/engine';
import { logger } from '@/lib/logger';

const FORWARD_DIRECTIONS: Record<string, DestinationProvider> = {
  clio_to_google: 'google',
  clio_to_outlook: 'outlook',
};

const REVERSE_DIRECTIONS: Record<string, DestinationProvider> = {
  google_to_clio: 'google',
  outlook_to_clio: 'outlook',
};

export async function POST(request: NextRequest) {
  const { session, response } = requireSession(request);
  if (!session) return response;

  let direction = 'clio_to_google';
  try {
    const body = (await request.json()) as { direction?: string };
    if (body?.direction) {
      direction = body.direction;
    }
  } catch {
    // body is optional
  }

  const knownDirections = [
    ...Object.keys(FORWARD_DIRECTIONS),
    ...Object.keys(REVERSE_DIRECTIONS),
    'all',
  ];

  if (!knownDirections.includes(direction)) {
    return NextResponse.json(
      { error: `Direction must be one of ${knownDirections.join(', ')}` },
      { status: 400 }
    );
  }

  const engine = new SyncEngine(session.userId);

  try {
    if (direction === 'all') {
      const results = await engine.syncAllDestinations();
      return NextResponse.json({
        success: results.every((result) => result.success),
        direction,
        results,
        result: results[0] ?? null,
      });
    }

    const forward = FORWARD_DIRECTIONS[direction];
    if (forward) {
      const result = await engine.syncClioTo(forward);
      return NextResponse.json({ success: result.success, direction, result });
    }

    const reverse = REVERSE_DIRECTIONS[direction];
    const result = await engine.syncDestinationToClio(reverse);
    return NextResponse.json({ success: result.success, direction, result });
  } catch (error) {
    logger.error('Manual sync failed', { direction, error: String(error) });
    return NextResponse.json({ error: 'Sync failed', detail: String(error) }, { status: 502 });
  }
}

export async function GET() {
  return NextResponse.json({ directions: ['all', ...Object.keys(FORWARD_DIRECTIONS), ...Object.keys(REVERSE_DIRECTIONS)], destinations: DESTINATION_PROVIDERS });
}

