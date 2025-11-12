import { createWorker } from "../config/workers.js";
import { webhookService } from "../modules/webhook/service/webhookService.js";
import { logger } from "../utils/logger.js";

export const paymentWorker = createWorker(
    "paymentQueue",
    async (job) => {
        try {
            logger.info(`Processing payment job ${job.id} with data: ${JSON.stringify(job.data)}`);
            await webhookService.handlePayment(job.data);
            logger.info(`Payment job ${job.id} processed successfully`);
        } catch (error: any) {
            logger.error(`Error processing payment job ${job.id}: ${error.message}`);
            throw error;
        }
    }
);