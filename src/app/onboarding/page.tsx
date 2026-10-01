'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch, fetchCurrentUser } from '@/lib/auth/client';

type Provider = 'clio' | 'google' | 'outlook';
type Destination = 'google' | 'outlook';

interface ProviderCalendar {
  id: string;
  name: string;
  isPrimary: boolean;
  selected?: boolean;
}

const STEPS = [
  { number: 1, title: 'Connect Clio', description: 'Link your case management system' },
  { number: 2, title: 'Connect a calendar', description: 'Link Google Calendar or Outlook' },
  { number: 3, title: 'Select calendars', description: 'Choose which calendars receive events' },
  { number: 4, title: 'Sync preferences', description: 'Set frequency and conflict handling' },
  { number: 5, title: 'Review and sync', description: 'Confirm and run your first sync' },
];

const PROVIDER_LABEL: Record<Provider, string> = {
  clio: 'Clio',
  google: 'Google Calendar',
  outlook: 'Outlook',
};

const PRIMARY_BUTTON =
  'inline-flex items-center justify-center rounded-xl bg-[#10233f] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1a385e] focus:outline-none focus:ring-4 focus:ring-[#b7c8dc] disabled:cursor-not-allowed disabled:opacity-50';

const SECONDARY_BUTTON =
  'inline-flex items-center justify-center rounded-xl border border-[#d8e1ec] bg-white px-5 py-3 text-sm font-bold text-[#10233f] transition hover:bg-[#f4f8ff] focus:outline-none focus:ring-4 focus:ring-[#d8f5ef] disabled:cursor-not-allowed disabled:opacity-50';

function OnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(1);
  const [userEmail, setUserEmail] = useState('');
  const [connecting, setConnecting] = useState<Provider | null>(null);
  const [status, setStatus] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const [calendars, setCalendars] = useState<Record<string, ProviderCalendar[]>>({});
  const [selection, setSelection] = useState<Record<string, string[]>>({});
  const [calendarsLoading, setCalendarsLoading] = useState<Record<string, boolean>>({});
  const [calendarsError, setCalendarsError] = useState<Record<string, string>>({});
  const [savingCalendars, setSavingCalendars] = useState(false);

  const [frequency, setFrequency] = useState(5);
  const [conflictRule, setConflictRule] = useState('last_write_wins');
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');

  const destinations = (['google', 'outlook'] as const).filter(
    (provider) => status[provider] === 'connected'
  );

  const loadIntegrationStatus = useCallback(async () => {
    try {
      const data = await apiFetch<{ byProvider: Record<string, string> }>('/api/integrations/status');
      setStatus(data.byProvider || {});
    } catch {
      setError('Could not read your connection status.');
    }
  }, []);

  const loadCalendars = useCallback(async (provider: Destination) => {
    setCalendarsLoading((prev) => ({ ...prev, [provider]: true }));
    setCalendarsError((prev) => ({ ...prev, [provider]: '' }));

    try {
      const data = await apiFetch<{ calendars: ProviderCalendar[] }>(
        `/api/integrations/${provider}/calendars`
      );
      setCalendars((prev) => ({ ...prev, [provider]: data.calendars || [] }));
      setSelection((prev) => ({
        ...prev,
        [provider]: (data.calendars || []).filter((c) => c.selected).map((c) => c.id),
      }));
    } catch (loadError) {
      setCalendarsError((prev) => ({
        ...prev,
        [provider]: loadError instanceof Error ? loadError.message : 'Unable to load calendars.',
      }));
    } finally {
      setCalendarsLoading((prev) => ({ ...prev, [provider]: false }));
    }
  }, []);
