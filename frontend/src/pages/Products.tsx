import { useState, useEffect, useRef } from 'react';
import './Products.css';

interface ProductCard {
  id: string;
  icon: string;
  title: string;
  tagline: string;
  description: string;
  features: string[];
  gradient: string;
  glowColor: string;
  badge: string;
  badgeClass: string;
  stats: { label: string; value: string }[];
}

const products: ProductCard[] = [
  {
    id: 'resume-checker',
    icon: '🧠',
    title: 'AI Resume Checker',
    tagline: 'Beat Every ATS System',
    description: 'Our corporate-grade AI recruiter audits your resume for formatting, keywords, structural weaknesses, and provides professional rewrites that land you interviews.',
    features: ['ATS Score 0–100', 'Keyword Gap Analysis', 'Bullet Rewriter', 'Before & After View'],
    gradient: 'linear-gradient(135deg, #2997ff 0%, #5ac8fa 100%)',
    glowColor: 'rgba(41, 151, 255, 0.6)',
    badge: 'Most Popular',
    badgeClass: 'badge-blue',
    stats: [{ label: 'Avg Score Boost', value: '+42%' }, { label: 'Keywords Added', value: '18+' }],
  },
  {
    id: 'interview-prep',
    icon: '🎯',
    title: 'AI Interview Prep',
    tagline: 'Ace Every Interview',
    description: 'Practice with personalized AI coaching. Get simulated behavioral questions, instant answer scoring, and industry-specific tips based on your actual resume.',
    features: ['Behavioral Simulator', 'STAR Framework Coach', 'Real-time Scoring', 'Voice Mode Ready'],
    gradient: 'linear-gradient(135deg, #bf5af2 0%, #e879f9 100%)',
    glowColor: 'rgba(191, 90, 242, 0.6)',
    badge: 'AI-Powered',
    badgeClass: 'badge-purple',
    stats: [{ label: 'Questions Bank', value: '500+' }, { label: 'Pass Rate', value: '89%' }],
  },
  {
    id: 'linkedin-optimizer',
    icon: '🔗',
    title: 'LinkedIn Optimizer',
    tagline: 'Get Noticed by Recruiters',
    description: 'Transform your LinkedIn presence with AI-generated bios, outreach messages, and viral posts that attract recruiters and build your personal brand.',
    features: ['Profile Bio Generator', 'Outreach Messages', 'Viral Post Creator', 'Headline Optimizer'],
    gradient: 'linear-gradient(135deg, #30d158 0%, #34d399 100%)',
    glowColor: 'rgba(48, 209, 88, 0.6)',
    badge: 'New',
    badgeClass: 'badge-green',
    stats: [{ label: 'Profile Views Boost', value: '3×' }, { label: 'Connection Rate', value: '+67%' }],
  },
  {
    id: 'resume-tailor',
    icon: '✂️',
    title: 'Resume Tailor',
    tagline: 'Match Any Job Description',
    description: 'Upload a job description and let AI instantly tailor your resume — aligning keywords, skills, and experience to maximize your ATS compatibility and recruiter appeal.',
    features: ['JD Keyword Match', 'Skills Gap Detector', 'Achievement Rewriter', 'Match Score %'],
    gradient: 'linear-gradient(135deg, #ff9f0a 0%, #ffcc02 100%)',
    glowColor: 'rgba(255, 159, 10, 0.6)',
    badge: 'Smart',
    badgeClass: 'badge-orange',
    stats: [{ label: 'Match Accuracy', value: '96%' }, { label: 'Time Saved', value: '2 hrs' }],
  },
  {
    id: 'career-roadmap',
    icon: '🗺️',
    title: 'Career Roadmap',
    tagline: 'Plan Your Next 5 Years',
    description: "Generate a personalized career roadmap with AI. Get step-by-step milestones, certification recommendations, and skill progression paths tailored to your goals.",
    features: ['Goal-based Planning', 'Certification Paths', 'Skill Milestones', 'Timeline Visualizer'],
    gradient: 'linear-gradient(135deg, #ff453a 0%, #ff6b6b 100%)',
    glowColor: 'rgba(255, 69, 58, 0.6)',
    badge: 'Premium',
    badgeClass: 'badge-red',
    stats: [{ label: 'Career Paths', value: '50+' }, { label: 'Satisfaction', value: '4.9★' }],
  },
  {
    id: 'voice-prep',
    icon: '🎙️',
    title: 'Voice Interview Coach',
    tagline: 'Speak Like a Pro',
    description: 'Practice interviews by speaking aloud. AI transcribes your answers in real time, detects filler words, analyzes confidence, and gives detailed coaching feedback.',
    features: ['Live Transcription', 'Filler Word Detector', 'Confidence Score', 'Instant Feedback'],
    gradient: 'linear-gradient(135deg, #5ac8fa 0%, #2997ff 60%, #bf5af2 100%)',
    glowColor: 'rgba(90, 200, 250, 0.6)',
    badge: 'Live AI',
    badgeClass: 'badge-blue',
    stats: [{ label: 'Accuracy', value: '98%' }, { label: 'Avg Improvement', value: '+31%' }],
  },
  {
    id: 'job-finder',
    icon: '🔍',
    title: 'AI Job Finder',
    tagline: 'Live jobs, ranked against your resume',
    description: "Search openings from job sites, company careers pages and recruiters on CVMind. Each job shows a match score and the skills it asks for that your resume doesn't list. Free to try, with no limits on Pro.",
    features: ['Live job listings', 'Match score per job', 'Missing skills', '"Already applied" reminder'],
    gradient: 'linear-gradient(135deg, #00d4aa 0%, #2997ff 100%)',
    glowColor: 'rgba(0, 212, 170, 0.6)',
    badge: 'New',
    badgeClass: 'badge-green',
    stats: [{ label: 'Job sources', value: '4' }, { label: 'Free applications', value: '1 a month' }],
  },
];

