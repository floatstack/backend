import { PrismaClient, Prisma } from '../generated/prisma/client.js';
import { logger } from '../utils/logger.js';
import { handlePrismaError } from '../utils/helper.js';


const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'info' },
    { emit: 'stdout', level: 'warn' },
  ],
});

prisma.$on('query', (e) => {
  // logger.info('Prisma Query', { query: e.query, params: e.params, duration: e.duration });
});

async function connectDB() {
  try {
    await prisma.$connect();
    logger.info('Successfully connected to the database');
  } catch (error) {
    handlePrismaError(error);
    logger.error('Failed to connect to the database', { error });
    process.exit(1);
  }
}

// Call connectDB automatically on import
connectDB().catch((error) => {
  logger.error('Initial database connection failed', { error });
  process.exit(1);
});

export { prisma, Prisma };