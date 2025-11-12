import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../../../utils/response.js';
import { webhookService } from '../service/webhookService.js';
import { UserRequest } from '../../../middleware/validationMiddleware.js';
import { paymentQueue } from '../../../queues/index.js';


export const payment = async (req: UserRequest, res: Response, next: NextFunction) => {
    try {

        // Aknowledge webhook is received
        res.status(200).json({ received: true });

        setImmediate(async () => {
            await paymentQueue.add('processPayment', req.payload);
        });
    } catch (error: any) {
        return res
            .status(error.statusCode || 500)
            .json(errorResponse(error.statusCode || 500, error.message, error.errors || []));
    }

};