import { useState, type MouseEvent } from 'react';
import { ArrowRight, Check, ChevronDown, Clock, Sparkles, X } from 'lucide-react';
import { urlForPage } from '../../lib/hosts';
import { APTITUDE_TESTS, openAptitude, type AptitudeTopic } from '../../lib/aptitude';
import { LeoAvatar } from '../../components/ResumeOnboarding';
import './Aptitude.css';

// Public page for Aptitude Tests (www.cvmind.in/aptitude). The tests run on the app host
// ('aptitude-practice'). While they are in testing, buttons show "coming soon" to accounts without access.

// A real question from the bank (backend aptitude/questions.js, id q-train-pole), shown as it appears in a test
const SAMPLE = {
  subtopic: 'Speed and distance',
  question: 'A train 150 m long passes a pole in 10 seconds. What is its speed in km/h?',
  options: ['45 km/h', '54 km/h', '60 km/h', '50 km/h'],
  picked: 0,
  answer: 1,
  explanation: 'To pass a pole the train covers its own length: 150 m in 10 s = 15 m/s. To convert m/s to km/h multiply by 18/5: 15 × 18/5 = 54 km/h.',
};

const STEPS = [
  { title: 'Pick a test', text: 'Quant, reasoning or verbal on its own, or a mixed mock with all three. Every test gets a fresh set of questions.' },
  { title: 'Answer against the clock', text: 'About a minute a question, the usual pace in placement aptitude rounds. Skip and come back from the question grid.' },
  { title: 'See every answer worked out', text: 'Your score by section, the right option for each question and the steps to get there. Stuck on one? Ask Leo to explain it.' },
];

const FAQS = [
  { q: 'When can I use it?', a: "Aptitude Tests are with a small test group right now. They open to every CVMind account soon, and you'll see them in the AI Tools menu when they do." },
  { q: 'Which companies is it for?', a: 'The sections most campus and off-campus aptitude rounds have: quantitative aptitude, logical reasoning and verbal ability. The questions are written by CVMind, not copied from any company\'s paper.' },
  { q: 'Will it be free?', a: 'Yes, you can start for free. Details of the free and Pro limits come with the launch.' },
  { q: 'Can Leo help with a question I got wrong?', a: 'Yes. Every answer on the result screen has an "Ask Leo" button that opens the question in the Leo chat, so you can ask for another way to solve it.' },
];

export default function AptitudeLanding() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const appUrl = urlForPage('aptitude-practice');
  const testUrl = (topic: AptitudeTopic) => `${appUrl}?${new URLSearchParams({ topic }).toString()}`;

  // Links stay real links (for crawlers and new tabs); a click checks access first
  const gate = (href: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    void openAptitude(() => { window.location.assign(href); });
  };

  return (
    <div className="apl">
      <section className="apl-hero">
        <div className="apl-wrap apl-hero-grid">
          <div>
            <p className="apl-eyebrow"><LeoAvatar size={28} pose="guide" /> Aptitude Tests <span className="apl-soon">Coming soon</span></p>
            <h1>Clear the aptitude round <span className="apl-hand">before the interview.</span></h1>
            <p className="apl-lead">
              Timed mock tests in quantitative aptitude, logical reasoning and verbal ability. Every answer is worked out
              step by step, and Leo explains any question you got wrong.
            </p>
            <div className="apl-cta-row">
              <a className="apl-btn" href={testUrl('mixed')} onClick={gate(testUrl('mixed'))}>Take a mock test <ArrowRight size={17} /></a>
              <span className="apl-note">Opening to everyone soon · free to start</span>
            </div>
          </div>

          {/* What a checked question looks like on the result screen */}
          <figure className="apl-sample" aria-label="A sample question with its worked answer">
            <div className="apl-sample-top">
              <span className="apl-chip">{SAMPLE.subtopic}</span>
              <span className="apl-sample-time"><Clock size={14} /> 1 min</span>
            </div>
            <p className="apl-sample-q">{SAMPLE.question}</p>
            <ul className="apl-sample-options">
              {SAMPLE.options.map((o, i) => (
                <li key={o} className={i === SAMPLE.answer ? 'is-right' : i === SAMPLE.picked ? 'is-wrong' : ''}>
                  <span className="apl-letter">{String.fromCharCode(65 + i)}</span> {o}
                  {i === SAMPLE.answer && <Check size={16} aria-label="Correct answer" />}
                  {i === SAMPLE.picked && i !== SAMPLE.answer && <X size={16} aria-label="Your answer" />}
                </li>
              ))}
            </ul>
            <figcaption className="apl-sample-why"><strong>How to solve it</strong>{SAMPLE.explanation}</figcaption>
          </figure>
        </div>
      </section>

      <section className="apl-tests">
        <div className="apl-wrap">
          <h2>Four tests to start with</h2>
          <div className="apl-test-grid">
            {APTITUDE_TESTS.map((t) => (
              <a key={t.id} className="apl-test" href={testUrl(t.id)} onClick={gate(testUrl(t.id))}>
                <strong>{t.label}</strong>
                <span>{t.desc}</span>
                <small>{t.questions} questions · about {t.questions} min <ArrowRight size={14} /></small>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="apl-steps">
        <div className="apl-wrap">
          <h2>How it works</h2>
          <ol className="apl-step-grid">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="apl-num">0{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
          <p className="apl-leo"><Sparkles size={16} /> You can also ask Leo in the chat: "aptitude ki practice karni hai".</p>
        </div>
      </section>

      <section className="apl-faq">
        <div className="apl-wrap apl-faq-wrap">
          <h2>Questions</h2>
          <div>
            {FAQS.map((f, i) => (
              <div key={f.q} className={`apl-faq-item${openFaq === i ? ' is-open' : ''}`}>
                <button type="button" aria-expanded={openFaq === i} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  {f.q} <ChevronDown size={18} />
                </button>
                {openFaq === i && <p>{f.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
