/**
 * Comprehensive Test Suite for Operations and Metrics
 * Tests all implementations with their test vectors
 * Uses COMPLETE vectors from testVectorsComplete.ts for full coverage
 */

import { executeOperation } from './operationsRouter';
import { calculateMetric } from './metricsCalculator';
import { 
  OPERATION_TEST_VECTORS, 
  METRIC_TEST_VECTORS,
  getImplementationStats,
  runOperationTestVectors,
  runMetricTestVectors,
} from './implementationRegistry';
import {
  COMPLETE_OPERATION_TEST_VECTORS,
  COMPLETE_METRIC_TEST_VECTORS,
} from './testVectorsComplete';
import { predefinedManager } from './predefinedManager';

// Merge complete vectors with implementation registry vectors
const MERGED_OPERATION_VECTORS = { ...OPERATION_TEST_VECTORS, ...COMPLETE_OPERATION_TEST_VECTORS };
const MERGED_METRIC_VECTORS = { ...METRIC_TEST_VECTORS, ...COMPLETE_METRIC_TEST_VECTORS };

export interface TestSuiteResult {
  timestamp: Date;
  duration: number;
  
  operations: {
    total: number;
    implemented: number;
    tested: number;
    passed: number;
    failed: number;
    missing: string[];
    failures: TestFailure[];
  };
  
  metrics: {
    total: number;
    implemented: number;
    tested: number;
    passed: number;
    failed: number;
    missing: string[];
    failures: TestFailure[];
  };
  
  overall: {
    passed: number;
    failed: number;
    coverage: number;
    successRate: number;
  };
}

export interface TestFailure {
  id: string;
  testDescription: string;
  input: string;
  expected: string | number;
  actual: string | number;
  params?: Record<string, any>;
}

/**
 * Run the complete test suite
 */
export function runComprehensiveTestSuite(): TestSuiteResult {
  const startTime = performance.now();
  const stats = getImplementationStats();
  
  const opFailures: TestFailure[] = [];
  const metricFailures: TestFailure[] = [];
  
  let opTested = 0;
  let opPassed = 0;
  let opFailed = 0;
  
  let metricTested = 0;
  let metricPassed = 0;
  let metricFailed = 0;
  
  // Test all operations with MERGED test vectors (complete coverage)
  for (const [opId, vectors] of Object.entries(MERGED_OPERATION_VECTORS)) {
    for (const vector of vectors) {
      opTested++;
      try {
        const result = executeOperation(opId, vector.input, vector.params || {});
        if (result.success && result.bits === vector.expected) {
          opPassed++;
        } else {
          opFailed++;
          opFailures.push({
            id: opId,
            testDescription: vector.description || 'No description',
            input: vector.input,
            expected: vector.expected,
            actual: result.bits || result.error || 'N/A',
            params: vector.params,
          });
        }
      } catch (e) {
        opFailed++;
        opFailures.push({
          id: opId,
          testDescription: vector.description || 'No description',
          input: vector.input,
          expected: vector.expected,
          actual: `Error: ${(e as Error).message}`,
          params: vector.params,
        });
      }
    }
  }
  
  // Test all metrics with MERGED test vectors (complete coverage)
  for (const [metricId, vectors] of Object.entries(MERGED_METRIC_VECTORS)) {
    for (const vector of vectors) {
      metricTested++;
      try {
        const result = calculateMetric(metricId, vector.input);
        const expected = vector.expected as number;
        const tolerance = Math.abs(expected) < 1 ? 0.15 : Math.abs(expected) * 0.15; // 15% tolerance
        if (result.success && Math.abs(result.value - expected) <= tolerance) {
          metricPassed++;
        } else {
          metricFailed++;
          metricFailures.push({
            id: metricId,
            testDescription: vector.description || 'No description',
            input: vector.input,
            expected: vector.expected,
            actual: result.value ?? result.error ?? 'N/A',
          });
        }
      } catch (e) {
        metricFailed++;
        metricFailures.push({
          id: metricId,
          testDescription: vector.description || 'No description',
          input: vector.input,
          expected: vector.expected,
          actual: `Error: ${(e as Error).message}`,
        });
      }
    }
  }
  
  const endTime = performance.now();
  
  const totalPassed = opPassed + metricPassed;
  const totalFailed = opFailed + metricFailed;
  const totalTests = opTested + metricTested;
  
  return {
    timestamp: new Date(),
    duration: endTime - startTime,
    
    operations: {
      total: stats.operations.total,
      implemented: stats.operations.implemented,
      tested: opTested,
      passed: opPassed,
      failed: opFailed,
      missing: stats.operations.missing,
      failures: opFailures,
    },
    
    metrics: {
      total: stats.metrics.total,
      implemented: stats.metrics.implemented,
      tested: metricTested,
      passed: metricPassed,
      failed: metricFailed,
      missing: stats.metrics.missing,
      failures: metricFailures,
    },
    
    overall: {
      passed: totalPassed,
      failed: totalFailed,
      coverage: totalTests > 0 ? (totalPassed / totalTests) * 100 : 0,
      successRate: totalTests > 0 ? (totalPassed / totalTests) * 100 : 100,
    },
  };
}

/**
 * Run quick validation - just checks if implementations exist
 */
export function runQuickValidation(): {
  operations: { id: string; name: string; implemented: boolean }[];
  metrics: { id: string; name: string; implemented: boolean }[];
} {
  const allOps = predefinedManager.getAllOperations();
  const allMetrics = predefinedManager.getAllMetrics();
  
  const operations = allOps.map(op => {
    const result = executeOperation(op.id, '10101010', {});
    return {
      id: op.id,
      name: op.name,
      implemented: result.success || (op.isCodeBased && !!op.code),
    };
  });
  
  const metrics = allMetrics.map(metric => {
    const result = calculateMetric(metric.id, '10101010');
    return {
      id: metric.id,
      name: metric.name,
      implemented: result.success || (metric.isCodeBased && !!metric.code),
    };
  });
  
  return { operations, metrics };
}

