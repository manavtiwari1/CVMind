import { ArrowLeft, FileText, LifeBuoy } from 'lucide-react';
import cvmindLogo from '../assets/cvmind_logo_transparent.png';
import './NotFound.css';

interface NotFoundProps {
  setCurrentPage: (page: string) => void;
}

export default function NotFound({ setCurrentPage }: NotFoundProps) {
  return (
    <section className="nf" aria-labelledby="nf-title">
      <button type="button" className="nf-logo" onClick={() => setCurrentPage('home')} aria-label="CVMind home">
        <img src={cvmindLogo} alt="" />
      </button>
      <p className="nf-code">404</p>
      <h1 id="nf-title" className="nf-title">We couldn't find that page</h1>
      <p className="nf-body">
        The link may be broken, or the page may have moved. Check the address, or pick up from one of these.
      </p>
      <div className="nf-actions">
        <button type="button" className="nf-btn nf-btn--primary" onClick={() => setCurrentPage('home')}>
          <ArrowLeft size={16} /> Back to home
        </button>
        <button type="button" className="nf-btn" onClick={() => setCurrentPage('resume-builder')}>
          <FileText size={16} /> Build a resume
        </button>
        <button type="button" className="nf-btn" onClick={() => setCurrentPage('help-center')}>
          <LifeBuoy size={16} /> Help Center
        </button>
      </div>
    </section>
  );
}
