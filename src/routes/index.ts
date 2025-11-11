import { Router } from 'express';

import authRoute from '../modules/auth/routes/authRoute.js';


const router = Router();

router.use('/auth', authRoute);

export default router;