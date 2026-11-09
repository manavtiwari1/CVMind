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
  { id: 'leo', label: 'Leo, your Career Profile and background work' },
  { id: 'share', label: 'Who we share it with' },
  { id: 'placements', label: 'Colleges and the Placements Portal' },
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
    <LegalLayout page="privacy" title="Privacy Policy" updated="November 10, 2026" setCurrentPage={setCurrentPage} toc={TOC}>
      <h2>Introduction</h2>
      <p>This Privacy Policy explains how CV Mind ("<strong>we</strong>", "<strong>us</strong>" or "<strong>our</strong>") collects, uses, stores and shares your information when you use our website at <a href="https://www.cvmind.in" target="_blank" rel="noopener noreferrer">https://www.cvmind.in</a>, the CV Mind app and our other services ("<strong>Services</strong>").</p>
      <p><strong>Questions or concerns?</strong> Reading this policy will help you understand your privacy rights and choices. If you do not agree with how we handle your information, please do not use the Services. If you still have questions, email us at <strong>{SUPPORT_EMAIL}</strong>.</p>

      <h3>Summary of key points</h3>
      <ul>
        <li><strong>Uploaded resume files are not kept.</strong> We read them in memory to score or rewrite them, then discard the file. We keep the result (such as your score), not the file. If you attach a resume in the Leo chat, its text is kept in your Career Profile until you delete it.</li>
        <li><strong>Leo remembers details across your chats</strong> in a Career Profile that you can see, change or delete at any time, and keeps working on a mission you started after you close the chat. Leo never applies, posts, sends or pays for you.</li>
        <li><strong>Documents you save are stored in your account</strong> so you can open them on any device. Only you can see them unless you share a link, or you join your college on our Placements Portal.</li>
        <li><strong>Your college sees your resumes and scores only if you agree.</strong> If your college invites you to CVMind, it sees nothing from your account until you accept, and you can leave at any time.</li>
        <li><strong>Your text is sent to an AI model</strong> to produce the feedback you ask for. We do not use your content to train AI models.</li>
        <li><strong>We do not sell your personal information.</strong> Your resumes, chats and saved documents are never given to anyone for advertising or marketing.</li>
        <li><strong>Some pages show Google ads</strong>, which use cookies. You can opt out of personalised ads.</li>
      </ul>

      <h2 id="collect">What we collect</h2>
      <h3>Information you give us</h3>
      <ul>
        <li><strong>Account details:</strong> your name, email address and password (stored as a secure hash, never in plain text). If you sign in with Google, we receive your name, email address and profile photo from Google.</li>
        <li><strong>Profile details:</strong> anything you add to your profile, such as a photo or address.</li>
        <li><strong>Documents and content:</strong> resumes, cover letters and portfolios you save, and the text you type into our tools (for example a job description, interview answers or a LinkedIn profile).</li>
        <li><strong>Leo chats and Career Profile:</strong> what you write to Leo and its replies, your Career Profile, the missions and reminders you set up, and which tools you have connected. See <a href="#leo" onClick={e => { e.preventDefault(); document.getElementById('leo')?.scrollIntoView({ behavior: 'smooth' }); }}>Leo, your Career Profile and background work</a>.</li>
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
      <p>A resume you attach in the Leo chat is handled differently: the file is read and discarded in the same way, but the text from it is saved with that chat and in your Career Profile, so Leo can use it later.</p>

      <h2 id="use">How we use your information</h2>
      <ul>
        <li>To provide the Services: scoring, editing, AI suggestions, saving your documents and syncing them across devices.</li>
        <li>To run your account, apply plan limits and process payments.</li>
        <li>To reply to your messages and send service emails such as password resets and welcome emails.</li>
        <li>To keep the Services secure and investigate misuse.</li>
        <li>To understand which features are used so we can improve them.</li>
      </ul>

      <h2 id="ai">AI processing</h2>
      <p>Our AI features send the text needed for your request (for example your resume text and a job description) to the AI service providers we work with, which return the feedback or draft you asked for. We use these services through their APIs, and we do not use your resumes, prompts or answers to train any AI model. Some of these providers process data on servers outside India.</p>

      <p><strong>AI Job Finder.</strong> To find jobs, the role and city you search for are sent to our job listings providers (JSearch, through RapidAPI, and Adzuna); your resume is not. We save the resume and preferences you choose for Job Finder, and the jobs you tell us you applied to, with the date, so the same job can show that you already applied. If you apply to a job a recruiter posted on CVMind, your name, email, phone and resume text are sent to that recruiter. Deleting your account removes your Job Finder records.</p>

      <h2 id="leo">Leo, your Career Profile and background work</h2>
      <p>Leo is the assistant in the CV Mind chat. This section explains what it keeps and what it does when you are signed in. If you are not signed in, your chat stays in your browser tab, and we keep only usage counts, never what you wrote.</p>

      <h3>Your Career Profile</h3>
      <p>So that you don't have to repeat yourself, Leo keeps one Career Profile for your account. It can hold the text of the resume you attached, your name and contact details, your target role, education, work, projects, skills and achievements, and a note of whether each item came from your resume or from you.</p>
      <p>The details are filled in from a resume you attach in the chat, which is read by our AI provider, and from what you tell Leo. A LinkedIn profile PDF you attach for an audit does not replace your saved resume. A short summary of your profile is sent to our AI provider with your messages, and your saved resume text is sent when a tool you ask for needs it.</p>
      <p>You can see, change or delete your Career Profile on your Account page, or ask Leo to show it and use the Delete button. Deleting it removes it straight away. If you attach a resume in the chat afterwards, a new profile is saved and Leo tells you so.</p>

      <h3>Chats, missions and background work</h3>
      <p>Your chats with Leo are saved to your account. A mission is a job with several steps that you start yourself with the Start button, such as finding jobs and preparing applications. We save its plan, each step's result and the AI usage. Once you start a mission, it can keep running on our servers after you close the chat, and it stops if you press Stop.</p>
      <p>Leo prepares work for you to review. It does not apply to jobs, publish, post, send messages or make payments on your behalf. If you use the CV Mind browser extension, it fills a form on the employer's site only when you ask it to, using your details and your application pack, and you decide whether to submit it. Whatever you submit goes to that employer under its own privacy policy.</p>
      <p>We also record which tools you have connected in Connectors. Leo can use only those tools for you, and you can disconnect them at any time.</p>

      <h3>Reminders and job alerts</h3>
      <p>Leo sets an email reminder or turns on job alert emails only when you ask. For a reminder we keep its text, its time and your email address, and you can cancel it before it is sent. Every job alert email has an unsubscribe link.</p>

      <h3>How long this is kept</h3>
      <p>Chats, missions and reminders are deleted automatically 12 months after they were created. Deleting a chat removes its text and its missions. Your Career Profile and connected tools stay until you delete them or your account.</p>

      <h2 id="share">Who we share it with</h2>
      <p>We do not sell or rent your personal information, and we never give your resumes, chats or saved documents to anyone for advertising or marketing. To run CV Mind we rely on a small number of service providers, and we send them only what they need to deliver the feature you asked for:</p>
      <div className="rsc-table-wrap">
        <table>
          <thead>
            <tr><th>Provider</th><th>What for</th><th>What they receive</th></tr>
          </thead>
          <tbody>
            <tr><td>AI service providers</td><td>AI feedback, writing and the Leo chat</td><td>The text of your request, and your Career Profile and resume text when Leo needs them</td></tr>
            <tr><td>Cloud hosting provider</td><td>Securely storing our database</td><td>Account details, saved documents, Leo chats, your Career Profile and usage records</td></tr>
            <tr><td>Resend</td><td>Sending emails</td><td>Your email address and the email content</td></tr>
            <tr><td>Google Sign-In</td><td>Signing in with Google</td><td>Handled by Google; we receive your name, email and photo</td></tr>
            <tr><td>Google AdSense</td><td>Showing ads on some pages</td><td>Cookie and device data, as described below</td></tr>
          </tbody>
        </table>
      </div>
      <p>We may also disclose information if the law requires it, or to protect the rights and safety of our users and the Services.</p>
      <p>If you share a portfolio link, anyone with that link can see that portfolio.</p>
      <p>If you accept an invitation from your college, that college's placement team can see the information described in <a href="#placements" onClick={e => { e.preventDefault(); document.getElementById('placements')?.scrollIntoView({ behavior: 'smooth' }); }}>Colleges and the Placements Portal</a>.</p>

      <h2 id="placements">Colleges and the Placements Portal</h2>
      <p>Some colleges and universities use CV Mind for campus placements through our Placements Portal at placements.cvmind.in. This section applies to you if your college invites you, and to the college staff who use the portal.</p>

      <h3>When your college invites you</h3>
      <p>Your college gives us a list with your email address and, if it chooses, your name, roll number, branch and batch. We use this list only to email you an invitation and to show your college whether you have joined. Inviting you does not create a CV Mind account for you, and until you accept, your college sees only the details it gave us and the status of your invitation.</p>
      <p>You accept by signing in with the email address the invitation was sent to and agreeing to share your information with your college. Opening the invitation link also confirms that email address on your account. You can decline instead, and your college will not see anything from your account.</p>

      <h3>What your college can see after you accept</h3>
      <p>The placement officer and the staff your college adds to the portal can see:</p>
      <ul>
        <li>The resumes you build and save on CV Mind.</li>
        <li>Your ATS check results and scores. They see the report, not the text of the file you uploaded.</li>
        <li>Your LinkedIn profile review results and scores.</li>
        <li>Your score history, and the email address and details your college gave us.</li>
      </ul>
      <p>Your college cannot see your password, payments, cover letters, portfolios or other documents, or what you do in other CV Mind tools.</p>
      <p>Your college can approve your resume or ask for changes, and its comments appear on your Account page. It can also download your resumes as PDF files and export a spreadsheet of its students with their scores and review status. Once your college has downloaded or exported a copy, that copy is held by your college under its own policies, and we cannot delete it.</p>

      <h3>Only your own college</h3>
      <p>Each college sees only its own students. You can be linked to one college at a time. Another college cannot see you or find out which college you are linked to.</p>
      <p>While your college's plan with us is active, your account gets CV Mind Pro at no cost to you.</p>

      <h3>Ending the link</h3>
      <p>You can leave your college at any time from Account → My college. Your college can also remove you. Either way, your college stops seeing your resumes and scores straight away, and the free Pro from your college ends. Deleting your CV Mind account also ends the link and removes your college's reviews of your resumes.</p>
      <p>When a college's plan with us ends, its students lose the free Pro. The college can still view, but not change, its students' information for 30 days after the end date. After that, its staff can no longer sign in.</p>

      <h3>Access records and college staff</h3>
      <p>We record each time college staff open a student's profile, resume or report, download resumes or export the student list, along with the staff member's name and IP address. Your college can see this record for its own portal, and we use it to keep access accountable.</p>
      <p>For college staff accounts, we store the staff member's name, work email, a hashed password, sign-in times and the record above.</p>

      <h2 id="cookies">Advertising and cookies</h2>
      <p>CV Mind uses Google AdSense, a third-party advertising service, to show ads on some pages. Google and its partners use cookies (including the DoubleClick cookie) to serve ads based on your visits to this and other websites and to measure ad performance. Google's use of advertising cookies lets it and its partners show you personalised ads.</p>
      <p>You can opt out of personalised advertising at <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">Google Ads Settings</a>, or opt out of many third-party advertising cookies at <a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer">www.aboutads.info</a>. You can also block or delete cookies in your browser; the core tools still work without advertising cookies.</p>
      <p>We also use essential cookies and local storage to keep you signed in and remember your preferences. These are only functional and are never sold or shared with advertisers.</p>

      <h2 id="security">Security</h2>
      <p>All traffic between your browser and CV Mind is encrypted with TLS. Passwords are hashed, and access to our database is restricted. No system is completely secure, so please use a strong password and tell us at {mail} if you suspect someone else has used your account.</p>

      <h2 id="retention">Keeping and deleting your data</h2>
      <p>We keep your account details and saved documents for as long as your account is open. You can delete any saved document from My Documents at any time.</p>
      <p>You can delete your whole account from Account → Your Profile → Delete account. This permanently removes your profile, your saved documents, your sign-in records, your Leo chats, Career Profile, missions and reminders, and ends any link to a college on the Placements Portal. We may keep payment records where the law requires us to.</p>
      <p>A college's student list stays with that college until the college removes a student or its account with us is closed.</p>

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
