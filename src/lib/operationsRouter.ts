/**
 * Operations Router - Maps operation IDs to real implementations
 * Connects predefinedManager (database) to binaryOperations (implementations)
 */

import {
  LogicGates,
  ShiftOperations,
  BitManipulation,
  BitPacking,
  ArithmeticOperations,
  AdvancedBitOperations,
} from './binaryOperations';
import { predefinedManager } from './predefinedManager';

export interface OperationParams {
  mask?: string;
  count?: number;
  position?: number;
  bits?: string;
  start?: number;
  end?: number;
  source?: number;
  dest?: number;
  direction?: 'encode' | 'decode';
  value?: string;
  alignment?: number;
  word_size?: number;
}

export interface OperationResult {
  success: boolean;
  bits: string;
  error?: string;
  operationId: string;
  params: OperationParams;
}

/**
 * Generate a deterministic mask using seeded random for reproducibility
 * Uses the bits content as seed for deterministic replay
 */
function generateDeterministicMask(length: number, seed: string): string {
  // Create hash from seed for deterministic randomness
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  
  let mask = '';
  let rng = Math.abs(hash) || 1;
  for (let i = 0; i < length; i++) {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff;
    mask += (rng % 2).toString();
  }
  return mask;
}

// Operations that require masks - these need default masks stored for replay
const OPS_REQUIRING_MASK = new Set(['AND', 'OR', 'XOR', 'NAND', 'NOR', 'XNOR', 'IMPLY', 'NIMPLY', 'CONVERSE', 'MUX', 'MAJ', 'PDEP', 'PEXT', 'BLEND', 'FEISTEL']);
const OPS_THAT_AUTOGENERATE_MASK = new Set<string>(); // No longer auto-generating random masks

