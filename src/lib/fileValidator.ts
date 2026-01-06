/**
 * File Validator - Validates strategy, scoring, policy, and other files
 */

import { luaExecutor } from './luaExecutor';
import { pythonExecutor } from './pythonExecutor';
import { cppExecutor } from './cppExecutor';
import { predefinedManager } from './predefinedManager';

export interface ValidationResult {
  valid: boolean;
  fileType: 'strategy-cpp' | 'strategy-python' | 'scoring' | 'policy' | 'preset' | 'metrics' | 'operations' | 'unknown';
  errors: string[];
  warnings: string[];
  sandboxResult?: {
    success: boolean;
    output: any;
    duration: number;
    error?: string;
  };
  apiCompliance: {
    usedOperations: string[];
    unknownOperations: string[];
    usedMetrics: string[];
    unknownMetrics: string[];
  };
}

class FileValidator {
  /**
   * Detect file type from content and extension
   */
  detectFileType(filename: string, content: string): ValidationResult['fileType'] {
    const ext = filename.split('.').pop()?.toLowerCase();

    if (ext === 'cpp' || ext === 'c' || ext === 'h') {
      return 'strategy-cpp';
    }
    if (ext === 'py') {
      return 'strategy-python';
    }
    if (ext === 'lua') {
      // Determine if scoring or policy
      if (content.includes('costs') && content.includes('initial_budget')) {
        return 'scoring';
      }
      if (content.includes('max_operations') || content.includes('forbidden') || content.includes('allowed_operations')) {
        return 'policy';
      }
      return 'scoring'; // Default Lua to scoring
    }
    if (ext === 'json') {
      try {
        const parsed = JSON.parse(content);
        if (parsed.strategy || parsed.scoring || parsed.policies) {
          return 'preset';
        }
        if (parsed.metrics && Array.isArray(parsed.metrics)) {
          return 'metrics';
        }
        if (parsed.operations && Array.isArray(parsed.operations)) {
          return 'operations';
        }
      } catch {
        return 'unknown';
      }
    }
    return 'unknown';
  }

