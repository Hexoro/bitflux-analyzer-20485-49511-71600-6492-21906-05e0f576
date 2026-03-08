/**
 * JavaScript Strategy Runtime - Sandboxed JS execution for strategies
 * Alternative to Python/Pyodide for local, deterministic strategy execution
 */

import { safeExecute, validateCode } from './sandboxedExec';
import { executeOperation, getOperationCost, getAvailableOperations } from './operationsRouter';
import { calculateMetric, calculateAllMetrics, getAvailableMetrics } from './metricsCalculator';
import { TransformationRecord } from './pythonExecutor';

export interface JSStrategyContext {
  bits: string;
  budget: number;
  metrics: Record<string, number>;
  operations: string[];
  seed?: string;
}

export interface JSStrategyResult {
  success: boolean;
  output: any;
  logs: string[];
  error?: string;
  duration: number;
  transformations: TransformationRecord[];
  finalBits: string;
  metrics: Record<string, number>;
  stats: {
    totalOperations: number;
    totalBitsChanged: number;
    budgetUsed: number;
    budgetRemaining: number;
  };
}

function countChangedBits(before: string, after: string): number {
  let count = 0;
  const maxLen = Math.max(before.length, after.length);
  for (let i = 0; i < maxLen; i++) {
    if ((before[i] || '0') !== (after[i] || '0')) count++;
  }
  return count;
}

/**
 * Execute a JavaScript strategy file
 * The JS code receives a `api` object with the same bridge methods as Python
 */
export function executeJSStrategy(jsCode: string, context: JSStrategyContext): JSStrategyResult {
  const startTime = performance.now();
  let currentBits = context.bits;
  let currentBudget = context.budget;
  const initialBudget = context.budget;
  const logs: string[] = [];
  const transformations: TransformationRecord[] = [];

  // Validate code safety
  const validation = validateCode(jsCode);
  if (!validation.safe) {
    return {
      success: false,
      output: null,
      logs: [`Code blocked: ${validation.violations.join(', ')}`],
      error: `Blocked APIs: ${validation.violations.join(', ')}`,
      duration: performance.now() - startTime,
      transformations: [],
      finalBits: context.bits,
      metrics: context.metrics,
      stats: { totalOperations: 0, totalBitsChanged: 0, budgetUsed: 0, budgetRemaining: context.budget },
    };
  }

  // Build the API bridge (mirrors Python bitwise_api)
  const api = {
    apply_operation: (opName: string, bits?: string, params?: any) => {
      const opStart = performance.now();
      const fullBeforeBits = currentBits;
      const targetBits = bits || currentBits;
      const isFullOp = !bits || bits === currentBits || bits.length === currentBits.length;

      try {
        const result = executeOperation(opName, targetBits, params || {});
        if (result.success) {
          let fullAfterBits = currentBits;
          let bitsChanged = 0;

          if (isFullOp) {
            currentBits = result.bits;
            fullAfterBits = result.bits;
            bitsChanged = countChangedBits(fullBeforeBits, fullAfterBits);
          } else {
            bitsChanged = countChangedBits(targetBits, result.bits);
          }

          const opCost = getOperationCost(opName);
          currentBudget -= opCost;
          const metricsResult = calculateAllMetrics(currentBits);
          const segmentBitsChanged = countChangedBits(targetBits, result.bits);

          transformations.push({
            operation: opName,
            params: result.params,
            fullBeforeBits,
            fullAfterBits: isFullOp ? fullAfterBits : currentBits,
            beforeBits: targetBits,
            afterBits: result.bits,
            bitRanges: [{ start: 0, end: targetBits.length }],
            bitsChanged,
            segmentBitsChanged,
            cost: opCost,
            duration: performance.now() - opStart,
            cumulativeBits: currentBits,
            metricsSnapshot: metricsResult.metrics,
            segmentOnly: !isFullOp,
          });

          return result.bits;
        }
        logs.push(`[ERROR] ${opName} failed: ${result.error}`);
        return targetBits;
      } catch (e) {
        logs.push(`[ERROR] ${opName} exception: ${e}`);
        return targetBits;
      }
    },

    apply_operation_range: (opName: string, start: number, end: number, params?: any) => {
      const opStart = performance.now();
      const fullBeforeBits = currentBits;
      try {
        const targetBits = currentBits.slice(start, end);
        const result = executeOperation(opName, targetBits, params || {});
        if (result.success) {
          const newBits = currentBits.slice(0, start) + result.bits + currentBits.slice(end);
          const bitsChanged = countChangedBits(targetBits, result.bits);
          const opCost = getOperationCost(opName);
          currentBits = newBits;
          currentBudget -= opCost;
          const metricsResult = calculateAllMetrics(currentBits);

          transformations.push({
            operation: opName,
            params: { ...result.params, range: { start, end } },
            fullBeforeBits,
            fullAfterBits: newBits,
            beforeBits: targetBits,
            afterBits: result.bits,
            bitRanges: [{ start, end }],
            bitsChanged,
            segmentBitsChanged: bitsChanged,
            cost: opCost,
            duration: performance.now() - opStart,
            cumulativeBits: currentBits,
            metricsSnapshot: metricsResult.metrics,
            segmentOnly: false,
          });
          return result.bits;
        }
        return targetBits;
      } catch (e) {
        logs.push(`[ERROR] ${opName} range exception: ${e}`);
        return currentBits.slice(start, end);
      }
    },

    get_metric: (metricName: string, bits?: string) => {
      const result = calculateMetric(metricName, bits || currentBits);
      return result.success ? result.value : 0;
    },

    get_all_metrics: (bits?: string) => calculateAllMetrics(bits || currentBits).metrics,
    get_cost: (opName: string) => getOperationCost(opName),
    get_available_operations: () => getAvailableOperations(),
    get_available_metrics: () => getAvailableMetrics(),
    get_budget: () => currentBudget,
    deduct_budget: (amount: number) => {
      if (currentBudget >= amount) { currentBudget -= amount; return true; }
      return false;
    },
    log: (msg: string) => { logs.push(String(msg)); },
    get_bits: () => currentBits,
    set_bits: (newBits: string) => { currentBits = newBits; },
    get_bits_length: () => currentBits.length,
  };

  try {
    // Execute the strategy code in sandbox
    // The code receives `api` object, `bits`, `budget`, `operations`, `metrics`
    safeExecute(
      ['api', 'bits', 'budget', 'operations', 'metrics', 'seed'],
      jsCode,
      [api, context.bits, context.budget, context.operations, context.metrics, context.seed || null]
    );

    const finalMetrics = calculateAllMetrics(currentBits).metrics;

    return {
      success: true,
      output: 'JS strategy execution completed',
      logs,
      duration: performance.now() - startTime,
      transformations,
      finalBits: currentBits,
      metrics: finalMetrics,
      stats: {
        totalOperations: transformations.length,
        totalBitsChanged: transformations.reduce((sum, t) => sum + t.bitsChanged, 0),
        budgetUsed: initialBudget - currentBudget,
        budgetRemaining: currentBudget,
      },
    };
  } catch (error) {
    return {
      success: false,
      output: null,
      logs,
      error: `JS strategy error: ${error instanceof Error ? error.message : error}`,
      duration: performance.now() - startTime,
      transformations,
      finalBits: currentBits,
      metrics: calculateAllMetrics(currentBits).metrics,
      stats: {
        totalOperations: transformations.length,
        totalBitsChanged: transformations.reduce((sum, t) => sum + t.bitsChanged, 0),
        budgetUsed: initialBudget - currentBudget,
        budgetRemaining: currentBudget,
      },
    };
  }
}

