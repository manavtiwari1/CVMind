import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { dbReady } from '../admin/auth.js';
import { clean, handle, httpError } from '../admin/util.js';
import { ErpLetter } from './models.js';
import { LETTER_LABELS } from './letters.js';

// Public, no sign-in: checks a letter's verify code (cvmind.in/verify/<code>).
// Shows only what's printed on the letter's face: number, name, type, date and whether it's still valid.
const router = express.Router();
const limiter = rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { success: false, error: 'Too many checks. Try again in a minute.' } });

router.get('/api/verify/:code', limiter, handle(async (req, res) => {
  if (!(await dbReady())) throw httpError(503, 'Verification is unavailable right now. Try again in a minute.');
  const code = clean(req.params.code, 20).toUpperCase();
  if (!/^[A-Z0-9]{10}$/.test(code)) throw httpError(404, 'No letter has this code.');
  const letter = await ErpLetter.findOne({ code }).lean();
  if (!letter) throw httpError(404, 'No letter has this code.');
  res.json({
    success: true,
    data: {
      number: letter.number,
      recipientName: letter.recipientName,
      type: LETTER_LABELS[letter.type],
      title: letter.title,
      issuedOn: letter.issuedOn,
      issuer: 'CVMind',
      status: letter.status,
      revokedOn: letter.revokedAt ? letter.revokedAt.toISOString().slice(0, 10) : null
    }
  });
}));

export default router;
