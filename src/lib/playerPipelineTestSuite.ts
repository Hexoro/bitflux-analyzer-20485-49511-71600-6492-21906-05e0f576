/**
 * Player Pipeline E2E Test Suite
 * True end-to-end: generate data → execute operations → build steps → replay → verify
 * Tests the FULL pipeline, not individual components
 */

import { executeOperation, getOperationCost, getAvailableOperations } from './operationsRouter';
import { calculateAllMetrics } from './metricsCalculator';
import { hashBits } from './verificationSystem';
import { verifyAllStepsIndependently, verifyStepIndependently } from './playerVerification';
import { replayFromStoredSteps } from './canonicalReplay';
import { executeJSStrategy } from './jsStrategyRuntime';
import { TransformationStep, ExecutionResultV2 } from './resultsManager';

export interface PipelineTest {
  id: string;
  category: 'full_pipeline' | 'segment_pipeline' | 'chain_pipeline' | 'js_runtime' | 'mixed_pipeline' | 'stress';
  name: string;
  run: () => { passed: boolean; expected: any; actual: any; details?: string; divergence?: any };
}

export interface PipelineTestReport {
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  byCategory: Record<string, { total: number; passed: number; failed: number }>;
  results: Array<{
    id: string;
    name: string;
    category: string;
    passed: boolean;
    expected?: any;
    actual?: any;
    details?: string;
    divergence?: any;
  }>;
}

// ============ HELPERS ============

function generateBits(length: number, seed: number = 42): string {
  let bits = '';
  let s = seed;
  for (let i = 0; i < length; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    bits += (s >> 16) & 1 ? '1' : '0';
  }
  return bits;
}

function buildStep(
  index: number,
  operation: string,
  params: Record<string, any>,
  beforeBits: string,
  afterBits: string,
  fullBeforeBits: string,
  fullAfterBits: string,
  cumulativeBits: string,
  segmentOnly: boolean = false,
  bitRanges?: { start: number; end: number }[]
): TransformationStep {
  const metrics = calculateAllMetrics(cumulativeBits).metrics;
  return {
    index,
    operation,
    params,
    fullBeforeBits,
    fullAfterBits,
    beforeBits,
    afterBits,
    metrics: { entropy: metrics.entropy || 0, balance: metrics.balance || 0 },
    timestamp: Date.now(),
    duration: 1,
    bitRanges: bitRanges || [{ start: 0, end: beforeBits.length }],
    cost: getOperationCost(operation),
    cumulativeBits,
    ...(segmentOnly ? { segmentOnly: true } : {}),
  } as any;
}

function buildMockResult(
  initialBits: string,
  finalBits: string,
  steps: TransformationStep[]
): ExecutionResultV2 {
  return {
    id: 'test_' + Date.now(),
    strategyId: 'test_strategy',
    strategyName: 'Pipeline Test',
    startTime: Date.now(),
    endTime: Date.now() + 100,
    duration: 100,
    initialBits,
    finalBits,
    initialMetrics: calculateAllMetrics(initialBits).metrics,
    finalMetrics: calculateAllMetrics(finalBits).metrics,
    steps,
    benchmarks: { cpuTime: 100, peakMemory: 0, operationCount: steps.length, avgStepDuration: 1, totalCost: 0 },
    filesUsed: { algorithm: 'test', scoring: 'test', policy: 'test' },
    status: 'completed',
    bookmarked: false,
    tags: [],
    notes: '',
  };
}

// ============ FULL PIPELINE TESTS ============

