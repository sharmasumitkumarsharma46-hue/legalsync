import Client, { type CoinbaseCharge, type CoinbaseClient } from 'coinbase-commerce-node';
import { createHmac, timingSafeEqual } from 'crypto';
import { logger } from '@/lib/logger';

let client: CoinbaseClient | null = null;

function getClient(): CoinbaseClient | null {
  const apiKey = process.env.COINBASE_API_KEY;
  if (!apiKey) {
    return null;
  }

  if (!client) {
    try {
      client = Client.init(apiKey);
    } catch (error) {
      logger.error('Failed to initialize Coinbase client', { error: String(error) });
      return null;
    }
  }

  return client;
}

export interface CryptoCharge {
  code: string;
  name: string;
  description: string;
  pricing_type: string;
  local_price: {
    amount: string;
    currency: string;
  };
  hosted_url: string;
  expires_at: string;
  created_at: string;
  timeline?: Array<{
    status: string;
    time: string;
  }>;
}

export interface CryptoPayment {
  chargeCode: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'expired';
  userId: string;
  subscriptionId?: string;
}

export class CryptoPaymentHandler {
  async createCharge(
    amount: number,
    currency: string = 'USD',
    description: string = 'LegalSync Subscription'
  ): Promise<CryptoCharge> {
    const apiClient = getClient();
    if (!apiClient) {
      throw new Error('Coinbase Commerce is not configured');
    }

    const charge = await apiClient.charge.create({
      name: 'LegalSync Subscription',
      description,
      pricing_type: 'fixed_price',
      local_price: {
        amount: amount.toString(),
        currency,
      },
      metadata: {
        product: 'legalsync_subscription',
      },
    });

    return charge;
  }

  async getChargeStatus(code: string): Promise<CryptoCharge> {
    const apiClient = getClient();
    if (!apiClient) {
      throw new Error('Coinbase Commerce is not configured');
    }

    return apiClient.charge.retrieve(code);
  }

  async listCharges(): Promise<CoinbaseCharge[]> {
    const apiClient = getClient();
    if (!apiClient) {
      throw new Error('Coinbase Commerce is not configured');
    }

    const charges = await apiClient.charge.list();
    return charges.data ?? [];
  }

  async cancelCharge(code: string): Promise<void> {
    const apiClient = getClient();
    if (!apiClient) {
      throw new Error('Coinbase Commerce is not configured');
    }

    await apiClient.charge.cancel(code);
  }

  /**
   * Coinbase Commerce signs the raw request body with HMAC-SHA256 using the
   * shared webhook secret (X-CC-Webhook-Signature header).
   */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const webhookSecret = process.env.COINBASE_WEBHOOK_SECRET;
    if (!webhookSecret || !signature) {
      return false;
    }

    try {
      const expected = createHmac('sha256', webhookSecret).update(rawBody, 'utf8').digest('hex');
      const received = signature.trim().toLowerCase();
      const expectedBuf = Buffer.from(expected, 'utf8');
      const receivedBuf = Buffer.from(received, 'utf8');

      if (expectedBuf.length !== receivedBuf.length) {
        return false;
      }

      return timingSafeEqual(expectedBuf, receivedBuf);
    } catch (error) {
      logger.error('Failed to verify Coinbase webhook signature', { error: String(error) });
      return false;
    }
  }
}

export const cryptoPaymentHandler = new CryptoPaymentHandler();
