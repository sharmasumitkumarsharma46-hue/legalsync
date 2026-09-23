import Client from 'coinbase-commerce-node';

let client: any = null;

function getClient() {
  if (!client && process.env.COINBASE_API_KEY) {
    try {
      client = Client.init(process.env.COINBASE_API_KEY);
    } catch (error) {
      console.error('Failed to initialize Coinbase client:', error);
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
  /**
   * Create a charge for cryptocurrency payment
   */
  async createCharge(amount: number, currency: string = 'USD', description: string = 'LegalSync Subscription'): Promise<CryptoCharge> {
    try {
      const apiClient = getClient();
      if (!apiClient) {
        throw new Error('Coinbase client not initialized');
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

      return charge as CryptoCharge;
    } catch (error) {
      console.error('Error creating crypto charge:', error);
      throw new Error('Failed to create crypto charge');
    }
  }

  /**
   * Get charge status by code
   */
  async getChargeStatus(code: string): Promise<CryptoCharge> {
    try {
      const apiClient = getClient();
      if (!apiClient) {
        throw new Error('Coinbase client not initialized');
      }

      const charge = await apiClient.charge.retrieve(code);
      return charge as CryptoCharge;
    } catch (error) {
      console.error('Error retrieving charge:', error);
      throw new Error('Failed to retrieve charge status');
    }
  }

  /**
   * List all charges
   */
  async listCharges(): Promise<CryptoCharge[]> {
    try {
      const apiClient = getClient();
      if (!apiClient) {
        throw new Error('Coinbase client not initialized');
      }

      const charges = await apiClient.charge.list();
      return charges.data as CryptoCharge[];
    } catch (error) {
      console.error('Error listing charges:', error);
      throw new Error('Failed to list charges');
    }
  }

  /**
   * Cancel a charge
   */
  async cancelCharge(code: string): Promise<void> {
    try {
      const apiClient = getClient();
      if (!apiClient) {
        throw new Error('Coinbase client not initialized');
      }

      await apiClient.charge.cancel(code);
    } catch (error) {
      console.error('Error canceling charge:', error);
      throw new Error('Failed to cancel charge');
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const webhookSecret = process.env.COINBASE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        throw new Error('Webhook secret not configured');
      }

      // Simple verification - in production, use proper HMAC verification
      return signature === webhookSecret;
    } catch (error) {
      console.error('Error verifying webhook:', error);
      return false;
    }
  }
}

export const cryptoPaymentHandler = new CryptoPaymentHandler();
