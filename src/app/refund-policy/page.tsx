import LegalPage from '../../components/LegalPage';

export default function RefundPolicyPage() {
  return <LegalPage eyebrow="Billing" title="Refund Policy" intro="This policy explains how trial cancellation, subscription cancellation, and refund requests work for LegalSync plans." sections={[
    { title: 'Free trial', paragraphs: ['Eligible new accounts may receive a 14-day trial. Cancel before the trial ends to avoid the first subscription charge. Trial eligibility and duration may vary by offer.'] },
    { title: 'Cancellation', paragraphs: ['You can request cancellation through your account or by contacting support. Cancellation normally takes effect at the end of the current paid billing period, and access remains available until then unless we must suspend the account for another reason.'] },
    { title: 'Refunds', paragraphs: ['Subscription fees are generally non-refundable after a billing period begins, except where required by law or where LegalSync approves an exception. Duplicate charges, billing errors, or service-specific issues should be reported promptly so we can investigate.'] },
    { title: 'How to request help', paragraphs: ['Email billing@legalsync.com with the account email, charge date, and a short explanation. Do not include full payment card numbers or other sensitive payment credentials. Approved refunds are returned through the original payment method when possible.'] },
  ]} />;
}