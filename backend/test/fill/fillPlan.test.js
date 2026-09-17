import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapFieldByRules, describeField } from '../../src/agent/fill/ruleMapper.js';
import { resolveValue, standardAnswerFor } from '../../src/agent/fill/resolveValue.js';
import { buildFillPlan } from '../../src/agent/fill/buildFillPlan.js';
import { buildProfileData } from '../../src/agent/resume/derive.js';
import { DEFAULT_PREFERENCES } from '../../src/agent/preferences/schema.js';
import { RESUME } from '../helpers/agentFixtures.js';

const { structured, derived } = buildProfileData(RESUME);

const preferences = {
  ...structuredClone(DEFAULT_PREFERENCES),
  noticePeriod: '30 days',
  minSalary: { amount: 2500000, currency: 'INR', period: 'year' },
  willingToRelocate: true,
  workAuthorization: [{ country: 'India', authorized: true, needsSponsorship: false }],
  standardAnswers: [{ key: 'why', question: 'Why do you want to work here?', answer: 'Your payments work matches mine.' }]
};

const context = {
  profile: structured,
  derived,
  preferences,
  job: { title: 'Senior Backend Engineer', location: 'Bengaluru, India', company: { name: 'Acme Pay' } },
  tailored: { coverLetter: { body: 'Dear Acme Pay team, ...' }, pdf: { filename: 'Ada_Lovelace_Resume.pdf' } }
};

const field = (overrides) => ({ id: overrides.id || overrides.name || 'f', type: 'text', tag: 'input', ...overrides });

test('mapFieldByRules matches common ATS field wording', () => {
  const cases = [
    [{ label: 'First Name *', name: 'first_name' }, 'first_name'],
    [{ label: 'Last name', name: 'job_application[last_name]' }, 'last_name'],
    [{ label: 'Email', type: 'email' }, 'email'],
    [{ label: 'Mobile number' }, 'phone'],
    [{ label: 'LinkedIn Profile', name: 'urls[LinkedIn]' }, 'linkedin'],
    [{ label: 'Resume/CV', type: 'file' }, 'resume_file'],
    [{ label: 'Total years of experience' }, 'years_experience'],
    [{ label: 'Current employer' }, 'current_company'],
    [{ label: 'University' }, 'school'],
    [{ label: 'Expected CTC' }, 'salary_expectation'],
    [{ label: 'Will you now or in the future require visa sponsorship?' }, 'sponsorship'],
    [{ label: 'Are you legally authorized to work in India?' }, 'work_authorization'],
    [{ label: 'Notice period' }, 'notice_period'],
    [{ label: 'Gender' }, 'eeo_gender'],
    [{ label: 'How did you hear about us?' }, 'how_heard'],
    [{ label: 'Why do you want to join us?', type: 'textarea' }, 'open_question']
  ];
  for (const [descriptor, expected] of cases) {
    assert.equal(mapFieldByRules(field(descriptor))?.canonicalKey, expected, descriptor.label);
  }
  assert.equal(mapFieldByRules(field({ label: 'Favourite colour' })), null);
  assert.equal(describeField({ label: 'First  Name', name: 'first_name' }), 'first name first name');
});

test('resolveValue reads from the profile, preferences and tailored documents', () => {
  const value = (key) => resolveValue(key, context).value;
  assert.equal(value('first_name'), 'Ada');
  assert.equal(value('last_name'), 'Lovelace');
  assert.equal(value('email'), 'ada@example.com');
  assert.equal(value('current_company'), 'Acme');
  assert.equal(value('current_title'), 'Senior Software Engineer');
  assert.ok(Number(value('years_experience')) > 5);
  assert.equal(value('school'), 'IIT');
  assert.equal(value('graduation_year'), '2019');
  assert.equal(value('notice_period'), '30 days');
  assert.equal(value('salary_expectation'), 'INR 2,500,000 per year');
  assert.equal(value('relocation'), 'Yes');
  assert.equal(value('work_authorization'), 'Yes');
  assert.equal(value('sponsorship'), 'No');
  assert.equal(value('eeo_gender'), 'decline');
  assert.match(value('cover_letter_text'), /^Dear Acme Pay team/);
  assert.equal(value('resume_file'), 'Ada_Lovelace_Resume.pdf');
  assert.equal(value('how_heard'), '');

  // Authorization for a country the user never listed stays blank rather than guessing
  const elsewhere = { ...context, job: { ...context.job, location: 'Berlin, Germany' }, preferences: { ...preferences, workAuthorization: [{ country: 'India', authorized: true, needsSponsorship: false }, { country: 'US', authorized: false, needsSponsorship: true }] } };
  assert.equal(resolveValue('work_authorization', elsewhere).value, '');
  assert.equal(standardAnswerFor({ label: 'Why do you want to work here?' }, preferences), 'Your payments work matches mine.');
});

