/**
 * Python Executor - Pyodide-based Python execution for AI strategies
 * Connected to real operations and metrics via routers
 * V2 - Fixed module state reset between runs
 */

import { executeOperation, getOperationCost, getAvailableOperations, hasImplementation as hasOpImpl } from './operationsRouter';
import { calculateMetric, calculateAllMetrics, getAvailableMetrics, hasImplementation as hasMetricImpl } from './metricsCalculator';

export interface PythonContext {
  bits: string;
  budget: number;
  metrics: Record<string, number>;
  operations: string[];
}

interface PythonValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  hasTensorflow: boolean;
  hasKeras: boolean;
}

export interface TransformationRecord {
  operation: string;
  params: Record<string, any>;
  // Full file context
  fullBeforeBits: string;
  fullAfterBits: string;
  // Segment-level (what was actually operated on)
  beforeBits: string;
  afterBits: string;
  bitRanges: { start: number; end: number }[];
  bitsChanged: number;
  segmentBitsChanged: number;
  cost: number;
  duration: number;
  // Cumulative state for Player reconstruction
  cumulativeBits: string;
  // Metrics snapshot after this operation
  metricsSnapshot: Record<string, number>;
  // Whether this was a segment-only operation (didn't modify full file state)
  segmentOnly: boolean;
}

export interface PythonExecutionResult {
  success: boolean;
  output: any;
  logs: string[];
  error?: string;
  duration: number;
  transformations: TransformationRecord[];
  finalBits: string;
  metrics: Record<string, number>;
  stats: {
    totalOperations: number;
    totalBitsChanged: number;
    budgetUsed: number;
    budgetRemaining: number;
  };
}

export type RuntimePolicy = 'strict' | 'legacy_fallback';

class PythonExecutor {
  private pyodide: any = null;
  private isLoaded = false;
  private loadPromise: Promise<void> | null = null;
  private loadProgress = 0;
  private listeners: Set<(progress: number) => void> = new Set();
  private executionCounter = 0;
  private loadFailed = false;
  private fallbackMode = false;
  private runtimePolicy: RuntimePolicy = 'legacy_fallback';

  setRuntimePolicy(policy: RuntimePolicy): void {
    this.runtimePolicy = policy;
  }

  getRuntimePolicy(): RuntimePolicy {
    return this.runtimePolicy;
  }

  isPyodideAvailable(): boolean {
    return this.isLoaded && !this.loadFailed;
  }

  async loadPyodide(): Promise<void> {
    if (this.isLoaded) return;
    if (this.loadFailed && this.fallbackMode) return; // Already in fallback mode
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      try {
        this.notifyProgress(10);
        
        // Try multiple CDN sources for Pyodide
        const cdnSources = [
          'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js',
          'https://pyodide-cdn2.iodide.io/v0.24.1/full/pyodide.js',
        ];
        
        let loaded = false;
        for (const src of cdnSources) {
          try {
            const script = document.createElement('script');
            script.src = src;
            
            await new Promise<void>((resolve, reject) => {
              script.onload = () => resolve();
              script.onerror = () => reject(new Error(`Failed to load from ${src}`));
              const timeoutId = setTimeout(() => reject(new Error('Timeout')), 15000);
              script.onload = () => { clearTimeout(timeoutId); resolve(); };
              document.head.appendChild(script);
            });
            
            loaded = true;
            console.log(`Pyodide script loaded from ${src}`);
            break;
          } catch (e) {
            console.warn(`Failed to load Pyodide from ${src}:`, e);
            continue;
          }
        }
        
        if (!loaded) {
          throw new Error('All Pyodide CDN sources failed');
        }

        this.notifyProgress(30);

        // @ts-ignore
        this.pyodide = await window.loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/',
        });

        this.notifyProgress(70);
        
        // Try to load numpy, but don't fail if it doesn't work
        try {
          await this.pyodide.loadPackage(['numpy']);
        } catch (e) {
          console.warn('Failed to load numpy, continuing without it:', e);
        }
        
