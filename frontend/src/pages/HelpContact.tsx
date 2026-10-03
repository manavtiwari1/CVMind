import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Send, CheckCircle2, Mail, MessageCircle, Phone } from 'lucide-react';
import { SUPPORT_EMAIL, WHATSAPP_DISPLAY, whatsappLink, mailLink, telLink } from '../data/support';
import { getErrorMessage } from '../utils/errors';

const EMPTY = { name: '', email: '', subject: '', message: '' };
const FALLBACK_ERROR = 'Unable to send message right now. Please try again, or email us directly.';

// The Help Center's contact view: a message form and the direct support channels
export default function HelpContact() {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name || !form.email || !form.message) {
      setError('Please fill in your name, email and message.');
      return;
    }
    setLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');
      const response = await fetch(`${baseUrl}/api/contact`, {
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

  return (
    <>
      <header className="help-topic-head">
        <h1>Contact us</h1>
        <p>Questions, feedback, billing or a problem with your account. Send us a message and we will reply by email, usually within 24 hours.</p>
      </header>

      <div className="help-contact">
        <section className="help-card help-contact-form">
          {sent ? (
            <div className="help-contact-sent" role="status">
              <CheckCircle2 size={40} />
              <h2>Message sent</h2>
              <p>Thanks for writing to us. We will reply to your email within 24 hours.</p>
              <button type="button" className="help-article-link" onClick={() => setSent(false)}>Send another message</button>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate>
              <div className="help-field-row">
                <label className="help-field">
                  <span>Name <em aria-hidden="true">*</em></span>
                  <input name="name" value={form.name} onChange={onChange} disabled={loading} autoComplete="name" required />
                </label>
                <label className="help-field">
                  <span>Email <em aria-hidden="true">*</em></span>
                  <input type="email" name="email" value={form.email} onChange={onChange} disabled={loading} autoComplete="email" required />
                </label>
              </div>
              <label className="help-field">
                <span>Subject</span>
                <input name="subject" value={form.subject} onChange={onChange} disabled={loading} placeholder="e.g. Refund request, can't download PDF" />
              </label>
              <label className="help-field">
                <span>Message <em aria-hidden="true">*</em></span>
                <textarea name="message" rows={6} value={form.message} onChange={onChange} disabled={loading} required />
              </label>
              {error && <p className="help-contact-error" role="alert">{error}</p>}
              <button type="submit" className="help-article-link" disabled={loading}>
                {loading ? 'Sending…' : <>Send message <Send size={15} /></>}
              </button>
            </form>
          )}
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
