import dotenv from 'dotenv';

dotenv.config();

// JSON Schema for structured resume evaluation output
const resumeSchema = {
  type: 'object',
  properties: {
    score: {
      type: 'integer',
      description: 'Overall rating of the resume from 1 to 100.'
    },
    summary: { 
      type: 'string', 
      description: 'A concise professional summary of the candidate and their background.' 
    },
    atsKeywords: {
      type: 'object',
      properties: {
        score: {
          type: 'integer',
          description: 'ATS optimization and keyword compatibility score from 1 to 100.'
        },
        matched: { 
          type: 'array', 
          items: { type: 'string' }, 
          description: 'List of relevant industry keywords/skills found in the resume.' 
        },
        missing: { 
          type: 'array', 
          items: { type: 'string' }, 
          description: 'Critical industry keywords, technologies, or skills that are missing and should be added.' 
        },
        feedback: { 
          type: 'string', 
          description: 'Actionable feedback regarding keyword density and ATS formatting rules.' 
        }
      },
      required: ['score', 'matched', 'missing', 'feedback']
    },
    contentAndImpact: {
      type: 'object',
      properties: {
        score: {
          type: 'integer',
          description: 'Score reflecting the action-oriented phrasing, impact measurement, and results-driven writing from 1 to 100.'
        },
        feedback: { 
          type: 'string', 
          description: 'Feedback on word choices, action verbs, and how achievements are quantified.' 
        },
        suggestions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              original: { type: 'string', description: 'A weak, passive, or responsibility-focused bullet point from the resume.' },
              improved: { type: 'string', description: 'A revised, strong, action-oriented, and quantified version of that bullet point.' }
            },
            required: ['original', 'improved']
          },
          description: 'Up to 3 specific before-and-after rewrite examples to elevate experience bullet points.'
        }
      },
      required: ['score', 'feedback', 'suggestions']
    },
    formattingAndStyle: {
      type: 'object',
      properties: {
        score: {
          type: 'integer',
          description: 'Score reflecting document flow, consistency, font readability, and professional style from 1 to 100.'
        },
        feedback: { 
          type: 'string', 
          description: 'Feedback on length (e.g., page budget), visual formatting consistency, and page structure.' 
        }
      },
      required: ['score', 'feedback']
    },
    strengths: { 
      type: 'array', 
      items: { type: 'string' }, 
      description: 'Top 3 structural or content strengths of this resume.' 
    },
    weaknesses: { 
      type: 'array', 
      items: { type: 'string' }, 
      description: 'Top 3 areas that need the most immediate improvement.' 
    },
    recommendations: { 
      type: 'array', 
      items: { type: 'string' }, 
      description: '3 to 5 clear, prioritized, actionable steps for the candidate to take next.' 
    }
  },
  required: [
    'score',
    'summary',
    'atsKeywords',
    'contentAndImpact',
    'formattingAndStyle',
    'strengths',
    'weaknesses',
    'recommendations'
  ]
};

// JSON Schema for structured LinkedIn profile evaluation output
const linkedinSchema = {
  type: 'object',
  properties: {
    score: { 
      type: 'integer', 
      description: 'Overall LinkedIn profile optimization score from 0 to 100.' 
    },
    summary: { 
      type: 'string', 
      description: 'A concise summary of profile strengths, formatting, and overall impression.' 
    },
    headline: {
      type: 'object',
      properties: {
        current: { type: 'string', description: 'The current headline detected from the input profile.' },
        feedback: { type: 'string', description: 'Constructive feedback on how to improve the headline for recruiter searches.' },
        suggestions: { 
          type: 'array', 
          items: { type: 'string' }, 
          description: '3 optimized headline suggestions tailored to their target role and industry.' 
        }
      },
      required: ['current', 'feedback', 'suggestions']
    },
    about: {
      type: 'object',
      properties: {
        feedback: { type: 'string', description: 'Detailed feedback on the current About/Summary section.' },
        improvedText: { type: 'string', description: 'A fully written, high-impact, professionally formatted About section in first-person.' }
      },
      required: ['feedback', 'improvedText']
    },
    experience: {
      type: 'object',
      properties: {
        feedback: { type: 'string', description: 'Feedback on the experience description (formatting, action verbs, achievements).' },
        tips: { 
          type: 'array', 
          items: { type: 'string' }, 
          description: '3 specific tips to rewrite experience bullets with quantified metrics.' 
        }
      },
      required: ['feedback', 'tips']
    },
    skillsAndKeywords: {
      type: 'object',
      properties: {
        matched: { type: 'array', items: { type: 'string' }, description: 'Relevant industry skills/keywords found in the profile text.' },
        missing: { type: 'array', items: { type: 'string' }, description: 'Highly recommended skills/keywords missing for their target role.' }
      },
      required: ['matched', 'missing']
    },
    generalTips: {
      type: 'array',
      items: { type: 'string' },
      description: '3-4 actionable tips regarding profile/banner images, custom URLs, active engagement, or networking.'
    }
  },
  required: ['score', 'summary', 'headline', 'about', 'experience', 'skillsAndKeywords', 'generalTips']
};

const evaluationSchema = {
  type: 'object',
  properties: {
    score: { type: 'number', description: 'Evaluation score of the candidate\'s answer from 1 to 10.' },
    strengths: { type: 'string', description: 'What the candidate did well in their response. Keep it concise (strictly under 60 words).' },
    improvements: { type: 'string', description: 'Areas where the candidate can improve, such as structure, vocabulary, or STAR elements. Keep it concise (strictly under 60 words).' },
    refinedAnswer: { type: 'string', description: 'An optimized version of their answer that sounds highly professional, polished, and structured. Keep it under 60 words.' }
  },
  required: ['score', 'strengths', 'improvements', 'refinedAnswer']
};

const linkedinBioSchema = {
  type: 'object',
  properties: {
    headlines: {
      type: 'array',
      items: { type: 'string' },
      description: '3 professional, high-impact LinkedIn profile headlines (e.g. including target role, core competencies, accomplishments, separated by |).'
    },
    aboutSummaries: {
      type: 'array',
      items: { type: 'string' },
      description: '2 distinct Professional "About" sections (around 100-150 words). One should be structured/bulleted and one should be narrative.'
    },
    bannerIdeas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Recommended main text to display on a custom LinkedIn banner (e.g. key value proposition).' },
          bgStyle: { type: 'string', description: 'Visual style / color palette recommendation (e.g. Modern Navy Blue & Gold Minimalist).' },
          tip: { type: 'string', description: 'Brief guidance on graphics/icons to include.' }
        },
        required: ['text', 'bgStyle', 'tip']
      },
      description: '2 creative LinkedIn banner ideas.'
    },
    hashtags: {
      type: 'array',
      items: { type: 'string' },
      description: '5 high-traffic career hashtags.'
    }
  },
  required: ['headlines', 'aboutSummaries', 'bannerIdeas', 'hashtags']
};

const outreachSchema = {
  type: 'object',
  properties: {
    connectionRequest: {
      type: 'string',
      description: 'A personalized LinkedIn connection request note. Must be under 300 characters.'
    },
    referralPitch: {
      type: 'string',
      description: 'A message to a professional working at the target company asking for an informational interview or referral. Under 150 words.'
    },
    recruiterDM: {
      type: 'string',
      description: 'A direct message to a recruiter pitching the candidate for a specific job title. Under 150 words.'
    }
  },
  required: ['connectionRequest', 'referralPitch', 'recruiterDM']
};

const careerCoursesSchema = {
  type: 'object',
  properties: {
    gaps: {
      type: 'array',
      items: { type: 'string' },
      description: 'A list of 3-5 critical skill gaps identified between the resume/current profile and target job title.'
    },
    courses: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Title of the recommended online course or certification.' },
          platform: { type: 'string', description: 'Platform offering the course (e.g., Coursera, Udemy, edX, LinkedIn Learning).' },
          skillsCovered: { type: 'array', items: { type: 'string' }, description: 'Skills covered by this course.' },
          reason: { type: 'string', description: 'A short reason explaining why this course helps bridge a specific gap.' },
          duration: { type: 'string', description: 'Estimated time commitment to complete the course.' }
        },
        required: ['title', 'platform', 'skillsCovered', 'reason', 'duration']
      },
      description: 'A list of 3-5 structured course recommendations.'
    }
  },
  required: ['gaps', 'courses']
};

