'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch, type CurrentUser } from '@/lib/auth/client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/dashboard';

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await apiFetch<{ user: CurrentUser }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      // The session lives in an httpOnly cookie, so nothing is stored in
      // localStorage. Only the display name is cached for instant paint.
      localStorage.setItem('user', JSON.stringify(data.user));
      router.replace(nextPath.startsWith('/') ? nextPath : '/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
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
            <p className="mt-20 max-w-md text-5xl font-black leading-[0.98] tracking-[-0.06em]">Every deadline, right where it belongs.</p>
            <p className="mt-6 max-w-sm text-base leading-7 text-[#b7c8dc]">One calm view for Clio, Google Calendar, and Outlook.</p>
          </div>
          <div className="auth-calendar relative z-10 rounded-2xl bg-[#f9fbfd] p-5 text-[#10233f] shadow-[0_20px_45px_rgba(0,0,0,0.2)]">
            <div className="flex items-center justify-between border-b border-[#e4eaf1] pb-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8b9ab0]">Firm command center</p><p className="mt-1 text-lg font-bold">October 2026</p></div><span className="rounded-full bg-[#d8f5ef] px-3 py-1 text-xs font-bold text-[#159b89]">All synced</span></div>
            <div className="mt-4 grid grid-cols-7 gap-2 text-center text-[10px] font-bold text-[#8b9ab0]">{['M','T','W','T','F','S','S'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
            <div className="mt-3 grid grid-cols-7 gap-2 text-center text-xs text-[#687992]">{Array.from({ length: 21 }, (_, index) => <span key={index} className={`auth-calendar__day flex aspect-square items-center justify-center rounded-lg ${index === 13 ? 'bg-[#159b89] font-bold text-white shadow-[0_5px_12px_rgba(21,155,137,0.35)]' : index === 16 ? 'bg-[#e7f2ff] font-bold text-[#2476bc]' : ''}`}>{index + 1}</span>)}</div>
            <div className="auth-event auth-event--one"><span className="h-2 w-2 rounded-full bg-[#4285f4]" /> Hearing · 9:30 AM</div>
            <div className="auth-event auth-event--two"><span className="h-2 w-2 rounded-full bg-[#d47a42]" /> Filing deadline</div>
          </div>
        </section>
        <section className="mx-auto w-full max-w-md rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_20px_60px_rgba(16,35,63,0.12)] backdrop-blur sm:p-10">
          <div className="mb-8 text-center lg:text-left">
            <p className="mb-4 text-xl font-black tracking-[-0.05em] text-[#10233f] lg:hidden">Legal<span className="text-[#159b89]">Sync</span></p>
            <h2 className="text-3xl font-black tracking-[-0.04em] text-[#10233f]">Welcome back</h2>
            <p className="mt-2 text-sm text-[#687992]">
            Or{' '}
            <Link href="/signup" className="font-bold text-[#159b89] hover:text-[#10233f]">
              create a new account
            </Link>
          </p>
          </div>
          <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="auth-input block w-full rounded-xl border border-[#d8e1ec] bg-[#f8fafc] px-4 py-3 text-sm text-[#10233f] placeholder-[#8b9ab0] outline-none transition focus:border-[#159b89] focus:bg-white focus:ring-4 focus:ring-[#d8f5ef]"
                placeholder="Email address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="auth-input block w-full rounded-xl border border-[#d8e1ec] bg-[#f8fafc] px-4 py-3 text-sm text-[#10233f] placeholder-[#8b9ab0] outline-none transition focus:border-[#159b89] focus:bg-white focus:ring-4 focus:ring-[#d8f5ef]"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center justify-end">
            <Link href="/forgot-password" className="text-sm font-medium text-[#159b89] hover:text-[#10233f]">
              Forgot password?
            </Link>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="auth-submit group relative flex w-full justify-center rounded-xl border border-transparent bg-[#10233f] px-4 py-3 text-sm font-bold text-white shadow-[0_12px_22px_rgba(16,35,63,0.2)] transition hover:-translate-y-0.5 hover:bg-[#1a385e] focus:outline-none focus:ring-4 focus:ring-[#b7c8dc] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center">
            <Link href="/" className="text-sm font-medium text-[#687992] hover:text-[#10233f]">
              Back to home
            </Link>
          </div>
          </form>
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

