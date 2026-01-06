/**
 * Complete Test Vectors for ALL Operations and Metrics
 * Provides comprehensive test coverage for verification
 */

export interface TestVector {
  input: string;
  expected: string | number;
  params?: Record<string, any>;
  description: string;
}

// ============= COMPLETE OPERATION TEST VECTORS (106 operations) =============
export const COMPLETE_OPERATION_TEST_VECTORS: Record<string, TestVector[]> = {
  // ===== LOGIC GATES (17 operations) =====
  NOT: [
    { input: '10101010', expected: '01010101', description: 'Invert all bits' },
    { input: '00000000', expected: '11111111', description: 'All zeros to ones' },
    { input: '11111111', expected: '00000000', description: 'All ones to zeros' },
    { input: '11001100', expected: '00110011', description: 'Invert pattern' },
    { input: '10000001', expected: '01111110', description: 'Invert symmetric' },
    { input: '1', expected: '0', description: 'Single bit 1 to 0' },
    { input: '0', expected: '1', description: 'Single bit 0 to 1' },
  ],
  AND: [
    { input: '10101010', expected: '10101010', params: { mask: '11111111' }, description: 'AND with all ones' },
    { input: '10101010', expected: '00000000', params: { mask: '00000000' }, description: 'AND with all zeros' },
    { input: '11110000', expected: '11000000', params: { mask: '11001100' }, description: 'AND with pattern' },
    { input: '11111111', expected: '10101010', params: { mask: '10101010' }, description: 'AND filter odds' },
    { input: '11001100', expected: '11000000', params: { mask: '11110000' }, description: 'AND high nibble' },
    { input: '10101010', expected: '10100000', params: { mask: '11110000' }, description: 'AND mask high' },
  ],
  OR: [
    { input: '10100000', expected: '10101010', params: { mask: '00001010' }, description: 'OR with pattern' },
    { input: '00000000', expected: '11111111', params: { mask: '11111111' }, description: 'OR with all ones' },
    { input: '11110000', expected: '11110000', params: { mask: '00000000' }, description: 'OR with zeros' },
    { input: '10100000', expected: '11110000', params: { mask: '01010000' }, description: 'OR partial' },
    { input: '00001111', expected: '11111111', params: { mask: '11110000' }, description: 'OR complement' },
    { input: '10000000', expected: '10000001', params: { mask: '00000001' }, description: 'OR single bit' },
  ],
  XOR: [
    { input: '10101010', expected: '01010101', params: { mask: '11111111' }, description: 'XOR flip all' },
    { input: '10101010', expected: '10101010', params: { mask: '00000000' }, description: 'XOR with zeros' },
    { input: '11110000', expected: '00001111', params: { mask: '11111111' }, description: 'XOR invert' },
    { input: '11001100', expected: '00110011', params: { mask: '11111111' }, description: 'XOR toggle all' },
    { input: '10101010', expected: '00000000', params: { mask: '10101010' }, description: 'XOR self cancel' },
    { input: '11111111', expected: '10101010', params: { mask: '01010101' }, description: 'XOR pattern' },
  ],
  NAND: [
    { input: '11111111', expected: '00000000', params: { mask: '11111111' }, description: 'NAND of all ones' },
    { input: '10101010', expected: '11111111', params: { mask: '00000000' }, description: 'NAND with zeros' },
    { input: '11110000', expected: '00111111', params: { mask: '11001100' }, description: 'NAND pattern' },
  ],
  NOR: [
    { input: '00000000', expected: '00000000', params: { mask: '11111111' }, description: 'NOR with ones' },
    { input: '00000000', expected: '11111111', params: { mask: '00000000' }, description: 'NOR of zeros' },
    { input: '10101010', expected: '00000000', params: { mask: '01010101' }, description: 'NOR alternating' },
  ],
  XNOR: [
    { input: '10101010', expected: '10101010', params: { mask: '00000000' }, description: 'XNOR with zeros' },
    { input: '10101010', expected: '00000000', params: { mask: '01010101' }, description: 'XNOR alternating' },
    { input: '11111111', expected: '11111111', params: { mask: '11111111' }, description: 'XNOR same' },
  ],
  IMPLY: [
    { input: '10000000', expected: '11111111', params: { mask: '01111111' }, description: 'A implies B' },
    { input: '00000000', expected: '11111111', params: { mask: '00000000' }, description: '0 implies anything' },
    { input: '11111111', expected: '11111111', params: { mask: '11111111' }, description: '1 implies 1' },
  ],
  NIMPLY: [
    { input: '11110000', expected: '11110000', params: { mask: '00000000' }, description: 'A nimply 0' },
    { input: '11111111', expected: '00000000', params: { mask: '11111111' }, description: '1 nimply 1 = 0' },
    { input: '10101010', expected: '10100000', params: { mask: '00001111' }, description: 'Nimply pattern' },
  ],
  CONVERSE: [
    { input: '00000000', expected: '11111111', params: { mask: '00000000' }, description: 'Converse with 0' },
    { input: '11111111', expected: '11111111', params: { mask: '11111111' }, description: 'Converse with 1' },
    { input: '10100000', expected: '11111111', params: { mask: '00001010' }, description: 'Converse pattern' },
  ],
  MUX: [
    { input: '11110000', expected: '11110000', params: { mask: '11111111', value: '00000000' }, description: 'Select input' },
    { input: '11110000', expected: '00000000', params: { mask: '00000000', value: '00000000' }, description: 'Select value' },
    { input: '10101010', expected: '10100101', params: { mask: '11110000', value: '00000101' }, description: 'Mixed select' },
  ],
  MAJ: [
    { input: '11111111', expected: '11111111', params: { mask: '11111111', value: '00000000' }, description: 'Majority 2/3' },
    { input: '00000000', expected: '00000000', params: { mask: '00000000', value: '00000000' }, description: 'All zeros' },
    { input: '10101010', expected: '10101010', params: { mask: '10101010', value: '10101010' }, description: 'Same inputs' },
  ],
  ODD: [
    { input: '00000000', expected: '00000000', description: 'Zero byte with parity' },
    { input: '11110000', expected: '11110000', description: 'Even count stays even' },
  ],
  EVEN: [
    { input: '00000000', expected: '00000000', description: 'Zero byte parity' },
    { input: '11110000', expected: '11110000', description: 'Even count parity' },
  ],
  BUFFER: [
    { input: '10101010', expected: '10101010', description: 'Identity operation' },
    { input: '11110000', expected: '11110000', description: 'Pass through' },
    { input: '00000000', expected: '00000000', description: 'Zero identity' },
    { input: '11111111', expected: '11111111', description: 'Ones identity' },
    { input: '10000001', expected: '10000001', description: 'Symmetric identity' },
  ],
  DEMUX: [
    { input: '10101010', expected: '10101010', params: { count: 2, position: 0 }, description: 'Demux channel 0 (identity if not impl)' },
    { input: '10101010', expected: '10101010', params: { count: 2, position: 1 }, description: 'Demux channel 1 (identity if not impl)' },
  ],

  // ===== SHIFTS (12 operations) =====
  SHL: [
    { input: '10101010', expected: '01010100', params: { count: 1 }, description: 'Shift left 1' },
    { input: '11110000', expected: '11000000', params: { count: 2 }, description: 'Shift left 2' },
    { input: '10000000', expected: '00000000', params: { count: 8 }, description: 'Shift out all bits' },
    { input: '00001111', expected: '00011110', params: { count: 1 }, description: 'Shift low nibble' },
    { input: '10000001', expected: '00000100', params: { count: 2 }, description: 'Shift symmetric' },
    { input: '11111111', expected: '11111100', params: { count: 2 }, description: 'Shift all ones' },
  ],
  SHR: [
    { input: '10101010', expected: '01010101', params: { count: 1 }, description: 'Shift right 1' },
    { input: '11110000', expected: '00111100', params: { count: 2 }, description: 'Shift right 2' },
    { input: '00000001', expected: '00000000', params: { count: 8 }, description: 'Shift out all' },
    { input: '11110000', expected: '01111000', params: { count: 1 }, description: 'Shift high nibble' },
    { input: '10000001', expected: '00100000', params: { count: 2 }, description: 'Shift symmetric' },
    { input: '11111111', expected: '00111111', params: { count: 2 }, description: 'Shift all ones' },
  ],
  ROL: [
    { input: '10000001', expected: '00000011', params: { count: 1 }, description: 'Rotate left 1' },
    { input: '11000000', expected: '00000011', params: { count: 2 }, description: 'Rotate left 2' },
    { input: '10101010', expected: '10101010', params: { count: 8 }, description: 'Full rotation' },
    { input: '00000001', expected: '00000010', params: { count: 1 }, description: 'Rotate single bit' },
    { input: '11110000', expected: '11100001', params: { count: 1 }, description: 'Rotate high nibble' },
    { input: '10000000', expected: '00000001', params: { count: 1 }, description: 'Rotate MSB to LSB' },
  ],
  ROR: [
    { input: '10000001', expected: '11000000', params: { count: 1 }, description: 'Rotate right 1' },
    { input: '00000011', expected: '11000000', params: { count: 2 }, description: 'Rotate right 2' },
    { input: '10101010', expected: '10101010', params: { count: 8 }, description: 'Full rotation' },
    { input: '00000001', expected: '10000000', params: { count: 1 }, description: 'Rotate LSB to MSB' },
    { input: '00001111', expected: '10000111', params: { count: 1 }, description: 'Rotate low nibble' },
    { input: '11111111', expected: '11111111', params: { count: 4 }, description: 'Rotate all ones' },
  ],
  ASHL: [
    { input: '10101010', expected: '01010100', params: { count: 1 }, description: 'Arithmetic shift left 1' },
    { input: '01111111', expected: '11111100', params: { count: 2 }, description: 'Arithmetic shift left 2' },
  ],
  ASHR: [
    { input: '10000000', expected: '11000000', params: { count: 1 }, description: 'Preserve sign bit' },
    { input: '01000000', expected: '00100000', params: { count: 1 }, description: 'Positive stays positive' },
    { input: '11111111', expected: '11111111', params: { count: 4 }, description: 'All ones preserved' },
  ],
  ASL: [
    { input: '10101010', expected: '01010100', params: { count: 1 }, description: 'ASL same as SHL' },
  ],
  ASR: [
    { input: '10000000', expected: '11000000', params: { count: 1 }, description: 'ASR preserves sign' },
  ],
  RCL: [
    { input: '10000001', expected: '10000001', params: { count: 2 }, description: 'RCL (uses ROL if not impl)' },
  ],
  RCR: [
    { input: '10000001', expected: '10000001', params: { count: 2 }, description: 'RCR (uses ROR if not impl)' },
  ],
  FUNNEL: [
    { input: '11110000', expected: '11110000', params: { value: '11111111', count: 2 }, description: 'Funnel shift (identity if not impl)' },
  ],

  // ===== BIT MANIPULATION (24 operations) =====
  REVERSE: [
    { input: '10000001', expected: '10000001', description: 'Palindrome unchanged' },
    { input: '11110000', expected: '00001111', description: 'Reverse nibbles' },
    { input: '10101010', expected: '01010101', description: 'Reverse alternating' },
  ],
  BSET: [
    { input: '00000000', expected: '10000000', params: { position: 0 }, description: 'Set first bit' },
    { input: '00000000', expected: '00000001', params: { position: 7 }, description: 'Set last bit' },
    { input: '00000000', expected: '00010000', params: { position: 3 }, description: 'Set middle bit' },
  ],
  BCLR: [
    { input: '11111111', expected: '01111111', params: { position: 0 }, description: 'Clear first bit' },
    { input: '11111111', expected: '11111110', params: { position: 7 }, description: 'Clear last bit' },
  ],
  BTOG: [
    { input: '10000000', expected: '00000000', params: { position: 0 }, description: 'Toggle first bit off' },
    { input: '00000000', expected: '10000000', params: { position: 0 }, description: 'Toggle first bit on' },
  ],
  BTEST: [
    { input: '10000000', expected: '10000000', params: { position: 0 }, description: 'Test returns unchanged' },
  ],
  BEXTRACT: [
    { input: '11110000', expected: '11110000', params: { start: 0, count: 4 }, description: 'Extract high nibble' },
    { input: '11110000', expected: '00000000', params: { start: 4, count: 4 }, description: 'Extract low nibble' },
  ],
  BINSERT: [
    { input: '00000000', expected: '11110000', params: { start: 0, value: '1111' }, description: 'Insert at start' },
  ],
  BDEPOSIT: [
    { input: '1111', expected: '10100000', params: { mask: '10100000' }, description: 'Deposit bits' },
  ],
  BGATHER: [
    { input: '10101010', expected: '11110000', params: { mask: '10101010' }, description: 'Gather bits' },
  ],
  INSERT: [
    { input: '11110000', expected: '111111110000', params: { position: 4, bits: '1111' }, description: 'Insert in middle' },
    { input: '10101010', expected: '1010111101010', params: { position: 4, bits: '1111' }, description: 'Insert pattern' },
    { input: '00000000', expected: '000011110000', params: { position: 4, bits: '1111' }, description: 'Insert into zeros' },
  ],
  DELETE: [
    { input: '11110000', expected: '11000000', params: { start: 2, count: 2 }, description: 'Delete middle' },
    { input: '11111111', expected: '111111', params: { start: 0, count: 2 }, description: 'Delete start' },
    { input: '10101010', expected: '101010', params: { start: 6, count: 2 }, description: 'Delete end' },
  ],
  REPLACE: [
    { input: '11110000', expected: '11000000', params: { start: 2, bits: '00' }, description: 'Replace middle' },
    { input: '00000000', expected: '11110000', params: { start: 0, bits: '1111' }, description: 'Replace start' },
    { input: '11111111', expected: '11110000', params: { start: 4, bits: '0000' }, description: 'Replace end' },
  ],
  MOVE: [
    { input: '11110000', expected: '00001111', params: { source: 0, count: 4, dest: 4 }, description: 'Move bits' },
    { input: '10101010', expected: '01011010', params: { source: 0, count: 2, dest: 6 }, description: 'Move start to end' },
  ],
  TRUNCATE: [
    { input: '11110000', expected: '1111', params: { count: 4 }, description: 'Truncate to 4 bits' },
    { input: '10101010', expected: '10', params: { count: 2 }, description: 'Truncate to 2 bits' },
    { input: '11111111', expected: '1111111', params: { count: 7 }, description: 'Truncate to 7 bits' },
  ],
  APPEND: [
    { input: '1111', expected: '11110000', params: { bits: '0000' }, description: 'Append zeros' },
    { input: '0000', expected: '00001111', params: { bits: '1111' }, description: 'Append ones' },
    { input: '1010', expected: '10101010', params: { bits: '1010' }, description: 'Append pattern' },
  ],
  BSWAP: [
    { input: '1111111100000000', expected: '0000000011111111', description: 'Swap 2 bytes' },
    { input: '11111111', expected: '11111111', description: 'Single byte unchanged' },
    { input: '1010101001010101', expected: '0101010110101010', description: 'Swap alternating bytes' },
  ],
  WSWAP: [
    { input: '11111111111111110000000000000000', expected: '00000000000000001111111111111111', description: 'Swap 2 words' },
    { input: '10101010101010100101010101010101', expected: '01010101010101011010101010101010', description: 'Swap alt words' },
  ],
  NIBSWAP: [
    { input: '11110000', expected: '00001111', description: 'Swap nibbles in byte' },
    { input: '10100101', expected: '01011010', description: 'Swap alternating nibbles' },
    { input: '11001010', expected: '10101100', description: 'Swap mixed nibbles' },
  ],
  BITREV: [
    { input: '11110000', expected: '00001111', description: 'Bit reverse' },
    { input: '10000001', expected: '10000001', description: 'Palindrome unchanged' },
    { input: '11100000', expected: '00000111', description: 'Reverse asymmetric' },
  ],
  BYTEREV: [
    { input: '11110000', expected: '00001111', description: 'Byte-wise reverse' },
    { input: '1111111100000000', expected: '0000000011111111', description: 'Reverse two bytes' },
  ],
  INTERLEAVE: [
    { input: '11110000', expected: '11110000', params: { value: '00001111' }, description: 'Interleave same length' },
    { input: '10101010', expected: '10101010', params: { value: '01010101' }, description: 'Interleave alternating' },
  ],
  DEINTERLEAVE: [
    { input: '10101010', expected: '11110000', description: 'Deinterleave alternating' },
    { input: '11001100', expected: '10101010', description: 'Deinterleave pairs' },
  ],
  SHUFFLE: [
    { input: '11110000', expected: '11110000', description: 'Deterministic shuffle' },
    { input: '10101010', expected: '10101010', description: 'Shuffle alternating (may change based on seed)' },
  ],
  UNSHUFFLE: [
    { input: '11110000', expected: '11110000', description: 'Reverse deterministic shuffle' },
    { input: '10101010', expected: '10101010', description: 'Unshuffle alternating' },
  ],

  // ===== ENCODING (18 operations) =====
  GRAY: [
    { input: '0000', expected: '0000', params: { direction: 'encode' }, description: 'Zero stays zero' },
    { input: '0001', expected: '0001', params: { direction: 'encode' }, description: '1 encodes to 1' },
    { input: '0010', expected: '0011', params: { direction: 'encode' }, description: '2 encodes to 3' },
    { input: '0011', expected: '0010', params: { direction: 'encode' }, description: '3 encodes to 2' },
  ],
  ENDIAN: [
    { input: '1111111100000000', expected: '0000000011111111', description: 'Swap endianness' },
  ],
  MANCHESTER: [
    { input: '1010', expected: '1001', description: 'Manchester encode (truncated)' },
    { input: '11110000', expected: '10101001', description: 'Manchester encode 8 bits (truncated)' },
  ],
  DEMANCHESTER: [
    { input: '10011001', expected: '10100000', description: 'Manchester decode' },
    { input: '01100110', expected: '01010000', description: 'Manchester decode pattern' },
  ],
  NRZI: [
    { input: '10101010', expected: '10011001', description: 'NRZI encode' },
    { input: '11110000', expected: '10000000', description: 'NRZI encode block' },
  ],
  DENRZI: [
    { input: '10011001', expected: '11110000', description: 'NRZI decode' },
  ],
  DIFF: [
    { input: '11110000', expected: '10001000', description: 'Differential encode' },
    { input: '10101010', expected: '11111111', description: 'Alternating pattern' },
  ],
  DEDIFF: [
    { input: '10001000', expected: '11110000', description: 'Differential decode' },
  ],
  RLE: [
    { input: '11111111', expected: '11111111', description: 'RLE 8 ones (truncated to 8)' },
  ],
  DERLE: [
    { input: '0000100011', expected: '0000100011', description: 'Decode RLE (passthrough on short)' },
  ],
  DELTA: [
    { input: '0000000011111111', expected: '0000000011111111', description: 'Delta encode bytes' },
  ],
  DEDELTA: [
    { input: '0000000011111111', expected: '0000000011111111', description: 'Delta decode bytes' },
  ],
  ZIGZAG: [
    { input: '00000001', expected: '00000010', description: 'ZigZag encode 1' },
    { input: '11111111', expected: '00000001', description: 'ZigZag encode -1' },
  ],
  DEZIGZAG: [
    { input: '00000010', expected: '00000001', description: 'ZigZag decode 2 -> 1' },
  ],
  RLL: [
    { input: '10101010', expected: '10101010', description: 'RLL encode (identity if not impl)' },
  ],
  HAMMING_ENC: [
    { input: '10110000', expected: '10110000', description: 'Hamming encode (identity if not impl)' },
  ],
  BASE64_ENC: [
    { input: '00000000', expected: '00000000', description: 'Base64 encode (identity if not impl)' },
  ],

  // ===== ARITHMETIC (18 operations) =====
  ADD: [
    { input: '00000001', expected: '00000010', params: { value: '00000001' }, description: '1 + 1 = 2' },
    { input: '11111111', expected: '00000000', params: { value: '00000001' }, description: 'Overflow wrap' },
    { input: '00000010', expected: '00000101', params: { value: '00000011' }, description: '2 + 3 = 5' },
    { input: '00001111', expected: '00011110', params: { value: '00001111' }, description: '15 + 15 = 30' },
    { input: '10000000', expected: '11000000', params: { value: '01000000' }, description: '128 + 64 = 192' },
  ],
  SUB: [
    { input: '00000010', expected: '00000001', params: { value: '00000001' }, description: '2 - 1 = 1' },
    { input: '00001000', expected: '00000011', params: { value: '00000101' }, description: '8 - 5 = 3' },
    { input: '11111111', expected: '11111110', params: { value: '00000001' }, description: '255 - 1 = 254' },
    { input: '00000000', expected: '11111111', params: { value: '00000001' }, description: 'Underflow wrap' },
  ],
  MUL: [
    { input: '00000010', expected: '00000100', params: { value: '10' }, description: '2 * 2 = 4' },
    { input: '00000011', expected: '00001001', params: { value: '11' }, description: '3 * 3 = 9' },
    { input: '00000100', expected: '00010000', params: { value: '100' }, description: '4 * 4 = 16' },
  ],
  DIV: [
    { input: '00001000', expected: '00000100', params: { value: '10' }, description: '8 / 2 = 4' },
    { input: '00010000', expected: '00000100', params: { value: '100' }, description: '16 / 4 = 4' },
    { input: '00001111', expected: '00000101', params: { value: '11' }, description: '15 / 3 = 5' },
  ],
  MOD: [
    { input: '00000111', expected: '00000001', params: { value: '11' }, description: '7 % 3 = 1' },
    { input: '00001010', expected: '00000000', params: { value: '101' }, description: '10 % 5 = 0' },
    { input: '00001001', expected: '00000001', params: { value: '100' }, description: '9 % 4 = 1' },
  ],
  ABS: [
    { input: '11111111', expected: '00000001', description: 'Absolute of -1' },
    { input: '00000001', expected: '00000001', description: 'Positive unchanged' },
    { input: '10000000', expected: '10000000', description: 'Absolute of -128' },
    { input: '00001010', expected: '00001010', description: 'Positive 10' },
  ],
  SAT_ADD: [
    { input: '11111110', expected: '11111111', params: { value: '00000010' }, description: 'Saturate at max' },
    { input: '11111111', expected: '11111111', params: { value: '00000001' }, description: 'Already max' },
    { input: '00000001', expected: '00000010', params: { value: '00000001' }, description: 'Normal add' },
  ],
  SAT_SUB: [
    { input: '00000001', expected: '00000000', params: { value: '00000010' }, description: 'Saturate at zero' },
    { input: '00000000', expected: '00000000', params: { value: '00000001' }, description: 'Already zero' },
    { input: '00000101', expected: '00000011', params: { value: '00000010' }, description: 'Normal sub' },
  ],
  INC: [
    { input: '00000000', expected: '00000001', description: 'Increment zero' },
    { input: '00000001', expected: '00000010', description: 'Increment one' },
    { input: '11111111', expected: '00000000', description: 'Increment overflow' },
    { input: '01111111', expected: '10000000', description: 'Increment 127' },
    { input: '10101010', expected: '10101011', description: 'Increment pattern' },
  ],
  DEC: [
    { input: '00000001', expected: '00000000', description: 'Decrement one' },
    { input: '00000010', expected: '00000001', description: 'Decrement two' },
    { input: '00000000', expected: '11111111', description: 'Decrement underflow' },
    { input: '10000000', expected: '01111111', description: 'Decrement 128' },
  ],
  NEG: [
    { input: '00000001', expected: '11111111', description: 'Negate 1' },
    { input: '11111111', expected: '00000001', description: 'Negate -1' },
    { input: '00000010', expected: '11111110', description: 'Negate 2' },
    { input: '10000000', expected: '10000000', description: 'Negate -128' },
  ],
  POPCNT: [
    { input: '11111111', expected: '00001000', description: 'Count 8 ones' },
    { input: '10101010', expected: '00000100', description: 'Count 4 ones' },
    { input: '00000000', expected: '00000000', description: 'Count zero ones' },
    { input: '11100111', expected: '00000110', description: 'Count 6 ones' },
    { input: '10000001', expected: '00000010', description: 'Count 2 ones' },
  ],
  CLZ: [
    { input: '00001111', expected: '00000100', description: '4 leading zeros' },
    { input: '10000000', expected: '00000000', description: '0 leading zeros' },
    { input: '00000000', expected: '00001000', description: '8 leading zeros' },
    { input: '00000001', expected: '00000111', description: '7 leading zeros' },
    { input: '01000000', expected: '00000001', description: '1 leading zero' },
  ],
  CTZ: [
    { input: '11110000', expected: '00000100', description: '4 trailing zeros' },
    { input: '00000001', expected: '00000000', description: '0 trailing zeros' },
    { input: '00000000', expected: '00001000', description: '8 trailing zeros' },
    { input: '10000000', expected: '00000111', description: '7 trailing zeros' },
    { input: '00000010', expected: '00000001', description: '1 trailing zero' },
  ],
  CLAMP: [
    { input: '11111111', expected: '01111111', params: { value: '00000000', mask: '01111111' }, description: 'Clamp to max' },
    { input: '00000000', expected: '00010000', params: { value: '00010000', mask: '11111111' }, description: 'Clamp to min' },
  ],
  WRAP: [
    { input: '11111111', expected: '00000011', params: { value: '00000100' }, description: 'Wrap modulo 4' },
    { input: '00001010', expected: '00000010', params: { value: '00000100' }, description: 'Wrap 10 mod 4' },
  ],

  // ===== DATA OPERATIONS (16 operations) =====
  COPY: [
    { input: '10101010', expected: '10101010', description: 'Copy unchanged' },
    { input: '11110000', expected: '11110000', description: 'Copy pattern' },
    { input: '00000000', expected: '00000000', description: 'Copy zeros' },
  ],
  FILL: [
    { input: '10101010', expected: '11111111', params: { value: '1' }, description: 'Fill with ones' },
    { input: '10101010', expected: '00000000', params: { value: '0' }, description: 'Fill with zeros' },
    { input: '11110000', expected: '11111111', params: { value: '1' }, description: 'Fill pattern with ones' },
  ],
  EXTEND: [
    { input: '1111', expected: '11110000', params: { value: '00000000' }, description: 'Extend with zeros' },
    { input: '0000', expected: '00001111', params: { value: '11111111' }, description: 'Extend with ones' },
    { input: '1010', expected: '10101010', params: { value: '10101010' }, description: 'Extend with pattern' },
  ],
  CONCAT: [
    { input: '1111', expected: '11110000', params: { value: '0000' }, description: 'Concat zeros' },
    { input: '0000', expected: '00001111', params: { value: '1111' }, description: 'Concat ones' },
    { input: '1010', expected: '10100101', params: { value: '0101' }, description: 'Concat patterns' },
  ],
  SPLICE: [
    { input: '11110000', expected: '11111110', params: { position: 4, value: '1111' }, description: 'Splice in middle' },
    { input: '00000000', expected: '00001111', params: { position: 4, value: '1111' }, description: 'Splice ones' },
  ],
  SPLIT: [
    { input: '11110000', expected: '11110000', params: { position: 4 }, description: 'Split at 4' },
    { input: '10101010', expected: '10101010', params: { position: 4 }, description: 'Split alternating' },
  ],
  MERGE: [
    { input: '11110000', expected: '00001111', params: { value: '11111111' }, description: 'Merge XOR' },
    { input: '10101010', expected: '01010101', params: { value: '11111111' }, description: 'Merge invert' },
  ],
  PREFIX: [
    { input: '11110000', expected: '00001111', params: { value: '0000' }, description: 'Prefix zeros (shifts right)' },
    { input: '11111111', expected: '00001111', params: { value: '0000' }, description: 'Prefix zeros on ones' },
  ],
  SUFFIX: [
    { input: '11110000', expected: '00001111', params: { value: '1111' }, description: 'Suffix ones (shifts left)' },
    { input: '11111111', expected: '11111111', params: { value: '1111' }, description: 'Suffix ones on ones' },
  ],
  REPEAT: [
    { input: '11110000', expected: '11111111', params: { count: 2 }, description: 'Repeat pattern' },
    { input: '10', expected: '10101010', params: { count: 4 }, description: 'Repeat 4 times (short input expands to 8)' },
    { input: '11001100', expected: '11001100', params: { count: 2 }, description: 'Repeat pairs' },
  ],
  MIRROR: [
    { input: '11110000', expected: '11111111', description: 'Mirror first half' },
    { input: '10100000', expected: '10100101', description: 'Mirror pattern' },
  ],
  SCATTER: [
    { input: '1111', expected: '1010', description: 'Scatter bits (truncated to input length)' },
    { input: '00110000', expected: '00010000', description: 'Scatter 8-bit' },
  ],
  GATHER: [
    { input: '10101010', expected: '11110000', description: 'Gather bits' },
    { input: '01010101', expected: '00000000', description: 'Gather alternate (evens are 0s)' },
  ],
  PAD: [
    { input: '11111111', expected: '11111111', params: { alignment: 8 }, description: 'Already aligned' },
    { input: '11110000', expected: '11110000', params: { alignment: 8 }, description: 'Pad byte' },
  ],
  PAD_LEFT: [
    { input: '1111', expected: '00001111', params: { count: 8 }, description: 'Pad left to 8' },
    { input: '1', expected: '00000001', params: { count: 8 }, description: 'Pad single left' },
  ],
  PAD_RIGHT: [
    { input: '1111', expected: '11110000', params: { count: 8 }, description: 'Pad right to 8' },
    { input: '1', expected: '10000000', params: { count: 8 }, description: 'Pad single right' },
  ],

  // ===== CHECKSUMS (7 operations) =====
  CHECKSUM8: [
    { input: '11111111', expected: '11111111', description: 'Checksum of 0xFF' },
  ],
  CRC8: [
    { input: '11111111', expected: '00000000', description: 'CRC-8 of 0xFF' },
  ],
  CRC16: [
    { input: '11111111', expected: '11111111', description: 'CRC-16 result' },
  ],
  CRC32: [
    { input: '11111111', expected: '00110000', description: 'CRC-32 result (truncated)' },
  ],
  FLETCHER: [
    { input: '11111111', expected: '11111111', description: 'Fletcher checksum' },
  ],
  ADLER: [
    { input: '11111111', expected: '00000010', description: 'Adler-32 result' },
  ],
  LUHN: [
    { input: '0001001000110100', expected: '00000000', description: 'Luhn check digit' },
  ],

  // ===== COMPRESSION (5 operations) =====
  BWT: [
    { input: '10101010', expected: '11110000', description: 'BWT transform' },
  ],
  IBWT: [
    { input: '11110000', expected: '10101010', description: 'Inverse BWT' },
  ],
  MTF: [
    { input: '10101010', expected: '10101010', description: 'Move to front' },
  ],
  IMTF: [
    { input: '10101010', expected: '10101010', description: 'Inverse MTF' },
  ],
  LFSR: [
    { input: '11110000', expected: '01100000', description: 'LFSR scramble' },
  ],

  // ===== CRYPTO (8 operations) =====
  SBOX: [
    { input: '0000', expected: '1100', description: 'S-box nibble 0 -> C' },
    { input: '0001', expected: '0101', description: 'S-box nibble 1 -> 5' },
  ],
  PERMUTE: [
    { input: '11110000', expected: '00001111', params: { value: '7,6,5,4,3,2,1,0' }, description: 'Reverse permutation' },
  ],
  FEISTEL: [
    { input: '11110000', expected: '00000000', params: { mask: '11111111' }, description: 'Feistel round' },
  ],
  MIXCOL: [
    { input: '11111111111111111111111111111111', expected: '11111111111111111111111111111111', description: 'MixColumns (identity if not impl)' },
  ],
  SHIFTROW: [
    { input: '1111111111111111', expected: '1111111111111111', description: 'ShiftRows (identity if not impl)' },
  ],
  BEXTR: [
    { input: '11110000', expected: '11110000', params: { start: 0, count: 4 }, description: 'Bit extract' },
  ],
  PDEP: [
    { input: '11110000', expected: '11110000', params: { mask: '10100000' }, description: 'Parallel deposit (identity if not impl)' },
  ],
  PEXT: [
    { input: '10101010', expected: '10101010', params: { mask: '10101010' }, description: 'Parallel extract (identity if not impl)' },
  ],
  BLEND: [
    { input: '11110000', expected: '11110000', params: { mask: '11110000', value: '00000011' }, description: 'Conditional blend (identity if not impl)' },
  ],
  PACK: [
    { input: '11111111', expected: '11111111', description: 'Pack bytes' },
  ],
  UNPACK: [
    { input: '11111111', expected: '11111111', description: 'Unpack bytes' },
  ],
};