// Map operation IDs to their implementations
// DEFAULT MASKS: Use identity-preserving defaults for replay consistency
// - AND: default all 1s (no change) - user must provide mask to filter
// - OR: default all 0s (no change) - user must provide mask to add bits
// - XOR: default all 0s (no change) - user must provide mask to toggle
// - NAND/NOR/XNOR: similar identity-preserving defaults
const OPERATION_IMPLEMENTATIONS: Record<string, (bits: string, params: OperationParams) => string> = {
  // Logic Gates - DEFAULT MASKS ARE IDENTITY-PRESERVING FOR REPLAY CONSISTENCY
  NOT: (bits) => LogicGates.NOT(bits),
  AND: (bits, p) => LogicGates.AND(bits, p.mask || '1'.repeat(bits.length)),  // All 1s = no change (identity)
  OR: (bits, p) => LogicGates.OR(bits, p.mask || '0'.repeat(bits.length)),    // All 0s = no change (identity)
  XOR: (bits, p) => LogicGates.XOR(bits, p.mask || '0'.repeat(bits.length)),  // All 0s = no change (identity)
  NAND: (bits, p) => LogicGates.NAND(bits, p.mask || '0'.repeat(bits.length)), // All 0s with NAND = all 1s (consistent)
  NOR: (bits, p) => LogicGates.NOR(bits, p.mask || '0'.repeat(bits.length)),   // All 0s with NOR = NOT(bits) (consistent)
  XNOR: (bits, p) => LogicGates.XNOR(bits, p.mask || '0'.repeat(bits.length)), // All 0s = NOT(bits) (consistent)

  // Extended Logic Gates
  IMPLY: (bits, p) => {
    const mask = p.mask || '0'.repeat(bits.length);
    let result = '';
    for (let i = 0; i < bits.length; i++) {
      result += (bits[i] === '0' || mask[i % mask.length] === '1') ? '1' : '0';
    }
    return result;
  },
  NIMPLY: (bits, p) => {
    const mask = p.mask || '0'.repeat(bits.length);
    let result = '';
    for (let i = 0; i < bits.length; i++) {
      result += (bits[i] === '1' && mask[i % mask.length] === '0') ? '1' : '0';
    }
    return result;
  },
  CONVERSE: (bits, p) => {
    const mask = p.mask || '0'.repeat(bits.length);
    let result = '';
    for (let i = 0; i < bits.length; i++) {
      result += (bits[i] === '1' || mask[i % mask.length] === '0') ? '1' : '0';
    }
    return result;
  },
  MUX: (bits, p) => {
    // Default: selector all 1s = select input bits (identity-preserving)
    const selector = p.mask || '1'.repeat(bits.length);
    const input1 = p.value || '0'.repeat(bits.length);
    let result = '';
    for (let i = 0; i < bits.length; i++) {
      result += selector[i % selector.length] === '1' ? bits[i] : (input1[i % input1.length] || '0');
    }
    return result;
  },
  MAJ: (bits, p) => {
    const a = p.mask || bits;
    const b = p.value || bits;
    let result = '';
    for (let i = 0; i < bits.length; i++) {
      const sum = (bits[i] === '1' ? 1 : 0) + (a[i % a.length] === '1' ? 1 : 0) + (b[i % b.length] === '1' ? 1 : 0);
      result += sum >= 2 ? '1' : '0';
    }
    return result;
  },
  ODD: (bits) => {
    let result = '';
    for (let i = 0; i < bits.length; i += 8) {
      const byte = bits.slice(i, Math.min(i + 7, bits.length));
      let parity = 0;
      for (const b of byte) if (b === '1') parity++;
      result += byte + (parity % 2 === 0 ? '1' : '0');
    }
    return result.slice(0, bits.length);
  },
  EVEN: (bits) => {
    let result = '';
    for (let i = 0; i < bits.length; i += 8) {
      const byte = bits.slice(i, Math.min(i + 7, bits.length));
      let parity = 0;
      for (const b of byte) if (b === '1') parity++;
      result += byte + (parity % 2 === 1 ? '1' : '0');
    }
    return result.slice(0, bits.length);
  },

  // Shifts
  SHL: (bits, p) => ShiftOperations.logicalShiftLeft(bits, p.count || 1),
  SHR: (bits, p) => ShiftOperations.logicalShiftRight(bits, p.count || 1),
  ASHL: (bits, p) => ShiftOperations.arithmeticShiftLeft(bits, p.count || 1),
  ASHR: (bits, p) => ShiftOperations.arithmeticShiftRight(bits, p.count || 1),

  // Rotations
  ROL: (bits, p) => ShiftOperations.rotateLeft(bits, p.count || 1),
  ROR: (bits, p) => ShiftOperations.rotateRight(bits, p.count || 1),

  // Bit Manipulation
  INSERT: (bits, p) => BitManipulation.insertBits(bits, p.position || 0, p.bits || ''),
  DELETE: (bits, p) => BitManipulation.deleteBits(bits, p.start || 0, (p.start || 0) + (p.count || 1)),
  REPLACE: (bits, p) => BitManipulation.replaceBits(bits, p.start || 0, p.bits || ''),
  MOVE: (bits, p) => BitManipulation.moveBits(bits, p.source || 0, (p.source || 0) + (p.count || 1), p.dest || 0),
  TRUNCATE: (bits, p) => BitManipulation.truncate(bits, p.count || bits.length),
  APPEND: (bits, p) => BitManipulation.appendBits(bits, p.bits || ''),
  
  // Extended Bit Manipulation
  BSET: (bits, p) => {
    const pos = p.position || 0;
    if (pos < 0 || pos >= bits.length) return bits;
    return bits.slice(0, pos) + '1' + bits.slice(pos + 1);
  },
  BCLR: (bits, p) => {
    const pos = p.position || 0;
    if (pos < 0 || pos >= bits.length) return bits;
    return bits.slice(0, pos) + '0' + bits.slice(pos + 1);
  },
  BTOG: (bits, p) => {
    const pos = p.position || 0;
    if (pos < 0 || pos >= bits.length) return bits;
    return bits.slice(0, pos) + (bits[pos] === '1' ? '0' : '1') + bits.slice(pos + 1);
  },
  BEXTRACT: (bits, p) => {
    const start = p.start || 0;
    const length = p.count || 8;
    return bits.slice(start, start + length).padEnd(bits.length, '0');
  },

  // Packing & Alignment
  PAD: (bits, p) => {
    const alignment = p.alignment || 8;
    const padWith = (p.value === '1' ? '1' : '0') as '0' | '1';
    return alignment === 8 ? BitPacking.alignToBytes(bits, padWith) : BitPacking.alignToNibbles(bits, padWith);
  },
  PAD_LEFT: (bits, p) => BitPacking.padLeft(bits, p.count || bits.length + 8, (p.value === '1' ? '1' : '0') as '0' | '1'),
  PAD_RIGHT: (bits, p) => BitPacking.padRight(bits, p.count || bits.length + 8, (p.value === '1' ? '1' : '0') as '0' | '1'),

  // Encoding
  GRAY: (bits, p) => (p.direction === 'decode' ? AdvancedBitOperations.grayToBinary(bits) : AdvancedBitOperations.binaryToGray(bits)),
  ENDIAN: (bits) => AdvancedBitOperations.swapEndianness(bits),
  REVERSE: (bits) => AdvancedBitOperations.reverseBits(bits),

  // Arithmetic
  ADD: (bits, p) => {
    const result = ArithmeticOperations.add(bits, p.value || '1');
    return result.length > bits.length ? result.slice(-bits.length) : result.padStart(bits.length, '0');
  },
  SUB: (bits, p) => {
    const result = ArithmeticOperations.subtract(bits, p.value || '1');
    return result.padStart(bits.length, '0');
  },
  MUL: (bits, p) => {
    const multiplier = p.value || '10';
    let result = '0'.repeat(bits.length * 2);
    let aVal = 0, bVal = 0;
    for (let i = 0; i < bits.length; i++) {
      aVal = aVal * 2 + (bits[i] === '1' ? 1 : 0);
    }
    for (let i = 0; i < multiplier.length; i++) {
      bVal = bVal * 2 + (multiplier[i] === '1' ? 1 : 0);
    }
    const product = aVal * bVal;
    result = product.toString(2).padStart(bits.length, '0');
    return result.slice(-bits.length);
  },
  DIV: (bits, p) => {
    const divisor = p.value || '10';
    let aVal = 0, bVal = 0;
    for (let i = 0; i < bits.length; i++) {
      aVal = aVal * 2 + (bits[i] === '1' ? 1 : 0);
    }
    for (let i = 0; i < divisor.length; i++) {
      bVal = bVal * 2 + (divisor[i] === '1' ? 1 : 0);
    }
    if (bVal === 0) return bits;
    const quotient = Math.floor(aVal / bVal);
    return quotient.toString(2).padStart(bits.length, '0');
  },
  MOD: (bits, p) => {
    const divisor = p.value || '10';
    let aVal = 0, bVal = 0;
    for (let i = 0; i < bits.length; i++) {
      aVal = aVal * 2 + (bits[i] === '1' ? 1 : 0);
    }
    for (let i = 0; i < divisor.length; i++) {
      bVal = bVal * 2 + (divisor[i] === '1' ? 1 : 0);
    }
    if (bVal === 0) return bits;
    const remainder = aVal % bVal;
    return remainder.toString(2).padStart(bits.length, '0');
  },
  ABS: (bits) => {
    if (bits[0] === '0') return bits;
    // Negative: return NEG
    const inverted = LogicGates.NOT(bits);
    let carry = 1;
    let result = '';
    for (let i = inverted.length - 1; i >= 0; i--) {
      const sum = parseInt(inverted[i]) + carry;
      result = (sum % 2) + result;
      carry = Math.floor(sum / 2);
    }
    return result;
  },
  SAT_ADD: (bits, p) => {
    const result = ArithmeticOperations.add(bits, p.value || '1');
    if (result.length > bits.length) {
      return '1'.repeat(bits.length);
    }
    return result.padStart(bits.length, '0');
  },
  SAT_SUB: (bits, p) => {
    let aVal = 0, bVal = 0;
    for (let i = 0; i < bits.length; i++) {
      aVal = aVal * 2 + (bits[i] === '1' ? 1 : 0);
    }
    const sub = p.value || '1';
    for (let i = 0; i < sub.length; i++) {
      bVal = bVal * 2 + (sub[i] === '1' ? 1 : 0);
    }
    const result = Math.max(0, aVal - bVal);
    return result.toString(2).padStart(bits.length, '0');
  },

  // Advanced
  SWAP: (bits, p) => {
    const mid = Math.floor(bits.length / 2);
    const start1 = p.start || 0;
    const end1 = p.end || mid;
    const start2 = end1;
    const end2 = Math.min(end1 + (end1 - start1), bits.length);
    return AdvancedBitOperations.swapBits(bits, start1, end1, start2, end2);
  },

  // Extended operations with implementations
  BUFFER: (bits) => bits,
  
  INC: (bits) => {
    let carry = 1;
    let result = '';
    for (let i = bits.length - 1; i >= 0; i--) {
      const sum = parseInt(bits[i]) + carry;
      result = (sum % 2) + result;
      carry = Math.floor(sum / 2);
    }
    return result;
  },
  
  DEC: (bits) => {
    let borrow = 1;
    let result = '';
    for (let i = bits.length - 1; i >= 0; i--) {
      const bit = parseInt(bits[i]) - borrow;
      if (bit < 0) {
        result = '1' + result;
        borrow = 1;
      } else {
        result = bit.toString() + result;
        borrow = 0;
      }
    }
    return result;
  },
  
  NEG: (bits) => {
    const inverted = LogicGates.NOT(bits);
    let carry = 1;
    let result = '';
    for (let i = inverted.length - 1; i >= 0; i--) {
      const sum = parseInt(inverted[i]) + carry;
      result = (sum % 2) + result;
      carry = Math.floor(sum / 2);
    }
    return result;
  },
  
  BSWAP: (bits) => {
    const bytes: string[] = [];
    for (let i = 0; i < bits.length; i += 8) {
      bytes.push(bits.slice(i, i + 8));
    }
    return bytes.reverse().join('');
  },
  
  WSWAP: (bits) => {
    const words: string[] = [];
    for (let i = 0; i < bits.length; i += 32) {
      words.push(bits.slice(i, i + 32));
    }
    return words.reverse().join('');
  },
  
  NIBSWAP: (bits) => {
    let result = '';
    for (let i = 0; i < bits.length; i += 8) {
      const byte = bits.slice(i, i + 8).padEnd(8, '0');
      result += byte.slice(4, 8) + byte.slice(0, 4);
    }
    return result.slice(0, bits.length);
  },
  
  BITREV: (bits) => AdvancedBitOperations.reverseBits(bits),
  BYTEREV: (bits) => {
    let result = '';
    for (let i = 0; i < bits.length; i += 8) {
      const byte = bits.slice(i, i + 8);
      result += byte.split('').reverse().join('');
    }
    return result;
  },
  
  POPCNT: (bits) => {
    const count = AdvancedBitOperations.populationCount(bits);
    return count.toString(2).padStart(bits.length, '0');
  },
  
  CLZ: (bits) => {
    let count = 0;
    for (const bit of bits) {
      if (bit === '1') break;
      count++;
    }
    return count.toString(2).padStart(bits.length, '0');
  },
  
  CTZ: (bits) => {
    let count = 0;
    for (let i = bits.length - 1; i >= 0; i--) {
      if (bits[i] === '1') break;
      count++;
    }
    return count.toString(2).padStart(bits.length, '0');
  },
  
  INTERLEAVE: (bits, p) => {
    const other = p.value || '0'.repeat(bits.length);
    let result = '';
    for (let i = 0; i < bits.length; i++) {
      result += bits[i] + (other[i] || '0');
    }
    return result.slice(0, bits.length);
  },

  // Arithmetic shift aliases
  ASR: (bits, p) => ShiftOperations.arithmeticShiftRight(bits, p.count || 1),
  ASL: (bits, p) => ShiftOperations.arithmeticShiftLeft(bits, p.count || 1),

  // === New Priority Operations ===
  
  // Manchester encoding (each bit becomes two bits)
  MANCHESTER: (bits) => {
    let result = '';
    for (const bit of bits) {
      result += bit === '1' ? '10' : '01';
    }
    return result.slice(0, bits.length);
  },

  // Differential encoding
  DIFF: (bits) => {
    if (bits.length === 0) return '';
    let result = bits[0];
    for (let i = 1; i < bits.length; i++) {
      result += bits[i] === bits[i - 1] ? '0' : '1';
    }
    return result;
  },

  // Differential decoding
  DEDIFF: (bits) => {
    if (bits.length === 0) return '';
    let result = bits[0];
    let prev = bits[0];
    for (let i = 1; i < bits.length; i++) {
      const current = bits[i] === '0' ? prev : (prev === '0' ? '1' : '0');
      result += current;
      prev = current;
    }
    return result;
  },

  // Run-length encoding (simplified - counts consecutive bits)
  RLE: (bits) => {
    if (bits.length === 0) return '';
    let result = '';
    let count = 1;
    let current = bits[0];
    for (let i = 1; i <= bits.length; i++) {
      if (i < bits.length && bits[i] === current && count < 255) {
        count++;
      } else {
        // Encode as 8-bit count + bit value
        result += count.toString(2).padStart(8, '0') + current;
        if (i < bits.length) {
          current = bits[i];
          count = 1;
        }
      }
    }
    return result.slice(0, bits.length) || bits;
  },

  // Delta encoding
  DELTA: (bits) => {
    if (bits.length < 8) return bits;
    let result = bits.slice(0, 8); // First byte unchanged
    for (let i = 8; i < bits.length; i += 8) {
      const prev = parseInt(bits.slice(i - 8, i), 2);
      const curr = parseInt(bits.slice(i, i + 8).padEnd(8, '0'), 2);
      const delta = (curr - prev + 256) % 256;
      result += delta.toString(2).padStart(8, '0');
    }
    return result.slice(0, bits.length);
  },

  // ZigZag encoding (for signed integers)
  ZIGZAG: (bits) => {
    // Interpret as signed, convert to zigzag
    const isNegative = bits[0] === '1';
    let val = parseInt(bits, 2);
    if (isNegative) {
      val = val - Math.pow(2, bits.length);
    }
    const zigzag = val >= 0 ? val * 2 : (-val * 2) - 1;
    return zigzag.toString(2).padStart(bits.length, '0').slice(-bits.length);
  },

  // Deinterleave - extract every other bit
  DEINTERLEAVE: (bits) => {
    let evens = '';
    let odds = '';
    for (let i = 0; i < bits.length; i++) {
      if (i % 2 === 0) evens += bits[i];
      else odds += bits[i];
    }
    return evens + odds;
  },

  // Shuffle bits (Fisher-Yates-like deterministic)
  // CRITICAL: Uses seed param for replay consistency. If no seed provided, one is computed.
  SHUFFLE: (bits, p) => {
    // Use provided seed or compute from content - seed MUST be stored in params for replay
    const seed = p.count || bits.split('').reduce((a, b, i) => a + (b === '1' ? i : 0), 0) || 1;
    const arr = bits.split('');
    let rng = seed;
    for (let i = arr.length - 1; i > 0; i--) {
      rng = (rng * 1103515245 + 12345) & 0x7fffffff;
      const j = rng % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join('');
  },

  // Unshuffle (reverse of shuffle - requires same seed)
  UNSHUFFLE: (bits, p) => {
    // Use provided seed or compute from content
    const seed = p.count || bits.split('').reduce((a, b, i) => a + (b === '1' ? i : 0), 0) || 1;
    const arr = bits.split('');
    let rng = seed;
    const swaps: [number, number][] = [];
    for (let i = arr.length - 1; i > 0; i--) {
      rng = (rng * 1103515245 + 12345) & 0x7fffffff;
      const j = rng % (i + 1);
      swaps.push([i, j]);
    }
    // Reverse swaps
    for (let k = swaps.length - 1; k >= 0; k--) {
      const [i, j] = swaps[k];
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join('');
  },

  // Copy (identity operation)
  COPY: (bits) => bits,

  // Fill with pattern
  FILL: (bits, p) => {
    const pattern = p.value || '0';
    let result = '';
    for (let i = 0; i < bits.length; i++) {
      result += pattern[i % pattern.length];
    }
    return result;
  },

  // Concat/extend with value
  EXTEND: (bits, p) => {
    const extension = p.value || '0'.repeat(8);
    return (bits + extension).slice(0, bits.length);
  },

  // Checksum (8-bit)
  CHECKSUM8: (bits) => {
    let sum = 0;
    for (let i = 0; i < bits.length; i += 8) {
      const byte = parseInt(bits.slice(i, i + 8).padEnd(8, '0'), 2);
      sum = (sum + byte) & 0xFF;
    }
    return sum.toString(2).padStart(bits.length, '0').slice(-bits.length);
  },

  // CRC-8 (simplified)
  CRC8: (bits) => {
    let crc = 0;
    for (let i = 0; i < bits.length; i += 8) {
      const byte = parseInt(bits.slice(i, i + 8).padEnd(8, '0'), 2);
      crc ^= byte;
      for (let j = 0; j < 8; j++) {
        if (crc & 0x80) {
          crc = ((crc << 1) ^ 0x07) & 0xFF;
        } else {
          crc = (crc << 1) & 0xFF;
        }
      }
    }
    return crc.toString(2).padStart(bits.length, '0').slice(-bits.length);
  },

  // Bit scatter (spread bits apart)
  SCATTER: (bits) => {
    let result = '';
    for (let i = 0; i < bits.length; i++) {
      result += bits[i] + '0';
    }
    return result.slice(0, bits.length);
  },

  // Bit gather (compact bits)
  GATHER: (bits) => {
    let result = '';
    for (let i = 0; i < bits.length; i += 2) {
      result += bits[i];
    }
    return result.padEnd(bits.length, '0');
  },

  // Prefix with pattern
  PREFIX: (bits, p) => {
    const prefix = p.value || '0';
    return (prefix + bits).slice(0, bits.length);
  },

  // Suffix with pattern
  SUFFIX: (bits, p) => {
    const suffix = p.value || '0';
    return (bits + suffix).slice(-bits.length);
  },

  // Repeat pattern to fill
  REPEAT: (bits, p) => {
    const count = Math.max(1, Math.floor(p.count ?? 2));

    // This operation is defined to “expand” short inputs to at least 1 byte
    // and then repeat the first (targetLen / count) chunk to fill targetLen.
    // This matches COMPLETE_OPERATION_TEST_VECTORS.
    const targetLen = bits.length < 8 ? 8 : bits.length;
    const padded = bits.padEnd(targetLen, '0');

    const chunkLen = Math.max(1, Math.floor(targetLen / count));
    const pattern = padded.slice(0, chunkLen);

    let result = '';
    while (result.length < targetLen) {
      result += pattern;
    }

    return result.slice(0, targetLen);
  },

  // Mirror (reflect around center)
  MIRROR: (bits) => {
    const half = Math.floor(bits.length / 2);
    const first = bits.slice(0, half);
    return first + first.split('').reverse().join('');
  },

  // Scramble with LFSR - uses seed param for replay consistency
  LFSR: (bits, p) => {
    // Use provided seed or default - seed MUST be stored for replay
    let lfsr = p.count || 0xACE1;
    let result = '';
    for (let i = 0; i < bits.length; i++) {
      const bit = ((lfsr >> 0) ^ (lfsr >> 2) ^ (lfsr >> 3) ^ (lfsr >> 5)) & 1;
      lfsr = (lfsr >> 1) | (bit << 15);
      const scrambled = (bits[i] === '1' ? 1 : 0) ^ bit;
      result += scrambled.toString();
    }
    return result;
  },

  // Pack bits (remove leading zeros per byte)
  PACK: (bits) => {
    let result = '';
    for (let i = 0; i < bits.length; i += 8) {
      const byte = bits.slice(i, i + 8);
      const val = parseInt(byte, 2);
      const packed = val.toString(2);
      result += packed.padStart(8, '0');
    }
    return result.slice(0, bits.length);
  },

  // Unpack (expand - opposite of pack)
  UNPACK: (bits) => bits, // Identity for now

  // Clamp values
  CLAMP: (bits, p) => {
    const min = parseInt(p.value || '0', 2) || 0;
    const max = parseInt(p.mask || '1'.repeat(bits.length), 2) || 255;
    const val = parseInt(bits, 2);
    const clamped = Math.max(min, Math.min(max, val));
    return clamped.toString(2).padStart(bits.length, '0');
  },

  // Wrap around
  WRAP: (bits, p) => {
    const modulo = parseInt(p.value || '1'.repeat(bits.length), 2) || 256;
    const val = parseInt(bits, 2) % modulo;
    return val.toString(2).padStart(bits.length, '0');
  },

  // === Additional Encoding Operations ===
  
  // NRZI encoding
  NRZI: (bits) => {
    if (bits.length === 0) return '';
    let result = '';
    let current = '0';
    for (const bit of bits) {
      if (bit === '1') {
        current = current === '0' ? '1' : '0';
      }
      result += current;
    }
    return result;
  },

  // NRZI decoding
  DENRZI: (bits) => {
    if (bits.length === 0) return '';
    let result = '';
    let prev = '0';
    for (const bit of bits) {
      result += bit !== prev ? '1' : '0';
      prev = bit;
    }
    return result;
  },

  // Manchester decoding
  DEMANCHESTER: (bits) => {
    let result = '';
    for (let i = 0; i < bits.length - 1; i += 2) {
      const pair = bits.slice(i, i + 2);
      if (pair === '01') result += '0';
      else if (pair === '10') result += '1';
      else result += '0'; // Invalid pair, default to 0
    }
    return result.padEnd(bits.length, '0').slice(0, bits.length);
  },

  // Delta decoding
  DEDELTA: (bits) => {
    if (bits.length < 8) return bits;
    let result = bits.slice(0, 8);
    for (let i = 8; i < bits.length; i += 8) {
      const prev = parseInt(result.slice(-8), 2);
      const delta = parseInt(bits.slice(i, i + 8).padEnd(8, '0'), 2);
      const curr = (prev + delta) % 256;
      result += curr.toString(2).padStart(8, '0');
    }
    return result.slice(0, bits.length);
  },

  // ZigZag decoding
  DEZIGZAG: (bits) => {
    const val = parseInt(bits, 2);
    const decoded = (val >>> 1) ^ -(val & 1);
    const result = decoded < 0 
      ? ((Math.abs(decoded) ^ ((1 << bits.length) - 1)) + 1).toString(2)
      : decoded.toString(2);
    return result.padStart(bits.length, '0').slice(-bits.length);
  },

  // RLE decoding
  DERLE: (bits) => {
    let result = '';
    for (let i = 0; i < bits.length - 8; i += 9) {
      const count = parseInt(bits.slice(i, i + 8), 2);
      const bit = bits[i + 8] || '0';
      result += bit.repeat(Math.min(count, 255));
    }
    return result.slice(0, bits.length) || bits;
  },

  // === Additional Data Operations ===
  
  // Concat with value
  CONCAT: (bits, p) => {
    const data = p.value || '';
    return (bits + data).slice(0, bits.length);
  },

  // Splice data at position
  SPLICE: (bits, p) => {
    const pos = p.position || 0;
    const data = p.value || '';
    return (bits.slice(0, pos) + data + bits.slice(pos)).slice(0, bits.length);
  },

  // Split and return first half
  SPLIT: (bits, p) => {
    const pos = p.position || Math.floor(bits.length / 2);
    return bits.slice(0, pos).padEnd(bits.length, '0');
  },

  // Merge with another stream via XOR
  MERGE: (bits, p) => {
    const other = p.value || '0'.repeat(bits.length);
    let result = '';
    for (let i = 0; i < bits.length; i++) {
      result += bits[i] === other[i % other.length] ? '0' : '1';
    }
    return result;
  },

  // === Crypto Primitives ===
  
  // Simple S-box substitution (nibble-based)
  SBOX: (bits) => {
    // Default AES-like S-box for nibbles
    const sbox = [0xC, 0x5, 0x6, 0xB, 0x9, 0x0, 0xA, 0xD, 0x3, 0xE, 0xF, 0x8, 0x4, 0x7, 0x1, 0x2];
    let result = '';
    for (let i = 0; i < bits.length; i += 4) {
      const nibble = parseInt(bits.slice(i, i + 4).padEnd(4, '0'), 2);
      result += sbox[nibble].toString(2).padStart(4, '0');
    }
    return result.slice(0, bits.length);
  },

  // Permutation
  PERMUTE: (bits, p) => {
    const table = p.value || bits.split('').map((_, i) => i).reverse().join(',');
    const indices = table.split(',').map(Number);
    let result = '';
    for (let i = 0; i < bits.length; i++) {
      const srcIdx = indices[i % indices.length] % bits.length;
      result += bits[srcIdx];
    }
    return result;
  },

  // Feistel round
  FEISTEL: (bits, p) => {
    const key = p.mask || '10101010';
    const half = Math.floor(bits.length / 2);
    const left = bits.slice(0, half);
    const right = bits.slice(half);
    // F function: XOR with key
    let fResult = '';
    for (let i = 0; i < right.length; i++) {
      fResult += right[i] === key[i % key.length] ? '0' : '1';
    }
    // New right = left XOR F(right)
    let newRight = '';
    for (let i = 0; i < left.length; i++) {
      newRight += left[i] === fResult[i % fResult.length] ? '0' : '1';
    }
    return right + newRight;
  },

  // CRC-16
  CRC16: (bits) => {
    let crc = 0xFFFF;
    for (let i = 0; i < bits.length; i += 8) {
      const byte = parseInt(bits.slice(i, i + 8).padEnd(8, '0'), 2);
      crc ^= byte << 8;
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
        } else {
          crc = (crc << 1) & 0xFFFF;
        }
      }
    }
    return crc.toString(2).padStart(bits.length, '0').slice(-bits.length);
  },

  // CRC-32
  CRC32: (bits) => {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bits.length; i += 8) {
      const byte = parseInt(bits.slice(i, i + 8).padEnd(8, '0'), 2);
      crc ^= byte;
      for (let j = 0; j < 8; j++) {
        if (crc & 1) {
          crc = (crc >>> 1) ^ 0xEDB88320;
        } else {
          crc = crc >>> 1;
        }
      }
    }
    crc = (~crc) >>> 0;
    return crc.toString(2).padStart(32, '0').slice(0, bits.length).padStart(bits.length, '0');
  },

  // Fletcher checksum
  FLETCHER: (bits) => {
    let sum1 = 0, sum2 = 0;
    for (let i = 0; i < bits.length; i += 8) {
      const byte = parseInt(bits.slice(i, i + 8).padEnd(8, '0'), 2);
      sum1 = (sum1 + byte) % 255;
      sum2 = (sum2 + sum1) % 255;
    }
    const checksum = (sum2 << 8) | sum1;
    return checksum.toString(2).padStart(bits.length, '0').slice(-bits.length);
  },

  // Adler-32
  ADLER: (bits) => {
    let a = 1, b = 0;
    for (let i = 0; i < bits.length; i += 8) {
      const byte = parseInt(bits.slice(i, i + 8).padEnd(8, '0'), 2);
      a = (a + byte) % 65521;
      b = (b + a) % 65521;
    }
    const adler = (b << 16) | a;
    return adler.toString(2).padStart(32, '0').slice(0, bits.length).padStart(bits.length, '0');
  },

  // Luhn check digit
  LUHN: (bits) => {
    const digits: number[] = [];
    for (let i = 0; i < bits.length; i += 4) {
      digits.push(parseInt(bits.slice(i, i + 4), 2) % 10);
    }
    let sum = 0;
    for (let i = digits.length - 1; i >= 0; i--) {
      let d = digits[i];
      if ((digits.length - 1 - i) % 2 === 1) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      sum += d;
    }
    const check = (10 - (sum % 10)) % 10;
    return check.toString(2).padStart(bits.length, '0').slice(-bits.length);
  },

  // BWT (simplified)
  BWT: (bits) => {
    const n = Math.min(bits.length, 64); // Limit for performance
    const segment = bits.slice(0, n);
    const rotations: string[] = [];
    for (let i = 0; i < n; i++) {
      rotations.push(segment.slice(i) + segment.slice(0, i));
    }
    rotations.sort();
    let result = '';
    for (const rot of rotations) {
      result += rot[n - 1];
    }
    return result.padEnd(bits.length, bits.slice(n));
  },

  // MTF encoding
  MTF: (bits) => {
    const alphabet = ['0', '1'];
    let result = '';
    for (const bit of bits) {
      const idx = alphabet.indexOf(bit);
      result += idx === 0 ? '0' : '1';
      if (idx > 0) {
        alphabet.splice(idx, 1);
        alphabet.unshift(bit);
      }
    }
    return result;
  },

  // Inverse MTF
  IMTF: (bits) => {
    const alphabet = ['0', '1'];
    let result = '';
    for (const bit of bits) {
      const idx = bit === '0' ? 0 : 1;
      result += alphabet[idx];
      if (idx > 0) {
        const char = alphabet[idx];
        alphabet.splice(idx, 1);
        alphabet.unshift(char);
      }
    }
    return result;
  },

  // Rotate left through carry
  RCL: (bits, p) => {
    const count = (p.count || 1) % (bits.length + 1);
    return bits.slice(count) + bits.slice(0, count);
  },

  // Rotate right through carry
  RCR: (bits, p) => {
    const count = (p.count || 1) % (bits.length + 1);
    return bits.slice(-count) + bits.slice(0, -count || bits.length);
  },

  // Funnel shift
  FUNNEL: (bits, p) => {
    const second = p.value || '0'.repeat(bits.length);
    const combined = bits + second;
    const count = (p.count || 0) % combined.length;
    return combined.slice(count, count + bits.length);
  },

  // Base64 encode (simplified)
  BASE64_ENC: (bits) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    for (let i = 0; i < bits.length; i += 6) {
      const idx = parseInt(bits.slice(i, i + 6).padEnd(6, '0'), 2);
      result += chars[idx].charCodeAt(0).toString(2).padStart(8, '0');
    }
    return result.slice(0, bits.length);
  },

  // Hamming encode 7,4
  HAMMING_ENC: (bits) => {
    let result = '';
    for (let i = 0; i < bits.length; i += 4) {
      const d = bits.slice(i, i + 4).padEnd(4, '0').split('').map(Number);
      const p1 = d[0] ^ d[1] ^ d[3];
      const p2 = d[0] ^ d[2] ^ d[3];
      const p3 = d[1] ^ d[2] ^ d[3];
      result += `${p1}${p2}${d[0]}${p3}${d[1]}${d[2]}${d[3]}`;
    }
    return result.slice(0, bits.length);
  },

  // RLL encoding (simplified 1,7 RLL)
  RLL: (bits) => {
    // Simplified: just double each bit
    return bits.split('').map(b => b + b).join('').slice(0, bits.length);
  },

  // Bit test (returns original bits, test result is implicit)
  BTEST: (bits, p) => {
    const pos = p.position || 0;
    // Just return bits unchanged, test is for reading
    return bits;
  },

  // Bit insert field
  BINSERT: (bits, p) => {
    const start = p.start || 0;
    const value = p.value || '0';
    const before = bits.slice(0, start);
    const after = bits.slice(start + value.length);
    return (before + value + after).slice(0, bits.length);
  },

  // Bit deposit (PDEP-like)
  BDEPOSIT: (bits, p) => {
    const mask = p.mask || '1'.repeat(bits.length);
    let result = '';
    let srcIdx = 0;
    for (let i = 0; i < mask.length && result.length < bits.length; i++) {
      if (mask[i] === '1') {
        result += bits[srcIdx] || '0';
        srcIdx++;
      } else {
        result += '0';
      }
    }
    return result.padEnd(bits.length, '0');
  },

  // Bit gather (PEXT-like)
  BGATHER: (bits, p) => {
    const mask = p.mask || '1'.repeat(bits.length);
    let result = '';
    for (let i = 0; i < bits.length; i++) {
      if (mask[i % mask.length] === '1') {
        result += bits[i];
      }
    }
    return result.padEnd(bits.length, '0');
  },

  // === Additional Missing Operations ===
  
  // Inverse Burrows-Wheeler Transform
  IBWT: (bits) => {
    const n = Math.min(bits.length, 64);
    const segment = bits.slice(0, n);
    
    // Build LF mapping table
    const sorted = segment.split('').map((c, i) => ({ c, i }));
    sorted.sort((a, b) => a.c.localeCompare(b.c) || a.i - b.i);
    
    // Find original string by following LF mapping
    let result = '';
    let idx = 0;
    for (let k = 0; k < n; k++) {
      result = sorted[idx].c + result;
      idx = sorted[idx].i;
    }
    return result.padEnd(bits.length, bits.slice(n));
  },

  // Demultiplexer - split alternating bits
  DEMUX: (bits, p) => {
    const channels = p.count || 2;
    const channel = (p.position || 0) % channels;
    let result = '';
    for (let i = channel; i < bits.length; i += channels) {
      result += bits[i];
    }
    return result.padEnd(bits.length, '0');
  },

  // AES-like MixColumns (simplified for 8-bit)
  MIXCOL: (bits) => {
    // GF(2^8) multiply by 2
    const gfMul2 = (byte: number) => {
      const shifted = (byte << 1) & 0xFF;
      return byte & 0x80 ? shifted ^ 0x1B : shifted;
    };
    
    let result = '';
    for (let i = 0; i < bits.length; i += 32) {
      const chunk = bits.slice(i, i + 32).padEnd(32, '0');
      const bytes = [
        parseInt(chunk.slice(0, 8), 2),
        parseInt(chunk.slice(8, 16), 2),
        parseInt(chunk.slice(16, 24), 2),
        parseInt(chunk.slice(24, 32), 2)
      ];
      
      // Simplified MixColumns matrix multiplication
      const mixed = [
        gfMul2(bytes[0]) ^ gfMul2(bytes[1]) ^ bytes[1] ^ bytes[2] ^ bytes[3],
        bytes[0] ^ gfMul2(bytes[1]) ^ gfMul2(bytes[2]) ^ bytes[2] ^ bytes[3],
        bytes[0] ^ bytes[1] ^ gfMul2(bytes[2]) ^ gfMul2(bytes[3]) ^ bytes[3],
        gfMul2(bytes[0]) ^ bytes[0] ^ bytes[1] ^ bytes[2] ^ gfMul2(bytes[3])
      ];
      
      result += mixed.map(b => (b & 0xFF).toString(2).padStart(8, '0')).join('');
    }
    return result.slice(0, bits.length);
  },

  // AES-like ShiftRows (simplified for bit string)
  SHIFTROW: (bits) => {
    if (bits.length < 128) return bits;
    
    // Treat as 4x4 matrix of bytes, shift each row
    const bytes: string[] = [];
    for (let i = 0; i < 128; i += 8) {
      bytes.push(bits.slice(i, i + 8));
    }
    
    // Row 0: no shift, Row 1: shift 1, Row 2: shift 2, Row 3: shift 3
    const matrix = [
      [bytes[0], bytes[1], bytes[2], bytes[3]],
      [bytes[5], bytes[6], bytes[7], bytes[4]], // shift left 1
      [bytes[10], bytes[11], bytes[8], bytes[9]], // shift left 2
      [bytes[15], bytes[12], bytes[13], bytes[14]] // shift left 3
    ];
    
    let result = matrix.flat().join('');
    return result + bits.slice(128);
  },

  // Bit extraction with width
  BEXTR: (bits, p) => {
    const start = p.start || 0;
    const len = p.count || 8;
    const extracted = bits.slice(start, start + len);
    return extracted.padEnd(bits.length, '0');
  },

  // Parallel bit deposit (PDEP-like enhanced)
  PDEP: (bits, p) => {
    const mask = p.mask || '1'.repeat(bits.length);
    let result = '';
    let srcIdx = 0;
    for (let i = 0; i < mask.length && result.length < bits.length; i++) {
      if (mask[i] === '1') {
        result += bits[srcIdx] || '0';
        srcIdx++;
      } else {
        result += '0';
      }
    }
    return result.padEnd(bits.length, '0');
  },

  // Parallel bit extract (PEXT-like enhanced)
  PEXT: (bits, p) => {
    const mask = p.mask || '1'.repeat(bits.length);
    let result = '';
    for (let i = 0; i < bits.length; i++) {
      if (mask[i % mask.length] === '1') {
        result += bits[i];
      }
    }
    return result.padEnd(bits.length, '0');
  },

  // Conditional blend
  BLEND: (bits, p) => {
    const mask = p.mask || '1'.repeat(bits.length);
    const other = p.value || '0'.repeat(bits.length);
    let result = '';
    for (let i = 0; i < bits.length; i++) {
      result += mask[i % mask.length] === '1' ? bits[i] : other[i % other.length];
    }
    return result;
  },
};

