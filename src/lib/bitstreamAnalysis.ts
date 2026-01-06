/**
 * Bitstream Analysis Library
 * Advanced pattern matching, correlation, and compression analysis
 */

// ============= PATTERN ANALYSIS =============

export interface PatternMatch {
  pattern: string;
  positions: number[];
  count: number;
}

export interface TokenInfo {
  token: string;
  position: number;
  length: number;
}

export const PatternAnalysis = {
  /**
   * Find all occurrences of a pattern in the bit stream
   */
  findPattern: (bits: string, pattern: string): PatternMatch => {
    const positions: number[] = [];
    
    for (let i = 0; i <= bits.length - pattern.length; i++) {
      if (bits.substring(i, i + pattern.length) === pattern) {
        positions.push(i);
      }
    }
    
    return {
      pattern,
      positions,
      count: positions.length
    };
  },

  /**
   * Find all patterns of a specific length and their frequencies
   */
  findAllPatterns: (bits: string, patternLength: number, minOccurrences: number = 2): PatternMatch[] => {
    const patternMap = new Map<string, number[]>();
    
    for (let i = 0; i <= bits.length - patternLength; i++) {
      const pattern = bits.substring(i, i + patternLength);
      const positions = patternMap.get(pattern) || [];
      positions.push(i);
      patternMap.set(pattern, positions);
    }
    
    const results: PatternMatch[] = [];
    patternMap.forEach((positions, pattern) => {
      if (positions.length >= minOccurrences) {
        results.push({
          pattern,
          positions,
          count: positions.length
        });
      }
    });
    
    // Sort by count (most frequent first)
    results.sort((a, b) => b.count - a.count);
    
    return results;
  },

  /**
   * Parse tokens from bit stream (simple token extraction)
   * Tokens are separated by a delimiter pattern
   */
  parseTokens: (bits: string, delimiterPattern: string): TokenInfo[] => {
    const tokens: TokenInfo[] = [];
    let currentPosition = 0;
    
    const delimiterPositions = PatternAnalysis.findPattern(bits, delimiterPattern).positions;
    
    delimiterPositions.forEach((delimPos, idx) => {
      const tokenLength = delimPos - currentPosition;
      if (tokenLength > 0) {
        tokens.push({
          token: bits.substring(currentPosition, delimPos),
          position: currentPosition,
          length: tokenLength
        });
      }
      currentPosition = delimPos + delimiterPattern.length;
    });
    
    // Add final token if any bits remain
    if (currentPosition < bits.length) {
      tokens.push({
        token: bits.substring(currentPosition),
        position: currentPosition,
        length: bits.length - currentPosition
      });
    }
    
    return tokens;
  },

  /**
   * Calculate pattern frequency distribution
   */
  patternFrequency: (bits: string, patternLength: number): Map<string, number> => {
    const frequency = new Map<string, number>();
    
    for (let i = 0; i <= bits.length - patternLength; i++) {
      const pattern = bits.substring(i, i + patternLength);
      frequency.set(pattern, (frequency.get(pattern) || 0) + 1);
    }
    
    return frequency;
  },

  /**
   * Find longest repeated substring
   */
  findLongestRepeatedSubstring: (bits: string, maxLength: number = 64): PatternMatch | null => {
    let longestPattern: PatternMatch | null = null;
    
    for (let length = maxLength; length >= 2; length--) {
      const patterns = PatternAnalysis.findAllPatterns(bits, length, 2);
      if (patterns.length > 0) {
        longestPattern = patterns[0];
        break;
      }
    }
    
    return longestPattern;
  }
};

// ============= TRANSITION ANALYSIS =============

export interface TransitionInfo {
  totalTransitions: number;
  zeroToOne: number;
  oneToZero: number;
  transitionRate: number;
  longestRun: { bit: '0' | '1'; length: number; position: number };
}

