import { prisma, Prisma } from '../../../config/database.js';
import { logger } from '../../../utils/logger.js';
import redisClient from '../../../config/redis.js';
import axios from 'axios';
import { decrypt } from '../../../utils/helper.js';


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

        const agentId = transaction.metadata.agent_id;
        const terminalId = transaction.metadata.terminal_id;
        const txType = transaction.type;
        const amount = transaction.amount;
        const eventTime = new Date(transaction.timestamp);

        const agent = await prisma.agent.findUnique({
            where: { agent_id: agentId },
            include: { bank: { include: { config: true } } }

        });
        if (!agent) {
            logger.error(`Agent not found: ${agentId}`);
            return;
        }

        const bankId = agent.bank_id;


        let eFloat = transaction.balance_after ?? transaction.balance;

        if (!eFloat) {
            // Fallback: Call Bank API
            eFloat = await this.getFloatFromBankAPI(agent.bank_id, agentId);
        }

        if (eFloat === null) {
            logger.error(`Failed to get e_float for agent ${agentId}`);
            return;
        }

        eFloat = Math.max(0, eFloat ?? 1000);

        // Update Snapshot 
        await prisma.agentFloatSnapshot.upsert({
            where: { agent_id: agent.id },
            update: {
                e_float: eFloat,
                source: eFloat === transaction.balance_after ? 'webhook' : 'api_pull',
                last_updated_at: new Date()
            },
            create: {
                agent_id: agent.id,
                bank_id: agent.bank_id,
                e_float: eFloat,
                source: transaction.balance_after ? 'webhook' : 'api_pull',
                cash_in_hand: 0
            }
        });

        await prisma.transactionLog.create({
            data: {
                bank_id: agent.bank_id,
                agent_id: agent.id,
                terminal_id: terminalId,
                tx_type: txType,
                status: transaction.status,
                payment_method: transaction.payment_method.type,
                reference: transaction.id,
                amount,
                tx_time: eventTime
            }
        });

        const lowThreshold = agent.threshold_low
            ? agent.threshold_low.toNumber() * agent.assigned_limit.toNumber()
            : (agent.bank.config?.threshold_low.toNumber() ?? 0.65) * agent.assigned_limit.toNumber();

        const highThreshold = agent.threshold_high
            ? agent.threshold_high.toNumber() * agent.assigned_limit.toNumber()
            : (agent.bank.config?.threshold_high.toNumber() ?? 1.35) * agent.assigned_limit.toNumber();

        // if (eFloat < lowThreshold) {
        //     await sendLowFloatAlert(agent, eFloat, lowThreshold);
        //     await syncAgentATMCache(agent.id);
        // }

        //AI Prediction
        // setImmediate(() => triggerAIPrediction(agent.id).catch(console.error));

    }


    private static async getFloatFromBankAPI(bankId: string, agentId: string): Promise<number | null> {
        const cacheKey = `float:api:${agentId}`;
        const cached = await redisClient.get(cacheKey);
        if (cached) return parseFloat(cached);

        try {
            const bank = await prisma.bank.findUnique({
                where: { id: bankId },
                select: { api_base_url: true, api_key: true, api_secret: true }
            });

            if (!bank?.api_base_url) return null;

            const response = await axios.get(`${bank.api_base_url}/${agentId}`, {
                headers: { 'Authorization': `Bearer ${decrypt(bank.api_key ?? '')}` },
                timeout: 5000
            });

            const balance = response.data.balance ?? response.data.e_float;
            if (balance !== undefined) {
                await redisClient.set(cacheKey, balance.toString(), { EX: 60 }); // cache for 1 minute
                return balance;
            }
        } catch (err: any) {
            logger.error(`API float fetch failed for ${agentId}: ${err.message}`);
        }

        return null;
    }
}