import express from 'express';
import { requireAdmin, requireDb } from '../auth.js';
import { audit } from '../audit.js';
import { ContentBlock, CONTENT_SLOTS, ContentReport } from '../models.js';
import { model, clean, handle, httpError, isId, paging, escapeRegex } from '../util.js';
import { invalidatePublicContent } from '../publicRoutes.js';

const router = express.Router();
router.use(requireDb);

// ── Content blocks (CMS) ─────────────────────────────────────────────────────
const toBlock = (b) => ({
  id: String(b._id),
  slot: b.slot,
  title: b.title,
  body: b.body,
  ctaLabel: b.ctaLabel,
  ctaUrl: b.ctaUrl,
  tone: b.tone,
  order: b.order,
  active: b.active,
  startsAt: b.startsAt,
  endsAt: b.endsAt,
  updatedBy: b.updatedBy,
  updatedAt: b.updatedAt,
  createdAt: b.createdAt
});

function parseBlock(body, existing) {
  const out = {};
  if (!existing || body.slot !== undefined) {
    if (!CONTENT_SLOTS.includes(body.slot)) throw httpError(400, 'Pick where this content shows.');
    out.slot = body.slot;
  }
  if (body.title !== undefined) out.title = clean(body.title, 160);
  if (body.body !== undefined) out.body = String(body.body || '').trim().slice(0, 4000);
  if (body.ctaLabel !== undefined) out.ctaLabel = clean(body.ctaLabel, 40);
  if (body.ctaUrl !== undefined) {
    const url = clean(body.ctaUrl, 500);
    if (url && !/^(https:\/\/|\/)/i.test(url)) throw httpError(400, 'The button link must start with https:// or /');
    out.ctaUrl = url;
  }
  if (body.tone !== undefined) {
    if (!['info', 'success', 'warning', 'promo'].includes(body.tone)) throw httpError(400, 'Invalid style.');
    out.tone = body.tone;
  }
  if (body.order !== undefined) out.order = Number(body.order) || 0;
  if (typeof body.active === 'boolean') out.active = body.active;
  for (const field of ['startsAt', 'endsAt']) {
    if (body[field] !== undefined) {
      const d = body[field] ? new Date(body[field]) : null;
      if (d && isNaN(d)) throw httpError(400, 'Enter valid dates.');
      out[field] = d;
    }
  }
  const starts = out.startsAt !== undefined ? out.startsAt : existing?.startsAt;
  const ends = out.endsAt !== undefined ? out.endsAt : existing?.endsAt;
  if (starts && ends && new Date(starts) >= new Date(ends)) throw httpError(400, 'The end time must be after the start time.');
  const title = out.title !== undefined ? out.title : existing?.title;
  if (!title) throw httpError(400, 'Add a title.');
  return out;
}

router.get('/blocks', requireAdmin('content.manage'), handle(async (req, res) => {
  const filter = CONTENT_SLOTS.includes(req.query.slot) ? { slot: req.query.slot } : {};
  const blocks = await ContentBlock.find(filter).sort({ slot: 1, order: 1, createdAt: -1 }).lean();
  res.json({ success: true, data: blocks.map(toBlock), slots: CONTENT_SLOTS });
}));

router.post('/blocks', requireAdmin('content.manage'), handle(async (req, res) => {
  const input = parseBlock(req.body || {});
  const block = await ContentBlock.create({ ...input, updatedBy: req.admin.name });
  invalidatePublicContent();
  await audit(req, 'content.created', { targetType: 'content', targetId: block._id, targetLabel: `${block.slot}: ${block.title}` });
  res.json({ success: true, data: toBlock(block.toObject()) });
}));

router.patch('/blocks/:id', requireAdmin('content.manage'), handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Content not found.');
  const block = await ContentBlock.findById(req.params.id);
  if (!block) throw httpError(404, 'Content not found.');
  const input = parseBlock(req.body || {}, block);
  Object.assign(block, input, { updatedBy: req.admin.name });
  await block.save();
  invalidatePublicContent();
  await audit(req, 'content.updated', { targetType: 'content', targetId: block._id, targetLabel: `${block.slot}: ${block.title}`, details: Object.keys(input) });
  res.json({ success: true, data: toBlock(block.toObject()) });
}));

router.delete('/blocks/:id', requireAdmin('content.manage'), handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Content not found.');
  const block = await ContentBlock.findByIdAndDelete(req.params.id).lean();
  if (!block) throw httpError(404, 'Content not found.');
  invalidatePublicContent();
  await audit(req, 'content.deleted', { targetType: 'content', targetId: block._id, targetLabel: `${block.slot}: ${block.title}` });
  res.json({ success: true });
}));

