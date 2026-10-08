import express from 'express';
import '../db.js'; // registers the User, Work, PaymentLog, … models the admin routes read
import teamRoutes from './routes/team.js';
import analyticsRoutes from './routes/analytics.js';
import userRoutes from './routes/users.js';
import userActivityRoutes from './routes/userActivity.js';
import productAccessRoutes from './routes/productAccess.js';
import subscriptionRoutes from './routes/subscriptions.js';
import paymentRoutes from './routes/payments.js';
import ticketRoutes from './routes/tickets.js';
import notificationRoutes from './routes/notifications.js';
import contentRoutes from './routes/content.js';
import orderRoutes from './routes/orders.js';
import partnerRoutes from './routes/partners.js';
import systemRoutes from './routes/system.js';
import exportRoutes, { REPORT_LIST } from './routes/exports.js';
import { requireAdmin } from './auth.js';
import { ContentReport, Ticket } from './models.js';
import { dbReady } from './auth.js';
import { handle } from './util.js';

// Everything under /api/admin
const router = express.Router();

router.use('/', teamRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/users', userRoutes);
router.use('/user-activity', userActivityRoutes);
router.use('/product-access', productAccessRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/payments', paymentRoutes);
router.use('/tickets', ticketRoutes);
router.use('/notifications', notificationRoutes);
router.use('/content', contentRoutes);
router.use('/orders', orderRoutes);
router.use('/partners', partnerRoutes);
router.use('/system', systemRoutes);
router.use('/export', exportRoutes);

router.get('/reports', requireAdmin('reports.export'), (req, res) => {
  res.json({ success: true, data: REPORT_LIST.filter((r) => req.admin.permissions.includes(r.permission)) });
});

// Counts for the sidebar badges
router.get('/badges', requireAdmin(), handle(async (req, res) => {
  if (!(await dbReady(0))) return res.json({ success: true, data: {} });
  const [tickets, reports] = await Promise.all([
    req.admin.permissions.includes('tickets.view') ? Ticket.countDocuments({ status: { $in: ['new', 'open'] } }) : 0,
    req.admin.permissions.includes('moderation.manage') ? ContentReport.countDocuments({ status: 'open' }) : 0
  ]);
  res.json({ success: true, data: { tickets, reports } });
}));

export default router;
