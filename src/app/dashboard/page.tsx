'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch, fetchCurrentUser, signOut, type CurrentUser } from '@/lib/auth/client';
import { hasFeatureAccess, PLAN_DEFINITIONS, type PlanKey } from '@/lib/billing/plans';

type Provider = 'clio' | 'google' | 'outlook';
type Direction = 'all' | 'clio_to_google' | 'clio_to_outlook' | 'google_to_clio' | 'outlook_to_clio';

interface HistoryRow {
  id: string;
  syncType: string;
  eventsSynced: number;
  status: string;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

interface ConflictRow {
  id: string;
  eventId: string | null;
  eventTitle: string | null;
  conflictType: string;
  resolution: string | null;
  createdAt: string;
  clioVersion: { title?: string; start?: string } | null;
  calendarVersion: { title?: string; start?: string } | null;
}

interface InvoiceRow {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

interface SubscriptionRow {
  plan: string;
  status: string;
  paymentMethod: string | null;
  currentPeriodEnd: string | null;
  trialEndDate: string | null;
  daysRemaining: number;
  isExpired: boolean;
  cancelAtPeriodEnd: boolean;
  cryptoChargeCode: string | null;
}

interface PlanAccess {
  plan: string;
  status: string;
  maxUsers: number;
  features: string[];
}

interface ProviderCalendar {
  id: string;
  name: string;
  isPrimary: boolean;
  selected: boolean;
}

interface Settings {
  syncFrequency: number;
  conflictResolutionRule: string;
  emailNotifications: boolean;
  syncFailureNotifications: boolean;
  conflictNotifications: boolean;
  dailySummary: boolean;
}

const SYNC_DIRECTIONS: Array<{ value: Direction; label: string }> = [
  { value: 'all', label: 'Clio to all calendars' },
  { value: 'clio_to_google', label: 'Clio to Google Calendar' },
  { value: 'clio_to_outlook', label: 'Clio to Outlook' },
  { value: 'google_to_clio', label: 'Google Calendar to Clio' },
  { value: 'outlook_to_clio', label: 'Outlook to Clio' },
];

const SYNC_LABELS: Record<string, string> = {
  clio_to_google: 'Clio to Google',
  clio_to_outlook: 'Clio to Outlook',
  google_to_clio: 'Google to Clio',
  outlook_to_clio: 'Outlook to Clio',
};

const PROVIDER_META: Record<Provider, { label: string; hint: string; initials: string }> = {
  clio: { label: 'Clio', hint: 'Source of matter deadlines and calendar entries', initials: 'C' },
  google: { label: 'Google Calendar', hint: 'Sync destination for your Clio entries', initials: 'G' },
  outlook: { label: 'Outlook', hint: 'Sync destination for Microsoft 365 accounts', initials: 'O' },
};

const NAV_ITEMS = [
  { href: '#overview', label: 'Overview' },
  { href: '#integrations', label: 'Integrations' },
  { href: '#calendars', label: 'Calendars' },
  { href: '#sync-history', label: 'Sync history' },
  { href: '#conflicts', label: 'Conflicts' },
  { href: '#billing', label: 'Billing' },
  { href: '#settings', label: 'Settings' },
];

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return new Date(iso).toLocaleDateString();
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return 'not scheduled';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const CARD = 'rounded-2xl border border-[#e4eaf1] bg-white p-6';
const LABEL = 'text-xs font-bold uppercase tracking-[0.18em] text-[#8b9ab0]';
const VALUE = 'mt-3 text-xl font-black text-[#10233f]';
const PRIMARY_BUTTON =
  'inline-flex items-center justify-center rounded-xl bg-[#10233f] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#1a385e] focus:outline-none focus:ring-4 focus:ring-[#b7c8dc] disabled:cursor-not-allowed disabled:opacity-50';
const SECONDARY_BUTTON =
  'inline-flex items-center justify-center rounded-xl border border-[#d8e1ec] bg-white px-4 py-3 text-sm font-bold text-[#10233f] transition hover:bg-[#f4f8ff] focus:outline-none focus:ring-4 focus:ring-[#d8f5ef] disabled:cursor-not-allowed disabled:opacity-50';
function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [booting, setBooting] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [planAccess, setPlanAccess] = useState<PlanAccess | null>(null);
  const [byProvider, setByProvider] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [conflicts, setConflicts] = useState<ConflictRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  const [calendars, setCalendars] = useState<Record<string, ProviderCalendar[]>>({});
  const [selection, setSelection] = useState<Record<string, string[]>>({});
  const [calendarsLoading, setCalendarsLoading] = useState<Record<string, boolean>>({});
  const [calendarsError, setCalendarsError] = useState<Record<string, string>>({});
  const [savingCalendars, setSavingCalendars] = useState(false);

