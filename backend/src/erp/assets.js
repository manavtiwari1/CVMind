import { AdminUser } from '../admin/models.js';
import { ROLES } from '../admin/permissions.js';
import { clean, httpError, isId } from '../admin/util.js';
import { istDay, notify } from '../admin/team/notify.js';
import { ASSET_CATEGORIES, ErpAsset, ErpExpense } from './models.js';
import { nextDate } from './expenses.js';

// Assets & subscriptions: checking fields, renewal reminders and renewal drafts.

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const addDays = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
// Which expense category a renewal goes under
const EXPENSE_CATEGORY = { domain: 'domains', hosting: 'servers', database: 'servers', ai_api: 'ai_apis', email: 'software', software: 'software', other: 'other' };

export async function readAsset(body = {}, current = {}) {
  const kind = current.kind || body.kind;
  if (!['physical', 'digital'].includes(kind)) throw httpError(400, 'Pick physical or digital.');
  const name = clean(body.name ?? current.name, 100);
  if (!name) throw httpError(400, 'Give it a name.');
  const category = body.category ?? current.category ?? 'other';
  if (!ASSET_CATEGORIES[kind].includes(category)) throw httpError(400, 'Pick a category.');
  const cost = Math.round(Number(body.cost ?? current.cost ?? 0) * 100) / 100;
  if (!Number.isFinite(cost) || cost < 0) throw httpError(400, 'Enter the cost in rupees.');
  const billing = body.billing ?? current.billing ?? 'once';
  if (!['once', 'monthly', 'yearly'].includes(billing)) throw httpError(400, 'Pick how often it is paid.');
  const purchaseDate = clean(body.purchaseDate ?? current.purchaseDate, 10);
  const renewalDate = clean(body.renewalDate ?? current.renewalDate, 10);
  if (purchaseDate && !DAY.test(purchaseDate)) throw httpError(400, 'Pick a valid purchase date.');
  if (renewalDate && !DAY.test(renewalDate)) throw httpError(400, 'Pick a valid renewal date.');
  if (billing !== 'once' && !renewalDate) throw httpError(400, 'Pick the next renewal date.');
  const ids = async (list) => {
    const wanted = (Array.isArray(list) ? list : []).filter(isId).slice(0, 10);
    return (await AdminUser.find({ _id: { $in: wanted } }, { _id: 1 }).lean()).map((a) => a._id);
  };
  const ownerId = body.ownerId !== undefined ? (isId(body.ownerId) ? body.ownerId : null) : current.ownerId || null;
  return {
    kind,
    name,
    category,
    serialNumber: clean(body.serialNumber ?? current.serialNumber, 80),
    condition: clean(body.condition ?? current.condition, 80),
    provider: clean(body.provider ?? current.provider, 80),
    plan: clean(body.plan ?? current.plan, 80),
    billingCard: clean(body.billingCard ?? current.billingCard, 40),
    loginHolderIds: body.loginHolderIds !== undefined ? await ids(body.loginHolderIds) : current.loginHolderIds || [],
    cost,
    billing,
    purchaseDate,
    renewalDate: billing === 'once' && kind === 'physical' ? '' : renewalDate,
    ownerId,
    notes: clean(body.notes ?? current.notes, 1000)
  };
}

export const addHistory = (asset, text, byName) => asset.history.push({ at: new Date(), text, byName });

