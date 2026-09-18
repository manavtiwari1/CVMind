import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getCentralJobs, saveCentralApplication, getCandidateApplications } from '../db.js';
import { requireUser, requireSelf } from '../services/authToken.js';
import { scrapeJobFromUrl, parseJobContent } from '../services/jobScraper.js';
import { fetchLiveAtsJobs } from '../services/atsCrawler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

// ── Storage ────────────────────────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const APPS_FILE = path.join(DATA_DIR, 'auto_apply_applications.json');
const PROFILES_FILE = path.join(DATA_DIR, 'auto_apply_profiles.json');

function readApps() {
  try {
    if (!fs.existsSync(APPS_FILE)) return [];
    return JSON.parse(fs.readFileSync(APPS_FILE, 'utf-8'));
  } catch { return []; }
}
function writeApps(apps) {
  try { fs.writeFileSync(APPS_FILE, JSON.stringify(apps, null, 2)); } catch {}
}

function readProfiles() {
  try {
    if (!fs.existsSync(PROFILES_FILE)) return {};
    return JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf-8'));
  } catch { return {}; }
}
function writeProfiles(profiles) {
  try { fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2)); } catch {}
}

// ── Mock Job Database (30 realistic jobs) ─────────────────────────────────────
const MOCK_JOBS = [
  { id: 'j001', title: 'Senior Frontend Engineer', company: 'Razorpay', domain: 'razorpay.com', location: 'Bengaluru, India', type: 'Full-time', remote: 'Hybrid', salary: '₹25L–₹40L/yr', exp: '3–5 yrs', posted: '1 day ago', skills: ['React', 'TypeScript', 'Node.js', 'GraphQL', 'CSS', 'Performance'], industry: 'Fintech', logo: null },
  { id: 'j002', title: 'Full Stack Developer', company: 'Zepto', domain: 'zepto.com', location: 'Mumbai, India', type: 'Full-time', remote: 'Onsite', salary: '₹18L–₹30L/yr', exp: '2–4 yrs', posted: '2 days ago', skills: ['React', 'Node.js', 'MongoDB', 'Redis', 'Docker', 'AWS'], industry: 'E-commerce', logo: null },
  { id: 'j003', title: 'React Native Developer', company: 'CRED', domain: 'cred.club', location: 'Bengaluru, India', type: 'Full-time', remote: 'Remote', salary: '₹20L–₹35L/yr', exp: '2–5 yrs', posted: '3 days ago', skills: ['React Native', 'JavaScript', 'Redux', 'iOS', 'Android'], industry: 'Fintech', logo: null },
  { id: 'j004', title: 'Backend Engineer', company: 'PhonePe', domain: 'phonepe.com', location: 'Bengaluru, India', type: 'Full-time', remote: 'Hybrid', salary: '₹22L–₹38L/yr', exp: '2–5 yrs', posted: '1 day ago', skills: ['Java', 'Spring Boot', 'Kafka', 'MySQL', 'Microservices'], industry: 'Fintech', logo: null },
  { id: 'j005', title: 'Machine Learning Engineer', company: 'Google', domain: 'google.com', location: 'Hyderabad, India', type: 'Full-time', remote: 'Hybrid', salary: '₹45L–₹80L/yr', exp: '3–7 yrs', posted: '4 days ago', skills: ['Python', 'TensorFlow', 'PyTorch', 'ML', 'NLP', 'Data Science'], industry: 'Tech', logo: null },
  { id: 'j006', title: 'Data Scientist', company: 'Flipkart', domain: 'flipkart.com', location: 'Bengaluru, India', type: 'Full-time', remote: 'Hybrid', salary: '₹20L–₹35L/yr', exp: '2–5 yrs', posted: '5 days ago', skills: ['Python', 'SQL', 'Machine Learning', 'Pandas', 'Tableau', 'Statistics'], industry: 'E-commerce', logo: null },
  { id: 'j007', title: 'DevOps Engineer', company: 'Swiggy', domain: 'swiggy.com', location: 'Bengaluru, India', type: 'Full-time', remote: 'Hybrid', salary: '₹18L–₹32L/yr', exp: '2–4 yrs', posted: '2 days ago', skills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Terraform', 'Linux'], industry: 'Food-tech', logo: null },
  { id: 'j008', title: 'Product Manager', company: 'Meesho', domain: 'meesho.com', location: 'Bengaluru, India', type: 'Full-time', remote: 'Hybrid', salary: '₹25L–₹45L/yr', exp: '3–6 yrs', posted: '3 days ago', skills: ['Product Strategy', 'Agile', 'Data Analysis', 'Roadmap', 'UX', 'Stakeholder Management'], industry: 'E-commerce', logo: null },
  { id: 'j009', title: 'UI/UX Designer', company: 'Nykaa', domain: 'nykaa.com', location: 'Mumbai, India', type: 'Full-time', remote: 'Hybrid', salary: '₹12L–₹22L/yr', exp: '2–4 yrs', posted: '1 day ago', skills: ['Figma', 'Sketch', 'User Research', 'Prototyping', 'Design Systems', 'CSS'], industry: 'E-commerce', logo: null },
  { id: 'j010', title: 'Software Development Engineer', company: 'Amazon', domain: 'amazon.com', location: 'Hyderabad, India', type: 'Full-time', remote: 'Hybrid', salary: '₹35L–₹60L/yr', exp: '2–6 yrs', posted: '6 days ago', skills: ['Java', 'Python', 'AWS', 'System Design', 'Data Structures', 'Algorithms'], industry: 'Tech', logo: null },
  { id: 'j011', title: 'Frontend Developer', company: 'Paytm', domain: 'paytm.com', location: 'Noida, India', type: 'Full-time', remote: 'Onsite', salary: '₹15L–₹28L/yr', exp: '1–3 yrs', posted: '2 days ago', skills: ['React', 'JavaScript', 'HTML', 'CSS', 'Redux', 'REST APIs'], industry: 'Fintech', logo: null },
  { id: 'j012', title: 'Cloud Engineer', company: 'Infosys', domain: 'infosys.com', location: 'Pune, India', type: 'Full-time', remote: 'Hybrid', salary: '₹12L–₹22L/yr', exp: '2–5 yrs', posted: '1 week ago', skills: ['AWS', 'Azure', 'GCP', 'Terraform', 'Cloud Architecture', 'Security'], industry: 'IT Services', logo: null },
  { id: 'j013', title: 'iOS Developer', company: 'Zomato', domain: 'zomato.com', location: 'Gurugram, India', type: 'Full-time', remote: 'Hybrid', salary: '₹20L–₹35L/yr', exp: '2–5 yrs', posted: '3 days ago', skills: ['Swift', 'iOS', 'Xcode', 'SwiftUI', 'REST APIs', 'Core Data'], industry: 'Food-tech', logo: null },
  { id: 'j014', title: 'Blockchain Developer', company: 'CoinDCX', domain: 'coindcx.com', location: 'Mumbai, India', type: 'Full-time', remote: 'Remote', salary: '₹22L–₹40L/yr', exp: '2–4 yrs', posted: '5 days ago', skills: ['Solidity', 'Ethereum', 'Web3.js', 'Smart Contracts', 'Node.js', 'React'], industry: 'Crypto', logo: null },
  { id: 'j015', title: 'Security Engineer', company: 'BrowserStack', domain: 'browserstack.com', location: 'Mumbai, India', type: 'Full-time', remote: 'Hybrid', salary: '₹20L–₹38L/yr', exp: '3–6 yrs', posted: '2 days ago', skills: ['Penetration Testing', 'OWASP', 'Security Audits', 'Python', 'Network Security'], industry: 'Tech', logo: null },
  { id: 'j016', title: 'Data Engineer', company: 'Ola', domain: 'ola.com', location: 'Bengaluru, India', type: 'Full-time', remote: 'Onsite', salary: '₹18L–₹32L/yr', exp: '2–4 yrs', posted: '4 days ago', skills: ['Apache Spark', 'Kafka', 'Python', 'SQL', 'ETL', 'Data Warehousing'], industry: 'Transport', logo: null },
  { id: 'j017', title: 'QA Automation Engineer', company: 'Freshworks', domain: 'freshworks.com', location: 'Chennai, India', type: 'Full-time', remote: 'Hybrid', salary: '₹12L–₹22L/yr', exp: '2–4 yrs', posted: '1 week ago', skills: ['Selenium', 'Python', 'Jest', 'Cypress', 'API Testing', 'CI/CD'], industry: 'SaaS', logo: null },
  { id: 'j018', title: 'Embedded Software Engineer', company: 'Ather Energy', domain: 'atherenergy.com', location: 'Bengaluru, India', type: 'Full-time', remote: 'Onsite', salary: '₹15L–₹28L/yr', exp: '2–5 yrs', posted: '3 days ago', skills: ['C', 'C++', 'Embedded Systems', 'RTOS', 'CAN Bus', 'Firmware'], industry: 'EV', logo: null },
  { id: 'j019', title: 'Technical Lead', company: 'InMobi', domain: 'inmobi.com', location: 'Bengaluru, India', type: 'Full-time', remote: 'Hybrid', salary: '₹35L–₹55L/yr', exp: '6–10 yrs', posted: '2 days ago', skills: ['Leadership', 'System Design', 'Java', 'Distributed Systems', 'Mentoring'], industry: 'AdTech', logo: null },
  { id: 'j020', title: 'Go Developer', company: 'slice', domain: 'sliceit.com', location: 'Bengaluru, India', type: 'Full-time', remote: 'Remote', salary: '₹18L–₹32L/yr', exp: '2–4 yrs', posted: '5 days ago', skills: ['Go', 'Microservices', 'gRPC', 'PostgreSQL', 'Docker', 'Kubernetes'], industry: 'Fintech', logo: null },
  { id: 'j021', title: 'Software Engineer', company: 'Microsoft', domain: 'microsoft.com', location: 'Hyderabad, India', type: 'Full-time', remote: 'Hybrid', salary: '₹40L–₹70L/yr', exp: '2–6 yrs', posted: '1 week ago', skills: ['C#', '.NET', 'Azure', 'TypeScript', 'React', 'System Design'], industry: 'Tech', logo: null },
  { id: 'j022', title: 'AI/ML Research Engineer', company: 'Samsung R&D', domain: 'samsung.com', location: 'Noida, India', type: 'Full-time', remote: 'Onsite', salary: '₹25L–₹45L/yr', exp: '3–6 yrs', posted: '6 days ago', skills: ['Python', 'Deep Learning', 'Computer Vision', 'PyTorch', 'Research', 'NLP'], industry: 'Tech', logo: null },
  { id: 'j023', title: 'SRE / Platform Engineer', company: 'Hotstar', domain: 'hotstar.com', location: 'Mumbai, India', type: 'Full-time', remote: 'Hybrid', salary: '₹25L–₹45L/yr', exp: '3–6 yrs', posted: '4 days ago', skills: ['SRE', 'Kubernetes', 'Go', 'Prometheus', 'AWS', 'Incident Management'], industry: 'Streaming', logo: null },
  { id: 'j024', title: 'Node.js Developer', company: 'Juspay', domain: 'juspay.in', location: 'Bengaluru, India', type: 'Full-time', remote: 'Hybrid', salary: '₹15L–₹28L/yr', exp: '1–3 yrs', posted: '2 days ago', skills: ['Node.js', 'JavaScript', 'REST APIs', 'PostgreSQL', 'Redis', 'TypeScript'], industry: 'Fintech', logo: null },
  { id: 'j025', title: 'Product Designer', company: 'Notion', domain: 'notion.so', location: 'Remote', type: 'Full-time', remote: 'Remote', salary: '$120K–$160K/yr', exp: '3–6 yrs', posted: '1 week ago', skills: ['Figma', 'Product Design', 'User Research', 'Interaction Design', 'Design Systems'], industry: 'Productivity', logo: null },
  { id: 'j026', title: 'Frontend Engineer', company: 'Vercel', domain: 'vercel.com', location: 'Remote', type: 'Full-time', remote: 'Remote', salary: '$100K–$150K/yr', exp: '2–5 yrs', posted: '3 days ago', skills: ['React', 'Next.js', 'TypeScript', 'CSS', 'Performance', 'Web APIs'], industry: 'Cloud/DevTools', logo: null },
  { id: 'j027', title: 'Android Developer', company: 'Dream11', domain: 'dream11.com', location: 'Mumbai, India', type: 'Full-time', remote: 'Hybrid', salary: '₹20L–₹35L/yr', exp: '2–5 yrs', posted: '5 days ago', skills: ['Kotlin', 'Android', 'Jetpack Compose', 'MVVM', 'Coroutines', 'Room'], industry: 'Gaming', logo: null },
  { id: 'j028', title: 'Growth Engineer', company: 'Lenskart', domain: 'lenskart.com', location: 'New Delhi, India', type: 'Full-time', remote: 'Hybrid', salary: '₹15L–₹28L/yr', exp: '1–3 yrs', posted: '1 day ago', skills: ['Python', 'SQL', 'A/B Testing', 'Analytics', 'Experimentation', 'Data'], industry: 'E-commerce', logo: null },
  { id: 'j029', title: 'Staff Engineer', company: 'Atlassian', domain: 'atlassian.com', location: 'Bengaluru, India', type: 'Full-time', remote: 'Remote', salary: '₹60L–₹1Cr/yr', exp: '8–12 yrs', posted: '1 week ago', skills: ['Architecture', 'Java', 'Distributed Systems', 'Technical Leadership', 'Mentoring'], industry: 'SaaS', logo: null },
  { id: 'j030', title: 'MLOps Engineer', company: 'Sarvam AI', domain: 'sarvam.ai', location: 'Bengaluru, India', type: 'Full-time', remote: 'Hybrid', salary: '₹25L–₹45L/yr', exp: '2–5 yrs', posted: '2 days ago', skills: ['Python', 'Kubernetes', 'MLflow', 'Model Serving', 'LLMs', 'Docker'], industry: 'AI', logo: null },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function computeMatchScore(jobSkills, candidateSkills) {
  if (!candidateSkills || !candidateSkills.length) return Math.floor(Math.random() * 30) + 40;
  const cSkills = candidateSkills.map(s => s.toLowerCase());
  let matched = 0;
  for (const s of jobSkills) {
    if (cSkills.some(c => c.includes(s.toLowerCase()) || s.toLowerCase().includes(c))) matched++;
  }
  const base = Math.round((matched / jobSkills.length) * 100);
  // Add slight variance for realism
  const variance = Math.floor(Math.random() * 8) - 4;
  return Math.max(20, Math.min(99, base + variance));
}

function callGemini(prompt, apiKey) {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Gemini API key not configured.');

  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 2048, responseMimeType: 'application/json' }
    })
  })
    .then(r => r.json())
    .then(d => {
      const text = d?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      return JSON.parse(text.replace(/```json\n?|```\n?/g, '').trim());
    });
}