/**
 * Generate a JS strategy file from AI model output
 */
export function generateJSStrategyFile(
  modelName: string,
  operationSequence: Array<{ op: string; params?: any; weight: number }>,
  config: { budget: number; maxOps: number; objective: string }
): string {
  const lines: string[] = [
    `// Auto-generated JS Strategy: ${modelName}`,
    `// Objective: ${config.objective}`,
    `// Budget: ${config.budget}, Max Ops: ${config.maxOps}`,
    `// Generated: ${new Date().toISOString()}`,
    '',
    '// Available via api: apply_operation, get_metric, get_all_metrics,',
    '//   get_cost, get_available_operations, get_budget, log, get_bits, set_bits',
    '',
    `const MAX_OPS = ${config.maxOps};`,
    `const BUDGET = ${config.budget};`,
    '',
    '// Operation sequence with weights',
    `const SEQUENCE = ${JSON.stringify(operationSequence, null, 2)};`,
    '',
    '// Execute strategy',
    'let opsRun = 0;',
    'for (const step of SEQUENCE) {',
    '  if (opsRun >= MAX_OPS) break;',
    '  if (api.get_budget() < api.get_cost(step.op)) {',
    '    api.log("Budget exhausted at step " + opsRun);',
    '    break;',
    '  }',
    '  const before = api.get_all_metrics();',
    '  api.apply_operation(step.op, api.get_bits(), step.params || {});',
    '  const after = api.get_all_metrics();',
    '  api.log("Step " + opsRun + ": " + step.op + " entropy=" + after.entropy?.toFixed(4));',
    '  opsRun++;',
    '}',
    '',
    'api.log("Strategy complete: " + opsRun + " operations executed");',
  ];
  return lines.join('\n');
}
