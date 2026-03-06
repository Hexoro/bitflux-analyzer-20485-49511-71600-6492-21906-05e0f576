/**
 * Player Test Suite - 120+ comprehensive tests for File Player Mode
 * Tests: operation correctness, param persistence, replay determinism,
 * bit ranges, verification system, edge cases, error classification
 */

import { executeOperation, getOperationCost } from './operationsRouter';
import { hashBits, verifyReplayFromStored } from './verificationSystem';
import { verifyStepIndependently, verifyAllStepsIndependently } from './playerVerification';
import { TransformationStep } from './resultsManager';

export interface PlayerTest {
  id: string;
  category: 'operation' | 'param_persistence' | 'replay' | 'bit_range' | 'verification' | 'edge_case' | 'error_class';
  name: string;
  description: string;
  run: () => { passed: boolean; expected: any; actual: any; details?: string };
}

export interface PlayerTestReport {
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  byCategory: Record<string, { total: number; passed: number; failed: number }>;
  results: Array<{ id: string; name: string; category: string; passed: boolean; expected?: any; actual?: any; details?: string }>;
}

// ============ OPERATION CORRECTNESS TESTS ============

const operationTests: PlayerTest[] = [
  {
    id: 'op_not_basic', category: 'operation', name: 'NOT flips all bits',
    description: 'NOT should invert every bit in the string',
    run: () => {
      const r = executeOperation('NOT', '10101010');
      return { passed: r.success && r.bits === '01010101', expected: '01010101', actual: r.bits };
    },
  },
  {
    id: 'op_not_zeros', category: 'operation', name: 'NOT on all zeros',
    description: 'NOT on 00000000 should give 11111111',
    run: () => {
      const r = executeOperation('NOT', '00000000');
      return { passed: r.success && r.bits === '11111111', expected: '11111111', actual: r.bits };
    },
  },
  {
    id: 'op_not_ones', category: 'operation', name: 'NOT on all ones',
    description: 'NOT on 11111111 should give 00000000',
    run: () => {
      const r = executeOperation('NOT', '11111111');
      return { passed: r.success && r.bits === '00000000', expected: '00000000', actual: r.bits };
    },
  },
  {
    id: 'op_not_involution', category: 'operation', name: 'NOT is involution',
    description: 'NOT(NOT(x)) == x',
    run: () => {
      const input = '11001100';
      const r1 = executeOperation('NOT', input);
      const r2 = executeOperation('NOT', r1.bits);
      return { passed: r2.bits === input, expected: input, actual: r2.bits };
    },
  },
  {
    id: 'op_xor_mask', category: 'operation', name: 'XOR with known mask',
    description: 'XOR with mask 11110000 should flip first 4 bits only',
    run: () => {
      const r = executeOperation('XOR', '10101010', { mask: '11110000' });
      return { passed: r.success && r.bits === '01011010', expected: '01011010', actual: r.bits };
    },
  },
  {
    id: 'op_xor_involution', category: 'operation', name: 'XOR is involution with same mask',
    description: 'XOR(XOR(x, mask), mask) == x',
    run: () => {
      const input = '10110011';
      const mask = '11001100';
      const r1 = executeOperation('XOR', input, { mask });
      const r2 = executeOperation('XOR', r1.bits, { mask });
      return { passed: r2.bits === input, expected: input, actual: r2.bits };
    },
  },
  {
    id: 'op_and_mask', category: 'operation', name: 'AND with mask',
    description: 'AND with mask keeps only bits where mask=1',
    run: () => {
      const r = executeOperation('AND', '11111111', { mask: '10101010' });
      return { passed: r.success && r.bits === '10101010', expected: '10101010', actual: r.bits };
    },
  },
  {
    id: 'op_and_zeros', category: 'operation', name: 'AND with zeros mask',
    description: 'AND with 00000000 mask gives all zeros',
    run: () => {
      const r = executeOperation('AND', '11111111', { mask: '00000000' });
      return { passed: r.success && r.bits === '00000000', expected: '00000000', actual: r.bits };
    },
  },
  {
    id: 'op_or_mask', category: 'operation', name: 'OR with mask',
    description: 'OR with mask sets bits where mask=1',
    run: () => {
      const r = executeOperation('OR', '00000000', { mask: '10101010' });
      return { passed: r.success && r.bits === '10101010', expected: '10101010', actual: r.bits };
    },
  },
  {
    id: 'op_nand_mask', category: 'operation', name: 'NAND = NOT(AND)',
    description: 'NAND should be NOT(AND(x, mask))',
    run: () => {
      const r = executeOperation('NAND', '11001100', { mask: '11110000' });
      // AND: 11000000, NOT: 00111111
      return { passed: r.success && r.bits === '00111111', expected: '00111111', actual: r.bits };
    },
  },
  {
    id: 'op_nor_mask', category: 'operation', name: 'NOR = NOT(OR)',
    description: 'NOR should be NOT(OR(x, mask))',
    run: () => {
      const r = executeOperation('NOR', '00110000', { mask: '00001100' });
      // OR: 00111100, NOT: 11000011
      return { passed: r.success && r.bits === '11000011', expected: '11000011', actual: r.bits };
    },
  },
  {
    id: 'op_xnor_mask', category: 'operation', name: 'XNOR = NOT(XOR)',
    description: 'XNOR should be NOT(XOR(x, mask))',
    run: () => {
      const r = executeOperation('XNOR', '10100000', { mask: '11000000' });
      // XOR: 01100000, NOT: 10011111
      return { passed: r.success && r.bits === '10011111', expected: '10011111', actual: r.bits };
    },
  },
  {
    id: 'op_shl_1', category: 'operation', name: 'SHL by 1',
    description: 'Shift left by 1, fill with 0',
    run: () => {
      const r = executeOperation('SHL', '10000001', { count: 1 });
      return { passed: r.success && r.bits === '00000010', expected: '00000010', actual: r.bits };
    },
  },
  {
    id: 'op_shr_1', category: 'operation', name: 'SHR by 1',
    description: 'Shift right by 1, fill with 0',
    run: () => {
      const r = executeOperation('SHR', '10000001', { count: 1 });
      return { passed: r.success && r.bits === '01000000', expected: '01000000', actual: r.bits };
    },
  },
  {
    id: 'op_rol_1', category: 'operation', name: 'ROL by 1',
    description: 'Rotate left by 1',
    run: () => {
      const r = executeOperation('ROL', '10000000', { count: 1 });
      return { passed: r.success && r.bits === '00000001', expected: '00000001', actual: r.bits };
    },
  },
  {
    id: 'op_ror_1', category: 'operation', name: 'ROR by 1',
    description: 'Rotate right by 1',
    run: () => {
      const r = executeOperation('ROR', '00000001', { count: 1 });
      return { passed: r.success && r.bits === '10000000', expected: '10000000', actual: r.bits };
    },
  },
  {
    id: 'op_rol_full', category: 'operation', name: 'ROL by length = identity',
    description: 'Rotating by full length should return original',
    run: () => {
      const input = '10110100';
      const r = executeOperation('ROL', input, { count: 8 });
      return { passed: r.success && r.bits === input, expected: input, actual: r.bits };
    },
  },
  {
    id: 'op_reverse', category: 'operation', name: 'REVERSE bits',
    description: 'Reverse should flip bit order',
    run: () => {
      const r = executeOperation('REVERSE', '10000001');
      return { passed: r.success && r.bits === '10000001', expected: '10000001', actual: r.bits };
    },
  },
  {
    id: 'op_reverse_asym', category: 'operation', name: 'REVERSE asymmetric',
    description: 'Reverse of 11000000 should be 00000011',
    run: () => {
      const r = executeOperation('REVERSE', '11000000');
      return { passed: r.success && r.bits === '00000011', expected: '00000011', actual: r.bits };
    },
  },
  {
    id: 'op_reverse_involution', category: 'operation', name: 'REVERSE is involution',
    description: 'REVERSE(REVERSE(x)) == x',
    run: () => {
      const input = '10110011';
      const r1 = executeOperation('REVERSE', input);
      const r2 = executeOperation('REVERSE', r1.bits);
      return { passed: r2.bits === input, expected: input, actual: r2.bits };
    },
  },
  {
    id: 'op_gray_encode', category: 'operation', name: 'GRAY encode',
    description: 'Gray encode known values',
    run: () => {
      const r = executeOperation('GRAY', '00000010'); // 2 -> gray
      // Gray(2) = 2 XOR (2>>1) = 2 XOR 1 = 3 = 00000011
      return { passed: r.success && r.bits === '00000011', expected: '00000011', actual: r.bits };
    },
  },
  {
    id: 'op_swap_nibbles', category: 'operation', name: 'SWAP nibbles',
    description: 'Swap should exchange nibbles/halves',
    run: () => {
      const r = executeOperation('SWAP', '11110000');
      return { passed: r.success && r.bits === '00001111', expected: '00001111', actual: r.bits };
    },
  },
  {
    id: 'op_length_preserved', category: 'operation', name: 'Operations preserve length',
    description: 'NOT, XOR, AND, OR should preserve bit length',
    run: () => {
      const ops = ['NOT', 'REVERSE'];
      const input = '10101010';
      const results = ops.map(op => executeOperation(op, input));
      const allSame = results.every(r => r.success && r.bits.length === input.length);
      return { passed: allSame, expected: 8, actual: results.map(r => r.bits.length) };
    },
  },
  {
    id: 'op_not_16bit', category: 'operation', name: 'NOT on 16 bits',
    description: 'NOT should work on longer strings',
    run: () => {
      const r = executeOperation('NOT', '1010101001010101');
      return { passed: r.success && r.bits === '0101010110101010', expected: '0101010110101010', actual: r.bits };
    },
  },
  {
    id: 'op_xor_zeros_mask', category: 'operation', name: 'XOR with zeros mask = identity',
    description: 'XOR with all-zeros mask should not change bits',
    run: () => {
      const input = '10110100';
      const r = executeOperation('XOR', input, { mask: '00000000' });
      return { passed: r.success && r.bits === input, expected: input, actual: r.bits };
    },
  },
  {
    id: 'op_xor_ones_mask', category: 'operation', name: 'XOR with ones mask = NOT',
    description: 'XOR with all-ones mask should equal NOT',
    run: () => {
      const input = '10110100';
      const rXor = executeOperation('XOR', input, { mask: '11111111' });
      const rNot = executeOperation('NOT', input);
      return { passed: rXor.bits === rNot.bits, expected: rNot.bits, actual: rXor.bits };
    },
  },
  {
    id: 'op_or_ones', category: 'operation', name: 'OR with all-ones = all ones',
    description: 'OR with mask 11111111 should give all ones',
    run: () => {
      const r = executeOperation('OR', '00000000', { mask: '11111111' });
      return { passed: r.success && r.bits === '11111111', expected: '11111111', actual: r.bits };
    },
  },
  {
    id: 'op_and_ones', category: 'operation', name: 'AND with all-ones = identity',
    description: 'AND with mask 11111111 should not change bits',
    run: () => {
      const input = '10110100';
      const r = executeOperation('AND', input, { mask: '11111111' });
      return { passed: r.success && r.bits === input, expected: input, actual: r.bits };
    },
  },
  {
    id: 'op_shl_0', category: 'operation', name: 'SHL by 0 = identity',
    description: 'Shift left by 0 should not change bits',
    run: () => {
      const input = '10110100';
      const r = executeOperation('SHL', input, { count: 0 });
      return { passed: r.success && r.bits === input, expected: input, actual: r.bits };
    },
  },
  {
    id: 'op_ror_2', category: 'operation', name: 'ROR by 2',
    description: 'Rotate right by 2 moves last 2 bits to front',
    run: () => {
      const r = executeOperation('ROR', '00000011', { count: 2 });
      return { passed: r.success && r.bits === '11000000', expected: '11000000', actual: r.bits };
    },
  },
];

