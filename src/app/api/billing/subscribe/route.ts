import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/pool';
import { requireSession } from '@/lib/auth/session';
import { createCheckoutSession } from '@/lib/billing/stripe';
import { cryptoPaymentHandler } from '@/lib/billing/crypto';
import { getPlanConfig } from '@/lib/billing/plans';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const { session, response } = requireSession(request);
  if (!session) return response;

  let body: { plan?: string; paymentMethod?: string };
  try {
    body = (await request.json()) as { plan?: string; paymentMethod?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const plan = body.plan ?? '';
  const paymentMethod = body.paymentMethod ?? 'stripe';

  if (!['stripe', 'crypto'].includes(paymentMethod)) {
    return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
  }

  const config = getPlanConfig(plan);
  if (config.price <= 0) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const subscriptionResult = await pool.query(`SELECT id FROM subscriptions WHERE user_id = $1`, [
    session.userId,
  ]);
  if (subscriptionResult.rows.length === 0) {
    return NextResponse.json({ error: 'No subscription found for this account' }, { status: 404 });
  }

  const baseUrl = process.env.APP_URL || 'http://localhost:3000';

  try {
    if (paymentMethod === 'crypto') {
      const charge = await cryptoPaymentHandler.createCharge(
        config.price,
        'USD',
        `LegalSync ${config.name} subscription`
      );

      await pool.query(
        `UPDATE subscriptions
         SET plan = $1, status = 'pending_payment', payment_method = 'crypto',
             crypto_charge_code = $2, cancel_at_period_end = FALSE, updated_at = NOW()
         WHERE user_id = $3`,
        [plan, charge.code, session.userId]
      );

      return NextResponse.json({
        success: true,
        paymentMethod: 'crypto',
        plan,
        amount: config.price,
        charge,
        hostedUrl: charge.hosted_url,
        chargeCode: charge.code,
      });
    }

    // Card payments are only applied once Stripe confirms them via webhook.
    const checkout = await createCheckoutSession({
      priceAmount: config.price,
      currency: 'USD',
      planName: plan,
      userId: session.userId,
      successUrl: `${baseUrl}/dashboard?payment=success`,
      cancelUrl: `${baseUrl}/dashboard?payment=cancelled`,
    });

    await pool.query(
      `UPDATE subscriptions
       SET plan = $1, payment_method = 'stripe', cancel_at_period_end = FALSE, updated_at = NOW()
       WHERE user_id = $2`,
      [plan, session.userId]
    );

    return NextResponse.json({
      success: true,
      paymentMethod: 'stripe',
      plan,
      amount: config.price,
      checkoutUrl: checkout.url,
      sessionId: checkout.id,
    });
  } catch (error) {
    logger.error('Subscription checkout failed', { error: String(error), plan, paymentMethod });
    return NextResponse.json({ error: 'Could not start checkout' }, { status: 502 });
  }
}