// ── Moderation ───────────────────────────────────────────────────────────────
// Each target type: how to find it, show it, hide it and delete it
const TARGETS = {
  work: {
    label: (d) => d.title,
    load: (id) => (isId(id) ? model('Work').findById(id).lean() : null),
    hide: (id, hidden, reason) => model('Work').updateOne({ _id: id }, { hidden, hiddenReason: hidden ? reason : '' }),
    remove: (id) => model('Work').deleteOne({ _id: id }),
    owner: (d) => d.userId
  },
  job: {
    label: (d) => `${d.title} · ${d.companyName}`,
    load: (id) => model('Job').findOne({ id }).lean(),
    hide: (id, hidden) => model('Job').updateOne({ id }, { status: hidden ? 'HIDDEN' : 'ACTIVE' }),
    remove: (id) => model('Job').deleteOne({ id }),
    owner: () => ''
  },
  problem: {
    label: (d) => d.title,
    load: (id) => model('CustomCodingProblem').findOne({ id }).lean(),
    hide: (id, hidden) => model('CustomCodingProblem').updateOne({ id }, { hidden }),
    remove: (id) => model('CustomCodingProblem').deleteOne({ id }),
    owner: (d) => d.createdBy
  }
};

async function loadTarget(type, id) {
  const target = TARGETS[type];
  if (!target) throw httpError(404, 'Unknown content type.');
  const doc = await target.load(id);
  if (!doc) throw httpError(404, 'That content no longer exists.');
  return { target, doc };
}

async function ownerLabels(ids) {
  const valid = [...new Set(ids.filter((id) => isId(id)))];
  if (!valid.length) return new Map();
  const users = await model('User').find({ _id: { $in: valid } }).select('name email').lean();
  return new Map(users.map((u) => [String(u._id), { id: String(u._id), name: u.name, email: u.email }]));
}

router.get('/moderation/items', requireAdmin('moderation.manage'), handle(async (req, res) => {
  const type = TARGETS[req.query.type] ? req.query.type : 'work';
  const { page, limit, skip } = paging(req.query);
  const q = clean(req.query.q, 80);
  const rx = q ? new RegExp(escapeRegex(q), 'i') : null;
  let rows = [];
  let total = 0;

  if (type === 'work') {
    const filter = {};
    if (rx) filter.title = rx;
    if (req.query.hidden === 'true') filter.hidden = true;
    if (req.query.workType) filter.type = clean(req.query.workType, 40);
    const Work = model('Work');
    const [docs, count, types] = await Promise.all([
      Work.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).select('title type templateId userId hidden hiddenReason createdAt updatedAt').lean(),
      Work.countDocuments(filter),
      Work.distinct('type')
    ]);
    const owners = await ownerLabels(docs.map((d) => d.userId));
    rows = docs.map((d) => ({ id: String(d._id), title: d.title, kind: d.type, hidden: !!d.hidden, hiddenReason: d.hiddenReason || '', owner: owners.get(d.userId) || null, createdAt: d.createdAt, updatedAt: d.updatedAt }));
    total = count;
    return res.json({ success: true, type, total, page, limit, data: rows, workTypes: types.sort() });
  }

  if (type === 'job') {
    const filter = {};
    if (rx) filter.$or = [{ title: rx }, { companyName: rx }];
    if (req.query.hidden === 'true') filter.status = 'HIDDEN';
    const Job = model('Job');
    const [docs, count] = await Promise.all([Job.find(filter).sort({ postedAt: -1 }).skip(skip).limit(limit).lean(), Job.countDocuments(filter)]);
    rows = docs.map((d) => ({ id: d.id, title: d.title, kind: d.companyName, hidden: d.status === 'HIDDEN', status: d.status, owner: null, createdAt: d.postedAt }));
    total = count;
  } else {
    const filter = {};
    if (rx) filter.title = rx;
    if (req.query.hidden === 'true') filter.hidden = true;
    const P = model('CustomCodingProblem');
    const [docs, count] = await Promise.all([P.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select('id title difficulty category createdBy hidden createdAt').lean(), P.countDocuments(filter)]);
    const owners = await ownerLabels(docs.map((d) => d.createdBy));
    rows = docs.map((d) => ({ id: d.id, title: d.title, kind: `${d.difficulty} · ${d.category}`, hidden: !!d.hidden, owner: owners.get(d.createdBy) || null, createdAt: d.createdAt }));
    total = count;
  }
  res.json({ success: true, type, total, page, limit, data: rows });
}));

