/**
 * Results Manager - LocalStorage-based results database with bookmarking
 */

export interface TransformationStep {
  index: number;
  operation: string;
  params?: Record<string, any>;
  // Full file state (for accurate Player playback)
  fullBeforeBits: string;
  fullAfterBits: string;
  // Segment-level (actual bits operated on)
  beforeBits: string;
  afterBits: string;
  metrics: Record<string, number>;
  timestamp: number;
  duration: number;
  // Rich info for Player
  bitRanges?: { start: number; end: number }[];
  cost?: number;
  // Cumulative state (full file after this step)
  cumulativeBits?: string;
  // Memory window - what part of data the algorithm is looking at
  memoryWindow?: {
    start: number;
    end: number;
    lookAhead?: number;
    lookBehind?: number;
  };
}

export interface ExecutionResultV2 {
  id: string;
  strategyId: string;
  strategyName: string;
  startTime: number;
  endTime: number;
  duration: number;

  // Optional file linkage (backwards compatible with old stored results)
  sourceFileId?: string;
  sourceFileName?: string;
  resultFileId?: string;

  // Data snapshots
  initialBits: string;
  finalBits: string;
  initialMetrics: Record<string, number>;
  finalMetrics: Record<string, number>;

  // Transformations
  steps: TransformationStep[];

  // Benchmarks
  benchmarks: {
    cpuTime: number;
    peakMemory: number;
    operationCount: number;
    avgStepDuration: number;
    totalCost: number;
  };

  // Files used
  filesUsed: {
    algorithm: string;
    scoring: string;
    policy: string;
  };

  // Status
  status: 'completed' | 'failed' | 'cancelled';
  error?: string;

  // Bookmarking
  bookmarked: boolean;
  tags: string[];
  notes: string;
}

const STORAGE_KEY = 'bitwise_results_v2';
const MAX_RESULTS = 100;

