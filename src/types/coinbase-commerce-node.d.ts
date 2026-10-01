declare module 'coinbase-commerce-node' {
  export interface CoinbaseCharge {
    code: string;
    name: string;
    description: string;
    pricing_type: string;
    local_price: { amount: string; currency: string };
    hosted_url: string;
    expires_at: string;
    created_at: string;
    timeline?: Array<{ status: string; time: string }>;
  }

  export interface CoinbaseChargeClient {
    create(params: {
      name: string;
      description: string;
      pricing_type: string;
      local_price: { amount: string; currency: string };
      metadata?: Record<string, string>;
    }): Promise<CoinbaseCharge>;
    retrieve(code: string): Promise<CoinbaseCharge>;
    list(): Promise<{ data: CoinbaseCharge[] }>;
    cancel(code: string): Promise<CoinbaseCharge>;
  }

  export interface CoinbaseClient {
    charge: CoinbaseChargeClient;
  }

  const Client: {
    init(apiKey: string): CoinbaseClient;
  };

  export default Client;
}