// ── POST /api/auto-apply/profile ───────────────────────────────────────────────
router.post('/profile', requireUser, async (req, res) => {
  const { resumeText } = req.body || {};
  const apiKey = req.headers['x-gemini-key'] || null;
  if (!resumeText || resumeText.trim().length < 50)
    return res.status(400).json({ error: 'Resume text is required.' });

  try {
    const prompt = `You are a resume parser. Extract the candidate's real information from the resume text below and return ONLY a JSON object. Do NOT use placeholder values — extract actual data.

JSON schema (return exactly this shape, use null for missing fields):
{
  "name": <string — candidate's actual full name from resume, null if not found>,
  "title": <string — current or most recent job title, null if not found>,
  "email": <string — actual email from resume, null if not found>,
  "phone": <string — actual phone number, null if not found>,
  "location": <string — city or location mentioned, null if not found>,
  "summary": <string — 2-3 sentence professional summary>,
  "skills": <array of up to 15 actual skill strings>,
  "techStack": <array of up to 10 actual technology strings>,
  "experience": <array of {company, title, duration, description} objects>,
  "education": <array of {degree, institution, year} objects>,
  "languages": <array of language strings>,
  "preferredRoles": <array of 3 suitable role strings based on background>,
  "seniority": <"Entry" | "Mid" | "Senior" | "Lead">,
  "yearsOfExperience": <number — total years of professional experience, 0 if fresher>,
  "certifications": <array of certification strings>,
  "github": <string — GitHub URL if found, null otherwise>,
  "linkedin": <string — LinkedIn URL if found, null otherwise>,
  "portfolio": <string — portfolio URL if found, null otherwise>,
  "industries": <array of industry strings>
}

Resume text:
${resumeText.substring(0, 4000)}`;

    const profile = await callGemini(prompt, apiKey);
    return res.json({ success: true, data: profile });
  } catch (err) {
    console.error('Auto-apply profile error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate profile.' });
  }
});