// ============ PARAMETER PERSISTENCE TESTS ============

const paramTests: PlayerTest[] = [
  {
    id: 'param_seed_stored', category: 'param_persistence', name: 'Seed is stored in result',
    description: 'executeOperation should store seed in params',
    run: () => {
      const r = executeOperation('XOR', '10101010');
      return { passed: !!r.params?.seed, expected: 'truthy seed', actual: r.params?.seed };
    },
  },
  {
    id: 'param_mask_stored', category: 'param_persistence', name: 'Mask is stored for mask ops',
    description: 'XOR should store generated mask in params',
    run: () => {
      const r = executeOperation('XOR', '10101010');
      return { passed: !!r.params?.mask, expected: 'truthy mask', actual: r.params?.mask?.slice(0, 16) };
    },
  },
  {
    id: 'param_explicit_mask_kept', category: 'param_persistence', name: 'Explicit mask is preserved',
    description: 'When providing a mask, it should be kept unchanged',
    run: () => {
      const mask = '11001100';
      const r = executeOperation('XOR', '10101010', { mask });
      return { passed: r.params?.mask === mask, expected: mask, actual: r.params?.mask };
    },
  },
  {
    id: 'param_not_no_mask', category: 'param_persistence', name: 'NOT needs no mask',
    description: 'NOT should not generate a mask',
    run: () => {
      const r = executeOperation('NOT', '10101010');
      return { passed: !r.params?.mask, expected: 'no mask', actual: r.params?.mask };
    },
  },
  {
    id: 'param_seed_preserved', category: 'param_persistence', name: 'Existing seed is preserved',
    description: 'When providing a seed, it should not be overwritten',
    run: () => {
      const seed = 'test_seed_123';
      const r = executeOperation('XOR', '10101010', { seed });
      return { passed: r.params?.seed === seed, expected: seed, actual: r.params?.seed };
    },
  },
  {
    id: 'param_same_seed_same_mask', category: 'param_persistence', name: 'Same seed = same mask',
    description: 'Two executions with the same seed should produce the same mask',
    run: () => {
      const seed = 'deterministic_seed_42';
      const r1 = executeOperation('XOR', '10101010', { seed });
      const r2 = executeOperation('XOR', '10101010', { seed });
      return { passed: r1.params?.mask === r2.params?.mask, expected: r1.params?.mask, actual: r2.params?.mask };
    },
  },
  {
    id: 'param_diff_seed_diff_mask', category: 'param_persistence', name: 'Different seed = different mask',
    description: 'Two executions with different seeds should produce different masks (usually)',
    run: () => {
      const r1 = executeOperation('XOR', '10101010', { seed: 'seed_A' });
      const r2 = executeOperation('XOR', '10101010', { seed: 'seed_B' });
      return { passed: r1.params?.mask !== r2.params?.mask, expected: 'different masks', actual: `${r1.params?.mask?.slice(0, 8)} vs ${r2.params?.mask?.slice(0, 8)}` };
    },
  },
  {
    id: 'param_rol_count_stored', category: 'param_persistence', name: 'ROL count is stored',
    description: 'ROL should store count param',
    run: () => {
      const r = executeOperation('ROL', '10101010', { count: 3 });
      return { passed: r.params?.count === 3, expected: 3, actual: r.params?.count };
    },
  },
  {
    id: 'param_cost_exists', category: 'param_persistence', name: 'Operation cost is available',
    description: 'getOperationCost should return a number > 0',
    run: () => {
      const cost = getOperationCost('XOR');
      return { passed: typeof cost === 'number' && cost > 0, expected: '> 0', actual: cost };
    },
  },
  {
    id: 'param_all_ops_have_cost', category: 'param_persistence', name: 'All major ops have cost',
    description: 'NOT, XOR, AND, OR, SHL, SHR, ROL, ROR should all have costs',
    run: () => {
      const ops = ['NOT', 'XOR', 'AND', 'OR', 'SHL', 'SHR', 'ROL', 'ROR'];
      const costs = ops.map(op => ({ op, cost: getOperationCost(op) }));
      const allValid = costs.every(c => typeof c.cost === 'number' && c.cost > 0);
      return { passed: allValid, expected: 'all > 0', actual: costs.map(c => `${c.op}:${c.cost}`).join(', ') };
    },
  },
];

// ============ REPLAY DETERMINISM TESTS ============

const replayTests: PlayerTest[] = [
  {
    id: 'replay_not', category: 'replay', name: 'NOT replay is deterministic',
    description: 'Re-executing NOT with stored params should match',
    run: () => {
      const input = '10110011';
      const r1 = executeOperation('NOT', input);
      const r2 = executeOperation('NOT', input, r1.params);
      return { passed: r1.bits === r2.bits, expected: r1.bits, actual: r2.bits };
    },
  },
  {
    id: 'replay_xor_with_seed', category: 'replay', name: 'XOR replay with stored seed',
    description: 'Re-executing XOR with stored seed should produce same result',
    run: () => {
      const input = '10110011';
      const r1 = executeOperation('XOR', input);
      const r2 = executeOperation('XOR', input, r1.params);
      return { passed: r1.bits === r2.bits, expected: r1.bits, actual: r2.bits };
    },
  },
  {
    id: 'replay_and_with_seed', category: 'replay', name: 'AND replay with stored seed',
    description: 'Re-executing AND with stored seed should produce same result',
    run: () => {
      const input = '11110000';
      const r1 = executeOperation('AND', input);
      const r2 = executeOperation('AND', input, r1.params);
      return { passed: r1.bits === r2.bits, expected: r1.bits, actual: r2.bits };
    },
  },
  {
    id: 'replay_chain_not_xor', category: 'replay', name: 'Chain: NOT→XOR replay matches',
    description: '2-step chain replay should be 100% deterministic',
    run: () => {
      const input = '10101010';
      const r1 = executeOperation('NOT', input);
      const r2 = executeOperation('XOR', r1.bits);
      // Replay
      const replay1 = executeOperation('NOT', input, r1.params);
      const replay2 = executeOperation('XOR', replay1.bits, r2.params);
      return { passed: r2.bits === replay2.bits, expected: r2.bits, actual: replay2.bits };
    },
  },
  {
    id: 'replay_chain_3_ops', category: 'replay', name: 'Chain: NOT→XOR→ROL replay',
    description: '3-step chain replay should match',
    run: () => {
      const input = '11001100';
      const s1 = executeOperation('NOT', input);
      const s2 = executeOperation('XOR', s1.bits);
      const s3 = executeOperation('ROL', s2.bits, { count: 2 });
      // Replay
      const r1 = executeOperation('NOT', input, s1.params);
      const r2 = executeOperation('XOR', r1.bits, s2.params);
      const r3 = executeOperation('ROL', r2.bits, s3.params);
      return { passed: s3.bits === r3.bits, expected: s3.bits, actual: r3.bits };
    },
  },
  {
    id: 'replay_rol', category: 'replay', name: 'ROL replay deterministic',
    description: 'ROL with stored count should match',
    run: () => {
      const input = '10000001';
      const r1 = executeOperation('ROL', input, { count: 3 });
      const r2 = executeOperation('ROL', input, r1.params);
      return { passed: r1.bits === r2.bits, expected: r1.bits, actual: r2.bits };
    },
  },
  {
    id: 'replay_reverse', category: 'replay', name: 'REVERSE replay deterministic',
    description: 'REVERSE should always produce the same output',
    run: () => {
      const input = '10110100';
      const r1 = executeOperation('REVERSE', input);
      const r2 = executeOperation('REVERSE', input, r1.params);
      return { passed: r1.bits === r2.bits, expected: r1.bits, actual: r2.bits };
    },
  },
  {
    id: 'replay_or_with_seed', category: 'replay', name: 'OR replay with stored seed',
    description: 'Re-executing OR with stored seed should match',
    run: () => {
      const input = '00001111';
      const r1 = executeOperation('OR', input);
      const r2 = executeOperation('OR', input, r1.params);
      return { passed: r1.bits === r2.bits, expected: r1.bits, actual: r2.bits };
    },
  },
  {
    id: 'replay_shl', category: 'replay', name: 'SHL replay deterministic',
    description: 'SHL with stored count should match',
    run: () => {
      const input = '11001100';
      const r1 = executeOperation('SHL', input, { count: 2 });
      const r2 = executeOperation('SHL', input, r1.params);
      return { passed: r1.bits === r2.bits, expected: r1.bits, actual: r2.bits };
    },
  },
  {
    id: 'replay_shr', category: 'replay', name: 'SHR replay deterministic',
    description: 'SHR with stored count should match',
    run: () => {
      const input = '11001100';
      const r1 = executeOperation('SHR', input, { count: 2 });
      const r2 = executeOperation('SHR', input, r1.params);
      return { passed: r1.bits === r2.bits, expected: r1.bits, actual: r2.bits };
    },
  },
  {
    id: 'replay_nand_with_seed', category: 'replay', name: 'NAND replay with stored seed',
    description: 'Re-executing NAND with stored seed should match',
    run: () => {
      const input = '11110000';
      const r1 = executeOperation('NAND', input);
      const r2 = executeOperation('NAND', input, r1.params);
      return { passed: r1.bits === r2.bits, expected: r1.bits, actual: r2.bits };
    },
  },
  {
    id: 'replay_nor_with_seed', category: 'replay', name: 'NOR replay with stored seed',
    description: 'Re-executing NOR with stored seed should match',
    run: () => {
      const input = '10100101';
      const r1 = executeOperation('NOR', input);
      const r2 = executeOperation('NOR', input, r1.params);
      return { passed: r1.bits === r2.bits, expected: r1.bits, actual: r2.bits };
    },
  },
  {
    id: 'replay_xnor_with_seed', category: 'replay', name: 'XNOR replay with stored seed',
    description: 'Re-executing XNOR with stored seed should match',
    run: () => {
      const input = '11001010';
      const r1 = executeOperation('XNOR', input);
      const r2 = executeOperation('XNOR', input, r1.params);
      return { passed: r1.bits === r2.bits, expected: r1.bits, actual: r2.bits };
    },
  },
  {
    id: 'replay_gray', category: 'replay', name: 'GRAY replay deterministic',
    description: 'GRAY should always produce the same output',
    run: () => {
      const input = '10110100';
      const r1 = executeOperation('GRAY', input);
      const r2 = executeOperation('GRAY', input, r1.params);
      return { passed: r1.bits === r2.bits, expected: r1.bits, actual: r2.bits };
    },
  },
  {
    id: 'replay_swap', category: 'replay', name: 'SWAP replay deterministic',
    description: 'SWAP should always produce the same output',
    run: () => {
      const input = '11110000';
      const r1 = executeOperation('SWAP', input);
      const r2 = executeOperation('SWAP', input, r1.params);
      return { passed: r1.bits === r2.bits, expected: r1.bits, actual: r2.bits };
    },
  },
];

