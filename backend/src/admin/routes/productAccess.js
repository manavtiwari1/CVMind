import express from 'express';
import { requireAdmin, requireDb } from '../auth.js';
import { audit } from '../audit.js';
import { ProductGrant } from '../models.js';
import { FEATURES, PRODUCT_KEYS, getSettings, saveSettingGroup } from '../settings.js';
import { model, clean, handle, httpError, isId, isEmail } from '../util.js';

// Manual product access: which products are locked, and who has been given access to them.

const router = express.Router();
router.use(requireDb);

const MAX_EMAILS = 200;

const isActive = (g, now = Date.now()) => !g.expiresAt || new Date(g.expiresAt).getTime() > now;

function parseExpiry(value) {
  if (value === null || value === '' || value === undefined) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw httpError(400, 'Pick a valid expiry date.');
  if (d.getTime() <= Date.now()) throw httpError(400, 'The expiry date has to be in the future.');
  return d;
}

function parseProducts(value) {
  const list = [...new Set((Array.isArray(value) ? value : [value]).map((p) => clean(p, 40)))];
  if (!list.length || list.some((p) => !PRODUCT_KEYS.includes(p))) throw httpError(400, 'Pick at least one product.');
  return list;
}

router.get('/', requireAdmin('users.view'), handle(async (req, res) => {
  const [{ productAccess }, grants] = await Promise.all([
    getSettings(),
    ProductGrant.find().sort({ updatedAt: -1 }).limit(2000).lean()
  ]);
  const now = Date.now();
  const users = await model('User').find({ email: { $in: [...new Set(grants.map((g) => g.email))] } }, { email: 1, name: 1 }).lean();
  const nameOf = new Map(users.map((u) => [u.email.toLowerCase(), u.name]));

  res.json({
    success: true,
    products: PRODUCT_KEYS.map((key) => ({
      key,
      label: FEATURES[key].label,
      description: FEATURES[key].description,
      locked: productAccess.locked.includes(key),
      activeGrants: grants.filter((g) => g.product === key && isActive(g, now)).length
    })),
    data: grants.map((g) => ({
      id: String(g._id),
      email: g.email,
      name: nameOf.get(g.email) || null,
      product: g.product,
      expiresAt: g.expiresAt,
      note: g.note,
      grantedBy: g.grantedBy,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
      active: isActive(g, now)
    }))
  });
}));

// Grants (or renews) access for one or more emails to one or more products
router.post('/', requireAdmin('users.manage'), handle(async (req, res) => {
  const raw = Array.isArray(req.body?.emails) ? req.body.emails : String(req.body?.emails || req.body?.email || '').split(/[\s,;]+/);
  const emails = [...new Set(raw.map((e) => clean(e, 120).toLowerCase()).filter(Boolean))];
  if (!emails.length) throw httpError(400, 'Enter at least one email address.');
  if (emails.length > MAX_EMAILS) throw httpError(400, `Add up to ${MAX_EMAILS} emails at a time.`);
  const invalid = emails.filter((e) => !isEmail(e));
  if (invalid.length) throw httpError(400, `Not a valid email: ${invalid.slice(0, 3).join(', ')}`);
  const products = parseProducts(req.body?.products);
  const expiresAt = parseExpiry(req.body?.expiresAt);
  const note = clean(req.body?.note, 300);
  const now = new Date();

  await ProductGrant.bulkWrite(emails.flatMap((email) => products.map((product) => ({
    updateOne: {
      filter: { email, product },
      update: { $set: { expiresAt, note, grantedBy: req.admin.name, updatedAt: now }, $setOnInsert: { createdAt: now } },
      upsert: true
    }
  }))));
  await audit(req, 'access.product.granted', {
    targetType: 'email',
    targetId: emails.length === 1 ? emails[0] : '',
    targetLabel: emails.length === 1 ? emails[0] : `${emails.length} emails`,
    details: { emails, products, expiresAt, note }
  });
  res.json({ success: true, granted: emails.length * products.length });
}));

// Changes the expiry or note of one grant
router.patch('/:id', requireAdmin('users.manage'), handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Grant not found.');
  const update = { updatedAt: new Date() };
  if (req.body?.expiresAt !== undefined) update.expiresAt = parseExpiry(req.body.expiresAt);
  if (req.body?.note !== undefined) update.note = clean(req.body.note, 300);
  const grant = await ProductGrant.findByIdAndUpdate(req.params.id, { $set: update }, { returnDocument: 'after' }).lean();
  if (!grant) throw httpError(404, 'Grant not found.');
  await audit(req, 'access.product.updated', { targetType: 'email', targetId: grant.email, targetLabel: grant.email, details: { product: grant.product, ...update } });
  res.json({ success: true });
}));

router.delete('/:id', requireAdmin('users.manage'), handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Grant not found.');
  const grant = await ProductGrant.findByIdAndDelete(req.params.id).lean();
  if (!grant) throw httpError(404, 'Grant not found.');
  await audit(req, 'access.product.revoked', { targetType: 'email', targetId: grant.email, targetLabel: grant.email, details: { product: grant.product } });
  res.json({ success: true });
}));

// Locking a product shuts out everyone without a grant, so it needs the settings permission
router.put('/locks/:product', requireAdmin('settings.manage'), handle(async (req, res) => {
  const product = clean(req.params.product, 40);
  if (!PRODUCT_KEYS.includes(product)) throw httpError(404, 'Unknown product.');
  if (typeof req.body?.locked !== 'boolean') throw httpError(400, 'Say whether the product is locked.');
  const { locked } = (await getSettings()).productAccess;
  const next = req.body.locked ? [...locked, product] : locked.filter((p) => p !== product);
  await saveSettingGroup('productAccess', { locked: next }, req.admin.name);
  await audit(req, req.body.locked ? 'access.product.locked' : 'access.product.unlocked', { targetType: 'product', targetId: product, targetLabel: FEATURES[product].label });
  res.json({ success: true });
}));

export default router;
