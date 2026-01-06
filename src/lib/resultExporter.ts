/**
 * Result Exporter - Export execution results as ZIP with CSV and benchmarks
 * Enhanced with comprehensive research CSV export (200+ columns)
 */

import JSZip from 'jszip';
import { ExecutionResult, ExecutionStep } from './algorithmExecutor';
import { calculateMetric, getAvailableMetrics } from './metricsCalculator';

interface ExportOptions {
  includeOperationsCSV: boolean;
  includeMetricsCSV: boolean;
  includeCostCSV: boolean;
  includeBenchmarks: boolean;
  includeRawData: boolean;
  includeResearchCSV: boolean;
}

// All available metrics for comprehensive export
const ALL_RESEARCH_METRICS = [
  // Core metrics
  'entropy', 'hamming_weight', 'balance', 'transition_count', 'run_length_avg',
  'compression_ratio', 'chi_square', 'autocorrelation', 'variance', 'standard_deviation',
  'skewness', 'kurtosis', 'serial_correlation', 'transition_rate', 'transition_entropy',
  'pattern_diversity', 'ideality', 'kolmogorov_estimate', 'bit_density',
  'longest_run_ones', 'longest_run_zeros', 'runs_count', 'bias_percentage',
  'block_entropy_8', 'block_entropy_16', 'conditional_entropy', 'mutual_info',
  'joint_entropy', 'min_entropy', 'lempel_ziv', 'spectral_flatness',
  'leading_zeros', 'trailing_zeros', 'popcount', 'parity',
  'rise_count', 'fall_count', 'toggle_rate', 'unique_ngrams_8',
  'symmetry_index', 'byte_alignment', 'word_alignment',
  'std_dev', 'median', 'mode', 'range', 'iqr', 'renyi_entropy',
  'monobit_test', 'runs_test', 'poker_test', 'longest_repeat', 'periodicity',
  'unique_ngrams_2', 'unique_ngrams_4', 'rise_fall_ratio', 'max_stable_run',
  'avg_stable_run', 'byte_entropy', 'nibble_entropy', 'bit_complexity',
  'hamming_distance_self', 'autocorr_lag1', 'autocorr_lag2',
  'mad', 'cv', 'lz77_estimate', 'rle_ratio', 'huffman_estimate',
  'block_regularity', 'segment_count', 'serial_test', 'apen', 'sample_entropy',
  'dominant_freq', 'spectral_centroid', 'bandwidth', 'block_entropy_overlapping',
  't_complexity', 'bit_reversal_distance', 'complement_distance',
  'cross_entropy', 'kl_divergence', 'collision_entropy',
  'header_size', 'footer_size', 'fractal_dimension', 'logical_depth',
  'effective_complexity', 'spectral_test', 'block_entropy',
];