// Operation costs for budget management
const OPERATION_COSTS: Record<string, number> = {
  // Logic Gates
  NOT: 1, AND: 1, OR: 1, XOR: 1, NAND: 2, NOR: 2, XNOR: 2,
  IMPLY: 2, NIMPLY: 2, CONVERSE: 2, MUX: 3, MAJ: 3, ODD: 2, EVEN: 2, BUFFER: 0,
  
  // Shifts & Rotations
  SHL: 1, SHR: 1, ASHL: 1, ASHR: 1, ASR: 1, ASL: 1,
  ROL: 1, ROR: 1, RCL: 2, RCR: 2, FUNNEL: 3,
  BSWAP: 2, WSWAP: 2, NIBSWAP: 2, BITREV: 1, BYTEREV: 2,
  
  // Bit Manipulation
  INSERT: 2, DELETE: 2, REPLACE: 2, MOVE: 3, TRUNCATE: 1, APPEND: 1,
  BSET: 1, BCLR: 1, BTOG: 1, BTEST: 1, BEXTRACT: 2, BINSERT: 2, BDEPOSIT: 3, BGATHER: 3,
  INTERLEAVE: 3, DEINTERLEAVE: 3, SHUFFLE: 4, UNSHUFFLE: 4,
  
  // Packing
  PAD: 1, PAD_LEFT: 1, PAD_RIGHT: 1, PACK: 2, UNPACK: 2,
  
  // Encoding
  GRAY: 2, ENDIAN: 2, REVERSE: 1,
  MANCHESTER: 2, DEMANCHESTER: 2, NRZI: 2, DENRZI: 2, DIFF: 2, DEDIFF: 2,
  RLE: 3, DERLE: 3, DELTA: 3, DEDELTA: 3, ZIGZAG: 2, DEZIGZAG: 2,
  RLL: 3, HAMMING_ENC: 4, BASE64_ENC: 3,
  
  // Arithmetic
  ADD: 3, SUB: 3, MUL: 5, DIV: 5, MOD: 4, ABS: 2,
  SAT_ADD: 3, SAT_SUB: 3, INC: 2, DEC: 2, NEG: 2,
  POPCNT: 2, CLZ: 2, CTZ: 2, CLAMP: 2, WRAP: 2,
  
  // Data
  SWAP: 2, COPY: 1, FILL: 2, EXTEND: 2, CONCAT: 2, SPLICE: 3, SPLIT: 2, MERGE: 3,
  PREFIX: 1, SUFFIX: 1, REPEAT: 2, MIRROR: 2, SCATTER: 3, GATHER: 3,
  
  // Checksums
  CHECKSUM8: 2, CRC8: 4, CRC16: 5, CRC32: 6, FLETCHER: 3, ADLER: 3, LUHN: 4,
  
  // Compression
  BWT: 8, MTF: 3, IMTF: 3, LFSR: 4,
  
  // Crypto
  SBOX: 4, PERMUTE: 4, FEISTEL: 5,
};

