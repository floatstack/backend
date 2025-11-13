import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../../../utils/response.js';
import { DashboardService } from '../service/dashboardService.js';
import { logger } from '../../../utils/logger.js';
import { UserRequest } from '../../../middleware/validationMiddleware.js';

export const getAgentManagement = async (req: UserRequest, res: Response) => {
    try {
        const bank_id = req.user?.bank_id;
        console.log(req.user);
        if (!bank_id) {
            return res.status(400).json(errorResponse(400, 'Unauthenticated user', []));
        }
        const { page = 1, limit = 20 } = req.query as any;
        const data = await DashboardService.getAgentManagement(bank_id, parseInt(page), parseInt(limit));
        return res.json(successResponse(200, 'Agents fetched', data));
    } catch (error: any) {
        logger.error('getAgentManagement failed', { error });
        return res
            .status(error.statusCode || 500)
            .json(errorResponse(error.statusCode || 500, error.message, error.errors || []));
    }
};

export const getBankDashboard = async (req: UserRequest, res: Response) => {
    try {
        const bank_id = req.user?.bank_id;
        if (!bank_id) {
            return res.status(400).json(errorResponse(400, 'Unauthenticated user', []));
        } const data = await DashboardService.getBankSummary(bank_id);
        return res.json(successResponse(200, 'Dashboard summary', data));
    } catch (error: any) {
        logger.error('getBankDashboard failed', { error });
        return res.status(500).json(errorResponse(500, 'Failed to fetch dashboard', []));
    }
};