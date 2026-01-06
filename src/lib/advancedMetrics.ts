/**
 * Advanced Metrics Library
 * Statistical functions, randomness tests, and advanced binary analysis
 */

export interface AdvancedMetrics {
  // Statistical metrics
  variance: number;
  standardDeviation: number;
  skewness: number;
  kurtosis: number;
  
  // Randomness tests
  chiSquare: { value: number; pValue: number; isRandom: boolean };
  runsTest: { runs: number; expected: number; isRandom: boolean };
  serialCorrelation: number;
  
  // N-gram analysis
  bigramDistribution: Map<string, number>;
  trigramDistribution: Map<string, number>;
  nybbleDistribution: Map<string, number>;
  byteDistribution: Map<string, number>;
  
  // Transition analysis
  transitionCount: { zeroToOne: number; oneToZero: number; total: number };
  transitionRate: number;
  transitionEntropy: number;
  
  // Correlation metrics
  autocorrelation: number[];
  blockEntropy: { blockSize: number; values: number[]; mean: number; variance: number }[];
  
  // Bias detection
  bias: { percentage: number; direction: '0' | '1' | 'balanced' };
  localBiasRegions: { start: number; end: number; bias: number }[];
  
  // Pattern characteristics
  longestRepeatedPattern: { pattern: string; count: number; length: number } | null;
  patternDiversity: number;
  compressionEstimates: {
    rle: number;
    huffman: number;
    lzw: number;
    theoretical: number;
  };
}

