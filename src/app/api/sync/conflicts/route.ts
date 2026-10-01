import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { ConflictDetector, RESOLUTION_CHOICES, type ResolutionChoice } from '@/lib/sync/conflict';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const { session, response } = requireSession(request);
  if (!session) return response;

  const scan = request.nextUrl.searchParams.get('scan') === 'true';

  try {
    const detector = new ConflictDetector(session.userId);
    const conflicts = scan ? await detector.detectConflicts() : await detector.listConflicts();
    return NextResponse.json({ success: true, conflicts });
  } catch (error) {
    logger.error('Failed to load conflicts', { error: String(error) });
    return NextResponse.json({ error: 'Failed to load conflicts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { session, response } = requireSession(request);
  if (!session) return response;

  let body: { conflictId?: string; resolution?: string };
  try {
    body = (await request.json()) as { conflictId?: string; resolution?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { conflictId, resolution } = body;

  if (!conflictId) {
    return NextResponse.json({ error: 'A conflictId is required' }, { status: 400 });
  }

  if (!resolution || !RESOLUTION_CHOICES.includes(resolution as ResolutionChoice)) {
    return NextResponse.json(
      { error: `Resolution must be one of ${RESOLUTION_CHOICES.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    const resolved = await new ConflictDetector(session.userId).resolveConflict(
      conflictId,
      resolution as ResolutionChoice
    );

    if (!resolved) {
      return NextResponse.json(
        { error: 'Conflict not found, already resolved, or its event is unavailable.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, conflictId, resolution });
  } catch (error) {
    logger.error('Failed to resolve conflict', { conflictId, error: String(error) });
    return NextResponse.json(
      { error: 'Could not apply the resolution. Check provider connections and try again.' },
      { status: 502 }
    );
  }
}
