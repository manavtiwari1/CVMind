import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, Phone, ChevronRight } from 'lucide-react';
import { SUPPORT_EMAIL, WHATSAPP_DISPLAY, whatsappLink, mailLink, telLink } from '../data/support';
import './ContactDialog.css';

interface ContactDialogProps {
  open: boolean;
  onClose: () => void;
}

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
    <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.32l-.34-.2-3.56.94.95-3.47-.22-.36a9.38 9.38 0 0 1-1.44-5c0-5.19 4.23-9.42 9.43-9.42 2.52 0 4.88.98 6.66 2.77a9.36 9.36 0 0 1 2.76 6.66c0 5.2-4.23 9.42-9.43 9.42m8.02-17.44A11.27 11.27 0 0 0 12.05.75C5.8.75.7 5.84.7 12.1c0 2 .52 3.95 1.52 5.67L.6 23.25l5.6-1.47a11.3 11.3 0 0 0 5.84 1.6h.01c6.25 0 11.35-5.1 11.35-11.35 0-3.03-1.18-5.88-3.33-8.02" />
  </svg>
);

export default function ContactDialog({ open, onClose }: ContactDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="contact-dlg-overlay" onClick={onClose}>
      <div
        className="contact-dlg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-dlg-title"
        onClick={e => e.stopPropagation()}
      >
        <button className="contact-dlg-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <h2 id="contact-dlg-title" className="contact-dlg-title">Contact us</h2>
        <p className="contact-dlg-sub">Choose how you'd like to reach the CV Mind team.</p>

        <div className="contact-dlg-options">
          <a
            className="contact-dlg-option"
            href={whatsappLink()}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
          >
            <span className="contact-dlg-icon whatsapp"><WhatsAppIcon /></span>
            <span className="contact-dlg-text">
              <span className="contact-dlg-label">WhatsApp</span>
              <span className="contact-dlg-value">{WHATSAPP_DISPLAY}</span>
            </span>
            <ChevronRight size={18} className="contact-dlg-chevron" />
          </a>

          <a className="contact-dlg-option" href={mailLink()} onClick={onClose}>
            <span className="contact-dlg-icon mail"><Mail size={20} /></span>
            <span className="contact-dlg-text">
              <span className="contact-dlg-label">Email</span>
              <span className="contact-dlg-value">{SUPPORT_EMAIL}</span>
            </span>
            <ChevronRight size={18} className="contact-dlg-chevron" />
          </a>

          <a className="contact-dlg-option" href={telLink} onClick={onClose}>
            <span className="contact-dlg-icon phone"><Phone size={20} /></span>
            <span className="contact-dlg-text">
              <span className="contact-dlg-label">Call</span>
              <span className="contact-dlg-value">{WHATSAPP_DISPLAY}</span>
            </span>
            <ChevronRight size={18} className="contact-dlg-chevron" />
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
}
