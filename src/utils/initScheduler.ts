import { jobs } from '../jobs/index.js';
import { registerJob } from './scheduler.js';
import { logger } from './logger.js';

export function initScheduler() {
  logger.info('Initializing scheduler...');
  for (const job of jobs) {
    registerJob(job);
  }
  logger.info(`${jobs.length} job(s) registered successfully.`);
}
