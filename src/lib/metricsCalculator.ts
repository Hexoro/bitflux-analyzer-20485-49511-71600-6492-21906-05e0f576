/**
 * Metrics Calculator - Maps metric IDs to real calculations
 * Connects predefinedManager (database) to binaryMetrics/advancedMetrics (implementations)
 */

import { BinaryMetrics } from './binaryMetrics';
import { AdvancedMetricsCalculator } from './advancedMetrics';
import { AdvancedBitOperations } from './binaryOperations';
import { IdealityMetrics } from './idealityMetrics';
import { predefinedManager } from './predefinedManager';

export interface MetricResult {
  success: boolean;
  value: number;
  error?: string;
  metricId: string;
}

export interface AllMetricsResult {
  success: boolean;
  metrics: Record<string, number>;
  errors: string[];
  coreMetricsComputed: boolean;
}

// Core metrics that must always work
const CORE_METRICS = ['entropy', 'balance', 'hamming_weight', 'transition_count', 'run_length_avg'];

// Map metric IDs to their implementations
const METRIC_IMPLEMENTATIONS: Record<string, (bits: string) => number> = {
  // Basic metrics from BinaryMetrics
  'entropy': (bits) => {
    const stats = BinaryMetrics.analyze(bits);
    return parseFloat(stats.entropy.toFixed(6));
  },
  
  'hamming_weight': (bits) => {
    return AdvancedBitOperations.populationCount(bits);
  },
  
  'balance': (bits) => {
    const stats = BinaryMetrics.analyze(bits);
    return parseFloat((stats.oneCount / stats.totalBits).toFixed(6));
  },
  
  'transition_count': (bits) => {
    let transitions = 0;
    for (let i = 1; i < bits.length; i++) {
      if (bits[i] !== bits[i - 1]) transitions++;
    }
    return transitions;
  },
  
  'run_length_avg': (bits) => {
    const stats = BinaryMetrics.analyze(bits);
    return parseFloat(stats.meanRunLength.toFixed(4));
  },
  
  'compression_ratio': (bits) => {
    const stats = BinaryMetrics.analyze(bits);
    if (stats.estimatedCompressedSize === 0) return 1;
    return parseFloat((stats.totalBytes / stats.estimatedCompressedSize).toFixed(4));
  },
  
  // Advanced metrics from AdvancedMetricsCalculator
  'chi_square': (bits) => {
    const result = AdvancedMetricsCalculator.chiSquareTest(bits);
    return parseFloat(result.value.toFixed(6));
  },
  
  'autocorrelation': (bits) => {
    const autocorr = AdvancedMetricsCalculator.calculateAutocorrelation(bits, 1);
    return autocorr.length > 1 ? parseFloat(autocorr[1].toFixed(6)) : 0;
  },
  
  'variance': (bits) => {
    return parseFloat(AdvancedMetricsCalculator.calculateVariance(bits).toFixed(6));
  },
  
  'standard_deviation': (bits) => {
    return parseFloat(AdvancedMetricsCalculator.calculateStandardDeviation(bits).toFixed(6));
  },
  
  'skewness': (bits) => {
    return parseFloat(AdvancedMetricsCalculator.calculateSkewness(bits).toFixed(6));
  },
  
  'kurtosis': (bits) => {
    return parseFloat(AdvancedMetricsCalculator.calculateKurtosis(bits).toFixed(6));
  },
  
  'serial_correlation': (bits) => {
    return parseFloat(AdvancedMetricsCalculator.calculateSerialCorrelation(bits).toFixed(6));
  },
  
  'transition_rate': (bits) => {
    const transitions = AdvancedMetricsCalculator.calculateTransitions(bits);
    return parseFloat(transitions.rate.toFixed(6));
  },
  
  'transition_entropy': (bits) => {
    const transitions = AdvancedMetricsCalculator.calculateTransitions(bits);
    return parseFloat(transitions.entropy.toFixed(6));
  },
  
  'pattern_diversity': (bits) => {
    return parseFloat(AdvancedMetricsCalculator.calculatePatternDiversity(bits, 8).toFixed(6));
  },
  
  // Ideality metrics
  'ideality': (bits) => {
    const results = IdealityMetrics.getTopIdealityWindows(bits, 1);
    return results.length > 0 ? parseFloat(results[0].idealityPercentage.toFixed(4)) : 0;
  },
  
  // Kolmogorov estimate (based on compression)
  'kolmogorov_estimate': (bits) => {
    const stats = BinaryMetrics.analyze(bits);
    return stats.estimatedCompressedSize * 8;
  },
  
  // Additional useful metrics
  'bit_density': (bits) => {
    const ones = AdvancedBitOperations.populationCount(bits);
    return parseFloat((ones / bits.length).toFixed(6));
  },
  
  'longest_run_ones': (bits) => {
    const run = BinaryMetrics.findLongestRun(bits, '1');
    return run ? run.length : 0;
  },
  
  'longest_run_zeros': (bits) => {
    const run = BinaryMetrics.findLongestRun(bits, '0');
    return run ? run.length : 0;
  },
  
  'runs_count': (bits) => {
    const result = AdvancedMetricsCalculator.runsTest(bits);
    return result.runs;
  },
  
  'bias_percentage': (bits) => {
    const bias = AdvancedMetricsCalculator.detectBias(bits);
    return parseFloat(bias.percentage.toFixed(4));
  },
  
  'block_entropy_8': (bits) => {
    const blockEntropy = AdvancedMetricsCalculator.calculateBlockEntropy(bits, [8]);
    return blockEntropy.length > 0 ? parseFloat(blockEntropy[0].mean.toFixed(6)) : 0;
  },
  
  'block_entropy_16': (bits) => {
    const blockEntropy = AdvancedMetricsCalculator.calculateBlockEntropy(bits, [16]);
    return blockEntropy.length > 0 ? parseFloat(blockEntropy[0].mean.toFixed(6)) : 0;
  },
  
  // New Extended Metrics
  'conditional_entropy': (bits) => {
    // H(X|Y) ≈ H(X,Y) - H(Y) for adjacent pairs
    const pairs: Record<string, number> = {};
    const singles: Record<string, number> = {};
    for (let i = 0; i < bits.length - 1; i++) {
      const pair = bits[i] + bits[i + 1];
      pairs[pair] = (pairs[pair] || 0) + 1;
      singles[bits[i + 1]] = (singles[bits[i + 1]] || 0) + 1;
    }
    const total = bits.length - 1;
    let jointEntropy = 0;
    for (const p of Object.values(pairs)) {
      const prob = p / total;
      if (prob > 0) jointEntropy -= prob * Math.log2(prob);
    }
    let singlesEntropy = 0;
    for (const s of Object.values(singles)) {
      const prob = s / total;
      if (prob > 0) singlesEntropy -= prob * Math.log2(prob);
    }
    return parseFloat((jointEntropy - singlesEntropy).toFixed(6));
  },
  
  'mutual_info': (bits) => {
    // I(X;Y) = H(X) + H(Y) - H(X,Y)
    const stats = BinaryMetrics.analyze(bits);
    const hx = stats.entropy;
    const pairs: Record<string, number> = {};
    for (let i = 0; i < bits.length - 1; i++) {
      const pair = bits[i] + bits[i + 1];
      pairs[pair] = (pairs[pair] || 0) + 1;
    }
    const total = bits.length - 1;
    let jointEntropy = 0;
    for (const p of Object.values(pairs)) {
      const prob = p / total;
      if (prob > 0) jointEntropy -= prob * Math.log2(prob);
    }
    return parseFloat(Math.max(0, 2 * hx - jointEntropy).toFixed(6));
  },
  
  'joint_entropy': (bits) => {
    const pairs: Record<string, number> = {};
    for (let i = 0; i < bits.length - 1; i++) {
      const pair = bits[i] + bits[i + 1];
      pairs[pair] = (pairs[pair] || 0) + 1;
    }
    const total = bits.length - 1;
    let entropy = 0;
    for (const p of Object.values(pairs)) {
      const prob = p / total;
      if (prob > 0) entropy -= prob * Math.log2(prob);
    }
    return parseFloat(entropy.toFixed(6));
  },
  
  'min_entropy': (bits) => {
    const ones = AdvancedBitOperations.populationCount(bits);
    const zeros = bits.length - ones;
    const maxProb = Math.max(ones, zeros) / bits.length;
    return parseFloat((-Math.log2(maxProb)).toFixed(6));
  },
  
  'lempel_ziv': (bits) => {
    // Lempel-Ziv complexity approximation
    const seen = new Set<string>();
    let complexity = 0;
    let current = '';
    for (const bit of bits) {
      current += bit;
      if (!seen.has(current)) {
        seen.add(current);
        complexity++;
        current = '';
      }
    }
    if (current.length > 0) complexity++;
    const normalized = complexity / (bits.length / Math.log2(bits.length + 1));
    return parseFloat(normalized.toFixed(6));
  },
  
  'spectral_flatness': (bits) => {
    // Wiener entropy approximation using byte distribution
    const bytes: number[] = [];
    for (let i = 0; i < bits.length; i += 8) {
      const byte = bits.slice(i, i + 8).padEnd(8, '0');
      bytes.push(parseInt(byte, 2));
    }
    if (bytes.length === 0) return 0;
    const geometricMean = Math.exp(bytes.reduce((sum, b) => sum + Math.log(b + 1), 0) / bytes.length);
    const arithmeticMean = bytes.reduce((sum, b) => sum + b, 0) / bytes.length;
    if (arithmeticMean === 0) return 0;
    return parseFloat((geometricMean / (arithmeticMean + 1)).toFixed(6));
  },
  
  'leading_zeros': (bits) => {
    let count = 0;
    for (const bit of bits) {
      if (bit === '1') break;
      count++;
    }
    return count;
  },
  
  'trailing_zeros': (bits) => {
    let count = 0;
    for (let i = bits.length - 1; i >= 0; i--) {
      if (bits[i] === '1') break;
      count++;
    }
    return count;
  },
  
  'popcount': (bits) => {
    return AdvancedBitOperations.populationCount(bits);
  },
  
  'parity': (bits) => {
    let parity = 0;
    for (const bit of bits) {
      if (bit === '1') parity ^= 1;
    }
    return parity;
  },
  
  'rise_count': (bits) => {
    let count = 0;
    for (let i = 1; i < bits.length; i++) {
      if (bits[i - 1] === '0' && bits[i] === '1') count++;
    }
    return count;
  },
  
  'fall_count': (bits) => {
    let count = 0;
    for (let i = 1; i < bits.length; i++) {
      if (bits[i - 1] === '1' && bits[i] === '0') count++;
    }
    return count;
  },
  
  'toggle_rate': (bits) => {
    let transitions = 0;
    for (let i = 1; i < bits.length; i++) {
      if (bits[i] !== bits[i - 1]) transitions++;
    }
    return parseFloat((transitions / (bits.length - 1)).toFixed(6));
  },
  
  'unique_ngrams_8': (bits) => {
    const seen = new Set<string>();
    for (let i = 0; i <= bits.length - 8; i++) {
      seen.add(bits.slice(i, i + 8));
    }
    return seen.size;
  },
  
  'symmetry_index': (bits) => {
    let matches = 0;
    const half = Math.floor(bits.length / 2);
    for (let i = 0; i < half; i++) {
      if (bits[i] === bits[bits.length - 1 - i]) matches++;
    }
    return parseFloat((matches / half).toFixed(6));
  },
  
  'byte_alignment': (bits) => {
    return bits.length % 8 === 0 ? 1 : 0;
  },
  
  'word_alignment': (bits) => {
    return bits.length % 32 === 0 ? 1 : 0;
  },

  // === New Priority Metrics ===
  
  'std_dev': (bits) => {
    // Standard deviation of byte values
    const bytes: number[] = [];
    for (let i = 0; i < bits.length; i += 8) {
      bytes.push(parseInt(bits.slice(i, i + 8).padEnd(8, '0'), 2));
    }
    if (bytes.length === 0) return 0;
    const mean = bytes.reduce((a, b) => a + b, 0) / bytes.length;
    const variance = bytes.reduce((sum, b) => sum + Math.pow(b - mean, 2), 0) / bytes.length;
    return parseFloat(Math.sqrt(variance).toFixed(6));
  },

  'median': (bits) => {
    const bytes: number[] = [];
    for (let i = 0; i < bits.length; i += 8) {
      bytes.push(parseInt(bits.slice(i, i + 8).padEnd(8, '0'), 2));
    }
    if (bytes.length === 0) return 0;
    bytes.sort((a, b) => a - b);
    const mid = Math.floor(bytes.length / 2);
    return bytes.length % 2 !== 0 ? bytes[mid] : (bytes[mid - 1] + bytes[mid]) / 2;
  },

  'mode': (bits) => {
    const counts: Record<number, number> = {};
    for (let i = 0; i < bits.length; i += 8) {
      const byte = parseInt(bits.slice(i, i + 8).padEnd(8, '0'), 2);
      counts[byte] = (counts[byte] || 0) + 1;
    }
    let maxCount = 0, mode = 0;
    for (const [val, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        mode = parseInt(val);
      }
    }
    return mode;
  },

  'range': (bits) => {
    let min = 255, max = 0;
    for (let i = 0; i < bits.length; i += 8) {
      const byte = parseInt(bits.slice(i, i + 8).padEnd(8, '0'), 2);
      if (byte < min) min = byte;
      if (byte > max) max = byte;
    }
    return max - min;
  },

  'iqr': (bits) => {
    // Interquartile range
    const bytes: number[] = [];
    for (let i = 0; i < bits.length; i += 8) {
      bytes.push(parseInt(bits.slice(i, i + 8).padEnd(8, '0'), 2));
    }
    if (bytes.length < 4) return 0;
    bytes.sort((a, b) => a - b);
    const q1 = bytes[Math.floor(bytes.length * 0.25)];
    const q3 = bytes[Math.floor(bytes.length * 0.75)];
    return q3 - q1;
  },

  'renyi_entropy': (bits) => {
    // Rényi entropy with alpha=2 (collision entropy)
    const ones = bits.split('').filter(b => b === '1').length;
    const zeros = bits.length - ones;
    if (ones === 0 || zeros === 0) return 0;
    const p1 = ones / bits.length;
    const p0 = zeros / bits.length;
    return parseFloat((-Math.log2(p0 * p0 + p1 * p1)).toFixed(6));
  },

  'monobit_test': (bits) => {
    // NIST monobit test statistic
    const ones = bits.split('').filter(b => b === '1').length;
    const s = Math.abs(ones - (bits.length - ones));
    const testStat = s / Math.sqrt(bits.length);
    return parseFloat(testStat.toFixed(6));
  },

  'runs_test': (bits) => {
    // Total number of runs
    let runs = 1;
    for (let i = 1; i < bits.length; i++) {
      if (bits[i] !== bits[i - 1]) runs++;
    }
    return runs;
  },

  'poker_test': (bits) => {
    // 4-bit pattern frequency test
    const counts: Record<string, number> = {};
    for (let i = 0; i <= bits.length - 4; i += 4) {
      const pattern = bits.slice(i, i + 4);
      counts[pattern] = (counts[pattern] || 0) + 1;
    }
    const m = Math.floor(bits.length / 4);
    if (m === 0) return 0;
    let sum = 0;
    for (const count of Object.values(counts)) {
      sum += count * count;
    }
    return parseFloat(((16 / m) * sum - m).toFixed(6));
  },

  'longest_repeat': (bits) => {
    // Longest repeated substring
    let maxLen = 0;
    for (let len = 1; len <= bits.length / 2; len++) {
      for (let i = 0; i <= bits.length - len * 2; i++) {
        const pattern = bits.slice(i, i + len);
        if (bits.indexOf(pattern, i + len) !== -1) {
          maxLen = len;
        }
      }
      if (maxLen < len - 1) break; // Early exit optimization
    }
    return maxLen;
  },

  'periodicity': (bits) => {
    // Detect periodicity (smallest repeating period)
    for (let period = 1; period <= bits.length / 2; period++) {
      let match = true;
      for (let i = period; i < bits.length && match; i++) {
        if (bits[i] !== bits[i % period]) match = false;
      }
      if (match) return period;
    }
    return bits.length; // No periodicity found
  },

  'unique_ngrams_2': (bits) => {
    const seen = new Set<string>();
    for (let i = 0; i <= bits.length - 2; i++) {
      seen.add(bits.slice(i, i + 2));
    }
    return seen.size;
  },

  'unique_ngrams_4': (bits) => {
    const seen = new Set<string>();
    for (let i = 0; i <= bits.length - 4; i++) {
      seen.add(bits.slice(i, i + 4));
    }
    return seen.size;
  },

  'rise_fall_ratio': (bits) => {
    let rises = 0, falls = 0;
    for (let i = 1; i < bits.length; i++) {
      if (bits[i - 1] === '0' && bits[i] === '1') rises++;
      if (bits[i - 1] === '1' && bits[i] === '0') falls++;
    }
    if (falls === 0) return rises > 0 ? 999 : 1;
    return parseFloat((rises / falls).toFixed(6));
  },

  'max_stable_run': (bits) => {
    // Longest run of same bit
    let maxRun = 1, currentRun = 1;
    for (let i = 1; i < bits.length; i++) {
      if (bits[i] === bits[i - 1]) {
        currentRun++;
        if (currentRun > maxRun) maxRun = currentRun;
      } else {
        currentRun = 1;
      }
    }
    return maxRun;
  },

  'avg_stable_run': (bits) => {
    let runs = 0, totalLen = 0, currentLen = 1;
    for (let i = 1; i <= bits.length; i++) {
      if (i < bits.length && bits[i] === bits[i - 1]) {
        currentLen++;
      } else {
        runs++;
        totalLen += currentLen;
        currentLen = 1;
      }
    }
    return runs > 0 ? parseFloat((totalLen / runs).toFixed(6)) : 0;
  },

  'byte_entropy': (bits) => {
    // Entropy calculated on byte level
    const counts: Record<number, number> = {};
    let total = 0;
    for (let i = 0; i < bits.length; i += 8) {
      const byte = parseInt(bits.slice(i, i + 8).padEnd(8, '0'), 2);
      counts[byte] = (counts[byte] || 0) + 1;
      total++;
    }
    if (total === 0) return 0;
    let entropy = 0;
    for (const count of Object.values(counts)) {
      const p = count / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    return parseFloat(entropy.toFixed(6));
  },

  'nibble_entropy': (bits) => {
    // Entropy on 4-bit level
    const counts: Record<number, number> = {};
    let total = 0;
    for (let i = 0; i < bits.length; i += 4) {
      const nibble = parseInt(bits.slice(i, i + 4).padEnd(4, '0'), 2);
      counts[nibble] = (counts[nibble] || 0) + 1;
      total++;
    }
    if (total === 0) return 0;
    let entropy = 0;
    for (const count of Object.values(counts)) {
      const p = count / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    return parseFloat(entropy.toFixed(6));
  },

  'bit_complexity': (bits) => {
    // Approximate Kolmogorov complexity via compression ratio
    const seen = new Set<string>();
    let complexity = 0;
    let current = '';
    for (const bit of bits) {
      current += bit;
      if (!seen.has(current)) {
        seen.add(current);
        complexity++;
        current = '';
      }
    }
    if (current.length > 0) complexity++;
    return parseFloat((complexity / Math.log2(bits.length + 1)).toFixed(6));
  },

  'hamming_distance_self': (bits) => {
    // Hamming distance between first and second half
    const half = Math.floor(bits.length / 2);
    let distance = 0;
    for (let i = 0; i < half; i++) {
      if (bits[i] !== bits[i + half]) distance++;
    }
    return distance;
  },

  'autocorr_lag1': (bits) => {
    let sum = 0;
    for (let i = 0; i < bits.length - 1; i++) {
      const a = bits[i] === '1' ? 1 : -1;
      const b = bits[i + 1] === '1' ? 1 : -1;
      sum += a * b;
    }
    return parseFloat((sum / (bits.length - 1)).toFixed(6));
  },

  'autocorr_lag2': (bits) => {
    let sum = 0;
    for (let i = 0; i < bits.length - 2; i++) {
      const a = bits[i] === '1' ? 1 : -1;
      const b = bits[i + 2] === '1' ? 1 : -1;
      sum += a * b;
    }
    return parseFloat((sum / (bits.length - 2)).toFixed(6));
  },

  // === Additional Statistics Metrics ===
  
  'mad': (bits) => {
    // Mean Absolute Deviation
    const bytes: number[] = [];
    for (let i = 0; i < bits.length; i += 8) {
      bytes.push(parseInt(bits.slice(i, i + 8).padEnd(8, '0'), 2));
    }
    if (bytes.length === 0) return 0;
    const mean = bytes.reduce((a, b) => a + b, 0) / bytes.length;
    const mad = bytes.reduce((sum, b) => sum + Math.abs(b - mean), 0) / bytes.length;
    return parseFloat(mad.toFixed(6));
  },

  'cv': (bits) => {
    // Coefficient of Variation
    const bytes: number[] = [];
    for (let i = 0; i < bits.length; i += 8) {
      bytes.push(parseInt(bits.slice(i, i + 8).padEnd(8, '0'), 2));
    }
    if (bytes.length === 0) return 0;
    const mean = bytes.reduce((a, b) => a + b, 0) / bytes.length;
    if (mean === 0) return 0;
    const variance = bytes.reduce((sum, b) => sum + Math.pow(b - mean, 2), 0) / bytes.length;
    const stdDev = Math.sqrt(variance);
    return parseFloat((stdDev / mean).toFixed(6));
  },

  // === Compression Estimates ===
  
  'lz77_estimate': (bits) => {
    // Estimate LZ77 compression ratio
    const seen = new Map<string, number>();
    let compressedBits = 0;
    let i = 0;
    while (i < bits.length) {
      let maxLen = 0;
      let matchPos = 0;
      for (let len = 1; len <= Math.min(255, bits.length - i); len++) {
        const pattern = bits.slice(i, i + len);
        if (seen.has(pattern)) {
          maxLen = len;
          matchPos = seen.get(pattern)!;
        }
      }
      if (maxLen >= 3) {
        compressedBits += 16; // distance + length
        i += maxLen;
      } else {
        compressedBits += 9; // literal
        seen.set(bits.slice(i, i + 1), i);
        i++;
      }
    }
    return parseFloat((bits.length / Math.max(1, compressedBits)).toFixed(4));
  },

  'rle_ratio': (bits) => {
    let runs = 0;
    if (bits.length === 0) return 0;
    for (let i = 1; i < bits.length; i++) {
      if (bits[i] !== bits[i - 1]) runs++;
    }
    runs++; // Last run
    const rleSize = runs * 9; // 8 bits count + 1 bit value
    return parseFloat((bits.length / Math.max(1, rleSize)).toFixed(4));
  },

  'huffman_estimate': (bits) => {
    const counts: Record<number, number> = {};
    for (let i = 0; i < bits.length; i += 8) {
      const byte = parseInt(bits.slice(i, i + 8).padEnd(8, '0'), 2);
      counts[byte] = (counts[byte] || 0) + 1;
    }
    const total = Math.ceil(bits.length / 8);
    if (total === 0) return 0;
    let huffmanBits = 0;
    const sorted = Object.values(counts).sort((a, b) => a - b);
    sorted.forEach((count, i) => {
      const codeLen = Math.max(1, Math.ceil(Math.log2(sorted.length - i + 1)));
      huffmanBits += count * codeLen;
    });
    return parseFloat((bits.length / Math.max(1, huffmanBits)).toFixed(4));
  },

  // === Structure Metrics ===
  
  'block_regularity': (bits) => {
    const blockSize = 64;
    const entropies: number[] = [];
    for (let i = 0; i < bits.length; i += blockSize) {
      const block = bits.slice(i, i + blockSize);
      const ones = block.split('').filter(b => b === '1').length;
      const p = ones / block.length;
      const entropy = p > 0 && p < 1 ? -p * Math.log2(p) - (1 - p) * Math.log2(1 - p) : 0;
      entropies.push(entropy);
    }
    if (entropies.length < 2) return 1;
    const mean = entropies.reduce((a, b) => a + b, 0) / entropies.length;
    const variance = entropies.reduce((sum, e) => sum + Math.pow(e - mean, 2), 0) / entropies.length;
    return parseFloat((1 - Math.sqrt(variance)).toFixed(6));
  },

  'segment_count': (bits) => {
    // Count entropy transitions
    const windowSize = 32;
    const threshold = 0.2;
    let transitions = 0;
    let prevEntropy = 0;
    for (let i = 0; i <= bits.length - windowSize; i += windowSize) {
      const window = bits.slice(i, i + windowSize);
      const ones = window.split('').filter(b => b === '1').length;
      const p = ones / windowSize;
      const entropy = p > 0 && p < 1 ? -p * Math.log2(p) - (1 - p) * Math.log2(1 - p) : 0;
      if (i > 0 && Math.abs(entropy - prevEntropy) > threshold) {
        transitions++;
      }
      prevEntropy = entropy;
    }
    return transitions + 1;
  },

  // === Randomness Tests ===
  
  'serial_test': (bits) => {
    // Serial test for 2-bit patterns
    const counts: Record<string, number> = {};
    for (let i = 0; i < bits.length - 1; i++) {
      const pattern = bits.slice(i, i + 2);
      counts[pattern] = (counts[pattern] || 0) + 1;
    }
    const n = bits.length - 1;
    if (n === 0) return 0;
    let sum = 0;
    for (const count of Object.values(counts)) {
      sum += count * count;
    }
    const statistic = (4 / n) * sum - 2 * n;
    return parseFloat(statistic.toFixed(6));
  },

  'apen': (bits) => {
    // Approximate Entropy
    const m = 2;
    const r = 0.2;
    const countPatterns = (m: number) => {
      const patterns: Record<string, number> = {};
      for (let i = 0; i <= bits.length - m; i++) {
        const p = bits.slice(i, i + m);
        patterns[p] = (patterns[p] || 0) + 1;
      }
      return patterns;
    };
    const phi = (m: number) => {
      const patterns = countPatterns(m);
      const total = bits.length - m + 1;
      let sum = 0;
      for (const count of Object.values(patterns)) {
        const p = count / total;
        if (p > 0) sum += p * Math.log(p);
      }
      return sum;
    };
    return parseFloat((phi(m) - phi(m + 1)).toFixed(6));
  },

  'sample_entropy': (bits) => {
    // Sample Entropy (simplified)
    const m = 2;
    const countMatches = (m: number) => {
      let count = 0;
      for (let i = 0; i < bits.length - m; i++) {
        for (let j = i + 1; j < bits.length - m; j++) {
          let match = true;
          for (let k = 0; k < m && match; k++) {
            if (bits[i + k] !== bits[j + k]) match = false;
          }
          if (match) count++;
        }
      }
      return count;
    };
    const a = countMatches(m + 1);
    const b = countMatches(m);
    if (b === 0 || a === 0) return 0;
    return parseFloat((-Math.log(a / b)).toFixed(6));
  },

  // === Frequency Domain ===
  
  'dominant_freq': (bits) => {
    // Simplified: find most common run length
    const runLengths: number[] = [];
    let currentLen = 1;
    for (let i = 1; i < bits.length; i++) {
      if (bits[i] === bits[i - 1]) {
        currentLen++;
      } else {
        runLengths.push(currentLen);
        currentLen = 1;
      }
    }
    runLengths.push(currentLen);
    const counts: Record<number, number> = {};
    for (const len of runLengths) {
      counts[len] = (counts[len] || 0) + 1;
    }
    let maxCount = 0, dominant = 1;
    for (const [len, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        dominant = parseInt(len);
      }
    }
    return dominant;
  },

  'spectral_centroid': (bits) => {
    // Approximate spectral centroid using byte values
    const bytes: number[] = [];
    for (let i = 0; i < bits.length; i += 8) {
      bytes.push(parseInt(bits.slice(i, i + 8).padEnd(8, '0'), 2));
    }
    if (bytes.length === 0) return 0;
    let weightedSum = 0, totalMag = 0;
    for (let i = 0; i < bytes.length; i++) {
      weightedSum += i * bytes[i];
      totalMag += bytes[i];
    }
    if (totalMag === 0) return 0;
    return parseFloat((weightedSum / totalMag).toFixed(6));
  },

  'bandwidth': (bits) => {
    // Spectral bandwidth (std dev of byte positions weighted by values)
    const bytes: number[] = [];
    for (let i = 0; i < bits.length; i += 8) {
      bytes.push(parseInt(bits.slice(i, i + 8).padEnd(8, '0'), 2));
    }
    if (bytes.length === 0) return 0;
    let weightedSum = 0, totalMag = 0;
    for (let i = 0; i < bytes.length; i++) {
      weightedSum += i * bytes[i];
      totalMag += bytes[i];
    }
    if (totalMag === 0) return 0;
    const centroid = weightedSum / totalMag;
    let variance = 0;
    for (let i = 0; i < bytes.length; i++) {
      variance += bytes[i] * Math.pow(i - centroid, 2);
    }
    return parseFloat(Math.sqrt(variance / totalMag).toFixed(6));
  },

  // === Additional Complexity ===
  
  'block_entropy_overlapping': (bits) => {
    // Overlapping block entropy (different from non-overlapping version above)
    const counts: Record<string, number> = {};
    for (let i = 0; i < bits.length - 7; i++) {
      const block = bits.slice(i, i + 8);
      counts[block] = (counts[block] || 0) + 1;
    }
    const total = bits.length - 7;
    if (total <= 0) return 0;
    let entropy = 0;
    for (const count of Object.values(counts)) {
      const p = count / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    return parseFloat(entropy.toFixed(6));
  },

  't_complexity': (bits) => {
    // Titchener complexity approximation
    const seen = new Set<string>();
    let complexity = 0;
    let current = '';
    for (const bit of bits) {
      current += bit;
      if (!seen.has(current)) {
        seen.add(current);
        complexity++;
        current = '';
      }
    }
    return parseFloat((complexity / bits.length).toFixed(6));
  },

  // === Additional Bit Analysis ===
  
  'bit_reversal_distance': (bits) => {
    const reversed = bits.split('').reverse().join('');
    let distance = 0;
    for (let i = 0; i < bits.length; i++) {
      if (bits[i] !== reversed[i]) distance++;
    }
    return distance;
  },

  'complement_distance': (bits) => {
    // Always equals bits.length for binary
    return bits.length;
  },

  // === Cross Entropy and KL Divergence ===
  
  'cross_entropy': (bits) => {
    // Cross entropy with uniform distribution
    const ones = bits.split('').filter(b => b === '1').length;
    const p1 = ones / bits.length;
    const p0 = 1 - p1;
    // Cross entropy with q = 0.5
    const q = 0.5;
    let ce = 0;
    if (p0 > 0) ce -= p0 * Math.log2(q);
    if (p1 > 0) ce -= p1 * Math.log2(q);
    return parseFloat(ce.toFixed(6));
  },

  'kl_divergence': (bits) => {
    // KL divergence from uniform
    const ones = bits.split('').filter(b => b === '1').length;
    const p1 = ones / bits.length;
    const p0 = 1 - p1;
    const q = 0.5;
    let kl = 0;
    if (p0 > 0) kl += p0 * Math.log2(p0 / q);
    if (p1 > 0) kl += p1 * Math.log2(p1 / q);
    return parseFloat(kl.toFixed(6));
  },

  'collision_entropy': (bits) => {
    // H2 = -log2(sum(p^2))
    const ones = bits.split('').filter(b => b === '1').length;
    const zeros = bits.length - ones;
    const p1 = ones / bits.length;
    const p0 = zeros / bits.length;
    const sumSq = p0 * p0 + p1 * p1;
    if (sumSq === 0) return 0;
    return parseFloat((-Math.log2(sumSq)).toFixed(6));
  },

  // === Additional Missing Metrics for Research ===
  
  'header_size': (bits) => {
    // Detect first entropy transition point (low to high entropy transition)
    const windowSize = 32;
    const threshold = 0.3;
    
    for (let i = 0; i + windowSize <= bits.length; i += 8) {
      const window = bits.slice(i, i + windowSize);
      const ones = window.split('').filter(b => b === '1').length;
      const entropy = ones > 0 && ones < windowSize 
        ? -((ones/windowSize) * Math.log2(ones/windowSize) + ((windowSize-ones)/windowSize) * Math.log2((windowSize-ones)/windowSize))
        : 0;
      
      if (entropy > threshold) {
        return i; // First high-entropy region
      }
    }
    return 0;
  },

  'footer_size': (bits) => {
    // Detect last entropy transition point
    const windowSize = 32;
    const threshold = 0.3;
    
    for (let i = bits.length - windowSize; i >= 0; i -= 8) {
      const window = bits.slice(i, i + windowSize);
      const ones = window.split('').filter(b => b === '1').length;
      const entropy = ones > 0 && ones < windowSize 
        ? -((ones/windowSize) * Math.log2(ones/windowSize) + ((windowSize-ones)/windowSize) * Math.log2((windowSize-ones)/windowSize))
        : 0;
      
      if (entropy > threshold) {
        return bits.length - i - windowSize;
      }
    }
    return 0;
  },

  'fractal_dimension': (bits) => {
    // Box-counting dimension approximation
    const boxSizes = [2, 4, 8, 16, 32];
    const counts: number[] = [];
    
    for (const size of boxSizes) {
      let count = 0;
      for (let i = 0; i < bits.length; i += size) {
        const box = bits.slice(i, i + size);
        if (box.includes('1')) count++;
      }
      counts.push(count);
    }
    
    // Linear regression on log-log plot
    const logSizes = boxSizes.map(s => Math.log(1/s));
    const logCounts = counts.map(c => Math.log(c || 1));
    
    const n = logSizes.length;
    const sumX = logSizes.reduce((a, b) => a + b, 0);
    const sumY = logCounts.reduce((a, b) => a + b, 0);
    const sumXY = logSizes.reduce((sum, x, i) => sum + x * logCounts[i], 0);
    const sumX2 = logSizes.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return parseFloat(Math.abs(slope).toFixed(6));
  },

  'logical_depth': (bits) => {
    // Approximate logical depth via compression + decompression complexity
    // Higher depth = more computation needed to produce the string
    const lzComplexity = (() => {
      const seen = new Set<string>();
      let complexity = 0;
      let current = '';
      for (const bit of bits) {
        current += bit;
        if (!seen.has(current)) {
          seen.add(current);
          complexity++;
          current = '';
        }
      }
      return complexity;
    })();
    
    // Logical depth estimate: complexity * log(length) / length
    const estimate = (lzComplexity * Math.log2(bits.length + 1)) / bits.length;
    return parseFloat(estimate.toFixed(6));
  },

  'effective_complexity': (bits) => {
    // Effective complexity: maximum of regular and random parts
    const ones = bits.split('').filter(b => b === '1').length;
    const entropy = ones > 0 && ones < bits.length
      ? -((ones/bits.length) * Math.log2(ones/bits.length) + ((bits.length-ones)/bits.length) * Math.log2((bits.length-ones)/bits.length))
      : 0;
    
    // Measure regularity via run patterns
    let runs = 1;
    for (let i = 1; i < bits.length; i++) {
      if (bits[i] !== bits[i-1]) runs++;
    }
    const regularity = 1 - (runs / bits.length);
    
    // Effective complexity peaks when both entropy and regularity are balanced
    return parseFloat((entropy * regularity * 4).toFixed(6));
  },

  'spectral_test': (bits) => {
    // Simplified DFT-based periodicity test
    const n = Math.min(bits.length, 256);
    const values = bits.slice(0, n).split('').map(b => b === '1' ? 1 : -1);
    
    // Calculate magnitude at each frequency
    let maxMag = 0;
    let peakFreq = 0;
    
    for (let k = 1; k < n / 2; k++) {
      let realPart = 0, imagPart = 0;
      for (let j = 0; j < n; j++) {
        const angle = (2 * Math.PI * k * j) / n;
        realPart += values[j] * Math.cos(angle);
        imagPart -= values[j] * Math.sin(angle);
      }
      const mag = Math.sqrt(realPart * realPart + imagPart * imagPart);
      if (mag > maxMag) {
        maxMag = mag;
        peakFreq = k;
      }
    }
    
    // Normalize: random data should have low peak
    const normalizedPeak = maxMag / Math.sqrt(n);
    return parseFloat(normalizedPeak.toFixed(6));
  },

  'block_entropy': (bits) => {
    // Parameterized block entropy with default block size 8
    const blockSize = 8;
    const counts: Record<string, number> = {};
    let total = 0;
    
    for (let i = 0; i + blockSize <= bits.length; i += blockSize) {
      const block = bits.slice(i, i + blockSize);
      counts[block] = (counts[block] || 0) + 1;
      total++;
    }
    
    if (total === 0) return 0;
    
    let entropy = 0;
    for (const count of Object.values(counts)) {
      const p = count / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    
    return parseFloat(entropy.toFixed(6));
  },

  'time_stamp': () => {
    // Return current timestamp as Unix epoch in seconds
    return Math.floor(Date.now() / 1000);
  },

  'execution_id': () => {
    // Return a random execution ID (for uniqueness)
    return Math.floor(Math.random() * 1000000);
  },
};

// Custom metric storage
const customMetrics: Map<string, (bits: string) => number> = new Map();

/**
 * Calculate a single metric by ID
 */
export function calculateMetric(metricId: string, bits: string): MetricResult {
  try {
    // Check for custom implementation first
    if (customMetrics.has(metricId)) {
      const impl = customMetrics.get(metricId)!;
      const value = impl(bits);
      return { success: true, value, metricId };
    }

    // Check if metric has code-based implementation in predefinedManager
    const metricDef = predefinedManager.getMetric(metricId);
    if (metricDef?.isCodeBased && metricDef.code) {
      try {
        // Execute user-defined JavaScript code
        const fn = new Function('bits', metricDef.code + '\nreturn calculate(bits);');
        const value = fn(bits);
        if (typeof value !== 'number') {
          return {
            success: false,
            value: 0,
            error: `Metric '${metricId}' code must return a number, got ${typeof value}`,
            metricId,
          };
        }
        return { success: true, value, metricId };
      } catch (codeError) {
        return {
          success: false,
          value: 0,
          error: `Metric '${metricId}' code error: ${(codeError as Error).message}`,
          metricId,
        };
      }
    }

    // Check built-in implementations
    const impl = METRIC_IMPLEMENTATIONS[metricId];
    if (!impl) {
      if (metricDef) {
        return {
          success: false,
          value: 0,
          error: `Metric '${metricId}' is defined but has no implementation`,
          metricId,
        };
      }
      return {
        success: false,
        value: 0,
        error: `Metric '${metricId}' not found`,
        metricId,
      };
    }

    const value = impl(bits);
    return { success: true, value, metricId };
  } catch (error) {
    return {
      success: false,
      value: 0,
      error: `Metric calculation failed: ${(error as Error).message}`,
      metricId,
    };
  }
}

/**
 * Calculate metric on a specific range of bits
 */
export function calculateMetricOnRange(
  metricId: string,
  bits: string,
  start: number,
  end: number
): MetricResult {
  const target = bits.slice(start, end);
  return calculateMetric(metricId, target);
}

/**
 * Calculate all metrics - success means core metrics computed
 */
export function calculateAllMetrics(bits: string): AllMetricsResult {
  const metrics: Record<string, number> = {};
  const errors: string[] = [];
  let coreMetricsComputed = true;
  
  // First compute core metrics - these must succeed
  for (const coreId of CORE_METRICS) {
    const result = calculateMetric(coreId, bits);
    if (result.success) {
      metrics[coreId] = result.value;
    } else {
      errors.push(result.error || `Failed to calculate ${coreId}`);
      coreMetricsComputed = false;
    }
  }

  // Then try extended metrics from predefinedManager
  const allMetricDefs = predefinedManager.getAllMetrics();
  
  for (const metricDef of allMetricDefs) {
    // Skip if already computed as core metric
    if (CORE_METRICS.includes(metricDef.id)) continue;
    
    const result = calculateMetric(metricDef.id, bits);
    if (result.success) {
      metrics[metricDef.id] = result.value;
    } else {
      // Extended metrics failing is OK - just log it
      errors.push(result.error || `Failed to calculate ${metricDef.id}`);
    }
  }
  
  return {
    success: coreMetricsComputed, // Success if core metrics work
    metrics,
    errors,
    coreMetricsComputed,
  };
}

/**
 * Calculate specific metrics by IDs
 */
export function calculateMetrics(bits: string, metricIds: string[]): AllMetricsResult {
  const metrics: Record<string, number> = {};
  const errors: string[] = [];
  
  for (const metricId of metricIds) {
    const result = calculateMetric(metricId, bits);
    if (result.success) {
      metrics[metricId] = result.value;
    } else {
      errors.push(result.error || `Failed to calculate ${metricId}`);
    }
  }
  
  return {
    success: errors.length === 0,
    metrics,
    errors,
    coreMetricsComputed: true,
  };
}

/**
 * Register a custom metric implementation
 */
export function registerMetric(metricId: string, impl: (bits: string) => number): void {
  customMetrics.set(metricId, impl);
}

/**
 * Unregister a custom metric
 */
export function unregisterMetric(metricId: string): void {
  customMetrics.delete(metricId);
}

/**
 * Get all available metric IDs (only those with implementations)
 */
export function getAvailableMetrics(): string[] {
  const dbCodeBased = predefinedManager
    .getAllMetrics()
    .filter((m) => !!(m.isCodeBased && m.code))
    .map((m) => m.id);

  return [...new Set([...Object.keys(METRIC_IMPLEMENTATIONS), ...customMetrics.keys(), ...dbCodeBased])];
}

/**
 * Get all defined metrics (may not have implementations)
 */
export function getAllDefinedMetrics(): string[] {
  const dbMetrics = predefinedManager.getAllMetrics().map((m) => m.id);
  return [...new Set([...dbMetrics, ...Object.keys(METRIC_IMPLEMENTATIONS)])];
}

/**
 * Check if metric has implementation (built-in, code-based, or registered)
 */
export function hasImplementation(metricId: string): boolean {
  const metricDef = predefinedManager.getMetric(metricId);
  return !!METRIC_IMPLEMENTATIONS[metricId] || customMetrics.has(metricId) || !!(metricDef?.isCodeBased && metricDef.code);
}

/**
 * Get full analysis using BinaryMetrics
 */
export function getFullAnalysis(bits: string) {
  return BinaryMetrics.analyze(bits);
}

/**
 * Get advanced analysis
 */
export function getAdvancedAnalysis(bits: string) {
  const stats = BinaryMetrics.analyze(bits);
  return AdvancedMetricsCalculator.analyze(bits, stats.entropy);
}

/**
 * Get all implemented metrics
 */
export function getImplementedMetrics(): string[] {
  return [...Object.keys(METRIC_IMPLEMENTATIONS), ...customMetrics.keys()];
}

/**
 * Get metrics by category
 */
export function getMetricsByCategory(): Record<string, string[]> {
  const categories: Record<string, string[]> = {};
  
  for (const metric of predefinedManager.getAllMetrics()) {
    const category = metric.category || 'Uncategorized';
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(metric.id);
  }
  
  return categories;
}
