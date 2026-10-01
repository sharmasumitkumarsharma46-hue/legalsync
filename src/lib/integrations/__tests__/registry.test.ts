/** @jest-environment node */

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
});
