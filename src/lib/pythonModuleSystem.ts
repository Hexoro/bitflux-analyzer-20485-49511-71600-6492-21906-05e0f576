/**
 * Python Module System - Manages Python files and strategies
 * Supports: file management, strategy creation/validation, player state
 */

export interface PythonFile {
  id: string;
  name: string;
  content: string;
  group: 'scheduler' | 'algorithm' | 'scoring' | 'policies' | 'ai' | 'custom';
  customGroup?: string; // For user-defined groups
  created: Date;
  modified: Date;
}

export interface StrategyConfig {
  id: string;
  name: string;
  schedulerFile: string;    // Required - 1 file
  algorithmFiles: string[]; // Multiple allowed
  scoringFiles: string[];   // Multiple allowed - defines budget
  policyFiles: string[];    // Multiple allowed - optional
  created: Date;
}

export interface ExecutionContext {
  bits: string;
  metrics: Record<string, number>;
  operations: string[];
  allFiles: PythonFile[];
}

export interface PlayerState {
  isPlaying: boolean;
  currentStep: number;
  highlightedTransformations: string[];
  binaryHighlights: { start: number; end: number; color: string }[];
}

const STORAGE_KEY = 'bitwise_python_files_v2';
const STRATEGY_KEY = 'bitwise_strategies_v3';
const CUSTOM_GROUPS_KEY = 'bitwise_custom_groups';

