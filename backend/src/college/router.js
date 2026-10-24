import express from 'express';
import '../db.js'; // registers the Work, Scan and LinkedinLog models the dashboard reads
import coreRoutes from './routes/core.js';
import rosterRoutes from './routes/roster.js';
import dashboardRoutes from './routes/dashboard.js';
import vettingRoutes from './routes/vetting.js';

// Everything under /api/college: the placements portal (placements.cvmind.in).
// Every route here except /login uses requireCollege() from access.js.
const router = express.Router();

router.use('/', coreRoutes);
router.use('/', rosterRoutes);
router.use('/', dashboardRoutes);
router.use('/', vettingRoutes);

export default router;
