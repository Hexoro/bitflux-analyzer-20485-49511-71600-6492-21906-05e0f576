/**
 * Implementation Registry - Tracks all operation and metric implementations
 * Provides source code viewing, implementation status, and test vectors
 */

import { EXTENDED_METRICS, EXTENDED_OPERATIONS } from './expandedPresets';
import { predefinedManager } from './predefinedManager';
import { COMPLETE_OPERATION_TEST_VECTORS, COMPLETE_METRIC_TEST_VECTORS } from './testVectorsComplete';

export interface TestVector {
  input: string;
  expected: string | number;
  params?: Record<string, any>;
  description?: string;
}

export interface ImplementationInfo {
  id: string;
  name: string;
  category: string;
  implemented: boolean;
  hasBuiltIn: boolean;
  hasCodeBased: boolean;
  hasCustom: boolean;
  sourceCode?: string;
  testVectors: TestVector[];
}

// ============= OPERATION TEST VECTORS =============
export const OPERATION_TEST_VECTORS: Record<string, TestVector[]> = {
  // Logic Gates
  NOT: [
    { input: '10101010', expected: '01010101', description: 'Invert all bits' },
    { input: '00000000', expected: '11111111', description: 'All zeros to ones' },
    { input: '11111111', expected: '00000000', description: 'All ones to zeros' },
  ],
  AND: [
    { input: '10101010', expected: '10101010', params: { mask: '11111111' }, description: 'AND with all ones' },
    { input: '10101010', expected: '00000000', params: { mask: '00000000' }, description: 'AND with all zeros' },
    { input: '11110000', expected: '11000000', params: { mask: '11001100' }, description: 'AND with pattern' },
  ],
  OR: [
    { input: '10100000', expected: '10101010', params: { mask: '00001010' }, description: 'OR with pattern' },
    { input: '00000000', expected: '11111111', params: { mask: '11111111' }, description: 'OR with all ones' },
  ],
  XOR: [
    { input: '10101010', expected: '01010101', params: { mask: '11111111' }, description: 'XOR flip all' },
    { input: '10101010', expected: '10101010', params: { mask: '00000000' }, description: 'XOR with zeros' },
  ],
  NAND: [
    { input: '11111111', expected: '00000000', params: { mask: '11111111' }, description: 'NAND of all ones' },
    { input: '10101010', expected: '11111111', params: { mask: '00000000' }, description: 'NAND with zeros' },
  ],
  NOR: [
    { input: '00000000', expected: '00000000', params: { mask: '11111111' }, description: 'NOR with ones' },
    { input: '00000000', expected: '11111111', params: { mask: '00000000' }, description: 'NOR of zeros' },
  ],
  XNOR: [
    { input: '10101010', expected: '10101010', params: { mask: '00000000' }, description: 'XNOR with zeros' },
    { input: '10101010', expected: '01010101', params: { mask: '00000000' }, description: 'XNOR pattern' },
  ],
  IMPLY: [
    { input: '10000000', expected: '11111111', params: { mask: '01111111' }, description: 'A implies B' },
  ],
  BUFFER: [
    { input: '10101010', expected: '10101010', description: 'Identity operation' },
  ],

  // Shifts
  SHL: [
    { input: '10101010', expected: '01010100', params: { count: 1 }, description: 'Shift left 1' },
    { input: '11110000', expected: '11000000', params: { count: 2 }, description: 'Shift left 2' },
    { input: '10000000', expected: '00000000', params: { count: 8 }, description: 'Shift out all bits' },
  ],
  SHR: [
    { input: '10101010', expected: '01010101', params: { count: 1 }, description: 'Shift right 1' },
    { input: '11110000', expected: '00111100', params: { count: 2 }, description: 'Shift right 2' },
  ],
  ROL: [
    { input: '10000001', expected: '00000011', params: { count: 1 }, description: 'Rotate left 1' },
    { input: '11000000', expected: '00000011', params: { count: 2 }, description: 'Rotate left 2' },
  ],
  ROR: [
    { input: '10000001', expected: '11000000', params: { count: 1 }, description: 'Rotate right 1' },
    { input: '00000011', expected: '11000000', params: { count: 2 }, description: 'Rotate right 2' },
  ],
  ASHR: [
    { input: '10000000', expected: '11000000', params: { count: 1 }, description: 'Arithmetic shift preserves sign' },
    { input: '01000000', expected: '00100000', params: { count: 1 }, description: 'Positive stays positive' },
  ],

  // Bit Manipulation
  REVERSE: [
    { input: '10000001', expected: '10000001', description: 'Palindrome unchanged' },
    { input: '11110000', expected: '00001111', description: 'Reverse nibbles' },
  ],
  BSET: [
    { input: '00000000', expected: '10000000', params: { position: 0 }, description: 'Set first bit' },
    { input: '00000000', expected: '00000001', params: { position: 7 }, description: 'Set last bit' },
  ],
  BCLR: [
    { input: '11111111', expected: '01111111', params: { position: 0 }, description: 'Clear first bit' },
  ],
  BTOG: [
    { input: '10000000', expected: '00000000', params: { position: 0 }, description: 'Toggle first bit off' },
    { input: '00000000', expected: '10000000', params: { position: 0 }, description: 'Toggle first bit on' },
  ],

  // Encoding
  GRAY: [
    { input: '0000', expected: '0000', params: { direction: 'encode' }, description: 'Zero stays zero' },
    { input: '0001', expected: '0001', params: { direction: 'encode' }, description: '1 encodes to 1' },
    { input: '0010', expected: '0011', params: { direction: 'encode' }, description: '2 encodes to 3' },
    { input: '0011', expected: '0010', params: { direction: 'encode' }, description: '3 encodes to 2' },
  ],
  MANCHESTER: [
    { input: '1010', expected: '1001', description: 'Manchester encode pattern' },
  ],
  DIFF: [
    { input: '11110000', expected: '10001000', description: 'Differential encode' },
  ],

  // Arithmetic
  INC: [
    { input: '00000000', expected: '00000001', description: 'Increment zero' },
    { input: '00000001', expected: '00000010', description: 'Increment one' },
    { input: '11111111', expected: '00000000', description: 'Increment overflow' },
  ],
  DEC: [
    { input: '00000001', expected: '00000000', description: 'Decrement one' },
    { input: '00000010', expected: '00000001', description: 'Decrement two' },
  ],
  NEG: [
    { input: '00000001', expected: '11111111', description: 'Negate 1' },
    { input: '11111111', expected: '00000001', description: 'Negate -1' },
  ],
  POPCNT: [
    { input: '11111111', expected: '00001000', description: 'Count 8 ones' },
    { input: '10101010', expected: '00000100', description: 'Count 4 ones' },
    { input: '00000000', expected: '00000000', description: 'Count zero ones' },
  ],
  CLZ: [
    { input: '00001111', expected: '00000100', description: '4 leading zeros' },
    { input: '10000000', expected: '00000000', description: '0 leading zeros' },
    { input: '00000000', expected: '00001000', description: '8 leading zeros' },
  ],
  CTZ: [
    { input: '11110000', expected: '00000100', description: '4 trailing zeros' },
    { input: '00000001', expected: '00000000', description: '0 trailing zeros' },
  ],

  // Byte operations
  BSWAP: [
    { input: '1111111100000000', expected: '0000000011111111', description: 'Swap 2 bytes' },
  ],
  NIBSWAP: [
    { input: '11110000', expected: '00001111', description: 'Swap nibbles in byte' },
  ],

  // Checksums
  CRC8: [
    { input: '11111111', expected: '00000000', description: 'CRC-8 of 0xFF' },
  ],

  // Shuffle
  SHUFFLE: [
    { input: '11110000', expected: '11110000', description: 'Deterministic shuffle' },
  ],
  UNSHUFFLE: [
    { input: '11110000', expected: '11110000', description: 'Reverse shuffle' },
  ],
};