// Custom operation storage
const customOperations: Map<string, (bits: string, params: OperationParams) => string> = new Map();

function isCodeBasedOperation(operationId: string): boolean {
  const opDef = predefinedManager.getOperation(operationId);
  return !!(opDef?.isCodeBased && opDef.code);
}

/**
 * Execute an operation by ID
 */
export function executeOperation(operationId: string, bits: string, params: OperationParams = {}): OperationResult {
  try {
    // Validate operation exists in predefinedManager OR has built-in implementation
    const opDef = predefinedManager.getOperation(operationId);
    const hasBuiltIn = !!OPERATION_IMPLEMENTATIONS[operationId];
    
    if (!opDef && !hasBuiltIn && !customOperations.has(operationId)) {
      return {
        success: false,
        bits,
        error: `Operation '${operationId}' not found in database or built-in implementations`,
        operationId,
        params,
      };
    }

    // Always work on a copy so we can persist auto-generated params deterministically
    const paramsUsed: OperationParams = { ...params };

    // For operations requiring mask, ensure we store the actual mask used (even if default)
    // This ensures replay uses the exact same mask
    if (OPS_REQUIRING_MASK.has(operationId) && !paramsUsed.mask) {
      // Store the default mask that will be used by the operation
      // This prevents replay mismatches from default mask differences
      const defaultMasks: Record<string, string> = {
        'AND': '1'.repeat(bits.length),   // Identity: no filtering
        'OR': '0'.repeat(bits.length),    // Identity: no adding
        'XOR': '0'.repeat(bits.length),   // Identity: no toggling
        'NAND': '0'.repeat(bits.length),  // Consistent default
        'NOR': '0'.repeat(bits.length),   // Consistent default
        'XNOR': '0'.repeat(bits.length),  // Consistent default
        'IMPLY': '0'.repeat(bits.length),
        'NIMPLY': '0'.repeat(bits.length),
        'CONVERSE': '0'.repeat(bits.length),
        'MUX': '1'.repeat(bits.length),   // Select input (identity)
        'PDEP': '1'.repeat(bits.length),
        'PEXT': '1'.repeat(bits.length),
        'BLEND': '1'.repeat(bits.length), // Select input (identity)
        'FEISTEL': '0'.repeat(bits.length),
      };
      paramsUsed.mask = defaultMasks[operationId] || '0'.repeat(bits.length);
    }

    // CRITICAL: For SHUFFLE, UNSHUFFLE, LFSR - compute and store the seed if not provided
    // This ensures replay uses the exact same seed
    const SEED_OPS = ['SHUFFLE', 'UNSHUFFLE', 'LFSR'];
    if (SEED_OPS.includes(operationId) && paramsUsed.count === undefined) {
      if (operationId === 'LFSR') {
        paramsUsed.count = 0xACE1; // Default LFSR seed
      } else {
        // Compute content-based seed for SHUFFLE/UNSHUFFLE
        paramsUsed.count = bits.split('').reduce((a, b, i) => a + (b === '1' ? i : 0), 0) || 1;
      }
    }

    // Check for custom implementation first
    if (customOperations.has(operationId)) {
      const impl = customOperations.get(operationId)!;
      const result = impl(bits, paramsUsed);
      return { success: true, bits: result, operationId, params: paramsUsed };
    }

    // Check if operation has code-based implementation in predefinedManager
    if (opDef?.isCodeBased && opDef.code) {
      try {
        const fn = new Function('bits', 'params', opDef.code + '\nreturn execute(bits, params);');
        const result = fn(bits, paramsUsed);
        if (typeof result !== 'string') {
          return {
            success: false,
            bits,
            error: `Operation '${operationId}' code must return a string, got ${typeof result}`,
            operationId,
            params: paramsUsed,
          };
        }
        return { success: true, bits: result, operationId, params: paramsUsed };
      } catch (codeError) {
        return {
          success: false,
          bits,
          error: `Operation '${operationId}' code error: ${(codeError as Error).message}`,
          operationId,
          params: paramsUsed,
        };
      }
    }

    // Check built-in implementations
    const impl = OPERATION_IMPLEMENTATIONS[operationId];
    if (!impl) {
      return {
        success: false,
        bits,
        error: `No implementation for operation '${operationId}'`,
        operationId,
        params: paramsUsed,
      };
    }

    const result = impl(bits, paramsUsed);
    return { success: true, bits: result, operationId, params: paramsUsed };
  } catch (error) {
    return {
      success: false,
      bits,
      error: `Operation failed: ${(error as Error).message}`,
      operationId,
      params,
    };
  }
}

