/**
 * Advanced Command Parser for Transformations Panel
 * Supports ranges, pipelines, loops, macros, and custom operations
 */

import { executeOperation, getAvailableOperations, OperationParams } from './operationsRouter';
import { calculateMetric, getAvailableMetrics } from './metricsCalculator';

export interface ParsedCommand {
  type: 'operation' | 'pipeline' | 'loop' | 'conditional' | 'macro_def' | 'macro_call' | 'exec' | 'custom' | 'help';
  operations?: SingleOperation[];
  condition?: Condition;
  loopCount?: number;
  macroName?: string;
  macroBody?: string;
  customCode?: string;
  customOpId?: string;
  customParams?: Record<string, any>;
  raw: string;
}

export interface SingleOperation {
  operationId: string;
  params: OperationParams;
  range?: { start: number; end: number };
}

export interface Condition {
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  value: number;
}

export interface CommandResult {
  success: boolean;
  bits: string;
  message?: string;
  error?: string;
  operationsExecuted: number;
}

// Stored macros
const macros: Map<string, ParsedCommand> = new Map();

/**
 * Parse a command string into a structured command
 */
export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim();
  const raw = trimmed;

  // Help command
  if (trimmed.toUpperCase() === 'HELP') {
    return { type: 'help', raw };
  }

  // Macro definition: DEFINE name = commands
  const macroMatch = trimmed.match(/^DEFINE\s+(\w+)\s*=\s*(.+)$/i);
  if (macroMatch) {
    return {
      type: 'macro_def',
      macroName: macroMatch[1],
      macroBody: macroMatch[2],
      raw,
    };
  }

  // Macro call: APPLY name
  const applyMatch = trimmed.match(/^APPLY\s+(\w+)$/i);
  if (applyMatch) {
    return {
      type: 'macro_call',
      macroName: applyMatch[1],
      raw,
    };
  }

  // Custom operation call: CUSTOM op_id { params }
  const customMatch = trimmed.match(/^CUSTOM\s+(\w+)\s*(\{.*\})?$/i);
  if (customMatch) {
    let params = {};
    if (customMatch[2]) {
      try {
        params = JSON.parse(customMatch[2].replace(/(\w+):/g, '"$1":'));
      } catch {
        params = {};
      }
    }
    return {
      type: 'custom',
      customOpId: customMatch[1],
      customParams: params,
      raw,
    };
  }

  // Inline execution: EXEC { code }
  const execMatch = trimmed.match(/^EXEC\s*\{(.+)\}$/is);
  if (execMatch) {
    return {
      type: 'exec',
      customCode: execMatch[1],
      raw,
    };
  }

  // Loop: REPEAT n { commands }
  const loopMatch = trimmed.match(/^REPEAT\s+(\d+)\s*\{(.+)\}$/is);
  if (loopMatch) {
    const innerCommands = parseOperationList(loopMatch[2]);
    return {
      type: 'loop',
      loopCount: parseInt(loopMatch[1]),
      operations: innerCommands,
      raw,
    };
  }

  // Conditional: IF metric op value THEN commands ELSE commands
  const condMatch = trimmed.match(/^IF\s+(\w+)\s*(>|<|>=|<=|==|!=)\s*([\d.]+)\s+THEN\s+(.+?)(?:\s+ELSE\s+(.+))?$/i);
  if (condMatch) {
    return {
      type: 'conditional',
      condition: {
        metric: condMatch[1],
        operator: condMatch[2] as Condition['operator'],
        value: parseFloat(condMatch[3]),
      },
      operations: parseOperationList(condMatch[4]),
      raw,
    };
  }

  // Pipeline: OP1 | OP2 | OP3
  if (trimmed.includes('|')) {
    const parts = trimmed.split('|').map(p => p.trim());
    const operations: SingleOperation[] = [];
    for (const part of parts) {
      const op = parseSingleOperation(part);
      if (op) operations.push(op);
    }
    return {
      type: 'pipeline',
      operations,
      raw,
    };
  }

  // Single operation
  const singleOp = parseSingleOperation(trimmed);
  if (singleOp) {
    return {
      type: 'operation',
      operations: [singleOp],
      raw,
    };
  }

  // Unknown
  return { type: 'operation', operations: [], raw };
}

/**
 * Parse a single operation string: OP [params] [range]
 */
function parseSingleOperation(input: string): SingleOperation | null {
  const parts = input.trim().split(/\s+/);
  if (parts.length === 0) return null;

  const operationId = parts[0].toUpperCase();
  const params: OperationParams = {};
  let range: { start: number; end: number } | undefined;

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];

    // Range syntax: [start:end]
    const rangeMatch = part.match(/^\[(\d+):(\d+)\]$/);
    if (rangeMatch) {
      range = { start: parseInt(rangeMatch[1]), end: parseInt(rangeMatch[2]) };
      continue;
    }

    // Binary pattern (mask/value)
    if (/^[01]+$/.test(part)) {
      params.mask = part;
      params.value = part;
      continue;
    }

    // Number (count)
    if (/^\d+$/.test(part)) {
      params.count = parseInt(part);
      continue;
    }

    // Direction (encode/decode)
    if (/^(encode|decode)$/i.test(part)) {
      params.direction = part.toLowerCase() as 'encode' | 'decode';
      continue;
    }
  }

  return { operationId, params, range };
}

