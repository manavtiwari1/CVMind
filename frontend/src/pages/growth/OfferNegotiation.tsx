import { useState, type FormEvent } from 'react';
import { AlertTriangle, Check, Copy, Handshake, Loader2 } from 'lucide-react';
import { LEO_POSES } from '../../lib/leoPoses';
import { negotiateOffer, type NegotiationResult, type OfferInput, type PositionInput } from '../../lib/growthApi';
import { getErrorMessage } from '../../utils/errors';
import type { LoadedWork } from '../../types/api';
import './GrowthPages.css';

// Offer negotiation: the user types the offer and what they want; Leo writes a counter-offer email,
// a call script and talking points. Only the user's own numbers are used; no market figures.

const PRIORITIES = ['Fixed pay', 'Joining bonus', 'Remote or hybrid', 'Job title', 'Start date', 'Notice period buyout'];
const TONES = [
  { value: 'Warm and confident', label: 'Warm' },
  { value: 'Firm and direct', label: 'Firm' },
  { value: 'Short and to the point', label: 'Brief' },
];

const EMPTY_OFFER: OfferInput = { company: '', role: '', location: '', fixed: '', variable: '', joiningBonus: '', notice: '', other: '' };
const EMPTY_POSITION: PositionInput = { current: '', competing: '', target: '', priorities: [], notes: '' };

interface Saved { offer?: OfferInput; position?: PositionInput; tone?: string; result?: NegotiationResult }

// A saved negotiation reopened from My Documents
function fromWork(work: LoadedWork | null): Saved {
  if (!work || work.deleted || work.type !== 'offer-negotiation') return {};
  try {
    return JSON.parse(work.htmlContent) as Saved;
  } catch {
    return {};
  }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="gp-copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          window.prompt('Copy this text', text);
        }
      }}
    >
      {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
    </button>
  );
}

interface OfferNegotiationProps {
  loadedWork: LoadedWork | null;
}

