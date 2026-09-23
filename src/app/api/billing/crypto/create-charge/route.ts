import { NextRequest, NextResponse } from 'next/server';
import { cryptoPaymentHandler } from '@/lib/billing/crypto';
import { verifyToken } from '@/lib/auth/utils';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { amount, currency = 'USD', description } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Create crypto charge
    const charge = await cryptoPaymentHandler.createCharge(
      amount,
      currency,
      description || 'LegalSync Subscription'
    );

    return NextResponse.json({
      success: true,
      charge,
      hostedUrl: charge.hosted_url,
      chargeCode: charge.code,
    });
  } catch (error) {
    console.error('Error creating crypto charge:', error);
    return NextResponse.json(
      { error: 'Failed to create crypto charge' },
      { status: 500 }
    );
  }
}
