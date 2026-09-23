import { NextRequest, NextResponse } from 'next/server';
import { cryptoPaymentHandler } from '@/lib/billing/crypto';
import pool from '@/lib/db/pool';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const signature = request.headers.get('x-cc-webhook-signature');

    // Verify webhook signature
    if (!cryptoPaymentHandler.verifyWebhookSignature(JSON.stringify(body), signature || '')) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const { event } = body;

    // Handle different webhook events
    if (event.type === 'charge:confirmed') {
      const chargeCode = event.data.code;
      
      // Get subscription details
      const subscriptionResult = await pool.query(
        `SELECT * FROM subscriptions WHERE crypto_charge_code = $1`,
        [chargeCode]
      );

      if (subscriptionResult.rows.length > 0) {
        const subscription = subscriptionResult.rows[0];
        
        // Calculate pricing
        const pricing = {
          solo: 79,
          small_firm: 199,
          mid_firm: 499,
          enterprise: 999,
        };

        const amount = pricing[subscription.plan as keyof typeof pricing] || 0;
        const currentPeriodEnd = new Date();
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

        // Update subscription status
        await pool.query(
          `UPDATE subscriptions 
           SET status = 'active', 
               payment_method = 'crypto',
               current_period_start = NOW(),
               current_period_end = $1
           WHERE crypto_charge_code = $2`,
          [currentPeriodEnd, chargeCode]
        );

        // Create invoice
        await pool.query(
          `INSERT INTO invoices (user_id, subscription_id, amount, status, due_date, paid_at)
           VALUES ($1, $2, $3, 'paid', NOW(), NOW())`,
          [subscription.user_id, subscription.id, amount]
        );
      }
    } else if (event.type === 'charge:failed') {
      const chargeCode = event.data.code;
      
      // Update subscription status
      await pool.query(
        `UPDATE subscriptions 
         SET status = 'failed' 
         WHERE crypto_charge_code = $1`,
        [chargeCode]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}
