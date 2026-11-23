import { mayBeResume, detectResumeType, unreadableResumeMessage } from '@cvmind/auto-apply-agent/text/parser.js';

// Resume uploads. Phones often label a PDF or DOCX as "application/octet-stream" (or nothing), so the
// label only screens out files that are clearly something else; the type is then read from the bytes.

/** multer fileFilter: lets through anything that may be a resume, refuses the rest with a 400. */
export function resumeFileFilter(req, file, cb) {
  if (mayBeResume(file)) return cb(null, true);
  cb(Object.assign(new Error('We can only read PDF, DOCX and TXT files. Please upload your resume in one of these formats.'), { status: 400 }));
}

/**
 * After multer: sets req.file.mimetype to the type read from the file's bytes, so every route can trust it.
 * A file that is not a PDF, DOCX or TXT is refused with a 400 that says what to do instead.
 */
export function normalizeResumeFile(req, res, next) {
  const file = req.file;
  if (!file?.buffer) return next();
  const type = detectResumeType(file.buffer, file);
  if (!type) return res.status(400).json({ success: false, error: unreadableResumeMessage(file.buffer) });
  file.mimetype = type;
  next();
}
