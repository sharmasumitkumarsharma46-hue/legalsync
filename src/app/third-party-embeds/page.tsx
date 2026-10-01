import LegalPage from '../../components/LegalPage';

export default function ThirdPartyEmbedsPage() {
  return <LegalPage eyebrow="Transparency" title="Third-Party Embeds" intro="Some LegalSync pages may include content or services hosted by third parties. This page explains what that means for your privacy." sections={[
    { title: 'What may be embedded', paragraphs: ['Our website may use third-party content such as hosted video, payment interfaces, maps, support tools, analytics, or authentication components. The landing page may also load a background video hosted by a content delivery provider.'] },
    { title: 'What third parties may receive', paragraphs: ['When an embedded resource loads or you interact with it, the provider may receive your IP address, browser information, device information, referring page, and interaction data. A provider may set cookies or use similar technologies according to its own policies.'] },
    { title: 'Your control', paragraphs: ['You can block third-party cookies or embedded content through browser settings and privacy extensions. Some optional content may not display, while core account and synchronization features should remain available.'] },
    { title: 'Provider policies', paragraphs: ['Third-party providers control their own processing practices. Review their privacy and cookie notices before interacting with embedded content. LegalSync does not control information collected directly by those providers.'] },
  ]} />;
}