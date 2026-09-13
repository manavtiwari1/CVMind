import { useState, useEffect } from 'react';
import { Trophy, Users, Award } from 'lucide-react';

export default function Contests() {
  const [registered, setRegistered] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState({ hours: 41, minutes: 28, seconds: 15 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const leaderboard = [
    { rank: 1, user: 'alex_algorithm', rating: 2410, score: 300, time: '24m 12s', country: '🇺🇸' },
    { rank: 2, user: 'priya_code_ai', rating: 2380, score: 300, time: '27m 44s', country: '🇮🇳' },
    { rank: 3, user: 'dev_master99', rating: 2295, score: 300, time: '31m 02s', country: '🇩🇪' },
    { rank: 4, user: 'chen_dp_ninja', rating: 2240, score: 300, time: '34m 18s', country: '🇸🇬' },
    { rank: 5, user: 'manav_tiwari', rating: 2190, score: 300, time: '38m 50s', country: '🇮🇳' }
  ];

  return (
    <div style={{ maxWidth: '1680px', margin: '0 auto', padding: '36px 40px 64px 40px', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', padding: '5px 14px', borderRadius: '99px', fontSize: '0.78rem', fontWeight: 700, marginBottom: '10px', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
          <Trophy size={14} />
          COMPETITIVE CODING ARENA
        </div>
        <h2 style={{ fontSize: '1.9rem', fontWeight: 800, margin: '0 0 8px 0', color: '#0f172a' }}>
          Contests & Global Leaderboards
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.96rem', margin: 0, maxWidth: '640px' }}>
          Compete in bi-weekly rating contests, climb global rankings, and win direct recruiter referrals.
        </p>
      </div>

      {/* Featured Contest Card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.06), rgba(41, 151, 255, 0.05)), #ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '20px',
        padding: '32px',
        marginBottom: '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '24px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
      }}>
        <div>
          <span style={{ fontSize: '0.74rem', background: '#fffbeb', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '3px 10px', borderRadius: '99px', fontWeight: 700 }}>
            STARTING SOON
          </span>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: '12px 0 6px 0' }}>
            CVmind Bi-Weekly Contest #14
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 16px 0' }}>
            4 Algorithmic Challenges • 90 Minutes • Rating Affected
          </p>

          <div style={{ display: 'flex', gap: '20px', color: '#475569', fontSize: '0.86rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={16} color="#2563eb" />
              <span>1,420 Registered</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Award size={16} color="#d97706" />
              <span>Top 50 Receive Recruiter Direct Referrals</span>
            </div>
          </div>
        </div>

        {/* Countdown & Action */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 14px', minWidth: '60px' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{timeLeft.hours}</div>
              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>HOURS</div>
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 14px', minWidth: '60px' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{timeLeft.minutes}</div>
              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>MINS</div>
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 14px', minWidth: '60px' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#d97706' }}>{timeLeft.seconds}</div>
              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>SECS</div>
            </div>
          </div>

          <button
            onClick={() => setRegistered(true)}
            className="btn-primary-submit"
            style={{ width: '100%', padding: '10px' }}
          >
            {registered ? 'Registered for Contest ✓' : 'Register for Contest'}
          </button>
        </div>
      </div>

      {/* Global Leaderboard Table */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '20px',
        padding: '28px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
      }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 16px 0', color: '#0f172a' }}>
          Global Hall of Fame
        </h3>

        <table className="problem-table">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>Rank</th>
              <th>Coder</th>
              <th>Country</th>
              <th>Rating</th>
              <th>Score</th>
              <th>Finish Time</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((row) => (
              <tr key={row.rank}>
                <td style={{ fontWeight: 800, color: row.rank <= 3 ? '#d97706' : '#64748b' }}>
                  #{row.rank}
                </td>
                <td style={{ fontWeight: 700, color: '#0f172a' }}>
                  {row.user}
                </td>
                <td>{row.country}</td>
                <td style={{ color: '#2563eb', fontWeight: 700 }}>{row.rating}</td>
                <td style={{ color: '#059669', fontWeight: 700 }}>{row.score}</td>
                <td style={{ color: '#64748b', fontSize: '0.84rem' }}>{row.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
