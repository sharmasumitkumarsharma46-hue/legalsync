import pool from '@/lib/db/pool';

export interface SubscriptionState {
  userId: string;
  plan: string;
  status: string;
  paymentMethod: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  /** Alias for currentPeriodEnd so billing UI can stay simple. */
  trialEndDate: Date | null;
  daysRemaining: number;
  isExpired: boolean;
  cancelAtPeriodEnd: boolean;
  cryptoChargeCode: string | null;
}

interface SubscriptionRow {
  user_id: string;
  plan: string;
  status: string;
  payment_method: string | null;
  current_period_start: Date | null;
  current_period_end: Date | null;
  cancel_at_period_end: boolean | null;
  crypto_charge_code: string | null;
}

function toState(row: SubscriptionRow): SubscriptionState {
  const currentPeriodEnd = row.current_period_end ? new Date(row.current_period_end) : null;
  const daysRemaining = currentPeriodEnd
    ? Math.ceil((currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return {
    userId: row.user_id,
    plan: row.plan,
    status: row.status,
    paymentMethod: row.payment_method,
    currentPeriodStart: row.current_period_start ? new Date(row.current_period_start) : null,
    currentPeriodEnd,
    trialEndDate: currentPeriodEnd,
    daysRemaining,
    isExpired: row.status === 'expired' || row.status === 'cancelled' || daysRemaining <= 0,
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    cryptoChargeCode: row.crypto_charge_code,
  };
}

export class TrialManager {
  /** Latest subscription for a user, or null when the user has none. */
  async getSubscription(userId: string): Promise<SubscriptionState | null> {
    const result = await pool.query(
      `SELECT user_id, plan, status, payment_method, current_period_start,
              current_period_end, cancel_at_period_end, crypto_charge_code
       FROM subscriptions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    const row = result.rows[0] as SubscriptionRow | undefined;
    return row ? toState(row) : null;
  }

  /**
   * Billing summary for the dashboard. Returns null instead of throwing when
   * the user is fully paid up (there is no trial to report).
   */
  async checkTrialStatus(userId: string): Promise<SubscriptionState | null> {
    return this.getSubscription(userId);
  }

  async expireTrial(userId: string): Promise<void> {
    await pool.query(
      `UPDATE subscriptions
       SET status = 'expired', updated_at = NOW()
       WHERE user_id = $1 AND status = 'trial'`,
      [userId]
    );
  }

  async convertTrialToPaid(
    userId: string,
    paymentMethod: 'stripe' | 'crypto',
    paymentId?: string
  ): Promise<void> {
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

    await pool.query(
      `UPDATE subscriptions
       SET status = 'active',
           payment_method = $1,
           current_period_start = NOW(),
           current_period_end = $2,
           crypto_charge_code = $3,
           updated_at = NOW()
       WHERE user_id = $4`,
      [paymentMethod, currentPeriodEnd, paymentId ?? null, userId]
    );
  }

  /** Bulk-expire trials whose period has ended. Used by the daily cron job. */
  async checkExpiredTrials(): Promise<string[]> {
    const result = await pool.query(
      `UPDATE subscriptions
       SET status = 'expired', updated_at = NOW()
       WHERE status = 'trial' AND current_period_end < NOW()
       RETURNING user_id`
    );

    return (result.rows as Array<{ user_id: string }>).map((row) => row.user_id);
  }

  async getTrialsExpiringSoon(): Promise<SubscriptionState[]> {
    const result = await pool.query(
      `SELECT s.user_id, s.plan, s.status, s.payment_method, s.current_period_start,
              s.current_period_end, s.cancel_at_period_end, s.crypto_charge_code
       FROM subscriptions s
       WHERE s.status = 'trial'
         AND s.current_period_end <= NOW() + INTERVAL '3 days'
         AND s.current_period_end > NOW()`,
      []
    );

    return (result.rows as SubscriptionRow[]).map(toState);
  }
}

export const trialManager = new TrialManager();
