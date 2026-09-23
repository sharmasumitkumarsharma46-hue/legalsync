import pool from '@/lib/db/pool';

export interface TrialStatus {
  userId: string;
  plan: string;
  trialEndDate: Date;
  daysRemaining: number;
  isExpired: boolean;
  status: string;
}

export class TrialManager {
  /**
   * Check if trial has expired for a user
   */
  async checkTrialStatus(userId: string): Promise<TrialStatus> {
    const result = await pool.query(
      `SELECT * FROM subscriptions 
       WHERE user_id = $1 AND status = 'trial'`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('No active trial found');
    }

    const subscription = result.rows[0];
    const trialEndDate = new Date(subscription.current_period_end);
    const now = new Date();
    const daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isExpired = daysRemaining <= 0;

    return {
      userId,
      plan: subscription.plan,
      trialEndDate,
      daysRemaining,
      isExpired,
      status: subscription.status,
    };
  }

  /**
   * Expire trial and update subscription status
   */
  async expireTrial(userId: string): Promise<void> {
    await pool.query(
      `UPDATE subscriptions 
       SET status = 'expired' 
       WHERE user_id = $1 AND status = 'trial'`,
      [userId]
    );
  }

  /**
   * Convert trial to paid subscription
   */
  async convertTrialToPaid(
    userId: string,
    paymentMethod: 'stripe' | 'crypto',
    paymentId?: string
  ): Promise<void> {
    const result = await pool.query(
      `SELECT * FROM subscriptions 
       WHERE user_id = $1 AND status = 'trial'`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('No active trial found');
    }

    const subscription = result.rows[0];
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

    await pool.query(
      `UPDATE subscriptions 
       SET status = 'active',
           payment_method = $1,
           current_period_start = NOW(),
           current_period_end = $2,
           crypto_charge_code = $3
       WHERE user_id = $4`,
      [paymentMethod, currentPeriodEnd, paymentId || null, userId]
    );
  }

  /**
   * Check all expired trials (for cron job)
   */
  async checkExpiredTrials(): Promise<string[]> {
    const result = await pool.query(
      `SELECT user_id FROM subscriptions 
       WHERE status = 'trial' 
       AND current_period_end < NOW()`
    );

    const expiredUserIds = result.rows.map(row => row.user_id);

    // Update all expired trials
    for (const userId of expiredUserIds) {
      await this.expireTrial(userId);
    }

    return expiredUserIds;
  }

  /**
   * Get trials expiring soon (within 3 days)
   */
  async getTrialsExpiringSoon(): Promise<any[]> {
    const result = await pool.query(
      `SELECT s.*, u.email 
       FROM subscriptions s
       JOIN users u ON s.user_id = u.id
       WHERE s.status = 'trial' 
       AND s.current_period_end <= NOW() + INTERVAL '3 days'
       AND s.current_period_end > NOW()`
    );

    return result.rows;
  }
}

export const trialManager = new TrialManager();