interface ProductsProps {
  setCurrentPage: (page: string) => void;
}

export default function Products({ setCurrentPage }: ProductsProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [rotationOffset, setRotationOffset] = useState(0);
  const [isFlipped, setIsFlipped] = useState<Record<string, boolean>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  const total = products.length;

  const startAutoRotate = () => {
    intervalRef.current = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % total);
    }, 3500);
  };

  const stopAutoRotate = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    startAutoRotate();
    return () => stopAutoRotate();
  }, []);

  useEffect(() => {
    if (isHovered) {
      stopAutoRotate();
    } else {
      stopAutoRotate();
      startAutoRotate();
    }
  }, [isHovered]);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setDragStartX(clientX);
    stopAutoRotate();
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const delta = clientX - dragStartX;
    setRotationOffset(delta * 0.3);
  };

  const handleDragEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
    const delta = clientX - dragStartX;
    if (Math.abs(delta) > 50) {
      if (delta < 0) {
        setActiveIndex(prev => (prev + 1) % total);
      } else {
        setActiveIndex(prev => (prev - 1 + total) % total);
      }
    }
    setRotationOffset(0);
    if (!isHovered) startAutoRotate();
  };

  const toggleFlip = (id: string) => {
    setIsFlipped(prev => ({ ...prev, [id]: !prev[id] }));
    stopAutoRotate();
    setTimeout(() => {
      if (!isHovered) startAutoRotate();
    }, 5000);
  };

  const getCardStyle = (index: number) => {
    const angleStep = 360 / total;
    const angle = ((index - activeIndex) * angleStep + rotationOffset + 360) % 360;
    const normalizedAngle = angle > 180 ? angle - 360 : angle;

    const radius = 320;
    const radians = (normalizedAngle * Math.PI) / 180;
    const x = Math.sin(radians) * radius;
    const z = Math.cos(radians) * radius;

    const scale = 0.55 + ((z + radius) / (2 * radius)) * 0.45;
    const opacity = 0.3 + ((z + radius) / (2 * radius)) * 0.7;
    const zIndex = Math.round(scale * 100);

    const isCenter = Math.abs(normalizedAngle) < 30;

    return {
      transform: `translateX(${x}px) translateZ(${z}px) scale(${scale})`,
      opacity,
      zIndex,
      filter: isCenter ? 'brightness(1)' : `brightness(${0.5 + scale * 0.5})`,
      transition: isDragging ? 'none' : 'all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
    };
  };



  const pageMap: Record<string, string> = {
    'resume-checker': 'dashboard',
    'interview-prep': 'prep',
    'linkedin-optimizer': 'linkedin',
    'resume-tailor': 'tailor',
    'career-roadmap': 'career-roadmap',
    'voice-prep': 'voice-prep',
    'job-finder': 'ai-job-finder',
  };

  return (
    <div className="products-page">
      {/* ── Hero Section ── */}
      <div className="products-hero">
        <span className="products-eyebrow">
          <span className="eyebrow-dot"></span>
          AI-Powered Career Tools
        </span>
        <h1 className="products-headline">
          Everything You Need to
          <span className="headline-gradient"> Land the Job</span>
        </h1>
        <p className="products-subheadline">
          7 powerful AI tools working together to transform your career. Drag, hover, or watch them rotate.
        </p>
      </div>

      {/* ── 3D Carousel ── */}
      <div
        className="carousel-scene"
        ref={carouselRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { setIsHovered(false); setIsDragging(false); setRotationOffset(0); }}
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
      >
        {/* Ambient glow beneath active card */}
        <div
          className="carousel-glow"
          style={{ background: products[activeIndex].glowColor }}
        ></div>

        {/* Rotating platform base */}
        <div className="carousel-platform">
          <div className="platform-ring ring-1"></div>
          <div className="platform-ring ring-2"></div>
          <div className="platform-ring ring-3"></div>
          <div className="platform-center-dot"></div>
        </div>

        {/* 3D Cards */}
        <div className="carousel-3d">
          {products.map((product, index) => (
            <div
              key={product.id}
              className={`product-card-3d ${index === activeIndex ? 'active' : ''} ${isFlipped[product.id] ? 'flipped' : ''}`}
              style={getCardStyle(index)}
              onClick={() => {
                if (index !== activeIndex) {
                  stopAutoRotate();
                  setActiveIndex(index);
                  setTimeout(() => { if (!isHovered) startAutoRotate(); }, 4000);
                }
              }}
            >
              <div className="card-inner">
                {/* ── Front ── */}
                <div
                  className="card-front"
                  style={{ background: `linear-gradient(160deg, rgba(20,20,20,0.95) 0%, rgba(10,10,10,0.98) 100%)`, borderColor: `${product.glowColor}40` }}
                >
                  {/* Gradient top bar */}
                  <div className="card-gradient-bar" style={{ background: product.gradient }}></div>

                  {/* Shine overlay */}
                  <div className="card-shine"></div>

                  {/* Badge */}
                  <div className={`card-badge badge ${product.badgeClass}`}>
                    {product.badge}
                  </div>

                  {/* Icon */}
                  <div className="card-icon-wrap" style={{ boxShadow: `0 0 40px ${product.glowColor}` }}>
                    <span className="card-icon">{product.icon}</span>
                  </div>

                  {/* Content */}
                  <div className="card-content">
                    <h3 className="card-title">{product.title}</h3>
                    <p className="card-tagline" style={{ background: product.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      {product.tagline}
                    </p>
                    <p className="card-desc">{product.description}</p>

                    {/* Stats Row */}
                    <div className="card-stats">
                      {product.stats.map(stat => (
                        <div key={stat.label} className="stat-item">
                          <span className="stat-value" style={{ background: product.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            {stat.value}
                          </span>
                          <span className="stat-label">{stat.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Features */}
                    <ul className="card-features">
                      {product.features.map(f => (
                        <li key={f}>
                          <span className="feature-dot" style={{ background: product.gradient }}></span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Actions */}
                  <div className="card-actions">
                    <button
                      className="card-cta"
                      style={{ background: product.gradient, boxShadow: `0 4px 24px ${product.glowColor}` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentPage(pageMap[product.id] || 'home');
                      }}
                    >
                      Try it Free →
                    </button>
                    <button
                      className="card-flip-btn"
                      onClick={(e) => { e.stopPropagation(); toggleFlip(product.id); }}
                    >
                      ↻ Details
                    </button>
                  </div>
                </div>

                {/* ── Back ── */}
                <div
                  className="card-back"
                  style={{ borderColor: `${product.glowColor}40` }}
                >
                  <div className="card-gradient-bar" style={{ background: product.gradient }}></div>
                  <div className="card-shine"></div>

                  <div className="card-back-content">
                    <div className="back-icon">{product.icon}</div>
                    <h3 className="card-title">{product.title}</h3>
                    <p className="back-subtitle">How it works</p>

                    <div className="how-it-works">
                      <div className="step">
                        <span className="step-num" style={{ background: product.gradient }}>1</span>
                        <span>Upload your resume or paste text</span>
                      </div>
                      <div className="step">
                        <span className="step-num" style={{ background: product.gradient }}>2</span>
                        <span>AI analyzes and identifies opportunities</span>
                      </div>
                      <div className="step">
                        <span className="step-num" style={{ background: product.gradient }}>3</span>
                        <span>Get instant results & optimized output</span>
                      </div>
                    </div>

                    <div className="back-features">
                      {product.features.map(f => (
                        <span key={f} className="back-tag" style={{ borderColor: `${product.glowColor}50`, color: 'var(--text-primary)' }}>{f}</span>
                      ))}
                    </div>

                    <div className="card-actions">
                      <button
                        className="card-cta"
                        style={{ background: product.gradient, boxShadow: `0 4px 24px ${product.glowColor}` }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentPage(pageMap[product.id] || 'home');
                        }}
                      >
                        Get Started →
                      </button>
                      <button
                        className="card-flip-btn"
                        onClick={(e) => { e.stopPropagation(); toggleFlip(product.id); }}
                      >
                        ← Back
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Drag hint */}
        <div className="drag-hint">
          <span>◁</span> drag to explore <span>▷</span>
        </div>
      </div>

      {/* ── Navigation Dots ── */}
      <div className="carousel-nav">
        <button className="nav-arrow" onClick={() => { stopAutoRotate(); setActiveIndex(p => (p - 1 + total) % total); setTimeout(() => startAutoRotate(), 4000); }}>
          ‹
        </button>

        <div className="nav-dots">
          {products.map((p, i) => (
            <button
              key={p.id}
              className={`nav-dot ${i === activeIndex ? 'active' : ''}`}
              style={i === activeIndex ? { background: products[activeIndex].gradient } : {}}
              onClick={() => { stopAutoRotate(); setActiveIndex(i); setTimeout(() => startAutoRotate(), 4000); }}
              aria-label={`Go to ${p.title}`}
            />
          ))}
        </div>

        <button className="nav-arrow" onClick={() => { stopAutoRotate(); setActiveIndex(p => (p + 1) % total); setTimeout(() => startAutoRotate(), 4000); }}>
          ›
        </button>
      </div>

      {/* ── Active card label ── */}
      <div className="active-label">
        <span className="active-label-num">{String(activeIndex + 1).padStart(2, '0')}</span>
        <span className="active-label-sep">/</span>
        <span className="active-label-total">{String(total).padStart(2, '0')}</span>
        <span className="active-label-name">{products[activeIndex].title}</span>

        {/* Progress arc */}
        <div className="progress-arc">
          <svg width="48" height="48" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />
            <circle
              cx="24" cy="24" r="20"
              fill="none"
              stroke={`url(#arcGrad-${activeIndex})`}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={`${(2 * Math.PI * 20 * (activeIndex + 1)) / total} ${2 * Math.PI * 20}`}
              transform="rotate(-90 24 24)"
              style={{ transition: 'stroke-dasharray 0.5s ease' }}
            />
            <defs>
              {products.map((p, i) => (
                <linearGradient key={i} id={`arcGrad-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={p.glowColor.replace('0.6', '1')} />
                  <stop offset="100%" stopColor={p.glowColor.replace('0.6', '0.6')} />
                </linearGradient>
              ))}
            </defs>
          </svg>
        </div>
      </div>

      {/* ── Bottom CTA ── */}
      <div className="products-cta-section">
        <h2 className="cta-title">Ready to Transform Your Career?</h2>
        <p className="cta-sub">Join thousands of professionals who landed their dream jobs with CV Mind</p>
        <div className="cta-buttons">
          <button className="btn-primary cta-btn-primary" onClick={() => setCurrentPage('home')}>
            ⚡ Start for Free
          </button>
          <button className="btn-secondary" onClick={() => setCurrentPage('about')}>
            Learn More
          </button>
        </div>
        <div className="cta-trust">
          <span>✓ No credit card needed</span>
          <span>✓ Instant results</span>
          <span>✓ 10,000+ users</span>
        </div>
      </div>
    </div>
  );
}
