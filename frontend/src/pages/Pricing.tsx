import { useState } from "react"
import { Crown } from "lucide-react"
import ScaleToFit from "../components/home/ScaleToFit"
import SampleResume, { SAMPLE_RESUME_WIDTH } from "../components/home/SampleResume"
import "./Pricing.css"
import { SlotBanner } from "../components/SiteBanner"

interface PricingProps {
  setCurrentPage: (page: string) => void
  isLoggedIn?: boolean
  setShowAuthModal?: (show: boolean) => void
}

type BillingCycle = "monthly" | "quarterly" | "yearly"

export default function Pricing({ setCurrentPage, isLoggedIn, setShowAuthModal }: PricingProps) {

  function handleUpgrade() {
    if (!isLoggedIn) {
      setShowAuthModal?.(true);
      return;
    }
    setCurrentPage('dashboard');
  }

  const [activeFaq, setActiveFaq] = useState<number | null>(null)
  const [proCycle, setProCycle] = useState<BillingCycle>("quarterly")

  // Pro price configurations matching the screenshot
  const proPricing = {
    monthly: {
      priceInt: "250",
      priceDec: "00",
      billedText: "Billed monthly",
      badgeText: "",
      labelText: "PRO MONTHLY PLAN"
    },
    quarterly: {
      priceInt: "266",
      priceDec: "67",
      billedText: "₹800 billed every 3 months",
      badgeText: "",
      labelText: "PRO QUARTERLY PLAN"
    },
    yearly: {
      priceInt: "108",
      priceDec: "33",
      billedText: "₹1300 billed every 12 months",
      badgeText: "₹3000.00 - SAVE 56.67%",
      labelText: "PRO YEARLY PLAN"
    }
  }

  const activePro = proPricing[proCycle]

  const freeBenefits = [
    { text: "All resume templates", checked: true },
    { text: "Basic resume sections", checked: true },
    { text: "CV Mind branding", checked: true },
    { text: "Maximum 12 section items", checked: true },
    { text: "Access to all design tools", checked: true },
    { text: "Resume Builder", checked: true },
    { text: "Resume Checker", checked: true },
    { text: "Interview Prep AI", checked: true },
    { text: "Profile PDF Audit", checked: true },
    { text: "Bio & Banner Generator", checked: true },
    { text: "Outreach & DM Writer", checked: true },
    { text: "15,000 AI Tokens (reset every 48 hrs)", checked: true },
    { text: "Portfolio Generator", checked: false },
    { text: "Resume Tailor", checked: false },
    { text: "Voice Practice AI", checked: false },
    { text: "AI Job Finder", checked: false },
    { text: "Skills Gap & Courses", checked: false },
    { text: "Elevator Pitch Builder", checked: false },
    { text: "Career Roadmaps", checked: false },
  ]

  const proBenefits = [
    { text: "300 resumes and cover letters", checked: true },
    { text: "All resume templates", checked: true },
    { text: "Real-time content suggestions", checked: true },
    { text: "ATS check (Applicant Tracking System)", checked: true },
    { text: "Pro resume sections", checked: true },
    { text: "No branding", checked: true },
    { text: "Unlimited section items", checked: true },
    { text: "Thousands of design options", checked: true },
    { text: "Portfolio Generator", checked: true },
    { text: "Resume Tailor", checked: true },
    { text: "Voice Practice AI", checked: true },
    { text: "AI Job Finder", checked: true },
    { text: "Skills Gap & Courses", checked: true },
    { text: "Elevator Pitch Builder", checked: true },
    { text: "Career Roadmaps", checked: true },
    { text: "60,000 AI Tokens (reset every 48 hrs)", checked: true },
  ]

  const faqs = [
    {
      q: "Can I cancel my subscription at any time?",
      a: "Yes, absolutely. You can cancel your subscription at any time from your account settings. You will retain access to your plan until the end of your billing cycle."
    },
    {
      q: "What are AI Tokens and how do they work?",
      a: "AI Tokens power our generative features — bullet rewriting, cover letters, LinkedIn outreach, and portfolio generation. Free accounts get 15,000 tokens that reset every 48 hours. Pro accounts get 60,000 tokens, also resetting every 48 hours."
    },
    {
      q: "Do you offer discounts for universities or teams?",
      a: "Yes, we offer substantial volume discounts for universities, bootcamps, and career centers. Please choose our Enterprise option and contact sales for details."
    },
    {
      q: "Is my payment information secure?",
      a: "Yes, your payments are processed securely via Stripe. We do not store your credit card information on our servers, and all transaction data is fully encrypted."
    }
  ]

  return (
    <div className="pricing-wrapper animate-fade-in-up">
      <SlotBanner slot="promo" setCurrentPage={setCurrentPage} />
      {/* ── 1. HEADER SECTION ───────────────────────────────────── */}
      <section className="pricing-hero">
        <h1 className="pricing-main-title">Build a strikingly powerful<br />resume approved by recruiters</h1>
        <button className="pricing-main-cta" onClick={() => setCurrentPage('resume-builder')}>
          Build My Resume Now
        </button>
      </section>

      {/* ── 2. TWO-COLUMN PLANS GRID ────────────────────────────── */}
      <div className="pricing-grid-container">
        <div className="pricing-card-layout">
          
          {/* Left Column: Free Plan */}
          <div className="pricing-column-card">
            <div className="pricing-badge-tier">FREE PLAN</div>
            <div className="pricing-amount-row">
              <span className="pricing-currency">₹</span>
              <span className="pricing-value">0</span>
            </div>
            <div className="pricing-cycle-sub">Free forever · No credit card needed</div>

            <div className="pricing-benefits-list">
              {freeBenefits.map((benefit, i) => (
                <div key={i} className="pricing-benefit-item">
                  {benefit.checked ? (
                    <span className="pricing-check-icon check-green">✓</span>
                  ) : (
                    <span className="pricing-check-icon check-red">✗</span>
                  )}
                  <span className={`pricing-benefit-text${!benefit.checked ? " text-disabled" : ""}`}>
                    {benefit.text}
                  </span>
                </div>
              ))}
            </div>

            <button className="pricing-card-btn-outline" onClick={() => setCurrentPage('resume-builder')}>
              Build My Resume
            </button>
          </div>

          {/* Right Column: Pro Plan */}
          <div className="pricing-column-card pricing-pro-highlight">
            {/* Crown & Badge Header */}
            <div className="pricing-pro-header-row">
              <div className="pricing-pro-header-left">
                <Crown size={15} className="pricing-pro-crown" />
                <span className="pricing-pro-label">{activePro.labelText}</span>
              </div>
              {activePro.badgeText && (
                <div className="pricing-pro-discount-badge">
                  {activePro.badgeText}
                </div>
              )}
            </div>

            {/* Price display with decimals superscript */}
            <div className="pricing-amount-row">
              <span className="pricing-currency">₹</span>
              <span className="pricing-value">{activePro.priceInt}</span>
              <span className="pricing-superscript">
                <span className="pricing-decimal">{activePro.priceDec}</span>
                <span className="pricing-mo">/mo</span>
              </span>
            </div>
            <div className="pricing-cycle-sub">{activePro.billedText}</div>

            {/* Cycle Selector Toggles */}
            <div className="pricing-cycle-selector">
              <button 
                className={`pricing-cycle-btn${proCycle === 'monthly' ? ' active' : ''}`}
                onClick={() => setProCycle('monthly')}
              >
                Pro Monthly
              </button>
              <button 
                className={`pricing-cycle-btn${proCycle === 'quarterly' ? ' active' : ''}`}
                onClick={() => setProCycle('quarterly')}
              >
                Pro Quarterly
              </button>
              <button 
                className={`pricing-cycle-btn${proCycle === 'yearly' ? ' active' : ''}`}
                onClick={() => setProCycle('yearly')}
              >
                Pro Yearly
              </button>
            </div>

            {/* Benefits */}
            <div className="pricing-benefits-list">
              {proBenefits.map((benefit, i) => (
                <div key={i} className="pricing-benefit-item">
                  <span className="pricing-check-icon check-green">✓</span>
                  <span className="pricing-benefit-text">{benefit.text}</span>
                </div>
              ))}
            </div>

            <button className="pricing-card-btn-filled" onClick={handleUpgrade}>
              Upgrade to Pro
            </button>
          </div>

        </div>
      </div>

      {/* ── 4. FEATURE INTRO SECTION: Resume Builder ────────────── */}
      <section className="pricing-intro-section">
        <div className="pricing-intro-inner">
          <div className="pricing-intro-content">
            <h2 className="pricing-intro-title">A feature-packed resume builder that makes resume creation a breeze</h2>
            <p className="pricing-intro-desc">
              Create a visually stunning resume with ease. Our resume builder will guide you through the process. We help with content suggestions and choosing the right design and layout, while you focus on presenting yourself.
            </p>
            <button className="pricing-intro-cta" onClick={() => setCurrentPage('resume-builder')}>
              Build My Resume Now
            </button>
          </div>
          <div className="pricing-intro-visual">
            <div className="pricing-intro-img pricing-sample" role="img" aria-label="Sample resume made in the CV Mind resume builder">
              <ScaleToFit width={SAMPLE_RESUME_WIDTH} cropHeight={520}>
                <SampleResume highlight="bullet" />
              </ScaleToFit>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. FEATURE INTRO SECTION: Resume Tailor ─────────────── */}
      <section className="pricing-tailor-section">
        <div className="pricing-tailor-inner">
          <div className="pricing-tailor-visual">
            <div className="pricing-tailor-img pricing-sample" role="img" aria-label="Sample resume with skills added by tailoring it to a job post">
              <ScaleToFit width={SAMPLE_RESUME_WIDTH} cropHeight={520}>
                <SampleResume tailored />
              </ScaleToFit>
            </div>
          </div>
          <div className="pricing-tailor-content">
            <h2 className="pricing-tailor-title">Tailor your resume to the job with a single click</h2>
            <p className="pricing-tailor-desc">
              With our resume tailoring feature you can ensure your resume is relevant to the job you're applying for. Simply copy and paste the job ad in our builder and we'll show you what you need to include in order to pass the ATS screening.
            </p>
            <button className="pricing-tailor-cta" onClick={() => setCurrentPage('tailor')}>
              Build a Tailored Resume
            </button>
          </div>
        </div>
      </section>

      {/* ── 6. FAQ SECTION ──────────────────────────────────────── */}
      <section className="pricing-faq-section">
        <div className="pricing-faq-inner">
          <h2 className="pricing-faq-title">Pricing Frequently Asked Questions</h2>
          <p className="pricing-faq-sub">Clear answers to help you pick the right plan.</p>
          <div className="pricing-faq-list">
            {faqs.map((faq, i) => (
              <div key={i} className={`pricing-faq-item${activeFaq === i ? ' open' : ''}`}>
                <button className="pricing-faq-question" onClick={() => setActiveFaq(activeFaq === i ? null : i)}>
                  <span>{faq.q}</span>
                  <span className="pricing-faq-chevron">{activeFaq === i ? '−' : '+'}</span>
                </button>
                {activeFaq === i && (
                  <div className="pricing-faq-answer">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
