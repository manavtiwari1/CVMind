import { useMemo, useState, type ReactNode } from 'react';
import { Search, ChevronRight, Rocket, FileText, UserCog, CreditCard, ShieldCheck, MessageSquare } from 'lucide-react';
import cvmindIcon from '../assets/cvmind_icon.png';
import HelpContact from './HelpContact';
import { PRICING_LOCKED } from '../lib/pricing';
import { LEGAL_PAGES } from '../data/legalPages';
import './HelpCenter.css';

interface HelpCenterProps {
  setCurrentPage: (page: string) => void;
  /** 'contact' opens the contact form (the /contact address). */
  page?: 'help-center' | 'contact';
}

interface Article {
  q: string;
  a: string;
  link?: { label: string; page: string };
}

interface Topic {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  articles: Article[];
}

const TOPICS: Topic[] = [
  {
    id: 'start',
    description: 'Create your first resume, import what you already have and check your ATS score',
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
    description: 'Templates, sections, photos and downloading your resume as a PDF',
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
    description: 'Sign-in, passwords, profile details and deleting your account',
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
    description: 'What the Free and Pro plans include, prices and refunds',
    title: 'Plans & billing',
    icon: <CreditCard size={20} />,
    articles: [
      {
        q: 'What is included in the Free plan?',
        a: "The Resume Checker, the Resume Builder with its free templates and cover letter designs, AI Proofreading, the LinkedIn and career tools, and CVMind Code's concept, approach, algorithm and pseudocode hints. Each week you also get 1 AI cover letter, 2 Resume Tailor runs, 2 portfolios, 1 interview prep session, 1 voice interview, and 2 code explanations and 2 full solutions. Free accounts get 75,000 AI tokens every 3 days, and free resumes and cover letters carry a small CVMind footer.",
        ...(PRICING_LOCKED ? {} : { link: { label: 'Compare plans', page: 'pricing' } }),
      },
      PRICING_LOCKED
        ? {
            q: 'How much does Pro cost?',
            a: "Pro isn't available yet. We're finishing our paid plans and will share prices when they launch. Everything on the Free plan works today.",
          }
        : {
            q: 'How much does Pro cost?',
            a: "Pro is ₹39 for 3 days, ₹79 for 7 days, ₹189 a month, ₹600 for 6 months or ₹1,099 a year. It unlocks every resume template and cover letter design, removes the CVMind footer, lifts the weekly limits and raises your AI tokens to 2,00,000 every 3 days. You pay once through Cashfree (UPI, cards or netbanking) and it doesn't renew on its own.",
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
    description: 'How your data is used and who can see what you share',
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

// Shown in the "Popular articles" card on the Help Center home, as topicId:articleIndex
const POPULAR = ['start:0', 'builder:0', 'start:1', 'account:0', 'billing:1', 'billing:2', 'account:3'];

type View =
  | { kind: 'home' }
  | { kind: 'topic'; topicId: string }
  | { kind: 'article'; topicId: string; index: number };

interface ArticleRef {
  topicId: string;
  index: number;
  article: Article;
}

const findTopic = (id: string) => TOPICS.find(t => t.id === id);

// Links in the Help Desk's own footer, which stands in for the site footer here
const FOOTER_LINKS = [
  { label: 'FAQs', page: 'faq' },
  { label: 'Blog', page: 'blog' },
  { label: 'About Us', page: 'about' },
  ...LEGAL_PAGES,
];

export default function HelpCenter({ setCurrentPage, page = 'help-center' }: HelpCenterProps) {
  const [query, setQuery] = useState('');
  const [view, setView] = useState<View>({ kind: 'home' });
  const isContact = page === 'contact';

  const go = (next: View) => {
    // Leaving the contact form goes back to the /help-center address
    if (isContact) setCurrentPage('help-center');
    setView(next);
    setQuery('');
    window.scrollTo({ top: 0 });
  };

  const openContact = () => {
    setQuery('');
    setCurrentPage('contact');
  };

  const popular = useMemo(
    () =>
      POPULAR.map(ref => {
        const [topicId, i] = ref.split(':');
        const article = findTopic(topicId)?.articles[Number(i)];
        return article ? { topicId, index: Number(i), article } : null;
      }).filter((x): x is ArticleRef => x !== null),
    []
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return TOPICS.flatMap(t =>
      t.articles
        .map((article, index) => ({ topicId: t.id, topicTitle: t.title, index, article }))
        .filter(({ article }) => article.q.toLowerCase().includes(q) || article.a.toLowerCase().includes(q))
    );
  }, [query]);

  const articleRow = (key: string, title: string, onClick: () => void, sub?: string) => (
    <li key={key}>
      <button type="button" className="help-row" onClick={onClick}>
        <span className="help-row-text">
          <span className="help-row-title">{title}</span>
          {sub && <span className="help-row-sub">{sub}</span>}
        </span>
        <ChevronRight size={16} className="help-row-chevron" />
      </button>
    </li>
  );

  const openArticle = (topicId: string, index: number) => () => go({ kind: 'article', topicId, index });

  const renderHome = () => (
    <>
      <section className="help-card">
        <h2 className="help-card-title">Popular articles</h2>
        <ul className="help-rows">
          {popular.map(p => articleRow(`${p.topicId}:${p.index}`, p.article.q, openArticle(p.topicId, p.index)))}
        </ul>
      </section>

      <div className="help-collections">
        {TOPICS.map(t => (
          <button key={t.id} type="button" className="help-collection" onClick={() => go({ kind: 'topic', topicId: t.id })}>
            <span className="help-collection-icon">{t.icon}</span>
            <span className="help-collection-title">{t.title}</span>
            <span className="help-collection-desc">{t.description}</span>
            <span className="help-collection-count">{t.articles.length} articles</span>
          </button>
        ))}
      </div>
    </>
  );

  const renderTopic = (topic: Topic) => (
    <>
      <nav className="help-crumbs" aria-label="Breadcrumb">
        <button type="button" onClick={() => go({ kind: 'home' })}>All collections</button>
        <ChevronRight size={14} />
        <span>{topic.title}</span>
      </nav>
      <header className="help-topic-head">
        <span className="help-collection-icon">{topic.icon}</span>
        <h1>{topic.title}</h1>
        <p>{topic.description}</p>
        <span className="help-collection-count">{topic.articles.length} articles</span>
      </header>
      <section className="help-card">
        <ul className="help-rows">
          {topic.articles.map((a, i) => articleRow(String(i), a.q, openArticle(topic.id, i)))}
        </ul>
      </section>
    </>
  );

  const renderArticle = (topic: Topic, index: number) => {
    const article = topic.articles[index];
    const related = topic.articles.map((a, i) => ({ a, i })).filter(({ i }) => i !== index);
    return (
      <>
        <nav className="help-crumbs" aria-label="Breadcrumb">
          <button type="button" onClick={() => go({ kind: 'home' })}>All collections</button>
          <ChevronRight size={14} />
          <button type="button" onClick={() => go({ kind: 'topic', topicId: topic.id })}>{topic.title}</button>
        </nav>
        <article className="help-article">
          <h1>{article.q}</h1>
          <p>{article.a}</p>
          {article.link && (
            <button type="button" className="help-article-link" onClick={() => setCurrentPage(article.link!.page)}>
              {article.link.label}
              <ChevronRight size={16} />
            </button>
          )}
        </article>
        {related.length > 0 && (
          <section className="help-card">
            <h2 className="help-card-title">More in {topic.title}</h2>
            <ul className="help-rows">
              {related.map(({ a, i }) => articleRow(String(i), a.q, openArticle(topic.id, i)))}
            </ul>
          </section>
        )}
      </>
    );
  };

  const renderResults = () => (
    <section className="help-card">
      <h2 className="help-card-title">
        {results.length} {results.length === 1 ? 'result' : 'results'} for "{query.trim()}"
      </h2>
      {results.length === 0 ? (
        <p className="help-empty">No articles match your search. Try other words, or contact us below.</p>
      ) : (
        <ul className="help-rows">
          {results.map(r => articleRow(`${r.topicId}:${r.index}`, r.article.q, openArticle(r.topicId, r.index), r.topicTitle))}
        </ul>
      )}
    </section>
  );

  const renderView = () => {
    if (query.trim()) return renderResults();
    if (isContact) {
      return (
        <>
          <nav className="help-crumbs" aria-label="Breadcrumb">
            <button type="button" onClick={() => go({ kind: 'home' })}>All collections</button>
            <ChevronRight size={14} />
            <span>Contact us</span>
          </nav>
          <HelpContact />
        </>
      );
    }
    if (view.kind === 'home') return renderHome();
    const topic = findTopic(view.topicId);
    if (!topic) return renderHome();
    if (view.kind === 'topic') return renderTopic(topic);
    return topic.articles[view.index] ? renderArticle(topic, view.index) : renderTopic(topic);
  };

  return (
    <div className="help-page">
      <header className="help-top">
        <div className="help-inner help-top-inner">
          <button type="button" className="help-top-brand" onClick={() => setCurrentPage('home')} aria-label="CVMind home">
            <img src={cvmindIcon} alt="" />
            <span>CVMind</span>
          </button>
          <nav className="help-top-links" aria-label="Your account">
            <button type="button" onClick={() => setCurrentPage('my-documents')}>My Documents</button>
            <button type="button" onClick={() => setCurrentPage('account')}>Account</button>
            <button type="button" onClick={() => setCurrentPage('account?tab=billing')}>Billing &amp; Subscription Management</button>
            <button type="button" onClick={openContact}>Contact us</button>
          </nav>
        </div>
      </header>

      <section className="help-hero">
        <div className="help-inner">
          <span className="help-hero-eyebrow">Help Desk</span>
          <h1 className="help-hero-title">Answers to frequently asked questions about your CV Mind account</h1>
          <label className="help-search">
            <Search size={20} />
            <input
              type="search"
              placeholder="Search for articles..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              aria-label="Search help articles"
            />
          </label>
        </div>
      </section>

      <div className="help-inner help-body">
        {renderView()}

        {!isContact && (
          <section className="help-reach">
            <span className="help-collection-icon"><MessageSquare size={20} /></span>
            <div>
              <h2>Still need help?</h2>
              <p>Send us a message and we will reply by email, usually within 24 hours.</p>
            </div>
            <button type="button" className="help-article-link" onClick={openContact}>
              Contact us <ChevronRight size={16} />
            </button>
          </section>
        )}
      </div>

      <footer className="help-foot">
        <div className="help-inner help-foot-inner">
          <nav aria-label="More from CV Mind">
            {FOOTER_LINKS.map(l => (
              <button key={l.page} type="button" onClick={() => setCurrentPage(l.page)}>{l.label}</button>
            ))}
          </nav>
          <span>&copy; {new Date().getFullYear()} CVMind</span>
        </div>
      </footer>
    </div>
  );
}
