// Turns a resume's text and Claude's reading of it into a score where every point has a stated reason.
// Anything that can be counted is counted here. Claude only supplies what needs judgement (which keywords
// a role calls for, how specific the achievements are), and whatever it says about the resume is checked
// against the resume's own text before a user sees it.

const clean = (text = '') => String(text)
  .toLowerCase()
  .replace(/[‘’]/g, "'")
  .replace(/[“”]/g, '"')
  .replace(/[‐-―]/g, '-')
  .replace(/\s+/g, ' ')
  .trim();

const list = (value) => (Array.isArray(value) ? value : []);
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const joinNames = (names, max = 6) => names.slice(0, max).join(', ') + (names.length > max ? ` and ${names.length - max} more` : '');

// True when a word or skill appears as its own term ("C" must not match inside "CSS", "C++" must stay whole)
export function hasTerm(cleanText, term) {
  const t = clean(term);
  if (!t) return false;
  const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![a-z0-9+#])${escaped}(?![a-z0-9+#])`).test(cleanText);
}

// ─── Reading the resume ──────────────────────────────────────────────────────

const HEADINGS = [
  ['summary', /^((professional|career|executive|personal) )?(summary|profile|objective)$|^about( me)?$/],
  ['experience', /^((work|professional|relevant|employment|industry|internship) )?(experience|history)$|^employment$|^internships?$|^work$/],
  ['projects', /^((academic|personal|key|selected|technical|major) )?projects?$/],
  ['education', /^(education|academics?|academic (background|qualifications?|details)|qualifications?)$/],
  ['skills', /^((technical|key|core|professional|it) )?(skills?|competenc(y|ies))( (&|and) (tools|technologies|expertise|interests))?$|^technologies$|^tools$|^tech stack$/],
  ['other', /^(certifications?|licenses?|awards?|honou?rs|achievements?|languages?|interests?|hobbies|publications?|references?|declaration|volunteer(ing)?|activities|extra ?curricular( activities)?|positions? of responsibility|co ?curricular( activities)?|personal (details|information))$/]
];

function headingOf(line) {
  const bare = line.trim().replace(/^[^a-zA-Z]+|[^a-zA-Z)]+$/g, '');
  if (!bare || bare.length > 45 || bare.split(/\s+/).length > 5) return null;
  const lower = bare.toLowerCase().replace(/\s+/g, ' ');
  return HEADINGS.find(([, pattern]) => pattern.test(lower))?.[0] || null;
}

export function splitSections(text) {
  const sections = { top: [] };
  let current = 'top';
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const heading = headingOf(line);
    if (heading) {
      current = heading;
      sections[current] ||= [];
    } else {
      sections[current].push(line);
    }
  }
  return sections;
}

//  and friends are the private-use bullets that Word puts in PDFs
const BULLET = /^[\s]*[•●▪◦‣∙·○■□◆❖➢➤►✓✔*-]\s*/;
const DATE_RANGE = /\b(?:19|20)\d{2}\b|\bpresent\b/i;
const ENDS_MID_SENTENCE = /(?:,|\b(?:and|or|of|to|for|with|the|a|an|in|on|by|using|at|from|into|via))$/i;

