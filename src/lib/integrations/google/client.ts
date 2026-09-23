// Google Calendar API Client
const GOOGLE_API_BASE = 'https://www.googleapis.com/calendar/v3';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export interface GoogleEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  recurrence?: string[];
}

export interface GoogleCalendar {
  id: string;
  summary: string;
}

export class GoogleCalendarClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request(endpoint: string, options?: RequestInit): Promise<any> {
    const response = await fetch(`${GOOGLE_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Google Calendar API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getCalendars(): Promise<GoogleCalendar[]> {
    const data = await this.request('/users/me/calendarList');
    return data.items || [];
  }

  async getEvents(calendarId: string = 'primary', startDate?: Date, endDate?: Date): Promise<GoogleEvent[]> {
    let url = `/calendars/${calendarId}/events`;
    const params = new URLSearchParams();

    if (startDate) {
      params.append('timeMin', startDate.toISOString());
    }

    if (endDate) {
      params.append('timeMax', endDate.toISOString());
    }

    params.append('singleEvents', 'true');
    params.append('orderBy', 'startTime');

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const data = await this.request(url);
    return data.items || [];
  }

  async createEvent(calendarId: string, event: GoogleEvent): Promise<GoogleEvent> {
    const data = await this.request(`/calendars/${calendarId}/events`, {
      method: 'POST',
      body: JSON.stringify(event),
    });
    return data;
  }

  async updateEvent(calendarId: string, eventId: string, event: GoogleEvent): Promise<GoogleEvent> {
    const data = await this.request(`/calendars/${calendarId}/events/${eventId}`, {
      method: 'PATCH',
      body: JSON.stringify(event),
    });
    return data;
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    await this.request(`/calendars/${calendarId}/events/${eventId}`, {
      method: 'DELETE',
    });
  }
}

export function getGoogleAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: redirectUri,
    scope: 'https://www.googleapis.com/auth/calendar',
    state: state,
    access_type: 'offline',
    prompt: 'consent',
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string, redirectUri: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      code: code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`Google token exchange error: ${response.status}`);
  }

  return response.json();
}

export async function refreshGoogleToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Google token refresh error: ${response.status}`);
  }

  return response.json();
}