const fullPipelineTests: PipelineTest[] = [
  {
    id: 'pipe_not_full', category: 'full_pipeline',
    name: 'Full pipeline: NOT on 64-bit data',
    run: () => {
      const input = generateBits(64);
      const r = executeOperation('NOT', input);
      if (!r.success) return { passed: false, expected: 'success', actual: r.error };
      const step = buildStep(0, 'NOT', r.params, input, r.bits, input, r.bits, r.bits);
      const result = buildMockResult(input, r.bits, [step]);
      const replay = replayFromStoredSteps(result, true);
      return {
        passed: replay.chainVerified && replay.verifiedSteps === 1,
        expected: 'chain verified, 1 step verified',
        actual: `chain=${replay.chainVerified}, verified=${replay.verifiedSteps}`,
      };
    },
  },
  {
    id: 'pipe_xor_full', category: 'full_pipeline',
    name: 'Full pipeline: XOR with mask on 128-bit data',
    run: () => {
      const input = generateBits(128);
      const mask = generateBits(128, 99);
      const r = executeOperation('XOR', input, { mask });
      if (!r.success) return { passed: false, expected: 'success', actual: r.error };
      const step = buildStep(0, 'XOR', r.params, input, r.bits, input, r.bits, r.bits);
      const result = buildMockResult(input, r.bits, [step]);
      const replay = replayFromStoredSteps(result, true);
      return {
        passed: replay.chainVerified && replay.verifiedSteps === 1,
        expected: 'verified',
        actual: `chain=${replay.chainVerified}, steps=${replay.verifiedSteps}/${replay.totalSteps}`,
      };
    },
  },
  {
    id: 'pipe_and_full', category: 'full_pipeline',
    name: 'Full pipeline: AND with mask',
    run: () => {
      const input = generateBits(64, 7);
      const mask = generateBits(64, 13);
      const r = executeOperation('AND', input, { mask });
      if (!r.success) return { passed: false, expected: 'success', actual: r.error };
      const step = buildStep(0, 'AND', r.params, input, r.bits, input, r.bits, r.bits);
      const result = buildMockResult(input, r.bits, [step]);
      const replay = replayFromStoredSteps(result, true);
      return { passed: replay.chainVerified && replay.failedSteps === 0, expected: 'all pass', actual: `failed=${replay.failedSteps}` };
    },
  },
  {
    id: 'pipe_or_full', category: 'full_pipeline',
    name: 'Full pipeline: OR with mask',
    run: () => {
      const input = generateBits(64, 21);
      const mask = generateBits(64, 33);
      const r = executeOperation('OR', input, { mask });
      if (!r.success) return { passed: false, expected: 'success', actual: r.error };
      const step = buildStep(0, 'OR', r.params, input, r.bits, input, r.bits, r.bits);
      const result = buildMockResult(input, r.bits, [step]);
      const replay = replayFromStoredSteps(result, true);
      return { passed: replay.chainVerified && replay.failedSteps === 0, expected: 'pass', actual: `failed=${replay.failedSteps}` };
    },
  },
  {
    id: 'pipe_reverse_full', category: 'full_pipeline',
    name: 'Full pipeline: REVERSE on 256-bit data',
    run: () => {
      const input = generateBits(256, 55);
      const r = executeOperation('REVERSE', input);
      if (!r.success) return { passed: false, expected: 'success', actual: r.error };
      const step = buildStep(0, 'REVERSE', r.params, input, r.bits, input, r.bits, r.bits);
      const result = buildMockResult(input, r.bits, [step]);
      const replay = replayFromStoredSteps(result, true);
      return { passed: replay.chainVerified, expected: true, actual: replay.chainVerified };
    },
  },
  {
    id: 'pipe_shl_full', category: 'full_pipeline',
    name: 'Full pipeline: SHL by 5',
    run: () => {
      const input = generateBits(64, 77);
      const r = executeOperation('SHL', input, { count: 5 });
      if (!r.success) return { passed: false, expected: 'success', actual: r.error };
      const step = buildStep(0, 'SHL', r.params, input, r.bits, input, r.bits, r.bits);
      const result = buildMockResult(input, r.bits, [step]);
      const replay = replayFromStoredSteps(result, true);
      return { passed: replay.chainVerified && replay.failedSteps === 0, expected: 'pass', actual: `chain=${replay.chainVerified}` };
    },
  },
  {
    id: 'pipe_rol_full', category: 'full_pipeline',
    name: 'Full pipeline: ROL by 7',
    run: () => {
      const input = generateBits(64, 88);
      const r = executeOperation('ROL', input, { count: 7 });
      if (!r.success) return { passed: false, expected: 'success', actual: r.error };
      const step = buildStep(0, 'ROL', r.params, input, r.bits, input, r.bits, r.bits);
      const result = buildMockResult(input, r.bits, [step]);
      const replay = replayFromStoredSteps(result, true);
      return { passed: replay.chainVerified, expected: true, actual: replay.chainVerified };
    },
  },
  {
    id: 'pipe_nand_full', category: 'full_pipeline',
    name: 'Full pipeline: NAND with mask',
    run: () => {
      const input = generateBits(64, 101);
      const mask = generateBits(64, 102);
      const r = executeOperation('NAND', input, { mask });
      if (!r.success) return { passed: false, expected: 'success', actual: r.error };
      const step = buildStep(0, 'NAND', r.params, input, r.bits, input, r.bits, r.bits);
      const result = buildMockResult(input, r.bits, [step]);
      const replay = replayFromStoredSteps(result, true);
      return { passed: replay.chainVerified, expected: true, actual: replay.chainVerified };
    },
  },
];

