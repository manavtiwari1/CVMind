import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Building2, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock, CreditCard, Crown, Download, Landmark, LayoutTemplate, Loader2, Lock, Minus, Palette, ShieldCheck, Smartphone, Sparkles, SpellCheck, Target, X } from 'lucide-react';
import TemplatePreview from '../components/TemplatePreview';
import { SlotBanner } from '../components/SiteBanner';
import { CV_TEMPLATES } from '../data/cvTemplates';
import { withSampleData } from '../data/samplePreview';
import { LETTER_DESIGNS } from '../lib/coverLetter';
import { FALLBACK_LAUNCH, PRO_LETTER_IDS, PRO_TEMPLATE_IDS, formatInr, launchTimeText, launchTimes, loadPlans, startCheckout, userIsPro, verifyOrder, type LaunchTimes, type Plan } from '../lib/billing';
import { readUser, USER_CHANGE_EVENT } from '../lib/currentUser';
import { setContactSubject } from '../data/support';
import './Pricing.css';

interface PricingProps {
  setCurrentPage: (page: string) => void;
  isLoggedIn?: boolean;
  setShowAuthModal?: (show: boolean) => void;
}

// Same as backend/src/billing/plans.js; the server's list replaces it once loaded
const FALLBACK_PLANS: Plan[] = [
  { key: 'pass-3d', label: '3-day pass', price: 39, days: 3 },
  { key: 'pass-7d', label: '7-day pass', price: 79, days: 7 },
  { key: 'monthly', label: 'Monthly', price: 189, days: 30 },
  { key: 'half-yearly', label: '6 months', price: 600, days: 182 },
  { key: 'yearly', label: 'Yearly', price: 1099, days: 365 },
];

const PLAN_NOTES: Record<string, string> = {
  'pass-3d': 'One application sprint',
  'pass-7d': 'A week of interview prep',
  monthly: 'A full job search month',
  'half-yearly': 'Six months, one payment',
  yearly: 'The lowest price per day',
};

const PRO_TEMPLATES = CV_TEMPLATES.filter((t) => PRO_TEMPLATE_IDS.has(t.id));
const FREE_TEMPLATE_COUNT = CV_TEMPLATES.length - PRO_TEMPLATES.length;
const PRO_LETTERS = LETTER_DESIGNS.filter((d) => PRO_LETTER_IDS.has(d.id));
const FREE_LETTER_COUNT = LETTER_DESIGNS.length - PRO_LETTERS.length;

type Cell = string | boolean;
const COMPARE: { group: string; rows: [string, Cell, Cell][] }[] = [
  {
    group: 'Resume & cover letter',
    rows: [
      ['Resume Checker (ATS scan)', true, true],
      ['Resume templates', `${FREE_TEMPLATE_COUNT} templates`, `All ${CV_TEMPLATES.length}`],
      ['"Powered by CVMind" footer on downloads', 'Included', 'Removed'],
      ['Cover letter designs', `${FREE_LETTER_COUNT} designs`, `All ${LETTER_DESIGNS.length}`],
      ['AI cover letter generator', '1 a week', 'Unlimited'],
      ['Resume Tailor', '2 a week', 'Unlimited'],
      ['AI Proofreading', true, true],
      ['Resume share link with view count', true, true],
      ['Custom link name and where views come from', false, true],
    ],
  },
  {
    group: 'Interview & career',
    rows: [
      ['Interview Prep AI', '1 session a week', 'Unlimited'],
      ['Voice interview practice', '1 session a week', 'Unlimited'],
      ['Portfolio Generator', '2 a week', 'Unlimited'],
      ['Offer negotiation help', '1 a week', 'Unlimited'],
      ['LinkedIn & career tools', true, true],
    ],
  },
  {
    group: 'CVMind Code AI mentor',
    rows: [
      ['Concept, approach, algorithm & pseudocode hints', true, true],
      ['Code explanation', '2 a week', 'Unlimited'],
      ['Full solution', '2 a week', 'Unlimited'],
    ],
  },
  {
    group: 'AI usage',
    rows: [['AI tokens', '75,000 every 3 days', '2,00,000 every 3 days']],
  },
  {
    group: 'Job search',
    rows: [
      ['AI Job Finder applications', '1 a month, +1 per invited friend', 'Unlimited'],
      ['Job alert emails', 'Weekly', 'Daily or weekly'],
      ['AI Job Finder searches with every job source', '10 a day', 'Unlimited'],
      ['Auto Apply agent', 'Soon', 'Soon'],
    ],
  },
];

