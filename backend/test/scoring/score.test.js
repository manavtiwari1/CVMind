import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCORING } from '../../src/agent/config.js';
import { scoreSkills } from '../../src/agent/scoring/skills.js';
import { scoreSemantic, calibrate, recencyWeight } from '../../src/agent/scoring/semantic.js';
import { evaluateGates, companySlug } from '../../src/agent/scoring/gates.js';
import { scoreFit } from '../../src/agent/scoring/fit.js';
import { computeScore } from '../../src/agent/scoring/score.js';
import { impliedSkillSet } from '../../src/agent/scoring/normalizeSkill.js';
import { l2normalize } from '../../src/agent/ai/geminiClient.js';
import { DEFAULT_PREFERENCES } from '../../src/agent/preferences/schema.js';

const NOW = new Date(Date.UTC(2026, 8, 14));
const prefs = (overrides = {}) => ({ ...structuredClone(DEFAULT_PREFERENCES), ...overrides });

test('impliedSkillSet follows implications transitively without re-adding owned skills', () => {
  assert.deepEqual([...impliedSkillSet(new Set(['next.js']))].sort(), ['javascript', 'react']);
  assert.deepEqual([...impliedSkillSet(new Set(['large language models', 'machine learning']))].sort(), ['natural language processing']);
});

test('scoreSkills gives full credit for owned skills, partial for implied, and half weight to nice-to-haves', () => {
  const result = scoreSkills({ candidateSkills: ['next.js', 'postgresql'], mustHave: ['react', 'postgresql', 'kubernetes'], niceToHave: ['golang'] }, SCORING);
  assert.ok(Math.abs(result.value - (0.6 + 1) / 3.5) < 1e-9);
  assert.deepEqual(result.matched, ['postgresql']);
  assert.deepEqual(result.implied, ['react']);
  assert.deepEqual(result.missing, ['kubernetes', 'golang']);
  assert.deepEqual(result.missingMustHave, ['kubernetes']);
  assert.equal(scoreSkills({ candidateSkills: ['react'] }, SCORING).value, null);
});

test('calibrate stretches and clamps similarity', () => {
  assert.equal(calibrate(0.4, { lo: 0.55, hi: 0.85 }), 0);
  assert.equal(calibrate(0.7, { lo: 0.55, hi: 0.85 }).toFixed(3), '0.500');
  assert.equal(calibrate(0.99, { lo: 0.55, hi: 0.85 }), 1);
});

test('recencyWeight discounts older roles', () => {
  assert.equal(recencyWeight({ current: true }, NOW), 1);
  assert.equal(recencyWeight({ endDate: '2024-06' }, NOW), 1);
  assert.equal(recencyWeight({ endDate: '2021-01' }, NOW), 0.9);
  assert.equal(recencyWeight({ endDate: '2015' }, NOW), 0.8);
});

test('scoreSemantic takes the best bullet per responsibility and weights core duties', () => {
  const responsibilities = [
    { text: 'Own payments', core: true, vector: l2normalize([1, 0]) },
    { text: 'Run infra', core: false, vector: l2normalize([0, 1]) }
  ];
  const units = [
    { bulletId: 'exp0-b0', text: 'Built billing', recency: 1, vector: l2normalize([1, 0]) },
    { bulletId: 'exp1-b0', text: 'Ran k8s', recency: 0.8, vector: l2normalize([0.6, 0.8]) }
  ];
  const result = scoreSemantic({ responsibilities, units }, { ...SCORING, semanticCalibration: { lo: 0, hi: 1 } });
  assert.equal(result.raw, Math.round(((1.5 * 1 + 0.64) / 2.5) * 1000) / 1000);
  assert.equal(result.topMatches[0].bulletId, 'exp0-b0');
  assert.equal(result.topMatches.find((m) => m.responsibility === 'Run infra').bulletId, 'exp1-b0');
  assert.equal(scoreSemantic({ responsibilities, units: [] }, SCORING).value, null);
});