export const TransitionAnalysis = {
  /**
   * Analyze bit transitions (0→1 and 1→0)
   */
  analyzeTransitions: (bits: string): TransitionInfo => {
    let totalTransitions = 0;
    let zeroToOne = 0;
    let oneToZero = 0;
    
    for (let i = 1; i < bits.length; i++) {
      if (bits[i] !== bits[i - 1]) {
        totalTransitions++;
        if (bits[i] === '1') {
          zeroToOne++;
        } else {
          oneToZero++;
        }
      }
    }
    
    const transitionRate = bits.length > 0 ? totalTransitions / bits.length : 0;
    
    // Find longest run
    let longestRun = { bit: '0' as '0' | '1', length: 0, position: 0 };
    let currentRunBit = bits[0] as '0' | '1';
    let currentRunLength = 1;
    let currentRunStart = 0;
    
    for (let i = 1; i < bits.length; i++) {
      if (bits[i] === currentRunBit) {
        currentRunLength++;
      } else {
        if (currentRunLength > longestRun.length) {
          longestRun = {
            bit: currentRunBit,
            length: currentRunLength,
            position: currentRunStart
          };
        }
        currentRunBit = bits[i] as '0' | '1';
        currentRunLength = 1;
        currentRunStart = i;
      }
    }
    
    // Check final run
    if (currentRunLength > longestRun.length) {
      longestRun = {
        bit: currentRunBit,
        length: currentRunLength,
        position: currentRunStart
      };
    }
    
    return {
      totalTransitions,
      zeroToOne,
      oneToZero,
      transitionRate,
      longestRun
    };
  },

  /**
   * Detect regions with high transition frequency (edges)
   */
  detectEdges: (bits: string, windowSize: number = 16, threshold: number = 0.5): number[] => {
    const edgePositions: number[] = [];
    
    for (let i = 0; i <= bits.length - windowSize; i++) {
      const window = bits.substring(i, i + windowSize);
      const transitions = TransitionAnalysis.analyzeTransitions(window);
      
      if (transitions.transitionRate >= threshold) {
        edgePositions.push(i);
      }
    }
    
    return edgePositions;
  },

  /**
   * Calculate run-length encoding
   */
  runLengthEncode: (bits: string): Array<{ bit: '0' | '1'; length: number }> => {
    if (bits.length === 0) return [];
    
    const runs: Array<{ bit: '0' | '1'; length: number }> = [];
    let currentBit = bits[0] as '0' | '1';
    let currentLength = 1;
    
    for (let i = 1; i < bits.length; i++) {
      if (bits[i] === currentBit) {
        currentLength++;
      } else {
        runs.push({ bit: currentBit, length: currentLength });
        currentBit = bits[i] as '0' | '1';
        currentLength = 1;
      }
    }
    
    runs.push({ bit: currentBit, length: currentLength });
    
    return runs;
  }
};

// ============= CORRELATION & SIMILARITY =============

export interface CorrelationResult {
  hammingDistance: number;
  similarity: number;
  matchingBits: number;
  totalBits: number;
}

export const CorrelationAnalysis = {
  /**
   * Calculate Hamming distance between two bit streams
   */
  hammingDistance: (bits1: string, bits2: string): number => {
    const length = Math.min(bits1.length, bits2.length);
    let distance = 0;
    
    for (let i = 0; i < length; i++) {
      if (bits1[i] !== bits2[i]) {
        distance++;
      }
    }
    
    // Add difference in lengths
    distance += Math.abs(bits1.length - bits2.length);
    
    return distance;
  },

  /**
   * Calculate similarity score between two bit streams
   */
  calculateSimilarity: (bits1: string, bits2: string): CorrelationResult => {
    const length = Math.min(bits1.length, bits2.length);
    let matchingBits = 0;
    
    for (let i = 0; i < length; i++) {
      if (bits1[i] === bits2[i]) {
        matchingBits++;
      }
    }
    
    const totalBits = Math.max(bits1.length, bits2.length);
    const hammingDistance = totalBits - matchingBits;
    const similarity = totalBits > 0 ? matchingBits / totalBits : 0;
    
    return {
      hammingDistance,
      similarity,
      matchingBits,
      totalBits
    };
  },

  /**
   * Find best alignment between two bit streams
   */
  findBestAlignment: (bits1: string, bits2: string, maxOffset: number = 100): { offset: number; similarity: number } => {
    let bestOffset = 0;
    let bestSimilarity = 0;
    
    for (let offset = -maxOffset; offset <= maxOffset; offset++) {
      let matchCount = 0;
      let compareLength = 0;
      
      for (let i = 0; i < bits1.length; i++) {
        const j = i + offset;
        if (j >= 0 && j < bits2.length) {
          compareLength++;
          if (bits1[i] === bits2[j]) {
            matchCount++;
          }
        }
      }
      
      const similarity = compareLength > 0 ? matchCount / compareLength : 0;
      
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestOffset = offset;
      }
    }
    
    return { offset: bestOffset, similarity: bestSimilarity };
  },

  /**
   * Calculate autocorrelation at different lags
   */
  autocorrelation: (bits: string, maxLag: number = 10): number[] => {
    const results: number[] = [];
    
    for (let lag = 0; lag <= maxLag && lag < bits.length; lag++) {
      let matches = 0;
      const compareLength = bits.length - lag;
      
      for (let i = 0; i < compareLength; i++) {
        if (bits[i] === bits[i + lag]) {
          matches++;
        }
      }
      
      results.push(compareLength > 0 ? matches / compareLength : 0);
    }
    
    return results;
  }
};

