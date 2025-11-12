import { prisma, Prisma } from '../../../config/database.js';
import { logger } from '../../../utils/logger.js';
import redisClient from '../../../config/redis.js';


export class webhookService {

    static async handlePayment(payload: any): Promise<void> {
        // Simulate processing the payment webhook payload
        payload = {
            "id": "evt_1M83ujd9defalitw",
            "event_type": "transaction.completed",
            "timestamp": "2023-11-12T10:30:00Z",
            "transaction": {
                "id": "txn_1M9zY2AbcdefGhij",
                "amount": 5500,
                "currency": "NGN",
                "status": "succeeded",
                "type": "withdrawal",
                "payment_method": {
                    "type": "card",
                    "brand": "visa",
                    "last4": "4242"
                },
                "customer": {
                    "id": "cust_abc123",
                    "name": "Jane Doe",
                    "email": "jane.doe@example.com"
                },
                "metadata": {
                    "terminal_id": "POS_123",
                    "agent_id": "emp_007"
                }
            }
        };

        const transaction = payload.transaction;

        const cacheKey = `webhook:${transaction.id}`;
        const cacheExists = await redisClient.get(cacheKey);
        if (cacheExists) {
            logger.warn(`Duplicate webhook ignored: ${transaction.id}`);
            return;
        }

        await redisClient.set(cacheKey, "processed", { EX: 60 * 10 });

    }
}