class ResultsManager {
  private results: Map<string, ExecutionResultV2> = new Map();
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        parsed.forEach((r: ExecutionResultV2) => {
          this.results.set(r.id, r);
        });
      }
    } catch (error) {
      console.error('Failed to load results:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const results = Array.from(this.results.values())
        .sort((a, b) => b.startTime - a.startTime)
        .slice(0, MAX_RESULTS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
    } catch (error) {
      console.error('Failed to save results:', error);
    }
  }

  createResult(partial: Omit<ExecutionResultV2, 'id' | 'bookmarked' | 'tags' | 'notes'>): ExecutionResultV2 {
    const id = 'result_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const result: ExecutionResultV2 = {
      ...partial,
      id,
      bookmarked: false,
      tags: [],
      notes: '',
    };
    this.results.set(id, result);
    this.saveToStorage();
    this.notifyListeners();
    return result;
  }

  getResult(id: string): ExecutionResultV2 | undefined {
    return this.results.get(id);
  }

  getAllResults(): ExecutionResultV2[] {
    return Array.from(this.results.values())
      .sort((a, b) => b.startTime - a.startTime);
  }

  getBookmarkedResults(): ExecutionResultV2[] {
    return this.getAllResults().filter(r => r.bookmarked);
  }

  getResultsByDate(startDate: Date, endDate: Date): ExecutionResultV2[] {
    const start = startDate.getTime();
    const end = endDate.getTime();
    return this.getAllResults().filter(r => r.startTime >= start && r.startTime <= end);
  }

  getResultsByTag(tag: string): ExecutionResultV2[] {
    return this.getAllResults().filter(r => r.tags.includes(tag));
  }

  toggleBookmark(id: string): void {
    const result = this.results.get(id);
    if (result) {
      result.bookmarked = !result.bookmarked;
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  addTag(id: string, tag: string): void {
    const result = this.results.get(id);
    if (result && !result.tags.includes(tag)) {
      result.tags.push(tag);
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  removeTag(id: string, tag: string): void {
    const result = this.results.get(id);
    if (result) {
      result.tags = result.tags.filter(t => t !== tag);
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  updateNotes(id: string, notes: string): void {
    const result = this.results.get(id);
    if (result) {
      result.notes = notes;
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  deleteResult(id: string): void {
    this.results.delete(id);
    this.saveToStorage();
    this.notifyListeners();
  }

  clearAll(): void {
    this.results.clear();
    this.saveToStorage();
    this.notifyListeners();
  }

  exportToCSV(result: ExecutionResultV2): string {
    const lines: string[] = [];
    
    // HEADER
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('BITWISE STRATEGY EXECUTION REPORT');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');
    
    // EXECUTION METADATA
    lines.push('EXECUTION METADATA');
    lines.push('─────────────────────────────────────────────────────────────────');
    lines.push('Result ID,' + result.id);
    lines.push('Strategy Name,' + result.strategyName);
    lines.push('Strategy ID,' + result.strategyId);
    lines.push('Source File,' + (result.sourceFileName || 'N/A'));
    lines.push('Source File ID,' + (result.sourceFileId || 'N/A'));
    lines.push('Status,' + result.status);
    lines.push('Start Time,' + new Date(result.startTime).toISOString());
    lines.push('End Time,' + new Date(result.endTime).toISOString());
    lines.push('Total Duration,' + result.duration + 'ms');
    lines.push('Export Generated,' + new Date().toISOString());
    lines.push('');
    
    // DATA SIZE ANALYSIS
    lines.push('DATA SIZE ANALYSIS');
    lines.push('─────────────────────────────────────────────────────────────────');
    lines.push('Initial Size,' + result.initialBits.length + ' bits,' + Math.floor(result.initialBits.length / 8) + ' bytes');
    lines.push('Final Size,' + result.finalBits.length + ' bits,' + Math.floor(result.finalBits.length / 8) + ' bytes');
    lines.push('Size Change,' + (result.finalBits.length - result.initialBits.length) + ' bits');
    const compressionRatio = result.initialBits.length > 0 
      ? (result.finalBits.length / result.initialBits.length).toFixed(4)
      : '1.0000';
    lines.push('Compression Ratio,' + compressionRatio + 'x');
    lines.push('');
    
    // BINARY DATA - Preview
    lines.push('BINARY DATA PREVIEW');
    lines.push('─────────────────────────────────────────────────────────────────');
    const initPreview = result.initialBits.slice(0, 256);
    const finalPreview = result.finalBits.slice(0, 256);
    lines.push('Initial Bits (first 256)');
    lines.push('"' + initPreview + (result.initialBits.length > 256 ? '...' : '') + '"');
    lines.push('');
    lines.push('Final Bits (first 256)');
    lines.push('"' + finalPreview + (result.finalBits.length > 256 ? '...' : '') + '"');
    lines.push('');
    
    // FULL BINARY DATA (separate section for research)
    lines.push('FULL BINARY DATA');
    lines.push('─────────────────────────────────────────────────────────────────');
    lines.push('Initial Bits (complete)');
    lines.push('"' + result.initialBits + '"');
    lines.push('');
    lines.push('Final Bits (complete)');
    lines.push('"' + result.finalBits + '"');
    lines.push('');
    
    // BIT STATISTICS
    lines.push('BIT STATISTICS');
    lines.push('─────────────────────────────────────────────────────────────────');
    const initialOnes = (result.initialBits.match(/1/g) || []).length;
    const initialZeros = result.initialBits.length - initialOnes;
    const finalOnes = (result.finalBits.match(/1/g) || []).length;
    const finalZeros = result.finalBits.length - finalOnes;
    const initLen = result.initialBits.length || 1;
    const finalLen = result.finalBits.length || 1;
    lines.push('Initial Ones,' + initialOnes + ',' + (initialOnes/initLen*100).toFixed(2) + '%');
    lines.push('Initial Zeros,' + initialZeros + ',' + (initialZeros/initLen*100).toFixed(2) + '%');
    lines.push('Final Ones,' + finalOnes + ',' + (finalOnes/finalLen*100).toFixed(2) + '%');
    lines.push('Final Zeros,' + finalZeros + ',' + (finalZeros/finalLen*100).toFixed(2) + '%');
    
    let totalBitsChanged = 0;
    const minLen = Math.min(result.initialBits.length, result.finalBits.length);
    for (let i = 0; i < minLen; i++) {
      if (result.initialBits[i] !== result.finalBits[i]) totalBitsChanged++;
    }
    totalBitsChanged += Math.abs(result.initialBits.length - result.finalBits.length);
    const maxLen = Math.max(result.initialBits.length, result.finalBits.length) || 1;
    lines.push('Total Bits Changed,' + totalBitsChanged + ',' + (totalBitsChanged/maxLen*100).toFixed(2) + '%');
    lines.push('');
    
    // METRICS COMPARISON
    lines.push('METRICS COMPARISON');
    lines.push('─────────────────────────────────────────────────────────────────');
    lines.push('Metric,Initial Value,Final Value,Change,% Change');
    const allMetrics = new Set([
      ...Object.keys(result.initialMetrics || {}),
      ...Object.keys(result.finalMetrics || {})
    ]);
    allMetrics.forEach(metric => {
      const initial = result.initialMetrics?.[metric] ?? 0;
      const final = result.finalMetrics?.[metric] ?? 0;
      const change = final - initial;
      const pctChange = initial !== 0 ? ((change / Math.abs(initial)) * 100).toFixed(2) : 'N/A';
      lines.push(metric + ',' + initial.toFixed(6) + ',' + final.toFixed(6) + ',' + change.toFixed(6) + ',' + pctChange + '%');
    });
    lines.push('');
    
    // BENCHMARKS
    lines.push('PERFORMANCE BENCHMARKS');
    lines.push('─────────────────────────────────────────────────────────────────');
    lines.push('CPU Time,' + (result.benchmarks?.cpuTime || result.duration) + 'ms');
    lines.push('Peak Memory,' + (result.benchmarks?.peakMemory || 0) + 'MB');
    lines.push('Operation Count,' + (result.benchmarks?.operationCount || result.steps.length));
    lines.push('Avg Step Duration,' + (result.benchmarks?.avgStepDuration || 0).toFixed(2) + 'ms');
    lines.push('Total Cost,' + (result.benchmarks?.totalCost || 0));
    const opsPerSec = result.duration > 0 ? ((result.steps.length / result.duration) * 1000).toFixed(2) : 'N/A';
    lines.push('Operations Per Second,' + opsPerSec);
    lines.push('');
    
    // OPERATION BREAKDOWN
    lines.push('OPERATION BREAKDOWN');
    lines.push('─────────────────────────────────────────────────────────────────');
    const opCounts: Record<string, { count: number; totalCost: number; totalBitsChanged: number }> = {};
    result.steps.forEach(step => {
      if (!opCounts[step.operation]) {
        opCounts[step.operation] = { count: 0, totalCost: 0, totalBitsChanged: 0 };
      }
      opCounts[step.operation].count++;
      opCounts[step.operation].totalCost += step.cost || 0;
      const before = step.fullBeforeBits || step.beforeBits;
      const after = step.fullAfterBits || step.afterBits;
      let changed = 0;
      const len = Math.min(before.length, after.length);
      for (let i = 0; i < len; i++) {
        if (before[i] !== after[i]) changed++;
      }
      opCounts[step.operation].totalBitsChanged += changed;
    });
    lines.push('Operation,Count,Total Cost,Avg Cost,Bits Changed');
    Object.entries(opCounts).sort((a, b) => b[1].count - a[1].count).forEach(([op, data]) => {
      const avgCost = data.count > 0 ? (data.totalCost / data.count).toFixed(2) : '0';
      lines.push(op + ',' + data.count + ',' + data.totalCost + ',' + avgCost + ',' + data.totalBitsChanged);
    });
    lines.push('');
    
    // TRANSFORMATION STEPS
    lines.push('TRANSFORMATION STEPS');
    lines.push('─────────────────────────────────────────────────────────────────');
    lines.push('Step,Operation,Parameters,Before Size,After Size,Bits Changed,Duration (ms),Cost,Bit Ranges,Metrics');
    
    result.steps.forEach(step => {
      const before = step.fullBeforeBits || step.beforeBits;
      const after = step.fullAfterBits || step.afterBits;
      let bitsChanged = 0;
      const len = Math.min(before.length, after.length);
      for (let i = 0; i < len; i++) {
        if (before[i] !== after[i]) bitsChanged++;
      }
      
      const metricsStr = Object.entries(step.metrics || {})
        .map(([k, v]) => k + '=' + (typeof v === 'number' ? v.toFixed(4) : v))
        .join('; ');
      const rangesStr = step.bitRanges?.map(r => '[' + r.start + ':' + r.end + ']').join(' ') || 'full';
      const paramsStr = JSON.stringify(step.params || {}).replace(/"/g, "'");
      
      lines.push([
        step.index,
        step.operation,
        '"' + paramsStr + '"',
        before.length,
        after.length,
        bitsChanged,
        step.duration.toFixed(2),
        step.cost || 0,
        '"' + rangesStr + '"',
        '"' + metricsStr + '"',
      ].join(','));
    });
    lines.push('');
    
    // FILES CONFIGURATION
    lines.push('FILES CONFIGURATION');
    lines.push('─────────────────────────────────────────────────────────────────');
    lines.push('Algorithm File,' + (result.filesUsed?.algorithm || 'N/A'));
    lines.push('Scoring File,' + (result.filesUsed?.scoring || 'N/A'));
    lines.push('Policy File,' + (result.filesUsed?.policy || 'N/A'));
    lines.push('');
    
    // SYSTEM INFO
    lines.push('SYSTEM INFORMATION');
    lines.push('─────────────────────────────────────────────────────────────────');
    lines.push('User Agent,' + navigator.userAgent);
    lines.push('Platform,' + navigator.platform);
    lines.push('CPU Cores,' + (navigator.hardwareConcurrency || 'Unknown'));
    // @ts-ignore
    const deviceMem = navigator.deviceMemory ? (navigator.deviceMemory + ' GB') : 'Unknown';
    lines.push('Device Memory,' + deviceMem);
    lines.push('Timezone,' + Intl.DateTimeFormat().resolvedOptions().timeZone);
    lines.push('');
    
    // USER ANNOTATIONS
    if (result.notes || result.tags.length > 0) {
      lines.push('USER ANNOTATIONS');
      lines.push('─────────────────────────────────────────────────────────────────');
      lines.push('Bookmarked,' + (result.bookmarked ? 'Yes' : 'No'));
      lines.push('Tags,"' + result.tags.join(', ') + '"');
      const notesClean = (result.notes || '').replace(/"/g, "'").replace(/\n/g, ' ');
      lines.push('Notes,"' + notesClean + '"');
      lines.push('');
    }
    
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('END OF REPORT');
    lines.push('═══════════════════════════════════════════════════════════════');
    
    return lines.join('\n');
  }

  exportFullReport(result: ExecutionResultV2): string {
    return JSON.stringify({
      ...result,
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }

  /**
   * Export result as ZIP containing:
   * - result_report.csv - Full execution report
   * - initial_data.txt - Initial binary data
   * - final_data.txt - Final binary data after transformations
   * - steps_detail.json - Detailed step-by-step data with memory windows
   */
  async exportAsZip(result: ExecutionResultV2): Promise<Blob> {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    // Add CSV report
    zip.file('result_report.csv', this.exportToCSV(result));

    // Add initial data
    zip.file('initial_data.txt', [
      '=== INITIAL BINARY DATA ===',
      `Length: ${result.initialBits.length} bits (${Math.floor(result.initialBits.length / 8)} bytes)`,
      `Strategy: ${result.strategyName}`,
      `Timestamp: ${new Date(result.startTime).toISOString()}`,
      '',
      '=== BINARY (raw) ===',
      result.initialBits,
      '',
      '=== HEX ===',
      this.bitsToHex(result.initialBits),
      '',
      '=== STATISTICS ===',
      `Ones: ${(result.initialBits.match(/1/g) || []).length}`,
      `Zeros: ${result.initialBits.length - (result.initialBits.match(/1/g) || []).length}`,
    ].join('\n'));

    // Add final data
    zip.file('final_data.txt', [
      '=== FINAL BINARY DATA ===',
      `Length: ${result.finalBits.length} bits (${Math.floor(result.finalBits.length / 8)} bytes)`,
      `Strategy: ${result.strategyName}`,
      `Timestamp: ${new Date(result.endTime).toISOString()}`,
      '',
      '=== BINARY (raw) ===',
      result.finalBits,
      '',
      '=== HEX ===',
      this.bitsToHex(result.finalBits),
      '',
      '=== STATISTICS ===',
      `Ones: ${(result.finalBits.match(/1/g) || []).length}`,
      `Zeros: ${result.finalBits.length - (result.finalBits.match(/1/g) || []).length}`,
    ].join('\n'));

    // Add detailed steps with memory windows
    const stepsWithMemoryWindows = result.steps.map((step, index) => ({
      stepIndex: index,
      operation: step.operation,
      params: step.params || {},
      memoryWindow: {
        start: step.bitRanges?.[0]?.start || 0,
        end: step.bitRanges?.[0]?.end || (step.beforeBits?.length || 0),
        affectedBits: step.beforeBits?.length || 0,
      },
      beforeBits: step.beforeBits,
      afterBits: step.afterBits,
      fullBeforeBits: step.fullBeforeBits,
      fullAfterBits: step.fullAfterBits,
      cumulativeBits: step.cumulativeBits,
      metrics: step.metrics,
      cost: step.cost || 0,
      duration: step.duration,
      timestamp: step.timestamp,
    }));

    zip.file('steps_detail.json', JSON.stringify({
      resultId: result.id,
      strategyName: result.strategyName,
      initialBits: result.initialBits,
      finalBits: result.finalBits,
      totalSteps: result.steps.length,
      steps: stepsWithMemoryWindows,
    }, null, 2));

    // Add steps_playback.csv with full params for Player verification
    const playbackLines: string[] = [];
    playbackLines.push('Step,Operation,Parameters (JSON),Bit Range Start,Bit Range End,Before Length,After Length,Bits Changed,Cost,Duration (ms),Cumulative Hash');
    
    result.steps.forEach((step, idx) => {
      const before = step.fullBeforeBits || step.beforeBits || '';
      const after = step.fullAfterBits || step.afterBits || '';
      let bitsChanged = 0;
      const len = Math.min(before.length, after.length);
      for (let i = 0; i < len; i++) {
        if (before[i] !== after[i]) bitsChanged++;
      }
      bitsChanged += Math.abs(before.length - after.length);
      
      // Simple hash for verification
      const cumulative = step.cumulativeBits || after;
      const hash = this.simpleHash(cumulative);

      // Get bit range
      const rangeStart = step.bitRanges?.[0]?.start ?? 0;
      const rangeEnd = step.bitRanges?.[0]?.end ?? before.length;

      // Escape JSON params for CSV
      const paramsJson = JSON.stringify(step.params || {}).replace(/"/g, '""');
      
      playbackLines.push([
        idx + 1,
        step.operation,
        `"${paramsJson}"`,
        rangeStart,
        rangeEnd,
        before.length,
        after.length,
        bitsChanged,
        step.cost || 0,
        step.duration.toFixed(2),
        hash,
      ].join(','));
    });
    
    // Add final verification info
    playbackLines.push('');
    playbackLines.push(`# Final Bits Hash: ${this.simpleHash(result.finalBits)}`);
    playbackLines.push(`# Initial Bits Hash: ${this.simpleHash(result.initialBits)}`);
    playbackLines.push(`# Total Steps: ${result.steps.length}`);
    playbackLines.push(`# Total Cost: ${result.benchmarks.totalCost}`);
    playbackLines.push(`# Expected Final Length: ${result.finalBits.length} bits`);
    
    zip.file('steps_playback.csv', playbackLines.join('\n'));

    return await zip.generateAsync({ type: 'blob' });
  }

  private simpleHash(bits: string): string {
    let hash = 0;
    for (let i = 0; i < bits.length; i++) {
      const char = bits.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  private bitsToHex(bits: string): string {
    const bytes: string[] = [];
    for (let i = 0; i < bits.length; i += 8) {
      const byte = bits.slice(i, i + 8).padEnd(8, '0');
      bytes.push(parseInt(byte, 2).toString(16).padStart(2, '0').toUpperCase());
    }
    return bytes.join(' ');
  }

  getStatistics(): {
    totalResults: number;
    bookmarkedCount: number;
    avgDuration: number;
    successRate: number;
    uniqueTags: string[];
  } {
    const results = this.getAllResults();
    const completed = results.filter(r => r.status === 'completed');
    const allTags = new Set<string>();
    results.forEach(r => r.tags.forEach(t => allTags.add(t)));

    return {
      totalResults: results.length,
      bookmarkedCount: results.filter(r => r.bookmarked).length,
      avgDuration: completed.length > 0 
        ? completed.reduce((sum, r) => sum + r.duration, 0) / completed.length 
        : 0,
      successRate: results.length > 0 
        ? (completed.length / results.length) * 100 
        : 0,
      uniqueTags: Array.from(allTags),
    };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l());
  }
}

export const resultsManager = new ResultsManager();
