import { SENIORITY_LADDER } from './experience.js';
import { calibrate } from './semantic.js';

const lower = (value) => String(value || '').toLowerCase().trim();

// The 20% "fit" part of the score: title similarity, seniority distance and stated preferences
export function scoreFit({ resume, job, preferences, titleSimilarity }, cfg) {
  const title = typeof titleSimilarity === 'number' ? calibrate(titleSimilarity, cfg.titleCalibration) : null;

  const jobLevel = SENIORITY_LADDER.indexOf(job.seniority);
  const wantedLevels = (preferences.seniority?.length ? preferences.seniority : [resume.derived?.seniority])
    .map((level) => SENIORITY_LADDER.indexOf(level))
    .filter((index) => index >= 0);
  let seniority = null;
  if (jobLevel >= 0 && wantedLevels.length) {
    const distance = Math.min(...wantedLevels.map((level) => Math.abs(level - jobLevel)));
    seniority = distance === 0 ? 1 : distance === 1 ? 0.5 : 0;
  }

  const signals = [];
  const jobLocation = lower(job.location);
  const modes = preferences.workModes || [];
  const locations = (preferences.locations || []).map(lower).filter(Boolean);
  const modeKnown = Boolean(job.workMode) && job.workMode !== 'unknown';
  if ((modes.length && modeKnown) || (locations.length && jobLocation)) {
    const modeOk = !modes.length || !modeKnown || modes.includes(job.workMode);
    const locationOk = job.workMode === 'remote' || !locations.length || !jobLocation
      || locations.some((place) => jobLocation.includes(place) || place.includes(jobLocation));
    signals.push(modeOk && locationOk ? 1 : modeOk && preferences.willingToRelocate ? 0.5 : 0);
  }

  if (job.employmentType && !['other', 'unknown'].includes(job.employmentType) && preferences.employmentTypes?.length) {
    signals.push(preferences.employmentTypes.includes(job.employmentType) ? 1 : 0);
  }

  // Salaries are only compared in the same currency and period; no conversion guesses
  const minSalary = preferences.minSalary;
  const salary = job.salary;
  if (minSalary && salary && salary.currency === minSalary.currency && salary.period === minSalary.period) {
    signals.push(Math.max(salary.max || 0, salary.min || 0) >= minSalary.amount ? 1 : 0);
  }

  const industries = (preferences.includeIndustries || []).map(lower).filter(Boolean);
  const jobIndustry = lower(job.industry);
  if (industries.length && jobIndustry) {
    signals.push(industries.some((name) => jobIndustry.includes(name) || name.includes(jobIndustry)) ? 1 : 0.5);
  }

  return {
    title,
    seniority,
    preferences: signals.length ? signals.reduce((sum, value) => sum + value, 0) / signals.length : null
  };
}