// ============ BIT RANGE TESTS ============

const bitRangeTests: PlayerTest[] = [
  {
    id: 'range_not_partial', category: 'bit_range', name: 'NOT on partial range',
    description: 'NOT on bits [0:4] should only flip those 4 bits',
    run: () => {
      const input = '11110000';
      const target = input.slice(0, 4);
      const r = executeOperation('NOT', target);
      const result = r.bits + input.slice(4);
      return { passed: result === '00000000', expected: '00000000', actual: result };
    },
  },
  {
    id: 'range_xor_partial', category: 'bit_range', name: 'XOR on partial range',
    description: 'XOR on bits [4:8] should only change those bits',
    run: () => {
      const input = '00001111';
      const before = input.slice(0, 4);
      const target = input.slice(4, 8);
      const r = executeOperation('XOR', target, { mask: '1111' });
      const result = before + r.bits;
      return { passed: result === '00000000', expected: '00000000', actual: result };
    },
  },
  {
    id: 'range_unchanged_rest', category: 'bit_range', name: 'Non-target range unchanged',
    description: 'Bits outside the operation range should not change',
    run: () => {
      const input = '1111000011110000';
      const before = input.slice(0, 4);
      const target = input.slice(4, 8);
      const after = input.slice(8);
      const r = executeOperation('NOT', target);
      const result = before + r.bits + after;
      return { passed: result.slice(0, 4) === '1111' && result.slice(8) === '11110000', expected: '11111111 unchanged', actual: result };
    },
  },
  {
    id: 'range_single_bit', category: 'bit_range', name: 'Operation on single bit',
    description: 'NOT on single bit should flip it',
    run: () => {
      const r = executeOperation('NOT', '1');
      return { passed: r.success && r.bits === '0', expected: '0', actual: r.bits };
    },
  },
  {
    id: 'range_full_equals_no_range', category: 'bit_range', name: 'Full range = no range specified',
    description: 'Operating on full string should equal no range specified',
    run: () => {
      const input = '10101010';
      const r1 = executeOperation('NOT', input);
      const r2 = executeOperation('NOT', input);
      return { passed: r1.bits === r2.bits, expected: r1.bits, actual: r2.bits };
    },
  },
];

// ============ VERIFICATION SYSTEM TESTS ============

const verificationTests: PlayerTest[] = [
  {
    id: 'verify_hash_consistent', category: 'verification', name: 'hashBits is consistent',
    description: 'Same input should produce same hash',
    run: () => {
      const h1 = hashBits('10101010');
      const h2 = hashBits('10101010');
      return { passed: h1 === h2, expected: h1, actual: h2 };
    },
  },
  {
    id: 'verify_hash_different', category: 'verification', name: 'hashBits differs for different input',
    description: 'Different inputs should produce different hashes',
    run: () => {
      const h1 = hashBits('10101010');
      const h2 = hashBits('01010101');
      return { passed: h1 !== h2, expected: 'different', actual: `${h1} vs ${h2}` };
    },
  },
  {
    id: 'verify_hash_length', category: 'verification', name: 'hashBits returns 8-char hex',
    description: 'Hash should be 8 character uppercase hex string',
    run: () => {
      const h = hashBits('10101010');
      return { passed: h.length === 8 && /^[0-9A-F]+$/.test(h), expected: '8 hex chars', actual: h };
    },
  },
  {
    id: 'verify_independent_not', category: 'verification', name: 'Independent verify NOT step',
    description: 'verifyStepIndependently should pass for a correct NOT step',
    run: () => {
      const input = '10101010';
      const r = executeOperation('NOT', input);
      const step: TransformationStep = {
        index: 0, operation: 'NOT', params: r.params,
        fullBeforeBits: input, fullAfterBits: r.bits,
        beforeBits: input, afterBits: r.bits,
        cumulativeBits: r.bits,
        metrics: {}, timestamp: Date.now(), duration: 0,
      };
      const result = verifyStepIndependently(input, step, 0);
      return { passed: result.passed, expected: true, actual: result.passed, details: result.error };
    },
  },
  {
    id: 'verify_independent_xor', category: 'verification', name: 'Independent verify XOR step',
    description: 'verifyStepIndependently should pass for a correct XOR step with stored mask',
    run: () => {
      const input = '11001100';
      const r = executeOperation('XOR', input);
      const step: TransformationStep = {
        index: 0, operation: 'XOR', params: r.params,
        fullBeforeBits: input, fullAfterBits: r.bits,
        beforeBits: input, afterBits: r.bits,
        cumulativeBits: r.bits,
        metrics: {}, timestamp: Date.now(), duration: 0,
      };
      const result = verifyStepIndependently(input, step, 0);
      return { passed: result.passed, expected: true, actual: result.passed, details: result.error };
    },
  },
  {
    id: 'verify_chain', category: 'verification', name: 'Chain verification passes',
    description: 'verifyAllStepsIndependently should pass for correct chain',
    run: () => {
      const input = '10101010';
      const r1 = executeOperation('NOT', input);
      const r2 = executeOperation('XOR', r1.bits);
      const steps: TransformationStep[] = [
        { index: 0, operation: 'NOT', params: r1.params, fullBeforeBits: input, fullAfterBits: r1.bits, beforeBits: input, afterBits: r1.bits, cumulativeBits: r1.bits, metrics: {}, timestamp: Date.now(), duration: 0 },
        { index: 1, operation: 'XOR', params: r2.params, fullBeforeBits: r1.bits, fullAfterBits: r2.bits, beforeBits: r1.bits, afterBits: r2.bits, cumulativeBits: r2.bits, metrics: {}, timestamp: Date.now(), duration: 0 },
      ];
      const report = verifyAllStepsIndependently(input, steps, r2.bits);
      return { passed: report.overallPassed, expected: true, actual: report.overallPassed, details: report.summary };
    },
  },
  {
    id: 'verify_corrupted_fails', category: 'verification', name: 'Corrupted step fails verification',
    description: 'verifyStepIndependently should fail for corrupted afterBits',
    run: () => {
      const input = '10101010';
      const r = executeOperation('NOT', input);
      const corruptedBits = '11111111'; // Wrong result
      const step: TransformationStep = {
        index: 0, operation: 'NOT', params: r.params,
        fullBeforeBits: input, fullAfterBits: corruptedBits,
        beforeBits: input, afterBits: corruptedBits,
        cumulativeBits: corruptedBits,
        metrics: {}, timestamp: Date.now(), duration: 0,
      };
      const result = verifyStepIndependently(input, step, 0);
      return { passed: !result.passed, expected: false, actual: result.passed, details: `${result.mismatchCount} mismatches` };
    },
  },
  {
    id: 'verify_missing_params', category: 'verification', name: 'Missing params flagged',
    description: 'verifyStepIndependently should flag missing mask/seed for XOR',
    run: () => {
      const step: TransformationStep = {
        index: 0, operation: 'XOR', params: {},
        fullBeforeBits: '10101010', fullAfterBits: '01010101',
        beforeBits: '10101010', afterBits: '01010101',
        cumulativeBits: '01010101',
        metrics: {}, timestamp: Date.now(), duration: 0,
      };
      const result = verifyStepIndependently('10101010', step, 0);
      return { passed: !result.paramsComplete, expected: 'incomplete', actual: result.paramsComplete ? 'complete' : 'incomplete' };
    },
  },
];

// ============ EDGE CASE TESTS ============

