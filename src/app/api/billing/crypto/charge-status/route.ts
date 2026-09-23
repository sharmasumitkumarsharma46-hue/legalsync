import { NextRequest, NextResponse } from 'next/server';
import { cryptoPaymentHandler } from '@/lib/billing/crypto';
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

    const { searchParams } = new URL(request.url);
    const chargeCode = searchParams.get('code');

    if (!chargeCode) {
      return NextResponse.json({ error: 'Charge code required' }, { status: 400 });
    }

    // Get charge status
    const charge = await cryptoPaymentHandler.getChargeStatus(chargeCode);

    return NextResponse.json({
      success: true,
      charge,
      status: charge.timeline?.[charge.timeline.length - 1]?.status || 'unknown',
    });
  } catch (error) {
    console.error('Error getting charge status:', error);
    return NextResponse.json(
      { error: 'Failed to get charge status' },
      { status: 500 }
    );
  }
}
