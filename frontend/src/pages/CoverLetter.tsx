import { useState, useRef, useEffect } from 'react';
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Undo2, Redo2, Table, Minus,
  Sparkles, Copy, Check, Download, RotateCcw, ArrowLeft,
  Loader2, AlertTriangle, Eraser, Highlighter,
  ChevronDown, ChevronRight, FileText, CheckCircle2,
  Image, Link, Pencil, Globe
} from 'lucide-react';
import './CoverLetter.css';
import ResumeWizard from '../components/ResumeWizard';
import { authFetch } from '../lib/authFetch';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────
interface Template {
  id: string;
  name: string;
  tag: string;
  icon: string;
  color: string;
  accent: string;
  description: string;
  highlights: string[];
  html: string;
  type?: 'resume' | 'cover-letter';
}

// ─────────────────────────────────────────────────────────────────
// Toolbar constants
// ─────────────────────────────────────────────────────────────────
const FONTS = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: "'Times New Roman', serif" },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Calibri', value: 'Calibri, sans-serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Trebuchet MS', value: "'Trebuchet MS', sans-serif" },
  { label: 'Courier New', value: "'Courier New', monospace" },
  { label: 'Garamond', value: 'Garamond, serif' },
];
const SIZES = ['8','9','10','11','12','13','14','16','18','20','22','24','28','32','36','48','72'];
const TEXT_COLORS = [
  '#000000','#1a1a1a','#444444','#666666','#999999','#cccccc','#eeeeee','#ffffff',
  '#ff0000','#cc0000','#ff4500','#ff9900','#ffcc00','#ffff00',
  '#00cc00','#006600','#00cccc','#0099ff','#0066cc','#003399',
  '#6600cc','#cc00cc','#ff00cc','#ff6699',
];
const HIGHLIGHT_COLORS = [
  '#ffff00','#00ff00','#00ffff','#ff00ff','#ffaa00','#ff4444','#4499ff','#ffffff','transparent',
];