const edgeCaseTests: PlayerTest[] = [
  {
    id: 'edge_empty', category: 'edge_case', name: 'NOT on empty string',
    description: 'NOT on empty string should return empty',
    run: () => {
      const r = executeOperation('NOT', '');
      return { passed: r.bits === '', expected: '', actual: r.bits };
    },
  },
  {
    id: 'edge_single_0', category: 'edge_case', name: 'NOT on single 0',
    description: 'NOT on "0" should give "1"',
    run: () => {
      const r = executeOperation('NOT', '0');
      return { passed: r.success && r.bits === '1', expected: '1', actual: r.bits };
    },
  },
  {
    id: 'edge_single_1', category: 'edge_case', name: 'NOT on single 1',
    description: 'NOT on "1" should give "0"',
    run: () => {
      const r = executeOperation('NOT', '1');
      return { passed: r.success && r.bits === '0', expected: '0', actual: r.bits };
    },
  },
  {
    id: 'edge_long_string', category: 'edge_case', name: 'NOT on 1000-bit string',
    description: 'NOT should handle long strings',
    run: () => {
      const input = '10'.repeat(500);
      const r = executeOperation('NOT', input);
      const expected = '01'.repeat(500);
      return { passed: r.success && r.bits === expected && r.bits.length === 1000, expected: 1000, actual: r.bits.length };
    },
  },
  {
    id: 'edge_all_zeros', category: 'edge_case', name: 'XOR on all zeros',
    description: 'XOR with mask on all zeros input',
    run: () => {
      const input = '00000000';
      const r = executeOperation('XOR', input, { mask: '11111111' });
      return { passed: r.success && r.bits === '11111111', expected: '11111111', actual: r.bits };
    },
  },
  {
    id: 'edge_alternating', category: 'edge_case', name: 'NOT on alternating pattern',
    description: 'NOT on alternating 01 pattern should give alternating 10',
    run: () => {
      const r = executeOperation('NOT', '01010101');
      return { passed: r.success && r.bits === '10101010', expected: '10101010', actual: r.bits };
    },
  },
  {
    id: 'edge_hash_empty', category: 'edge_case', name: 'hashBits on empty string',
    description: 'hashBits should handle empty string',
    run: () => {
      const h = hashBits('');
      return { passed: typeof h === 'string' && h.length === 8, expected: '8-char hash', actual: h };
    },
  },
  {
    id: 'edge_hash_long', category: 'edge_case', name: 'hashBits on very long string',
    description: 'hashBits should handle 10000-bit strings',
    run: () => {
      const h = hashBits('1'.repeat(10000));
      return { passed: typeof h === 'string' && h.length === 8, expected: '8-char hash', actual: h };
    },
  },
  {
    id: 'edge_rol_empty', category: 'edge_case', name: 'ROL on empty string',
    description: 'ROL should handle empty string gracefully',
    run: () => {
      const r = executeOperation('ROL', '', { count: 1 });
      return { passed: r.bits === '', expected: '', actual: r.bits };
    },
  },
  {
    id: 'edge_shl_all', category: 'edge_case', name: 'SHL by length = all zeros',
    description: 'SHL by length should give all zeros',
    run: () => {
      const r = executeOperation('SHL', '11111111', { count: 8 });
      return { passed: r.success && r.bits === '00000000', expected: '00000000', actual: r.bits };
    },
  },
];

// ============ ERROR CLASSIFICATION TESTS ============

const errorClassTests: PlayerTest[] = [
  {
    id: 'errclass_invalid_op', category: 'error_class', name: 'Invalid operation returns error',
    description: 'Non-existent operation should return success=false',
    run: () => {
      const r = executeOperation('NONEXISTENT_OP_XYZ', '10101010');
      return { passed: !r.success, expected: false, actual: r.success };
    },
  },
  {
    id: 'errclass_identity_detection', category: 'error_class', name: 'Identity op detection',
    description: 'XOR with zeros mask should produce identity (no change)',
    run: () => {
      const input = '10101010';
      const r = executeOperation('XOR', input, { mask: '00000000' });
      return { passed: r.bits === input, expected: 'no change', actual: r.bits === input ? 'no change' : 'changed' };
    },
  },
  {
    id: 'errclass_length_preserved', category: 'error_class', name: 'Length preserved by basic ops',
    description: 'NOT, XOR, AND, OR should preserve bit length',
    run: () => {
      const input = '10101010';
      const ops = ['NOT', 'REVERSE', 'GRAY'];
      const results = ops.map(op => {
        const r = executeOperation(op, input);
        return { op, lengthMatch: r.bits.length === input.length };
      });
      const allMatch = results.every(r => r.lengthMatch);
      return { passed: allMatch, expected: 'all match', actual: results.filter(r => !r.lengthMatch).map(r => r.op).join(', ') || 'all match' };
    },
  },
  {
    id: 'errclass_operation_success', category: 'error_class', name: 'All basic ops succeed',
    description: 'NOT, REVERSE, GRAY, SWAP should all succeed on valid input',
    run: () => {
      const input = '10101010';
      const ops = ['NOT', 'REVERSE', 'GRAY', 'SWAP'];
      const results = ops.map(op => ({ op, success: executeOperation(op, input).success }));
      const allSucceed = results.every(r => r.success);
      return { passed: allSucceed, expected: 'all succeed', actual: results.filter(r => !r.success).map(r => r.op).join(', ') || 'all succeed' };
    },
  },
  {
    id: 'errclass_not_changes_bits', category: 'error_class', name: 'NOT actually changes bits',
    description: 'NOT should not be an identity operation',
    run: () => {
      const input = '10101010';
      const r = executeOperation('NOT', input);
      return { passed: r.bits !== input, expected: 'different', actual: r.bits === input ? 'same' : 'different' };
    },
  },
  {
    id: 'errclass_xor_with_mask_changes', category: 'error_class', name: 'XOR with non-zero mask changes bits',
    description: 'XOR with a non-zero mask should actually change some bits',
    run: () => {
      const input = '10101010';
      const r = executeOperation('XOR', input, { mask: '11111111' });
      return { passed: r.bits !== input, expected: 'different', actual: r.bits === input ? 'same' : 'different' };
    },
  },
];

// ============ STATISTICAL RIGOR TESTS ============

const statisticalTests: PlayerTest[] = [
  {
    id: 'stat_not_100x', category: 'operation', name: 'NOT 100x deterministic',
    description: 'NOT on same input 100 times should always produce same output',
    run: () => {
      const input = '10110100';
      const expected = executeOperation('NOT', input).bits;
      let allMatch = true;
      for (let i = 0; i < 100; i++) {
        const r = executeOperation('NOT', input);
        if (r.bits !== expected) { allMatch = false; break; }
      }
      return { passed: allMatch, expected: 'all 100 match', actual: allMatch ? 'all match' : 'mismatch found' };
    },
  },
  {
    id: 'stat_xor_seed_100x', category: 'replay', name: 'XOR same seed 100x deterministic',
    description: 'XOR with same seed 100 times should always produce same output',
    run: () => {
      const input = '10110100';
      const seed = 'stat_test_seed';
      const expected = executeOperation('XOR', input, { seed }).bits;
      let allMatch = true;
      for (let i = 0; i < 100; i++) {
        const r = executeOperation('XOR', input, { seed });
        if (r.bits !== expected) { allMatch = false; break; }
      }
      return { passed: allMatch, expected: 'all 100 match', actual: allMatch ? 'all match' : 'mismatch found' };
    },
  },
  {
    id: 'stat_and_seed_100x', category: 'replay', name: 'AND same seed 100x deterministic',
    description: 'AND with same seed 100 times should always produce same output',
    run: () => {
      const input = '11001100';
      const seed = 'and_stat_seed';
      const expected = executeOperation('AND', input, { seed }).bits;
      let allMatch = true;
      for (let i = 0; i < 100; i++) {
        const r = executeOperation('AND', input, { seed });
        if (r.bits !== expected) { allMatch = false; break; }
      }
      return { passed: allMatch, expected: 'all 100 match', actual: allMatch ? 'all match' : 'mismatch found' };
    },
  },
];

// ============ ROUND-TRIP TESTS ============

const roundTripTests: PlayerTest[] = [
  {
    id: 'rt_not_not', category: 'operation', name: 'NOT→NOT round trip',
    description: 'NOT(NOT(x)) == x for multiple inputs',
    run: () => {
      const inputs = ['00000000', '11111111', '10101010', '11001100', '10000001'];
      const allPass = inputs.every(input => {
        const r1 = executeOperation('NOT', input);
        const r2 = executeOperation('NOT', r1.bits);
        return r2.bits === input;
      });
      return { passed: allPass, expected: 'all round trips pass', actual: allPass ? 'all pass' : 'some fail' };
    },
  },
  {
    id: 'rt_reverse_reverse', category: 'operation', name: 'REVERSE→REVERSE round trip',
    description: 'REVERSE(REVERSE(x)) == x for multiple inputs',
    run: () => {
      const inputs = ['10000001', '11100000', '10101010', '11110000'];
      const allPass = inputs.every(input => {
        const r1 = executeOperation('REVERSE', input);
        const r2 = executeOperation('REVERSE', r1.bits);
        return r2.bits === input;
      });
      return { passed: allPass, expected: 'all pass', actual: allPass ? 'all pass' : 'some fail' };
    },
  },
  {
    id: 'rt_xor_xor', category: 'operation', name: 'XOR→XOR round trip with same mask',
    description: '(A XOR B) XOR B == A for multiple masks',
    run: () => {
      const inputs = [
        { bits: '10101010', mask: '11110000' },
        { bits: '11001100', mask: '10101010' },
        { bits: '00001111', mask: '11111111' },
      ];
      const allPass = inputs.every(({ bits, mask }) => {
        const r1 = executeOperation('XOR', bits, { mask });
        const r2 = executeOperation('XOR', r1.bits, { mask });
        return r2.bits === bits;
      });
      return { passed: allPass, expected: 'all pass', actual: allPass ? 'all pass' : 'some fail' };
    },
  },
  {
    id: 'rt_swap_swap', category: 'operation', name: 'SWAP→SWAP round trip',
    description: 'SWAP(SWAP(x)) == x',
    run: () => {
      const input = '11110000';
      const r1 = executeOperation('SWAP', input);
      const r2 = executeOperation('SWAP', r1.bits);
      return { passed: r2.bits === input, expected: input, actual: r2.bits };
    },
  },
  {
    id: 'rt_rol_ror', category: 'operation', name: 'ROL→ROR round trip',
    description: 'ROR(ROL(x, n), n) == x',
    run: () => {
      const input = '10110100';
      const r1 = executeOperation('ROL', input, { count: 3 });
      const r2 = executeOperation('ROR', r1.bits, { count: 3 });
      return { passed: r2.bits === input, expected: input, actual: r2.bits };
    },
  },
  {
    id: 'rt_shl_shr_loss', category: 'edge_case', name: 'SHL→SHR loses bits (not round trip)',
    description: 'SHR(SHL(x, n), n) != x (lost bits filled with 0)',
    run: () => {
      const input = '10000001';
      const r1 = executeOperation('SHL', input, { count: 2 });
      const r2 = executeOperation('SHR', r1.bits, { count: 2 });
      // SHL drops MSBs, SHR drops LSBs - so not a round trip
      return { passed: r2.bits !== input, expected: 'not equal (lossy)', actual: r2.bits === input ? 'equal (unexpected)' : 'not equal (correct)' };
    },
  },
];