const FREE_LIST = [
  'Resume Checker and Resume Builder',
  `${FREE_TEMPLATE_COUNT} resume templates and ${FREE_LETTER_COUNT} cover letter designs`,
  'AI Proofreading',
  'LinkedIn and career tools',
  'Code hints up to pseudocode',
  'Weekly free tries of Tailor, AI cover letter, Portfolio and interview practice',
  'AI Job Finder: 1 job application a month',
  '75,000 AI tokens every 3 days',
];

const PRO_LIST = [
  `All ${CV_TEMPLATES.length} resume templates and ${LETTER_DESIGNS.length} cover letter designs`,
  'No CVMind footer on resumes and cover letters',
  'Unlimited Resume Tailor, AI cover letters and Portfolio Generator',
  'Unlimited interview and voice practice',
  'Unlimited code explanations and full solutions',
  'Unlimited AI Job Finder applications and searches',
  '2,00,000 AI tokens every 3 days',
];

const FAQS = [
  { q: 'Does Pro renew automatically?', a: 'No. You pay once for the time you pick and Pro ends on its own. Nothing is charged again unless you buy another plan.' },
  { q: 'What if I buy a plan while Pro is still running?', a: 'The new days are added to the end of your current plan, so you never lose time you already paid for.' },
  { q: 'How do I pay?', a: 'Through Cashfree, with UPI, debit or credit cards, or netbanking. CVMind never sees your card or bank details.' },
  { q: 'What are AI tokens?', a: 'Every AI reply (a resume fix, a cover letter, a hint) uses tokens. Free accounts get 75,000 in any 3-day window and Pro gets 2,00,000. Tokens you used more than 3 days ago count again.' },
  { q: 'When do the weekly free tries come back?', a: 'Each try comes back 7 days after you used it. Your Account page shows how many are left.' },
  { q: 'Can I get a refund?', a: "Payments are non-refundable. On the Monthly plan, if you have a genuine reason such as being charged twice or a Pro feature not working for you, you can cancel from Account → Billing and ask for a refund. Our team reviews every request by hand." },
];

const perDay = (p: Plan) => p.price / p.days;
const perDayText = (p: Plan) => `₹${perDay(p).toFixed(perDay(p) < 10 ? 2 : 0)}/day`;
// Percent saved per day against the monthly plan, for plans longer than a month
const savingFor = (p: Plan, monthly?: Plan) => (monthly && p.days > monthly.days ? Math.round((1 - perDay(p) / perDay(monthly)) * 100) : 0);

type ReturnState = { status: 'checking' | 'paid' | 'pending' | 'failed' | 'error'; message?: string; expiresAt?: string | null } | null;