export async function publicAssets(rows) {
  const ids = [...new Set(rows.flatMap((a) => [a.assignedTo, a.ownerId, ...(a.loginHolderIds || [])].filter(Boolean).map(String)))];
  const names = new Map((await AdminUser.find({ _id: { $in: ids } }, { name: 1, username: 1, active: 1 }).lean()).map((a) => [String(a._id), { name: a.name || a.username, active: a.active !== false }]));
  const today = istDay();
  return rows.map((a) => ({
    id: String(a._id),
    kind: a.kind,
    name: a.name,
    category: a.category,
    serialNumber: a.serialNumber,
    condition: a.condition,
    assignedTo: a.assignedTo ? { id: String(a.assignedTo), ...(names.get(String(a.assignedTo)) || { name: 'Former member', active: false }) } : null,
    provider: a.provider,
    plan: a.plan,
    billingCard: a.billingCard,
    loginHolders: (a.loginHolderIds || []).map((id) => ({ id: String(id), ...(names.get(String(id)) || { name: 'Former member', active: false }) })),
    cost: a.cost,
    billing: a.billing,
    purchaseDate: a.purchaseDate,
    renewalDate: a.renewalDate,
    daysToRenewal: a.renewalDate ? Math.round((Date.parse(a.renewalDate) - Date.parse(today)) / 864e5) : null,
    owner: a.ownerId ? { id: String(a.ownerId), ...(names.get(String(a.ownerId)) || { name: 'Former member', active: false }) } : null,
    status: a.status,
    notes: a.notes,
    history: a.history,
    updatedAt: a.updatedAt
  }));
}

const leadershipIds = async () => (await AdminUser.find({ active: true, role: { $in: ['owner', ...Object.keys(ROLES).filter((k) => ROLES[k].leadership)] } }, { _id: 1 }).lean()).map((a) => String(a._id));

// Daily: reminders 14 and 3 days before a renewal (owner + leadership), and on the renewal date
// a draft expense for it, with the renewal date moved on by its billing cycle.
export async function runAssetRenewals(now = new Date()) {
  const today = istDay(now);
  const soon = [addDays(today, 14), addDays(today, 3)];
  const due = await ErpAsset.find({ status: 'active', renewalDate: { $in: soon } }).lean();
  let reminded = 0;
  for (const a of due) {
    const lead = a.renewalDate === soon[0] ? 14 : 3;
    const key = `${lead}:${a.renewalDate}`;
    const claimed = await ErpAsset.updateOne({ _id: a._id, remindersSent: { $ne: key } }, { $push: { remindersSent: key } });
    if (!claimed.modifiedCount) continue;
    const to = [...new Set([...(await leadershipIds()), ...(a.ownerId ? [String(a.ownerId)] : [])])];
    await notify(to, { type: 'asset_renewal_soon', refType: 'asset', refId: a._id, preview: `${a.name} renews in ${lead} days (${a.renewalDate})${a.cost ? ` · ₹${a.cost.toLocaleString('en-IN')}` : ''}` });
    reminded += 1;
  }
  const renewing = await ErpAsset.find({ status: 'active', billing: { $ne: 'once' }, renewalDate: { $ne: '', $lte: today } }).lean();
  let drafted = 0;
  for (const a of renewing) {
    const next = nextDate(a.renewalDate, a.billing);
    const claimed = await ErpAsset.updateOne({ _id: a._id, renewalDate: a.renewalDate }, { $set: { renewalDate: next }, $push: { history: { at: now, text: `Renewed for ${a.renewalDate}; next renewal ${next}`, byName: 'CVMind' } } });
    if (!claimed.modifiedCount) continue;
    await ErpExpense.create({
      kind: 'company', date: a.renewalDate, amount: a.cost || 0.01, category: EXPENSE_CATEGORY[a.category] || 'other', paidTo: a.provider || a.name,
      description: `${a.name} renewal${a.plan ? ` (${a.plan})` : ''}`, paymentMode: a.billingCard, status: 'draft', assetId: a._id, createdByName: 'Asset renewal'
    });
    drafted += 1;
  }
  return { reminded, drafted };
}

// What someone holds, for the offboarding check
export async function heldBy(adminId) {
  const rows = await ErpAsset.find({ status: 'active', $or: [{ assignedTo: adminId }, { loginHolderIds: adminId }, { ownerId: adminId }] }).lean();
  return publicAssets(rows);
}
