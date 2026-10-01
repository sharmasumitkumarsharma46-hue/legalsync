import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/pool';
import { cryptoPaymentHandler } from '@/lib/billing/crypto';
import { requireSession } from '@/lib/auth/session';
import { getPlanConfig } from '@/lib/billing/plans';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const { session, response } = requireSession(request);
  if (!session) return response;

  let body: { plan?: string };
  try {
    body = (await request.json()) as { plan?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const plan = body.plan;
  if (!plan) {
    return NextResponse.json({ error: 'A plan is required' }, { status: 400 });
  }

  const config = getPlanConfig(plan);
  if (config.price <= 0) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  try {
    const charge = await cryptoPaymentHandler.createCharge(
      config.price,
      'USD',
      `LegalSync ${config.name} subscription`
    );

    await pool.query(
      `UPDATE subscriptions
       SET plan = $1, status = 'pending_payment', payment_method = 'crypto',
           crypto_charge_code = $2, updated_at = NOW()
       WHERE user_id = $3`,
      [plan, charge.code, session.userId]
    );

    return NextResponse.json({
      success: true,
      plan,
      amount: config.price,
      charge,
      hostedUrl: charge.hosted_url,
      chargeCode: charge.code,
    });
  } catch (error) {
    logger.error('Failed to create crypto charge', { error: String(error) });
    return NextResponse.json({ error: 'Failed to create crypto charge' }, { status: 502 });
  }
}
