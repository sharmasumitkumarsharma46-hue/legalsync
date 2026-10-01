import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/pool';
import { requireSession } from '@/lib/auth/session';
import { cancelStripeSubscriptionAtPeriodEnd } from '@/lib/billing/stripe';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const { session, response } = requireSession(request);
  if (!session) return response;

  const result = await pool.query(
    `SELECT current_period_end, stripe_subscription_id, cancel_at_period_end
     FROM subscriptions
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [session.userId]
  );

  const subscription = result.rows[0] as
    | {
        current_period_end: Date | null;
        stripe_subscription_id: string | null;
        cancel_at_period_end: boolean | null;
      }
    | undefined;

  if (!subscription) {
    return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
  }

  let stripeCancelled = false;
  if (subscription.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
    try {
      stripeCancelled = await cancelStripeSubscriptionAtPeriodEnd(
        subscription.stripe_subscription_id
      );
    } catch (error) {
      logger.error('Stripe cancellation failed', { error: String(error) });
      return NextResponse.json(
        { error: 'Could not cancel the card subscription with Stripe. Please try again.' },
        { status: 502 }
      );
    }
  }

  await pool.query(
    `UPDATE subscriptions SET cancel_at_period_end = TRUE, updated_at = NOW() WHERE user_id = $1`,
    [session.userId]
  );

  await pool.query(
    `INSERT INTO audit_log (user_id, action, entity_type, entity_id)
     VALUES ($1, 'subscription_cancel_scheduled', 'subscription', $2)`,
    [session.userId, session.userId]
  );

  return NextResponse.json({
    success: true,
    stripeCancelled,
    currentPeriodEnd: subscription.current_period_end,
    message: 'Your subscription will be cancelled at the end of the current billing period.',
  });
}