// ============ SEGMENT PIPELINE TESTS ============

const segmentPipelineTests: PipelineTest[] = [
  {
    id: 'pipe_segment_not', category: 'segment_pipeline',
    name: 'Segment pipeline: NOT on first 32 bits of 128-bit file',
    run: () => {
      const fullBits = generateBits(128, 200);
      const segment = fullBits.slice(0, 32);
      const r = executeOperation('NOT', segment);
      if (!r.success) return { passed: false, expected: 'success', actual: r.error };
      // Segment-only: full file doesn't change
      const step = buildStep(0, 'NOT', r.params, segment, r.bits, fullBits, fullBits, fullBits, true, [{ start: 0, end: 32 }]);
      const result = buildMockResult(fullBits, fullBits, [step]);
      const replay = replayFromStoredSteps(result, true);
      // Segment op should verify against segment data
      return {
        passed: replay.steps[0]?.verified === true && replay.segmentOnlySteps === 1,
        expected: 'segment verified',
        actual: `verified=${replay.steps[0]?.verified}, segOnly=${replay.segmentOnlySteps}`,
      };
    },
  },
  {
    id: 'pipe_segment_xor', category: 'segment_pipeline',
    name: 'Segment pipeline: XOR on middle 64 bits',
    run: () => {
      const fullBits = generateBits(256, 300);
      const segment = fullBits.slice(64, 128);
      const mask = generateBits(64, 301);
      const r = executeOperation('XOR', segment, { mask });
      if (!r.success) return { passed: false, expected: 'success', actual: r.error };
      const step = buildStep(0, 'XOR', r.params, segment, r.bits, fullBits, fullBits, fullBits, true, [{ start: 64, end: 128 }]);
      const result = buildMockResult(fullBits, fullBits, [step]);
      const replay = replayFromStoredSteps(result, true);
      return { passed: replay.steps[0]?.verified === true, expected: 'verified', actual: `${replay.steps[0]?.verified}` };
    },
  },
  {
    id: 'pipe_segment_reverse', category: 'segment_pipeline',
    name: 'Segment pipeline: REVERSE on last 16 bits',
    run: () => {
      const fullBits = generateBits(64, 400);
      const segment = fullBits.slice(48, 64);
      const r = executeOperation('REVERSE', segment);
      if (!r.success) return { passed: false, expected: 'success', actual: r.error };
      const step = buildStep(0, 'REVERSE', r.params, segment, r.bits, fullBits, fullBits, fullBits, true, [{ start: 48, end: 64 }]);
      const result = buildMockResult(fullBits, fullBits, [step]);
      const replay = replayFromStoredSteps(result, true);
      return { passed: replay.steps[0]?.verified === true, expected: true, actual: replay.steps[0]?.verified };
    },
  },
  {
    id: 'pipe_segment_preserves_full', category: 'segment_pipeline',
    name: 'Segment ops preserve full file hash',
    run: () => {
      const fullBits = generateBits(128, 500);
      const segment = fullBits.slice(0, 32);
      const r = executeOperation('NOT', segment);
      if (!r.success) return { passed: false, expected: 'success', actual: r.error };
      const step = buildStep(0, 'NOT', r.params, segment, r.bits, fullBits, fullBits, fullBits, true);
      const result = buildMockResult(fullBits, fullBits, [step]);
      const replay = replayFromStoredSteps(result, true);
      // Full file hash should be unchanged
      return {
        passed: replay.initialHash === replay.finalHash,
        expected: replay.initialHash,
        actual: replay.reconstructedFinalHash,
      };
    },
  },
];

// ============ CHAIN PIPELINE TESTS ============

