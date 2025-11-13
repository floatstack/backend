import { prisma } from '../../../config/database.js';
import { PredictionService, LiquidityClass } from '../../prediction/service/predictionService.js';
import { logger } from '../../../utils/logger.js';
import { DashboardService } from '../../dashboard/service/dashboardService.js';
import { generateRandomString } from '../../../utils/helper.js';

export interface SimulationResponse {
    classification: 'LOW_E_FLOAT' | 'BALANCED' | 'CASH_RICH';
    confidence: number;
    alert?: {
        message: string;
        action: 'REFILL_ATM';
        amount: number;
        code: string;
        atm_location?: string;
    } | undefined;
    new_balance: number;
    limit?: number | string;
}

export class SimulationService {
    private static predictionService = PredictionService.getInstance();

    static async processTransaction(
        agent_id: string,
        amount: number,
        balance_after: number,
        tx_type: 'withdrawal' | 'deposit'
    ): Promise<SimulationResponse> {
        const agent = await prisma.agent.findUnique({
            where: { agent_id },
            include: { float_snapshots: true, bank: true }
        });

        if (!agent) throw new Error('Agent not found');

        // Update assinged limit

        // await prisma.agent.update({
        //     where: { agent_id },
        //     data: {
        //         assigned_limit: balance_after
        //     }
        // })
        const newEfloat = agent.float_snapshots ? agent.float_snapshots.e_float.toNumber() + amount : amount;
        // Update snapshot
        await prisma.agentFloatSnapshot.upsert({
            where: { agent_id: agent.id },
            update: {
                e_float: newEfloat,
                source: 'api_pull',
                last_updated_at: new Date()
            },
            create: {
                agent_id: agent.id,
                bank_id: agent.bank_id,
                e_float: newEfloat,
                source: 'api_pull',
                cash_in_hand: 0
            }
        });

        // Log transaction
        await prisma.transactionLog.create({
            data: {
                bank_id: agent.bank_id,
                agent_id: agent.id,
                terminal_id: agent.terminal_id,
                tx_type,
                status: 'succeeded',
                payment_method: 'simulation',
                reference: `sim_${Date.now()}`,
                amount,
                tx_time: new Date()
            }
        });

        // Trigger AI prediction
        let classification: SimulationResponse['classification'] = 'BALANCED';
        let confidence = 0;
        let alert = undefined;
        const lowerBound = 0.7 * agent.assigned_limit.toNumber();

        if (this.predictionService.isModelLoaded()) {
            const result = await this.predictionService.predict(agent.id);
            if (result) {
                // classification =
                //     result.predictedClass === LiquidityClass.LOW_E_FLOAT
                //         ? 'LOW_E_FLOAT'
                //         : result.predictedClass === LiquidityClass.CASH_RICH
                //             ? 'CASH_RICH'
                //             : 'BALANCED';

                classification =
                    result.predictedClass === LiquidityClass.CASH_RICH
                        ? 'LOW_E_FLOAT'
                        : result.predictedClass === LiquidityClass.LOW_E_FLOAT
                            ? 'CASH_RICH'
                            : 'BALANCED';



                confidence = result.confidence * 100;

                if ((result.predictedClass === LiquidityClass.LOW_E_FLOAT && result.probabilities.rich > 0.75) || (newEfloat >= lowerBound) ) {
                    const refillAmount = 200000;
                    alert = {
                        message: `Low Float Alert! Refill ₦${refillAmount.toLocaleString()} at nearest ATM`,
                        action: 'REFILL_ATM' as const,
                        amount: refillAmount,
                        code: generateRandomString(6),
                        atm_location: 'ATM-X, Ikeja (500m away)'
                    };

                    // Log on Dashboard
                }
            }
        }

        // Invalidate dashboard cache
        // await DashboardService.invalidateCache(agent.bank_id);

        return {
            classification:newEfloat >= lowerBound? 'LOW_E_FLOAT' : classification,
            confidence,
            alert,
            new_balance: newEfloat.toLocaleString() as unknown as number
            // limit: agent.assigned_limit.toNumber().toLocaleString()
        };
    }
}