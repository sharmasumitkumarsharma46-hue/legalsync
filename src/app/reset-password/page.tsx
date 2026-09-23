'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to reset password');
      }

      setMessage(data.message || 'Password updated successfully.');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell min-h-screen px-4 py-6 sm:px-8 lg:px-12">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="auth-panel relative hidden min-h-[640px] overflow-hidden rounded-[28px] bg-[#10233f] p-8 text-white shadow-[0_24px_70px_rgba(16,35,63,0.22)] lg:flex lg:flex-col lg:justify-between lg:p-12">
          <div className="auth-panel__glow" />
          <div className="relative z-10">
            <p className="text-2xl font-black tracking-[-0.05em]">Legal<span className="text-[#56d8c0]">Sync</span></p>
            <p className="mt-20 max-w-md text-5xl font-black leading-[0.98] tracking-[-0.06em]">Set a new password and continue.</p>
            <p className="mt-6 max-w-sm text-base leading-7 text-[#b7c8dc]">Choose a strong password and get back to managing every case without delay.</p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_20px_60px_rgba(16,35,63,0.12)] backdrop-blur sm:p-10">
          <div className="mb-8 text-center lg:text-left">
            <p className="mb-4 text-xl font-black tracking-[-0.05em] text-[#10233f] lg:hidden">Legal<span className="text-[#159b89]">Sync</span></p>
            <h2 className="text-3xl font-black tracking-[-0.04em] text-[#10233f]">Reset password</h2>
            <p className="mt-2 text-sm text-[#687992]">Create a new secure password below.</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {message}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="password" className="sr-only">New password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="auth-input block w-full rounded-xl border border-[#d8e1ec] bg-[#f8fafc] px-4 py-3 text-sm text-[#10233f] placeholder-[#8b9ab0] outline-none transition focus:border-[#159b89] focus:bg-white focus:ring-4 focus:ring-[#d8f5ef]"
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="sr-only">Confirm password</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  className="auth-input block w-full rounded-xl border border-[#d8e1ec] bg-[#f8fafc] px-4 py-3 text-sm text-[#10233f] placeholder-[#8b9ab0] outline-none transition focus:border-[#159b89] focus:bg-white focus:ring-4 focus:ring-[#d8f5ef]"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !token}
              className="auth-submit group relative flex w-full justify-center rounded-xl border border-transparent bg-[#10233f] px-4 py-3 text-sm font-bold text-white shadow-[0_12px_22px_rgba(16,35,63,0.2)] transition hover:-translate-y-0.5 hover:bg-[#1a385e] focus:outline-none focus:ring-4 focus:ring-[#b7c8dc] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Updating...' : !token ? 'Missing reset token' : 'Update password'}
            </button>

            <div className="text-center text-sm">
              <Link href="/login" className="font-medium text-[#159b89] hover:text-[#10233f]">
                Back to sign in
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-[#10233f]">Loading reset form...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
