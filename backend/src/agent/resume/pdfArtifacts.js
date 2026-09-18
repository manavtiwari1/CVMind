import AgentApplication from '../models/AgentApplication.js';
import { uploadBuffer, deleteFile, BUCKETS } from '../storage/gridfs.js';
import { renderResumeHtml } from './atsTemplate.js';
import { renderPdf } from './pdf.js';
import { sha256 } from './derive.js';

// US and Canadian employers expect Letter paper; everyone else A4
export function pageFormatFor(posting) {
  return /\b(united states|usa|u\.s\.|canada)\b/i.test(posting?.location || '') ? 'Letter' : 'A4';
}

export function pdfFilename(name) {
  const safe = String(name || '').replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '').slice(0, 60);
  return `${safe || 'Tailored'}_Resume.pdf`;
}

export const tailoredResumeHash = (tailored) => sha256(renderResumeHtml(tailored.resume));

export async function renderApplicationPdf({ application, posting, render = renderPdf }) {
  const html = renderResumeHtml(application.tailored.resume);
  const buffer = await render(html, { format: pageFormatFor(posting) });
  const filename = pdfFilename(application.tailored.resume.contact?.name);
  const gridFsId = await uploadBuffer(BUCKETS.agentArtifacts, buffer, {
    filename,
    contentType: 'application/pdf',
    metadata: { userId: application.userId, applicationId: String(application._id), kind: 'tailored_resume' }
  });
  return { gridFsId, sha256: sha256(html), filename, size: buffer.length, renderedAt: new Date() };
}

// Saves the PDF only if nobody stored a newer one meanwhile; the losing file is deleted so GridFS doesn't leak
export async function storeRenderedPdf(applicationId, previous, pdf) {
  const filter = previous?.sha256
    ? { _id: applicationId, 'tailored.pdf.sha256': previous.sha256 }
    : { _id: applicationId, 'tailored.pdf': null };
  const result = await AgentApplication.updateOne(filter, { $set: { 'tailored.pdf': pdf } });
  if (result.matchedCount === 0) {
    await deleteFile(BUCKETS.agentArtifacts, pdf.gridFsId).catch(() => {});
    return false;
  }
  if (previous?.gridFsId && String(previous.gridFsId) !== String(pdf.gridFsId)) {
    await deleteFile(BUCKETS.agentArtifacts, previous.gridFsId).catch(() => {});
  }
  return true;
}