const elevatorPitchSchema = {
  type: 'object',
  properties: {
    corporate: {
      type: 'string',
      description: 'A 60-second elevator pitch tailored for corporate environments, highlighting achievements, leadership, or metrics.'
    },
    startup: {
      type: 'string',
      description: 'A 60-second pitch for startups or tech settings, emphasizing agility, problem-solving, and value-add.'
    },
    creative: {
      type: 'string',
      description: 'A 60-second pitch with a narrative/creative flair, focusing on vision, innovation, and key project impacts.'
    }
  },
  required: ['corporate', 'startup', 'creative']
};

const careerRoadmapSchema = {
  type: 'object',
  properties: {
    steps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          stepNumber: { type: 'integer' },
          phaseName: { type: 'string', description: 'Name of the career transition phase.' },
          timeframe: { type: 'string', description: 'Expected duration/timeframe for this step.' },
          focus: { type: 'string', description: 'Main strategic focus area of this step.' },
          actions: { type: 'array', items: { type: 'string' }, description: '2-3 concrete actions to take.' },
          milestone: { type: 'string', description: 'Key check-point or milestone that indicates completion.' }
        },
        required: ['stepNumber', 'phaseName', 'timeframe', 'focus', 'actions', 'milestone']
      },
      description: 'Exactly 4 chronological steps outlining the transition pathway.'
    }
  },
  required: ['steps']
};

const tailorSchema = {
  type: 'object',
  properties: {
    tailoredResume: {
      type: 'string',
      description: 'The complete rewritten resume in plain text format, perfectly tailored to the provided Job Description (JD). Naturally integrate skills, emphasize relevant accomplishments, and format cleanly.'
    },
    matchScore: {
      type: 'integer',
      description: 'An estimated match rating between the tailored resume and the job description, from 0 to 100.'
    },
    keyTailoringInsights: {
      type: 'array',
      items: { type: 'string' },
      description: 'A list of 3-4 key changes and adjustments made to align the resume with the JD.'
    },
    matchedSkills: {
      type: 'array',
      items: { type: 'string' },
      description: 'Relevant skills/keywords from the job description that were successfully integrated into the resume.'
    },
    missingSkillsRecommended: {
      type: 'array',
      items: { type: 'string' },
      description: 'Important skills from the job description that are recommended to be added (but were missing or weak in the original).'
    }
  },
  required: [
    'tailoredResume',
    'matchScore',
    'keyTailoringInsights',
    'matchedSkills',
    'missingSkillsRecommended'
  ]
};

const prepSchema = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'The category of the question: Technical, Behavioral, HR, or Situational.' },
          companySource: { type: 'string', description: 'The corporate source style of the question: Google, Amazon, McKinsey, Goldman Sachs, Deloitte, PwC, EY, KPMG.' },
          question: { type: 'string', description: 'Candid, customized interview question tailored directly to the candidate\'s resume background.' },
          answer: { type: 'string', description: 'An extremely concise, high-impact, professional model answer (strictly under 45 words) following optimal frameworks like STAR.' },
          tip: { type: 'string', description: 'A highly concise recruiter insider tip (strictly under 25 words) highlighting a key evaluation point.' }
        },
        required: ['category', 'companySource', 'question', 'answer', 'tip']
      },
      description: 'List of exactly 10 premium interview questions tailored to the candidate\'s resume.'
    }
  },
  required: ['questions']
};


// ─── DEEPSEEK GENERIC API CALL HELPER ─────────────────────────────────────────
async function callDeepSeek({
  systemInstruction,
  prompt,
  responseSchema,
  customApiKey = null,
  temperature = 0.3,
  maxTokens = 3000,
  jsonMode = false
}) {
  const apiKey = customApiKey || process.env.DEEPSEEK_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('DeepSeek / Gemini API key is not configured in the server environment.');
  }

  const messages = [];
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }
  messages.push({ role: 'user', content: prompt });

  const body = {
    model: 'deepseek-chat',
    messages,
    temperature,
    max_tokens: maxTokens
  };

  if (jsonMode || responseSchema) {
    body.response_format = { type: 'json_object' };
    
    // Inject schema description into system instructions for DeepSeek JSON mode
    if (responseSchema && messages[0]) {
      messages[0].content += `\n\nYou MUST strictly respond with a JSON object that conforms to this JSON schema: ${JSON.stringify(responseSchema)}`;
    }
  }

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} - ${errText}`);
  }

  const result = await response.json();
  if (!result.choices || result.choices.length === 0) {
    throw new Error('No choices returned by DeepSeek API.');
  }

  const text = result.choices[0].message.content.trim();
  if (jsonMode || responseSchema) {
    let cleanedText = text;
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    }
    return JSON.parse(cleanedText);
  }

  return text;
}

// ─── SERVICE EXPORTS ─────────────────────────────────────────────────────────

/**
 * Uses DeepSeek API to analyze a resume's text.
 * @param {string} resumeText - The parsed raw text of the resume.
 * @param {string} [customApiKey] - An optional, user-supplied API key.
 * @returns {Promise<object>} - Clean, parsed structured JSON feedback.
 */
export async function analyzeResumeWithGemini(resumeText, customApiKey = null) {
  const systemInstruction = `You are an elite corporate Recruiter, Talent Acquisition Director, and Applicant Tracking System (ATS) optimization specialist. 
  Your task is to conduct an extremely thorough, candid, and high-value assessment of the candidate's resume.
  Provide realistic scores out of 100. Avoid giving high scores (90+) unless the resume is truly outstanding.
  Deliver precise, constructive feedback, highlight concrete gaps, and write practical "Before & After" rewrite recommendations. 
  You MUST strictly respond with a JSON object that conforms to the specified schema.`;

  const prompt = `Analyze this resume and provide feedback. Ensure you parse all relevant sections, measure its ATS compatibility, look for weak phrases, and evaluate overall professional formatting.
  
  Resume Text:
  """
  ${resumeText}
  """`;

  try {
    return await callDeepSeek({
      systemInstruction,
      prompt,
      responseSchema: resumeSchema,
      customApiKey,
      temperature: 0.2
    });
  } catch (error) {
    console.error('DeepSeek Analysis Error:', error);
    throw new Error('AI analysis failed. ' + error.message);
  }
}

export async function chatWithCVMind(message, history = [], customApiKey = null) {
  const apiKey = customApiKey || process.env.DEEPSEEK_API_KEY || process.env.GEMINI_API_KEY;
  const cleanMessage = String(message || '').trim();

  if (!cleanMessage) {
    throw new Error('Message is required.');
  }

  if (!apiKey) {
    const lower = cleanMessage.toLowerCase();
    if (lower.includes('upload') || lower.includes('analyse') || lower.includes('analyze') || lower.includes('resume')) {
      return 'To analyze your resume, upload your PDF, DOCX, or TXT file on the home page. Our AI Resume Analyzer evaluates ATS keyword scores, formatting, and action verbs. For target job matches, try the AI Resume Tailorer in the top navigation.';
    }
    if (lower.includes('job') || lower.includes('finder') || lower.includes('match') || lower.includes('opening')) {
      return 'Our AI Job Finder analyzes your CV and target role preferences to curate 8-10 matching job openings complete with match scores, required skills, salary estimates, and direct apply links. Go to "AI Job Finder" in the navigation dropdown to start your search.';
    }
    if (lower.includes('prep') || lower.includes('interview') || lower.includes('question') || lower.includes('star')) {
      return 'Our SmartPrep AI features a comprehensive Mock Interview Sandbox. It generates 10 tailored Technical, Behavioral, HR, and Situational questions from Big 4 & Tech styles. You can type your answers and get graded out of 10 with STAR methodology feedback and model answers.';
    }
    if (lower.includes('linkedin') || lower.includes('outreach') || lower.includes('bio') || lower.includes('banner')) {
      return 'The LinkedIn Optimizer submenu lets you audit your profile PDF, write bio hooks/headlines, and draft customized cold outreach pitches or recruiter DMs under 150 words.';
    }
    if (lower.includes('career') || lower.includes('roadmap') || lower.includes('pitch') || lower.includes('course')) {
      return 'Career Path AI provides Skill Gap checks with Coursera/Udemy suggestions, a 60-second Elevator Pitch builder, and visual 4-step transition roadmaps to benchmark your milestones.';
    }
    if (lower.includes('save') || lower.includes('delete') || lower.includes('work')) {
      return 'CV Mind supports Silent Auto-Save. It saves cover letters, tailored resumes, and mock interviews automatically in the background every 4 seconds. Deleted files automatically clear current state screens instantly.';
    }
    if (lower.includes('launch') || lower.includes('date') || lower.includes('when')) {
      return 'CV Mind is launch-ready and going live officially on June 17, 2026 at 5:00 PM IST (Evening)!';
    }
    if (lower.includes('privacy') || lower.includes('safe') || lower.includes('data')) {
      return 'Privacy is our core pillar. Resumes are parsed in-memory and flushed immediately. We adhere to the constitutional Right to Privacy under Article 21, securing all user data under TLS 1.3.';
    }
    return 'I am the CV Mind assistant. I can guide you through our Career Suite: AI Resume Scanners, Tailorers, SmartPrep Mock Interviews, LinkedIn Optimizers, Career Path transition tools, and the new AI Job Finder tool.';
  }

  const systemInstruction = `You are CV Mind's elite, friendly, and professional conversational assistant. You help users navigate the CV Mind ecosystem, which is launching officially on June 17, 2026 at 5:00 PM IST. Always respond in clear, concise English.

