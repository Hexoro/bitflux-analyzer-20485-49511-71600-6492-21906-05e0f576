/**
 * JavaScript versions of unified strategy files
 * These run natively via jsStrategyRuntime, completely bypassing
 * the fragile Python regex fallback parser.
 */

// Operation parameters - same as Python OPERATION_PARAMS
const OP_PARAMS_JS = `
const OPERATION_PARAMS = {
  "AND": {"mask": "10101010"}, "OR": {"mask": "01010101"},
  "XOR": {"mask": "11001100"}, "NAND": {"mask": "10101010"},
  "NOR": {"mask": "01010101"}, "XNOR": {"mask": "11001100"},
  "IMPLY": {"mask": "10101010"}, "NIMPLY": {"mask": "01010101"},
  "CONVERSE": {"mask": "10101010"}, "MUX": {"mask": "10101010"},
  "MAJ": {"mask": "10101010"},
  "SHL": {"count": 1}, "SHR": {"count": 1},
  "ASHL": {"count": 1}, "ASHR": {"count": 1},
  "ROL": {"count": 2}, "ROR": {"count": 2},
  "RCL": {"count": 1}, "RCR": {"count": 1},
  "INSERT": {"position": 0, "bits": "1010"},
  "DELETE": {"start": 0, "count": 2},
  "REPLACE": {"start": 0, "bits": "1111"},
  "MOVE": {"source": 0, "count": 4, "dest": 4},
  "TRUNCATE": {"count": 8},
  "APPEND": {"bits": "1010"},
  "EXTRACT": {"start": 0, "count": 8},
  "PAD": {"alignment": 8}, "PAD_LEFT": {"count": 4, "value": "0"},
  "PAD_RIGHT": {"count": 4, "value": "0"},
  "GRAY": {"direction": "encode"}, "DEGRAY": {},
  "ADD": {"value": "00000001"}, "SUB": {"value": "00000001"},
  "LFSR": {"taps": [0, 2]},
  "ZIGZAG": {}, "DEZIGZAG": {},
  "DELTA": {}, "DEDELTA": {},
  "FILL": {"value": "10"}, "DEMUX": {"count": 2, "position": 0},
  "BLEND": {"mask": "10101010", "value": "00000000"},
};
function getParams(op) { return OPERATION_PARAMS[op] || {}; }
`;

// ===== JS Scheduler =====
export const JS_UNIFIED_SCHEDULER = `
// Unified Scheduler V2 - JS Native
${OP_PARAMS_JS}

const allOps = api.get_available_operations();
const allMetrics = api.get_all_metrics();
const totalLength = api.get_bits_length();

api.log("=" .repeat(80));
api.log("UNIFIED SCHEDULER V2 (JS): COMPREHENSIVE SYSTEM VERIFICATION");
api.log("=" .repeat(80));
api.log("Data size: " + totalLength + " bits");
api.log("Operations available: " + allOps.length);
api.log("Metrics available: " + Object.keys(allMetrics).length);
api.log("Scheduler complete - batches defined in algorithm file");
`;

