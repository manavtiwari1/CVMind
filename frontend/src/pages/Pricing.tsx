import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Building2, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock, Crown, Loader2, Lock, Minus, ShieldCheck, X } from 'lucide-react';
import TemplatePreview from '../components/TemplatePreview';
import { SlotBanner } from '../components/SiteBanner';
import { CV_TEMPLATES } from '../data/cvTemplates';
import { withSampleData } from '../data/samplePreview';
import { LETTER_DESIGNS } from '../lib/coverLetter';
import { PRO_LETTER_IDS, PRO_TEMPLATE_IDS, formatInr, loadPlans, startCheckout, userIsPro, verifyOrder, type Plan } from '../lib/billing';
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
    ],
  },
  {
    group: 'Interview & career',
    rows: [
      ['Interview Prep AI', '1 session a week', 'Unlimited'],
      ['Voice interview practice', '1 session a week', 'Unlimited'],
      ['Portfolio Generator', '2 a week', 'Unlimited'],
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
    group: 'Coming soon',
    rows: [
      ['AI Job Finder', 'Soon', 'Soon'],
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
  '75,000 AI tokens every 3 days',
];

const PRO_LIST = [
  `All ${CV_TEMPLATES.length} resume templates and ${LETTER_DESIGNS.length} cover letter designs`,
  'No CVMind footer on resumes and cover letters',
  'Unlimited Resume Tailor, AI cover letters and Portfolio Generator',
  'Unlimited interview and voice practice',
  'Unlimited code explanations and full solutions',
  '2,00,000 AI tokens every 3 days',
];

const TEAM_LIST = [
  'Pro for every student or employee, billed together',
  'Volume pricing for colleges, bootcamps and companies',
  'Access to just the products you need, like CVMind Code or Interview Prep',
  'Help setting up accounts and one invoice',
];

const FAQS = [
  { q: 'Does Pro renew automatically?', a: 'No. You pay once for the time you pick and Pro ends on its own. Nothing is charged again unless you buy another plan.' },
  { q: 'What if I buy a plan while Pro is still running?', a: 'The new days are added to the end of your current plan, so you never lose time you already paid for.' },
  { q: 'How do I pay?', a: 'Through Cashfree, with UPI, debit or credit cards, or netbanking. CVMind never sees your card or bank details.' },
  { q: 'What are AI tokens?', a: 'Every AI reply (a resume fix, a cover letter, a hint) uses tokens. Free accounts get 75,000 in any 3-day window and Pro gets 2,00,000. Tokens you used more than 3 days ago count again.' },
  { q: 'When do the weekly free tries come back?', a: 'Each try comes back 7 days after you used it. Your Account page shows how many are left.' },
  { q: 'Can I get a refund?', a: 'Read the refund policy for when a refund applies, or contact support with your registered email.' },
];

const perDay = (p: Plan) => p.price / p.days;
const perDayText = (p: Plan) => `₹${perDay(p).toFixed(perDay(p) < 10 ? 2 : 0)}/day`;

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

  useEffect(() => {
    loadPlans().then((info) => { setPlans(info.plans); setPaymentsOn(info.payments.enabled); }).catch(() => {});
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

  const plan = plans.find((p) => p.key === selected) || plans[0];
  const monthly = plans.find((p) => p.key === 'monthly');
  const proTemplates = useMemo(() => PRO_TEMPLATES.map((t) => ({ ...t, html: withSampleData(t) })), []);
  const proLetters = useMemo(() => PRO_LETTERS.map((d) => ({ id: d.id, name: d.name, html: d.render(d.sample) })), []);

  const getPro = () => {
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

  return (
    <div className="pr">
      <SlotBanner slot="promo" setCurrentPage={setCurrentPage} />

      {returned && <ReturnBanner state={returned} onClose={() => setReturned(null)} onRetry={() => { setReturned(null); setCheckoutOpen(true); }} />}

      <section className="pr-top">
      <header className="pr-hero">
        <div>
          <span className="pr-eyebrow"><Crown size={14} /> CVMind Pro</span>
          <h1 className="pr-title">Pay for the weeks you're job hunting. Not a month more.</h1>
        </div>
        <p className="pr-lede">Pick a pass for a sprint or a plan for the long run. Every plan is a one-time payment and ends on its own; nothing renews behind your back.</p>
      </header>

      {/* ── Plan lengths ─────────────────────────────────────────── */}
      <section className="pr-plans" aria-label="Choose how long you need Pro">
        {plans.map((p) => {
          const active = p.key === selected;
          const saving = monthly && p.days > monthly.days ? Math.round((1 - perDay(p) / perDay(monthly)) * 100) : 0;
          return (
            <button key={p.key} type="button" className={`pr-plan${active ? ' is-active' : ''}`} aria-pressed={active} onClick={() => setSelected(p.key)}>
              {saving > 0 && <span className="pr-plan-save">Save {saving}%</span>}
              <span className="pr-plan-label">{p.label}</span>
              <span className="pr-plan-price">{formatInr(p.price)}</span>
              <span className="pr-plan-day">{perDayText(p)}</span>
              <span className="pr-plan-note">{PLAN_NOTES[p.key] || `${p.days} days`}</span>
            </button>
          );
        })}
      </section>

      {/* ── Free vs Pro ──────────────────────────────────────────── */}
      <section className="pr-cards">
        <article className="pr-card">
          <h2 className="pr-card-name">Free</h2>
          <p className="pr-card-price"><span>₹0</span> forever</p>
          <p className="pr-card-desc">Everything you need to build and check a resume, with weekly tries of the AI tools.</p>
          <ul className="pr-list">
            {FREE_LIST.map((f) => <li key={f}><Check size={16} /> {f}</li>)}
          </ul>
          <button type="button" className="pr-btn pr-btn--ghost" onClick={() => setCurrentPage('resume-builder')}>Start for free</button>
        </article>

        <article className="pr-card pr-card--pro">
          <div className="pr-card-top">
            <h2 className="pr-card-name"><Crown size={18} /> Pro</h2>
            <span className="pr-card-chip">{plan.label}</span>
          </div>
          <p className="pr-card-price"><span>{formatInr(plan.price)}</span> for {plan.days} days</p>
          <p className="pr-card-desc">Works out to {perDayText(plan)}. One payment, no auto-renew.</p>
          <ul className="pr-list">
            {PRO_LIST.map((f) => <li key={f}><Check size={16} /> {f}</li>)}
          </ul>
          {pro ? (
            <button type="button" className="pr-btn pr-btn--light" onClick={getPro}>
              <Clock size={16} /> Add {plan.days} more days
            </button>
          ) : (
            <button type="button" className="pr-btn pr-btn--light" onClick={getPro}>
              Get Pro for {formatInr(plan.price)}
            </button>
          )}
          <p className="pr-card-fine"><ShieldCheck size={13} /> Secure payment by Cashfree · UPI, cards, netbanking</p>
        </article>

        <article className="pr-card">
          <h2 className="pr-card-name"><Building2 size={18} /> Institutions</h2>
          <p className="pr-card-price"><span>Custom</span></p>
          <p className="pr-card-desc">For colleges, placement cells, bootcamps and teams, or if you only need one product.</p>
          <ul className="pr-list">
            {TEAM_LIST.map((f) => <li key={f}><Check size={16} /> {f}</li>)}
          </ul>
          <button type="button" className="pr-btn pr-btn--ghost" onClick={() => contactUs('Institution or team pricing')}>Contact us</button>
        </article>
      </section>
      </section>

      {/* ── Pro templates, rendered for real ─────────────────────── */}
      <section className="pr-templates">
        <div className="pr-section-head">
          <h2>{PRO_TEMPLATES.length + PRO_LETTERS.length} designs come with Pro</h2>
          <p>These are the actual templates, filled with sample content. Free accounts keep the other {FREE_TEMPLATE_COUNT} resume templates and {FREE_LETTER_COUNT} cover letter designs.</p>
        </div>
        <div className="pr-slider-cols">
          <ProSlider title="Resume templates" items={proTemplates.map((t) => ({ id: t.id, name: t.name, sub: t.tag, html: t.html }))} />
          <ProSlider title="Cover letters" items={proLetters.map((d) => ({ id: d.id, name: d.name, sub: 'Cover letter', html: d.html }))} delay={1600} />
        </div>
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
        <button type="button" className="pr-btn pr-btn--light" onClick={() => { setSelected(plans[0]?.key || 'pass-3d'); getPro(); }}>
          <Crown size={16} /> Get Pro
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

interface SlideItem { id: string; name: string; sub: string; html: string }

// Auto-advancing row of real template previews: two at a time on wide screens, one on phones.
// Pauses while hovered or focused and when the tab is hidden; reduced-motion users get arrows only.
function ProSlider({ title, items, delay = 0 }: { title: string; items: SlideItem[]; delay?: number }) {
  const [per, setPer] = useState(() => (window.matchMedia('(max-width: 700px)').matches ? 1 : 2));
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const last = Math.max(0, items.length - per);
  const shown = Math.min(index, last);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 700px)');
    const onChange = () => setPer(mq.matches ? 1 : 2);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (paused || last === 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timer = 0;
    const tick = () => {
      if (!document.hidden) setIndex((i) => (Math.min(i, last) >= last ? 0 : Math.min(i, last) + 1));
      timer = window.setTimeout(tick, 3200);
    };
    timer = window.setTimeout(tick, 3200 + delay);
    return () => window.clearTimeout(timer);
  }, [paused, last, delay]);

  const go = (i: number) => setIndex((i + last + 1) % (last + 1));

  return (
    <div
      className="pr-slider"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label={title}
    >
      <div className="pr-slider-head">
        <h3>{title} <span>{items.length} Pro</span></h3>
        <div className="pr-slider-arrows">
          <button type="button" onClick={() => go(shown - 1)} aria-label={`Previous ${title.toLowerCase()}`}><ChevronLeft size={18} /></button>
          <button type="button" onClick={() => go(shown + 1)} aria-label={`Next ${title.toLowerCase()}`}><ChevronRight size={18} /></button>
        </div>
      </div>
      <div className="pr-slider-window">
        <div className="pr-slider-track" style={{ transform: `translateX(-${(shown * 100) / per}%)` }}>
          {items.map((t, i) => (
            <figure key={t.id} className="pr-slide" style={{ flexBasis: `${100 / per}%` }} aria-hidden={i < shown || i >= shown + per}>
              <div className="pr-template-thumb">
                <TemplatePreview html={t.html} name={t.name} eager />
                <span className="pr-template-pro"><Crown size={11} /> Pro</span>
              </div>
              <figcaption><strong>{t.name}</strong><span>{t.sub}</span></figcaption>
            </figure>
          ))}
        </div>
      </div>
      {last > 0 && (
        <div className="pr-slider-dots" role="group" aria-label={`${title} slides`}>
          {Array.from({ length: last + 1 }, (_, i) => (
            <button key={i} type="button" className={i === shown ? 'is-on' : ''} onClick={() => setIndex(i)} aria-label={`Show slide ${i + 1}`} aria-current={i === shown} />
          ))}
        </div>
      )}
    </div>
  );
}