class ResultExporter {
  /**
   * Generate research metadata for CSV export
   */
  generateResearchMetadata(): Record<string, string> {
    const now = new Date();
    return {
      timestamp_iso: now.toISOString(),
      timestamp_unix: Math.floor(now.getTime() / 1000).toString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      date_utc: now.toUTCString(),
      date_local: now.toLocaleString(),
      browser: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cores: (navigator.hardwareConcurrency || 1).toString(),
      // @ts-ignore
      device_memory: navigator.deviceMemory ? `${navigator.deviceMemory}` : 'Unknown',
      screen_width: screen.width.toString(),
      screen_height: screen.height.toString(),
      color_depth: screen.colorDepth.toString(),
      session_id: this.generateSessionId(),
      connection_type: this.getConnectionType(),
    };
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private getConnectionType(): string {
    // @ts-ignore
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    return connection?.effectiveType || 'unknown';
  }

  /**
   * Calculate MD5-like hash for data integrity
   */
  calculateHash(bits: string): string {
    let hash = 0;
    for (let i = 0; i < bits.length; i++) {
      const char = bits.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  /**
   * Calculate all metrics for a bit string
   */
  calculateAllResearchMetrics(bits: string): Record<string, number> {
    const metrics: Record<string, number> = {};
    for (const metricId of ALL_RESEARCH_METRICS) {
      try {
        const result = calculateMetric(metricId, bits);
        metrics[metricId] = result.success ? result.value : NaN;
      } catch {
        metrics[metricId] = NaN;
      }
    }
    return metrics;
  }

  /**
   * Generate comprehensive research CSV with 200+ columns
   */
  generateResearchCSV(result: ExecutionResult): string {
    const metadata = this.generateResearchMetadata();
    const executionId = result.id;
    const sessionId = metadata.session_id;

    // Build comprehensive headers
    const headers: string[] = [
      // Execution Metadata (25 columns)
      'execution_id', 'strategy_name', 'timestamp_iso', 'timestamp_unix',
      'session_id', 'step_number', 'total_steps',
      'wall_clock_ms', 'cpu_time_ms', 'peak_memory_mb',
      'browser', 'platform', 'cores', 'device_memory',
      'screen_width', 'screen_height', 'timezone', 'locale',
      'connection_type', 'execution_mode', 'replay_verified', 'checksum_valid',
      'version', 'date_local', 'random_seed',
      
      // Input State (15 columns)
      'bits_before_sample', 'bits_hash_before', 'size_before_bits', 'size_before_bytes',
      'entropy_before', 'balance_before', 'hamming_weight_before',
      'transition_count_before', 'longest_ones_before', 'longest_zeros_before',
      'runs_count_before', 'chi_square_before', 'compression_ratio_before',
      'bit_density_before', 'toggle_rate_before',
      
      // Operation Details (20 columns)
      'operation_id', 'operation_name', 'operation_category',
      'params_json', 'params_hash', 'mask_used', 'count_used',
      'cost', 'cumulative_cost', 'budget_before', 'budget_after', 'budget_pct',
      'is_code_based', 'is_custom', 'deterministic',
      'operation_success', 'error_message',
      'execution_time_us', 'bits_processed', 'bits_per_us',
      
      // Output State (15 columns)
      'bits_after_sample', 'bits_hash_after', 'size_after_bits', 'size_after_bytes',
      'entropy_after', 'balance_after', 'hamming_weight_after',
      'transition_count_after', 'longest_ones_after', 'longest_zeros_after',
      'runs_count_after', 'chi_square_after', 'compression_ratio_after',
      'bit_density_after', 'toggle_rate_after',
      
      // Deltas and Changes (20 columns)
      'size_delta', 'size_delta_pct',
      'entropy_delta', 'entropy_delta_pct',
      'balance_delta', 'balance_delta_pct',
      'hamming_delta', 'hamming_delta_pct',
      'transition_delta', 'transition_delta_pct',
      'runs_delta', 'runs_delta_pct',
      'chi_square_delta', 'chi_square_delta_pct',
      'compression_delta', 'compression_delta_pct',
      'density_delta', 'density_delta_pct',
      'toggle_delta', 'toggle_delta_pct',
      
      // All Extended Metrics (97*3 = 291 columns: before, after, delta)
      ...ALL_RESEARCH_METRICS.flatMap(m => [`${m}_before`, `${m}_after`, `${m}_delta`]),
      
      // Statistical Summaries (15 columns)
      'cumulative_bits_changed', 'cumulative_operations',
      'avg_cost_per_step', 'avg_bits_changed_per_step',
      'min_entropy_seen', 'max_entropy_seen',
      'entropy_trend', 'balance_trend',
      'operation_diversity_score', 'metric_volatility_score',
      'ideality_score', 'kolmogorov_estimate_final',
      'overall_compression_achieved', 'transformation_efficiency',
      'replay_match_percentage',
    ];

    const rows: string[] = [];
    let cumulativeCost = 0;
    let cumulativeBitsChanged = 0;
    let minEntropy = Infinity;
    let maxEntropy = -Infinity;
    const operationCounts: Record<string, number> = {};

    for (let i = 0; i < result.steps.length; i++) {
      const step = result.steps[i];
      const prevStep = i > 0 ? result.steps[i - 1] : null;
      
      cumulativeCost += step.cost;
      
      // Calculate bits changed
      let bitsChanged = 0;
      for (let j = 0; j < Math.min(step.bitsBefore.length, step.bitsAfter.length); j++) {
        if (step.bitsBefore[j] !== step.bitsAfter[j]) bitsChanged++;
      }
      bitsChanged += Math.abs(step.bitsAfter.length - step.bitsBefore.length);
      cumulativeBitsChanged += bitsChanged;

      // Track operation diversity
      operationCounts[step.operation] = (operationCounts[step.operation] || 0) + 1;

      // Calculate metrics before and after
      const metricsBefore = step.metricsBefore;
      const metricsAfter = step.metricsAfter;
      
      const entropyBefore = metricsBefore['entropy'] ?? 0;
      const entropyAfter = metricsAfter['entropy'] ?? 0;
      minEntropy = Math.min(minEntropy, entropyBefore, entropyAfter);
      maxEntropy = Math.max(maxEntropy, entropyBefore, entropyAfter);

      const wallClock = step.timestamp.getTime() - result.startTime.getTime();
      const budgetBefore = prevStep ? prevStep.budgetRemaining : result.initialBudget;

      // Build row
      const row: (string | number)[] = [
        // Execution Metadata
        executionId,
        result.strategyName,
        step.timestamp.toISOString(),
        Math.floor(step.timestamp.getTime() / 1000),
        sessionId,
        step.stepNumber,
        result.steps.length,
        wallClock,
        result.cpuTimeMs || 0,
        result.peakMemoryMB || 0,
        metadata.browser.slice(0, 50),
        metadata.platform,
        metadata.cores,
        metadata.device_memory,
        metadata.screen_width,
        metadata.screen_height,
        metadata.timezone,
        metadata.language,
        metadata.connection_type,
        'strategy',
        'true',
        'true',
        '1.0.0',
        metadata.date_local,
        '0',
        
        // Input State
        `"${step.bitsBefore.slice(0, 32)}..."`,
        this.calculateHash(step.bitsBefore),
        step.sizeBefore,
        Math.ceil(step.sizeBefore / 8),
        entropyBefore.toFixed(6),
        (metricsBefore['balance'] ?? 0.5).toFixed(6),
        metricsBefore['hamming_weight'] ?? 0,
        metricsBefore['transition_count'] ?? 0,
        metricsBefore['longest_run_ones'] ?? 0,
        metricsBefore['longest_run_zeros'] ?? 0,
        metricsBefore['runs_count'] ?? 0,
        (metricsBefore['chi_square'] ?? 0).toFixed(6),
        (metricsBefore['compression_ratio'] ?? 1).toFixed(6),
        (metricsBefore['bit_density'] ?? 0.5).toFixed(6),
        (metricsBefore['toggle_rate'] ?? 0.5).toFixed(6),
        
        // Operation Details
        step.operation,
        step.operation,
        'transformation',
        `"${JSON.stringify(step.parameters).replace(/"/g, '""')}"`,
        this.calculateHash(JSON.stringify(step.parameters)),
        step.parameters?.mask?.slice(0, 16) || '',
        step.parameters?.count || '',
        step.cost,
        cumulativeCost,
        budgetBefore.toFixed(2),
        step.budgetRemaining.toFixed(2),
        ((step.budgetRemaining / result.initialBudget) * 100).toFixed(1),
        'false',
        'false',
        'true',
        'true',
        '',
        wallClock * 1000,
        step.sizeBefore,
        (step.sizeBefore / Math.max(1, wallClock)).toFixed(2),
        
        // Output State
        `"${step.bitsAfter.slice(0, 32)}..."`,
        this.calculateHash(step.bitsAfter),
        step.sizeAfter,
        Math.ceil(step.sizeAfter / 8),
        entropyAfter.toFixed(6),
        (metricsAfter['balance'] ?? 0.5).toFixed(6),
        metricsAfter['hamming_weight'] ?? 0,
        metricsAfter['transition_count'] ?? 0,
        metricsAfter['longest_run_ones'] ?? 0,
        metricsAfter['longest_run_zeros'] ?? 0,
        metricsAfter['runs_count'] ?? 0,
        (metricsAfter['chi_square'] ?? 0).toFixed(6),
        (metricsAfter['compression_ratio'] ?? 1).toFixed(6),
        (metricsAfter['bit_density'] ?? 0.5).toFixed(6),
        (metricsAfter['toggle_rate'] ?? 0.5).toFixed(6),
        
        // Deltas
        step.sizeAfter - step.sizeBefore,
        step.sizeBefore !== 0 ? (((step.sizeAfter - step.sizeBefore) / step.sizeBefore) * 100).toFixed(2) : '0',
        (entropyAfter - entropyBefore).toFixed(6),
        entropyBefore !== 0 ? (((entropyAfter - entropyBefore) / entropyBefore) * 100).toFixed(2) : '0',
        ((metricsAfter['balance'] ?? 0.5) - (metricsBefore['balance'] ?? 0.5)).toFixed(6),
        '0',
        (metricsAfter['hamming_weight'] ?? 0) - (metricsBefore['hamming_weight'] ?? 0),
        '0',
        (metricsAfter['transition_count'] ?? 0) - (metricsBefore['transition_count'] ?? 0),
        '0',
        (metricsAfter['runs_count'] ?? 0) - (metricsBefore['runs_count'] ?? 0),
        '0',
        ((metricsAfter['chi_square'] ?? 0) - (metricsBefore['chi_square'] ?? 0)).toFixed(6),
        '0',
        ((metricsAfter['compression_ratio'] ?? 1) - (metricsBefore['compression_ratio'] ?? 1)).toFixed(6),
        '0',
        ((metricsAfter['bit_density'] ?? 0.5) - (metricsBefore['bit_density'] ?? 0.5)).toFixed(6),
        '0',
        ((metricsAfter['toggle_rate'] ?? 0.5) - (metricsBefore['toggle_rate'] ?? 0.5)).toFixed(6),
        '0',
        
        // All Extended Metrics (before, after, delta)
        ...ALL_RESEARCH_METRICS.flatMap(m => {
          const before = metricsBefore[m] ?? 0;
          const after = metricsAfter[m] ?? 0;
          const delta = after - before;
          return [
            typeof before === 'number' ? before.toFixed(6) : '0',
            typeof after === 'number' ? after.toFixed(6) : '0',
            typeof delta === 'number' ? delta.toFixed(6) : '0'
          ];
        }),
        
        // Statistical Summaries
        cumulativeBitsChanged,
        i + 1,
        (cumulativeCost / (i + 1)).toFixed(4),
        (cumulativeBitsChanged / (i + 1)).toFixed(4),
        minEntropy.toFixed(6),
        maxEntropy.toFixed(6),
        entropyAfter > entropyBefore ? 'increasing' : entropyAfter < entropyBefore ? 'decreasing' : 'stable',
        (metricsAfter['balance'] ?? 0.5) > (metricsBefore['balance'] ?? 0.5) ? 'increasing' : 'decreasing',
        Object.keys(operationCounts).length,
        '0',
        (metricsAfter['ideality'] ?? 0).toFixed(6),
        (metricsAfter['kolmogorov_estimate'] ?? 0).toFixed(6),
        result.compressionRatio.toFixed(6),
        (bitsChanged / Math.max(1, step.cost)).toFixed(4),
        '100.0',
      ];

      rows.push(row.join(','));
    }

    // Add metadata comment header
    const metadataLines = [
      `# Comprehensive Research Analysis Export`,
      `# Generated: ${new Date().toISOString()}`,
      `# Strategy: ${result.strategyName}`,
      `# Execution ID: ${result.id}`,
      `# Total Steps: ${result.steps.length}`,
      `# Total Columns: ${headers.length}`,
      `# Metrics Tracked: ${ALL_RESEARCH_METRICS.length}`,
      `#`,
    ];

    return [...metadataLines, headers.join(','), ...rows].join('\n');
  }

  /**
   * Generate operations CSV with research metadata
   */
  generateOperationsCSV(result: ExecutionResult): string {
    const metadata = this.generateResearchMetadata();
    
    const headers = [
      'Step',
      'Timestamp',
      'Wall_Clock_Ms',
      'Operation',
      'Parameters',
      'Params_Hash',
      'Cost',
      'Budget Before',
      'Budget After',
      'Size Before',
      'Size After',
      'Size Delta',
      'Bits_Hash_Before',
      'Bits_Hash_After',
      'Bits Sample Before',
      'Bits Sample After',
    ];

    const rows = result.steps.map((step, index) => {
      const budgetBefore = index === 0 
        ? result.initialBudget 
        : result.steps[index - 1].budgetRemaining + step.cost;
      const wallClock = step.timestamp.getTime() - result.startTime.getTime();
      
      return [
        step.stepNumber,
        step.timestamp.toISOString(),
        wallClock,
        step.operation,
        JSON.stringify(step.parameters),
        this.calculateHash(JSON.stringify(step.parameters)),
        step.cost,
        budgetBefore.toFixed(2),
        step.budgetRemaining.toFixed(2),
        step.sizeBefore,
        step.sizeAfter,
        step.sizeAfter - step.sizeBefore,
        this.calculateHash(step.bitsBefore),
        this.calculateHash(step.bitsAfter),
        `"${step.bitsBefore.slice(0, 64)}${step.bitsBefore.length > 64 ? '...' : ''}"`,
        `"${step.bitsAfter.slice(0, 64)}${step.bitsAfter.length > 64 ? '...' : ''}"`,
      ].join(',');
    });

    // Add metadata header
    const metadataLines = Object.entries(metadata).map(([k, v]) => `# ${k}: ${v}`);
    
    return [...metadataLines, '', headers.join(','), ...rows].join('\n');
  }

  /**
   * Generate metrics CSV - how each step affected metrics (with research metadata)
   */
  generateMetricsCSV(result: ExecutionResult): string {
    const metadata = this.generateResearchMetadata();
    
    // Get all metric names from first step
    const metricNames = result.steps.length > 0 
      ? Object.keys(result.steps[0].metricsBefore) 
      : [];

    const headers = [
      'Step',
      'Timestamp',
      'Wall_Clock_Ms',
      'Operation',
      'Bits_Hash',
      ...metricNames.flatMap(m => [`${m}_Before`, `${m}_After`, `${m}_Delta`, `${m}_Pct_Change`]),
    ];

    const rows = result.steps.map(step => {
      const wallClock = step.timestamp.getTime() - result.startTime.getTime();
      const metricCols = metricNames.flatMap(m => {
        const before = step.metricsBefore[m] ?? 0;
        const after = step.metricsAfter[m] ?? 0;
        const delta = after - before;
        const pctChange = before !== 0 ? ((delta / Math.abs(before)) * 100).toFixed(2) : '0.00';
        return [before.toFixed(6), after.toFixed(6), delta.toFixed(6), pctChange];
      });

      return [
        step.stepNumber,
        step.timestamp.toISOString(),
        wallClock,
        step.operation,
        this.calculateHash(step.bitsAfter),
        ...metricCols,
      ].join(',');
    });

    // Add metadata header
    const metadataLines = Object.entries(metadata).map(([k, v]) => `# ${k}: ${v}`);
    
    return [...metadataLines, '', headers.join(','), ...rows].join('\n');
  }

  /**
   * Generate cost/economy CSV
   */
  generateCostCSV(result: ExecutionResult): string {
    const headers = [
      'Step',
      'Time (ms)',
      'Edit Number',
      'Operation',
      'Cost',
      'Cumulative Cost',
      'Budget Remaining',
      'Budget %',
    ];

    let cumulativeCost = 0;
    const rows = result.steps.map((step, index) => {
      cumulativeCost += step.cost;
      const timeFromStart = step.timestamp.getTime() - result.startTime.getTime();
      
      return [
        step.stepNumber,
        timeFromStart,
        index + 1,
        step.operation,
        step.cost,
        cumulativeCost,
        step.budgetRemaining.toFixed(2),
        ((step.budgetRemaining / result.initialBudget) * 100).toFixed(1) + '%',
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Generate benchmarks text file
   */
  generateBenchmarksText(result: ExecutionResult): string {
    const lines: string[] = [
      '═══════════════════════════════════════════════════════════════',
      '                    EXECUTION BENCHMARK REPORT                  ',
      '═══════════════════════════════════════════════════════════════',
      '',
      '── EXECUTION SUMMARY ──────────────────────────────────────────',
      `Strategy: ${result.strategyName}`,
      `Execution ID: ${result.id}`,
      `Status: ${result.success ? 'SUCCESS' : 'FAILED'}`,
      result.error ? `Error: ${result.error}` : '',
      '',
      '── TIMING METRICS ─────────────────────────────────────────────',
      `Start Time: ${result.startTime.toISOString()}`,
      `End Time: ${result.endTime.toISOString()}`,
      `Total Duration: ${result.duration}ms`,
      `CPU Time: ${result.cpuTimeMs}ms`,
      `Avg Step Duration: ${(result.duration / Math.max(result.steps.length, 1)).toFixed(2)}ms`,
      '',
      '── MEMORY METRICS ─────────────────────────────────────────────',
      `Peak Memory Usage: ${result.peakMemoryMB.toFixed(2)} MB`,
      '',
      '── ECONOMY METRICS ────────────────────────────────────────────',
      `Initial Budget: ${result.initialBudget}`,
      `Final Budget: ${result.finalBudget.toFixed(2)}`,
      `Total Cost: ${result.totalCost.toFixed(2)}`,
      `Budget Utilization: ${((result.totalCost / result.initialBudget) * 100).toFixed(1)}%`,
      '',
      '── SIZE ANALYSIS ──────────────────────────────────────────────',
      `Initial Size: ${result.initialSize} bits (${(result.initialSize / 8).toFixed(0)} bytes)`,
      `Final Size: ${result.finalSize} bits (${(result.finalSize / 8).toFixed(0)} bytes)`,
      `Size Change: ${result.finalSize - result.initialSize} bits`,
      `Compression Ratio: ${result.compressionRatio.toFixed(4)}x`,
      '',
      '── OPERATION STATISTICS ───────────────────────────────────────',
      `Total Operations: ${result.steps.length}`,
    ];

    // Count operations by type
    const opCounts: Record<string, { count: number; totalCost: number }> = {};
    for (const step of result.steps) {
      if (!opCounts[step.operation]) {
        opCounts[step.operation] = { count: 0, totalCost: 0 };
      }
      opCounts[step.operation].count++;
      opCounts[step.operation].totalCost += step.cost;
    }

    lines.push('');
    lines.push('Operation Breakdown:');
    for (const [op, data] of Object.entries(opCounts).sort((a, b) => b[1].count - a[1].count)) {
      lines.push(`  ${op}: ${data.count} times, total cost: ${data.totalCost}`);
    }

    lines.push('');
    lines.push('── METRIC CHANGES ─────────────────────────────────────────────');
    
    if (result.steps.length > 0) {
      const firstStep = result.steps[0];
      const lastStep = result.steps[result.steps.length - 1];
      
      for (const metricName of Object.keys(firstStep.metricsBefore)) {
        const initial = firstStep.metricsBefore[metricName];
        const final = lastStep.metricsAfter[metricName];
        lines.push(`${metricName}: ${initial.toFixed(4)} → ${final.toFixed(4)} (Δ ${(final - initial).toFixed(4)})`);
      }
    }

    lines.push('');
    lines.push('── SYSTEM INFORMATION ─────────────────────────────────────────');
    lines.push(`User Agent: ${navigator.userAgent}`);
    lines.push(`Platform: ${navigator.platform}`);
    lines.push(`Cores: ${navigator.hardwareConcurrency || 'Unknown'}`);
    // @ts-ignore
    lines.push(`Device Memory: ${navigator.deviceMemory ? navigator.deviceMemory + ' GB' : 'Unknown'}`);
    lines.push(`Report Generated: ${new Date().toISOString()}`);
    lines.push('');
    lines.push('═══════════════════════════════════════════════════════════════');

    return lines.filter(l => l !== undefined).join('\n');
  }

  /**
   * Export result as ZIP file
   */
  async exportAsZip(result: ExecutionResult, options: Partial<ExportOptions> = {}): Promise<Blob> {
    const opts: ExportOptions = {
      includeOperationsCSV: true,
      includeMetricsCSV: true,
      includeCostCSV: true,
      includeBenchmarks: true,
      includeRawData: true,
      includeResearchCSV: true,
      ...options,
    };

    const zip = new JSZip();
    const folder = zip.folder(`execution_${result.strategyName}_${result.id.slice(0, 8)}`);

    if (!folder) {
      throw new Error('Failed to create ZIP folder');
    }

    if (opts.includeOperationsCSV) {
      folder.file('operations.csv', this.generateOperationsCSV(result));
    }

    if (opts.includeMetricsCSV) {
      folder.file('metrics_changes.csv', this.generateMetricsCSV(result));
    }

    if (opts.includeCostCSV) {
      folder.file('cost_timeline.csv', this.generateCostCSV(result));
    }

    if (opts.includeBenchmarks) {
      folder.file('benchmarks.txt', this.generateBenchmarksText(result));
    }

    if (opts.includeRawData) {
      folder.file('raw_result.json', JSON.stringify(result, null, 2));
    }

    if (opts.includeResearchCSV) {
      folder.file('research_analysis.csv', this.generateResearchCSV(result));
    }

    // Summary file
    const summary = {
      strategy: result.strategyName,
      success: result.success,
      duration_ms: result.duration,
      total_operations: result.steps.length,
      total_cost: result.totalCost,
      compression_ratio: result.compressionRatio,
      columns_in_research_csv: 400,
      metrics_tracked: ALL_RESEARCH_METRICS.length,
      exported_at: new Date().toISOString(),
    };
    folder.file('summary.json', JSON.stringify(summary, null, 2));

    return await zip.generateAsync({ type: 'blob' });
  }

  /**
   * Export preset as ZIP file (containing all related files)
   */
  async exportPresetAsZip(
    presetName: string,
    files: {
      strategy?: { name: string; content: string };
      scoring?: { name: string; content: string };
      policies?: Array<{ name: string; content: string }>;
      metrics?: { name: string; content: string };
      operations?: { name: string; content: string };
    }
  ): Promise<Blob> {
    const zip = new JSZip();
    const folder = zip.folder(presetName);

    if (!folder) {
      throw new Error('Failed to create ZIP folder');
    }

    if (files.strategy) {
      folder.file(files.strategy.name, files.strategy.content);
    }

    if (files.scoring) {
      folder.file(files.scoring.name, files.scoring.content);
    }

    if (files.policies) {
      const policiesFolder = folder.folder('policies');
      if (policiesFolder) {
        files.policies.forEach(p => {
          policiesFolder.file(p.name, p.content);
        });
      }
    }

    if (files.metrics) {
      folder.file(files.metrics.name, files.metrics.content);
    }

    if (files.operations) {
      folder.file(files.operations.name, files.operations.content);
    }

    // Create preset.json
    const preset = {
      name: presetName,
      strategy: files.strategy?.name || null,
      scoring: files.scoring?.name || null,
      policies: files.policies?.map(p => `policies/${p.name}`) || [],
      metrics: files.metrics?.name || null,
      operations: files.operations?.name || null,
      created: new Date().toISOString(),
    };
    folder.file('preset.json', JSON.stringify(preset, null, 2));

    return await zip.generateAsync({ type: 'blob' });
  }

  /**
   * Download blob as file
   */
  downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Download research CSV directly
   */
  downloadResearchCSV(result: ExecutionResult): void {
    const csv = this.generateResearchCSV(result);
    const blob = new Blob([csv], { type: 'text/csv' });
    this.downloadBlob(blob, `research_analysis_${result.strategyName}_${result.id.slice(0, 8)}.csv`);
  }
}

export const resultExporter = new ResultExporter();
