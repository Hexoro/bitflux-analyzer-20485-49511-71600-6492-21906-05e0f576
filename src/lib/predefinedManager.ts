/**
 * Pre-defined Manager - Manages base metrics and operations that are used across the system
 * These are the source of truth for all metrics/operations available in Algorithm mode
 */

import { EXTENDED_METRICS, EXTENDED_OPERATIONS } from './expandedPresets';

export interface PredefinedMetric {
  id: string;
  name: string;
  description: string;
  formula: string;
  unit?: string;
  category?: string;
  // Code mode - executable JavaScript
  code?: string;
  isCodeBased?: boolean;
}

export interface PredefinedOperation {
  id: string;
  name: string;
  description: string;
  parameters?: { name: string; type: string; description: string }[];
  category?: string;
  // Code mode - executable JavaScript
  code?: string;
  isCodeBased?: boolean;
}

const STORAGE_KEYS = {
  metrics: 'bitwise_predefined_metrics',
  operations: 'bitwise_predefined_operations',
};

// Default pre-defined metrics
const DEFAULT_METRICS: PredefinedMetric[] = [
  {
    id: 'entropy',
    name: 'Shannon Entropy',
    description: 'Measures information density and randomness',
    formula: '-Σ(p(x) * log₂(p(x))) for all symbols x',
    unit: 'bits',
    category: 'Information Theory',
  },
  {
    id: 'compression_ratio',
    name: 'Compression Ratio',
    description: 'Ratio of original size to compressed size',
    formula: 'original_size / compressed_size',
    unit: 'ratio',
    category: 'Compression',
  },
  {
    id: 'hamming_weight',
    name: 'Hamming Weight',
    description: 'Count of 1-bits in the binary stream',
    formula: 'Σ(bit[i]) for all i',
    unit: 'count',
    category: 'Statistics',
  },
  {
    id: 'transition_count',
    name: 'Transition Count',
    description: 'Number of 0→1 and 1→0 transitions',
    formula: 'Σ(bit[i] ≠ bit[i+1]) for all i',
    unit: 'count',
    category: 'Statistics',
  },
  {
    id: 'run_length_avg',
    name: 'Average Run Length',
    description: 'Average length of consecutive identical bits',
    formula: 'total_bits / number_of_runs',
    unit: 'bits',
    category: 'Compression',
  },
  {
    id: 'balance',
    name: 'Bit Balance',
    description: 'Ratio of 1-bits to total bits',
    formula: 'count(1) / total_bits',
    unit: 'ratio',
    category: 'Statistics',
  },
  {
    id: 'autocorrelation',
    name: 'Autocorrelation',
    description: 'Correlation of stream with delayed version',
    formula: 'Σ(bit[i] * bit[i+lag]) / n',
    unit: 'coefficient',
    category: 'Statistics',
  },
  {
    id: 'chi_square',
    name: 'Chi-Square Statistic',
    description: 'Measures deviation from expected distribution',
    formula: 'Σ((observed - expected)² / expected)',
    unit: 'statistic',
    category: 'Randomness',
  },
  {
    id: 'ideality',
    name: 'File Ideality',
    description: 'Repeating sequence density measurement',
    formula: '(ideal_bits / total_bits) × 100',
    unit: 'percent',
    category: 'Pattern Analysis',
  },
  {
    id: 'kolmogorov_estimate',
    name: 'Kolmogorov Complexity Estimate',
    description: 'Estimated algorithmic complexity',
    formula: 'length(compress(data))',
    unit: 'bits',
    category: 'Information Theory',
  },
];