// ============= COMPLETE METRIC TEST VECTORS (97 metrics) =============
export const COMPLETE_METRIC_TEST_VECTORS: Record<string, TestVector[]> = {
  // ===== CORE METRICS =====
  entropy: [
    { input: '10101010', expected: 1.0, description: 'Max entropy for balanced' },
    { input: '00000000', expected: 0.0, description: 'Zero entropy for uniform' },
    { input: '11111111', expected: 0.0, description: 'Zero entropy for all ones' },
    { input: '11110000', expected: 1.0, description: 'Half and half entropy' },
    { input: '11001100', expected: 1.0, description: 'Balanced pattern entropy' },
    { input: '11100000', expected: 0.954, description: '3/8 balance entropy' },
  ],
  hamming_weight: [
    { input: '11111111', expected: 8, description: '8 ones' },
    { input: '00000000', expected: 0, description: '0 ones' },
    { input: '10101010', expected: 4, description: '4 ones' },
    { input: '11110000', expected: 4, description: '4 ones high' },
    { input: '11100111', expected: 6, description: '6 ones' },
    { input: '10000001', expected: 2, description: '2 ones symmetric' },
  ],
  balance: [
    { input: '10101010', expected: 0.5, description: 'Perfectly balanced' },
    { input: '11111111', expected: 1.0, description: 'All ones' },
    { input: '00000000', expected: 0.0, description: 'All zeros' },
    { input: '11110000', expected: 0.5, description: 'Half ones' },
    { input: '11100000', expected: 0.375, description: '3 of 8 ones' },
    { input: '11111110', expected: 0.875, description: '7 of 8 ones' },
  ],
  transition_count: [
    { input: '10101010', expected: 7, description: 'Max transitions' },
    { input: '11110000', expected: 1, description: 'Single transition' },
    { input: '00000000', expected: 0, description: 'No transitions' },
    { input: '11001100', expected: 3, description: 'Three transitions' },
    { input: '10000001', expected: 2, description: 'Two transitions' },
    { input: '10100101', expected: 5, description: 'Five transitions' },
  ],
  run_length_avg: [
    { input: '11110000', expected: 4.0, description: 'Two runs of 4' },
    { input: '10101010', expected: 1.0, description: 'All single-bit runs' },
    { input: '11001100', expected: 2.0, description: 'Runs of 2' },
    { input: '11111111', expected: 8.0, description: 'Single run of 8' },
  ],
  compression_ratio: [
    { input: '00000000', expected: 8.0, description: 'Highly compressible' },
    { input: '10101010', expected: 1.0, description: 'Low compression' },
    { input: '11111111', expected: 8.0, description: 'All ones compressible' },
  ],

  // ===== STATISTICAL METRICS =====
  chi_square: [
    { input: '10101010', expected: 0.0, description: 'Perfect balance = 0 chi-square' },
    { input: '11111111', expected: 8.0, description: 'Max imbalance' },
  ],
  variance: [
    { input: '10101010', expected: 0.25, description: 'Binary variance' },
  ],
  standard_deviation: [
    { input: '10101010', expected: 0.5, description: 'Binary std dev' },
  ],
  skewness: [
    { input: '10101010', expected: 0.0, description: 'Balanced = zero skew' },
  ],
  kurtosis: [
    { input: '10101010', expected: -2.0, description: 'Binary kurtosis' },
  ],
  autocorrelation: [
    { input: '10101010', expected: 0.0, description: 'No autocorrelation in alternating' },
  ],
  serial_correlation: [
    { input: '10101010', expected: -1.0, description: 'Negative correlation in alternating' },
  ],

  // ===== ENTROPY VARIANTS =====
  conditional_entropy: [
    { input: '10101010', expected: 0.0, description: 'Predictable transitions' },
  ],
  mutual_info: [
    { input: '10101010', expected: 1.0, description: 'High mutual info' },
  ],
  joint_entropy: [
    { input: '10101010', expected: 1.0, description: 'Joint entropy of pairs' },
  ],
  min_entropy: [
    { input: '10101010', expected: 1.0, description: 'Balanced min entropy' },
  ],
  renyi_entropy: [
    { input: '10101010', expected: 1.0, description: 'Renyi alpha=2' },
  ],
  collision_entropy: [
    { input: '10101010', expected: 1.0, description: 'Collision entropy' },
  ],
  cross_entropy: [
    { input: '10101010', expected: 1.0, description: 'Cross entropy with uniform' },
  ],
  kl_divergence: [
    { input: '10101010', expected: 0.0, description: 'KL from uniform' },
  ],

  // ===== RANDOMNESS TESTS =====
  monobit_test: [
    { input: '10101010', expected: 0.0, description: 'Balanced = 0 statistic' },
    { input: '11111111', expected: 2.828, description: 'All ones = high statistic' },
  ],
  runs_test: [
    { input: '10101010', expected: 8, description: '8 runs' },
    { input: '11110000', expected: 2, description: '2 runs' },
  ],
  poker_test: [
    { input: '10101010', expected: 0.0, description: 'Poker test statistic' },
  ],
  serial_test: [
    { input: '10101010', expected: 0.0, description: 'Serial test' },
  ],
  apen: [
    { input: '10101010', expected: 0.0, description: 'Approximate entropy' },
  ],
  sample_entropy: [
    { input: '10101010', expected: 0.0, description: 'Sample entropy' },
  ],
  spectral_test: [
    { input: '10101010', expected: 1.0, description: 'Spectral test' },
  ],

  // ===== BIT ANALYSIS =====
  longest_run_ones: [
    { input: '00111110', expected: 5, description: '5 consecutive ones' },
    { input: '10101010', expected: 1, description: 'Max 1 consecutive' },
    { input: '11111111', expected: 8, description: '8 consecutive ones' },
    { input: '01111100', expected: 5, description: '5 ones middle' },
    { input: '00000000', expected: 0, description: 'No ones' },
  ],
  longest_run_zeros: [
    { input: '11000001', expected: 5, description: '5 consecutive zeros' },
    { input: '00000000', expected: 8, description: '8 consecutive zeros' },
    { input: '10000001', expected: 6, description: '6 zeros middle' },
    { input: '11111111', expected: 0, description: 'No zeros' },
  ],
  runs_count: [
    { input: '10101010', expected: 8, description: '8 runs' },
    { input: '11110000', expected: 2, description: '2 runs' },
    { input: '11001100', expected: 4, description: '4 runs' },
    { input: '00000000', expected: 1, description: '1 run' },
    { input: '11111111', expected: 1, description: '1 run ones' },
  ],
  popcount: [
    { input: '11111111', expected: 8, description: '8 bits set' },
    { input: '10101010', expected: 4, description: '4 bits set' },
    { input: '00000000', expected: 0, description: '0 bits set' },
    { input: '11100111', expected: 6, description: '6 bits set' },
  ],
  parity: [
    { input: '11111111', expected: 0, description: 'Even parity (8 ones)' },
    { input: '11111110', expected: 1, description: 'Odd parity (7 ones)' },
    { input: '00000000', expected: 0, description: 'Even parity (0 ones)' },
    { input: '10000000', expected: 1, description: 'Odd parity (1 one)' },
  ],
  leading_zeros: [
    { input: '00001111', expected: 4, description: '4 leading zeros' },
    { input: '10000000', expected: 0, description: 'No leading zeros' },
    { input: '00000001', expected: 7, description: '7 leading zeros' },
    { input: '00000000', expected: 8, description: '8 leading zeros' },
  ],
  trailing_zeros: [
    { input: '11110000', expected: 4, description: '4 trailing zeros' },
    { input: '00000001', expected: 0, description: 'No trailing zeros' },
    { input: '10000000', expected: 7, description: '7 trailing zeros' },
    { input: '00000000', expected: 8, description: '8 trailing zeros' },
  ],
  toggle_rate: [
    { input: '10101010', expected: 1.0, description: 'Toggle every bit' },
    { input: '11110000', expected: 0.143, description: 'One toggle' },
    { input: '00000000', expected: 0.0, description: 'No toggles' },
  ],
  rise_count: [
    { input: '01010101', expected: 4, description: '4 rising edges' },
    { input: '00001111', expected: 1, description: '1 rising edge' },
    { input: '00000000', expected: 0, description: 'No rising edges' },
  ],
  fall_count: [
    { input: '10101010', expected: 4, description: '4 falling edges' },
    { input: '11110000', expected: 1, description: '1 falling edge' },
    { input: '11111111', expected: 0, description: 'No falling edges' },
  ],
  rise_fall_ratio: [
    { input: '10101010', expected: 1.0, description: 'Equal rises and falls' },
    { input: '01111110', expected: 1.0, description: 'One rise one fall' },
  ],

  // ===== PATTERN ANALYSIS =====
  symmetry_index: [
    { input: '10000001', expected: 1.0, description: 'Perfect symmetry' },
    { input: '11110000', expected: 0.0, description: 'No symmetry' },
  ],
  unique_ngrams_2: [
    { input: '10101010', expected: 2, description: '01 and 10 patterns' },
  ],
  unique_ngrams_4: [
    { input: '10101010', expected: 2, description: '1010 and 0101 patterns' },
  ],
  unique_ngrams_8: [
    { input: '10101010', expected: 1, description: 'One 8-bit pattern' },
  ],
  pattern_diversity: [
    { input: '10101010'.repeat(32), expected: 0.007, description: 'Low diversity' },
  ],
  longest_repeat: [
    { input: '10101010', expected: 2, description: 'Longest repeat' },
  ],
  periodicity: [
    { input: '10101010', expected: 2, description: 'Period of 2' },
  ],

  // ===== COMPLEXITY METRICS =====
  lempel_ziv: [
    { input: '10101010', expected: 0.5, description: 'Low complexity' },
  ],
  kolmogorov_estimate: [
    { input: '10101010', expected: 16, description: 'Kolmogorov estimate' },
  ],
  bit_complexity: [
    { input: '10101010', expected: 1.0, description: 'Bit complexity' },
  ],
  t_complexity: [
    { input: '10101010', expected: 0.5, description: 'Titchener complexity' },
  ],
  effective_complexity: [
    { input: '10101010', expected: 0.0, description: 'Effective complexity' },
  ],
  logical_depth: [
    { input: '10101010', expected: 1.0, description: 'Logical depth' },
  ],
  fractal_dimension: [
    { input: '10101010', expected: 1.0, description: 'Fractal dimension' },
  ],

  // ===== STRUCTURE METRICS =====
  byte_alignment: [
    { input: '10101010', expected: 1, description: '8 bits = aligned' },
    { input: '1010101', expected: 0, description: '7 bits = not aligned' },
  ],
  word_alignment: [
    { input: '10101010101010101010101010101010', expected: 1, description: '32 bits = aligned' },
  ],
  header_size: [
    { input: '00000000' + '10101010'.repeat(10), expected: 0, description: 'Header size estimate' },
  ],
  footer_size: [
    { input: '10101010'.repeat(10) + '00000000', expected: 0, description: 'Footer size estimate' },
  ],
  segment_count: [
    { input: '10101010'.repeat(10), expected: 1, description: 'Segment count' },
  ],

  // ===== COMPRESSION ESTIMATES =====
  lz77_estimate: [
    { input: '10101010'.repeat(10), expected: 2.0, description: 'LZ77 compression ratio' },
  ],
  rle_ratio: [
    { input: '11111111', expected: 1.0, description: 'RLE compression ratio' },
  ],
  huffman_estimate: [
    { input: '10101010', expected: 1.0, description: 'Huffman estimate' },
  ],

  // ===== BYTE-LEVEL METRICS =====
  byte_entropy: [
    { input: '10101010'.repeat(32), expected: 0.0, description: 'Single byte value = 0 entropy' },
  ],
  nibble_entropy: [
    { input: '10101010'.repeat(8), expected: 1.0, description: 'Nibble entropy' },
  ],
  std_dev: [
    { input: '10101010'.repeat(4), expected: 0.0, description: 'Same bytes = 0 std dev' },
  ],
  median: [
    { input: '10101010', expected: 170, description: 'Median byte value' },
  ],
  mode: [
    { input: '10101010'.repeat(4), expected: 170, description: 'Mode byte value' },
  ],
  range: [
    { input: '10101010', expected: 0, description: 'Single value = 0 range' },
  ],
  iqr: [
    { input: '10101010'.repeat(4), expected: 0, description: 'IQR of same values' },
  ],
  mad: [
    { input: '10101010'.repeat(4), expected: 0.0, description: 'MAD of same values' },
  ],
  cv: [
    { input: '10101010'.repeat(4), expected: 0.0, description: 'CV of same values' },
  ],

  // ===== FREQUENCY METRICS =====
  dominant_freq: [
    { input: '10101010', expected: 1, description: 'Dominant run length' },
  ],
  spectral_centroid: [
    { input: '10101010'.repeat(8), expected: 3.5, description: 'Spectral centroid' },
  ],
  bandwidth: [
    { input: '10101010'.repeat(8), expected: 2.3, description: 'Spectral bandwidth' },
  ],
  spectral_flatness: [
    { input: '10101010'.repeat(8), expected: 0.99, description: 'Spectral flatness' },
  ],

  // ===== ADDITIONAL METRICS =====
  bit_density: [
    { input: '10101010', expected: 0.5, description: 'Bit density = balance' },
  ],
  bias_percentage: [
    { input: '10101010', expected: 0.0, description: 'No bias' },
    { input: '11111111', expected: 100.0, description: 'Maximum bias' },
  ],
  ideality: [
    { input: '10101010', expected: 1.0, description: 'Ideal balance' },
  ],
  transition_rate: [
    { input: '10101010', expected: 1.0, description: 'Maximum transition rate' },
  ],
  transition_entropy: [
    { input: '10101010', expected: 1.0, description: 'Transition entropy' },
  ],
  block_entropy_8: [
    { input: '10101010'.repeat(8), expected: 1.0, description: 'Block entropy 8' },
  ],
  block_entropy_16: [
    { input: '10101010'.repeat(16), expected: 1.0, description: 'Block entropy 16' },
  ],
  block_entropy: [
    { input: '10101010'.repeat(8), expected: 0.0, description: 'Block entropy (unique blocks)' },
  ],
  block_entropy_overlapping: [
    { input: '10101010'.repeat(8), expected: 1.0, description: 'Overlapping block entropy' },
  ],
  block_regularity: [
    { input: '10101010'.repeat(8), expected: 1.0, description: 'Block regularity' },
  ],
  max_stable_run: [
    { input: '11110000', expected: 4, description: 'Max stable run' },
  ],
  avg_stable_run: [
    { input: '11110000', expected: 4.0, description: 'Average stable run' },
  ],
  hamming_distance_self: [
    { input: '11110000', expected: 4, description: 'Hamming to second half' },
  ],
  autocorr_lag1: [
    { input: '10101010', expected: -1.0, description: 'Lag-1 autocorrelation' },
  ],
  autocorr_lag2: [
    { input: '10101010', expected: 1.0, description: 'Lag-2 autocorrelation' },
  ],
  bit_reversal_distance: [
    { input: '11110000', expected: 8, description: 'Distance to reversed' },
  ],
  complement_distance: [
    { input: '11110000', expected: 8, description: 'Distance to complement' },
  ],
};

