import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import multer from 'multer';
import JSZip from 'jszip';
import PDFDocument from 'pdfkit';
import { detectResumeType, mayBeResume, parseDocx, parsePdf, PDF_MIME, DOCX_MIME, TXT_MIME } from '@cvmind/auto-apply-agent/text/parser.js';
import { resumeFileFilter, normalizeResumeFile } from '../../src/middleware/resumeFile.js';

// Phones label many PDFs and DOCX files "application/octet-stream" (or nothing). Uploads used to be
// refused on that label alone; the type is now read from the file's bytes.

const RESUME = 'Priya Sharma. B.Tech CSE 2026. Built a React dashboard used by 300 students.';

async function makeDocx(text) {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`);
  return zip.generateAsync({ type: 'nodebuffer' });
}

function makePdf(text) {
  return new Promise((resolve) => {
    const doc = new PDFDocument();
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.text(text);
    doc.end();
  });
}

const OLD_DOC = Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), Buffer.alloc(600, 1)]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(600, 7)]);

let pdf;
let docx;
let server;
let base;

before(async () => {
  [pdf, docx] = await Promise.all([makePdf(RESUME), makeDocx(RESUME)]);
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: resumeFileFilter });
  const app = express();
  app.post('/upload', upload.single('resume'), normalizeResumeFile, (req, res) => res.json({ type: req.file?.mimetype || null }));
  app.use((err, req, res, next) => res.status(err.status || 500).json({ error: err.message }));
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server?.close());

async function send(buffer, name, type) {
  const form = new FormData();
  form.append('resume', new Blob([buffer], { type }), name);
  const res = await fetch(`${base}/upload`, { method: 'POST', body: form });
  return { status: res.status, body: await res.json() };
}

test('the type is read from the file, whatever the browser called it', () => {
  assert.equal(detectResumeType(pdf, { mimetype: 'application/octet-stream', originalname: 'CV' }), PDF_MIME);
  assert.equal(detectResumeType(docx, { mimetype: '', originalname: 'resume.docx' }), DOCX_MIME);
  assert.equal(detectResumeType(docx, { mimetype: 'application/pdf', originalname: 'resume.pdf' }), DOCX_MIME);
  assert.equal(detectResumeType(Buffer.from(RESUME), { mimetype: 'application/octet-stream', originalname: 'cv.txt' }), TXT_MIME);
  assert.equal(detectResumeType(OLD_DOC, { mimetype: 'application/msword', originalname: 'cv.doc' }), null);
  assert.equal(detectResumeType(JPEG, { mimetype: 'application/octet-stream', originalname: 'cv.jpg' }), null);
  // A ZIP that isn't a Word file
  assert.equal(detectResumeType(Buffer.concat([Buffer.from('PK\x03\x04'), Buffer.alloc(100)]), { originalname: 'cv.zip' }), null);
});

test('only clearly different files are screened out before upload', () => {
  assert.equal(mayBeResume({ mimetype: 'application/octet-stream', originalname: 'IMG-2026-WA0004' }), true);
  assert.equal(mayBeResume({ mimetype: '', originalname: 'resume.pdf' }), true);
  assert.equal(mayBeResume({ mimetype: 'image/jpeg', originalname: 'photo.jpg' }), false);
  assert.equal(mayBeResume({ mimetype: 'video/mp4', originalname: 'clip.mp4' }), false);
});

test('a PDF or DOCX sent with a vague label from a phone is accepted and read', async () => {
  for (const [buffer, name, expected] of [[pdf, 'Resume.pdf', PDF_MIME], [docx, 'Resume.docx', DOCX_MIME], [Buffer.from(RESUME), 'cv.txt', TXT_MIME]]) {
    for (const label of ['application/octet-stream', '']) {
      const { status, body } = await send(buffer, name, label);
      assert.equal(status, 200, `${name} sent as "${label}"`);
      assert.equal(body.type, expected);
    }
  }
  assert.match(await parsePdf(pdf), /Priya Sharma/);
  assert.match(await parseDocx(docx), /Priya Sharma/);
});

test('files we cannot read are refused with a message that says what to do', async () => {
  const doc = await send(OLD_DOC, 'Resume.doc', 'application/msword');
  assert.equal(doc.status, 400);
  assert.match(doc.body.error, /old Word \(\.doc\) file.*save it as PDF or DOCX/);

  const photo = await send(JPEG, 'IMG_0042', 'application/octet-stream');
  assert.equal(photo.status, 400);
  assert.match(photo.body.error, /photo of your resume/);

  const image = await send(JPEG, 'photo.jpg', 'image/jpeg');
  assert.equal(image.status, 400);
  assert.match(image.body.error, /PDF, DOCX and TXT/);
});
