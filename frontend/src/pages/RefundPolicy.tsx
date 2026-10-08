import LegalLayout from './resources/LegalLayout';
import { SUPPORT_EMAIL } from '../data/support';

interface RefundPolicyProps {
  setCurrentPage: (page: string) => void;
}

export default function RefundPolicy({ setCurrentPage }: RefundPolicyProps) {
  const mail = <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;
  const billing = <a href="/account?tab=billing">Account → Billing</a>;

  return (
    <LegalLayout page="refund-policy" title="Refund Policy" updated="October 9, 2026" setCurrentPage={setCurrentPage}>
      <h2>Overview</h2>
      <p>CVMind Pro plans are one-time payments. Each plan ends on its own date and nothing renews automatically, so you are never charged again without choosing to buy.</p>

      <h2>Payments are non-refundable</h2>
      <p>Once a payment goes through, it is <strong>not refunded</strong>. This includes:</p>
      <ul>
        <li>The 3-day pass, 7-day pass, 6-month and yearly plans.</li>
        <li>Days of a plan you didn't use.</li>
        <li>Changing your mind after using Pro, finding a job, or not needing Pro any more.</li>
        <li>Accounts suspended for breaking our Terms and Conditions.</li>
      </ul>

      <h2>Monthly plan: cancelling for a genuine reason</h2>
      <p>If you are on the <strong>Monthly plan</strong> and have a genuine reason, you can cancel it and ask for a refund while the plan is still active. Genuine reasons include:</p>
      <ul>
        <li>You were charged more than once for the same plan.</li>
        <li>A Pro feature doesn't work for you and our support team couldn't fix it.</li>
        <li>You were charged by mistake and haven't used Pro.</li>
      </ul>
      <p>A refund is only given after our team reviews your request and agrees it is genuine. Asking for one does not guarantee it.</p>

      <h2>How to ask</h2>
      <ol>
        <li>Go to {billing} while signed in.</li>
        <li>Choose <strong>Cancel subscription</strong>, pick the reason and tell us what happened.</li>
        <li>Send the request. You can send one request per payment.</li>
      </ol>
      <p>We email you to confirm we received it.</p>

      <h2>What happens next</h2>
      <ul>
        <li>A member of our team reviews every request by hand and replies by email within <strong>3 working days</strong>. Your Pro plan stays active while we review it.</li>
        <li><strong>If it is approved</strong>, we start the refund to the account or card you paid with, and the Pro plan from that payment ends straight away. The money usually reaches you within 5 to 7 working days, depending on your bank.</li>
        <li><strong>If it is not approved</strong>, we email you the reason and your plan continues until its end date.</li>
      </ul>

      <h2>Charged twice on another plan?</h2>
      <p>If you were charged more than once for the same purchase on any plan, email {mail} with your registered email and both payment IDs and we'll return the extra charge.</p>

      <h2>Changes to this policy</h2>
      <p>We may update this Refund Policy at any time. Changes are posted on this page with a new "Last updated" date.</p>

      <h2>Contact</h2>
      <p>For refund questions, email {mail}.</p>
    </LegalLayout>
  );
}
