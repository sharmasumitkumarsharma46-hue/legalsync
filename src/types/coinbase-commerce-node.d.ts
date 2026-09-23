declare module 'coinbase-commerce-node' {
  interface Charge {
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

  interface ChargeList {
    data: Charge[];
    pagination?: {
      next_uri?: string;
      previous_uri?: string;
    };
  }

  interface Client {
    charge: {
      create(data: any): Promise<Charge>;
      retrieve(code: string): Promise<Charge>;
      list(): Promise<ChargeList>;
      cancel(code: string): Promise<void>;
    };
  }

  const client: Client;
  function init(apiKey: string): Client;
}
