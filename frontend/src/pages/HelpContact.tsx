import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Send, CheckCircle2, Mail, MailWarning, LogIn, MessageCircle, Phone } from 'lucide-react';
import { SUPPORT_EMAIL, WHATSAPP_DISPLAY, whatsappLink, mailLink, telLink } from '../data/support';
import { getErrorMessage } from '../utils/errors';
import { API_BASE } from '../lib/apiBase';
import { authFetch, AUTH_REQUIRED_EVENT, VERIFY_REQUIRED_EVENT } from '../lib/authFetch';
import { readUser, USER_CHANGE_EVENT } from '../lib/currentUser';

const EMPTY = { subject: '', message: '' };
const FALLBACK_ERROR = 'Unable to send message right now. Please try again, or email us directly.';

// The Help Center's contact view: a message form for verified accounts and the direct support channels.
// Messages become support tickets, so the server only takes them from signed-in, verified accounts
// and uses the account's name and email.
export default function HelpContact() {
  const [user, setUser] = useState(readUser);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setUser(readUser());
    window.addEventListener(USER_CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(USER_CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const signedIn = Boolean(user?.token);
  const unverified = signedIn && user?.emailVerified === false;

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.message.trim()) {
      setError('Please write your message.');
      return;
    }
    setLoading(true);
    try {
      const response = await authFetch(`${API_BASE}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      // A gateway error page isn't JSON; fall back to the generic message instead of a parse error
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || FALLBACK_ERROR);
      setSent(true);
      setForm(EMPTY);
    } catch (err) {
      setError(getErrorMessage(err) || FALLBACK_ERROR);
    } finally {
      setLoading(false);
    }
  };

  const renderForm = () => {
    if (!signedIn) {
      return (
        <div className="help-contact-sent" role="status">
          <LogIn size={40} />
          <h2>Sign in to message support</h2>
          <p>Support messages come from CVMind accounts, so we can reply to you and keep spam out. You can also reach us by email or WhatsApp.</p>
          <button type="button" className="help-article-link" onClick={() => window.dispatchEvent(new Event(AUTH_REQUIRED_EVENT))}>Sign in</button>
        </div>
      );
    }
    if (unverified) {
      return (
        <div className="help-contact-sent help-contact-locked" role="status">
          <MailWarning size={40} />
          <h2>Please verify your email before contacting CVMind Support.</h2>
          <p>Verifying your email helps us protect our support system from spam and abuse.</p>
          <button type="button" className="help-article-link" onClick={() => window.dispatchEvent(new Event(VERIFY_REQUIRED_EVENT))}>Verify email</button>
        </div>
      );
    }
    if (sent) {
      return (
        <div className="help-contact-sent" role="status">
          <CheckCircle2 size={40} />
          <h2>Message sent</h2>
          <p>Thanks for writing to us. We will reply to {user?.email || 'your email'} within 24 hours.</p>
          <button type="button" className="help-article-link" onClick={() => setSent(false)}>Send another message</button>
        </div>
      );
    }
    return (
      <form onSubmit={onSubmit} noValidate>
        <p className="help-contact-from">Sending as <strong>{user?.name || 'you'}</strong> ({user?.email})</p>
        <label className="help-field">
          <span>Subject</span>
          <input name="subject" value={form.subject} onChange={onChange} disabled={loading} maxLength={200} placeholder="e.g. Refund request, can't download PDF" />
        </label>
        <label className="help-field">
          <span>Message <em aria-hidden="true">*</em></span>
          <textarea name="message" rows={6} value={form.message} onChange={onChange} disabled={loading} maxLength={5000} required />
        </label>
        {error && <p className="help-contact-error" role="alert">{error}</p>}
        <button type="submit" className="help-article-link" disabled={loading}>
          {loading ? 'Sending…' : <>Send message <Send size={15} /></>}
        </button>
      </form>
    );
  };

  return (
    <>
      <header className="help-topic-head">
        <h1>Contact us</h1>
        <p>Questions, feedback, billing or a problem with your account. Send us a message and we will reply by email, usually within 24 hours.</p>
      </header>

      <div className="help-contact">
        <section className="help-card help-contact-form">
          {renderForm()}
        </section>

        <aside className="help-contact-channels" aria-label="Other ways to reach us">
          <a className="help-channel" href={mailLink()}>
            <span className="help-collection-icon"><Mail size={18} /></span>
            <span><strong>Email</strong>{SUPPORT_EMAIL}</span>
          </a>
          <a className="help-channel" href={whatsappLink()} target="_blank" rel="noopener noreferrer">
            <span className="help-collection-icon"><MessageCircle size={18} /></span>
            <span><strong>WhatsApp</strong>{WHATSAPP_DISPLAY}</span>
          </a>
          <a className="help-channel" href={telLink}>
            <span className="help-collection-icon"><Phone size={18} /></span>
            <span><strong>Call us</strong>{WHATSAPP_DISPLAY}</span>
          </a>
        </aside>
      </div>
    </>
  );
}
