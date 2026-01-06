/**
 * Enhanced metrics for compression analysis
 */

export interface EnhancedMetrics {
  hammingWeight: number;
  hammingWeightPercent: number;
  estimatedCompressionRatio: number;
  kolmogorovComplexity: number; // approximation
  autocorrelation: number[];
  longestRepeatedSubstring: {
    sequence: string;
    length: number;
    count: number;
  } | null;
}

export class CompressionMetrics {
  // Calculate Hamming weight (number of 1s)
  static hammingWeight(bits: string): number {
    let weight = 0;
    for (let i = 0; i < bits.length; i++) {
      if (bits[i] === '1') weight++;
    }
    return weight;
  }

  // Calculate Hamming distance between two bit strings
  static hammingDistance(bits1: string, bits2: string): number {
    const maxLen = Math.max(bits1.length, bits2.length);
    const b1 = bits1.padEnd(maxLen, '0');
    const b2 = bits2.padEnd(maxLen, '0');
    
    let distance = 0;
    for (let i = 0; i < maxLen; i++) {
      if (b1[i] !== b2[i]) distance++;
    }
    return distance;
  }

  // Estimate compression ratio based on entropy
  static estimateCompressionRatio(entropy: number, totalBits: number): number {
    if (totalBits === 0) return 1;
    const theoreticalMinBits = entropy * totalBits;
    const currentBytes = Math.ceil(totalBits / 8);
    const compressedBytes = Math.ceil(theoreticalMinBits / 8);
    return currentBytes / Math.max(compressedBytes, 1);
  }

  // Simple autocorrelation at different lags
  static calculateAutocorrelation(bits: string, maxLag: number = 10): number[] {
    const n = bits.length;
    const mean = bits.split('').filter(b => b === '1').length / n;
    const autocorr: number[] = [];

    for (let lag = 0; lag <= Math.min(maxLag, n - 1); lag++) {
      let sum = 0;
      let count = 0;
      
      for (let i = 0; i < n - lag; i++) {
        const x1 = bits[i] === '1' ? 1 : 0;
        const x2 = bits[i + lag] === '1' ? 1 : 0;
        sum += (x1 - mean) * (x2 - mean);
        count++;
      }
      
      autocorr.push(count > 0 ? sum / count : 0);
    }

    return autocorr;
  }

  // Find longest repeated substring (simple implementation)
  static findLongestRepeatedSubstring(bits: string, maxLength: number = 32): {
    sequence: string;
    length: number;
    count: number;
  } | null {
    if (bits.length < 2) return null;

    let longestSeq = '';
    let longestCount = 0;

    // Check substrings of decreasing length
    for (let len = Math.min(maxLength, Math.floor(bits.length / 2)); len >= 2; len--) {
      const seen = new Map<string, number>();
      
      for (let i = 0; i <= bits.length - len; i++) {
        const substr = bits.substring(i, i + len);
        seen.set(substr, (seen.get(substr) || 0) + 1);
      }

      // Find most repeated substring of this length
      for (const [seq, count] of seen) {
        if (count > 1 && (longestSeq === '' || seq.length > longestSeq.length)) {
          longestSeq = seq;
          longestCount = count;
        }
      }

      if (longestSeq !== '') break;
    }

    return longestSeq !== '' ? {
      sequence: longestSeq,
      length: longestSeq.length,
      count: longestCount,
    } : null;
  }

  // Calculate all enhanced metrics
  static analyze(bits: string, entropy: number): EnhancedMetrics {
    const weight = this.hammingWeight(bits);
    const autocorr = this.calculateAutocorrelation(bits, 5);
    const repeated = this.findLongestRepeatedSubstring(bits);

    return {
      hammingWeight: weight,
      hammingWeightPercent: bits.length > 0 ? (weight / bits.length) * 100 : 0,
      estimatedCompressionRatio: this.estimateCompressionRatio(entropy, bits.length),
      kolmogorovComplexity: entropy * bits.length, // rough approximation
      autocorrelation: autocorr,
      longestRepeatedSubstring: repeated,
    };
  }
}
