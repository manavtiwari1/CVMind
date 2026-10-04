import LegalLayout from './resources/LegalLayout';
import { SUPPORT_EMAIL } from '../data/support';

interface PrivacyProps {
  setCurrentPage: (page: string) => void;
}

const TOC = [
  { id: 'collect', label: 'What we collect' },
  { id: 'resumes', label: 'How uploaded resumes are handled' },
  { id: 'use', label: 'How we use your information' },
  { id: 'ai', label: 'AI processing' },
  { id: 'share', label: 'Who we share it with' },
  { id: 'cookies', label: 'Advertising and cookies' },
  { id: 'security', label: 'Security' },
  { id: 'retention', label: 'Keeping and deleting your data' },
  { id: 'rights', label: 'Your choices and rights' },
  { id: 'children', label: 'Children' },
  { id: 'changes', label: 'Changes to this policy' },
  { id: 'contact', label: 'Contact us' },
];

export default function Privacy({ setCurrentPage }: PrivacyProps) {
  const mail = <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;
  const pageLink = (page: string, label: string) => (
    <a href={`/${page}`} onClick={e => { e.preventDefault(); setCurrentPage(page); }}>{label}</a>
  );

  return (
    <LegalLayout page="privacy" title="Privacy Policy" updated="October 3, 2026" setCurrentPage={setCurrentPage} toc={TOC}>
      <h2>Introduction</h2>
      <p>This Privacy Policy explains how CV Mind ("<strong>we</strong>", "<strong>us</strong>" or "<strong>our</strong>") collects, uses, stores and shares your information when you use our website at <a href="https://www.cvmind.in" target="_blank" rel="noopener noreferrer">https://www.cvmind.in</a>, the CV Mind app and our other services ("<strong>Services</strong>").</p>
      <p><strong>Questions or concerns?</strong> Reading this policy will help you understand your privacy rights and choices. If you do not agree with how we handle your information, please do not use the Services. If you still have questions, email us at <strong>{SUPPORT_EMAIL}</strong>.</p>

      <h3>Summary of key points</h3>
      <ul>
        <li><strong>Uploaded resume files are not kept.</strong> We read them in memory to score or rewrite them, then discard the file. We keep the result (such as your score), not the file.</li>
        <li><strong>Documents you save are stored in your account</strong> so you can open them on any device. Only you can see them unless you share a link.</li>
        <li><strong>Your text is sent to an AI model</strong> to produce the feedback you ask for. We do not use your content to train AI models.</li>
        <li><strong>We do not sell your personal information.</strong></li>
        <li><strong>Some pages show Google ads</strong>, which use cookies. You can opt out of personalised ads.</li>
      </ul>

      <h2 id="collect">What we collect</h2>
      <h3>Information you give us</h3>
      <ul>
        <li><strong>Account details:</strong> your name, email address and password (stored as a secure hash, never in plain text). If you sign in with Google, we receive your name, email address and profile photo from Google.</li>
        <li><strong>Profile details:</strong> anything you add to your profile, such as a photo or address.</li>
        <li><strong>Documents and content:</strong> resumes, cover letters and portfolios you save, and the text you type into our tools (for example a job description, interview answers or a LinkedIn profile).</li>
        <li><strong>Messages:</strong> your name, email and message when you contact us through the Help Desk.</li>
        <li><strong>Payments:</strong> when you buy Pro, we record your email, the amount, the payment method type and a transaction ID. We do not store your card or UPI details.</li>
      </ul>
      <h3>Information collected automatically</h3>
      <ul>
        <li><strong>Usage records:</strong> which tools you used and when, along with results such as a resume score and the missing keywords found, the file name and size of an upload, and how much of your plan's AI allowance you have used.</li>
        <li><strong>Sign-in records:</strong> the time and method of each sign-in, to protect your account.</li>
        <li><strong>Cookies and local storage:</strong> see <a href="#cookies" onClick={e => { e.preventDefault(); document.getElementById('cookies')?.scrollIntoView({ behavior: 'smooth' }); }}>Advertising and cookies</a>.</li>
      </ul>

      <h2 id="resumes">How uploaded resumes are handled</h2>
      <p>When you upload a PDF, DOCX or TXT resume (up to 5 MB) to check or tailor it, the file is held in memory while we read its text, and is not written to disk. Once the result is ready, the file itself is discarded. We keep the result, such as your score and summary, so it can appear in your history.</p>
      <p>If you choose to save a resume or cover letter in the builder, its content is stored in your account until you delete it.</p>

      <h2 id="use">How we use your information</h2>
      <ul>
        <li>To provide the Services: scoring, editing, AI suggestions, saving your documents and syncing them across devices.</li>
        <li>To run your account, apply plan limits and process payments.</li>
        <li>To reply to your messages and send service emails such as password resets and welcome emails.</li>
        <li>To keep the Services secure and investigate misuse.</li>
        <li>To understand which features are used so we can improve them.</li>
      </ul>

      <h2 id="ai">AI processing</h2>
      <p>Our AI features send the text needed for your request (for example your resume text and a job description) to our AI model providers, DeepSeek and Google Gemini, which return the feedback or draft you asked for. We use these services through their APIs, and we do not use your resumes, prompts or answers to train any AI model. These providers may process data on servers outside India.</p>

      <h2 id="share">Who we share it with</h2>
      <p>We do not sell or rent your personal information. We share it only with service providers that help us run CV Mind, and only as much as they need:</p>
      <div className="rsc-table-wrap">
        <table>
          <thead>
            <tr><th>Provider</th><th>What for</th><th>What they receive</th></tr>
          </thead>
          <tbody>
            <tr><td>DeepSeek</td><td>AI feedback and writing</td><td>The text of your request</td></tr>
            <tr><td>Google (Gemini)</td><td>AI feedback and writing for some features</td><td>The text of your request</td></tr>
            <tr><td>MongoDB Atlas</td><td>Database hosting</td><td>Account details, saved documents and usage records</td></tr>
            <tr><td>Resend</td><td>Sending emails</td><td>Your email address and the email content</td></tr>
            <tr><td>Google Sign-In</td><td>Signing in with Google</td><td>Handled by Google; we receive your name, email and photo</td></tr>
            <tr><td>Google AdSense</td><td>Showing ads on some pages</td><td>Cookie and device data, as described below</td></tr>
          </tbody>
        </table>
      </div>
      <p>We may also disclose information if the law requires it, or to protect the rights and safety of our users and the Services.</p>
      <p>If you share a portfolio link, anyone with that link can see that portfolio.</p>

      <h2 id="cookies">Advertising and cookies</h2>
      <p>CV Mind uses Google AdSense, a third-party advertising service, to show ads on some pages. Google and its partners use cookies (including the DoubleClick cookie) to serve ads based on your visits to this and other websites and to measure ad performance. Google's use of advertising cookies lets it and its partners show you personalised ads.</p>
      <p>You can opt out of personalised advertising at <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">Google Ads Settings</a>, or opt out of many third-party advertising cookies at <a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer">www.aboutads.info</a>. You can also block or delete cookies in your browser; the core tools still work without advertising cookies.</p>
      <p>We also use essential cookies and local storage to keep you signed in and remember your preferences. These are only functional and are never sold or shared with advertisers.</p>

      <h2 id="security">Security</h2>
      <p>All traffic between your browser and CV Mind is encrypted with TLS. Passwords are hashed, and access to our database is restricted. No system is completely secure, so please use a strong password and tell us at {mail} if you suspect someone else has used your account.</p>

      <h2 id="retention">Keeping and deleting your data</h2>
      <p>We keep your account details and saved documents for as long as your account is open. You can delete any saved document from My Documents at any time.</p>
      <p>You can delete your whole account from Account → Your Profile → Delete account. This permanently removes your profile, your saved documents and your sign-in records. We may keep payment records where the law requires us to.</p>

      <h2 id="rights">Your choices and rights</h2>
      <p>Depending on where you live, including under India's Digital Personal Data Protection Act, 2023, you may have the right to:</p>
      <ul>
        <li>Access the personal information we hold about you.</li>
        <li>Correct information that is wrong or incomplete.</li>
        <li>Delete your information.</li>
        <li>Withdraw consent where we rely on it.</li>
        <li>Raise a complaint about how we handle your information.</li>
      </ul>
      <p>You can change most details yourself on your Account page. For anything else, email {mail} from your registered email address and we will reply within 30 days.</p>

      <h2 id="children">Children</h2>
      <p>The Services are meant for job seekers and are not directed at children under 16. We do not knowingly collect information from children. If you think a child has given us personal information, contact us and we will delete it.</p>

      <h2 id="changes">Changes to this policy</h2>
      <p>We may update this policy from time to time. The "Last updated" date at the top shows when it last changed, and we will email registered users about significant changes.</p>

      <h2 id="contact">Contact us</h2>
      <p>For privacy questions or requests, email {mail} or visit the {pageLink('help-center', 'Help Desk')}.</p>
    </LegalLayout>
  );
}