const chainPipelineTests: PipelineTest[] = [
  {
    id: 'pipe_chain_3ops', category: 'chain_pipeline',
    name: 'Chain pipeline: NOT → XOR → REVERSE (3 ops)',
    run: () => {
      const input = generateBits(64, 600);
      const steps: TransformationStep[] = [];
      let current = input;

      // Step 0: NOT
      const r0 = executeOperation('NOT', current);
      if (!r0.success) return { passed: false, expected: 'success', actual: r0.error };
      steps.push(buildStep(0, 'NOT', r0.params, current, r0.bits, current, r0.bits, r0.bits));
      current = r0.bits;

      // Step 1: XOR with mask
      const mask = generateBits(64, 601);
      const r1 = executeOperation('XOR', current, { mask });
      if (!r1.success) return { passed: false, expected: 'success', actual: r1.error };
      steps.push(buildStep(1, 'XOR', r1.params, current, r1.bits, current, r1.bits, r1.bits));
      current = r1.bits;

      // Step 2: REVERSE
      const r2 = executeOperation('REVERSE', current);
      if (!r2.success) return { passed: false, expected: 'success', actual: r2.error };
      steps.push(buildStep(2, 'REVERSE', r2.params, current, r2.bits, current, r2.bits, r2.bits));
      current = r2.bits;

      const result = buildMockResult(input, current, steps);
      const replay = replayFromStoredSteps(result, true);
      return {
        passed: replay.chainVerified && replay.failedSteps === 0,
        expected: '3 steps verified, chain OK',
        actual: `verified=${replay.verifiedSteps}, failed=${replay.failedSteps}, chain=${replay.chainVerified}`,
      };
    },
  },
  {
    id: 'pipe_chain_5ops', category: 'chain_pipeline',
    name: 'Chain pipeline: 5 sequential operations',
    run: () => {
      const input = generateBits(128, 700);
      const ops = ['NOT', 'REVERSE', 'NOT', 'REVERSE', 'NOT'];
      const steps: TransformationStep[] = [];
      let current = input;

      for (let i = 0; i < ops.length; i++) {
        const r = executeOperation(ops[i], current);
        if (!r.success) return { passed: false, expected: 'success', actual: `${ops[i]} failed: ${r.error}` };
        steps.push(buildStep(i, ops[i], r.params, current, r.bits, current, r.bits, r.bits));
        current = r.bits;
      }

      const result = buildMockResult(input, current, steps);
      const replay = replayFromStoredSteps(result, true);
      return {
        passed: replay.chainVerified && replay.failedSteps === 0,
        expected: '5/5 verified',
        actual: `${replay.verifiedSteps}/${replay.totalSteps}`,
      };
    },
  },
  {
    id: 'pipe_chain_10ops', category: 'chain_pipeline',
    name: 'Chain pipeline: 10 operations on 256 bits',
    run: () => {
      const input = generateBits(256, 800);
      const ops = ['NOT', 'REVERSE', 'SHL', 'NOT', 'REVERSE', 'ROL', 'NOT', 'REVERSE', 'SHR', 'NOT'];
      const params = [
        {}, {}, { count: 3 }, {}, {}, { count: 5 }, {}, {}, { count: 2 }, {},
      ];
      const steps: TransformationStep[] = [];
      let current = input;

      for (let i = 0; i < ops.length; i++) {
        const r = executeOperation(ops[i], current, params[i]);
        if (!r.success) return { passed: false, expected: 'success', actual: `${ops[i]} failed` };
        steps.push(buildStep(i, ops[i], r.params, current, r.bits, current, r.bits, r.bits));
        current = r.bits;
      }

      const result = buildMockResult(input, current, steps);
      const replay = replayFromStoredSteps(result, true);
      return {
        passed: replay.chainVerified && replay.failedSteps === 0,
        expected: '10/10',
        actual: `${replay.verifiedSteps}/${replay.totalSteps}, chain=${replay.chainVerified}`,
      };
    },
  },
  {
    id: 'pipe_chain_hash_integrity', category: 'chain_pipeline',
    name: 'Chain pipeline: hash integrity across 5 steps',
    run: () => {
      const input = generateBits(64, 850);
      const steps: TransformationStep[] = [];
      let current = input;
      const hashes: string[] = [hashBits(input)];

      for (let i = 0; i < 5; i++) {
        const r = executeOperation('NOT', current);
        if (!r.success) return { passed: false, expected: 'success', actual: r.error };
        steps.push(buildStep(i, 'NOT', r.params, current, r.bits, current, r.bits, r.bits));
        current = r.bits;
        hashes.push(hashBits(current));
      }

      // NOT is involution: hash[0] === hash[2] === hash[4], hash[1] === hash[3] === hash[5]
      const passed = hashes[0] === hashes[2] && hashes[2] === hashes[4]
        && hashes[1] === hashes[3] && hashes[3] === hashes[5];
      return { passed, expected: 'involution hashes match', actual: hashes.join(',').slice(0, 80) };
    },
  },
];

