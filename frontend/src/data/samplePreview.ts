import type { Template } from './resumeTemplates';

/**
 * Marketing previews should look like a finished resume, not a blank form.
 * This fills a template's placeholders (John Doe, [Job Title], Company Name, ...) with
 * plausible sample content for display only. The editor still opens the untouched template.
 * All people and employers below are fictional.
 */
interface Profile {
  name: string;
  title: string;
  prevTitle: string;
  company: string;
  prevCompany: string;
  field: string;
  university: string;
  skills: string[];
}

const DEFAULT_PROFILE: Profile = {
  name: 'Priya Nair', title: 'Senior Product Manager', prevTitle: 'Product Manager',
  company: 'Northwind Payments', prevCompany: 'Kite Commerce', field: 'Computer Science',
  university: 'NIT Calicut', skills: ['Roadmapping', 'SQL', 'A/B Testing', 'Stakeholder Management', 'Figma', 'Analytics'],
};

const PROFILES: Record<string, Partial<Profile>> = {
  'modern-blue': { name: 'Priya Nair', title: 'Senior Frontend Engineer', prevTitle: 'Frontend Developer', skills: ['React', 'TypeScript', 'Next.js', 'Jest', 'Node.js', 'REST APIs'] },
  'tech-minimal': { name: 'Rohan Verma', title: 'Full Stack Engineer', prevTitle: 'Software Engineer', company: 'Lattice Labs', prevCompany: 'Zenith Software', skills: ['Node.js', 'Python', 'PostgreSQL', 'AWS', 'Docker', 'Redis'] },
  'dev-terminal': { name: 'Rohan Verma', title: 'Backend Engineer', company: 'Lattice Labs', skills: ['Go', 'Kubernetes', 'gRPC', 'PostgreSQL', 'Terraform'] },
  'data-scientist': { name: 'Ananya Iyer', title: 'Data Scientist', prevTitle: 'Data Analyst', company: 'Orbit Analytics', prevCompany: 'Helix Data', field: 'Statistics', university: 'IISc Bangalore', skills: ['Python', 'SQL', 'PyTorch', 'Spark', 'Tableau', 'Experiment Design'] },
  'finance-authority': { name: 'Karan Malhotra', title: 'Senior Financial Analyst', prevTitle: 'Financial Analyst', company: 'Meridian Capital', prevCompany: 'Axis Advisory', field: 'Finance', university: 'SRCC, Delhi', skills: ['Financial Modelling', 'Valuation', 'Excel', 'Power BI', 'IFRS'] },
  'sales-kpi': { name: 'Aditi Rao', title: 'Regional Sales Manager', prevTitle: 'Account Executive', company: 'Brightline SaaS', prevCompany: 'Cloudmart', field: 'Business Administration', university: 'Symbiosis, Pune', skills: ['Enterprise Sales', 'Forecasting', 'CRM', 'Negotiation', 'Pipeline Growth'] },
  'creative-bold': { name: 'Meera Kapoor', title: 'Senior Creative Director', prevTitle: 'Art Director', company: 'Studio Marigold', prevCompany: 'Pixel & Pine', field: 'Visual Communication', university: 'NID Ahmedabad', skills: ['Branding', 'Figma', 'Art Direction', 'Motion Design', 'Typography'] },
  'ux-designer': { name: 'Meera Kapoor', title: 'Product Designer', prevTitle: 'UX Designer', company: 'Fable Health', prevCompany: 'Pixel & Pine', field: 'Interaction Design', university: 'IDC, IIT Bombay', skills: ['Figma', 'User Research', 'Prototyping', 'Design Systems', 'Accessibility'] },
  'startup-product': { name: 'Nikhil Sharma', title: 'Product Lead', prevTitle: 'Associate Product Manager', company: 'Quill Labs', prevCompany: 'Tanda', skills: ['Product Strategy', 'Roadmapping', 'SQL', 'User Interviews', 'Growth'] },
  'healthcare-pro': { name: 'Sneha Menon', title: 'Registered Nurse, ICU', prevTitle: 'Staff Nurse', company: 'Sunrise Hospital', prevCompany: 'City Care Clinic', field: 'Nursing', university: 'Christian Medical College', skills: ['Critical Care', 'BLS / ACLS', 'Patient Assessment', 'Ventilator Care', 'EMR Systems'] },
  'hospitality-warm': { name: 'Sophia Dsouza', title: 'Guest Relations Manager', prevTitle: 'Front Desk Supervisor', company: 'Azure Hotel Group', prevCompany: 'Palm Court Resort', field: 'Hospitality Management', university: 'IHM Mumbai', skills: ['Guest Relations', 'Team Training', 'Opera PMS', 'Service Recovery'] },
  'legal-counsel': { name: 'Vikram Bhatia', title: 'Associate Counsel', prevTitle: 'Legal Associate', company: 'Bhatia & Rao LLP', prevCompany: 'Sen Legal', field: 'Corporate Law', university: 'NLSIU Bangalore', skills: ['Contract Drafting', 'Due Diligence', 'Compliance', 'Arbitration'] },
  'academic-cv': { name: 'Dr. Lakshmi Narayan', title: 'Assistant Professor', prevTitle: 'Postdoctoral Researcher', company: 'Indian Institute of Science', prevCompany: 'TIFR Mumbai', field: 'Computational Linguistics', university: 'IISc Bangalore', skills: ['NLP', 'Machine Learning', 'Teaching', 'Grant Writing'] },
  'fresh-graduate': { name: 'Arjun Patel', title: 'Software Engineering Intern', prevTitle: 'Teaching Assistant', company: 'Finly', prevCompany: 'College Tech Club', field: 'Computer Science', university: 'VIT Vellore', skills: ['Java', 'React', 'SQL', 'Git', 'Data Structures'] },
  'executive-sidebar': { name: 'Maeve Fernandes', title: 'Strategic Sourcing Leader', prevTitle: 'Category Manager', company: 'Premier Industries', prevCompany: 'Delta Supply Co.', field: 'Supply Chain', university: 'IIM Lucknow', skills: ['Category Management', 'Vendor Negotiation', 'Supply Chain', 'Cost Reduction'] },
  'cvmind-executive': { name: 'Maeve Fernandes', title: 'Strategic Sourcing Leader', prevTitle: 'Category Manager', company: 'Premier Industries', prevCompany: 'Delta Supply Co.', field: 'Supply Chain Management', university: 'IIM Lucknow', skills: ['Category Management', 'Vendor Negotiation', 'Supply Chain', 'Cost Reduction'] },
  'modern-cl': { name: 'Priya Nair', title: 'Senior Frontend Engineer', company: 'Northwind Payments', prevCompany: 'Kite Commerce', field: 'front-end performance', skills: ['React', 'TypeScript', 'web performance'] },
  'classic-cl': { name: 'Priya Nair', title: 'Operations Manager', company: 'Northwind Payments', prevCompany: 'Kite Commerce' },
};

