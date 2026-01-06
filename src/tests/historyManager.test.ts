/**
 * History Manager Test Suite
 * Tests history tracking and management
 */

import { HistoryManager } from '../lib/historyManager';

export function runHistoryManagerTests(): { passed: number; failed: number; results: string[] } {
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

  // Test: Add entry
  test('HistoryManager adds entry', () => {
    const manager = new HistoryManager();
    manager.addEntry('1010', 'Test operation');
    const entries = manager.getEntries();
    return entries.length === 1 && entries[0].description === 'Test operation';
  });

  // Test: Get entries
  test('HistoryManager retrieves entries', () => {
    const manager = new HistoryManager();
    manager.addEntry('1010', 'Op 1');
    manager.addEntry('0101', 'Op 2');
    const entries = manager.getEntries();
    return entries.length === 2 && entries[0].description === 'Op 2';
  });

  // Test: Get entry by ID
  test('HistoryManager gets entry by ID', () => {
    const manager = new HistoryManager();
    manager.addEntry('1010', 'Test');
    const entries = manager.getEntries();
    const entry = manager.getEntry(entries[0].id);
    return entry !== null && entry.description === 'Test';
  });

  // Test: Clear history
  test('HistoryManager clears all entries', () => {
    const manager = new HistoryManager();
    manager.addEntry('1010', 'Op 1');
    manager.addEntry('0101', 'Op 2');
    manager.clear();
    return manager.getEntries().length === 0;
  });

  // Test: Entry stats calculation
  test('HistoryManager calculates entry stats', () => {
    const manager = new HistoryManager();
    manager.addEntry('101010', 'Test');
    const entries = manager.getEntries();
    return entries[0].stats?.totalBits === 6 &&
           entries[0].stats?.zeroCount === 3 &&
           entries[0].stats?.oneCount === 3;
  });

  // Test: Entropy in stats
  test('HistoryManager includes entropy in stats', () => {
    const manager = new HistoryManager();
    manager.addEntry('10101010', 'Test');
    const entries = manager.getEntries();
    return entries[0].stats !== undefined &&
           Math.abs(entries[0].stats.entropy - 1.0) < 0.01;
  });

  // Test: Timestamp is set
  test('HistoryManager sets timestamp', () => {
    const manager = new HistoryManager();
    const before = new Date();
    manager.addEntry('1010', 'Test');
    const after = new Date();
    const entries = manager.getEntries();
    const timestamp = entries[0].timestamp.getTime();
    return timestamp >= before.getTime() && timestamp <= after.getTime();
  });

  // Test: Max entries limit
  test('HistoryManager respects max entries limit', () => {
    const manager = new HistoryManager();
    for (let i = 0; i < 150; i++) {
      manager.addEntry(`${i}`, `Op ${i}`);
    }
    return manager.getEntries().length <= 100;
  });

  return { passed, failed, results };
}