// Default pre-defined operations
const DEFAULT_OPERATIONS: PredefinedOperation[] = [
  {
    id: 'AND',
    name: 'AND Gate',
    description: 'Bitwise AND operation',
    parameters: [{ name: 'mask', type: 'binary', description: 'Bit pattern to AND with' }],
    category: 'Logic Gates',
  },
  {
    id: 'OR',
    name: 'OR Gate',
    description: 'Bitwise OR operation',
    parameters: [{ name: 'mask', type: 'binary', description: 'Bit pattern to OR with' }],
    category: 'Logic Gates',
  },
  {
    id: 'XOR',
    name: 'XOR Gate',
    description: 'Bitwise exclusive OR operation',
    parameters: [{ name: 'mask', type: 'binary', description: 'Bit pattern to XOR with' }],
    category: 'Logic Gates',
  },
  {
    id: 'NOT',
    name: 'NOT Gate',
    description: 'Bitwise negation (invert all bits)',
    parameters: [],
    category: 'Logic Gates',
  },
  {
    id: 'NAND',
    name: 'NAND Gate',
    description: 'Bitwise NOT-AND operation',
    parameters: [{ name: 'mask', type: 'binary', description: 'Bit pattern to NAND with' }],
    category: 'Logic Gates',
  },
  {
    id: 'NOR',
    name: 'NOR Gate',
    description: 'Bitwise NOT-OR operation',
    parameters: [{ name: 'mask', type: 'binary', description: 'Bit pattern to NOR with' }],
    category: 'Logic Gates',
  },
  {
    id: 'XNOR',
    name: 'XNOR Gate',
    description: 'Bitwise exclusive NOR operation',
    parameters: [{ name: 'mask', type: 'binary', description: 'Bit pattern to XNOR with' }],
    category: 'Logic Gates',
  },
  {
    id: 'SHL',
    name: 'Shift Left',
    description: 'Logical shift left by n positions',
    parameters: [{ name: 'count', type: 'number', description: 'Number of positions to shift' }],
    category: 'Shifts',
  },
  {
    id: 'SHR',
    name: 'Shift Right',
    description: 'Logical shift right by n positions',
    parameters: [{ name: 'count', type: 'number', description: 'Number of positions to shift' }],
    category: 'Shifts',
  },
  {
    id: 'ROL',
    name: 'Rotate Left',
    description: 'Circular rotate left by n positions',
    parameters: [{ name: 'count', type: 'number', description: 'Number of positions to rotate' }],
    category: 'Rotations',
  },
  {
    id: 'ROR',
    name: 'Rotate Right',
    description: 'Circular rotate right by n positions',
    parameters: [{ name: 'count', type: 'number', description: 'Number of positions to rotate' }],
    category: 'Rotations',
  },
  {
    id: 'INSERT',
    name: 'Insert Bits',
    description: 'Insert bits at specified position',
    parameters: [
      { name: 'position', type: 'number', description: 'Position to insert at' },
      { name: 'bits', type: 'binary', description: 'Bits to insert' },
    ],
    category: 'Manipulation',
  },
  {
    id: 'DELETE',
    name: 'Delete Bits',
    description: 'Delete bits at specified range',
    parameters: [
      { name: 'start', type: 'number', description: 'Start position' },
      { name: 'count', type: 'number', description: 'Number of bits to delete' },
    ],
    category: 'Manipulation',
  },
  {
    id: 'MOVE',
    name: 'Move Bits',
    description: 'Move bits from one position to another',
    parameters: [
      { name: 'source', type: 'number', description: 'Source position' },
      { name: 'dest', type: 'number', description: 'Destination position' },
      { name: 'count', type: 'number', description: 'Number of bits to move' },
    ],
    category: 'Manipulation',
  },
  {
    id: 'PAD',
    name: 'Pad Bits',
    description: 'Add padding bits to align to boundary',
    parameters: [
      { name: 'alignment', type: 'number', description: 'Alignment boundary' },
      { name: 'value', type: 'binary', description: 'Padding value (0 or 1)' },
    ],
    category: 'Packing',
  },
  {
    id: 'GRAY',
    name: 'Gray Code',
    description: 'Convert to/from Gray code encoding',
    parameters: [{ name: 'direction', type: 'string', description: 'encode or decode' }],
    category: 'Encoding',
  },
  {
    id: 'ENDIAN',
    name: 'Endian Swap',
    description: 'Swap byte endianness',
    parameters: [{ name: 'word_size', type: 'number', description: 'Word size in bits' }],
    category: 'Encoding',
  },
  {
    id: 'ADD',
    name: 'Binary Add',
    description: 'Binary addition with optional overflow handling',
    parameters: [{ name: 'value', type: 'binary', description: 'Value to add' }],
    category: 'Arithmetic',
  },
  {
    id: 'SUB',
    name: 'Binary Subtract',
    description: 'Binary subtraction with optional underflow handling',
    parameters: [{ name: 'value', type: 'binary', description: 'Value to subtract' }],
    category: 'Arithmetic',
  },
];

