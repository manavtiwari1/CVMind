import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Send, CheckCircle2, Mail, MessageSquare, Globe } from 'lucide-react';
import { SUPPORT_EMAIL, WHATSAPP_DISPLAY, whatsappLink } from '../data/support';
import './Contact.css';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.name || !formData.email || !formData.message) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    setLoading(true);

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');
      const response = await fetch(`${baseUrl}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to send message right now.');
      }

      setLoading(false);
      setIsSent(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setLoading(false);
      setErrorMsg(err instanceof Error ? err.message : 'Unable to send message right now.');
    }
  };

  return (
    <div className="contact-container animate-fade-in-up">
      {/* Background glow nodes */}
      <div className="glow-ambient" style={{ top: '15%', left: '20%' }}></div>
      <div className="glow-ambient" style={{ bottom: '25%', right: '20%' }}></div>

      <section className="contact-hero">
        <h1 className="contact-title">Connect with Us</h1>
        <p className="contact-subtitle">
          Have feedback, feature requests, or business inquiries? Drop us a line.
        </p>
      </section>

      <div className="contact-grid">
        {/* Contact Info Sidebar */}
        <div className="contact-info-column glass-card animate-fade-in-up">
          <h3 className="sidebar-title">Contact Information</h3>
          <p className="sidebar-desc">
            We value community input. Fill out the form and our team will get back to you within 24 hours.
          </p>

          <div className="info-details-list">
            <a className="info-detail-item" href={`mailto:${SUPPORT_EMAIL}`}>
              <div className="info-icon-circle">
                <Mail size={16} />
              </div>
              <div className="info-text-group">
                <span className="info-label">Email Support</span>
                <span className="info-value">{SUPPORT_EMAIL}</span>
              </div>
            </a>

            <a
              className="info-detail-item"
              href={whatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="info-icon-circle">
                <MessageSquare size={16} />
              </div>
              <div className="info-text-group">
                <span className="info-label">24/7 Support on WhatsApp</span>
                <span className="info-value" style={{ color: 'var(--blue)' }}>
                  {WHATSAPP_DISPLAY}
                </span>
              </div>
            </a>

            <div className="info-detail-item">
              <div className="info-icon-circle">
                <Globe size={16} />
              </div>
              <div className="info-text-group">
                <span className="info-label">Website Status</span>
                <span className="info-value text-success">All Systems Operational</span>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form Card */}
        <div className="contact-form-column glass-card animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          {isSent ? (
            /* Success confirmation card */
            <div className="form-success-state">
              <div className="success-icon-wrapper animate-pulse">
                <CheckCircle2 className="success-check-icon" />
              </div>
              <h3 className="success-title">Message Sent Successfully!</h3>
              <p className="success-desc">
                Thank you for reaching out. We have logged your request and our automated support routers will allocate it to our team.
              </p>
              <button className="btn-secondary" onClick={() => setIsSent(false)}>
                Send another message
              </button>
            </div>
          ) : (
            /* Main Form Element */
            <form onSubmit={handleSubmit}>
              <div className="form-double-group">
                <div className="form-group">
                  <label className="form-label" htmlFor="contact-name">Name <span className="label-req">*</span></label>
                  <input 
                    type="text" 
                    id="contact-name"
                    name="name"
                    className="form-input" 
                    placeholder="Your name" 
                    value={formData.name}
                    onChange={handleChange}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="contact-email">Email <span className="label-req">*</span></label>
                  <input 
                    type="email" 
                    id="contact-email"
                    name="email"
                    className="form-input" 
                    placeholder="you@example.com" 
                    value={formData.email}
                    onChange={handleChange}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="contact-subject">Subject</label>
                <input 
                  type="text" 
                  id="contact-subject"
                  name="subject"
                  className="form-input" 
                  placeholder="How can we help?" 
                  value={formData.subject}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="contact-message">Message <span className="label-req">*</span></label>
                <textarea 
                  id="contact-message"
                  name="message"
                  className="form-input" 
                  placeholder="Type your message here..." 
                  value={formData.message}
                  onChange={handleChange}
                  disabled={loading}
                  required
                />
              </div>

              {errorMsg && <div className="contact-error-msg">{errorMsg}</div>}

              <button type="submit" className="btn-primary form-submit-btn" disabled={loading}>
                {loading ? (
                  <>
                    <div className="form-spinner"></div> Sending...
                  </>
                ) : (
                  <>
                    Send Message <Send size={16} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
