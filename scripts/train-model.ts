// scripts/train-model.ts
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { config } from 'dotenv';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Dynamic imports to handle module resolution
async function main() {
  console.log('Starting first-time AI model training...');
  console.log('Current directory:', process.cwd());
  console.log('Script directory:', __dirname);

  try {
    // Import the training function
    const { trainAndDeployModel } = await import('../src/jobs/trainModelJob.js');
    
    // 1. Train using synthetic data
    console.log('Starting model training...');
    await trainAndDeployModel();

    // 2. Load into service
    console.log('Loading model into prediction service...');
    const { PredictionService } = await import('../src/modules/prediction/service/predictionService.js');
    const service = PredictionService.getInstance();
    await service.initialize();

    console.log('✅ AI Model trained and loaded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Training failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

main();