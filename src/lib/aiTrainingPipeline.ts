/**
 * AI Training Pipeline - Build datasets from execution history,
 * train local heuristic/bandit models, export as JS strategy files
 */

import { resultsManager, ExecutionResultV2 } from './resultsManager';
import { getOperationCost, getAvailableOperations } from './operationsRouter';
import { generateJSStrategyFile } from './jsStrategyRuntime';

// ============ DATASET BUILDER ============

export interface TrainingExample {
  // Input features
  fileSize: number;
  entropy: number;
  balance: number;
  compressionRatio: number;
  transitionRate: number;
  // Operation applied
  operation: string;
  operationCost: number;
  // Output: deltas
  entropyDelta: number;
  balanceDelta: number;
  compressionDelta: number;
  transitionDelta: number;
  bitsChanged: number;
  bitsChangedRatio: number;
  // Context
  stepIndex: number;
  totalSteps: number;
  budgetRemaining: number;
  isSegmentOnly: boolean;
}

export interface TrainingDataset {
  examples: TrainingExample[];
  metadata: {
    totalResults: number;
    totalExamples: number;
    operations: string[];
    buildTimestamp: string;
    fileStats: {
      minSize: number;
      maxSize: number;
      avgSize: number;
    };
  };
}

/**
 * Build training dataset from all stored execution results
 */
export function buildTrainingDataset(): TrainingDataset {
  const allResults = resultsManager.getAllResults();
  const examples: TrainingExample[] = [];
  let minSize = Infinity, maxSize = 0, totalSize = 0;

  for (const result of allResults) {
    if (result.status !== 'completed' || !result.steps.length) continue;

    const fileSize = result.initialBits.length;
    minSize = Math.min(minSize, fileSize);
    maxSize = Math.max(maxSize, fileSize);
    totalSize += fileSize;

    for (let i = 0; i < result.steps.length; i++) {
      const step = result.steps[i];
      const prevMetrics = i === 0 ? result.initialMetrics : (result.steps[i - 1].metrics || {});
      const currMetrics = step.metrics || {};

      const isSegmentOnly = (step as any).segmentOnly === true
        || (step.beforeBits && step.fullBeforeBits && step.beforeBits.length !== step.fullBeforeBits.length);

      // Count bits changed
      let bitsChanged = 0;
      const before = step.fullBeforeBits || '';
      const after = step.fullAfterBits || '';
      for (let j = 0; j < Math.min(before.length, after.length); j++) {
        if (before[j] !== after[j]) bitsChanged++;
      }

      examples.push({
        fileSize,
        entropy: prevMetrics.entropy || 0,
        balance: prevMetrics.balance || 0,
        compressionRatio: prevMetrics.compression_ratio || 0,
        transitionRate: prevMetrics.transition_rate || 0,
        operation: step.operation,
        operationCost: step.cost || getOperationCost(step.operation),
        entropyDelta: (currMetrics.entropy || 0) - (prevMetrics.entropy || 0),
        balanceDelta: (currMetrics.balance || 0) - (prevMetrics.balance || 0),
        compressionDelta: (currMetrics.compression_ratio || 0) - (prevMetrics.compression_ratio || 0),
        transitionDelta: (currMetrics.transition_rate || 0) - (prevMetrics.transition_rate || 0),
        bitsChanged,
        bitsChangedRatio: fileSize > 0 ? bitsChanged / fileSize : 0,
        stepIndex: i,
        totalSteps: result.steps.length,
        budgetRemaining: result.benchmarks.totalCost > 0
          ? Math.max(0, 1000 - (step.cost || 0) * (i + 1))
          : 1000,
        isSegmentOnly,
      });
    }
  }

  return {
    examples,
    metadata: {
      totalResults: allResults.length,
      totalExamples: examples.length,
      operations: getAvailableOperations(),
      buildTimestamp: new Date().toISOString(),
      fileStats: {
        minSize: minSize === Infinity ? 0 : minSize,
        maxSize,
        avgSize: allResults.length > 0 ? totalSize / allResults.length : 0,
      },
    },
  };
}

// ============ HEURISTIC SCORER ============

export interface HeuristicModel {
  type: 'heuristic';
  name: string;
  objective: 'maximize_entropy' | 'minimize_entropy' | 'maximize_balance' | 'minimize_cost';
  weights: Record<string, number>; // operation -> weight/score
  trained: boolean;
  trainingExamples: number;
  timestamp: string;
}

/**
 * Train a heuristic model: compute average metric delta per operation
 */
export function trainHeuristicModel(
  dataset: TrainingDataset,
  objective: HeuristicModel['objective'],
  modelName: string = 'Heuristic-v1'
): HeuristicModel {
  const opScores: Record<string, { sum: number; count: number }> = {};

  for (const ex of dataset.examples) {
    if (!opScores[ex.operation]) opScores[ex.operation] = { sum: 0, count: 0 };

    let score = 0;
    switch (objective) {
      case 'maximize_entropy':
        score = ex.entropyDelta;
        break;
      case 'minimize_entropy':
        score = -ex.entropyDelta;
        break;
      case 'maximize_balance':
        score = -Math.abs(ex.balanceDelta); // closer to 0.5
        break;
      case 'minimize_cost':
        score = -ex.operationCost + ex.bitsChangedRatio * 10;
        break;
    }

    opScores[ex.operation].sum += score;
    opScores[ex.operation].count++;
  }

  const weights: Record<string, number> = {};
  for (const [op, data] of Object.entries(opScores)) {
    weights[op] = data.count > 0 ? data.sum / data.count : 0;
  }

  return {
    type: 'heuristic',
    name: modelName,
    objective,
    weights,
    trained: true,
    trainingExamples: dataset.examples.length,
    timestamp: new Date().toISOString(),
  };
}

