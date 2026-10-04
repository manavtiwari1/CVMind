import LegalLayout from './resources/LegalLayout';
import { SUPPORT_EMAIL } from '../data/support';

interface TermsProps {
  setCurrentPage: (page: string) => void;
}

export default function Terms({ setCurrentPage }: TermsProps) {
  const mail = <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;
  const pageLink = (page: string, label: string) => (
    <a href={`/${page}`} onClick={e => { e.preventDefault(); setCurrentPage(page); }}>{label}</a>
  );

  return (
    <LegalLayout page="terms" title="Terms and Conditions" updated="June 20, 2026" setCurrentPage={setCurrentPage}>
      <h2>Welcome to CV Mind</h2>
      <p>Thanks for using CV Mind and trusting us with your career goals. This website and platform ("Service") are provided by CV Mind ("us", "we", or "our").</p>
      <p>By accessing or using the Service, you agree to these Terms and Conditions. If you do not agree, please do not use the Service. These terms apply to all visitors, users and others who access or use it.</p>

      <h2>What the Service is</h2>
      <p>CV Mind provides AI-powered resume analysis, a resume and cover letter builder, LinkedIn optimisation, interview preparation and related career tools. The Service is provided on an "as is" basis and may be updated, changed or discontinued at any time without notice.</p>

      <h2>Accounts</h2>
      <p>Some features need an account. You are responsible for:</p>
      <ul>
        <li>Keeping your sign-in details confidential.</li>
        <li>All activity that happens under your account.</li>
        <li>Telling us straight away about any unauthorised use at {mail}.</li>
      </ul>
      <p>We may terminate accounts that break these Terms.</p>

      <h2>Plans and payments</h2>
      <p>CV Mind offers a Free plan and a paid Pro plan. By subscribing you authorise us to charge the fees for the billing cycle you chose (monthly, quarterly or yearly). Prices are in Indian Rupees (₹) unless stated otherwise.</p>
      <p>Subscription fees are non-refundable except as described in our {pageLink('refund-policy', 'Refund Policy')}. We may change prices with 30 days' notice.</p>

      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service for anything unlawful or in breach of any applicable law.</li>
        <li>Upload malicious content, spam, or material that infringes anyone else's rights.</li>
        <li>Reverse-engineer, scrape or exploit the Service.</li>
        <li>Share, resell or sublicense access to your account.</li>
      </ul>

      <h2>Content and intellectual property</h2>
      <p>The CV Mind software, design, branding and written content belong to CV Mind and its licensors. You keep ownership of every resume or document you upload or create. By uploading content you give us a limited, non-exclusive licence to process it only to provide the Service to you. More detail is in our {pageLink('copyright-policy', 'Copyright Policy')}.</p>

      <h2>AI-generated content</h2>
      <p>Output from our AI tools is for career assistance and information only. It is not professional legal, financial or career advice. Review and check all AI-generated content before you use it in a job application or anywhere else. See our {pageLink('disclaimer', 'Disclaimer')}.</p>

      <h2>Privacy</h2>
      <p>Your use of the Service is also governed by our {pageLink('privacy', 'Privacy Policy')}, which forms part of these Terms. We process your data only as that policy describes.</p>

      <h2>Limitation of liability</h2>
      <p>To the fullest extent permitted by law, CV Mind is not liable for any indirect, incidental, special, consequential or punitive damages arising from your use of the Service, including lost job opportunities, lost data or business interruption.</p>

      <h2>Termination</h2>
      <p>We may suspend or end your access to the Service at any time, with or without cause or notice. When access ends, your right to use the Service ends immediately.</p>

      <h2>Governing law</h2>
      <p>These Terms are governed by the laws of India. Any disputes are subject to the exclusive jurisdiction of the courts in New Delhi, India.</p>

      <h2>Changes to these Terms</h2>
      <p>We may update these Terms at any time. If you keep using the Service after a change, you accept the updated Terms. We will email registered users about material changes.</p>

      <h2>Contact us</h2>
      <p>Questions about these Terms? Email us at {mail} or visit the {pageLink('help-center', 'Help Desk')}.</p>
    </LegalLayout>
  );
}
