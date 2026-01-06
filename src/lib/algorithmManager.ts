/**
 * Algorithm Manager - Manages all algorithm-related files with persistence
 * 
 * File Types:
 * - Strategies: C++ algorithm files
 * - Scoring: Lua scripts for economy/cost calculations
 * - Presets: JSON files defining algorithm/scoring/policies/metrics configuration
 * - Metrics: JSON files defining metric formulas and calculations
 * - Policies: Lua scripts for rules and constraints
 * - Operations: JSON files defining valid operations
 */

export interface AlgorithmFile {
  id: string;
  name: string;
  content: string;
  type: 'strategy' | 'scoring' | 'preset' | 'metrics' | 'policies' | 'operations';
  language: 'cpp' | 'python' | 'lua' | 'json';
  created: Date;
  modified: Date;
}

export interface MetricDefinition {
  id: string;
  name: string;
  description: string;
  formula: string;
  enabled: boolean;
}

export interface OperationDefinition {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface PresetConfig {
  name: string;
  strategyId?: string;
  scoringId?: string;
  policyIds?: string[];
  metricsId?: string;
  operationsId?: string;
}

export interface ParsedMetrics {
  metrics: MetricDefinition[];
}

export interface ParsedOperations {
  operations: OperationDefinition[];
}

export interface ScoringState {
  configId: string | null;
  currentBudget: number;
  operationsApplied: { operation: string; cost: number; timestamp: Date }[];
}

const STORAGE_KEYS = {
  strategies: 'bitwise_strategies',
  scoring: 'bitwise_scoring_lua',
  presets: 'bitwise_presets',
  metrics: 'bitwise_metrics',
  policies: 'bitwise_policies',
  operations: 'bitwise_operations',
  scoringState: 'bitwise_scoring_state',
  metricsState: 'bitwise_metrics_state',
  operationsState: 'bitwise_operations_state',
};

export class AlgorithmManager {
  private files: Map<string, AlgorithmFile> = new Map();
  private metricsState: Map<string, boolean> = new Map(); // metricId -> enabled
  private operationsState: Map<string, boolean> = new Map(); // operationId -> enabled
  private scoringState: ScoringState = {
    configId: null,
    currentBudget: 0,
    operationsApplied: [],
  };
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      // Load all file types
      const fileTypes: AlgorithmFile['type'][] = ['strategy', 'scoring', 'preset', 'metrics', 'policies', 'operations'];
      const keyMap: Record<AlgorithmFile['type'], string> = {
        strategy: STORAGE_KEYS.strategies,
        scoring: STORAGE_KEYS.scoring,
        preset: STORAGE_KEYS.presets,
        metrics: STORAGE_KEYS.metrics,
        policies: STORAGE_KEYS.policies,
        operations: STORAGE_KEYS.operations,
      };

      for (const type of fileTypes) {
        const data = localStorage.getItem(keyMap[type]);
        if (data) {
          const parsed = JSON.parse(data);
          parsed.forEach((file: any) => {
            this.files.set(file.id, {
              ...file,
              type,
              created: new Date(file.created),
              modified: new Date(file.modified),
            });
          });
        }
      }

      // Load scoring state
      const stateData = localStorage.getItem(STORAGE_KEYS.scoringState);
      if (stateData) {
        const parsed = JSON.parse(stateData);
        this.scoringState = {
          ...parsed,
          operationsApplied: (parsed.operationsApplied || []).map((op: any) => ({
            ...op,
            timestamp: new Date(op.timestamp),
          })),
        };
      }

      // Load metrics state
      const metricsStateData = localStorage.getItem(STORAGE_KEYS.metricsState);
      if (metricsStateData) {
        const parsed = JSON.parse(metricsStateData);
        Object.entries(parsed).forEach(([key, value]) => {
          this.metricsState.set(key, value as boolean);
        });
      }