// ============= COMPRESSION ANALYSIS =============

export interface CompressionAnalysis {
  rawLength: number;
  compressedLength: number;
  compressionRatio: number;
  spaceSavings: number;
  entropy: number;
  estimatedOptimalSize: number;
}

export const CompressionAnalysisTools = {
  /**
   * Estimate compression ratio using run-length encoding
   */
  estimateRLECompression: (bits: string): CompressionAnalysis => {
    const runs = TransitionAnalysis.runLengthEncode(bits);
    
    // Estimate: each run needs 1 bit for value + bits for length
    const bitsPerLength = Math.ceil(Math.log2(bits.length || 1));
    const compressedLength = runs.length * (1 + bitsPerLength);
    
    return {
      rawLength: bits.length,
      compressedLength,
      compressionRatio: bits.length > 0 ? bits.length / compressedLength : 1,
      spaceSavings: bits.length > 0 ? ((bits.length - compressedLength) / bits.length) * 100 : 0,
      entropy: CompressionAnalysisTools.calculateEntropy(bits),
      estimatedOptimalSize: compressedLength
    };
  },

  /**
   * Calculate Shannon entropy
   */
  calculateEntropy: (bits: string): number => {
    if (bits.length === 0) return 0;
    
    const counts = { '0': 0, '1': 0 };
    for (const bit of bits) {
      counts[bit as '0' | '1']++;
    }
    
    const p0 = counts['0'] / bits.length;
    const p1 = counts['1'] / bits.length;
    
    let entropy = 0;
    if (p0 > 0) entropy -= p0 * Math.log2(p0);
    if (p1 > 0) entropy -= p1 * Math.log2(p1);
    
    return entropy;
  },

  /**
   * Identify compressible regions (low entropy blocks)
   */
  findCompressibleRegions: (bits: string, blockSize: number = 64, entropyThreshold: number = 0.5): Array<{ start: number; end: number; entropy: number }> => {
    const regions: Array<{ start: number; end: number; entropy: number }> = [];
    
    for (let i = 0; i <= bits.length - blockSize; i += blockSize) {
      const block = bits.substring(i, i + blockSize);
      const entropy = CompressionAnalysisTools.calculateEntropy(block);
      
      if (entropy < entropyThreshold) {
        regions.push({
          start: i,
          end: i + blockSize,
          entropy
        });
      }
    }
    
    return regions;
  },

  /**
   * Detect redundant sequences
   */
  detectRedundancy: (bits: string, minPatternLength: number = 8): Array<{ pattern: string; savings: number }> => {
    const patterns = PatternAnalysis.findAllPatterns(bits, minPatternLength, 2);
    
    return patterns.map(p => ({
      pattern: p.pattern,
      savings: (p.count - 1) * p.pattern.length // Bytes saved if we store once
    })).sort((a, b) => b.savings - a.savings);
  }
};
