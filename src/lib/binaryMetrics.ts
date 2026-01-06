/**
 * Binary Metrics - Analysis and statistics for binary data
 */

export interface BinaryStats {
  totalBits: number;
  totalBytes: number;
  zeroCount: number;
  oneCount: number;
  zeroPercent: number;
  onePercent: number;
  entropy: number;
  longestZeroRun: { start: number; end: number; length: number } | null;
  longestOneRun: { start: number; end: number; length: number } | null;
  meanRunLength: number;
  estimatedCompressedSize: number;
}

export interface SequenceMatch {
  sequence: string;
  positions: number[];
  count: number;
  meanDistance: number;
  varianceDistance: number;
}

export class BinaryMetrics {
  /**
   * Calculate comprehensive statistics for binary data
   */
  static analyze(bits: string): BinaryStats {
    const totalBits = bits.length;
    const totalBytes = Math.ceil(totalBits / 8);
    
    let zeroCount = 0;
    let oneCount = 0;
    
    for (const bit of bits) {
      if (bit === '0') zeroCount++;
      else if (bit === '1') oneCount++;
    }
    
    const zeroPercent = totalBits > 0 ? (zeroCount / totalBits) * 100 : 0;
    const onePercent = totalBits > 0 ? (oneCount / totalBits) * 100 : 0;
    
    const entropy = this.calculateEntropy(zeroCount, oneCount);
    const longestZeroRun = this.findLongestRun(bits, '0');
    const longestOneRun = this.findLongestRun(bits, '1');
    const meanRunLength = this.calculateMeanRunLength(bits);
    const estimatedCompressedSize = Math.ceil((entropy * totalBits) / 8);
    
    return {
      totalBits,
      totalBytes,
      zeroCount,
      oneCount,
      zeroPercent,
      onePercent,
      entropy,
      longestZeroRun,
      longestOneRun,
      meanRunLength,
      estimatedCompressedSize,
    };
  }

  /**
   * Calculate Shannon entropy in bits per symbol
   */
  static calculateEntropy(zeroCount: number, oneCount: number): number {
    const total = zeroCount + oneCount;
    if (total === 0) return 0;
    
    const p0 = zeroCount / total;
    const p1 = oneCount / total;
    
    let entropy = 0;
    if (p0 > 0) entropy -= p0 * Math.log2(p0);
    if (p1 > 0) entropy -= p1 * Math.log2(p1);
    
    return entropy;
  }

  /**
   * Find longest consecutive run of a specific bit value
   */
  static findLongestRun(bits: string, bitValue: '0' | '1'): { start: number; end: number; length: number } | null {
    let maxStart = -1;
    let maxLength = 0;
    let currentStart = -1;
    let currentLength = 0;
    
    for (let i = 0; i < bits.length; i++) {
      if (bits[i] === bitValue) {
        if (currentStart === -1) {
          currentStart = i;
          currentLength = 1;
        } else {
          currentLength++;
        }
        
        if (currentLength > maxLength) {
          maxLength = currentLength;
          maxStart = currentStart;
        }
      } else {
        currentStart = -1;
        currentLength = 0;
      }
    }
    
    if (maxStart === -1) return null;
    
    return {
      start: maxStart,
      end: maxStart + maxLength - 1,
      length: maxLength,
    };
  }

  /**
   * Calculate mean run length across all runs
   */
  static calculateMeanRunLength(bits: string): number {
    if (bits.length === 0) return 0;
    
    let totalRuns = 0;
    let totalLength = 0;
    let currentLength = 1;
    
    for (let i = 1; i < bits.length; i++) {
      if (bits[i] === bits[i - 1]) {
        currentLength++;
      } else {
        totalRuns++;
        totalLength += currentLength;
        currentLength = 1;
      }
    }
    
    // Don't forget the last run
    totalRuns++;
    totalLength += currentLength;
    
    return totalLength / totalRuns;
  }

  /**
   * Search for a sequence in the binary data
   */
  static searchSequence(bits: string, sequence: string): SequenceMatch {
    const positions: number[] = [];
    
    let index = bits.indexOf(sequence);
    while (index !== -1) {
      positions.push(index);
      index = bits.indexOf(sequence, index + 1);
    }
    
    const count = positions.length;
    const distances: number[] = [];
    
    for (let i = 1; i < positions.length; i++) {
      distances.push(positions[i] - positions[i - 1]);
    }
    
    const meanDistance = distances.length > 0 
      ? distances.reduce((a, b) => a + b, 0) / distances.length 
      : 0;
    
    const varianceDistance = distances.length > 0
      ? distances.reduce((sum, d) => sum + Math.pow(d - meanDistance, 2), 0) / distances.length
      : 0;
    
    return {
      sequence,
      positions,
      count,
      meanDistance,
      varianceDistance,
    };
  }

  /**
   * Search for multiple sequences
   */
  static searchMultipleSequences(bits: string, sequences: string[]): SequenceMatch[] {
    return sequences.map(seq => this.searchSequence(bits, seq));
  }

  /**
   * Find a unique boundary sequence that doesn't exist in the data
   */
  static findUniqueBoundary(bits: string, minLength: number = 8, maxLength: number = 32): string | null {
    for (let length = minLength; length <= maxLength; length++) {
      // Try to find shortest sequence with minimal 1s
      for (let ones = 0; ones <= length; ones++) {
        const candidates = this.generateCandidatesWithOnes(length, ones);
        
        for (const candidate of candidates) {
          if (!bits.includes(candidate)) {
            return candidate;
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Generate candidate sequences with specific number of 1s
   */
  private static generateCandidatesWithOnes(length: number, ones: number): string[] {
    if (ones === 0) return ['0'.repeat(length)];
    if (ones === length) return ['1'.repeat(length)];
    
    // Generate a few candidates (not all combinations for performance)
    const candidates: string[] = [];
    
    // Evenly distributed 1s
    const spacing = Math.floor(length / ones);
    let candidate = '';
    let onesPlaced = 0;
    
    for (let i = 0; i < length; i++) {
      if (onesPlaced < ones && (i % spacing === 0 || i === length - ones + onesPlaced)) {
        candidate += '1';
        onesPlaced++;
      } else {
        candidate += '0';
      }
    }
    candidates.push(candidate);
    
    // All 1s at start
    candidates.push('1'.repeat(ones) + '0'.repeat(length - ones));
    
    // All 1s at end
    candidates.push('0'.repeat(length - ones) + '1'.repeat(ones));
    
    return candidates;
  }

  /**
   * Get first N bits
   */
  static getFirst(bits: string, n: number): string {
    return bits.substring(0, Math.min(n, bits.length));
  }

  /**
   * Get last N bits
   */
  static getLast(bits: string, n: number): string {
    return bits.substring(Math.max(0, bits.length - n));
  }
}
