/** @jest-environment node */

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  PROVIDERS,
  PROVIDER_BY_INTEGRATION_TYPE,
  isProvider,
  getRedirectUri,
} from '../registry';

describe('integration registry', () => {
  it('recognises supported providers only', () => {
    expect(isProvider('clio')).toBe(true);
    expect(isProvider('google')).toBe(true);
    expect(isProvider('outlook')).toBe(true);
    expect(isProvider('dropbox')).toBe(false);
    expect(isProvider('__proto__')).toBe(false);
  });

  it('maps each provider to its stored integration type', () => {
    expect(PROVIDERS.clio.integrationType).toBe('clio');
    expect(PROVIDERS.google.integrationType).toBe('google_calendar');
    expect(PROVIDERS.outlook.integrationType).toBe('outlook');
  });

  it('reverses integration type back to provider key', () => {
    expect(PROVIDER_BY_INTEGRATION_TYPE['google_calendar']).toBe('google');
    expect(PROVIDER_BY_INTEGRATION_TYPE['clio']).toBe('clio');
    expect(PROVIDER_BY_INTEGRATION_TYPE['outlook']).toBe('outlook');
  });

  it('builds a callback redirect uri for a provider', () => {
    expect(getRedirectUri('google')).toContain('/api/integrations/google/callback');
  });

  it('names a distinct webhook secret variable per provider', () => {
    const names = Object.values(PROVIDERS).map((provider) => provider.webhookSecretEnv);

    expect(names).toEqual(
      expect.arrayContaining([
        'CLIO_WEBHOOK_SECRET',
        'GOOGLE_WEBHOOK_SECRET',
        'OUTLOOK_WEBHOOK_SECRET',
      ])
    );
    expect(new Set(names).size).toBe(names.length);
  });

  it('keeps every webhook secret variable documented in env.example.txt', () => {
    // Guards against a provider key drifting from the documented env name,
    // which would make a webhook silently return 503 forever.
    const documented = readFileSync(join(process.cwd(), 'env.example.txt'), 'utf8');

    for (const provider of Object.values(PROVIDERS)) {
      expect(documented).toContain(`${provider.webhookSecretEnv}=`);
    }
  });
});