// ============ MIXED PIPELINE TESTS ============

const mixedPipelineTests: PipelineTest[] = [
  {
    id: 'pipe_mixed_segment_full', category: 'mixed_pipeline',
    name: 'Mixed pipeline: segment op then full op',
    run: () => {
      const input = generateBits(128, 900);
      const steps: TransformationStep[] = [];
      let current = input;

      // Step 0: Segment NOT on first 32 bits (doesn't change full state)
      const seg = current.slice(0, 32);
      const r0 = executeOperation('NOT', seg);
      if (!r0.success) return { passed: false, expected: 'success', actual: r0.error };
      steps.push(buildStep(0, 'NOT', r0.params, seg, r0.bits, current, current, current, true, [{ start: 0, end: 32 }]));

      // Step 1: Full NOT (changes full state)
      const r1 = executeOperation('NOT', current);
      if (!r1.success) return { passed: false, expected: 'success', actual: r1.error };
      steps.push(buildStep(1, 'NOT', r1.params, current, r1.bits, current, r1.bits, r1.bits, false));
      current = r1.bits;

      const result = buildMockResult(input, current, steps);
      const replay = replayFromStoredSteps(result, true);
      return {
        passed: replay.segmentOnlySteps === 1 && replay.failedSteps === 0,
        expected: '1 segment, 0 failed',
        actual: `seg=${replay.segmentOnlySteps}, failed=${replay.failedSteps}`,
      };
    },
  },
  {
    id: 'pipe_mixed_alternating', category: 'mixed_pipeline',
    name: 'Mixed pipeline: alternating segment/full ops',
    run: () => {
      const input = generateBits(256, 950);
      const steps: TransformationStep[] = [];
      let current = input;

      for (let i = 0; i < 6; i++) {
        if (i % 2 === 0) {
          // Segment op
          const seg = current.slice(0, 64);
          const r = executeOperation('NOT', seg);
          if (!r.success) return { passed: false, expected: 'success', actual: r.error };
          steps.push(buildStep(i, 'NOT', r.params, seg, r.bits, current, current, current, true, [{ start: 0, end: 64 }]));
        } else {
          // Full op
          const r = executeOperation('REVERSE', current);
          if (!r.success) return { passed: false, expected: 'success', actual: r.error };
          steps.push(buildStep(i, 'REVERSE', r.params, current, r.bits, current, r.bits, r.bits, false));
          current = r.bits;
        }
      }

      const result = buildMockResult(input, current, steps);
      const replay = replayFromStoredSteps(result, true);
      return {
        passed: replay.segmentOnlySteps === 3 && replay.chainVerified,
        expected: '3 segment, chain OK',
        actual: `seg=${replay.segmentOnlySteps}, chain=${replay.chainVerified}`,
      };
    },
  },
];

// ============ JS RUNTIME TESTS ============