export default function Pricing({ setCurrentPage, isLoggedIn, setShowAuthModal }: PricingProps) {
  const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);
  const [paymentsOn, setPaymentsOn] = useState(true);
  const [selected, setSelected] = useState('monthly');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  // Back from Cashfree: /pricing?order_id=...
  const [returnOrder] = useState(() => (readUser() ? new URLSearchParams(window.location.search).get('order_id') : null));
  const [returned, setReturned] = useState<ReturnState>(() => (returnOrder ? { status: 'checking' } : null));
  const [pro, setPro] = useState(userIsPro());
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [launch, setLaunch] = useState<LaunchTimes>(FALLBACK_LAUNCH);
  const [clock, setClock] = useState(() => Date.now());

  useEffect(() => {
    loadPlans().then((info) => { setPlans(info.plans); setPaymentsOn(info.payments.enabled); setLaunch(launchTimes(info.launch)); }).catch(() => {});
    const sync = () => setPro(userIsPro());
    window.addEventListener(USER_CHANGE_EVENT, sync);
    return () => window.removeEventListener(USER_CHANGE_EVENT, sync);
  }, []);

  useEffect(() => {
    const orderId = returnOrder;
    if (!orderId) return;
    let cancelled = false;
    const check = async (attempt: number) => {
      try {
        const r = await verifyOrder(orderId);
        if (cancelled) return;
        // Cashfree can take a few seconds to confirm a UPI payment
        if (r.status === 'pending' && attempt < 5) {
          setTimeout(() => check(attempt + 1), 3000);
          return;
        }
        setReturned({ status: r.status as 'paid' | 'pending' | 'failed', expiresAt: r.expiresAt });
        if (r.status === 'paid') window.history.replaceState({}, '', window.location.pathname);
      } catch (err) {
        if (!cancelled) setReturned({ status: 'error', message: err instanceof Error ? err.message : '' });
      }
    };
    check(0);
    return () => { cancelled = true; };
  }, [returnOrder]);

  // Before launch the page is locked, then shows prices with checkout closed until payments open
  const now = clock + launch.offset;
  const locked = now < launch.pricingOpensAt && !returnOrder;
  const paymentsOpen = now >= launch.paymentsOpenAt;
  useEffect(() => {
    if (paymentsOpen) return;
    const id = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [paymentsOpen]);

  const plan = plans.find((p) => p.key === selected) || plans[0];
  const monthly = plans.find((p) => p.key === 'monthly');
  const saving = savingFor(plan, monthly);
  const proTemplates = useMemo(() => PRO_TEMPLATES.map((t) => ({ ...t, html: withSampleData(t) })), []);
  const proLetters = useMemo(() => PRO_LETTERS.map((d) => ({ id: d.id, name: d.name, html: d.render(d.sample) })), []);

  const getPro = () => {
    if (!paymentsOpen) return;
    if (!isLoggedIn) {
      setShowAuthModal?.(true);
      return;
    }
    setCheckoutOpen(true);
  };

  const contactUs = (subject: string) => {
    setContactSubject(subject);
    setCurrentPage('contact');
  };

  if (locked) return <LaunchLock opensAt={launch.pricingOpensAt} now={now} setCurrentPage={setCurrentPage} />;

  const opensText = `Payments open ${launchTimeText(launch.paymentsOpenAt)}`;

  return (
    <div className="pr">
      <SlotBanner slot="promo" setCurrentPage={setCurrentPage} />

      {returned && <ReturnBanner state={returned} onClose={() => setReturned(null)} onRetry={() => { setReturned(null); setCheckoutOpen(true); }} />}

      {/* ── Free and Pro passes on the wave band ─────────────────── */}
      <section className="pr-stage">
        <Waves />

        <header className="pr-hero">
          <span className="pr-eyebrow"><Crown size={14} /> CVMind Pro</span>
          <h1 className="pr-title">Pay for the weeks you're job hunting. <em>Not a month more.</em></h1>
          <p className="pr-lede">Pick a pass for a sprint or a plan for the long run. Every plan is a one-time payment and ends on its own; nothing renews behind your back.</p>
        </header>

        <div className="pr-duo">
          <article className="pr-pass pr-pass--free" aria-labelledby="pr-free-name">
            <div className="pr-pass-top">
              <div className="pr-pass-tags">
                <h2 id="pr-free-name" className="pr-tag">Free plan</h2>
              </div>
              <p className="pr-amount"><span className="pr-amount-num">₹0</span><span className="pr-amount-sup">forever</span></p>
              <p className="pr-amount-sub">Build and check resumes, with weekly tries of the AI tools.</p>
            </div>
            <div className="pr-pass-bottom">
              <ul className="pr-ticks">
                {FREE_LIST.map((f) => <li key={f}><Check size={15} strokeWidth={2.5} /> {f}</li>)}
              </ul>
              <button type="button" className="pr-btn pr-btn--outline" onClick={() => setCurrentPage('resume-builder')}>Build my resume</button>
            </div>
          </article>

          <article className="pr-pass pr-pass--pro" aria-labelledby="pr-pro-name">
            <div className="pr-pass-top">
              <span className="pr-spark pr-spark--a" aria-hidden="true"><Sparkles size={16} /></span>
              <span className="pr-spark pr-spark--b" aria-hidden="true"><Sparkles size={12} /></span>
              <div className="pr-pass-tags">
                <span className="pr-crown" aria-hidden="true"><Crown size={17} /></span>
                <h2 id="pr-pro-name" className="pr-tag">Pro {plan.label}</h2>
                {saving > 0 && monthly && (
                  <span className="pr-save"><s>{formatInr(Math.round(perDay(monthly) * plan.days))}</s> Save {saving}%</span>
                )}
              </div>
              <p className="pr-amount" aria-live="polite">
                <span className="pr-amount-num">{formatInr(plan.price)}</span>
                <span className="pr-amount-sup">/{plan.days} days</span>
              </p>
              <p className="pr-amount-sub">{perDayText(plan)} · {PLAN_NOTES[plan.key] || `${plan.days} days of Pro`} · no auto-renew</p>
              <div className="pr-tabs" role="group" aria-label="How long you need Pro">
                {plans.map((p) => {
                  const off = savingFor(p, monthly);
                  return (
                    <button key={p.key} type="button" className={`pr-tab${p.key === plan.key ? ' is-active' : ''}`} aria-pressed={p.key === plan.key} onClick={() => setSelected(p.key)}>
                      {p.label}{off > 0 && <sup>-{off}%</sup>}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="pr-pass-bottom">
              <ul className="pr-ticks">
                {PRO_LIST.map((f) => <li key={f}><Check size={15} strokeWidth={2.5} /> {f}</li>)}
              </ul>
              {!paymentsOpen ? (
                <button type="button" className="pr-btn pr-btn--green" disabled>
                  <Clock size={16} /> {opensText}
                </button>
              ) : pro ? (
                <button type="button" className="pr-btn pr-btn--green" onClick={getPro}>
                  <Clock size={16} /> Add {plan.days} more days
                </button>
              ) : (
                <button type="button" className="pr-btn pr-btn--green" onClick={getPro}>
                  Get Pro for {formatInr(plan.price)} <ArrowRight size={17} />
                </button>
              )}
              <p className="pr-pass-fine"><ShieldCheck size={13} /> Secure payment by Cashfree</p>
            </div>
          </article>
        </div>

        <div className="pr-accept" aria-label="Payment methods">
          <span>Pay with</span>
          <ul>
            <li><Smartphone size={16} /> UPI</li>
            <li><CreditCard size={16} /> Debit &amp; credit cards</li>
            <li><Landmark size={16} /> Netbanking</li>
          </ul>
        </div>

        <aside className="pr-team">
          <span className="pr-team-icon" aria-hidden="true"><Building2 size={22} /></span>
          <div className="pr-team-text">
            <h2>Colleges, bootcamps and teams</h2>
            <p>Pro for every student or employee on one invoice, with volume pricing, or just the products you need.</p>
          </div>
          <button type="button" className="pr-btn pr-btn--outline" onClick={() => contactUs('Institution or team pricing')}>Get custom pricing</button>
        </aside>
      </section>

      {/* ── What Pro unlocks, shown with the real templates ──────── */}
      <section className="pr-show">
        <div className="pr-show-copy">
          <span className="pr-eyebrow pr-eyebrow--green"><Sparkles size={14} /> Included with Pro</span>
          <h2>A feature-packed resume builder that makes the job hunt a breeze</h2>
          <p>Pro opens all {CV_TEMPLATES.length} resume templates and {LETTER_DESIGNS.length} cover letter designs, with no CVMind footer on your downloads. Pick a design, tailor it to the job, and download. These previews are the real templates.</p>
          <ul className="pr-show-stats">
            <li><strong>{PRO_TEMPLATES.length}</strong><span>Pro resume templates</span></li>
            <li><strong>{PRO_LETTERS.length}</strong><span>Pro cover letters</span></li>
            <li><strong>∞</strong><span>Tailored versions</span></li>
          </ul>
          <button type="button" className="pr-btn pr-btn--outline" onClick={() => setCurrentPage('resume-builder')}>Build my resume now</button>
          <p className="pr-show-note">Free accounts keep {FREE_TEMPLATE_COUNT} resume templates and {FREE_LETTER_COUNT} cover letter designs.</p>
        </div>
        <Showcase templates={proTemplates} letter={proLetters[0]} />
      </section>

      {/* ── Comparison ───────────────────────────────────────────── */}
      <section className="pr-compare">
        <div className="pr-section-head">
          <h2>What's in each plan</h2>
          <p>Weekly tries come back 7 days after you use them.</p>
        </div>
        <div className="pr-table" role="table" aria-label="Free and Pro compared">
          <div className="pr-tr pr-tr--head" role="row">
            <span role="columnheader">Feature</span>
            <span role="columnheader">Free</span>
            <span role="columnheader"><Crown size={14} /> Pro</span>
          </div>
          {COMPARE.map((g) => (
            <div key={g.group} role="rowgroup">
              <div className="pr-tr pr-tr--group" role="row"><span role="cell">{g.group}</span></div>
              {g.rows.map(([label, free, paid]) => (
                <div className="pr-tr" role="row" key={label}>
                  <span role="cell">{label}</span>
                  <CellValue value={free} />
                  <CellValue value={paid} pro />
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section className="pr-faq">
        <div className="pr-faq-head">
          <h2>Questions about paying</h2>
          <p>Anything else? <button type="button" className="pr-inline-link" onClick={() => setCurrentPage('contact')}>Ask support</button></p>
        </div>
        <div className="pr-faq-list">
        {FAQS.map((f, i) => (
          <div key={f.q} className={`pr-faq-item${openFaq === i ? ' is-open' : ''}`}>
            <button type="button" aria-expanded={openFaq === i} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
              {f.q}<span aria-hidden="true">{openFaq === i ? '−' : '+'}</span>
            </button>
            {openFaq === i && (
              <p>
                {f.a}
                {i === FAQS.length - 1 && <> <button type="button" className="pr-inline-link" onClick={() => setCurrentPage('refund-policy')}>Refund policy</button></>}
              </p>
            )}
          </div>
        ))}
        </div>
      </section>

      {/* ── Closing band ─────────────────────────────────────────── */}
      <section className="pr-close">
        <h2>Start with a 3‑day pass for {formatInr(plans[0]?.price ?? 39)}.</h2>
        <button type="button" className="pr-btn pr-btn--white" disabled={!paymentsOpen} onClick={() => { setSelected(plans[0]?.key || 'pass-3d'); getPro(); }}>
          {paymentsOpen ? <><Crown size={16} /> Get Pro</> : <><Clock size={16} /> {opensText}</>}
        </button>
      </section>

      {checkoutOpen && (
        <Checkout
          plans={plans}
          selected={plan.key}
          onSelect={setSelected}
          paymentsOn={paymentsOn}
          onClose={() => setCheckoutOpen(false)}
          onPaid={() => { setCheckoutOpen(false); setReturned({ status: 'paid' }); }}
          setCurrentPage={setCurrentPage}
        />
      )}
    </div>
  );
}

function CellValue({ value, pro }: { value: Cell; pro?: boolean }) {
  if (value === true) return <span role="cell" className="pr-yes"><Check size={17} aria-label="Included" /></span>;
  if (value === false) return <span role="cell" className="pr-no"><Minus size={17} aria-label="Not included" /></span>;
  return <span role="cell" className={pro && value !== 'Soon' ? 'pr-strong' : value === 'Soon' ? 'pr-soon' : ''}>{value}</span>;
}

// Shown instead of the pricing page until it opens. Counts down and opens by itself.
function LaunchLock({ opensAt, now, setCurrentPage }: { opensAt: number; now: number; setCurrentPage: (page: string) => void }) {
  const left = Math.max(0, Math.floor((opensAt - now) / 1000));
  const parts = [
    { label: 'days', value: Math.floor(left / 86400) },
    { label: 'hours', value: Math.floor((left % 86400) / 3600) },
    { label: 'minutes', value: Math.floor((left % 3600) / 60) },
    { label: 'seconds', value: left % 60 },
  ].filter((p, i) => i > 0 || p.value > 0);
  return (
    <div className="pr">
      <section className="pr-lock">
        <span className="pr-eyebrow"><Lock size={14} /> CVMind Pro</span>
        <h1 className="pr-title">Pro plans go live on {launchTimeText(opensAt)}.</h1>
        <p className="pr-lede">We're putting the final touches on pricing. Everything free on CVMind works as usual until then.</p>
        <div className="pr-lock-count" role="timer" aria-label={`Opens in ${parts.map((p) => `${p.value} ${p.label}`).join(', ')}`}>
          {parts.map((p) => (
            <div key={p.label} className="pr-lock-unit">
              <strong>{String(p.value).padStart(2, '0')}</strong>
              <span>{p.label}</span>
            </div>
          ))}
        </div>
        <button type="button" className="pr-btn pr-btn--dark" onClick={() => setCurrentPage('resume-builder')}>Build a resume for free</button>
      </section>
    </div>
  );
}

function ReturnBanner({ state, onClose, onRetry }: { state: NonNullable<ReturnState>; onClose: () => void; onRetry: () => void }) {
  const until = state.expiresAt ? new Date(state.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const view = {
    checking: { tone: 'info', icon: <Loader2 size={18} className="pr-spin" />, text: 'Confirming your payment with Cashfree…' },
    paid: { tone: 'ok', icon: <CheckCircle2 size={18} />, text: `Payment received. You're on CVMind Pro${until ? ` until ${until}` : ''}.` },
    pending: { tone: 'info', icon: <Clock size={18} />, text: "Your payment hasn't been confirmed yet. If money left your account, Pro turns on automatically within a few minutes." },
    failed: { tone: 'bad', icon: <X size={18} />, text: "The payment didn't go through and you weren't charged." },
    error: { tone: 'bad', icon: <X size={18} />, text: state.message || "We couldn't check the payment. Refresh the page in a minute." },
  }[state.status];
  return (
    <div className={`pr-return pr-return--${view.tone}`} role="status">
      {view.icon}
      <span>{view.text}</span>
      {state.status === 'failed' && <button type="button" onClick={onRetry}>Try again</button>}
      {state.status !== 'checking' && <button type="button" className="pr-return-x" onClick={onClose} aria-label="Dismiss"><X size={16} /></button>}
    </div>
  );
}

function Checkout({ plans, selected, onSelect, paymentsOn, onClose, onPaid, setCurrentPage }: {
  plans: Plan[];
  selected: string;
  onSelect: (key: string) => void;
  paymentsOn: boolean;
  onClose: () => void;
  onPaid: () => void;
  setCurrentPage: (page: string) => void;
}) {
  const [phone, setPhone] = useState('');
  const [coupon, setCoupon] = useState('');
  const [showCoupon, setShowCoupon] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const plan = plans.find((p) => p.key === selected) || plans[0];
  const digits = phone.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');
  const phoneOk = /^[6-9]\d{9}$/.test(digits);
  const [openedAt] = useState(() => Date.now());
  const ends = new Date(openedAt + plan.days * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  // Keep the page behind still while the dialog is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const pay = async (e: FormEvent) => {
    e.preventDefault();
    if (!phoneOk || busy) return;
    setBusy(true);
    setError('');
    try {
      const { paid } = await startCheckout({ plan: plan.key, phone: digits, couponCode: coupon.trim() || undefined });
      if (paid) onPaid();
      // Otherwise the browser is on its way to Cashfree
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the payment.');
      setBusy(false);
    }
  };

  // Rendered on <body>: the page wrapper animates with a transform, which would trap a fixed overlay inside it
  return createPortal(
    <div className="pr-co-backdrop" onClick={() => !busy && onClose()}>
      <div className="pr-co" role="dialog" aria-modal="true" aria-labelledby="pr-co-title" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="pr-co-x" onClick={onClose} disabled={busy} aria-label="Close"><X size={18} /></button>

        <aside className="pr-co-summary">
          <span className="pr-co-badge"><Crown size={14} /> CVMind Pro</span>
          <p className="pr-co-plan-name">{plan.label}</p>
          <p className="pr-co-total">{formatInr(plan.price)}</p>
          <p className="pr-co-period">{plan.days} days of Pro · {perDayText(plan)}<br />Ends {ends}, no auto-renew</p>
          <ul className="pr-co-perks">
            {PRO_LIST.map((f) => <li key={f}><Check size={15} /> {f}</li>)}
          </ul>
          <p className="pr-co-secure"><ShieldCheck size={14} /> Payments handled by Cashfree</p>
          <p className="pr-co-secure">
            Payments are non-refundable.{' '}
            <button type="button" className="pr-inline-link" onClick={() => { onClose(); setCurrentPage('refund-policy'); }}>Refund policy</button>
          </p>
        </aside>

        <form className="pr-co-main" onSubmit={pay}>
          <h2 id="pr-co-title">Choose your plan</h2>
          <p className="pr-co-sub">Signed in as <strong>{readUser()?.email}</strong></p>

          <div className="pr-co-plans" role="radiogroup" aria-label="Plan">
            {plans.map((p) => (
              <label key={p.key} className={`pr-co-plan${p.key === plan.key ? ' is-active' : ''}`}>
                <input type="radio" name="plan" checked={p.key === plan.key} onChange={() => onSelect(p.key)} />
                <span className="pr-co-plan-text">
                  <span>{p.label}</span>
                  <small>{perDayText(p)}</small>
                </span>
                <strong>{formatInr(p.price)}</strong>
              </label>
            ))}
          </div>

          {paymentsOn ? (
            <>
              <label className="pr-co-label" htmlFor="pr-co-phone">Mobile number</label>
              <div className="pr-co-phone">
                <span>+91</span>
                <input id="pr-co-phone" inputMode="numeric" autoComplete="tel-national" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" />
              </div>
              <p className="pr-co-hint">Cashfree uses it to send your payment receipt.</p>

              {showCoupon ? (
                <>
                  <label className="pr-co-label" htmlFor="pr-co-coupon">Coupon code</label>
                  <input id="pr-co-coupon" className="pr-co-input" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="e.g. CAMPUS20" />
                </>
              ) : (
                <button type="button" className="pr-inline-link pr-co-coupon-link" onClick={() => setShowCoupon(true)}>Have a coupon?</button>
              )}

              {error && <p className="pr-co-error" role="alert">{error}</p>}

              <button type="submit" className="pr-btn pr-btn--dark" disabled={!phoneOk || busy}>
                {busy ? <Loader2 size={17} className="pr-spin" /> : <Lock size={15} />} Pay {formatInr(plan.price)}{coupon.trim() ? ' (before coupon)' : ''}
              </button>
              <p className="pr-co-fine">You'll finish on Cashfree's secure page (UPI, cards, netbanking) and come back here. Pro starts as soon as the payment is confirmed.</p>
            </>
          ) : (
            <>
              <div className="pr-co-notice">
                <Clock size={18} />
                <p><strong>Online payment is being set up.</strong> Message us and we'll add Pro ({plan.label}) to your account by hand.</p>
              </div>
              <button type="button" className="pr-btn pr-btn--dark" onClick={() => { onClose(); setCurrentPage('contact'); }}>Contact support</button>
            </>
          )}
        </form>
      </div>
    </div>,
    document.body
  );
}

interface ShowItem { id: string; name: string; tag?: string; html: string }

const EDITOR_TOOLS = [
  { icon: LayoutTemplate, label: 'Templates' },
  { icon: Palette, label: 'Design & fonts' },
  { icon: Target, label: 'Tailor to a job' },
  { icon: SpellCheck, label: 'AI proofreading' },
  { icon: Download, label: 'Download PDF' },
];

const SWATCHES = ['#0f172a', '#2dc08d', '#2997ff', '#7c3aed', '#f97316', '#e11d48'];

// The "feature" collage: an editor window, the real Pro templates cycling on a page, a phone
// showing a cover letter, and a design panel. Pauses on hover; reduced-motion users get arrows only.
function Showcase({ templates, letter }: { templates: ShowItem[]; letter?: ShowItem }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = templates.length;

  useEffect(() => {
    if (paused || count < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => { if (!document.hidden) setIndex((i) => (i + 1) % count); }, 3600);
    return () => window.clearInterval(id);
  }, [paused, count]);

  if (!count) return null;
  const t = templates[index % count];
  const go = (step: number) => setIndex((i) => (i + step + count) % count);

  return (
    <div
      className="pr-show-stage"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span className="pr-show-diamond" aria-hidden="true" />
      <svg className="pr-show-doodle" viewBox="0 0 160 220" fill="none" aria-hidden="true">
        <path d="M40 2c-30 40 30 60 10 100-14 28-52 14-38-14 16-32 74-12 76 30 2 34-26 56 4 80" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <path d="m86 192 6 10-12 2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      <div className="pr-show-editor" aria-hidden="true">
        <div className="pr-show-bar"><i /><i /><i /></div>
        <ul>
          {EDITOR_TOOLS.map(({ icon: Icon, label }) => <li key={label}><Icon size={15} /> {label}</li>)}
        </ul>
      </div>

      {/* All pages stay mounted and crossfade, so switching never flashes a loading skeleton */}
      <figure className="pr-show-paper">
        {templates.map((item) => (
          <div key={item.id} className={`pr-show-page${item.id === t.id ? ' is-on' : ''}`} aria-hidden={item.id !== t.id}>
            <TemplatePreview html={item.html} name={item.name} eager />
          </div>
        ))}
        <figcaption><Crown size={12} /> {t.name}</figcaption>
      </figure>

      {letter && (
        <div className="pr-show-phone" aria-hidden="true">
          <div className="pr-show-phone-screen">
            <span className="pr-show-phone-cta">Download PDF</span>
            <div className="pr-show-phone-page"><TemplatePreview html={letter.html} name={letter.name} eager /></div>
          </div>
        </div>
      )}

      <div className="pr-show-panel" aria-hidden="true">
        <span className="pr-show-label">Page margins</span>
        <span className="pr-show-slider"><i style={{ width: '28%' }} /></span>
        <span className="pr-show-label">Font style</span>
        <span className="pr-show-select">Inter <ChevronRight size={12} /></span>
        <span className="pr-show-label">Colours</span>
        <span className="pr-show-swatches">
          {SWATCHES.map((c, i) => <i key={c} style={{ background: c }} className={i === 1 ? 'is-on' : ''} />)}
        </span>
      </div>

      <div className="pr-show-nav">
        <button type="button" onClick={() => go(-1)} aria-label="Previous Pro template"><ChevronLeft size={16} /></button>
        <span aria-live="polite">{(index % count) + 1} / {count}</span>
        <button type="button" onClick={() => go(1)} aria-label="Next Pro template"><ChevronRight size={16} /></button>
      </div>
    </div>
  );
}

// Soft green and blue hills behind the plan cards
function Waves() {
  return (
    <svg className="pr-waves" viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="pr-wave-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className="pr-wave-stop-a1" />
          <stop offset="1" className="pr-wave-stop-a2" />
        </linearGradient>
      </defs>
      <path className="pr-wave-b" d="M480 900C700 640 960 440 1220 410c110-12 170 0 220 14V900Z" />
      <path fill="url(#pr-wave-a)" d="M0 150c170 170 300 400 520 560 130 95 250 150 360 190H0Z" />
    </svg>
  );
}
