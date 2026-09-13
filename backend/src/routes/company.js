import express from 'express';
import { 
  saveCompany, 
  findCompanyByEmail, 
  saveCentralJob, 
  getCentralJobs, 
  getJobApplications, 
  updateApplicationStatus 
} from '../db.js';

const router = express.Router();

// Helper to call Gemini for AI Job Parsing
async function callGeminiForJobParser(jobDescription, apiKey) {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    // Fallback parser if API key is missing
    const words = jobDescription.split(/\s+/);
    const skills = Array.from(new Set(
      words.filter(w => ['React', 'Node.js', 'Python', 'Java', 'TypeScript', 'JavaScript', 'AWS', 'SQL', 'Docker', 'Figma', 'CSS', 'HTML', 'Git', 'MongoDB', 'PostgreSQL', 'Express', 'Tailwind', 'REST', 'GraphQL', 'Machine Learning'].some(s => s.toLowerCase() === w.toLowerCase().replace(/[^a-z0-9]/gi, '')))
    ));
    if (skills.length === 0) skills.push('Problem Solving', 'Communication', 'Teamwork', 'Git');

    return {
      title: 'Extracted Role',
      department: 'Engineering',
      skills: skills,
      experience: '0–2 yrs',
      eligibility: 'Bachelor\'s Degree in CS/IT or equivalent experience',
      requirements: ['Proven hands-on experience in core software development', 'Strong problem solving skills']
    };
  }

  const prompt = `You are an AI Job Parser. Analyze the job description text below and return a JSON object with:
{
  "title": "extracted position title (e.g. Senior Frontend Engineer)",
  "department": "department (e.g. Engineering, Product, Design)",
  "skills": ["array", "of", "required", "skills"],
  "experience": "required experience string (e.g. 2–4 yrs)",
  "eligibility": "educational or key qualification requirement",
  "requirements": ["bullet point 1", "bullet point 2", "bullet point 3"]
}

Job Description:
"""
${jobDescription.substring(0, 3000)}
"""`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1024, responseMimeType: 'application/json' }
      })
    });
    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    return JSON.parse(rawText.replace(/```json\n?|```\n?/g, '').trim());
  } catch (err) {
    console.error('[AI JOB PARSER] Error:', err.message);
    return {
      title: 'Parsed Job Role',
      department: 'Engineering',
      skills: ['JavaScript', 'React', 'Problem Solving', 'Teamwork'],
      experience: '1–3 yrs',
      eligibility: 'Bachelor\'s degree',
      requirements: ['Technical skills matching job requirement']
    };
  }
}

// ── POST /api/company/register ─────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, website, industry, companySize, location, description, logo } = req.body || {};
    if (!name || !email) {
      return res.status(400).json({ error: 'Company name and official email are required.' });
    }

    const company = await saveCompany({
      name,
      email,
      website: website || '',
      industry: industry || 'Technology',
      companySize: companySize || '50–200 employees',
      location: location || 'Bengaluru, India',
      description: description || '',
      logo: logo || '',
      verified: true
    });

    return res.json({ success: true, company });
  } catch (err) {
    console.error('[COMPANY REGISTER] Error:', err);
    return res.status(500).json({ error: 'Failed to register company.' });
  }
});

// ── GET /api/company/profile ──────────────────────────────────────────────
router.get('/profile', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email parameter required.' });
    const company = await findCompanyByEmail(email);
    if (!company) {
      return res.status(404).json({ error: 'Company not found.' });
    }
    return res.json({ company });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch company profile.' });
  }
});

// ── POST /api/company/parse-job ───────────────────────────────────────────
router.post('/parse-job', async (req, res) => {
  try {
    const { jobDescription } = req.body || {};
    const apiKey = req.headers['x-gemini-key'] || null;

    if (!jobDescription || jobDescription.trim().length < 20) {
      return res.status(400).json({ error: 'Job description text is required for parsing.' });
    }

    const parsed = await callGeminiForJobParser(jobDescription, apiKey);
    return res.json({ success: true, parsed });
  } catch (err) {
    console.error('[AI JOB PARSER] Failed:', err);
    return res.status(500).json({ error: 'Failed to parse job description.' });
  }
});