useEffect(() => {
    let cancelled = false;

    (async () => {
      const currentUser = await fetchCurrentUser();
      if (cancelled) return;

      if (!currentUser) {
        router.replace('/login');
        return;
      }

      setUserEmail(currentUser.email);
      await loadIntegrationStatus();
    })();

    const connected = searchParams.get('connected');
    const failed = searchParams.get('error');
    if (connected) setInfo(`${connected} connected successfully.`);
    if (failed) setError(`Could not complete the ${failed} connection. Please try again.`);

    return () => {
      cancelled = true;
    };
  }, [loadIntegrationStatus, router, searchParams]);

  useEffect(() => {
    destinations.forEach((provider) => {
      void loadCalendars(provider);
    });
    // Re-run whenever the set of connected destinations changes.
  }, [destinations, loadCalendars]);

  const connect = async (provider: Provider) => {
    setConnecting(provider);
    setError('');
    setInfo('');

    try {
      const data = await apiFetch<{ authUrl: string }>(`/api/integrations/${provider}/connect`, {
        method: 'POST',
      });
      window.location.assign(data.authUrl);
    } catch (connectError) {
      setError(
        connectError instanceof Error ? connectError.message : 'Unable to start connection.'
      );
      setConnecting(null);
    }
  };

  const toggleCalendar = (provider: string, calendarId: string) => {
    setSelection((prev) => {
      const current = prev[provider] ?? [];
      return {
        ...prev,
        [provider]: current.includes(calendarId)
          ? current.filter((id) => id !== calendarId)
          : [...current, calendarId],
      };
    });
  };

  const saveCalendars = async () => {
    setSavingCalendars(true);
    setError('');

    try {
      for (const provider of destinations) {
        await apiFetch(`/api/integrations/${provider}/calendars`, {
          method: 'POST',
          body: JSON.stringify({
            calendars: (calendars[provider] ?? [])
              .filter((calendar) => (selection[provider] ?? []).includes(calendar.id))
              .map((calendar) => ({ id: calendar.id, name: calendar.name })),
          }),
        });
      }

      await loadIntegrationStatus();
      setInfo('Calendar selection saved.');
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'Could not save your calendar selection.'
      );
    } finally {
      setSavingCalendars(false);
    }
  };

  const startFirstSync = async () => {
    setStarting(true);
    setStartError('');

    try {
      await apiFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({
          syncFrequency: frequency,
          conflictResolutionRule: conflictRule,
        }),
      });

      await apiFetch('/api/sync/run', {
        method: 'POST',
        body: JSON.stringify({ direction: 'all' }),
      });

      router.replace('/dashboard');
    } catch (syncError) {
      setStartError(
        syncError instanceof Error ? syncError.message : 'Your first sync could not start.'
      );
    } finally {
      setStarting(false);
    }
  };

  const goNext = async () => {
    setError('');
    if (step === 3 && destinations.length > 0) {
      await saveCalendars();
    }
    setStep((current) => Math.min(current + 1, STEPS.length));
  };

  const goBack = () => {
    setError('');
    setStep((current) => Math.max(current - 1, 1));
  };

  const selectedCalendarCount = destinations.reduce(
    (total, provider) => total + (selection[provider] ?? []).length,
    0
  );

  return (
<div className="min-h-screen bg-[#f4f7fb] px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <div className="rounded-[28px] border border-[#e4eaf1] bg-white p-6 shadow-[0_20px_60px_rgba(16,35,63,0.08)] sm:p-10">
          <p className="text-lg font-black tracking-[-0.05em] text-[#10233f]">
            Legal<span className="text-[#159b89]">Sync</span>
          </p>
          <p className="mt-1 text-sm text-[#687992]">Setting up {userEmail || 'your account'}</p>

          <ol className="mt-8 flex items-center" aria-label="Setup progress">
            {STEPS.map((entry, index) => (
              <li key={entry.number} className="flex flex-1 items-center last:flex-none">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    entry.number < step
                      ? 'bg-[#159b89] text-white'
                      : entry.number === step
                        ? 'bg-[#10233f] text-white'
                        : 'bg-[#eef2f7] text-[#8b9ab0]'
                  }`}
                  aria-current={entry.number === step ? 'step' : undefined}
                >
                  {entry.number < step ? '✓' : entry.number}
                </span>
                {index < STEPS.length - 1 && (
                  <span
                    className={`mx-2 h-1 flex-1 rounded-full ${
                      entry.number < step ? 'bg-[#159b89]' : 'bg-[#eef2f7]'
                    }`}
                  />
                )}
              </li>
            ))}
          </ol>

          <h1 className="mt-8 text-2xl font-black tracking-[-0.03em] text-[#10233f]">
            {STEPS[step - 1].title}
          </h1>
          <p className="mt-1 text-sm text-[#687992]">{STEPS[step - 1].description}</p>

          {error && (
            <p
              role="alert"
              className="mt-5 rounded-xl border border-[#f5d5d5] bg-[#fdf2f2] px-4 py-3 text-sm text-[#a1322a]"
            >
              {error}
            </p>
          )}
          {info && (
            <p
              role="status"
              className="mt-5 rounded-xl border border-[#bfe9e0] bg-[#eafaf6] px-4 py-3 text-sm text-[#0f6b5c]"
            >
              {info}
            </p>
          )}

          <div className="mt-8">
            {step === 1 && (
              <div className="space-y-4">
                <p className="text-sm leading-6 text-[#687992]">
                  Clio is the source of your matter deadlines. LegalSync reads its calendar entries
                  and keeps your selected calendars in step.
                </p>
                <button
                  type="button"
                  onClick={() => void connect('clio')}
                  disabled={connecting === 'clio'}
                  className={PRIMARY_BUTTON}
                >
                  {connecting === 'clio'
                    ? 'Redirecting…'
                    : status.clio === 'connected'
                      ? 'Reconnect Clio'
                      : 'Connect Clio'}
                </button>
                {status.clio === 'connected' && (
                  <p className="text-sm font-semibold text-[#0f6b5c]">Clio is connected.</p>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <p className="text-sm leading-6 text-[#687992]">
                  Connect at least one calendar to receive your Clio entries. You can add the other
                  later from the dashboard.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(['google', 'outlook'] as Provider[]).map((provider) => (
                    <button
                      key={provider}
                      type="button"
                      onClick={() => void connect(provider)}
                      disabled={connecting === provider}
                      className={`${SECONDARY_BUTTON} justify-between`}
                    >
                      <span>{PROVIDER_LABEL[provider]}</span>
                      <span
                        className={`text-xs font-bold ${
                          status[provider] === 'connected' ? 'text-[#0f6b5c]' : 'text-[#8b9ab0]'
                        }`}
                      >
                        {connecting === provider
                          ? 'Redirecting…'
                          : status[provider] === 'connected'
                            ? 'Connected'
                            : 'Connect'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
{step === 3 && (
              <div className="space-y-5">
                {destinations.length === 0 ? (
                  <p className="rounded-xl border border-[#fde9c8] bg-[#fff8ec] px-4 py-3 text-sm text-[#8a5a10]">
                    Connect a calendar in the previous step before choosing which calendars to sync.
                  </p>
                ) : (
                  destinations.map((provider) => (
                    <div key={provider}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-bold text-[#10233f]">
                          {PROVIDER_LABEL[provider]}
                        </p>
                        <button
                          type="button"
                          onClick={() => void loadCalendars(provider)}
                          className="text-xs font-bold text-[#159b89] hover:text-[#10233f]"
                        >
                          Refresh
                        </button>
                      </div>

                      {calendarsLoading[provider] && (
                        <p className="mt-3 text-sm text-[#687992]">Loading calendars…</p>
                      )}

                      {calendarsError[provider] && (
                        <p className="mt-3 rounded-xl border border-[#f5d5d5] bg-[#fdf2f2] px-4 py-3 text-sm text-[#a1322a]">
                          {calendarsError[provider]}
                        </p>
                      )}

                      {!calendarsLoading[provider] && !calendarsError[provider] && (
                        <ul className="mt-3 space-y-2">
                          {(calendars[provider] ?? []).map((calendar) => (
                            <li key={calendar.id}>
                              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#e4eaf1] px-4 py-3 transition hover:bg-[#f8fbff]">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-[#c9d6e4] text-[#159b89] focus:ring-[#d8f5ef]"
                                  checked={(selection[provider] ?? []).includes(calendar.id)}
                                  onChange={() => toggleCalendar(provider, calendar.id)}
                                />
                                <span className="min-w-0 flex-1 truncate text-sm text-[#10233f]">
                                  {calendar.name}
                                </span>
                                {calendar.isPrimary && (
                                  <span className="rounded-full bg-[#eef4ff] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#2476bc]">
                                    Primary
                                  </span>
                                )}
                              </label>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))
                )}

                {selectedCalendarCount > 0 && (
                  <p className="text-sm text-[#687992]">
                    {selectedCalendarCount} calendar{selectedCalendarCount === 1 ? '' : 's'}{' '}
                    selected. Your selection is saved when you continue.
                  </p>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <div>
                  <label
                    htmlFor="onboard-frequency"
                    className="block text-sm font-bold text-[#10233f]"
                  >
                    Sync frequency
                  </label>
                  <select
                    id="onboard-frequency"
                    value={frequency}
                    onChange={(event) => setFrequency(Number(event.target.value))}
                    className="mt-2 w-full rounded-xl border border-[#d8e1ec] bg-white px-3 py-3 text-sm text-[#10233f] outline-none focus:border-[#159b89] focus:ring-4 focus:ring-[#d8f5ef]"
                  >
                    {[5, 15, 30, 60].map((minutes) => (
                      <option key={minutes} value={minutes}>
                        Every {minutes} minutes
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="onboard-conflict" className="block text-sm font-bold text-[#10233f]">
                    When an event changes in two places
                  </label>
                  <select
                    id="onboard-conflict"
                    value={conflictRule}
                    onChange={(event) => setConflictRule(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#d8e1ec] bg-white px-3 py-3 text-sm text-[#10233f] outline-none focus:border-[#159b89] focus:ring-4 focus:ring-[#d8f5ef]"
                  >
                    <option value="last_write_wins">Keep the most recent change</option>
                    <option value="clio">Always keep the Clio version</option>
                    <option value="calendar">Always keep the calendar version</option>
                    <option value="manual">Ask me every time</option>
                  </select>
                </div>
              </div>
            )}
{step === 5 && (
              <div className="space-y-4">
                <ul className="space-y-2">
                  {(['clio', 'google', 'outlook'] as Provider[]).map((provider) => {
                    const connected = status[provider] === 'connected';
                    const count = provider === 'clio' ? 0 : (selection[provider] ?? []).length;

                    return (
                      <li
                        key={provider}
                        className="flex items-center justify-between gap-3 rounded-xl border border-[#e4eaf1] px-4 py-3"
                      >
                        <p className="text-sm font-bold text-[#10233f]">{PROVIDER_LABEL[provider]}</p>
                        <p
                          className={`text-xs font-bold ${
                            connected ? 'text-[#0f6b5c]' : 'text-[#8b9ab0]'
                          }`}
                        >
                          {connected
                            ? provider === 'clio'
                              ? 'Connected'
                              : `${count} calendar${count === 1 ? '' : 's'} selected`
                            : 'Not connected'}
                        </p>
                      </li>
                    );
                  })}
                </ul>

                <p className="rounded-xl bg-[#eef4ff] px-4 py-3 text-sm text-[#2476bc]">
                  LegalSync covers 30 days back and 180 days ahead. You can change this from the
                  dashboard.
                </p>

                {startError && (
                  <p
                    role="alert"
                    className="rounded-xl border border-[#f5d5d5] bg-[#fdf2f2] px-4 py-3 text-sm text-[#a1322a]"
                  >
                    {startError}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => void startFirstSync()}
                  disabled={starting || status.clio !== 'connected'}
                  className={PRIMARY_BUTTON}
                >
                  {starting ? 'Starting your first sync…' : 'Start sync'}
                </button>

                {status.clio !== 'connected' && (
                  <p className="text-sm text-[#687992]">
                    Connect Clio before running your first sync.
                  </p>
                )}
              </div>
            )}
          </div>

          {step < STEPS.length && (
            <div className="mt-8 flex items-center justify-between gap-3 border-t border-[#e4eaf1] pt-6">
              {step > 1 ? (
                <button type="button" onClick={goBack} className={SECONDARY_BUTTON}>
                  Back
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => router.replace('/dashboard')}
                  className="text-sm font-semibold text-[#687992] hover:text-[#10233f]"
                >
                  Skip for now
                </button>
              )}

              <button
                type="button"
                onClick={() => void goNext()}
                disabled={savingCalendars}
                className={PRIMARY_BUTTON}
              >
                {savingCalendars ? 'Saving…' : 'Next'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingWizard />
    </Suspense>
  );
}