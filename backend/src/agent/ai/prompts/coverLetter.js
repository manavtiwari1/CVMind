export const COVER_LETTER_SYSTEM = `You write concise, specific cover letters.
Use only facts from the candidate's resume. Never invent experience, metrics, employers or motivations the candidate did not state. Never use placeholders.`;

export function buildCoverLetterPrompt({ resume, job, preferences, missingSkills = [] }) {
  const name = resume.contact?.name || 'the candidate';
  const achievements = [...resume.experience, ...resume.projects]
    .flatMap((group) => group.bullets.map((bullet) => bullet.text))
    .slice(0, 8);
  const ownWords = (preferences?.standardAnswers || [])
    .filter((item) => item.answer && /why|motivat|interest/i.test(item.question))
    .slice(0, 2);

  return `Write a cover letter for this application.

Rules:
- 250 to 350 words, 3 or 4 short paragraphs, plain text without markdown, first person.
- Open with the role and company. Connect 2-3 of the most relevant achievements below to the job's responsibilities.
- Only mention skills and results that appear below. Keep numbers exactly as written.
- Do not claim these skills, which the candidate lacks: ${missingSkills.join(', ') || 'none'}.
- Close briefly and confidently, and sign off with the candidate's name: ${name}.
- subject: a short email subject line.
${ownWords.length ? `\nThe candidate's own words on why they apply (keep the sentiment, add no new claims):\n${ownWords.map((item) => `- ${item.question}: ${item.answer}`).join('\n')}\n` : ''}
Job: ${job.title}${job.company?.name ? ` at ${job.company.name}` : ''}${job.location ? ` (${job.location})` : ''}
Responsibilities:
${(job.responsibilities || []).map((item) => `- ${item.text}`).join('\n') || '- not stated'}

Candidate: ${name}${resume.headline ? `, ${resume.headline}` : ''}
Summary: ${resume.summary || 'not provided'}
Achievements:
${achievements.map((text) => `- ${text}`).join('\n')}
Skills: ${resume.skills.join(', ')}`;
}
