import { useMemo, useState, type ReactNode } from 'react';
import { Search, ChevronDown, Rocket, FileText, UserCog, CreditCard, ShieldCheck, MessageCircle } from 'lucide-react';
import ContactDialog from '../components/ContactDialog';
import './HelpCenter.css';

interface HelpCenterProps {
  setCurrentPage: (page: string) => void;
}

interface Article {
  q: string;
  a: string;
  link?: { label: string; page: string };
}

interface Topic {
  id: string;
  title: string;
  icon: ReactNode;
  articles: Article[];
}

const TOPICS: Topic[] = [
  {
    id: 'start',
    title: 'Getting started',
    icon: <Rocket size={20} />,
    articles: [
      {
        q: 'How do I create my first resume?',
        a: 'Open the Resume Builder and click Get Started. CV Mind asks a few quick questions about the job you want, then lets you pick a template and opens the editor, where you can fill in each section.',
        link: { label: 'Open Resume Builder', page: 'resume-builder' },
      },
      {
        q: 'Can I start from my existing resume?',
        a: 'Yes. When the builder asks whether you already have a resume, choose Yes and upload it. Your details are pulled into the editor so you don\'t have to type them again.',
      },
      {
        q: 'Can I import my LinkedIn profile?',
        a: 'Yes. In the builder\'s LinkedIn step, paste your profile URL (linkedin.com/in/...). If your profile is private, you can upload the PDF that LinkedIn lets you save from your profile instead.',
      },
      {
        q: 'How do I check my resume\'s ATS score?',
        a: 'Upload your resume on the home page. The Resume Checker scores how well it reads in Applicant Tracking Systems and lists what to fix.',
        link: { label: 'Check my resume', page: 'home' },
      },
    ],
  },
  {
    id: 'builder',
    title: 'Resume builder',
    icon: <FileText size={20} />,
    articles: [
      {
        q: 'How do I download my resume as a PDF?',
        a: 'In the resume editor, click Download and then Download as PDF. You can also have the PDF emailed to you from the same window.',
      },
      {
        q: 'Can I change the template after I\'ve written my resume?',
        a: 'Yes. Open Templates in the editor toolbar and pick another one. Your content stays the same; only the design changes. Use Design to adjust colours, fonts and spacing.',
      },
      {
        q: 'How do I add a photo to my resume?',
        a: 'Choose a template that has a photo, then hover over the photo in the preview and click the upload button to add your own image.',
      },
      {
        q: 'Where can I find resumes I saved earlier?',
        a: 'Open the profile menu (your avatar, top right), go to Account and then My Documents. From there you can open, share or delete any saved document.',
        link: { label: 'Go to My Documents', page: 'account' },
      },
    ],
  },
  {
    id: 'account',
    title: 'Account & settings',
    icon: <UserCog size={20} />,
    articles: [
      {
        q: 'I signed up with Google. How do I set a password?',
        a: 'Go to Account → Your Profile and click Set a Password. After that you can sign in with either Google or your email and password.',
        link: { label: 'Open Account', page: 'account' },
      },
      {
        q: 'How do I change my name, email or photo?',
        a: 'All of these are on Account → Your Profile. Edit your name and click Save changes, or use Change Email Address and Upload photo.',
        link: { label: 'Open Account', page: 'account' },
      },
      {
        q: 'Which languages does CV Mind support?',
        a: 'CV Mind is available in English for now. We\'re working on more languages.',
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
    icon: <CreditCard size={20} />,
    articles: [
      {
        q: 'What is included in the Free plan?',
        a: 'The Free plan includes the Resume Builder with all templates, the Resume Checker, Interview Prep AI, the LinkedIn tools and 15,000 AI tokens that reset every 48 hours. Free resumes carry CV Mind branding and allow up to 12 items per section.',
        link: { label: 'Compare plans', page: 'pricing' },
      },
      {
        q: 'How much does Pro cost?',
        a: 'Pro is ₹250 a month, ₹800 every 3 months, or ₹1,300 a year (about ₹108 a month). Pro removes branding, unlocks Pro sections and unlimited items, and adds tools like Resume Tailor, Portfolio Generator and Voice Practice AI.',
        link: { label: 'See pricing', page: 'pricing' },
      },
      {
        q: 'Can I get a refund?',
        a: 'First-time Pro purchases have a 7-day money-back guarantee. Contact us within 7 days of buying with your registered email and purchase date. Renewals are not refundable.',
        link: { label: 'Read the refund policy', page: 'refund-policy' },
      },
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy & security',
    icon: <ShieldCheck size={20} />,
    articles: [
      {
        q: 'How is my data used?',
        a: 'Your resume content is used to provide the features you ask for, such as scoring, editing and AI suggestions. Our Privacy Policy explains what we collect and how we handle it.',
        link: { label: 'Read the Privacy Policy', page: 'privacy' },
      },
      {
        q: 'Who can see my shared portfolio link?',
        a: 'Anyone who has the link. Only share it with people you want to see your resume, and delete the document from My Documents if you want the link to stop working.',
      },
    ],
  },
];

export default function HelpCenter({ setCurrentPage }: HelpCenterProps) {
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState<string>('all');
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [contactOpen, setContactOpen] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TOPICS
      .filter(t => topic === 'all' || t.id === topic || q)
      .map(t => ({
        ...t,
        articles: q
          ? t.articles.filter(a => a.q.toLowerCase().includes(q) || a.a.toLowerCase().includes(q))
          : t.articles,
      }))
      .filter(t => t.articles.length > 0);
  }, [query, topic]);

  return (
    <div className="help-page">
      <section className="help-hero">
        <h1 className="help-hero-title">How can we help?</h1>
        <label className="help-search">
          <Search size={18} />
          <input
            type="search"
            placeholder="Search for answers"
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="Search help articles"
          />
        </label>
      </section>

      <div className="help-body">
        {!query && (
          <div className="help-topics" role="tablist" aria-label="Help topics">
            {TOPICS.map(t => (
              <button
                key={t.id}
                role="tab"
                aria-selected={topic === t.id}
                className={`help-topic${topic === t.id ? ' active' : ''}`}
                onClick={() => setTopic(topic === t.id ? 'all' : t.id)}
              >
                <span className="help-topic-icon">{t.icon}</span>
                <span className="help-topic-title">{t.title}</span>
                <span className="help-topic-count">{t.articles.length} articles</span>
              </button>
            ))}
          </div>
        )}

        {visible.length === 0 ? (
          <p className="help-empty">No articles match "{query}". Try another search, or contact us below.</p>
        ) : (
          visible.map(t => (
            <section key={t.id} className="help-section">
              <h2 className="help-section-title">{t.title}</h2>
              <div className="help-list">
                {t.articles.map(a => {
                  const key = `${t.id}:${a.q}`;
                  const open = openKey === key || Boolean(query);
                  return (
                    <div key={key} className={`help-item${open ? ' open' : ''}`}>
                      <button className="help-q" aria-expanded={open} onClick={() => setOpenKey(openKey === key ? null : key)}>
                        <span>{a.q}</span>
                        <ChevronDown size={18} className="help-q-chevron" />
                      </button>
                      {open && (
                        <div className="help-a">
                          <p>{a.a}</p>
                          {a.link && (
                            <button className="help-a-link" onClick={() => setCurrentPage(a.link!.page)}>
                              {a.link.label} →
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}

        <section className="help-contact">
          <MessageCircle size={26} className="help-contact-icon" />
          <div className="help-contact-text">
            <h2>Still need help?</h2>
            <p>Message us on WhatsApp or send an email and the CV Mind team will get back to you.</p>
          </div>
          <button className="help-contact-btn" onClick={() => setContactOpen(true)}>Contact us</button>
        </section>
      </div>

      <ContactDialog open={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
}
