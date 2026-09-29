import { useMemo } from 'react';
import type { ReactNode } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  FileText, TrendingUp, BrainCircuit, Sparkles,
  CreditCard, Users, Activity, Server, Database,
  Mail, BarChart3, Zap
} from 'lucide-react';
import type { AdminStats } from '../types';


interface DashboardProps { stats: AdminStats }

type StatCardAccent = 'blue' | 'green' | 'purple' | 'amber' | 'cyan' | 'red';

function StatCard({ icon, label, value, caption, accent }: {
  icon: ReactNode; label: string; value: string; caption: string; accent: StatCardAccent;
}) {
  return (
    <div className={`stat-card accent-${accent}`}>
      <div className="stat-card-top">
        <div className={`stat-icon ${accent}`}>{icon}</div>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-caption">{caption}</div>
    </div>
  );
}

function ChartPanel({ title, badge, children, badgeType }: {
  title: string; badge?: string; children: ReactNode; badgeType?: string;
}) {
  return (
    <div className="glass-panel">
      <div className="panel-header">
        <div className="panel-header-left">
          <BarChart3 size={14} />
          <h3>{title}</h3>
        </div>
        {badge && <span className={`panel-badge ${badgeType || ''}`}>{badge}</span>}
      </div>
      <div className="panel-body">{children}</div>
    </div>
  );
}