// A PDF breaks a long bullet over several lines, so the pieces are joined before anything is counted
export function findBullets(sections) {
  const lines = [...(sections.experience || []), ...(sections.projects || [])];
  const hasGlyphs = lines.filter((line) => BULLET.test(line)).length >= 2;
  const bullets = [];
  let open = false;

  for (const line of lines) {
    const isBullet = BULLET.test(line);
    const body = line.replace(BULLET, '').trim();
    const continues = open && bullets.length > 0
      && !isBullet
      && !DATE_RANGE.test(line)
      && (/^[a-z0-9(]/.test(body) || ENDS_MID_SENTENCE.test(bullets[bullets.length - 1]));

    if (continues) {
      bullets[bullets.length - 1] += ` ${body}`;
    } else if (hasGlyphs ? isBullet : (body.split(/\s+/).length >= 6 && !DATE_RANGE.test(line))) {
      bullets.push(body);
      open = true;
    } else {
      open = false;
    }
  }
  return bullets.filter((b) => b.split(/\s+/).length >= 4);
}

// A version number or a year is not a result
const VERSIONED_NAME = /\b(?:python|java|angular|html|css|php|ruby|vue|node|ios|android|windows|ubuntu|oauth|es|net|web)\s*\d+(?:\.\d+)*\b/gi;
const YEAR = /\b(?:19|20)\d{2}\b/g;
const NUMBER = /(?<![a-z0-9.])\d[\d,.]*(?:\s?(?:%|\+|x\b|k\b|m\b|l\b|cr\b|bn?\b|lakhs?\b|crores?\b|million\b|billion\b|thousand\b)|(?![a-z0-9]))/i;

export const hasResult = (bullet) => NUMBER.test(bullet.replace(VERSIONED_NAME, ' ').replace(YEAR, ' '));

const VERBS = `accelerate achieve administer analyze architect audit authorize automate boost build calculate centralize coach collaborate
compile complete conduct configure consolidate construct contribute convert coordinate create cut debug decrease define deliver deploy design
detect develop devise diagnose direct discover document double drive earn eliminate enable engineer enhance establish evaluate execute expand
expedite extract facilitate forecast form formulate found generate grow guide identify implement improve increase initiate innovate install
instruct integrate introduce launch lead lower maintain manage map mentor merge migrate model modernize monitor negotiate operate optimize
orchestrate organize oversee own parse partner perform pilot pitch plan present prioritize produce program propose prototype publish raise
rebuild recruit redesign reduce refactor research resolve restructure revamp review run save scale schedule secure ship simplify solve
standardize streamline strengthen supervise support test train transform triple troubleshoot unify update upgrade validate win write`.split(/\s+/);

const VERB_FORMS = new Set(['led', 'built', 'rebuilt', 'ran', 'won', 'drove', 'wrote', 'rewrote', 'grew', 'cut', 'found', 'made', 'spoke', 'taught', 'sold', 'set', 'took', 'began', 'brought', 'kept', 'held', 'gave', 'oversaw', 'shipped']);
// These end in -ed but describe a person, not something they did
const NOT_ACTIONS = new Set(['experienced', 'skilled', 'dedicated', 'motivated', 'talented', 'seasoned', 'detailed', 'certified', 'qualified', 'based', 'related', 'advanced', 'varied', 'distributed']);
for (const verb of VERBS) {
  const stem = verb.replace(/e$/, '');
  for (const form of [verb, `${verb}s`, `${stem}ed`, `${stem}ing`, `${verb}${verb.slice(-1)}ed`]) VERB_FORMS.add(form);
  if (verb.endsWith('y')) VERB_FORMS.add(`${verb.slice(0, -1)}ied`);
}

const WEAK_OPENING = /^(?:responsible for|worked (?:on|with|as)|working on|helped|assisted|involved in|participated in|duties included|tasked with|in charge of|was|were)\b/i;

export const opensWithAction = (bullet) => {
  if (WEAK_OPENING.test(bullet)) return false;
  const first = bullet.toLowerCase().match(/[a-z-]+/)?.[0] || '';
  // A word list can never hold every verb, so any past-tense opening counts
  return VERB_FORMS.has(first) || (first.length > 3 && first.endsWith('ed') && !NOT_ACTIONS.has(first));
};

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE = /\+?\d[\d\s().-]{8,17}\d/g;
const PROFILE_LINK = /linkedin|github|gitlab|behance|portfolio|https?:\/\/|www\./i;

function hasPhone(text) {
  return (text.match(PHONE) || []).some((match) => {
    const digits = match.replace(/\D/g, '').length;
    return digits >= 10 && digits <= 15 && !/(?:19|20)\d{2}\s*[-–]\s*(?:19|20)\d{2}/.test(match);
  });
}

// ─── Criteria ────────────────────────────────────────────────────────────────

const criterion = (id, label, max, source, points, reason, fix = '', evidence = [], evidenceLabel = '') => ({
  id, label, max, source,
  points: Math.max(0, Math.min(max, Math.round(points))),
  reason, fix, evidence, evidenceLabel
});

// Full marks arrive at `target`, so a resume need not be perfect to earn them
const scaled = (ratio, target, max) => Math.min(1, ratio / target) * max;

function keywordCriteria(text, sections, ai) {
  const cleanText = clean(text);
  const claimedFound = list(ai.keywords?.matched).map(String);
  const claimedMissing = list(ai.keywords?.missing).map(String);

  // A keyword only counts as found if it is really there, and a "missing" one that is there was simply found
  const matched = [...new Set([...claimedFound, ...claimedMissing].filter((k) => hasTerm(cleanText, k)))].slice(0, 30);
  const missing = [...new Set(claimedMissing.filter((k) => !hasTerm(cleanText, k)))].slice(0, 15);
  const total = matched.length + missing.length;
  const role = String(ai.targetRole || 'your field').trim();

  const coverage = total
    ? criterion('role-keywords', 'Keywords for this role', 20, 'ai', scaled(matched.length / total, 0.8, 20),
      `${matched.length} of ${plural(total, 'keyword')} commonly asked for in ${role} roles are in your resume.`,
      missing.length ? `Add these where they are true for you: ${joinNames(missing)}.` : '')
    : criterion('role-keywords', 'Keywords for this role', 20, 'ai', 0,
      'No role keywords could be worked out from this resume.',
      'State your role and the tools you use in a summary and a skills section.');

  const worked = clean([...(sections.experience || []), ...(sections.projects || [])].join(' '));
  const usedInWork = matched.filter((k) => hasTerm(worked, k));
  const listedOnly = matched.filter((k) => !hasTerm(worked, k));
  const usage = matched.length
    ? criterion('keywords-in-work', 'Keywords backed by real work', 10, 'counted', scaled(usedInWork.length / matched.length, 0.6, 10),
      listedOnly.length
        ? `${usedInWork.length} of ${plural(matched.length, 'keyword')} appear in your Experience or Projects. ${joinNames(listedOnly)} ${listedOnly.length === 1 ? 'appears' : 'appear'} nowhere in that work.`
        : `All ${plural(matched.length, 'keyword')} appear in your Experience or Projects.`,
      listedOnly.length ? `Mention ${joinNames(listedOnly, 3)} in a bullet that shows where you used ${listedOnly.length === 1 ? 'it' : 'them'}.` : '')
    : criterion('keywords-in-work', 'Keywords backed by real work', 10, 'counted', 0,
      'None of the role keywords were found, so none are backed by your work.',
      'Name the tools you used inside your Experience or Projects bullets.');

  return { criteria: [coverage, usage], matched, missing };
}

function impactCriteria(text, bullets, ai) {
  const cleanText = clean(text);
  const noBullets = 'No bullet points were found under Experience or Projects.';
  const addBullets = 'Add a section called Experience or Projects with one bullet per achievement.';

  const withResult = bullets.filter(hasResult);
  const withoutResult = bullets.filter((b) => !hasResult(b));
  const toAdd = Math.max(0, Math.ceil(bullets.length * 0.5) - withResult.length);
  const results = bullets.length
    ? criterion('measurable-results', 'Measurable results', 20, 'counted', scaled(withResult.length / bullets.length, 0.5, 20),
      `${withResult.length} of ${plural(bullets.length, 'bullet')} include a number such as a percentage, amount or team size.`,
      toAdd ? `Add a real number to ${plural(toAdd, 'more bullet')}, such as how many, how much or how fast.` : '',
      toAdd ? withoutResult.slice(0, 2) : [], 'Bullets with no number')
    : criterion('measurable-results', 'Measurable results', 20, 'counted', 0, noBullets, addBullets);

  const strong = bullets.filter(opensWithAction);
  const weak = bullets.filter((b) => !opensWithAction(b));
  const toFix = Math.max(0, Math.ceil(bullets.length * 0.7) - strong.length);
  const verbs = bullets.length
    ? criterion('action-verbs', 'Bullets that start with action', 10, 'counted', scaled(strong.length / bullets.length, 0.7, 10),
      `${strong.length} of ${plural(bullets.length, 'bullet')} start with a clear action verb such as Built, Led or Reduced.`,
      toFix ? `Rewrite ${plural(toFix, 'more bullet')} to open with what you did, such as Built, Fixed or Reduced.` : '',
      toFix ? weak.slice(0, 2) : [], 'Bullets that open weakly')
    : criterion('action-verbs', 'Bullets that start with action', 10, 'counted', 0, noBullets, addBullets);

  const quotes = list(ai.contentDepth?.quotes).map(String).filter((q) => q.trim() && cleanText.includes(clean(q))).slice(0, 2);
  const rating = Math.max(0, Math.min(5, Math.round(Number(ai.contentDepth?.rating) || 0)));
  const depth = quotes.length
    ? criterion('specific-work', 'How specific your work is', 15, 'ai', rating * 3,
      String(ai.contentDepth?.reason || '').trim(), rating < 5 ? String(ai.contentDepth?.fix || '').trim() : '', quotes, 'Lines this is based on')
    : criterion('specific-work', 'How specific your work is', 15, 'ai', 9,
      'This could not be tied to a line in your resume, so it gets a middle mark.',
      'Say what you built, with which tools, and what changed because of it.');

  return [results, verbs, depth];
}

function structureCriteria(text, sections) {
  const words = String(text).split(/\s+/).filter(Boolean).length;

  const email = EMAIL.test(text);
  const phone = hasPhone(text);
  const link = PROFILE_LINK.test(text);
  const contactMissing = [!email && 'an email address', !phone && 'a phone number', !link && 'a LinkedIn or portfolio link'].filter(Boolean);
  const contactFound = [email && 'email', phone && 'phone', link && 'profile link'].filter(Boolean);
  const contact = criterion('contact', 'Contact details', 8, 'counted',
    (email ? 3 : 0) + (phone ? 3 : 0) + (link ? 2 : 0),
    contactMissing.length
      ? `${contactFound.length ? `Found ${joinNames(contactFound)}. ` : ''}Missing ${joinNames(contactMissing)}.`
      : 'Email, phone and a profile link are all there.',
    contactMissing.length ? `Add ${joinNames(contactMissing)} at the top of your resume.` : '');

  const work = Boolean(sections.experience?.length || sections.projects?.length);
  const education = Boolean(sections.education?.length);
  const skills = Boolean(sections.skills?.length);
  const absent = [!work && 'Experience or Projects', !education && 'Education', !skills && 'Skills'].filter(Boolean);
  const standard = criterion('sections', 'Standard sections', 9, 'counted',
    (work ? 4 : 0) + (education ? 3 : 0) + (skills ? 2 : 0),
    absent.length ? `No section headed ${joinNames(absent).replace(/, ([^,]*)$/, ' or $1')} was found. Applicant systems look for these headings.` : 'Experience or Projects, Education and Skills are all headed clearly.',
    absent.length ? `Add a clearly headed ${joinNames(absent)} section.` : '');

  const goodLength = words >= 250 && words <= 1000;
  const okLength = words >= 150 && words <= 1400;
  const length = criterion('length', 'Length', 4, 'counted', goodLength ? 4 : okLength ? 2 : 0,
    `Your resume has about ${words} words. A range of 250 to 1000 suits most resumes.`,
    goodLength ? '' : words < 250 ? 'Add more detail about your work and projects.' : 'Cut older or repeated points to bring the length down.');

  const dated = (name) => DATE_RANGE.test((sections[name] || []).join(' '));
  const needsDates = ['experience', 'education'].filter((name) => sections[name]?.length);
  const undated = needsDates.filter((name) => !dated(name));
  const dates = criterion('dates', 'Dates on experience and education', 4, 'counted',
    needsDates.length ? ((needsDates.length - undated.length) / needsDates.length) * 4 : 0,
    !needsDates.length ? 'No Experience or Education section was found to check for dates.'
      : undated.length ? `No dates were found in your ${undated.join(' or ')} section.`
        : `Dates were found in your ${needsDates.join(' and ')} section${needsDates.length > 1 ? 's' : ''}.`,
    !needsDates.length ? 'Add Experience or Education with start and end dates.' : undated.length ? `Add start and end years to your ${undated.join(' and ')}.` : '');

  return [contact, standard, length, dates];
}

// ─── Result ──────────────────────────────────────────────────────────────────

const percent = (group) => Math.round((group.points / group.max) * 100);

function group(id, label, criteria) {
  return {
    id, label, criteria,
    points: criteria.reduce((sum, c) => sum + c.points, 0),
    max: criteria.reduce((sum, c) => sum + c.max, 0)
  };
}

const describe = (criteria) => criteria.map((c) => c.reason).filter(Boolean).join(' ');

// Claude's points must each rest on a line of the resume, or they are left out
const proven = (items, cleanText) => list(items)
  .filter((item) => String(item?.point || '').trim() && String(item?.quote || '').trim() && cleanText.includes(clean(item.quote)))
  .map((item) => String(item.point).trim());

/**
 * Builds the report a user sees.
 * @param {string} resumeText - The text read from the file.
 * @param {object} ai - Claude's reading of it (see resumeReadingSchema in gemini.js).
 */
export function scoreResume(resumeText, ai = {}) {
  const sections = splitSections(resumeText);
  const bullets = findBullets(sections);
  const cleanText = clean(resumeText);

  const { criteria: keywordRows, matched, missing } = keywordCriteria(resumeText, sections, ai);
  const groups = [
    group('keywords', 'ATS keywords', keywordRows),
    group('impact', 'Content & impact', impactCriteria(resumeText, bullets, ai)),
    group('structure', 'Structure', structureCriteria(resumeText, sections))
  ];
  const [keywords, impact, structure] = groups;
  const rows = groups.flatMap((g) => g.criteria);

  const gains = rows
    .filter((c) => c.points < c.max && c.fix)
    .sort((a, b) => (b.max - b.points) - (a.max - a.points))
    .map((c) => ({ id: c.id, label: c.label, gain: c.max - c.points, fix: c.fix }));

  const suggestions = list(ai.rewrites)
    .filter((r) => String(r?.original || '').trim() && String(r?.improved || '').trim() && cleanText.includes(clean(r.original)))
    .slice(0, 3)
    .map((r) => ({ original: String(r.original).trim(), improved: String(r.improved).trim() }));

  const strengths = proven(ai.strengths, cleanText);
  const weaknesses = proven(ai.weaknesses, cleanText);
  const best = [...rows].filter((c) => c.points === c.max).map((c) => c.reason);
  const worst = gains.map((g) => rows.find((c) => c.id === g.id).reason);

  return {
    score: Math.max(1, groups.reduce((sum, g) => sum + g.points, 0)),
    summary: String(ai.summary || '').trim(),
    targetRole: String(ai.targetRole || '').trim(),
    atsKeywords: { score: percent(keywords), matched, missing, feedback: describe(keywords.criteria) },
    contentAndImpact: { score: percent(impact), feedback: describe(impact.criteria), suggestions },
    formattingAndStyle: { score: percent(structure), feedback: describe(structure.criteria) },
    strengths: (strengths.length ? strengths : best).slice(0, 4),
    weaknesses: (weaknesses.length ? weaknesses : worst).slice(0, 4),
    recommendations: gains.slice(0, 5).map((g) => g.fix),
    scoreDetails: { groups, gains }
  };
}
