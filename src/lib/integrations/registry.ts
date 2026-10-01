import { getClioAuthUrl, exchangeClioCode, ClioClient } from './clio/client';
import { getGoogleAuthUrl, exchangeGoogleCode, GoogleCalendarClient } from './google/client';
import { getMicrosoftAuthUrl, exchangeMicrosoftCode, OutlookClient } from './outlook/client';

export type ProviderKey = 'clio' | 'google' | 'outlook';

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

export interface ProviderCalendar {
  id: string;
  name: string;
  isPrimary: boolean;
}

export interface ProviderConfig {
  integrationType: string;
  label: string;
  /** Providers that can act as a sync destination for calendar events. */
  supportsEventSync: boolean;
  getAuthUrl(redirectUri: string, state: string): string;
  exchangeCode(code: string, redirectUri: string): Promise<TokenResponse>;
  listCalendars(accessToken: string): Promise<ProviderCalendar[]>;
}

async function listClioCalendars(accessToken: string): Promise<ProviderCalendar[]> {
  const calendars = await new ClioClient(accessToken).getCalendars();
  return calendars.map((calendar, index) => ({
    id: calendar.id,
    name: calendar.name,
    isPrimary: index === 0,
  }));
}

async function listGoogleCalendars(accessToken: string): Promise<ProviderCalendar[]> {
  const calendars = await new GoogleCalendarClient(accessToken).getCalendars();
  return calendars.map((calendar) => ({
    id: calendar.id,
    name: calendar.summary || calendar.id,
    isPrimary: calendar.id === 'primary',
  }));
}

async function listOutlookCalendars(accessToken: string): Promise<ProviderCalendar[]> {
  const calendars = await new OutlookClient(accessToken).getCalendars();
  return calendars.map((calendar, index) => ({
    id: calendar.id,
    name: calendar.name || calendar.id,
    isPrimary: index === 0,
  }));
}

export const PROVIDERS: Record<ProviderKey, ProviderConfig> = {
  clio: {
    integrationType: 'clio',
    label: 'Clio',
    supportsEventSync: false,
    getAuthUrl: getClioAuthUrl,
    exchangeCode: exchangeClioCode,
    listCalendars: listClioCalendars,
  },
  google: {
    integrationType: 'google_calendar',
    label: 'Google Calendar',
    supportsEventSync: true,
    getAuthUrl: getGoogleAuthUrl,
    exchangeCode: exchangeGoogleCode,
    listCalendars: listGoogleCalendars,
  },
  outlook: {
    integrationType: 'outlook',
    label: 'Outlook',
    supportsEventSync: true,
    getAuthUrl: getMicrosoftAuthUrl,
    exchangeCode: exchangeMicrosoftCode,
    listCalendars: listOutlookCalendars,
  },
};

export const SYNC_DESTINATION_PROVIDERS: ProviderKey[] = (
  Object.keys(PROVIDERS) as ProviderKey[]
).filter((key) => PROVIDERS[key].supportsEventSync);

export function isProvider(value: string): value is ProviderKey {
  return Object.prototype.hasOwnProperty.call(PROVIDERS, value);
}

export const PROVIDER_BY_INTEGRATION_TYPE: Record<string, ProviderKey> = Object.entries(
  PROVIDERS
).reduce((acc, [key, config]) => {
  acc[(config as ProviderConfig).integrationType] = key as ProviderKey;
  return acc;
}, {} as Record<string, ProviderKey>);

export function getRedirectUri(provider: ProviderKey): string {
  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  return `${baseUrl}/api/integrations/${provider}/callback`;
}