// ─────────────────────────────────────────────────────────────────
// ATS Resume Templates (22 designs)
// ─────────────────────────────────────────────────────────────────
const TEMPLATES: Template[] = [
  {
    id: 'classic-pro',
    name: 'Classic Professional',
    tag: 'Traditional · ATS Safe',
    icon: '📄',
    color: '#2997ff',
    accent: 'rgba(41,151,255,0.12)',
    description: 'Timeless black & white format trusted by Fortune 500 recruiters worldwide.',
    highlights: ['ATS Proven', 'Universal Format', 'Clean Layout'],
    html: `<div style="font-family:'Times New Roman',serif;max-width:720px;margin:0 auto;padding:36px;color:#111;line-height:1.55;">
<div style="text-align:center;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:16px;">
<div style="font-size:26px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">JOHN DOE</div>
<div style="font-size:13px;color:#444;margin-top:5px;">john.doe@email.com &nbsp;|&nbsp; +91 9876543210 &nbsp;|&nbsp; New Delhi, India &nbsp;|&nbsp; linkedin.com/in/johndoe</div>
</div>
<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;border-bottom:1px solid #111;padding-bottom:3px;margin:14px 0 8px;">Professional Summary</div>
<p style="font-size:13px;margin:0 0 12px;">Results-driven professional with 5+ years of experience delivering high-impact solutions. Proven ability to [Key Skill] and [Key Skill], consistently exceeding targets by 30%+. Passionate about [Domain] and committed to driving measurable business outcomes.</p>
<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;border-bottom:1px solid #111;padding-bottom:3px;margin:14px 0 8px;">Work Experience</div>
<div style="margin-bottom:12px;">
<div style="display:flex;justify-content:space-between;"><b style="font-size:13px;">Senior [Job Title]</b><span style="font-size:12px;color:#555;">Jan 2022 – Present</span></div>
<div style="font-size:12px;color:#555;margin-bottom:4px;">Company Name &nbsp;·&nbsp; New Delhi, India</div>
<ul style="margin:0;padding-left:18px;font-size:13px;"><li>Led team of 8 to deliver [Project], increasing revenue by 35%.</li><li>Spearheaded initiative reducing operational costs by 28% through [Method].</li><li>Collaborated with C-level stakeholders to define and execute product roadmap.</li></ul>
</div>
<div style="margin-bottom:12px;">
<div style="display:flex;justify-content:space-between;"><b style="font-size:13px;">[Job Title]</b><span style="font-size:12px;color:#555;">Jun 2019 – Dec 2021</span></div>
<div style="font-size:12px;color:#555;margin-bottom:4px;">Previous Company &nbsp;·&nbsp; Mumbai, India</div>
<ul style="margin:0;padding-left:18px;font-size:13px;"><li>Developed [System/Product] serving 50,000+ active users with 99.9% uptime.</li><li>Improved [Key Metric] by 22% through data-driven optimizations.</li></ul>
</div>
<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;border-bottom:1px solid #111;padding-bottom:3px;margin:14px 0 8px;">Skills</div>
<p style="font-size:13px;margin:0 0 4px;"><b>Technical:</b> Skill 1, Skill 2, Skill 3, Skill 4, Skill 5, Skill 6</p>
<p style="font-size:13px;margin:0 0 12px;"><b>Soft Skills:</b> Leadership, Communication, Problem Solving, Stakeholder Management</p>
<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;border-bottom:1px solid #111;padding-bottom:3px;margin:14px 0 8px;">Education</div>
<div style="display:flex;justify-content:space-between;font-size:13px;"><b>B.Tech / B.E. in [Branch]</b><span style="font-size:12px;color:#555;">2015 – 2019</span></div>
<div style="font-size:12px;color:#555;">University Name &nbsp;·&nbsp; City, India &nbsp;·&nbsp; CGPA: 8.5/10</div>
</div>`
  },
  {
    id: 'modern-blue',
    name: 'Modern Blue',
    tag: 'Corporate · Bold Accents',
    icon: '🔵',
    color: '#1565c0',
    accent: 'rgba(21,101,192,0.12)',
    description: 'Contemporary design with striking blue accents for corporate and tech roles.',
    highlights: ['Tech-Forward', 'High Impact', 'Skills Tags'],
    html: `<div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;padding:36px;background:#fff;color:#1a1a1a;line-height:1.6;">
<div style="margin-bottom:20px;">
<div style="font-size:30px;font-weight:900;color:#1565c0;letter-spacing:-1px;margin-bottom:3px;">John Doe</div>
<div style="font-size:14px;font-weight:600;color:#444;margin-bottom:6px;">[Your Professional Title]</div>
<div style="font-size:12px;color:#555;">📧 john.doe@email.com &nbsp;·&nbsp; 📱 +91 9876543210 &nbsp;·&nbsp; 📍 New Delhi &nbsp;·&nbsp; 🔗 linkedin.com/in/johndoe</div>
</div>
<div style="border-left:4px solid #1565c0;padding-left:14px;margin-bottom:18px;">
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#1565c0;margin-bottom:5px;">Profile Summary</div>
<p style="font-size:13px;margin:0;">Dynamic and results-oriented professional with 5+ years of experience in [Industry]. Expert in [Skill] and [Skill], with a proven track record of driving [Outcome]. Seeking to leverage expertise to deliver impact at [Company].</p>
</div>
<div style="border-left:4px solid #1565c0;padding-left:14px;margin-bottom:18px;">
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#1565c0;margin-bottom:10px;">Professional Experience</div>
<div style="margin-bottom:12px;">
<div style="font-size:14px;font-weight:700;">Senior [Job Title]</div>
<div style="display:flex;justify-content:space-between;font-size:12px;color:#1565c0;font-weight:600;margin-bottom:4px;"><span>Company Name · New Delhi</span><span>2022 – Present</span></div>
<ul style="margin:0;padding-left:18px;font-size:13px;"><li>Delivered [Project] ahead of schedule, generating ₹50L+ in additional revenue.</li><li>Managed cross-functional team of 12, improving delivery velocity by 40%.</li><li>Implemented [Tool/Process] reducing bug rates by 60% in production.</li></ul>
</div>
<div>
<div style="font-size:14px;font-weight:700;">[Job Title]</div>
<div style="display:flex;justify-content:space-between;font-size:12px;color:#1565c0;font-weight:600;margin-bottom:4px;"><span>Previous Company · Mumbai</span><span>2019 – 2022</span></div>
<ul style="margin:0;padding-left:18px;font-size:13px;"><li>Built and scaled [Product/Feature] from 0 to 100K users in 12 months.</li><li>Reduced system downtime by 45% through architectural improvements.</li></ul>
</div>
</div>
<div style="border-left:4px solid #1565c0;padding-left:14px;margin-bottom:18px;">
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#1565c0;margin-bottom:8px;">Core Skills</div>
<div style="display:flex;flex-wrap:wrap;gap:6px;">
<span style="background:#e3f2fd;color:#1565c0;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:600;">Skill One</span>
<span style="background:#e3f2fd;color:#1565c0;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:600;">Skill Two</span>
<span style="background:#e3f2fd;color:#1565c0;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:600;">Skill Three</span>
<span style="background:#e3f2fd;color:#1565c0;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:600;">Skill Four</span>
<span style="background:#e3f2fd;color:#1565c0;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:600;">Skill Five</span>
<span style="background:#e3f2fd;color:#1565c0;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:600;">Skill Six</span>
</div>
</div>
<div style="border-left:4px solid #1565c0;padding-left:14px;">
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#1565c0;margin-bottom:5px;">Education</div>
<div style="display:flex;justify-content:space-between;font-size:13px;"><b>B.Tech in [Branch]</b><span style="font-size:12px;color:#555;">2015 – 2019</span></div>
<div style="font-size:12px;color:#555;">University Name &nbsp;·&nbsp; CGPA: 8.5/10</div>
</div>
</div>`
  },
  {
    id: 'executive-elite',
    name: 'Executive Elite',
    tag: 'C-Suite · Leadership',
    icon: '👔',
    color: '#37474f',
    accent: 'rgba(55,71,79,0.12)',
    description: 'Commanding presence for senior leadership, director and C-Suite applications.',
    highlights: ['Leadership Focus', 'Board Level', 'Premium Look'],
    html: `<div style="font-family:Georgia,serif;max-width:720px;margin:0 auto;padding:36px;background:#fff;color:#1a1a1a;line-height:1.65;">
<div style="text-align:center;margin-bottom:22px;">
<div style="font-size:26px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">JOHN DOE</div>
<div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#37474f;margin-top:4px;font-weight:600;">Chief [Title] Officer &nbsp;|&nbsp; [Industry] Executive</div>
<div style="width:60px;height:3px;background:#37474f;margin:10px auto;"></div>
<div style="font-size:12px;color:#555;">john.doe@email.com &nbsp;·&nbsp; +91 9876543210 &nbsp;·&nbsp; New Delhi, India</div>
</div>
<div style="background:#f5f5f5;padding:14px 18px;margin-bottom:18px;border-left:3px solid #37474f;">
<p style="font-size:13px;margin:0;font-style:italic;color:#333;line-height:1.7;">"Visionary executive with 15+ years building high-performance organizations and delivering $50M+ in measurable business value. Known for transforming complex challenges into strategic opportunities that drive sustainable competitive advantage."</p>
</div>
<div style="display:flex;gap:8px;align-items:center;margin:16px 0 10px;"><div style="flex:1;height:1px;background:#ccc;"></div><div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#37474f;white-space:nowrap;padding:0 10px;">Executive Experience</div><div style="flex:1;height:1px;background:#ccc;"></div></div>
<div style="margin-bottom:14px;">
<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px;"><div style="font-size:14px;font-weight:700;">Chief [Role] Officer</div><div style="font-size:12px;color:#37474f;font-weight:600;">2019 – Present</div></div>
<div style="font-size:12px;color:#555;margin-bottom:5px;font-style:italic;">Fortune 500 Company &nbsp;·&nbsp; New Delhi, India</div>
<ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.8;"><li>Drove $25M revenue growth through strategic market expansion across 5 new geographies.</li><li>Built and scaled team from 50 to 200+, achieving 95% employee retention rate.</li><li>Negotiated key partnerships generating ₹100Cr+ in annual contract value.</li></ul>
</div>
<div style="display:flex;gap:8px;align-items:center;margin:16px 0 10px;"><div style="flex:1;height:1px;background:#ccc;"></div><div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#37474f;white-space:nowrap;padding:0 10px;">Core Competencies</div><div style="flex:1;height:1px;background:#ccc;"></div></div>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:14px;font-size:12.5px;text-align:center;">
<div style="padding:6px;border:1px solid #ddd;">Strategic Planning</div><div style="padding:6px;border:1px solid #ddd;">P&amp;L Management</div><div style="padding:6px;border:1px solid #ddd;">M&amp;A Strategy</div>
<div style="padding:6px;border:1px solid #ddd;">Board Relations</div><div style="padding:6px;border:1px solid #ddd;">Org Design</div><div style="padding:6px;border:1px solid #ddd;">Change Management</div>
</div>
<div style="display:flex;gap:8px;align-items:center;margin:16px 0 8px;"><div style="flex:1;height:1px;background:#ccc;"></div><div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#37474f;white-space:nowrap;padding:0 10px;">Education</div><div style="flex:1;height:1px;background:#ccc;"></div></div>
<div style="font-size:13px;"><b>MBA in [Specialization]</b> &nbsp;·&nbsp; IIM [City] &nbsp;·&nbsp; 2007–2009</div>
<div style="font-size:13px;margin-top:4px;"><b>B.Tech in [Branch]</b> &nbsp;·&nbsp; IIT [City] &nbsp;·&nbsp; 2001–2005</div>
</div>`
  },
  {
    id: 'tech-minimal',
    name: 'Tech Minimal',
    tag: 'Developer · Engineer',
    icon: '💻',
    color: '#2e7d32',
    accent: 'rgba(46,125,50,0.12)',
    description: 'Ultra-clean minimal design for software engineers and developers.',
    highlights: ['Code Tags', 'GitHub Ready', 'ATS Optimized'],
    html: `<div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;padding:36px;background:#fff;color:#1a1a1a;line-height:1.6;">
<div style="margin-bottom:20px;">
<div style="font-size:32px;font-weight:900;color:#111;letter-spacing:-1.5px;margin-bottom:2px;">John Doe</div>
<div style="font-size:15px;color:#2e7d32;font-weight:600;margin-bottom:8px;">Full Stack Engineer &nbsp;·&nbsp; 5+ YOE</div>
<div style="font-size:12px;color:#666;display:flex;flex-wrap:wrap;gap:12px;"><span>📧 john.doe@email.com</span><span>📱 +91 9876543210</span><span>🐙 github.com/johndoe</span><span>🔗 linkedin.com/in/johndoe</span></div>
</div>
<div style="height:2px;background:linear-gradient(90deg,#2e7d32,#81c784,transparent);margin-bottom:20px;"></div>
<div style="margin-bottom:16px;">
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#2e7d32;margin-bottom:6px;">// About</div>
<p style="font-size:13px;margin:0;">Software engineer passionate about building scalable systems. 5+ years shipping production code. Expert in [Stack]. I write clean, tested, maintainable code that performs at scale and serves millions of users.</p>
</div>
<div style="margin-bottom:16px;">
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#2e7d32;margin-bottom:8px;">// Tech Stack</div>
<div style="display:flex;flex-wrap:wrap;gap:7px;">
<code style="background:#f1f8e9;color:#2e7d32;padding:3px 10px;border-radius:4px;font-size:12px;border:1px solid #c5e1a5;">React</code>
<code style="background:#f1f8e9;color:#2e7d32;padding:3px 10px;border-radius:4px;font-size:12px;border:1px solid #c5e1a5;">Node.js</code>
<code style="background:#f1f8e9;color:#2e7d32;padding:3px 10px;border-radius:4px;font-size:12px;border:1px solid #c5e1a5;">Python</code>
<code style="background:#f1f8e9;color:#2e7d32;padding:3px 10px;border-radius:4px;font-size:12px;border:1px solid #c5e1a5;">AWS</code>
<code style="background:#f1f8e9;color:#2e7d32;padding:3px 10px;border-radius:4px;font-size:12px;border:1px solid #c5e1a5;">Docker</code>
<code style="background:#f1f8e9;color:#2e7d32;padding:3px 10px;border-radius:4px;font-size:12px;border:1px solid #c5e1a5;">PostgreSQL</code>
<code style="background:#f1f8e9;color:#2e7d32;padding:3px 10px;border-radius:4px;font-size:12px;border:1px solid #c5e1a5;">TypeScript</code>
<code style="background:#f1f8e9;color:#2e7d32;padding:3px 10px;border-radius:4px;font-size:12px;border:1px solid #c5e1a5;">Redis</code>
</div>
</div>
<div style="margin-bottom:16px;">
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#2e7d32;margin-bottom:10px;">// Experience</div>
<div style="border-left:2px solid #c8e6c9;padding-left:14px;margin-bottom:12px;">
<div style="font-size:14px;font-weight:700;">Senior Software Engineer</div>
<div style="font-size:12px;color:#2e7d32;font-weight:600;margin-bottom:4px;">Tech Company &nbsp;·&nbsp; 2022 – Present</div>
<ul style="margin:0;padding-left:14px;font-size:13px;"><li>Built microservices handling 10M+ requests/day at &lt;50ms p99 latency.</li><li>Led migration monolith → microservices, reducing deploy time by 70%.</li><li>Mentored 4 junior engineers; introduced code review culture.</li></ul>
</div>
<div style="border-left:2px solid #c8e6c9;padding-left:14px;">
<div style="font-size:14px;font-weight:700;">Software Engineer</div>
<div style="font-size:12px;color:#2e7d32;font-weight:600;margin-bottom:4px;">Startup &nbsp;·&nbsp; 2019 – 2022</div>
<ul style="margin:0;padding-left:14px;font-size:13px;"><li>Shipped [Feature] used by 200K+ daily active users.</li><li>Reduced API response time by 45% through caching &amp; query optimization.</li></ul>
</div>
</div>
<div><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#2e7d32;margin-bottom:5px;">// Education</div>
<div style="font-size:13px;"><b>B.Tech, Computer Science</b> &nbsp;·&nbsp; IIT/NIT [City] &nbsp;·&nbsp; 2015–2019 &nbsp;·&nbsp; CGPA 8.7</div></div>
</div>`
  },
  {
    id: 'clean-corporate',
    name: 'Clean Corporate',
    tag: 'Management · Consulting',
    icon: '🏢',
    color: '#00695c',
    accent: 'rgba(0,105,92,0.12)',
    description: 'Professional teal-accented design for corporate, MBA, and consulting roles.',
    highlights: ['Corporate Ready', 'Teal Accent', '2-Column'],
    html: `<div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;padding:0;background:#fff;color:#1a1a1a;line-height:1.6;">
<div style="background:#00695c;color:#fff;padding:24px 28px;">
<div style="font-size:26px;font-weight:700;margin-bottom:3px;">John Doe</div>
<div style="font-size:13px;opacity:0.9;margin-bottom:6px;">[Senior Manager / Director / Consultant]</div>
<div style="font-size:11.5px;opacity:0.8;display:flex;flex-wrap:wrap;gap:14px;"><span>john.doe@email.com</span><span>+91 9876543210</span><span>New Delhi, India</span></div>
</div>
<div style="padding:24px 28px;">
<div style="display:grid;grid-template-columns:2fr 1fr;gap:24px;">
<div>
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#00695c;border-bottom:2px solid #00695c;padding-bottom:3px;margin-bottom:8px;">Professional Summary</div>
<p style="font-size:13px;margin:0 0 16px;">Accomplished leader with 8+ years driving organizational excellence. Expert in [Area], [Area], and [Area]. Known for translating complex requirements into actionable strategies that deliver measurable impact.</p>
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#00695c;border-bottom:2px solid #00695c;padding-bottom:3px;margin-bottom:10px;">Experience</div>
<div style="margin-bottom:12px;">
<b style="font-size:13px;">Senior Manager – [Function]</b>
<div style="font-size:12px;color:#00695c;font-weight:600;margin-bottom:4px;">Company Name &nbsp;|&nbsp; 2021 – Present</div>
<ul style="margin:0;padding-left:14px;font-size:13px;"><li>Directed ₹20Cr budget and team of 25, achieving 120% of annual targets.</li><li>Launched 3 strategic initiatives resulting in 45% improvement in satisfaction.</li><li>Presented quarterly business reviews to Board of Directors.</li></ul>
</div>
<div>
<b style="font-size:13px;">Manager – [Function]</b>
<div style="font-size:12px;color:#00695c;font-weight:600;margin-bottom:4px;">Previous Company &nbsp;|&nbsp; 2018 – 2021</div>
<ul style="margin:0;padding-left:14px;font-size:13px;"><li>Grew team from 8 to 18 while maintaining high performance standards.</li><li>Reduced process cycle time by 35% through lean methodology.</li></ul>
</div>
</div>
<div style="padding-left:14px;border-left:3px solid #b2dfdb;">
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#00695c;margin-bottom:6px;">Core Skills</div>
<ul style="margin:0;padding-left:14px;font-size:12px;line-height:2;"><li>Strategic Planning</li><li>Team Leadership</li><li>Budget Management</li><li>Stakeholder Relations</li><li>Process Optimization</li><li>Data Analysis</li></ul>
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#00695c;margin:14px 0 6px;">Education</div>
<div style="font-size:13px;"><b>MBA, [Specialization]</b></div>
<div style="font-size:12px;color:#555;">IIM / Top B-School · 2015–2017</div>
<div style="font-size:13px;margin-top:6px;"><b>B.Com / B.Sc / B.E.</b></div>
<div style="font-size:12px;color:#555;">University · 2011–2015</div>
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#00695c;margin:14px 0 5px;">Certifications</div>
<div style="font-size:12px;line-height:2;">PMP® Certified<br>Six Sigma Green Belt<br>[Add Certification]</div>
</div>
</div>
</div>
</div>`
  },
  {
    id: 'finance-authority',
    name: 'Finance Authority',
    tag: 'Finance · Banking · Audit',
    icon: '📊',
    color: '#1a237e',
    accent: 'rgba(26,35,126,0.12)',
    description: 'Conservative and precise format for banking, finance, and Big 4 audit roles.',
    highlights: ['Finance-Specific', 'CFA/CPA Ready', 'Precise Layout'],
    html: `<div style="font-family:'Times New Roman',serif;max-width:720px;margin:0 auto;padding:36px;background:#fff;color:#111;line-height:1.6;">
<div style="border-top:4px solid #1a237e;border-bottom:1px solid #1a237e;padding:14px 0;margin-bottom:18px;text-align:center;">
<div style="font-size:23px;font-weight:700;color:#1a237e;letter-spacing:2px;text-transform:uppercase;">JOHN DOE, CFA | MBA</div>
<div style="font-size:12.5px;color:#444;letter-spacing:1px;margin-top:3px;">Financial Analyst | Investment Banking | Corporate Finance</div>
<div style="font-size:12px;color:#666;margin-top:5px;">john.doe@email.com &nbsp;·&nbsp; +91 9876543210 &nbsp;·&nbsp; New Delhi &nbsp;·&nbsp; CFA Level III Passed</div>
</div>
<div style="display:flex;gap:0;margin-bottom:14px;"><div style="width:15%;padding-right:12px;border-right:1px solid #1a237e;"><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#1a237e;padding-top:2px;">Summary</div></div><div style="padding-left:14px;font-size:13px;"><p style="margin:0;">Senior finance professional with 7+ years in financial analysis and investment banking. CFA charterholder with expertise in DCF modeling, M&amp;A due diligence, and portfolio management. Track record of managing ₹500Cr+ in assets and closing 10+ transactions worth $500M+ combined.</p></div></div>
<div style="display:flex;gap:0;margin-bottom:14px;"><div style="width:15%;padding-right:12px;border-right:1px solid #1a237e;"><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#1a237e;padding-top:2px;">Experience</div></div><div style="padding-left:14px;font-size:13px;width:100%;">
<div style="margin-bottom:10px;"><div style="display:flex;justify-content:space-between;"><b>Associate Director – Investment Banking</b><span style="font-size:12px;color:#555;">2021–Present</span></div><div style="font-size:12px;color:#1a237e;font-weight:600;margin-bottom:4px;">Top Investment Bank · New Delhi</div><ul style="margin:0;padding-left:14px;"><li>Executed 6 M&amp;A transactions worth $500M+ including due diligence and deal structuring.</li><li>Built complex financial models (DCF, LBO, merger) used in board presentations.</li><li>Managed relationships with 20+ institutional clients and family offices.</li></ul></div>
<div><div style="display:flex;justify-content:space-between;"><b>Financial Analyst</b><span style="font-size:12px;color:#555;">2018–2021</span></div><div style="font-size:12px;color:#1a237e;font-weight:600;margin-bottom:4px;">Big 4 Firm · Mumbai</div><ul style="margin:0;padding-left:14px;"><li>Prepared and reviewed financial statements for 30+ clients across BFSI sector.</li><li>Identified ₹15Cr in cost savings through variance analysis.</li></ul></div>
</div></div>
<div style="display:flex;gap:0;"><div style="width:15%;padding-right:12px;border-right:1px solid #1a237e;"><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#1a237e;padding-top:2px;">Skills</div></div><div style="padding-left:14px;font-size:13px;">Financial Modeling &nbsp;·&nbsp; DCF/LBO &nbsp;·&nbsp; M&amp;A Advisory &nbsp;·&nbsp; Excel/VBA &nbsp;·&nbsp; Bloomberg &nbsp;·&nbsp; Risk Analysis &nbsp;·&nbsp; IFRS/GAAP</div></div>
<div style="margin-top:10px;font-size:13px;"><b>Education:</b> MBA Finance, IIM Ahmedabad (2016–2018) &nbsp;|&nbsp; B.Com Honours, Delhi University (2012–2015)</div>
</div>`
  },
  {
    id: 'creative-bold',
    name: 'Creative Bold',
    tag: 'Design · Marketing · Brand',
    icon: '🎨',
    color: '#6a1b9a',
    accent: 'rgba(106,27,154,0.12)',
    description: 'Bold creative design with gradient header for marketing and creative roles.',
    highlights: ['Visual Impact', 'Brand-Aware', 'Award-Ready'],
    html: `<div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;padding:0;background:#fff;color:#1a1a1a;line-height:1.6;">
<div style="background:linear-gradient(135deg,#6a1b9a 0%,#ab47bc 100%);padding:28px 32px;color:#fff;">
<div style="font-size:28px;font-weight:900;letter-spacing:-1px;margin-bottom:3px;">John Doe</div>
<div style="font-size:14px;opacity:0.9;font-weight:400;margin-bottom:8px;">Senior Creative Director &nbsp;·&nbsp; Brand Strategist &nbsp;·&nbsp; UX Lead</div>
<div style="font-size:12px;opacity:0.8;display:flex;flex-wrap:wrap;gap:14px;"><span>john.doe@email.com</span><span>+91 9876543210</span><span>New Delhi</span><span>behance.net/johndoe</span></div>
</div>
<div style="padding:24px 32px;">
<div style="display:grid;grid-template-columns:2fr 1fr;gap:24px;">
<div>
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#6a1b9a;margin-bottom:6px;">Creative Profile</div>
<p style="font-size:13px;margin:0 0 16px;">Award-winning creative director with 8+ years transforming brands through strategic design thinking. Expert in visual storytelling and integrated campaigns reaching 10M+ consumers.</p>
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#6a1b9a;margin-bottom:8px;">Experience</div>
<div style="padding-left:12px;border-left:3px solid #ce93d8;margin-bottom:12px;">
<div style="font-size:14px;font-weight:700;">Senior Creative Director</div>
<div style="font-size:12px;color:#6a1b9a;font-weight:600;margin-bottom:4px;">Leading Agency · 2020–Present</div>
<ul style="margin:0;padding-left:14px;font-size:13px;"><li>Led rebranding of Fortune 500 client, increasing brand recall by 68%.</li><li>Managed creative team of 15 across 3 global studios.</li><li>Won 3 national awards including Cannes Lions shortlist.</li></ul>
</div>
<div style="padding-left:12px;border-left:3px solid #ce93d8;">
<div style="font-size:14px;font-weight:700;">Art Director</div>
<div style="font-size:12px;color:#6a1b9a;font-weight:600;margin-bottom:4px;">Digital Agency · 2017–2020</div>
<ul style="margin:0;padding-left:14px;font-size:13px;"><li>Delivered 60+ brand campaigns with 40% average CTR improvement.</li><li>Pioneered motion design practice, increasing video engagement by 3x.</li></ul>
</div>
</div>
<div>
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#6a1b9a;margin-bottom:6px;">Skills &amp; Tools</div>
<div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:14px;font-size:12px;">
<span style="background:#6a1b9a;color:#fff;padding:3px 8px;border-radius:99px;">Figma</span><span style="background:#6a1b9a;color:#fff;padding:3px 8px;border-radius:99px;">Adobe Suite</span><span style="background:#6a1b9a;color:#fff;padding:3px 8px;border-radius:99px;">Brand Strategy</span><span style="background:#6a1b9a;color:#fff;padding:3px 8px;border-radius:99px;">UX Design</span><span style="background:#6a1b9a;color:#fff;padding:3px 8px;border-radius:99px;">Motion Design</span>
</div>
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#6a1b9a;margin-bottom:6px;">Awards</div>
<div style="font-size:12.5px;line-height:2;">🏆 Cannes Lions Shortlist 2023<br>🥇 Kyoorius Gold 2022<br>⭐ D&amp;AD Nominee 2021</div>
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#6a1b9a;margin:12px 0 5px;">Education</div>
<div style="font-size:13px;"><b>BFA / B.Des</b></div>
<div style="font-size:12px;color:#555;">NID / NIFT · 2013–2017</div>
</div>
</div>
</div>
</div>`
  },
  {
    id: 'data-scientist',
    name: 'Data Scientist',
    tag: 'Analytics · ML · AI',
    icon: '📈',
    color: '#bf360c',
    accent: 'rgba(191,54,12,0.12)',
    description: 'Data-first design with skill sidebar, emphasizing technical depth and ML expertise.',
    highlights: ['ML-Focused', 'Skills Sidebar', 'Kaggle Ready'],
    html: `<div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;padding:36px;background:#fff;color:#1a1a1a;line-height:1.6;">
<div style="margin-bottom:18px;padding-bottom:14px;border-bottom:3px solid #bf360c;">
<div style="font-size:27px;font-weight:900;letter-spacing:-1px;margin-bottom:2px;">John Doe</div>
<div style="font-size:14px;color:#bf360c;font-weight:700;margin-bottom:5px;">Data Scientist | ML Engineer | AI Researcher</div>
<div style="font-size:12px;color:#555;display:flex;gap:14px;flex-wrap:wrap;"><span>john.doe@email.com</span><span>+91 9876543210</span><span>github.com/johndoe</span><span>kaggle.com/johndoe</span></div>
</div>
<div style="display:grid;grid-template-columns:3fr 1.6fr;gap:22px;">
<div>
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#bf360c;margin-bottom:5px;">Professional Summary</div>
<p style="font-size:13px;margin:0 0 14px;">Data Scientist with 5+ years building production ML systems. Shipped models processing 1B+ data points daily. Expert in NLP, computer vision, and recommendation systems. Kaggle Master (Top 1%). Passionate about translating data into business impact.</p>
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#bf360c;margin-bottom:8px;">Work Experience</div>
<div style="margin-bottom:12px;">
<div style="display:flex;justify-content:space-between;"><b style="font-size:13px;">Senior Data Scientist</b><span style="font-size:12px;color:#bf360c;font-weight:600;">2022–Present</span></div>
<div style="font-size:12px;color:#555;margin-bottom:4px;">Tech Unicorn · Bangalore, India</div>
<ul style="margin:0;padding-left:14px;font-size:13px;"><li>Built fraud detection model (XGBoost + LSTM) saving ₹8Cr monthly.</li><li>Developed NLP pipeline processing 500K+ tickets/day with 92% accuracy.</li><li>Led A/B testing framework adopted by 8 product teams.</li></ul>
</div>
<div>
<div style="display:flex;justify-content:space-between;"><b style="font-size:13px;">Data Analyst → Data Scientist</b><span style="font-size:12px;color:#bf360c;font-weight:600;">2019–2022</span></div>
<div style="font-size:12px;color:#555;margin-bottom:4px;">Analytics Company · Hyderabad</div>
<ul style="margin:0;padding-left:14px;font-size:13px;"><li>Built demand forecasting model reducing inventory waste by 25%.</li><li>Created customer segmentation model increasing marketing ROI by 35%.</li></ul>
</div>
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#bf360c;margin:14px 0 5px;">Education</div>
<div style="font-size:13px;"><b>M.Tech / MS in Data Science</b> &nbsp;·&nbsp; IIT/BITS &nbsp;·&nbsp; 2017–2019</div>
<div style="font-size:13px;margin-top:3px;"><b>B.Tech in CS / Stats</b> &nbsp;·&nbsp; University &nbsp;·&nbsp; 2013–2017 &nbsp;·&nbsp; CGPA 9.1</div>
</div>
<div>
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#bf360c;margin-bottom:7px;">Tech Stack</div>
<div style="font-size:12px;line-height:2.2;"><b>Languages:</b><br>Python, R, SQL, Scala<br><b>ML/DL:</b><br>TensorFlow, PyTorch, Scikit-learn, XGBoost<br><b>Data:</b><br>Spark, Kafka, Airflow<br><b>Cloud:</b><br>AWS SageMaker, GCP Vertex AI<br><b>Viz:</b><br>Tableau, PowerBI, Plotly</div>
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#bf360c;margin:14px 0 6px;">Certifications</div>
<div style="font-size:12px;line-height:2;">AWS ML Specialty<br>GCP Data Engineer<br>Deep Learning Spec.<br>Kaggle Master (Top 1%)</div>
</div>
</div>
</div>`
  },
  {
    id: 'healthcare-pro',
    name: 'Healthcare Pro',
    tag: 'Medical · Nursing · Clinical',
    icon: '🏥',
    color: '#b71c1c',
    accent: 'rgba(183,28,28,0.12)',
    description: 'Professional clinical design for healthcare, nursing, and medical practitioners.',
    highlights: ['ACLS/BLS Ready', 'Clinical Focus', 'License-Ready'],
    html: `<div style="font-family:Georgia,serif;max-width:720px;margin:0 auto;padding:36px;background:#fff;color:#1a1a1a;line-height:1.65;">
<div style="text-align:center;margin-bottom:18px;padding-bottom:14px;border-bottom:2px solid #b71c1c;">
<div style="font-size:24px;font-weight:700;letter-spacing:1px;">JOHN DOE, RN, BSN</div>
<div style="font-size:12.5px;color:#b71c1c;font-weight:600;letter-spacing:0.5px;margin-top:3px;">Registered Nurse | Critical Care | ACLS/BLS Certified</div>
<div style="font-size:12px;color:#555;margin-top:5px;">john.doe@email.com &nbsp;·&nbsp; +91 9876543210 &nbsp;·&nbsp; New Delhi &nbsp;·&nbsp; License No: [XXXX]</div>
</div>
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#b71c1c;border-bottom:1px solid #ffcdd2;padding-bottom:3px;margin-bottom:7px;">Clinical Summary</div>
<p style="font-size:13px;margin:0 0 14px;">Compassionate Registered Nurse with 6+ years of clinical experience in ICU, emergency, and surgical care. Committed to evidence-based, patient-centered care. Proven ability to manage complex multi-patient caseloads while maintaining highest safety standards and regulatory compliance.</p>
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#b71c1c;border-bottom:1px solid #ffcdd2;padding-bottom:3px;margin-bottom:10px;">Clinical Experience</div>
<div style="margin-bottom:12px;">
<div style="display:flex;justify-content:space-between;"><b style="font-size:13px;">Senior Staff Nurse – ICU / Critical Care</b><span style="font-size:12px;color:#555;">2020–Present</span></div>
<div style="font-size:12px;color:#b71c1c;font-weight:600;margin-bottom:4px;">AIIMS / Apollo / Fortis Hospital · New Delhi</div>
<ul style="margin:0;padding-left:14px;font-size:13px;"><li>Managed 8–12 critically ill patients per shift in 20-bed ICU with 98% safety record.</li><li>Led code blue response team, improving cardiac arrest survival rates by 40%.</li><li>Trained 15+ junior nurses in ICU protocols and medication management.</li></ul>
</div>
<div style="margin-bottom:14px;">
<div style="display:flex;justify-content:space-between;"><b style="font-size:13px;">Staff Nurse – Emergency Department</b><span style="font-size:12px;color:#555;">2018–2020</span></div>
<div style="font-size:12px;color:#b71c1c;font-weight:600;margin-bottom:4px;">Max Hospital · Delhi NCR</div>
<ul style="margin:0;padding-left:14px;font-size:13px;"><li>Triaged and treated 80+ emergency patients daily; reduced waiting time by 20%.</li><li>Administered medications and monitored vitals for polytrauma patients.</li></ul>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
<div><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#b71c1c;border-bottom:1px solid #ffcdd2;padding-bottom:3px;margin-bottom:6px;">Clinical Skills</div>
<div style="font-size:12.5px;line-height:2;">IV Therapy &amp; Central Lines<br>Ventilator Management<br>Wound Care<br>Medication Administration<br>Patient Assessment<br>EMR Documentation</div></div>
<div><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#b71c1c;border-bottom:1px solid #ffcdd2;padding-bottom:3px;margin-bottom:6px;">Education &amp; Certifications</div>
<div style="font-size:12.5px;line-height:2;">BSN · [Nursing College] · 2014–2018<br>ACLS Certified (AHA) · 2023<br>BLS Certified (AHA) · 2023<br>PALS Certified · 2022<br>CCRN Certification</div></div>
</div>
</div>`
  },
  {
    id: 'fresh-graduate',
    name: 'Fresh Graduate',
    tag: 'Entry Level · Internships',
    icon: '🎓',
    color: '#0277bd',
    accent: 'rgba(2,119,189,0.12)',
    description: 'Modern clean design for fresh graduates and early career professionals.',
    highlights: ['Entry-Level Ready', 'Achievement-Led', 'Open to Work'],
    html: `<div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;padding:36px;background:#fff;color:#1a1a1a;line-height:1.6;">
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;padding-bottom:14px;border-bottom:3px solid #0277bd;">
<div>
<div style="font-size:27px;font-weight:900;color:#0277bd;letter-spacing:-1px;margin-bottom:2px;">John Doe</div>
<div style="font-size:13px;color:#444;font-weight:600;margin-bottom:5px;">B.Tech Computer Science · Class of 2024 · CGPA 8.9/10</div>
<div style="font-size:12px;color:#666;display:flex;flex-wrap:wrap;gap:10px;"><span>📧 john.doe@email.com</span><span>📱 +91 9876543210</span><span>🔗 linkedin.com/in/johndoe</span></div>
</div>
<div style="text-align:right;">
<div style="background:#0277bd;color:#fff;padding:5px 12px;border-radius:4px;font-size:12px;font-weight:700;">Open to Work</div>
<div style="font-size:11px;color:#888;margin-top:4px;">Available Immediately</div>
</div>
</div>
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#0277bd;margin-bottom:5px;">Objective Statement</div>
<p style="font-size:13px;margin:0 0 14px;background:#e1f5fe;padding:10px 12px;border-radius:4px;border-left:3px solid #0277bd;">Highly motivated CS graduate seeking [Position] role to apply my expertise in [Skill] and [Skill]. Eager to contribute to [Company]'s mission while growing professionally in [Domain].</p>
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#0277bd;margin-bottom:8px;">Education</div>
<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px;">
<div><div style="font-size:14px;font-weight:700;">B.Tech in Computer Science &amp; Engineering</div><div style="font-size:12.5px;color:#555;">IIT / NIT / Top College · New Delhi</div></div>
<div style="text-align:right;"><div style="font-weight:700;color:#0277bd;font-size:13px;">CGPA: 8.9 / 10</div><div style="font-size:12px;color:#666;">2020 – 2024</div></div>
</div>
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#0277bd;margin-bottom:8px;">Internship / Experience</div>
<div style="padding:12px;background:#f5f9ff;border-radius:4px;margin-bottom:14px;">
<div style="display:flex;justify-content:space-between;"><b style="font-size:13px;">Software Engineering Intern</b><span style="font-size:12px;color:#555;">May–Aug 2023</span></div>
<div style="font-size:12px;color:#0277bd;font-weight:600;margin-bottom:4px;">Company Name · New Delhi (Remote)</div>
<ul style="margin:0;padding-left:14px;font-size:13px;"><li>Built [Feature] using React + Node.js, adopted by 5,000+ users in first month.</li><li>Optimized 3 DB queries reducing load time by 40%.</li><li>Received Pre-Placement Offer (PPO) at end of internship.</li></ul>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
<div><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#0277bd;margin-bottom:6px;">Technical Skills</div>
<div style="display:flex;flex-wrap:wrap;gap:5px;font-size:12px;"><span style="background:#e1f5fe;color:#0277bd;padding:2px 7px;border-radius:3px;font-weight:600;">Java</span><span style="background:#e1f5fe;color:#0277bd;padding:2px 7px;border-radius:3px;font-weight:600;">Python</span><span style="background:#e1f5fe;color:#0277bd;padding:2px 7px;border-radius:3px;font-weight:600;">React</span><span style="background:#e1f5fe;color:#0277bd;padding:2px 7px;border-radius:3px;font-weight:600;">SQL</span><span style="background:#e1f5fe;color:#0277bd;padding:2px 7px;border-radius:3px;font-weight:600;">Git</span><span style="background:#e1f5fe;color:#0277bd;padding:2px 7px;border-radius:3px;font-weight:600;">AWS</span></div></div>
<div><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#0277bd;margin-bottom:6px;">Achievements</div>
<div style="font-size:12.5px;line-height:2;">🏅 Smart India Hackathon Winner<br>📊 ACM ICPC Regionalist 2022<br>⭐ Academic Excellence Award</div></div>
</div>
</div>`
  },
  {
    id: 'executive-sidebar',
    name: 'Executive Sidebar',
    tag: 'Leadership · Two-Column · Navy',
    icon: '🧭',
    color: '#0f172a',
    accent: 'rgba(15,23,42,0.12)',
    description: 'Premium two-column layout with a dark navy sidebar for achievements and skills — built for senior leadership roles.',
    highlights: ['Two-Column', 'Sidebar Skills', 'Premium Look'],
    html: `<div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;display:flex;background:#fff;color:#1a1a1a;line-height:1.55;">
<div style="width:34%;background:#0f172a;color:#fff;padding:30px 20px;">
<div data-photo-placeholder="true" title="Click to add your photo" style="width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:center;font-size:26px;margin-bottom:16px;cursor:pointer;overflow:hidden;">👤</div>
<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#7dd3fc;margin-bottom:8px;">Contact</div>
<div style="font-size:11.5px;line-height:2;color:#cbd5e1;">📞 Phone<br>✉️ Email<br>🔗 LinkedIn/Portfolio<br>📍 Location</div>
<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#7dd3fc;margin:18px 0 8px;">Key Achievements</div>
<div style="font-size:11.5px;line-height:1.9;color:#cbd5e1;">★ Led [Initiative] driving 35% growth<br>🚀 Scaled team from 5 to 40+<br>⚡ Cut operational costs by 28%</div>
<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#7dd3fc;margin:18px 0 8px;">Skills</div>
<div style="font-size:11.5px;line-height:1.9;color:#cbd5e1;">Strategic Planning<br>P&amp;L Management<br>Stakeholder Relations<br>Team Leadership</div>
<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#7dd3fc;margin:18px 0 8px;">Courses</div>
<div style="font-size:11.5px;line-height:1.9;color:#cbd5e1;">Executive Leadership Program<br>MBA Strategy Elective</div>
</div>
<div style="width:66%;padding:30px 26px;">
<div style="font-size:26px;font-weight:800;letter-spacing:-0.5px;">Your Name</div>
<div style="font-size:13.5px;color:#0f172a;font-weight:600;margin-bottom:14px;">The Role You Are Applying For</div>
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#0f172a;border-bottom:1px solid #e2e8f0;padding-bottom:3px;margin-bottom:6px;">Summary</div>
<p style="font-size:12.5px;margin:0 0 14px;color:#334155;">Senior leader with 10+ years building and scaling high-performing teams. Proven record driving revenue growth, operational efficiency, and cross-functional alignment at enterprise scale.</p>
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#0f172a;border-bottom:1px solid #e2e8f0;padding-bottom:3px;margin-bottom:8px;">Experience</div>
<div style="margin-bottom:12px;"><div style="display:flex;justify-content:space-between;"><b style="font-size:13px;">Title</b><span style="font-size:11.5px;color:#64748b;">Date period</span></div><div style="font-size:12px;color:#0f172a;font-weight:600;margin-bottom:3px;">Company Name</div><ul style="margin:0;padding-left:16px;font-size:12.5px;color:#334155;"><li>Highlight your accomplishments, using numbers if possible.</li></ul></div>
<div style="margin-bottom:12px;"><div style="display:flex;justify-content:space-between;"><b style="font-size:13px;">Title</b><span style="font-size:11.5px;color:#64748b;">Date period</span></div><div style="font-size:12px;color:#0f172a;font-weight:600;margin-bottom:3px;">Company Name</div><ul style="margin:0;padding-left:16px;font-size:12.5px;color:#334155;"><li>Highlight your accomplishments, using numbers if possible.</li></ul></div>
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#0f172a;border-bottom:1px solid #e2e8f0;padding-bottom:3px;margin-bottom:6px;">Education</div>
<div style="display:flex;justify-content:space-between;font-size:12.5px;"><b>Degree and Field of Study</b><span style="color:#64748b;">Date period</span></div>
<div style="font-size:12px;color:#64748b;">School or University</div>
</div>
</div>`
  },
  {
    id: 'sales-kpi',
    name: 'Sales & Marketing KPI',
    tag: 'Sales · Growth · Metrics',
    icon: '📊',
    color: '#e65100',
    accent: 'rgba(230,81,0,0.12)',
    description: 'Stat-card layout that puts your revenue numbers and growth metrics front and center.',
    highlights: ['Stat Cards', 'Metrics-First', 'Quota Crushers'],
    html: `<div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;padding:32px;background:#fff;color:#1a1a1a;line-height:1.6;">
<div style="margin-bottom:14px;"><div style="font-size:27px;font-weight:900;letter-spacing:-1px;">John Doe</div><div style="font-size:14px;color:#e65100;font-weight:700;">Senior Sales / Marketing Manager</div><div style="font-size:12px;color:#555;margin-top:4px;">john.doe@email.com &nbsp;|&nbsp; +91 9876543210 &nbsp;|&nbsp; New Delhi, India</div></div>
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px;">
<div style="background:#fff3e0;border-radius:8px;padding:12px;text-align:center;"><div style="font-size:22px;font-weight:900;color:#e65100;">150%</div><div style="font-size:10.5px;color:#7a4a17;text-transform:uppercase;letter-spacing:0.5px;">Quota Achieved</div></div>
<div style="background:#fff3e0;border-radius:8px;padding:12px;text-align:center;"><div style="font-size:22px;font-weight:900;color:#e65100;">₹12Cr</div><div style="font-size:10.5px;color:#7a4a17;text-transform:uppercase;letter-spacing:0.5px;">Revenue Closed</div></div>
<div style="background:#fff3e0;border-radius:8px;padding:12px;text-align:center;"><div style="font-size:22px;font-weight:900;color:#e65100;">95%</div><div style="font-size:10.5px;color:#7a4a17;text-transform:uppercase;letter-spacing:0.5px;">Client Retention</div></div>
</div>
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#e65100;border-bottom:1px solid #ffd9b3;padding-bottom:3px;margin-bottom:8px;">Experience</div>
<div style="margin-bottom:12px;"><div style="display:flex;justify-content:space-between;"><b style="font-size:13px;">Senior Account Executive</b><span style="font-size:12px;color:#555;">2021–Present</span></div><div style="font-size:12px;color:#e65100;font-weight:600;margin-bottom:4px;">Company Name · New Delhi</div><ul style="margin:0;padding-left:16px;font-size:13px;"><li>Closed $2M+ in new business, exceeding quota by 150% for 3 consecutive years.</li><li>Built and managed pipeline of 80+ enterprise accounts.</li></ul></div>
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#e65100;border-bottom:1px solid #ffd9b3;padding-bottom:3px;margin-bottom:6px;">Skills</div>
<div style="display:flex;flex-wrap:wrap;gap:5px;font-size:12px;margin-bottom:14px;"><span style="background:#e65100;color:#fff;padding:3px 9px;border-radius:99px;">Salesforce</span><span style="background:#e65100;color:#fff;padding:3px 9px;border-radius:99px;">Negotiation</span><span style="background:#e65100;color:#fff;padding:3px 9px;border-radius:99px;">Pipeline Mgmt</span><span style="background:#e65100;color:#fff;padding:3px 9px;border-radius:99px;">Account Growth</span></div>
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#e65100;border-bottom:1px solid #ffd9b3;padding-bottom:3px;margin-bottom:6px;">Education</div>
<div style="font-size:13px;"><b>MBA in Marketing</b> &nbsp;·&nbsp; University &nbsp;·&nbsp; 2017–2019</div>
</div>`
  },
  {
    id: 'minimalist-serif',
    name: 'Minimalist Serif',
    tag: 'Elegant · ATS-Safe · Quiet',
    icon: '✒️',
    color: '#1a1a1a',
    accent: 'rgba(26,26,26,0.08)',
    description: 'Ultra-clean serif typography with generous whitespace — maximum readability, zero distraction.',
    highlights: ['Pure Typography', 'No Graphics', 'Maximum ATS Score'],
    html: `<div style="font-family:Georgia,serif;max-width:720px;margin:0 auto;padding:44px;color:#1a1a1a;line-height:1.7;">
<div style="text-align:center;margin-bottom:22px;"><div style="font-size:25px;letter-spacing:1px;">John Doe</div><div style="font-size:12.5px;color:#555;margin-top:4px;">john.doe@email.com &nbsp;·&nbsp; +91 9876543210 &nbsp;·&nbsp; New Delhi, India</div></div>
<div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;text-align:center;margin:18px 0 8px;color:#444;">Summary</div>
<p style="font-size:13px;text-align:center;max-width:540px;margin:0 auto 18px;color:#333;">A dedicated professional with a track record of delivering thoughtful, measurable results across [Domain]. Known for clarity of thought and quiet excellence in execution.</p>
<div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;text-align:center;margin:18px 0 10px;color:#444;">Experience</div>
<div style="margin-bottom:14px;text-align:center;"><div style="font-size:14px;font-style:italic;">[Job Title]</div><div style="font-size:12px;color:#777;margin-bottom:5px;">Company Name &nbsp;·&nbsp; 2021 – Present</div><p style="font-size:13px;color:#333;max-width:520px;margin:0 auto;">Delivered [Project] resulting in [measurable outcome]. Partnered across teams to improve [Metric] by [X]%.</p></div>
<div style="margin-bottom:14px;text-align:center;"><div style="font-size:14px;font-style:italic;">[Job Title]</div><div style="font-size:12px;color:#777;margin-bottom:5px;">Previous Company &nbsp;·&nbsp; 2018 – 2021</div><p style="font-size:13px;color:#333;max-width:520px;margin:0 auto;">Owned [Responsibility], improving [Metric] while mentoring a team of [N].</p></div>
<div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;text-align:center;margin:18px 0 8px;color:#444;">Education</div>
<div style="text-align:center;font-size:13px;">Degree, Field of Study &nbsp;·&nbsp; University &nbsp;·&nbsp; 2014 – 2018</div>
<div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;text-align:center;margin:18px 0 8px;color:#444;">Skills</div>
<div style="text-align:center;font-size:13px;color:#333;">Skill One &nbsp;·&nbsp; Skill Two &nbsp;·&nbsp; Skill Three &nbsp;·&nbsp; Skill Four &nbsp;·&nbsp; Skill Five</div>
</div>`
  },
  {
    id: 'startup-product',
    name: 'Startup Product Lead',
    tag: 'Product · Growth · Founder-Mode',
    icon: '🚀',
    color: '#059669',
    accent: 'rgba(5,150,105,0.12)',
    description: 'Energetic modern layout for product managers, founders, and 0-to-1 builders.',
    highlights: ['Modern Rounded', 'Metrics-Driven', 'Founder-Ready'],
    html: `<div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;padding:0;background:#fff;color:#1a1a1a;line-height:1.6;">
<div style="background:linear-gradient(135deg,#059669 0%,#10b981 100%);border-radius:0 0 18px 18px;padding:26px 30px;color:#fff;">
<div style="font-size:26px;font-weight:900;">John Doe</div>
<div style="font-size:13.5px;opacity:0.92;margin-top:2px;">Product Manager &nbsp;·&nbsp; 0-to-1 Builder &nbsp;·&nbsp; Growth</div>
<div style="font-size:11.5px;opacity:0.85;margin-top:8px;display:flex;gap:12px;flex-wrap:wrap;"><span>john.doe@email.com</span><span>+91 9876543210</span><span>producthunt.com/@johndoe</span></div>
</div>
<div style="padding:22px 30px;">
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#059669;margin-bottom:6px;">Summary</div>
<p style="font-size:13px;margin:0 0 14px;">Product leader who has shipped 0-to-1 products used by 2M+ users. Obsessed with user research, rapid iteration, and metrics that matter.</p>
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#059669;margin-bottom:8px;">Experience</div>
<div style="background:#ecfdf5;border-radius:10px;padding:12px 14px;margin-bottom:10px;"><div style="display:flex;justify-content:space-between;"><b style="font-size:13px;">Senior Product Manager</b><span style="font-size:12px;color:#059669;font-weight:600;">2022–Present</span></div><div style="font-size:12px;color:#555;margin-bottom:4px;">Startup Inc. · Remote</div><ul style="margin:0;padding-left:16px;font-size:13px;"><li>Launched [Feature] driving 40% increase in DAU within 2 quarters.</li><li>Owned roadmap for a product generating $5M ARR.</li></ul></div>
<div style="background:#ecfdf5;border-radius:10px;padding:12px 14px;"><div style="display:flex;justify-content:space-between;"><b style="font-size:13px;">Product Manager</b><span style="font-size:12px;color:#059669;font-weight:600;">2019–2022</span></div><div style="font-size:12px;color:#555;margin-bottom:4px;">Tech Co. · Bangalore</div><ul style="margin:0;padding-left:16px;font-size:13px;"><li>Drove A/B testing program improving conversion by 22%.</li></ul></div>
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#059669;margin:14px 0 6px;">Skills</div>
<div style="display:flex;flex-wrap:wrap;gap:5px;font-size:12px;"><span style="background:#059669;color:#fff;padding:3px 9px;border-radius:99px;">Roadmapping</span><span style="background:#059669;color:#fff;padding:3px 9px;border-radius:99px;">SQL</span><span style="background:#059669;color:#fff;padding:3px 9px;border-radius:99px;">A/B Testing</span><span style="background:#059669;color:#fff;padding:3px 9px;border-radius:99px;">User Research</span></div>
</div>
</div>`
  },
  {
    id: 'legal-counsel',
    name: 'Legal Counsel',
    tag: 'Law · Formal · Gold Accent',
    icon: '⚖️',
    color: '#1a237e',
    accent: 'rgba(26,35,126,0.12)',
    description: 'Conservative, formal layout with gold accents tailored for legal and compliance professionals.',
    highlights: ['Bar-Ready', 'Formal Tone', 'Conservative'],
    html: `<div style="font-family:'Times New Roman',serif;max-width:720px;margin:0 auto;padding:38px;color:#1a1a1a;line-height:1.6;">
<div style="text-align:center;border-bottom:3px double #1a237e;padding-bottom:12px;margin-bottom:16px;"><div style="font-size:25px;font-weight:700;letter-spacing:1px;color:#1a237e;">JOHN DOE, ESQ.</div><div style="font-size:13px;color:#555;margin-top:4px;">john.doe@email.com &nbsp;|&nbsp; +91 9876543210 &nbsp;|&nbsp; New Delhi, India</div></div>
<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#1a237e;border-bottom:1px solid #c9a227;padding-bottom:3px;margin-bottom:8px;">Bar Admission</div>
<p style="font-size:13px;margin:0 0 14px;">Bar Council of [State], Enrollment No. [XXXXX] &nbsp;·&nbsp; Admitted [Year]</p>
<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#1a237e;border-bottom:1px solid #c9a227;padding-bottom:3px;margin-bottom:8px;">Professional Experience</div>
<div style="margin-bottom:12px;"><div style="display:flex;justify-content:space-between;"><b style="font-size:13px;">Associate / Counsel</b><span style="font-size:12px;color:#555;">2021 – Present</span></div><div style="font-size:12px;color:#1a237e;font-weight:600;margin-bottom:4px;">Law Firm Name · New Delhi</div><ul style="margin:0;padding-left:18px;font-size:13px;"><li>Advised on M&amp;A transactions exceeding $50M in aggregate value.</li><li>Drafted and negotiated commercial contracts for 30+ clients.</li></ul></div>
<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#1a237e;border-bottom:1px solid #c9a227;padding-bottom:3px;margin-bottom:8px;">Education</div>
<div style="display:flex;justify-content:space-between;font-size:13px;"><b>B.A. LL.B. (Hons.)</b><span style="font-size:12px;color:#555;">2016 – 2021</span></div>
<div style="font-size:12px;color:#555;margin-bottom:12px;">National Law University &nbsp;·&nbsp; City, India</div>
<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#1a237e;border-bottom:1px solid #c9a227;padding-bottom:3px;margin-bottom:6px;">Practice Areas</div>
<p style="font-size:13px;margin:0;">Corporate Law &nbsp;·&nbsp; Contract Negotiation &nbsp;·&nbsp; Compliance &nbsp;·&nbsp; Intellectual Property</p>
</div>`
  },
  {
    id: 'ux-designer',
    name: 'UX / Product Designer',
    tag: 'Design · Portfolio-First',
    icon: '🎯',
    color: '#ff6f61',
    accent: 'rgba(255,111,97,0.12)',
    description: 'Bold typographic header with soft accent blocks — built to lead with your design portfolio.',
    highlights: ['Portfolio Link', 'Bold Type', 'Case-Study Ready'],
    html: `<div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;padding:36px;background:#fff;color:#1a1a1a;line-height:1.6;">
<div style="margin-bottom:18px;"><div style="font-size:32px;font-weight:900;letter-spacing:-1.5px;color:#1a1a1a;">John Doe</div><div style="font-size:14px;color:#ff6f61;font-weight:700;margin-top:2px;">Product Designer &amp; UX Researcher</div><div style="font-size:12px;color:#666;margin-top:6px;">john.doe@email.com &nbsp;·&nbsp; +91 9876543210 &nbsp;·&nbsp; figma.com/@johndoe &nbsp;·&nbsp; New Delhi</div></div>
<div style="background:#fff1ef;border-radius:10px;padding:14px 16px;margin-bottom:16px;"><p style="font-size:13px;margin:0;">Product designer with 6+ years crafting human-centered experiences for B2C apps used by 5M+ people. Strong in research, prototyping, and design systems.</p></div>
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#ff6f61;margin-bottom:8px;">Experience</div>
<div style="margin-bottom:12px;"><div style="display:flex;justify-content:space-between;"><b style="font-size:13px;">Senior Product Designer</b><span style="font-size:12px;color:#888;">2021–Present</span></div><div style="font-size:12px;color:#555;margin-bottom:4px;">Design Studio · Remote</div><ul style="margin:0;padding-left:16px;font-size:13px;"><li>Redesigned core onboarding flow, lifting activation by 31%.</li><li>Built and scaled the company's first design system.</li></ul></div>
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#ff6f61;margin:14px 0 6px;">Tools</div>
<div style="display:flex;flex-wrap:wrap;gap:5px;font-size:12px;margin-bottom:14px;"><span style="background:#ff6f61;color:#fff;padding:3px 9px;border-radius:99px;">Figma</span><span style="background:#ff6f61;color:#fff;padding:3px 9px;border-radius:99px;">Maze</span><span style="background:#ff6f61;color:#fff;padding:3px 9px;border-radius:99px;">Notion</span><span style="background:#ff6f61;color:#fff;padding:3px 9px;border-radius:99px;">Webflow</span></div>
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#ff6f61;margin-bottom:6px;">Education</div>
<div style="font-size:13px;"><b>B.Des, Interaction Design</b> &nbsp;·&nbsp; NID/Pearl Academy &nbsp;·&nbsp; 2015–2019</div>
</div>`
  },
  {
    id: 'gov-ats-safe',
    name: 'Government / PSU Safe',
    tag: 'Ultra ATS-Safe · Plain Format',
    icon: '🏛️',
    color: '#212121',
    accent: 'rgba(33,33,33,0.08)',
    description: 'Absolutely plain black-and-white structure designed for government, PSU, and bureaucratic ATS systems.',
    highlights: ['Zero Graphics', 'Form-Style', 'PSU Friendly'],
    html: `<div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;padding:32px;color:#000;line-height:1.6;">
<div style="text-align:center;margin-bottom:16px;"><div style="font-size:20px;font-weight:700;text-transform:uppercase;">JOHN DOE</div><div style="font-size:12.5px;margin-top:3px;">Email: john.doe@email.com &nbsp;|&nbsp; Phone: +91 9876543210 &nbsp;|&nbsp; Address: New Delhi, India</div></div>
<table style="width:100%;border-collapse:collapse;font-size:12.5px;margin-bottom:14px;">
<tr><td style="border:1px solid #000;padding:5px 8px;font-weight:700;width:30%;">Position Applied For</td><td style="border:1px solid #000;padding:5px 8px;">[Position Title]</td></tr>
<tr><td style="border:1px solid #000;padding:5px 8px;font-weight:700;">Date of Birth</td><td style="border:1px solid #000;padding:5px 8px;">DD/MM/YYYY</td></tr>
<tr><td style="border:1px solid #000;padding:5px 8px;font-weight:700;">Nationality</td><td style="border:1px solid #000;padding:5px 8px;">Indian</td></tr>
</table>
<div style="font-size:12.5px;font-weight:700;text-transform:uppercase;border-bottom:1px solid #000;padding-bottom:2px;margin-bottom:6px;">1. Professional Summary</div>
<p style="font-size:13px;margin:0 0 12px;">Dedicated professional with [X] years of experience in [Domain], seeking to contribute analytical and administrative skills to [Organization].</p>
<div style="font-size:12.5px;font-weight:700;text-transform:uppercase;border-bottom:1px solid #000;padding-bottom:2px;margin-bottom:6px;">2. Work Experience</div>
<p style="font-size:13px;margin:0 0 4px;"><b>[Job Title]</b>, Company Name, City — [Start Date] to [End Date]</p>
<ul style="margin:0 0 12px;padding-left:18px;font-size:13px;"><li>Responsibility or accomplishment one.</li><li>Responsibility or accomplishment two.</li></ul>
<div style="font-size:12.5px;font-weight:700;text-transform:uppercase;border-bottom:1px solid #000;padding-bottom:2px;margin-bottom:6px;">3. Educational Qualifications</div>
<p style="font-size:13px;margin:0 0 12px;">[Degree], [Institution], [Year] — [Percentage/CGPA]</p>
<div style="font-size:12.5px;font-weight:700;text-transform:uppercase;border-bottom:1px solid #000;padding-bottom:2px;margin-bottom:6px;">4. Skills</div>
<p style="font-size:13px;margin:0;">Skill 1, Skill 2, Skill 3, Skill 4</p>
</div>`
  },
  {
    id: 'clinical-allied',
    name: 'Clinical Specialist',
    tag: 'Nursing · Allied Health · Licensure',
    icon: '🩺',
    color: '#00838f',
    accent: 'rgba(0,131,143,0.12)',
    description: 'Built for nurses and allied health professionals, with licensure and clinical rotation details up front.',
    highlights: ['Licensure Block', 'Clinical Hours', 'Patient-Care Metrics'],
    html: `<div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;padding:36px;background:#fff;color:#1a1a1a;line-height:1.6;">
<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #00838f;padding-bottom:12px;margin-bottom:14px;">
<div><div style="font-size:25px;font-weight:800;color:#00838f;">John Doe, RN</div><div style="font-size:13px;color:#444;font-weight:600;">Registered Nurse · Critical Care</div></div>
<div style="text-align:right;font-size:11.5px;color:#555;">License No. [XXXXXX]<br>john.doe@email.com<br>+91 9876543210</div>
</div>
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#00838f;margin-bottom:6px;">Summary</div>
<p style="font-size:13px;margin:0 0 14px;">Licensed Registered Nurse with 5+ years in critical care, delivering compassionate patient care with a record of zero medication errors and 98% patient satisfaction.</p>
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#00838f;margin-bottom:8px;">Clinical Experience</div>
<div style="margin-bottom:12px;"><div style="display:flex;justify-content:space-between;"><b style="font-size:13px;">ICU Staff Nurse</b><span style="font-size:12px;color:#555;">2021–Present</span></div><div style="font-size:12px;color:#00838f;font-weight:600;margin-bottom:4px;">City Hospital · New Delhi</div><ul style="margin:0;padding-left:16px;font-size:13px;"><li>Managed care for 8+ critical patients per shift in a 20-bed ICU.</li><li>Trained 6 new graduate nurses on protocol compliance.</li></ul></div>
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#00838f;margin-bottom:6px;">Certifications</div>
<p style="font-size:13px;margin:0 0 12px;">BLS &amp; ACLS Certified &nbsp;·&nbsp; Critical Care Nursing Certificate &nbsp;·&nbsp; Infection Control Training</p>
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#00838f;margin-bottom:6px;">Education</div>
<div style="font-size:13px;"><b>B.Sc. Nursing</b> &nbsp;·&nbsp; Nursing College &nbsp;·&nbsp; 2016–2020</div>
</div>`
  },
  {
    id: 'dev-terminal',
    name: 'Developer Terminal',
    tag: 'Engineering · Dark Header · Code-Inspired',
    icon: '💻',
    color: '#16a34a',
    accent: 'rgba(22,163,74,0.12)',
    description: 'A terminal-inspired dark header gives this engineering resume instant technical credibility.',
    highlights: ['Terminal Header', 'Mono Accents', 'GitHub-Ready'],
    html: `<div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;padding:0;background:#fff;color:#1a1a1a;line-height:1.6;">
<div style="background:#0d1117;padding:20px 28px;color:#39d353;font-family:'Courier New',monospace;">
<div style="font-size:13px;opacity:0.7;">$ whoami</div>
<div style="font-size:22px;font-weight:700;color:#fff;margin:2px 0 4px;">john_doe</div>
<div style="font-size:12.5px;color:#39d353;">// Full-Stack Software Engineer</div>
<div style="font-size:11.5px;color:#8b949e;margin-top:6px;">github.com/johndoe &nbsp;|&nbsp; john.doe@email.com &nbsp;|&nbsp; +91 9876543210</div>
</div>
<div style="padding:22px 28px;">
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#16a34a;margin-bottom:6px;">Summary</div>
<p style="font-size:13px;margin:0 0 14px;">Full-stack engineer with 5+ years shipping scalable systems in React, Node.js, and Go. Active open-source contributor with 1,200+ GitHub stars across personal projects.</p>
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#16a34a;margin-bottom:8px;">Experience</div>
<div style="margin-bottom:12px;"><div style="display:flex;justify-content:space-between;"><b style="font-size:13px;">Senior Software Engineer</b><span style="font-size:12px;color:#555;font-family:'Courier New',monospace;">2022–Present</span></div><div style="font-size:12px;color:#16a34a;font-weight:600;margin-bottom:4px;">Tech Company · Remote</div><ul style="margin:0;padding-left:16px;font-size:13px;"><li>Built microservices handling 10M+ requests/day with 99.99% uptime.</li><li>Reduced API latency by 45% through caching and query optimization.</li></ul></div>
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#16a34a;margin:14px 0 6px;">Tech Stack</div>
<div style="display:flex;flex-wrap:wrap;gap:5px;font-size:12px;font-family:'Courier New',monospace;"><span style="background:#16a34a;color:#fff;padding:3px 8px;border-radius:4px;">TypeScript</span><span style="background:#16a34a;color:#fff;padding:3px 8px;border-radius:4px;">React</span><span style="background:#16a34a;color:#fff;padding:3px 8px;border-radius:4px;">Node.js</span><span style="background:#16a34a;color:#fff;padding:3px 8px;border-radius:4px;">PostgreSQL</span><span style="background:#16a34a;color:#fff;padding:3px 8px;border-radius:4px;">Docker</span></div>
</div>
</div>`
  },
  {
    id: 'consulting-mba',
    name: 'Consulting / MBA',
    tag: 'Strategy · Big-4 Style · Impact Bullets',
    icon: '📐',
    color: '#1b2a4a',
    accent: 'rgba(27,42,74,0.12)',
    description: 'McKinsey-inspired structure leading every bullet with quantified business impact.',
    highlights: ['Impact-First', 'Big-4 Style', 'Quant-Heavy'],
    html: `<div style="font-family:'Times New Roman',serif;max-width:720px;margin:0 auto;padding:38px;color:#111;line-height:1.55;">
<div style="border-bottom:2px solid #1b2a4a;padding-bottom:10px;margin-bottom:16px;"><div style="font-size:25px;font-weight:700;color:#1b2a4a;">John Doe</div><div style="font-size:13px;color:#444;margin-top:3px;">john.doe@email.com &nbsp;|&nbsp; +91 9876543210 &nbsp;|&nbsp; New Delhi, India</div></div>
<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#1b2a4a;margin-bottom:6px;">Professional Experience</div>
<div style="margin-bottom:12px;"><div style="display:flex;justify-content:space-between;"><b style="font-size:13.5px;">Senior Consultant</b><span style="font-size:12px;color:#555;">2021 – Present</span></div><div style="font-size:12.5px;color:#1b2a4a;font-weight:600;margin-bottom:4px;">Consulting Firm · Mumbai</div><ul style="margin:0;padding-left:18px;font-size:13px;"><li>Drove $4M cost-reduction program for Fortune 500 retail client through process re-engineering.</li><li>Led 6-person team delivering market-entry strategy generating $20M projected revenue.</li><li>Presented findings to C-suite, securing buy-in for 3 strategic initiatives.</li></ul></div>
<div style="margin-bottom:12px;"><div style="display:flex;justify-content:space-between;"><b style="font-size:13.5px;">Business Analyst</b><span style="font-size:12px;color:#555;">2019 – 2021</span></div><div style="font-size:12.5px;color:#1b2a4a;font-weight:600;margin-bottom:4px;">Consulting Firm · Mumbai</div><ul style="margin:0;padding-left:18px;font-size:13px;"><li>Built financial models supporting $150M M&amp;A due-diligence engagement.</li></ul></div>
<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#1b2a4a;margin:14px 0 6px;">Education</div>
<div style="display:flex;justify-content:space-between;font-size:13px;"><b>MBA, Strategy &amp; Finance</b><span style="color:#555;">2017 – 2019</span></div>
<div style="font-size:12px;color:#555;margin-bottom:10px;">Top Business School &nbsp;·&nbsp; City, India</div>
<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#1b2a4a;margin-bottom:6px;">Core Skills</div>
<p style="font-size:13px;margin:0;">Financial Modeling &nbsp;·&nbsp; Market Strategy &nbsp;·&nbsp; Stakeholder Management &nbsp;·&nbsp; Process Optimization</p>
</div>`
  },
  {
    id: 'hospitality-warm',
    name: 'Hospitality & Service',
    tag: 'Hospitality · Customer-First · Warm',
    icon: '🛎️',
    color: '#c2410c',
    accent: 'rgba(194,65,12,0.12)',
    description: 'A warm, friendly layout for hospitality, travel, and customer-facing service professionals.',
    highlights: ['Guest-Focused', 'Warm Palette', 'Friendly Tone'],
    html: `<div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;padding:36px;background:#fff;color:#1a1a1a;line-height:1.6;">
<div style="text-align:center;margin-bottom:16px;"><div style="font-size:26px;font-weight:800;color:#c2410c;">John Doe</div><div style="font-size:13.5px;color:#555;font-weight:600;">Hospitality &amp; Guest Relations Manager</div><div style="font-size:12px;color:#777;margin-top:4px;">john.doe@email.com &nbsp;·&nbsp; +91 9876543210 &nbsp;·&nbsp; New Delhi, India</div></div>
<div style="background:#fff7ed;border-radius:10px;padding:14px 16px;margin-bottom:16px;text-align:center;"><p style="font-size:13px;margin:0;">Warm, detail-oriented hospitality professional with 6+ years creating memorable guest experiences and leading front-of-house teams at 5-star properties.</p></div>
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#c2410c;margin-bottom:8px;">Experience</div>
<div style="margin-bottom:12px;"><div style="display:flex;justify-content:space-between;"><b style="font-size:13px;">Guest Relations Manager</b><span style="font-size:12px;color:#888;">2021–Present</span></div><div style="font-size:12px;color:#c2410c;font-weight:600;margin-bottom:4px;">Luxury Hotel Group · Goa</div><ul style="margin:0;padding-left:16px;font-size:13px;"><li>Maintained 4.9/5 guest satisfaction score across 200+ rooms.</li><li>Resolved escalations for VIP guests, improving repeat bookings by 18%.</li></ul></div>
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#c2410c;margin:14px 0 6px;">Skills</div>
<div style="display:flex;flex-wrap:wrap;gap:5px;font-size:12px;margin-bottom:14px;justify-content:center;"><span style="background:#c2410c;color:#fff;padding:3px 9px;border-radius:99px;">Guest Relations</span><span style="background:#c2410c;color:#fff;padding:3px 9px;border-radius:99px;">Team Training</span><span style="background:#c2410c;color:#fff;padding:3px 9px;border-radius:99px;">Conflict Resolution</span><span style="background:#c2410c;color:#fff;padding:3px 9px;border-radius:99px;">Opera PMS</span></div>
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#c2410c;margin-bottom:6px;text-align:center;">Education</div>
<div style="font-size:13px;text-align:center;"><b>BA in Hospitality Management</b> &nbsp;·&nbsp; Institute Name &nbsp;·&nbsp; 2015–2018</div>
</div>`
  },
  {
    id: 'academic-cv',
    name: 'Academic Research CV',
    tag: 'Academia · Publications · Formal',
    icon: '🎓',
    color: '#7a1f2b',
    accent: 'rgba(122,31,43,0.12)',
    description: 'Long-form academic CV structure covering publications, research, grants, and teaching experience.',
    highlights: ['Publications List', 'Grants Section', 'Formal Serif'],
    html: `<div style="font-family:Georgia,serif;max-width:720px;margin:0 auto;padding:38px;color:#1a1a1a;line-height:1.6;">
<div style="text-align:center;border-bottom:2px solid #7a1f2b;padding-bottom:10px;margin-bottom:16px;"><div style="font-size:24px;font-weight:700;color:#7a1f2b;">Dr. John Doe</div><div style="font-size:12.5px;color:#555;margin-top:3px;">john.doe@university.edu &nbsp;|&nbsp; +91 9876543210 &nbsp;|&nbsp; Department of [Field], University Name</div></div>
<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#7a1f2b;margin-bottom:6px;">Research Interests</div>
<p style="font-size:13px;margin:0 0 14px;">[Research Area 1], [Research Area 2], [Research Area 3]</p>
<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#7a1f2b;margin-bottom:6px;">Education</div>
<div style="font-size:13px;margin-bottom:3px;"><b>Ph.D. in [Field]</b>, University Name, 2024</div>
<div style="font-size:13px;margin-bottom:12px;"><b>M.Sc. in [Field]</b>, University Name, 2019</div>
<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#7a1f2b;margin-bottom:6px;">Selected Publications</div>
<p style="font-size:12.5px;margin:0 0 5px;">Doe, J., et al. (2024). "[Paper Title]." <i>Journal Name</i>, Vol. X.</p>
<p style="font-size:12.5px;margin:0 0 12px;">Doe, J., et al. (2022). "[Paper Title]." <i>Conference Proceedings</i>.</p>
<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#7a1f2b;margin-bottom:6px;">Grants &amp; Awards</div>
<p style="font-size:13px;margin:0 0 12px;">[Grant/Fellowship Name], [Funding Body], [Year] — ₹[Amount]</p>
<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#7a1f2b;margin-bottom:6px;">Teaching Experience</div>
<p style="font-size:13px;margin:0;">Teaching Assistant, [Course Name], University Name, [Years]</p>
</div>`
  },
  {
    id: 'classic-cl',
    name: 'Classic Professional',
    tag: 'Traditional · Formal',
    icon: '✉️',
    color: '#2b2b2b',
    accent: 'rgba(43,43,43,0.08)',
    description: 'Standard elegant cover letter format matching classic resumes.',
    highlights: ['Formal Structure', 'Elegant Serif', 'Highly Readable'],
    type: 'cover-letter',
    html: `<div style="font-family:'Times New Roman',serif;max-width:720px;margin:0 auto;padding:36px;color:#111;line-height:1.6;">
<div style="text-align:right;font-size:13px;color:#555;margin-bottom:20px;">
<b>John Doe</b><br>john.doe@email.com<br>+91 9876543210<br>New Delhi, India
</div>
<div style="font-size:13px;color:#333;margin-bottom:20px;">
<b>Date:</b> June 2, 2026<br><br>
<b>To:</b><br>Hiring Manager / Recruitment Team<br>Target Company Name<br>New Delhi, India
</div>
<div style="font-size:14px;font-weight:700;margin-bottom:15px;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #ccc;padding-bottom:5px;">
Subject: Application for [Job Title] Position
</div>
<p style="font-size:13.5px;margin:0 0 12px;">Dear Hiring Manager,</p>
<p style="font-size:13.5px;margin:0 0 12px;text-align:justify;">I am writing to express my strong interest in the [Job Title] position at [Company Name]. With over [X] years of experience in [Your Field/Domain] and a proven track record of delivering high-impact solutions, I am confident in my ability to contribute significantly to your team's success.</p>
<p style="font-size:13.5px;margin:0 0 12px;text-align:justify;">In my previous role at [Previous Company], I spearheaded several projects that directly resulted in a [X]% increase in operational efficiency and generated substantial business value. My expertise in [Core Skill 1], [Core Skill 2], and [Core Skill 3] aligns perfectly with the requirements outlined in your job description.</p>
<p style="font-size:13.5px;margin:0 0 12px;text-align:justify;">I am particularly drawn to [Company Name] because of your commitment to [Company's Value or recent achievement]. I would welcome the opportunity to discuss how my background, skills, and passion can support your strategic goals.</p>
<p style="font-size:13.5px;margin:0 0 20px;text-align:justify;">Thank you for your time and consideration. I look forward to the possibility of discussing this opportunity further.</p>
<div style="font-size:13.5px;">
Sincerely,<br><br><br>
<b>John Doe</b>
</div>
</div>`
  },
  {
    id: 'modern-cl',
    name: 'Modern Accent',
    tag: 'Tech · Modern',
    icon: '💙',
    color: '#1565c0',
    accent: 'rgba(21,101,192,0.12)',
    description: 'Contemporary format with beautiful blue left-border accent matching modern templates.',
    highlights: ['Creative Accent', 'Sans-Serif', 'Tech-Forward'],
    type: 'cover-letter',
    html: `<div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;padding:36px;color:#1a1a1a;line-height:1.65;">
<div style="border-left:4px solid #1565c0;padding-left:14px;margin-bottom:25px;">
<div style="font-size:24px;font-weight:800;color:#1565c0;margin-bottom:4px;">John Doe</div>
<div style="font-size:12px;color:#666;">📧 john.doe@email.com &nbsp;·&nbsp; 📱 +91 9876543210 &nbsp;·&nbsp; 🔗 linkedin.com/in/johndoe</div>
</div>
<div style="font-size:13px;color:#444;margin-bottom:20px;">
<b>Date:</b> June 2, 2026<br>
<b>Attention:</b> Hiring Team, [Company Name]
</div>
<div style="font-size:15px;font-weight:700;color:#1565c0;margin-bottom:15px;">
RE: APPLICATION FOR THE ROLE OF [JOB TITLE]
</div>
<p style="font-size:13.5px;margin:0 0 12px;">Dear hiring team,</p>
<p style="font-size:13.5px;margin:0 0 12px;">I am incredibly excited to apply for the [Job Title] role at [Company Name]. Having followed your impressive growth and your recent work on [specific product or news], I am eager to bring my expertise in [specialization] to your dynamic team.</p>
<p style="font-size:13.5px;margin:0 0 12px;">During my tenure at [Previous Company] as a [Job Title], I drove key initiatives that streamlined [process] and cut delivery time by [X]%. I specialize in translating complex project requirements into robust deliverables, leveraging my core skills in [Skill A], [Skill B], and [Skill C]. I believe my proactive approach and technical capabilities make me a strong fit for your culture of innovation.</p>
<p style="font-size:13.5px;margin:0 0 25px;">Thank you for reviewing my application. I would love the chance to connect for an interview to explore how I can add value to the engineering and product teams at [Company Name].</p>
<div style="font-size:13.5px;">
Warm regards,<br><br><br>
<b>John Doe</b>
</div>
</div>`
  },
  {
    id: 'executive-cl',
    name: 'Executive Elite',
    tag: 'C-Suite · Leadership',
    icon: '👔',
    color: '#37474f',
    accent: 'rgba(55,71,79,0.12)',
    description: 'Commanding design for senior leadership, managers, and executives.',
    highlights: ['Executive Header', 'High Contrast', 'Polished'],
    type: 'cover-letter',
    html: `<div style="font-family:Georgia,serif;max-width:720px;margin:0 auto;padding:36px;color:#1a1a1a;line-height:1.7;">
<div style="text-align:center;margin-bottom:25px;border-bottom:1px solid #ccc;padding-bottom:15px;">
<div style="font-size:24px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#37474f;">JOHN DOE</div>
<div style="font-size:12px;color:#666;margin-top:5px;font-style:italic;">Executive Cover Letter &nbsp;·&nbsp; john.doe@email.com &nbsp;·&nbsp; +91 9876543210</div>
</div>
<div style="font-size:13px;color:#555;margin-bottom:20px;display:flex;justify-content:space-between;">
<span><b>Date:</b> June 2, 2026</span>
<span><b>Recipient:</b> Executive Search Committee, [Company Name]</span>
</div>
<p style="font-size:13.5px;margin:0 0 12px;">Dear Members of the Search Committee,</p>
<p style="font-size:13.5px;margin:0 0 12px;text-align:justify;">I am writing to express my interest in the [Job Title / Executive Role] position currently open at [Company Name]. With over [15] years of leadership experience directing high-performance teams and executing scale operations, I offer a track record of driving substantial market share expansion and P&L optimization.</p>
<p style="font-size:13.5px;margin:0 0 12px;text-align:justify;">Throughout my career, I have focused on transforming complex operational challenges into competitive advantages. At my current organization, I led a cross-functional division of [X] members, growing revenue by [X]% and capturing key corporate accounts. My philosophy centers on fostering high-retention cultures and utilizing data-driven strategic planning to align organizational capability with overarching business objectives.</p>
<p style="font-size:13.5px;margin:0 0 25px;text-align:justify;">I am excited about the prospect of bringing my experience in governance, operational scale, and strategic partnerships to [Company Name]. I look forward to an opportunity to speak with you regarding the value I can deliver to your board and stakeholders.</p>
<div style="font-size:13.5px;">
Sincerely yours,<br><br><br>
<b>John Doe</b>
</div>
</div>`
  },
  {
    id: 'creative-cl',
    name: 'Creative Elegant',
    tag: 'Elegant · Branding',
    icon: '✨',
    color: '#6a1b9a',
    accent: 'rgba(106,27,154,0.12)',
    description: 'Elegant visual identity with deep violet top banner for creative or design applications.',
    highlights: ['Creative Banner', 'Refined Layout', 'Design-Friendly'],
    type: 'cover-letter',
    html: `<div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;padding:0;background:#fff;color:#1a1a1a;line-height:1.6;">
<div style="background:linear-gradient(135deg,#6a1b9a 0%,#ab47bc 100%);padding:24px 32px;color:#fff;">
<div style="font-size:24px;font-weight:900;letter-spacing:-0.5px;margin-bottom:3px;">John Doe</div>
<div style="font-size:12px;opacity:0.9;">john.doe@email.com &nbsp;·&nbsp; +91 9876543210 &nbsp;·&nbsp; behance.net/johndoe</div>
</div>
<div style="padding:28px 32px;">
<div style="font-size:13px;color:#666;margin-bottom:20px;">June 2, 2026 &nbsp;|&nbsp; Application for [Job Title] at [Company Name]</div>
<p style="font-size:13.5px;margin:0 0 12px;font-weight:600;color:#6a1b9a;">Hi [Company Name] Creative Team,</p>
<p style="font-size:13.5px;margin:0 0 12px;">Great design is about storytelling, and I am excited about the opportunity to tell the next chapter of [Company Name]'s brand story as your new [Job Title]. I've been a huge fan of your recent [specific project] and feel my design aesthetic matches your brand voice perfectly.</p>
<p style="font-size:13.5px;margin:0 0 12px;">As a designer with [X] years of experience, I excel at turning complex concepts into beautiful, intuitive visual designs. In my role at [Previous Company], I led the redesign of our flagship product, which drove a [X]% uptick in daily user engagement. I'm highly proficient in Figma, Creative Suite, and prototyping, and love working closely with cross-functional product teams.</p>
<p style="font-size:13.5px;margin:0 0 25px;">I'd love to show you my full portfolio and discuss how I can bring fresh creative energy to your team. Let's build something beautiful together!</p>
<div style="font-size:13.5px;">
Cheers,<br><br><br>
<b>John Doe</b>
</div>
</div>
</div>`
  },
  {
    id: 'corporate-cl',
    name: 'Clean Corporate',
    tag: 'Consulting · Finance',
    icon: '💼',
    color: '#00695c',
    accent: 'rgba(0,105,92,0.12)',
    description: 'Teal-accented template for corporate, management, and consulting jobs.',
    highlights: ['Corporate Border', 'Highly Professional', 'Polished'],
    type: 'cover-letter',
    html: `<div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;padding:0;background:#fff;color:#1a1a1a;line-height:1.65;">
<div style="background:#00695c;color:#fff;padding:20px 28px;">
<div style="font-size:22px;font-weight:700;">John Doe</div>
<div style="font-size:12px;opacity:0.9;">john.doe@email.com &nbsp;|&nbsp; +91 9876543210 &nbsp;|&nbsp; New Delhi, India</div>
</div>
<div style="padding:24px 28px;">
<div style="font-size:13px;color:#555;margin-bottom:20px;"><b>Date:</b> June 2, 2026 &nbsp;·&nbsp; <b>Attention:</b> HR & Recruitment, [Company Name]</div>
<p style="font-size:13.5px;margin:0 0 12px;">Dear Hiring Manager,</p>
<p style="font-size:13.5px;margin:0 0 12px;">I am writing to submit my application for the [Job Title] position at [Company Name]. With a strong background in [Your Field] and [X] years of experience leading strategic operations, I am eager to apply my analytical and problem-solving skills to help your team achieve its targets.</p>
<p style="font-size:13.5px;margin:0 0 12px;">At [Previous Company], I specialized in project execution and operational excellence. By implementing [specific methodology], I led my department to capture a [X]% increase in operational throughput and reduce annual expenses by [X]%. I am accustomed to working in fast-paced corporate settings where data-driven choices are paramount, and I bring extensive experience in stakeholder management and change implementation.</p>
<p style="font-size:13.5px;margin:0 0 25px;">I welcome the opportunity to discuss my candidacy and how I can help [Company Name] streamline its next round of initiatives. Thank you for your time and professional consideration.</p>
<div style="font-size:13.5px;">
Sincerely,<br><br><br>
<b>John Doe</b>
</div>
</div>
</div>`
  },
  {
    id: 'sales-cl',
    name: 'Sales & Marketing',
    tag: 'Sales · Growth · Confident',
    icon: '📊',
    color: '#e65100',
    accent: 'rgba(230,81,0,0.12)',
    description: 'A confident, results-led cover letter built for sales, growth, and marketing roles.',
    highlights: ['Numbers-First', 'Confident Tone', 'Quota Crushers'],
    type: 'cover-letter',
    html: `<div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;padding:36px;color:#1a1a1a;line-height:1.65;">
<div style="border-bottom:3px solid #e65100;padding-bottom:12px;margin-bottom:20px;">
<div style="font-size:24px;font-weight:800;color:#e65100;">John Doe</div>
<div style="font-size:12px;color:#666;margin-top:3px;">john.doe@email.com &nbsp;·&nbsp; +91 9876543210 &nbsp;·&nbsp; New Delhi, India</div>
</div>
<div style="font-size:13px;color:#555;margin-bottom:18px;"><b>Date:</b> June 2, 2026 &nbsp;·&nbsp; <b>Attention:</b> Hiring Manager, [Company Name]</div>
<p style="font-size:13.5px;margin:0 0 12px;">Dear Hiring Manager,</p>
<p style="font-size:13.5px;margin:0 0 12px;">Last year I closed $2M+ in new business and beat quota by 150% — and I want to bring that same energy to [Company Name]'s [Job Title] team. I thrive on building pipeline from scratch and turning cold prospects into long-term accounts.</p>
<p style="font-size:13.5px;margin:0 0 12px;">At [Previous Company], I owned a book of 80+ enterprise accounts and grew retention to 95% through proactive relationship management. I'm confident my numbers, paired with a genuine curiosity about [Company Name]'s product, make me a strong fit for your growth targets this year.</p>
<p style="font-size:13.5px;margin:0 0 25px;">I'd welcome a conversation to discuss how I can help hit your next quarter's number. Thank you for your consideration.</p>
<div style="font-size:13.5px;">
Best regards,<br><br><br>
<b>John Doe</b>
</div>
</div>`
  },
  {
    id: 'dev-cl',
    name: 'Software Engineer',
    tag: 'Engineering · Direct · Technical',
    icon: '💻',
    color: '#16a34a',
    accent: 'rgba(22,163,74,0.12)',
    description: 'A direct, no-fluff cover letter for engineers — leads with what you shipped, not adjectives.',
    highlights: ['Direct Tone', 'GitHub-Ready', 'Impact Metrics'],
    type: 'cover-letter',
    html: `<div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;padding:0;background:#fff;color:#1a1a1a;line-height:1.65;">
<div style="background:#0d1117;color:#39d353;padding:20px 28px;font-family:'Courier New',monospace;">
<div style="font-size:20px;font-weight:700;color:#fff;">John Doe</div>
<div style="font-size:11.5px;color:#8b949e;margin-top:4px;">github.com/johndoe &nbsp;|&nbsp; john.doe@email.com &nbsp;|&nbsp; +91 9876543210</div>
</div>
<div style="padding:24px 28px;">
<div style="font-size:13px;color:#555;margin-bottom:18px;"><b>Date:</b> June 2, 2026 &nbsp;·&nbsp; <b>Re:</b> [Job Title] Application</div>
<p style="font-size:13.5px;margin:0 0 12px;">Hi [Team / Hiring Manager],</p>
<p style="font-size:13.5px;margin:0 0 12px;">I'm a full-stack engineer who's spent the last [X] years shipping production systems in [Tech Stack]. At [Previous Company], I built a microservice handling 10M+ requests/day at 99.99% uptime, and cut API latency by 45% through query and caching improvements.</p>
<p style="font-size:13.5px;margin:0 0 12px;">I came across [Company Name]'s engineering blog post on [specific topic] and it's exactly the kind of problem I want to work on next. I write clean, tested code, review PRs thoughtfully, and care about the systems I build outliving me.</p>
<p style="font-size:13.5px;margin:0 0 25px;">Happy to walk through any of my GitHub projects or past architecture decisions on a call. Thanks for considering my application.</p>
<div style="font-size:13.5px;">
Best,<br><br><br>
<b>John Doe</b>
</div>
</div>
</div>`
  },
  {
    id: 'clinical-cl',
    name: 'Clinical & Healthcare',
    tag: 'Nursing · Allied Health · Compassionate',
    icon: '🩺',
    color: '#00838f',
    accent: 'rgba(0,131,143,0.12)',
    description: 'A compassionate, licensure-forward cover letter for nurses and allied health professionals.',
    highlights: ['Licensure Mention', 'Patient-Care Tone', 'Clinical Detail'],
    type: 'cover-letter',
    html: `<div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;padding:36px;color:#1a1a1a;line-height:1.65;">
<div style="border-bottom:3px solid #00838f;padding-bottom:12px;margin-bottom:20px;">
<div style="font-size:23px;font-weight:800;color:#00838f;">John Doe, RN</div>
<div style="font-size:12px;color:#666;margin-top:3px;">License No. [XXXXXX] &nbsp;·&nbsp; john.doe@email.com &nbsp;·&nbsp; +91 9876543210</div>
</div>
<div style="font-size:13px;color:#555;margin-bottom:18px;"><b>Date:</b> June 2, 2026 &nbsp;·&nbsp; <b>Attention:</b> Nurse Recruitment, [Hospital/Clinic Name]</div>
<p style="font-size:13.5px;margin:0 0 12px;">Dear Hiring Manager,</p>
<p style="font-size:13.5px;margin:0 0 12px;">I am a licensed Registered Nurse with [X] years of critical care experience, writing to apply for the [Job Title] position at [Hospital/Clinic Name]. At [Previous Hospital], I managed care for 8+ critical patients per shift in a 20-bed ICU while maintaining a zero medication-error record.</p>
<p style="font-size:13.5px;margin:0 0 12px;">Beyond clinical skill, I bring a calm, patient-first bedside manner that consistently earns high satisfaction scores from patients and families. I am BLS &amp; ACLS certified and committed to continued learning in [specialization area].</p>
<p style="font-size:13.5px;margin:0 0 25px;">I would welcome the opportunity to bring this same level of care to your team. Thank you for your time and consideration.</p>
<div style="font-size:13.5px;">
Sincerely,<br><br><br>
<b>John Doe, RN</b>
</div>
</div>`
  },
  {
    id: 'legal-cl',
    name: 'Legal Counsel',
    tag: 'Law · Formal · Gold Accent',
    icon: '⚖️',
    color: '#1a237e',
    accent: 'rgba(26,35,126,0.12)',
    description: 'A formal, precise cover letter for legal and compliance professionals.',
    highlights: ['Formal Tone', 'Bar Mention', 'Conservative'],
    type: 'cover-letter',
    html: `<div style="font-family:'Times New Roman',serif;max-width:720px;margin:0 auto;padding:38px;color:#111;line-height:1.6;">
<div style="text-align:center;border-bottom:3px double #1a237e;padding-bottom:12px;margin-bottom:20px;">
<div style="font-size:22px;font-weight:700;letter-spacing:1px;color:#1a237e;">JOHN DOE, ESQ.</div>
<div style="font-size:12px;color:#555;margin-top:4px;">john.doe@email.com &nbsp;|&nbsp; +91 9876543210 &nbsp;|&nbsp; New Delhi, India</div>
</div>
<div style="font-size:13px;color:#444;margin-bottom:18px;"><b>Date:</b> June 2, 2026<br><b>To:</b> Hiring Partner / Recruitment Committee, [Firm Name]</div>
<p style="font-size:13.5px;margin:0 0 12px;">Dear Hiring Committee,</p>
<p style="font-size:13.5px;margin:0 0 12px;text-align:justify;">I am writing to apply for the [Job Title] position at [Firm Name]. I am enrolled with the Bar Council of [State] (Enrollment No. [XXXXX]) and have [X] years of experience advising on [Practice Area], including transactions exceeding $50M in aggregate value.</p>
<p style="font-size:13.5px;margin:0 0 12px;text-align:justify;">At [Previous Firm], I drafted and negotiated commercial contracts for 30+ clients and advised on regulatory compliance matters across multiple jurisdictions. I bring meticulous attention to detail and sound judgment under deadline pressure.</p>
<p style="font-size:13.5px;margin:0 0 25px;text-align:justify;">I would welcome the opportunity to discuss how my background can serve [Firm Name]'s clients. Thank you for your consideration.</p>
<div style="font-size:13.5px;">
Respectfully,<br><br><br>
<b>John Doe, Esq.</b>
</div>
</div>`
  },
  {
    id: 'academic-cl',
    name: 'Academic & Research',
    tag: 'Academia · Formal Serif',
    icon: '🎓',
    color: '#7a1f2b',
    accent: 'rgba(122,31,43,0.12)',
    description: 'A formal cover letter for faculty, postdoc, and research positions.',
    highlights: ['Research-Focused', 'Formal Serif', 'Faculty-Ready'],
    type: 'cover-letter',
    html: `<div style="font-family:Georgia,serif;max-width:720px;margin:0 auto;padding:38px;color:#1a1a1a;line-height:1.7;">
<div style="text-align:center;border-bottom:2px solid #7a1f2b;padding-bottom:12px;margin-bottom:20px;">
<div style="font-size:22px;font-weight:700;color:#7a1f2b;">Dr. John Doe</div>
<div style="font-size:12px;color:#666;margin-top:4px;font-style:italic;">john.doe@university.edu &nbsp;·&nbsp; +91 9876543210 &nbsp;·&nbsp; Department of [Field]</div>
</div>
<div style="font-size:13px;color:#555;margin-bottom:18px;"><b>Date:</b> June 2, 2026 &nbsp;·&nbsp; <b>To:</b> Search Committee, Department of [Field], [University Name]</div>
<p style="font-size:13.5px;margin:0 0 12px;">Dear Members of the Search Committee,</p>
<p style="font-size:13.5px;margin:0 0 12px;text-align:justify;">I am writing to apply for the [Position Title] in the Department of [Field] at [University Name]. My research focuses on [Research Area], and I have published in venues including [Journal/Conference Name], with [X] citations to date.</p>
<p style="font-size:13.5px;margin:0 0 12px;text-align:justify;">During my Ph.D. and postdoctoral work, I secured [Grant/Fellowship Name] funding of ₹[Amount] and taught [Course Name] to over [X] students, receiving strong teaching evaluations. I am excited by the opportunity to build a research program at [University Name] that complements the department's strengths in [related area].</p>
<p style="font-size:13.5px;margin:0 0 25px;text-align:justify;">I have enclosed my CV, research statement, and teaching portfolio for your review, and would welcome the opportunity to discuss my candidacy further.</p>
<div style="font-size:13.5px;">
Sincerely,<br><br><br>
<b>Dr. John Doe</b>
</div>
</div>`
  },
  {
    id: 'hospitality-cl',
    name: 'Hospitality & Service',
    tag: 'Hospitality · Warm · Guest-First',
    icon: '🛎️',
    color: '#c2410c',
    accent: 'rgba(194,65,12,0.12)',
    description: 'A warm, guest-focused cover letter for hospitality and customer-facing roles.',
    highlights: ['Warm Tone', 'Guest-Focused', 'Friendly'],
    type: 'cover-letter',
    html: `<div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;padding:0;background:#fff;color:#1a1a1a;line-height:1.65;">
<div style="background:#fff7ed;padding:22px 28px;border-bottom:3px solid #c2410c;">
<div style="font-size:23px;font-weight:800;color:#c2410c;">John Doe</div>
<div style="font-size:12px;color:#777;margin-top:3px;">john.doe@email.com &nbsp;·&nbsp; +91 9876543210 &nbsp;·&nbsp; New Delhi, India</div>
</div>
<div style="padding:24px 28px;">
<div style="font-size:13px;color:#555;margin-bottom:18px;"><b>Date:</b> June 2, 2026 &nbsp;·&nbsp; <b>Attention:</b> Hiring Manager, [Hotel/Property Name]</div>
<p style="font-size:13.5px;margin:0 0 12px;">Dear Hiring Manager,</p>
<p style="font-size:13.5px;margin:0 0 12px;">I'm writing to apply for the [Job Title] role at [Hotel/Property Name]. Hospitality is about making people feel taken care of, and over [X] years in guest-facing roles I've maintained a 4.9/5 guest satisfaction score while leading front-of-house teams at 5-star properties.</p>
<p style="font-size:13.5px;margin:0 0 12px;">At [Previous Property], I personally resolved escalations for VIP guests and helped improve repeat bookings by 18% through small, thoughtful touches that turned one-time stays into loyal relationships. I'd love to bring that same warmth to your team.</p>
<p style="font-size:13.5px;margin:0 0 25px;">Thank you for considering my application — I'd welcome the chance to meet your team in person.</p>
<div style="font-size:13.5px;">
Warmly,<br><br><br>
<b>John Doe</b>
</div>
</div>
</div>`
  },
  {
    id: 'minimal-cl',
    name: 'Minimal Plain',
    tag: 'Ultra ATS-Safe · No Graphics',
    icon: '📝',
    color: '#212121',
    accent: 'rgba(33,33,33,0.08)',
    description: 'A plain, distraction-free letter format for government, PSU, and highly conservative ATS systems.',
    highlights: ['Zero Graphics', 'Plain Text', 'PSU Friendly'],
    type: 'cover-letter',
    html: `<div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;padding:32px;color:#000;line-height:1.65;">
<div style="margin-bottom:18px;"><b>John Doe</b><br>john.doe@email.com &nbsp;|&nbsp; +91 9876543210 &nbsp;|&nbsp; New Delhi, India</div>
<div style="margin-bottom:18px;">Date: June 2, 2026<br><br>To,<br>The Hiring Manager<br>[Company / Organization Name]<br>[City, State]</div>
<div style="font-weight:700;margin-bottom:14px;">Subject: Application for the post of [Job Title]</div>
<p style="font-size:13.5px;margin:0 0 12px;">Respected Sir/Madam,</p>
<p style="font-size:13.5px;margin:0 0 12px;text-align:justify;">I wish to apply for the post of [Job Title] advertised by [Company/Organization Name]. I hold a [Degree] from [Institution] and have [X] years of relevant experience in [Field].</p>
<p style="font-size:13.5px;margin:0 0 12px;text-align:justify;">In my current/previous role at [Company Name], I was responsible for [key responsibility], during which I [key accomplishment]. I am confident that my qualifications and experience make me a suitable candidate for this position.</p>
<p style="font-size:13.5px;margin:0 0 25px;text-align:justify;">I have enclosed my resume and supporting documents for your kind perusal. I would be grateful for the opportunity to discuss my candidacy further.</p>
<div style="font-size:13.5px;">
Yours faithfully,<br><br><br>
<b>John Doe</b>
</div>
</div>`
  }
];

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────
interface CoverLetterProps {
  customApiKey: string;
  loadedWork?: any;
  setLoadedWork?: (work: any) => void;
}