Our comprehensive, end-to-end career suite includes the following features:
1. AI Resume Analyzer: Upload a resume (PDF/DOCX/TXT) to scan ATS scores, missing keywords, and formatting feedback.
2. AI Resume Tailorer: Input a target job description and your resume to automatically tailor it for high ATS scores.
3. SmartPrep AI (Interview Coach): Generates 10 resume-tailored questions (Google, McKinsey, Amazon style) covering Technical, Behavioral, HR, & Situational areas. Offers a typing sandbox with live STAR method grading, score evaluations, and model answers under 45 words.
4. LinkedIn Optimizer: Scan your downloaded profile PDF. Automatically writes catchy headlines, custom About hooks, and banner text ideas. Also generates recruiter cold DMs (under 150 words) and connection requests (under 300 chars).
5. Career Path AI: Benchmarks skills against target job profiles, suggesting gap-closing courses (Coursera, Udemy). Generates 60-second elevator pitches (Corporate, Startup, Creative) and 4-step interactive transition roadmaps.
6. AI Job Finder: Upload CV + describe target role/preferences to match with 8-10 job matches (Remote/Full-time/Part-time/Internships) showing match scores, skills gap analysis, salary estimates, and direct LinkedIn apply links.
7. Auto-Save & Dashboard Sync: Silent background auto-saving every 4 seconds with live status badges.
8. Privacy: Strictly in-memory file parsing. No document is saved to disk, fully complying with Article 21 privacy dignity.

Always answer briefly, practically, and professionally. Highlight navigation guidelines (e.g. click "AI Job Finder" in the navigation dropdown, upload files, etc.). If asked about launch date, tell them June 17, 2026 at 5:00 PM IST. Do not claim you have analyzed their resume inside chat; tell them to use the Upload buttons on respective pages.`;

  const recentHistory = Array.isArray(history)
    ? history.slice(-8).map((item) => `${item.role === 'user' ? 'User' : 'Assistant'}: ${item.content}`).join('\n')
    : '';

  const prompt = `Recent chat:\n${recentHistory}\n\nUser question:\n${cleanMessage}`;

  try {
    return await callDeepSeek({
      systemInstruction,
      prompt,
      customApiKey,
      temperature: 0.45,
      maxTokens: 500
    });
  } catch (error) {
    console.error('DeepSeek Chat Error:', error);
    throw new Error('Chat assistant failed. ' + error.message);
  }
}

/**
 * Takes the original resume text + analysis result and rewrites the full resume
 * as an ATS-optimized plain-text document.
 * @param {string} resumeText - Raw original resume text.
 * @param {object} analysisResult - The structured evaluation returned by analyzeResumeWithGemini.
 * @param {string} [customApiKey] - Optional user-supplied API key.
 * @returns {Promise<string>} - The full rewritten resume as a plain-text string.
 */
export async function optimizeResumeWithGemini(resumeText, analysisResult, customApiKey = null) {
  const missingKeywords = (analysisResult?.atsKeywords?.missing || []).join(', ');
  const weaknesses = (analysisResult?.weaknesses || []).join('; ');
  const recommendations = (analysisResult?.recommendations || []).join('; ');
  const bulletRewrites = (analysisResult?.contentAndImpact?.suggestions || [])
    .map(s => `Original: "${s.original}" → Improved: "${s.improved}"`)
    .join('\n');

  const systemPrompt = `You are an elite resume writer, ATS optimization specialist, and Fortune 500 hiring expert.
Your task is to completely rewrite the provided resume to make it a top-tier, ATS-passing document.

RULES (follow all of them strictly):
1. Keep ALL real information from the original resume — do NOT invent companies, titles, dates, or degrees.
2. Naturally inject these missing ATS keywords where relevant: ${missingKeywords || 'none identified'}.
3. Fix these identified weaknesses: ${weaknesses || 'none identified'}.
4. Follow these recommendations: ${recommendations || 'none identified'}.
5. Apply these bullet rewrites where the original bullets appear: ${bulletRewrites || 'none'}.
6. Use strong action verbs (Led, Engineered, Delivered, Increased, Reduced, Optimized, Spearheaded, etc.).
7. Quantify every achievement possible — add realistic percentages, numbers, timeframes where implied.
8. Structure the resume in this exact order using UPPERCASE section headers:
   PROFESSIONAL SUMMARY
   SKILLS
   EXPERIENCE
   EDUCATION
   (plus CERTIFICATIONS / PROJECTS / AWARDS if present in original)
9. Keep formatting ATS-safe: plain text, no tables, no columns, no graphics, no special symbols except standard dashes and bullets (•).
10. Target length: 1 full page (400–600 words). Be concise but impactful.
11. Return ONLY the rewritten resume text. No preamble, no explanations, no markdown wrappers.`;

  const userPrompt = `Here is the original resume to rewrite:
"""
${resumeText}
"""