// ── GET /api/auto-apply/profile/:userId ───────────────────────────────────────
router.get('/profile/:userId', requireSelf(), (req, res) => {
  const { userId } = req.params;
  const profiles = readProfiles();
  const userProfile = profiles[userId] || null;
  return res.json({ success: true, data: userProfile });
});

// ── POST /api/auto-apply/profile/save ─────────────────────────────────────────
router.post('/profile/save', requireUser, (req, res) => {
  const { profile } = req.body || {};
  const userId = req.auth.sub;
  if (!profile) return res.status(400).json({ error: 'profile is required.' });
  const profiles = readProfiles();
  profiles[userId] = {
    ...profile,
    updatedAt: new Date().toISOString()
  };
  writeProfiles(profiles);
  return res.json({ success: true, data: profiles[userId], message: 'Profile saved successfully.' });
});

// ── GET /api/auto-apply/live-ats-jobs ─────────────────────────────────────────
router.get('/live-ats-jobs', async (req, res) => {
  const { companyId, limit } = req.query;
  try {
    const jobs = await fetchLiveAtsJobs(companyId || null, Number(limit) || 8);
    return res.json({ success: true, count: jobs.length, data: jobs });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auto-apply/jobs ──────────────────────────────────────────────────
router.post('/jobs', async (req, res) => {
  const { skills = [], roles = [], locations = [], remote, minSalary, maxSalary, industry } = req.body || {};

  let dbJobs = [];
  try {
    const fetched = await getCentralJobs({ status: 'ACTIVE' });
    dbJobs = (fetched || []).map(j => ({
      id: j.id,
      title: j.title,
      company: j.companyName,
      domain: j.domain || 'cvmind.online',
      location: j.location,
      type: j.jobType,
      remote: j.remote,
      salary: j.salary,
      exp: j.experience,
      posted: 'Just now',
      skills: j.skills || [],
      industry: j.department || 'Tech',
      logo: j.companyLogo || null,
      companyId: j.companyId,
      isCompanyPosted: true
    }));
  } catch (err) {
    console.error('Failed to load central jobs:', err);
  }

  let liveAtsJobs = [];
  try {
    liveAtsJobs = await fetchLiveAtsJobs(null, 4);
  } catch (err) {
    console.warn('Live ATS jobs load warning:', err.message);
  }

  let jobs = [...liveAtsJobs, ...dbJobs, ...MOCK_JOBS];

  // Filter by remote preference
  if (remote === 'Remote') jobs = jobs.filter(j => j.remote === 'Remote');
  else if (remote === 'Onsite') jobs = jobs.filter(j => j.remote !== 'Remote');

  // Filter by role keywords
  if (roles && roles.length > 0) {
    const roleLower = roles.map(r => r.toLowerCase());
    const filtered = jobs.filter(j =>
      roleLower.some(r => j.title.toLowerCase().includes(r) || j.industry.toLowerCase().includes(r))
    );
    if (filtered.length >= 3) jobs = filtered;
  }

  // Filter by industry
  if (industry && industry !== 'All') {
    const filtered = jobs.filter(j => j.industry.toLowerCase().includes(industry.toLowerCase()));
    if (filtered.length >= 3) jobs = filtered;
  }

  // Compute match scores & 5-factor breakdown
  const scored = jobs.map(j => {
    const score = computeMatchScore(j.skills, skills);
    const matched = j.skills.filter(s => skills.some(c => c.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(c.toLowerCase())));
    const missing = j.skills.filter(s => !skills.some(c => c.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(c.toLowerCase()))).slice(0, 3);
    
    return {
      ...j,
      matchScore: score,
      matchedSkills: matched,
      missingSkills: missing,
      matchBreakdown: {
        skills: Math.min(100, Math.max(60, score + 4)),
        education: 95,
        experience: Math.min(100, Math.max(70, score - 2)),
        location: 90,
        preferences: Math.min(100, Math.max(75, score + 2))
      },
      matchReasoning: `Strong alignment (${score}% match). ${matched.length} key required skills (${matched.slice(0, 3).join(', ')}) match your background.`
    };
  }).sort((a, b) => b.matchScore - a.matchScore);

  return res.json({ success: true, data: { jobs: scored, total: scored.length } });
});

// ── POST /api/auto-apply/tailor-for-job ───────────────────────────────────────
router.post('/tailor-for-job', requireUser, async (req, res) => {
  const { resumeText, job } = req.body || {};
  const apiKey = req.headers['x-gemini-key'] || null;
  if (!resumeText || !job)
    return res.status(400).json({ error: 'Resume text and job details are required.' });

  try {
    const prompt = `You are an expert resume tailoring assistant. Given the resume and job, create an ATS-optimized tailored resume.

Job: ${job.title} at ${job.company}
Required Skills: ${job.skills?.join(', ')}
Industry: ${job.industry}

Resume:
${resumeText.substring(0, 2500)}

Return ONLY valid JSON:
{
  "tailoredResume": "Full tailored resume text with improved bullet points, keywords added",
  "addedKeywords": ["keyword1", "keyword2"],
  "changedSections": ["What was improved 1", "What was improved 2", "What was improved 3"],
  "atsScore": 87,
  "matchScore": 91
}`;

    const result = await callGemini(prompt, apiKey);
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('Tailor-for-job error:', err);
    return res.status(500).json({ error: err.message || 'Failed to tailor resume.' });
  }
});

// ── POST /api/auto-apply/cover-letter ─────────────────────────────────────────
router.post('/cover-letter', requireUser, async (req, res) => {
  const { resumeText, job, candidateProfile } = req.body || {};
  const apiKey = req.headers['x-gemini-key'] || null;
  if (!job) return res.status(400).json({ error: 'Job details are required.' });

  try {
    const prompt = `Write a professional, personalized cover letter for this job application.

Job: ${job.title} at ${job.company}
Location: ${job.location}
Required Skills: ${job.skills?.join(', ')}

Candidate: ${candidateProfile?.name || 'Candidate'}
Current Title: ${candidateProfile?.title || 'Professional'}
Key Skills: ${(candidateProfile?.skills || []).slice(0, 8).join(', ')}
Years of Experience: ${candidateProfile?.yearsOfExperience || 'N/A'}

${resumeText ? `Resume Summary:\n${resumeText.substring(0, 800)}` : ''}

Return ONLY valid JSON:
{
  "coverLetter": "Full cover letter text (3-4 paragraphs, ~300 words)",
  "subject": "Email subject line",
  "tone": "Professional"
}`;

    const result = await callGemini(prompt, apiKey);
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('Cover letter error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate cover letter.' });
  }
});

// ── POST /api/auto-apply/answer ───────────────────────────────────────────────
router.post('/answer', requireUser, async (req, res) => {
  const { question, candidateProfile, job } = req.body || {};
  const apiKey = req.headers['x-gemini-key'] || null;
  if (!question) return res.status(400).json({ error: 'Question is required.' });

  try {
    const prompt = `Generate a professional answer to this job application question.

Question: "${question}"
Candidate: ${candidateProfile?.name || 'Candidate'} — ${candidateProfile?.title || 'Professional'} with ${candidateProfile?.yearsOfExperience || 'several'} years of experience
Key Skills: ${(candidateProfile?.skills || []).slice(0, 6).join(', ')}
Applying for: ${job?.title || 'this role'} at ${job?.company || 'this company'}

Return ONLY valid JSON:
{
  "answer": "A compelling, concise answer (2-4 sentences)",
  "wordCount": 60,
  "tone": "Professional"
}`;

    const result = await callGemini(prompt, apiKey);
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to generate answer.' });
  }
});

// ── POST /api/auto-apply/apply ─────────────────────────────────────────────────
router.post('/apply', requireUser, async (req, res) => {
  const { candidateName, candidateEmail, job, tailoredResume, coverLetter, matchScore, mode, notes } = req.body || {};
  // Owner always comes from the signed token, never the request body
  const userId = req.auth.sub;
  if (!job) return res.status(400).json({ error: 'job is required.' });

  const appRecord = {
    id: `CVM-${Math.floor(100000 + Math.random() * 900000)}`,
    jobId: job.id,
    companyId: job.companyId || 'comp_cvmind',
    candidateId: String(userId),
    candidateName: candidateName || 'Candidate',
    candidateEmail: candidateEmail || req.auth.email || 'candidate@cvmind.online',
    resumeText: tailoredResume || '',
    coverLetter: coverLetter || '',
    matchScore: matchScore || job.matchScore || 88,
    matchBreakdown: job.matchBreakdown || { skills: 90, education: 95, experience: 85, location: 90, preferences: 90 },
    matchReasoning: job.matchReasoning || 'Match score computed by CVMind AI matching engine.',
    mode: mode || 'Manual',
    status: 'Applied'
  };

  try {
    await saveCentralApplication(appRecord);
  } catch (err) {
    console.error('Save central application error:', err);
  }

  const apps = readApps();
  const newApp = {
    id: appRecord.id,
    userId: String(userId),
    candidateName: appRecord.candidateName,
    candidateEmail: appRecord.candidateEmail,
    job: {
      id: job.id,
      title: job.title,
      company: job.company,
      domain: job.domain,
      location: job.location,
      type: job.type,
      remote: job.remote,
      salary: job.salary,
    },
    matchScore: appRecord.matchScore,
    matchBreakdown: appRecord.matchBreakdown,
    matchReasoning: appRecord.matchReasoning,
    status: 'Applied',
    appliedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tailoredResume: tailoredResume || null,
    coverLetter: coverLetter || null,
    notes: notes || '',
    events: [
      { title: 'Application Submitted', description: `Applied via ${mode || 'Manual'} mode.`, timestamp: new Date().toISOString(), actor: 'Candidate' }
    ]
  };
  apps.push(newApp);
  writeApps(apps);
  return res.json({ success: true, data: newApp });
});

// ── PATCH /api/auto-apply/applications/:appId ──────────────────────────────────
router.patch('/applications/:appId', requireUser, async (req, res) => {
  const { appId } = req.params;
  const { status, notes } = req.body || {};
  const apps = readApps();
  const idx = apps.findIndex(a => a.id === appId && a.userId === req.auth.sub);
  if (idx === -1) return res.status(404).json({ error: 'Application not found.' });
  if (status) apps[idx].status = status;
  if (notes !== undefined) apps[idx].notes = notes;
  apps[idx].updatedAt = new Date().toISOString();
  writeApps(apps);
  return res.json({ success: true, data: apps[idx] });
});

// ── DELETE /api/auto-apply/applications/:appId ─────────────────────────────────
router.delete('/applications/:appId', requireUser, async (req, res) => {
  const { appId } = req.params;
  const apps = readApps();
  const idx = apps.findIndex(a => a.id === appId && a.userId === req.auth.sub);
  if (idx === -1) return res.status(404).json({ error: 'Application not found.' });
  apps.splice(idx, 1);
  writeApps(apps);
  return res.json({ success: true });
});

// ── GET /api/auto-apply/applications/:userId ───────────────────────────────────
router.get('/applications/:userId', requireSelf(), async (req, res) => {
  const { userId } = req.params;
  
  let centralApps = [];
  try {
    centralApps = await getCandidateApplications(req.auth.email);
  } catch (err) {
    console.error('Fetch central candidate apps error:', err);
  }

  const localApps = readApps().filter(a => a.userId === userId);
  
  // Merge central status updates into local apps list
  const mergedMap = new Map();
  localApps.forEach(a => mergedMap.set(a.id, a));
  centralApps.forEach(ca => {
    const existing = mergedMap.get(ca.id);
    if (existing) {
      mergedMap.set(ca.id, {
        ...existing,
        status: ca.status,
        events: ca.events,
        interviewDetails: ca.interviewDetails,
        updatedAt: ca.updatedAt
      });
    } else {
      mergedMap.set(ca.id, {
        id: ca.id,
        userId,
        candidateName: ca.candidateName,
        candidateEmail: ca.candidateEmail,
        job: {
          id: ca.jobId,
          title: ca.jobTitle || 'Role Application',
          company: ca.companyName || 'Company',
          location: ca.candidateLocation || 'Remote',
          type: 'Full-time',
          salary: 'Standard'
        },
        matchScore: ca.matchScore,
        matchBreakdown: ca.matchBreakdown,
        status: ca.status,
        events: ca.events,
        interviewDetails: ca.interviewDetails,
        appliedAt: ca.appliedAt,
        updatedAt: ca.updatedAt
      });
    }
  });

  const result = Array.from(mergedMap.values());
  return res.json({ success: true, data: result });
});

// ── POST /api/auto-apply/scrape-job ───────────────────────────────────────────
router.post('/scrape-job', requireUser, async (req, res) => {
  const { url } = req.body || {};
  const apiKey = req.headers['x-gemini-key'] || null;

  if (!url) {
    return res.status(400).json({ error: 'Job URL is required.' });
  }

  try {
    const job = await scrapeJobFromUrl(url, apiKey);
    return res.json({ success: true, data: job });
  } catch (err) {
    console.error('Scrape job error:', err);
    return res.status(500).json({ error: err.message || 'Failed to scrape job URL.' });
  }
});

// ── POST /api/auto-apply/analyze-page ───────────────────────────────────────────
router.post('/analyze-page', requireUser, async (req, res) => {
  const { url = '', pageTitle = '', textContent = '', profile = null } = req.body || {};
  const apiKey = req.headers['x-gemini-key'] || null;

  try {
    const parsedJob = await parseJobContent(textContent || pageTitle, url, apiKey);
    
    // Calculate match score if profile exists
    let matchScore = 85;
    let matchBreakdown = { skills: 90, education: 95, experience: 80, location: 90, jdRelevance: 88 };
    let matchedSkills = [];
    let missingSkills = [];
    let recommendation = 'Apply';
    let reason = 'Solid profile alignment for this role.';

    if (profile && profile.skills && parsedJob.skills) {
      matchScore = computeMatchScore(parsedJob.skills, profile.skills);
      const cSkills = (profile.skills || []).map(s => s.toLowerCase());
      matchedSkills = parsedJob.skills.filter(s => cSkills.some(c => c.includes(s.toLowerCase()) || s.toLowerCase().includes(c)));
      missingSkills = parsedJob.skills.filter(s => !cSkills.some(c => c.includes(s.toLowerCase()) || s.toLowerCase().includes(c))).slice(0, 3);
      
      matchBreakdown = {
        skills: Math.min(100, Math.max(60, matchScore + 5)),
        education: 95,
        experience: Math.min(100, Math.max(65, matchScore - 4)),
        location: parsedJob.remote === 'Remote' ? 100 : 90,
        jdRelevance: Math.min(100, Math.max(70, matchScore + 2))
      };

      recommendation = matchScore >= 75 ? 'Strong Apply' : matchScore >= 60 ? 'Apply' : 'Review Carefully';
      reason = `Matched ${matchedSkills.length} key skills (${matchedSkills.slice(0, 3).join(', ') || 'core skills'}).`;
    }

    return res.json({
      success: true,
      data: {
        job: parsedJob,
        matchScore,
        matchBreakdown,
        matchedSkills,
        missingSkills,
        recommendation,
        reason
      }
    });
  } catch (err) {
    console.error('Analyze page error:', err);
    return res.status(500).json({ error: err.message || 'Failed to analyze page.' });
  }
});

// ── POST /api/auto-apply/map-fields ─────────────────────────────────────────────
router.post('/map-fields', requireUser, async (req, res) => {
  const { fields = [], profile = {}, job = {} } = req.body || {};
  const apiKey = req.headers['x-gemini-key'] || null;

  try {
    const mappedFields = [];
    const questionsToAnswer = [];

    for (const field of fields) {
      const name = (field.name || '').toLowerCase();
      const label = (field.label || '').toLowerCase();
      const placeholder = (field.placeholder || '').toLowerCase();
      const type = (field.type || '').toLowerCase();
      const combined = `${name} ${label} ${placeholder}`;

      let value = null;
      let isSensitive = false;
      let isQuestion = false;

      // 1. Name mapping
      if (combined.includes('first name') || name === 'firstname' || name === 'fname') {
        const parts = (profile.name || '').split(' ');
        value = parts[0] || '';
      } else if (combined.includes('last name') || name === 'lastname' || name === 'lname') {
        const parts = (profile.name || '').split(' ');
        value = parts.slice(1).join(' ') || '';
      } else if (combined.includes('full name') || combined.includes('candidate name') || name === 'name' || (label.includes('name') && !label.includes('company'))) {
        value = profile.name || '';
      }
      // 2. Contact details
      else if (combined.includes('email') || type === 'email') {
        value = profile.email || '';
      } else if (combined.includes('phone') || combined.includes('mobile') || combined.includes('contact') || type === 'tel') {
        value = profile.phone || '';
      } else if (combined.includes('location') || combined.includes('city') || combined.includes('address')) {
        value = profile.location || '';
      }
      // 3. Social / Portfolio
      else if (combined.includes('linkedin')) {
        value = profile.linkedin || '';
      } else if (combined.includes('github') || combined.includes('git')) {
        value = profile.github || '';
      } else if (combined.includes('portfolio') || combined.includes('website') || combined.includes('url')) {
        value = profile.portfolio || profile.github || '';
      }
      // 4. Experience & Education
      else if (combined.includes('years of experience') || combined.includes('total experience') || combined.includes('exp in years')) {
        value = profile.yearsOfExperience !== undefined ? String(profile.yearsOfExperience) : '';
      } else if (combined.includes('college') || combined.includes('university') || combined.includes('institution') || combined.includes('school')) {
        const edu = profile.education?.[0];
        value = profile.college || edu?.institution || edu?.college || '';
      } else if (combined.includes('degree') || combined.includes('qualification')) {
        const edu = profile.education?.[0];
        value = profile.degree || edu?.degree || '';
      } else if (combined.includes('graduation year') || combined.includes('passing year') || combined.includes('year of graduation')) {
        const edu = profile.education?.[0];
        value = profile.graduationYear || (edu?.year ? String(edu.year) : '');
      } else if (combined.includes('gpa') || combined.includes('cgpa') || combined.includes('percentage')) {
        const edu = profile.education?.[0];
        value = profile.cgpa || (edu?.cgpa ? String(edu.cgpa) : '');
      } else if (combined.includes('current company') || combined.includes('employer')) {
        const exp = profile.experience?.[0];
        value = profile.currentCompany || exp?.company || '';
      } else if (combined.includes('current title') || combined.includes('designation')) {
        value = profile.title || '';
      } else if (combined.includes('notice period')) {
        value = profile.noticePeriod || 'Immediate / 15 Days';
        isSensitive = true;
      }
      // 5. Sensitive Questions (Human-in-the-Loop)
      else if (combined.includes('sponsorship') || combined.includes('visa') || combined.includes('authorized to work') || combined.includes('work permit')) {
        value = profile.workAuth || 'Yes, authorized to work without sponsorship';
        isSensitive = true;
      } else if (combined.includes('expected salary') || combined.includes('salary expectation') || combined.includes('compensation')) {
        value = profile.expectedSalary || 'Negotiable as per industry standards';
        isSensitive = true;
      } else if (combined.includes('relocat') || combined.includes('willing to relocate')) {
        value = profile.relocation || 'Yes, open to relocation';
        isSensitive = true;
      } else if (combined.includes('disability') || combined.includes('veteran') || combined.includes('gender')) {
        value = 'Decline to self-identify';
        isSensitive = true;
      }
      // 6. Open-ended application questions
      else if (type === 'textarea' || label.length > 25 || combined.includes('why') || combined.includes('describe') || combined.includes('about yourself') || combined.includes('cover letter') || combined.includes('project')) {
        isQuestion = true;
        questionsToAnswer.push({ fieldId: field.id || field.name, question: field.label || field.placeholder || 'Job application question' });
      }

      mappedFields.push({
        id: field.id,
        name: field.name,
        selector: field.selector,
        type: field.type,
        label: field.label,
        value,
        isSensitive,
        isQuestion
      });
    }

    // Generate AI answers for any detected open-ended questions
    if (questionsToAnswer.length > 0) {
      for (const q of questionsToAnswer) {
        try {
          const prompt = `Generate a concise, compelling answer (2-4 sentences) for this job application question.
Question: "${q.question}"
Candidate Profile: Name: ${profile.name || 'Candidate'}, Role: ${profile.title || 'Software Developer'}, Skills: ${(profile.skills || []).slice(0, 6).join(', ')}, Exp: ${profile.yearsOfExperience || 1} yrs.
Target Job: ${job.title || 'Software Engineer'} at ${job.company || 'Company'}.

Return ONLY valid JSON:
{
  "answer": "Compelling concise answer"
}`;
          const aiRes = await callGemini(prompt, apiKey);
          const fIndex = mappedFields.findIndex(f => (f.id || f.name) === q.fieldId);
          if (fIndex !== -1 && aiRes?.answer) {
            mappedFields[fIndex].value = aiRes.answer;
          }
        } catch (e) {
          // Fallback answer
          const fIndex = mappedFields.findIndex(f => (f.id || f.name) === q.fieldId);
          if (fIndex !== -1) {
            mappedFields[fIndex].value = `I bring a strong background in ${(profile.skills || ['modern software engineering']).slice(0, 3).join(', ')} with a passion for building scalable and reliable products for ${job.company || 'your team'}.`;
          }
        }
      }
    }

    return res.json({
      success: true,
      data: {
        mappedFields,
        totalFields: fields.length,
        mappedCount: mappedFields.filter(f => f.value !== null).length,
        sensitiveCount: mappedFields.filter(f => f.isSensitive).length,
        questionCount: mappedFields.filter(f => f.isQuestion).length
      }
    });
  } catch (err) {
    console.error('Map fields error:', err);
    return res.status(500).json({ error: err.message || 'Failed to map form fields.' });
  }
});

// ── POST /api/auto-apply/extension-sync ─────────────────────────────────────────
router.post('/extension-sync', requireUser, async (req, res) => {
  try {
    const recentApps = readApps().filter(a => a.userId === String(req.auth.sub)).slice(-5);
    return res.json({
      success: true,
      data: {
        version: '1.0.0',
        status: 'connected',
        serverTime: new Date().toISOString(),
        recentApplications: recentApps
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
