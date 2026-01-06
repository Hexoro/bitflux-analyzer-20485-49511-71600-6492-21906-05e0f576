/// <reference lib="webworker" />

/**
 * Extended Tests Worker - Runs operation and metric tests in background
 * Uses dynamic imports and micro-yielding to never block
 */

type VectorFailure = {
  category: 'operation' | 'metric';
  id: string;
  description: string;
  passed: false;
  expected: string | number;
  actual: string | number;
};

type ProgressMessage = {
  type: 'progress';
  phase: string;
  current: number;
  total: number;
  eta?: string;
};

type DoneMessage = {
  type: 'done';
  summary: { opPassed: number; opFailed: number; metricPassed: number; metricFailed: number };
  failures: VectorFailure[];
  total: number;
  durationMs: number;
};

type ErrorMessage = { type: 'error'; message: string };

type RunMessage = { type: 'run'; maxFailures?: number; batchSize?: number; resumeFrom?: number };
type CancelMessage = { type: 'cancel' };
type ResumeMessage = { type: 'resume'; fromIndex: number };

let cancelled = false;
let lastReportedProgress = 0;

const post = (msg: ProgressMessage | DoneMessage | ErrorMessage) => {
  (self as unknown as Worker).postMessage(msg);
};

// Micro-yield between tests to prevent blocking
const microYield = (): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, 0));
};

