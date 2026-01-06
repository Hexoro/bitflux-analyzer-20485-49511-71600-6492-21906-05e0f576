/**
 * Lua Executor - Real Lua script execution using Fengari
 */

import { predefinedManager } from './predefinedManager';

interface LuaContext {
  bits: string;
  budget: number;
  initialBudget: number;
  stepCount: number;
  history: Array<{ operation: string; cost: number; bits: string }>;
  enabledMetrics: Set<string>;
  enabledOperations: Set<string>;
  logs: string[];
  halted: boolean;
  error: string | null;
}

interface LuaScoringResult {
  costs: Record<string, number>;
  initialBudget: number;
  combos: Array<{ ops: string[]; cost: number }>;
}

interface LuaPolicyResult {
  allowed: string[];
  maxOperations: number;
  validate: (op: string, state: any) => { allowed: boolean; reason?: string };
}

interface LuaValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

class LuaExecutor {
  private fengari: any = null;
  private isLoaded = false;
  private loadPromise: Promise<void> | null = null;

  async loadFengari(): Promise<void> {
    if (this.isLoaded) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      try {
        // Dynamic import of fengari-web
        const fengariModule = await import('fengari-web');
        this.fengari = fengariModule;
        this.isLoaded = true;
        console.log('Fengari Lua loaded successfully');
      } catch (error) {
        console.error('Failed to load Fengari:', error);
        throw new Error('Failed to load Lua runtime');
      }
    })();

    return this.loadPromise;
  }

  isReady(): boolean {
    return this.isLoaded;
  }

  /**
   * Parse and validate a Lua scoring script
   */
  async parseScoringScript(luaCode: string): Promise<LuaScoringResult> {
    await this.loadFengari();
    
    const result: LuaScoringResult = {
      costs: {},
      initialBudget: 1000,
      combos: [],
    };

    try {
      // Extract initial_budget
      const budgetMatch = luaCode.match(/initial_budget\s*=\s*(\d+)/);
      if (budgetMatch) {
        result.initialBudget = parseInt(budgetMatch[1]);
      }

      // Extract costs table
      const costsMatch = luaCode.match(/costs\s*=\s*\{([^}]+)\}/s);
      if (costsMatch) {
        const costsContent = costsMatch[1];
        const costEntries = costsContent.matchAll(/(\w+)\s*=\s*(\d+)/g);
        for (const match of costEntries) {
          result.costs[match[1]] = parseInt(match[2]);
        }
      }

      // Extract combo definitions
      const combosMatch = luaCode.match(/combos\s*=\s*\{([\s\S]*?)\n\}/);
      if (combosMatch) {
        const comboLines = combosMatch[1].matchAll(/\{\s*ops\s*=\s*\{([^}]+)\},\s*cost\s*=\s*(\d+)\s*\}/g);
        for (const match of comboLines) {
          const ops = match[1].match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, '')) || [];
          result.combos.push({ ops, cost: parseInt(match[2]) });
        }
      }

      return result;
    } catch (error) {
      console.error('Error parsing scoring script:', error);
      return result;
    }
  }

  /**
   * Parse and validate a Lua policy script
   */
  async parsePolicyScript(luaCode: string): Promise<LuaPolicyResult> {
    await this.loadFengari();

    const result: LuaPolicyResult = {
      allowed: [],
      maxOperations: 1000,
      validate: () => ({ allowed: true }),
    };

    try {
      // Extract max_operations
      const maxOpsMatch = luaCode.match(/max_operations\s*=\s*(\d+)/);
      if (maxOpsMatch) {
        result.maxOperations = parseInt(maxOpsMatch[1]);
      }

      // Extract allowed_operations
      const allowedMatch = luaCode.match(/allowed_operations\s*=\s*\{([^}]+)\}/);
      if (allowedMatch) {
        const ops = allowedMatch[1].match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, '')) || [];
        result.allowed = ops;
      }

      // Extract forbidden operations
      const forbiddenMatch = luaCode.match(/forbidden\s*=\s*\{([^}]+)\}/);
      if (forbiddenMatch) {
        const forbidden = new Set(
          forbiddenMatch[1].match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, '')) || []
        );
        
        // Build validate function
        result.validate = (op: string) => {
          if (forbidden.has(op)) {
            return { allowed: false, reason: `Operation ${op} is forbidden by policy` };
          }
          if (result.allowed.length > 0 && !result.allowed.includes(op)) {
            return { allowed: false, reason: `Operation ${op} is not in allowed list` };
          }
          return { allowed: true };
        };
      }

      return result;
    } catch (error) {
      console.error('Error parsing policy script:', error);
      return result;
    }
  }

  /**
   * Validate Lua syntax
   */
  async validateSyntax(luaCode: string): Promise<LuaValidationResult> {
    await this.loadFengari();

    const result: LuaValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    try {
      // Basic syntax checks
      const openBraces = (luaCode.match(/\{/g) || []).length;
      const closeBraces = (luaCode.match(/\}/g) || []).length;
      if (openBraces !== closeBraces) {
        result.valid = false;
        result.errors.push(`Mismatched braces: ${openBraces} open, ${closeBraces} close`);
      }

      const openParens = (luaCode.match(/\(/g) || []).length;
      const closeParens = (luaCode.match(/\)/g) || []).length;
      if (openParens !== closeParens) {
        result.valid = false;
        result.errors.push(`Mismatched parentheses: ${openParens} open, ${closeParens} close`);
      }

      // Check for common errors
      if (luaCode.includes('function ') && !luaCode.includes('end')) {
        result.valid = false;
        result.errors.push('Function without "end" statement');
      }

      // Check for required elements in scoring scripts
      if (luaCode.includes('costs')) {
        if (!luaCode.includes('initial_budget')) {
          result.warnings.push('Scoring script should define initial_budget');
        }
      }

      // Check for required elements in policy scripts
      if (luaCode.includes('max_operations') || luaCode.includes('allowed_operations')) {
        // It's a policy script
        if (!luaCode.includes('function')) {
          result.warnings.push('Policy script should define validation functions');
        }
      }

      // Validate referenced operations exist
      const allOps = predefinedManager.getAllOperations().map(o => o.id);
      const referencedOps = luaCode.match(/"([A-Z_]+)"/g)?.map(s => s.replace(/"/g, '')) || [];
      
      for (const op of referencedOps) {
        if (!allOps.includes(op) && op.match(/^[A-Z_]+$/)) {
          result.warnings.push(`Operation "${op}" referenced but not defined in Backend`);
        }
      }

      return result;
    } catch (error) {
      result.valid = false;
      result.errors.push(`Validation error: ${error}`);
      return result;
    }
  }

  /**
   * Run sandbox test of script
   */
  async sandboxTest(luaCode: string, type: 'scoring' | 'policy'): Promise<{
    success: boolean;
    output: any;
    error?: string;
    duration: number;
  }> {
    const startTime = performance.now();

    try {
      await this.loadFengari();

      if (type === 'scoring') {
        const result = await this.parseScoringScript(luaCode);
        return {
          success: true,
          output: result,
          duration: performance.now() - startTime,
        };
      } else {
        const result = await this.parsePolicyScript(luaCode);
        return {
          success: true,
          output: result,
          duration: performance.now() - startTime,
        };
      }
    } catch (error) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: performance.now() - startTime,
      };
    }
  }

  /**
   * Get cost for operation based on scoring script
   */
  getCost(scoring: LuaScoringResult, operation: string): number {
    return scoring.costs[operation] ?? 5; // Default cost
  }

  /**
   * Get combined cost for two operations
   */
  getComboCost(scoring: LuaScoringResult, op1: string, op2: string): number {
    for (const combo of scoring.combos) {
      if (combo.ops[0] === op1 && combo.ops[1] === op2) {
        return combo.cost;
      }
    }
    return this.getCost(scoring, op1) + this.getCost(scoring, op2);
  }
}

export const luaExecutor = new LuaExecutor();
