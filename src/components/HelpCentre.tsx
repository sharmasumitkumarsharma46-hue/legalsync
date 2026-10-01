'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ChevronDown, Mail, Search } from 'lucide-react';

type Faq = {
  category: string;
  question: string;
  answer: string;
};

const faqs: Faq[] = [
  { category: 'Getting started', question: 'What is LegalSync?', answer: 'LegalSync is a legal operations platform for connecting Clio with selected firm calendars. It stores event mappings and sync history so deadline and matter scheduling changes can be tracked across connected systems.' },
  { category: 'Getting started', question: 'How do I start my free trial?', answer: 'Select Start free trial, create an account, and complete the onboarding wizard. The current wizard guides you through connecting Clio, connecting Google or Outlook, selecting calendars, configuring sync, reviewing settings, and starting the first sync. Eligible new accounts receive a 14-day trial.' },
  { category: 'Getting started', question: 'I forgot my password. What should I do?', answer: 'Use the Forgot Password page and submit the email on your LegalSync account. If the account is found, LegalSync sends a time-limited reset link. Use that link to choose a new password.' },
  { category: 'Connections', question: 'Which services can I connect?', answer: 'The project includes integration clients and onboarding flows for Clio, Google Calendar, and Microsoft Outlook. The database tracks Clio, Google Calendar, and Outlook integration records, OAuth tokens, connection status, and token expiry.' },
  { category: 'Connections', question: 'What must be connected before a sync can run?', answer: 'For the implemented Clio-to-Google sync, both a connected Clio integration and a connected Google Calendar integration are required. At least one Google calendar mapping must also be selected. If either requirement is missing, the sync returns an error instead of creating events.' },
  { category: 'Connections', question: 'Why is my calendar connection showing as disconnected?', answer: 'The integration record may be disconnected or in an error state, or its provider token may need renewal. Reconnect through onboarding or the integration flow, then confirm the connection status and token expiry. Contact support if the status does not update.' },
  { category: 'Syncing', question: 'What does LegalSync sync?', answer: 'The current sync engine reads Clio events and creates or updates corresponding Google Calendar events. Stored event fields include title, description, start and end time, location, matter name, and matter ID. Sync history records the number of events and any errors.' },
  { category: 'Syncing', question: 'Why has an event not synced yet?', answer: 'Check that Clio and Google Calendar are connected, a calendar is selected, and the sync history does not show an error. The engine records warnings for individual event failures and reports errors such as a missing connection or no selected calendar.' },
  { category: 'Syncing', question: 'How does LegalSync handle conflicting changes?', answer: 'The project has conflict detection and a conflicts table for events changed in connected systems. Review the recorded conflict and sync history before manually recreating an event. The exact resolution depends on the configured sync rules.' },
  { category: 'Billing', question: 'When will I be charged after the trial?', answer: 'The dashboard reads the trial status from the billing API and shows the trial end date and remaining days. When you convert the trial, the current implementation accepts Stripe or cryptocurrency as the payment method; cryptocurrency checkout can redirect to a hosted payment URL.' },
  { category: 'Billing', question: 'How do I cancel or request a refund?', answer: 'LegalSync has a cancellation endpoint for ending a subscription. Request cancellation through the account flow or email billing@legalsync.com. Refund requests are reviewed under the Refund Policy. Do not send full payment card numbers by email.' },
  { category: 'Privacy & security', question: 'What user data does LegalSync collect?', answer: 'We may collect account and firm details, authorized calendar and matter data, subscription status, technical information, and support messages. Read the full What Data We Collect page for details.' },
  { category: 'Privacy & security', question: 'Does LegalSync use third-party embeds?', answer: 'Some pages may load hosted video, payment, support, analytics, or authentication content. These providers may receive technical information when their content loads. See our Third-Party Embeds page for more information.' },
  { category: 'Privacy & security', question: 'How do I request deletion or export of my data?', answer: 'Email privacy@legalsync.com from the address associated with your account. We will verify the request and explain any information that must be retained for legal, billing, or security reasons.' },
];

const categories = ['All topics', ...Array.from(new Set(faqs.map((faq) => faq.category)))];

