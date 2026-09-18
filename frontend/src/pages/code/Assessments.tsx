import { useState, useEffect } from 'react';
import { Shield, Clock, AlertTriangle, Award, ArrowRight } from 'lucide-react';
import { CODING_PROBLEMS, type CodingProblem } from '../../data/codingProblems';

interface AssessmentsProps {
  onStartAssessment: (problem: CodingProblem) => void;
}

export default function Assessments({ onStartAssessment }: AssessmentsProps) {
  const [tabSwitches, setTabSwitches] = useState<number>(0);
  const [warningDismissed, setWarningDismissed] = useState<boolean>(false);

  // Monitor visibility change (anti-cheat telemetry demonstration)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setTabSwitches(prev => prev + 1);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const sampleAssessment = {
    title: 'Software Development Engineer I — Technical Screening',
    company: 'CVmind Partner Network & Tech Recruiters',
    duration: '60 Minutes',
    totalQuestions: 3,
    proctoringRules: [
      'Fullscreen browser environment enforced during test',
      'Tab switch & window defocus events logged for recruiters',
      'Copy & paste telemetry monitoring active',
      'Plagiarism cross-checking against global codebases'
    ]
  };

  return (
    <div style={{ maxWidth: '1680px', margin: '0 auto', padding: '36px 40px 64px 40px', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ecfdf5', color: '#059669', padding: '5px 14px', borderRadius: '99px', fontSize: '0.78rem', fontWeight: 700, marginBottom: '10px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
          <Shield size={14} />
          PROCTORED TECHNICAL ASSESSMENTS
        </div>
        <h2 style={{ fontSize: '1.9rem', fontWeight: 800, margin: '0 0 8px 0', color: '#0f172a' }}>
          Assessments & Recruiter Screening Mode
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.96rem', margin: 0, maxWidth: '640px' }}>
          Designed for university placement drives and hiring companies to conduct verifiable, anti-cheat technical screenings.
        </p>
      </div>

      {/* Tab Switch Detection Warning Indicator */}
      {tabSwitches > 0 && !warningDismissed && (
        <div style={{
          background: '#fffbeb',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: '12px',
          padding: '14px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#d97706' }}>
            <AlertTriangle size={20} />
            <span style={{ fontSize: '0.88rem' }}>
              <strong>Proctoring Alert:</strong> {tabSwitches} window-switch event(s) recorded by anti-cheat telemetry.
            </span>
          </div>
          <button
            onClick={() => setWarningDismissed(true)}
            style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem' }}
          >
            Acknowledge
          </button>
        </div>
      )}

      {/* Active Assessment Card */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '20px',
        padding: '32px',
        marginBottom: '32px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span style={{ fontSize: '0.74rem', background: 'rgba(41, 151, 255, 0.08)', color: '#2563eb', padding: '3px 10px', borderRadius: '99px', fontWeight: 700 }}>
              OFFICIAL ASSESSMENT
            </span>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '12px 0 6px 0' }}>
              {sampleAssessment.title}
            </h3>
            <div style={{ color: '#64748b', fontSize: '0.9rem' }}>
              Host: {sampleAssessment.company}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 16px', textAlign: 'center' }}>
              <Clock size={16} color="#2563eb" style={{ margin: '0 auto 4px auto' }} />
              <div style={{ fontSize: '0.74rem', color: '#64748b' }}>DURATION</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{sampleAssessment.duration}</div>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 16px', textAlign: 'center' }}>
              <Award size={16} color="#059669" style={{ margin: '0 auto 4px auto' }} />
              <div style={{ fontSize: '0.74rem', color: '#64748b' }}>QUESTIONS</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{sampleAssessment.totalQuestions} Problems</div>
            </div>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '24px 0' }} />

        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: '0 0 12px 0' }}>
            Anti-Cheating & Proctoring Safeguards:
          </h4>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#334155', fontSize: '0.88rem', lineHeight: 1.7 }}>
            {sampleAssessment.proctoringRules.map((rule, idx) => (
              <li key={idx}>{rule}</li>
            ))}
          </ul>
        </div>

        <button
          onClick={() => onStartAssessment(CODING_PROBLEMS[0])}
          className="btn-primary-submit"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}
        >
          Launch Assessment Simulation
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
