import { NextRequest, NextResponse } from 'next/server';
import { trialManager } from '@/lib/billing/trial';

export async function POST(request: NextRequest) {
  try {
    // Verify cron job secret (in production, use proper authentication)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'dev-cron-secret';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check and expire all expired trials
    const expiredUserIds = await trialManager.checkExpiredTrials();

    return NextResponse.json({
      success: true,
      expiredCount: expiredUserIds.length,
      expiredUserIds,
    });
  } catch (error) {
    console.error('Error checking expired trials:', error);
    return NextResponse.json(
      { error: 'Failed to check expired trials' },
      { status: 500 }
    );
  }
}