        this.notifyProgress(100);
        this.isLoaded = true;
        this.loadFailed = false;
        console.log('Pyodide Python loaded successfully');
      } catch (error) {
        console.error('Failed to load Pyodide, enabling fallback mode:', error);
        this.loadFailed = true;
        this.fallbackMode = true;
        this.notifyProgress(100); // Mark as "complete" even in fallback
        // Don't throw - allow fallback execution
      }
    })();

    return this.loadPromise;
  }

  /**
   * Check if we're in fallback mode (no Pyodide available)
   */
  isFallbackMode(): boolean {
    return this.fallbackMode;
  }

  private notifyProgress(progress: number): void {
    this.loadProgress = progress;
    this.listeners.forEach(l => l(progress));
  }

  subscribeProgress(listener: (progress: number) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getLoadProgress(): number {
    return this.loadProgress;
  }

  isReady(): boolean {
    return this.isLoaded;
  }

  async validateSyntax(pythonCode: string): Promise<PythonValidationResult> {
    const result: PythonValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      hasTensorflow: false,
      hasKeras: false,
    };

    try {
      result.hasTensorflow = pythonCode.includes('tensorflow') || pythonCode.includes('import tf');
      result.hasKeras = pythonCode.includes('keras');

      if (result.hasTensorflow) {
        result.warnings.push('TensorFlow detected - ensure model file is accessible');
      }

      if (!pythonCode.includes('def execute')) {
        result.warnings.push('Strategy should define an "execute()" function');
      }

      if (!pythonCode.includes('from bitwise_api import') && !pythonCode.includes('import bitwise_api')) {
        result.warnings.push('Consider importing bitwise_api for access to operations');
      }

      const openParens = (pythonCode.match(/\(/g) || []).length;
      const closeParens = (pythonCode.match(/\)/g) || []).length;
      if (openParens !== closeParens) {
        result.valid = false;
        result.errors.push(`Mismatched parentheses: ${openParens} open, ${closeParens} close`);
      }

      const openBrackets = (pythonCode.match(/\[/g) || []).length;
      const closeBrackets = (pythonCode.match(/\]/g) || []).length;
      if (openBrackets !== closeBrackets) {
        result.valid = false;
        result.errors.push(`Mismatched brackets: ${openBrackets} open, ${closeBrackets} close`);
      }

      const lines = pythonCode.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('\t') && line.match(/^ +/)) {
          result.warnings.push(`Line ${i + 1}: Mixed tabs and spaces`);
        }
      }

      if (this.isLoaded) {
        try {
          await this.pyodide.runPythonAsync(`
import ast
try:
    ast.parse('''${pythonCode.replace(/'/g, "\\'")}''')
except SyntaxError as e:
    raise e
          `);
        } catch (error: any) {
          result.valid = false;
          result.errors.push(`Python syntax error: ${error.message || error}`);
        }
      }

      return result;
    } catch (error) {
      result.valid = false;
      result.errors.push(`Validation error: ${error}`);
      return result;
    }
  }

  private createBitwiseApiBridge(context: PythonContext) {
    let currentBits = context.bits;
    let currentBudget = context.budget;
    const initialBudget = context.budget;
    const logs: string[] = [];
    const transformations: TransformationRecord[] = [];

    return {
      bridge: {
        apply_operation: (opName: string, bits: string, params?: any, rangeStart?: number, rangeEnd?: number) => {
          const startTime = performance.now();
          const fullBeforeBits = currentBits;
          // Validate bits arg: must be non-empty string of only 0s and 1s, otherwise use currentBits
          const isValidBitString = bits && bits.length > 0 && /^[01]+$/.test(bits);
          const targetBits = isValidBitString ? bits : currentBits;
          const isFullOperation = !isValidBitString || bits === currentBits || bits.length === currentBits.length;
          
          console.log(`[BRIDGE] ▶ apply_operation("${opName}") | rawBitsArg="${(bits || '').slice(0, 40)}${bits && bits.length > 40 ? '...' : ''}" | isValidBitString=${isValidBitString} | targetBits.len=${targetBits.length} | isFullOp=${isFullOperation} | params=`, JSON.stringify(params || {}).slice(0, 200));
          
          try {
            const result = executeOperation(opName, targetBits, params || {});
            if (result.success) {
              let fullAfterBits = currentBits;
              let bitsChanged = 0;
              
              // If operating on full bits or no bits provided, update currentBits
              if (isFullOperation) {
                currentBits = result.bits;
                fullAfterBits = result.bits;
                bitsChanged = this.countChangedBits(fullBeforeBits, fullAfterBits);
              } else {
                // Operating on a segment - count changes in that segment
                bitsChanged = this.countChangedBits(targetBits, result.bits);
              }
              
              console.log(`[BRIDGE] ✓ ${opName} | bitsChanged=${bitsChanged} | resultParams.hasMask=${!!result.params?.mask} | resultParams.hasSeed=${!!result.params?.seed}`);
              if (bitsChanged === 0) {
                console.warn(`[BRIDGE] ⚠ ZERO bits changed for ${opName}! currentBits updated=${isFullOperation}`);
              }
              
              const opCost = getOperationCost(opName);
              
              // Get metrics snapshot after operation (using current full bits)
              const metricsResult = calculateAllMetrics(currentBits);
              
              // Persist the *actual* params used by the router (critical for exact Player replay)
              const actualParams = result.params;
              
              const segmentBitsChanged = this.countChangedBits(targetBits, result.bits);
              
              transformations.push({
                operation: opName,
                params: actualParams,
                fullBeforeBits,
                fullAfterBits: isFullOperation ? fullAfterBits : currentBits,
                beforeBits: targetBits,
                afterBits: result.bits,
                bitRanges: rangeStart !== undefined && rangeEnd !== undefined 
                  ? [{ start: rangeStart, end: rangeEnd }]
                  : [{ start: 0, end: targetBits.length }],
                bitsChanged,
                segmentBitsChanged,
                cost: opCost,
                duration: performance.now() - startTime,
                cumulativeBits: currentBits,
                metricsSnapshot: metricsResult.metrics,
                segmentOnly: !isFullOperation,
              });
              
              return result.bits;
            }
            console.error(`[BRIDGE] ✗ Operation ${opName} failed: ${result.error}`);
            logs.push(`[ERROR] Operation ${opName} failed: ${result.error}`);
            return targetBits;
          } catch (e) {
            console.error(`[BRIDGE] ✗ Operation ${opName} exception:`, e);
            logs.push(`[ERROR] Operation ${opName} exception: ${e}`);
            return targetBits;
          }
        },

        apply_operation_range: (opName: string, start: number, end: number, params?: any) => {
          const startTime = performance.now();
          const fullBeforeBits = currentBits;
          try {
            const targetBits = currentBits.slice(start, end);
            const result = executeOperation(opName, targetBits, params || {});
            if (result.success) {
              const newBits = currentBits.slice(0, start) + result.bits + currentBits.slice(end);
              const bitsChanged = this.countChangedBits(targetBits, result.bits);
              const opCost = getOperationCost(opName);
              
              currentBits = newBits;
              
              // Get metrics snapshot after operation
              const metricsResult = calculateAllMetrics(currentBits);
              
               transformations.push({
                 operation: opName,
                 params: { ...result.params, range: { start, end } },
                 fullBeforeBits,
                 fullAfterBits: newBits,
                beforeBits: targetBits,
                afterBits: result.bits,
                bitRanges: [{ start, end }],
                bitsChanged,
                segmentBitsChanged: bitsChanged,
                cost: opCost,
                duration: performance.now() - startTime,
                cumulativeBits: currentBits,
                metricsSnapshot: metricsResult.metrics,
                segmentOnly: false,
              });
              
              return result.bits;
            }
            logs.push(`[ERROR] Operation ${opName} on range [${start}:${end}] failed: ${result.error}`);
            return targetBits;
          } catch (e) {
            logs.push(`[ERROR] Operation ${opName} exception: ${e}`);
            return currentBits.slice(start, end);
          }
        },

        get_metric: (metricName: string, bits?: string) => {
          try {
            const targetBits = bits || currentBits;
            const result = calculateMetric(metricName, targetBits);
            if (result.success) {
              return result.value;
            }
            logs.push(`[WARN] Metric ${metricName} failed: ${result.error}`);
            return 0;
          } catch (e) {
            logs.push(`[WARN] Metric ${metricName} exception: ${e}`);
            return 0;
          }
        },

        get_all_metrics: (bits?: string) => {
          try {
            const targetBits = bits || currentBits;
            const result = calculateAllMetrics(targetBits);
            return result.metrics;
          } catch (e) {
            logs.push(`[WARN] get_all_metrics exception: ${e}`);
            return {};
          }
        },

        get_cost: (opName: string) => getOperationCost(opName),
        has_operation: (opName: string) => hasOpImpl(opName),
        has_metric: (metricName: string) => hasMetricImpl(metricName),
        get_available_operations: () => getAvailableOperations(),
        get_available_metrics: () => getAvailableMetrics(),
        get_budget: () => currentBudget,
        
        deduct_budget: (amount: number) => {
          if (currentBudget >= amount) {
            currentBudget -= amount;
            return true;
          }
          return false;
        },

        log: (msg: string) => { logs.push(String(msg)); },
        get_bits: () => currentBits,
        set_bits: (newBits: string) => { currentBits = newBits; },
        get_bits_length: () => currentBits.length,
        get_bit: (index: number) => currentBits[index] || '0',
        set_bit: (index: number, value: string) => {
          if (index >= 0 && index < currentBits.length) {
            currentBits = currentBits.slice(0, index) + (value === '1' ? '1' : '0') + currentBits.slice(index + 1);
          }
        },
      },
      getLogs: () => logs,
      getCurrentBits: () => currentBits,
      getCurrentBudget: () => currentBudget,
      getTransformations: () => transformations,
      getStats: () => ({
        totalOperations: transformations.length,
        totalBitsChanged: transformations.reduce((sum, t) => sum + t.bitsChanged, 0),
        budgetUsed: initialBudget - currentBudget,
        budgetRemaining: currentBudget,
      }),
    };
  }

  private countChangedBits(before: string, after: string): number {
    let count = 0;
    const maxLen = Math.max(before.length, after.length);
    for (let i = 0; i < maxLen; i++) {
      if ((before[i] || '0') !== (after[i] || '0')) count++;
    }
    return count;
  }

  /**
   * Fallback execution when Pyodide is unavailable
   * Parses simple Python-like commands and executes them via the bridge
   */
  private fallbackExecution(pythonCode: string, context: PythonContext, startTime: number): PythonExecutionResult {
    console.log(`[PYEXEC-FALLBACK] ▶ Starting fallback execution | bits.len=${context.bits.length} | budget=${context.budget} | operations.len=${context.operations.length}`);
    console.log(`[PYEXEC-FALLBACK] Python code (first 500 chars): "${pythonCode.slice(0, 500)}"`);
    
    const bridgeObj = this.createBitwiseApiBridge(context);
    const logs: string[] = ['[FALLBACK MODE] Pyodide unavailable, using enhanced JS execution'];
    
    try {
      const lines = pythonCode.split('\n');
      console.log(`[PYEXEC-FALLBACK] Code has ${lines.length} lines`);
      
      // Variable tracker
      const vars: Record<string, any> = {};
      // List tracker
      const lists: Record<string, any[]> = {};
      // Dict tracker
      const dicts: Record<string, Record<string, any>> = {};
      // Function definitions
      const funcDefs: Record<string, { params: string[]; bodyStart: number; bodyEnd: number }> = {};
      
      // Pre-populate known variables
      vars['bits'] = context.bits;
      vars['budget'] = context.budget;
      lists['operations'] = [...context.operations];
      lists['OPERATIONS'] = [...context.operations];
      
      // Helper: get indentation level
      const getIndent = (line: string): number => {
        const match = line.match(/^(\s*)/);
        return match ? match[1].length : 0;
      };
      
      // Helper: resolve a value
      const resolveValue = (val: string): any => {
        const trimmed = val.trim();
        // String literal
        if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
          return trimmed.slice(1, -1);
        }
        // Number
        if (/^\d+(\.\d+)?$/.test(trimmed)) return parseFloat(trimmed);
        // Boolean
        if (trimmed === 'True') return true;
        if (trimmed === 'False') return false;
        if (trimmed === 'None') return null;
        // Variable
        if (vars[trimmed] !== undefined) return vars[trimmed];
        if (lists[trimmed] !== undefined) return lists[trimmed];
        if (dicts[trimmed] !== undefined) return dicts[trimmed];
        
        // min(a, b) / max(a, b)
        const minMaxMatch = trimmed.match(/^(min|max)\s*\(\s*(.+?)\s*,\s*(.+?)\s*\)$/);
        if (minMaxMatch) {
          const a = Number(resolveValue(minMaxMatch[2]));
          const b = Number(resolveValue(minMaxMatch[3]));
          return minMaxMatch[1] === 'min' ? Math.min(a, b) : Math.max(a, b);
        }
        
        // int(x)
        const intMatch = trimmed.match(/^int\s*\(\s*(.+?)\s*\)$/);
        if (intMatch) return Math.floor(Number(resolveValue(intMatch[1])));
        
        // str(x)
        const strMatch = trimmed.match(/^str\s*\(\s*(.+?)\s*\)$/);
        if (strMatch) return String(resolveValue(strMatch[1]));
        
        // isinstance(x, y) - always return true for simplicity
        if (trimmed.startsWith('isinstance(')) return true;
        
        // len() call - support nested: len(bits), len(x)
        const lenMatch = trimmed.match(/^len\((.+?)\)$/);
        if (lenMatch) {
          const inner = lenMatch[1].trim();
          const v = resolveValue(inner);
          if (typeof v === 'string') return v.length;
          if (Array.isArray(v)) return v.length;
          if (typeof v === 'object' && v !== null) return Object.keys(v).length;
          return 0;
        }
        
        // Arithmetic: a // b, a + b, a - b, a * b, a / b, a % b
        const intDivMatch = trimmed.match(/^(.+?)\s*\/\/\s*(.+)$/);
        if (intDivMatch) {
          const a = Number(resolveValue(intDivMatch[1]));
          const b = Number(resolveValue(intDivMatch[2]));
          return b !== 0 ? Math.floor(a / b) : 0;
        }
        const arithMatch = trimmed.match(/^(.+?)\s*([+\-*/%])\s*([^+\-*/%].*)$/);
        if (arithMatch && !trimmed.includes('(')) {
          const a = Number(resolveValue(arithMatch[1]));
          const b = Number(resolveValue(arithMatch[3]));
          switch (arithMatch[2]) {
            case '+': return a + b;
            case '-': return a - b;
            case '*': return a * b;
            case '/': return b !== 0 ? a / b : 0;
            case '%': return b !== 0 ? a % b : 0;
          }
        }
        
        // get_bits()
        if (trimmed === 'get_bits()' || trimmed === 'bitwise_api.get_bits()') return bridgeObj.bridge.get_bits();
        // get_available_operations()
        if (trimmed.includes('get_available_operations()')) return context.operations;
        // get_available_metrics()
        if (trimmed.includes('get_available_metrics()')) return bridgeObj.bridge.get_available_metrics();
        // get_all_metrics()
        if (trimmed.includes('get_all_metrics()')) return bridgeObj.bridge.get_all_metrics();
        // get_budget()
        if (trimmed.includes('get_budget()')) return bridgeObj.bridge.get_budget();
        // get_bits_length()
        if (trimmed.includes('get_bits_length()')) return bridgeObj.bridge.get_bits_length();
        // get_cost(op)
        const costMatch = trimmed.match(/(?:bitwise_api\.)?get_cost\s*\(\s*(.+?)\s*\)/);
        if (costMatch) return bridgeObj.bridge.get_cost(String(resolveValue(costMatch[1])));
        // get_metric(name) - support 2 args: get_metric(name, bits)
        const metricMatch2 = trimmed.match(/(?:bitwise_api\.)?get_metric\s*\(\s*(.+?)\s*,\s*(.+?)\s*\)/);
        if (metricMatch2) return bridgeObj.bridge.get_metric(String(resolveValue(metricMatch2[1])), String(resolveValue(metricMatch2[2])));
        const metricMatch = trimmed.match(/(?:bitwise_api\.)?get_metric\s*\(\s*(.+?)\s*\)/);
        if (metricMatch) return bridgeObj.bridge.get_metric(String(resolveValue(metricMatch[1])));
        // is_operation_allowed(op) / has_operation(op)
        const opAllowedMatch = trimmed.match(/(?:bitwise_api\.)?(?:is_operation_allowed|has_operation)\s*\(\s*(.+?)\s*\)/);
        if (opAllowedMatch) return bridgeObj.bridge.has_operation(String(resolveValue(opAllowedMatch[1])));
        
        // list(x.keys())[:N] pattern
        const listKeysSlice = trimmed.match(/^list\((\w+)\.keys\(\)\)\s*\[\s*:(\d+)\s*\]$/);
        if (listKeysSlice) {
          const d = dicts[listKeysSlice[1]] || (vars[listKeysSlice[1]] as Record<string, any>);
          if (d && typeof d === 'object') return Object.keys(d).slice(0, parseInt(listKeysSlice[2]));
          return [];
        }
        // list(x.keys())
        const listKeysMatch = trimmed.match(/^list\((\w+)\.keys\(\)\)$/);
        if (listKeysMatch) {
          const d = dicts[listKeysMatch[1]] || (vars[listKeysMatch[1]] as Record<string, any>);
          if (d && typeof d === 'object') return Object.keys(d);
          return [];
        }
        // list(x)[:N] pattern
        const listSliceMatch = trimmed.match(/^list\((\w+)\)\s*\[\s*:(\d+)\s*\]$/);
        if (listSliceMatch) {
          const source = lists[listSliceMatch[1]] || (vars[listSliceMatch[1]] as any[]) || [];
          return (Array.isArray(source) ? source : []).slice(0, parseInt(listSliceMatch[2]));
        }
        // list(x) pattern
        const listWrapMatch = trimmed.match(/^list\((\w+)\)$/);
        if (listWrapMatch) {
          const source = lists[listWrapMatch[1]] || vars[listWrapMatch[1]];
          return Array.isArray(source) ? [...source] : [];
        }
        // sorted(x)
        const sortedMatch = trimmed.match(/^sorted\((\w+)\)$/);
        if (sortedMatch) {
          const source = lists[sortedMatch[1]] || vars[sortedMatch[1]] || [];
          return [...(Array.isArray(source) ? source : [])].sort();
        }
        // x[:expr] slice on variable - support expressions in slice indices
        const varSliceExpr = trimmed.match(/^(\w+)\s*\[\s*(?:(.+?))?\s*:\s*(?:(.+?))?\s*\]$/);
        if (varSliceExpr) {
          const v = vars[varSliceExpr[1]] || lists[varSliceExpr[1]];
          const startVal = varSliceExpr[2] ? Number(resolveValue(varSliceExpr[2])) : 0;
          const endVal = varSliceExpr[3] ? Number(resolveValue(varSliceExpr[3])) : undefined;
          const start = isNaN(startVal) ? 0 : startVal;
          const end = endVal !== undefined && !isNaN(endVal) ? endVal : undefined;
          if (typeof v === 'string') return v.slice(start, end);
          if (Array.isArray(v)) return v.slice(start, end);
        }
        // dict.get(key, default)
        const getMatch = trimmed.match(/^(\w+)\.get\s*\(\s*(.+?)\s*(?:,\s*(.+))?\s*\)$/);
        if (getMatch) {
          const d = dicts[getMatch[1]] || (vars[getMatch[1]] as Record<string, any>);
          const key = resolveValue(getMatch[2]);
          if (d && typeof d === 'object' && d[key] !== undefined) return d[key];
          return getMatch[3] ? resolveValue(getMatch[3]) : undefined;
        }
        // dict[key]
        const dictAccessMatch = trimmed.match(/^(\w+)\s*\[\s*(.+?)\s*\]$/);
        if (dictAccessMatch) {
          const d = dicts[dictAccessMatch[1]] || vars[dictAccessMatch[1]];
          const key = resolveValue(dictAccessMatch[2]);
          if (d && typeof d === 'object' && !Array.isArray(d)) return (d as any)[key];
          if (Array.isArray(d) && typeof key === 'number') return d[key];
        }
        // x in y
        const inMatch = trimmed.match(/^(.+)\s+in\s+(\w+)$/);
        if (inMatch) {
          const item = resolveValue(inMatch[1]);
          const container = lists[inMatch[2]] || vars[inMatch[2]];
          if (Array.isArray(container)) return container.includes(item);
          if (typeof container === 'string') return container.includes(String(item));
          return false;
        }
        // sum() with generator: sum(1 for a, b in zip(...))
        if (trimmed.startsWith('sum(')) return 0;
        
        return trimmed;
      };
      
      // Resolve params from expression
      const resolveParams = (paramsStr: string): Record<string, any> => {
        const trimmed = paramsStr.trim();
        if (trimmed.startsWith('{')) {
          try {
            const jsonStr = trimmed
              .replace(/'/g, '"')
              .replace(/True/g, 'true')
              .replace(/False/g, 'false')
              .replace(/None/g, 'null');
            return JSON.parse(jsonStr);
          } catch { return {}; }
        }
        // dict.get() pattern
        const getMatch = trimmed.match(/^(\w+)\.get\s*\(\s*(.+?)\s*(?:,\s*(.+))?\s*\)$/);
        if (getMatch) {
          const result = resolveValue(trimmed);
          return typeof result === 'object' && result !== null ? result : {};
        }
        // Variable name
        if (dicts[trimmed]) return { ...dicts[trimmed] };
        if (vars[trimmed] && typeof vars[trimmed] === 'object') return { ...vars[trimmed] };
        return {};
      };
      
      // Execute an apply_operation call
      // Handles: apply_operation('OP'), apply_operation('OP', {params}), apply_operation('OP', bits, {params})
      const executeApplyOp = (trimmed: string): boolean => {
        console.log(`[FALLBACK-PARSE] ▶ Parsing: "${trimmed.slice(0, 120)}"`);
        
        // First try 3-arg: apply_operation(op, bits, params)
        const threeArgMatch = trimmed.match(/(?:bitwise_api\.)?apply_operation\s*\(\s*([^,)]+)\s*,\s*([^,{)]+)\s*,\s*(\{.+\}|\w+)\s*\)/);
        if (threeArgMatch) {
          const opName = String(resolveValue(threeArgMatch[1]));
          const bitsArg = String(resolveValue(threeArgMatch[2]));
          const parsedParams = resolveParams(threeArgMatch[3]);
          console.log(`[FALLBACK-PARSE] ✓ 3-arg match: op="${opName}" bits="${bitsArg.slice(0, 40)}" params=`, parsedParams);
          bridgeObj.bridge.apply_operation(opName, bitsArg, parsedParams);
          return true;
        }
        
        // Two-arg: apply_operation(op, {params}) - dict as second arg means params, not bits
        const twoArgDictMatch = trimmed.match(/(?:bitwise_api\.)?apply_operation\s*\(\s*([^,)]+)\s*,\s*(\{.*\})\s*\)/);
        if (twoArgDictMatch) {
          const opName = String(resolveValue(twoArgDictMatch[1]));
          const parsedParams = resolveParams(twoArgDictMatch[2]);
          console.log(`[FALLBACK-PARSE] ✓ 2-arg-dict match: op="${opName}" params=`, parsedParams);
          // Pass empty string for bits so bridge uses currentBits
          bridgeObj.bridge.apply_operation(opName, '', parsedParams);
          return true;
        }
        
        // Two-arg: apply_operation(op, bits_variable) - variable as bits
        const twoArgVarMatch = trimmed.match(/(?:bitwise_api\.)?apply_operation\s*\(\s*([^,)]+)\s*,\s*([^,{)]+)\s*\)/);
        if (twoArgVarMatch) {
          const opName = String(resolveValue(twoArgVarMatch[1]));
          const secondArg = resolveValue(twoArgVarMatch[2]);
          console.log(`[FALLBACK-PARSE] ✓ 2-arg-var match: op="${opName}" secondArg type=${typeof secondArg} val="${String(secondArg).slice(0, 40)}"`);
          // If the second arg resolves to an object/dict, treat as params
          if (typeof secondArg === 'object' && secondArg !== null && !Array.isArray(secondArg)) {
            bridgeObj.bridge.apply_operation(opName, '', secondArg);
          } else {
            bridgeObj.bridge.apply_operation(opName, String(secondArg), {});
          }
          return true;
        }
        
        // One-arg: apply_operation(op) - no bits, no params
        const oneArgMatch = trimmed.match(/(?:bitwise_api\.)?apply_operation\s*\(\s*([^,)]+)\s*\)/);
        if (oneArgMatch) {
          const opName = String(resolveValue(oneArgMatch[1]));
          console.log(`[FALLBACK-PARSE] ✓ 1-arg match: op="${opName}"`);
          bridgeObj.bridge.apply_operation(opName, '', {});
          return true;
        }
        
        console.warn(`[FALLBACK-PARSE] ✗ No regex matched for: "${trimmed.slice(0, 120)}"`);
        return false;
      };
      
      // Evaluate simple conditions
      const evaluateCondition = (cond: string): boolean => {
        const trimmed = cond.trim();
        // x in y
        const inMatch = trimmed.match(/^(.+)\s+in\s+(\w+)$/);
        if (inMatch) {
          const item = resolveValue(inMatch[1].trim());
          const container = lists[inMatch[2]] || vars[inMatch[2]];
          if (Array.isArray(container)) return container.includes(item);
          return false;
        }
        // not x
        if (trimmed.startsWith('not ')) return !evaluateCondition(trimmed.slice(4));
        // x > N, x < N, x == N, x >= N, x <= N, x != N
        const compMatch = trimmed.match(/^(.+?)\s*(>=|<=|!=|==|>|<)\s*(.+)$/);
        if (compMatch) {
          const left = resolveValue(compMatch[1].trim());
          const right = resolveValue(compMatch[3].trim());
          const a = typeof left === 'number' ? left : parseFloat(String(left));
          const b = typeof right === 'number' ? right : parseFloat(String(right));
          switch (compMatch[2]) {
            case '>': return a > b;
            case '<': return a < b;
            case '>=': return a >= b;
            case '<=': return a <= b;
            case '==': return left === right || a === b;
            case '!=': return left !== right;
          }
        }
        // has_operation() / has_metric() / is_operation_allowed()
        if (trimmed.includes('has_operation(') || trimmed.includes('is_operation_allowed(')) {
          const m = trimmed.match(/(?:has_operation|is_operation_allowed)\(\s*(.+?)\s*\)/);
          if (m) return bridgeObj.bridge.has_operation(String(resolveValue(m[1])));
        }
        if (trimmed.includes('has_metric(')) {
          const m = trimmed.match(/has_metric\(\s*(.+?)\s*\)/);
          if (m) return bridgeObj.bridge.has_metric(String(resolveValue(m[1])));
        }
        // Truthy check
        const v = resolveValue(trimmed);
        return !!v;
      };
      
      // First pass: find function definitions
      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        const defMatch = trimmed.match(/^def\s+(\w+)\s*\(([^)]*)\)\s*:/);
        if (defMatch) {
          const funcName = defMatch[1];
          const params = defMatch[2].split(',').map(p => p.trim().split('=')[0].trim()).filter(Boolean);
          const bodyIndent = getIndent(lines[i]) + 4;
          let bodyEnd = i;
          for (let j = i + 1; j < lines.length; j++) {
            const lineIndent = getIndent(lines[j]);
            if (lines[j].trim().length === 0) continue;
            if (lineIndent >= bodyIndent) {
              bodyEnd = j;
            } else {
              break;
            }
          }
          funcDefs[funcName] = { params, bodyStart: i + 1, bodyEnd };
        }
      }
      
      // First pass: collect variable/list/dict assignments (including multi-line dicts)
      for (let li = 0; li < lines.length; li++) {
        const trimmed = lines[li].trim();
        if (trimmed.startsWith('#') || trimmed.startsWith('def ') || trimmed.startsWith('import ') || trimmed.startsWith('from ')) continue;
        
        // Simple assignment: var = 'value'
        const strAssign = trimmed.match(/^(\w+)\s*=\s*["'](.+?)["']\s*$/);
        if (strAssign) { vars[strAssign[1]] = strAssign[2]; continue; }
        
        // Number assignment: var = 123
        const numAssign = trimmed.match(/^(\w+)\s*=\s*(\d+(?:\.\d+)?)\s*$/);
        if (numAssign) { vars[numAssign[1]] = parseFloat(numAssign[2]); continue; }
        
        // List assignment: var = [...]
        const listMatch = trimmed.match(/^(\w+)\s*=\s*\[(.+)\]\s*$/);
        if (listMatch) {
          const items = listMatch[2].match(/["'](\w+)["']/g);
          if (items) lists[listMatch[1]] = items.map(i => i.replace(/["']/g, ''));
          continue;
        }
        
        // List from function: var = get_available_operations()
        if (trimmed.match(/^(\w+)\s*=\s*(?:bitwise_api\.)?get_available_operations\(\)/)) {
          const name = trimmed.match(/^(\w+)/)?.[1];
          if (name) lists[name] = [...context.operations];
          continue;
        }
        
        // Multi-line dict assignment: var = { ... (possibly spanning multiple lines)
        const multiDictStart = trimmed.match(/^(\w+)\s*=\s*\{(.*)$/);
        if (multiDictStart && !trimmed.endsWith('}')) {
          // Collect lines until closing brace
          let dictStr = multiDictStart[2];
          let braceCount = 1; // We've seen the opening {
          // Count braces in first line
          for (const ch of multiDictStart[2]) {
            if (ch === '{') braceCount++;
            if (ch === '}') braceCount--;
          }
          let j = li + 1;
          while (j < lines.length && braceCount > 0) {
            const dLine = lines[j].trim();
            for (const ch of dLine) {
              if (ch === '{') braceCount++;
              if (ch === '}') braceCount--;
            }
            dictStr += ' ' + dLine;
            j++;
          }
          try {
            const jsonStr = ('{' + dictStr)
              .replace(/'/g, '"').replace(/True/g, 'true').replace(/False/g, 'false').replace(/None/g, 'null')
              .replace(/,\s*}/g, '}') // trailing commas
              .replace(/\(\s*\)/g, '()'); // ignore function calls in values
            // Try parsing - may fail for complex nested structures
            dicts[multiDictStart[1]] = JSON.parse(jsonStr);
          } catch {
            // Simplified: try to extract string key-value pairs
            const pairs: Record<string, any> = {};
            const pairRegex = /["'](\w+)["']\s*:\s*(?:["']([^"']+)["']|\{([^}]*)\}|(\d+(?:\.\d+)?))/g;
            let m;
            const fullStr = '{' + dictStr;
            while ((m = pairRegex.exec(fullStr)) !== null) {
              if (m[2] !== undefined) pairs[m[1]] = m[2];
              else if (m[4] !== undefined) pairs[m[1]] = parseFloat(m[4]);
              else if (m[3] !== undefined) {
                // Nested dict - try to parse sub-keys
                const subPairs: Record<string, any> = {};
                const subRegex = /["'](\w+)["']\s*:\s*(?:["']([^"']+)["']|(\d+(?:\.\d+)?))/g;
                let sm;
                while ((sm = subRegex.exec(m[3])) !== null) {
                  subPairs[sm[1]] = sm[2] !== undefined ? sm[2] : parseFloat(sm[3]);
                }
                if (Object.keys(subPairs).length > 0) pairs[m[1]] = subPairs;
              }
            }
            if (Object.keys(pairs).length > 0) dicts[multiDictStart[1]] = pairs;
          }
          li = j - 1; // skip consumed lines
          continue;
        }
        
        // Single-line dict assignment: var = {...}
        const dictMatch = trimmed.match(/^(\w+)\s*=\s*(\{.*\})\s*$/);
        if (dictMatch) {
          try {
            const jsonStr = dictMatch[2]
              .replace(/'/g, '"').replace(/True/g, 'true').replace(/False/g, 'false').replace(/None/g, 'null')
              .replace(/,\s*}/g, '}');
            dicts[dictMatch[1]] = JSON.parse(jsonStr);
          } catch { /* skip */ }
          continue;
        }
        
        // Variable from expression: var = expression
        const exprAssign = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
        if (exprAssign && !trimmed.includes('apply_operation') && !trimmed.includes('def ')) {
          const val = resolveValue(exprAssign[2]);
          if (Array.isArray(val)) {
            lists[exprAssign[1]] = val;
          } else if (typeof val === 'object' && val !== null) {
            dicts[exprAssign[1]] = val;
          } else {
            vars[exprAssign[1]] = val;
          }
        }
      }
      
      // Execute a block of lines (recursive for nested structures)
      const executeBlock = (startLine: number, endLine: number, blockIndent: number) => {
        let i = startLine;
        while (i <= endLine) {
          const rawLine = lines[i];
          const trimmed = rawLine.trim();
          const indent = getIndent(rawLine);
          
          // Skip empty, comments, imports, def declarations, global keyword, return/pass
          if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('import ') || trimmed.startsWith('from ') || trimmed.startsWith('def ') || trimmed.startsWith('global ') || trimmed === 'pass' || trimmed.startsWith('return ') || trimmed === 'return') {
            // Skip function body
            if (trimmed.startsWith('def ')) {
              const defName = trimmed.match(/^def\s+(\w+)/)?.[1];
              if (defName && funcDefs[defName]) {
                i = funcDefs[defName].bodyEnd + 1;
                continue;
              }
            }
            i++;
            continue;
          }
          
          // Handle try/except
          if (trimmed === 'try:') {
            const tryIndent = indent;
            // Find try body end
            let tryEnd = i;
            let exceptStart = -1;
            for (let j = i + 1; j <= endLine; j++) {
              const jTrimmed = lines[j].trim();
              const jIndent = getIndent(lines[j]);
              if (jTrimmed.length === 0) continue;
              if (jIndent <= tryIndent && (jTrimmed.startsWith('except') || jTrimmed.startsWith('finally'))) {
                exceptStart = j;
                break;
              }
              if (jIndent <= tryIndent && !jTrimmed.startsWith('except') && !jTrimmed.startsWith('finally')) {
                break;
              }
              tryEnd = j;
            }
            // Execute try body
            try {
              executeBlock(i + 1, tryEnd, tryIndent + 4);
            } catch { /* swallow, like Python except: pass */ }
            // Skip to after except block
            if (exceptStart >= 0) {
              let exceptEnd = exceptStart;
              for (let j = exceptStart + 1; j <= endLine; j++) {
                if (lines[j].trim().length === 0) continue;
                if (getIndent(lines[j]) <= tryIndent) break;
                exceptEnd = j;
              }
              i = exceptEnd + 1;
            } else {
              i = tryEnd + 1;
            }
            continue;
          }
          
          // Handle for loops
          const forMatch = trimmed.match(/^for\s+(\w+)\s+in\s+(.+)\s*:$/);
          if (forMatch) {
            const loopVar = forMatch[1];
            let loopItemsExpr = forMatch[2].trim();
            let loopItems: any[] = [];
            
            // Resolve loop iterable
            const resolved = resolveValue(loopItemsExpr);
            if (Array.isArray(resolved)) {
              loopItems = resolved;
            } else if (typeof resolved === 'string' && lists[resolved]) {
              loopItems = lists[resolved];
            } else if (lists[loopItemsExpr]) {
              loopItems = lists[loopItemsExpr];
            }
            
            // Find loop body
            const loopIndent = indent;
            let bodyEnd = i;
            for (let j = i + 1; j <= endLine; j++) {
              if (lines[j].trim().length === 0) continue;
              if (getIndent(lines[j]) > loopIndent) {
                bodyEnd = j;
              } else {
                break;
              }
            }
            
            // Execute loop body for each item
            for (const item of loopItems) {
              vars[loopVar] = item;
              executeBlock(i + 1, bodyEnd, loopIndent + 4);
            }
            
            i = bodyEnd + 1;
            continue;
          }
          
          // Handle if/elif/else
          const ifMatch = trimmed.match(/^(if|elif)\s+(.+)\s*:$/);
          if (ifMatch || trimmed === 'else:') {
            const condIndent = indent;
            // Collect if/elif/else chain
            const branches: { condition: string | null; bodyStart: number; bodyEnd: number }[] = [];
            let j = i;
            while (j <= endLine) {
              const jTrimmed = lines[j].trim();
              const jIndent = getIndent(lines[j]);
              if (jIndent !== condIndent) { j++; continue; }
              
              const condMatch = jTrimmed.match(/^(if|elif)\s+(.+)\s*:$/);
              if (condMatch || jTrimmed === 'else:') {
                const cond = condMatch ? condMatch[2] : null;
                // Find body end
                let bEnd = j;
                for (let k = j + 1; k <= endLine; k++) {
                  if (lines[k].trim().length === 0) continue;
                  if (getIndent(lines[k]) > condIndent) {
                    bEnd = k;
                  } else {
                    break;
                  }
                }
                branches.push({ condition: cond, bodyStart: j + 1, bodyEnd: bEnd });
                j = bEnd + 1;
                // Check if next line continues the chain
                if (j <= endLine) {
                  const nextTrimmed = lines[j]?.trim();
                  const nextIndent = getIndent(lines[j] || '');
                  if (nextIndent === condIndent && (nextTrimmed?.startsWith('elif ') || nextTrimmed === 'else:')) {
                    continue;
                  }
                }
                break;
              } else {
                break;
              }
            }
            
            // Execute first matching branch
            let executed = false;
            for (const branch of branches) {
              if (branch.condition === null) {
                // else branch
                if (!executed) {
                  executeBlock(branch.bodyStart, branch.bodyEnd, condIndent + 4);
                }
                break;
              }
              if (!executed && evaluateCondition(branch.condition)) {
                executeBlock(branch.bodyStart, branch.bodyEnd, condIndent + 4);
                executed = true;
              }
            }
            
            i = branches.length > 0 ? branches[branches.length - 1].bodyEnd + 1 : i + 1;
            continue;
          }
          
          // Handle apply_operation (including tuple unpacking: a, b = func(apply_operation...))
          if (trimmed.includes('apply_operation') && !trimmed.startsWith('def ')) {
            // Check for any assignment (including tuple) before apply_operation
            const assignOp = trimmed.match(/^.+=\s*(.+apply_operation.+)$/);
            if (assignOp) {
              executeApplyOp(assignOp[1]);
            } else {
              executeApplyOp(trimmed);
            }
            i++;
            continue;
          }
          
          // Handle tuple unpacking: a, b = func(...)
          const tupleAssignFunc = trimmed.match(/^(\w+)\s*,\s*(\w+)\s*=\s*(\w+)\s*\((.*)?\)\s*$/);
          if (tupleAssignFunc) {
            const funcName = tupleAssignFunc[3];
            if (funcDefs[funcName]) {
              const def = funcDefs[funcName];
              const callArgs = tupleAssignFunc[4] ? tupleAssignFunc[4].split(',').map(a => resolveValue(a.trim())) : [];
              def.params.forEach((p, idx) => {
                if (idx < callArgs.length) vars[p] = callArgs[idx];
              });
              executeBlock(def.bodyStart, def.bodyEnd, getIndent(lines[def.bodyStart]) || 8);
            } else {
              // Try to resolve as a built-in or expression
              const callExpr = `${tupleAssignFunc[3]}(${tupleAssignFunc[4] || ''})`;
              const result = resolveValue(callExpr);
              if (Array.isArray(result) && result.length >= 2) {
                vars[tupleAssignFunc[1]] = result[0];
                vars[tupleAssignFunc[2]] = result[1];
              } else {
                vars[tupleAssignFunc[1]] = result;
                vars[tupleAssignFunc[2]] = result;
              }
            }
            i++;
            continue;
          }
          
          // Handle apply_operation_range
          const rangeMatch = trimmed.match(/(?:bitwise_api\.)?apply_operation_range\s*\(\s*(.+?)\s*,\s*(.+?)\s*,\s*(.+?)(?:\s*,\s*(.+))?\s*\)/);
          if (rangeMatch) {
            const opName = String(resolveValue(rangeMatch[1]));
            const rStart = Number(resolveValue(rangeMatch[2]));
            const rEnd = Number(resolveValue(rangeMatch[3]));
            bridgeObj.bridge.apply_operation_range(opName, rStart, rEnd);
            i++;
            continue;
          }
          
          // Handle print statements
          if (trimmed.startsWith('print(')) {
            const strMatch = trimmed.match(/print\(\s*["'](.*)["']\s*\)/);
            if (strMatch) logs.push(strMatch[1]);
            else if (trimmed.includes('get_bits()')) logs.push(`Bits: ${bridgeObj.bridge.get_bits().slice(0, 64)}...`);
            i++;
            continue;
          }
          
          // Handle log calls
          const logMatch = trimmed.match(/(?:bitwise_api\.)?log\s*\(\s*(.+)\s*\)/);
          if (logMatch) {
            const val = resolveValue(logMatch[1]);
            logs.push(String(val));
            i++;
            continue;
          }
          
          // Handle += / -= operators
          const augAssignMatch = trimmed.match(/^(\w+)\s*(\+=|-=|\*=|\/=)\s*(.+)$/);
          if (augAssignMatch) {
            const varName = augAssignMatch[1];
            const op = augAssignMatch[2];
            const rhsVal = resolveValue(augAssignMatch[3]);
            const currentVal = typeof vars[varName] === 'number' ? vars[varName] : 0;
            const rhs = typeof rhsVal === 'number' ? rhsVal : parseFloat(String(rhsVal)) || 0;
            switch (op) {
              case '+=': vars[varName] = currentVal + rhs; break;
              case '-=': vars[varName] = currentVal - rhs; break;
              case '*=': vars[varName] = currentVal * rhs; break;
              case '/=': vars[varName] = rhs !== 0 ? currentVal / rhs : currentVal; break;
            }
            i++;
            continue;
          }
          
          // Handle variable assignments (runtime) - now supports function calls on RHS
          const assignMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
          if (assignMatch && !trimmed.includes('apply_operation') && !trimmed.startsWith('def ')) {
            const val = resolveValue(assignMatch[2]);
            if (Array.isArray(val)) lists[assignMatch[1]] = val;
            else if (typeof val === 'object' && val !== null) dicts[assignMatch[1]] = val;
            else vars[assignMatch[1]] = val;
            i++;
            continue;
          }
          
          // Handle function calls that we know about
          const funcCallMatch = trimmed.match(/^(?:(\w+)\s*=\s*)?(\w+)\s*\((.*)?\)\s*$/);
          if (funcCallMatch && funcDefs[funcCallMatch[2]]) {
            const funcName = funcCallMatch[2];
            const def = funcDefs[funcName];
            // Parse call args
            const callArgs = funcCallMatch[3] ? funcCallMatch[3].split(',').map(a => resolveValue(a.trim())) : [];
            // Set params as vars
            def.params.forEach((p, idx) => {
              if (idx < callArgs.length) vars[p] = callArgs[idx];
            });
            // Execute function body
            executeBlock(def.bodyStart, def.bodyEnd, getIndent(lines[def.bodyStart]) || 8);
            i++;
            continue;
          }
          
          i++;
        }
      };
      
      // Execute top-level code
      executeBlock(0, lines.length - 1, 0);
      
      // Try to call execute() if defined
      if (funcDefs['execute']) {
        const def = funcDefs['execute'];
        executeBlock(def.bodyStart, def.bodyEnd, getIndent(lines[def.bodyStart]) || 4);
      }
      
      const transformations = bridgeObj.getTransformations();
      const totalBitsChanged = transformations.reduce((sum, t) => sum + t.bitsChanged, 0);
      const finalBits = bridgeObj.getCurrentBits();
      
      console.log(`[PYEXEC-FALLBACK] ✓ Complete | transformations=${transformations.length} | totalBitsChanged=${totalBitsChanged} | finalBits.len=${finalBits.length}`);
      transformations.forEach((t, i) => {
        console.log(`[PYEXEC-FALLBACK]   [${i}] ${t.operation}: bitsChanged=${t.bitsChanged} hasMask=${!!t.params?.mask} hasSeed=${!!t.params?.seed}`);
      });
      
      logs.push(`[FALLBACK] Completed with ${transformations.length} operations, ${totalBitsChanged} bits changed`);
      
      return {
        success: true,
        output: 'Fallback execution completed',
        logs,
        duration: performance.now() - startTime,
        transformations,
        finalBits,
        metrics: bridgeObj.bridge.get_all_metrics() as Record<string, number>,
        stats: bridgeObj.getStats(),
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        logs,
        error: `Fallback execution error: ${error}`,
        duration: performance.now() - startTime,
        transformations: bridgeObj.getTransformations(),
        finalBits: bridgeObj.getCurrentBits(),
        metrics: {},
        stats: bridgeObj.getStats(),
      };
    }
  }

  async sandboxTest(pythonCode: string, context: PythonContext): Promise<PythonExecutionResult> {
    const startTime = performance.now();
    this.executionCounter++;
    const execId = this.executionCounter;

    console.log(`[PYEXEC] ▶ sandboxTest #${execId} | isLoaded=${this.isLoaded} | fallbackMode=${this.fallbackMode} | runtimePolicy=${this.runtimePolicy}`);
    console.log(`[PYEXEC] Context: bits.len=${context.bits.length} | budget=${context.budget} | operations.len=${context.operations.length}`);

    // Check if we need to use fallback mode
    if (this.fallbackMode || !this.isLoaded) {
      console.log(`[PYEXEC] Attempting to load Pyodide...`);
      await this.loadPyodide();
      
      // If still in fallback mode after attempting to load
      if (this.fallbackMode) {
        console.log(`[PYEXEC] Using FALLBACK mode (Pyodide unavailable)`);
        if (this.runtimePolicy === 'strict') {
          console.error(`[PYEXEC] Strict mode - rejecting fallback execution`);
          return {
            success: false,
            output: null,
            logs: ['[STRICT MODE] Pyodide is unavailable. Python execution requires Pyodide.',
                   'To use fallback mode, change runtime policy to "legacy_fallback" in settings.',
                   'Alternatively, use a JavaScript strategy file (.js) which executes locally.'],
            error: 'Pyodide unavailable (strict mode). Switch to legacy_fallback policy or use JS strategies.',
            duration: performance.now() - startTime,
            transformations: [],
            finalBits: context.bits,
            metrics: context.metrics,
            stats: { totalOperations: 0, totalBitsChanged: 0, budgetUsed: 0, budgetRemaining: context.budget },
          };
        }
        return this.fallbackExecution(pythonCode, context, startTime);
      }
    }
    
    console.log(`[PYEXEC] Using PYODIDE for execution`);

    try {

      const bridgeObj = this.createBitwiseApiBridge(context);
      
      // Use unique module name to avoid state pollution
      const bridgeName = `bitwise_bridge_${execId}`;
      this.pyodide.registerJsModule(bridgeName, bridgeObj.bridge);

      // Reset Python state and create fresh module
      await this.pyodide.runPythonAsync(`
import sys

# Clean up old modules
for mod_name in list(sys.modules.keys()):
    if mod_name.startswith('bitwise_') or mod_name == 'bitwise_api':
        del sys.modules[mod_name]

# Clean up global namespace
for name in list(globals().keys()):
    if not name.startswith('_') and name not in ['sys', 'ast', 'ModuleType']:
        try:
            del globals()[name]
        except:
            pass
      `);

      await this.pyodide.runPythonAsync(`
import sys
from types import ModuleType
import ${bridgeName} as _bridge

# Create fresh bitwise_api module
bitwise_api = ModuleType('bitwise_api')
bitwise_api.bits = '${context.bits}'
bitwise_api.budget = ${context.budget}
bitwise_api.OPERATIONS = ${JSON.stringify(context.operations)}

def apply_operation(op_name, bits=None, params=None):
    if bits is None:
        bits = _bridge.get_bits()
    result = _bridge.apply_operation(op_name, bits, params)
    return result

def apply_operation_range(op_name, start, end, params=None):
    return _bridge.apply_operation_range(op_name, start, end, params)

def get_metric(metric_name, bits=None):
    if bits is None:
        bits = _bridge.get_bits()
    return _bridge.get_metric(metric_name, bits)

def get_all_metrics(bits=None):
    result = _bridge.get_all_metrics(bits)
    return dict(result.to_py()) if hasattr(result, 'to_py') else dict(result)

def get_cost(op_name):
    return _bridge.get_cost(op_name)

def has_operation(op_name):
    return _bridge.has_operation(op_name)

def has_metric(metric_name):
    return _bridge.has_metric(metric_name)

def get_available_operations():
    result = _bridge.get_available_operations()
    return list(result.to_py()) if hasattr(result, 'to_py') else list(result)

def get_available_metrics():
    result = _bridge.get_available_metrics()
    return list(result.to_py()) if hasattr(result, 'to_py') else list(result)

def is_operation_allowed(op_name):
    return op_name in bitwise_api.OPERATIONS

def deduct_budget(amount):
    return _bridge.deduct_budget(amount)

def get_budget():
    return _bridge.get_budget()

def get_bits():
    return _bridge.get_bits()

def set_bits(new_bits):
    _bridge.set_bits(new_bits)

def get_bits_length():
    return _bridge.get_bits_length()

def get_bit(index):
    return _bridge.get_bit(index)

def set_bit(index, value):
    _bridge.set_bit(index, value)

def log(msg):
    _bridge.log(str(msg))

def halt():
    pass

# Attach to module
bitwise_api.apply_operation = apply_operation
bitwise_api.apply_operation_range = apply_operation_range
bitwise_api.get_metric = get_metric
bitwise_api.get_all_metrics = get_all_metrics
bitwise_api.get_cost = get_cost
bitwise_api.has_operation = has_operation
bitwise_api.has_metric = has_metric
bitwise_api.get_available_operations = get_available_operations
bitwise_api.get_available_metrics = get_available_metrics
bitwise_api.is_operation_allowed = is_operation_allowed
bitwise_api.deduct_budget = deduct_budget
bitwise_api.get_budget = get_budget
bitwise_api.get_bits = get_bits
bitwise_api.set_bits = set_bits
bitwise_api.get_bits_length = get_bits_length
bitwise_api.get_bit = get_bit
bitwise_api.set_bit = set_bit
bitwise_api.log = log
bitwise_api.halt = halt

sys.modules['bitwise_api'] = bitwise_api
      `);

      // Capture stdout/stderr for print() support
      await this.pyodide.runPythonAsync(`
import sys, io
_lov_stdout = io.StringIO()
_lov_stderr = io.StringIO()
_lov_prev_stdout = sys.stdout
_lov_prev_stderr = sys.stderr
sys.stdout = _lov_stdout
sys.stderr = _lov_stderr
      `);

      // Run user code
      let result: any = null;
      try {
        result = await this.pyodide.runPythonAsync(pythonCode);
      } finally {
        // (do not restore yet; we still want execute() output captured)
      }

      // Try to call execute() if it exists
      let executeResult = null;
      try {
        executeResult = await this.pyodide.runPythonAsync(`
_result = None
if 'execute' in dir():
    _result = execute()
_result
        `);
      } catch (e) {
        bridgeObj.bridge.log(`execute() error: ${e}`);
      }

      // Read captured stdout/stderr and restore
      let capturedOut = '';
      let capturedErr = '';
      try {
        const captured = await this.pyodide.runPythonAsync(`
_out = _lov_stdout.getvalue()
_err = _lov_stderr.getvalue()
try:
    sys.stdout = _lov_prev_stdout
    sys.stderr = _lov_prev_stderr
except Exception:
    pass
(_out, _err)
        `);

        // Pyodide returns a PyProxy for tuples
        const asJs = (captured && typeof captured.toJs === 'function') ? captured.toJs() : captured;
        if (Array.isArray(asJs)) {
          capturedOut = String(asJs[0] ?? '');
          capturedErr = String(asJs[1] ?? '');
        } else {
          capturedOut = String(asJs ?? '');
        }
      } catch {
        // ignore
      }

      if (capturedOut.trim()) {
        bridgeObj.bridge.log(capturedOut.trimEnd());
      }
      if (capturedErr.trim()) {
        bridgeObj.bridge.log(`[STDERR]\n${capturedErr.trimEnd()}`);
      }

      // Get final metrics
      const finalMetrics = bridgeObj.bridge.get_all_metrics();
      const metricsDict = (finalMetrics && typeof finalMetrics === 'object') 
        ? finalMetrics as Record<string, number>
        : {};

      return {
        success: true,
        output: executeResult !== null ? executeResult : result,
        logs: bridgeObj.getLogs(),
        duration: performance.now() - startTime,
        transformations: bridgeObj.getTransformations(),
        finalBits: bridgeObj.getCurrentBits(),
        metrics: metricsDict,
        stats: bridgeObj.getStats(),
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        logs: [],
        error: error instanceof Error ? error.message : String(error),
        duration: performance.now() - startTime,
        transformations: [],
        finalBits: context.bits,
        metrics: {},
        stats: {
          totalOperations: 0,
          totalBitsChanged: 0,
          budgetUsed: 0,
          budgetRemaining: context.budget,
        },
      };
    }
  }

  /**
   * Execute a full strategy with file integration
   */
  async executeStrategy(
    pythonCode: string, 
    context: PythonContext,
    onProgress?: (step: number, total: number, bits: string) => void
  ): Promise<PythonExecutionResult> {
    return this.sandboxTest(pythonCode, context);
  }
}

export const pythonExecutor = new PythonExecutor();
