import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildProfileData } from '../../src/agent/resume/derive.js';
import { guardTailoredResume, guardCoverLetter, missingJobSkills, numbersIn } from '../../src/agent/tailoring/guard.js';
import { applyTailoredEdits } from '../../src/agent/tailoring/edits.js';
import { renderResumeHtml, formatDateRange } from '../../src/agent/resume/atsTemplate.js';
import { pdfFilename, pageFormatFor } from '../../src/agent/resume/pdfArtifacts.js';
import { RESUME, TAILORED_OUTPUT, COVER_LETTER_OUTPUT } from '../helpers/agentFixtures.js';

const { structured } = buildProfileData(RESUME);

test('guardTailoredResume keeps supported rewrites and reverts invented content', () => {
  const { resume, violations } = guardTailoredResume(TAILORED_OUTPUT, structured);
  assert.deepEqual(violations.map((v) => v.kind).sort(), ['invented_number', 'new_skill', 'unknown_bullet']);
  assert.deepEqual(resume.experience[0].bullets, [
    { sourceBulletId: 'exp0-b0', text: 'Built the billing pipeline behind payments checkout', original: 'Built billing pipeline for payments' },
    { sourceBulletId: 'exp0-b1', text: 'Led migration to Kubernetes', original: 'Led migration to Kubernetes' }
  ]);
  assert.deepEqual(resume.skills, ['Node', 'Postgres', 'JavaScript', 'Docker']);
  assert.equal(resume.headline, 'Senior Backend Engineer');
  assert.equal(resume.contact.name, 'Ada Lovelace');
  assert.equal(resume.experience[0].company, 'Acme');
});

test('roles left out or emptied keep their original bullets, and duplicates are dropped', () => {
  const twoRoles = buildProfileData({
    ...RESUME,
    experience: [...RESUME.experience, { company: 'Beta', title: 'Engineer', employmentType: 'full_time', startDate: '2018-01', endDate: '2019-12', current: false, location: '', skills: [], bullets: ['Wrote tests'] }]
  }).structured;
  const { resume, violations } = guardTailoredResume({
    headline: '', summary: '', projects: [], skillOrder: [], changes: [],
    experience: [
      { roleId: 'exp0', bullets: [{ sourceBulletId: 'exp0-b1', text: '' }, { sourceBulletId: 'exp0-b1', text: 'again' }] },
      { roleId: 'exp1', bullets: [{ sourceBulletId: 'exp0-b0', text: 'moved between roles' }] },
      { roleId: 'exp7', bullets: [] }
    ]
  }, twoRoles);
  assert.deepEqual(resume.experience[0].bullets.map((b) => b.text), ['Led migration to Kubernetes']);
  assert.deepEqual(resume.experience[1].bullets.map((b) => b.text), ['Wrote tests']);
  assert.deepEqual(violations.map((v) => v.kind).sort(), ['duplicate_bullet', 'unknown_bullet', 'unknown_section']);
  assert.equal(resume.headline, twoRoles.headline);
  assert.equal(resume.summary, twoRoles.summary);
});

test('summary and headline with invented numbers fall back to the resume', () => {
  const { resume, violations } = guardTailoredResume({ ...TAILORED_OUTPUT, summary: 'Engineer with 12 years of experience.', headline: 'Top 1% Engineer', experience: [] }, structured);
  assert.equal(resume.summary, structured.summary);
  assert.equal(resume.headline, structured.headline);
  assert.deepEqual(violations.map((v) => v.kind), ['new_skill', 'invented_number', 'invalid_headline']);
  assert.deepEqual([...numbersIn('Grew revenue 1,200 and 3.5x in 2020-01')], ['1200', '3.5', '2020', '01']);
});

test('guardCoverLetter flags length, placeholders and unsupported numbers but keeps the text', () => {
  const job = { title: 'Backend Engineer', location: 'Pune', requirements: { minYearsExperience: 5 }, responsibilities: [] };
  const flagged = guardCoverLetter({ subject: '', body: 'Dear [Hiring Manager], I grew revenue 300% over 5 years since 2020.' }, { structured, job });
  assert.equal(flagged.subject, 'Application for Backend Engineer');
  assert.equal(flagged.needsReview, true);
  assert.equal(flagged.warnings.length, 3);
  assert.match(flagged.warnings[2], /300/);
  assert.doesNotMatch(flagged.warnings[2], /\b5\b|2020/);

  const fine = guardCoverLetter(COVER_LETTER_OUTPUT, { structured, job });
  assert.equal(fine.needsReview, false);
});

test('missingJobSkills maps normalized gaps back to the job wording', () => {
  const job = { requirements: { mustHaveSkills: ['Node.js', 'Kubernetes'], niceToHaveSkills: ['Go'] } };
  assert.deepEqual(missingJobSkills(job, { missingSkills: ['kubernetes', 'golang'] }), ['Kubernetes', 'Go']);
  assert.deepEqual(missingJobSkills(job, null), []);
});

test('applyTailoredEdits keeps bullet provenance and clears cover letter warnings', () => {
  const { resume } = guardTailoredResume(TAILORED_OUTPUT, structured);
  const tailored = { resume, coverLetter: { subject: 'S', body: 'B', needsReview: true, warnings: ['x'] }, pdf: { sha256: 'abc' } };
  const edited = applyTailoredEdits(tailored, {
    summary: 'New summary',
    experience: [{ id: 'exp0', bullets: ['Led migration to Kubernetes', 'Brand new line', '  '] }],
    skills: [' Node ', 'Node', ''],
    coverLetter: { subject: '', body: 'Dear team' }
  });
  assert.equal(edited.userEdited, true);
  assert.equal(edited.resume.summary, 'New summary');
  assert.deepEqual(edited.resume.experience[0].bullets.map((b) => b.sourceBulletId), ['exp0-b1', 'exp0-b1']);
  assert.equal(edited.resume.experience[0].bullets[1].text, 'Brand new line');
  assert.deepEqual(edited.resume.skills, ['Node']);
  assert.deepEqual(edited.coverLetter, { subject: 'S', body: 'Dear team', needsReview: false, warnings: [] });
  assert.equal(edited.pdf.sha256, 'abc');
  assert.equal(tailored.resume.summary, 'Engineer building payment systems.');
});

test('renderResumeHtml escapes content and formats dates; filenames and paper size are safe', () => {
  const { resume } = guardTailoredResume(TAILORED_OUTPUT, structured);
  const html = renderResumeHtml({ ...resume, summary: '<script>alert(1)</script>' });
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /Jan 2020 – Present/);
  assert.match(html, /<li>Led migration to Kubernetes<\/li>/);
  assert.equal(formatDateRange({ startDate: '2018', endDate: '2019-12', current: false }), '2018 – Dec 2019');
  assert.equal(pdfFilename('José  O\'Neil / Dev'), 'José_O_Neil_Dev_Resume.pdf');
  assert.equal(pdfFilename(''), 'Tailored_Resume.pdf');
  assert.equal(pageFormatFor({ location: 'New York, United States' }), 'Letter');
  assert.equal(pageFormatFor({ location: 'Pune, India' }), 'A4');
});