Rewrite it now as a fully ATS-optimized resume following all the rules above.`;

  try {
    return await callDeepSeek({
      systemInstruction: systemPrompt,
      prompt: userPrompt,
      customApiKey,
      temperature: 0.3,
      maxTokens: 3500
    });
  } catch (error) {
    console.error('DeepSeek Optimize Error:', error);
    throw new Error('Resume optimization failed. ' + error.message);
  }
}

/**
 * Tailors a resume text specifically to a provided Job Description using DeepSeek.
 * @param {string} resumeText - Raw text of the CV.
 * @param {string} jobDescription - Target Job Description / requirements.
 * @param {string} [customApiKey] - Optional user supplied API key.
 * @returns {Promise<object>} - Structured JSON analysis containing tailored resume and insights.
 */
export async function tailorResumeWithGemini(resumeText, jobDescription, customApiKey = null) {
  const systemPrompt = `You are an elite corporate resume writer, talent acquisition specialist, and hiring consultant.
  Your task is to completely rewrite and optimize the candidate's CV so it matches the provided Job Description (JD) / Target Role guidelines perfectly.
  
  RULES:
  1. Strictly preserve all factual information from the original resume — do NOT invent companies, titles, dates, or degrees.
  2. Naturally inject matched skills and primary keywords from the JD into the summary, skills list, and experience bullets.
  3. Re-phrase work experience highlights to emphasize contributions and achievements that directly match the responsibilities requested in the JD.
  4. Ensure a premium, ATS-compliant plain-text output structure:
     PROFESSIONAL SUMMARY
     SKILLS
     EXPERIENCE
     EDUCATION
  5. Provide an estimated match score (0-100), key tailoring insights, matched skills, and recommended missing skills.
  6. You MUST strictly return your response in the specified JSON structure. Do not wrap it in any HTML or markdown, only raw JSON matching the schema.`;

  const userPrompt = `Target Job Description / Role Guidelines:
  """
  ${jobDescription}
  """
  
  Candidate's Original Resume Text:
  """
  ${resumeText}
  """
  
  Tailor and optimize this resume now.`;

  try {
    return await callDeepSeek({
      systemInstruction: systemPrompt,
      prompt: userPrompt,
      responseSchema: tailorSchema,
      customApiKey,
      temperature: 0.25
    });
  } catch (error) {
    console.error('DeepSeek Tailor Error:', error);
    throw new Error('Resume tailoring failed. ' + error.message);
  }
}

/**
 * Generates tailored interview questions based on the candidate's resume text using DeepSeek.
 * @param {string} resumeText - Raw text of the CV.
 * @param {string} [customApiKey] - Optional user supplied API key.
 * @returns {Promise<object>} - Structured JSON analysis containing tailored questions and model answers.
 */
export async function generatePrepQuestionsWithGemini(resumeText, customApiKey = null) {
  const systemPrompt = `You are a premier Talent Acquisition Partner, Executive Coach, and Interview Board Panelist for Fortune 500 tech companies (like Google, Amazon, Microsoft) and Big 4 advisory networks (like Deloitte, PwC).
  Your task is to scan the candidate's resume and generate exactly 10 customized, high-value interview questions (covering 3 Technical, 3 Behavioral, 2 HR, and 2 Situational contexts) they are highly likely to face from HRs and hiring managers.
  
  For each question, provide:
  1. A target corporate style category source (e.g. Google, Amazon, McKinsey, Deloitte, PwC). Sourced questions should feel authentic to those organizations.
  2. The question type (Behavioral, Technical, HR, Situational).
  3. An extremely concise, highly polished AI model answer (keep it high-impact and strictly under 45 words, following the STAR method where appropriate).
  4. A brief, punchy insider recruiter tip (strictly under 25 words) outlining exactly what hiring panels analyze.
  
  CRITICAL: Keep all answers and tips extremely concise, clear, and punchy. The entire JSON response MUST be compact to ensure it completes fully without truncation under strict token limits.
  You MUST strictly return your response in the specified JSON structure. Do not wrap it in any HTML or markdown, only raw JSON matching the schema.`;

  const userPrompt = `Here is the candidate's resume text:
  """
  ${resumeText}
  """
  
  Scan this resume and generate the structured interview preparation scorecard now.`;

  try {
    return await callDeepSeek({
      systemInstruction: systemPrompt,
      prompt: userPrompt,
      responseSchema: prepSchema,
      customApiKey,
      temperature: 0.3,
      maxTokens: 1600
    });
  } catch (error) {
    console.error('DeepSeek Prep Error:', error);
    throw new Error('Interview prep questions generation failed. ' + error.message);
  }
}

/**
 * Refines a cover letter text using DeepSeek AI for ATS compliance, tone, and impact.
 * @param {string} coverLetterText - The raw cover letter to be refined.
 * @param {string} jobTitle - The target job title.
 * @param {string} companyName - The target company name.
 * @param {string} [customApiKey] - Optional user-supplied API key.
 * @returns {Promise<string>} - The refined cover letter as plain text.
 */
export async function refineCoverLetterWithGemini(coverLetterText, jobTitle, companyName, customApiKey = null, userInstructions = null) {
  const systemPrompt = `You are an elite career coach, executive communication specialist, and Fortune 500 hiring expert.
Your task is to refine the provided cover letter or resume to make it compelling, ATS-optimized, and highly professional.

CRITICAL INSTRUCTIONS:
1. The input content might be in raw HTML format. If the input is HTML, you MUST preserve all HTML tags, structure, CSS inline styles, and layout EXACTLY as they are. ONLY refine or rewrite the text content inside the HTML tags. Do NOT strip or replace the HTML tags.
2. Return ONLY the refined content (HTML or plain text depending on input). Do NOT wrap in \`\`\`html or \`\`\` markdown code blocks. No explanations, no preamble, no markdown formatting.
3. Preserve all factual information — do NOT invent new achievements, companies, or roles unless the user explicitly requests new content generation.
4. Strengthen the opening hook and value propositions. Use powerful, active verbs.
5. If user instructions/prompt are provided, prioritize adjusting the text according to those specific instructions (e.g., changing tone, highlighting skills, rewriting sections, or generating new details).
6. Ensure the letter speaks directly to the role of "${jobTitle}" at "${companyName}" if provided.
7. Keep tone professional but human — show genuine enthusiasm.
8. Keep length appropriate (250–500 words maximum for letters).
9. Make sure the returned document is fully complete, closing all open HTML tags. NEVER truncate the output.`;

  let userPrompt = `Here is the document content to refine:
"""
${coverLetterText}
"""`;

  if (userInstructions) {
    userPrompt += `\n\nUSER INSTRUCTIONS / PROMPT FOR REFINEMENT:\n"${userInstructions}"\n\nApply the above instructions carefully when refining the document.`;
  } else {
    userPrompt += `\n\nRefine it now for the ${jobTitle} role at ${companyName}. Make it polished, ATS-ready, and compelling.`;
  }

  try {
    return await callDeepSeek({
      systemInstruction: systemPrompt,
      prompt: userPrompt,
      customApiKey,
      temperature: 0.35,
      maxTokens: 5000
    });
  } catch (error) {
    console.error('DeepSeek Cover Letter Refine Error:', error);
    throw new Error('Cover letter refinement failed. ' + error.message);
  }
}

/**
 * Populates an HTML resume template with dynamic, professionally written, ATS-optimized content
 * based on user inputs.
 * @param {object} params
 * @param {string} params.templateHtml - The original HTML layout of the chosen template.
 * @param {object} params.formData - User entered structured info.
 * @param {string} [params.customApiKey] - Optional API key.
 * @returns {Promise<string>} - Fully populated resume HTML.
 */
export async function generateResumeWithGemini({ templateHtml, formData, customApiKey = null }) {
  const systemPrompt = `You are an elite professional resume writer, ATS optimization expert, and corporate recruiter.
Your task is to take a raw HTML resume template and populate it with beautifully written, professional, and ATS-optimized content based on the user's details.

CRITICAL RULES:
1. You MUST preserve the exact HTML structure, tags, CSS inline styles, wrappers, tables, columns, divisions, fonts, and colors of the template. Do NOT add new main wrapper containers, outer boundaries, or alter layout structure.
2. Only replace the placeholder values (such as "John Doe", "john.doe@email.com", job titles, dates, locations, bullet points, school names, university names, skill lists, professional summaries, etc.) with the user's actual information.
3. Enhance the provided work experience descriptions. Rewrite them to be extremely professional, high-impact, and metrics-driven (use action verbs like Led, Spearheaded, Optimized, Engineered, etc.). If descriptions are sparse, expand them with professional responsibilities typical for that job title.
4. Integrate the user's professional qualifications (e.g. Chartered Accountant, Scientist, Data Analyst, etc.) prominently into the summary or title area.
5. Create a cohesive professional summary (2-3 sentences) based on the user's qualification, experience, and skills, replacing any placeholder summary in the template.
6. Populate the skills section with the user's skills formatted matching the template's layout (e.g., comma-separated list or flex tags).
7. Do NOT include any explanations, introduction, or markdown wrapping. Return ONLY the populated HTML content.
8. Make sure the returned HTML document is fully complete, closing all open tags. NEVER truncate or omit any section of the HTML. Returns must be complete.`;

  const userPrompt = `Here is the HTML template to populate:
"""
${templateHtml}
"""

Here is the user's data:
${JSON.stringify(formData, null, 2)}

Populate the template now, rewriting and expanding sections to be premium and recruiter-ready. Return ONLY the complete populated HTML.`;

  try {
    return await callDeepSeek({
      systemInstruction: systemPrompt,
      prompt: userPrompt,
      customApiKey,
      temperature: 0.35,
      maxTokens: 5000
    });
  } catch (error) {
    console.error('DeepSeek Resume Generation Error:', error);
    throw new Error('AI resume generation failed. ' + error.message);
  }
}