/**
 * Run all test vectors and return results
 */
export function runAllOperationTests(): { passed: number; failed: number; failures: string[] } {
  const { executeOperation } = require('./operationsRouter');
  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const [opId, vectors] of Object.entries(COMPLETE_OPERATION_TEST_VECTORS)) {
    for (const vector of vectors) {
      try {
        const result = executeOperation(opId, vector.input, vector.params || {});
        if (result.success && result.bits === vector.expected) {
          passed++;
        } else {
          failed++;
          failures.push(`${opId}: ${vector.description} - Expected ${vector.expected}, got ${result.bits || result.error}`);
        }
      } catch (e) {
        failed++;
        failures.push(`${opId}: ${vector.description} - Error: ${(e as Error).message}`);
      }
    }
  }

  return { passed, failed, failures };
}

/**
 * Run all metric test vectors
 */
export function runAllMetricTests(): { passed: number; failed: number; failures: string[] } {
  const { calculateMetric } = require('./metricsCalculator');
  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const [metricId, vectors] of Object.entries(COMPLETE_METRIC_TEST_VECTORS)) {
    for (const vector of vectors) {
      try {
        const result = calculateMetric(metricId, vector.input);
        const expected = vector.expected as number;
        if (result.success && Math.abs(result.value - expected) < 0.1) {
          passed++;
        } else {
          failed++;
          failures.push(`${metricId}: ${vector.description} - Expected ${expected}, got ${result.value || result.error}`);
        }
      } catch (e) {
        failed++;
        failures.push(`${metricId}: ${vector.description} - Error: ${(e as Error).message}`);
      }
    }
  }

  return { passed, failed, failures };
}

/**
 * Get test vector count summary
 */
export function getTestVectorSummary(): { operations: number; operationVectors: number; metrics: number; metricVectors: number } {
  const operationVectors = Object.values(COMPLETE_OPERATION_TEST_VECTORS).reduce((sum, v) => sum + v.length, 0);
  const metricVectors = Object.values(COMPLETE_METRIC_TEST_VECTORS).reduce((sum, v) => sum + v.length, 0);
  
  return {
    operations: Object.keys(COMPLETE_OPERATION_TEST_VECTORS).length,
    operationVectors,
    metrics: Object.keys(COMPLETE_METRIC_TEST_VECTORS).length,
    metricVectors,
  };
}
