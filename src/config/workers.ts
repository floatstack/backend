import { Worker } from 'bullmq';
import { logger } from '../utils/logger.js';

export const createWorker = (
    name: string,
    processor: (job: any) => Promise<void>
) => {
    const worker = new Worker(name, processor, {
        connection: {
            host: process.env.REDIS_HOST || 'localhost',
            port: Number(process.env.REDIS_PORT) || 6379,
        },
    });

    worker.on('completed', (job) => {
        logger.info(`${name} Job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
        logger.error(` ${name} Job ${job?.id} failed: ${err.message}`);
    });

    return worker;
};
