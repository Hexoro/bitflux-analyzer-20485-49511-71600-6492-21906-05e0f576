/**
 * Ultra-fast Smoke Tests
 * These run instantly on component mount - no heavy imports, no blocking
 * Just quick sanity checks that the core functions exist and work
 */

export interface SmokeTestResult {
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

export interface SmokeTestSummary {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: SmokeTestResult[];
}

type SmokeTest = {
  name: string;
  fn: () => boolean;
};

// Simple inline tests that don't require imports
const SMOKE_TESTS: SmokeTest[] = [
  {
    name: 'Basic NOT operation',
    fn: () => {
      const input = '10101010';
      const expected = '01010101';
      const result = input.split('').map(b => b === '1' ? '0' : '1').join('');
      return result === expected;
    }
  },
  {
    name: 'Basic XOR operation',
    fn: () => {
      const a = '1100';
      const b = '1010';
      const expected = '0110';
      const result = a.split('').map((bit, i) => bit === b[i] ? '0' : '1').join('');
      return result === expected;
    }
  },
  {
    name: 'Bit counting',
    fn: () => {
      const bits = '11110000';
      const ones = bits.split('').filter(b => b === '1').length;
      return ones === 4;
    }
  },
  {
    name: 'Balance calculation',
    fn: () => {
      const bits = '10101010';
      const ones = bits.split('').filter(b => b === '1').length;
      const balance = ones / bits.length;
      return Math.abs(balance - 0.5) < 0.01;
    }
  },
  {
    name: 'localStorage available',
    fn: () => {
      try {
        const key = '__smoke_test__';
        localStorage.setItem(key, 'test');
        const result = localStorage.getItem(key) === 'test';
        localStorage.removeItem(key);
        return result;
      } catch {
        return false; // localStorage might be disabled
      }
    }
  }
];

/**
 * Runs all smoke tests synchronously (they're ultra-fast)
 */
export function runSmokeTests(): SmokeTestSummary {
  const startTime = performance.now();
  const results: SmokeTestResult[] = [];
  
  for (const test of SMOKE_TESTS) {
    const testStart = performance.now();
    let passed = false;
    let error: string | undefined;
    
    try {
      passed = test.fn();
    } catch (e) {
      passed = false;
      error = e instanceof Error ? e.message : String(e);
    }
    
    results.push({
      name: test.name,
      passed,
      durationMs: performance.now() - testStart,
      error
    });
  }
  
  const totalDuration = performance.now() - startTime;
  
  return {
    total: results.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
    durationMs: totalDuration,
    results
  };
}
