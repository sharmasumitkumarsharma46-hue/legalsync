'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { LogIn, UserPlus, Sparkles, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import BoomerangVideoBg from '../components/BoomerangVideoBg';

const BG_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260511_131941_d136af49-e243-493a-be14-6ff3f24e09e6.mp4';

const navLinks = [
  { href: '#mission', label: 'Purpose' },
  { href: '#purchasing', label: 'Purchasing' },
  { href: '#terms', label: 'Terms' },
  { href: '#security', label: 'Security' },
  { href: '#service', label: 'Service' },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pricingRef = useRef<HTMLDivElement | null>(null);

  const scrollPricing = (direction: 'left' | 'right') => {
    if (!pricingRef.current) return;

    pricingRef.current.scrollBy({
      left: direction === 'left' ? -320 : 320,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  return (
    <main className="landing-shell relative min-h-screen w-full overflow-hidden">
      <BoomerangVideoBg src={BG_VIDEO} className="absolute inset-0 h-full w-full" />
      <div className="landing-shade absolute inset-0 z-[1]" />

      <nav className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between px-4 py-4 sm:px-6 sm:py-6 md:px-10">
        <Link href="/" className="flex items-center gap-2 text-[#2d3a2a]" aria-label="LegalSync home">
          <span className="text-lg font-semibold tracking-tight sm:text-xl md:text-2xl">
            Legal<span className="text-[#336443]">Sync</span><sup className="ml-0.5 text-[9px] font-medium sm:text-xs">TM</sup>
          </span>
        </Link>

        <div className="hidden items-center gap-1 rounded-full border border-white/60 bg-white/70 py-1 pl-6 pr-1 shadow-sm backdrop-blur-md lg:flex">
          {navLinks.map((link, index) => (
            <a
              key={link.href}
              href={link.href}
              className={`px-3 py-2 text-sm transition-colors ${
                index === 0 ? 'font-semibold text-[#1f2a1d]' : 'font-medium text-[#4b5b47] hover:text-[#1f2a1d]'
              }`}
            >
              {link.label}
            </a>
          ))}
          <Link href="/signup" className="ml-2 rounded-full bg-[#1f2a1d] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2a3827]">
            Try it Live
          </Link>
        </div>

        <div className="flex items-center gap-3 text-[#2d3a2a] sm:gap-6">
          <Link href="/signup" className="hidden items-center gap-2 text-sm font-medium transition-opacity hover:opacity-80 sm:flex">
            <UserPlus className="h-4 w-4" />
            Sign Me Up!
          </Link>
          <Link href="/login" className="hidden items-center gap-2 text-sm font-medium transition-opacity hover:opacity-80 sm:flex">
            <LogIn className="h-4 w-4" />
            Enter
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/70 text-[#1f2a1d] backdrop-blur-md transition-all duration-300 hover:bg-white/90 lg:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            <Menu className={`absolute h-5 w-5 transition-all duration-300 ${menuOpen ? 'scale-50 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'}`} />
            <X className={`absolute h-5 w-5 transition-all duration-300 ${menuOpen ? 'scale-100 rotate-0 opacity-100' : '-rotate-90 scale-50 opacity-0'}`} />
          </button>
        </div>
      </nav>

      <div
        className={`fixed inset-0 z-20 transition-opacity duration-300 lg:hidden ${menuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-[#1f2a1d]/40 backdrop-blur-sm" />
      </div>

      <aside
        id="mobile-navigation"
        aria-label="Mobile navigation"
        aria-hidden={!menuOpen}
        className={`fixed bottom-0 right-0 top-0 z-20 w-[85%] max-w-sm bg-white/95 shadow-2xl backdrop-blur-xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex h-full flex-col px-8 pb-8 pt-24">
          <div className="flex flex-col gap-1">
            {navLinks.map((link, index) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`border-b border-[#1f2a1d]/10 py-4 text-2xl font-semibold text-[#1f2a1d] transition-all duration-500 ${menuOpen ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'}`}
                style={{ transitionDelay: menuOpen ? `${150 + index * 70}ms` : '0ms' }}
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className={`mt-8 flex flex-col gap-4 transition-all duration-500 ${menuOpen ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'}`} style={{ transitionDelay: menuOpen ? '400ms' : '0ms' }}>
            <Link href="/signup" className="flex items-center gap-2 text-sm font-medium text-[#2d3a2a] sm:hidden">
              <UserPlus className="h-4 w-4" /> Sign Me Up!
            </Link>
            <Link href="/login" className="flex items-center gap-2 text-sm font-medium text-[#2d3a2a] sm:hidden">
              <LogIn className="h-4 w-4" /> Enter
            </Link>
            <Link href="/signup" className="mt-2 rounded-full bg-[#1f2a1d] px-5 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-[#2a3827]">
              Try it Live
            </Link>
          </div>
        </div>
      </aside>

      <section className="relative z-10 flex min-h-screen flex-col items-center px-4 pb-24 pt-24 text-center sm:px-6 sm:pt-28 md:pt-32">
        <h1 className="max-w-5xl text-[2rem] font-normal leading-[0.95] tracking-[-0.035em] text-[#336443] sm:text-4xl md:text-5xl lg:text-[4.75rem] xl:text-[5.25rem]">
          Keep every deadline{' '}
          <span className="text-[#85ab8b]">
            in sync
            <br className="hidden sm:block" /> across your firm
          </span>
        </h1>
        <p className="mt-6 max-w-md px-2 text-sm leading-relaxed text-[#4b5b47] sm:mt-8 sm:text-base md:text-lg">
          Keep Clio, Google Calendar, and Outlook aligned so your team can move from deadline to action with confidence.
        </p>

        <div className="absolute bottom-6 left-4 right-4 max-w-sm text-left sm:bottom-8 sm:left-6 md:bottom-10 md:left-10">
          <div className="mb-3 flex items-center gap-2 text-[#3d5638] sm:text-white/95">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-semibold sm:font-medium">LegalSync<sup className="text-[9px]">TM</sup></span>
          </div>
          <p className="mb-6 max-w-xs text-xs font-medium leading-relaxed text-[#3d5638]/90 sm:font-normal sm:text-white/85">
            One dependable view for the case dates, calendar events, and follow-through your firm cannot afford to miss.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/signup" className="rounded-full bg-[#3d5638] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#2d4228] sm:bg-white sm:px-6 sm:py-3 sm:text-[#1f2a1d] sm:hover:bg-white/90">
              Try it Live
            </Link>
            <Link href="/login" className="text-sm font-semibold text-[#3d5638] transition-opacity hover:opacity-80 sm:font-medium sm:text-white">
              Know More.
            </Link>
          </div>
        </div>

      </section>

      <section id="purchasing" className="relative z-10 bg-[#f4f1ea] px-4 pt-8 pb-20 text-[#1f2a1d] sm:px-6 md:px-10 md:pt-12 md:pb-28">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#336443]">Purchasing</p>
            <h2 className="mt-3 text-3xl font-normal tracking-[-0.03em] sm:text-4xl md:text-5xl">Start with a 14-day free trial.</h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#4b5b47] sm:text-base">
              Choose the plan that fits your firm after the trial. Upgrade securely with card payments or cryptocurrency when you are ready.
            </p>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2 md:hidden">
            <button
              type="button"
              onClick={() => scrollPricing('left')}
              aria-label="Scroll pricing left"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#1f2a1d]/15 bg-white/80 text-[#1f2a1d] shadow-sm transition-colors hover:bg-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollPricing('right')}
              aria-label="Scroll pricing right"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#1f2a1d]/15 bg-white/80 text-[#1f2a1d] shadow-sm transition-colors hover:bg-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div ref={pricingRef} className="mt-4 flex snap-x gap-4 overflow-x-auto pb-3 [scrollbar-width:none] md:mt-10 md:grid md:grid-cols-3 md:gap-5 md:items-stretch md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden">
            {[
              {
                name: 'Solo',
                price: '$79',
                detail: 'For one attorney',
                difference: 'Best for independent lawyers who want dependable Clio and calendar sync without unnecessary complexity.',
                features: ['1 user access', 'Clio sync', 'Calendar sync', 'Deadline reminders'],
              },
              {
                name: 'Small Firm',
                price: '$199',
                detail: 'For growing teams',
                difference: 'Best for small teams that need shared visibility, stronger coordination, and smoother matter tracking.',
                features: ['Multi-user access', 'Shared team dashboard', 'Collaborative calendar sync', 'Priority support'],
              },
              {
                name: 'Mid Firm',
                price: '$499',
                detail: 'For established firms',
                difference: 'Best for larger firms needing stronger controls, higher-volume sync, and deeper operational oversight.',
                features: ['Advanced admin controls', 'High-volume sync support', 'Role-based access', 'Premium onboarding support'],
              },
            ].map((plan) => (
              <article key={plan.name} className="flex min-w-[84%] snap-center flex-col rounded-2xl border border-[#1f2a1d]/15 bg-white/70 p-6 shadow-[0_8px_24px_rgba(31,42,29,0.04)] md:min-w-0 md:flex-1">
                <div className="md:flex-1">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="mt-5 text-3xl font-semibold tracking-tight">{plan.price}<span className="text-sm font-normal text-[#4b5b47]"> / month</span></p>
                  <p className="mt-2 text-sm text-[#4b5b47]">{plan.detail}, with Clio and calendar sync.</p>
                  <p className="mt-4 text-sm leading-relaxed text-[#4b5b47]">{plan.difference}</p>
                  <ul className="mt-5 space-y-2 text-sm text-[#4b5b47]">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-[#336443]" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link href="/signup" className="mt-auto inline-flex w-full items-center justify-center rounded-full bg-[#2e8b57] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(46,139,87,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#267548] hover:shadow-[0_12px_24px_rgba(46,139,87,0.3)]">
                  Start free trial
                </Link>
              </article>
            ))}
          </div>

          <p className="mt-6 text-xs text-[#4b5b47]">Payments are handled securely by card or cryptocurrency. Cancel before the trial ends to avoid a charge.</p>
        </div>
      </section>

      <footer className="relative z-10 border-t border-[#1f2a1d]/10 bg-[#f4f1ea] px-4 py-10 text-[#1f2a1d] sm:px-6 md:px-10">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          <div id="terms" className="rounded-2xl border border-[#1f2a1d]/10 bg-white/60 p-5 md:col-span-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#336443]">Terms</p>
            <h3 className="mt-3 text-xl font-semibold">Terms & Conditions</h3>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-[#4b5b47]">
              <div>
                <h4 className="text-base font-semibold text-[#1f2a1d]">1. Acceptance of Terms</h4>
                <p>By creating an account or using LegalSync, you agree to these Terms & Conditions and any applicable plan terms. If you do not agree, you must not use the service.</p>
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#1f2a1d]">2. Eligibility and Account Responsibility</h4>
                <p>You must be at least 18 years old and authorized to act on behalf of your firm or organization. You are responsible for keeping your login credentials secure and for all activity under your account.</p>
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#1f2a1d]">3. Service Scope</h4>
                <p>LegalSync provides calendar synchronization, conflict monitoring, and billing management between connected systems such as Clio, Google Calendar, and Outlook. We do not provide legal advice, representation, or compliance consulting.</p>
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#1f2a1d]">4. User Content and Data</h4>
                <p>You retain ownership of your data and provide us only the permissions needed to operate the service. You are responsible for the accuracy, legality, and relevance of the content you synchronize.</p>
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#1f2a1d]">5. Integrations and OAuth</h4>
                <p>Access to external systems depends on the user’s consent and provider permissions. LegalSync may require access to calendar or case-management data to perform synchronization, and you agree to provide valid OAuth authorization.</p>
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#1f2a1d]">6. Payment, Trial, and Billing</h4>
                <p>Subscription fees are billed according to the selected plan. New users may receive a trial period according to the applicable offer. If a trial converts to paid service, billing starts automatically unless cancelled before the renewal date.</p>
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#1f2a1d]">7. Refunds and Cancellation</h4>
                <p>Unless otherwise required by law, fees are non-refundable once rendered. You may cancel your subscription before the next billing cycle, and the service will remain active until the end of the current period.</p>
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#1f2a1d]">8. Availability and Reliability</h4>
                <p>We aim to provide continuous service, but no software platform can guarantee uninterrupted availability. LegalSync may be interrupted for maintenance, provider outages, or force majeure events.</p>
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#1f2a1d]">9. Security and Confidentiality</h4>
                <p>We use reasonable security measures to protect user data, including secure storage, encryption in transit, and access controls. You remain responsible for protecting your own devices and login credentials.</p>
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#1f2a1d]">10. Prohibited Use</h4>
                <p>You may not use LegalSync for illegal purposes, unauthorized access, spamming, abuse of third-party APIs, or anything that disrupts provider services or other users.</p>
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#1f2a1d]">11. Intellectual Property</h4>
                <p>LegalSync retains all rights to its software, interfaces, branding, and content. You may not copy, resell, or reverse engineer the platform except as expressly permitted by law.</p>
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#1f2a1d]">12. Limitation of Liability</h4>
                <p>LegalSync is not liable for indirect, incidental, or consequential damages including missed deadlines, business losses, or professional liability arising from external calendar or case-management data issues.</p>
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#1f2a1d]">13. Termination</h4>
                <p>We may suspend or terminate access if you violate these Terms, fail to pay required fees, or create a material security or compliance risk. You may close your account at any time.</p>
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#1f2a1d]">14. Changes to Terms</h4>
                <p>We may update these Terms from time to time. Continued use of the service after notice constitutes acceptance of the revised Terms.</p>
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#1f2a1d]">15. Governing Law</h4>
                <p>These Terms are governed by the laws of the jurisdiction in which the service is operated, without regard to conflict of law rules.</p>
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#1f2a1d]">16. Contact</h4>
                <p>For questions about these Terms, contact support@legalsync.com.</p>
              </div>
            </div>
          </div>

          <div id="security" className="rounded-2xl border border-[#1f2a1d]/10 bg-white/60 p-5 md:col-span-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#336443]">Security</p>
            <h3 className="mt-3 text-xl font-semibold">Security Policy</h3>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-[#4b5b47]">
              <div>
                <h4 className="text-base font-semibold text-[#1f2a1d]">1. Purpose</h4>
                <p>LegalSync is designed to protect confidential client, firm, and scheduling data. This policy explains the safeguards used to secure account access, OAuth connections, billing details, and calendar data.</p>
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#1f2a1d]">2. Data Protection Principles</h4>
                <p>We implement administrative, technical, and physical safeguards to reduce the risk of unauthorized access, disclosure, alteration, or loss of personal and professional information.</p>
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#1f2a1d]">3. Encryption and Transport Security</h4>
                <p>All data in transit is protected using secure HTTPS/TLS connections. Sensitive credentials, OAuth tokens, and secret values are stored in protected environment configuration and are never exposed in application output or client-side code.</p>
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#1f2a1d]">4. Authentication and Access Control</h4>
                <p>Access to LegalSync is restricted by authentication, authorization checks, and role-based segregation of duties. Users are responsible for maintaining secure passwords, MFA when enabled, and limiting account sharing.</p>
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#1f2a1d]">5. OAuth and Third-Party Integrations</h4>
                <p>LegalSync connects to Clio, Google Calendar, and Microsoft Outlook using OAuth and provider-specific tokens. These tokens are treated as secrets and are used only for the authorized service scope required to perform synchronization.</p>
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#1f2a1d]">6. Least Privilege</h4>
                <p>We request only the minimum access necessary to complete synchronization tasks. We do not request broader permissions than required for case calendars, event updates, and billing workflows.</p>
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#1f2a1d]">7. Billing and Payment Security</h4>
                <p>Payment data is handled through trusted providers and secure payment flows. LegalSync does not store full payment card details in application databases unless required by the provider and explicitly permitted.</p>
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#1f2a1d]">8. Logging and Monitoring</h4>
                <p>We log operational events and errors in a controlled manner. Logs exclude sensitive details such as passwords, tokens, full payloads, and personal calendar contents where possible.</p>
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#1f2a1d]">9. Incident Response</h4>
                <p>If a security incident is detected, LegalSync may suspend affected services, revoke tokens, investigate root cause, and notify affected users when legally required or when risk to the user is material.</p>
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#1f2a1d]">10. User Responsibilities</h4>
                <p>Users must not share credentials, use unauthorized devices, or upload data that violates applicable law or licensing terms. Any suspicious activity should be reported immediately to support@legalsync.com.</p>
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#1f2a1d]">11. Confidentiality and Retention</h4>
                <p>Data is retained only as long as necessary to provide the requested service, maintain billing records, and fulfill legal obligations. We apply reasonable deletion and archival practices for inactive or expired accounts.</p>
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#1f2a1d]">12. Security Updates</h4>
                <p>We maintain and review security controls continuously, including dependency updates, configuration hardening, and error handling improvements. Security practices may evolve as the platform and regulations change.</p>
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#1f2a1d]">13. Limitation of Guarantee</h4>
                <p>No security system is perfect. LegalSync makes commercially reasonable efforts to reduce risk, but cannot guarantee absolute prevention of all unauthorized access, cyber events, or provider outages.</p>
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#1f2a1d]">14. Contact</h4>
                <p>For security concerns or incident reporting, contact security@legalsync.com.</p>
              </div>
            </div>
          </div>

          <div id="service" className="rounded-2xl border border-[#1f2a1d]/10 bg-white/60 p-5 md:col-span-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#336443]">Service</p>
            <h3 className="mt-3 text-xl font-semibold">Our Service</h3>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-[#4b5b47]">
              <div>
                <h4 className="text-base font-semibold text-[#1f2a1d]">1. Calendar Synchronization</h4>
                <p>LegalSync provides secure synchronization between Clio case-management calendars and personal calendars such as Google Calendar and Microsoft Outlook. This allows attorneys and staff to keep legal deadlines, appointments, and internal scheduling aligned without manual duplication.</p>
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#1f2a1d]">2. Deadline and Appointment Tracking</h4>
                <p>We help firms monitor important legal deadlines, hearings, filings, meetings, and follow-ups by ensuring they are reflected consistently across connected systems.</p>
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#1f2a1d]">3. Conflict Detection and Resolution</h4>
                <p>When updates occur in different systems, LegalSync identifies conflicts, compares scheduling changes, and applies predefined resolution rules to reduce missed deadlines or duplicate events.</p>
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#1f2a1d]">4. OAuth-Based Integration Management</h4>
                <p>LegalSync supports secure account connections for external services, including Clio, Google Calendar, and Microsoft Outlook. The system manages access permissions, refresh flows, and reconnection requirements for connected services.</p>
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#1f2a1d]">5. Sync Monitoring and History</h4>
                <p>Users can review sync status, activity logs, and recent processing results through the dashboard. This helps firms understand whether updates have been completed, delayed, or flagged for review.</p>
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#1f2a1d]">6. Trial and Subscription Management</h4>
                <p>LegalSync provides onboarding support, trial provisioning, and subscription management to help firms evaluate the platform before converting to a paid plan.</p>
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#1f2a1d]">7. Business and Operational Support</h4>
                <p>By reducing manual calendar maintenance and improving visibility into scheduling changes, LegalSync supports better operational efficiency for law firms, legal staff, and administrative teams.</p>
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#1f2a1d]">8. Important Limitation</h4>
                <p>LegalSync is a software service for synchronization and workflow support. It is not a substitute for legal advice, legal representation, or professional judgment. Users remain responsible for final legal decisions and compliance-related actions.</p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