export class AdvancedMetricsCalculator {
  /**
   * Calculate variance of bit values
   */
  static calculateVariance(bits: string): number {
    if (bits.length === 0) return 0;
    
    const values = bits.split('').map(b => b === '1' ? 1 : 0);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Calculate standard deviation
   */
  static calculateStandardDeviation(bits: string): number {
    return Math.sqrt(this.calculateVariance(bits));
  }

  /**
   * Calculate skewness (measure of asymmetry)
   */
  static calculateSkewness(bits: string): number {
    if (bits.length === 0) return 0;
    
    const values = bits.split('').map(b => b === '1' ? 1 : 0);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const n = values.length;
    
    const m3 = values.reduce((sum, v) => sum + Math.pow(v - mean, 3), 0) / n;
    const m2 = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
    
    return m2 === 0 ? 0 : m3 / Math.pow(m2, 1.5);
  }

  /**
   * Calculate kurtosis (measure of tailedness)
   */
  static calculateKurtosis(bits: string): number {
    if (bits.length === 0) return 0;
    
    const values = bits.split('').map(b => b === '1' ? 1 : 0);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const n = values.length;
    
    const m4 = values.reduce((sum, v) => sum + Math.pow(v - mean, 4), 0) / n;
    const m2 = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
    
    return m2 === 0 ? 0 : (m4 / Math.pow(m2, 2)) - 3;
  }

  /**
   * Chi-square test for randomness
   */
  static chiSquareTest(bits: string): { value: number; pValue: number; isRandom: boolean } {
    if (bits.length === 0) return { value: 0, pValue: 1, isRandom: true };
    
    const ones = bits.split('').filter(b => b === '1').length;
    const zeros = bits.length - ones;
    const expected = bits.length / 2;
    
    const chiSquare = Math.pow(ones - expected, 2) / expected + 
                      Math.pow(zeros - expected, 2) / expected;
    
    // Approximate p-value (degrees of freedom = 1)
    const pValue = Math.exp(-chiSquare / 2);
    
    // Typically p > 0.05 suggests randomness
    return {
      value: chiSquare,
      pValue,
      isRandom: pValue > 0.05
    };
  }

  /**
   * Runs test for randomness
   */
  static runsTest(bits: string): { runs: number; expected: number; isRandom: boolean } {
    if (bits.length < 2) return { runs: 0, expected: 0, isRandom: true };
    
    let runs = 1;
    for (let i = 1; i < bits.length; i++) {
      if (bits[i] !== bits[i - 1]) runs++;
    }
    
    const ones = bits.split('').filter(b => b === '1').length;
    const zeros = bits.length - ones;
    const expected = (2 * ones * zeros) / bits.length + 1;
    
    // Simple heuristic: within 20% of expected
    const isRandom = Math.abs(runs - expected) / expected < 0.2;
    
    return { runs, expected, isRandom };
  }

  /**
   * Calculate serial correlation coefficient
   */
  static calculateSerialCorrelation(bits: string): number {
    if (bits.length < 2) return 0;
    
    const values = bits.split('').map(b => b === '1' ? 1 : 0);
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n - 1; i++) {
      numerator += (values[i] - mean) * (values[i + 1] - mean);
    }
    
    for (let i = 0; i < n; i++) {
      denominator += Math.pow(values[i] - mean, 2);
    }
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * N-gram distributions
   */
  static calculateNGramDistribution(bits: string, n: number): Map<string, number> {
    const distribution = new Map<string, number>();
    
    for (let i = 0; i <= bits.length - n; i++) {
      const ngram = bits.substring(i, i + n);
      distribution.set(ngram, (distribution.get(ngram) || 0) + 1);
    }
    
    return distribution;
  }

  /**
   * Calculate transition metrics
   */
  static calculateTransitions(bits: string): { 
    zeroToOne: number; 
    oneToZero: number; 
    total: number;
    rate: number;
    entropy: number;
  } {
    let zeroToOne = 0;
    let oneToZero = 0;
    
    for (let i = 1; i < bits.length; i++) {
      if (bits[i - 1] === '0' && bits[i] === '1') zeroToOne++;
      if (bits[i - 1] === '1' && bits[i] === '0') oneToZero++;
    }
    
    const total = zeroToOne + oneToZero;
    const rate = bits.length > 1 ? total / (bits.length - 1) : 0;
    
    // Transition entropy
    const p01 = bits.length > 1 ? zeroToOne / (bits.length - 1) : 0;
    const p10 = bits.length > 1 ? oneToZero / (bits.length - 1) : 0;
    const p00 = bits.length > 1 ? (bits.length - 1 - total) / (bits.length - 1) : 0;
    
    let entropy = 0;
    if (p01 > 0) entropy -= p01 * Math.log2(p01);
    if (p10 > 0) entropy -= p10 * Math.log2(p10);
    if (p00 > 0) entropy -= p00 * Math.log2(p00);
    
    return { zeroToOne, oneToZero, total, rate, entropy };
  }

  /**
   * Calculate autocorrelation at multiple lags
   */
  static calculateAutocorrelation(bits: string, maxLag: number = 10): number[] {
    const n = bits.length;
    const values = bits.split('').map(b => b === '1' ? 1 : 0);
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const autocorr: number[] = [];

    for (let lag = 0; lag <= Math.min(maxLag, n - 1); lag++) {
      let sum = 0;
      let variance = 0;
      
      for (let i = 0; i < n - lag; i++) {
        sum += (values[i] - mean) * (values[i + lag] - mean);
      }
      
      for (let i = 0; i < n; i++) {
        variance += Math.pow(values[i] - mean, 2);
      }
      
      autocorr.push(variance === 0 ? 0 : sum / variance);
    }

    return autocorr;
  }

  /**
   * Calculate block entropy for different block sizes
   */
  static calculateBlockEntropy(bits: string, blockSizes: number[] = [8, 16, 32, 64]): {
    blockSize: number;
    values: number[];
    mean: number;
    variance: number;
  }[] {
    return blockSizes.map(blockSize => {
      const values: number[] = [];
      
      for (let i = 0; i <= bits.length - blockSize; i += blockSize) {
        const block = bits.substring(i, i + blockSize);
        const ones = block.split('').filter(b => b === '1').length;
        const p = ones / blockSize;
        
        let entropy = 0;
        if (p > 0 && p < 1) {
          entropy = -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
        }
        
        values.push(entropy);
      }
      
      const mean = values.reduce((a, b) => a + b, 0) / (values.length || 1);
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length || 1);
      
      return { blockSize, values, mean, variance };
    });
  }

