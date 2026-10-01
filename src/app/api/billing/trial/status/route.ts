import { NextRequest, NextResponse } from 'next/server';
import { trialManager } from '@/lib/billing/trial';
import { requireSession } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  const { session, response } = requireSession(request);
  if (!session) return response;

  try {
    const subscription = await trialManager.checkTrialStatus(session.userId);

    if (!subscription) {
      return NextResponse.json({
        success: true,
        subscription: null,
        trialStatus: null,
        message: 'No subscription found for this account.',
      });
    }

    return NextResponse.json({ success: true, subscription, trialStatus: subscription });
  } catch (error) {
    console.error('Error checking trial status:', error);
    return NextResponse.json({ error: 'Failed to check trial status' }, { status: 500 });
  }
}

