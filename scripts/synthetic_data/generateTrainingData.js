// scripts/synthetic_data/generateTrainingData.ts
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SAMPLES_PER_TYPE = 2000;
const TOTAL_SAMPLES = SAMPLES_PER_TYPE * 3;
/* ------------------------------------------------------------------ */
/*  Helper random utilities                                            */
/* ------------------------------------------------------------------ */
function rand(min, max) {
    return Math.random() * (max - min) + min;
}
function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
}
// Add Gaussian noise for more realistic data
function addGaussianNoise(value, stdDev) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return value + z0 * stdDev;
}
// Create boundary cases (samples near classification thresholds)
function createBoundarySample(type) {
    const hour = randInt(8, 20);
    const hour_sin = Math.sin((2 * Math.PI * hour) / 24);
    const hour_cos = Math.cos((2 * Math.PI * hour) / 24);
    // Generate samples near the decision boundaries (0.6 and 1.3)
    const e_float_percentage = type === 'low-to-balanced'
        ? addGaussianNoise(0.6, 0.05) // Around 0.6 threshold
        : addGaussianNoise(1.3, 0.05); // Around 1.3 threshold
    const features = [
        e_float_percentage,
        rand(100000, 400000) / 100000,
        rand(100000, 400000) / 100000,
        rand(20000, 60000) / 100000,
        rand(5, 30) / 100,
        hour_sin,
        hour_cos,
        Math.random() > 0.5 ? 1 : 0,
    ];
    const label = e_float_percentage < 0.6 ? 0 : e_float_percentage > 1.3 ? 2 : 1;
    return { features, label };
}
/* ------------------------------------------------------------------ */
/*  Agent generators with noise and variability                       */
/* ------------------------------------------------------------------ */
function generateUrbanAgent() {
    const samples = [];
    for (let i = 0; i < SAMPLES_PER_TYPE; i++) {
        const hour = randInt(6, 22);
        const isPeak = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18) ? 1 : 0;
        const hour_sin = Math.sin((2 * Math.PI * hour) / 24);
        const hour_cos = Math.cos((2 * Math.PI * hour) / 24);
        const baseVelocity = isPeak ? rand(300000, 600000) : rand(150000, 400000);
        const velocity = addGaussianNoise(baseVelocity, baseVelocity * 0.15); // 15% noise
        const base_e_float = rand(0.3, 1.6);
        const e_float_percentage = addGaussianNoise(base_e_float, 0.08); // Add noise
        const cash_balance = addGaussianNoise(rand(200000, 500000), 30000);
        const refill_amount = addGaussianNoise(rand(20000, 80000), 5000);
        const refill_hrs = addGaussianNoise(rand(2, 12), 1);
        const features = [
            Math.max(0.1, e_float_percentage), // Ensure positive
            velocity / 100000,
            Math.max(0, cash_balance) / 100000,
            Math.max(0, refill_amount) / 100000,
            Math.max(0.01, Math.min(refill_hrs / 100, 10)),
            hour_sin,
            hour_cos,
            isPeak,
        ];
        const label = features[0] < 0.6 ? 0 : features[0] > 1.3 ? 2 : 1;
        samples.push({ features, label });
    }
    return samples;
}
function generateRuralAgent() {
    const samples = [];
    for (let i = 0; i < SAMPLES_PER_TYPE; i++) {
        const hour = randInt(8, 20);
        const hour_sin = Math.sin((2 * Math.PI * hour) / 24);
        const hour_cos = Math.cos((2 * Math.PI * hour) / 24);
        const base_e_float = rand(0.4, 1.4);
        const e_float_percentage = addGaussianNoise(base_e_float, 0.08);
        const velocity = addGaussianNoise(rand(50000, 150000), 15000);
        const cash_balance = addGaussianNoise(rand(30000, 120000), 10000);
        const refill_amount = addGaussianNoise(rand(10000, 50000), 5000);
        const refill_hrs = addGaussianNoise(rand(12, 48), 3);
        const features = [
            Math.max(0.1, e_float_percentage),
            Math.max(0, velocity) / 100000,
            Math.max(0, cash_balance) / 100000,
            Math.max(0, refill_amount) / 100000,
            Math.max(0.01, refill_hrs / 100),
            hour_sin,
            hour_cos,
            0,
        ];
        const label = features[0] < 0.6 ? 0 : features[0] > 1.3 ? 2 : 1;
        samples.push({ features, label });
    }
    return samples;
}
function generateIdleAgent() {
    const samples = [];
    for (let i = 0; i < SAMPLES_PER_TYPE; i++) {
        const hour = randInt(9, 17);
        const hour_sin = Math.sin((2 * Math.PI * hour) / 24);
        const hour_cos = Math.cos((2 * Math.PI * hour) / 24);
        const base_e_float = rand(1.1, 1.8);
        const e_float_percentage = addGaussianNoise(base_e_float, 0.1);
        const velocity = addGaussianNoise(rand(10000, 80000), 8000);
        const cash_balance = addGaussianNoise(rand(200000, 450000), 40000);
        const refill_amount = addGaussianNoise(rand(15000, 60000), 8000);
        const refill_hrs = addGaussianNoise(rand(24, 72), 5);
        const features = [
            Math.max(0.1, e_float_percentage),
            Math.max(0, velocity) / 100000,
            Math.max(0, cash_balance) / 100000,
            Math.max(0, refill_amount) / 100000,
            Math.max(0.01, refill_hrs / 100),
            hour_sin,
            hour_cos,
            0,
        ];
        // Idle agents should be CASH_RICH, but add some edge cases
        const label = features[0] > 1.3 ? 2 : 1;
        samples.push({ features, label });
    }
    return samples;
}
/* ------------------------------------------------------------------ */
/*  Main routine – writes JSON file                                    */
/* ------------------------------------------------------------------ */
async function main() {
    console.log('Starting realistic data generation with noise...');
    console.log('Current working directory:', process.cwd());
    const urban = generateUrbanAgent();
    const rural = generateRuralAgent();
    const idle = generateIdleAgent();
    // Add boundary cases (10% of dataset)
    const boundarySamples = [];
    const boundaryCount = Math.floor(TOTAL_SAMPLES * 0.1);
    for (let i = 0; i < boundaryCount / 2; i++) {
        boundarySamples.push(createBoundarySample('low-to-balanced'));
        boundarySamples.push(createBoundarySample('balanced-to-rich'));
    }
    const all = [...urban, ...rural, ...idle, ...boundarySamples];
    // Shuffle the dataset
    for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]];
    }
    const json = JSON.stringify(all, null, 2);
    const outDir = join(__dirname, '..', 'synthetic-data');
    const outFile = join(outDir, 'training-data.json');
    console.log(`Target directory: ${outDir}`);
    await mkdir(outDir, { recursive: true });
    console.log(`Target file: ${outFile}`);
    await writeFile(outFile, json);
    console.log(`Generated ${all.length} synthetic samples with:`);
    console.log(`  - Gaussian noise on all features`);
    console.log(`  - ${boundarySamples.length} boundary cases`);
    console.log(`  - Shuffled dataset`);
}
/* ------------------------------------------------------------------ */
/*  Top-level execution with full error handling                      */
/* ------------------------------------------------------------------ */
(async () => {
    try {
        await main();
        console.log('All done! Realistic synthetic data generated successfully.');
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const stack = err instanceof Error ? err.stack : '';
        console.error('Script failed:', message);
        if (stack)
            console.error('Stack trace:', stack);
        process.exit(1);
    }
})();
