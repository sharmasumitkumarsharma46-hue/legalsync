import LegalPage from '../../components/LegalPage';

export default function CookiePolicyPage() {
  return <LegalPage eyebrow="Privacy" title="Cookie Policy" intro="LegalSync uses cookies and similar technologies to keep the website reliable, remember preferences, and understand how visitors use our pages." sections={[
    { title: 'What cookies are', paragraphs: ['Cookies are small text files stored by your browser. Similar technologies, such as local storage or pixels, may serve comparable purposes.'] },
    { title: 'How we use them', paragraphs: ['Strictly necessary technologies support authentication, security, session management, and core website functionality. Preference technologies remember choices such as dismissing a notice. Analytics technologies may help us understand page performance and usage trends when enabled.', 'We do not use cookies to sell your information or to build advertising profiles across unrelated websites.'] },
    { title: 'Your choices', paragraphs: ['You can block or delete cookies through your browser settings. Blocking necessary cookies may prevent login or other parts of LegalSync from working correctly. Where consent is required, we will provide the applicable choice controls.'] },
    { title: 'Third-party services', paragraphs: ['Embedded content and connected providers may set their own cookies when you interact with them. Their practices are governed by their privacy policies, described in our Third-Party Embeds page.'] },
  ]} />;
}