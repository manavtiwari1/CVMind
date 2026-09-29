import { useState } from 'react';
import { FileSpreadsheet, FileJson, FileText } from 'lucide-react';
import type { AdminStats } from '../types';

interface ReportsProps {
  stats: AdminStats;
}

export default function Reports({ stats }: ReportsProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const triggerExport = (reportType: string, format: string) => {
    const key = `${reportType}-${format}`;
    setLoading(key);
    setTimeout(() => {
      setLoading(null);
      // Simulate download
      alert(`Successfully generated and downloaded ${reportType} report in ${format.toUpperCase()} format!`);
    }, 1500);
  };

  const reportsList = [
    {
      key: 'users',
      name: 'User Accounts Report',
      desc: `${stats.totalLogins || 0} logins with authentication methods, emails and registration history.`,
      icon: <FileSpreadsheet size={18} style={{ color: 'var(--blue)' }} />
    },
    {
      key: 'revenue',
      name: 'Revenue & Transaction Logs',
      desc: `${stats.totalPayments || 0} payment records with billing amounts, gateway details and currency types.`,
      icon: <FileText size={18} style={{ color: 'var(--green)' }} />
    },
    {
      key: 'ai-usage',
      name: 'AI Module Usage Report',
      desc: `${(stats.totalScans || 0) + (stats.totalFixes || 0) + (stats.totalTailors || 0) + (stats.totalPreps || 0)} tracked AI requests across core modules.`,
      icon: <FileJson size={18} style={{ color: 'var(--purple)' }} />
    },
    {
      key: 'resume-scans',
      name: 'Resume Scores & Trends',
      desc: `${stats.totalScans || 0} scan records with ATS distribution and missing keyword frequencies.`,
      icon: <FileSpreadsheet size={18} style={{ color: 'var(--cyan)' }} />
    }
  ];

  return (
    <div className="section-animate">
      <div className="section-header">
        <div className="section-header-left">
          <h2>Exportable Reports</h2>
          <p>Download full structured system snapshots in standard business formats</p>
        </div>
      </div>

      <div className="export-grid">
        {reportsList.map(r => (
          <div className="export-card" key={r.key}>
            <div className="export-card-icon" style={{ background: 'var(--surface-3)' }}>
              {r.icon}
            </div>
            <div className="export-card-name">{r.name}</div>
            <div className="export-card-desc">{r.desc}</div>
            <div className="export-card-btns">
              {['csv', 'excel', 'json', 'pdf'].map(format => {
                const key = `${r.key}-${format}`;
                const isBtnLoading = loading === key;
                return (
                  <button
                    key={format}
                    className="export-format-btn"
                    disabled={!!loading}
                    onClick={() => triggerExport(r.key, format)}
                  >
                    {isBtnLoading ? 'Exporting…' : format.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