self.onmessage = async (ev: MessageEvent<RunMessage | CancelMessage | ResumeMessage>) => {
  const data = ev.data;
  if (data.type === 'cancel') {
    cancelled = true;
    return;
  }

  if (data.type === 'resume') {
    // Resume will be handled by re-running with resumeFrom
    return;
  }

  cancelled = false;
  lastReportedProgress = 0;
  const startTime = performance.now();

  try {
    // Dynamic imports - only load when worker actually starts running
    const [testVectorsModule, operationsModule, metricsModule] = await Promise.all([
      import('@/lib/testVectorsComplete'),
      import('@/lib/operationsRouter'),
      import('@/lib/metricsCalculator')
    ]);

    const { COMPLETE_OPERATION_TEST_VECTORS, COMPLETE_METRIC_TEST_VECTORS } = testVectorsModule;
    const { executeOperation } = operationsModule;
    const { calculateMetric } = metricsModule;

    const maxFailures = data.maxFailures ?? 500;
    const batchSize = data.batchSize ?? 10;
    const resumeFrom = data.resumeFrom ?? 0;
    const failures: VectorFailure[] = [];

    let opPassed = 0,
      opFailed = 0,
      metricPassed = 0,
      metricFailed = 0;

    // Count total tests safely
    let opTotal = 0;
    let metricTotal = 0;
    try {
      opTotal = Object.values(COMPLETE_OPERATION_TEST_VECTORS).reduce(
        (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0
      );
      metricTotal = Object.values(COMPLETE_METRIC_TEST_VECTORS).reduce(
        (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0
      );
    } catch (e) {
      post({ type: 'error', message: `Failed to count tests: ${(e as Error).message}` });
      return;
    }
    
    const total = opTotal + metricTotal;
    let current = 0;
    let batchCount = 0;
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 10;

    const updateProgress = (phase: string) => {
      const elapsed = performance.now() - startTime;
      const effectiveCurrent = current - resumeFrom;
      const effectiveTotal = total - resumeFrom;
      const avgMsPerTest = effectiveCurrent > 0 ? elapsed / effectiveCurrent : 10;
      const remaining = effectiveTotal - effectiveCurrent;
      const etaMs = remaining * avgMsPerTest;
      const etaSec = Math.ceil(etaMs / 1000);
      const eta = etaSec >= 60 
        ? `${Math.floor(etaSec / 60)}m ${etaSec % 60}s`
        : `${etaSec}s`;
      
      lastReportedProgress = current;
      post({ type: 'progress', phase, current, total, eta });
    };

    // Run operation tests
    post({ type: 'progress', phase: 'Loading...', current: 0, total, eta: '...' });

    for (const [opId, vectors] of Object.entries(COMPLETE_OPERATION_TEST_VECTORS)) {
      if (cancelled) break;
      if (!Array.isArray(vectors)) continue;
      
      for (let vi = 0; vi < vectors.length; vi++) {
        // Skip already processed tests if resuming
        if (current < resumeFrom) {
          current++;
          continue;
        }
        
        const vector = vectors[vi];
        if (cancelled) break;
        if (!vector || typeof vector.input !== 'string') {
          current++;
          continue;
        }

        try {
          const result = executeOperation(opId, vector.input, vector.params || {});
          const passed = result.success && result.bits === vector.expected;
          consecutiveErrors = 0; // Reset on success
          
          if (passed) {
            opPassed++;
          } else {
            opFailed++;
            if (failures.length < maxFailures) {
              failures.push({
                category: 'operation',
                id: opId,
                description: vector.description || `${opId} test`,
                passed: false,
                expected: vector.expected,
                actual: result.bits || 'ERROR',
              });
            }
          }
        } catch (e) {
          consecutiveErrors++;
          opFailed++;
          if (failures.length < maxFailures) {
            failures.push({
              category: 'operation',
              id: opId,
              description: vector.description || `${opId} test`,
              passed: false,
              expected: vector.expected,
              actual: `Error: ${(e as Error).message}`,
            });
          }
          
          // Stop if too many consecutive errors (likely a systemic problem)
          if (consecutiveErrors >= maxConsecutiveErrors) {
            console.warn(`Stopping operation tests after ${consecutiveErrors} consecutive errors`);
            break;
          }
        }

        current++;
        batchCount++;

        // Yield after every batch
        if (batchCount >= batchSize) {
          batchCount = 0;
          updateProgress(`Op: ${opId}`);
          await microYield();
        }
      }
      
      // Reset consecutive errors between operations
      consecutiveErrors = 0;
    }

    // Run metric tests
    updateProgress('Metrics');
    consecutiveErrors = 0;

    for (const [metricId, vectors] of Object.entries(COMPLETE_METRIC_TEST_VECTORS)) {
      if (cancelled) break;
      if (!Array.isArray(vectors)) continue;
      
      for (const vector of vectors) {
        if (cancelled) break;
        if (!vector || typeof vector.input !== 'string') {
          current++;
          continue;
        }
        
        try {
          const result = calculateMetric(metricId, vector.input);
          const expected = typeof vector.expected === 'number' ? vector.expected : 0;
          const tolerance = Math.abs(expected) < 1 ? 0.15 : Math.abs(expected) * 0.15;
          const passed = result.success && Math.abs(result.value - expected) <= tolerance;
          consecutiveErrors = 0; // Reset on success
          
          if (passed) {
            metricPassed++;
          } else {
            metricFailed++;
            if (failures.length < maxFailures) {
              failures.push({
                category: 'metric',
                id: metricId,
                description: vector.description || `${metricId} test`,
                passed: false,
                expected,
                actual: result.value,
              });
            }
          }
        } catch (e) {
          consecutiveErrors++;
          metricFailed++;
          if (failures.length < maxFailures) {
            failures.push({
              category: 'metric',
              id: metricId,
              description: vector.description || `${metricId} test`,
              passed: false,
              expected: vector.expected,
              actual: `Error: ${(e as Error).message}`,
            });
          }
          
          // Stop if too many consecutive errors
          if (consecutiveErrors >= maxConsecutiveErrors) {
            console.warn(`Stopping metric tests after ${consecutiveErrors} consecutive errors`);
            break;
          }
        }

        current++;
        batchCount++;

        // Yield after every batch
        if (batchCount >= batchSize) {
          batchCount = 0;
          updateProgress(`Metric: ${metricId}`);
          await microYield();
        }
      }
      
      // Reset consecutive errors between metrics
      consecutiveErrors = 0;
    }

    const durationMs = performance.now() - startTime;

    post({
      type: 'done',
      summary: { opPassed, opFailed, metricPassed, metricFailed },
      failures,
      total,
      durationMs
    });
  } catch (e) {
    post({ type: 'error', message: (e as Error).message || 'Unknown worker error' });
  }
};
