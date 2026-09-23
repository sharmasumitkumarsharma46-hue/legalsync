'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to send reset link');
      }

      setMessage(data.message || 'If an account exists for that email, a reset link has been sent.');
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send reset link');
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
            <p className="mt-20 max-w-md text-5xl font-black leading-[0.98] tracking-[-0.06em]">Reset access without losing momentum.</p>
            <p className="mt-6 max-w-sm text-base leading-7 text-[#b7c8dc]">We’ll get you back into the workflow fast and keep your deadlines on track.</p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_20px_60px_rgba(16,35,63,0.12)] backdrop-blur sm:p-10">
          <div className="mb-8 text-center lg:text-left">
            <p className="mb-4 text-xl font-black tracking-[-0.05em] text-[#10233f] lg:hidden">Legal<span className="text-[#159b89]">Sync</span></p>
            <h2 className="text-3xl font-black tracking-[-0.04em] text-[#10233f]">Forgot password</h2>
            <p className="mt-2 text-sm text-[#687992]">Enter your email and we’ll send a reset link.</p>
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

            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="auth-input block w-full rounded-xl border border-[#d8e1ec] bg-[#f8fafc] px-4 py-3 text-sm text-[#10233f] placeholder-[#8b9ab0] outline-none transition focus:border-[#159b89] focus:bg-white focus:ring-4 focus:ring-[#d8f5ef]"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="auth-submit group relative flex w-full justify-center rounded-xl border border-transparent bg-[#10233f] px-4 py-3 text-sm font-bold text-white shadow-[0_12px_22px_rgba(16,35,63,0.2)] transition hover:-translate-y-0.5 hover:bg-[#1a385e] focus:outline-none focus:ring-4 focus:ring-[#b7c8dc] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send reset link'}
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
