import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSkill, normalizeSkillList } from '../../src/agent/scoring/normalizeSkill.js';
import { monthIndex, totalYearsExperience, inferSeniority, latestRole } from '../../src/agent/scoring/experience.js';
import { buildProfileData, collectBullets, textHash } from '../../src/agent/resume/derive.js';
import { htmlToStructuredText } from '../../src/services/parser.js';

const NOW = new Date(Date.UTC(2026, 8, 14));

test('normalizeSkill maps aliases and strips versions', () => {
  const cases = [
    ['JS', 'javascript'], ['ReactJS', 'react'], ['React 18', 'react'], ['Python 3.11', 'python'],
    ['k8s', 'kubernetes'], ['Node.js', 'node.js'], ['Postgres', 'postgresql'], ['Go', 'golang'],
    ['C++', 'c++'], ['  Amazon Web Services ', 'aws'], ['Figma', 'figma'], ['', '']
  ];
  for (const [input, expected] of cases) assert.equal(normalizeSkill(input), expected, input);
  assert.deepEqual(normalizeSkillList(['JS', 'javascript', 'TS']), ['javascript', 'typescript']);
});

test('monthIndex parses year-month and year-only dates', () => {
  assert.equal(monthIndex('2020-01'), 2020 * 12);
  assert.equal(monthIndex('2020', { end: true }), 2020 * 12 + 11);
  assert.equal(monthIndex('2020-13'), null);
  assert.equal(monthIndex('Present'), null);
  assert.equal(monthIndex('1900'), null);
});

test('totalYearsExperience merges overlaps, halves internships and counts current roles to now', () => {
  const years = totalYearsExperience([
    { startDate: '2020-01', endDate: '2021-12', employmentType: 'full_time' },
    { startDate: '2021-01', endDate: '2022-12', employmentType: 'full_time' },
    { startDate: '2019-01', endDate: '2019-12', employmentType: 'internship' },
    { startDate: '2019-06', endDate: '2019-12', employmentType: 'full_time' }
  ], { now: NOW });
  // 2020-2022 = 36 months; 2019: 5 intern months at 0.5 + 7 full-time months
  assert.equal(years, Math.round(((36 + 2.5 + 7) / 12) * 10) / 10);

  assert.equal(totalYearsExperience([{ startDate: '2025-09', current: true }], { now: NOW }), 1.1);
  assert.equal(totalYearsExperience([{ startDate: '2024-01', endDate: '' }], { now: NOW }), 0);
  assert.equal(totalYearsExperience([{ startDate: '2024-01', endDate: '2023-01' }], { now: NOW }), 0);
});

test('inferSeniority prefers title keywords, then falls back to years', () => {
  assert.equal(inferSeniority(10, 'Software Engineering Intern'), 'intern');
  assert.equal(inferSeniority(1, 'Senior Engineer'), 'senior');
  assert.equal(inferSeniority(3, 'Tech Lead'), 'staff');
  assert.equal(inferSeniority(3, 'Software Engineer'), 'mid');
  assert.equal(inferSeniority(0.5, ''), 'junior');
});

test('latestRole picks ongoing roles over ended ones', () => {
  const roles = [{ title: 'Old', endDate: '2024-05' }, { title: 'Now', startDate: '2023-01', current: true }];
  assert.equal(latestRole(roles).title, 'Now');
});

test('buildProfileData assigns bullet ids, dedupes skills and derives experience', () => {
  const { structured, derived } = buildProfileData({
    contact: { name: ' Ada ', email: 'ada@example.com' },
    headline: 'Engineer',
    summary: 'Builds things.',
    experience: [
      { company: 'Acme', title: 'Senior Software Engineer', employmentType: 'full_time', startDate: '2022-01', endDate: '2024-01', current: true, skills: ['Node'], bullets: ['Built API', ' ', 'Cut costs 20%'] }
    ],
    skills: [{ name: 'JavaScript', category: 'technical' }, { name: 'JS', category: 'technical' }],
    projects: [{ name: 'CLI', skills: ['Go'], bullets: [{ text: 'Shipped v1' }] }],
    education: [],
    certifications: [{ name: '', issuer: 'x', year: '' }],
    languages: []
  }, { now: NOW });

  assert.equal(structured.contact.name, 'Ada');
  assert.equal(structured.contact.phone, '');
  assert.equal(structured.experience[0].endDate, '');
  assert.deepEqual(structured.experience[0].bullets.map((b) => b.id), ['exp0-b0', 'exp0-b1']);
  assert.equal(structured.projects[0].bullets[0].id, 'proj0-b0');
  assert.deepEqual(structured.skills.map((s) => s.normalized), ['javascript']);
  assert.equal(structured.certifications.length, 0);
  assert.deepEqual(derived.normalizedSkillSet, ['javascript', 'node.js', 'golang']);
  assert.equal(derived.seniority, 'senior');
  assert.ok(derived.totalYearsExperience > 4);

  assert.deepEqual(collectBullets(structured).map((b) => b.bulletId), ['summary', 'exp0-b0', 'exp0-b1', 'proj0-b0']);
  assert.equal(textHash(' Built API '), textHash('Built API'));
});

test('htmlToStructuredText keeps lines and bullets and drops markup', () => {
  const html = `<html><head><style>.x{color:red}</style></head><body>
    <h1>Ada&nbsp;Lovelace</h1><p>ada@example.com &amp; London</p>
    <h2>Experience</h2><div><strong>Senior Engineer</strong> — Acme<br>2020 – Present</div>
    <ul><li>Built &lt;billing&gt; pipeline</li><li>Led team of&#160;5</li></ul>
    <table><tr><td>Skills</td><td>Node, React</td></tr></table>
    <script>alert(1)</script></body></html>`;
  const text = htmlToStructuredText(html);
  assert.equal(text, [
    'Ada Lovelace',
    'ada@example.com & London',
    'Experience',
    'Senior Engineer — Acme',
    '2020 – Present',
    '• Built <billing> pipeline',
    '• Led team of 5',
    'Skills | Node, React'
  ].join('\n'));
  assert.equal(htmlToStructuredText(null), '');
});
