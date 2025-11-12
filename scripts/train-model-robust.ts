import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { config } from 'dotenv';
import * as tf from '@tensorflow/tfjs-node';
import fs from 'fs/promises';

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

// Data augmentation - create slightly modified versions
function augmentData(samples: LabeledSample[], factor: number = 0.5): LabeledSample[] {
  const augmented: LabeledSample[] = [];
  const count = Math.floor(samples.length * factor);
  
  for (let i = 0; i < count; i++) {
    const original = samples[Math.floor(Math.random() * samples.length)];
    const features = original.features.map((f, idx) => {
      // Don't augment categorical features (last one - isPeak)
      if (idx === 7) return f;
      // Add small random noise (±5%)
      const noise = (Math.random() - 0.5) * 0.1 * f;
      return Math.max(0, f + noise);
    });
    augmented.push({ features, label: original.label });
  }
  
  return augmented;
}

async function trainModel() {
  try {
    console.log(' Starting robust AI model training...');
    console.log('');

    // 1. Load synthetic data
    let samples = await loadTrainingData();
    console.log(` Loaded ${samples.length} base synthetic samples`);

    // 2. Augment data
    const augmented = augmentData(samples, 0.3);
    samples = [...samples, ...augmented];
    console.log(` After augmentation: ${samples.length} total samples`);
    console.log('');

    if (samples.length < 100) {
      throw new Error('Not enough samples to train');
    }

    // 3. Shuffle data
    for (let i = samples.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [samples[i], samples[j]] = [samples[j], samples[i]];
    }

    // 4. Split: 70% train, 15% validation, 15% test
    const trainEnd = Math.floor(samples.length * 0.7);
    const valEnd = Math.floor(samples.length * 0.85);
    
    const train = samples.slice(0, trainEnd);
    const val = samples.slice(trainEnd, valEnd);
    const test = samples.slice(valEnd);

    console.log(` Split: ${train.length} train, ${val.length} validation, ${test.length} test`);
    console.log('');

    const xs_train = tf.tensor2d(train.map(s => s.features));
    const ys_train = tf.oneHot(tf.tensor1d(train.map(s => s.label), 'int32'), 3);
    const xs_val = tf.tensor2d(val.map(s => s.features));
    const ys_val = tf.oneHot(tf.tensor1d(val.map(s => s.label), 'int32'), 3);
    const xs_test = tf.tensor2d(test.map(s => s.features));
    const ys_test = tf.oneHot(tf.tensor1d(test.map(s => s.label), 'int32'), 3);

    // 5. Build model with regularization
    console.log('🏗️  Building model with regularization...');
    const model = tf.sequential();
    
    // Input layer with L2 regularization
    model.add(tf.layers.dense({ 
      inputShape: [8], 
      units: 64, 
      activation: 'relu',
      kernelRegularizer: tf.regularizers.l2({ l2: 0.01 }) // L2 regularization
    }));
    model.add(tf.layers.dropout({ rate: 0.4 })); // Increased dropout
    
    model.add(tf.layers.dense({ 
      units: 32, 
      activation: 'relu',
      kernelRegularizer: tf.regularizers.l2({ l2: 0.01 })
    }));
    model.add(tf.layers.dropout({ rate: 0.3 }));
    
    // Output layer
    model.add(tf.layers.dense({ units: 3, activation: 'softmax' }));

    // Use lower learning rate for better generalization
    model.compile({
      optimizer: tf.train.adam(0.0005), // Lower learning rate
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    console.log('');
    console.log(' Model Summary:');
    model.summary();
    console.log('');

    // 6. Train with early stopping
    console.log('Training model with early stopping...');
    console.log('');
    
    let bestValAcc = 0;
    let patienceCounter = 0;
    const patience = 5; // Stop if no improvement for 5 epochs
    
    const history = await model.fit(xs_train, ys_train, {
      epochs: 50,
      batchSize: 32,
      validationData: [xs_val, ys_val],
      callbacks: {
        onEpochEnd: async (epoch, logs) => {
          const valAcc = logs?.val_acc ?? 0;
          const loss = logs?.loss?.toFixed(4) ?? 'N/A';
          const acc = logs?.acc?.toFixed(4) ?? 'N/A';
          const valAccStr = valAcc.toFixed(4);
          const valLoss = logs?.val_loss?.toFixed(4) ?? 'N/A';
          
          // Log every 5 epochs
          if (epoch % 5 === 0 || epoch === 49) {
            console.log(`  Epoch ${epoch + 1}/50: loss=${loss}, acc=${acc}, val_acc=${valAccStr}, val_loss=${valLoss}`);
          }
          
          // Early stopping logic
          if (valAcc > bestValAcc) {
            bestValAcc = valAcc;
            patienceCounter = 0;
          } else {
            patienceCounter++;
          }
          
          if (patienceCounter >= patience && epoch > 15) {
            console.log(`   Early stopping at epoch ${epoch + 1} (no improvement for ${patience} epochs)`);
            model.stopTraining = true;
          }
        }
      }
    });

    console.log('');

    // 7. Evaluate on test set
    const evalResult = model.evaluate(xs_test, ys_test);
    
    if (!evalResult) {
      throw new Error('Model evaluation failed');
    }

    let testLoss: number;
    let testAcc: number;
    
    if (Array.isArray(evalResult)) {
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

    console.log(' Final Results:');
    console.log(`   Test Loss: ${testLoss.toFixed(4)}`);
    console.log(`   Test Accuracy: ${(testAcc * 100).toFixed(2)}%`);
    console.log(`   Best Validation Accuracy: ${(bestValAcc * 100).toFixed(2)}%`);
    console.log('');

    // Check if accuracy is reasonable (not too high, not too low)
    if (testAcc < 0.70) {
      throw new Error(`Model accuracy too low: ${(testAcc * 100).toFixed(2)}%`);
    }
    
    if (testAcc > 0.99) {
      console.warn('Warning: Test accuracy is very high (>99%). Model may be overfitting.');
      console.warn('   Consider adding more noise or using real-world data for validation.');
      console.log('');
    }

    // 8. Calculate per-class accuracy
    console.log('Per-Class Performance:');
    const predictions = model.predict(xs_test) as tf.Tensor;
    const predClasses = predictions.argMax(-1);
    const trueClasses = tf.tensor1d(test.map(s => s.label), 'int32');
    
    for (let classIdx = 0; classIdx < 3; classIdx++) {
      const className = ['LOW_E_FLOAT', 'BALANCED', 'CASH_RICH'][classIdx];
      const mask = trueClasses.equal(classIdx);
      const classTotal = (await mask.sum().data())[0];
      const correct = predClasses.equal(classIdx).logicalAnd(mask);
      const classCorrect = (await correct.sum().data())[0];
      const classAcc = classTotal > 0 ? (classCorrect / classTotal) * 100 : 0;
      console.log(`   ${className}: ${classAcc.toFixed(2)}% (${classCorrect}/${classTotal} samples)`);
    }
    console.log('');
    
    predictions.dispose();
    predClasses.dispose();
    trueClasses.dispose();

    // 9. Save model
    console.log('Saving model...');
    await fs.rm(TEMP_MODEL_DIR, { recursive: true, force: true });
    await fs.mkdir(TEMP_MODEL_DIR, { recursive: true });
    await model.save(`file://${TEMP_MODEL_DIR}`);

    // 10. Atomic deploy
    console.log('Deploying model...');
    await fs.rm(MODEL_DIR, { recursive: true, force: true });
    await fs.mkdir(dirname(MODEL_DIR), { recursive: true });
    await fs.rename(TEMP_MODEL_DIR, MODEL_DIR);

    console.log(`Model deployed to: ${MODEL_DIR}`);
    console.log('');
    console.log('Robust AI model trained and deployed successfully!');

    // Cleanup
    xs_train.dispose();
    ys_train.dispose();
    xs_val.dispose();
    ys_val.dispose();
    xs_test.dispose();
    ys_test.dispose();
    model.dispose();
    
    process.exit(0);
  } catch (error) {
    console.error('Training failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

trainModel();