/** Fixed fills for placeholders that do not depend on the person. */
const TOKENS: Record<string, string> = {
  Project: 'the checkout redesign', Feature: 'search', Domain: 'fintech', Industry: 'fintech',
  Outcome: 'cut load time by 38%', 'Product/Feature': 'the payments dashboard', 'Tool/Process': 'CI pipelines',
  Stack: 'React, Node.js', City: 'Bengaluru', Year: '2021', Years: '6', State: 'Karnataka',
  XXXXX: '12345', XXXXXX: '123456', XXXX: '2019', Amount: '₹12 lakh', 'Course Name': 'Introduction to Machine Learning',
  'Funding Body': 'DST', 'Grant/Fellowship Name': 'INSPIRE Fellowship', 'Paper Title': 'Efficient Attention for Low-Resource Translation',
  'Research Area 1': 'Natural language processing', 'Research Area 2': 'Low-resource languages', 'Research Area 3': 'Model evaluation',
  Initiative: 'cloud cost reduction', 'Nursing College': 'AIIMS College of Nursing', process: 'release management',
  'specific product or news': 'your recent product launch', Metric: '35%', 'Key Metric': 'conversion', Method: 'automation',
  Function: 'operations', Area: 'platform engineering', 'System/Product': 'an internal analytics platform',
  'Hospital/Clinic Name': 'Sunrise Hospital', 'Hotel/Property Name': 'Azure Hotel Group', Degree: 'B.Tech', Role: 'Lead',
};

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Returns the template HTML with sample content filled in, for display only. */
export function withSampleData(t: Template): string {
  const p: Profile = { ...DEFAULT_PROFILE, ...PROFILES[t.id] };
  let html = t.html;

  // names
  html = html
    .replace(/Dr\. John Doe/g, p.name.startsWith('Dr.') ? p.name : `Dr. ${p.name}`)
    .replace(/JOHN DOE|YOUR NAME/g, p.name.toUpperCase())
    .replace(/John Doe|Your Name/g, p.name);

  // role the resume is written for
  html = html.replace(/The role you are applying for\?|The Role You Are Applying For/gi, p.title);

  // sequential fills: first occurrence is the current job, the next is the previous one, and so on
  const alternate = (pattern: RegExp, a: string, b: string) => {
    let i = 0;
    html = html.replace(pattern, () => (i++ % 2 === 0 ? a : b));
  };
  alternate(/\[Your Professional Title\]|\[JOB TITLE\]|\[Job Title\]|\[Position Title\]|\[Position\]|\[Title\]/g, p.title, p.prevTitle);
  alternate(/\[Company Name\]|Company Name|\[Company\]|\[Firm Name\]/g, p.company, p.prevCompany);
  html = html.replace(/\[Previous Company\]/g, p.prevCompany);
  html = html.replace(/\[University Name\]|University Name|\[Institution\]/g, p.university);
  html = html.replace(/\[Branch\]|\[Field\]|\[Specialization\]|\[specialization\]|Degree and Field of Study/g, p.field);

  let s = 0;
  html = html.replace(/\[Skill [A-C]\]|\[Skill\]|\[Key Skill\]|Skill (?:One|Two|Three|Four|Five|Six|[1-9])\b/g, () => p.skills[s++ % p.skills.length]);

  // fixed tokens, then drop the brackets on anything unknown so no "[...]" is left on screen
  html = html.replace(/\[([^\][<>'",]{2,45})\]/g, (_m, inner: string) => TOKENS[inner] ?? inner);
  // contact details that should agree with the name above
  const parts = p.name.replace(/^Dr\.\s*/, '').toLowerCase().split(' ');
  html = html
    .replace(/john\.doe@email\.com/gi, `${parts[0]}.${parts[parts.length - 1]}@example.com`)
    .replace(/johndoe/gi, parts.join(''));

  // plain-text placeholders used by the newer layouts
  html = html
    .replace(new RegExp(escapeRe('Date period'), 'g'), '2022 – Present')
    .replace(/>Title</g, `>${p.title}<`)
    .replace(/Highlight your accomplishments[^<]*/g, 'Led a cross-functional team and delivered the programme 15% ahead of plan.')
    .replace(/School or University/g, p.university)
    .replace(/IIT\/NIT/g, p.university)
    .replace(/Tech Company/g, p.company);
  return html;
}
