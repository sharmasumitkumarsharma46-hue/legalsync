import { NextRequest, NextResponse } from 'next/server';
import { trialManager } from '@/lib/billing/trial';
import { verifyToken } from '@/lib/auth/utils';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check trial status
    const trialStatus = await trialManager.checkTrialStatus(decoded.userId);

    return NextResponse.json({
      success: true,
      trialStatus,
    });
  } catch (error) {
    console.error('Error checking trial status:', error);
    return NextResponse.json(
      { error: 'Failed to check trial status' },
      { status: 500 }
    );
  }
}