export default function OfferNegotiation({ loadedWork }: OfferNegotiationProps) {
  const [saved] = useState(() => fromWork(loadedWork));
  const [offer, setOffer] = useState<OfferInput>({ ...EMPTY_OFFER, ...saved.offer });
  const [position, setPosition] = useState<PositionInput>({ ...EMPTY_POSITION, ...saved.position });
  const [tone, setTone] = useState(saved.tone || TONES[0].value);
  const [result, setResult] = useState<NegotiationResult | null>(saved.result || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setO = (key: keyof OfferInput) => (e: { target: { value: string } }) => setOffer(o => ({ ...o, [key]: e.target.value }));
  const setP = (key: keyof PositionInput) => (e: { target: { value: string } }) => setPosition(p => ({ ...p, [key]: e.target.value }));
  const togglePriority = (p: string) => setPosition(pos => {
    const list = pos.priorities || [];
    return { ...pos, priorities: list.includes(p) ? list.filter(x => x !== p) : [...list, p] };
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!offer.company.trim() || !offer.role.trim() || !offer.fixed.trim()) {
      setError('Add the company, the role and the pay you were offered.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await negotiateOffer({ offer, position, tone });
      setResult(res.data);
      window.requestAnimationFrame(() => document.getElementById('gp-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (err) {
      setError(getErrorMessage(err) || 'Could not write your counter-offer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const emailText = result ? `Subject: ${result.email.subject}\n\n${result.email.body}` : '';

  return (
    <div className="gp-page">
      <header className="gp-hero">
        <img src={LEO_POSES[loading ? 'thinking' : result ? 'thumbs' : 'idea']} alt="" width={84} height={84} />
        <div>
          <span className="gp-eyebrow"><Handshake size={14} /> Offer negotiation</span>
          <h1>Got an offer? Ask for a better one.</h1>
          <p>Tell Leo what you were offered and what you want. You get a polite counter-offer email, what to say on a call, and your strongest reasons. We only use the numbers you type, never made-up market rates.</p>
        </div>
      </header>

      <div className="gp-columns">
        <form className="gp-card gp-form" onSubmit={submit}>
          <fieldset>
            <legend>The offer</legend>
            <div className="gp-grid">
              <label><span>Company<span className="gp-req">*</span></span><input value={offer.company} onChange={setO('company')} maxLength={120} placeholder="e.g. Initech" required /></label>
              <label><span>Role<span className="gp-req">*</span></span><input value={offer.role} onChange={setO('role')} maxLength={120} placeholder="e.g. Frontend Developer" required /></label>
              <label><span>Fixed pay / CTC offered<span className="gp-req">*</span></span><input value={offer.fixed} onChange={setO('fixed')} maxLength={80} placeholder="e.g. 18 LPA fixed" required /></label>
              <label>Variable pay or bonus<input value={offer.variable} onChange={setO('variable')} maxLength={80} placeholder="e.g. 10% variable" /></label>
              <label>Joining bonus<input value={offer.joiningBonus} onChange={setO('joiningBonus')} maxLength={80} placeholder="e.g. none" /></label>
              <label>Location<input value={offer.location} onChange={setO('location')} maxLength={80} placeholder="e.g. Bengaluru, hybrid" /></label>
              <label className="gp-wide">Notice period or start date<input value={offer.notice} onChange={setO('notice')} maxLength={120} placeholder="e.g. They want me to join in 30 days; my notice is 60" /></label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Your side</legend>
            <div className="gp-grid">
              <label>Your current CTC<input value={position.current} onChange={setP('current')} maxLength={80} placeholder="e.g. 14 LPA" /></label>
              <label>What you want to ask for<input value={position.target} onChange={setP('target')} maxLength={200} placeholder="e.g. 21 LPA fixed" /></label>
              <label className="gp-wide">Other offers you have<input value={position.competing} onChange={setP('competing')} maxLength={300} placeholder="e.g. 20 LPA from another product company (only if true)" /></label>
            </div>
            <div className="gp-chips" role="group" aria-label="What matters most">
              <span>What matters most</span>
              {PRIORITIES.map(p => (
                <button key={p} type="button" className={`gp-chip${position.priorities?.includes(p) ? ' is-on' : ''}`} aria-pressed={position.priorities?.includes(p)} onClick={() => togglePriority(p)}>{p}</button>
              ))}
            </div>
            <label className="gp-wide">Anything else Leo should know<textarea value={position.notes} onChange={setP('notes')} maxLength={600} rows={3} placeholder="e.g. I'm the only candidate with React Native experience they interviewed" /></label>
          </fieldset>

          <div className="gp-tone" role="radiogroup" aria-label="Tone">
            <span>Tone</span>
            {TONES.map(t => (
              <label key={t.value} className={`gp-chip${tone === t.value ? ' is-on' : ''}`}>
                <input type="radio" name="gp-tone" checked={tone === t.value} onChange={() => setTone(t.value)} /> {t.label}
              </label>
            ))}
          </div>

          {error && <p className="gp-error" role="alert">{error}</p>}
          <button type="submit" className="gp-submit" disabled={loading}>
            {loading ? <><Loader2 size={16} className="animate-spin" /> Writing…</> : result ? 'Write it again' : 'Write my counter-offer'}
          </button>
          <p className="gp-fine">Free accounts get 1 a week. This is guidance, not legal or financial advice.</p>
        </form>

        <section id="gp-result" className="gp-result" aria-live="polite">
          {!result ? (
            <div className="gp-card gp-placeholder">
              <h2>What you'll get</h2>
              <ul>
                <li>An email to the recruiter that thanks them, makes one clear ask and gives your reasons</li>
                <li>Lines to say if they call you</li>
                <li>Your strongest reasons, from what you told us</li>
                <li>Things to avoid saying</li>
              </ul>
            </div>
          ) : (
            <>
              {result.warnings.length > 0 && (
                <div className="gp-warn">
                  <AlertTriangle size={16} />
                  <ul>{result.warnings.map(w => <li key={w}>{w}</li>)}</ul>
                </div>
              )}
              <article className="gp-card">
                <div className="gp-card-head"><h2>Counter-offer email</h2><CopyButton text={emailText} /></div>
                <p className="gp-subject"><span>Subject</span> {result.email.subject}</p>
                <p className="gp-body">{result.email.body}</p>
              </article>
              <article className="gp-card">
                <div className="gp-card-head"><h2>If they call you</h2><CopyButton text={result.callScript.join('\n')} /></div>
                <ol className="gp-list">{result.callScript.map(line => <li key={line}>{line}</li>)}</ol>
              </article>
              <div className="gp-two">
                <article className="gp-card">
                  <h2>Your reasons</h2>
                  <ul className="gp-list">{result.talkingPoints.map(p => <li key={p}>{p}</li>)}</ul>
                </article>
                <article className="gp-card">
                  <h2>Avoid</h2>
                  <ul className="gp-list gp-avoid">{result.avoid.map(p => <li key={p}>{p}</li>)}</ul>
                </article>
              </div>
              <p className="gp-fine">Saved in My Documents. Check every number before you send it.</p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