// ============= METRIC TEST VECTORS =============
export const METRIC_TEST_VECTORS: Record<string, TestVector[]> = {
  entropy: [
    { input: '10101010', expected: 1.0, description: 'Max entropy for balanced' },
    { input: '00000000', expected: 0.0, description: 'Zero entropy for uniform' },
    { input: '11111111', expected: 0.0, description: 'Zero entropy for all ones' },
  ],
  hamming_weight: [
    { input: '11111111', expected: 8, description: '8 ones' },
    { input: '00000000', expected: 0, description: '0 ones' },
    { input: '10101010', expected: 4, description: '4 ones' },
  ],
  balance: [
    { input: '10101010', expected: 0.5, description: 'Perfectly balanced' },
    { input: '11111111', expected: 1.0, description: 'All ones' },
    { input: '00000000', expected: 0.0, description: 'All zeros' },
  ],
  transition_count: [
    { input: '10101010', expected: 7, description: 'Max transitions' },
    { input: '11110000', expected: 1, description: 'Single transition' },
    { input: '00000000', expected: 0, description: 'No transitions' },
  ],
  run_length_avg: [
    { input: '11110000', expected: 4.0, description: 'Two runs of 4' },
    { input: '10101010', expected: 1.0, description: 'All single-bit runs' },
  ],
  longest_run_ones: [
    { input: '00111110', expected: 5, description: '5 consecutive ones' },
    { input: '10101010', expected: 1, description: 'Max 1 consecutive' },
  ],
  longest_run_zeros: [
    { input: '11000001', expected: 5, description: '5 consecutive zeros' },
  ],
  popcount: [
    { input: '11111111', expected: 8, description: '8 bits set' },
    { input: '10101010', expected: 4, description: '4 bits set' },
  ],
  parity: [
    { input: '11111111', expected: 0, description: 'Even parity (8 ones)' },
    { input: '11111110', expected: 1, description: 'Odd parity (7 ones)' },
  ],
  leading_zeros: [
    { input: '00001111', expected: 4, description: '4 leading zeros' },
    { input: '10000000', expected: 0, description: 'No leading zeros' },
  ],
  trailing_zeros: [
    { input: '11110000', expected: 4, description: '4 trailing zeros' },
    { input: '00000001', expected: 0, description: 'No trailing zeros' },
  ],
  toggle_rate: [
    { input: '10101010', expected: 1.0, description: 'Toggle every bit' },
    { input: '11110000', expected: 0.142857, description: 'Single toggle' },
  ],
  rise_count: [
    { input: '01010101', expected: 4, description: '4 rising edges' },
  ],
  fall_count: [
    { input: '10101010', expected: 4, description: '4 falling edges' },
  ],
  symmetry_index: [
    { input: '10000001', expected: 1.0, description: 'Perfect symmetry' },
    { input: '11110000', expected: 0.0, description: 'No symmetry' },
  ],
  byte_alignment: [
    { input: '10101010', expected: 1, description: '8 bits = aligned' },
    { input: '1010101', expected: 0, description: '7 bits = not aligned' },
  ],
  min_entropy: [
    { input: '10101010', expected: 1.0, description: 'Balanced min entropy' },
  ],
  chi_square: [
    { input: '10101010', expected: 0.0, description: 'Perfect balance = 0 chi-square' },
  ],
  runs_test: [
    { input: '10101010', expected: 8, description: '8 runs' },
    { input: '11110000', expected: 2, description: '2 runs' },
  ],
  monobit_test: [
    { input: '10101010', expected: 0.0, description: 'Balanced = 0 statistic' },
  ],
  unique_ngrams_2: [
    { input: '10101010', expected: 2, description: '01 and 10 patterns' },
  ],
  unique_ngrams_4: [
    { input: '10101010', expected: 2, description: '1010 and 0101 patterns' },
  ],
};

/**
 * Get implementation status for an operation
 */
export function getOperationImplementationInfo(operationId: string): ImplementationInfo {
  const opDef = predefinedManager.getOperation(operationId);
  const hasBuiltIn = hasBuiltInOperation(operationId);
  const hasCodeBased = !!(opDef?.isCodeBased && opDef.code);
  
  return {
    id: operationId,
    name: opDef?.name || operationId,
    category: opDef?.category || 'Unknown',
    implemented: hasBuiltIn || hasCodeBased,
    hasBuiltIn,
    hasCodeBased,
    hasCustom: false, // Would need to check customOperations
    sourceCode: hasBuiltIn ? getOperationSourceCode(operationId) : opDef?.code,
    // Use complete test vectors if available, fallback to basic
    testVectors: COMPLETE_OPERATION_TEST_VECTORS[operationId] || OPERATION_TEST_VECTORS[operationId] || [],
  };
}

/**
 * Get implementation status for a metric
 */
export function getMetricImplementationInfo(metricId: string): ImplementationInfo {
  const metricDef = predefinedManager.getMetric(metricId);
  const hasBuiltIn = hasBuiltInMetric(metricId);
  const hasCodeBased = !!(metricDef?.isCodeBased && metricDef.code);
  
  return {
    id: metricId,
    name: metricDef?.name || metricId,
    category: metricDef?.category || 'Unknown',
    implemented: hasBuiltIn || hasCodeBased,
    hasBuiltIn,
    hasCodeBased,
    hasCustom: false,
    sourceCode: hasBuiltIn ? getMetricSourceCode(metricId) : metricDef?.code,
    // Use complete test vectors if available, fallback to basic
    testVectors: COMPLETE_METRIC_TEST_VECTORS[metricId] || METRIC_TEST_VECTORS[metricId] || [],
  };
}

