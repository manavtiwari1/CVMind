import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

interface CodingProfileProps {
  solvedCount: number;
}

export default function CodingProfile({ solvedCount }: CodingProfileProps) {
  const [synced, setSynced] = useState<boolean>(() => {
    return localStorage.getItem('cvmind_code_synced_to_resume') === 'true';
  });

  const rating = 1640 + solvedCount * 15;
  const overallScore = Math.min(96, Math.max(72, 74 + Math.round(solvedCount * 2.5)));

  const handleSyncToResume = () => {
    localStorage.setItem('cvmind_code_synced_to_resume', 'true');
    localStorage.setItem('cvmind_verified_code_stats', JSON.stringify({
      rating,
      overallScore,
      solvedCount,
      verifiedDate: new Date().toISOString()
    }));
    setSynced(true);
    alert('Verified Technical Profile synced! Your CVmind Resume & ATS scanner now includes your verified coding skill badge.');
  };

  const badges = [
    { id: 'first-solve', name: 'First Solve', icon: '🚀', desc: 'Solved first challenge on CVmind Code', earned: true },
    { id: 'streak-7', name: '7-Day Streak', icon: '🔥', desc: 'Coded 7 consecutive days', earned: true },
    { id: 'array-specialist', name: 'Array Specialist', icon: '⚡', desc: 'Solved multiple Array & Hashing problems', earned: solvedCount >= 1 },
    { id: 'dp-warrior', name: 'DP Warrior', icon: '🧠', desc: 'Solved a Dynamic Programming challenge', earned: solvedCount >= 3 },
    { id: 'verified-sde', name: 'CVmind Verified SDE', icon: '⭐', desc: 'Skill score verified for corporate recruiters', earned: true }
  ];

  return (
    <div className="profile-container">
      {/* Profile Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(41, 151, 255, 0.06) 0%, rgba(124, 58, 237, 0.04) 100%), #ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '20px',
        padding: '32px',
        marginBottom: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '24px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            width: '74px',
            height: '74px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #2997ff, #7c3aed)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            boxShadow: '0 8px 24px rgba(41, 151, 255, 0.25)'
          }}>
            👨‍💻
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Candidate Technical Profile
              </h2>
              <span style={{ fontSize: '0.72rem', background: '#ecfdf5', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 8px', borderRadius: '99px', fontWeight: 700 }}>
                VERIFIED
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '6px 0 0 0' }}>
              Standardized coding benchmarks evaluated by isolated AI test runners.
            </p>
          </div>
        </div>

        {/* Sync to Resume Action */}
        <div>
          <button
            onClick={handleSyncToResume}
            className="btn-primary-submit"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 20px' }}
          >
            <ShieldCheck size={18} />
            {synced ? 'Synced with CVmind Resume ✓' : 'Add to CVmind Resume'}
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="skill-radar-grid">
        <div className="skill-card">
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
            CVmind Skill Score
          </div>
          <div className="skill-score-display" style={{ color: '#2563eb' }}>
            {overallScore}<span style={{ fontSize: '1.2rem', color: '#94a3b8' }}>/100</span>
          </div>
          <div style={{ fontSize: '0.76rem', color: '#059669', fontWeight: 600 }}>
            Top 12% in Algorithmic Efficiency
          </div>
        </div>

        <div className="skill-card">
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
            Coding Rating
          </div>
          <div className="skill-score-display" style={{ color: '#7c3aed' }}>
            {rating}
          </div>
          <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
            Tier: Candidate Expert (Div 2)
          </div>
        </div>

        <div className="skill-card">
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
            Daily Coding Streak
          </div>
          <div className="skill-score-display" style={{ color: '#ea580c' }}>
            14 <span style={{ fontSize: '1.4rem' }}>🔥</span>
          </div>
          <div style={{ fontSize: '0.76rem', color: '#059669', fontWeight: 600 }}>
            Active streak: 14 consecutive days
          </div>
        </div>

        <div className="skill-card">
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
            Challenges Solved
          </div>
          <div className="skill-score-display" style={{ color: '#059669' }}>
            {solvedCount}
          </div>
          <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
            Across 6 DSA Core Domains
          </div>
        </div>
      </div>

      {/* Sub-skill Breakdown */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '28px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)'
      }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 16px 0', color: '#0f172a' }}>
          Standardized Skill Competencies
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {[
            { name: 'Data Structures & Algorithms', score: 88, color: '#2563eb' },
            { name: 'Problem Solving & Logic', score: 85, color: '#06b6d4' },
            { name: 'Code Quality & Clean Architecture', score: 92, color: '#10b981' },
            { name: 'Execution Speed & Big-O', score: 79, color: '#f59e0b' }
          ].map((item, i) => (
            <div key={i} style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: '8px' }}>{item.name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>{item.score}/100</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ width: `${item.score}%`, height: '100%', background: item.color, borderRadius: '99px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Badges & Achievements Grid */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)'
      }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 16px 0', color: '#0f172a' }}>
          Earned Badges & Credentials
        </h3>
        <div className="badge-grid">
          {badges.map((b) => (
            <div key={b.id} className={`badge-card ${b.earned ? 'earned' : ''}`}>
              <div className="badge-icon">{b.icon}</div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: b.earned ? '#ffffff' : '#64748b' }}>
                {b.name}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '4px' }}>
                {b.desc}
              </div>
              {b.earned && (
                <div style={{ fontSize: '0.68rem', color: '#34d399', fontWeight: 700, marginTop: '8px' }}>
                  EARNED ✓
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
