import React, { useState } from 'react';
import {
  Building2,
  Users,
  CheckCircle2,
  Download,
  FileText,
  ArrowRight,
  Check,
  Award,
  BarChart3,
  Send,
  Loader2,
  FileCheck,
  Clock,
  GraduationCap,
  CheckCircle
} from 'lucide-react';
import './Campus.css';

interface CampusPlan {
  key: string;
  name: string;
  badge?: string;
  seats: string;
  price: string;
  perStudent: string;
  description: string;
  features: string[];
}

const INSTITUTIONAL_PLANS: CampusPlan[] = [
  {
    key: 'starter',
    name: 'Campus Starter',
    seats: 'Up to 250 Students',
    price: '₹49,000',
    perStudent: '₹196 / student / year',
    description: 'Ideal for diploma institutes or specific graduating departments seeking automated ATS quality control.',
    features: [
      'Automated Batch ATS Scanner for all enrolled students',
      '1 Official College Template Format with Institutional Crest',
      'Placement Staff Review & Approval Workflow Gate',
      'Centralized CSV & ZIP Resume One-Click Exports',
      'Email & WhatsApp Onboarding Support'
    ]
  },
  {
    key: 'pro',
    name: 'Campus Pro',
    badge: 'MOST POPULAR',
    seats: 'Up to 1,000 Students',
    price: '₹1,29,000',
    perStudent: '₹129 / student / year',
    description: 'The standard choice for engineering & MBA colleges to maximize Day-1 corporate shortlists.',
    features: [
      'Everything in Starter',
      'AI Voice Mock Interview Sandbox for technical & HR rounds',
      '3 Custom Department Templates (CSE, Core Engg, Management)',
      'Cohort Skill-Gap & NAAC / NIRF Placement Analytics',
      'Dedicated Account Manager with 48-Hour Setup SLA'
    ]
  },
  {
    key: 'enterprise',
    name: 'University Enterprise',
    seats: 'Up to 3,000 Students',
    price: '₹2,99,000',
    perStudent: '₹99 / student / year',
    description: 'Comprehensive career infrastructure for large multi-campus universities with bespoke integrations.',
    features: [
      'Multi-college & Multi-campus tenancy management',
      'Custom Domain Integration (placements.yourcollege.edu)',
      'ERP & Superset Registration API Sync',
      'On-Campus Orientation & Staff Training Workshops',
      'Curated Recruiter Talent Pool Sharing'
    ]
  }
];

const FAQS = [
  {
    q: 'Does CVMind Campus replace our existing placement ERP (like Superset)?',
    a: 'No. CVMind sits before your ERP. Superset handles company job postings and interview logistics. CVMind is the preparation and quality control engine that ensures the student resumes uploaded to Superset actually pass corporate ATS keyword filters and formatting rules.'
  },
  {
    q: 'What is included in the complimentary 50-student batch audit?',
    a: 'We provision a private test portal for your institution within 24 hours. Your 50 nominated students scan their CVs, and CVMind generates an Executive Batch Health Report showing average score, missing technical keywords, and corporate rejection vulnerabilities.'
  },
  {
    q: 'Can we digitize our college’s exact official resume template?',
    a: 'Yes. With Campus Pro and Enterprise, our design engineering team digitizes your exact university template with official crest, student registration ID, and department headers, ensuring 100% uniformity across campus drives.'
  },
  {
    q: 'How is student data protected under institutional tenancy?',
    a: 'All student and placement data is completely isolated under strict institutional tenancy silos with TLS 1.3 encryption. We never sell student data or share it with third parties without student consent.'
  }
];

