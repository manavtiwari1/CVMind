import { useState } from 'react';
import { Cpu, ShieldCheck, Sparkles, Rocket, ArrowRight, ArrowLeft } from 'lucide-react';
import { ARTICLES } from '../data/articles';
import './Blog.css';

interface BlogProps {
  setCurrentPage: (page: string) => void;
}

export default function Blog({ setCurrentPage }: BlogProps) {
  const [selectedTag, setSelectedTag] = useState<string>('all');

  const changelogData = [
    {
      id: 13,
      version: 'v3.3.0',
      date: 'July 1, 2026',
      title: 'Delete Account, Google OAuth Fix & Email Branding Update',
      tag: 'Security & Help',
      description: 'Users can now permanently delete their account from the profile dropdown with a typed confirmation guard. Google OAuth redirect URIs updated for the cvmind.online domain, and all transactional emails now link to the correct branded domain.',
      details: [
        '<strong>Delete My Account:</strong> A new "Delete Account" option in the profile dropdown opens a confirmation modal. Users must type "DELETE" to activate the button — on confirm, all user data, saved works, and login logs are wiped from MongoDB instantly.',
        '<strong>Google OAuth Domain Fix:</strong> Added https://www.cvmind.online and https://cvmind.online as Authorized JavaScript Origins and Redirect URIs in Google Cloud Console, resolving the Error 400: redirect_uri_mismatch for production users.',
        '<strong>Welcome Email Domain Update:</strong> Transactional welcome emails now correctly link to https://www.cvmind.online instead of the old Vercel preview URL.',
        '<strong>Irreversible Action Guard:</strong> The confirm button remains disabled until the exact word "DELETE" is typed, preventing accidental account deletion.'
      ],
      icon: ShieldCheck,
      badgeColor: 'badge-orange'
    },
    {
      id: 12,
      version: 'v3.2.0',
      date: 'July 1, 2026',
      title: 'AI Career Copilot Section on Home Page',
      tag: 'UX Polish',
      description: 'The main landing page now features a dedicated AI Career Copilot section with a live agent status mockup — showcasing the 9-agent system, Career Health Score ring, and animated active-agent indicators to drive feature discovery.',
      details: [
        '<strong>Landing Page Section:</strong> A new alternating feature block between "ATS Beating" and the upload section highlights the AI Career Copilot with a purple accent CTA button linking directly to the Copilot dashboard.',
        '<strong>Live Agent Mockup:</strong> An interactive card mockup displays Career Health Score (ring chart at 82), 4 agent rows (Resume Agent, Job Discovery, Interview Coach, Application Intel), and animated pulsing dots for active agents.',
        '<strong>Reversed Layout:</strong> The visual appears on the left side for visual variety, maintaining the alternating section rhythm of the home page.',
        '<strong>Animated Pulse Dots:</strong> Active agents show a pulsing purple dot with CSS keyframe animation, giving the mockup a real-time "live" feel.'
      ],
      icon: Sparkles,
      badgeColor: 'badge-green'
    },
    {
      id: 11,
      version: 'v3.1.0',
      date: 'June 30, 2026',
      title: 'AI Fix & Download, Resume Builder Editor & Active Agents',
      tag: 'New Features',
      description: 'The Resume Center now lets AI auto-fix your resume from suggestions and download it as PDF or DOCX instantly. An in-app resume builder editor lets you manually polish every field. All 9 Career Copilot agents are now fully interactive.',
      details: [
        '<strong>AI Fix & Download:</strong> A one-click "AI Fix Resume" button calls the /api/optimize endpoint, rewrites your resume using all suggestion context, and presents the fixed version in a preview panel with PDF and DOCX download options.',
        '<strong>PDF Download:</strong> Opens a formatted print-ready HTML popup via window.open() + window.print() — clean, no third-party libraries needed.',
        '<strong>DOCX Download:</strong> Generates a Word-compatible HTML blob with .doc extension for seamless Office compatibility.',
        '<strong>In-App Resume Editor:</strong> A full-form modal editor for Personal Info, Summary, Skills, Experience (add/delete entries), and Education — changes sync instantly to the download pipeline.',
        '<strong>9 Active Agents:</strong> Tab agents (Resume Agent, Job Discovery, Skill Coach, Interview Coach, Application Intel, Career Analytics) now navigate directly to their respective dashboards. Panel agents (LinkedIn Agent, Networking Agent, Salary Intel) expand inline below the agent grid with profile-aware dynamic content.',
        '<strong>LinkedIn Agent Panel:</strong> Generates optimized headline suggestions, profile audit score, and outreach message templates based on extracted profile data.',
        '<strong>Networking Agent Panel:</strong> Produces personalized connection request templates and referral DM scripts.',
        '<strong>Salary Intel Panel:</strong> Shows market salary ranges for the user\'s role and years of experience with negotiation tips.'
      ],
      icon: Sparkles,
      badgeColor: 'badge-purple'
    },
    {
      id: 10,
      version: 'v3.0.0',
      date: 'June 28, 2026',
      title: 'AI Career Copilot — 9 Agents, Career Health Score & Equipped Section',
      tag: 'New Features',
      description: 'The flagship AI Career Copilot feature launches with 9 specialized AI agents working in parallel. A step-based onboarding flow extracts your profile, computes a Career Health Score, and activates a full agent dashboard with a real-time activity feed.',
      details: [
        '<strong>9 Specialized AI Agents:</strong> Resume Agent, Job Discovery, Skill Coach, Interview Coach, Application Intel, Career Analytics, LinkedIn Agent, Networking Agent, and Salary Intel — each focusing on a distinct area of the job search.',
        '<strong>Career Health Score:</strong> A composite 0–100 score combining resume strength, skill coverage, interview readiness, and application activity. Displayed as a gradient ring with trend indicator.',
        '<strong>Step-Based Onboarding:</strong> A 3-step flow — Upload Resume → Build Profile → Activate Agents. The AI extracts name, experience, skills, job title, and career goal from your resume automatically.',
        '<strong>Profile Name Fix:</strong> Resolved an issue where "Your Name / N/A years" appeared instead of the real extracted name. Continue button is now disabled during loading, and profile extraction re-fetches resume text if the initial parse was empty.',
        '<strong>Equipped Section:</strong> A creative accordion + live mockup section on the Career Copilot landing page showcasing 5 key features (Resume Optimization, Job Discovery, Interview Coaching, Application Tracking, Career Analytics) with dynamic mockup previews.',
        '<strong>Auto Apply Agent:</strong> A dedicated agent that auto-fills job applications using your extracted profile — name, email, phone, skills, and experience pre-populated into the application form.',
        '<strong>Interview Modal Redesign:</strong> Full-screen interview coach modal with question cards, STAR framework guidance, answer input, and AI evaluation feedback.'
      ],
      icon: Cpu,
      badgeColor: 'badge-blue'
    },
    {
      id: 9,
      version: 'v2.6.0',
      date: 'June 19, 2026',
      title: 'Interactive Theme Transparency & Smooth Footer Transitions',
      tag: 'UX Polish',
      description: 'Major polish update to align the Home page, Resume Builder landing page, and global Footer component with the interactive DigitalSerenityBackground. Replaced solid color blocks with beautiful frosted glassmorphism elements.',
      details: [
        '<strong>Site-Wide Background Integration:</strong> Removed all solid color bands (#0d0d0d and #ffffff) on the Home page, allowing the serene animated grid background to flow smoothly across the entire viewport.',
        '<strong>Premium Glassmorphism Panels:</strong> Redesigned the One Place Tab Navigation, active buttons, mockup boxes, and panels as frosted glass elements with high-readability text colors.',
        '<strong>Frosted Glass FAQ Cards:</strong> Converted the FAQ accordion into a list of individual cards featuring hover lift offsets, subtle purplish borders, and clean layout padding.',
        '<strong>Seamless Footer Transition:</strong> Transformed the solid footer block into a transparent, glassmorphic container with backdrop blur, resolving the abrupt cut-off when scrolling to the bottom of the screen.'
      ],
      icon: Sparkles,
      badgeColor: 'badge-green'
    },
    {
      id: 8,
      version: 'v2.5.0',
      date: 'June 8, 2026',
      title: 'AI Resume Wizard, Dynamic Form Sections & Preview Mockups',
      tag: 'New Features',
      description: 'Major update introducing the structured AI Resume Builder Wizard. Users can select any ATS resume template, fill in their credentials dynamically via dynamic form sections, and have AI generate a high-impact resume in under 60 seconds.',
      details: [
        '<strong>AI Resume Builder Wizard:</strong> A premium, multi-section form wizard collecting Personal info, Academic details, Work Experience, Skills, and Courses.',
        '<strong>Dynamic List Add/Remove Controls:</strong> Fully interactive controls to add or remove multiple dynamic work experiences, schools, or certifications.',
        '<strong>High-Resolution Template Previews:</strong> Replaced miniature placeholder drawings in the gallery with real, high-resolution preview screenshots of each template layout.',
        '<strong>Truncation-Free AI Refine:</strong> Upgraded the refinement engine with a 5,000-token capacity limit and structured instructions to prevent layout cut-offs.'
      ],
      icon: Sparkles,
      badgeColor: 'badge-purple'
    },
    {
      id: 7,
      version: 'v2.4.0',
      date: 'June 5, 2026',
      title: 'Introducing AI Job Finder: CV-to-Role Matching Engine',
      tag: 'New Features',
      description: 'Find jobs tailored specifically to your resume in seconds. Upload your CV, describe your target role, and let AI scan the market to curate 8–10 matched opportunities with salary ranges, required skills, and direct LinkedIn apply links.',
      details: [
        '<strong>Intelligent Role Matching:</strong> Analyzes your resume experience and target preferences to align compatible roles, bypassing generic keyword filters.',
        '<strong>Compatibility Match Scores:</strong> Real-time percentage score checking showing how strongly your skills map to target responsibilities.',
        '<strong>Smart Work Type Filters:</strong> Instantly filter matches using Remote, Full-time, Part-time, and Internship selector pills.',
        '<strong>Direct Apply Links:</strong> Pre-populated, search-safe job board links matching the exact title and location on standard professional boards.',
        '<strong>Premium Interactive Visuals:</strong> Gorgeous animated scanning console displaying active step-by-step progress checklists while the AI curates matches.'
      ],
      icon: Sparkles,
      badgeColor: 'badge-purple'
    },
    {
      id: 6,
      version: 'v2.3.0',
      date: 'June 4, 2026',
      title: '360° Rotating Product Showcase on Home Page',
      tag: 'UX Polish',
      description: 'A stunning 3D rotating product carousel has been added to the Home page, showcasing all 6 AI tools through interactive cards — featuring auto-rotation, drag support, flip animations, and live navigation controls.',
      details: [
        '<strong>360° 3D Card Carousel:</strong> A fully interactive 3D carousel is now embedded below the hero/upload section on the Home page. All 6 AI product cards rotate with real perspective depth and smooth transitions.',
        '<strong>Auto-Rotate with Pause-on-Hover:</strong> Cards automatically cycle every 6 seconds. Hovering pauses the rotation instantly, and it resumes as soon as the cursor leaves.',
        '<strong>Drag to Explore:</strong> Users can manually drag the carousel left or right using mouse or touch — fully functional on both desktop and mobile devices.',
        '<strong>Flip Animation (Front & Back):</strong> Each card can be flipped to reveal a "How it Works" back side showing a step-by-step guide and feature tags for that tool.',
        '<strong>Direct Navigation:</strong> Clicking "Try it Free" on any card navigates directly to that tool without any extra steps or redirects.',
        '<strong>Live Progress Arc:</strong> An animated arc indicator at the bottom displays the current card number and product name with a smooth fill transition.',
        '<strong>Per-Card Gradient Glow:</strong> Every product card has its own unique color gradient and ambient glow effect, giving the platform a premium, polished aesthetic.'
      ],
      icon: Sparkles,
      badgeColor: 'badge-green'
    },
    {
      id: 5,
      version: 'v2.2.0',
      date: 'June 3, 2026',
      title: 'Voice Practice, AI Portfolios & LinkedIn Post Generator',
      tag: 'New Features',
      description: 'Massive update introducing three major tools: Web Speech API-based mock interviews, 1-click portfolio website generation, and viral LinkedIn post generation, along with complete AI API engine migrations.',
      details: [
        '<strong>Voice Interview Practice:</strong> Built an interactive mock interview sandbox utilizing the Web Speech API. Candidates can now speak their answers aloud, and the AI will analyze transcripts for STAR alignment, confidence, and filler words.',
        '<strong>Portfolio Website Generator:</strong> Instantly convert a resume into a responsive HTML/CSS portfolio website. Features 5 premium themes, an interactive device preview frame, and a direct .html download option.',
        '<strong>LinkedIn Post Generator:</strong> Generates 3 styles of viral LinkedIn posts (Professional, Storytelling, Punchy) with hooks and hashtags based on your resume achievements and target topic.',
        '<strong>Microphone Auto-Recovery:</strong> Implemented silent auto-restart logic to prevent the Web Speech API from abruptly stopping during long pauses or browser network timeouts.'
      ],
      icon: Sparkles,
      badgeColor: 'badge-purple'
    },
    {
      id: 1,
      version: 'v2.1.0',
      date: 'June 3, 2026',
      title: 'Big Product Update: CV Mind is now Launch-Ready!',
      tag: 'Core Upgrade',
      description: 'Over the last few days, we have completely transformed CV Mind from a simple resume reviewer into a comprehensive, end-to-end career suite. We have deployed major features and updates across product navigation, our core engine, and dashboard UX.',
      details: [
        '<strong>1. SmartPrep AI (HR & Technical Interview Coach)</strong><br/>Cracking interviews is now easier than ever! SmartPrep AI parses your resume and curates tailored interview questions based on your targeted job profile and domain checklists:',
        '<span class="sub-bullet"><strong>Practice Sandbox:</strong> Practice by typing your answers question-by-question.</span>',
        '<span class="sub-bullet"><strong>AI Evaluation & Score:</strong> Receive instant feedback and a score (out of 10) evaluating how well your answer aligns with the standard STAR (Situation, Task, Action, Result) framework.</span>',
        
        '<strong>2. LinkedIn Optimizer (Dedicated Submenu Suite)</strong><br/>Designed to elevate your professional branding to a state-of-the-art level:',
        '<span class="sub-bullet"><strong>Profile PDF Audit:</strong> Simply download your LinkedIn profile as a PDF, upload it here, and receive actionable optimization scores.</span>',
        '<span class="sub-bullet"><strong>Bio & Headline Generator:</strong> Auto-generate LinkedIn bios and headlines optimized with custom hooks, core skills, and key achievements.</span>',
        '<span class="sub-bullet"><strong>Outreach & DM Writer:</strong> Generate highly personalized templates for recruiter DMs, referral requests, and connection invites.</span>',

        '<strong>3. Career Path AI (Career Transitions Builder)</strong><br/>Define your professional benchmarks and plan milestones:',
        '<span class="sub-bullet"><strong>Skill Gap & Courses:</strong> Identify skill gaps relative to your target job profile and get curated online course recommendations.</span>',
        '<span class="sub-bullet"><strong>Elevator Pitch Builder:</strong> Craft custom 60-second verbal pitches tailored to Corporate, Startup, or Creative contexts.</span>',
        '<span class="sub-bullet"><strong>Interactive Career Roadmap:</strong> Get visual timeline checklists with milestones and step-by-step guidelines to upgrade from your current role to your target career path.</span>',

        '<strong>4. Premium UX & Auto-Save Features</strong><br/>For maximum user convenience, we have automated and refined manual actions:',
        '<span class="sub-bullet"><strong>Silent Background Auto-Save:</strong> The content editor (for Resumes and Cover Letters) now saves your progress in the background every 4 seconds without interrupting your typing or cursor position. SmartPrep AI practice logs and Outreach templates are also saved automatically upon creation.</span>',
        '<span class="sub-bullet"><strong>Visual Status Badges:</strong> The manual save button is replaced with an elegant, real-time status badge: "✓ Saved automatically to My Works".</span>',
        '<span class="sub-bullet"><strong>Deletion Safety Sync:</strong> Deleting a saved file from the "My Works" panel instantly resets the active editor or dashboard back to the gallery view, ensuring clean state sync across the board.</span>',

        '<strong>5. Upgraded Core Engine & Performance Optimizations</strong><br/>To keep the platform dynamic, highly responsive, and crash-proof:',
        '<span class="sub-bullet"><strong>Optimized Request Pipelines:</strong> We have fully rebuilt our server-side request pipelines. This guarantees instant response times, zero connection timeouts, and a seamless user experience under heavy loads.</span>',
        '<span class="sub-bullet"><strong>Schema-Safe Parsing:</strong> Integrated robust error boundaries between the frontend and backend, ensuring structured data compiles correctly with zero format mismatches.</span>'
      ],
      icon: Cpu,
      badgeColor: 'badge-blue'
    },
    {
      id: 2,
      version: 'v2.0.0',
      date: 'June 1, 2026',
      title: 'LinkedIn Outreach & Transition Features Rollout',
      tag: 'New Features',
      description: 'Extending platform scopes into customized networking DMs, corporate pitches, visual timelines, and skill path planning.',
      details: [
        '<strong>Recruiter DMs & Connection Requests:</strong> Dynamic cold networking pitches customized for LinkedIn character limits.',
        '<strong>Automated Skill Gap Scans:</strong> Matches resume context against targeted descriptions and recommends online curriculum links.',
        '<strong>Custom Elevator Pitches:</strong> Produces narratives matching corporate, startup, or creative communication requirements.',
        '<strong>Interactive transition roadmap checklists:</strong> A 4-stage transitions timeline to benchmark candidate milestones.'
      ],
      icon: Rocket,
      badgeColor: 'badge-purple'
    },
    {
      id: 3,
      version: 'v1.2.0',
      date: 'May 29, 2026',
      title: 'Premium Portfolios & Interactive Coach Sandbox',
      tag: 'UX Polish',
      description: 'Adding interview question sandboxes and public-facing designer portfolios for recruiters.',
      details: [
        '<strong>SmartPrep Question Bank:</strong> Custom scorecards checking technical, behavioral, and HR questions based on your resume.',
        '<strong>Shareable Portfolio Links:</strong> Visual web portfolios featuring premium responsive templates, opening in clean external tabs.',
        '<strong>Banner Guidelines & Taglines:</strong> Layout design suggestions to optimize profile banner keywords.'
      ],
      icon: Sparkles,
      badgeColor: 'badge-green'
    },
    {
      id: 4,
      version: 'v1.1.0',
      date: 'May 25, 2026',
      title: 'Email Password Reset & FAQ Help Center',
      tag: 'Security & Help',
      description: 'Hardening verification pipelines, logging administrator audits, and streamlining navigation guides.',
      details: [
        '<strong>SMTP Resend SDK Dispatcher:</strong> Enables live, secure, tokenized password reset links via email.',
        '<strong>Admin Audit Logs:</strong> Logs password reset triggers for secure developer maintenance.',
        '<strong>Redesigned FAQ split-screen articles:</strong> Streamlines user support access.',
        '<strong>Frictionless Landing Page:</strong> Removes authorization boundaries for initial resume scans.'
      ],
      icon: ShieldCheck,
      badgeColor: 'badge-orange'
    }
  ];

  const tags = ['all', 'Core Upgrade', 'New Features', 'UX Polish', 'Security & Help'];

  const filteredData = selectedTag === 'all' 
    ? changelogData 
    : changelogData.filter(item => item.tag === selectedTag);

  return (
    <div className="blog-wrapper">
      {/* Back button */}
      <div className="blog-nav-header">
        <button className="blog-back-btn" onClick={() => setCurrentPage('home')}>
          <ArrowLeft size={16} /> Back to Home
        </button>
      </div>

      {/* Hero header */}
      <section className="blog-hero">
        <div className="blog-badge-wrapper">
          <span className="blog-pulse-dot"></span>
          <span className="blog-launch-date">Live at cvmind.online</span>
        </div>
        <h1 className="blog-title">CV Mind Changelog</h1>
        <p className="blog-subtitle">
          Every feature, fix, and upgrade — tracked from Day 1. Now live with a full suite of AI career tools.
        </p>
      </section>

      {/* Featured Articles */}
      <section style={{ maxWidth: '860px', margin: '0 auto 40px', padding: '0 20px' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 750, marginBottom: '14px' }}>📚 Career Guides</h2>
        <div style={{ display: 'grid', gap: '14px' }}>
          {ARTICLES.map(a => (
            <div
              key={a.slug}
              onClick={() => setCurrentPage(a.slug)}
              style={{ cursor: 'pointer', background: 'var(--bg-card, #fff)', border: '1px solid var(--border, #e8e8ed)', borderRadius: '16px', padding: '22px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
            >
              <span style={{ display: 'inline-block', background: 'linear-gradient(135deg,#2997ff,#bf5af2)', color: '#fff', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.05em', padding: '2px 10px', borderRadius: '99px', marginBottom: '10px', textTransform: 'uppercase' }}>{a.tag}</span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 6px' }}>{a.title}</h3>
              <p style={{ color: 'var(--text-secondary, #6e6e73)', fontSize: '0.92rem', margin: 0, lineHeight: 1.6 }}>
                {a.blurb} {a.readTime} <ArrowRight size={13} style={{ verticalAlign: '-2px' }} />
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Tag Filters */}
      <div className="blog-filters">
        {tags.map(tag => (
          <button
            key={tag}
            className={`blog-filter-tag ${selectedTag === tag ? 'active' : ''}`}
            onClick={() => setSelectedTag(tag)}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Timeline Section */}
      <div className="blog-timeline">
        {filteredData.map((item) => {
          const IconComponent = item.icon;
          return (
            <div key={item.id} className="blog-card-item">
              {/* Left Timeline metadata */}
              <div className="blog-timeline-meta">
                <div className="blog-icon-ring">
                  <IconComponent size={20} />
                </div>
                <div className="blog-meta-texts">
                  <span className="blog-version">{item.version}</span>
                  <span className="blog-date">{item.date}</span>
                </div>
              </div>

              {/* Right blog content card */}
              <div className="blog-content-card">
                <div className="blog-card-header">
                  <span className={`blog-tag-badge ${item.badgeColor}`}>{item.tag}</span>
                  <h2 className="blog-card-title">{item.title}</h2>
                </div>
                <p className="blog-card-desc">{item.description}</p>
                <div className="blog-bullet-section">
                  <h4 className="bullet-section-title">Key Highlights:</h4>
                  <ul className="blog-bullet-list">
                    {item.details.map((detail, dIdx) => (
                      <li 
                        key={dIdx} 
                        className="blog-bullet-item" 
                        dangerouslySetInnerHTML={{ __html: detail }} 
                      />
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Launch CTA card */}
      <section className="blog-cta-section">
        <div className="blog-cta-card">
          <div className="cta-content">
            <h3 className="cta-title">We're Live! 🎉</h3>
            <p className="cta-desc">
              CV Mind is officially live at cvmind.online — free ATS resume checks, AI resume building, and interview prep. Start with a free resume scan.
            </p>
            <button className="cta-btn" onClick={() => setCurrentPage('home')}>
              Try CV Mind Now <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
