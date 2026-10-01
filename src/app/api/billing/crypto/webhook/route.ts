import { NextRequest, NextResponse } from 'next/server';
import { cryptoPaymentHandler } from '@/lib/billing/crypto';
import pool from '@/lib/db/pool';
import { logger } from '@/lib/logger';

const PRICING: Record<string, number> = {
  solo: 79,
  small_firm: 199,
  mid_firm: 499,
  enterprise: 999,
};

interface WebhookEvent {
  event?: {
    type?: string;
    data?: { code?: string };
  };
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-cc-webhook-signature') || '';

  if (!cryptoPaymentHandler.verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: WebhookEvent;
  try {
    payload = JSON.parse(rawBody) as WebhookEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const type = payload.event?.type;
  const chargeCode = payload.event?.data?.code;

  if (!type || !chargeCode) {
    return NextResponse.json({ success: true, ignored: true });
  }

  try {
    if (type === 'charge:confirmed' || type === 'charge:resolved') {
      const currentPeriodEnd = new Date();
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

      // The status guard makes this handler idempotent: a repeated webhook
      // updates zero rows and is reported as a duplicate.
      const updated = await pool.query(
        `UPDATE subscriptions
         SET status = 'active',
             payment_method = 'crypto',
             current_period_start = NOW(),
             current_period_end = $1,
             updated_at = NOW()
         WHERE crypto_charge_code = $2 AND status <> 'active'
         RETURNING id, user_id, plan`,
        [currentPeriodEnd, chargeCode]
      );

      if (updated.rows.length === 0) {
        return NextResponse.json({ success: true, duplicate: true });
      }

      const subscription = updated.rows[0] as { id: string; user_id: string; plan: string };
      const amount = PRICING[subscription.plan] ?? 0;

      await pool.query(
        `INSERT INTO invoices (user_id, subscription_id, amount, status, due_date, paid_at)
         VALUES ($1, $2, $3, 'paid', NOW(), NOW())`,
        [subscription.user_id, subscription.id, amount]
      );

      logger.info('Crypto charge confirmed', { chargeCode, userId: subscription.user_id });
    } else if (type === 'charge:failed' || type === 'charge:delayed') {
      await pool.query(
        `UPDATE subscriptions
         SET status = $1, updated_at = NOW()
         WHERE crypto_charge_code = $2 AND status = 'pending_payment'`,
        [type === 'charge:failed' ? 'failed' : 'pending_payment', chargeCode]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to process crypto webhook', { error: String(error) });
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
}
