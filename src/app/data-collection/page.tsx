import LegalPage from '../../components/LegalPage';

export default function DataCollectionPage() {
  return <LegalPage eyebrow="Privacy" title="What User Data We Collect" intro="Here is a plain-language summary of the information LegalSync may collect and why it is needed." sections={[
    { title: 'Account and firm information', paragraphs: ['Name, work email, firm or organization name, role, contact details, password credentials, and account preferences. We use this to create accounts, provide access, and support your team.'] },
    { title: 'Connected calendar and matter data', paragraphs: ['When you authorize an integration, we may process calendar events, titles, dates, attendees, reminders, identifiers, and relevant case or matter scheduling data needed to synchronize your selected systems. The exact fields depend on the permissions granted and provider APIs.'] },
    { title: 'Billing and subscription information', paragraphs: ['We collect plan, trial, subscription, invoice, and payment status information. Payment providers process sensitive card or cryptocurrency payment details; LegalSync does not need to store full card numbers to operate billing.'] },
    { title: 'Technical and usage information', paragraphs: ['We may collect IP address, browser and device details, timestamps, approximate location derived from IP, error logs, feature usage, and authentication events. This helps us secure, troubleshoot, and improve the service.'] },
    { title: 'Information we do not need', paragraphs: ['Do not upload passwords, payment card numbers, private keys, or information unrelated to calendar synchronization. You remain responsible for ensuring that data you connect or upload is lawful and appropriate for the service.'] },
  ]} />;
}