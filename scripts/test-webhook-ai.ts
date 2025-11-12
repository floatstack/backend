import { config } from 'dotenv';
import axios from 'axios';

config();

const API_URL = process.env.API_URL || 'http://localhost:3000';

// Test scenarios
const scenarios = [
  {
    name: 'Low E-Float Scenario (Multiple withdrawals)',
    transactions: [
      { type: 'withdrawal', amount: 150000, balance_after: 350000 },
      { type: 'withdrawal', amount: 100000, balance_after: 250000 },
      { type: 'withdrawal', amount: 80000, balance_after: 170000 },
      { type: 'withdrawal', amount: 50000, balance_after: 120000 }, // Should trigger LOW alert
    ]
  },
  {
    name: 'Balanced Scenario (Mixed transactions)',
    transactions: [
      { type: 'withdrawal', amount: 75000, balance_after: 425000 },
      { type: 'deposit', amount: 50000, balance_after: 475000 },
      { type: 'withdrawal', amount: 60000, balance_after: 415000 },
      { type: 'deposit', amount: 35000, balance_after: 450000 }, // Should show BALANCED
    ]
  },
  {
    name: 'Cash Rich Scenario (Multiple deposits)',
    transactions: [
      { type: 'deposit', amount: 100000, balance_after: 550000 },
      { type: 'deposit', amount: 150000, balance_after: 700000 },
      { type: 'deposit', amount: 80000, balance_after: 780000 },
      { type: 'withdrawal', amount: 30000, balance_after: 750000 }, // Should trigger CASH_RICH alert
    ]
  }
];

async function sendWebhook(transaction: any, agentId: string, terminalId: string) {
  const payload = {
    id: `evt_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    event_type: 'transaction.completed',
    timestamp: new Date().toISOString(),
    transaction: {
      id: `txn_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: transaction.amount,
      currency: 'NGN',
      status: 'succeeded',
      type: transaction.type,
      payment_method: {
        type: 'card',
        brand: 'mastercard',
        last4: '9012'
      },
      customer: {
        id: 'cust_test_123',
        name: 'Test Customer',
        email: 'test@example.com'
      },
      metadata: {
        terminal_id: terminalId,
        agent_id: agentId
      },
      balance_after: transaction.balance_after,
      timestamp: new Date().toISOString()
    }
  };

  try {
    const response = await axios.post(`${API_URL}/api/v1/webhook/payment`, payload, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log(`  ${transaction.type.toUpperCase()}: ₦${transaction.amount.toLocaleString()} → Balance: ₦${transaction.balance_after.toLocaleString()}`);
    return response.data;
  } catch (error: any) {
    console.error(`  Failed:`, error.response?.data || error.message);
    throw error;
  }
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runScenario(scenario: any, agentId: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(` ${scenario.name}`);
  console.log(`${'='.repeat(60)}`);
  
  for (let i = 0; i < scenario.transactions.length; i++) {
    const transaction = scenario.transactions[i];
    console.log(`\n[${i + 1}/${scenario.transactions.length}] Sending ${transaction.type}...`);
    
    await sendWebhook(transaction, agentId, 'GTB2039A001');
    
    // Wait for processing and AI prediction
    await delay(2000);
  }
  
  console.log(`\n Scenario complete. Check logs for AI predictions.\n`);
}

async function main() {
  console.log(' Starting AI Prediction Webhook Test');
  console.log(`API URL: ${API_URL}`);
  console.log('');
  
  // Test with your agent ID
  const agentId = 'GTB-AG-0001';
  
  // Ask which scenario to run
  const scenarioIndex = process.argv[2] ? parseInt(process.argv[2]) - 1 : null;
  
  if (scenarioIndex !== null && scenarioIndex >= 0 && scenarioIndex < scenarios.length) {
    // Run specific scenario
    await runScenario(scenarios[scenarioIndex], agentId);
  } else {
    // Run all scenarios
    console.log('Running all scenarios...\n');
    
    for (let i = 0; i < scenarios.length; i++) {
      await runScenario(scenarios[i], agentId);
      
      if (i < scenarios.length - 1) {
        console.log('⏳ Waiting 5 seconds before next scenario...\n');
        await delay(5000);
      }
    }
  }
  
  console.log(' All tests complete!');
  console.log('\n Check your server logs for AI predictions:');
  console.log('   - Look for:  AI Prediction for...');
  console.log('   - Look for:  LOW E-FLOAT Alert...');
  console.log('   - Look for:  CASH RICH Alert...');
  console.log('');
}

// Usage instructions
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: npx tsx scripts/test-webhook-ai.ts [scenario_number]

Scenarios:
  1 - Low E-Float (Multiple withdrawals)
  2 - Balanced (Mixed transactions)
  3 - Cash Rich (Multiple deposits)
  
Examples:
  npx tsx scripts/test-webhook-ai.ts        # Run all scenarios
  npx tsx scripts/test-webhook-ai.ts 1      # Run only Low E-Float scenario
  npx tsx scripts/test-webhook-ai.ts 2      # Run only Balanced scenario
  npx tsx scripts/test-webhook-ai.ts 3      # Run only Cash Rich scenario
  `);
  process.exit(0);
}

main().catch(console.error);