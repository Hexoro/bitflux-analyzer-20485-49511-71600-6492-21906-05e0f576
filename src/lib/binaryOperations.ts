/**
 * Binary Operations Library
 * Comprehensive bitwise and arithmetic operations for binary data manipulation
 */

// ============= BITWISE LOGIC GATES =============

export interface LogicGateOperation {
  AND: (a: string, b: string) => string;
  OR: (a: string, b: string) => string;
  XOR: (a: string, b: string) => string;
  NOT: (a: string) => string;
  NAND: (a: string, b: string) => string;
  NOR: (a: string, b: string) => string;
  XNOR: (a: string, b: string) => string;
}

export const LogicGates: LogicGateOperation = {
  AND: (a: string, b: string): string => {
    // Extend shorter operand by repeating to match length
    const extendedB = b.repeat(Math.ceil(a.length / b.length)).substring(0, a.length);
    let result = '';
    for (let i = 0; i < a.length; i++) {
      result += (a[i] === '1' && extendedB[i] === '1') ? '1' : '0';
    }
    return result;
  },

  OR: (a: string, b: string): string => {
    const extendedB = b.repeat(Math.ceil(a.length / b.length)).substring(0, a.length);
    let result = '';
    for (let i = 0; i < a.length; i++) {
      result += (a[i] === '1' || extendedB[i] === '1') ? '1' : '0';
    }
    return result;
  },

  XOR: (a: string, b: string): string => {
    const extendedB = b.repeat(Math.ceil(a.length / b.length)).substring(0, a.length);
    let result = '';
    for (let i = 0; i < a.length; i++) {
      result += a[i] !== extendedB[i] ? '1' : '0';
    }
    return result;
  },

  NOT: (a: string): string => {
    return a.split('').map(bit => bit === '0' ? '1' : '0').join('');
  },

  NAND: (a: string, b: string): string => {
    return LogicGates.NOT(LogicGates.AND(a, b));
  },

  NOR: (a: string, b: string): string => {
    return LogicGates.NOT(LogicGates.OR(a, b));
  },

  XNOR: (a: string, b: string): string => {
    return LogicGates.NOT(LogicGates.XOR(a, b));
  }
};

// ============= SHIFT & ROTATION OPERATIONS =============

export const ShiftOperations = {
  /**
   * Logical shift left - fill with zeros from right
   */
  logicalShiftLeft: (bits: string, amount: number): string => {
    if (amount <= 0) return bits;
    if (amount >= bits.length) return '0'.repeat(bits.length);
    return bits.substring(amount) + '0'.repeat(amount);
  },

  /**
   * Logical shift right - fill with zeros from left
   */
  logicalShiftRight: (bits: string, amount: number): string => {
    if (amount <= 0) return bits;
    if (amount >= bits.length) return '0'.repeat(bits.length);
    return '0'.repeat(amount) + bits.substring(0, bits.length - amount);
  },

  /**
   * Arithmetic shift left - same as logical (fill with zeros)
   */
  arithmeticShiftLeft: (bits: string, amount: number): string => {
    return ShiftOperations.logicalShiftLeft(bits, amount);
  },

  /**
   * Arithmetic shift right - preserve sign bit (MSB)
   */
  arithmeticShiftRight: (bits: string, amount: number): string => {
    if (amount <= 0) return bits;
    if (amount >= bits.length) return bits[0].repeat(bits.length);
    const signBit = bits[0];
    return signBit.repeat(amount) + bits.substring(0, bits.length - amount);
  },

  /**
   * Rotate left (circular shift left)
   */
  rotateLeft: (bits: string, amount: number): string => {
    if (bits.length === 0) return bits;
    amount = amount % bits.length;
    if (amount === 0) return bits;
    return bits.substring(amount) + bits.substring(0, amount);
  },

  /**
   * Rotate right (circular shift right)
   */
  rotateRight: (bits: string, amount: number): string => {
    if (bits.length === 0) return bits;
    amount = amount % bits.length;
    if (amount === 0) return bits;
    return bits.substring(bits.length - amount) + bits.substring(0, bits.length - amount);
  }
};

// ============= BIT MANIPULATION =============