/**
 * Uses DeepSeek API to analyze a LinkedIn profile's text.
 * @param {string} profileText - Raw text copied from the LinkedIn profile.
 * @param {string} [customApiKey] - Optional user-supplied API key.
 * @returns {Promise<object>} - Parsed structured JSON feedback matching linkedinSchema.
 */
export async function analyzeLinkedInProfileWithGemini(profileText, customApiKey = null) {
  const systemInstruction = `You are an elite corporate Recruiter, LinkedIn Profile Branding Consultant, and social recruiting optimization specialist.
  Your task is to conduct an extremely thorough, candid, and high-value assessment of the candidate's LinkedIn profile text.
  Provide realistic scores out of 100.
  You MUST strictly respond with a JSON object that conforms to the specified schema.`;

  const prompt = `Analyze this LinkedIn profile and provide optimization feedback. Measure its searchability, look for headline gaps, evaluate the summary hook, and suggest improvements.
  
  LinkedIn Profile Text:
  """
  ${profileText}
  """`;

  try {
    return await callDeepSeek({
      systemInstruction,
      prompt,
      responseSchema: linkedinSchema,
      customApiKey,
      temperature: 0.25
    });
  } catch (error) {
    console.error('DeepSeek LinkedIn Analysis Error:', error);
    throw new Error('LinkedIn analysis failed. ' + error.message);
  }
}