export default function HelpCentre() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All topics');
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  const filteredFaqs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return faqs.filter((faq) => {
      const matchesCategory = activeCategory === 'All topics' || faq.category === activeCategory;
      const matchesQuery = !normalizedQuery || `${faq.question} ${faq.answer} ${faq.category}`.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, query]);

  return (
    <main className="min-h-screen bg-[#f4f1ea] text-[#1f2a1d]">
      <header className="border-b border-[#1f2a1d]/10 bg-[#e4ecdf] px-5 py-6 sm:px-8 md:px-12">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link href="/" className="text-xl font-semibold tracking-tight sm:text-2xl">Legal<span className="text-[#336443]">Sync</span><sup className="ml-0.5 text-[9px] font-medium">TM</sup></Link>
          <Link href="/" className="text-sm font-medium text-[#4b5b47] transition-colors hover:text-[#1f2a1d]">Back to home</Link>
        </div>
      </header>

      <section className="border-b border-[#1f2a1d]/10 bg-[#e4ecdf] px-5 pb-12 pt-10 sm:px-8 md:px-12 md:pb-16 md:pt-14">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#336443]">LegalSync Support</p>
          <h1 className="mt-3 text-4xl font-normal tracking-[-0.04em] sm:text-5xl md:text-6xl">How can we help?</h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#4b5b47]">Search answers about connections, syncing, billing, privacy, and everything in between.</p>
          <label className="mx-auto mt-7 flex max-w-2xl items-center gap-3 rounded-2xl border border-[#1f2a1d]/15 bg-white px-4 py-3 text-left shadow-[0_12px_30px_rgba(31,42,29,0.08)]">
            <Search className="h-5 w-5 shrink-0 text-[#336443]" />
            <span className="sr-only">Search help centre</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a question or problem..." className="w-full bg-transparent text-sm text-[#1f2a1d] outline-none placeholder:text-[#7a8578]" />
          </label>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 md:px-12 md:py-14">
        <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((category) => (
            <button key={category} type="button" onClick={() => setActiveCategory(category)} className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors ${activeCategory === category ? 'border-[#336443] bg-[#336443] text-white' : 'border-[#1f2a1d]/15 bg-white/70 text-[#4b5b47] hover:border-[#336443] hover:text-[#1f2a1d]'}`}>
              {category}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-3">
          {filteredFaqs.map((faq) => {
            const isOpen = openQuestion === faq.question;
            return (
              <article key={faq.question} className="rounded-2xl border border-[#1f2a1d]/10 bg-white/75 px-5 shadow-[0_8px_24px_rgba(31,42,29,0.03)]">
                <button type="button" onClick={() => setOpenQuestion(isOpen ? null : faq.question)} aria-expanded={isOpen} className="flex w-full items-center justify-between gap-5 py-5 text-left">
                  <span><span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7869]">{faq.category}</span><span className="text-base font-semibold sm:text-lg">{faq.question}</span></span>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-[#336443] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && <p className="max-w-3xl border-t border-[#1f2a1d]/10 pb-5 pt-4 text-sm leading-relaxed text-[#4b5b47]">{faq.answer}</p>}
              </article>
            );
          })}
        </div>

        {filteredFaqs.length === 0 && <div className="py-14 text-center"><h2 className="text-xl font-semibold">No matching answers yet</h2><p className="mt-2 text-sm text-[#4b5b47]">Try another search, or contact the LegalSync team directly.</p></div>}

        <section className="mt-12 flex flex-col justify-between gap-6 rounded-2xl bg-[#1f2a1d] px-6 py-7 text-white sm:flex-row sm:items-center sm:px-8">
          <div><h2 className="text-xl font-semibold">Still need help?</h2><p className="mt-1 text-sm text-white/70">Tell us what happened and include the affected integration if relevant.</p></div>
          <a href="mailto:support@legalsync.com" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#1f2a1d] transition-colors hover:bg-[#e4ecdf]"><Mail className="h-4 w-4" /> Contact support</a>
        </section>
      </div>
    </main>
  );
}