      // Load operations state
      const opsStateData = localStorage.getItem(STORAGE_KEYS.operationsState);
      if (opsStateData) {
        const parsed = JSON.parse(opsStateData);
        Object.entries(parsed).forEach(([key, value]) => {
          this.operationsState.set(key, value as boolean);
        });
      }
    } catch (error) {
      console.error('Failed to load algorithm data from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const keyMap: Record<AlgorithmFile['type'], string> = {
        strategy: STORAGE_KEYS.strategies,
        scoring: STORAGE_KEYS.scoring,
        preset: STORAGE_KEYS.presets,
        metrics: STORAGE_KEYS.metrics,
        policies: STORAGE_KEYS.policies,
        operations: STORAGE_KEYS.operations,
      };

      // Group files by type and save
      const grouped: Record<AlgorithmFile['type'], AlgorithmFile[]> = {
        strategy: [],
        scoring: [],
        preset: [],
        metrics: [],
        policies: [],
        operations: [],
      };

      this.files.forEach(file => {
        grouped[file.type].push(file);
      });

      for (const [type, files] of Object.entries(grouped)) {
        localStorage.setItem(keyMap[type as AlgorithmFile['type']], JSON.stringify(files));
      }

      // Save states
      localStorage.setItem(STORAGE_KEYS.scoringState, JSON.stringify(this.scoringState));
      localStorage.setItem(STORAGE_KEYS.metricsState, JSON.stringify(Object.fromEntries(this.metricsState)));
      localStorage.setItem(STORAGE_KEYS.operationsState, JSON.stringify(Object.fromEntries(this.operationsState)));
    } catch (error) {
      console.error('Failed to save algorithm data to storage:', error);
    }
  }

  // Generic file operations
  addFile(name: string, content: string, type: AlgorithmFile['type']): AlgorithmFile {
    const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Determine language from extension
    let language: AlgorithmFile['language'] = 'json';
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'cpp' || ext === 'c' || ext === 'h') language = 'cpp';
    else if (ext === 'py') language = 'python';
    else if (ext === 'lua') language = 'lua';
    else if (ext === 'json') language = 'json';

    const file: AlgorithmFile = {
      id,
      name,
      content,
      type,
      language,
      created: new Date(),
      modified: new Date(),
    };
    this.files.set(id, file);

    // Initialize metrics/operations states if applicable
    if (type === 'metrics') {
      this.initializeMetricsState(id, content);
    } else if (type === 'operations') {
      this.initializeOperationsState(id, content);
    }

    this.saveToStorage();
    this.notifyListeners();
    return file;
  }

  private initializeMetricsState(fileId: string, content: string): void {
    try {
      const parsed: ParsedMetrics = JSON.parse(content);
      parsed.metrics?.forEach(metric => {
        const key = `${fileId}:${metric.id}`;
        if (!this.metricsState.has(key)) {
          this.metricsState.set(key, metric.enabled ?? true);
        }
      });
    } catch (e) {
      console.error('Failed to parse metrics file:', e);
    }
  }

  private initializeOperationsState(fileId: string, content: string): void {
    try {
      const parsed: ParsedOperations = JSON.parse(content);
      parsed.operations?.forEach(op => {
        const key = `${fileId}:${op.id}`;
        if (!this.operationsState.has(key)) {
          this.operationsState.set(key, op.enabled ?? true);
        }
      });
    } catch (e) {
      console.error('Failed to parse operations file:', e);
    }
  }

  getFilesByType(type: AlgorithmFile['type']): AlgorithmFile[] {
    return Array.from(this.files.values())
      .filter(f => f.type === type)
      .sort((a, b) => b.created.getTime() - a.created.getTime());
  }

  getFile(id: string): AlgorithmFile | undefined {
    return this.files.get(id);
  }

  deleteFile(id: string): void {
    const file = this.files.get(id);
    if (file) {
      // Clean up associated states
      if (file.type === 'metrics') {
        Array.from(this.metricsState.keys())
          .filter(k => k.startsWith(`${id}:`))
          .forEach(k => this.metricsState.delete(k));
      } else if (file.type === 'operations') {
        Array.from(this.operationsState.keys())
          .filter(k => k.startsWith(`${id}:`))
          .forEach(k => this.operationsState.delete(k));
      }
    }
    this.files.delete(id);
    this.saveToStorage();
    this.notifyListeners();
  }

  // Convenience methods for each type
  getStrategies(): AlgorithmFile[] {
    return this.getFilesByType('strategy');
  }

  getScoringScripts(): AlgorithmFile[] {
    return this.getFilesByType('scoring');
  }

  getPresets(): AlgorithmFile[] {
    return this.getFilesByType('preset');
  }

  getMetricsFiles(): AlgorithmFile[] {
    return this.getFilesByType('metrics');
  }

  getPolicies(): AlgorithmFile[] {
    return this.getFilesByType('policies');
  }

  getOperationsFiles(): AlgorithmFile[] {
    return this.getFilesByType('operations');
  }

  // Metrics state management
  getMetricsFromFile(fileId: string): (MetricDefinition & { fileId: string })[] {
    const file = this.files.get(fileId);
    if (!file || file.type !== 'metrics') return [];

    try {
      const parsed: ParsedMetrics = JSON.parse(file.content);
      return (parsed.metrics || []).map(m => ({
        ...m,
        fileId,
        enabled: this.metricsState.get(`${fileId}:${m.id}`) ?? m.enabled ?? true,
      }));
    } catch (e) {
      return [];
    }
  }

  getAllMetrics(): (MetricDefinition & { fileId: string; fileName: string })[] {
    const result: (MetricDefinition & { fileId: string; fileName: string })[] = [];
    this.getMetricsFiles().forEach(file => {
      const metrics = this.getMetricsFromFile(file.id);
      metrics.forEach(m => result.push({ ...m, fileName: file.name }));
    });
    return result;
  }

  toggleMetric(fileId: string, metricId: string, enabled: boolean): void {
    this.metricsState.set(`${fileId}:${metricId}`, enabled);
    this.saveToStorage();
    this.notifyListeners();
  }

  // Operations state management
  getOperationsFromFile(fileId: string): (OperationDefinition & { fileId: string })[] {
    const file = this.files.get(fileId);
    if (!file || file.type !== 'operations') return [];

    try {
      const parsed: ParsedOperations = JSON.parse(file.content);
      return (parsed.operations || []).map(op => ({
        ...op,
        fileId,
        enabled: this.operationsState.get(`${fileId}:${op.id}`) ?? op.enabled ?? true,
      }));
    } catch (e) {
      return [];
    }
  }

  getAllOperations(): (OperationDefinition & { fileId: string; fileName: string })[] {
    const result: (OperationDefinition & { fileId: string; fileName: string })[] = [];
    this.getOperationsFiles().forEach(file => {
      const ops = this.getOperationsFromFile(file.id);
      ops.forEach(op => result.push({ ...op, fileName: file.name }));
    });
    return result;
  }

  toggleOperation(fileId: string, operationId: string, enabled: boolean): void {
    this.operationsState.set(`${fileId}:${operationId}`, enabled);
    this.saveToStorage();
    this.notifyListeners();
  }

  // Scoring state (for Lua-based economy)
  getScoringState(): ScoringState {
    return this.scoringState;
  }

  setActiveScoringScript(id: string | null): void {
    this.scoringState.configId = id;
    this.scoringState.currentBudget = 1000; // Default, can be configured
    this.scoringState.operationsApplied = [];
    this.saveToStorage();
    this.notifyListeners();
  }

  resetScoringState(): void {
    this.scoringState.currentBudget = 1000;
    this.scoringState.operationsApplied = [];
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

  // Legacy compatibility
  getAlgorithms(): AlgorithmFile[] {
    return this.getStrategies();
  }

  getAlgorithm(id: string): AlgorithmFile | undefined {
    return this.getFile(id);
  }

  addAlgorithm(name: string, content: string): AlgorithmFile {
    return this.addFile(name, content, 'strategy');
  }

  deleteAlgorithm(id: string): void {
    this.deleteFile(id);
  }
}

// Singleton instance
export const algorithmManager = new AlgorithmManager();

// Legacy exports for compatibility
export type ScoringConfig = AlgorithmFile;
export type OperationCost = { operation: string; cost: number };
export type CombinedOperationCost = { operations: string[]; cost: number };