/**
 * Check if operation has built-in implementation
 */
function hasBuiltInOperation(operationId: string): boolean {
  const builtIns = [
    'NOT', 'AND', 'OR', 'XOR', 'NAND', 'NOR', 'XNOR',
    'IMPLY', 'NIMPLY', 'CONVERSE', 'MUX', 'MAJ', 'ODD', 'EVEN', 'BUFFER',
    'SHL', 'SHR', 'ASHL', 'ASHR', 'ASR', 'ASL', 'ROL', 'ROR', 'RCL', 'RCR', 'FUNNEL',
    'BSWAP', 'WSWAP', 'NIBSWAP', 'BITREV', 'BYTEREV',
    'INSERT', 'DELETE', 'REPLACE', 'MOVE', 'TRUNCATE', 'APPEND',
    'BSET', 'BCLR', 'BTOG', 'BTEST', 'BEXTRACT', 'BINSERT', 'BDEPOSIT', 'BGATHER',
    'INTERLEAVE', 'DEINTERLEAVE', 'SHUFFLE', 'UNSHUFFLE',
    'PAD', 'PAD_LEFT', 'PAD_RIGHT', 'PACK', 'UNPACK',
    'GRAY', 'ENDIAN', 'REVERSE',
    'MANCHESTER', 'DEMANCHESTER', 'NRZI', 'DENRZI', 'DIFF', 'DEDIFF',
    'RLE', 'DERLE', 'DELTA', 'DEDELTA', 'ZIGZAG', 'DEZIGZAG', 'RLL', 'HAMMING_ENC', 'BASE64_ENC',
    'ADD', 'SUB', 'MUL', 'DIV', 'MOD', 'ABS', 'SAT_ADD', 'SAT_SUB', 'INC', 'DEC', 'NEG',
    'POPCNT', 'CLZ', 'CTZ', 'CLAMP', 'WRAP',
    'SWAP', 'COPY', 'FILL', 'EXTEND', 'CONCAT', 'SPLICE', 'SPLIT', 'MERGE',
    'PREFIX', 'SUFFIX', 'REPEAT', 'MIRROR', 'SCATTER', 'GATHER',
    'CHECKSUM8', 'CRC8', 'CRC16', 'CRC32', 'FLETCHER', 'ADLER', 'LUHN',
    'BWT', 'MTF', 'IMTF', 'IBWT', 'LFSR',
    'SBOX', 'PERMUTE', 'FEISTEL', 'MIXCOL', 'SHIFTROW',
    'DEMUX', 'BEXTR', 'PDEP', 'PEXT', 'BLEND',
  ];
  return builtIns.includes(operationId);
}

/**
 * Check if metric has built-in implementation
 */
function hasBuiltInMetric(metricId: string): boolean {
  const builtIns = [
    'entropy', 'hamming_weight', 'balance', 'transition_count', 'run_length_avg',
    'compression_ratio', 'chi_square', 'autocorrelation', 'variance', 'standard_deviation',
    'skewness', 'kurtosis', 'serial_correlation', 'transition_rate', 'transition_entropy',
    'pattern_diversity', 'ideality', 'kolmogorov_estimate', 'bit_density',
    'longest_run_ones', 'longest_run_zeros', 'runs_count', 'bias_percentage',
    'block_entropy_8', 'block_entropy_16', 'conditional_entropy', 'mutual_info',
    'joint_entropy', 'min_entropy', 'lempel_ziv', 'spectral_flatness',
    'leading_zeros', 'trailing_zeros', 'popcount', 'parity',
    'rise_count', 'fall_count', 'toggle_rate', 'unique_ngrams_8',
    'symmetry_index', 'byte_alignment', 'word_alignment',
    'std_dev', 'median', 'mode', 'range', 'iqr', 'renyi_entropy',
    'monobit_test', 'runs_test', 'poker_test', 'longest_repeat', 'periodicity',
    'unique_ngrams_2', 'unique_ngrams_4', 'rise_fall_ratio', 'max_stable_run',
    'avg_stable_run', 'byte_entropy', 'nibble_entropy', 'bit_complexity',
    'hamming_distance_self', 'autocorr_lag1', 'autocorr_lag2',
    'mad', 'cv', 'lz77_estimate', 'rle_ratio', 'huffman_estimate',
    'block_regularity', 'segment_count', 'serial_test', 'apen', 'sample_entropy',
    'dominant_freq', 'spectral_centroid', 'bandwidth', 'block_entropy_overlapping',
    't_complexity', 'bit_reversal_distance', 'complement_distance',
    'cross_entropy', 'kl_divergence', 'collision_entropy',
    'header_size', 'footer_size', 'fractal_dimension', 'logical_depth',
    'effective_complexity', 'spectral_test', 'block_entropy',
    'time_stamp', 'execution_id',
  ];
  return builtIns.includes(metricId);
}

/**
 * Get source code for an operation
 */