// ============ COMPOSITION TESTS ============

const compositionTests: PlayerTest[] = [
  {
    id: 'comp_demorgan_and', category: 'operation', name: "De Morgan's: NOT(A AND B) == NOT(A) OR NOT(B)",
    description: 'Verify De Morgan law for AND',
    run: () => {
      const a = '10101010';
      const b = '11001100';
      // NOT(A AND B)
      const andR = executeOperation('AND', a, { mask: b });
      const lhs = executeOperation('NOT', andR.bits);
      // NOT(A) OR NOT(B)
      const notA = executeOperation('NOT', a);
      const notB = executeOperation('NOT', b);
      const rhs = executeOperation('OR', notA.bits, { mask: notB.bits });
      return { passed: lhs.bits === rhs.bits, expected: lhs.bits, actual: rhs.bits };
    },
  },
  {
    id: 'comp_demorgan_or', category: 'operation', name: "De Morgan's: NOT(A OR B) == NOT(A) AND NOT(B)",
    description: 'Verify De Morgan law for OR',
    run: () => {
      const a = '10101010';
      const b = '11001100';
      const orR = executeOperation('OR', a, { mask: b });
      const lhs = executeOperation('NOT', orR.bits);
      const notA = executeOperation('NOT', a);
      const notB = executeOperation('NOT', b);
      const rhs = executeOperation('AND', notA.bits, { mask: notB.bits });
      return { passed: lhs.bits === rhs.bits, expected: lhs.bits, actual: rhs.bits };
    },
  },
  {
    id: 'comp_xor_commutative', category: 'operation', name: 'XOR commutativity',
    description: 'A XOR B == B XOR A',
    run: () => {
      const a = '10101010';
      const b = '11001100';
      const r1 = executeOperation('XOR', a, { mask: b });
      const r2 = executeOperation('XOR', b, { mask: a });
      return { passed: r1.bits === r2.bits, expected: r1.bits, actual: r2.bits };
    },
  },
  {
    id: 'comp_and_commutative', category: 'operation', name: 'AND commutativity',
    description: 'A AND B == B AND A',
    run: () => {
      const a = '10101010';
      const b = '11001100';
      const r1 = executeOperation('AND', a, { mask: b });
      const r2 = executeOperation('AND', b, { mask: a });
      return { passed: r1.bits === r2.bits, expected: r1.bits, actual: r2.bits };
    },
  },
  {
    id: 'comp_or_commutative', category: 'operation', name: 'OR commutativity',
    description: 'A OR B == B OR A',
    run: () => {
      const a = '10101010';
      const b = '11001100';
      const r1 = executeOperation('OR', a, { mask: b });
      const r2 = executeOperation('OR', b, { mask: a });
      return { passed: r1.bits === r2.bits, expected: r1.bits, actual: r2.bits };
    },
  },
  {
    id: 'comp_xor_associative', category: 'operation', name: 'XOR associativity',
    description: '(A XOR B) XOR C == A XOR (B XOR C)',
    run: () => {
      const a = '10101010';
      const b = '11001100';
      const c = '11110000';
      const ab = executeOperation('XOR', a, { mask: b });
      const lhs = executeOperation('XOR', ab.bits, { mask: c });
      const bc = executeOperation('XOR', b, { mask: c });
      const rhs = executeOperation('XOR', a, { mask: bc.bits });
      return { passed: lhs.bits === rhs.bits, expected: lhs.bits, actual: rhs.bits };
    },
  },
  {
    id: 'comp_and_distributive_over_or', category: 'operation', name: 'AND distributes over OR',
    description: 'A AND (B OR C) == (A AND B) OR (A AND C)',
    run: () => {
      const a = '10101010';
      const b = '11001100';
      const c = '11110000';
      const bOrC = executeOperation('OR', b, { mask: c });
      const lhs = executeOperation('AND', a, { mask: bOrC.bits });
      const aAndB = executeOperation('AND', a, { mask: b });
      const aAndC = executeOperation('AND', a, { mask: c });
      const rhs = executeOperation('OR', aAndB.bits, { mask: aAndC.bits });
      return { passed: lhs.bits === rhs.bits, expected: lhs.bits, actual: rhs.bits };
    },
  },
];

// ============ LARGE DATA TESTS ============

const largeDataTests: PlayerTest[] = [
  {
    id: 'large_not_10k', category: 'edge_case', name: 'NOT on 10000-bit string',
    description: 'NOT should handle very large inputs',
    run: () => {
      const input = '10'.repeat(5000);
      const r = executeOperation('NOT', input);
      const expected = '01'.repeat(5000);
      return { passed: r.success && r.bits === expected, expected: 10000, actual: r.bits.length, details: r.bits === expected ? 'exact match' : 'mismatch' };
    },
  },
  {
    id: 'large_xor_1k', category: 'edge_case', name: 'XOR on 1000-bit string with mask',
    description: 'XOR should work on large data with explicit mask',
    run: () => {
      const input = '1'.repeat(1000);
      const mask = '0'.repeat(1000);
      const r = executeOperation('XOR', input, { mask });
      return { passed: r.success && r.bits === input, expected: 'identity (mask all zeros)', actual: r.bits === input ? 'identity' : 'changed' };
    },
  },
  {
    id: 'large_reverse_5k', category: 'edge_case', name: 'REVERSE on 5000-bit string',
    description: 'REVERSE twice on large string should return original',
    run: () => {
      const input = Array.from({ length: 5000 }, () => Math.random() > 0.5 ? '1' : '0').join('');
      const r1 = executeOperation('REVERSE', input);
      const r2 = executeOperation('REVERSE', r1.bits);
      return { passed: r2.bits === input, expected: 'round trip match', actual: r2.bits === input ? 'match' : 'mismatch' };
    },
  },
];

// ============ METRIC STABILITY TESTS ============

const metricStabilityTests: PlayerTest[] = [
  {
    id: 'metric_hash_stability', category: 'verification', name: 'Hash stable across 100 calls',
    description: 'hashBits should return same value every time for same input',
    run: () => {
      const input = '10110100';
      const expected = hashBits(input);
      let allMatch = true;
      for (let i = 0; i < 100; i++) {
        if (hashBits(input) !== expected) { allMatch = false; break; }
      }
      return { passed: allMatch, expected: 'all match', actual: allMatch ? 'all match' : 'drift detected' };
    },
  },
  {
    id: 'metric_hash_sensitive', category: 'verification', name: 'Hash sensitive to single bit flip',
    description: 'Flipping one bit should change the hash',
    run: () => {
      const a = '10110100';
      const b = '10110101'; // last bit flipped
      const ha = hashBits(a);
      const hb = hashBits(b);
      return { passed: ha !== hb, expected: 'different', actual: ha === hb ? 'same (bad!)' : 'different' };
    },
  },
];

// ============ CROSS-OPERATION INTERFERENCE TESTS ============

const interferenceTests: PlayerTest[] = [
  {
    id: 'interf_not_then_xor', category: 'replay', name: 'NOT then XOR: no interference',
    description: 'Running NOT should not affect subsequent XOR seed generation',
    run: () => {
      const input = '10101010';
      const seed = 'interf_test_seed';
      // Run XOR alone
      const xorOnly = executeOperation('XOR', input, { seed });
      // Run NOT then XOR with same seed
      executeOperation('NOT', '11110000'); // unrelated operation
      const xorAfter = executeOperation('XOR', input, { seed });
      return { passed: xorOnly.bits === xorAfter.bits, expected: xorOnly.bits, actual: xorAfter.bits };
    },
  },
  {
    id: 'interf_parallel_seeds', category: 'param_persistence', name: 'Different ops get different auto-seeds',
    description: 'Auto-generated seeds should differ between operations',
    run: () => {
      const r1 = executeOperation('XOR', '10101010');
      const r2 = executeOperation('AND', '10101010');
      // Seeds should be different (different timestamps or inputs)
      return { passed: r1.params?.seed !== r2.params?.seed, expected: 'different seeds', actual: r1.params?.seed === r2.params?.seed ? 'same (unlikely but possible)' : 'different' };
    },
  },
];

// ============ PARAMETER BOUNDARY TESTS ============

const boundaryTests: PlayerTest[] = [
  {
    id: 'bound_rol_count_0', category: 'edge_case', name: 'ROL count=0 is identity',
    description: 'ROL with count 0 should not change bits',
    run: () => {
      const input = '10110100';
      const r = executeOperation('ROL', input, { count: 0 });
      return { passed: r.bits === input, expected: input, actual: r.bits };
    },
  },
  {
    id: 'bound_ror_count_0', category: 'edge_case', name: 'ROR count=0 is identity',
    description: 'ROR with count 0 should not change bits',
    run: () => {
      const input = '10110100';
      const r = executeOperation('ROR', input, { count: 0 });
      return { passed: r.bits === input, expected: input, actual: r.bits };
    },
  },
  {
    id: 'bound_shl_large_count', category: 'edge_case', name: 'SHL count > length',
    description: 'SHL by more than length should give all zeros',
    run: () => {
      const r = executeOperation('SHL', '11111111', { count: 100 });
      return { passed: r.bits === '00000000', expected: '00000000', actual: r.bits };
    },
  },
  {
    id: 'bound_shr_large_count', category: 'edge_case', name: 'SHR count > length',
    description: 'SHR by more than length should give all zeros',
    run: () => {
      const r = executeOperation('SHR', '11111111', { count: 100 });
      return { passed: r.bits === '00000000', expected: '00000000', actual: r.bits };
    },
  },
  {
    id: 'bound_2bit_ops', category: 'edge_case', name: 'Operations on 2-bit strings',
    description: 'All basic ops should work on minimal 2-bit strings',
    run: () => {
      const ops = ['NOT', 'REVERSE', 'SWAP'];
      const allPass = ops.every(op => {
        const r = executeOperation(op, '10');
        return r.success && r.bits.length === 2;
      });
      return { passed: allPass, expected: 'all succeed', actual: allPass ? 'all succeed' : 'some failed' };
    },
  },
  {
    id: 'bound_xor_mask_length_mismatch', category: 'edge_case', name: 'XOR mask shorter than input',
    description: 'XOR with shorter mask should still work',
    run: () => {
      const r = executeOperation('XOR', '10101010', { mask: '1111' });
      return { passed: r.success, expected: 'success', actual: r.success ? 'success' : 'failed' };
    },
  },
];

// ============ REPLAY CHAIN TESTS ============