/**
 * Parse a list of operations (from pipeline or loop body)
 */
function parseOperationList(input: string): SingleOperation[] {
  const ops: SingleOperation[] = [];
  const parts = input.split(/[|;]/).map(p => p.trim()).filter(p => p.length > 0);
  for (const part of parts) {
    const op = parseSingleOperation(part);
    if (op) ops.push(op);
  }
  return ops;
}

/**
 * Execute a parsed command on bits
 */
export function executeCommand(command: ParsedCommand, bits: string): CommandResult {
  let currentBits = bits;
  let operationsExecuted = 0;

  try {
    switch (command.type) {
      case 'help':
        return {
          success: true,
          bits: currentBits,
          message: getHelpText(),
          operationsExecuted: 0,
        };

      case 'macro_def':
        if (command.macroName && command.macroBody) {
          const parsedMacro = parseCommand(command.macroBody);
          macros.set(command.macroName.toLowerCase(), parsedMacro);
          return {
            success: true,
            bits: currentBits,
            message: `Macro '${command.macroName}' defined`,
            operationsExecuted: 0,
          };
        }
        break;

      case 'macro_call':
        if (command.macroName) {
          const macro = macros.get(command.macroName.toLowerCase());
          if (macro) {
            return executeCommand(macro, currentBits);
          }
          return {
            success: false,
            bits: currentBits,
            error: `Macro '${command.macroName}' not found`,
            operationsExecuted: 0,
          };
        }
        break;

      case 'exec':
        if (command.customCode) {
          try {
            const fn = new Function('bits', command.customCode);
            const result = fn(currentBits);
            if (typeof result === 'string' && /^[01]+$/.test(result)) {
              return {
                success: true,
                bits: result,
                message: 'Custom code executed',
                operationsExecuted: 1,
              };
            }
            return {
              success: false,
              bits: currentBits,
              error: 'Custom code must return a binary string',
              operationsExecuted: 0,
            };
          } catch (e) {
            return {
              success: false,
              bits: currentBits,
              error: `Code error: ${(e as Error).message}`,
              operationsExecuted: 0,
            };
          }
        }
        break;

      case 'custom':
        if (command.customOpId) {
          const result = executeOperation(command.customOpId, currentBits, command.customParams || {});
          if (result.success) {
            return {
              success: true,
              bits: result.bits,
              operationsExecuted: 1,
            };
          }
          return {
            success: false,
            bits: currentBits,
            error: result.error,
            operationsExecuted: 0,
          };
        }
        break;

      case 'loop':
        if (command.operations && command.loopCount) {
          for (let i = 0; i < command.loopCount; i++) {
            for (const op of command.operations) {
              const result = executeOperationWithRange(op, currentBits);
              if (result.success) {
                currentBits = result.bits;
                operationsExecuted++;
              } else {
                return {
                  success: false,
                  bits: currentBits,
                  error: result.error,
                  operationsExecuted,
                };
              }
            }
          }
          return {
            success: true,
            bits: currentBits,
            message: `Loop completed ${command.loopCount} iterations`,
            operationsExecuted,
          };
        }
        break;

      case 'conditional':
        if (command.condition && command.operations) {
          const metricResult = calculateMetric(command.condition.metric, currentBits);
          if (!metricResult.success) {
            return {
              success: false,
              bits: currentBits,
              error: `Failed to calculate metric: ${command.condition.metric}`,
              operationsExecuted: 0,
            };
          }

          const conditionMet = evaluateCondition(metricResult.value, command.condition);
          if (conditionMet) {
            for (const op of command.operations) {
              const result = executeOperationWithRange(op, currentBits);
              if (result.success) {
                currentBits = result.bits;
                operationsExecuted++;
              } else {
                return {
                  success: false,
                  bits: currentBits,
                  error: result.error,
                  operationsExecuted,
                };
              }
            }
          }
          return {
            success: true,
            bits: currentBits,
            message: conditionMet ? 'Condition met, operations executed' : 'Condition not met, skipped',
            operationsExecuted,
          };
        }
        break;

      case 'pipeline':
      case 'operation':
        if (command.operations) {
          for (const op of command.operations) {
            const result = executeOperationWithRange(op, currentBits);
            if (result.success) {
              currentBits = result.bits;
              operationsExecuted++;
            } else {
              return {
                success: false,
                bits: currentBits,
                error: result.error,
                operationsExecuted,
              };
            }
          }
          return {
            success: true,
            bits: currentBits,
            operationsExecuted,
          };
        }
        break;
    }

    return {
      success: false,
      bits: currentBits,
      error: 'Unknown command type',
      operationsExecuted: 0,
    };
  } catch (error) {
    return {
      success: false,
      bits: currentBits,
      error: `Execution error: ${(error as Error).message}`,
      operationsExecuted,
    };
  }
}

