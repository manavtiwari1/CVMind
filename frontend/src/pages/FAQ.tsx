import { useMemo, useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { PRICING_LOCKED } from '../lib/pricing';
import './resources/Resources.css';
import './FAQ.css';

interface FAQProps {
  setCurrentPage: (page: string) => void;
}

interface QA {
  q: string;
  a: string;
  link?: { label: string; page: string };
}

interface Group {
  id: string;
  title: string;
  items: QA[];
}

const GROUPS: Group[] = [
  {
    id: 'general',
    title: 'General',
    items: [
      {
        q: 'What is CV Mind?',
        a: 'CV Mind is a set of AI tools for job seekers: a resume builder, an ATS resume checker, a resume tailorer, interview practice, LinkedIn tools and a job finder. You can use the core tools for free.',
        link: { label: 'About CV Mind', page: 'about' },
      },
      {
        q: 'Do I need an account?',
        a: 'No account is needed to check a resume on the home page. You need a free account to save documents, use the builder and run the other AI tools, so your work is kept between visits.',
      },
      {
        q: 'Does CV Mind guarantee I will get a job?',
        a: 'No. CV Mind helps you write a clearer resume and prepare for interviews, but hiring decisions depend on your experience, the role and the employer.',
        link: { label: 'Read the Disclaimer', page: 'disclaimer' },
      },
      {
        q: 'Which languages are supported?',
        a: 'CV Mind is available in English for now.',
      },
    ],
  },
  {
    id: 'resume',
    title: 'Resume builder & checker',
    items: [
      {
        q: 'How is the ATS score calculated?',
        a: 'The Resume Checker reads your resume the way screening software does, then rates how well each section is parsed, whether it has the keywords expected for the role, and how clear and specific your bullet points are. It lists what to fix, most important first.',
        link: { label: 'Check my resume', page: 'home' },
      },
      {
        q: 'Which file types can I upload?',
        a: 'PDF, DOCX and TXT files up to 5 MB. If your PDF was exported as an image (from some design tools), the text cannot be read; try selecting text in it first to check.',
      },
      {
        q: 'How do I download my resume?',
        a: 'In the editor, click Download and then Download as PDF. The PDF is text-based, so screening software can read every word. You can also have it emailed to you from the same window.',
      },
      {
        q: 'Can I start from the resume I already have?',
        a: 'Yes. When the builder asks if you already have a resume, choose Yes and upload it. Your details are pulled into the editor, so you do not have to retype them. You can also import your LinkedIn profile.',
        link: { label: 'Open the Resume Builder', page: 'resume-builder' },
      },
      {
        q: 'Can I change the template after writing my resume?',
        a: 'Yes. Open Templates in the editor and pick another one. Your content stays the same; only the design changes.',
      },
    ],
  },
  {
    id: 'tools',
    title: 'Interview & career tools',
    items: [
      {
        q: 'How does the Resume Tailorer work?',
        a: 'Paste a job description and upload your resume. The Tailorer compares the two, shows which skills and keywords are missing, and suggests rewritten sections that match the job without inventing experience.',
        link: { label: 'Open the Resume Tailorer', page: 'tailor' },
      },
      {
        q: 'What does Interview Prep AI do?',
        a: 'It writes interview questions from your resume and the job you are applying for, then gives feedback on your answers. Voice Prep AI does the same out loud and comments on how you speak.',
        link: { label: 'Practise an interview', page: 'prep' },
      },
      {
        q: 'Are AI Job Finder results live job postings?',
        a: 'The Job Finder suggests roles and companies that fit your profile. Its Apply button opens a LinkedIn Jobs search for that title, company and location, where you can find the current posting.',
      },
      {
        q: 'Should I use AI-written text as it is?',
        a: 'Always read it first. AI suggestions can be wrong or too general, so edit them until every line is true and sounds like you.',
      },
    ],
  },
  {
    id: 'account',
    title: 'Account & privacy',
    items: [
      {
        q: 'Where are my saved resumes?',
        a: 'In My Documents. Open the profile menu at the top right and choose My Documents. You can open, share or delete any document from there, on any device you sign in on.',
        link: { label: 'Go to My Documents', page: 'my-documents' },
      },
      {
        q: 'Do you keep the resume files I upload?',
        a: 'No. Uploaded files are read in memory and discarded once your result is ready. We keep the result, such as your score, and anything you choose to save in the builder.',
        link: { label: 'Read the Privacy Policy', page: 'privacy' },
      },
      {
        q: 'Is my resume used to train AI?',
        a: 'No. Your text is sent to our AI provider only to produce the feedback you ask for, and is not used to train any model.',
      },
      {
        q: 'How do I delete my account?',
        a: 'Go to Account → Your Profile and click Delete account. This permanently removes your profile and all saved documents and cannot be undone.',
      },
    ],
  },
  {
    id: 'billing',
    title: 'Plans & billing',
    items: [
      {
        q: 'What is included in the Free plan?',
        a: 'The Resume Builder with all templates, the Resume Checker, Interview Prep AI, the LinkedIn tools and 15,000 AI tokens that reset every 48 hours. Free resumes carry CV Mind branding and allow up to 12 items per section.',
        ...(PRICING_LOCKED ? {} : { link: { label: 'Compare plans', page: 'pricing' } }),
      },
      PRICING_LOCKED
        ? {
            q: 'How much does Pro cost?',
            a: "Pro isn't available yet. We're finishing our paid plans and will share prices when they launch. Everything on the Free plan works today.",
          }
        : {
            q: 'How much does Pro cost?',
            a: 'Pro is ₹250 a month, ₹800 every 3 months or ₹1,300 a year. It removes branding, unlocks Pro sections and unlimited items, and adds tools like the Resume Tailorer, Portfolio Generator and Voice Prep AI.',
            link: { label: 'See pricing', page: 'pricing' },
          },
      {
        q: 'Can I get a refund?',
        a: 'First-time Pro purchases have a 7-day money-back guarantee. Email us within 7 days of buying with your registered email and purchase date. Renewals are not refundable.',
        link: { label: 'Read the Refund Policy', page: 'refund-policy' },
      },
      {
        q: 'How do I cancel Pro?',
        a: 'Send us a message from the Help Desk with your registered email and we will cancel it. You keep Pro until the end of the period you have paid for, and you will not be charged again.',
        link: { label: 'Contact us', page: 'contact' },
      },
    ],
  },
];

export default function FAQ({ setCurrentPage }: FAQProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(GROUPS[0].id);

  const q = query.trim().toLowerCase();
  const groups = useMemo(
    () =>
      q
        ? GROUPS.map(g => ({ ...g, items: g.items.filter(i => i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q)) })).filter(g => g.items.length)
        : GROUPS,
    [q]
  );

  const jump = (id: string) => {
    setActive(id);
    document.getElementById(`faq-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="rsc faq">
      <h1 className="rsc-title">Frequently Asked Questions</h1>
      <p className="rsc-lede">Quick answers about CV Mind, your account and your plan.</p>

      <label className="faq-search">
        <Search size={18} />
        <input
          type="search"
          placeholder="Search questions"
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label="Search questions"
        />
      </label>

      <div className="faq-grid">
        <nav className="rsc-legal-nav" aria-label="FAQ topics">
          {GROUPS.map(g => (
            <button key={g.id} type="button" aria-current={active === g.id && !q ? 'page' : undefined} onClick={() => { setQuery(''); jump(g.id); }}>
              {g.title}
            </button>
          ))}
        </nav>

        <div className="faq-groups">
          {groups.length === 0 && (
            <p className="faq-empty">No questions match "{query.trim()}". Try other words, or ask us in the Help Desk.</p>
          )}
          {groups.map(g => (
            <section key={g.id} id={`faq-${g.id}`} className="faq-group">
              <h2>{g.title}</h2>
              {g.items.map(item => (
                <details key={item.q} className="faq-item" open={Boolean(q) || undefined}>
                  <summary>
                    <span>{item.q}</span>
                    <Plus size={18} className="faq-item-icon" aria-hidden="true" />
                  </summary>
                  <div className="faq-item-body">
                    <p>{item.a}</p>
                    {item.link && (
                      <button type="button" className="rsc-link" onClick={() => setCurrentPage(item.link!.page)}>{item.link.label}</button>
                    )}
                  </div>
                </details>
              ))}
            </section>
          ))}
        </div>
      </div>

      <section className="rsc-cta">
        <div>
          <h2>Still have a question?</h2>
          <p>Search the Help Desk for step-by-step answers, or send us a message and we will reply by email.</p>
        </div>
        <div className="rsc-cta-actions">
          <button type="button" className="rsc-btn" onClick={() => setCurrentPage('help-center')}>Go to the Help Desk</button>
        </div>
      </section>
    </div>
  );
}
