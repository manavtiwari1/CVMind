import LegalLayout from './resources/LegalLayout';
import { SUPPORT_EMAIL } from '../data/support';

interface RefundPolicyProps {
  setCurrentPage: (page: string) => void;
}

export default function RefundPolicy({ setCurrentPage }: RefundPolicyProps) {
  const mail = <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;

  return (
    <LegalLayout page="refund-policy" title="Refund Policy" updated="June 20, 2026" setCurrentPage={setCurrentPage}>
      <h2>Overview</h2>
      <p>We want you to be happy with your CV Mind subscription. This policy explains when and how you can ask for a refund on a Pro plan.</p>

      <h2>7-day money-back guarantee</h2>
      <p>If you are not satisfied with Pro, you can ask for a full refund within <strong>7 calendar days</strong> of your first purchase. The guarantee covers first-time Pro purchases only, not renewals.</p>

      <h2>Who is eligible</h2>
      <p>A refund may be granted if:</p>
      <ul>
        <li>You ask within 7 days of the original purchase.</li>
        <li>You have not used Pro features heavily (more than 10 AI-generated outputs).</li>
        <li>It is your first subscription, not a renewal or reactivation.</li>
      </ul>
      <p>Refunds are <strong>not</strong> available for:</p>
      <ul>
        <li>Subscription renewals (monthly, quarterly or yearly).</li>
        <li>Accounts suspended for breaking our Terms and Conditions.</li>
        <li>Unused days within a billing cycle.</li>
        <li>The Free plan, which has no charges.</li>
      </ul>

      <h2>How to ask for a refund</h2>
      <p>Email our support team:</p>
      <ul>
        <li><strong>Email:</strong> {mail}</li>
        <li><strong>Subject:</strong> Refund Request – [your registered email]</li>
        <li><strong>Include:</strong> your name, registered email address, purchase date and the reason for the request.</li>
      </ul>
      <p>We reply within <strong>3–5 business days</strong>. Approved refunds go back to your original payment method within 7–10 business days, depending on your bank or card issuer.</p>

      <h2>Cancelling</h2>
      <p>You can cancel your subscription at any time from your account settings. Cancelling stops future billing but does not refund the current period. You keep Pro until the end of the billing period you have paid for.</p>

      <h2>Technical issues</h2>
      <p>If a verifiable technical problem stops you using the Service and our support team cannot fix it in a reasonable time, you may be offered a pro-rated refund or account credit at our discretion.</p>

      <h2>Changes to this policy</h2>
      <p>We may update this Refund Policy at any time. Changes are posted on this page with a new "Last updated" date.</p>

      <h2>Contact</h2>
      <p>For refund questions, email {mail}.</p>
    </LegalLayout>
  );
}
