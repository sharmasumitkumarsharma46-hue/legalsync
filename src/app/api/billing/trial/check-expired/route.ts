import { NextRequest, NextResponse } from 'next/server';
import { trialManager } from '@/lib/billing/trial';
import { logger } from '@/lib/logger';

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return false;
  }
  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${cronSecret}`;
}

async function runExpiryCheck(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const expiredUserIds = await trialManager.checkExpiredTrials();
    logger.info('Trial expiry check complete', { expiredCount: expiredUserIds.length });

    return NextResponse.json({
      success: true,
      expiredCount: expiredUserIds.length,
      expiredUserIds,
    });
  } catch (error) {
    logger.error('Failed to check expired trials', { error: String(error) });
    return NextResponse.json({ error: 'Failed to check expired trials' }, { status: 500 });
  }
}

/** Vercel Cron invokes scheduled paths with GET. */
export async function GET(request: NextRequest) {
  return runExpiryCheck(request);
}

export async function POST(request: NextRequest) {
  return runExpiryCheck(request);
}

