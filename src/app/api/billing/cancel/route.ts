import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/pool';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    // Get user's current subscription
    const currentSubscription = await pool.query(
      `SELECT * FROM subscriptions WHERE user_id = $1`,
      [userId]
    );

    if (currentSubscription.rows.length === 0) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    const subscription = currentSubscription.rows[0];

    // Update subscription to cancel at period end
    await pool.query(
      `UPDATE subscriptions 
       SET cancel_at_period_end = TRUE 
       WHERE user_id = $1`,
      [userId]
    );

    return NextResponse.json(
      {
        message: 'Subscription will be cancelled at the end of the current billing period',
        currentPeriodEnd: subscription.current_period_end,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
