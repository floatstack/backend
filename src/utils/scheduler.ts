import cron from 'node-cron';
import { logger } from '../utils/logger.js';

interface Job {
    name: string;
    schedule: string;
    task: () => Promise<void>;
}

export function registerJob(job: Job) {
    logger.info(`Registering job: ${job.name} (${job.schedule})`);

    try {
        cron.schedule(job.schedule, async () => {
            logger.info(`[JOB STARTED] ${job.name}`);
            try {
                await job.task();
                logger.info(`[JOB COMPLETED] ${job.name}`);
            } catch (error: any) {
                logger.error(`[JOB FAILED] ${job.name} - ${error.message}`);
            }
        });
    } catch (error: any) {
        logger.error(`Failed to register job: ${job.name}`, { error: error.message });
    }
}
