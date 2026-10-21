import { useState, type MouseEvent } from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { urlForPage } from '../lib/hosts';
import { openLearnWithLeo } from '../lib/leoAccess';
import { LeoAvatar } from '../components/ResumeOnboarding';
import planShot from '../assets/learn-leo/plan.webp';
import boardShot from '../assets/learn-leo/board-code.webp';
import checkShot from '../assets/learn-leo/checkpoint.webp';
import phoneShot from '../assets/learn-leo/phone.webp';
import './LearnWithLeoLanding.css';

// Public page for Learn with Leo (www.cvmind.in/ai-tutor). The lessons run on the app host
// ('learn-with-leo'). While it is in testing, buttons show "coming soon" to accounts without access.
// The pictures are screenshots of a real lesson, not mock-ups.

const TOPICS = [
  'Arrays and two pointers', 'Binary search', 'Recursion', 'Linked lists', 'Stacks and queues', 'Trees and BST',
  'Graphs (BFS/DFS)', 'Hashing', 'Sorting', 'DBMS normalisation', 'OOP pillars', 'OS processes vs threads',
  'REST APIs', 'React hooks', 'Git basics'
];

const FAQS = [
  { q: 'When can I use it?', a: "Learn with Leo is with a small test group right now. It opens to every CVMind account soon, and you'll see it in the Career menu when it does." },
  { q: 'What can Leo teach?', a: 'Technical topics for placements and internships: data structures and algorithms, DBMS, OOP, operating systems, REST APIs, React and Git. You can also type any other technical topic. Non-technical subjects and system design are not covered yet.' },
  { q: 'Will it be free?', a: 'Free accounts will get 1 new lesson a day and CVMind Pro up to 10. Replaying a lesson you already started is always free.' },
  { q: 'Which language does Leo speak?', a: 'English. Hinglish lessons are coming later.' },
  { q: 'Does Leo give away answers to coding problems?', a: "No. When you are stuck on a CVMind Code problem, Leo explains the idea behind it, dry-runs your failing test and points at the part of your code that goes wrong. The full approach unlocks only after the last checkpoint, and that solution is run against the problem's tests first." },
  { q: 'What if a lesson gets something wrong?', a: 'JavaScript on the board is checked for errors before it is shown, but an AI tutor can still make a mistake. Every part of a lesson has a "Report a mistake" link.' }
];

export default function LearnWithLeoLanding() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const appUrl = urlForPage('learn-with-leo');

  // Links stay real links (for crawlers and new tabs); a click checks access first
  const gate = (href: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    void openLearnWithLeo(() => { window.location.assign(href); });
  };
  const topicUrl = (topic: string) => `${appUrl}?${new URLSearchParams({ topic }).toString()}`;

  return (
    <div className="llm">
      <section className="llm-hero">
        <div className="llm-wrap llm-hero-grid">
          <div className="llm-hero-copy">
            <p className="llm-eyebrow"><LeoAvatar size={28} pose="guide" /> Learn with Leo <span className="llm-soon">Coming soon</span></p>
            <h1>A tutor that talks you through it, <span className="llm-hand">and draws it out.</span></h1>
            <p className="llm-lead">
              Pick a topic like binary search or DBMS normalisation. Leo makes a short plan, then explains one idea at a time,
              out loud, writing the code and diagrams on a board as he says them. A quick question checks you got it.
            </p>
            <div className="llm-cta-row">
              <a className="llm-btn" href={appUrl} onClick={gate(appUrl)}>Try Learn with Leo <ArrowRight size={17} /></a>
              <span className="llm-note">Opening to everyone soon · 1 free lesson a day</span>
            </div>
          </div>
          <div className="llm-hero-shots" aria-hidden="true">
            <img className="llm-shot llm-shot--plan" src={planShot} alt="" width={1200} height={978} />
            <img className="llm-shot llm-shot--phone" src={phoneShot} alt="" width={780} height={1688} />
          </div>
        </div>
      </section>

      <section className="llm-rows">
        <div className="llm-wrap">
          <article className="llm-row">
            <div className="llm-row-copy">
              <span className="llm-num">01</span>
              <h2>The board fills in as he talks</h2>
              <p>
                When Leo says "low" and "high", the code with low and high appears. Bullets, formulas, tables and small diagrams
                come in the same way, one at a time. Captions run underneath, and you can pause, replay a part or go 1.5×.
              </p>
            </div>
            <figure className="llm-row-shot">
              <img src={boardShot} alt="The lesson board showing three bullet points and a JavaScript binary search function" loading="lazy" width={1400} height={476} />
            </figure>
          </article>

          <article className="llm-row llm-row--flip">
            <div className="llm-row-copy">
              <span className="llm-num">02</span>
              <h2>A question before moving on</h2>
              <p>
                Once or twice a lesson, Leo stops and asks you something. Get it right and he carries on. Get it wrong and he
                explains it again from a different angle, so you don't move on with a gap.
              </p>
            </div>
            <figure className="llm-row-shot">
              <img src={checkShot} alt="A checkpoint question about binary search with the right answer marked and a one-line explanation" loading="lazy" width={1400} height={485} />
            </figure>
          </article>
        </div>
      </section>

      <section className="llm-where">
        <div className="llm-wrap">
          <h2>Where you'll find Leo in CVMind</h2>
          <div className="llm-where-grid">
            <div>
              <h3>Skill Gaps & Courses</h3>
              <p>Each weak skill in your results gets a "Learn with Leo" button that starts a lesson on it.</p>
            </div>
            <div>
              <h3>CVMind Code</h3>
              <p>"Stuck? Learn with Leo" sits next to Run and Submit. Hints and a dry run of your failing test, not the answer.</p>
            </div>
            <div>
              <h3>Interview Prep AI</h3>
              <p>Finish a lesson and start a technical mock interview on the same topic, to say it out loud.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="llm-topics-section">
        <div className="llm-wrap llm-topics-grid">
          <div>
            <h2>First topics</h2>
            <p>The ones that come up most in placement rounds. You can type any other technical topic too.</p>
          </div>
          <ul className="llm-topic-list">
            {TOPICS.map((t) => <li key={t}><a href={topicUrl(t)} onClick={gate(topicUrl(t))}>{t}</a></li>)}
          </ul>
        </div>
      </section>

      <section className="llm-faq-section">
        <div className="llm-wrap llm-faq-wrap">
          <h2>Questions</h2>
          <div className="llm-faq">
            {FAQS.map((f, i) => (
              <div key={f.q} className={`llm-faq-item${openFaq === i ? ' is-open' : ''}`}>
                <button type="button" onClick={() => setOpenFaq(openFaq === i ? null : i)} aria-expanded={openFaq === i}>
                  <span>{f.q}</span><ChevronDown size={18} />
                </button>
                {openFaq === i && <p>{f.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="llm-final">
        <div className="llm-wrap llm-final-inner">
          <LeoAvatar size={72} pose="idea" />
          <div>
            <h2>Leo is almost ready</h2>
            <p>Lessons open to every CVMind account soon. Free accounts get 1 a day.</p>
          </div>
          <a className="llm-btn llm-btn--light" href={appUrl} onClick={gate(appUrl)}>Try Learn with Leo <ArrowRight size={17} /></a>
        </div>
      </section>
    </div>
  );
}