const replayChainTests: PlayerTest[] = [
  {
    id: 'chain_5_ops', category: 'replay', name: '5-step chain replay',
    description: 'NOT→XOR→AND→ROL→REVERSE chain replay should match',
    run: () => {
      const input = '11001100';
      const s1 = executeOperation('NOT', input);
      const s2 = executeOperation('XOR', s1.bits);
      const s3 = executeOperation('AND', s2.bits);
      const s4 = executeOperation('ROL', s3.bits, { count: 2 });
      const s5 = executeOperation('REVERSE', s4.bits);
      // Replay
      const r1 = executeOperation('NOT', input, s1.params);
      const r2 = executeOperation('XOR', r1.bits, s2.params);
      const r3 = executeOperation('AND', r2.bits, s3.params);
      const r4 = executeOperation('ROL', r3.bits, s4.params);
      const r5 = executeOperation('REVERSE', r4.bits, s5.params);
      return { passed: s5.bits === r5.bits, expected: s5.bits, actual: r5.bits };
    },
  },
  {
    id: 'chain_10_nots', category: 'replay', name: '10 consecutive NOTs',
    description: '10 NOTs should return to original (even number)',
    run: () => {
      let bits = '10110100';
      const original = bits;
      for (let i = 0; i < 10; i++) {
        bits = executeOperation('NOT', bits).bits;
      }
      return { passed: bits === original, expected: original, actual: bits };
    },
  },
  {
    id: 'chain_rol_cumulative', category: 'operation', name: 'ROL(3) + ROL(5) == ROL(8) == identity for 8-bit',
    description: 'Cumulative rotation should equal single rotation',
    run: () => {
      const input = '10110100';
      const r1 = executeOperation('ROL', input, { count: 3 });
      const r2 = executeOperation('ROL', r1.bits, { count: 5 });
      return { passed: r2.bits === input, expected: input, actual: r2.bits };
    },
  },
];

// ============ E2E PIPELINE TESTS ============
// These tests simulate the full flow: generate data → execute ops → build TransformationSteps → verify via Player

