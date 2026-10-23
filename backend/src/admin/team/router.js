import express from 'express';
import coreRoutes from './routes/core.js';
import chatRoutes from './routes/chat.js';
import taskRoutes from './routes/tasks.js';
import announcementRoutes from './routes/announcements.js';
import manageRoutes from './routes/manage.js';
import standupRoutes from './routes/standup.js';
import leoRoutes from './routes/leo.js';

// Everything under /api/admin/team: the CVMind Team app (team.cvmind.in) and its management
const router = express.Router();

router.use('/', coreRoutes);
router.use('/', chatRoutes);
router.use('/', taskRoutes);
router.use('/', announcementRoutes);
router.use('/', manageRoutes);
router.use('/', standupRoutes);
router.use('/', leoRoutes);

export default router;
