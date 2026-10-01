import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/pool';
import { verifyStripeSignature } from '@/lib/billing/stripe';
import { getPlanConfig } from '@/lib/billing/plans';
import { logger } from '@/lib/logger';

interface StripeEvent {
  id?: string;
  type: string;
  data: { object: Record<string, unknown> };
}

export async function POST(request: NextRequest) {
  const sigHeader = request.headers.get('stripe-signature') || '';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  const payload = await request.text();

  if (!webhookSecret) {
    logger.error('Stripe webhook rejected: STRIPE_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Webhook is not configured' }, { status: 503 });
  }

  if (!verifyStripeSignature(payload, sigHeader, webhookSecret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const metadata = session['metadata'] as Record<string, string> | undefined;
      const userId = metadata?.userId;
      const plan = metadata?.plan;

      if (!userId) {
        return NextResponse.json({ received: true, ignored: 'missing userId metadata' });
      }

      const currentPeriodEnd = new Date();
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
      const config = getPlanConfig(plan ?? null);

      // Idempotent: repeated deliveries update zero rows once the account is active.
      const updated = await pool.query(
        `UPDATE subscriptions
         SET status = 'active',
             plan = COALESCE($1, plan),
             payment_method = 'stripe',
             stripe_subscription_id = $2,
             current_period_start = NOW(),
             current_period_end = $3,
             cancel_at_period_end = FALSE,
             updated_at = NOW()
         WHERE user_id = $4 AND status <> 'active'
         RETURNING id, plan`,
        [plan ?? null, (session['subscription'] as string) ?? null, currentPeriodEnd, userId]
      );

      if (updated.rows.length === 0) {
        logger.warn('Stripe checkout duplicate ignored', { userId });
        return NextResponse.json({ received: true, duplicate: true });
      }

      const subscription = updated.rows[0] as { id: string; plan: string };

      await pool.query(
        `INSERT INTO invoices (user_id, subscription_id, amount, status, due_date, paid_at)
         VALUES ($1, $2, $3, 'paid', NOW(), NOW())`,
        [userId, subscription.id, config.price > 0 ? config.price : 0]
      );

      await pool.query(
        `INSERT INTO audit_log (user_id, action, entity_type, entity_id)
         VALUES ($1, 'subscription_activated', 'subscription', $2)`,
        [userId, subscription.id]
      );

      logger.info('Stripe checkout completed', { userId, plan: subscription.plan });
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object;
      const customerId = invoice['customer'] as string | undefined;
      if (customerId) {
        await pool.query(
          `UPDATE subscriptions SET status = 'past_due', updated_at = NOW()
           WHERE stripe_customer_id = $1 AND status <> 'past_due'`,
          [customerId]
        );
        logger.warn('Stripe payment failed', { customerId });
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as { customer?: string; id?: string };
      if (subscription.customer || subscription.id) {
        await pool.query(
          `UPDATE subscriptions
           SET status = 'cancelled', cancel_at_period_end = FALSE, updated_at = NOW()
           WHERE (stripe_customer_id = $1 OR stripe_subscription_id = $2) AND status <> 'cancelled'`,
          [subscription.customer ?? null, subscription.id ?? null]
        );
        logger.info('Stripe subscription cancelled', { subscriptionId: subscription.id });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('Stripe webhook processing failed', {
      eventType: event.type,
      error: String(error),
    });
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