export const BitManipulation = {
  /**
   * Insert bits at a specific index
   */
  insertBits: (bits: string, index: number, insertedBits: string): string => {
    if (index < 0) index = 0;
    if (index > bits.length) index = bits.length;
    return bits.substring(0, index) + insertedBits + bits.substring(index);
  },

  /**
   * Delete bits in a range
   */
  deleteBits: (bits: string, start: number, end: number): string => {
    if (start < 0) start = 0;
    if (end > bits.length) end = bits.length;
    if (start >= end) return bits;
    return bits.substring(0, start) + bits.substring(end);
  },

  /**
   * Replace bits in a range
   */
  replaceBits: (bits: string, start: number, replacementBits: string): string => {
    if (start < 0) start = 0;
    if (start >= bits.length) return bits;
    const end = Math.min(start + replacementBits.length, bits.length);
    return bits.substring(0, start) + replacementBits.substring(0, end - start) + bits.substring(end);
  },

  /**
   * Peek at bits without modification
   */
  peekBits: (bits: string, start: number, length: number): string => {
    if (start < 0) start = 0;
    if (start >= bits.length) return '';
    return bits.substring(start, start + length);
  },

  /**
   * Move bits from one location to another
   */
  moveBits: (bits: string, srcStart: number, srcEnd: number, destIndex: number): string => {
    if (srcStart < 0 || srcEnd > bits.length || srcStart >= srcEnd) return bits;
    
    const movedBits = bits.substring(srcStart, srcEnd);
    const withoutMoved = bits.substring(0, srcStart) + bits.substring(srcEnd);
    
    if (destIndex < 0) destIndex = 0;
    if (destIndex > withoutMoved.length) destIndex = withoutMoved.length;
    
    return withoutMoved.substring(0, destIndex) + movedBits + withoutMoved.substring(destIndex);
  },

  /**
   * Apply bit mask using specified operation
   */
  applyMask: (bits: string, mask: string, operation: 'AND' | 'OR' | 'XOR'): string => {
    // Extend mask to match bits length by repeating
    const extendedMask = mask.repeat(Math.ceil(bits.length / mask.length)).substring(0, bits.length);
    
    switch (operation) {
      case 'AND':
        return LogicGates.AND(bits, extendedMask);
      case 'OR':
        return LogicGates.OR(bits, extendedMask);
      case 'XOR':
        return LogicGates.XOR(bits, extendedMask);
      default:
        return bits;
    }
  },

  /**
   * Append bits to end
   */
  appendBits: (bits: string, appendedBits: string): string => {
    return bits + appendedBits;
  },

  /**
   * Truncate to specified length
   */
  truncate: (bits: string, length: number): string => {
    if (length < 0) return '';
    if (length >= bits.length) return bits;
    return bits.substring(0, length);
  }
};

// ============= BIT PACKING & ALIGNMENT =============

export const BitPacking = {
  /**
   * Pack multiple decimal values into bit string with specified bit widths
   */
  packValues: (values: Array<{ value: number; bits: number }>): string => {
    let result = '';
    for (const { value, bits } of values) {
      const binary = Math.abs(value).toString(2).padStart(bits, '0');
      result += binary.substring(binary.length - bits); // Take last 'bits' bits
    }
    return result;
  },

  /**
   * Unpack values from bit string using specified bit widths
   */
  unpackValues: (bits: string, bitWidths: number[]): number[] => {
    const values: number[] = [];
    let offset = 0;
    
    for (const width of bitWidths) {
      if (offset + width > bits.length) break;
      const chunk = bits.substring(offset, offset + width);
      values.push(parseInt(chunk, 2));
      offset += width;
    }
    
    return values;
  },

  /**
   * Pad bits to the left
   */
  padLeft: (bits: string, length: number, padWith: '0' | '1' = '0'): string => {
    if (bits.length >= length) return bits;
    return padWith.repeat(length - bits.length) + bits;
  },

  /**
   * Pad bits to the right
   */
  padRight: (bits: string, length: number, padWith: '0' | '1' = '0'): string => {
    if (bits.length >= length) return bits;
    return bits + padWith.repeat(length - bits.length);
  },

  /**
   * Align to nearest byte boundary (8 bits)
   */
  alignToBytes: (bits: string, padWith: '0' | '1' = '0'): string => {
    const remainder = bits.length % 8;
    if (remainder === 0) return bits;
    return bits + padWith.repeat(8 - remainder);
  },

  /**
   * Align to nearest nibble boundary (4 bits)
   */
  alignToNibbles: (bits: string, padWith: '0' | '1' = '0'): string => {
    const remainder = bits.length % 4;
    if (remainder === 0) return bits;
    return bits + padWith.repeat(4 - remainder);
  }
};

// ============= ARITHMETIC OPERATIONS =============

