import { Router } from 'express';

import authRoute from '../modules/auth/routes/authRoute.js';
import webhookRoute from '../modules/webhook/routes/webhookRoute.js';
import dashboardRoute from '../modules/dashboard/routes/dashboardRoutes.js';


const router = Router();

router.use('/api/auth', authRoute);
router.use('/api/webhook', webhookRoute);

router.use('/api/dashboard', dashboardRoute);

export default router;