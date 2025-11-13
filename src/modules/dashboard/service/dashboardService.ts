import { prisma } from '../../../config/database.js';
import redisClient from '../../../config/redis.js';
import { PredictionService, LiquidityClass } from '../../prediction/service/predictionService.js';
import { logger } from '../../../utils/logger.js';

export interface AgentManagementItem {
    agent_id: string;
    full_name: string;
    email?: string;
    region?: string | null;
    e_float: number;
    assigned_limit: number;
    status: 'LOW_E_FLOAT' | 'BALANCED' | 'CASH_RICH' | 'UNKNOWN';
    confidence: number;
    last_activity: string;
    location: { lat: number; lng: number } | string | null;
}

export interface BankDashboardSummary {
    total_agents: number;
    active_agents: number;
    total_float_in_circulation: number;
    agents_below_threshold: number;
    critical_alerts: number;
    predicted_float_failures_6h: number;
    total_transactions_today: number;
    avg_transaction_size: number;
}

export class DashboardService {
    private static predictionService = PredictionService.getInstance();

    // Invalidate cache on webhook
    static async invalidateCache(bankId: string) {
        await redisClient.del(`dashboard:agents:${bankId}`);
        await redisClient.del(`dashboard:summary:${bankId}`);
    }

    static async getAgentManagement(bankId: string, page: number, limit: number): Promise<{
        data: AgentManagementItem[];
        pagination: { page: number; limit: number; total: number }
    }> {
        const cacheKey = `dashboard:agents:${bankId}:p${page}:l${limit}`;
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const skip = (page - 1) * limit;

        const [agents, total] = await Promise.all([
            prisma.agent.findMany({
                where: { bank_id: bankId, status: 'active' },
                skip,
                take: limit,
                select: {
                    id: true,
                    agent_id: true,
                    full_name: true,
                    assigned_limit: true,
                    last_active_at: true,
                    float_snapshots: { select: { e_float: true } },
                    users: { select: { email: true }, take: 1 }
                },
                orderBy: { last_active_at: 'desc' }
            }),
            prisma.agent.count({ where: { bank_id: bankId, status: 'active' } })
        ]);

        const result = await Promise.all(
            agents.map(async (agent) => {
                const snapshot = agent.float_snapshots;
                const eFloat = snapshot?.e_float.toNumber() ?? 0;

                let status: AgentManagementItem['status'] = 'UNKNOWN';
                let confidence = 0;

                if (DashboardService.predictionService.isModelLoaded()) {
                    const pred = await DashboardService.predictionService.predict(agent.id);
                    if (pred) {
                        status = pred.predictedClass === LiquidityClass.LOW_E_FLOAT
                            ? 'LOW_E_FLOAT'
                            : pred.predictedClass === LiquidityClass.CASH_RICH
                                ? 'CASH_RICH'
                                : 'BALANCED';
                        confidence = pred.confidence * 100;
                    }
                }

                return {
                    agent_id: agent.agent_id,
                    full_name: agent.full_name || 'N/A',
                    email: agent.users[0]?.email || '',
                    region: null,
                    e_float: eFloat,
                    assigned_limit: agent.assigned_limit.toNumber(),
                    status,
                    confidence,
                    last_activity: agent.last_active_at?.toISOString() || new Date().toISOString(),
                    location: null
                };
            })
        );

        const response = { data: result, pagination: { page, limit, total } };
        await redisClient.set(cacheKey, JSON.stringify(response), { EX: 30 });
        return response;
    }

    static async getBankSummary(bankId: string): Promise<BankDashboardSummary> {
        const cacheKey = `dashboard:summary:${bankId}`;
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const [agents, snapshots, txToday, config] = await Promise.all([
            prisma.agent.findMany({
                where: { bank_id: bankId, status: 'active' },
                select: { id: true, assigned_limit: true, last_active_at: true }
            }),
            prisma.agentFloatSnapshot.findMany({
                where: { bank_id: bankId },
                select: { agent_id: true,e_float: true }
            }),
            prisma.transactionLog.findMany({
                where: {
                    bank_id: bankId,
                    tx_time: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
                },
                select: { amount: true }
            }),
            prisma.bankConfig.findUnique({ where: { bank_id: bankId } })
        ]);

        const totalFloat = snapshots.reduce((sum, s) => sum + s.e_float.toNumber(), 0);
        const threshold = config?.threshold_low || 0.7;

        const lowFloatAgents = agents.filter(a => {
            const snap = snapshots.find(s => s.agent_id === a.id);
            return snap && (snap.e_float.toNumber() / a.assigned_limit.toNumber()) < Number(threshold)
;
        }).length;

        let predictedFailures = 0;
        if (DashboardService.predictionService.isModelLoaded()) {
            for (const agent of agents) {
                const pred = await DashboardService.predictionService.predict(agent.id);
                if (pred?.predictedClass === LiquidityClass.LOW_E_FLOAT && pred.probabilities.low > 0.75) {
                    predictedFailures++;
                }
            }
        }

        const totalTx = txToday.length;
        const avgTxSize = totalTx > 0
            ? txToday.reduce((sum, t) => sum + t.amount.toNumber(), 0) / totalTx
            : 0;

        const summary: BankDashboardSummary = {
            total_agents: agents.length,
            active_agents: agents.filter(a => a.last_active_at && Date.now() - a.last_active_at.getTime() < 6 * 3600000).length,
            total_float_in_circulation: totalFloat,
            agents_below_threshold: lowFloatAgents,
            critical_alerts: predictedFailures,
            predicted_float_failures_6h: predictedFailures,
            total_transactions_today: totalTx,
            avg_transaction_size: avgTxSize
        };

        await redisClient.set(cacheKey, JSON.stringify(summary), { EX: 30 });
        return summary;
    }
}