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

function generateRandomMask(length: number): string {
  let mask = '';
  for (let i = 0; i < length; i++) {
    mask += Math.random() > 0.5 ? '1' : '0';
  }
  return mask;
}

const OPS_THAT_AUTOGENERATE_MASK = new Set(['XOR', 'XNOR']);

// Map operation IDs to their implementations
const OPERATION_IMPLEMENTATIONS: Record<string, (bits: string, params: OperationParams) => string> = {
  // Logic Gates
  NOT: (bits) => LogicGates.NOT(bits),
  AND: (bits, p) => LogicGates.AND(bits, p.mask || '1'.repeat(bits.length)),
  OR: (bits, p) => LogicGates.OR(bits, p.mask || '0'.repeat(bits.length)),
  XOR: (bits, p) => LogicGates.XOR(bits, p.mask || '0'.repeat(bits.length)),
  NAND: (bits, p) => LogicGates.NAND(bits, p.mask || '1'.repeat(bits.length)),
  NOR: (bits, p) => LogicGates.NOR(bits, p.mask || '0'.repeat(bits.length)),
  XNOR: (bits, p) => LogicGates.XNOR(bits, p.mask || '0'.repeat(bits.length)),

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

  // Advanced
  SWAP: (bits, p) => {
    const mid = Math.floor(bits.length / 2);
    const start1 = p.start || 0;
    const end1 = p.end || mid;
    const start2 = end1;
    const end2 = Math.min(end1 + (end1 - start1), bits.length);
    return AdvancedBitOperations.swapBits(bits, start1, end1, start2, end2);
  },
};

// Operation costs for budget management
const OPERATION_COSTS: Record<string, number> = {
  NOT: 1,
  AND: 1,
  OR: 1,
  XOR: 1,
  NAND: 2,
  NOR: 2,
  XNOR: 2,
  SHL: 1,
  SHR: 1,
  ASHL: 1,
  ASHR: 1,
  ROL: 1,
  ROR: 1,
  INSERT: 2,
  DELETE: 2,
  REPLACE: 2,
  MOVE: 3,
  TRUNCATE: 1,
  APPEND: 1,
  PAD: 1,
  PAD_LEFT: 1,
  PAD_RIGHT: 1,
  GRAY: 2,
  ENDIAN: 2,
  REVERSE: 1,
  ADD: 3,
  SUB: 3,
  SWAP: 2,
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
    // Validate operation exists in predefinedManager
    const opDef = predefinedManager.getOperation(operationId);
    if (!opDef) {
      return {
        success: false,
        bits,
        error: `Operation '${operationId}' not found in database`,
        operationId,
        params,
      };
    }

    // Always work on a copy so we can persist auto-generated params deterministically
    const paramsUsed: OperationParams = { ...params };

    // Ensure replay can be exact: if we auto-generate a mask, we must persist it
    if (OPS_THAT_AUTOGENERATE_MASK.has(operationId) && !paramsUsed.mask) {
      paramsUsed.mask = generateRandomMask(bits.length);
    }

    // Check for custom implementation first
    if (customOperations.has(operationId)) {
      const impl = customOperations.get(operationId)!;
      const result = impl(bits, paramsUsed);
      return { success: true, bits: result, operationId, params: paramsUsed };
    }

    // Check if operation has code-based implementation in predefinedManager
    if (opDef.isCodeBased && opDef.code) {
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