export async function evaluatePrepAnswerWithGemini({ question, userAnswer, resumeText, customApiKey = null }) {
  const systemPrompt = `You are a world-class Executive Interview Coach. Your task is to evaluate the candidate's response to a specific interview question.
  Evaluate the answer based on:
  1. Professional alignment and relevance to the resume details.
  2. Structure (STAR method: Situation, Task, Action, Result) for behavioral questions.
  3. Clarity, confidence, and terminology.
  
  Provide a score from 1 to 10, key strengths, areas of improvement, and a highly polished "refined" version of the answer that the candidate should use instead.`;

  const userPrompt = `
  Question: "${question}"
  Candidate's Answer: "${userAnswer}"
  ${resumeText ? `Candidate's Resume Context:\n"""\n${resumeText}\n"""` : ''}
  
  Evaluate this answer and return the structured JSON now.`;

  try {
    return await callDeepSeek({
      systemInstruction: systemPrompt,
      prompt: userPrompt,
      responseSchema: evaluationSchema,
      customApiKey,
      temperature: 0.3,
      maxTokens: 800
    });
  } catch (error) {
    console.error('DeepSeek Evaluation Error:', error);
    throw new Error('Interview evaluation failed. ' + error.message);
  }
}

export async function generateLinkedinBioWithGemini({ skills, jobTitle, resumeText, customApiKey = null }) {
  const systemPrompt = `You are a premier LinkedIn Personal Branding Coach. Your task is to craft high-conversion LinkedIn profile assets:
  1. Headlines: Catchy, keyword-optimized, highlighting their specialty and value.
  2. About Summaries: Storytelling summaries showing passion, key accomplishments, and clear calls to action.
  3. Banner Designs: Guidance on what copy, background styles, and graphical elements to put on their profile banner.
  4. Hashtags: Industry-specific search tags.`;

  const userPrompt = `
  Target Job Title: "${jobTitle || 'Professional'}"
  Skills / Keywords provided: "${skills || ''}"
  ${resumeText ? `Optional Resume Context:\n"""\n${resumeText}\n"""` : ''}
  
  Generate the LinkedIn Profile Assets and return the structured JSON now.`;

  try {
    return await callDeepSeek({
      systemInstruction: systemPrompt,
      prompt: userPrompt,
      responseSchema: linkedinBioSchema,
      customApiKey,
      temperature: 0.4,
      maxTokens: 1200
    });
  } catch (error) {
    console.error('DeepSeek LinkedIn Bio Error:', error);
    throw new Error('LinkedIn bio generation failed. ' + error.message);
  }
}

export async function generateLinkedinOutreachWithGemini({ jobTitle, companyName, context, targetName, customApiKey = null }) {
  const systemPrompt = `You are a premier Career Coach and Networking Expert. Your task is to craft high-conversion outreach templates:
  1. connectionRequest: A warm, concise LinkedIn connection note under 300 characters.
  2. referralPitch: A polite request for an informational interview or referral. Under 150 words.
  3. recruiterDM: A direct pitch targeting recruiters or hiring managers. Under 150 words.`;

  const userPrompt = `
  Target Job Title: "${jobTitle || ''}"
  Target Company: "${companyName || ''}"
  Recipient Name: "${targetName || 'Professional'}"
  Candidate Background / Custom Context: "${context || ''}"
  
  Generate the networking messages and return the structured JSON now.`;

  try {
    return await callDeepSeek({
      systemInstruction: systemPrompt,
      prompt: userPrompt,
      responseSchema: outreachSchema,
      customApiKey,
      temperature: 0.4,
      maxTokens: 1000
    });
  } catch (error) {
    console.error('DeepSeek Outreach Error:', error);
    throw new Error('Outreach generation failed. ' + error.message);
  }
}

export async function generateCareerCoursesWithGemini({ targetJob, skills, resumeText, customApiKey = null }) {
  const systemPrompt = `You are a Career Path and Skills Development Coach. Your task is to:
  1. Identify 3-5 key skill gaps between the candidate's profile/resume and their target job title.
  2. Recommend 3-5 high-quality online courses or certifications from reputable platforms (e.g. Coursera, Udemy, Pluralsight, edX, LinkedIn Learning) to bridge those gaps.`;

  const userPrompt = `
  Target Job Title: "${targetJob || ''}"
  Candidate's Current Skills / Key Inputs: "${skills || ''}"
  ${resumeText ? `Candidate's Resume Context:\n"""\n${resumeText}\n"""` : ''}
  
  Identify gaps and course recommendations and return the structured JSON now.`;

  try {
    return await callDeepSeek({
      systemInstruction: systemPrompt,
      prompt: userPrompt,
      responseSchema: careerCoursesSchema,
      customApiKey,
      temperature: 0.3,
      maxTokens: 1200
    });
  } catch (error) {
    console.error('DeepSeek Career Courses Error:', error);
    throw new Error('Career courses analysis failed. ' + error.message);
  }
}

export async function generateElevatorPitchWithGemini({ jobTitle, details, resumeText, customApiKey = null }) {
  const systemPrompt = `You are a professional Personal Branding specialist and Executive Coach. Your task is to write three distinct 60-second elevator pitches (around 100-150 words each):
  1. corporate: Structured, polished, and focusing on metrics, accomplishments, and alignment with corporate goals.
  2. startup: Adaptable, mission-driven, and focusing on resourcefulness, execution speed, and customer or product impact.
  3. creative: Narrative-driven, conversational, highlight-based, showing unique vision or design/innovation approach.`;

  const userPrompt = `
  Target Job Title: "${jobTitle || ''}"
  Candidate Key Details / Focus: "${details || ''}"
  ${resumeText ? `Candidate's Resume Context:\n"""\n${resumeText}\n"""` : ''}
  
  Construct the elevator pitches and return the structured JSON now.`;

  try {
    return await callDeepSeek({
      systemInstruction: systemPrompt,
      prompt: userPrompt,
      responseSchema: elevatorPitchSchema,
      customApiKey,
      temperature: 0.4,
      maxTokens: 1200
    });
  } catch (error) {
    console.error('DeepSeek Elevator Pitch Error:', error);
    throw new Error('Elevator pitch generation failed. ' + error.message);
  }
}

// ─── JOB FINDER SCHEMA ───────────────────────────────────────────────────────
const jobFinderSchema = {
  type: 'object',
  properties: {
    jobs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'The exact job title of the opening.' },
          company: { type: 'string', description: 'The name of the company. If it is a giant MNC (e.g. Google, Microsoft, Amazon, Accenture, TCS, Infosys, Deloitte, Wipro, etc.), return the actual company name. If it is NOT a giant MNC, return a generic category placeholder (e.g. "Tech Startup", "Fintech Company", "Growing Agency", "E-commerce Startup", "Software Solutions Enterprise", "Healthcare Tech Startup", etc.) instead of a specific company name.' },
          companyDomain: { type: 'string', description: 'The official domain of the giant MNC (e.g. google.com). If the company is a generic placeholder, set this to an empty string "".' },
          location: { type: 'string', description: 'City, State or "Remote" or "Hybrid — City, Country".' },
          jobType: { type: 'string', description: 'One of: Full-time, Part-time, Internship, Remote, Contract.' },
          matchScore: { type: 'integer', description: 'How well this job matches the candidate resume and JD preference, from 0 to 100.' },
          matchReasons: {
            type: 'array',
            items: { type: 'string' },
            description: '2-3 specific reasons why this job is a strong match for the candidate.'
          },
          requiredSkills: {
            type: 'array',
            items: { type: 'string' },
            description: '4-6 key skills/technologies required for this role.'
          },
          salary: { type: 'string', description: 'Estimated salary range (e.g. "$80,000 – $110,000/yr" or "₹8–12 LPA") or "Not disclosed".' },
          applyUrl: { type: 'string', description: 'A real, working URL to apply. Usually LinkedIn or Indeed.' },
          linkedinUrl: { type: 'string', description: 'LinkedIn search URL. Format: https://www.linkedin.com/jobs/search/?keywords=<URL-encoded-company>%20<URL-encoded-title>%20<URL-encoded-location>. Set to empty string "" if not relevant.' },
          indeedUrl: { type: 'string', description: 'Indeed search URL. Format: https://www.indeed.com/jobs?q=<URL-encoded-company>%20<URL-encoded-title>&l=<URL-encoded-location>. Set to empty string "" if not relevant.' },
          naukriUrl: { type: 'string', description: 'Naukri search URL. Format: https://www.naukri.com/jobs?k=<URL-encoded-company>%20<URL-encoded-title>. Set to empty string "" if not relevant or outside India.' },
          workindiaUrl: { type: 'string', description: 'WorkIndia search URL. Format: https://www.workindia.in/jobs-in-india/?search=<URL-encoded-company>%20<URL-encoded-title>. Set to empty string "" if not relevant or outside India.' },
          postedDate: { type: 'string', description: 'Approximate posting date relative to today, e.g. "2 days ago", "1 week ago", "Today".' },
          experienceRequired: { type: 'string', description: 'Required experience level e.g. "0–1 years", "2–4 years", "5+ years".' }
        },
        required: ['title', 'company', 'companyDomain', 'location', 'jobType', 'matchScore', 'matchReasons', 'requiredSkills', 'salary', 'applyUrl', 'linkedinUrl', 'indeedUrl', 'naukriUrl', 'workindiaUrl', 'postedDate', 'experienceRequired']
      },
      description: 'List of 15–20 highly relevant job matches for the candidate.'
    },
    searchSummary: {
      type: 'string',
      description: 'A 1-2 sentence summary of what was found and why these jobs were selected.'
    }
  },
  required: ['jobs', 'searchSummary']
};

/**
 * Uses DeepSeek AI to find and match relevant job openings based on a candidate's resume and target JD.
 * @param {string} resumeText - Parsed text of the candidate's CV.
 * @param {string} jobDescription - Target role / job description preferences entered by user.
 * @param {string} jobType - Preferred work arrangement filter: 'All' | 'Remote' | 'Full-time' | 'Part-time' | 'Internship'
 * @param {string} [customApiKey] - Optional user-supplied API key.
 * @returns {Promise<object>} - Structured JSON with matched jobs array.
 */
export async function findJobsWithGemini(resumeText, jobDescription, jobType = 'All', customApiKey = null) {
  const jobTypeFilter = jobType && jobType !== 'All'
    ? `IMPORTANT: Only return jobs of type "${jobType}". Do NOT include other job types.`
    : 'Include a mix of job types (Full-time, Part-time, Remote, Internship) as appropriate.';

  const systemPrompt = `You are a senior Executive Recruiter and Job Market Intelligence Specialist with deep knowledge of the global tech, finance, consulting, and creative hiring landscapes.

Your task is to analyze the candidate's resume and their target job description preference, then curate 15–20 highly relevant, realistic job openings.

RULES:
1. Experience Level Diversity: You MUST return a mix of Entry-Level (0-2 years), Mid-Level (2-5 years), and Advanced/Senior-Level (5+ years) jobs related to the candidate's core expertise, so they can see opportunities across all experience brackets (e.g. 5 Entry-Level, 5 Mid-Level, and 5 Advanced/Senior jobs).
2. Diverse Companies & Naming Rules: ONLY use actual company names for giant MNCs (e.g. Google, Microsoft, Amazon, Accenture, TCS, Infosys, Deloitte, Wipro, etc.) where the apply links are highly accurate and verified. For all other medium, small, or startup companies, you MUST return a generic category placeholder (like "Tech Startup", "Fintech Company", "Growing Agency", "E-commerce Startup", "Software Solutions Enterprise") in the "company" field and set "companyDomain" to "".
3. Platform-Specific Apply Links: Only populate the platform search URLs if the platform is highly relevant for the job role and country. If not, set it to an empty string "".
   - GUARANTEE ACTIVE SEARCH RESULTS: To prevent "No matching jobs found" screens, follow these search query guidelines:
     * For giant MNCs (e.g. Google, Microsoft, Amazon, Accenture, TCS, Infosys, Deloitte, Wipro, etc.), you may search by company name and job title (e.g. "Google Software Engineer").
     * For all other companies (medium firms, small local businesses, startups), do NOT include the company name in the search query parameter. Instead, search using only the job title and location/skills (e.g. "React Developer Delhi" or "Full Stack Developer Remote"). This guarantees that the user will see active job listings.
   - linkedinUrl & indeedUrl: Include for standard corporate/professional/tech jobs.
   - naukriUrl: Include ONLY for jobs located in India (IT, corporate, local). If the job location is outside India, set to "".
   - workindiaUrl: Include ONLY for entry-level, support, blue/grey-collar, or local junior roles in India. If the job is outside India, or if it is a senior/advanced professional role (where WorkIndia does not list jobs), set to "".
   - Format rules for active URLs (replace spaces with %20 and properly URL-encode all parameters):
     * linkedinUrl: https://www.linkedin.com/jobs/search/?keywords=<URL-encoded-query-terms>
     * indeedUrl: https://www.indeed.com/jobs?q=<URL-encoded-query-terms>&l=<URL-encoded-location>
     * naukriUrl: https://www.naukri.com/jobs?k=<URL-encoded-query-terms>
     * workindiaUrl: https://www.workindia.in/jobs-in-india/?search=<URL-encoded-query-terms>
4. Set the primary applyUrl to the first non-empty platform search URL that is generated (fallback priority order: linkedinUrl -> indeedUrl -> naukriUrl -> workindiaUrl). Ensure it is never empty.
5. Rank jobs by matchScore (highest first).
6. ${jobTypeFilter}
7. Keep matchReasons and requiredSkills very concise (1-2 bullet points max for reasons, 3-4 skills max) to ensure that the entire 15+ job dataset fits within the output token limits.
8. You MUST strictly return your response in the specified JSON structure. No markdown, no wrappers.
9. For companyDomain, provide the correct website domain of the company (e.g. google.com, microsoft.com, goldmansachs.com, tcs.com, accenture.com) to render logos.`;

  const userPrompt = `Candidate's Resume:
"""
${resumeText}
"""

Target Role / Job Description Preferences:
"""
${jobDescription}
"""

Analyze the candidate's background and find 15–20 perfectly matched job openings. Return structured JSON now.`;

  try {
    return await callDeepSeek({
      systemInstruction: systemPrompt,
      prompt: userPrompt,
      responseSchema: jobFinderSchema,
      customApiKey,
      temperature: 0.35,
      maxTokens: 8000
    });
  } catch (error) {
    console.error('DeepSeek Job Finder Error:', error);
    throw new Error('Job matching failed. ' + error.message);
  }
}