  const [direction, setDirection] = useState<Direction>('all');
  const [syncing, setSyncing] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<Provider | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgrading, setUpgrading] = useState<'stripe' | 'crypto' | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const notify = useCallback((tone: 'success' | 'error', message: string) => {
    setToast({ tone, message });
    window.setTimeout(() => setToast(null), 6000);
  }, []);

  const loadCalendars = useCallback(async (provider: 'google' | 'outlook') => {
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
    } catch (error) {
      setCalendarsError((prev) => ({
        ...prev,
        [provider]: error instanceof Error ? error.message : 'Unable to load calendars.',
      }));
    } finally {
      setCalendarsLoading((prev) => ({ ...prev, [provider]: false }));
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [integrationData, historyData, conflictData, invoiceData, settingsData, trialData] =
        await Promise.all([
          apiFetch<{ byProvider: Record<string, string> }>('/api/integrations/status'),
          apiFetch<{ history: HistoryRow[] }>('/api/sync/history?limit=20'),
          apiFetch<{ conflicts: ConflictRow[] }>('/api/sync/conflicts'),
          apiFetch<{ invoices: InvoiceRow[] }>('/api/billing/invoices'),
          apiFetch<{ settings: Settings }>('/api/settings'),
          apiFetch<{ subscription: SubscriptionRow | null }>('/api/billing/trial/status'),
        ]);

      setByProvider(integrationData.byProvider || {});
      setHistory(historyData.history || []);
      setConflicts(conflictData.conflicts || []);
      setInvoices(invoiceData.invoices || []);
      setSettings(settingsData.settings);
      setSubscription(trialData.subscription);
      setLoadError('');

      try {
        setPlanAccess(await apiFetch<PlanAccess>('/api/billing/plan-access'));
      } catch {
        // Plan access is supplementary context; never block the page on it.
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load your workspace.');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const currentUser = await fetchCurrentUser();
        if (cancelled) return;

        if (!currentUser) {
          router.replace('/login');
          return;
        }

        setUser(currentUser);
        await refresh();
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Unable to load your account.');
        }
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, refresh]);

  const connectedDestinations = useMemo(
    () => (['google', 'outlook'] as const).filter((p) => byProvider[p] === 'connected'),
    [byProvider]
  );

  useEffect(() => {
    connectedDestinations.forEach((provider) => {
      void loadCalendars(provider);
    });
  }, [connectedDestinations, loadCalendars]);

  // Someone who clicked "Buy" on the pricing page arrives with intent=buy, so
  // open the checkout dialog straight away instead of waiting for a click.
  const buyIntent = searchParams.get('intent') === 'buy';

  useEffect(() => {
    if (buyIntent) {
      setShowUpgrade(true);
    }
  }, [buyIntent]);

  const connectProvider = async (provider: Provider) => {
    setConnecting(provider);
    try {
      const data = await apiFetch<{ authUrl: string }>(`/api/integrations/${provider}/connect`, {
        method: 'POST',
      });
      window.location.assign(data.authUrl);
    } catch (error) {
      notify('error', error instanceof Error ? error.message : 'Could not start the connection.');
      setConnecting(null);
    }
  };

