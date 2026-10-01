import { NextRequest, NextResponse } from 'next/server';
import { cryptoPaymentHandler } from '@/lib/billing/crypto';
import pool from '@/lib/db/pool';
import { getUserFromRequest, unauthorized } from '@/lib/auth/session';
import { createCheckoutSession } from '@/lib/billing/stripe';

const PRICING: Record<string, number> = {
  solo: 79, small_firm: 199, mid_firm: 499, enterprise: 999,
};

export async function POST(request: NextRequest) {
  const session = getUserFromRequest(request);
  if (!session) return unauthorized();

  try {
    const body = await request.json() as { paymentMethod?: string };
    const { paymentMethod } = body;

    if (!paymentMethod || !['stripe', 'crypto'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
    }

    const subscriptionResult = await pool.query(
      `SELECT * FROM subscriptions WHERE user_id = $1 AND status = 'trial'`,
      [session.userId]
    );

    if (subscriptionResult.rows.length === 0) {
      return NextResponse.json({ error: 'No active trial found' }, { status: 404 });
    }

    const subscription = subscriptionResult.rows[0] as { id: string; plan: string };
    const amount = PRICING[subscription.plan] ?? 79;
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';

    if (paymentMethod === 'crypto') {
      const charge = await cryptoPaymentHandler.createCharge(
        amount, 'USD', `LegalSync ${subscription.plan} subscription - Trial conversion`
      );
      await pool.query(
        `UPDATE subscriptions
         SET status = 'pending_payment', payment_method = 'crypto', crypto_charge_code = $1
         WHERE user_id = $2`,
        [charge.code, session.userId]
      );
      return NextResponse.json({
        success: true, paymentMethod: 'crypto',
        charge, hostedUrl: charge.hosted_url, chargeCode: charge.code,
      });
    }

    // Stripe — create real checkout session
    const checkoutSession = await createCheckoutSession({
      priceAmount: amount, currency: 'USD', planName: subscription.plan,
      userId: session.userId,
      successUrl: `${baseUrl}/dashboard?payment=success`,
      cancelUrl: `${baseUrl}/dashboard`,
    });

    return NextResponse.json({
      success: true, paymentMethod: 'stripe',
      checkoutUrl: checkoutSession.url, sessionId: checkoutSession.id,
    });
  } catch (error) {
    console.error('Error converting trial:', error);
    return NextResponse.json({ error: 'Failed to convert trial' }, { status: 500 });
  }
}