  /**
   * Detect bias in the data
   */
  static detectBias(bits: string): {
    percentage: number;
    direction: '0' | '1' | 'balanced';
    localBiasRegions: { start: number; end: number; bias: number }[];
  } {
    const ones = bits.split('').filter(b => b === '1').length;
    const onesPercent = (ones / bits.length) * 100;
    const bias = Math.abs(onesPercent - 50);
    
    let direction: '0' | '1' | 'balanced' = 'balanced';
    if (bias > 5) {
      direction = onesPercent > 50 ? '1' : '0';
    }
    
    // Find local bias regions (blocks with >70% same bit)
    const localBiasRegions: { start: number; end: number; bias: number }[] = [];
    const windowSize = 64;
    
    for (let i = 0; i <= bits.length - windowSize; i += windowSize / 2) {
      const block = bits.substring(i, i + windowSize);
      const blockOnes = block.split('').filter(b => b === '1').length;
      const blockBias = Math.abs((blockOnes / windowSize) * 100 - 50);
      
      if (blockBias > 20) {
        localBiasRegions.push({
          start: i,
          end: i + windowSize,
          bias: blockBias
        });
      }
    }
    
    return { percentage: bias, direction, localBiasRegions };
  }

  /**
   * Estimate compression ratios using different algorithms
   */
  static estimateCompressionRatios(bits: string, entropy: number): {
    rle: number;
    huffman: number;
    lzw: number;
    theoretical: number;
  } {
    // RLE (Run-Length Encoding) estimate
    let runs = 1;
    for (let i = 1; i < bits.length; i++) {
      if (bits[i] !== bits[i - 1]) runs++;
    }
    const rleSize = runs * 8; // Assume 8 bits per run encoding
    const rle = bits.length / Math.max(rleSize, 1);
    
    // Huffman estimate (based on entropy)
    const huffman = bits.length / Math.max(entropy * bits.length, 1);
    
    // LZW estimate (simplified - based on pattern repetition)
    const uniquePatterns = new Set();
    for (let i = 0; i < bits.length - 8; i += 8) {
      uniquePatterns.add(bits.substring(i, i + 8));
    }
    const lzw = bits.length / Math.max(uniquePatterns.size * 8, 1);
    
    // Theoretical minimum (Shannon entropy)
    const theoretical = bits.length / Math.max(entropy * bits.length, 1);
    
    return { rle, huffman, lzw, theoretical };
  }

  /**
   * Calculate pattern diversity (how many unique patterns exist)
   */
  static calculatePatternDiversity(bits: string, patternLength: number = 8): number {
    const uniquePatterns = new Set<string>();
    const maxPatterns = Math.pow(2, patternLength);
    
    for (let i = 0; i <= bits.length - patternLength; i++) {
      uniquePatterns.add(bits.substring(i, i + patternLength));
    }
    
    return uniquePatterns.size / maxPatterns;
  }

  /**
   * Calculate all advanced metrics
   */
  static analyze(bits: string, entropy: number): AdvancedMetrics {
    const transitions = this.calculateTransitions(bits);
    const biasResult = this.detectBias(bits);
    
    return {
      variance: this.calculateVariance(bits),
      standardDeviation: this.calculateStandardDeviation(bits),
      skewness: this.calculateSkewness(bits),
      kurtosis: this.calculateKurtosis(bits),
      
      chiSquare: this.chiSquareTest(bits),
      runsTest: this.runsTest(bits),
      serialCorrelation: this.calculateSerialCorrelation(bits),
      
      bigramDistribution: this.calculateNGramDistribution(bits, 2),
      trigramDistribution: this.calculateNGramDistribution(bits, 3),
      nybbleDistribution: this.calculateNGramDistribution(bits, 4),
      byteDistribution: this.calculateNGramDistribution(bits, 8),
      
      transitionCount: {
        zeroToOne: transitions.zeroToOne,
        oneToZero: transitions.oneToZero,
        total: transitions.total
      },
      transitionRate: transitions.rate,
      transitionEntropy: transitions.entropy,
      
      autocorrelation: this.calculateAutocorrelation(bits, 10),
      blockEntropy: this.calculateBlockEntropy(bits),
      
      bias: biasResult,
      localBiasRegions: biasResult.localBiasRegions,
      
      longestRepeatedPattern: null, // Will be calculated separately
      patternDiversity: this.calculatePatternDiversity(bits),
      compressionEstimates: this.estimateCompressionRatios(bits, entropy),
    };
  }
}