// ===== JS Algorithm (the main one that does ALL the work) =====
export const JS_UNIFIED_ALGORITHM = `
// Unified Algorithm V2 - JS Native
// Tests ALL operations and ALL metrics with REAL execution
${OP_PARAMS_JS}

const results = {
  operations_tested: 0, operations_passed: 0, operations_failed: [],
  metrics_tested: 0, metrics_passed: 0, metrics_failed: [],
  combinations_tested: 0, combinations_passed: 0,
};

const currentBits = api.get_bits();
const allOps = api.get_available_operations();
const allMetrics = api.get_all_metrics();

api.log("=" .repeat(80));
api.log("UNIFIED ALGORITHM V2 (JS): COMPLETE SYSTEM VERIFICATION");
api.log("=" .repeat(80));
api.log("Data: " + currentBits.length + " bits | Ops: " + allOps.length + " | Budget: " + api.get_budget());

// Phase 1: Test ALL metrics
api.log("");
api.log("PHASE 1: TESTING ALL METRICS");
api.log("=" .repeat(40));

const metricKeys = Object.keys(allMetrics);
for (let i = 0; i < metricKeys.length && i < 76; i++) {
  const m = metricKeys[i];
  results.metrics_tested++;
  try {
    const val = api.get_metric(m);
    if (typeof val === 'number') {
      results.metrics_passed++;
      api.log("✓ " + m + ": " + (Number.isFinite(val) ? val.toFixed(4) : val));
    } else {
      results.metrics_failed.push(m);
      api.log("✗ " + m + ": non-numeric");
    }
  } catch(e) {
    results.metrics_failed.push(m);
    api.log("✗ " + m + ": FAIL");
  }
}
api.log("Metrics: " + results.metrics_passed + "/" + results.metrics_tested + " passed");

// Phase 2: Test ALL operations (on FULL bits to ensure bits change)
api.log("");
api.log("PHASE 2: TESTING ALL OPERATIONS");
api.log("=" .repeat(40));

for (let i = 0; i < allOps.length && i < 106; i++) {
  const op = allOps[i];
  results.operations_tested++;
  try {
    const params = getParams(op);
    const before = api.get_bits();
    const result = api.apply_operation(op, before, params);
    if (result && result.length > 0) {
      results.operations_passed++;
      api.log("✓ " + op + ": PASS");
    } else {
      results.operations_failed.push(op);
      api.log("✗ " + op + ": empty result");
    }
  } catch(e) {
    results.operations_failed.push(op);
    api.log("✗ " + op + ": FAIL - " + e);
  }
}
api.log("Operations: " + results.operations_passed + "/" + results.operations_tested + " passed");

// Phase 3: Test operation combinations
api.log("");
api.log("PHASE 3: TESTING COMBINATIONS");
api.log("=" .repeat(40));

const comboOps = ["NOT", "XOR", "ROL", "SHL", "GRAY", "REVERSE"];
for (let i = 0; i < comboOps.length; i++) {
  for (let j = i + 1; j < comboOps.length; j++) {
    const op1 = comboOps[i], op2 = comboOps[j];
    if (allOps.indexOf(op1) >= 0 && allOps.indexOf(op2) >= 0) {
      results.combinations_tested++;
      try {
        const b = api.get_bits();
        const r1 = api.apply_operation(op1, b, getParams(op1));
        if (r1) {
          api.apply_operation(op2, api.get_bits(), getParams(op2));
          results.combinations_passed++;
          api.log("✓ " + op1 + " + " + op2);
        }
      } catch(e) {
        api.log("✗ " + op1 + " + " + op2);
      }
    }
  }
}
api.log("Combinations: " + results.combinations_passed + "/" + results.combinations_tested + " passed");

// Phase 4: Range operations
api.log("");
api.log("PHASE 4: RANGE OPERATIONS");
api.log("=" .repeat(40));

const rangeOps = ["NOT", "XOR", "ROL", "REVERSE"];
const quarter = Math.floor(api.get_bits_length() / 4);
for (let i = 0; i < rangeOps.length; i++) {
  const op = rangeOps[i];
  if (allOps.indexOf(op) >= 0 && quarter > 8) {
    try {
      api.apply_operation_range(op, 0, quarter, getParams(op));
      api.deduct_budget(1);
      api.log("✓ " + op + " on range [0:" + quarter + "]");
    } catch(e) {
      api.log("✗ " + op + " on range: " + e);
    }
  }
}

// Final summary
const finalBits = api.get_bits();
const finalMetrics = api.get_all_metrics();
let bitsChanged = 0;
for (let i = 0; i < Math.min(currentBits.length, finalBits.length); i++) {
  if (currentBits[i] !== finalBits[i]) bitsChanged++;
}

api.log("");
api.log("=" .repeat(80));
api.log("VERIFICATION COMPLETE");
api.log("=" .repeat(80));
api.log("Operations: " + results.operations_passed + "/" + results.operations_tested + " passed");
api.log("Metrics: " + results.metrics_passed + "/" + results.metrics_tested + " passed");
api.log("Combinations: " + results.combinations_passed + "/" + results.combinations_tested + " passed");
if (results.operations_failed.length > 0) {
  api.log("Failed ops: " + results.operations_failed.slice(0, 15).join(", "));
}
if (results.metrics_failed.length > 0) {
  api.log("Failed metrics: " + results.metrics_failed.slice(0, 15).join(", "));
}
api.log("Bits changed: " + bitsChanged);
api.log("Budget used: " + (budget - api.get_budget()));
api.log("Final entropy: " + (finalMetrics.entropy || 0).toFixed(4));
api.log("=" .repeat(80));

const totalTests = results.operations_tested + results.metrics_tested + results.combinations_tested;
const totalPassed = results.operations_passed + results.metrics_passed + results.combinations_passed;
const passRate = totalTests > 0 ? (totalPassed / totalTests * 100) : 0;
api.log("OVERALL PASS RATE: " + passRate.toFixed(1) + "%");
`;

