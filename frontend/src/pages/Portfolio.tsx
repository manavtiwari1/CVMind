import { useState, useEffect } from 'react';
import {
  AlertCircle, Download, Printer, Globe, ArrowLeft, ArrowUpRight
} from 'lucide-react';
import SkeletonLoader from '../components/SkeletonLoader';
import ReportContent from '../components/ReportContent';
import { getErrorMessage } from '../utils/errors';
import { API_BASE } from '../lib/apiBase';
import { authFetch } from '../lib/authFetch';
import type { SavedWork } from '../types/api';
import './Portfolio.css';

interface PortfolioProps {
  // The older public link, /portfolio/<document id>
  workId?: string;
  // A resume share link, /r/<name>; counts a view
  slug?: string;
}

export default function Portfolio({ workId, slug }: PortfolioProps) {
  const target = slug || workId;
  const [fetchLoading, setLoading] = useState(true);
  const [fetchError, setErrorMsg] = useState<string | null>(null);
  const [workData, setWorkData] = useState<SavedWork | null>(null);
  const [themeName, setThemeName] = useState('classic');

  // Without a work id or link name in the URL there is nothing to load
  const loading = !!target && fetchLoading;
  const errorMsg = target ? fetchError : 'No resume portfolio link detected. Please check the URL.';

  useEffect(() => {
    if (!target) return;

    const fetchPortfolio = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        // Share links send where the visitor came from (the API request's own referrer is this site),
        // and the owner's session, so their own visits aren't counted
        const response = slug
          ? await authFetch(`${API_BASE}/api/r/${encodeURIComponent(slug)}?from=${encodeURIComponent(document.referrer || '')}`)
          : await fetch(`${API_BASE}/api/portfolio/${workId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load portfolio.');
        }

        if (data.success && data.data) {
          setWorkData(data.data);
        } else {
          throw new Error('Portfolio found, but content is corrupt.');
        }
      } catch (err) {
        console.error('Fetch portfolio error:', err);
        setErrorMsg(getErrorMessage(err) || 'Error connecting to servers.');
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, [target, slug, workId]);

  const handlePrint = () => {
    if (!workData) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Resume Portfolio – ${workData.title}</title>
    <style>
      @page { margin: 0.6in; }
      body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: Arial, sans-serif; }
      * { box-sizing: border-box; }
    </style></head><body>${workData.htmlContent}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 600);
  };

  const handleDownloadDOCX = () => {
    if (!workData) return;
    const wordDoc = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>${workData.title}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>90</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->
<style>body{font-family:Arial,sans-serif;margin:1in;}@page{margin:1in;}</style>
</head><body>${workData.htmlContent}</body></html>`;
    const blob = new Blob(['\ufeff', wordDoc], { type: 'application/msword' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `${workData.title.replace(/\s+/g, '_')}.doc`,
    });
    a.click();
    URL.revokeObjectURL(a.href);
    a.remove();
  };

  if (loading) {
    return (
      <div className="pf-loading-container">
        <SkeletonLoader
          type="page"
          title="Loading portfolio..."
          subtitle="Fetching your resume and portfolio data..."
          card={false}
        />
      </div>
    );
  }

  if (errorMsg || !workData) {
    return (
      <div className="pf-error-container animate-fade-in">
        <div className="pf-error-card glass-card">
          <AlertCircle size={40} className="text-red" />
          <h2>{slug ? 'This resume link is not available' : 'Portfolio Load Failed'}</h2>
          <p>{errorMsg || 'Unable to display this portfolio.'}</p>
          <a href="/" className="btn-primary pf-home-btn">
            <ArrowLeft size={16} /> Return to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="pf-container animate-fade-in-up">
      {/* Dynamic top bar options */}
      <div className="pf-topbar">
        <div className="pf-topbar-left">
          <div className="pf-badge">
            <Globe size={13} className="text-blue" /> Public Portfolio
          </div>
          <h1 className="pf-document-title" title={workData.title}>{workData.title}</h1>
        </div>
        <div className="pf-topbar-right">
          <select 
            value={themeName} 
            onChange={(e) => setThemeName(e.target.value)} 
            className="pf-btn"
            style={{ cursor: 'pointer', outline: 'none' }}
            title="Choose Portfolio Theme"
          >
            <option value="classic">Classic White</option>
            <option value="dark">Sleek Dark Mode</option>
            <option value="terminal">Developer Terminal</option>
            <option value="executive">Minimal Executive</option>
          </select>

          <button className="pf-btn" onClick={handlePrint}>
            <Printer size={13} /> Print / PDF
          </button>
          <button className="pf-btn btn-secondary" onClick={handleDownloadDOCX}>
            <Download size={13} /> Word DOC
          </button>
          <a href="/" className="btn-primary pf-create-btn">
            Build Mine <ArrowUpRight size={13} />
          </a>
        </div>
      </div>

      {/* Main Resume view board */}
      <div className={`pf-sheet-shell theme-${themeName}`}>
        <div className="pf-sheet-paper">
          <div 
            className="pf-sheet-content"
            dangerouslySetInnerHTML={{ __html: workData.htmlContent }}
          />
        </div>
      </div>

      {/* Watermark brand footer */}
      <div className="pf-watermark">
        <span>Powered by </span>
        <a href="/" className="pf-watermark-link">CV Mind</a>
        <span> · High-impact ATS Resume Intelligence.</span>
        {workId && <ReportContent targetType="work" targetId={workId} />}
      </div>
    </div>
  );
}