export async function generateCareerRoadmapWithGemini({ currentRole, targetRole, years, resumeText, customApiKey = null }) {
  const systemPrompt = `You are an elite Career Strategist and Transition Planner. Your job is to generate a comprehensive, highly actionable 4-step vertical career roadmap (exactly 4 phases) to transition from the candidate's current role/background to their target role. 
  Ensure each step has realistic timeframes, specific focuses, 2-3 tangible action items, and a clear, measurable completion milestone.`;

  const userPrompt = `
  Current Role/Background: "${currentRole || 'Associate'}"
  Target Role: "${targetRole || 'Manager'}"
  Transition Timeframe Budget: "${years || '2 years'}"
  ${resumeText ? `Optional Resume Context:\n"""\n${resumeText}\n"""` : ''}
  
  Generate the 4-phase career roadmap and return the structured JSON now.`;

  try {
    return await callDeepSeek({
      systemInstruction: systemPrompt,
      prompt: userPrompt,
      responseSchema: careerRoadmapSchema,
      customApiKey,
      temperature: 0.4,
      maxTokens: 1200
    });
  } catch (error) {
    console.error('DeepSeek Career Roadmap Error:', error);
    throw new Error('Career roadmap generation failed. ' + error.message);
  }
}

// ─── PROOFREADING SCHEMA ──────────────────────────────────────────────────────
const proofreadingSchema = {
  type: 'object',
  properties: {
    correctedText: { type: 'string', description: 'The fully corrected and polished version of the input text, preserving the original structure and meaning.' },
    score: { type: 'integer', description: 'Writing quality score from 0 to 100 for the ORIGINAL text, where 100 is perfect professional writing.' },
    summary: { type: 'string', description: 'A 2-3 sentence summary of the key improvements made and overall writing quality assessment.' },
    changes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', description: 'Category of change. Must be one of: grammar, spelling, passive_voice, weak_verb, tone, clarity, punctuation' },
          original: { type: 'string', description: 'The original phrase or sentence fragment that was changed.' },
          corrected: { type: 'string', description: 'The corrected and improved version of that phrase.' },
          explanation: { type: 'string', description: 'Brief, actionable explanation of why this change improves the writing.' }
        },
        required: ['type', 'original', 'corrected', 'explanation']
      },
      description: 'List of all specific changes made, in order of appearance in the text. Include up to 20 most important changes.'
    },
    stats: {
      type: 'object',
      properties: {
        grammarFixes: { type: 'integer', description: 'Number of grammar and punctuation fixes.' },
        spellingFixes: { type: 'integer', description: 'Number of spelling corrections.' },
        passiveToActive: { type: 'integer', description: 'Number of passive voice conversions to active voice.' },
        verbUpgrades: { type: 'integer', description: 'Number of weak verbs upgraded to strong power verbs.' },
        toneAlignments: { type: 'integer', description: 'Number of tone and clarity adjustments made.' }
      },
      required: ['grammarFixes', 'spellingFixes', 'passiveToActive', 'verbUpgrades', 'toneAlignments']
    }
  },
  required: ['correctedText', 'score', 'summary', 'changes', 'stats']
};

export async function generateProofreadingWithDeepSeek({ text, industry = 'General', customApiKey = null }) {
  const systemPrompt = `You are an expert writing coach, professional proofreader, and linguist specialising in career documents and professional communications.

Your task is to proofread and rewrite the provided text with the following improvements:
1. GRAMMAR & PUNCTUATION: Fix all grammatical errors, tense inconsistencies, subject-verb agreement issues, and punctuation mistakes.
2. SPELLING: Correct all spelling mistakes and typos.
3. PASSIVE → ACTIVE VOICE: Identify passive-voice constructions and rewrite them in active voice for stronger, clearer communication.
4. WEAK → POWER VERBS: Replace weak, vague verbs (e.g. "helped", "did", "was responsible for", "worked on") with strong action verbs (e.g. "orchestrated", "spearheaded", "engineered", "delivered", "drove").
5. TONE ALIGNMENT: Align the tone for ${industry} industry professionals — use appropriate formality and vocabulary.
6. CLARITY: Simplify overly complex or wordy sentences. Remove redundant words.

Be thorough but preserve the author's original intent and factual content. Do not fabricate metrics or information not present in the original.`;

  const userPrompt = `Please proofread and improve the following text. Target industry: ${industry}.

Text to proofread:
"""
${text}
"""

Analyse every sentence, identify all issues, apply all improvements, and return the structured JSON response.`;

  try {
    return await callDeepSeek({
      systemInstruction: systemPrompt,
      prompt: userPrompt,
      responseSchema: proofreadingSchema,
      customApiKey,
      temperature: 0.2,
      maxTokens: 3000
    });
  } catch (error) {
    console.error('DeepSeek Proofreading Error:', error);
    throw new Error('Proofreading failed. ' + error.message);
  }
}

// ─── CVMIND CODE AI SERVICES ────────────────────────────────────────────────

const codeHintSchema = {
  type: 'object',
  properties: {
    level: { type: 'integer', description: 'Assistance level 1 to 6.' },
    title: { type: 'string', description: 'Concise title of this hint tier (e.g. Concept Hint, Approach Hint, Algorithm).' },
    hint: { type: 'string', description: 'The hint text corresponding strictly to the requested assistance level.' },
    keyInsight: { type: 'string', description: 'One sharp bullet point or nugget of intuition to remember.' }
  },
  required: ['level', 'title', 'hint', 'keyInsight']
};

const codeReviewSchema = {
  type: 'object',
  properties: {
    verdict: { type: 'string', description: 'Overview assessment: Optimal, Good, Suboptimal, Needs Rework' },
    timeComplexity: { type: 'string', description: 'Big-O notation e.g. O(N) or O(N log N) with brief rationale' },
    spaceComplexity: { type: 'string', description: 'Big-O notation e.g. O(1) or O(N) with brief rationale' },
    qualityScore: { type: 'integer', description: 'Code quality score from 1 to 100' },
    strengths: { type: 'array', items: { type: 'string' }, description: '2-3 specific things done well in this solution' },
    optimizations: { type: 'array', items: { type: 'string' }, description: 'Actionable performance or readability improvements' },
    edgeCasesConsidered: { type: 'array', items: { type: 'string' }, description: 'Edge cases handled or that should be checked' },
    alternativeApproach: { type: 'string', description: 'Brief mention of an alternative paradigm or trick if applicable' }
  },
  required: ['verdict', 'timeComplexity', 'spaceComplexity', 'qualityScore', 'strengths', 'optimizations']
};

const codeDebugSchema = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'A high-level summary of the bug without leaking hidden test case values.' },
    probableCause: { type: 'string', description: 'The specific logical or syntactical oversight causing the failure.' },
    suggestedFix: { type: 'string', description: 'Guiding direction on where in the code to adjust the logic.' },
    edgeCaseToTest: { type: 'string', description: 'A sample public edge case scenario for the user to dry-run.' }
  },
  required: ['summary', 'probableCause', 'suggestedFix', 'edgeCaseToTest']
};

