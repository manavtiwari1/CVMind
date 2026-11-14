import express from 'express';
import peopleRoutes from './routes/people.js';
import payrollRoutes from './routes/payroll.js';

// Everything under /api/admin/erp: admin panel routes, which need hr.* or finance.view.
// The member's own view (My HR file, payslips, …) is under /api/admin/team/me/* (erp/routes/me.js).
const router = express.Router();

router.use('/', peopleRoutes);
router.use('/', payrollRoutes);

export default router;