function getOperationSourceCode(operationId: string): string {
  const sourceMap: Record<string, string> = {
    NOT: `(bits) => bits.split('').map(b => b === '0' ? '1' : '0').join('')`,
    AND: `(bits, p) => {
  const mask = p.mask || '10'.repeat(bits.length).slice(0, bits.length);
  return bits.split('').map((b, i) => (b === '1' && mask[i % mask.length] === '1') ? '1' : '0').join('');
}`,
    OR: `(bits, p) => {
  const mask = p.mask || '01'.repeat(bits.length).slice(0, bits.length);
  return bits.split('').map((b, i) => (b === '1' || mask[i % mask.length] === '1') ? '1' : '0').join('');
}`,
    XOR: `(bits, p) => {
  const mask = p.mask || '10'.repeat(bits.length).slice(0, bits.length);
  return bits.split('').map((b, i) => b !== mask[i % mask.length] ? '1' : '0').join('');
}`,
    NAND: `(bits, p) => {
  const mask = p.mask || '10'.repeat(bits.length).slice(0, bits.length);
  return bits.split('').map((b, i) => (b === '1' && mask[i % mask.length] === '1') ? '0' : '1').join('');
}`,
    NOR: `(bits, p) => {
  const mask = p.mask || '01'.repeat(bits.length).slice(0, bits.length);
  return bits.split('').map((b, i) => (b === '1' || mask[i % mask.length] === '1') ? '0' : '1').join('');
}`,
    XNOR: `(bits, p) => {
  const mask = p.mask || '10'.repeat(bits.length).slice(0, bits.length);
  return bits.split('').map((b, i) => b === mask[i % mask.length] ? '1' : '0').join('');
}`,
    IMPLY: `(bits, p) => {
  const mask = p.mask || '10'.repeat(bits.length).slice(0, bits.length);
  return bits.split('').map((b, i) => (b === '0' || mask[i % mask.length] === '1') ? '1' : '0').join('');
}`,
    MUX: `(bits, p) => {
  const sel = p.mask || '10'.repeat(bits.length).slice(0, bits.length);
  const val = p.value || '01'.repeat(bits.length).slice(0, bits.length);
  return bits.split('').map((b, i) => sel[i % sel.length] === '1' ? b : val[i % val.length]).join('');
}`,
    MAJ: `(bits, p) => {
  const m = p.mask || bits, v = p.value || bits;
  return bits.split('').map((b, i) => {
    const sum = (b === '1' ? 1 : 0) + (m[i % m.length] === '1' ? 1 : 0) + (v[i % v.length] === '1' ? 1 : 0);
    return sum >= 2 ? '1' : '0';
  }).join('');
}`,
    SHL: `(bits, p) => {
  const n = p.count || 1;
  return n >= bits.length ? '0'.repeat(bits.length) : bits.slice(n) + '0'.repeat(n);
}`,
    SHR: `(bits, p) => {
  const n = p.count || 1;
  return n >= bits.length ? '0'.repeat(bits.length) : '0'.repeat(n) + bits.slice(0, -n);
}`,
    ROL: `(bits, p) => {
  const n = (p.count || 1) % bits.length;
  return bits.slice(n) + bits.slice(0, n);
}`,
    ROR: `(bits, p) => {
  const n = (p.count || 1) % bits.length;
  return bits.slice(-n) + bits.slice(0, -n);
}`,
    ASHR: `(bits, p) => {
  const n = p.count || 1;
  const sign = bits[0];
  return n >= bits.length ? sign.repeat(bits.length) : sign.repeat(n) + bits.slice(0, -n);
}`,
    REVERSE: `(bits) => bits.split('').reverse().join('')`,
    BSET: `(bits, p) => {
  const pos = p.position || 0;
  return bits.slice(0, pos) + '1' + bits.slice(pos + 1);
}`,
    BCLR: `(bits, p) => {
  const pos = p.position || 0;
  return bits.slice(0, pos) + '0' + bits.slice(pos + 1);
}`,
    BTOG: `(bits, p) => {
  const pos = p.position || 0;
  const b = bits[pos] === '0' ? '1' : '0';
  return bits.slice(0, pos) + b + bits.slice(pos + 1);
}`,
    CLZ: `(bits) => {
  let c = 0; for (const b of bits) { if (b === '1') break; c++; }
  return c.toString(2).padStart(bits.length, '0');
}`,
    CTZ: `(bits) => {
  let c = 0; for (let i = bits.length - 1; i >= 0; i--) { if (bits[i] === '1') break; c++; }
  return c.toString(2).padStart(bits.length, '0');
}`,
    BSWAP: `(bits) => {
  if (bits.length < 16) return bits;
  const bytes = []; for (let i = 0; i < bits.length; i += 8) bytes.push(bits.slice(i, i + 8));
  return bytes.reverse().join('');
}`,
    NIBSWAP: `(bits) => {
  if (bits.length < 8) return bits;
  return bits.slice(4, 8) + bits.slice(0, 4) + bits.slice(8);
}`,
    GRAY: `(bits, p) => {
  if (p.direction === 'decode') {
    let bin = bits[0]; for (let i = 1; i < bits.length; i++) bin += bits[i] === bin[i-1] ? '0' : '1';
    return bin;
  }
  let gray = bits[0]; for (let i = 1; i < bits.length; i++) gray += bits[i-1] === bits[i] ? '0' : '1';
  return gray;
}`,
    DIFF: `(bits) => {
  let r = bits[0]; for (let i = 1; i < bits.length; i++) r += bits[i] !== bits[i-1] ? '1' : '0';
  return r;
}`,
    SHUFFLE: `(bits) => {
  const arr = bits.split(''), n = arr.length;
  for (let i = n - 1; i > 0; i--) {
    const j = (i * 7) % (i + 1); [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
}`,
    NEG: `(bits) => {
  const inverted = bits.split('').map(b => b === '0' ? '1' : '0').join('');
  let carry = 1, result = '';
  for (let i = inverted.length - 1; i >= 0; i--) {
    const sum = parseInt(inverted[i]) + carry;
    result = (sum % 2) + result;
    carry = Math.floor(sum / 2);
  }
  return result;
}`,
    INC: `(bits) => {
  let carry = 1, result = '';
  for (let i = bits.length - 1; i >= 0; i--) {
    const sum = parseInt(bits[i]) + carry;
    result = (sum % 2) + result;
    carry = Math.floor(sum / 2);
  }
  return result;
}`,
    DEC: `(bits) => {
  let borrow = 1, result = '';
  for (let i = bits.length - 1; i >= 0; i--) {
    const diff = parseInt(bits[i]) - borrow;
    result = (diff < 0 ? '1' : '0') + result;
    borrow = diff < 0 ? 1 : 0;
  }
  return result;
}`,
    POPCNT: `(bits) => {
  const count = bits.split('').filter(b => b === '1').length;
  return count.toString(2).padStart(bits.length, '0');
}`,
    BUFFER: `(bits) => bits`,
    COPY: `(bits) => bits`,
    FILL: `(bits, p) => (p.value || '1').repeat(bits.length).slice(0, bits.length)`,
  };
  
  return sourceMap[operationId] || `// Implementation in operationsRouter.ts\n// See src/lib/operationsRouter.ts for full source`;
}

/**
 * Get source code for a metric - ALL 96 METRICS
 */
