import express from 'express';
import { payment } from '../controller/webhookController.js';
import { validateRequestBody } from '../../../middleware/validationMiddleware.js';

const router = express.Router();


/**
 * @swagger
 * /webhook/payment:
 *   post:
 *     summary: Receive payment webhook notifications
 *     tags: [Webhook]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               transaction_id: { type: string, example: "txn_123456" }
 *               amount: { type: number, example: 100.50 }
 *               status: { type: string, example: "completed" }
 *               timestamp: { type: string, format: date-time, example: "2024-01-01T12:00:00Z" }
 *     responses:
 *       200:
 *         description: Webhook received successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid webhook payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

router.post("/payment", payment);




export default router;