  /**
   * Check API compliance - verify operations and metrics exist
   */
  checkApiCompliance(content: string): ValidationResult['apiCompliance'] {
    const allOps = new Set(predefinedManager.getAllOperations().map(o => o.id));
    const allMetrics = new Set(predefinedManager.getAllMetrics().map(m => m.id));

    // Extract operation references
    const usedOperations: string[] = [];
    const unknownOperations: string[] = [];
    
    const opMatches = content.matchAll(/["']([A-Z_]+)["']/g);
    for (const match of opMatches) {
      const op = match[1];
      if (op.length >= 2 && op.length <= 10) { // Reasonable op name length
        if (!usedOperations.includes(op)) {
          usedOperations.push(op);
          if (!allOps.has(op)) {
            unknownOperations.push(op);
          }
        }
      }
    }

    // Extract metric references
    const usedMetrics: string[] = [];
    const unknownMetrics: string[] = [];
    
    const metricMatches = content.matchAll(/get_metric\s*\(\s*["']([^"']+)["']/g);
    for (const match of metricMatches) {
      const metric = match[1];
      if (!usedMetrics.includes(metric)) {
        usedMetrics.push(metric);
        if (!allMetrics.has(metric)) {
          unknownMetrics.push(metric);
        }
      }
    }

    return { usedOperations, unknownOperations, usedMetrics, unknownMetrics };
  }

  /**
   * Validate JSON file structure
   */
  validateJson(content: string, type: 'preset' | 'metrics' | 'operations'): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const parsed = JSON.parse(content);

      if (type === 'preset') {
        if (!parsed.name) {
          errors.push('Preset must have a "name" field');
        }
        if (!parsed.strategy && !parsed.scoring) {
          warnings.push('Preset should reference at least a strategy or scoring file');
        }
      } else if (type === 'metrics') {
        if (!parsed.metrics || !Array.isArray(parsed.metrics)) {
          errors.push('Metrics file must have a "metrics" array');
        } else {
          parsed.metrics.forEach((m: any, i: number) => {
            if (!m.id) errors.push(`Metric ${i} missing "id"`);
            if (!m.name) errors.push(`Metric ${i} missing "name"`);
            if (!m.formula) warnings.push(`Metric ${i} missing "formula"`);
          });
        }
      } else if (type === 'operations') {
        if (!parsed.operations || !Array.isArray(parsed.operations)) {
          errors.push('Operations file must have an "operations" array');
        } else {
          parsed.operations.forEach((o: any, i: number) => {
            if (!o.id) errors.push(`Operation ${i} missing "id"`);
            if (!o.name) errors.push(`Operation ${i} missing "name"`);
          });
        }
      }

      return { valid: errors.length === 0, errors, warnings };
    } catch (e) {
      return { valid: false, errors: ['Invalid JSON: ' + e], warnings };
    }
  }

  /**
   * Full validation with sandbox testing
   */
  async validateFile(filename: string, content: string, runSandbox: boolean = true): Promise<ValidationResult> {
    const fileType = this.detectFileType(filename, content);
    const apiCompliance = this.checkApiCompliance(content);
    
    const result: ValidationResult = {
      valid: true,
      fileType,
      errors: [],
      warnings: [],
      apiCompliance,
    };

    // Add warnings for unknown operations/metrics
    if (apiCompliance.unknownOperations.length > 0) {
      result.warnings.push(`Unknown operations: ${apiCompliance.unknownOperations.join(', ')}`);
    }
    if (apiCompliance.unknownMetrics.length > 0) {
      result.warnings.push(`Unknown metrics: ${apiCompliance.unknownMetrics.join(', ')}`);
    }

    // Type-specific validation
    switch (fileType) {
      case 'strategy-cpp':
        const cppResult = await cppExecutor.validateSyntax(content);
        result.valid = cppResult.valid;
        result.errors.push(...cppResult.errors);
        result.warnings.push(...cppResult.warnings);
        
        if (runSandbox) {
          const sandboxResult = await cppExecutor.sandboxTest(content, {
            bits: '10101010',
            budget: 1000,
            operations: apiCompliance.usedOperations.filter(o => !apiCompliance.unknownOperations.includes(o)),
            metrics: apiCompliance.usedMetrics.filter(m => !apiCompliance.unknownMetrics.includes(m)),
          });
          result.sandboxResult = sandboxResult;
        }
        break;

      case 'strategy-python':
        const pyResult = await pythonExecutor.validateSyntax(content);
        result.valid = pyResult.valid;
        result.errors.push(...pyResult.errors);
        result.warnings.push(...pyResult.warnings);
        
        if (runSandbox && pythonExecutor.isReady()) {
          const sandboxResult = await pythonExecutor.sandboxTest(content, {
            bits: '10101010',
            budget: 1000,
            operations: apiCompliance.usedOperations.filter(o => !apiCompliance.unknownOperations.includes(o)),
            metrics: {},
          });
          result.sandboxResult = sandboxResult;
        }
        break;

      case 'scoring':
      case 'policy':
        const luaResult = await luaExecutor.validateSyntax(content);
        result.valid = luaResult.valid;
        result.errors.push(...luaResult.errors);
        result.warnings.push(...luaResult.warnings);
        
        if (runSandbox) {
          const sandboxResult = await luaExecutor.sandboxTest(content, fileType === 'scoring' ? 'scoring' : 'policy');
          result.sandboxResult = sandboxResult;
        }
        break;

      case 'preset':
      case 'metrics':
      case 'operations':
        const jsonResult = this.validateJson(content, fileType);
        result.valid = jsonResult.valid;
        result.errors.push(...jsonResult.errors);
        result.warnings.push(...jsonResult.warnings);
        
        if (runSandbox) {
          try {
            JSON.parse(content);
            result.sandboxResult = {
              success: true,
              output: JSON.parse(content),
              duration: 0,
            };
          } catch (e) {
            result.sandboxResult = {
              success: false,
              output: null,
              duration: 0,
              error: String(e),
            };
          }
        }
        break;

      default:
        result.warnings.push('Unknown file type - limited validation available');
    }

    return result;
  }
}

export const fileValidator = new FileValidator();
