// Microsoft Outlook API Client
const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';
const MICROSOFT_AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

export interface OutlookEvent {
  id?: string;
  subject: string;
  body?: {
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
  };
  attendees?: Array<{
    emailAddress: {
      address: string;
      name: string;
    };
  }>;
  lastModifiedDateTime?: string;
}

export interface OutlookCalendar {
  id: string;
  name: string;
}

export class OutlookClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request<T = Record<string, unknown>>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(`${GRAPH_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Microsoft Graph API error: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as T;
  }

  async getCalendars(): Promise<OutlookCalendar[]> {
    const data = await this.request<{ value?: OutlookCalendar[] }>('/me/calendars');
    return data.value || [];
  }

  async getEvent(eventId: string): Promise<OutlookEvent> {
    return this.request<OutlookEvent>(`/me/events/${eventId}`);
  }

  async getEvents(calendarId: string = 'primary', startDate?: Date, endDate?: Date): Promise<OutlookEvent[]> {
    let url = `/me/calendars/${calendarId}/calendarView`;
    const params = new URLSearchParams();

    if (startDate) {
      params.append('startDateTime', startDate.toISOString());
    }

    if (endDate) {
      params.append('endDateTime', endDate.toISOString());
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const data = await this.request<{ value?: OutlookEvent[] }>(url);
    return data.value || [];
  }

  async createEvent(calendarId: string, event: OutlookEvent): Promise<OutlookEvent> {
    const data = await this.request<OutlookEvent>(`/me/calendars/${calendarId}/events`, {
      method: 'POST',
      body: JSON.stringify(event),
    });
    return data;
  }

  async updateEvent(calendarId: string, eventId: string, event: OutlookEvent): Promise<OutlookEvent> {
    const data = await this.request<OutlookEvent>(`/me/calendars/${calendarId}/events/${eventId}`, {
      method: 'PATCH',
      body: JSON.stringify(event),
    });
    return data;
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    await this.request<unknown>(`/me/calendars/${calendarId}/events/${eventId}`, {
      method: 'DELETE',
    });
  }
}

export function getMicrosoftAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.MICROSOFT_CLIENT_ID || '',
    redirect_uri: redirectUri,
    scope: 'https://graph.microsoft.com/Calendars.ReadWrite',
    state: state,
    response_mode: 'query',
  });

  return `${MICROSOFT_AUTH_URL}?${params.toString()}`;
}

export async function exchangeMicrosoftCode(code: string, redirectUri: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const response = await fetch(MICROSOFT_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.MICROSOFT_CLIENT_ID || '',
      client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
      code: code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`Microsoft token exchange error: ${response.status}`);
  }

  return response.json();
}

export async function refreshMicrosoftToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const response = await fetch(MICROSOFT_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.MICROSOFT_CLIENT_ID || '',
      client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Microsoft token refresh error: ${response.status}`);
  }

  return response.json();
}