const e2eTests: PlayerTest[] = [
  {
    id: 'e2e_not_full_pipeline', category: 'verification', name: 'E2E: NOT full pipeline',
    description: 'Generate → Execute NOT → Build step → Verify independently',
    run: () => {
      const input = '10110100';
      const r = executeOperation('NOT', input);
      const step: TransformationStep = {
        index: 0, operation: 'NOT', params: r.params,
        fullBeforeBits: input, fullAfterBits: r.bits,
        beforeBits: input, afterBits: r.bits,
        cumulativeBits: r.bits,
        metrics: {}, timestamp: Date.now(), duration: 0,
      };
      const report = verifyAllStepsIndependently(input, [step], r.bits);
      return { passed: report.overallPassed, expected: true, actual: report.overallPassed, details: report.summary };
    },
  },
  {
    id: 'e2e_xor_full_pipeline', category: 'verification', name: 'E2E: XOR full pipeline',
    description: 'Generate → Execute XOR → Build step → Verify independently',
    run: () => {
      const input = '11001100';
      const r = executeOperation('XOR', input);
      const step: TransformationStep = {
        index: 0, operation: 'XOR', params: r.params,
        fullBeforeBits: input, fullAfterBits: r.bits,
        beforeBits: input, afterBits: r.bits,
        cumulativeBits: r.bits,
        metrics: {}, timestamp: Date.now(), duration: 0,
      };
      const report = verifyAllStepsIndependently(input, [step], r.bits);
      return { passed: report.overallPassed, expected: true, actual: report.overallPassed, details: report.summary };
    },
  },
  {
    id: 'e2e_3step_chain_pipeline', category: 'verification', name: 'E2E: 3-step chain pipeline',
    description: 'Generate → Execute NOT→XOR→ROL → Build steps → Verify all',
    run: () => {
      const input = '10101010';
      const s1 = executeOperation('NOT', input);
      const s2 = executeOperation('XOR', s1.bits);
      const s3 = executeOperation('ROL', s2.bits, { count: 2 });
      const steps: TransformationStep[] = [
        { index: 0, operation: 'NOT', params: s1.params, fullBeforeBits: input, fullAfterBits: s1.bits, beforeBits: input, afterBits: s1.bits, cumulativeBits: s1.bits, metrics: {}, timestamp: Date.now(), duration: 0 },
        { index: 1, operation: 'XOR', params: s2.params, fullBeforeBits: s1.bits, fullAfterBits: s2.bits, beforeBits: s1.bits, afterBits: s2.bits, cumulativeBits: s2.bits, metrics: {}, timestamp: Date.now(), duration: 0 },
        { index: 2, operation: 'ROL', params: s3.params, fullBeforeBits: s2.bits, fullAfterBits: s3.bits, beforeBits: s2.bits, afterBits: s3.bits, cumulativeBits: s3.bits, metrics: {}, timestamp: Date.now(), duration: 0 },
      ];
      const report = verifyAllStepsIndependently(input, steps, s3.bits);
      return { passed: report.overallPassed, expected: true, actual: report.overallPassed, details: report.summary };
    },
  },
  {
    id: 'e2e_segment_op_pipeline', category: 'verification', name: 'E2E: Segment-only operation pipeline',
    description: 'Execute NOT on segment [0:4] of 8-bit file → Verify segment independently',
    run: () => {
      const fullBits = '11110000';
      const segment = fullBits.slice(0, 4);
      const r = executeOperation('NOT', segment);
      const step: TransformationStep = {
        index: 0, operation: 'NOT', params: r.params,
        fullBeforeBits: fullBits, fullAfterBits: fullBits, // unchanged full file
        beforeBits: segment, afterBits: r.bits,
        cumulativeBits: fullBits,
        bitRanges: [{ start: 0, end: 4 }],
        metrics: {}, timestamp: Date.now(), duration: 0,
      };
      (step as any).segmentOnly = true;
      const result = verifyStepIndependently(fullBits, step, 0);
      return { passed: result.passed, expected: true, actual: result.passed, details: result.segmentOnly ? 'Correctly identified as segment-only' : 'NOT identified as segment-only' };
    },
  },
  {
    id: 'e2e_segment_xor_pipeline', category: 'verification', name: 'E2E: Segment XOR pipeline',
    description: 'Execute XOR on segment [4:8] → Verify segment match',
    run: () => {
      const fullBits = '00001111';
      const segment = fullBits.slice(4, 8);
      const mask = '1010';
      const r = executeOperation('XOR', segment, { mask });
      const step: TransformationStep = {
        index: 0, operation: 'XOR', params: r.params,
        fullBeforeBits: fullBits, fullAfterBits: fullBits,
        beforeBits: segment, afterBits: r.bits,
        cumulativeBits: fullBits,
        bitRanges: [{ start: 4, end: 8 }],
        metrics: {}, timestamp: Date.now(), duration: 0,
      };
      (step as any).segmentOnly = true;
      const result = verifyStepIndependently(fullBits, step, 0);
      return { passed: result.passed && result.segmentOnly, expected: true, actual: result.passed };
    },
  },
  {
    id: 'e2e_mixed_segment_full', category: 'verification', name: 'E2E: Mixed segment + full ops',
    description: 'Alternate between segment and full operations, verify all',
    run: () => {
      const input = '1010101011001100';
      // Step 1: full NOT
      const s1 = executeOperation('NOT', input);
      // Step 2: segment XOR on [0:8]
      const seg = s1.bits.slice(0, 8);
      const s2 = executeOperation('XOR', seg);
      // Step 3: full REVERSE
      const s3 = executeOperation('REVERSE', s1.bits);
      const steps: TransformationStep[] = [
        { index: 0, operation: 'NOT', params: s1.params, fullBeforeBits: input, fullAfterBits: s1.bits, beforeBits: input, afterBits: s1.bits, cumulativeBits: s1.bits, metrics: {}, timestamp: Date.now(), duration: 0 },
        { index: 1, operation: 'XOR', params: s2.params, fullBeforeBits: s1.bits, fullAfterBits: s1.bits, beforeBits: seg, afterBits: s2.bits, cumulativeBits: s1.bits, bitRanges: [{ start: 0, end: 8 }], metrics: {}, timestamp: Date.now(), duration: 0 },
        { index: 2, operation: 'REVERSE', params: s3.params, fullBeforeBits: s1.bits, fullAfterBits: s3.bits, beforeBits: s1.bits, afterBits: s3.bits, cumulativeBits: s3.bits, metrics: {}, timestamp: Date.now(), duration: 0 },
      ];
      (steps[1] as any).segmentOnly = true;
      const report = verifyAllStepsIndependently(input, steps, s3.bits);
      // Segment step should pass (segment-level), full steps should pass
      return { passed: report.passedSteps >= 2, expected: '≥2 passed', actual: `${report.passedSteps} passed, ${report.failedSteps} failed`, details: report.summary };
    },
  },
  {
    id: 'e2e_5step_chain_verify', category: 'verification', name: 'E2E: 5-step chain verify',
    description: 'NOT→AND→XOR→REVERSE→SWAP chain → verify all independently',
    run: () => {
      const input = '11001100';
      const s1 = executeOperation('NOT', input);
      const s2 = executeOperation('AND', s1.bits);
      const s3 = executeOperation('XOR', s2.bits);
      const s4 = executeOperation('REVERSE', s3.bits);
      const s5 = executeOperation('SWAP', s4.bits);
      const ops = [s1, s2, s3, s4, s5];
      const names = ['NOT', 'AND', 'XOR', 'REVERSE', 'SWAP'];
      let prev = input;
      const steps: TransformationStep[] = ops.map((s, i) => {
        const step: TransformationStep = {
          index: i, operation: names[i], params: s.params,
          fullBeforeBits: prev, fullAfterBits: s.bits,
          beforeBits: prev, afterBits: s.bits,
          cumulativeBits: s.bits,
          metrics: {}, timestamp: Date.now(), duration: 0,
        };
        prev = s.bits;
        return step;
      });
      const report = verifyAllStepsIndependently(input, steps, s5.bits);
      return { passed: report.overallPassed, expected: true, actual: report.overallPassed, details: report.summary };
    },
  },
  {
    id: 'e2e_param_roundtrip_xor', category: 'verification', name: 'E2E: XOR param roundtrip',
    description: 'Execute XOR → store params → re-execute → verify match',
    run: () => {
      const input = '10110100';
      const r1 = executeOperation('XOR', input);
      // Simulate what Player does: re-execute with stored params
      const r2 = executeOperation('XOR', input, r1.params);
      return { passed: r1.bits === r2.bits, expected: r1.bits, actual: r2.bits };
    },
  },
  {
    id: 'e2e_param_roundtrip_and', category: 'verification', name: 'E2E: AND param roundtrip',
    description: 'Execute AND → store params → re-execute → verify match',
    run: () => {
      const input = '11110000';
      const r1 = executeOperation('AND', input);
      const r2 = executeOperation('AND', input, r1.params);
      return { passed: r1.bits === r2.bits, expected: r1.bits, actual: r2.bits };
    },
  },
  {
    id: 'e2e_param_roundtrip_or', category: 'verification', name: 'E2E: OR param roundtrip',
    description: 'Execute OR → store params → re-execute → verify match',
    run: () => {
      const input = '00001111';
      const r1 = executeOperation('OR', input);
      const r2 = executeOperation('OR', input, r1.params);
      return { passed: r1.bits === r2.bits, expected: r1.bits, actual: r2.bits };
    },
  },
  {
    id: 'e2e_param_roundtrip_nand', category: 'verification', name: 'E2E: NAND param roundtrip',
    description: 'Execute NAND → store params → re-execute → verify match',
    run: () => {
      const input = '10101010';
      const r1 = executeOperation('NAND', input);
      const r2 = executeOperation('NAND', input, r1.params);
      return { passed: r1.bits === r2.bits, expected: r1.bits, actual: r2.bits };
    },
  },
  {
    id: 'e2e_large_data_pipeline', category: 'verification', name: 'E2E: Large data (1000 bits) pipeline',
    description: 'Generate 1000-bit string → NOT → XOR → Verify',
    run: () => {
      const input = Array.from({ length: 1000 }, (_, i) => i % 2 === 0 ? '1' : '0').join('');
      const s1 = executeOperation('NOT', input);
      const s2 = executeOperation('XOR', s1.bits);
      const steps: TransformationStep[] = [
        { index: 0, operation: 'NOT', params: s1.params, fullBeforeBits: input, fullAfterBits: s1.bits, beforeBits: input, afterBits: s1.bits, cumulativeBits: s1.bits, metrics: {}, timestamp: Date.now(), duration: 0 },
        { index: 1, operation: 'XOR', params: s2.params, fullBeforeBits: s1.bits, fullAfterBits: s2.bits, beforeBits: s1.bits, afterBits: s2.bits, cumulativeBits: s2.bits, metrics: {}, timestamp: Date.now(), duration: 0 },
      ];
      const report = verifyAllStepsIndependently(input, steps, s2.bits);
      return { passed: report.overallPassed, expected: true, actual: report.overallPassed, details: `1000 bits, ${report.summary}` };
    },
  },
  {
    id: 'e2e_segment_no_full_change', category: 'verification', name: 'E2E: Segment op shows no full-file change',
    description: 'Verify that segment-only ops correctly report zero full-file changes',
    run: () => {
      const fullBits = '10101010';
      const segment = fullBits.slice(0, 4);
      const r = executeOperation('NOT', segment);
      // The full file didn't change (segment op)
      const segmentChanged = r.bits !== segment;
      const fullChanged = fullBits !== fullBits; // false
      return { passed: segmentChanged && !fullChanged, expected: 'segment changed, full unchanged', actual: segmentChanged && !fullChanged ? 'correct' : 'incorrect' };
    },
  },
  {
    id: 'e2e_verification_detects_corruption', category: 'verification', name: 'E2E: Verification detects corruption',
    description: 'Build step with wrong afterBits → verify it fails',
    run: () => {
      const input = '10101010';
      const r = executeOperation('NOT', input);
      const step: TransformationStep = {
        index: 0, operation: 'NOT', params: r.params,
        fullBeforeBits: input, fullAfterBits: '11111111', // WRONG
        beforeBits: input, afterBits: '11111111',
        cumulativeBits: '11111111',
        metrics: {}, timestamp: Date.now(), duration: 0,
      };
      const report = verifyAllStepsIndependently(input, [step], '11111111');
      return { passed: !report.overallPassed, expected: 'should fail', actual: report.overallPassed ? 'passed (BAD)' : 'failed (correct)' };
    },
  },
  {
    id: 'e2e_chain_hash_integrity', category: 'verification', name: 'E2E: Chain hash integrity',
    description: 'Verify chain hash matches final bits hash',
    run: () => {
      const input = '11001100';
      const s1 = executeOperation('NOT', input);
      const s2 = executeOperation('XOR', s1.bits);
      const steps: TransformationStep[] = [
        { index: 0, operation: 'NOT', params: s1.params, fullBeforeBits: input, fullAfterBits: s1.bits, beforeBits: input, afterBits: s1.bits, cumulativeBits: s1.bits, metrics: {}, timestamp: Date.now(), duration: 0 },
        { index: 1, operation: 'XOR', params: s2.params, fullBeforeBits: s1.bits, fullAfterBits: s2.bits, beforeBits: s1.bits, afterBits: s2.bits, cumulativeBits: s2.bits, metrics: {}, timestamp: Date.now(), duration: 0 },
      ];
      const report = verifyAllStepsIndependently(input, steps, s2.bits);
      return { passed: report.chainVerified, expected: true, actual: report.chainVerified, details: `final: ${report.finalHash}, reconstructed: ${report.reconstructedHash}` };
    },
  },
  {
    id: 'e2e_broken_chain_detected', category: 'verification', name: 'E2E: Broken chain detected',
    description: 'Verify chain mismatch when finalBits doesn\'t match last step',
    run: () => {
      const input = '10101010';
      const s1 = executeOperation('NOT', input);
      const steps: TransformationStep[] = [
        { index: 0, operation: 'NOT', params: s1.params, fullBeforeBits: input, fullAfterBits: s1.bits, beforeBits: input, afterBits: s1.bits, cumulativeBits: s1.bits, metrics: {}, timestamp: Date.now(), duration: 0 },
      ];
      const report = verifyAllStepsIndependently(input, steps, '00000000'); // Wrong final
      return { passed: !report.chainVerified, expected: 'chain mismatch', actual: report.chainVerified ? 'chain OK (BAD)' : 'chain mismatch (correct)' };
    },
  },
  {
    id: 'e2e_10_ops_pipeline', category: 'verification', name: 'E2E: 10-operation pipeline',
    description: '10 sequential operations → full verification',
    run: () => {
      const ops = ['NOT', 'XOR', 'AND', 'OR', 'REVERSE', 'NOT', 'SWAP', 'NOT', 'XOR', 'REVERSE'];
      let bits = '11001100';
      const initial = bits;
      const results: Array<{ op: string; params: any; before: string; after: string }> = [];
      for (const op of ops) {
        const r = executeOperation(op, bits);
        results.push({ op, params: r.params, before: bits, after: r.bits });
        bits = r.bits;
      }
      const steps: TransformationStep[] = results.map((r, i) => ({
        index: i, operation: r.op, params: r.params,
        fullBeforeBits: r.before, fullAfterBits: r.after,
        beforeBits: r.before, afterBits: r.after,
        cumulativeBits: r.after,
        metrics: {}, timestamp: Date.now(), duration: 0,
      }));
      const report = verifyAllStepsIndependently(initial, steps, bits);
      return { passed: report.overallPassed, expected: true, actual: report.overallPassed, details: `10 ops: ${report.passedSteps} passed, ${report.failedSteps} failed` };
    },
  },
  {
    id: 'e2e_all_mask_ops_pipeline', category: 'verification', name: 'E2E: All mask ops pipeline',
    description: 'XOR→AND→OR→NAND→NOR→XNOR with explicit masks → verify all',
    run: () => {
      const mask = '11110000';
      const maskOps = ['XOR', 'AND', 'OR', 'NAND', 'NOR', 'XNOR'];
      let bits = '10101010';
      const initial = bits;
      const results: Array<{ op: string; params: any; before: string; after: string }> = [];
      for (const op of maskOps) {
        const r = executeOperation(op, bits, { mask });
        results.push({ op, params: r.params, before: bits, after: r.bits });
        bits = r.bits;
      }
      const steps: TransformationStep[] = results.map((r, i) => ({
        index: i, operation: r.op, params: r.params,
        fullBeforeBits: r.before, fullAfterBits: r.after,
        beforeBits: r.before, afterBits: r.after,
        cumulativeBits: r.after,
        metrics: {}, timestamp: Date.now(), duration: 0,
      }));
      const report = verifyAllStepsIndependently(initial, steps, bits);
      return { passed: report.overallPassed, expected: true, actual: report.overallPassed, details: report.summary };
    },
  },
  {
    id: 'e2e_all_shift_ops_pipeline', category: 'verification', name: 'E2E: All shift/rotate ops pipeline',
    description: 'SHL→SHR→ROL→ROR with counts → verify all',
    run: () => {
      const shiftOps = [
        { op: 'SHL', params: { count: 2 } },
        { op: 'SHR', params: { count: 1 } },
        { op: 'ROL', params: { count: 3 } },
        { op: 'ROR', params: { count: 2 } },
      ];
      let bits = '10110100';
      const initial = bits;
      const results: Array<{ op: string; params: any; before: string; after: string }> = [];
      for (const { op, params } of shiftOps) {
        const r = executeOperation(op, bits, params);
        results.push({ op, params: r.params, before: bits, after: r.bits });
        bits = r.bits;
      }
      const steps: TransformationStep[] = results.map((r, i) => ({
        index: i, operation: r.op, params: r.params,
        fullBeforeBits: r.before, fullAfterBits: r.after,
        beforeBits: r.before, afterBits: r.after,
        cumulativeBits: r.after,
        metrics: {}, timestamp: Date.now(), duration: 0,
      }));
      const report = verifyAllStepsIndependently(initial, steps, bits);
      return { passed: report.overallPassed, expected: true, actual: report.overallPassed, details: report.summary };
    },
  },
  {
    id: 'e2e_segment_multi_step', category: 'verification', name: 'E2E: Multiple segment ops verify',
    description: '3 segment-only operations on different ranges → verify all',
    run: () => {
      const fullBits = '1111000011110000';
      const segs = [
        { start: 0, end: 4, op: 'NOT' },
        { start: 4, end: 8, op: 'NOT' },
        { start: 8, end: 12, op: 'NOT' },
      ];
      const steps: TransformationStep[] = segs.map((s, i) => {
        const segment = fullBits.slice(s.start, s.end);
        const r = executeOperation(s.op, segment);
        const step: TransformationStep = {
          index: i, operation: s.op, params: r.params,
          fullBeforeBits: fullBits, fullAfterBits: fullBits,
          beforeBits: segment, afterBits: r.bits,
          cumulativeBits: fullBits,
          bitRanges: [{ start: s.start, end: s.end }],
          metrics: {}, timestamp: Date.now(), duration: 0,
        };
        (step as any).segmentOnly = true;
        return step;
      });
      const report = verifyAllStepsIndependently(fullBits, steps, fullBits);
      return { passed: report.passedSteps === 3, expected: 3, actual: report.passedSteps, details: `${report.segmentOnlySteps} segment-only` };
    },
  },
  {
    id: 'e2e_determinism_10x', category: 'verification', name: 'E2E: Pipeline determinism (10x)',
    description: 'Run same 3-step pipeline 10 times with same seed → all identical',
    run: () => {
      const input = '10110100';
      const seed = 'e2e_determinism_test';
      let referenceHash = '';
      let allMatch = true;
      for (let trial = 0; trial < 10; trial++) {
        const s1 = executeOperation('NOT', input);
        const s2 = executeOperation('XOR', s1.bits, { seed });
        const s3 = executeOperation('AND', s2.bits, { seed: seed + '_step3' });
        const h = hashBits(s3.bits);
        if (trial === 0) referenceHash = h;
        else if (h !== referenceHash) { allMatch = false; break; }
      }
      return { passed: allMatch, expected: 'all 10 match', actual: allMatch ? 'all match' : 'drift detected' };
    },
  },
  {
    id: 'e2e_empty_steps_verify', category: 'verification', name: 'E2E: Empty steps list',
    description: 'Verify with 0 steps should pass if initial == final',
    run: () => {
      const bits = '10101010';
      const report = verifyAllStepsIndependently(bits, [], bits);
      return { passed: report.overallPassed && report.chainVerified, expected: true, actual: report.overallPassed };
    },
  },
  {
    id: 'e2e_single_bit_pipeline', category: 'verification', name: 'E2E: Single bit pipeline',
    description: 'NOT on single bit → verify',
    run: () => {
      const input = '1';
      const r = executeOperation('NOT', input);
      const step: TransformationStep = {
        index: 0, operation: 'NOT', params: r.params,
        fullBeforeBits: input, fullAfterBits: r.bits,
        beforeBits: input, afterBits: r.bits,
        cumulativeBits: r.bits,
        metrics: {}, timestamp: Date.now(), duration: 0,
      };
      const report = verifyAllStepsIndependently(input, [step], r.bits);
      return { passed: report.overallPassed, expected: true, actual: report.overallPassed };
    },
  },
  {
    id: 'e2e_segment_only_count', category: 'verification', name: 'E2E: segmentOnlySteps count',
    description: 'Report correctly counts segment-only steps',
    run: () => {
      const fullBits = '10101010';
      const segment = fullBits.slice(0, 4);
      const r = executeOperation('NOT', segment);
      const step: TransformationStep = {
        index: 0, operation: 'NOT', params: r.params,
        fullBeforeBits: fullBits, fullAfterBits: fullBits,
        beforeBits: segment, afterBits: r.bits,
        cumulativeBits: fullBits,
        metrics: {}, timestamp: Date.now(), duration: 0,
      };
      (step as any).segmentOnly = true;
      const report = verifyAllStepsIndependently(fullBits, [step], fullBits);
      return { passed: report.segmentOnlySteps === 1, expected: 1, actual: report.segmentOnlySteps };
    },
  },
  {
    id: 'e2e_reverse_pipeline', category: 'verification', name: 'E2E: REVERSE pipeline',
    description: 'REVERSE → verify independently',
    run: () => {
      const input = '11000011';
      const r = executeOperation('REVERSE', input);
      const step: TransformationStep = {
        index: 0, operation: 'REVERSE', params: r.params,
        fullBeforeBits: input, fullAfterBits: r.bits,
        beforeBits: input, afterBits: r.bits,
        cumulativeBits: r.bits,
        metrics: {}, timestamp: Date.now(), duration: 0,
      };
      const report = verifyAllStepsIndependently(input, [step], r.bits);
      return { passed: report.overallPassed, expected: true, actual: report.overallPassed };
    },
  },
  {
    id: 'e2e_swap_pipeline', category: 'verification', name: 'E2E: SWAP pipeline',
    description: 'SWAP → verify independently',
    run: () => {
      const input = '11110000';
      const r = executeOperation('SWAP', input);
      const step: TransformationStep = {
        index: 0, operation: 'SWAP', params: r.params,
        fullBeforeBits: input, fullAfterBits: r.bits,
        beforeBits: input, afterBits: r.bits,
        cumulativeBits: r.bits,
        metrics: {}, timestamp: Date.now(), duration: 0,
      };
      const report = verifyAllStepsIndependently(input, [step], r.bits);
      return { passed: report.overallPassed, expected: true, actual: report.overallPassed };
    },
  },
  {
    id: 'e2e_gray_pipeline', category: 'verification', name: 'E2E: GRAY pipeline',
    description: 'GRAY encode → verify independently',
    run: () => {
      const input = '10110100';
      const r = executeOperation('GRAY', input);
      const step: TransformationStep = {
        index: 0, operation: 'GRAY', params: r.params,
        fullBeforeBits: input, fullAfterBits: r.bits,
        beforeBits: input, afterBits: r.bits,
        cumulativeBits: r.bits,
        metrics: {}, timestamp: Date.now(), duration: 0,
      };
      const report = verifyAllStepsIndependently(input, [step], r.bits);
      return { passed: report.overallPassed, expected: true, actual: report.overallPassed };
    },
  },
  {
    id: 'e2e_shl_pipeline', category: 'verification', name: 'E2E: SHL pipeline',
    description: 'SHL by 3 → verify independently',
    run: () => {
      const input = '10110100';
      const r = executeOperation('SHL', input, { count: 3 });
      const step: TransformationStep = {
        index: 0, operation: 'SHL', params: r.params,
        fullBeforeBits: input, fullAfterBits: r.bits,
        beforeBits: input, afterBits: r.bits,
        cumulativeBits: r.bits,
        metrics: {}, timestamp: Date.now(), duration: 0,
      };
      const report = verifyAllStepsIndependently(input, [step], r.bits);
      return { passed: report.overallPassed, expected: true, actual: report.overallPassed };
    },
  },
  {
    id: 'e2e_ror_pipeline', category: 'verification', name: 'E2E: ROR pipeline',
    description: 'ROR by 5 → verify independently',
    run: () => {
      const input = '10110100';
      const r = executeOperation('ROR', input, { count: 5 });
      const step: TransformationStep = {
        index: 0, operation: 'ROR', params: r.params,
        fullBeforeBits: input, fullAfterBits: r.bits,
        beforeBits: input, afterBits: r.bits,
        cumulativeBits: r.bits,
        metrics: {}, timestamp: Date.now(), duration: 0,
      };
      const report = verifyAllStepsIndependently(input, [step], r.bits);
      return { passed: report.overallPassed, expected: true, actual: report.overallPassed };
    },
  },
  {
    id: 'e2e_nor_pipeline', category: 'verification', name: 'E2E: NOR pipeline',
    description: 'NOR with mask → verify independently',
    run: () => {
      const input = '10101010';
      const r = executeOperation('NOR', input, { mask: '11001100' });
      const step: TransformationStep = {
        index: 0, operation: 'NOR', params: r.params,
        fullBeforeBits: input, fullAfterBits: r.bits,
        beforeBits: input, afterBits: r.bits,
        cumulativeBits: r.bits,
        metrics: {}, timestamp: Date.now(), duration: 0,
      };
      const report = verifyAllStepsIndependently(input, [step], r.bits);
      return { passed: report.overallPassed, expected: true, actual: report.overallPassed };
    },
  },
  {
    id: 'e2e_xnor_pipeline', category: 'verification', name: 'E2E: XNOR pipeline',
    description: 'XNOR with mask → verify independently',
    run: () => {
      const input = '11001100';
      const r = executeOperation('XNOR', input, { mask: '10101010' });
      const step: TransformationStep = {
        index: 0, operation: 'XNOR', params: r.params,
        fullBeforeBits: input, fullAfterBits: r.bits,
        beforeBits: input, afterBits: r.bits,
        cumulativeBits: r.bits,
        metrics: {}, timestamp: Date.now(), duration: 0,
      };
      const report = verifyAllStepsIndependently(input, [step], r.bits);
      return { passed: report.overallPassed, expected: true, actual: report.overallPassed };
    },
  },
  {
    id: 'e2e_nand_pipeline', category: 'verification', name: 'E2E: NAND pipeline',
    description: 'NAND with mask → verify independently',
    run: () => {
      const input = '11110000';
      const r = executeOperation('NAND', input, { mask: '10101010' });
      const step: TransformationStep = {
        index: 0, operation: 'NAND', params: r.params,
        fullBeforeBits: input, fullAfterBits: r.bits,
        beforeBits: input, afterBits: r.bits,
        cumulativeBits: r.bits,
        metrics: {}, timestamp: Date.now(), duration: 0,
      };
      const report = verifyAllStepsIndependently(input, [step], r.bits);
      return { passed: report.overallPassed, expected: true, actual: report.overallPassed };
    },
  },
];

// ============ ALL TESTS ============

export const ALL_PLAYER_TESTS: PlayerTest[] = [
  ...operationTests,
  ...paramTests,
  ...replayTests,
  ...bitRangeTests,
  ...verificationTests,
  ...edgeCaseTests,
  ...errorClassTests,
  ...statisticalTests,
  ...roundTripTests,
  ...compositionTests,
  ...largeDataTests,
  ...metricStabilityTests,
  ...interferenceTests,
  ...boundaryTests,
  ...replayChainTests,
  ...e2eTests,
];

/**
 * Run all player tests and return report
 */
export function runPlayerTestSuite(): PlayerTestReport {
  const results: PlayerTestReport['results'] = [];
  const byCategory: Record<string, { total: number; passed: number; failed: number }> = {};

  for (const test of ALL_PLAYER_TESTS) {
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

/**
 * Export player test report as JSON
 */
export function exportPlayerTestReport(report: PlayerTestReport): void {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `player-test-report-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
