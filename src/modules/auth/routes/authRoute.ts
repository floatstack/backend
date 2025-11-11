import express from 'express';
import { login } from '../controller/authController.js';
import { validateRequestBody } from '../../../middleware/validationMiddleware.js';
import { loginSchema } from '../Schema/authSchema.js';

const router = express.Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate a user and return access/refresh tokens
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, authProvider]
 *             properties:
 *               email: { type: string, format: email, example: "bank@test.com" }
 *               password: { type: string, example: "password" }
 *     responses:
 *       200:
 *         description: Successful login
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     user_id: { type: integer, example: 1 }
 *                     roles: { type: array, items: { type: string }, example: ["admin", "trainer"] }
 *                     permissions: { type: array, items: { type: string }, example: ["view_courses", "manage_delegates"] }
 *                     access_token: { type: string, example: "eyJhbGciOiJIUzI1NiIs..." }
 *                     refresh_token: { type: string, example: "eyJhbGciOiJIUzI1NiIs..." }
 *       400:
 *         description: Invalid input or credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

router.post("/login", validateRequestBody(loginSchema), login)



export default router;