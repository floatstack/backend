import express from 'express';
import { simulateTransaction } from '../controller/simulationController.js';
import { validateRequestBody } from '../../../middleware/validationMiddleware.js';
import { simulateTransactionSchema } from '../schema/simulationSchema.js';

const router = express.Router();

/**
 * @swagger
 * /simulate/transaction:
 *   post:
 *     summary: Simulate POS transaction (for demo)
 *     tags: [Simulation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [agent_id, amount, balance_after, tx_type]
 *             properties:
 *               agent_id: { type: string, example: "GTB-AG-0001" }
 *               amount: { type: number, example: 75000 }
 *               balance_after: { type: number, example: 245000 }
 *               tx_type: { type: string, enum: [withdrawal, deposit], example: "withdrawal" }
 *     responses:
 *       200:
 *         description: Transaction simulated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 classification: { type: string, enum: [LOW_E_FLOAT, BALANCED, CASH_RICH], example: "LOW_E_FLOAT" }
 *                 confidence: { type: number, example: 82.5 }
 *                 alert:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     message: { type: string, example: "Low Float Alert! Refill ₦200,000 at nearest ATM" }
 *                     action: { type: string, enum: [REFILL_ATM], example: "REFILL_ATM" }
 *                     amount: { type: number, example: 200000 }
 *                     atm_location: { type: string, example: "ATM-X, Ikeja (500m away)" }
 *                 new_balance: { type: number, example: 245000 }
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Agent not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

router.post('/transaction', validateRequestBody(simulateTransactionSchema), simulateTransaction);

export default router;