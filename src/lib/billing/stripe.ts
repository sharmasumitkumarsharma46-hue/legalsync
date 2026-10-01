import { createHmac, timingSafeEqual } from 'crypto';

const STRIPE_API = 'https://api.stripe.com/v1';

function stripeHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY || ''}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
}

function encodeForm(data: Record<string, string>): string {
  return Object.entries(data)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

export async function createCheckoutSession(params: {
  priceAmount: number;
  currency: string;
  planName: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ id: string; url: string }> {
  const body = encodeForm({
    'payment_method_types[]': 'card',
    'line_items[0][price_data][currency]': params.currency.toLowerCase(),
    'line_items[0][price_data][product_data][name]': `LegalSync ${params.planName}`,
    'line_items[0][price_data][unit_amount]': String(params.priceAmount * 100),
    'line_items[0][quantity]': '1',
    mode: 'subscription',
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    'metadata[userId]': params.userId,
    'metadata[plan]': params.planName,
  });

  const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
    method: 'POST',
    headers: stripeHeaders(),
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Stripe checkout error: ${err}`);
  }

  const session = await res.json() as { id: string; url: string };
  return { id: session.id, url: session.url };
}

export function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string
): boolean {
  try {
    const parts = Object.fromEntries(
      sigHeader.split(',').map((p) => p.split('=') as [string, string])
    );
    const ts = parts['t'];
    const v1 = parts['v1'];
    if (!ts || !v1) return false;

    const expected = createHmac('sha256', secret)
      .update(`${ts}.${payload}`, 'utf8')
      .digest('hex');

    const sigBuf = Buffer.from(v1, 'utf8');
    const expBuf = Buffer.from(expected, 'utf8');
    if (sigBuf.length !== expBuf.length) return false;
    return timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

/** Cancel a Stripe subscription at the end of the paid period. */
export async function cancelStripeSubscriptionAtPeriodEnd(
  subscriptionId: string
): Promise<boolean> {
  const res = await fetch(`${STRIPE_API}/subscriptions/${subscriptionId}`, {
    method: 'POST',
    headers: stripeHeaders(),
    body: encodeForm({ cancel_at_period_end: 'true' }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Stripe cancel error: ${err}`);
  }

  return true;
}

