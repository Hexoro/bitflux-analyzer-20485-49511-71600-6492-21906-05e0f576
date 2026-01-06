/**
 * Binary Metrics Test Suite
 * Tests all analysis and statistical functions
 */

import { BinaryMetrics } from '../lib/binaryMetrics';

export function runBinaryMetricsTests(): { passed: number; failed: number; results: string[] } {
  const results: string[] = [];
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => boolean): void {
    try {
      const result = fn();
      if (result) {
        results.push(`✓ ${name}`);
        passed++;
      } else {
        results.push(`✗ ${name} - Assertion failed`);
        failed++;
      }
    } catch (error) {
      results.push(`✗ ${name} - ${error}`);
      failed++;
    }
  }

  // Test: Basic stats calculation
  test('BinaryMetrics calculates basic stats', () => {
    const stats = BinaryMetrics.analyze('101010');
    return stats.totalBits === 6 && 
           stats.zeroCount === 3 && 
           stats.oneCount === 3 &&
           Math.abs(stats.zeroPercent - 50) < 0.01 &&
           Math.abs(stats.onePercent - 50) < 0.01;
  });

  // Test: Entropy calculation (balanced)
  test('BinaryMetrics calculates entropy for balanced data', () => {
    const stats = BinaryMetrics.analyze('10101010');
    return Math.abs(stats.entropy - 1.0) < 0.01;
  });

  // Test: Entropy calculation (all zeros)
  test('BinaryMetrics calculates entropy for uniform data', () => {
    const stats = BinaryMetrics.analyze('00000000');
    return stats.entropy === 0;
  });

  // Test: Longest zero run
  test('BinaryMetrics finds longest zero run', () => {
    const stats = BinaryMetrics.analyze('11000001');
    return stats.longestZeroRun?.length === 5 && 
           stats.longestZeroRun?.start === 2;
  });

  // Test: Longest one run
  test('BinaryMetrics finds longest one run', () => {
    const stats = BinaryMetrics.analyze('001111100');
    return stats.longestOneRun?.length === 5 && 
           stats.longestOneRun?.start === 2;
  });

  // Test: Mean run length
  test('BinaryMetrics calculates mean run length', () => {
    const meanRunLength = BinaryMetrics.calculateMeanRunLength('110011');
    return Math.abs(meanRunLength - 2.0) < 0.01;
  });

  // Test: Search sequence (single match)
  test('BinaryMetrics searches sequence correctly', () => {
    const result = BinaryMetrics.searchSequence('10101010', '101');
    return result.count === 3 && 
           result.positions.length === 3 &&
           result.positions[0] === 0;
  });

  // Test: Search sequence (no match)
  test('BinaryMetrics handles no matches', () => {
    const result = BinaryMetrics.searchSequence('00000000', '1');
    return result.count === 0 && result.positions.length === 0;
  });

  // Test: Search multiple sequences
  test('BinaryMetrics searches multiple sequences', () => {
    const results = BinaryMetrics.searchMultipleSequences('10101010', ['101', '010']);
    return results.length === 2 && 
           results[0].count === 3 && 
           results[1].count === 3;
  });

  // Test: Find unique boundary
  test('BinaryMetrics finds unique boundary', () => {
    const bits = '10101010';
    const boundary = BinaryMetrics.findUniqueBoundary(bits, 4, 8);
    return boundary !== null && !bits.includes(boundary);
  });

  // Test: Get first N bits
  test('BinaryMetrics gets first N bits', () => {
    const first = BinaryMetrics.getFirst('10101010', 4);
    return first === '1010';
  });

  // Test: Get last N bits
  test('BinaryMetrics gets last N bits', () => {
    const last = BinaryMetrics.getLast('10101010', 4);
    return last === '1010';
  });

  // Test: Estimated compressed size
  test('BinaryMetrics estimates compression size', () => {
    const stats = BinaryMetrics.analyze('10101010');
    return stats.estimatedCompressedSize <= stats.totalBytes;
  });

  // Test: Total bytes calculation
  test('BinaryMetrics calculates total bytes correctly', () => {
    const stats = BinaryMetrics.analyze('1010101010');
    return stats.totalBytes === 2;
  });

  return { passed, failed, results };
}
