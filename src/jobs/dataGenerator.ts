import fs from 'fs/promises';
import path from 'path';

interface LabeledSample {
  features: number[];
  label: 0 | 1 | 2; // 0=LOW_E_FLOAT, 1=BALANCED, 2=CASH_RICH
}

const DATA_FILE = path.join(process.cwd(), 'scripts', 'synthetic-data', 'training-data.json');

export async function loadTrainingData(): Promise<LabeledSample[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) throw new Error('Invalid data format');
    return data;
  } catch (error: any) {
    throw new Error(`Failed to load synthetic data: ${error.message}. Run generateTrainingData.ts first.`);
  }
}