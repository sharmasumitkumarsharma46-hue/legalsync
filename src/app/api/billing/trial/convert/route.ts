import { NextRequest, NextResponse } from 'next/server';
import { trialManager } from '@/lib/billing/trial';
import { cryptoPaymentHandler } from '@/lib/billing/crypto';
import pool from '@/lib/db/pool';
import { verifyToken } from '@/lib/auth/utils';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { paymentMethod, paymentId } = body;

    // Validate payment method
    const validPaymentMethods = ['stripe', 'crypto'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return NextResponse.json(
        { error: 'Invalid payment method' },
        { status: 400 }
      );
    }

    // Get current subscription
    const subscriptionResult = await pool.query(
      `SELECT * FROM subscriptions WHERE user_id = $1 AND status = 'trial'`,
      [decoded.userId]
    );

    if (subscriptionResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'No active trial found' },
        { status: 404 }
      );
    }

    const subscription = subscriptionResult.rows[0];

    // Calculate pricing
    const pricing = {
      solo: 79,
      small_firm: 199,
      mid_firm: 499,
      enterprise: 999,
    };

    const amount = pricing[subscription.plan as keyof typeof pricing];

    // Handle crypto payment
    if (paymentMethod === 'crypto') {
      const charge = await cryptoPaymentHandler.createCharge(
        amount,
        'USD',
        `LegalSync ${subscription.plan} subscription - Trial conversion`
      );

      // Update subscription with pending crypto charge
      await pool.query(
        `UPDATE subscriptions 
         SET status = 'pending_payment',
             payment_method = 'crypto',
             crypto_charge_code = $1
         WHERE user_id = $2`,
        [charge.code, decoded.userId]
      );

      return NextResponse.json({
        success: true,
        message: 'Crypto charge created for trial conversion',
        paymentMethod: 'crypto',
        charge,
        hostedUrl: charge.hosted_url,
        chargeCode: charge.code,
      });
    }

    // Handle Stripe payment (automatic)
    await trialManager.convertTrialToPaid(decoded.userId, 'stripe');

    // Create invoice
    await pool.query(
      `INSERT INTO invoices (user_id, subscription_id, amount, status, due_date, paid_at)
       VALUES ($1, $2, $3, 'paid', NOW(), NOW())`,
      [decoded.userId, subscription.id, amount]
    );

    return NextResponse.json({
      success: true,
      message: 'Trial converted to paid subscription',
      paymentMethod: 'stripe',
      plan: subscription.plan,
      amount,
    });
  } catch (error) {
    console.error('Error converting trial:', error);
    return NextResponse.json(
      { error: 'Failed to convert trial' },
      { status: 500 }
    );
  }
}