const jsRuntimeTests: PipelineTest[] = [
  {
    id: 'js_simple_not', category: 'js_runtime',
    name: 'JS runtime: simple NOT strategy',
    run: () => {
      const bits = generateBits(64, 1000);
      const jsCode = `api.apply_operation('NOT', api.get_bits());`;
      const result = executeJSStrategy(jsCode, {
        bits, budget: 100, metrics: calculateAllMetrics(bits).metrics, operations: getAvailableOperations(),
      });
      const expected = executeOperation('NOT', bits);
      return {
        passed: result.success && result.finalBits === expected.bits,
        expected: expected.bits?.slice(0, 32),
        actual: result.finalBits?.slice(0, 32),
      };
    },
  },
  {
    id: 'js_multi_ops', category: 'js_runtime',
    name: 'JS runtime: 3 operations in sequence',
    run: () => {
      const bits = generateBits(64, 1100);
      const jsCode = `
        api.apply_operation('NOT', api.get_bits());
        api.apply_operation('REVERSE', api.get_bits());
        api.apply_operation('NOT', api.get_bits());
        api.log('Done: ' + api.get_bits().length + ' bits');
      `;
      const result = executeJSStrategy(jsCode, {
        bits, budget: 100, metrics: {}, operations: getAvailableOperations(),
      });
      return {
        passed: result.success && result.transformations.length === 3,
        expected: 3,
        actual: result.transformations.length,
        details: result.error,
      };
    },
  },
  {
    id: 'js_budget_tracking', category: 'js_runtime',
    name: 'JS runtime: budget tracking works',
    run: () => {
      const bits = generateBits(32, 1200);
      const jsCode = `
        var initialBudget = api.get_budget();
        api.apply_operation('NOT', api.get_bits());
        var afterBudget = api.get_budget();
        api.log('Budget: ' + initialBudget + ' -> ' + afterBudget);
      `;
      const result = executeJSStrategy(jsCode, {
        bits, budget: 100, metrics: {}, operations: getAvailableOperations(),
      });
      return {
        passed: result.success && result.stats.budgetUsed > 0,
        expected: 'budget used > 0',
        actual: `used=${result.stats.budgetUsed}`,
      };
    },
  },
  {
    id: 'js_xor_with_mask', category: 'js_runtime',
    name: 'JS runtime: XOR with explicit mask',
    run: () => {
      const bits = '10101010';
      const mask = '11110000';
      const jsCode = `api.apply_operation('XOR', api.get_bits(), { mask: '${mask}' });`;
      const result = executeJSStrategy(jsCode, {
        bits, budget: 100, metrics: {}, operations: getAvailableOperations(),
      });
      const expected = executeOperation('XOR', bits, { mask });
      return {
        passed: result.success && result.finalBits === expected.bits,
        expected: expected.bits,
        actual: result.finalBits,
      };
    },
  },
  {
    id: 'js_metrics_access', category: 'js_runtime',
    name: 'JS runtime: metrics API works',
    run: () => {
      const bits = generateBits(64, 1300);
      const jsCode = `
        var m = api.get_all_metrics();
        api.log('entropy=' + (m.entropy || 'none'));
        var e = api.get_metric('entropy');
        api.log('single_entropy=' + e);
      `;
      const result = executeJSStrategy(jsCode, {
        bits, budget: 100, metrics: calculateAllMetrics(bits).metrics, operations: getAvailableOperations(),
      });
      return {
        passed: result.success && result.logs.some(l => l.includes('entropy=')),
        expected: 'entropy logged',
        actual: result.logs.join('; ').slice(0, 80),
      };
    },
  },
  {
    id: 'js_blocked_apis', category: 'js_runtime',
    name: 'JS runtime: blocks dangerous APIs',
    run: () => {
      const bits = '10101010';
      const jsCode = `fetch('http://evil.com');`;
      const result = executeJSStrategy(jsCode, {
        bits, budget: 100, metrics: {}, operations: getAvailableOperations(),
      });
      return {
        passed: !result.success && (result.error || '').includes('blocked'),
        expected: 'blocked',
        actual: result.error?.slice(0, 60),
      };
    },
  },
  {
    id: 'js_loop_strategy', category: 'js_runtime',
    name: 'JS runtime: loop-based strategy',
    run: () => {
      const bits = generateBits(64, 1400);
      const jsCode = `
        var ops = ['NOT', 'REVERSE', 'NOT'];
        for (var i = 0; i < ops.length; i++) {
          api.apply_operation(ops[i], api.get_bits());
        }
      `;
      const result = executeJSStrategy(jsCode, {
        bits, budget: 1000, metrics: {}, operations: getAvailableOperations(),
      });
      return {
        passed: result.success && result.transformations.length === 3,
        expected: 3,
        actual: result.transformations.length,
      };
    },
  },
  {
    id: 'js_range_operation', category: 'js_runtime',
    name: 'JS runtime: apply_operation_range',
    run: () => {
      const bits = generateBits(64, 1500);
      const jsCode = `api.apply_operation_range('NOT', 0, 32);`;
      const result = executeJSStrategy(jsCode, {
        bits, budget: 100, metrics: {}, operations: getAvailableOperations(),
      });
      // First 32 bits should be inverted, rest unchanged
      const expected = executeOperation('NOT', bits.slice(0, 32));
      const expectedFull = expected.bits + bits.slice(32);
      return {
        passed: result.success && result.finalBits === expectedFull,
        expected: expectedFull.slice(0, 32),
        actual: result.finalBits.slice(0, 32),
      };
    },
  },
];