  const disconnectProvider = async (provider: Provider) => {
    try {
      await apiFetch(`/api/integrations/${provider}/disconnect`, { method: 'POST' });
      notify('success', `${PROVIDER_META[provider].label} disconnected.`);
      await refresh();
    } catch (error) {
      notify('error', error instanceof Error ? error.message : 'Could not disconnect.');
    }
  };

  const runSync = async () => {
    setSyncing(true);
    try {
      const data = await apiFetch<{
        success: boolean;
        result: { eventsSynced: number; eventsCreated: number; eventsUpdated: number; errors: string[] } | null;
      }>('/api/sync/run', {
        method: 'POST',
        body: JSON.stringify({ direction }),
      });

      const result = data.result;
      const summary = result
        ? `Synced ${result.eventsSynced} events (${result.eventsCreated} new, ${result.eventsUpdated} updated).`
        : 'Sync finished.';

      if (result && result.errors.length > 0) {
        notify('error', `${summary} ${result.errors[0]}`);
      } else {
        notify('success', summary);
      }

      await refresh();
    } catch (error) {
      notify('error', error instanceof Error ? error.message : 'Sync failed.');
    } finally {
      setSyncing(false);
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

  const saveCalendars = async (provider: 'google' | 'outlook') => {
    setSavingCalendars(true);
    try {
      await apiFetch(`/api/integrations/${provider}/calendars`, {
        method: 'POST',
        body: JSON.stringify({
          calendars: (calendars[provider] ?? [])
            .filter((calendar) => (selection[provider] ?? []).includes(calendar.id))
            .map((calendar) => ({ id: calendar.id, name: calendar.name })),
        }),
      });
      notify('success', `${PROVIDER_META[provider].label} calendars updated.`);
      await loadCalendars(provider);
    } catch (error) {
      notify('error', error instanceof Error ? error.message : 'Could not save calendars.');
    } finally {
      setSavingCalendars(false);
    }
  };

  const resolveConflict = async (conflictId: string, resolution: string) => {
    setResolving(conflictId);
    try {
      await apiFetch('/api/sync/conflicts', {
        method: 'POST',
        body: JSON.stringify({ conflictId, resolution }),
      });
      notify('success', 'Conflict resolved.');
      await refresh();
    } catch (error) {
      notify('error', error instanceof Error ? error.message : 'Could not resolve the conflict.');
    } finally {
      setResolving(null);
    }
  };

  const startCheckout = async (paymentMethod: 'stripe' | 'crypto', plan?: PlanKey) => {
    const targetPlan = plan ?? ((subscription?.plan ?? 'solo') as PlanKey);
    setUpgrading(paymentMethod);

    try {
      const data = await apiFetch<{
        checkoutUrl?: string;
        hostedUrl?: string;
        chargeCode?: string;
      }>('/api/billing/subscribe', {
        method: 'POST',
        body: JSON.stringify({ plan: targetPlan, paymentMethod }),
      });

      if (paymentMethod === 'crypto' && data.hostedUrl) {
        window.location.assign(data.hostedUrl);
        return;
      }

      if (data.checkoutUrl) {
        window.location.assign(data.checkoutUrl);
        return;
      }

      setShowUpgrade(false);
      notify('success', 'Checkout started.');
    } catch (error) {
      notify('error', error instanceof Error ? error.message : 'Could not start checkout.');
    } finally {
      setUpgrading(null);
    }
  };

  const cancelSubscription = async () => {
    setCancelling(true);
    try {
      await apiFetch('/api/billing/cancel', { method: 'POST' });
      notify('success', 'Cancellation scheduled for the end of the billing period.');
      await refresh();
    } catch (error) {
      notify('error', error instanceof Error ? error.message : 'Could not cancel.');
    } finally {
      setCancelling(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    try {
      await apiFetch('/api/settings', { method: 'PUT', body: JSON.stringify(settings) });
      notify('success', 'Settings saved.');
    } catch (error) {
      notify('error', error instanceof Error ? error.message : 'Could not save settings.');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
    router.refresh();
  };

  const lastSyncAt = history[0]?.completedAt ?? history[0]?.startedAt ?? null;
  const totalSynced = history.reduce((sum, row) => sum + (row.eventsSynced || 0), 0);
  const currentPlan = (planAccess?.plan ?? subscription?.plan ?? 'solo') as PlanKey;
  const lastRunFailed = history[0]?.status === 'error';
if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb]">
        <div
          className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#159b89]"
          role="status"
          aria-label="Loading dashboard"
        />
      </div>
    );
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-6 py-6">
        <Link href="/" className="text-xl font-black tracking-[-0.05em] text-[#10233f]">
          Legal<span className="text-[#159b89]">Sync</span>
        </Link>
      </div>

      <nav aria-label="Dashboard sections" className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            onClick={() => setMobileNavOpen(false)}
            className="block rounded-xl px-4 py-2.5 text-sm font-semibold text-[#4b5b73] transition hover:bg-[#eef4ff] hover:text-[#10233f]"
          >
            {item.label}
          </a>
        ))}
        <a
          href="/help-centre"
          className="block rounded-xl px-4 py-2.5 text-sm font-semibold text-[#4b5b73] transition hover:bg-[#eef4ff] hover:text-[#10233f]"
        >
          Help centre
        </a>
      </nav>