function getMetricSourceCode(metricId: string): string {
  const sourceMap: Record<string, string> = {
    // ===== CORE METRICS (5) =====
    entropy: `(bits) => {
  const ones = bits.split('').filter(b => b === '1').length;
  const zeros = bits.length - ones;
  if (ones === 0 || zeros === 0) return 0;
  const p0 = zeros / bits.length, p1 = ones / bits.length;
  return -(p0 * Math.log2(p0) + p1 * Math.log2(p1));
}`,
    hamming_weight: `(bits) => bits.split('').filter(b => b === '1').length`,
    balance: `(bits) => bits.split('').filter(b => b === '1').length / bits.length`,
    transition_count: `(bits) => {
  let t = 0; for (let i = 1; i < bits.length; i++) if (bits[i] !== bits[i-1]) t++;
  return t;
}`,
    run_length_avg: `(bits) => {
  if (!bits.length) return 0;
  let runs = 1; for (let i = 1; i < bits.length; i++) if (bits[i] !== bits[i-1]) runs++;
  return bits.length / runs;
}`,

    // ===== STATISTICS (15) =====
    variance: `(bits) => { const p = bits.split('').filter(b => b === '1').length / bits.length; return p * (1 - p); }`,
    standard_deviation: `(bits) => { const p = bits.split('').filter(b => b === '1').length / bits.length; return Math.sqrt(p * (1 - p)); }`,
    std_dev: `(bits) => { const p = bits.split('').filter(b => b === '1').length / bits.length; return Math.sqrt(p * (1 - p)); }`,
    skewness: `(bits) => { const p = bits.split('').filter(b => b === '1').length / bits.length; return p === 0.5 ? 0 : (1 - 2*p) / Math.sqrt(p * (1-p)); }`,
    kurtosis: `(bits) => { const p = bits.split('').filter(b => b === '1').length / bits.length; const v = p * (1-p); return v === 0 ? 0 : (1 - 6*v) / v; }`,
    median: `(bits) => {
  const bytes = []; for (let i = 0; i < bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i+8).padEnd(8, '0'), 2));
  bytes.sort((a,b) => a-b); const m = Math.floor(bytes.length/2);
  return bytes.length % 2 ? bytes[m] : (bytes[m-1] + bytes[m]) / 2;
}`,
    mode: `(bits) => {
  const bytes = []; for (let i = 0; i < bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i+8).padEnd(8, '0'), 2));
  const freq = {}; bytes.forEach(b => freq[b] = (freq[b] || 0) + 1);
  return Number(Object.entries(freq).sort((a,b) => b[1] - a[1])[0]?.[0] || 0);
}`,
    range: `(bits) => {
  const bytes = []; for (let i = 0; i < bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i+8).padEnd(8, '0'), 2));
  return Math.max(...bytes) - Math.min(...bytes);
}`,
    iqr: `(bits) => {
  const bytes = []; for (let i = 0; i < bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i+8).padEnd(8, '0'), 2));
  bytes.sort((a,b) => a-b); const q1 = bytes[Math.floor(bytes.length*0.25)], q3 = bytes[Math.floor(bytes.length*0.75)];
  return q3 - q1;
}`,
    mad: `(bits) => {
  const bytes = []; for (let i = 0; i < bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i+8).padEnd(8, '0'), 2));
  const mean = bytes.reduce((a,b) => a+b, 0) / bytes.length;
  return bytes.reduce((a,b) => a + Math.abs(b - mean), 0) / bytes.length;
}`,
    cv: `(bits) => {
  const bytes = []; for (let i = 0; i < bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i+8).padEnd(8, '0'), 2));
  const mean = bytes.reduce((a,b) => a+b, 0) / bytes.length;
  const std = Math.sqrt(bytes.reduce((a,b) => a + Math.pow(b - mean, 2), 0) / bytes.length);
  return mean === 0 ? 0 : std / mean;
}`,
    autocorrelation: `(bits) => {
  const n = bits.length; if (n < 2) return 0;
  const mean = bits.split('').filter(b => b === '1').length / n;
  let num = 0, den = 0;
  for (let i = 0; i < n - 1; i++) {
    const a = (bits[i] === '1' ? 1 : 0) - mean, b = (bits[i+1] === '1' ? 1 : 0) - mean;
    num += a * b; den += a * a;
  }
  return den === 0 ? 0 : num / den;
}`,
    serial_correlation: `(bits) => {
  let same = 0, diff = 0;
  for (let i = 1; i < bits.length; i++) bits[i] === bits[i-1] ? same++ : diff++;
  return (same - diff) / (same + diff || 1);
}`,
    autocorr_lag1: `(bits) => {
  let sum = 0; for (let i = 0; i < bits.length - 1; i++) sum += (bits[i] === bits[i+1]) ? 1 : -1;
  return sum / (bits.length - 1);
}`,
    autocorr_lag2: `(bits) => {
  let sum = 0; for (let i = 0; i < bits.length - 2; i++) sum += (bits[i] === bits[i+2]) ? 1 : -1;
  return sum / (bits.length - 2);
}`,

    // ===== RUN ANALYSIS (10) =====
    longest_run_ones: `(bits) => { let max = 0, cur = 0; for (const b of bits) { if (b === '1') { cur++; max = Math.max(max, cur); } else cur = 0; } return max; }`,
    longest_run_zeros: `(bits) => { let max = 0, cur = 0; for (const b of bits) { if (b === '0') { cur++; max = Math.max(max, cur); } else cur = 0; } return max; }`,
    runs_count: `(bits) => { let r = 1; for (let i = 1; i < bits.length; i++) if (bits[i] !== bits[i-1]) r++; return r; }`,
    max_stable_run: `(bits) => { let max = 0, cur = 1; for (let i = 1; i < bits.length; i++) { if (bits[i] === bits[i-1]) { cur++; max = Math.max(max, cur); } else cur = 1; } return Math.max(max, cur); }`,
    avg_stable_run: `(bits) => { let runs = 1; for (let i = 1; i < bits.length; i++) if (bits[i] !== bits[i-1]) runs++; return bits.length / runs; }`,
    rise_count: `(bits) => { let r = 0; for (let i = 1; i < bits.length; i++) if (bits[i-1] === '0' && bits[i] === '1') r++; return r; }`,
    fall_count: `(bits) => { let f = 0; for (let i = 1; i < bits.length; i++) if (bits[i-1] === '1' && bits[i] === '0') f++; return f; }`,
    rise_fall_ratio: `(bits) => { let r=0, f=0; for (let i = 1; i < bits.length; i++) { if (bits[i-1]==='0' && bits[i]==='1') r++; if (bits[i-1]==='1' && bits[i]==='0') f++; } return f === 0 ? r : r / f; }`,
    toggle_rate: `(bits) => { if (bits.length <= 1) return 0; let t = 0; for (let i = 1; i < bits.length; i++) if (bits[i] !== bits[i-1]) t++; return t / (bits.length - 1); }`,
    transition_rate: `(bits) => { if (bits.length <= 1) return 0; let t = 0; for (let i = 1; i < bits.length; i++) if (bits[i] !== bits[i-1]) t++; return t / (bits.length - 1); }`,

    // ===== ENTROPY VARIANTS (12) =====
    min_entropy: `(bits) => { const p = Math.max(bits.split('').filter(b => b === '1').length / bits.length, 1 - bits.split('').filter(b => b === '1').length / bits.length); return -Math.log2(p); }`,
    renyi_entropy: `(bits, alpha=2) => { const p1 = bits.split('').filter(b => b === '1').length / bits.length; const p0 = 1 - p1; if (p0 === 0 || p1 === 0) return 0; return Math.log2(Math.pow(p0, alpha) + Math.pow(p1, alpha)) / (1 - alpha); }`,
    collision_entropy: `(bits) => { const p1 = bits.split('').filter(b => b === '1').length / bits.length; const p0 = 1 - p1; return -Math.log2(p0*p0 + p1*p1); }`,
    conditional_entropy: `(bits) => { let t00=0,t01=0,t10=0,t11=0; for(let i=1;i<bits.length;i++){const p=bits[i-1],c=bits[i]; if(p==='0'&&c==='0')t00++;else if(p==='0'&&c==='1')t01++;else if(p==='1'&&c==='0')t10++;else t11++;} const n=bits.length-1; const H = (a,b) => {const t=a+b; if(t===0)return 0; const pa=a/t,pb=b/t; return -(pa>0?pa*Math.log2(pa):0)-(pb>0?pb*Math.log2(pb):0);}; const p0=(t00+t01)/n,p1=(t10+t11)/n; return p0*H(t00,t01)+p1*H(t10,t11); }`,
    joint_entropy: `(bits) => { let t00=0,t01=0,t10=0,t11=0; for(let i=1;i<bits.length;i++){const p=bits[i-1],c=bits[i]; if(p==='0'&&c==='0')t00++;else if(p==='0'&&c==='1')t01++;else if(p==='1'&&c==='0')t10++;else t11++;} const n=bits.length-1; const H = p => p>0?-p*Math.log2(p):0; return H(t00/n)+H(t01/n)+H(t10/n)+H(t11/n); }`,
    mutual_info: `(bits) => { const H1 = -(bits.split('').filter(b=>b==='1').length/bits.length)*Math.log2(bits.split('').filter(b=>b==='1').length/bits.length||1)-(1-bits.split('').filter(b=>b==='1').length/bits.length)*Math.log2(1-bits.split('').filter(b=>b==='1').length/bits.length||1); let t00=0,t01=0,t10=0,t11=0; for(let i=1;i<bits.length;i++){const p=bits[i-1],c=bits[i]; if(p==='0'&&c==='0')t00++;else if(p==='0'&&c==='1')t01++;else if(p==='1'&&c==='0')t10++;else t11++;} const n=bits.length-1; const H = p => p>0?-p*Math.log2(p):0; const HJ=H(t00/n)+H(t01/n)+H(t10/n)+H(t11/n); return 2*H1-HJ; }`,
    cross_entropy: `(bits) => { const p = bits.split('').filter(b=>b==='1').length / bits.length; const q = 0.5; return -(p*Math.log2(q) + (1-p)*Math.log2(1-q)); }`,
    kl_divergence: `(bits) => { const p = bits.split('').filter(b=>b==='1').length / bits.length; const q = 0.5; if (p===0||p===1) return 0; return p*Math.log2(p/q) + (1-p)*Math.log2((1-p)/(1-q)); }`,
    transition_entropy: `(bits) => { let t01=0,t10=0,t00=0,t11=0; for(let i=1;i<bits.length;i++){const a=bits[i-1],b=bits[i]; if(a==='0'&&b==='1')t01++;else if(a==='1'&&b==='0')t10++;else if(a==='0')t00++;else t11++;} const n=bits.length-1; const H = p => p>0?-p*Math.log2(p):0; return H(t00/n)+H(t01/n)+H(t10/n)+H(t11/n); }`,
    byte_entropy: `(bits) => { const bytes={}; for(let i=0;i<bits.length;i+=8){ const b=bits.slice(i,i+8).padEnd(8,'0'); bytes[b]=(bytes[b]||0)+1; } const n=Math.ceil(bits.length/8); let H=0; for(const c of Object.values(bytes)){ const p=c/n; if(p>0) H -= p*Math.log2(p); } return H/8; }`,
    nibble_entropy: `(bits) => { const nibs={}; for(let i=0;i<bits.length;i+=4){ const n=bits.slice(i,i+4).padEnd(4,'0'); nibs[n]=(nibs[n]||0)+1; } const total=Math.ceil(bits.length/4); let H=0; for(const c of Object.values(nibs)){ const p=c/total; if(p>0) H -= p*Math.log2(p); } return H/4; }`,
    sample_entropy: `(bits) => { const m=2,r=0.2; const B=[],A=[]; for(let i=0;i<bits.length-m;i++){B.push(bits.slice(i,i+m)); A.push(bits.slice(i,i+m+1));} let Bm=0,Am=0; for(let i=0;i<B.length-1;i++)for(let j=i+1;j<B.length;j++){if(B[i]===B[j])Bm++; if(A[i]===A[j])Am++;} return Bm>0 && Am>0 ? -Math.log(Am/Bm) : 0; }`,

    // ===== COMPLEXITY METRICS (10) =====
    lempel_ziv: `(bits) => { const dict = new Set(); let w = ''; let c = 0; for (const b of bits) { w += b; if (!dict.has(w)) { dict.add(w); c++; w = ''; } } if (w) c++; return c / (bits.length / Math.log2(bits.length || 1)); }`,
    kolmogorov_estimate: `(bits) => { const patterns = new Set(); for (let len = 1; len <= Math.min(8, bits.length); len++) { for (let i = 0; i <= bits.length - len; i++) { patterns.add(bits.slice(i, i + len)); } } return patterns.size; }`,
    t_complexity: `(bits) => { let dict = new Set(['0', '1']); let c = 0, i = 0; while (i < bits.length) { let j = 1; while (i + j <= bits.length && dict.has(bits.slice(i, i + j))) j++; if (i + j <= bits.length) { dict.add(bits.slice(i, i + j)); c++; } i += j; } return c / (bits.length || 1); }`,
    bit_complexity: `(bits) => { let t = 0; for (let i = 1; i < bits.length; i++) if (bits[i] !== bits[i-1]) t++; return t / (bits.length - 1 || 1); }`,
    effective_complexity: `(bits) => { const runs = []; let cur = 1; for (let i = 1; i < bits.length; i++) { if (bits[i] === bits[i-1]) cur++; else { runs.push(cur); cur = 1; } } runs.push(cur); const unique = new Set(runs).size; return 1 - unique / runs.length; }`,
    logical_depth: `(bits) => { const patterns = new Set(); for (let i = 0; i < bits.length - 3; i++) patterns.add(bits.slice(i, i + 4)); return patterns.size / 16; }`,
    fractal_dimension: `(bits) => { let t = 0; for (let i = 1; i < bits.length; i++) if (bits[i] !== bits[i-1]) t++; return 1 + Math.log2((t + 1) / bits.length); }`,
    apen: `(bits) => { const m = 2, r = 1; const seqs = []; for (let i = 0; i <= bits.length - m; i++) seqs.push(bits.slice(i, i + m)); let phi = 0; for (const s of seqs) { let c = 0; for (const t of seqs) if (s === t) c++; phi += Math.log(c / seqs.length); } return -phi / seqs.length; }`,
    compression_ratio: `(bits) => { const patterns = new Set(); for (let i = 0; i < bits.length - 7; i++) patterns.add(bits.slice(i, i + 8)); return bits.length / (patterns.size * 8 || 1); }`,
    pattern_diversity: `(bits) => { const patterns = new Set(); for (let i = 0; i < bits.length - 7; i++) patterns.add(bits.slice(i, i + 8)); return patterns.size / Math.pow(2, Math.min(8, bits.length)); }`,

    // ===== RANDOMNESS TESTS (8) =====
    chi_square: `(bits) => { const n = bits.length, ones = bits.split('').filter(b => b === '1').length; const exp = n / 2; return Math.pow(ones - exp, 2) / exp + Math.pow(n - ones - exp, 2) / exp; }`,
    monobit_test: `(bits) => { const n = bits.length, ones = bits.split('').filter(b => b === '1').length; return Math.abs(ones - n/2) / Math.sqrt(n/4); }`,
    runs_test: `(bits) => { let r = 1; for (let i = 1; i < bits.length; i++) if (bits[i] !== bits[i-1]) r++; return r; }`,
    poker_test: `(bits) => { const m = 4, k = Math.floor(bits.length / m); const freq = {}; for (let i = 0; i < k; i++) { const p = bits.slice(i*m, (i+1)*m); freq[p] = (freq[p] || 0) + 1; } let sum = 0; for (const c of Object.values(freq)) sum += c * c; return (Math.pow(2, m) / k) * sum - k; }`,
    serial_test: `(bits) => { const freq = {'00':0,'01':0,'10':0,'11':0}; for (let i = 0; i < bits.length - 1; i++) freq[bits.slice(i, i+2)]++; const n = bits.length - 1; let chi = 0; for (const c of Object.values(freq)) chi += Math.pow(c - n/4, 2) / (n/4); return chi; }`,
    longest_repeat: `(bits) => { let max = 0; for (let len = 1; len <= bits.length/2; len++) { for (let i = 0; i <= bits.length - 2*len; i++) { const p = bits.slice(i, i+len); if (bits.indexOf(p, i+len) !== -1) max = Math.max(max, len); } } return max; }`,
    periodicity: `(bits) => { for (let p = 1; p <= bits.length/2; p++) { let match = true; for (let i = p; i < bits.length && match; i++) if (bits[i] !== bits[i % p]) match = false; if (match) return p; } return bits.length; }`,
    spectral_test: `(bits) => { const n = bits.length; let re = 0, im = 0; for (let i = 0; i < n; i++) { const x = bits[i] === '1' ? 1 : -1; re += x * Math.cos(2 * Math.PI * i / n); im += x * Math.sin(2 * Math.PI * i / n); } return Math.sqrt(re*re + im*im) / n; }`,

    // ===== PATTERN & N-GRAM (8) =====
    unique_ngrams_2: `(bits) => { const s = new Set(); for (let i = 0; i < bits.length - 1; i++) s.add(bits.slice(i, i + 2)); return s.size; }`,
    unique_ngrams_4: `(bits) => { const s = new Set(); for (let i = 0; i < bits.length - 3; i++) s.add(bits.slice(i, i + 4)); return s.size; }`,
    unique_ngrams_8: `(bits) => { const s = new Set(); for (let i = 0; i < bits.length - 7; i++) s.add(bits.slice(i, i + 8)); return s.size; }`,
    symmetry_index: `(bits) => { let m = 0; const half = Math.floor(bits.length / 2); for (let i = 0; i < half; i++) if (bits[i] === bits[bits.length - 1 - i]) m++; return m / half; }`,
    block_regularity: `(bits) => { const blockSize = 8; const blocks = []; for (let i = 0; i < bits.length; i += blockSize) blocks.push(bits.slice(i, i + blockSize)); const unique = new Set(blocks).size; return 1 - unique / blocks.length; }`,
    segment_count: `(bits) => { const blockSize = 8; return Math.ceil(bits.length / blockSize); }`,

    // ===== STRUCTURE & ALIGNMENT (6) =====
    popcount: `(bits) => bits.split('').filter(b => b === '1').length`,
    parity: `(bits) => { let p = 0; for (const b of bits) if (b === '1') p ^= 1; return p; }`,
    leading_zeros: `(bits) => { let c = 0; for (const b of bits) { if (b === '1') break; c++; } return c; }`,
    trailing_zeros: `(bits) => { let c = 0; for (let i = bits.length-1; i >= 0; i--) { if (bits[i] === '1') break; c++; } return c; }`,
    byte_alignment: `(bits) => bits.length % 8 === 0 ? 1 : 0`,
    word_alignment: `(bits) => bits.length % 32 === 0 ? 1 : 0`,

    // ===== COMPRESSION ESTIMATES (5) =====
    lz77_estimate: `(bits) => { const windowSize = 32; let compressed = 0; for (let i = 0; i < bits.length; i++) { const window = bits.slice(Math.max(0, i - windowSize), i); const lookahead = bits.slice(i, i + 8); const match = window.indexOf(lookahead.slice(0, 4)); if (match !== -1) { compressed += 8; i += 3; } else { compressed += 9; } } return bits.length / (compressed || 1); }`,
    rle_ratio: `(bits) => { let runs = 1; for (let i = 1; i < bits.length; i++) if (bits[i] !== bits[i-1]) runs++; return runs / bits.length; }`,
    huffman_estimate: `(bits) => { const p = bits.split('').filter(b => b === '1').length / bits.length; if (p === 0 || p === 1) return 0; return -(p * Math.log2(p) + (1-p) * Math.log2(1-p)); }`,
    block_entropy: `(bits) => { const blocks = {}; for (let i = 0; i < bits.length; i += 8) { const b = bits.slice(i, i + 8); blocks[b] = (blocks[b] || 0) + 1; } const n = Math.ceil(bits.length / 8); let H = 0; for (const c of Object.values(blocks)) { const p = c / n; H -= p * Math.log2(p); } return H; }`,
    block_entropy_overlapping: `(bits) => { const blocks = {}; for (let i = 0; i <= bits.length - 8; i++) { const b = bits.slice(i, i + 8); blocks[b] = (blocks[b] || 0) + 1; } const n = bits.length - 7; let H = 0; for (const c of Object.values(blocks)) { const p = c / n; H -= p * Math.log2(p); } return H / 8; }`,

    // ===== FREQUENCY ANALYSIS (4) =====
    dominant_freq: `(bits) => { const runs = []; let cur = 1; for (let i = 1; i < bits.length; i++) { if (bits[i] === bits[i-1]) cur++; else { runs.push(cur); cur = 1; } } runs.push(cur); const freq = {}; runs.forEach(r => freq[r] = (freq[r] || 0) + 1); return Number(Object.entries(freq).sort((a,b) => b[1] - a[1])[0]?.[0] || 1); }`,
    spectral_centroid: `(bits) => { const runs = []; let cur = 1; for (let i = 1; i < bits.length; i++) { if (bits[i] === bits[i-1]) cur++; else { runs.push(cur); cur = 1; } } runs.push(cur); let sum = 0, weight = 0; runs.forEach((r, i) => { sum += r * (i + 1); weight += r; }); return weight > 0 ? sum / weight : 0; }`,
    bandwidth: `(bits) => { const runs = []; let cur = 1; for (let i = 1; i < bits.length; i++) { if (bits[i] === bits[i-1]) cur++; else { runs.push(cur); cur = 1; } } runs.push(cur); if (runs.length < 2) return 0; const mean = runs.reduce((a,b) => a+b, 0) / runs.length; return Math.sqrt(runs.reduce((a,r) => a + Math.pow(r - mean, 2), 0) / runs.length); }`,
    spectral_flatness: `(bits) => { const runs = []; let cur = 1; for (let i = 1; i < bits.length; i++) { if (bits[i] === bits[i-1]) cur++; else { runs.push(cur); cur = 1; } } runs.push(cur); if (runs.length === 0) return 0; const geoMean = Math.pow(runs.reduce((a,b) => a*b, 1), 1/runs.length); const ariMean = runs.reduce((a,b) => a+b, 0) / runs.length; return ariMean > 0 ? geoMean / ariMean : 0; }`,

    // ===== DISTANCE METRICS (4) =====
    hamming_distance_self: `(bits) => { const half = Math.floor(bits.length / 2); let d = 0; for (let i = 0; i < half; i++) if (bits[i] !== bits[i + half]) d++; return d; }`,
    bit_reversal_distance: `(bits) => { const rev = bits.split('').reverse().join(''); let d = 0; for (let i = 0; i < bits.length; i++) if (bits[i] !== rev[i]) d++; return d; }`,
    complement_distance: `(bits) => bits.length`,

    // ===== SPECIAL METRICS (6) =====
    bit_density: `(bits) => bits.split('').filter(b => b === '1').length / bits.length`,
    bias_percentage: `(bits) => { const p = bits.split('').filter(b => b === '1').length / bits.length; return Math.abs(p - 0.5) * 200; }`,
    ideality: `(bits) => 1 - Math.abs(bits.split('').filter(b => b === '1').length / bits.length - 0.5) * 2`,
    header_size: `(bits) => { let i = 0; while (i < bits.length && bits[i] === '0') i++; return i; }`,
    footer_size: `(bits) => { let i = bits.length - 1; while (i >= 0 && bits[i] === '0') i--; return bits.length - 1 - i; }`,
    block_entropy_8: `(bits) => { const blocks = {}; for (let i = 0; i < bits.length; i += 8) { const b = bits.slice(i, i + 8); blocks[b] = (blocks[b] || 0) + 1; } const n = Math.ceil(bits.length / 8); let H = 0; for (const c of Object.values(blocks)) { const p = c / n; H -= p * Math.log2(p); } return H / 8; }`,
    block_entropy_16: `(bits) => { const blocks = {}; for (let i = 0; i < bits.length; i += 16) { const b = bits.slice(i, i + 16); blocks[b] = (blocks[b] || 0) + 1; } const n = Math.ceil(bits.length / 16); let H = 0; for (const c of Object.values(blocks)) { const p = c / n; H -= p * Math.log2(p); } return H / 16; }`,

    // System metrics
    time_stamp: `() => Date.now()`,
    execution_id: `() => Math.random().toString(36).slice(2, 10)`,
  };
  
  return sourceMap[metricId] || `// Implementation in metricsCalculator.ts
// Full source: src/lib/metricsCalculator.ts
function ${metricId}(bits: string): number {
  // Calculates ${metricId} metric for the given bit string
  // Returns a numeric value representing the metric
  // See metricsCalculator.ts for complete implementation
}`;
}

