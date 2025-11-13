import { config } from 'dotenv';
import { PredictionService, LiquidityClass } from '../src/modules/prediction/service/predictionService.js';
import { prisma } from '../src/config/database.js';

config();

async function testPrediction(agentId: string) {
    console.log('\n Testing AI Prediction...\n');

    // Initialize prediction service
    const predictionService = PredictionService.getInstance();
    await predictionService.initialize();

    if (!predictionService.isModelLoaded()) {
        console.error(' Model not loaded!');
        return;
    }

    console.log('Model loaded successfully\n');

    // Find agent
    const agent = await prisma.agent.findUnique({
        where: { agent_id: agentId },
        include: {
            float_snapshots: true,
            transaction_logs: {
                take: 10,
                orderBy: { tx_time: 'desc' }
            },
            refill_events: {
                take: 1,
                orderBy: { refill_at: 'desc' }
            }
        }
    });

    if (!agent) {
        console.error(` Agent not found: ${agentId}`);
        return;
    }

    console.log(` Agent: ${agent.agent_id}`);
    console.log(`   Bank: ${agent.bank_id}`);
    console.log(`   E-Float: ₦${agent.float_snapshots?.e_float.toLocaleString() || 'N/A'}`);
    console.log(`   Assigned Limit: ₦${agent.assigned_limit.toLocaleString()}`);
    console.log(`   Recent Transactions: ${agent.transaction_logs.length}`);
    console.log('');

    // Make prediction
    console.log(' Running AI Prediction...\n');
    const result = await predictionService.predict(agent.id);

    if (!result) {
        console.error(' Prediction failed');
        return;
    }

    // Display results
    console.log(' PREDICTION RESULTS');
    console.log('='.repeat(60));
    console.log(`Predicted Class: ${LiquidityClass[result.predictedClass]}`);
    console.log(`Confidence: ${(result.confidence * 100).toFixed(2)}%`);
    console.log('');
    console.log('Probabilities:');
    console.log(`  🔴 LOW_E_FLOAT:  ${(result.probabilities.low * 100).toFixed(2)}%`);
    console.log(`  🟡 BALANCED:     ${(result.probabilities.balanced * 100).toFixed(2)}%`);
    console.log(`  🟢 CASH_RICH:    ${(result.probabilities.rich * 100).toFixed(2)}%`);
    console.log('='.repeat(60));
    console.log('');

    // Interpretation
    console.log('INTERPRETATION:');
    if (result.predictedClass === LiquidityClass.LOW_E_FLOAT) {
        console.log('   Agent needs cash injection soon!');
        if (result.confidence > 0.75) {
            console.log('  HIGH CONFIDENCE - Immediate action recommended');
        }
    } else if (result.predictedClass === LiquidityClass.BALANCED) {
        console.log('   Agent has optimal liquidity');
    } else if (result.predictedClass === LiquidityClass.CASH_RICH) {
        console.log('   Agent has excess cash - consider redistribution');
        if (result.confidence > 0.7) {
            console.log('   Can be used to refill low-float agents');
        }
    }
    console.log('');
}

async function testMultipleAgents() {
    console.log('\n Testing AI Predictions for Multiple Agents...\n');

    const predictionService = PredictionService.getInstance();
    await predictionService.initialize();

    if (!predictionService.isModelLoaded()) {
        console.error(' Model not loaded!');
        return;
    }

    // Get all agents
    const agents = await prisma.agent.findMany({
        take: 5,
        include: { float_snapshots: true }
    });

    console.log(`Found ${agents.length} agents\n`);

    for (const agent of agents) {
        console.log(`${'─'.repeat(60)}`);
        console.log(`Agent: ${agent.agent_id}`);

        const result = await predictionService.predict(agent.id);

        if (result) {
            const classEmoji =
                result.predictedClass === LiquidityClass.LOW_E_FLOAT ? '🔴' :
                    result.predictedClass === LiquidityClass.BALANCED ? '🟡' : '🟢';

            console.log(`${classEmoji} ${LiquidityClass[result.predictedClass]} (${(result.confidence * 100).toFixed(1)}% confidence)`);
            console.log(`   E-Float: ₦${agent.float_snapshots?.e_float.toLocaleString() || 'N/A'}`);
        } else {
            console.log('   ❌ Prediction failed');
        }
        console.log('');
    }
}

async function main() {
    const command = process.argv[2];
    const agentId = process.argv[3] || 'GTB-AG-0001';

    try {
        if (command === 'single') {
            await testPrediction(agentId);
        } else if (command === 'multiple') {
            await testMultipleAgents();
        } else {
            console.log(`
Usage: npx tsx scripts/test-ai-prediction-direct.ts <command> [agentId]

Commands:
  single [agentId]    - Test prediction for a specific agent (default: GTB-AG-0001)
  multiple            - Test predictions for multiple agents

Examples:
  npx tsx scripts/test-ai-prediction-direct.ts single GTB-AG-0001
  npx tsx scripts/test-ai-prediction-direct.ts multiple
      `);
            process.exit(1);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();