import { createClient } from 'redis';
import { logger } from '../utils/logger.js';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err:any) => {
  logger.error(`Redis error: ${err.message}`);
});

redisClient.connect().catch((err:any) => {
  logger.error(`Redis connection failed: ${err.message}`);
});

export default redisClient;