// ============ STRESS TESTS ============

const stressTests: PipelineTest[] = [
  {
    id: 'stress_1k_bits', category: 'stress',
    name: 'Stress: 1024-bit data, 5-step chain',
    run: () => {
      const input = generateBits(1024, 2000);
      const steps: TransformationStep[] = [];
      let current = input;

      for (let i = 0; i < 5; i++) {
        const r = executeOperation('NOT', current);
        if (!r.success) return { passed: false, expected: 'success', actual: r.error };
        steps.push(buildStep(i, 'NOT', r.params, current, r.bits, current, r.bits, r.bits));
        current = r.bits;
      }

      const result = buildMockResult(input, current, steps);
      const replay = replayFromStoredSteps(result, true);
      return {
        passed: replay.chainVerified && replay.failedSteps === 0,
        expected: '5/5 on 1024 bits',
        actual: `${replay.verifiedSteps}/${replay.totalSteps}`,
      };
    },
  },
  {
    id: 'stress_determinism_100x', category: 'stress',
    name: 'Stress: 100x determinism check',
    run: () => {
      const input = generateBits(64, 3000);
      const mask = generateBits(64, 3001);
      const results: string[] = [];
      for (let i = 0; i < 100; i++) {
        const r = executeOperation('XOR', input, { mask });
        results.push(r.bits);
      }
      const allSame = results.every(r => r === results[0]);
      return { passed: allSame, expected: 'all 100 identical', actual: allSame ? 'identical' : 'diverged' };
    },
  },
  {
    id: 'stress_independent_verify', category: 'stress',
    name: 'Stress: independent verification on 20-step chain',
    run: () => {
      const input = generateBits(128, 4000);
      const steps: TransformationStep[] = [];
      let current = input;
      const ops = ['NOT', 'REVERSE', 'NOT', 'REVERSE', 'NOT',
                    'NOT', 'REVERSE', 'NOT', 'REVERSE', 'NOT',
                    'NOT', 'REVERSE', 'NOT', 'REVERSE', 'NOT',
                    'NOT', 'REVERSE', 'NOT', 'REVERSE', 'NOT'];

      for (let i = 0; i < ops.length; i++) {
        const r = executeOperation(ops[i], current);
        if (!r.success) return { passed: false, expected: 'success', actual: r.error };
        steps.push(buildStep(i, ops[i], r.params, current, r.bits, current, r.bits, r.bits));
        current = r.bits;
      }

      const report = verifyAllStepsIndependently(input, steps, current);
      return {
        passed: report.overallPassed && report.chainVerified,
        expected: '20/20 independent',
        actual: `passed=${report.passedSteps}, failed=${report.failedSteps}, chain=${report.chainVerified}`,
      };
    },
  },
];

// ============ ALL TESTS ============

export const ALL_PIPELINE_TESTS: PipelineTest[] = [
  ...fullPipelineTests,
  ...segmentPipelineTests,
  ...chainPipelineTests,
  ...mixedPipelineTests,
  ...jsRuntimeTests,
  ...stressTests,
];

/**
 * Run all pipeline tests
 */
export function runPipelineTestSuite(): PipelineTestReport {
  const results: PipelineTestReport['results'] = [];
  const byCategory: Record<string, { total: number; passed: number; failed: number }> = {};

  for (const test of ALL_PIPELINE_TESTS) {
    try {
      const result = test.run();
      results.push({
        id: test.id,
        name: test.name,
        category: test.category,
        passed: result.passed,
        expected: result.expected,
        actual: result.actual,
        details: result.details,
        divergence: result.divergence,
      });

      if (!byCategory[test.category]) byCategory[test.category] = { total: 0, passed: 0, failed: 0 };
      byCategory[test.category].total++;
      if (result.passed) byCategory[test.category].passed++;
      else byCategory[test.category].failed++;
    } catch (e) {
      results.push({
        id: test.id,
        name: test.name,
        category: test.category,
        passed: false,
        details: `Exception: ${(e as Error).message}`,
      });
      if (!byCategory[test.category]) byCategory[test.category] = { total: 0, passed: 0, failed: 0 };
      byCategory[test.category].total++;
      byCategory[test.category].failed++;
    }
  }

  return {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
    byCategory,
    results,
  };
}

export function exportPipelineTestReport(report: PipelineTestReport): void {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pipeline-test-report-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