      <div className="border-t border-[#e4eaf1] px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#10233f] text-sm font-bold text-white">
            {(user?.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[#10233f]">{user?.name || 'Account'}</p>
            <p className="truncate text-xs text-[#8b9ab0]">{user?.firmName || user?.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-4 text-sm font-semibold text-[#159b89] transition hover:text-[#10233f]"
        >
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#e4eaf1] bg-white px-4 py-3 lg:hidden">
        <Link href="/" className="text-lg font-black tracking-[-0.05em] text-[#10233f]">
          Legal<span className="text-[#159b89]">Sync</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileNavOpen((open) => !open)}
          aria-expanded={mobileNavOpen}
          aria-controls="mobile-nav"
          className="rounded-lg border border-[#d8e1ec] px-3 py-2 text-sm font-bold text-[#10233f]"
        >
          {mobileNavOpen ? 'Close' : 'Menu'}
        </button>
      </header>

      {mobileNavOpen && (
        <div id="mobile-nav" className="border-b border-[#e4eaf1] bg-white px-3 py-4 lg:hidden">
          {sidebar}
        </div>
      )}

      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-[#e4eaf1] bg-white lg:block">
        {sidebar}
      </aside>

      <main className="lg:ml-64">
        <div className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          {toast && (
            <div
              role="status"
              className={`rounded-xl border px-4 py-3 text-sm ${
                toast.tone === 'success'
                  ? 'border-[#bfe9e0] bg-[#eafaf6] text-[#0f6b5c]'
                  : 'border-[#f5d5d5] bg-[#fdf2f2] text-[#a1322a]'
              }`}
            >
              {toast.message}
            </div>
          )}

          {user && !user.emailVerified && (
            <div className="rounded-xl border border-[#fde9c8] bg-[#fff8ec] px-4 py-3 text-sm text-[#8a5a10]">
              Your email address is not verified yet. Check your inbox or{' '}
              <Link href="/verify-email" className="font-bold underline">
                request a new link
              </Link>
              .
            </div>
          )}

          {loadError && (
            <div className="rounded-xl border border-[#f5d5d5] bg-[#fdf2f2] px-4 py-3 text-sm text-[#a1322a]">
              {loadError}
              <button
                type="button"
                onClick={() => void refresh()}
                className="ml-3 font-bold underline"
              >
                Retry
              </button>
            </div>
          )}
<section id="overview" className="scroll-mt-20 space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8b9ab0]">
                  Overview
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#10233f]">
                  Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
                </h1>
                <p className="mt-2 text-sm text-[#687992]">
                  {user?.firmName ? `${user.firmName} · ` : ''}Keep every deadline in view.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label htmlFor="sync-direction" className="sr-only">
                  Sync direction
                </label>
                <select
                  id="sync-direction"
                  value={direction}
                  onChange={(event) => setDirection(event.target.value as Direction)}
                  className="rounded-xl border border-[#d8e1ec] bg-white px-3 py-3 text-sm font-semibold text-[#10233f] outline-none focus:border-[#159b89] focus:ring-4 focus:ring-[#d8f5ef]"
                >
                  {SYNC_DIRECTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={runSync} disabled={syncing} className={PRIMARY_BUTTON}>
                  {syncing ? 'Syncing…' : 'Sync now'}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#e4eaf1] bg-white px-5 py-4">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${
                  lastRunFailed
                    ? 'bg-[#fdf2f2] text-[#a1322a]'
                    : 'bg-[#eafaf6] text-[#0f6b5c]'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    lastRunFailed ? 'bg-[#d64545]' : 'bg-[#159b89]'
                  }`}
                />
                {lastRunFailed ? 'Last sync had issues' : 'Sync healthy'}
              </span>
              <span className="text-sm text-[#687992]">Last run {timeAgo(lastSyncAt)}</span>
              {conflicts.length > 0 && (
                <span className="text-sm font-semibold text-[#a1322a]">
                  {conflicts.length} unresolved conflict{conflicts.length === 1 ? '' : 's'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <div className={CARD}>
                <p className={LABEL}>Plan</p>
                <p className={VALUE}>{PLAN_DEFINITIONS[currentPlan]?.name ?? currentPlan}</p>
                <p className="mt-2 text-sm text-[#687992]">
                  {planAccess?.maxUsers ?? 1} user seat limit
                </p>
              </div>
              <div className={CARD}>
                <p className={LABEL}>Events synced</p>
                <p className={VALUE}>{totalSynced}</p>
                <p className="mt-2 text-sm text-[#687992]">Across {history.length} recent runs</p>
              </div>
              <div className={CARD}>
                <p className={LABEL}>Subscription</p>
                <p className={VALUE}>{subscription?.status ?? 'unknown'}</p>
                <p className="mt-2 text-sm text-[#687992]">
                  {subscription?.cancelAtPeriodEnd
                    ? 'Cancels at period end'
                    : `Renews ${formatDate(subscription?.currentPeriodEnd)}`}
                </p>
              </div>
              <div className={CARD}>
                <p className={LABEL}>Team features</p>
                <p className={VALUE}>
                  {hasFeatureAccess(currentPlan, 'teamDashboard') ? 'Enabled' : 'Disabled'}
                </p>
                <p className="mt-2 text-sm text-[#687992]">
                  {hasFeatureAccess(currentPlan, 'roleBasedAccess')
                    ? 'Role-based access active'
                    : 'Role-based access inactive'}
                </p>
              </div>
            </div>
          </section>
<section id="integrations" className="scroll-mt-20 space-y-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8b9ab0]">
                Integrations
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#10233f]">
                Connected accounts
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              {(['clio', 'google', 'outlook'] as Provider[]).map((provider) => {
                const meta = PROVIDER_META[provider];
                const isConnected = byProvider[provider] === 'connected';

                return (
                  <div key={provider} className={CARD}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef4ff] text-sm font-black text-[#10233f]">
                        {meta.initials}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#10233f]">{meta.label}</p>
                        <p
                          className={`text-xs font-bold ${
                            isConnected ? 'text-[#0f6b5c]' : 'text-[#8b9ab0]'
                          }`}
                        >
                          {isConnected ? 'Connected' : 'Not connected'}
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-[#687992]">{meta.hint}</p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void connectProvider(provider)}
                        disabled={connecting === provider}
                        className={PRIMARY_BUTTON}
                      >
                        {connecting === provider
                          ? 'Redirecting…'
                          : isConnected
                            ? 'Reconnect'
                            : 'Connect'}
                      </button>
                      {isConnected && (
                        <button
                          type="button"
                          onClick={() => void disconnectProvider(provider)}
                          className={SECONDARY_BUTTON}
                        >
                          Disconnect
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
<section id="calendars" className="scroll-mt-20 space-y-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8b9ab0]">
                Calendars
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#10233f]">
                Sync destinations
              </h2>
              <p className="mt-2 text-sm text-[#687992]">
                Choose which calendars receive your Clio entries. At least one is required before a
                sync can run.
              </p>
            </div>

            {connectedDestinations.length === 0 ? (
              <div className={`${CARD} text-sm text-[#687992]`}>
                Connect Google Calendar or Outlook above to select the calendars that should receive
                your Clio entries.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {connectedDestinations.map((provider) => (
                  <div key={provider} className={CARD}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-[#10233f]">
                        {PROVIDER_META[provider].label}
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
                      <p className="mt-4 text-sm text-[#687992]">Loading calendars…</p>
                    )}

                    {calendarsError[provider] && (
                      <p className="mt-4 rounded-xl border border-[#f5d5d5] bg-[#fdf2f2] px-4 py-3 text-sm text-[#a1322a]">
                        {calendarsError[provider]}
                      </p>
                    )}

                    {!calendarsLoading[provider] && !calendarsError[provider] && (
                      <>
                        {(calendars[provider] ?? []).length === 0 ? (
                          <p className="mt-4 text-sm text-[#687992]">
                            No calendars were returned by this provider.
                          </p>
                        ) : (
                          <ul className="mt-4 space-y-2">
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

                        <button
                          type="button"
                          onClick={() => void saveCalendars(provider)}
                          disabled={savingCalendars}
                          className={`${PRIMARY_BUTTON} mt-5`}
                        >
                          {savingCalendars ? 'Saving…' : 'Save calendar selection'}
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
<section id="sync-history" className="scroll-mt-20 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8b9ab0]">
                  Sync history
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#10233f]">
                  Recent runs
                </h2>
              </div>
              <button
                type="button"
                onClick={() => void refresh()}
                className="text-sm font-bold text-[#159b89] hover:text-[#10233f]"
              >
                Refresh
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#e4eaf1] bg-white">
              {history.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-[#687992]">
                  No syncs yet. Connect Clio and a calendar, then run your first sync.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px]">
                    <thead className="bg-[#f8fafc]">
                      <tr>
                        {['When', 'Direction', 'Events', 'Status'].map((heading) => (
                          <th
                            key={heading}
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-[#8b9ab0]"
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eef2f7]">
                      {history.map((row) => (
                        <tr key={row.id}>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-[#10233f]">
                            {timeAgo(row.startedAt)}
                            {row.errorMessage && (
                              <p className="mt-1 max-w-xs text-xs text-[#a1322a]">
                                {row.errorMessage}
                              </p>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-[#10233f]">
                            {SYNC_LABELS[row.syncType] ?? row.syncType}
                          </td>
                          <td className="px-6 py-4 text-sm text-[#10233f]">{row.eventsSynced}</td>
                          <td className="px-6 py-4">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                row.status === 'success'
                                  ? 'bg-[#eafaf6] text-[#0f6b5c]'
                                  : row.status === 'warning'
                                    ? 'bg-[#fff6e6] text-[#8a5a10]'
                                    : 'bg-[#fdf2f2] text-[#a1322a]'
                              }`}
                            >
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
<section id="conflicts" className="scroll-mt-20 space-y-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8b9ab0]">
                Conflicts
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#10233f]">
                Needs your decision
              </h2>
              <p className="mt-2 text-sm text-[#687992]">
                An event is flagged only when it changed in Clio and in your calendar since the last
                successful sync.
              </p>
            </div>

            {conflicts.length === 0 ? (
              <div className={`${CARD} text-sm text-[#687992]`}>
                No unresolved conflicts. Everything is aligned.
              </div>
            ) : (
              <ul className="space-y-4">
                {conflicts.map((conflict) => (
                  <li key={conflict.id} className={CARD}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-[#10233f]">
                          {conflict.eventTitle ?? 'Calendar event'}
                        </p>
                        <p className="mt-1 text-xs text-[#8b9ab0]">
                          Detected {timeAgo(conflict.createdAt)}
                        </p>
                      </div>
                      <span className="rounded-full bg-[#fff6e6] px-3 py-1 text-xs font-bold text-[#8a5a10]">
                        {conflict.conflictType.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-[#e4eaf1] bg-[#f8fafc] p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8b9ab0]">
                          In Clio
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[#10233f]">
                          {conflict.clioVersion?.title ?? 'Unknown title'}
                        </p>
                      </div>
                      <div className="rounded-xl border border-[#e4eaf1] bg-[#f8fafc] p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8b9ab0]">
                          In calendar
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[#10233f]">
                          {conflict.calendarVersion?.title ?? 'Unknown title'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {[
                        { value: 'last_write_wins', label: 'Keep newest' },
                        { value: 'clio', label: 'Keep Clio version' },
                        { value: 'calendar', label: 'Keep calendar version' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          disabled={resolving === conflict.id}
                          onClick={() => void resolveConflict(conflict.id, option.value)}
                          className={SECONDARY_BUTTON}
                        >
                          {resolving === conflict.id ? 'Resolving…' : option.label}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
<section id="billing" className="scroll-mt-20 space-y-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8b9ab0]">
                Billing
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#10233f]">
                Plan and payments
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className={CARD}>
                <p className={LABEL}>Current plan</p>
                <p className={VALUE}>{PLAN_DEFINITIONS[currentPlan]?.name ?? currentPlan}</p>
                <p className="mt-2 text-sm text-[#687992]">
                  {PLAN_DEFINITIONS[currentPlan]?.price
                    ? `$${PLAN_DEFINITIONS[currentPlan]?.price} per month`
                    : 'Contact us for pricing'}
                </p>

                <div className="mt-4 space-y-1 text-sm text-[#687992]">
                  <p>
                    Status:{' '}
                    <span className="font-bold text-[#10233f]">
                      {subscription?.status ?? 'unknown'}
                    </span>
                  </p>
                  {subscription?.status === 'trial' && (
                    <p>
                      Trial ends {formatDate(subscription?.trialEndDate)} (
                      {subscription?.daysRemaining} day
                      {subscription?.daysRemaining === 1 ? '' : 's'} left)
                    </p>
                  )}
                  {subscription?.cryptoChargeCode && subscription?.status === 'pending_payment' && (
                    <p className="text-[#8a5a10]">
                      Awaiting crypto confirmation for charge{' '}
                      {subscription.cryptoChargeCode.slice(0, 8)}…
                    </p>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setShowUpgrade(true)} className={PRIMARY_BUTTON}>
                    Change plan
                  </button>
                  {!subscription?.cancelAtPeriodEnd && subscription?.status === 'active' && (
                    <button
                      type="button"
                      onClick={cancelSubscription}
                      disabled={cancelling}
                      className={SECONDARY_BUTTON}
                    >
                      {cancelling ? 'Cancelling…' : 'Cancel subscription'}
                    </button>
                  )}
                </div>
              </div>

              <div className={CARD}>
                <p className={LABEL}>Invoices</p>
                {invoices.length === 0 ? (
                  <p className="mt-4 text-sm text-[#687992]">
                    No invoices yet. They appear here after your first payment.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-2">
                    {invoices.map((invoice) => (
                      <li
                        key={invoice.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-[#e4eaf1] px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-bold text-[#10233f]">
                            {invoice.currency} {invoice.amount.toFixed(2)}
                          </p>
                          <p className="text-xs text-[#8b9ab0]">{formatDate(invoice.createdAt)}</p>
                        </div>
                        <span className="rounded-full bg-[#eafaf6] px-2.5 py-1 text-xs font-bold text-[#0f6b5c]">
                          {invoice.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
<section id="settings" className="scroll-mt-20 space-y-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8b9ab0]">
                Settings
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#10233f]">
                Sync preferences
              </h2>
            </div>

            {settings ? (
              <div className={`${CARD} space-y-5`}>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="sync-frequency" className="block text-sm font-bold text-[#10233f]">
                      Sync frequency
                    </label>
                    <select
                      id="sync-frequency"
                      value={settings.syncFrequency}
                      onChange={(event) =>
                        setSettings({ ...settings, syncFrequency: Number(event.target.value) })
                      }
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
                    <label htmlFor="conflict-rule" className="block text-sm font-bold text-[#10233f]">
                      Default conflict resolution
                    </label>
                    <select
                      id="conflict-rule"
                      value={settings.conflictResolutionRule}
                      onChange={(event) =>
                        setSettings({ ...settings, conflictResolutionRule: event.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-[#d8e1ec] bg-white px-3 py-3 text-sm text-[#10233f] outline-none focus:border-[#159b89] focus:ring-4 focus:ring-[#d8f5ef]"
                    >
                      <option value="last_write_wins">Last write wins</option>
                      <option value="clio">Always keep Clio</option>
                      <option value="calendar">Always keep calendar</option>
                      <option value="manual">Ask me every time</option>
                    </select>
                  </div>
                </div>

                <fieldset className="space-y-2">
                  <legend className="text-sm font-bold text-[#10233f]">Notifications</legend>
                  {(
                    [
                      ['emailNotifications', 'Email notifications'],
                      ['syncFailureNotifications', 'Failed sync alerts'],
                      ['conflictNotifications', 'Conflict alerts'],
                      ['dailySummary', 'Daily summary email'],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-3 text-sm text-[#10233f]">
                      <input
                        type="checkbox"
                        checked={settings[key]}
                        onChange={(event) =>
                          setSettings({ ...settings, [key]: event.target.checked })
                        }
                        className="h-4 w-4 rounded border-[#c9d6e4] text-[#159b89] focus:ring-[#d8f5ef]"
                      />
                      {label}
                    </label>
                  ))}
                </fieldset>

                <button type="button" onClick={saveSettings} className={PRIMARY_BUTTON}>
                  Save settings
                </button>
              </div>
            ) : (
              <div className={`${CARD} text-sm text-[#687992]`}>Loading settings…</div>
            )}
          </section>
        </div>
      </main>
{showUpgrade && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#10233f]/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upgrade-heading"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] bg-white p-8">
            <h2
              id="upgrade-heading"
              className="text-2xl font-black tracking-[-0.03em] text-[#10233f]"
            >
              Change plan
            </h2>
            <p className="mt-2 text-sm text-[#687992]">
              Pick a plan, then choose how you want to pay.
            </p>

            <div className="mt-6 space-y-3">
              {(Object.keys(PLAN_DEFINITIONS) as PlanKey[]).map((planKey) => {
                const plan = PLAN_DEFINITIONS[planKey];
                const busy = upgrading !== null && planKey === currentPlan;

                return (
                  <div
                    key={planKey}
                    className={`rounded-2xl border p-4 ${
                      planKey === currentPlan ? 'border-[#159b89] bg-[#eafaf6]' : 'border-[#e4eaf1]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-[#10233f]">{plan.name}</p>
                        <p className="text-xs text-[#687992]">
                          Up to {plan.maxUsers} {plan.maxUsers === 1 ? 'user' : 'users'}
                        </p>
                      </div>
                      <p className="text-sm font-black text-[#10233f]">${plan.price}/mo</p>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={upgrading !== null}
                        onClick={() => void startCheckout('stripe', planKey)}
                        className={PRIMARY_BUTTON}
                      >
                        {busy && upgrading === 'stripe' ? 'Opening…' : 'Pay by card'}
                      </button>
                      <button
                        type="button"
                        disabled={upgrading !== null}
                        onClick={() => void startCheckout('crypto', planKey)}
                        className={SECONDARY_BUTTON}
                      >
                        {busy && upgrading === 'crypto' ? 'Opening…' : 'Pay with crypto'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowUpgrade(false)}
              className="mt-6 w-full text-sm font-semibold text-[#687992] hover:text-[#10233f]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
export default function Dashboard() {
  return (
    <Suspense fallback={<DashboardShell />}>
      <DashboardContent />
    </Suspense>
  );
}

/** Matching loading state so the Suspense boundary does not flash a blank page. */
function DashboardShell() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb]">
      <div
        className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#159b89]"
        role="status"
        aria-label="Loading dashboard"
      />
    </div>
  );
}