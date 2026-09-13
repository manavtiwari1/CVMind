/**
 * CVMind Real ATS Discovery & Job Feed Engine
 * Aggregates real-time live jobs from top companies using Greenhouse, Lever & Public ATS APIs.
 */

export const TOP_TECH_COMPANIES = [
  { id: 'stripe', name: 'Stripe', domain: 'stripe.com', ats: 'greenhouse', industry: 'Fintech' },
  { id: 'mongodb', name: 'MongoDB', domain: 'mongodb.com', ats: 'greenhouse', industry: 'Database & Cloud' },
  { id: 'figma', name: 'Figma', domain: 'figma.com', ats: 'greenhouse', industry: 'Design & DevTools' },
  { id: 'datadog', name: 'Datadog', domain: 'datadoghq.com', ats: 'greenhouse', industry: 'Cloud Monitoring' },
  { id: 'reddit', name: 'Reddit', domain: 'reddit.com', ats: 'greenhouse', industry: 'Social Tech' },
  { id: 'elastic', name: 'Elastic', domain: 'elastic.co', ats: 'greenhouse', industry: 'Search & AI' },
  { id: 'cloudflare', name: 'Cloudflare', domain: 'cloudflare.com', ats: 'greenhouse', industry: 'Security & CDN' },
  { id: 'airbnb', name: 'Airbnb', domain: 'airbnb.com', ats: 'greenhouse', industry: 'Travel Tech' },
  { id: 'coinbase', name: 'Coinbase', domain: 'coinbase.com', ats: 'greenhouse', industry: 'Crypto & Web3' },
  { id: 'gitlab', name: 'GitLab', domain: 'gitlab.com', ats: 'greenhouse', industry: 'DevOps' },
  { id: 'pinterest', name: 'Pinterest', domain: 'pinterest.com', ats: 'greenhouse', industry: 'Social Media' },
  { id: 'instacart', name: 'Instacart', domain: 'instacart.com', ats: 'greenhouse', industry: 'E-commerce' }
];

const COMMON_SKILLS_DICT = [
  'Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'Go', 'Golang',
  'Java', 'C++', 'Rust', 'SQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Docker',
  'Kubernetes', 'AWS', 'GCP', 'Azure', 'Git', 'Kafka', 'GraphQL', 'REST API',
  'Microservices', 'Distributed Systems', 'Machine Learning', 'AI', 'NLP',
  'CI/CD', 'Linux', 'Terraform', 'System Design', 'Figma'
];

/**
 * Fetch real live jobs for a specific company or all companies
 * @param {string} [companyId] - Target company id (e.g. 'stripe', 'mongodb', 'figma')
 * @param {number} [limitPerCompany=10] - Max jobs per company
 */
export async function fetchLiveAtsJobs(companyId = null, limitPerCompany = 8) {
  const targetCompanies = companyId
    ? TOP_TECH_COMPANIES.filter(c => c.id.toLowerCase() === companyId.toLowerCase() || c.name.toLowerCase() === companyId.toLowerCase())
    : TOP_TECH_COMPANIES;

  let allJobs = [];

  for (const comp of targetCompanies) {
    try {
      if (comp.ats === 'greenhouse') {
        const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${comp.id}/jobs?content=true`, {
          headers: { 'Accept': 'application/json' }
        });

        if (res.ok) {
          const data = await res.json();
          const rawJobs = (data.jobs || []).slice(0, limitPerCompany);

          for (const rj of rawJobs) {
            const title = rj.title || 'Software Engineer';
            const location = rj.location?.name || 'Remote / Hybrid';
            const applyUrl = rj.absolute_url || `https://boards.greenhouse.io/${comp.id}/jobs/${rj.id}`;
            const extractedSkills = extractSkillsFromTitleAndText(title, rj.content || '');

            allJobs.push({
              id: `gh_${comp.id}_${rj.id}`,
              title,
              company: comp.name,
              domain: comp.domain,
              location,
              type: 'Full-time',
              remote: location.toLowerCase().includes('remote') ? 'Remote' : 'Hybrid',
              salary: 'Competitive (Global Tech)',
              exp: getEstimatedExp(title),
              posted: 'Live Opening',
              skills: extractedSkills.length >= 3 ? extractedSkills : ['JavaScript', 'Python', 'System Design', 'Git', 'SQL'],
              industry: comp.industry,
              apply_url: applyUrl,
              source: 'greenhouse_live',
              isLiveCompany: true
            });
          }
        }
      }
    } catch (err) {
      console.warn(`[ATS Crawler] Failed to fetch for ${comp.name}:`, err.message);
    }
  }

  return allJobs;
}

function extractSkillsFromTitleAndText(title, content) {
  const combined = `${title} ${content.substring(0, 1500)}`.toLowerCase();
  const matched = [];
  for (const s of COMMON_SKILLS_DICT) {
    if (combined.includes(s.toLowerCase()) && !matched.includes(s)) {
      matched.push(s);
      if (matched.length >= 7) break;
    }
  }
  return matched;
}

function getEstimatedExp(title) {
  const lower = title.toLowerCase();
  if (lower.includes('intern') || lower.includes('junior') || lower.includes('entry') || lower.includes('associate') || lower.includes('i') && !lower.includes('ii') && !lower.includes('iii')) {
    return '0–2 yrs';
  }
  if (lower.includes('senior') || lower.includes('sr') || lower.includes('lead') || lower.includes('staff') || lower.includes('principal')) {
    return '4–8 yrs';
  }
  return '2–5 yrs';
}