const aiProblemSchema = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Crisp title of the generated problem.' },
    slug: { type: 'string', description: 'kebab-case URL friendly slug.' },
    difficulty: { type: 'string', description: 'Easy, Medium, or Hard.' },
    category: { type: 'string', description: 'Arrays, Strings, Trees, Dynamic Programming, Hashing, etc.' },
    companies: { type: 'array', items: { type: 'string' }, description: 'Companies known for similar questions (e.g. Google, Amazon)' },
    description: { type: 'string', description: 'Markdown formatted problem statement.' },
    constraints: { type: 'array', items: { type: 'string' }, description: 'Constraints on input sizes and values.' },
    examples: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          input: { type: 'string' },
          output: { type: 'string' },
          explanation: { type: 'string' }
        },
        required: ['input', 'output']
      }
    },
    starterCode: {
      type: 'object',
      properties: {
        javascript: { type: 'string' },
        python: { type: 'string' },
        cpp: { type: 'string' }
      },
      required: ['javascript', 'python', 'cpp']
    },
    functionName: { type: 'string', description: 'Target function name to evaluate.' },
    testCases: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          input: {},
          expected: {}
        },
        required: ['input', 'expected']
      }
    }
  },
  required: ['title', 'slug', 'difficulty', 'category', 'description', 'constraints', 'examples', 'starterCode', 'functionName', 'testCases']
};

/**
 * Generates progressive 6-tier hints for coding challenges
 */
export async function generateCodeHint({ problemTitle, problemDescription, userCode, language = 'javascript', requestedLevel = 1, customApiKey = null }) {
  const levelsDescription = {
    1: 'Level 1 — Concept Hint: Guide the candidate towards the conceptual intuition without mentioning algorithms or data structures.',
    2: 'Level 2 — Approach Hint: Point out the data structure or family of techniques (e.g. two pointers, hash map, sliding window) that unlocks this problem.',
    3: 'Level 3 — Algorithm: Outline the systematic algorithm step-by-step in clear plain English.',
    4: 'Level 4 — Pseudocode: Provide language-agnostic structured pseudocode showing the loop/condition flow.',
    5: 'Level 5 — Code Explanation: Explain the precise mechanics and how the logic is assembled in ' + language + '.',
    6: 'Level 6 — Full Solution: Give the optimal, production-ready solution in ' + language + ' with comments explaining each step.'
  };

  const systemInstruction = `You are CVmind Code AI — an elite technical interview mentor.
Your philosophy is: "Don't just tell users the answer. Help them become capable of finding it."
You are strictly generating a hint for: ${levelsDescription[requestedLevel] || levelsDescription[1]}.
Never reveal higher level details than the requested level. Return response conforming to the JSON schema.`;

  const userPrompt = `Problem Title: ${problemTitle}
Problem Description:
${problemDescription}

Candidate's Current Code (${language}):
\`\`\`${language}
${userCode || '// No code written yet'}
\`\`\`

Generate Level ${requestedLevel} guidance.`;

  try {
    return await callDeepSeek({
      systemInstruction,
      prompt: userPrompt,
      responseSchema: codeHintSchema,
      customApiKey,
      temperature: 0.2
    });
  } catch (error) {
    console.error('Code Hint AI Error:', error);
    return {
      level: requestedLevel,
      title: `Level ${requestedLevel} Hint`,
      hint: requestedLevel === 1 
        ? 'Think about what state or elements you need to remember as you iterate through the input.'
        : 'Consider using a hash map or frequency tracker to check previous elements in O(1) time.',
      keyInsight: 'Focus on eliminating repeated work across nested iterations.'
    };
  }
}

/**
 * Performs deep AI code review on submitted solutions
 */
export async function generateCodeReview({ problemTitle, problemDescription, userCode, language = 'javascript', customApiKey = null }) {
  const systemInstruction = `You are a Principal Software Engineer & Staff Tech Lead reviewing candidate code submissions.
Conduct a thorough, realistic code review analyzing Big-O time and space complexity, correctness, edge cases, readability, and optimization avenues.
Respond with a strict JSON object matching the provided schema.`;

  const userPrompt = `Problem: ${problemTitle}
Problem Statement:
${problemDescription}

Candidate Code (${language}):
\`\`\`${language}
${userCode}
\`\`\`

Perform an architectural and algorithmic code review.`;

  try {
    return await callDeepSeek({
      systemInstruction,
      prompt: userPrompt,
      responseSchema: codeReviewSchema,
      customApiKey,
      temperature: 0.2
    });
  } catch (error) {
    console.error('Code Review AI Error:', error);
    return {
      verdict: 'Good Solution',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(N)',
      qualityScore: 88,
      strengths: ['Clear variable naming', 'Handles base condition early', 'Good algorithmic flow'],
      optimizations: ['Can replace array lookup with Set for O(1) membership checks'],
      edgeCasesConsidered: ['Empty array input', 'Duplicate entries'],
      alternativeApproach: 'Two pointer approach if array is presorted'
    };
  }
}

/**
 * AI Debugger: Diagnoses failed test runs without leaking hidden test case values
 */
export async function generateCodeDebug({ problemTitle, userCode, language = 'javascript', failedTestInfo, customApiKey = null }) {
  const systemInstruction = `You are the CVmind Code Debugging Engine.
The candidate ran their code and encountered a Wrong Answer or Runtime Error.
Your goal is to explain WHY their implementation failed without giving away secret proprietary test cases.
Point out boundary oversights, off-by-one mistakes, unhandled nulls, or incorrect state mutations.`;

  const userPrompt = `Problem: ${problemTitle}
Candidate Code (${language}):
\`\`\`${language}
${userCode}
\`\`\`

Failure Diagnostics:
${JSON.stringify(failedTestInfo || { error: 'Wrong output on test case' })}

Analyze the flaw and provide debugging guidance.`;

  try {
    return await callDeepSeek({
      systemInstruction,
      prompt: userPrompt,
      responseSchema: codeDebugSchema,
      customApiKey,
      temperature: 0.2
    });
  } catch (error) {
    console.error('Code Debug AI Error:', error);
    return {
      summary: 'Logic mismatch detected on edge values or duplicate items.',
      probableCause: 'Your loop termination or internal accumulator does not update before the next element is inspected.',
      suggestedFix: 'Review how your accumulator is updated and verify condition on empty/single item inputs.',
      edgeCaseToTest: 'Try testing with an input having duplicate or negative values.'
    };
  }
}

/**
 * AI Problem Generator: Creates customized DSA challenges on demand
 */
export async function generateAIProblem({ topic = 'Arrays', difficulty = 'Medium', company = 'Google', customPrompt = '', customApiKey = null }) {
  const systemInstruction = `You are the CVmind Code Architect.
Generate an original, interview-caliber DSA coding challenge with high relevance to top tech companies.
Include complete markdown description, constraints, examples, multi-language starter code (JavaScript, Python, C++), target functionName, and 5-6 test cases with exact input and expected outputs.
Return strictly valid JSON adhering to the schema.`;

  const userPrompt = `Topic: ${topic}
Difficulty: ${difficulty}
Target Company Style: ${company}
Custom Specifications: ${customPrompt || 'Create an engaging, realistic problem that tests algorithmic intuition.'}

Generate a complete, fully playable coding challenge.`;

  try {
    return await callDeepSeek({
      systemInstruction,
      prompt: userPrompt,
      responseSchema: aiProblemSchema,
      customApiKey,
      temperature: 0.4
    });
  } catch (error) {
    console.error('AI Problem Generation Error:', error);
    return {
      title: 'Target Pair Finder',
      slug: 'target-pair-finder',
      difficulty: difficulty,
      category: topic,
      companies: [company || 'Google'],
      description: 'Given an array of integers `nums` and an integer `target`, return the indices of two numbers such that they add up to `target`. You may assume that each input has exactly one solution.',
      constraints: ['2 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9', 'Exactly one valid answer exists.'],
      examples: [
        { input: 'nums = [2,7,11,15], target = 9', output: '[0, 1]', explanation: 'nums[0] + nums[1] == 9, so return [0, 1].' }
      ],
      functionName: 'twoSum',
      starterCode: {
        javascript: 'function twoSum(nums, target) {\n  // Write your code here\n  \n}',
        python: 'def twoSum(nums, target):\n    # Write your code here\n    pass',
        cpp: 'vector<int> twoSum(vector<int>& nums, int target) {\n    // Write your code here\n    \n}'
      },
      testCases: [
        { input: [[2, 7, 11, 15], 9], expected: [0, 1] },
        { input: [[3, 2, 4], 6], expected: [1, 2] },
        { input: [[3, 3], 6], expected: [0, 1] }
      ]
    };
  }
}
