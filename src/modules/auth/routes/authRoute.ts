import express from 'express';
import { login } from '../controller/authController.js';
import { validateRequestBody } from '../../../middleware/validationMiddleware.js';

const router = express.Router();



export default router;