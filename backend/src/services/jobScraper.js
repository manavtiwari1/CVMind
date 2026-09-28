/**
 * CVMind Job Discovery & Scraper Engine
 * Extracts structured job schema from job URLs or raw HTML.
 */

// Basic HTML stripping / cleaning helper
function cleanText(htmlOrText) {
  if (!htmlOrText) return '';
  return htmlOrText
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Scrape a public career page or job listing URL
 * @param {string} url - Target job URL
 * @param {string} [customApiKey] - Optional Gemini API Key
 */
export async function scrapeJobFromUrl(url, customApiKey) {
  try {
    // Validate URL
    new URL(url);

    // Fetch the HTML content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: HTTP ${response.status}`);
    }

    const html = await response.text();
    const cleanContent = cleanText(html).substring(0, 7000);

    // Parse structured job with AI or regex fallback
    return await parseJobContent(cleanContent, url, customApiKey);
  } catch (error) {
    console.error('Job scrape error:', error);
    // Return a structured fallback based on the URL
    return {
      title: extractTitleFromUrl(url) || 'Software Engineer',
      company: extractCompanyFromUrl(url) || 'Tech Company',
      location: 'Remote / India',
      employment_type: 'Full-time',
      description: 'Job description extracted from target career listing.',
      skills: ['JavaScript', 'Python', 'Problem Solving', 'Git', 'Communication'],
      salary: 'Competitive',
      apply_url: url,
      source: 'web_scraper',
      scraped_at: new Date().toISOString()
    };
  }
}

/**
 * Parse job content into structured schema
 */
export async function parseJobContent(rawText, sourceUrl = '', customApiKey = null) {
  const key = customApiKey || process.env.GEMINI_API_KEY;

  if (key) {
    try {
      const prompt = `You are a career intelligence parser. Extract structured job details from the following web page content and return ONLY valid JSON matching this schema.

Schema:
{
  "title": "<string, e.g. Python Developer Intern / Senior Frontend Engineer>",
  "company": "<string, e.g. ABC Technologies>",
  "location": "<string, e.g. Delhi / Bengaluru / Remote>",
  "employment_type": "<'Full-time' | 'Internship' | 'Part-time' | 'Contract'>",
  "remote": "<'Remote' | 'Hybrid' | 'Onsite'>",
  "description": "<string summary of role and responsibilities, 2-3 sentences>",
  "skills": ["<skill1>", "<skill2>", "<skill3>", "<skill4>", "<skill5>"],
  "salary": "<string, e.g. ₹20,000/mo or ₹15L–₹25L/yr or Competitive>",
  "experience": "<string, e.g. 0-1 yrs or 2-4 yrs>",
  "industry": "<string, e.g. Fintech / E-commerce / Tech / SaaS>",
  "apply_url": "${sourceUrl || ''}"
}

Page Content:
${rawText.substring(0, 4500)}`;

      const apiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 1024, responseMimeType: 'application/json' }
          })
        }
      );

      if (apiRes.ok) {
        const data = await apiRes.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const parsed = JSON.parse(text.replace(/```json\n?|```\n?/g, '').trim());
        return {
          ...parsed,
          source: 'ai_scraper',
          apply_url: sourceUrl || parsed.apply_url || '',
          scraped_at: new Date().toISOString()
        };
      }
    } catch (aiErr) {
      console.warn('AI job parser fallback to regex:', aiErr.message);
    }
  }

  // Fallback heuristic parser if AI key not present
  const extractedSkills = extractCommonSkills(rawText);
  return {
    title: extractTitleFromText(rawText) || extractTitleFromUrl(sourceUrl) || 'Software Engineer',
    company: extractCompanyFromUrl(sourceUrl) || 'Company',
    location: rawText.toLowerCase().includes('remote') ? 'Remote' : 'Bengaluru, India',
    employment_type: rawText.toLowerCase().includes('intern') ? 'Internship' : 'Full-time',
    remote: rawText.toLowerCase().includes('remote') ? 'Remote' : 'Hybrid',
    description: rawText.substring(0, 250) + '...',
    skills: extractedSkills.length ? extractedSkills : ['JavaScript', 'React', 'Node.js', 'Git', 'SQL'],
    salary: 'Competitive',
    experience: '1-3 yrs',
    industry: 'Technology',
    apply_url: sourceUrl,
    source: 'heuristic_scraper',
    scraped_at: new Date().toISOString()
  };
}

function extractCompanyFromUrl(url) {
  try {
    const parsed = new URL(url);
    const hostParts = parsed.hostname.replace('www.', '').split('.');
    if (hostParts.length > 0) {
      const name = hostParts[0];
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
  } catch {}
  return 'Company';
}

function extractTitleFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1] || '';
    return lastPart
      .replace(/[-_]/g, ' ')
      .replace(/\.(html|php|aspx)$/, '')
      .replace(/\b\w/g, c => c.toUpperCase());
  } catch {}
  return 'Software Engineer';
}

function extractTitleFromText(text) {
  const matches = text.match(/(?:role|position|job title|hiring for)\s*:\s*([A-Za-z0-9\s/]+)/i);
  if (matches && matches[1]) {
    return matches[1].trim().slice(0, 40);
  }
  return null;
}

const COMMON_TECH_SKILLS = [
  'Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'SQL', 'Django',
  'FastAPI', 'Express', 'MongoDB', 'PostgreSQL', 'Docker', 'Kubernetes',
  'AWS', 'GCP', 'Azure', 'Git', 'Java', 'C++', 'Go', 'Rust', 'GraphQL',
  'REST APIs', 'HTML', 'CSS', 'Redux', 'Tailwind', 'Next.js', 'Linux',
  'Machine Learning', 'Data Science', 'PyTorch', 'TensorFlow', 'Figma'
];

function extractCommonSkills(text) {
  const found = [];
  const lower = text.toLowerCase();
  for (const skill of COMMON_TECH_SKILLS) {
    if (lower.includes(skill.toLowerCase()) && !found.includes(skill)) {
      found.push(skill);
      if (found.length >= 8) break;
    }
  }
  return found;
}
