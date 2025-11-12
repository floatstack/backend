// scripts/train-model-standalone.ts
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { config } from 'dotenv';
import * as tf from '@tensorflow/tfjs-node';
import fs from 'fs/promises';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface LabeledSample {
    features: number[];
    label: number;
}

const MODEL_DIR = join(process.cwd(), 'src', 'modules', 'prediction', 'service', 'models', 'liquidity-v1');
const TEMP_MODEL_DIR = join(process.cwd(), 'models', 'liquidity-temp');
const TRAINING_DATA_PATH = join(process.cwd(), 'scripts', 'synthetic-data', 'training-data.json');

async function loadTrainingData(): Promise<LabeledSample[]> {
  const content = await fs.readFile(TRAINING_DATA_PATH, 'utf-8');
  return JSON.parse(content);
}

async function trainModel() {
  try {
    console.log('🚀 Starting AI model training from synthetic data...');

    // 1. Load synthetic data
    const samples = await loadTrainingData();
    console.log(`📊 Loaded ${samples.length} synthetic samples`);

    if (samples.length < 100) {
      throw new Error('Not enough samples to train');
    }

    // 2. Split: 80% train, 20% test
    const splitIdx = Math.floor(samples.length * 0.8);
    const train = samples.slice(0, splitIdx);
    const test = samples.slice(splitIdx);

    const xs_train = tf.tensor2d(train.map(s => s.features));
    const ys_train = tf.oneHot(tf.tensor1d(train.map(s => s.label), 'int32'), 3);
    const xs_test = tf.tensor2d(test.map(s => s.features));
    const ys_test = tf.oneHot(tf.tensor1d(test.map(s => s.label), 'int32'), 3);

    // 3. Build model
    console.log('🏗️  Building model architecture...');
    const model = tf.sequential();
    model.add(tf.layers.dense({ inputShape: [8], units: 64, activation: 'relu' }));
    model.add(tf.layers.dropout({ rate: 0.3 }));
    model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 3, activation: 'softmax' }));

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    // 4. Train
    console.log('🎯 Training model (25 epochs)...');
    console.log('');
    
    await model.fit(xs_train, ys_train, {
      epochs: 25,
      batchSize: 32,
      validationData: [xs_test, ys_test],
      callbacks: {
        onEpochEnd: async (epoch, logs) => {
          if (epoch % 5 === 0 || epoch === 24) {
            const loss = logs?.loss?.toFixed(4) ?? 'N/A';
            const acc = logs?.acc?.toFixed(4) ?? 'N/A';
            const valAcc = logs?.val_acc?.toFixed(4) ?? 'N/A';
            console.log(`  Epoch ${epoch + 1}/25: loss=${loss}, acc=${acc}, val_acc=${valAcc}`);
          }
        }
      }
    });

    console.log('');

    // 5. Evaluate
    const evalResult = model.evaluate(xs_test, ys_test);
    
    if (!evalResult) {
      throw new Error('Model evaluation failed: no result returned');
    }

    let testLoss: number;
    let testAcc: number;
    
    if (Array.isArray(evalResult)) {
      if (evalResult.length < 2) {
        throw new Error('Expected at least 2 metrics from evaluation');
      }
      
      const lossData = await evalResult[0]?.data();
      const accData = await evalResult[1]?.data();
      
      if (!lossData || !accData) {
        throw new Error('Failed to extract evaluation metrics');
      }
      
      testLoss = lossData[0] ?? 0;
      testAcc = accData[0] ?? 0;
      
      evalResult[0]?.dispose();
      evalResult[1]?.dispose();
    } else {
      const data = await evalResult.data();
      testLoss = data[0] ?? 0;
      testAcc = 0;
      evalResult.dispose();
    }

    console.log(`📈 Test Loss: ${testLoss.toFixed(4)}, Test Accuracy: ${(testAcc * 100).toFixed(2)}%`);

    if (testAcc < 0.75) {
      throw new Error(`Model accuracy too low: ${(testAcc * 100).toFixed(2)}%`);
    }

    // 6. Save to temp
    console.log('💾 Saving model to temp directory...');
    await fs.rm(TEMP_MODEL_DIR, { recursive: true, force: true });
    await fs.mkdir(TEMP_MODEL_DIR, { recursive: true });
    await model.save(`file://${TEMP_MODEL_DIR}`);

    // 7. Atomic deploy
    console.log('🚀 Deploying model...');
    await fs.rm(MODEL_DIR, { recursive: true, force: true });
    await fs.mkdir(dirname(MODEL_DIR), { recursive: true });
    await fs.rename(TEMP_MODEL_DIR, MODEL_DIR);

    console.log(`✅ Model deployed to: ${MODEL_DIR}`);
    console.log('');
    console.log('✨ AI model trained and deployed successfully!');

    // Cleanup
    xs_train.dispose();
    ys_train.dispose();
    xs_test.dispose();
    ys_test.dispose();
    model.dispose();
    
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

trainModel();