export default function CoverLetter({ customApiKey, loadedWork, setLoadedWork }: CoverLetterProps) {
  const [step, setStep] = useState<'gallery' | 'form' | 'loading' | 'editor'>('gallery');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState('');
  const [copied, setCopied] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'resume' | 'cover-letter'>(() => {
    return window.location.hash === '#cover-letter' ? 'cover-letter' : 'resume';
  });
  const [aiPrompt, setAiPrompt] = useState('');
  const [historyText, setHistoryText] = useState('');

  // Work Persistence States
  const [activeWorkId, setActiveWorkId] = useState<string | null>(null);
  const [activeWorkTitle, setActiveWorkTitle] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleHash = () => {
      setActiveTab(window.location.hash === '#cover-letter' ? 'cover-letter' : 'resume');
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Handle Loading Work from Dashboard / Global Modals
  useEffect(() => {
    if (loadedWork) {
      if (loadedWork.deleted) {
        if (activeWorkId === loadedWork.workId) {
          setActiveWorkId(null);
          setActiveWorkTitle('');
          setStep('gallery');
        }
        if (setLoadedWork) {
          setLoadedWork(null);
        }
        return;
      }
      const template = TEMPLATES.find(t => t.id === loadedWork.templateId) || TEMPLATES[0];
      setSelectedTemplate(template);
      setActiveWorkId(loadedWork.id || loadedWork._id);
      setActiveWorkTitle(loadedWork.title || 'Untitled Work');
      setActiveTab(loadedWork.type || 'resume');
      setStep('editor');
      
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = loadedWork.htmlContent;
          countWords();
        }
      }, 80);
      
      if (setLoadedWork) {
        setLoadedWork(null);
      }
    }
  }, [loadedWork, setLoadedWork, activeWorkId]);

  const [showTableDialog, setShowTableDialog] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [hoveredRows, setHoveredRows] = useState(0);
  const [hoveredCols, setHoveredCols] = useState(0);
  const [showCustomTable, setShowCustomTable] = useState(false);
  const [showTextColor, setShowTextColor] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);

  // ── Image Properties Modal ──────────────────────────────────────
  const [showImageModal, setShowImageModal] = useState(false);
  const [pendingImageBase64, setPendingImageBase64] = useState<string>('');
  const [editingImageEl, setEditingImageEl] = useState<HTMLImageElement | null>(null);
  const [editingPlaceholderEl, setEditingPlaceholderEl] = useState<HTMLElement | null>(null);
  const [imgWidth, setImgWidth] = useState('150');
  const [imgHeight, setImgHeight] = useState('');
  const [imgAlign, setImgAlign] = useState<'inline' | 'left' | 'center' | 'right'>('inline');
  const [imgShape, setImgShape] = useState<'square' | 'rounded' | 'circle'>('square');

  // Hidden File Uploader & Link Handlers for rich text editor
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerImageUploader = () => {
    saveSelection();
    fileInputRef.current?.click();
  };

  // Photo placeholder (e.g. the avatar circle on sidebar templates) — clicking it
  // uploads straight into that slot instead of opening the full image modal.
  const triggerPlaceholderUpload = (el: HTMLElement) => {
    setEditingPlaceholderEl(el);
    fileInputRef.current?.click();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (!base64) return;

      if (editingPlaceholderEl) {
        editingPlaceholderEl.innerHTML = `<img src="${base64}" style="width:100%;height:100%;object-fit:cover;" alt="Profile photo" />`;
        setEditingPlaceholderEl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        countWords();
        return;
      }

      // Show the image properties modal instead of immediately inserting
      setPendingImageBase64(base64);
      setEditingImageEl(null);
      setImgWidth('150');
      setImgHeight('');
      setImgAlign('inline');
      setImgShape('square');
      setShowImageModal(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  // Build style string for image from modal state
  const buildImgStyle = (w: string, h: string, align: string, shape: string): string => {
    const width = w ? `width:${w}px;` : '';
    const height = h ? `height:${h}px;` : '';
    const borderRadius = shape === 'circle' ? 'border-radius:50%;' : shape === 'rounded' ? 'border-radius:8px;' : 'border-radius:0px;';
    let display = 'display:inline-block;vertical-align:middle;margin:6px;';
    let float = '';
    if (align === 'left') { float = 'float:left;'; display = 'display:block;margin:6px 12px 6px 0;'; }
    else if (align === 'right') { float = 'float:right;'; display = 'display:block;margin:6px 0 6px 12px;'; }
    else if (align === 'center') { display = 'display:block;margin:8px auto;'; }
    return `${float}${display}${width}${height}${borderRadius}max-width:100%;`;
  };

  // Insert or update the image from the properties modal
  const insertImageFromModal = () => {
    const style = buildImgStyle(imgWidth, imgHeight, imgAlign, imgShape);
    if (editingImageEl) {
      // Editing an existing image — update its style/src in place
      editingImageEl.setAttribute('style', style);
      if (pendingImageBase64) editingImageEl.setAttribute('src', pendingImageBase64);
      setShowImageModal(false);
      setEditingImageEl(null);
      countWords();
      return;
    }
    // Inserting a new image — restore cursor and use execCommand
    restoreSelection();
    editorRef.current?.focus();
    const imgHtml = `<img src="${pendingImageBase64}" style="${style}" alt="Inserted image" />`;
    document.execCommand('insertHTML', false, imgHtml);
    setShowImageModal(false);
    countWords();
  };

  const applyLink = () => {
    restoreSelection();
    const url = prompt('Enter the link URL (e.g., https://example.com):');
    if (!url) return;
    
    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'http://' + formattedUrl;
    }

    editorRef.current?.focus();
    document.execCommand('createLink', false, formattedUrl);

    // Style the link nicely with blue color highlight & underline
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const container = selection.getRangeAt(0).commonAncestorContainer;
      const parentElement = container.nodeType === 3 ? container.parentNode : container;
      if (parentElement && (parentElement as HTMLElement).tagName === 'A') {
        const linkEl = parentElement as HTMLAnchorElement;
        linkEl.style.color = '#0066cc';
        linkEl.style.textDecoration = 'underline';
        linkEl.target = '_blank';
        linkEl.rel = 'noopener noreferrer';
      } else {
        editorRef.current?.querySelectorAll(`a[href="${formattedUrl}"]`).forEach(el => {
          const linkEl = el as HTMLAnchorElement;
          linkEl.style.color = '#0066cc';
          linkEl.style.textDecoration = 'underline';
          linkEl.target = '_blank';
          linkEl.rel = 'noopener noreferrer';
        });
      }
    }
    
    countWords();
  };

  // Helper to open links or image editor if clicked inside editor
  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Click on a photo placeholder (e.g. avatar circle) → upload straight into it
    const placeholderEl = target.closest('[data-photo-placeholder]') as HTMLElement | null;
    if (placeholderEl) {
      e.preventDefault();
      triggerPlaceholderUpload(placeholderEl);
      return;
    }
    // Click on img → open image properties modal
    if (target.tagName === 'IMG') {
      e.preventDefault();
      const imgEl = target as HTMLImageElement;
      setEditingImageEl(imgEl);
      setPendingImageBase64(imgEl.src);
      // Parse existing style back to modal fields
      const s = imgEl.getAttribute('style') || '';
      const wMatch = s.match(/width:(\d+)px/);
      const hMatch = s.match(/height:(\d+)px/);
      setImgWidth(wMatch ? wMatch[1] : '150');
      setImgHeight(hMatch ? hMatch[1] : '');
      if (s.includes('float:left')) setImgAlign('left');
      else if (s.includes('float:right')) setImgAlign('right');
      else if (s.includes('margin:8px auto')) setImgAlign('center');
      else setImgAlign('inline');
      if (s.includes('border-radius:50%')) setImgShape('circle');
      else if (s.includes('border-radius:8px')) setImgShape('rounded');
      else setImgShape('square');
      setShowImageModal(true);
      return;
    }
    const closestA = target.closest('a');
    if (closestA) {
      const href = closestA.getAttribute('href');
      if (href) {
        window.open(href, '_blank', 'noopener,noreferrer');
      }
    }
  };
  const [currentFont, setCurrentFont] = useState('Arial, sans-serif');
  const [currentSize, setCurrentSize] = useState('12');
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);

  useEffect(() => {
    if (step === 'editor' && selectedTemplate && editorRef.current) {
      if (activeWorkId) {
        // Skip overwriting since it's a loaded draft
      } else {
        editorRef.current.innerHTML = selectedTemplate.html;
      }
      countWords();
    }
  }, [step, selectedTemplate, activeWorkId]);

  // Background auto-save effect
  useEffect(() => {
    if (step !== 'editor') return;

    let lastSavedContent = editorRef.current?.innerHTML || '';

    const interval = setInterval(async () => {
      const currentContent = editorRef.current?.innerHTML || '';
      if (currentContent && currentContent.trim() && currentContent !== lastSavedContent) {
        const userStr = localStorage.getItem('cvmind_user');
        if (!userStr) return;

        let userId = '';
        try {
          const user = JSON.parse(userStr);
          userId = user.id || user._id;
        } catch {
          return;
        }
        if (!userId) return;

        const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL
          || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');

        try {
          setSaving(true);
          const response = await authFetch(`${baseUrl}/api/user/work`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              title: activeWorkTitle.trim() || `Untitled ${activeTab === 'cover-letter' ? 'Cover Letter' : 'Resume'}`,
              type: activeTab,
              templateId: selectedTemplate?.id || 'classic-pro',
              htmlContent: currentContent,
              workId: activeWorkId
            })
          });
          const data = await response.json();
          if (response.ok && data.data) {
            lastSavedContent = currentContent;
            const newId = data.data.id || data.data._id;
            setActiveWorkId(newId);
          }
        } catch (e) {
          console.error("Auto-save error:", e);
        } finally {
          setSaving(false);
        }
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [step, activeWorkId, activeWorkTitle, activeTab, selectedTemplate]);

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setActiveWorkId(null);
    setActiveWorkTitle(`${template.type === 'cover-letter' ? 'Cover Letter' : 'Resume'} - ${template.name}`);
    if (template.type === 'cover-letter') {
      setStep('editor');
    } else {
      setStep('form');
    }
  };



  const handleSharePortfolio = async () => {
    if (selectedTemplate?.type === 'cover-letter') {
      alert('Sharing is currently only supported for Resumes.');
      return;
    }

    if (activeWorkId) {
      const shareUrl = `${window.location.origin}/portfolio/${activeWorkId}`;
      navigator.clipboard.writeText(shareUrl);
      window.open(shareUrl, '_blank');
      return;
    }

    const htmlContent = editorRef.current?.innerHTML || '';
    if (!htmlContent.trim()) return;

    const userStr = localStorage.getItem('cvmind_user');
    if (!userStr) {
      alert('Please sign in to save and share your portfolio.');
      return;
    }

    let userId = '';
    try {
      const user = JSON.parse(userStr);
      userId = user.id || user._id;
    } catch {
      alert('Session invalid. Please sign in again.');
      return;
    }

    setSaving(true);
    const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL
      || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');

    try {
      const response = await authFetch(`${baseUrl}/api/user/work`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title: activeWorkTitle.trim() || `Untitled Resume`,
          type: activeTab,
          templateId: selectedTemplate?.id || 'classic-pro',
          htmlContent,
          workId: activeWorkId
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save');

      if (data.data) {
        const newId = data.data.id || data.data._id;
        setActiveWorkId(newId);
        const shareUrl = `${window.location.origin}/portfolio/${newId}`;
        navigator.clipboard.writeText(shareUrl);
        window.open(shareUrl, '_blank');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred while preparing your portfolio.');
    } finally {
      setSaving(false);
    }
  };

  const countWords = () => {
    const t = editorRef.current?.innerText || '';
    setWordCount(t.trim().split(/\s+/).filter(Boolean).length);
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedRange.current = sel.getRangeAt(0).cloneRange();
  };

  const restoreSelection = () => {
    if (!savedRange.current) return;
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(savedRange.current);
  };

  const exec = (cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val ?? '');
    countWords();
  };

  const applyFontSize = (size: string) => {
    editorRef.current?.focus();
    document.execCommand('fontSize', false, '7');
    editorRef.current?.querySelectorAll('font[size="7"]').forEach(el => {
      const span = document.createElement('span');
      span.style.fontSize = size + 'pt';
      span.innerHTML = (el as HTMLElement).innerHTML;
      el.parentNode?.replaceChild(span, el);
    });
    setCurrentSize(size);
    countWords();
  };

  const applyFont = (f: string) => { exec('fontName', f); setCurrentFont(f); };

  const applyTextColor = (c: string) => { restoreSelection(); exec('foreColor', c); setShowTextColor(false); };
  const applyHighlight = (c: string) => {
    restoreSelection();
    if (c === 'transparent') exec('backColor', 'transparent');
    else exec('backColor', c);
    setShowHighlight(false);
  };

  const insertTableOfSize = (rows: number, cols: number) => {
    restoreSelection();
    editorRef.current?.focus();
    let html = '<br><table style="border-collapse:collapse;width:100%;margin:8px 0;">';
    for (let r = 0; r < rows; r++) {
      html += '<tr>';
      for (let c = 0; c < cols; c++) {
        const isH = r === 0;
        const st = `border:1px solid #ccc;padding:7px 10px;min-width:50px;${isH ? 'background:#f0f0f0;font-weight:700;' : ''}`;
        html += `<${isH ? 'th' : 'td'} style="${st}">${isH ? `Col ${c + 1}` : 'Cell'}</${isH ? 'th' : 'td'}>`;
      }
      html += '</tr>';
    }
    html += '</table><br>';
    document.execCommand('insertHTML', false, html);
    setShowTableDialog(false);
    setShowCustomTable(false);
    setHoveredRows(0);
    setHoveredCols(0);
    countWords();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editorRef.current?.innerText || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = () => {
    const content = editorRef.current?.innerHTML || '';
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Resume – ${selectedTemplate?.name || 'CVMind'}</title>
    <style>
      @page { margin: 0.6in; }
      body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      * { box-sizing: border-box; }
    </style></head><body>${content}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 600);
  };

  const handleDownloadDOCX = () => {
    const content = editorRef.current?.innerHTML || '';
    const wordDoc = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>Resume</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>90</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->
<style>body{font-family:Arial,sans-serif;margin:1in;}@page{margin:1in;}</style>
</head><body>${content}</body></html>`;
    const blob = new Blob(['\ufeff', wordDoc], { type: 'application/msword' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `resume-${selectedTemplate?.id || 'draft'}.doc`,
    });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleRefine = async () => {
    const htmlContent = editorRef.current?.innerHTML || '';
    if (!htmlContent.trim() || refining) return;
    setRefining(true);
    setRefineError('');
    try {
      setHistoryText(htmlContent);

      const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL
        || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customApiKey) headers['x-gemini-key'] = customApiKey;
      const res = await fetch(`${baseUrl}/api/cover-letter/refine`, {
        method: 'POST', headers,
        body: JSON.stringify({ coverLetterText: htmlContent, jobTitle: 'Professional', companyName: 'Target Company' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI refinement failed.');
      if (editorRef.current) { 
        editorRef.current.innerHTML = data.data.refinedLetter; 
        countWords(); 
      }
    } catch (err: any) {
      setRefineError(err.message || 'Something went wrong.');
    } finally {
      setRefining(false);
    }
  };

  const handleRefineWithPrompt = async () => {
    const htmlContent = editorRef.current?.innerHTML || '';
    if (!htmlContent.trim() || refining) return;
    setRefining(true);
    setRefineError('');
    try {
      setHistoryText(htmlContent);

      const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL
        || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customApiKey) headers['x-gemini-key'] = customApiKey;
      const res = await fetch(`${baseUrl}/api/cover-letter/refine`, {
        method: 'POST', headers,
        body: JSON.stringify({ 
          coverLetterText: htmlContent, 
          jobTitle: 'Professional', 
          companyName: 'Target Company',
          instructions: aiPrompt 
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI refinement failed.');
      if (editorRef.current) { 
        editorRef.current.innerHTML = data.data.refinedLetter; 
        countWords(); 
      }
    } catch (err: any) {
      setRefineError(err.message || 'Something went wrong.');
    } finally {
      setRefining(false);
    }
  };

  const handleGenerateFromScratch = async () => {
    const htmlContent = editorRef.current?.innerHTML || '';
    if (!aiPrompt.trim() || refining) return;
    setRefining(true);
    setRefineError('');
    try {
      setHistoryText(htmlContent);

      const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL
        || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customApiKey) headers['x-gemini-key'] = customApiKey;
      
      const generationPrompt = `WRITE A COMPLETELY NEW COVER LETTER from scratch replacing the current content entirely. Do NOT use the existing content. Generate a fresh, professional cover letter according to this prompt: "${aiPrompt}". Keep the HTML structure, wrappers, fonts, and inline styles exactly as they are.`;

      const res = await fetch(`${baseUrl}/api/cover-letter/refine`, {
        method: 'POST', headers,
        body: JSON.stringify({ 
          coverLetterText: htmlContent, 
          jobTitle: 'Professional', 
          companyName: 'Target Company',
          instructions: generationPrompt
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI generation failed.');
      if (editorRef.current) { 
        editorRef.current.innerHTML = data.data.refinedLetter; 
        countWords(); 
      }
    } catch (err: any) {
      setRefineError(err.message || 'Something went wrong.');
    } finally {
      setRefining(false);
    }
  };

  const handleRestoreVersion = () => {
    if (historyText && editorRef.current) {
      const current = editorRef.current.innerHTML;
      editorRef.current.innerHTML = historyText;
      setHistoryText(current); // toggle
      countWords();
    }
  };

  const handleGenerateFromWizard = async (formData: any) => {
    if (!selectedTemplate) return;
    setStep('loading');
    setRefineError('');
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL
        || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customApiKey) headers['x-gemini-key'] = customApiKey;

      const res = await fetch(`${baseUrl}/api/resume/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          templateHtml: selectedTemplate.html,
          formData
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI generation failed.');

      const generatedHtml = data.data.generatedHtml;

      // Instantly save to "My Works" to ensure 0% data loss risk
      const userStr = localStorage.getItem('cvmind_user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          const userId = user.id || user._id;
          if (userId) {
            const saveRes = await authFetch(`${baseUrl}/api/user/work`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                title: activeWorkTitle.trim() || `Resume - ${selectedTemplate.name}`,
                type: 'resume',
                templateId: selectedTemplate.id,
                htmlContent: generatedHtml,
                workId: null
              })
            });
            const saveData = await saveRes.json();
            if (saveRes.ok && saveData.data) {
              const newId = saveData.data.id || saveData.data._id;
              setActiveWorkId(newId);
            }
          }
        } catch (saveErr) {
          console.error("Wizard instant save error:", saveErr);
        }
      }

      setStep('editor');
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = generatedHtml;
          countWords();
        }
      }, 100);
    } catch (err: any) {
      setRefineError(err.message || 'Something went wrong.');
      setStep('form');
    }
  };

  const closeAllPopups = () => { setShowTextColor(false); setShowHighlight(false); setShowTableDialog(false); };

  // ── WIZARD FORM ─────────────────────────────────────────────
  if (step === 'form') {
    return (
      <ResumeWizard
        templateName={selectedTemplate?.name || ''}
        onBack={() => { setStep('gallery'); setSelectedTemplate(null); }}
        onSkip={() => { setStep('editor'); }}
        onGenerate={handleGenerateFromWizard}
      />
    );
  }

  // ── LOADING SCREEN ──────────────────────────────────────────
  if (step === 'loading') {
    return (
      <div className="cl-page animate-fade-in-up" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: '480px', padding: '2.5rem 2rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-lg)' }}>
          <Loader2 size={40} className="cl-spin" style={{ color: 'var(--blue)', marginBottom: '1.5rem' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.8rem' }}>AI is Crafting Your Resume</h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.8rem' }}>
            CV Mind is optimizing your qualifications, experience points, and skillsets into an ATS-friendly layout. This will take up to 60 seconds...
          </p>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '999px', overflow: 'hidden', position: 'relative' }}>
            <div className="rw-progress-bar-fill" />
          </div>
        </div>
      </div>
    );
  }

  // ── GALLERY ─────────────────────────────────────────────────
  if (step === 'gallery') {
    const filteredTemplates = TEMPLATES.filter(t => {
      const type = t.type || 'resume';
      return type === activeTab;
    });

    return (
      <div className="cl-page animate-fade-in-up">
        <div className="cl-hero">
          <div className="cl-hero-badge">
            {activeTab === 'resume' ? <FileText size={14} /> : <Sparkles size={14} />} 
            {activeTab === 'resume' ? 'ATS Resume Builder' : 'AI Cover Letter Builder'}
          </div>
          <h1 className="cl-hero-title">
            Choose Your <span className="cl-gradient-text">{activeTab === 'resume' ? 'ATS Template' : 'Cover Letter'}</span>
          </h1>
          <p className="cl-hero-sub">
            {activeTab === 'resume'
              ? '22 powerful ATS-optimized resume templates. Select one and customize with our full Word-like editor — fonts, tables, colors, headings & more.'
              : 'Select a premium cover letter layout and edit using our professional writing environment. Perfect format, zero guesswork.'}
          </p>
        </div>

        {/* Tab switcher inside UI */}
        <div className="cl-tabs">
          <button 
            className={`cl-tab ${activeTab === 'resume' ? 'active' : ''}`}
            onClick={() => { window.location.hash = '#resume'; setActiveTab('resume'); }}
          >
            <FileText size={14} /> ATS Resumes
          </button>
          <button 
            className={`cl-tab ${activeTab === 'cover-letter' ? 'active' : ''}`}
            onClick={() => { window.location.hash = '#cover-letter'; setActiveTab('cover-letter'); }}
          >
            <Sparkles size={14} /> Cover Letters
          </button>
        </div>
        <div className="cl-template-grid">
          {filteredTemplates.map(t => (
            <button key={t.id} id={`template-${t.id}`} className="cl-template-card"
              style={{ '--card-accent': t.accent, '--card-color': t.color } as React.CSSProperties}
              onClick={() => handleSelectTemplate(t)}>
              
              {/* Premium High-Resolution Template Layout Preview */}
              <div className="cl-card-visual-wrapper">
                <div className="cl-card-mini-document" style={{ overflow: 'hidden' }}>
                  <img
                    src={`/templates/${t.id}.png`}
                    alt={t.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block'
                    }}
                    onError={(e) => {
                      // No screenshot generated yet for this template — show a styled fallback instead.
                      const img = e.target as HTMLImageElement;
                      const wrapper = img.parentElement;
                      img.style.display = 'none';
                      if (wrapper) {
                        wrapper.style.background = `linear-gradient(135deg, ${t.accent} 0%, ${t.color}22 100%)`;
                        wrapper.style.display = 'flex';
                        wrapper.style.flexDirection = 'column';
                        wrapper.style.alignItems = 'center';
                        wrapper.style.justifyContent = 'center';
                        wrapper.style.gap = '8px';
                        wrapper.innerHTML = `<span style="font-size:40px;line-height:1;">${t.icon}</span><span style="font-size:12px;font-weight:700;color:${t.color};text-align:center;padding:0 10px;">${t.name}</span>`;
                      }
                    }}
                  />
                </div>

                {/* Hover overlay with button */}
                <div className="cl-card-hover-overlay">
                  <span className="cl-card-hover-btn" style={{ '--card-color': t.color } as React.CSSProperties}>
                    <FileText size={13} /> {activeTab === 'resume' ? 'Edit Resume' : 'Edit Cover Letter'}
                  </span>
                </div>
              </div>

              <div className="cl-card-header">
                <span className="cl-card-icon">{t.icon}</span>
                <span className="cl-card-tag" style={{ color: t.color, background: t.accent }}>{t.tag}</span>
              </div>
              <h3 className="cl-card-name">{t.name}</h3>
              <p className="cl-card-desc">{t.description}</p>
              <div className="cl-card-preview">
                {t.highlights.map((h, i) => <span key={i} className="cl-preview-chip" style={{ color: t.color }}><CheckCircle2 size={10} /> {h}</span>)}
              </div>
              <div className="cl-card-cta" style={{ color: t.color }}>Open in Editor <ChevronRight size={13} /></div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── EDITOR ───────────────────────────────────────────────────
  return (
    <div className="cl-page animate-fade-in-up" onClick={closeAllPopups}>

      {/* Top bar */}
      <div className="cl-editor-topbar" onClick={e => e.stopPropagation()}>
        <div className="cl-editor-topbar-left">
          <button className="cl-back-btn" onClick={() => { setStep('gallery'); setActiveWorkId(null); }}><ArrowLeft size={14} /> Templates</button>
          <input 
            type="text" 
            className="cl-title-input" 
            value={activeWorkTitle} 
            onChange={e => setActiveWorkTitle(e.target.value)} 
            placeholder="Untitled Work" 
            title="Rename Work"
          />
          <div className="cl-template-pill" style={{ background: selectedTemplate?.accent, color: selectedTemplate?.color }}>
            {selectedTemplate?.icon} {selectedTemplate?.name}
          </div>
        </div>
        <div className="cl-editor-topbar-right">
          <span className="cl-word-badge">{wordCount} words</span>
          <button className="cl-top-btn" onClick={handleCopy}>
            {copied ? <><Check size={13} className="text-success" /> Copied</> : <><Copy size={13} /> Copy Text</>}
          </button>
          <button className="cl-top-btn" onClick={handleDownloadPDF}><Download size={13} /> PDF</button>
          <button className="cl-top-btn" onClick={handleDownloadDOCX}><Download size={13} /> DOCX</button>
          {selectedTemplate?.type !== 'cover-letter' && (
            <button className="cl-top-btn" onClick={handleSharePortfolio}><Globe size={13} /> Share</button>
          )}
          {localStorage.getItem('cvmind_user') ? (
            <div className="cl-autosave-status" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '0.35rem 0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', border: '1px solid var(--border)' }}>
              {saving ? (
                <><Loader2 size={12} className="cl-spin text-blue" /> Saving...</>
              ) : (
                <><Check size={12} className="text-success" /> Saved automatically</>
              )}
            </div>
          ) : (
            <div className="cl-autosave-status" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-warning)', padding: '0.35rem 0.75rem', background: 'rgba(251,146,60,0.05)', borderRadius: '6px', border: '1px solid rgba(251,146,60,0.2)' }}>
              <AlertTriangle size={12} /> Sign in to save
            </div>
          )}
          <button className="cl-ai-btn" disabled={refining} onClick={handleRefine}
            style={{ '--ac': selectedTemplate?.color || '#2997ff' } as React.CSSProperties}>
            {refining ? <><Loader2 size={14} className="cl-spin" /> Refining…</> : <><Sparkles size={14} /> AI Refine</>}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {refineError && <div className="cl-error-banner"><AlertTriangle size={15} /> {refineError}</div>}

      {/* ══ WORD TOOLBAR ══ */}
      <div className="cl-word-toolbar" onClick={e => e.stopPropagation()}>

        {/* ROW 1 */}
        <div className="cl-tb-row">
          <button className="cl-tb-btn" title="Undo" onClick={() => exec('undo')}><Undo2 size={14} /></button>
          <button className="cl-tb-btn" title="Redo" onClick={() => exec('redo')}><Redo2 size={14} /></button>
          <div className="cl-tb-div" />

          <select className="cl-tb-select cl-font-sel" value={currentFont} title="Font Family"
            onChange={e => applyFont(e.target.value)}>
            {FONTS.map(f => <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>)}
          </select>

          <select className="cl-tb-select cl-size-sel" value={currentSize} title="Font Size"
            onChange={e => applyFontSize(e.target.value)}>
            {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <div className="cl-tb-div" />

          <select className="cl-tb-select cl-style-sel" title="Paragraph Style"
            defaultValue="p" onChange={e => exec('formatBlock', e.target.value)}>
            <option value="p">Normal</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="h4">Heading 4</option>
            <option value="pre">Preformatted</option>
          </select>

          <div className="cl-tb-div" />
          <button className="cl-tb-btn cl-tb-B" title="Bold" onClick={() => exec('bold')}><Bold size={14} /></button>
          <button className="cl-tb-btn cl-tb-I" title="Italic" onClick={() => exec('italic')}><Italic size={14} /></button>
          <button className="cl-tb-btn cl-tb-U" title="Underline" onClick={() => exec('underline')}><Underline size={14} /></button>
          <button className="cl-tb-btn" title="Strikethrough" onClick={() => exec('strikeThrough')}><Strikethrough size={14} /></button>
        </div>

        {/* ROW 2 */}
        <div className="cl-tb-row">
          {/* Text Color */}
          <div className="cl-tb-popup-wrap" onClick={e => e.stopPropagation()}>
            <button className="cl-tb-btn cl-tb-color-btn" title="Text Color"
              onMouseDown={e => { e.preventDefault(); saveSelection(); setShowTextColor(v => !v); setShowHighlight(false); setShowTableDialog(false); }}>
              <span className="cl-color-A">A</span><ChevronDown size={9} />
            </button>
            {showTextColor && (
              <div className="cl-color-popup">
                <div className="cl-color-grid">
                  {TEXT_COLORS.map(c => <button key={c} className="cl-swatch" style={{ background: c, border: c === '#ffffff' ? '1px solid #ccc' : undefined }} onMouseDown={e => { e.preventDefault(); applyTextColor(c); }} />)}
                </div>
                <label className="cl-custom-color">Custom: <input type="color" onInput={e => applyTextColor((e.target as HTMLInputElement).value)} /></label>
              </div>
            )}
          </div>

          {/* Highlight */}
          <div className="cl-tb-popup-wrap" onClick={e => e.stopPropagation()}>
            <button className="cl-tb-btn cl-tb-color-btn" title="Highlight"
              onMouseDown={e => { e.preventDefault(); saveSelection(); setShowHighlight(v => !v); setShowTextColor(false); setShowTableDialog(false); }}>
              <Highlighter size={14} /><ChevronDown size={9} />
            </button>
            {showHighlight && (
              <div className="cl-color-popup">
                <div className="cl-color-grid">
                  {HIGHLIGHT_COLORS.map(c => <button key={c} className="cl-swatch" style={{ background: c === 'transparent' ? 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAJElEQVQYV2NkYGD4z8BQDwAEgAF/QualityFirst")' : c, border: '1px solid #ccc' }} onMouseDown={e => { e.preventDefault(); applyHighlight(c); }} />)}
                </div>
              </div>
            )}
          </div>

          <div className="cl-tb-div" />
          <button className="cl-tb-btn" title="Align Left" onClick={() => exec('justifyLeft')}><AlignLeft size={14} /></button>
          <button className="cl-tb-btn" title="Align Center" onClick={() => exec('justifyCenter')}><AlignCenter size={14} /></button>
          <button className="cl-tb-btn" title="Align Right" onClick={() => exec('justifyRight')}><AlignRight size={14} /></button>
          <button className="cl-tb-btn" title="Justify" onClick={() => exec('justifyFull')}><AlignJustify size={14} /></button>

          <div className="cl-tb-div" />
          <button className="cl-tb-btn" title="Bullet List" onClick={() => exec('insertUnorderedList')}><List size={14} /></button>
          <button className="cl-tb-btn" title="Numbered List" onClick={() => exec('insertOrderedList')}><ListOrdered size={14} /></button>
          <button className="cl-tb-btn" title="Indent" onClick={() => exec('indent')}><span className="cl-indent-icon">→|</span></button>
          <button className="cl-tb-btn" title="Outdent" onClick={() => exec('outdent')}><span className="cl-indent-icon">|←</span></button>

          <div className="cl-tb-div" />

          {/* Table */}
          <div className="cl-tb-popup-wrap" onClick={e => e.stopPropagation()}>
            <button className="cl-tb-btn" title="Insert Table"
              onMouseDown={e => { e.preventDefault(); saveSelection(); setShowTableDialog(v => !v); setShowTextColor(false); setShowHighlight(false); }}>
              <Table size={14} /><ChevronDown size={9} />
            </button>
            {showTableDialog && (
              <div className="cl-table-dialog" onClick={e => e.stopPropagation()}>
                <div className="cl-table-dlg-title">
                  {hoveredRows > 0 && hoveredCols > 0 
                    ? `Insert Table: ${hoveredCols} x ${hoveredRows}` 
                    : 'Insert Table'}
                </div>
                
                {/* 10x8 Interactive Hover Grid */}
                <div className="cl-table-grid-selector" onMouseLeave={() => { setHoveredRows(0); setHoveredCols(0); }}>
                  {Array.from({ length: 8 }).map((_, rIdx) => {
                    const r = rIdx + 1;
                    return (
                      <div key={rIdx} className="cl-table-grid-row">
                        {Array.from({ length: 10 }).map((_, cIdx) => {
                          const c = cIdx + 1;
                          const isActive = r <= hoveredRows && c <= hoveredCols;
                          return (
                            <div 
                              key={cIdx} 
                              className={`cl-table-grid-cell ${isActive ? 'active' : ''}`}
                              onMouseEnter={() => { setHoveredRows(r); setHoveredCols(c); }}
                              onClick={() => insertTableOfSize(r, c)}
                            />
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
                
                <div className="cl-table-divider" />
                
                {/* Microsoft Word action options */}
                {!showCustomTable ? (
                  <>
                    <button className="cl-table-action-link" onClick={() => setShowCustomTable(true)}>
                      <Table size={13} /> Insert Table...
                    </button>
                    <button className="cl-table-action-link" onClick={() => alert('Draw Table mode is not supported on web editors yet, please use standard insert!')}>
                      <Pencil size={13} /> Draw Table
                    </button>
                  </>
                ) : (
                  <div className="cl-custom-table-form">
                    <div className="cl-table-dlg-row">
                      <label>Rows</label>
                      <input type="number" min={1} max={50} value={tableRows} onChange={e => setTableRows(+e.target.value)} className="cl-table-input" />
                    </div>
                    <div className="cl-table-dlg-row">
                      <label>Cols</label>
                      <input type="number" min={1} max={20} value={tableCols} onChange={e => setTableCols(+e.target.value)} className="cl-table-input" />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '6px' }}>
                      <button className="cl-table-insert-btn" onClick={() => insertTableOfSize(tableRows, tableCols)}>Insert</button>
                      <button className="cl-table-cancel-btn" onClick={() => setShowCustomTable(false)}>Back</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <button className="cl-tb-btn" title="Horizontal Line" onClick={() => exec('insertHorizontalRule')}><Minus size={14} /></button>
          <button className="cl-tb-btn" title="Clear Formatting" onClick={() => exec('removeFormat')}><Eraser size={14} /></button>
          <div className="cl-tb-div" />
          <button className="cl-tb-btn" title="Insert Link" onMouseDown={e => { e.preventDefault(); saveSelection(); }} onClick={applyLink}><Link size={14} /></button>
          <button className="cl-tb-btn" title="Insert Image" onMouseDown={e => { e.preventDefault(); saveSelection(); }} onClick={triggerImageUploader}><Image size={14} /></button>
        </div>
      </div>

      {/* ══ EDITOR & AI SIDEBAR WORKSPACE ══ */}
      <div className="cl-workspace">
        
        {/* Left Side: Word Canvas */}
        <div className="cl-editor-main">
          <div className="cl-paper-shell">
            <div
              ref={editorRef}
              id="cl-resume-editor"
              className="cl-paper"
              contentEditable
              suppressContentEditableWarning
              spellCheck
              onInput={countWords}
              onClick={e => { closeAllPopups(); handleEditorClick(e); }}
            />
            {/* Hidden image file uploader input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept="image/*" 
              onChange={handleImageUpload} 
            />

            {/* ── Image Properties Modal ────────────────────────── */}
            {showImageModal && (
              <div className="img-modal-overlay" onMouseDown={e => e.stopPropagation()}>
                <div className="img-modal-card">
                  <div className="img-modal-header">
                    <span className="img-modal-title">
                      <Image size={15} /> {editingImageEl ? 'Edit Image' : 'Insert Image'}
                    </span>
                    <button className="img-modal-close" onClick={() => { setShowImageModal(false); setEditingImageEl(null); }}>✕</button>
                  </div>

                  {/* Preview */}
                  {pendingImageBase64 && (
                    <div className="img-modal-preview">
                      <img
                        src={pendingImageBase64}
                        alt="Preview"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '120px',
                          objectFit: 'contain',
                          borderRadius: imgShape === 'circle' ? '50%' : imgShape === 'rounded' ? '8px' : '0',
                          display: 'block',
                          margin: '0 auto'
                        }}
                      />
                    </div>
                  )}

                  {/* Size Controls */}
                  <div className="img-modal-row">
                    <label className="img-modal-label">Width (px)</label>
                    <input
                      className="img-modal-input"
                      type="number"
                      min="20"
                      max="720"
                      placeholder="e.g. 150"
                      value={imgWidth}
                      onChange={e => setImgWidth(e.target.value)}
                    />
                  </div>
                  <div className="img-modal-row">
                    <label className="img-modal-label">Height (px) <span className="img-modal-optional">optional</span></label>
                    <input
                      className="img-modal-input"
                      type="number"
                      min="20"
                      max="1000"
                      placeholder="Auto"
                      value={imgHeight}
                      onChange={e => setImgHeight(e.target.value)}
                    />
                  </div>

                  {/* Alignment */}
                  <div className="img-modal-row">
                    <label className="img-modal-label">Alignment</label>
                    <div className="img-modal-align-group">
                      {(['inline','left','center','right'] as const).map(a => (
                        <button
                          key={a}
                          className={`img-modal-align-btn${imgAlign === a ? ' active' : ''}`}
                          onClick={() => setImgAlign(a)}
                          title={a.charAt(0).toUpperCase() + a.slice(1)}
                        >
                          {a === 'inline' ? '⊡ Inline' : a === 'left' ? '◧ Left' : a === 'center' ? '◈ Center' : '◨ Right'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Shape */}
                  <div className="img-modal-row">
                    <label className="img-modal-label">Shape</label>
                    <div className="img-modal-align-group">
                      {(['square','rounded','circle'] as const).map(s => (
                        <button
                          key={s}
                          className={`img-modal-align-btn${imgShape === s ? ' active' : ''}`}
                          onClick={() => setImgShape(s)}
                        >
                          {s === 'square' ? '□ Square' : s === 'rounded' ? '▢ Rounded' : '○ Circle'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="img-modal-actions">
                    {editingImageEl && (
                      <button
                        className="img-modal-btn-delete"
                        onClick={() => {
                          editingImageEl.remove();
                          setShowImageModal(false);
                          setEditingImageEl(null);
                          countWords();
                        }}
                      >
                        🗑 Remove
                      </button>
                    )}
                    <button className="img-modal-btn-cancel" onClick={() => { setShowImageModal(false); setEditingImageEl(null); }}>
                      Cancel
                    </button>
                    <button className="img-modal-btn-insert" onClick={insertImageFromModal}>
                      {editingImageEl ? '✓ Update Image' : '✓ Insert Image'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: AI Refine Sidebar */}
        <div className="cl-ai-sidebar" onClick={e => e.stopPropagation()}>
          <div className="cl-sidebar-header">
            <Sparkles size={16} className="text-blue" />
            <h3 className="cl-sidebar-title">AI Assistant</h3>
          </div>
          
          <div className="cl-sidebar-body">
            <div className="cl-sidebar-desc">
              Type instructions or details to refine your resume/cover letter or generate new sections tailored precisely.
            </div>

            <textarea
              className="cl-sidebar-textarea"
              placeholder={selectedTemplate?.type === 'cover-letter' 
                ? "e.g., Rewrite this to emphasize my remote team collaboration, or:\nGenerate a cover letter for a Product Designer role at Figma."
                : "e.g., Highlight my cloud scaling experience with AWS, or:\nRewrite my summary to sound more like a tech lead."}
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
            />

            {/* Prompt Presets */}
            <div className="cl-sidebar-presets">
              <span className="cl-presets-title">Quick presets:</span>
              <div className="cl-presets-list">
                {[
                  "Make it more professional",
                  "Highlight leadership & achievements",
                  "Make it short & concise",
                  "Tailor it for a tech startup",
                ].map(preset => (
                  <button
                    key={preset}
                    className="cl-preset-chip"
                    onClick={() => setAiPrompt(preset)}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="cl-sidebar-actions">
              <button 
                className="cl-sidebar-btn cl-btn-refine"
                disabled={refining}
                onClick={handleRefineWithPrompt}
              >
                {refining ? <Loader2 size={14} className="cl-spin" /> : <Sparkles size={14} />} Refine Copy
              </button>
              
              {selectedTemplate?.type === 'cover-letter' && (
                <button 
                  className="cl-sidebar-btn cl-btn-generate"
                  disabled={refining}
                  onClick={handleGenerateFromScratch}
                >
                  {refining ? <Loader2 size={14} className="cl-spin" /> : <Sparkles size={14} />} Write From Scratch
                </button>
              )}
            </div>

            {/* Undo option */}
            {historyText && (
              <button className="cl-sidebar-restore-btn" onClick={handleRestoreVersion}>
                <RotateCcw size={12} /> Undo / Compare Last AI Edit
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="cl-editor-footer">
        <button className="btn-secondary" onClick={() => setStep('gallery')}><RotateCcw size={13} /> Change Template</button>
        <div className="cl-footer-right">
          <span className="cl-footer-hint">
            <Sparkles size={12} /> {selectedTemplate?.type === 'cover-letter' 
              ? 'AI Refine polishes your entire cover letter with CV Mind' 
              : 'AI Refine polishes your entire resume with CV Mind'}
          </span>
          <button className="cl-ai-btn-lg" disabled={refining} onClick={handleRefine}
            style={{ '--ac': selectedTemplate?.color || '#2997ff' } as React.CSSProperties}>
            {refining ? <><Loader2 size={15} className="cl-spin" /> Refining…</> : <><Sparkles size={15} /> AI Refine {selectedTemplate?.type === 'cover-letter' ? 'Letter' : 'Resume'}</>}
          </button>
        </div>
      </div>

    </div>
  );
}
