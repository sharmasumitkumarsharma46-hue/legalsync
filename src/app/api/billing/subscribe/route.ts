import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/pool';
import { cryptoPaymentHandler } from '@/lib/billing/crypto';

export async function POST(request: NextRequest) {
  try {
    const { userId, plan, paymentMethod = 'stripe' } = await request.json();

    // Validate plan
    const validPlans = ['solo', 'small_firm', 'mid_firm', 'enterprise'];
    if (!validPlans.includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      );
    }

    // Validate payment method
    const validPaymentMethods = ['stripe', 'crypto'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return NextResponse.json(
        { error: 'Invalid payment method' },
        { status: 400 }
      );
    }

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

    // Calculate pricing
    const pricing = {
      solo: 79,
      small_firm: 199,
      mid_firm: 499,
      enterprise: 999,
    };

    const amount = pricing[plan as keyof typeof pricing];

    // Handle crypto payment
    if (paymentMethod === 'crypto') {
      const charge = await cryptoPaymentHandler.createCharge(
        amount,
        'USD',
        `LegalSync ${plan} subscription`
      );

      // Update subscription with pending crypto charge
      await pool.query(
        `UPDATE subscriptions 
         SET plan = $1, 
             status = 'pending',
             payment_method = 'crypto',
             crypto_charge_code = $2
         WHERE user_id = $3`,
        [plan, charge.code, userId]
      );

      return NextResponse.json(
        {
          message: 'Crypto charge created',
          paymentMethod: 'crypto',
          charge,
          hostedUrl: charge.hosted_url,
          chargeCode: charge.code,
        },
        { status: 200 }
      );
    }

    // Handle Stripe payment (existing logic)
    const currentPeriodStart = new Date();
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 14); // 14-day free trial

    // Update subscription
    await pool.query(
      `UPDATE subscriptions 
       SET plan = $1, 
           status = 'trial', 
           current_period_start = $3, 
           current_period_end = $2,
           cancel_at_period_end = FALSE,
           payment_method = 'stripe'
       WHERE user_id = $4`,
      [plan, currentPeriodEnd, currentPeriodStart, userId]
    );

    // Create invoice
    await pool.query(
      `INSERT INTO invoices (user_id, subscription_id, amount, status, due_date, paid_at)
       VALUES ($1, $2, $3, 'paid', NOW(), NOW())`,
      [userId, currentSubscription.rows[0].id, amount]
    );

    return NextResponse.json(
      {
        message: '14-day free trial started',
        plan,
        amount,
        trialEndDate: currentPeriodEnd,
        paymentMethod: 'stripe',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
