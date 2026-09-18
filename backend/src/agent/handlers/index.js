import { createParseResumeHandler, createEmbedResumeHandler } from './parseResume.js';
import { createParseJobHandler } from './parseJob.js';
import { createMatchHandler } from './matchApplication.js';
import { createTailorHandler, createRenderPdfHandler } from './tailorApplication.js';
import { createApplyFillHandler, createApplySubmitHandler } from './applyApplication.js';

// Job type -> handler(job, { signal, workerId }); pipeline stage handlers are registered here as milestones land
export const handlers = {
  'system.noop': async () => {},
  'resume.parse': createParseResumeHandler(),
  'resume.embed': createEmbedResumeHandler(),
  'job.parse': createParseJobHandler(),
  'app.match': createMatchHandler(),
  'app.tailor': createTailorHandler(),
  'app.render_pdf': createRenderPdfHandler(),
  'apply.fill': createApplyFillHandler(),
  'apply.submit': createApplySubmitHandler()
};