/**
 * Execute operation on a specific range of bits
 */
export function executeOperationOnRange(
  operationId: string,
  bits: string,
  start: number,
  end: number,
  params: OperationParams = {}
): OperationResult {
  const before = bits.slice(0, start);
  const target = bits.slice(start, end);
  const after = bits.slice(end);

  const result = executeOperation(operationId, target, params);

  if (result.success) {
    return {
      ...result,
      bits: before + result.bits + after,
    };
  }

  return result;
}

/**
 * Register a custom operation implementation
 */
export function registerOperation(operationId: string, impl: (bits: string, params: OperationParams) => string): void {
  customOperations.set(operationId, impl);
}

/**
 * Unregister a custom operation
 */
export function unregisterOperation(operationId: string): void {
  customOperations.delete(operationId);
}

/**
 * Check if operation has implementation (built-in, code-based, or registered)
 */
export function hasImplementation(operationId: string): boolean {
  return !!OPERATION_IMPLEMENTATIONS[operationId] || customOperations.has(operationId) || isCodeBasedOperation(operationId);
}

/**
 * Get all available operation IDs (only executable ones)
 */
export function getAvailableOperations(): string[] {
  const dbOps = predefinedManager
    .getAllOperations()
    .map((o) => o.id)
    .filter((id) => hasImplementation(id));

  return [...new Set([...dbOps, ...Object.keys(OPERATION_IMPLEMENTATIONS), ...customOperations.keys()])];
}

/**
 * Get operation cost for budget management
 */
export function getOperationCost(operationId: string): number {
  return OPERATION_COSTS[operationId] || 1;
}

/**
 * Get all implemented operations
 */
export function getImplementedOperations(): string[] {
  return getAvailableOperations();
}
