import { Router } from 'express';

import authRoute from '../modules/auth/routes/authRoute.js';
import webhookRoute from '../modules/webhook/routes/webhookRoute.js';
import dashboardRoute from '../modules/dashboard/routes/dashboardRoutes.js';
import simulationRoute from '../modules/simulation/routes/simulationRoutes.js';


const router = Router();

router.use('/api/auth', authRoute);
router.use('/api/webhook', webhookRoute);

router.use('/api/dashboard', dashboardRoute);

router.use('/api/simulate', simulationRoute);

export default router;