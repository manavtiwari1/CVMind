const DEGREE_RANK = { none: 0, high_school: 1, associate: 2, bachelor: 3, master: 4, phd: 5 };
const DEGREE_LABEL = {
  high_school: 'a high school diploma',
  associate: 'an associate degree or diploma',
  bachelor: "a bachelor's degree",
  master: "a master's degree",
  phd: 'a PhD'
};

// "Acme Pvt. Ltd." and "acme" should be treated as the same company
export function companySlug(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|limited|pvt|private|corp|corporation|co|gmbh|plc)\b\.?/g, '')
    .replace(/[^a-z0-9]/g, '');
}

const lower = (value) => String(value || '').toLowerCase();

// Hard requirements are reported separately from the score: pass | fail | warn | unknown | n_a
export function evaluateGates({ resume, job, preferences }, cfg) {
  const gates = [];
  const requirements = job.requirements || {};

  const years = resume.derived?.totalYearsExperience ?? 0;
  const minYears = requirements.minYearsExperience;
  if (minYears === null || minYears === undefined) {
    gates.push({ key: 'min_years', result: 'n_a', required: null, actual: years, reason: 'No minimum experience is stated.' });
  } else {
    const passes = years + cfg.yearsTolerance >= minYears;
    gates.push({
      key: 'min_years',
      result: passes ? 'pass' : 'fail',
      required: minYears,
      actual: years,
      reason: passes ? `You have ${years} years; the job asks for ${minYears}+.` : `The job asks for ${minYears}+ years; your resume shows ${years}.`
    });
  }

  const level = requirements.educationLevel;
  if (!level || !(level in DEGREE_RANK)) {
    gates.push({ key: 'education', result: 'n_a', required: null, actual: null, reason: 'No degree requirement is stated.' });
  } else {
    const education = resume.structured?.education || [];
    const highest = education.reduce((max, edu) => Math.max(max, DEGREE_RANK[edu.degreeLevel] ?? 0), -1);
    const actual = Object.keys(DEGREE_RANK).find((key) => DEGREE_RANK[key] === highest) ?? null;
    if (!education.length) {
      gates.push({ key: 'education', result: 'unknown', required: level, actual, reason: `The job asks for ${DEGREE_LABEL[level]}, but no education was found on your resume.` });
    } else if (highest >= DEGREE_RANK[level]) {
      gates.push({ key: 'education', result: 'pass', required: level, actual, reason: `Meets the requirement for ${DEGREE_LABEL[level]}.` });
    } else if (requirements.equivalentExperienceAccepted) {
      gates.push({ key: 'education', result: 'warn', required: level, actual, reason: 'Below the stated degree, but the job accepts equivalent experience.' });
    } else {
      gates.push({ key: 'education', result: 'fail', required: level, actual, reason: `The job requires ${DEGREE_LABEL[level]}.` });
    }
  }

  if (requirements.sponsorshipAvailable === 'no') {
    const location = lower(job.location);
    const entry = (preferences.workAuthorization || []).find((auth) => auth.country && location.includes(lower(auth.country)));
    if (!entry) {
      gates.push({ key: 'sponsorship', result: 'unknown', required: 'no_sponsorship', actual: null, reason: 'The job does not sponsor visas. Add your work authorization for this country in preferences.' });
    } else if (entry.authorized && !entry.needsSponsorship) {
      gates.push({ key: 'sponsorship', result: 'pass', required: 'no_sponsorship', actual: 'authorized', reason: `You are authorized to work in ${entry.country}.` });
    } else {
      gates.push({ key: 'sponsorship', result: 'fail', required: 'no_sponsorship', actual: 'needs_sponsorship', reason: `The job does not sponsor visas and you need sponsorship in ${entry.country}.` });
    }
  }

  const companyName = job.company?.name || '';
  const excludedCompany = (preferences.excludedCompanies || []).find((name) => companySlug(name) && companySlug(name) === companySlug(companyName));
  if (excludedCompany) {
    gates.push({ key: 'excluded_company', result: 'fail', required: null, actual: companyName, reason: `You excluded ${companyName} in your preferences.` });
  }

  const industry = lower(job.industry);
  const excludedIndustry = industry && (preferences.excludeIndustries || []).find((name) => name && (industry.includes(lower(name)) || lower(name).includes(industry)));
  if (excludedIndustry) {
    gates.push({ key: 'excluded_industry', result: 'fail', required: null, actual: job.industry, reason: `You chose to avoid the ${excludedIndustry} industry.` });
  }

  return { gates, gatesPassed: gates.every((gate) => gate.result !== 'fail') };
}
