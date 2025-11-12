import * as tf from '@tensorflow/tfjs-node';
import { prisma } from '../../../config/database.js';
import { logger } from '../../../utils/logger.js';
// import { sendLowFloatAlert, sendCashRichAlert } from '../notification/service/alertService.js';
// import { syncAgentATMCache } from '../../agent/service/atmService.js';

export enum LiquidityClass {
    LOW_E_FLOAT = 0,
    BALANCED = 1,
    CASH_RICH = 2
}

interface Features {
    e_float_pct: number;
    withdrawal_velocity_6h: number;
    deposit_velocity_6h: number;
    avg_withdrawal_size: number;
    time_since_last_refill_hrs: number;
    hour_sin: number;
    hour_cos: number;
    is_peak_hour: number;
}

export class PredictionService {
    private static instance: PredictionService;
    private model: tf.LayersModel | null = null;
    private readonly modelPath = 'file://./models/liquidity-v1/model.json';

    private constructor() { }

    public static getInstance(): PredictionService {
        if (!PredictionService.instance) {
            PredictionService.instance = new PredictionService();
        }
        return PredictionService.instance;
    }


    public async initialize(): Promise<void> {
        try {
            this.model = await tf.loadLayersModel(this.modelPath);
            logger.info('AI Prediction model loaded successfully');
        } catch (error: any) {
            logger.error(`Failed to load AI model from ${this.modelPath}`, { error: error.message });
            this.model = null;
        }
    }


    private async extractFeatures(agentId: string): Promise<number[] | null> {
        try {
            const agent = await prisma.agent.findUnique({
                where: { id: agentId },
                include: {
                    float_snapshots: true,
                    transaction_logs: {
                        where: { tx_time: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) } }, // last 6 hours
                        orderBy: { tx_time: 'asc' }
                    },
                    refill_events: {
                        take: 1,
                        orderBy: { refill_at: 'desc' }
                    }
                }
            });

            if (!agent || !agent.float_snapshots) return null;

            const snapshot = agent.float_snapshots;
            const transactions = agent.transaction_logs;
            const lastRefill = agent.refill_events?.[0];

            const now = new Date();
            const hour = now.getHours();

            const e_float_percentage = snapshot.e_float.toNumber() / agent.assigned_limit.toNumber();

            const withdrawals = transactions.filter(transaction => transaction.tx_type === 'withdrawal');
            const deposits = transactions.filter(transaction => transaction.tx_type === 'deposit');

            // Calculate velocities (average amount per hour)
            const withdrawal_velocity_6h = withdrawals.reduce((sum, transaction) => sum + transaction.amount.toNumber(), 0) / 6;
            const deposit_velocity_6h = deposits.reduce((sum, transaction) => sum + transaction.amount.toNumber(), 0) / 6;

            // Average withdrawal size
            const avg_withdrawal_size = withdrawals.length > 0
                ? withdrawals.reduce((sum, transaction) => sum + transaction.amount.toNumber(), 0) / withdrawals.length
                : 0;

            const time_since_last_refill_hrs = lastRefill
                ? (now.getTime() - new Date(lastRefill.refill_at).getTime()) / (1000 * 60 * 60)
                : 999;

            const hour_sin = Math.sin(2 * Math.PI * hour / 24);
            const hour_cos = Math.cos(2 * Math.PI * hour / 24);
            const is_peak_hour = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18) ? 1 : 0;

            return [
                e_float_percentage,
                withdrawal_velocity_6h / 100000,
                deposit_velocity_6h / 100000,
                avg_withdrawal_size / 100000,
                Math.min(time_since_last_refill_hrs / 100, 10),
                hour_sin,
                hour_cos,
                is_peak_hour
            ];
        } catch (error: any) {
            logger.error(`Feature extraction failed for agent ${agentId}`, { error: error.message });
            return null;
        }
    }


    /**
     * Predict liquidity class for an agent
     */
    public async predict(agentId: string): Promise<{
        predictedClass: LiquidityClass;
        probabilities: { low: number; balanced: number; rich: number };
    } | null> {
        if (!this.model) {
            logger.warn('AI model not loaded. Skipping prediction.');
            return null;
        }

        const features = await this.extractFeatures(agentId);
        if (!features) return null;

        const tensor = tf.tensor2d([features]);
        const prediction = this.model.predict(tensor) as tf.Tensor;

        // Convert tensor to JS array
        const probabilityArray = (await prediction.array()) as number[][];

        
        if (!probabilityArray || !probabilityArray[0] || probabilityArray[0].length !== 3) {
            tensor.dispose();
            prediction.dispose();
            logger.error(`Prediction output invalid for agent ${agentId}`);
            return null;
        }

        const [p_low, p_balanced, p_rich] = probabilityArray[0] as [number, number, number];

        const predictedClass = probabilityArray[0].indexOf(Math.max(...probabilityArray[0])) as LiquidityClass;

        
        tensor.dispose();
        prediction.dispose();

        return {
            predictedClass,
            probabilities: { low: p_low, balanced: p_balanced, rich: p_rich }
        };
    }


    public async triggerPrediction(agentId: string): Promise<void> {
        const result = await this.predict(agentId);
        if (!result) return;

        const { predictedClass, probabilities } = result;
        const agent = await prisma.agent.findUnique({ where: { id: agentId } });
        if (!agent) return;

        if (predictedClass === LiquidityClass.LOW_E_FLOAT && probabilities.low > 0.75) {
            // await sendLowFloatAlert(
            //     agent,
            //     `AI Alert: High risk of low float in 6h (${(probabilities.low * 100).toFixed(0)}% confidence)`
            // );
            // await syncAgentATMCache(agentId);
        }

        if (predictedClass === LiquidityClass.CASH_RICH && probabilities.rich > 0.7) {
            // await sendCashRichAlert(
            //     agent,
            //     `AI: Excess float detected (${(probabilities.rich * 100).toFixed(0)}% confidence)`
            // );
        }


        logger.info(`AI Prediction for ${agent.agent_id}: ${LiquidityClass[predictedClass]} (${(Math.max(...Object.values(probabilities)) * 100).toFixed(0)}%)`);
    }
}