test('buildFillPlan fills known fields, flags sensitive and AI-matched ones, and reports gaps', async () => {
  const descriptors = [
    field({ id: '1', selector: '#first_name', label: 'First Name', name: 'first_name', required: true }),
    field({ id: '2', selector: '#email', label: 'Email', type: 'email', required: true }),
    field({ id: '3', selector: '#resume', label: 'Resume', type: 'file', required: true }),
    field({ id: '4', selector: '#notice', label: 'Notice period' }),
    field({ id: '5', selector: '#relocate', label: 'Open to relocation?', tag: 'select', options: [{ value: 'y', text: 'Yes' }, { value: 'n', text: 'No' }] }),
    field({ id: '6', selector: '#start', label: 'Earliest start date', required: true }),
    field({ id: '7', selector: '#mystery', label: 'Team preference', required: true }),
    field({ id: '8', selector: '#why', label: 'Why do you want to work here?', type: 'textarea' })
  ];

  const aiCalls = [];
  const aiMapper = async (leftovers) => {
    aiCalls.push(leftovers.map((item) => item.id));
    return new Map([['7', { canonicalKey: 'current_title', answer: '' }]]);
  };

  const plan = await buildFillPlan(descriptors, context, { aiMapper });
  const byKey = Object.fromEntries(plan.items.map((item) => [item.canonicalKey, item]));

  assert.equal(byKey.first_name.value, 'Ada');
  assert.equal(byKey.first_name.requiresReview, false);
  assert.equal(byKey.resume_file.action, 'upload');
  assert.equal(byKey.notice_period.requiresReview, true);
  assert.equal(byKey.notice_period.sensitive, true);
  // A select whose options match resolves to the option value
  assert.equal(byKey.relocation.action, 'select');
  assert.equal(byKey.relocation.value, 'y');
  // The AI-matched field is filled but always flagged
  assert.equal(byKey.current_title.requiresReview, true);
  assert.match(byKey.current_title.reason, /AI/);
  // Saved answers beat generated ones
  assert.equal(byKey.open_question.value, 'Your payments work matches mine.');
  assert.equal(byKey.open_question.valueSource, 'standard_answer');

  // Required fields we cannot fill are reported, not silently skipped
  assert.deepEqual(plan.unmappedRequired.map((item) => item.selector), ['#start']);
  // Only genuinely unknown fields reach the model: field 6 is rule-matched (just unanswerable)
  // and field 8 is covered by a saved answer
  assert.deepEqual(aiCalls[0], ['7']);
  assert.equal(plan.stats.total, 8);
  assert.equal(plan.stats.needsReview, 3);
  assert.equal(plan.aiError, null);

  const again = await buildFillPlan(descriptors, context, { aiMapper });
  assert.equal(again.planHash, plan.planHash);
});

test('buildFillPlan still returns rule matches when the AI mapper fails', async () => {
  const descriptors = [
    field({ id: '1', selector: '#email', label: 'Email', type: 'email' }),
    field({ id: '2', selector: '#other', label: 'Something unusual' })
  ];
  const plan = await buildFillPlan(descriptors, context, { aiMapper: async () => { throw new Error('model unavailable'); } });
  assert.deepEqual(plan.items.map((item) => item.canonicalKey), ['email']);
  assert.equal(plan.aiError, 'model unavailable');

  const noAi = await buildFillPlan(descriptors, context, { useAi: false, aiMapper: async () => { throw new Error('should not run'); } });
  assert.equal(noAi.items.length, 1);
});