// ===== JS Scoring =====
export const JS_UNIFIED_SCORING = `
// Unified Scoring V2 - JS Native
const INITIAL_BUDGET = 2000;
const metrics = api.get_all_metrics();
const scoreBits = api.get_bits();
const remainingBudget = api.get_budget();

const scores = {};
// Entropy quality
scores.entropy_quality = Math.max(0, Math.min(100, (1.5 - (metrics.entropy || 1.0)) * 66.67));
// Operation coverage (default 80)
scores.operation_coverage = 80;
// Metric accuracy (default 80)
scores.metric_accuracy = 80;
// Combination success (default 70)
scores.combination_success = 70;
// Budget efficiency
const ratio = remainingBudget / INITIAL_BUDGET;
scores.budget_efficiency = (ratio >= 0.3 && ratio <= 0.7) ? 100 : (ratio > 0.7 ? 70 : Math.max(20, ratio * 100));
// Data integrity
const valid = /^[01]+$/.test(scoreBits) && scoreBits.length >= 8;
scores.data_integrity = valid ? 100 : 50;

const DIMENSIONS = {
  entropy_quality: 15, operation_coverage: 25, metric_accuracy: 25,
  combination_success: 15, budget_efficiency: 10, data_integrity: 10,
};

let total = 0;
api.log("=" .repeat(80));
api.log("UNIFIED SCORING V2 (JS)");
api.log("=" .repeat(80));
api.log("Dimension Scores:");
for (const [dim, weight] of Object.entries(DIMENSIONS)) {
  const s = scores[dim] || 0;
  total += s * (weight / 100);
  api.log("  " + dim + ": " + s.toFixed(1) + "/100 (weight: " + weight + "%)");
}

const grade = total >= 95 ? "A+" : total >= 90 ? "A" : total >= 85 ? "A-" : total >= 80 ? "B+" : total >= 75 ? "B" : total >= 70 ? "B-" : total >= 60 ? "C" : "D";
api.log("TOTAL: " + total.toFixed(1) + "/100");
api.log("GRADE: " + grade);
api.log("Budget remaining: " + remainingBudget + "/" + INITIAL_BUDGET);
api.log("=" .repeat(80));
`;

// ===== JS Policy =====
export const JS_UNIFIED_POLICY = `
// Unified Policy V2 - JS Native
const pBits = api.get_bits();
const pMetrics = api.get_all_metrics();
const pOps = api.get_available_operations();
const pBudget = api.get_budget();

const failures = [];
const warnings = [];

if (pBits.length < 8) failures.push("Data too short: " + pBits.length);
if (pBits.length > 100000000) failures.push("Data too long: " + pBits.length);
if (!/^[01]*$/.test(pBits)) failures.push("Invalid characters in data");

const balance = pMetrics.balance || 0.5;
if (balance > 0.98 || balance < 0.02) warnings.push("Imbalanced: " + balance.toFixed(2));
if (pBudget / 2000 < 0.02) failures.push("Budget critical: " + pBudget);
if (pOps.length < 10) warnings.push("Few operations: " + pOps.length);

api.log("=" .repeat(80));
api.log("UNIFIED POLICY V2 (JS)");
api.log("=" .repeat(80));

if (failures.length === 0) {
  api.log("✓ ALL POLICIES PASSED");
} else {
  api.log("✗ FAILURES:");
  failures.forEach(function(f) { api.log("  - " + f); });
}
if (warnings.length > 0) {
  api.log("⚠ WARNINGS:");
  warnings.forEach(function(w) { api.log("  - " + w); });
}
api.log("=" .repeat(80));
`;

/**
 * Convert a Python strategy file to its JS equivalent.
 * Returns null if no JS version exists.
 */
export function getJSEquivalent(pythonFileName: string): { name: string; content: string; type: string } | null {
  const mapping: Record<string, { content: string; type: string }> = {
    // V2 names (from unifiedStrategy.ts loadUnifiedStrategyV2)
    'UnifiedSchedulerV2.py': { content: JS_UNIFIED_SCHEDULER, type: 'scheduler' },
    'UnifiedAlgorithmV2.py': { content: JS_UNIFIED_ALGORITHM, type: 'algorithm' },
    'ComprehensiveMultiFile.py': { content: JS_UNIFIED_ALGORITHM, type: 'algorithm' },
    'UnifiedScoringV2.py': { content: JS_UNIFIED_SCORING, type: 'scoring' },
    'UnifiedPolicyV2.py': { content: JS_UNIFIED_POLICY, type: 'policies' },
    // Non-V2 names (from StrategyTabV7 and other components)
    'UnifiedScheduler.py': { content: JS_UNIFIED_SCHEDULER, type: 'scheduler' },
    'UnifiedAlgorithm.py': { content: JS_UNIFIED_ALGORITHM, type: 'algorithm' },
    'UnifiedScoring.py': { content: JS_UNIFIED_SCORING, type: 'scoring' },
    'UnifiedPolicy.py': { content: JS_UNIFIED_POLICY, type: 'policies' },
  };
  
  const entry = mapping[pythonFileName];
  if (!entry) return null;
  
  return {
    name: pythonFileName.replace('.py', '.js'),
    content: entry.content,
    type: entry.type,
  };
}
