import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/pool';
import { verifyToken } from '@/lib/auth/utils';
import { getPlanConfig, getPlanFeatures, PlanFeature } from '@/lib/billing/plans';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const result = await pool.query(
      `SELECT plan, status, current_period_end, current_period_start
       FROM subscriptions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [decoded.userId]
    );

    const subscription = result.rows[0];
    const plan = subscription?.plan || 'solo';
    const config = getPlanConfig(plan);
    const features: PlanFeature[] = getPlanFeatures(plan);

    return NextResponse.json({
      success: true,
      plan,
      status: subscription?.status || 'trial',
      currentPeriodEnd: subscription?.current_period_end || null,
      maxUsers: config.maxUsers,
      features,
      details: config,
    });
  } catch (error) {
    console.error('Plan access error:', error);
    return NextResponse.json({ error: 'Failed to load plan access' }, { status: 500 });
  }
}
