import Link from 'next/link';

type LegalSection = {
  title: string;
  paragraphs: string[];
};

type LegalPageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  sections: LegalSection[];
};

const legalLinks = [
  { href: '/privacy-policy', label: 'Privacy Policy' },
  { href: '/cookie-policy', label: 'Cookie Policy' },
  { href: '/refund-policy', label: 'Refund Policy' },
  { href: '/data-collection', label: 'What Data We Collect' },
  { href: '/third-party-embeds', label: 'Third-Party Embeds' },
];

export default function LegalPage({ eyebrow, title, intro, sections }: LegalPageProps) {
  return (
    <main className="min-h-screen bg-[#f4f1ea] text-[#1f2a1d]">
      <header className="border-b border-[#1f2a1d]/10 bg-[#e4ecdf] px-5 py-6 sm:px-8 md:px-12">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Link href="/" className="text-xl font-semibold tracking-tight sm:text-2xl">
            Legal<span className="text-[#336443]">Sync</span><sup className="ml-0.5 text-[9px] font-medium">TM</sup>
          </Link>
          <Link href="/" className="text-sm font-medium text-[#4b5b47] transition-colors hover:text-[#1f2a1d]">Back to home</Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 md:px-12 md:py-16">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#336443]">{eyebrow}</p>
          <h1 className="mt-3 text-4xl font-normal tracking-[-0.03em] sm:text-5xl">{title}</h1>
          <p className="mt-5 text-base leading-relaxed text-[#4b5b47]">{intro}</p>
          <p className="mt-3 text-xs text-[#687464]">Last updated: September 28, 2026</p>
        </div>

        <div className="mt-10 max-w-3xl space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-[#4b5b47]">
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </section>
          ))}
        </div>

        <nav aria-label="Legal navigation" className="mt-14 border-t border-[#1f2a1d]/10 pt-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#336443]">Legal</p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#4b5b47]">
            {legalLinks.map((link) => <Link key={link.href} href={link.href} className="hover:text-[#1f2a1d]">{link.label}</Link>)}
          </div>
          <p className="mt-4 text-sm text-[#4b5b47]">Questions? <a href="mailto:privacy@legalsync.com" className="font-medium text-[#336443] hover:text-[#1f2a1d]">Contact our privacy team.</a></p>
        </nav>
      </div>
    </main>
  );
}