/**
 * Test Runner
 * Executes all test suites and provides comprehensive results
 */

import { runBinaryModelTests } from './binaryModel.test';
import { runBinaryMetricsTests } from './binaryMetrics.test';
import { runHistoryManagerTests } from './historyManager.test';

export interface TestSuiteResult {
  suiteName: string;
  passed: number;
  failed: number;
  total: number;
  results: string[];
  status: 'PASSED' | 'FAILED';
}

export interface OverallTestResults {
  suites: TestSuiteResult[];
  totalPassed: number;
  totalFailed: number;
  totalTests: number;
  overallStatus: 'PASSED' | 'FAILED';
  executionTime: number;
}

export function runAllTests(): OverallTestResults {
  const startTime = performance.now();
  const suites: TestSuiteResult[] = [];
  
  // Run Binary Model tests
  const binaryModelResults = runBinaryModelTests();
  suites.push({
    suiteName: 'BinaryModel',
    passed: binaryModelResults.passed,
    failed: binaryModelResults.failed,
    total: binaryModelResults.passed + binaryModelResults.failed,
    results: binaryModelResults.results,
    status: binaryModelResults.failed === 0 ? 'PASSED' : 'FAILED',
  });

  // Run Binary Metrics tests
  const binaryMetricsResults = runBinaryMetricsTests();
  suites.push({
    suiteName: 'BinaryMetrics',
    passed: binaryMetricsResults.passed,
    failed: binaryMetricsResults.failed,
    total: binaryMetricsResults.passed + binaryMetricsResults.failed,
    results: binaryMetricsResults.results,
    status: binaryMetricsResults.failed === 0 ? 'PASSED' : 'FAILED',
  });

  // Run History Manager tests
  const historyManagerResults = runHistoryManagerTests();
  suites.push({
    suiteName: 'HistoryManager',
    passed: historyManagerResults.passed,
    failed: historyManagerResults.failed,
    total: historyManagerResults.passed + historyManagerResults.failed,
    results: historyManagerResults.results,
    status: historyManagerResults.failed === 0 ? 'PASSED' : 'FAILED',
  });

  const endTime = performance.now();
  const executionTime = endTime - startTime;

  const totalPassed = suites.reduce((sum, s) => sum + s.passed, 0);
  const totalFailed = suites.reduce((sum, s) => sum + s.failed, 0);
  const totalTests = totalPassed + totalFailed;

  return {
    suites,
    totalPassed,
    totalFailed,
    totalTests,
    overallStatus: totalFailed === 0 ? 'PASSED' : 'FAILED',
    executionTime,
  };
}

export function formatTestResults(results: OverallTestResults): string {
  let output = '\n';
  output += '═══════════════════════════════════════════════════════\n';
  output += '                TEST EXECUTION REPORT                  \n';
  output += '═══════════════════════════════════════════════════════\n\n';

  results.suites.forEach((suite) => {
    output += `\n┌─ ${suite.suiteName} ─────────────────────────────────────\n`;
    output += `│ Status: ${suite.status}\n`;
    output += `│ Passed: ${suite.passed}/${suite.total}\n`;
    output += `│ Failed: ${suite.failed}/${suite.total}\n`;
    output += `└─────────────────────────────────────────────────────\n`;
    
    suite.results.forEach((result) => {
      output += `  ${result}\n`;
    });
  });

  output += '\n═══════════════════════════════════════════════════════\n';
  output += `OVERALL: ${results.overallStatus}\n`;
  output += `Total Tests: ${results.totalTests}\n`;
  output += `Passed: ${results.totalPassed}\n`;
  output += `Failed: ${results.totalFailed}\n`;
  output += `Execution Time: ${results.executionTime.toFixed(2)}ms\n`;
  output += '═══════════════════════════════════════════════════════\n';

  return output;
}
