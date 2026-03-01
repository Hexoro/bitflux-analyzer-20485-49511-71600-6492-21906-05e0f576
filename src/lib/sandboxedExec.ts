/**
 * Sandboxed Code Execution Utility
 * 
 * Validates user-supplied code for dangerous patterns before executing
 * via new Function(). Blocks access to globals like fetch, localStorage,
 * document, window, etc.
 */

const BLOCKED_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bfetch\s*\(/, label: 'fetch()' },
  { pattern: /\bXMLHttpRequest\b/, label: 'XMLHttpRequest' },
  { pattern: /\blocalStorage\b/, label: 'localStorage' },
  { pattern: /\bsessionStorage\b/, label: 'sessionStorage' },
  { pattern: /\bdocument\b/, label: 'document' },
  { pattern: /\bwindow\b/, label: 'window' },
  { pattern: /\bglobalThis\b/, label: 'globalThis' },
  { pattern: /\bimport\s*\(/, label: 'dynamic import' },
  { pattern: /\beval\s*\(/, label: 'eval()' },
  { pattern: /\bFunction\s*\(/, label: 'Function()' },
  { pattern: /\bsetTimeout\s*\(\s*['"`]/, label: 'setTimeout with string' },
  { pattern: /\bsetInterval\s*\(\s*['"`]/, label: 'setInterval with string' },
  { pattern: /\bnavigator\b/, label: 'navigator' },
  { pattern: /\blocation\b/, label: 'location' },
  { pattern: /\bparent\b/, label: 'parent frame' },
  { pattern: /\btop\b(?!\s*[.=])/, label: 'top frame' },
  { pattern: /\bself\b/, label: 'self' },
  { pattern: /\bframes\b/, label: 'frames' },
  { pattern: /\bcookies?\b/, label: 'cookies' },
  { pattern: /\bWebSocket\b/, label: 'WebSocket' },
  { pattern: /\bWorker\s*\(/, label: 'Worker' },
  { pattern: /\bSharedWorker\b/, label: 'SharedWorker' },
  { pattern: /\bServiceWorker\b/, label: 'ServiceWorker' },
  { pattern: /\bIndexedDB\b/i, label: 'IndexedDB' },
  { pattern: /\bopenDatabase\b/, label: 'openDatabase' },
  { pattern: /\bpostMessage\b/, label: 'postMessage' },
];

/**
 * Strips comments from code to prevent bypassing via comment tricks.
 * Handles single-line (//) and multi-line comments.
 */
function stripComments(code: string): string {
  return code
    .replace(/\/\/.*$/gm, '')      // single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, ''); // multi-line comments
}

export interface ValidationResult {
  safe: boolean;
  violations: string[];
}

/**
 * Validates user code for dangerous patterns.
 * Returns violations list (empty = safe).
 */
export function validateCode(code: string): ValidationResult {
  const stripped = stripComments(code);
  const violations: string[] = [];

  for (const { pattern, label } of BLOCKED_PATTERNS) {
    if (pattern.test(stripped)) {
      violations.push(label);
    }
  }

  return { safe: violations.length === 0, violations };
}

/**
 * Safely creates and executes a function from user code.
 * Validates for dangerous patterns first, then executes with
 * shadowed globals to prevent accidental access.
 * 
 * @param paramNames - parameter names for the function
 * @param body - the function body code
 * @param args - arguments to pass to the function
 * @returns the function result
 * @throws Error if code contains dangerous patterns or execution fails
 */
export function safeExecute<T = unknown>(
  paramNames: string[],
  body: string,
  args: unknown[]
): T {
  const validation = validateCode(body);
  if (!validation.safe) {
    throw new Error(
      `Code blocked: uses restricted APIs (${validation.violations.join(', ')}). ` +
      `Remove references to browser/network APIs for safe execution.`
    );
  }

  // Shadow dangerous globals by declaring them as undefined parameters
  const shadowedGlobals = [
    'window', 'document', 'globalThis', 'fetch', 'XMLHttpRequest',
    'localStorage', 'sessionStorage', 'navigator', 'location',
    'eval', 'Function', 'WebSocket', 'Worker', 'importScripts',
    'postMessage', 'parent', 'top', 'self', 'frames', 'opener',
  ];

  const wrappedBody = `"use strict";\n${body}`;
  const allParams = [...paramNames, ...shadowedGlobals];
  
  // Create the function - globals are shadowed as undefined params
  const fn = new Function(...allParams, wrappedBody);
  
  // Only pass real args; shadowed globals get undefined
  const allArgs = [...args, ...new Array(shadowedGlobals.length).fill(undefined)];
  
  return fn(...allArgs) as T;
}

/**
 * Validates code syntax only (no execution).
 * Returns true if code parses correctly.
 */
export function validateSyntax(paramNames: string[], body: string): { valid: boolean; error?: string } {
  try {
    new Function(...paramNames, `"use strict";\n${body}`);
    return { valid: true };
  } catch (e) {
    return { valid: false, error: (e as Error).message };
  }
}
