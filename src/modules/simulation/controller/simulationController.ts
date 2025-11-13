import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../../../utils/response.js';
import { SimulationService } from '../service/simulationService.js';
import { logger } from '../../../utils/logger.js';
import { UserRequest } from '../../../middleware/validationMiddleware.js';

export const simulateTransaction = async (req: UserRequest, res: Response) => {
    try {
        const { agent_id, amount, balance_after, tx_type } = req.payload;

        const result = await SimulationService.processTransaction(
            agent_id,
            amount,
            balance_after,
            tx_type
        );

        return res.json(successResponse(200, 'Transaction simulated', result));
    } catch (error: any) {
        logger.error('Simulation failed', { error: error.message });
        return res.status(400).json(errorResponse(400, error.message, []));
    }
};