// ── POST /api/company/jobs ────────────────────────────────────────────────
router.post('/jobs', async (req, res) => {
  try {
    const { 
      companyId, companyName, companyLogo, domain, title, department, jobType, 
      experience, location, remote, salary, deadline, description, requirements, 
      skills, allowAutoApply, maxApplications 
    } = req.body || {};

    if (!title || !description) {
      return res.status(400).json({ error: 'Job title and description are required.' });
    }

    const job = await saveCentralJob({
      companyId: companyId || 'comp_cvmind',
      companyName: companyName || 'TechCorp Global',
      companyLogo: companyLogo || '',
      domain: domain || 'techcorp.ai',
      title,
      department: department || 'Engineering',
      jobType: jobType || 'Full-time',
      experience: experience || '1–3 yrs',
      location: location || 'Bengaluru, India',
      remote: remote || 'Hybrid',
      salary: salary || '₹15L–₹25L/yr',
      deadline: deadline || '',
      description,
      requirements: requirements || '',
      skills: Array.isArray(skills) ? skills : (skills ? skills.split(',').map(s => s.trim()) : []),
      allowAutoApply: allowAutoApply ?? true,
      maxApplications: Number(maxApplications) || 100,
      status: 'ACTIVE'
    });

    return res.json({ success: true, job });
  } catch (err) {
    console.error('[POST JOB] Error:', err);
    return res.status(500).json({ error: 'Failed to publish job.' });
  }
});

// ── GET /api/company/jobs ─────────────────────────────────────────────────
router.get('/jobs', async (req, res) => {
  try {
    const { companyId } = req.query;
    const filter = {};
    if (companyId) filter.companyId = companyId;

    const jobs = await getCentralJobs(filter);
    return res.json({ jobs });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch jobs.' });
  }
});

// ── GET /api/company/jobs/:id/applicants ────────────────────────────────
router.get('/jobs/:id/applicants', async (req, res) => {
  try {
    const { id } = req.params;
    const applicants = await getJobApplications(id);
    return res.json({ applicants });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch applicants.' });
  }
});

// ── POST /api/company/applicants/:id/status ─────────────────────────────
router.post('/applicants/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, actorName, interviewDetails } = req.body || {};

    if (!status) {
      return res.status(400).json({ error: 'New status is required.' });
    }

    const updatedApp = await updateApplicationStatus(id, status, actorName || 'Recruiter', interviewDetails || null);
    if (!updatedApp) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    return res.json({ success: true, application: updatedApp });
  } catch (err) {
    console.error('[UPDATE APPLICANT STATUS] Error:', err);
    return res.status(500).json({ error: 'Failed to update applicant status.' });
  }
});

// ── POST /api/company/interviews ─────────────────────────────────────────
router.post('/interviews', async (req, res) => {
  try {
    const { applicationId, date, time, meetingLink, type, notes, recruiterName } = req.body || {};

    if (!applicationId || !date || !time) {
      return res.status(400).json({ error: 'Application ID, date, and time are required.' });
    }

    const interviewDetails = {
      date,
      time,
      meetingLink: meetingLink || 'https://meet.google.com/cvm-prep-room',
      type: type || 'Technical Interview',
      notes: notes || 'Please review your project code and core fundamentals before the interview.'
    };

    const updatedApp = await updateApplicationStatus(
      applicationId, 
      'Interview', 
      recruiterName || 'Hiring Manager', 
      interviewDetails
    );

    return res.json({ success: true, application: updatedApp });
  } catch (err) {
    console.error('[SCHEDULE INTERVIEW] Error:', err);
    return res.status(500).json({ error: 'Failed to schedule interview.' });
  }
});

export default router;
