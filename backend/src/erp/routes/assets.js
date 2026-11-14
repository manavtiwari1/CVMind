import express from 'express';
import { AdminUser } from '../../admin/models.js';
import { audit } from '../../admin/audit.js';
import { requireAdmin } from '../../admin/auth.js';
import { clean, handle, httpError, isId } from '../../admin/util.js';
import { ASSET_CATEGORIES, ErpAsset } from '../models.js';
import { addHistory, heldBy, publicAssets, readAsset } from '../assets.js';

// Admin panel → ERP → Assets
const router = express.Router();
const view = requireAdmin('hr.view');
const manage = requireAdmin('hr.manage');
const byName = (req) => req.admin.name || req.admin.username;

async function assetOr404(id) {
  if (!isId(id)) throw httpError(404, 'Asset not found.');
  const a = await ErpAsset.findById(id);
  if (!a) throw httpError(404, 'Asset not found.');
  return a;
}
const one = async (a) => (await publicAssets([a.toObject()]))[0];

router.get('/assets', view, handle(async (req, res) => {
  const filter = { status: req.query.status === 'retired' ? 'retired' : 'active' };
  if (['physical', 'digital'].includes(req.query.kind)) filter.kind = req.query.kind;
  const rows = await ErpAsset.find(filter).sort({ kind: 1, renewalDate: 1, name: 1 }).limit(500).lean();
  const data = await publicAssets(rows);
  const yearly = data.filter((a) => a.billing !== 'once').reduce((s, a) => s + (a.billing === 'monthly' ? a.cost * 12 : a.cost), 0);
  res.json({
    success: true,
    data,
    categories: ASSET_CATEGORIES,
    summary: {
      physical: data.filter((a) => a.kind === 'physical').length,
      digital: data.filter((a) => a.kind === 'digital').length,
      renewingIn30Days: data.filter((a) => a.daysToRenewal !== null && a.daysToRenewal >= 0 && a.daysToRenewal <= 30).length,
      yearlyCost: Math.round(yearly)
    }
  });
}));

router.post('/assets', manage, handle(async (req, res) => {
  const fields = await readAsset(req.body);
  const a = new ErpAsset(fields);
  addHistory(a, 'Added', byName(req));
  await a.save();
  await audit(req, 'hr.asset_added', { targetType: 'asset', targetId: a._id, targetLabel: a.name });
  res.json({ success: true, data: await one(a) });
}));

router.patch('/assets/:id', manage, handle(async (req, res) => {
  const a = await assetOr404(req.params.id);
  const before = a.renewalDate;
  Object.assign(a, await readAsset(req.body, a.toObject()));
  if (a.renewalDate !== before) a.remindersSent = [];
  if (req.body?.status === 'retired' || req.body?.status === 'active') {
    if (req.body.status !== a.status) addHistory(a, req.body.status === 'retired' ? 'Retired' : 'Back in use', byName(req));
    a.status = req.body.status;
    if (a.status === 'retired') a.assignedTo = null;
  }
  addHistory(a, 'Details changed', byName(req));
  await a.save();
  await audit(req, 'hr.asset_updated', { targetType: 'asset', targetId: a._id, targetLabel: a.name });
  res.json({ success: true, data: await one(a) });
}));

// Hand a physical asset to someone, or take it back
router.post('/assets/:id/assign', manage, handle(async (req, res) => {
  const a = await assetOr404(req.params.id);
  if (a.kind !== 'physical') throw httpError(400, 'Only physical assets are given to people. Set login holders for digital ones.');
  if (a.status !== 'active') throw httpError(400, 'This asset is retired.');
  const to = req.body?.adminId ? await AdminUser.findOne({ _id: isId(req.body.adminId) ? req.body.adminId : null, active: true }, { name: 1, username: 1 }).lean() : null;
  if (req.body?.adminId && !to) throw httpError(400, 'Pick someone on the team.');
  const from = a.assignedTo ? await AdminUser.findById(a.assignedTo, { name: 1, username: 1 }).lean() : null;
  a.assignedTo = to?._id || null;
  const condition = clean(req.body?.condition, 80);
  if (condition) a.condition = condition;
  addHistory(a, to ? `Given to ${to.name || to.username}${condition ? ` (${condition})` : ''}` : `Returned by ${from?.name || from?.username || 'someone'}${condition ? ` (${condition})` : ''}`, byName(req));
  await a.save();
  await audit(req, to ? 'hr.asset_assigned' : 'hr.asset_returned', { targetType: 'asset', targetId: a._id, targetLabel: a.name });
  res.json({ success: true, data: await one(a) });
}));

// Offboarding: what someone still holds
router.get('/assets/held-by/:adminId', view, handle(async (req, res) => {
  if (!isId(req.params.adminId)) throw httpError(404, 'Person not found.');
  res.json({ success: true, data: await heldBy(req.params.adminId) });
}));

export default router;
