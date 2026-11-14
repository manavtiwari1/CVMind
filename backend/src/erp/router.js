import express from 'express';
import peopleRoutes from './routes/people.js';
import payrollRoutes from './routes/payroll.js';
import letterRoutes from './routes/letters.js';
import expenseRoutes from './routes/expenses.js';
import financeRoutes from './routes/finance.js';

// Everything under /api/admin/erp: admin panel routes, which need hr.* or finance.view.
// The member's own view (My HR file, payslips, …) is under /api/admin/team/me/* (erp/routes/me.js).
const router = express.Router();

router.use('/', peopleRoutes);
router.use('/', payrollRoutes);
router.use('/', letterRoutes);
router.use('/', expenseRoutes);
router.use('/', financeRoutes);

export default router;