/**
 * Test a specific operation
 */
export function testOperation(operationId: string): {
  implemented: boolean;
  testResults: { input: string; expected: string; actual: string; pass: boolean; description?: string }[];
  error?: string;
} {
  const vectors = OPERATION_TEST_VECTORS[operationId] || [];
  const testResults: { input: string; expected: string; actual: string; pass: boolean; description?: string }[] = [];
  
  // First check if operation is implemented
  const basicResult = executeOperation(operationId, '10101010', {});
  if (!basicResult.success) {
    return {
      implemented: false,
      testResults: [],
      error: basicResult.error,
    };
  }
  
  // Run all test vectors
  for (const vector of vectors) {
    const result = executeOperation(operationId, vector.input, vector.params || {});
    testResults.push({
      input: vector.input,
      expected: vector.expected as string,
      actual: result.bits,
      pass: result.success && result.bits === vector.expected,
      description: vector.description,
    });
  }
  
  return {
    implemented: true,
    testResults,
  };
}

/**
 * Test a specific metric
 */
export function testMetric(metricId: string): {
  implemented: boolean;
  testResults: { input: string; expected: number; actual: number; pass: boolean; description?: string }[];
  error?: string;
} {
  const vectors = METRIC_TEST_VECTORS[metricId] || [];
  const testResults: { input: string; expected: number; actual: number; pass: boolean; description?: string }[] = [];
  
  // First check if metric is implemented
  const basicResult = calculateMetric(metricId, '10101010');
  if (!basicResult.success) {
    return {
      implemented: false,
      testResults: [],
      error: basicResult.error,
    };
  }
  
  // Run all test vectors
  for (const vector of vectors) {
    const result = calculateMetric(metricId, vector.input);
    const expected = vector.expected as number;
    const tolerance = Math.abs(expected) < 1 ? 0.01 : Math.abs(expected) * 0.01;
    testResults.push({
      input: vector.input,
      expected,
      actual: result.value,
      pass: result.success && Math.abs(result.value - expected) <= tolerance,
      description: vector.description,
    });
  }
  
  return {
    implemented: true,
    testResults,
  };
}

/**
 * Generate test coverage report
 */
export function generateCoverageReport(): string {
  const stats = getImplementationStats();
  const testResult = runComprehensiveTestSuite();
  
  const lines: string[] = [
    '═══════════════════════════════════════════════════════════════',
    'IMPLEMENTATION & TEST COVERAGE REPORT',
    '═══════════════════════════════════════════════════════════════',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Test Duration: ${testResult.duration.toFixed(2)}ms`,
    '',
    '─── OPERATIONS ───────────────────────────────────────────────',
    `Total Defined: ${testResult.operations.total}`,
    `Implemented: ${testResult.operations.implemented} (${((testResult.operations.implemented / testResult.operations.total) * 100).toFixed(1)}%)`,
    `Tests Run: ${testResult.operations.tested}`,
    `Tests Passed: ${testResult.operations.passed}`,
    `Tests Failed: ${testResult.operations.failed}`,
    '',
  ];
  
  if (testResult.operations.missing.length > 0) {
    lines.push('Missing Implementations:');
    testResult.operations.missing.forEach(id => lines.push(`  - ${id}`));
    lines.push('');
  }
  
  if (testResult.operations.failures.length > 0) {
    lines.push('Failed Tests:');
    testResult.operations.failures.forEach(f => {
      lines.push(`  ${f.id}: ${f.testDescription}`);
      lines.push(`    Input: ${f.input}`);
      lines.push(`    Expected: ${f.expected}`);
      lines.push(`    Actual: ${f.actual}`);
    });
    lines.push('');
  }
  
  lines.push('─── METRICS ──────────────────────────────────────────────────');
  lines.push(`Total Defined: ${testResult.metrics.total}`);
  lines.push(`Implemented: ${testResult.metrics.implemented} (${((testResult.metrics.implemented / testResult.metrics.total) * 100).toFixed(1)}%)`);
  lines.push(`Tests Run: ${testResult.metrics.tested}`);
  lines.push(`Tests Passed: ${testResult.metrics.passed}`);
  lines.push(`Tests Failed: ${testResult.metrics.failed}`);
  lines.push('');
  
  if (testResult.metrics.missing.length > 0) {
    lines.push('Missing Implementations:');
    testResult.metrics.missing.forEach(id => lines.push(`  - ${id}`));
    lines.push('');
  }
  
  if (testResult.metrics.failures.length > 0) {
    lines.push('Failed Tests:');
    testResult.metrics.failures.forEach(f => {
      lines.push(`  ${f.id}: ${f.testDescription}`);
      lines.push(`    Input: ${f.input}`);
      lines.push(`    Expected: ${f.expected}`);
      lines.push(`    Actual: ${f.actual}`);
    });
    lines.push('');
  }
  
  lines.push('─── OVERALL ──────────────────────────────────────────────────');
  lines.push(`Total Tests: ${testResult.overall.passed + testResult.overall.failed}`);
  lines.push(`Passed: ${testResult.overall.passed}`);
  lines.push(`Failed: ${testResult.overall.failed}`);
  lines.push(`Success Rate: ${testResult.overall.successRate.toFixed(1)}%`);
  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');
  
  return lines.join('\n');
}
