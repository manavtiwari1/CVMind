// Connectors: the CVMind tools a user has switched on for Leo. Leo is only given the tools of
// connected connectors, so this is enforced here and not left to the prompt. Everything starts
// disconnected; a tap connects one, in the Connectors panel or on a card in the chat.

import { LeoConnectors } from './models.js';

export const CONNECTORS = [
  { id: 'resume-check', label: 'Resume Checker', description: 'ATS score, full review and fixes for your resume.', tools: ['check_resume_ats', 'improve_resume'] },
  { id: 'resume-builder', label: 'Resume Builder', description: 'Build a resume step by step in the chat.', tools: ['start_flow', 'update_draft', 'show_choices', 'show_template_picker', 'build_resume'] },
  { id: 'tailor', label: 'Resume Tailor', description: 'Rewrite your resume for a job description.', tools: ['tailor_resume'] },
  { id: 'cover-letter', label: 'Cover Letter', description: 'Write a letter, pick a design, download one page.', tools: ['write_cover_letter'] },
  { id: 'proofread', label: 'AI Proofreading', description: 'Fix grammar, spelling and weak verbs.', tools: ['proofread_resume'] },
  { id: 'job-finder', label: 'Job Finder', description: 'Find real jobs and prepare apply packs.', tools: ['find_jobs', 'plan_job_hunt', 'set_job_alerts'] },
  { id: 'interview', label: 'Interview Prep', description: 'Likely questions and a mock interview with feedback.', tools: ['interview_questions', 'start_mock_interview', 'answer_mock_interview'] },
  { id: 'career', label: 'Career Tools', description: 'Roadmaps, skill gaps and your elevator pitch.', tools: ['career_roadmap', 'skill_gaps', 'elevator_pitch'] },
  { id: 'linkedin', label: 'LinkedIn Tools', description: 'Profile audit, bio, outreach messages and posts.', tools: ['audit_linkedin', 'write_linkedin_bio', 'write_linkedin_outreach', 'write_linkedin_post'] },
  { id: 'portfolio', label: 'Portfolio Website', description: 'Build, edit and publish your own website.', tools: ['build_portfolio', 'edit_portfolio', 'restore_portfolio'] },
  { id: 'negotiation', label: 'Offer Negotiation', description: 'An email, a call script and talking points for your offer.', tools: ['negotiate_offer'] }
];

const IDS = CONNECTORS.map((c) => c.id);
export const isConnectorId = (id) => IDS.includes(id);
export const connectorForTool = (name) => CONNECTORS.find((c) => c.tools.includes(name)) || null;
export const connectorById = (id) => CONNECTORS.find((c) => c.id === id) || null;

export async function getConnected(userId) {
  const row = await LeoConnectors.findOne({ userId }).lean();
  return (row?.connected || []).filter(isConnectorId);
}

const write = (userId, update) => LeoConnectors.findOneAndUpdate({ userId }, { ...update, $currentDate: { updatedAt: true } }, { upsert: true, returnDocument: 'after' }).lean();

export const connect = async (userId, id) => (await write(userId, { $addToSet: { connected: id } })).connected;
export const disconnect = async (userId, id) => (await write(userId, { $pull: { connected: id } })).connected;
export const setConnected = async (userId, ids) => (await write(userId, { $set: { connected: [...new Set(ids)] } })).connected;

export const connectorsView = (connected) => CONNECTORS.map(({ id, label, description }) => ({ id, label, description, connected: connected.includes(id) }));

/** The tools Leo must not be given or run for this user. */
export function blockedToolsFor(connected) {
  return new Set(CONNECTORS.filter((c) => !connected.includes(c.id)).flatMap((c) => c.tools));
}

/** The card that lets the user connect a tool from the chat. */
export function connectCard(connector) {
  return {
    card: { type: 'connect', connector: { id: connector.id, label: connector.label, description: connector.description } },
    summary: `${connector.label} isn't connected, so nothing ran. A Connect button is shown. In one short sentence, ask them to connect it. It runs their request as soon as they do.`
  };
}

export function connectorPrompt(connected) {
  const off = CONNECTORS.filter((c) => !connected.includes(c.id));
  if (!off.length) return '';
  return `## Connectors
These CVMind tools are not connected, so you can't use them: ${off.map((c) => `${c.label} (id "${c.id}": ${c.description})`).join(' ')}
When the user wants work one of these does, call request_connector with its id and write nothing before it. Don't do that work by hand in your reply.`;
}