export const ArithmeticOperations = {
  /**
   * Binary addition with carry logic
   */
  add: (a: string, b: string): string => {
    const maxLen = Math.max(a.length, b.length);
    const aPadded = a.padStart(maxLen, '0');
    const bPadded = b.padStart(maxLen, '0');
    
    let result = '';
    let carry = 0;
    
    for (let i = maxLen - 1; i >= 0; i--) {
      const bitA = parseInt(aPadded[i]);
      const bitB = parseInt(bPadded[i]);
      const sum = bitA + bitB + carry;
      
      result = (sum % 2).toString() + result;
      carry = Math.floor(sum / 2);
    }
    
    if (carry) {
      result = '1' + result;
    }
    
    return result;
  },

  /**
   * Binary subtraction with borrow logic
   */
  subtract: (a: string, b: string): string => {
    const maxLen = Math.max(a.length, b.length);
    const aPadded = a.padStart(maxLen, '0');
    const bPadded = b.padStart(maxLen, '0');
    
    let result = '';
    let borrow = 0;
    
    for (let i = maxLen - 1; i >= 0; i--) {
      let bitA = parseInt(aPadded[i]);
      const bitB = parseInt(bPadded[i]);
      
      bitA -= borrow;
      
      if (bitA < bitB) {
        bitA += 2;
        borrow = 1;
      } else {
        borrow = 0;
      }
      
      result = (bitA - bitB).toString() + result;
    }
    
    // Remove leading zeros
    return result.replace(/^0+/, '') || '0';
  },

  /**
   * Binary multiplication using shift-and-add method
   */
  multiply: (a: string, b: string): string => {
    if (a === '0' || b === '0') return '0';
    
    let result = '0';
    
    for (let i = b.length - 1; i >= 0; i--) {
      if (b[i] === '1') {
        const shift = b.length - 1 - i;
        const shifted = a + '0'.repeat(shift);
        result = ArithmeticOperations.add(result, shifted);
      }
    }
    
    return result;
  },

  /**
   * Binary division using shift-and-subtract method
   * Returns { quotient, remainder }
   */
  divide: (dividend: string, divisor: string): { quotient: string; remainder: string } => {
    if (divisor === '0') {
      throw new Error('Division by zero');
    }
    
    if (dividend === '0') {
      return { quotient: '0', remainder: '0' };
    }
    
    // Convert to decimal for simplicity
    const dividendNum = parseInt(dividend, 2);
    const divisorNum = parseInt(divisor, 2);
    
    const quotient = Math.floor(dividendNum / divisorNum).toString(2);
    const remainder = (dividendNum % divisorNum).toString(2);
    
    return { quotient, remainder };
  },

  /**
   * Binary modulo operation
   */
  modulo: (a: string, b: string): string => {
    const { remainder } = ArithmeticOperations.divide(a, b);
    return remainder;
  },

  /**
   * Binary power operation (a ^ b)
   */
  power: (base: string, exponent: string): string => {
    const exp = parseInt(exponent, 2);
    if (exp === 0) return '1';
    
    let result = base;
    for (let i = 1; i < exp; i++) {
      result = ArithmeticOperations.multiply(result, base);
    }
    
    return result;
  },

  /**
   * Convert decimal number to binary string
   */
  fromDecimal: (num: number, minBits: number = 1): string => {
    if (num < 0) {
      throw new Error('Negative numbers not supported');
    }
    const binary = num.toString(2);
    return binary.padStart(minBits, '0');
  },

  /**
   * Convert binary string to decimal number
   */
  toDecimal: (bits: string): number => {
    return parseInt(bits, 2);
  }
};

// ============= ADVANCED BIT OPERATIONS =============

export const AdvancedBitOperations = {
  /**
   * Count number of 1s (Hamming weight / population count)
   */
  populationCount: (bits: string): number => {
    let count = 0;
    for (const bit of bits) {
      if (bit === '1') count++;
    }
    return count;
  },

  /**
   * Swap two bit ranges
   */
  swapBits: (bits: string, range1Start: number, range1End: number, range2Start: number, range2End: number): string => {
    if (range1Start >= range1End || range2Start >= range2End) return bits;
    if (range1Start < 0 || range2End > bits.length) return bits;
    
    const chunk1 = bits.substring(range1Start, range1End);
    const chunk2 = bits.substring(range2Start, range2End);
    
    // Ensure no overlap
    if (range1End > range2Start && range1Start < range2End) return bits;
    
    let result = bits;
    
    // Swap (order matters if ranges are different sizes)
    if (range1Start < range2Start) {
      result = result.substring(0, range1Start) + 
               chunk2 + 
               result.substring(range1End, range2Start) + 
               chunk1 + 
               result.substring(range2End);
    } else {
      result = result.substring(0, range2Start) + 
               chunk1 + 
               result.substring(range2End, range1Start) + 
               chunk2 + 
               result.substring(range1End);
    }
    
    return result;
  },

  /**
   * Reverse bit order
   */
  reverseBits: (bits: string): string => {
    return bits.split('').reverse().join('');
  },

  /**
   * Convert binary to Gray code
   */
  binaryToGray: (bits: string): string => {
    if (bits.length === 0) return bits;
    
    let gray = bits[0];
    for (let i = 1; i < bits.length; i++) {
      gray += bits[i - 1] === bits[i] ? '0' : '1';
    }
    
    return gray;
  },

  /**
   * Convert Gray code to binary
   */
  grayToBinary: (gray: string): string => {
    if (gray.length === 0) return gray;
    
    let binary = gray[0];
    for (let i = 1; i < gray.length; i++) {
      binary += binary[i - 1] === gray[i] ? '0' : '1';
    }
    
    return binary;
  },

  /**
   * Swap endianness (reverse byte order)
   */
  swapEndianness: (bits: string): string => {
    // Pad to byte boundary
    const padded = BitPacking.alignToBytes(bits);
    const bytes: string[] = [];
    
    // Split into bytes
    for (let i = 0; i < padded.length; i += 8) {
      bytes.push(padded.substring(i, i + 8));
    }
    
    // Reverse byte order
    return bytes.reverse().join('').substring(0, bits.length);
  },

  /**
   * Count bit transitions (0→1 or 1→0)
   */
  countTransitions: (bits: string): number => {
    let count = 0;
    for (let i = 1; i < bits.length; i++) {
      if (bits[i] !== bits[i - 1]) count++;
    }
    return count;
  }
};