test('evaluateGates checks years with tolerance, education, sponsorship and exclusions', () => {
  const resume = { derived: { totalYearsExperience: 4.6 }, structured: { education: [{ degreeLevel: 'bachelor' }] } };
  const job = {
    location: 'Berlin, Germany',
    company: { name: 'Acme GmbH' },
    industry: 'Gambling',
    requirements: { minYearsExperience: 5, educationLevel: 'master', equivalentExperienceAccepted: false, sponsorshipAvailable: 'no' }
  };
  const { gates, gatesPassed } = evaluateGates({
    resume,
    job,
    preferences: prefs({ excludedCompanies: ['acme'], excludeIndustries: ['gambling'], workAuthorization: [{ country: 'Germany', authorized: false, needsSponsorship: true }] })
  }, SCORING);
  const byKey = Object.fromEntries(gates.map((g) => [g.key, g.result]));
  assert.deepEqual(byKey, { min_years: 'pass', education: 'fail', sponsorship: 'fail', excluded_company: 'fail', excluded_industry: 'fail' });
  assert.equal(gatesPassed, false);

  const lenient = evaluateGates({
    resume: { derived: { totalYearsExperience: 2 }, structured: { education: [] } },
    job: { location: 'Remote', requirements: { minYearsExperience: 5, educationLevel: 'bachelor', sponsorshipAvailable: 'no' } },
    preferences: prefs()
  }, SCORING).gates;
  assert.deepEqual(lenient.map((g) => g.result), ['fail', 'unknown', 'unknown']);

  const equivalent = evaluateGates({ resume, job: { requirements: { educationLevel: 'master', equivalentExperienceAccepted: true } }, preferences: prefs() }, SCORING).gates;
  assert.equal(equivalent.find((g) => g.key === 'education').result, 'warn');
  assert.equal(companySlug('Acme Pvt. Ltd.'), 'acme');
});

test('scoreFit scores seniority distance and only the preferences that can be compared', () => {
  const resume = { derived: { seniority: 'mid' } };
  const job = { seniority: 'senior', workMode: 'onsite', location: 'Pune, India', employmentType: 'full_time', industry: 'Fintech', salary: { min: 2000000, max: 3000000, currency: 'INR', period: 'year' } };
  const fit = scoreFit({
    resume,
    job,
    preferences: prefs({ workModes: ['remote'], willingToRelocate: true, employmentTypes: ['full_time'], minSalary: { amount: 2500000, currency: 'INR', period: 'year' }, includeIndustries: ['Healthcare'] }),
    titleSimilarity: 0.75
  }, SCORING);
  assert.equal(fit.seniority, 0.5);
  assert.equal(fit.title, 0.5);
  // work mode mismatch but relocation 0.5, type 1, salary 1, industry 0.5
  assert.equal(fit.preferences, (0 + 1 + 1 + 0.5) / 4);

  const empty = scoreFit({ resume: { derived: {} }, job: { seniority: 'unknown' }, preferences: prefs({ employmentTypes: [] }), titleSimilarity: null }, SCORING);
  assert.deepEqual(empty, { title: null, seniority: null, preferences: null });
});

test('computeScore redistributes weight away from missing components and ranks candidates sensibly', () => {
  const job = {
    seniority: 'senior',
    requirements: { normalizedMust: ['node.js', 'postgresql', 'kubernetes'], normalizedNice: ['golang'], minYearsExperience: 3 },
    company: { name: 'Acme' }
  };
  const resumeWith = (skills, years, seniority) => ({ derived: { normalizedSkillSet: skills, totalYearsExperience: years, seniority }, structured: { education: [] } });

  const strong = computeScore({ resume: resumeWith(['node.js', 'postgresql', 'kubernetes', 'golang'], 6, 'senior'), job, preferences: prefs(), now: NOW });
  const partial = computeScore({ resume: resumeWith(['node.js', 'postgresql'], 4, 'mid'), job, preferences: prefs(), now: NOW });
  const poor = computeScore({ resume: resumeWith(['figma'], 1, 'junior'), job, preferences: prefs(), now: NOW });

  assert.equal(strong.components.semantic, null);
  assert.deepEqual(Object.keys(strong.weightsUsed).sort(), ['preferences', 'seniority', 'skills'].filter((k) => strong.components[k] !== null).sort());
  assert.equal(strong.total, 100);
  assert.ok(strong.total > partial.total && partial.total > poor.total);
  assert.equal(strong.recommendation, 'strong');
  assert.equal(poor.gatesPassed, false);
  assert.equal(poor.recommendation, 'not_recommended');
  assert.equal(strong.scoringVersion, SCORING.version);
});
