/**
 * C++ Executor - Local execution support with WASM fallback
 */

interface CppValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  hasExecuteFunction: boolean;
  includes: string[];
}

interface CppExecutionResult {
  success: boolean;
  output: any;
  logs: string[];
  error?: string;
  duration: number;
  executionMode: 'local' | 'wasm' | 'simulated';
}

interface CppContext {
  bits: string;
  budget: number;
  operations: string[];
  metrics: string[];
}

class CppExecutor {
  private wasmModule: any = null;
  private isWasmLoaded = false;
  private localServerUrl: string | null = null;
  
  /**
   * Check if local C++ execution server is available
   */
  async checkLocalServer(url: string = 'http://localhost:8080'): Promise<boolean> {
    try {
      const response = await fetch(`${url}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });
      if (response.ok) {
        this.localServerUrl = url;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Validate C++ syntax and structure
   */
  async validateSyntax(cppCode: string): Promise<CppValidationResult> {
    const result: CppValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      hasExecuteFunction: false,
      includes: [],
    };

    try {
      // Extract includes
      const includeMatches = cppCode.matchAll(/#include\s*[<"]([^>"]+)[>"]/g);
      for (const match of includeMatches) {
        result.includes.push(match[1]);
      }

      // Check for bitwise_api.h
      if (!result.includes.includes('bitwise_api.h')) {
        result.warnings.push('Consider including "bitwise_api.h" for API access');
      }

      // Check for execute function
      result.hasExecuteFunction = /void\s+execute\s*\(\s*\)/.test(cppCode);
      if (!result.hasExecuteFunction) {
        result.warnings.push('Strategy should define void execute() function');
      }

      // Basic syntax checks
      const openBraces = (cppCode.match(/\{/g) || []).length;
      const closeBraces = (cppCode.match(/\}/g) || []).length;
      if (openBraces !== closeBraces) {
        result.valid = false;
        result.errors.push(`Mismatched braces: ${openBraces} open, ${closeBraces} close`);
      }

      const openParens = (cppCode.match(/\(/g) || []).length;
      const closeParens = (cppCode.match(/\)/g) || []).length;
      if (openParens !== closeParens) {
        result.valid = false;
        result.errors.push(`Mismatched parentheses: ${openParens} open, ${closeParens} close`);
      }

      // Check for common C++ issues
      if (cppCode.includes('using namespace std;')) {
        result.warnings.push('Using "namespace std" is discouraged in headers');
      }

      // Check for dangerous operations
      if (cppCode.includes('system(') || cppCode.includes('exec(')) {
        result.valid = false;
        result.errors.push('System calls are not allowed for security reasons');
      }

      if (cppCode.includes('fopen') || cppCode.includes('ifstream') || cppCode.includes('ofstream')) {
        result.warnings.push('File I/O is restricted in sandbox mode');
      }

      // Check statement termination
      const lines = cppCode.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line && !line.startsWith('//') && !line.startsWith('#') && !line.startsWith('/*') 
            && !line.endsWith('{') && !line.endsWith('}') && !line.endsWith(',')
            && !line.endsWith(':') && !line.includes('//') && line.length > 3) {
          if (!line.endsWith(';') && !line.endsWith(')') && !line.match(/^\s*\w+\s*$/)) {
            // Could be missing semicolon - just a warning
          }
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
   * Execute C++ code via local server
   */
  async executeLocal(cppCode: string, context: CppContext): Promise<CppExecutionResult> {
    const startTime = performance.now();

    if (!this.localServerUrl) {
      return {
        success: false,
        output: null,
        logs: [],
        error: 'Local server not available',
        duration: performance.now() - startTime,
        executionMode: 'local',
      };
    }

    try {
      const response = await fetch(`${this.localServerUrl}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: cppCode,
          context: {
            bits: context.bits,
            budget: context.budget,
            operations: context.operations,
            metrics: context.metrics,
          },
        }),
      });

      const result = await response.json();

      return {
        success: result.success,
        output: result.output,
        logs: result.logs || [],
        error: result.error,
        duration: performance.now() - startTime,
        executionMode: 'local',
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        logs: [],
        error: error instanceof Error ? error.message : 'Local execution failed',
        duration: performance.now() - startTime,
        executionMode: 'local',
      };
    }
  }

  /**
   * Run sandbox test (simulated for now, WASM in future)
   */
  async sandboxTest(cppCode: string, context: CppContext): Promise<CppExecutionResult> {
    const startTime = performance.now();
    const logs: string[] = [];

    // First try local server
    const hasLocal = await this.checkLocalServer();
    if (hasLocal) {
      return this.executeLocal(cppCode, context);
    }

    // Fallback to simulation
    try {
      logs.push('Running in simulated mode (no local C++ server detected)');
      logs.push('To run real C++, start a local server at http://localhost:8080');

      // Simulate execution by parsing and validating
      const validation = await this.validateSyntax(cppCode);
      if (!validation.valid) {
        return {
          success: false,
          output: null,
          logs,
          error: validation.errors.join('; '),
          duration: performance.now() - startTime,
          executionMode: 'simulated',
        };
      }

      // Simulate some operations
      const operations = cppCode.match(/apply_operation\s*\(\s*"([^"]+)"/g) || [];
      for (const op of operations) {
        const opName = op.match(/"([^"]+)"/)?.[1];
        if (opName) {
          logs.push(`[SIMULATED] Would apply operation: ${opName}`);
        }
      }

      logs.push(`[SIMULATED] Execution completed with ${operations.length} operations detected`);

      return {
        success: true,
        output: {
          simulated: true,
          operationsDetected: operations.length,
          validation,
        },
        logs,
        duration: performance.now() - startTime,
        executionMode: 'simulated',
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        logs,
        error: error instanceof Error ? error.message : 'Sandbox test failed',
        duration: performance.now() - startTime,
        executionMode: 'simulated',
      };
    }
  }

  /**
   * Generate C++ API header content
   */
  generateApiHeader(): string {
    return `// bitwise_api.h - API for bitwise strategy algorithms
#pragma once
#include <string>
#include <map>
#include <vector>

// Global variables
extern std::string bits;
extern int bits_length;
extern double budget;
extern double initial_budget;
extern int step_count;

// Core functions
std::string apply_operation(const std::string& op_name, const std::map<std::string, std::string>& params = {});
double get_cost(const std::string& op_name);
double get_combo_cost(const std::string& op1, const std::string& op2);
double get_metric(const std::string& metric_name);
bool is_operation_allowed(const std::string& op_name);
bool deduct_budget(double amount);
void log(const std::string& message);
void halt();

// Main entry point - implement this in your strategy
void execute();
`;
  }
}

export const cppExecutor = new CppExecutor();
