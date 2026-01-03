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
    return stats.estimatedCompressedSize * 8; // In bits
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