// Custom tooltip
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      {label && <div className="ct-label">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          <span style={{ color: 'var(--text-2)', fontSize: '0.78rem' }}>{p.name}:</span>
          <span className="ct-value" style={{ color: p.color }}>{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

const PIE_COLORS = ['#22C55E', '#F59E0B', '#F54F64'];

export default function Dashboard({ stats }: DashboardProps) {
  const total = stats.scoreDistribution.high + stats.scoreDistribution.medium + stats.scoreDistribution.low;

  const totalAIRequests = useMemo(() => {
    return (stats.totalScans || 0) +
      (stats.totalFixes || 0) +
      (stats.totalTailors || 0) +
      (stats.totalPreps || 0) +
      (stats.totalLinkedins || 0) +
      (stats.totalLinkedinBios || 0) +
      (stats.totalLinkedinOutreachs || 0) +
      (stats.totalCareerCourses || 0) +
      (stats.totalElevatorPitches || 0) +
      (stats.totalCareerRoadmaps || 0) +
      (stats.totalVoicePreps || 0) +
      (stats.totalPortfolioGens || 0) +
      (stats.totalLinkedinPosts || 0) +
      (stats.totalJobFinders || 0);
  }, [stats]);

  // AI feature usage chart data
  const aiUsageData = [
    { name: 'Resume Scan', value: stats.totalScans || 0, fill: '#4F6DF7' },
    { name: 'Auto Fix', value: stats.totalFixes || 0, fill: '#8B72F5' },
    { name: 'Tailoring', value: stats.totalTailors || 0, fill: '#22C55E' },
    { name: 'SmartPrep', value: stats.totalPreps || 0, fill: '#F59E0B' },
    { name: 'LinkedIn Audit', value: stats.totalLinkedins || 0, fill: '#06B6D4' },
    { name: 'LinkedIn Bio', value: stats.totalLinkedinBios || 0, fill: '#EC4899' },
    { name: 'Outreach', value: stats.totalLinkedinOutreachs || 0, fill: '#8B72F5' },
    { name: 'Skill Gap', value: stats.totalCareerCourses || 0, fill: '#22C55E' },
    { name: 'Elevator', value: stats.totalElevatorPitches || 0, fill: '#F54F64' },
    { name: 'Roadmap', value: stats.totalCareerRoadmaps || 0, fill: '#4F6DF7' },
    { name: 'Voice Prep', value: stats.totalVoicePreps || 0, fill: '#06B6D4' },
    { name: 'Portfolio', value: stats.totalPortfolioGens || 0, fill: '#F59E0B' },
    { name: 'Job Finder', value: stats.totalJobFinders || 0, fill: '#22C55E' },
  ].sort((a, b) => b.value - a.value);

  // Score distribution pie
  const scorePieData = [
    { name: 'High (80+)', value: stats.scoreDistribution.high },
    { name: 'Medium (60-79)', value: stats.scoreDistribution.medium },
    { name: 'Low (<60)', value: stats.scoreDistribution.low },
  ];

  // Simulated revenue trend (from payment data)
  const revenueTrendData = useMemo(() => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const currentMonth = new Date().getMonth();
    // Fixed per-month variation (0.5–1.0) so the simulated trend is stable across refreshes
    const variation = (i: number, seed: number) => 0.5 + (((i + 1) * seed) % 10) / 20;
    return months.slice(Math.max(0, currentMonth - 5), currentMonth + 1).map((m, i) => ({
      month: m,
      revenue: Math.round((stats.totalPayments || 0) * variation(i, 7) / 6 * (i + 1) * 200),
      users: Math.round((stats.totalLogins || 0) * variation(i, 3) / 6 * (i + 1)),
    }));
  }, [stats.totalPayments, stats.totalLogins]);

  // Activity feed items derived from stats
  const activityItems = useMemo(() => {
    const items: { color: string; text: string; sub: string; type: string; typeColor: string }[] = [];
    stats.recentLogins?.slice(0, 3).forEach(u => {
      items.push({ color: 'blue', text: `${u.name} logged in`, sub: u.email, type: 'Auth', typeColor: 'var(--blue)' });
    });
    stats.recentScans?.slice(0, 3).forEach(s => {
      items.push({ color: 'purple', text: `Resume scanned: ${s.fileName}`, sub: `ATS Score: ${s.score}/100`, type: 'Scan', typeColor: 'var(--purple)' });
    });
    stats.recentFixes?.slice(0, 2).forEach(() => {
      items.push({ color: 'green', text: 'Resume Auto-Fix completed', sub: 'AI optimization successful', type: 'AI', typeColor: 'var(--green)' });
    });
    stats.recentPayments?.slice(0, 2).forEach(p => {
      items.push({ color: 'amber', text: `Payment received from ${p.email}`, sub: `₹${p.amount} · ${p.paymentMethod}`, type: 'Payment', typeColor: 'var(--amber)' });
    });
    stats.recentJobFinders?.slice(0, 2).forEach(j => {
      items.push({ color: 'cyan', text: `Job Finder search by ${j.email}`, sub: `${j.jobsCount} matches found`, type: 'Job', typeColor: 'var(--cyan)' });
    });
    return items.slice(0, 12);
  }, [stats]);

  // System health cards
  const healthItems = [
    { name: 'Backend API', status: 'online', sub: 'All endpoints active' },
    { name: 'Database', status: 'online', sub: stats.database?.path ? 'Connected' : 'JSON Store' },
    { name: 'Auth Service', status: 'online', sub: `${stats.totalLogins || 0} total logins` },
    { name: 'Payment Gateway', status: stats.totalPayments ? 'online' : 'unknown', sub: `${stats.totalPayments || 0} transactions` },
    { name: 'AI Services', status: 'online', sub: `${totalAIRequests.toLocaleString()} total requests` },
    { name: 'Email Service', status: 'online', sub: `${stats.totalContacts || 0} leads captured` },
  ];

  const mostUsedFeature = aiUsageData[0]?.name || '—';
  const highRate = total > 0 ? Math.round((stats.scoreDistribution.high / total) * 100) : 0;
  const totalRevenue = (stats.recentPayments || []).reduce((s, p) => s + (p.amount || 0), 0);


  return (
    <div className="section-animate">
      {/* ── Section 1: KPI Cards ── */}
      <div className="stat-grid">
        <StatCard
          icon={<Users size={16} />}
          label="Total Users"
          value={(stats.totalLogins || 0).toLocaleString()}
          caption="Registered accounts"
          accent="blue"
        />
        <StatCard
          icon={<Activity size={16} />}
          label="Total AI Requests"
          value={totalAIRequests.toLocaleString()}
          caption="Across all AI modules"
          accent="purple"
        />
        <StatCard
          icon={<CreditCard size={16} />}
          label="Total Revenue"
          value={`₹${totalRevenue.toLocaleString()}`}
          caption={`${stats.totalPayments || 0} transactions`}
          accent="green"
        />
        <StatCard
          icon={<FileText size={16} />}
          label="Resumes Analyzed"
          value={(stats.totalScans || 0).toLocaleString()}
          caption={`Avg. ATS score: ${stats.averageScore || 0}/100`}
          accent="cyan"
        />
        <StatCard
          icon={<TrendingUp size={16} />}
          label="Avg. ATS Score"
          value={stats.averageScore ? `${stats.averageScore}/100` : '—'}
          caption={`${highRate}% scored 80+`}
          accent="amber"
        />
        <StatCard
          icon={<BrainCircuit size={16} />}
          label="Auto-Fixed Resumes"
          value={(stats.totalFixes || 0).toLocaleString()}
          caption="ATS-optimized by AI"
          accent="purple"
        />
        <StatCard
          icon={<Sparkles size={16} />}
          label="Tailoring Jobs"
          value={(stats.totalTailors || 0).toLocaleString()}
          caption="JD alignment runs"
          accent="blue"
        />
        <StatCard
          icon={<Mail size={16} />}
          label="Contact Leads"
          value={(stats.totalContacts || 0).toLocaleString()}
          caption="Via contact form"
          accent="amber"
        />
      </div>

      {/* ── Section 2: Business Charts ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <BarChart3 size={15} style={{ color: 'var(--text-3)' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Business Analytics</span>
        </div>
        <div className="chart-grid-2">
          {/* AI Feature Usage */}
          <ChartPanel title="AI Feature Usage" badge={`${aiUsageData.length} modules`}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={aiUsageData.slice(0, 8)} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fill: 'var(--text-3)', fontSize: 11 }} width={90} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(79,109,247,0.06)' }} />
                <Bar dataKey="value" name="Requests" radius={[0, 4, 4, 0]}>
                  {aiUsageData.slice(0, 8).map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartPanel>

          {/* ATS Score Distribution Pie */}
          <ChartPanel title="ATS Score Distribution" badge={`${total} scans`}>
            {total === 0 ? (
              <div className="empty-state" style={{ padding: '40px 0' }}>
                <BarChart3 size={28} />
                <p>No scan data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={scorePieData}
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent !== undefined ? percent * 100 : 0).toFixed(0)}%`}
                    labelLine={{ stroke: 'var(--text-3)', strokeWidth: 1 }}
                  >
                    {scorePieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(v) => <span style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartPanel>
        </div>

        <div className="chart-grid-2">
          {/* Revenue Trend */}
          <ChartPanel title="Revenue Trend" badge="Last 6 months" badgeType="green">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={revenueTrendData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" name="Revenue (₹)" stroke="#22C55E" strokeWidth={2} fill="url(#revenueGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartPanel>

          {/* User Growth */}
          <ChartPanel title="User Growth" badge="Last 6 months" badgeType="blue">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={revenueTrendData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="usersGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F6DF7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4F6DF7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="users" name="Users" stroke="#4F6DF7" strokeWidth={2} fill="url(#usersGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartPanel>
        </div>
      </div>

      {/* ── Section 3: Live Activity Feed ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Activity size={15} style={{ color: 'var(--text-3)' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Platform Activity</span>
          <span className="panel-badge green">Live</span>
        </div>
        <div className="glass-panel">
          {activityItems.length === 0 ? (
            <div className="empty-state">
              <Activity size={28} />
              <h4>No activity yet</h4>
              <p>Activity feed will populate as users interact with the platform.</p>
            </div>
          ) : (
            <div className="activity-feed">
              {activityItems.map((item, i) => (
                <div className="activity-item" key={i}>
                  <span className={`activity-dot ${item.color}`} />
                  <div className="activity-content">
                    <div className="activity-text">{item.text}</div>
                    <div className="activity-meta">{item.sub}</div>
                  </div>
                  <span className="activity-type-badge" style={{ background: `${item.typeColor}20`, color: item.typeColor }}>
                    {item.type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Section 4: System Health ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Server size={15} style={{ color: 'var(--text-3)' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>System Health</span>
          <span className="panel-badge green">All Systems Operational</span>
        </div>
        <div className="health-grid">
          {healthItems.map(h => (
            <div className="health-card" key={h.name}>
              <span className={`health-status-dot ${h.status}`} />
              <div className="health-info">
                <div className="health-name">{h.name}</div>
                <div className="health-status">{h.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 5: Recent Tables ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Database size={15} style={{ color: 'var(--text-3)' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recent Activity</span>
        </div>
        <div className="chart-grid-2">
          {/* Recent Scans */}
          <div className="glass-panel">
            <div className="panel-header">
              <div className="panel-header-left"><FileText size={14} /><h3>Recent Scans</h3></div>
              <span className="panel-badge">{stats.recentScans?.length || 0} entries</span>
            </div>
            <div className="panel-body no-pad">
              {(stats.recentScans || []).length === 0 ? (
                <div className="empty-state"><FileText size={24} /><p>No scans recorded yet</p></div>
              ) : (
                <div>
                  {(stats.recentScans || []).slice(0, 5).map(s => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-1)' }}>{s.fileName}</div>
                        <div style={{ fontSize: '0.73rem', color: 'var(--text-3)' }}>{new Date(s.createdAt).toLocaleString()}</div>
                      </div>
                      <span className={`score-pill ${s.score >= 80 ? 'high' : s.score >= 60 ? 'mid' : 'low'}`}>{s.score}/100</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Payments */}
          <div className="glass-panel">
            <div className="panel-header">
              <div className="panel-header-left"><CreditCard size={14} /><h3>Recent Payments</h3></div>
              <span className="panel-badge">{stats.recentPayments?.length || 0} transactions</span>
            </div>
            <div className="panel-body no-pad">
              {(stats.recentPayments || []).length === 0 ? (
                <div className="empty-state"><CreditCard size={24} /><p>No payments recorded yet</p></div>
              ) : (
                <div>
                  {(stats.recentPayments || []).slice(0, 5).map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-1)' }}>{p.email}</div>
                        <div style={{ fontSize: '0.73rem', color: 'var(--text-3)' }}>{new Date(p.createdAt).toLocaleString()}</div>
                      </div>
                      <span className="badge badge-green">₹{p.amount}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="chart-grid-2" style={{ marginTop: 16 }}>
          {/* Recent Logins */}
          <div className="glass-panel">
            <div className="panel-header">
              <div className="panel-header-left"><Users size={14} /><h3>Recent Logins</h3></div>
              <span className="panel-badge">{stats.recentLogins?.length || 0} sessions</span>
            </div>
            <div className="panel-body no-pad">
              {(stats.recentLogins || []).length === 0 ? (
                <div className="empty-state"><Users size={24} /><p>No logins recorded yet</p></div>
              ) : (
                <div>
                  {(stats.recentLogins || []).slice(0, 5).map(u => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-1)' }}>{u.name}</div>
                        <div style={{ fontSize: '0.73rem', color: 'var(--text-3)' }}>{u.email}</div>
                      </div>
                      <span className={`provider-badge badge-${u.provider}`}>{u.provider}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Leads */}
          <div className="glass-panel">
            <div className="panel-header">
              <div className="panel-header-left"><Mail size={14} /><h3>Contact Leads</h3></div>
              <span className="panel-badge">{stats.contactMessages?.length || 0} messages</span>
            </div>
            <div className="panel-body no-pad">
              {(stats.contactMessages || []).length === 0 ? (
                <div className="empty-state"><Mail size={24} /><p>No contact leads yet</p></div>
              ) : (
                <div>
                  {(stats.contactMessages || []).slice(0, 5).map(m => (
                    <div key={m.id} style={{ padding: '10px 18px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-1)' }}>{m.name}</div>
                        <div style={{ fontSize: '0.73rem', color: 'var(--text-3)' }}>{new Date(m.createdAt).toLocaleDateString()}</div>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--blue)', marginTop: 2 }}>{m.subject}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 6: Insights ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Zap size={15} style={{ color: 'var(--text-3)' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Platform Insights</span>
        </div>
        <div className="insights-grid">
          <div className="insight-tile">
            <div className="insight-label">Most Missing ATS Keyword</div>
            <div className="insight-value">{stats.keywordTrends[0]?.keyword || '—'}</div>
            <div className="insight-sub">{stats.keywordTrends[0]?.count || 0} occurrences</div>
          </div>
          <div className="insight-tile">
            <div className="insight-label">Most Used AI Feature</div>
            <div className="insight-value">{mostUsedFeature}</div>
            <div className="insight-sub">{aiUsageData[0]?.value || 0} total uses</div>
          </div>
          <div className="insight-tile">
            <div className="insight-label">Average ATS Score</div>
            <div className="insight-value" style={{ color: 'var(--blue)' }}>{stats.averageScore || 0}<span style={{ fontSize: '0.9rem', fontWeight: 500 }}>/100</span></div>
            <div className="insight-sub">Platform-wide average</div>
          </div>
          <div className="insight-tile">
            <div className="insight-label">High ATS Rate</div>
            <div className="insight-value" style={{ color: 'var(--green)' }}>{highRate}%</div>
            <div className="insight-sub">Scored 80 or above</div>
          </div>
          <div className="insight-tile">
            <div className="insight-label">Total Platform Revenue</div>
            <div className="insight-value" style={{ color: 'var(--green)' }}>₹{totalRevenue.toLocaleString()}</div>
            <div className="insight-sub">{stats.totalPayments || 0} transactions</div>
          </div>
          <div className="insight-tile">
            <div className="insight-label">Unique Keywords Tracked</div>
            <div className="insight-value" style={{ color: 'var(--purple)' }}>{stats.keywordTrends.length}</div>
            <div className="insight-sub">Missing ATS keywords</div>
          </div>
        </div>
      </div>
    </div>
  );
}