/**
 * Execute a single operation with optional range
 */
function executeOperationWithRange(op: SingleOperation, bits: string): { success: boolean; bits: string; error?: string } {
  if (op.range) {
    const before = bits.slice(0, op.range.start);
    const target = bits.slice(op.range.start, op.range.end);
    const after = bits.slice(op.range.end);
    
    const result = executeOperation(op.operationId, target, op.params);
    if (result.success) {
      return { success: true, bits: before + result.bits + after };
    }
    return { success: false, bits, error: result.error };
  }
  
  const result = executeOperation(op.operationId, bits, op.params);
  return { success: result.success, bits: result.bits, error: result.error };
}

/**
 * Evaluate a condition
 */
function evaluateCondition(value: number, condition: Condition): boolean {
  switch (condition.operator) {
    case '>': return value > condition.value;
    case '<': return value < condition.value;
    case '>=': return value >= condition.value;
    case '<=': return value <= condition.value;
    case '==': return Math.abs(value - condition.value) < 0.0001;
    case '!=': return Math.abs(value - condition.value) >= 0.0001;
    default: return false;
  }
}

/**
 * Get help text for commands
 */
function getHelpText(): string {
  const availableOps = getAvailableOperations();
  const availableMetrics = getAvailableMetrics();
  
  return `
═══════════════════════════════════════════════════════════════
                    COMMAND REFERENCE (${availableOps.length} Operations)
═══════════════════════════════════════════════════════════════

BASIC OPERATIONS:
  NOT                    - Invert all bits
  AND 10101010           - AND with mask
  XOR 11110000           - XOR with mask
  SHL 4                  - Shift left 4 bits
  ROL 2                  - Rotate left 2

RANGE SYNTAX:
  NOT [0:32]             - Apply NOT to bits 0-31
  XOR 1010 [64:128]      - XOR on range 64-127

PIPELINE SYNTAX:
  NOT | SHL 2 | XOR 1010 - Chain multiple operations

LOOP SYNTAX:
  REPEAT 4 { ROL 1 }     - Execute ROL 1 four times

CONDITIONAL SYNTAX:
  IF entropy > 0.5 THEN NOT ELSE XOR 11110000

MACROS:
  DEFINE scramble = NOT | SHUFFLE | XOR 10101010
  APPLY scramble

CUSTOM CODE:
  EXEC { return bits.split('').reverse().join(''); }
  CUSTOM MY_OP { count: 5 }

AVAILABLE OPERATIONS (${availableOps.length}):
  ${availableOps.slice(0, 40).join(', ')}${availableOps.length > 40 ? '...' : ''}

AVAILABLE METRICS (${availableMetrics.length}):
  ${availableMetrics.slice(0, 20).join(', ')}${availableMetrics.length > 20 ? '...' : ''}
═══════════════════════════════════════════════════════════════`;
}

/**
 * Get autocomplete suggestions for a partial command
 */
export function getAutocompleteSuggestions(partial: string): string[] {
  const upperPartial = partial.toUpperCase().trim();
  const suggestions: string[] = [];

  // Command keywords
  const keywords = ['DEFINE', 'APPLY', 'REPEAT', 'IF', 'THEN', 'ELSE', 'EXEC', 'CUSTOM', 'HELP'];
  suggestions.push(...keywords.filter(k => k.startsWith(upperPartial)));

  // Operations
  const ops = getAvailableOperations();
  suggestions.push(...ops.filter(op => op.startsWith(upperPartial)));

  // Metrics (for conditions)
  if (upperPartial.startsWith('IF ')) {
    const metrics = getAvailableMetrics();
    const metricPartial = upperPartial.slice(3);
    suggestions.push(...metrics.filter(m => m.toUpperCase().startsWith(metricPartial)).map(m => `IF ${m}`));
  }

  // Macro names
  for (const macroName of macros.keys()) {
    if (macroName.toUpperCase().startsWith(upperPartial) || `APPLY ${macroName}`.toUpperCase().startsWith(upperPartial)) {
      suggestions.push(`APPLY ${macroName}`);
    }
  }

  return [...new Set(suggestions)].slice(0, 20);
}

/**
 * Get stored macros
 */
export function getStoredMacros(): string[] {
  return Array.from(macros.keys());
}

/**
 * Clear all macros
 */
export function clearMacros(): void {
  macros.clear();
}
