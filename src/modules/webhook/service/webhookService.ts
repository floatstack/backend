import { prisma, Prisma } from '../../../config/database.js';
import { logger } from '../../../utils/logger.js';
import redisClient from '../../../config/redis.js';
import axios from 'axios';
import { decrypt } from '../../../utils/helper.js';
import { PredictionService } from '../../prediction/service/predictionService.js';


export class webhookService {

    static async handlePayment(payload: any): Promise<void> {
        // For testing only
        payload = {
            "id": "evt_gtb_20251112_093045_000212",
            "event_type": "transaction.completed",
            "timestamp": "2025-11-12T09:30:45.123Z",
            "transaction": {
                "id": "txn_gtb_20251112_093045_001",
                "amount": 75000,
                "currency": "NGN",
                "status": "succeeded",
                "type": "withdrawal",
                "payment_method": {
                    "type": "card",
                    "brand": "mastercard",
                    "last4": "9012"
                },
                "customer": {
                    "id": "cust_gtb_789101",
                    "name": "Emeka Nwosu",
                    "email": "emeka.nwosu@gmail.com"
                },
                "metadata": {
                    "terminal_id": "GTB2039A001",
                    "agent_id": "GTB-AG-0001"
                },
                "balance_after": 245000
            }
        };

        const transaction = payload.transaction;
        if (!transaction) {
            logger.warn('Missing transaction in payload');
            return;
        }

        // === Dedupe ===
        const cacheKey = `webhook:${transaction.id}`;
        const isDuplicate = await redisClient.get(cacheKey);
        if (isDuplicate) {
            logger.info(`Duplicate webhook ignored: ${transaction.id}`);
            return;
        }
        await redisClient.set(cacheKey, 'processed', { EX: 600 });

        // === Extract ===
        const agentId = transaction.metadata?.agent_id;
        const terminalId = transaction.metadata?.terminal_id;
        const txType = transaction.type;
        const amount = Number(transaction.amount);
        const rawTimestamp = payload.timestamp || transaction.timestamp || new Date().toISOString();

        if (!agentId || !txType) {
            logger.error('Missing required fields', {
                agentId,
                terminalId,
                txType,
                rawTimestamp,
                payload: JSON.stringify(payload)
            });
            return;
        }

        const eventTime = new Date(rawTimestamp);
        if (isNaN(eventTime.getTime())) {
            logger.error('Invalid timestamp format', { rawTimestamp });
            return;
        }

        const agent = await prisma.agent.findUnique({
            where: { agent_id: agentId },
            include: {
                bank: { include: { config: true } },
                float_snapshots: true
            }
        });

        if (!agent) {
            logger.error(`Agent not found: ${agentId}`);
            return;
        }

        let eFloat = transaction.balance_after ?? transaction.balance;

        if (!eFloat) {
            eFloat = await this.getFloatFromBankAPI(agent.bank_id, agentId);
        }

        if (eFloat === null || eFloat === undefined) {
            // Fallback: calculate from last known balance + transaction
            const lastSnapshot = agent.float_snapshots;
            if (lastSnapshot) {
                const currentFloat = lastSnapshot.e_float.toNumber();
                eFloat = txType === 'withdrawal'
                    ? currentFloat - amount
                    : currentFloat + amount;
                logger.info(`Calculated e_float from last snapshot: ${eFloat}`);
            } else {
                logger.error(`Failed to determine e_float for ${agentId}`);
                return;
            }
        }

        eFloat = Math.max(0, eFloat);

        await prisma.agentFloatSnapshot.upsert({
            where: { agent_id: agent.id },
            update: {
                e_float: eFloat,
                source: transaction.balance_after ? 'webhook' : 'calculated',
                last_updated_at: new Date()
            },
            create: {
                agent_id: agent.id,
                bank_id: agent.bank_id,
                e_float: eFloat,
                source: 'webhook',
                cash_in_hand: 0
            }
        });

        await prisma.transactionLog.create({
            data: {
                bank_id: agent.bank_id,
                agent_id: agent.id,
                terminal_id: terminalId,
                tx_type: txType,
                status: transaction.status || 'succeeded',
                payment_method: transaction.payment_method?.type || 'unknown',
                reference: transaction.id,
                amount,
                tx_time: eventTime
            }
        });

        logger.info(` Processed ${txType} ₦${amount.toLocaleString()} for ${agentId}`, {
            newBalance: `₦${eFloat.toLocaleString()}`,
            transactionId: transaction.id
        });

        // === AI Prediction ===
        setImmediate(async () => {
            try {
                const predictionService = PredictionService.getInstance();

                // Check if model is loaded
                if (!predictionService.isModelLoaded()) {
                    logger.warn('AI model not loaded, skipping prediction');
                    return;
                }

                logger.info(`Triggering AI prediction for ${agentId}...`);
                await predictionService.triggerPrediction(agent.id);
            } catch (err: any) {
                logger.error('AI prediction failed', {
                    agentId,
                    error: err.message,
                    stack: err.stack
                });
            }
        });
    }


    private static async getFloatFromBankAPI(bankId: string, agentId: string): Promise<number | null> {
        const cacheKey = `float:api:${agentId}`;
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            logger.info(`Cache hit for float: ${agentId}`);
            return parseFloat(cached);
        }

        try {
            const bank = await prisma.bank.findUnique({
                where: { id: bankId },
                select: { api_base_url: true, api_key: true, api_secret: true }
            });

            if (!bank?.api_base_url) {
                logger.warn(`No API URL configured for bank ${bankId}`);
                return null;
            }

            const response = await axios.get<{ balance?: number; e_float?: number }>(
                `${bank.api_base_url}/${agentId}`,
                {
                    headers: { 'Authorization': `Bearer ${decrypt(bank.api_key ?? '')}` },
                    timeout: 5000
                }
            );

            const balance = response.data.balance ?? response.data.e_float;
            if (balance !== undefined) {
                await redisClient.set(cacheKey, balance.toString(), { EX: 60 });
                logger.info(`Fetched e_float from bank API: ₦${balance.toLocaleString()}`);
                return balance;
            }
        } catch (err: any) {
            logger.error(`API float fetch failed for ${agentId}`, {
                error: err.message,
                bankId
            });
        }

        return null;
    }
}