export default function Campus() {
  // Lead Form State
  const [formCollege, setFormCollege] = useState('');
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDesignation, setFormDesignation] = useState('TPO');
  const [formBatchSize, setFormBatchSize] = useState('500');
  const [formCity, setFormCity] = useState('');
  const [formBusy, setFormBusy] = useState(false);
  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormBusy(true);
    setFormError('');
    setFormSuccess('');

    try {
      const res = await fetch('/api/college/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collegeName: formCollege,
          contactName: formName,
          email: formEmail,
          phone: formPhone,
          designation: formDesignation,
          batchSize: Number(formBatchSize) || 500,
          city: formCity
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit request. Please try again.');
      }
      setFormSuccess(data.message || 'Pilot request received successfully!');
      setFormCollege('');
      setFormName('');
      setFormEmail('');
      setFormPhone('');
    } catch (err: any) {
      setFormError(err.message || 'Something went wrong. Please write to us directly.');
    } finally {
      setFormBusy(false);
    }
  };

  return (
    <div className="campus-enterprise-root">
      {/* ── 1. HERO SECTION ─────────────────────────────────────────────────── */}
      <section className="c-hero">
        <div className="c-hero-glow" />
        <div className="c-hero-container">
          <div className="c-pill-badge">
            <Building2 size={15} />
            <span>CVMind Campus · Institutional AI Suite</span>
          </div>

          <h1 className="c-hero-headline">
            Accelerate Campus Placement Offers With <span className="c-gradient-text">Automated ATS Auditing</span>
          </h1>

          <p className="c-hero-sub">
            Over 65% of student resumes are filtered out by corporate recruiter ATS engines before interviews begin.
            Equip your Training &amp; Placement Cell (TPO) to batch audit 1,000+ student resumes in seconds, enforce verified institutional formatting, and prepare Day-1 corporate-ready cohorts.
          </p>

          <div className="c-hero-cta-row">
            <a href="#schedule-pilot" className="c-btn c-btn-primary">
              Claim 50-Student Free Audit <ArrowRight size={16} />
            </a>
            <a
              href="/CVMind_B2B_Campus_Proposal_Deck.pdf"
              download="CVMind_Campus_Proposal_Deck.pdf"
              className="c-btn c-btn-secondary"
            >
              <Download size={15} /> Download Proposal Deck (PDF)
            </a>
          </div>

          <div className="c-hero-trust-bar">
            <div className="c-trust-item">
              <Award size={18} className="c-trust-icon" />
              <span>NAAC &amp; NIRF Accreditation Alignment</span>
            </div>
            <div className="c-trust-dot" />
            <div className="c-trust-item">
              <GraduationCap size={18} className="c-trust-icon" />
              <span>Day-1 Recruiter ATS Compliance</span>
            </div>
            <div className="c-trust-dot" />
            <div className="c-trust-item">
              <Clock size={18} className="c-trust-icon" />
              <span>48-Hour Rapid Campus Setup</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. METRICS STATS BANNER ─────────────────────────────────────────── */}
      <section className="c-metrics-section">
        <div className="c-metrics-grid">
          <div className="c-metric-card">
            <div className="c-metric-num">65%</div>
            <div className="c-metric-label">Staff Time Saved</div>
            <div className="c-metric-desc">Automated error checks eliminate hundreds of manual faculty review hours.</div>
          </div>
          <div className="c-metric-card">
            <div className="c-metric-num">+32%</div>
            <div className="c-metric-label">Placement Shortlist Multiplier</div>
            <div className="c-metric-desc">Higher first-round call rates across top-tier technical and consulting recruiters.</div>
          </div>
          <div className="c-metric-card">
            <div className="c-metric-num">24/7</div>
            <div className="c-metric-label">AI Interview Coaching</div>
            <div className="c-metric-desc">Students practice technical and HR mock rounds with instant STAR-methodology feedback.</div>
          </div>
          <div className="c-metric-card">
            <div className="c-metric-num">100%</div>
            <div className="c-metric-label">Institutional Branding</div>
            <div className="c-metric-desc">All candidate CVs render in your college's official verified layout and header.</div>
          </div>
        </div>
      </section>

      {/* ── 3. FOUR CORE CAPABILITIES (BENTO GRID) ──────────────────────────── */}
      <section className="c-capabilities-section">
        <div className="c-section-header">
          <span className="c-section-kicker">Institutional Capabilities</span>
          <h2>A Complete Career Engine for Higher Education</h2>
          <p>Everything your placement cell needs to monitor cohort readiness, enforce formatting, and impress recruiters.</p>
        </div>

        <div className="c-bento-grid">
          {/* Card 1 */}
          <div className="c-bento-card">
            <div className="c-bento-icon-box">
              <FileCheck size={24} />
            </div>
            <h3>Automated Batch ATS Scanner</h3>
            <p>
              Instantly audit 1,000+ student resumes simultaneously against visiting corporate job descriptions (TCS, Google, Deloitte, Amazon).
              Identify missing technical keywords, weak action verbs, and formatting errors before drive day.
            </p>
            <ul className="c-bento-list">
              <li><Check size={14} /> Line-by-line keyword density scoring</li>
              <li><Check size={14} /> Branch-wise readiness breakdown</li>
            </ul>
          </div>

          {/* Card 2 */}
          <div className="c-bento-card">
            <div className="c-bento-icon-box">
              <Award size={24} />
            </div>
            <h3>Official College-Branded Templates</h3>
            <p>
              Eliminate sloppy multi-column Canva designs that crash recruiter ATS systems.
              CVMind automatically renders your students' profiles in your university's approved single-column layout with official crest, registration IDs, and department headers.
            </p>
            <ul className="c-bento-list">
              <li><Check size={14} /> 100% ATS-parseable single-column typography</li>
              <li><Check size={14} /> Verified TPO placement authorization stamp</li>
            </ul>
          </div>

          {/* Card 3 */}
          <div className="c-bento-card">
            <div className="c-bento-icon-box">
              <Users size={24} />
            </div>
            <h3>AI Voice &amp; Technical Interview Sandbox</h3>
            <p>
              Provide every student unlimited 24/7 mock interview coaching.
              Simulate realistic technical, behavioral, and HR interview rounds with speech-to-text voice analysis, filler-word counters, and STAR-methodology feedback.
            </p>
            <ul className="c-bento-list">
              <li><Check size={14} /> Real-time vocal tone &amp; answer structure grading</li>
              <li><Check size={14} /> Big-4 and Fortune-500 question banks</li>
            </ul>
          </div>

          {/* Card 4 */}
          <div className="c-bento-card">
            <div className="c-bento-icon-box">
              <BarChart3 size={24} />
            </div>
            <h3>TPO Command Center &amp; Review Gate</h3>
            <p>
              Centralized administrative visibility for placement directors and counselors.
              Set minimum ATS score thresholds (e.g., 75+ for Day-1 companies), approve resumes or request revisions with inline notes, and export verified ZIP archives in one click.
            </p>
            <ul className="c-bento-list">
              <li><Check size={14} /> One-click student shortlist CSV &amp; ZIP export</li>
              <li><Check size={14} /> Live student compliance tracking</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── 4. HOW IT WORKS WORKFLOW ────────────────────────────────────────── */}
      <section className="c-workflow-section">
        <div className="c-section-header">
          <span className="c-section-kicker">Deployment Flow</span>
          <h2>Simple 3-Step Campus Rollout</h2>
          <p>Zero IT overhead. Your dedicated institutional portal is active within 48 hours.</p>
        </div>

        <div className="c-workflow-grid">
          <div className="c-workflow-step">
            <div className="c-step-badge">01</div>
            <h4>Cohort Onboarding</h4>
            <p>Upload your student roster via CSV or share a customized institutional join link for your campus.</p>
          </div>
          <div className="c-workflow-arrow">→</div>
          <div className="c-workflow-step">
            <div className="c-step-badge">02</div>
            <h4>Automated Preparation</h4>
            <p>Students build ATS-compliant resumes and practice voice interviews. Placement staff tracks live cohort readiness.</p>
          </div>
          <div className="c-workflow-arrow">→</div>
          <div className="c-workflow-step">
            <div className="c-step-badge">03</div>
            <h4>Recruiter Shortlisting</h4>
            <p>Filter candidates meeting your ATS cutoff and export verified, college-branded resume dossiers for corporate drives.</p>
          </div>
        </div>
      </section>

      {/* ── 5. INSTITUTIONAL PRICING PACKAGES ───────────────────────────────── */}
      <section className="c-pricing-section">
        <div className="c-section-header">
          <span className="c-section-kicker">Institutional Licensing</span>
          <h2>Transparent Annual Campus Packages</h2>
          <p>All plans include full CVMind Pro access for enrolled students throughout the contract period.</p>
        </div>

        <div className="c-pricing-grid">
          {INSTITUTIONAL_PLANS.map((plan) => (
            <div key={plan.key} className={`c-pricing-card ${plan.badge ? 'featured' : ''}`}>
              {plan.badge && <span className="c-featured-badge">{plan.badge}</span>}
              <div className="c-plan-name">{plan.name}</div>
              <div className="c-plan-seats">{plan.seats}</div>
              <div className="c-plan-price-row">
                <span className="c-price-val">{plan.price}</span>
                <span className="c-price-period">/ year</span>
              </div>
              <div className="c-plan-per-student">{plan.perStudent}</div>
              <p className="c-plan-desc">{plan.description}</p>

              <div className="c-plan-divider" />

              <ul className="c-plan-features-list">
                {plan.features.map((f) => (
                  <li key={f}>
                    <Check size={16} className="c-check-icon" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <a href="#schedule-pilot" className={`c-btn block ${plan.badge ? 'c-btn-primary' : 'c-btn-secondary'}`}>
                Schedule Consultation
              </a>
            </div>
          ))}
        </div>

        <div className="c-proposal-deck-callout">
          <FileText size={22} className="c-deck-icon" />
          <div className="c-deck-text">
            <strong>Need to present this to your Director, Dean, or Placement Committee?</strong>
            <p>Download our complete 2-page Institutional Proposal &amp; Partnership Deck (PDF) with ROI breakdown.</p>
          </div>
          <a
            href="/CVMind_B2B_Campus_Proposal_Deck.pdf"
            download="CVMind_Campus_Proposal_Deck.pdf"
            className="c-btn c-btn-primary sm"
          >
            <Download size={15} /> Download PDF Deck
          </a>
        </div>
      </section>

      {/* ── 6. LEAD CAPTURE PILOT BOOKING FORM ──────────────────────────────── */}
      <section id="schedule-pilot" className="c-form-section">
        <div className="c-form-container">
          <div className="c-form-info-col">
            <span className="c-section-kicker" style={{ color: '#38bdf8' }}>Complimentary Pilot</span>
            <h2>Schedule a 15-Minute Campus Demo &amp; Claim Your 50-Student Audit</h2>
            <p>
              Experience the power of CVMind Campus with zero financial commitment.
              We will provision a test portal for 50 of your active students and generate a comprehensive Placement Health Report for your Placement Cell.
            </p>

            <div className="c-pilot-benefits">
              <div className="c-pbenefit-item">
                <CheckCircle size={20} color="#38bdf8" />
                <div>
                  <strong>Zero IT Setup Required</strong>
                  <span>Cloud-hosted on placements.cvmind.in with 48-hour onboarding.</span>
                </div>
              </div>
              <div className="c-pbenefit-item">
                <CheckCircle size={20} color="#38bdf8" />
                <div>
                  <strong>Institutional Tenancy</strong>
                  <span>Strict data isolation adhering to Article 21 constitutional privacy rights.</span>
                </div>
              </div>
              <div className="c-pbenefit-item">
                <CheckCircle size={20} color="#38bdf8" />
                <div>
                  <strong>Detailed Cohort Health Dossier</strong>
                  <span>Identify formatting errors and missing skills across all branches.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="c-form-box-col">
            <h3>Schedule Campus Pilot</h3>
            {formSuccess ? (
              <div className="c-form-success-box">
                <CheckCircle2 size={28} color="#10b981" />
                <div>
                  <strong>Pilot Request Received!</strong>
                  <p>{formSuccess}</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="c-enterprise-form">
                {formError && <div className="c-form-error-box">{formError}</div>}

                <div className="c-form-row">
                  <div className="c-form-field">
                    <label>Institution / College Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Institute of Technology"
                      value={formCollege}
                      onChange={(e) => setFormCollege(e.target.value)}
                    />
                  </div>
                  <div className="c-form-field">
                    <label>City &amp; State</label>
                    <input
                      type="text"
                      placeholder="e.g. Pune, Maharashtra"
                      value={formCity}
                      onChange={(e) => setFormCity(e.target.value)}
                    />
                  </div>
                </div>

                <div className="c-form-row">
                  <div className="c-form-field">
                    <label>Your Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Prof. R. K. Sharma"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                    />
                  </div>
                  <div className="c-form-field">
                    <label>Your Role / Designation</label>
                    <select value={formDesignation} onChange={(e) => setFormDesignation(e.target.value)}>
                      <option value="TPO">Head of Placements (TPO)</option>
                      <option value="Dean">Dean / Director</option>
                      <option value="Faculty">Placement Faculty Coordinator</option>
                      <option value="Student Coordinator">Student Placement Lead</option>
                      <option value="Other">Other Institutional Staff</option>
                    </select>
                  </div>
                </div>

                <div className="c-form-row">
                  <div className="c-form-field">
                    <label>Official Institutional Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="tpo@college.edu.in"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                    />
                  </div>
                  <div className="c-form-field">
                    <label>Phone / WhatsApp *</label>
                    <input
                      type="tel"
                      required
                      placeholder="+91-98765-43210"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="c-form-field">
                  <label>Graduating Cohort Size</label>
                  <select value={formBatchSize} onChange={(e) => setFormBatchSize(e.target.value)}>
                    <option value="250">Up to 250 Students (Campus Starter)</option>
                    <option value="500">250 to 500 Students</option>
                    <option value="1000">500 to 1,000 Students (Campus Pro)</option>
                    <option value="2500">1,000 to 3,000+ Students (University Enterprise)</option>
                  </select>
                </div>

                <button type="submit" className="c-btn c-btn-primary block" disabled={formBusy}>
                  {formBusy ? <Loader2 size={16} className="c-spin" /> : <Send size={16} />}
                  Activate Free 50-Student Pilot
                </button>
                <div className="c-form-privacy-note">Zero setup fees · Secure institutional data handling</div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ── 7. INSTITUTIONAL FAQS ───────────────────────────────────────────── */}
      <section className="c-faq-section">
        <div className="c-section-header">
          <span className="c-section-kicker">Knowledge Base</span>
          <h2>Campus Placement FAQs</h2>
          <p>Answers to common questions from College Directors, Deans, and Placement Officers.</p>
        </div>

        <div className="c-faq-grid">
          {FAQS.map((f) => (
            <div key={f.q} className="c-faq-card">
              <h4>{f.q}</h4>
              <p>{f.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
