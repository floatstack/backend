import { createQueue } from '../config/queues.js';

export const paymentQueue = createQueue('paymentQueue');
