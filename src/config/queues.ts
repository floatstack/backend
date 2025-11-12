import { Queue } from 'bullmq';

export const createQueue = (name: string) => {
  return new Queue(name, {
    connection: {
      host: process.env.REDIS_HOST ||'localhost',
      port: Number(process.env.REDIS_PORT) ||6379,
    },
  });
};