export class PredefinedManager {
  private metrics: Map<string, PredefinedMetric> = new Map();
  private operations: Map<string, PredefinedOperation> = new Map();
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      // Load metrics - merge with defaults AND extended to ensure all metrics exist
      const metricsData = localStorage.getItem(STORAGE_KEYS.metrics);
      // Always add defaults first
      DEFAULT_METRICS.forEach(m => this.metrics.set(m.id, m));
      // Add extended metrics (100+)
      EXTENDED_METRICS.forEach(m => this.metrics.set(m.id, m));
      if (metricsData) {
        const parsed: PredefinedMetric[] = JSON.parse(metricsData);
        // Override with stored (allows custom edits to persist)
        parsed.forEach(m => this.metrics.set(m.id, m));
      }

      // Load operations - merge with defaults AND extended to ensure all operations exist
      const opsData = localStorage.getItem(STORAGE_KEYS.operations);
      // Always add defaults first (includes all 7 logic gates)
      DEFAULT_OPERATIONS.forEach(op => this.operations.set(op.id, op));
      // Add extended operations (100+)
      EXTENDED_OPERATIONS.forEach(op => this.operations.set(op.id, op));
      if (opsData) {
        const parsed: PredefinedOperation[] = JSON.parse(opsData);
        // Override with stored (allows custom edits to persist)
        parsed.forEach(op => this.operations.set(op.id, op));
      }
      
      // Save to ensure storage has all defaults
      this.saveToStorage();
    } catch (error) {
      console.error('Failed to load predefined data:', error);
      // Fallback to defaults + extended
      DEFAULT_METRICS.forEach(m => this.metrics.set(m.id, m));
      EXTENDED_METRICS.forEach(m => this.metrics.set(m.id, m));
      DEFAULT_OPERATIONS.forEach(op => this.operations.set(op.id, op));
      EXTENDED_OPERATIONS.forEach(op => this.operations.set(op.id, op));
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.metrics, JSON.stringify(this.getAllMetrics()));
      localStorage.setItem(STORAGE_KEYS.operations, JSON.stringify(this.getAllOperations()));
    } catch (error) {
      console.error('Failed to save predefined data:', error);
    }
  }

  // Metrics CRUD
  getAllMetrics(): PredefinedMetric[] {
    return Array.from(this.metrics.values());
  }

  getMetric(id: string): PredefinedMetric | undefined {
    return this.metrics.get(id);
  }

  addMetric(metric: PredefinedMetric): void {
    this.metrics.set(metric.id, metric);
    this.saveToStorage();
    this.notifyListeners();
  }

  updateMetric(id: string, updates: Partial<PredefinedMetric>): void {
    const existing = this.metrics.get(id);
    if (existing) {
      this.metrics.set(id, { ...existing, ...updates });
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  deleteMetric(id: string): void {
    this.metrics.delete(id);
    this.saveToStorage();
    this.notifyListeners();
  }

  // Operations CRUD
  getAllOperations(): PredefinedOperation[] {
    return Array.from(this.operations.values());
  }

  getOperation(id: string): PredefinedOperation | undefined {
    return this.operations.get(id);
  }

  addOperation(operation: PredefinedOperation): void {
    this.operations.set(operation.id, operation);
    this.saveToStorage();
    this.notifyListeners();
  }

  updateOperation(id: string, updates: Partial<PredefinedOperation>): void {
    const existing = this.operations.get(id);
    if (existing) {
      this.operations.set(id, { ...existing, ...updates });
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  deleteOperation(id: string): void {
    this.operations.delete(id);
    this.saveToStorage();
    this.notifyListeners();
  }

  // Categories
  getMetricCategories(): string[] {
    const cats = new Set<string>();
    this.metrics.forEach(m => m.category && cats.add(m.category));
    return Array.from(cats).sort();
  }

  getOperationCategories(): string[] {
    const cats = new Set<string>();
    this.operations.forEach(op => op.category && cats.add(op.category));
    return Array.from(cats).sort();
  }

  // Reset to defaults
  resetToDefaults(): void {
    this.metrics.clear();
    this.operations.clear();
    DEFAULT_METRICS.forEach(m => this.metrics.set(m.id, m));
    EXTENDED_METRICS.forEach(m => this.metrics.set(m.id, m));
    DEFAULT_OPERATIONS.forEach(op => this.operations.set(op.id, op));
    EXTENDED_OPERATIONS.forEach(op => this.operations.set(op.id, op));
    this.saveToStorage();
    this.notifyListeners();
  }

  // Subscribe to changes
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

// Singleton instance
export const predefinedManager = new PredefinedManager();