class PythonModuleSystem {
  private files: Map<string, PythonFile> = new Map();
  private strategies: Map<string, StrategyConfig> = new Map();
  private customGroups: Set<string> = new Set();
  private listeners: Set<() => void> = new Set();
  private playerState: PlayerState = {
    isPlaying: false,
    currentStep: 0,
    highlightedTransformations: [],
    binaryHighlights: []
  };

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        parsed.forEach((f: any) => {
          this.files.set(f.id, {
            ...f,
            created: new Date(f.created),
            modified: new Date(f.modified),
          });
          // Also register any custom groups from files
          if (f.customGroup) {
            this.customGroups.add(f.customGroup);
          }
        });
      }

      const stratData = localStorage.getItem(STRATEGY_KEY);
      if (stratData) {
        const parsed = JSON.parse(stratData);
        parsed.forEach((s: any) => {
          this.strategies.set(s.id, {
            ...s,
            created: new Date(s.created),
          });
        });
      }

      // Load custom groups
      const groupsData = localStorage.getItem(CUSTOM_GROUPS_KEY);
      if (groupsData) {
        const parsed = JSON.parse(groupsData);
        parsed.forEach((g: string) => this.customGroups.add(g));
      }
    } catch (error) {
      console.error('Failed to load Python files:', error);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(this.files.values())));
      localStorage.setItem(STRATEGY_KEY, JSON.stringify(Array.from(this.strategies.values())));
      localStorage.setItem(CUSTOM_GROUPS_KEY, JSON.stringify(Array.from(this.customGroups)));
    } catch (error) {
      console.error('Failed to save Python files:', error);
    }
  }

  // File management - supports .py and .js files
  addFile(name: string, content: string, group: PythonFile['group'], customGroup?: string): PythonFile {
    const validExtensions = ['.py', '.js', '.ts'];
    const hasValidExt = validExtensions.some(ext => name.endsWith(ext));
    
    if (!hasValidExt) {
      throw new Error('Only Python (.py), JavaScript (.js), and TypeScript (.ts) files are allowed');
    }

    // Check if file with same name exists
    const existing = this.getFileByName(name);
    if (existing) {
      // Update existing file instead
      existing.content = content;
      existing.modified = new Date();
      existing.group = group;
      existing.customGroup = customGroup;
      this.saveToStorage();
      this.notifyListeners();
      return existing;
    }

    const id = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const file: PythonFile = {
      id,
      name,
      content,
      group,
      customGroup,
      created: new Date(),
      modified: new Date(),
    };
    this.files.set(id, file);
    this.saveToStorage();
    this.notifyListeners();
    return file;
  }

  updateFile(id: string, updates: Partial<Pick<PythonFile, 'content' | 'name' | 'group'>>): void {
    const file = this.files.get(id);
    if (file) {
      if (updates.content !== undefined) file.content = updates.content;
      if (updates.name !== undefined) file.name = updates.name;
      if (updates.group !== undefined) file.group = updates.group;
      file.modified = new Date();
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  deleteFile(id: string): void {
    this.files.delete(id);
    this.saveToStorage();
    this.notifyListeners();
  }

  getFile(id: string): PythonFile | undefined {
    return this.files.get(id);
  }

  getFileByName(name: string): PythonFile | undefined {
    return Array.from(this.files.values()).find(f => f.name === name);
  }

  getFilesByGroup(group: PythonFile['group']): PythonFile[] {
    return Array.from(this.files.values())
      .filter(f => f.group === group)
      .sort((a, b) => b.created.getTime() - a.created.getTime());
  }

  getAllFiles(): PythonFile[] {
    return Array.from(this.files.values())
      .sort((a, b) => b.created.getTime() - a.created.getTime());
  }

  // Strategy management - only scheduler is required, algorithm and scoring recommended
  createStrategy(
    name: string, 
    schedulerFile: string, 
    algorithmFiles: string[], 
    scoringFiles: string[], 
    policyFiles: string[]
  ): StrategyConfig {
    // Validate scheduler exists (required)
    if (!this.getFileByName(schedulerFile)) {
      throw new Error(`Scheduler file "${schedulerFile}" not found`);
    }
    
    // Algorithm files are recommended but not strictly required
    if (algorithmFiles.length === 0) {
      console.warn('No algorithm files selected - strategy may not perform any transformations');
    }
    
    // Scoring files are recommended but not strictly required
    if (scoringFiles.length === 0) {
      console.warn('No scoring files selected - using default budget of 1000');
    }

    // Check if strategy with same name exists
    const existingStrategy = Array.from(this.strategies.values()).find(s => s.name === name);
    if (existingStrategy) {
      throw new Error(`Strategy "${name}" already exists`);
    }

    const id = `strat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const strategy: StrategyConfig = {
      id,
      name,
      schedulerFile,
      algorithmFiles,
      scoringFiles,
      policyFiles,
      created: new Date(),
    };
    this.strategies.set(id, strategy);
    this.saveToStorage();
    this.notifyListeners();
    return strategy;
  }

  deleteStrategy(id: string): void {
    this.strategies.delete(id);
    this.saveToStorage();
    this.notifyListeners();
  }

  getStrategy(id: string): StrategyConfig | undefined {
    return this.strategies.get(id);
  }

  getAllStrategies(): StrategyConfig[] {
    return Array.from(this.strategies.values())
      .sort((a, b) => b.created.getTime() - a.created.getTime());
  }

  validateStrategy(id: string): { valid: boolean; errors: string[]; warnings: string[] } {
    const strategy = this.strategies.get(id);
    if (!strategy) {
      return { valid: false, errors: ['Strategy not found'], warnings: [] };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check scheduler (required)
    if (!this.getFileByName(strategy.schedulerFile)) {
      errors.push(`Scheduler file "${strategy.schedulerFile}" not found`);
    }
    
    // Check algorithms (recommended)
    strategy.algorithmFiles.forEach(f => {
      if (!this.getFileByName(f)) {
        errors.push(`Algorithm file "${f}" not found`);
      }
    });
    
    // Warn if no algorithms
    if (strategy.algorithmFiles.length === 0) {
      warnings.push('No algorithm files - strategy may not perform transformations');
    }
    
    // Check scoring (recommended but optional)
    strategy.scoringFiles.forEach(f => {
      if (!this.getFileByName(f)) {
        errors.push(`Scoring file "${f}" not found`);
      }
    });
    
    if (strategy.scoringFiles.length === 0) {
      warnings.push('No scoring files - using default budget');
    }
    
    // Check policies (optional but validate if specified)
    strategy.policyFiles.forEach(f => {
      if (!this.getFileByName(f)) {
        errors.push(`Policy file "${f}" not found`);
      }
    });

    return { valid: errors.length === 0, errors, warnings };
  }

  // Register a custom group (persists even without files)
  registerCustomGroup(groupName: string): void {
    if (groupName && !this.customGroups.has(groupName)) {
      this.customGroups.add(groupName);
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  // Unregister a custom group
  unregisterCustomGroup(groupName: string): void {
    if (this.customGroups.has(groupName)) {
      this.customGroups.delete(groupName);
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  // Get all custom groups (registered + from files)
  getCustomGroups(): string[] {
    const groups = new Set<string>(this.customGroups);
    for (const file of this.files.values()) {
      if (file.customGroup) {
        groups.add(file.customGroup);
      }
    }
    return Array.from(groups).sort();
  }

  /**
   * Generate Python code that auto-injects all files as modules
   */
  generateModuleInjectionCode(context: ExecutionContext): string {
    const modules: string[] = [];
    
    context.allFiles.forEach(file => {
      const moduleName = file.name.replace('.py', '');
      // Escape the content for embedding
      const escapedContent = file.content
        .replace(/\\/g, '\\\\')
        .replace(/"""/g, '\\"\\"\\"')
        .replace(/\n/g, '\\n');
      
      modules.push(`
# Auto-injected module: ${moduleName}
import sys
from types import ModuleType
${moduleName}_module = ModuleType('${moduleName}')
${moduleName}_module.__dict__['__name__'] = '${moduleName}'
exec("""${escapedContent}""", ${moduleName}_module.__dict__)
sys.modules['${moduleName}'] = ${moduleName}_module
`);
    });
    
    return modules.join('\n');
  }

  // Player state management
  getPlayerState(): PlayerState {
    return { ...this.playerState };
  }

  setPlayerState(updates: Partial<PlayerState>): void {
    this.playerState = { ...this.playerState, ...updates };
    this.notifyListeners();
  }

  // Subscription
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l());
  }

  // Clear all data (for testing)
  clearAll(): void {
    this.files.clear();
    this.strategies.clear();
    this.saveToStorage();
    this.notifyListeners();
  }
}

export const pythonModuleSystem = new PythonModuleSystem();