// ============ CONTEXTUAL BANDIT ============

export interface BanditModel {
  type: 'bandit';
  name: string;
  objective: HeuristicModel['objective'];
  // Per-operation stats
  arms: Record<string, {
    pulls: number;
    totalReward: number;
    avgReward: number;
    // UCB exploration bonus
    ucbBonus: number;
  }>;
  totalPulls: number;
  explorationRate: number;
  trained: boolean;
  trainingExamples: number;
  timestamp: string;
}

/**
 * Train a contextual bandit model using UCB1
 */
export function trainBanditModel(
  dataset: TrainingDataset,
  objective: HeuristicModel['objective'],
  modelName: string = 'Bandit-UCB1',
  explorationRate: number = 1.5
): BanditModel {
  const arms: BanditModel['arms'] = {};
  let totalPulls = 0;

  // Initialize arms for all available operations
  for (const op of dataset.metadata.operations) {
    arms[op] = { pulls: 0, totalReward: 0, avgReward: 0, ucbBonus: Infinity };
  }

  // Process examples as bandit feedback
  for (const ex of dataset.examples) {
    if (!arms[ex.operation]) continue;

    let reward = 0;
    switch (objective) {
      case 'maximize_entropy': reward = ex.entropyDelta; break;
      case 'minimize_entropy': reward = -ex.entropyDelta; break;
      case 'maximize_balance': reward = 1 - Math.abs(0.5 - (ex.balance + ex.balanceDelta)); break;
      case 'minimize_cost': reward = (ex.bitsChangedRatio * 10) / Math.max(1, ex.operationCost); break;
    }

    arms[ex.operation].pulls++;
    arms[ex.operation].totalReward += reward;
    totalPulls++;
  }

  // Compute UCB scores
  for (const op of Object.keys(arms)) {
    const arm = arms[op];
    arm.avgReward = arm.pulls > 0 ? arm.totalReward / arm.pulls : 0;
    arm.ucbBonus = arm.pulls > 0
      ? explorationRate * Math.sqrt(Math.log(totalPulls) / arm.pulls)
      : Infinity;
  }

  return {
    type: 'bandit',
    name: modelName,
    objective,
    arms,
    totalPulls,
    explorationRate,
    trained: true,
    trainingExamples: dataset.examples.length,
    timestamp: new Date().toISOString(),
  };
}

// ============ MODEL INFERENCE ============

/**
 * Select top-N operations from a trained model
 */
export function selectOperations(
  model: HeuristicModel | BanditModel,
  count: number = 10,
  budget: number = 1000
): Array<{ op: string; score: number; params?: any; weight: number }> {
  const scored: Array<{ op: string; score: number; weight: number }> = [];

  if (model.type === 'heuristic') {
    for (const [op, weight] of Object.entries(model.weights)) {
      scored.push({ op, score: weight, weight });
    }
  } else {
    for (const [op, arm] of Object.entries(model.arms)) {
      const ucbScore = arm.avgReward + arm.ucbBonus;
      scored.push({ op, score: ucbScore, weight: arm.avgReward });
    }
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Select top operations within budget
  const selected: typeof scored = [];
  let remainingBudget = budget;
  let i = 0;

  while (selected.length < count && i < scored.length) {
    const cost = getOperationCost(scored[i].op);
    if (cost <= remainingBudget) {
      selected.push(scored[i]);
      remainingBudget -= cost;
    }
    i++;
    // Cycle through if needed
    if (i >= scored.length && selected.length < count) break;
  }

  return selected;
}

// ============ JS STRATEGY EXPORT ============

/**
 * Export a trained model as a runnable JS strategy file
 */
export function exportModelAsJSStrategy(
  model: HeuristicModel | BanditModel,
  maxOps: number = 50,
  budget: number = 1000
): string {
  const sequence = selectOperations(model, maxOps, budget);
  return generateJSStrategyFile(
    model.name,
    sequence,
    {
      budget,
      maxOps,
      objective: model.objective,
    }
  );
}

// ============ PERSISTENCE ============

const AI_MODELS_KEY = 'bitwise_ai_models';
const AI_DATASETS_KEY = 'bitwise_ai_datasets';

export function saveModel(model: HeuristicModel | BanditModel): void {
  try {
    const stored = JSON.parse(localStorage.getItem(AI_MODELS_KEY) || '[]');
    const idx = stored.findIndex((m: any) => m.name === model.name);
    if (idx >= 0) stored[idx] = model;
    else stored.push(model);
    localStorage.setItem(AI_MODELS_KEY, JSON.stringify(stored));
  } catch { /* ignore */ }
}

export function loadModels(): (HeuristicModel | BanditModel)[] {
  try {
    return JSON.parse(localStorage.getItem(AI_MODELS_KEY) || '[]');
  } catch { return []; }
}

export function deleteModel(name: string): void {
  try {
    const stored = JSON.parse(localStorage.getItem(AI_MODELS_KEY) || '[]');
    const filtered = stored.filter((m: any) => m.name !== name);
    localStorage.setItem(AI_MODELS_KEY, JSON.stringify(filtered));
  } catch { /* ignore */ }
}

export function saveDataset(dataset: TrainingDataset): void {
  try {
    localStorage.setItem(AI_DATASETS_KEY, JSON.stringify(dataset));
  } catch { /* ignore */ }
}

export function loadDataset(): TrainingDataset | null {
  try {
    const data = localStorage.getItem(AI_DATASETS_KEY);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}
