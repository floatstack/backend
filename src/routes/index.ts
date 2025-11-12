import { Router } from 'express';

import authRoute from '../modules/auth/routes/authRoute.js';
import webhookRoute from '../modules/webhook/routes/webhookRoute.js';


const router = Router();

router.use('/api/auth', authRoute);
router.use('/api/webhook', webhookRoute);

export default router;