// Clio API Client
const CLIO_API_BASE = 'https://app.goclio.com/api/v4';
const CLIO_AUTH_URL = 'https://app.goclio.com/oauth/authorize';
const CLIO_TOKEN_URL = 'https://app.goclio.com/oauth/token';

export interface ClioEvent {
  id: string;
  title: string;
  description?: string;
  start: {
    date_time?: string;
  };
  end: {
    date_time?: string;
  };
  location?: string;
  calendar?: {
    id: string;
    name?: string;
  };
  matter?: {
    id: string;
    name: string;
  };
  attendees?: Array<{
    email: string;
    name?: string;
  }>;
  updated_at?: string;
}

export interface ClioCalendar {
  id: string;
  name: string;
}

export class ClioClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request<T = Record<string, unknown>>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(`${CLIO_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Clio API error: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as T;
  }

  async getCalendars(): Promise<ClioCalendar[]> {
    const data = await this.request<{ data?: ClioCalendar[] }>('/calendars');
    return data.data || [];
  }

  async getEvent(eventId: string): Promise<ClioEvent> {
    const data = await this.request<{ data: ClioEvent }>(`/calendar_entries/${eventId}`);
    return data.data;
  }

  async getEvents(calendarId?: string, startDate?: Date, endDate?: Date): Promise<ClioEvent[]> {
    let url = '/calendar_entries';
    const params = new URLSearchParams();

    if (calendarId) {
      params.append('calendar_id', calendarId);
    }

    if (startDate) {
      params.append('start_date', startDate.toISOString());
    }

    if (endDate) {
      params.append('end_date', endDate.toISOString());
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const data = await this.request<{ data?: ClioEvent[] }>(url);
    return data.data || [];
  }

  async createEvent(event: Partial<ClioEvent>): Promise<ClioEvent> {
    const data = await this.request<{ data: ClioEvent }>('/calendar_entries', {
      method: 'POST',
      body: JSON.stringify({ data: event }),
    });
    return data.data;
  }

  async updateEvent(eventId: string, event: Partial<ClioEvent>): Promise<ClioEvent> {
    const data = await this.request<{ data: ClioEvent }>(`/calendar_entries/${eventId}`, {
      method: 'PATCH',
      body: JSON.stringify({ data: event }),
    });
    return data.data;
  }

  async deleteEvent(eventId: string): Promise<void> {
    await this.request<unknown>(`/calendar_entries/${eventId}`, {
      method: 'DELETE',
    });
  }
}

export function getClioAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.CLIO_CLIENT_ID || '',
    redirect_uri: redirectUri,
    scope: 'calendar calendar:read calendar:write',
    state: state,
  });

  return `${CLIO_AUTH_URL}?${params.toString()}`;
}

export async function exchangeClioCode(code: string, redirectUri: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const response = await fetch(CLIO_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: process.env.CLIO_CLIENT_ID,
      client_secret: process.env.CLIO_CLIENT_SECRET,
      code: code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`Clio token exchange error: ${response.status}`);
  }

  return response.json();
}

export async function refreshClioToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const response = await fetch(CLIO_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: process.env.CLIO_CLIENT_ID,
      client_secret: process.env.CLIO_CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Clio token refresh error: ${response.status}`);
  }

  return response.json();
}