/**
 * Get all implementation statistics
 */
export function getImplementationStats(): {
  operations: { total: number; implemented: number; missing: string[] };
  metrics: { total: number; implemented: number; missing: string[] };
} {
  const allOps = predefinedManager.getAllOperations();
  const allMetrics = predefinedManager.getAllMetrics();
  
  const missingOps: string[] = [];
  const missingMetrics: string[] = [];
  
  let implementedOps = 0;
  for (const op of allOps) {
    if (hasBuiltInOperation(op.id) || (op.isCodeBased && op.code)) {
      implementedOps++;
    } else {
      missingOps.push(op.id);
    }
  }
  
  let implementedMetrics = 0;
  for (const metric of allMetrics) {
    if (hasBuiltInMetric(metric.id) || (metric.isCodeBased && metric.code)) {
      implementedMetrics++;
    } else {
      missingMetrics.push(metric.id);
    }
  }
  
  return {
    operations: { total: allOps.length, implemented: implementedOps, missing: missingOps },
    metrics: { total: allMetrics.length, implemented: implementedMetrics, missing: missingMetrics },
  };
}

/**
 * Run test vectors for an operation (uses complete vectors)
 */
export function runOperationTestVectors(
  operationId: string,
  executeOp: (id: string, bits: string, params: Record<string, any>) => { success: boolean; bits: string }
): { passed: number; failed: number; results: { test: TestVector; actual: string; pass: boolean }[] } {
  // Use complete vectors with fallback to basic
  const vectors = COMPLETE_OPERATION_TEST_VECTORS[operationId] || OPERATION_TEST_VECTORS[operationId] || [];
  const results: { test: TestVector; actual: string; pass: boolean }[] = [];
  let passed = 0;
  let failed = 0;
  
  for (const test of vectors) {
    const result = executeOp(operationId, test.input, test.params || {});
    const pass = result.success && result.bits === test.expected;
    results.push({ test, actual: result.bits, pass });
    if (pass) passed++;
    else failed++;
  }
  
  return { passed, failed, results };
}

/**
 * Run test vectors for a metric (uses complete vectors)
 */
export function runMetricTestVectors(
  metricId: string,
  calculateMetric: (id: string, bits: string) => { success: boolean; value: number }
): { passed: number; failed: number; results: { test: TestVector; actual: number; pass: boolean }[] } {
  // Use complete vectors with fallback to basic
  const vectors = COMPLETE_METRIC_TEST_VECTORS[metricId] || METRIC_TEST_VECTORS[metricId] || [];
  const results: { test: TestVector; actual: number; pass: boolean }[] = [];
  let passed = 0;
  let failed = 0;
  
  for (const test of vectors) {
    const result = calculateMetric(metricId, test.input);
    const expected = test.expected as number;
    const tolerance = Math.abs(expected) < 1 ? 0.1 : Math.abs(expected) * 0.1; // 10% tolerance for metrics
    const pass = result.success && Math.abs(result.value - expected) <= tolerance;
    results.push({ test, actual: result.value, pass });
    if (pass) passed++;
    else failed++;
  }
  
  return { passed, failed, results };
}
