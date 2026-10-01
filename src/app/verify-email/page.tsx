'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/auth/client';

type Status = 'idle' | 'verifying' | 'success' | 'error';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'idle');
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'error'>('idle');
  const [resendMessage, setResendMessage] = useState('');

  // Verify once on mount. State updates happen in the promise callbacks rather
  // than synchronously in the effect body.
  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;

    apiFetch<{ message: string }>('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
      .then((data) => {
        if (!active) return;
        setStatus('success');
        setMessage(data.message || 'Your email has been verified.');
      })
      .catch((error: unknown) => {
        if (!active) return;
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Unable to verify this email.');
      });

    return () => {
      active = false;
    };
  }, [token]);

  const resend = async (event: React.FormEvent) => {
    event.preventDefault();
    setResendState('sending');
    setResendMessage('');
    try {
      const data = await apiFetch<{ message: string }>('/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: resendEmail }),
      });
      setResendState('idle');
      setResendMessage(data.message);
    } catch (error) {
      setResendState('error');
      setResendMessage(error instanceof Error ? error.message : 'Unable to send a new link.');
    }
  };

  return (
    <main className="auth-shell min-h-screen px-4 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-lg rounded-[28px] border border-white/80 bg-white/90 p-8 shadow-[0_20px_60px_rgba(16,35,63,0.12)] backdrop-blur sm:p-10">
        <p className="text-xl font-black tracking-[-0.05em] text-[#10233f]">
          Legal<span className="text-[#159b89]">Sync</span>
        </p>
{status === 'verifying' && (
          <div className="mt-8" aria-live="polite">
            <h1 className="text-2xl font-black tracking-[-0.04em] text-[#10233f]">
              Verifying your email
            </h1>
            <div
              className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-[#e7f2ff]"
              role="progressbar"
              aria-label="Verifying email"
            >
              <div className="h-full w-1/2 animate-pulse rounded-full bg-[#159b89]" />
            </div>
            <p className="mt-4 text-sm text-[#687992]">One moment while we confirm the link.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="mt-8" aria-live="polite">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#d8f5ef]">
              <svg className="h-6 w-6 text-[#159b89]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="mt-6 text-2xl font-black tracking-[-0.04em] text-[#10233f]">
              Email verified
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#687992]">{message}</p>
            <Link
              href="/dashboard"
              className="mt-8 flex w-full justify-center rounded-xl bg-[#10233f] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#1a385e] focus:outline-none focus:ring-4 focus:ring-[#b7c8dc]"
            >
              Go to dashboard
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="mt-8" aria-live="polite">
            <h1 className="text-2xl font-black tracking-[-0.04em] text-[#10233f]">
              We could not verify that link
            </h1>
            <p className="mt-3 rounded-xl border border-[#f5d5d5] bg-[#fdf2f2] px-4 py-3 text-sm text-[#a1322a]">
              {message}
            </p>
          </div>
        )}

        {status !== 'success' && (
          <form onSubmit={resend} className="mt-8 space-y-4 border-t border-[#e4eaf1] pt-6">
            <label htmlFor="resend-email" className="block text-sm font-semibold text-[#10233f]">
              Send a new verification link
            </label>
            <input
              id="resend-email"
              name="resend-email"
              type="email"
              required
              value={resendEmail}
              onChange={(event) => setResendEmail(event.target.value)}
              placeholder="you@firm.com"
              className="auth-input block w-full rounded-xl border border-[#d8e1ec] bg-[#f8fafc] px-4 py-3 text-sm text-[#10233f] placeholder-[#8b9ab0] outline-none transition focus:border-[#159b89] focus:bg-white focus:ring-4 focus:ring-[#d8f5ef]"
            />
            <button
              type="submit"
              disabled={resendState === 'sending'}
              className="w-full rounded-xl border border-[#d8e1ec] px-4 py-3 text-sm font-bold text-[#10233f] transition hover:bg-[#f4f8ff] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resendState === 'sending' ? 'Sending...' : 'Resend verification email'}
            </button>
            {resendMessage && (
              <p className="text-sm text-[#687992]" role="status">
                {resendMessage}
              </p>
            )}
          </form>
        )}

        <p className="mt-8 text-center text-sm text-[#687992]">
          <Link href="/login" className="font-bold text-[#159b89] hover:text-[#10233f]">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}