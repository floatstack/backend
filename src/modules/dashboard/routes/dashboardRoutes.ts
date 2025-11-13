import express from 'express';
import { getAgentManagement, getBankDashboard } from '../controller/dashboardController.js';
import { validateRequestBody } from '../../../middleware/validationMiddleware.js';
import {
    getAgentManagementSchema
} from '../schema/dashboardSchema.js';
import { authMiddleware } from '../../../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /dashboard/agents:
 *   get:
 *     summary: Retrieve a paginated list of agents for the bank dashboard
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of agents to return per page
 *     responses:
 *       200:
 *         description: Successful retrieval of agent list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 200
 *                     currentPage:
 *                       type: integer
 *                       example: 1
 *                     totalPages:
 *                       type: integer
 *                       example: 10
 *                     agents:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "agt_12345"
 *                           name:
 *                             type: string
 *                             example: "John Doe"
 *                           email:
 *                             type: string
 *                             example: "john@bank.com"
 *                           phone:
 *                             type: string
 *                             example: "+2348012345678"
 *                           status:
 *                             type: string
 *                             enum: [active, inactive]
 *                             example: "active"
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2025-11-13T08:45:30Z"
 *       400:
 *         description: Bad Request - Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

router.get('/agents', validateRequestBody(getAgentManagementSchema), authMiddleware(), getAgentManagement);

/**
 * @swagger
 * /dashboard/agents/summary:
 *   get:
 *     summary: Retrieve summary statistics for the bank dashboard
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successful retrieval of dashboard summary
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalAgents: 
 *                       type: integer
 *                       example: 120
 *                     activeAgents:
 *                       type: integer
 *                       example: 95
 *                     inactiveAgents:
 *                       type: integer
 *                       example: 25
 *                     totalTransactions:
 *                       type: integer
 *                       example: 4500
 *                     totalEarnings:
 *                       type: number
 *                       format: float
 *                       example: 235000.50
 *       400:
 *         description: Bad Request - Invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

router.get('/agents/summary',authMiddleware(), getBankDashboard);

export default router;