import { normalizeSkill } from '@cvmind/auto-apply-agent/scoring/normalizeSkill.js';

// Skills Job Finder looks for in a job's title and description. Feed jobs aren't run through the AI
// parser (that would cost a model call per listing), so their skills come from this list plus the
// user's own resume skills. Names are canonical forms (see normalizeSkill); aliases are matched too.
const VOCABULARY = [
  // Languages
  'javascript', 'typescript', 'python', 'java', 'golang', 'c++', 'c#', 'kotlin', 'swift', 'ruby', 'php', 'rust',
  'scala', 'r', 'dart', 'sql', 'bash', 'html', 'css',
  // Frontend and mobile
  'react', 'react native', 'next.js', 'vue.js', 'angular', 'redux', 'tailwind', 'flutter', 'android', 'ios', 'figma',
  // Backend
  'node.js', 'express.js', 'django', 'flask', 'fastapi', 'spring boot', '.net', 'rails', 'laravel', 'graphql', 'rest api',
  'microservices', 'kafka', 'rabbitmq', 'redis', 'elasticsearch',
  // Data stores
  'postgresql', 'mysql', 'mongodb', 'dynamodb', 'cassandra', 'snowflake', 'bigquery',
  // Cloud and DevOps
  'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'terraform', 'ansible', 'jenkins', 'ci/cd', 'linux', 'git',
  // Data and AI
  'machine learning', 'deep learning', 'natural language processing', 'computer vision', 'large language models',
  'pytorch', 'tensorflow', 'scikit-learn', 'pandas', 'numpy', 'spark', 'hadoop', 'airflow', 'tableau', 'power bi',
  'excel', 'statistics', 'data analysis', 'data visualization', 'etl',
  // Testing and practice
  'selenium', 'cypress', 'jest', 'unit testing', 'agile', 'scrum', 'jira', 'data structures', 'system design',
  // Product, design, business
  'product management', 'ui design', 'ux design', 'user research', 'seo', 'digital marketing', 'content writing',
  'social media', 'salesforce', 'sap', 'accounting', 'financial modeling', 'sales', 'customer support', 'recruiting'
];

// Aliases normalizeSkill already maps, so "Node", "ReactJS" or "k8s" in a description count too
const EXTRA_TERMS = {
  'node.js': ['node', 'nodejs'], react: ['reactjs', 'react.js'], 'next.js': ['nextjs'], 'vue.js': ['vue', 'vuejs'],
  golang: ['go'], 'c++': ['cpp'], 'c#': ['csharp'], postgresql: ['postgres'], mongodb: ['mongo'], kubernetes: ['k8s'],
  gcp: ['google cloud'], 'machine learning': ['ml'], 'natural language processing': ['nlp'],
  'large language models': ['llm', 'llms'], 'rest api': ['rest', 'restful', 'rest apis'], tailwind: ['tailwindcss'],
  'express.js': ['express', 'expressjs'], 'spring boot': ['springboot'], '.net': ['dotnet', 'asp.net'],
  'scikit-learn': ['sklearn'], 'ci/cd': ['cicd'], 'data structures': ['dsa'], 'power bi': ['powerbi']
};

// Short words that are also everyday English ("go", "rest", "sap") only count as a skill when
// written the way the technology is: "Go", "REST", "SAP"
const WRITTEN_FORMS = {
  go: ['Go'], r: ['R'], ml: ['ML'], rest: ['REST', 'RESTful'], ios: ['iOS', 'IOS'], sql: ['SQL'],
  git: ['Git', 'GIT'], sap: ['SAP'], seo: ['SEO'], etl: ['ETL'], excel: ['Excel', 'MS Excel'], sales: ['Sales']
};

const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Word edges that also work next to symbols: "c++", ".net", "node.js"; "R&D" is not the R language
const bounded = (body, flags) => new RegExp(`(^|[^A-Za-z0-9+#.])(?:${body})(?=$|[^A-Za-z0-9+#&]|\\.(?![A-Za-z0-9]))`, flags);
const termPattern = (term) => (WRITTEN_FORMS[term]
  ? bounded(WRITTEN_FORMS[term].map(escape).join('|'), '')
  : bounded(escape(term), 'i'));

const TERMS = new Map();
function addTerm(term, canonical) {
  if (!TERMS.has(term)) TERMS.set(term, { canonical, pattern: termPattern(term) });
}
for (const skill of VOCABULARY) {
  addTerm(skill, skill);
  for (const alias of EXTRA_TERMS[skill] || []) addTerm(alias, skill);
}

/**
 * Skills mentioned in a job's text. `extra` adds the candidate's own skills, so a resume skill
 * that isn't in the vocabulary is still found when the job asks for it.
 * @returns {string[]} canonical skill names, de-duplicated
 */
export function extractSkills(text, extra = []) {
  const haystack = String(text || '');
  if (!haystack.trim()) return [];
  const found = new Set();
  for (const { canonical, pattern } of TERMS.values()) {
    if (!found.has(canonical) && pattern.test(haystack)) found.add(canonical);
  }
  for (const raw of extra) {
    const skill = normalizeSkill(raw);
    if (!skill || skill.length < 2 || found.has(skill)) continue;
    if (termPattern(skill).test(haystack)) found.add(skill);
  }
  return [...found];
}
