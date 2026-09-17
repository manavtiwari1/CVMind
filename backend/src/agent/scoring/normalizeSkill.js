// canonical -> aliases. Applied to discrete skill tokens only, never to prose (so "go" -> golang is safe here)
const SKILL_ALIASES = {
  javascript: ['js', 'ecmascript', 'es6', 'es2015'],
  typescript: ['ts'],
  react: ['reactjs', 'react.js', 'react js'],
  'react native': ['react-native', 'reactnative'],
  'node.js': ['node', 'nodejs', 'node js'],
  'next.js': ['nextjs', 'next js'],
  'vue.js': ['vue', 'vuejs', 'vue js'],
  angular: ['angularjs', 'angular.js'],
  'express.js': ['express', 'expressjs'],
  python: ['python3', 'py'],
  golang: ['go', 'go lang'],
  'c++': ['cpp', 'cplusplus'],
  'c#': ['csharp', 'c sharp'],
  '.net': ['dotnet', 'dot net', 'asp.net', '.net core'],
  postgresql: ['postgres', 'psql', 'postgre'],
  mongodb: ['mongo'],
  mysql: ['my sql'],
  kubernetes: ['k8s'],
  aws: ['amazon web services'],
  gcp: ['google cloud', 'google cloud platform'],
  azure: ['microsoft azure'],
  'ci/cd': ['cicd', 'ci cd', 'continuous integration', 'continuous delivery'],
  'machine learning': ['ml'],
  'deep learning': ['dl'],
  'natural language processing': ['nlp'],
  'computer vision': ['cv'],
  'large language models': ['llm', 'llms'],
  // Job posts often list a bare "APIs" as a requirement; on a backend role that means REST APIs
  'rest api': ['rest', 'restful', 'rest apis', 'restful api', 'restful apis', 'api', 'apis', 'api development'],
  graphql: ['graph ql'],
  tensorflow: ['tf'],
  pytorch: ['torch'],
  'scikit-learn': ['sklearn', 'scikit learn'],
  html: ['html5'],
  css: ['css3'],
  tailwind: ['tailwindcss', 'tailwind css'],
  'spring boot': ['springboot'],
  terraform: ['tf cloud'],
  'data structures': ['dsa', 'data structures and algorithms'],
  'amazon s3': ['s3'],
  // Git, GitHub and GitLab are three different things: collapsing them credited "GitHub"
  // as version-control skill and turned the employer name GitLab into a missing skill
  git: ['git scm'],
  github: ['github actions'],
  gitlab: ['gitlab ci', 'gitlab ci/cd']
};

const ALIAS_INDEX = new Map();
for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
  ALIAS_INDEX.set(canonical, canonical);
  for (const alias of aliases) ALIAS_INDEX.set(alias, canonical);
}

function clean(raw) {
  return String(raw ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[()[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeSkill(raw) {
  const skill = clean(raw);
  if (!skill) return '';
  if (ALIAS_INDEX.has(skill)) return ALIAS_INDEX.get(skill);

  // "Python 3.11", "React 18", "Java v17" -> base skill
  const unversioned = skill.replace(/\s+v?\d+(\.\d+)*\+?$/, '').trim();
  if (ALIAS_INDEX.has(unversioned)) return ALIAS_INDEX.get(unversioned);
  return unversioned || skill;
}

export function normalizeSkillList(list = []) {
  return [...new Set(list.map(normalizeSkill).filter(Boolean))];
}

// Having the key skill earns partial credit for each listed skill (Next.js work implies React knowledge)
const SKILL_IMPLICATIONS = {
  'next.js': ['react', 'javascript'],
  react: ['javascript'],
  'react native': ['react', 'javascript'],
  'vue.js': ['javascript'],
  angular: ['typescript', 'javascript'],
  typescript: ['javascript'],
  'node.js': ['javascript'],
  'express.js': ['node.js', 'javascript'],
  django: ['python'],
  flask: ['python'],
  fastapi: ['python'],
  pandas: ['python'],
  pytorch: ['deep learning', 'machine learning', 'python'],
  tensorflow: ['deep learning', 'machine learning', 'python'],
  'scikit-learn': ['machine learning', 'python'],
  'spring boot': ['java'],
  kubernetes: ['docker'],
  postgresql: ['sql'],
  mysql: ['sql'],
  'amazon s3': ['aws'],
  'deep learning': ['machine learning'],
  'natural language processing': ['machine learning'],
  'computer vision': ['machine learning'],
  'large language models': ['natural language processing', 'machine learning']
};

export function impliedSkillSet(skills) {
  const have = skills instanceof Set ? skills : new Set(skills);
  const implied = new Set();
  const pending = [...have];
  while (pending.length) {
    for (const next of SKILL_IMPLICATIONS[pending.pop()] || []) {
      if (have.has(next) || implied.has(next)) continue;
      implied.add(next);
      pending.push(next);
    }
  }
  return implied;
}