// Full content for review. Work HTML is returned as-is and shown in a sandboxed iframe by the panel.
router.get('/moderation/items/:type/:id', requireAdmin('moderation.manage'), handle(async (req, res) => {
  const { target, doc } = await loadTarget(req.params.type, req.params.id);
  const owner = (await ownerLabels([target.owner(doc)])).get(target.owner(doc)) || null;
  let preview;
  if (req.params.type === 'work') {
    const content = String(doc.htmlContent || '');
    const isJson = /^\s*[{[]/.test(content);
    preview = { format: isJson ? 'json' : 'html', content: content.slice(0, 400000) };
  } else if (req.params.type === 'job') {
    preview = { format: 'text', content: `${doc.description}\n\nRequirements:\n${doc.requirements || '—'}` };
  } else {
    preview = { format: 'text', content: doc.description };
  }
  const hidden = req.params.type === 'job' ? doc.status === 'HIDDEN' : !!doc.hidden;
  res.json({ success: true, data: { id: req.params.id, type: req.params.type, title: target.label(doc), owner, hidden, preview } });
}));

router.post('/moderation/items/:type/:id/hide', requireAdmin('moderation.manage'), handle(async (req, res) => {
  const { target, doc } = await loadTarget(req.params.type, req.params.id);
  const hidden = req.body?.hidden !== false;
  const reason = clean(req.body?.reason, 300);
  if (hidden && !reason) throw httpError(400, 'Add a reason for hiding this.');
  await target.hide(req.params.id, hidden, reason);
  await audit(req, hidden ? 'moderation.hidden' : 'moderation.restored', { targetType: req.params.type, targetId: req.params.id, targetLabel: target.label(doc), details: { reason } });
  res.json({ success: true });
}));

router.delete('/moderation/items/:type/:id', requireAdmin('moderation.manage'), handle(async (req, res) => {
  const { target, doc } = await loadTarget(req.params.type, req.params.id);
  await target.remove(req.params.id);
  await ContentReport.updateMany({ targetType: req.params.type, targetId: req.params.id, status: 'open' }, { status: 'actioned', resolution: 'Content deleted', resolvedBy: req.admin.name, resolvedAt: new Date() });
  await audit(req, 'moderation.deleted', { targetType: req.params.type, targetId: req.params.id, targetLabel: target.label(doc) });
  res.json({ success: true });
}));

// Reports raised by visitors
router.get('/moderation/reports', requireAdmin('moderation.manage'), handle(async (req, res) => {
  const { page, limit, skip } = paging(req.query);
  const filter = ['open', 'dismissed', 'actioned'].includes(req.query.status) ? { status: req.query.status } : {};
  const [rows, total, open] = await Promise.all([
    ContentReport.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ContentReport.countDocuments(filter),
    ContentReport.countDocuments({ status: 'open' })
  ]);
  const labelled = await Promise.all(rows.map(async (r) => {
    const target = TARGETS[r.targetType];
    const doc = target ? await target.load(r.targetId).catch(() => null) : null;
    return {
      id: String(r._id),
      targetType: r.targetType,
      targetId: r.targetId,
      targetLabel: doc && target ? target.label(doc) : '(deleted)',
      targetHidden: doc ? (r.targetType === 'job' ? doc.status === 'HIDDEN' : !!doc.hidden) : null,
      reason: r.reason,
      details: r.details,
      reporterEmail: r.reporterEmail,
      status: r.status,
      resolution: r.resolution,
      resolvedBy: r.resolvedBy,
      resolvedAt: r.resolvedAt,
      createdAt: r.createdAt
    };
  }));
  res.json({ success: true, total, page, limit, open, data: labelled });
}));

router.post('/moderation/reports/:id/resolve', requireAdmin('moderation.manage'), handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Report not found.');
  const status = req.body?.status === 'actioned' ? 'actioned' : 'dismissed';
  const report = await ContentReport.findByIdAndUpdate(req.params.id, {
    status,
    resolution: clean(req.body?.note, 300),
    resolvedBy: req.admin.name,
    resolvedAt: new Date()
  }, { returnDocument: 'after' }).lean();
  if (!report) throw httpError(404, 'Report not found.');
  await audit(req, `report.${status}`, { targetType: report.targetType, targetId: report.targetId, targetLabel: report.reason });
  res.json({ success: true });
}));

export default router;
