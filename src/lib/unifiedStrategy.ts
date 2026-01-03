/**
 * Unified Comprehensive Strategy
 * Tests ALL operations, metrics, AI files, multiple scoring methods, 
 * policies, and algorithms in one unified execution
 * 
 * This file contains strategy components that:
 * 1. Dynamically test ALL 77+ metrics
 * 2. Dynamically test ALL 106+ operations
 * 3. Use AI analysis for pattern detection
 * 4. Apply multiple scoring dimensions
 * 5. Validate policies across all components
 */

import { pythonModuleSystem, PythonFile } from './pythonModuleSystem';

// ===== UNIFIED SCHEDULER =====
// Dynamically generates test batches for ALL available operations
export const UNIFIED_SCHEDULER = `"""
Unified Master Scheduler - Comprehensive System Test
Dynamically tests ALL operations and metrics in the system
"""

from bitwise_api import get_bits, log, get_all_metrics, get_available_operations

def schedule():
    """
    Generate comprehensive test batches that exercise EVERY operation.
    """
    bits = get_bits()
    total_length = len(bits)
    
    log("=" * 70)
    log("UNIFIED SCHEDULER: COMPREHENSIVE SYSTEM VERIFICATION")
    log("=" * 70)
    log(f"Total data size: {total_length} bits")
    
    # Get ALL available operations
    all_ops = get_available_operations()
    log(f"Total operations to test: {len(all_ops)}")
    
    # Get initial metrics
    metrics = get_all_metrics()
    log(f"Total metrics available: {len(metrics)}")
    log(f"Initial entropy: {metrics.get('entropy', 0):.4f}")
    
    # Define operation categories for organized testing
    op_categories = {
        "logic_gates": ["NOT", "AND", "OR", "XOR", "NAND", "NOR", "XNOR"],
        "shifts": ["SHL", "SHR", "ASHL", "ASHR"],
        "rotations": ["ROL", "ROR"],
        "bit_manipulation": ["INSERT", "DELETE", "REPLACE", "MOVE", "TRUNCATE", "APPEND"],
        "packing": ["PAD", "PAD_LEFT", "PAD_RIGHT"],
        "encoding": ["GRAY", "ENDIAN", "REVERSE"],
        "arithmetic": ["ADD", "SUB"],
        "advanced": ["SWAP"],
    }
    
    # Generate batches for each category
    batches = []
    batch_id = 0
    segment_size = min(32, total_length // 4) if total_length >= 32 else total_length
    
    for category, ops in op_categories.items():
        # Filter to only available operations
        available_ops = [op for op in ops if op in all_ops]
        if not available_ops:
            continue
            
        log(f"Category '{category}': {len(available_ops)} operations")
        
        # Create multiple test batches for each category
        for iteration in range(2):  # Test each category twice
            start = (batch_id * segment_size) % max(1, total_length - segment_size)
            end = min(start + segment_size, total_length)
            
            if end - start < 8:
                start = 0
                end = min(segment_size, total_length)
            
            batches.append({
                "batch_id": batch_id,
                "category": category,
                "phase": f"{category}_{iteration}",
                "start": start,
                "end": end,
                "operations": available_ops,
                "max_iterations": len(available_ops),
                "priority": 10 - list(op_categories.keys()).index(category),
            })
            batch_id += 1
    
    # Add a final batch to test any custom operations not in categories
    custom_ops = [op for op in all_ops if not any(op in ops for ops in op_categories.values())]
    if custom_ops:
        log(f"Custom operations to test: {len(custom_ops)}")
        batches.append({
            "batch_id": batch_id,
            "category": "custom",
            "phase": "custom_ops",
            "start": 0,
            "end": min(64, total_length),
            "operations": custom_ops,
            "max_iterations": len(custom_ops),
            "priority": 1,
        })
    
    log(f"\\nScheduled {len(batches)} batches to test {len(all_ops)} operations")
    log("=" * 70)
    
    return batches

# Execute scheduler
result = schedule()
log(f"Scheduler complete. Total batches: {len(result)}")
`;

// ===== UNIFIED ALGORITHM =====
// Tests every operation and metric, tracks successes and failures
export const UNIFIED_ALGORITHM = `"""
Unified Algorithm - Tests ALL operations and ALL metrics
Comprehensive verification of the entire system
"""

from bitwise_api import (
    get_bits, set_bits, apply_operation, apply_operation_range,
    get_metric, get_all_metrics, get_available_operations,
    deduct_budget, get_budget, log
)

# Track test results
test_results = {
    "operations_tested": 0,
    "operations_passed": 0,
    "operations_failed": [],
    "metrics_tested": 0,
    "metrics_passed": 0,
    "metrics_failed": [],
}

def test_single_operation(op_id, bits_segment, params=None):
    """Test a single operation and return success/failure"""
    params = params or {}
    
    try:
        # Use apply_operation for testing
        result = apply_operation(op_id, bits_segment, params)
        if result and len(result) > 0:
            return True, result[:16] + "..." if len(result) > 16 else result
        return False, "Empty result"
    except Exception as e:
        return False, str(e)

def test_single_metric(metric_id, bits):
    """Test a single metric calculation"""
    try:
        value = get_metric(metric_id, bits)
        if isinstance(value, (int, float)):
            return True, value
        return False, "Non-numeric result"
    except Exception as e:
        return False, str(e)

def get_params_for_operation(op_id):
    """Get appropriate test parameters for each operation type"""
    # Logic gates need masks
    if op_id in ["AND", "OR", "XOR", "NAND", "NOR", "XNOR"]:
        return {"mask": "10101010"}
    
    # Shifts and rotations need count
    if op_id in ["SHL", "SHR", "ASHL", "ASHR", "ROL", "ROR"]:
        return {"count": 2}
    
    # Gray encoding needs direction
    if op_id == "GRAY":
        return {"direction": "encode"}
    
    # Arithmetic needs value
    if op_id in ["ADD", "SUB"]:
        return {"value": "00000001"}
    
    # Padding needs alignment
    if op_id in ["PAD", "PAD_LEFT", "PAD_RIGHT"]:
        return {"alignment": 8, "value": "0", "count": 16}
    
    # Bit manipulation
    if op_id == "INSERT":
        return {"position": 0, "bits": "1010"}
    if op_id == "DELETE":
        return {"start": 0, "count": 2}
    if op_id == "REPLACE":
        return {"start": 0, "bits": "1010"}
    if op_id == "MOVE":
        return {"source": 0, "count": 4, "dest": 4}
    if op_id == "TRUNCATE":
        return {"count": 8}
    if op_id == "APPEND":
        return {"bits": "1010"}
    
    return {}

def verify_all_operations():
    """Test every available operation"""
    global test_results
    
    all_ops = get_available_operations()
    bits = get_bits()
    test_segment = bits[:min(64, len(bits))]
    
    log("\\n" + "=" * 70)
    log("TESTING ALL OPERATIONS")
    log("=" * 70)
    
    for op_id in all_ops:
        params = get_params_for_operation(op_id)
        success, result = test_single_operation(op_id, test_segment, params)
        
        test_results["operations_tested"] += 1
        if success:
            test_results["operations_passed"] += 1
            log(f"✓ {op_id}: PASS - {result}")
        else:
            test_results["operations_failed"].append(op_id)
            log(f"✗ {op_id}: FAIL - {result}")
    
    log(f"\\nOperations: {test_results['operations_passed']}/{test_results['operations_tested']} passed")

def verify_all_metrics():
    """Test every available metric"""
    global test_results
    
    metrics = get_all_metrics()
    bits = get_bits()
    
    log("\\n" + "=" * 70)
    log("TESTING ALL METRICS")
    log("=" * 70)
    
    for metric_id in metrics.keys():
        success, result = test_single_metric(metric_id, bits)
        
        test_results["metrics_tested"] += 1
        if success:
            test_results["metrics_passed"] += 1
            val = f"{result:.4f}" if isinstance(result, float) else str(result)
            log(f"✓ {metric_id}: {val}")
        else:
            test_results["metrics_failed"].append(metric_id)
            log(f"✗ {metric_id}: FAIL - {result}")
    
    log(f"\\nMetrics: {test_results['metrics_passed']}/{test_results['metrics_tested']} passed")

def execute_range_operations():
    """Test operations on specific ranges to verify range handling"""
    bits = get_bits()
    ops_to_test = ["NOT", "XOR", "ROL", "REVERSE"]
    
    log("\\n" + "=" * 70)
    log("TESTING RANGE OPERATIONS")
    log("=" * 70)
    
    for op in ops_to_test:
        try:
            # Test on first quarter
            quarter = len(bits) // 4
            if quarter > 8:
                params = get_params_for_operation(op)
                apply_operation_range(op, 0, quarter, params)
                log(f"✓ {op} on range [0:{quarter}]: PASS")
                
                # Deduct budget for the operation
                deduct_budget(1)
        except Exception as e:
            log(f"✗ {op} on range: FAIL - {str(e)}")

def execute():
    """Main unified algorithm execution"""
    global test_results
    
    log("=" * 70)
    log("UNIFIED ALGORITHM: COMPREHENSIVE SYSTEM VERIFICATION")
    log("=" * 70)
    
    bits = get_bits()
    initial_metrics = get_all_metrics()
    initial_budget = get_budget()
    
    log(f"Data size: {len(bits)} bits")
    log(f"Available budget: {initial_budget}")
    log(f"Initial entropy: {initial_metrics.get('entropy', 0):.4f}")
    log(f"Initial balance: {initial_metrics.get('balance', 0):.4f}")
    
    # Phase 1: Verify all metrics work
    verify_all_metrics()
    
    # Phase 2: Verify all operations work
    verify_all_operations()
    
    # Phase 3: Test range operations
    execute_range_operations()
    
    # Final summary
    final_bits = get_bits()
    final_metrics = get_all_metrics()
    bits_changed = sum(1 for a, b in zip(bits, final_bits) if a != b)
    
    log("")
    log("=" * 70)
    log("UNIFIED ALGORITHM: VERIFICATION COMPLETE")
    log("=" * 70)
    log(f"Operations: {test_results['operations_passed']}/{test_results['operations_tested']} passed")
    log(f"Metrics: {test_results['metrics_passed']}/{test_results['metrics_tested']} passed")
    if test_results['operations_failed']:
        log(f"Failed operations: {', '.join(test_results['operations_failed'][:10])}")
    if test_results['metrics_failed']:
        log(f"Failed metrics: {', '.join(test_results['metrics_failed'][:10])}")
    log(f"Bits changed: {bits_changed}")
    log(f"Budget used: {initial_budget - get_budget()}")
    log(f"Final entropy: {final_metrics.get('entropy', 0):.4f}")
    log("=" * 70)
    
    return test_results

# Run unified algorithm
result = execute()
`;

// ===== UNIFIED SCORING =====
export const UNIFIED_SCORING = `"""
Unified Scoring System - Multi-dimensional scoring
Evaluates system performance across multiple dimensions
"""

from bitwise_api import (
    get_bits, get_metric, get_all_metrics,
    get_budget, log
)

# Budget configuration
INITIAL_BUDGET = 1000

# Scoring weights for different dimensions
SCORING_DIMENSIONS = {
    "entropy_reduction": {
        "weight": 20,
        "description": "Entropy change (lower is better for compression)",
    },
    "operation_coverage": {
        "weight": 25,
        "description": "Percentage of operations tested successfully",
    },
    "metric_accuracy": {
        "weight": 25,
        "description": "Percentage of metrics calculated successfully",
    },
    "budget_efficiency": {
        "weight": 15,
        "description": "How efficiently budget was used",
    },
    "data_integrity": {
        "weight": 15,
        "description": "Data remains valid binary after operations",
    }
}

def score_entropy(metrics):
    """Score based on entropy"""
    entropy = metrics.get('entropy', 1.0)
    # Score: 0 entropy = 100, 1 entropy = 50 (neutral)
    score = (1.5 - entropy) * 66.67
    return max(0, min(100, score))

def score_operation_coverage(test_results=None):
    """Score based on operation test success rate"""
    # Default to 80% if no results provided
    if not test_results:
        return 80
    passed = test_results.get('operations_passed', 0)
    tested = test_results.get('operations_tested', 1)
    return (passed / tested) * 100 if tested > 0 else 0

def score_metric_accuracy(test_results=None):
    """Score based on metric test success rate"""
    if not test_results:
        return 80
    passed = test_results.get('metrics_passed', 0)
    tested = test_results.get('metrics_tested', 1)
    return (passed / tested) * 100 if tested > 0 else 0

def score_budget_efficiency():
    """Score based on budget usage efficiency"""
    remaining = get_budget()
    ratio = remaining / INITIAL_BUDGET if INITIAL_BUDGET > 0 else 0
    
    # Penalize extremes - ideal is using 30-70% of budget
    if ratio > 0.9:
        return 60  # Didn't use budget effectively
    elif ratio > 0.7:
        return 80  # Conservative usage
    elif ratio > 0.3:
        return 100  # Optimal usage
    elif ratio > 0.1:
        return 70  # Heavy usage
    else:
        return 40  # Overused

def score_data_integrity():
    """Score based on data validity"""
    bits = get_bits()
    
    # Check all chars are 0 or 1
    valid = all(b in '01' for b in bits)
    if not valid:
        return 0
    
    # Check length is reasonable
    if len(bits) < 8:
        return 50
    
    return 100

def calculate_weighted_score(test_results=None):
    """Calculate total weighted score"""
    metrics = get_all_metrics()
    
    scores = {
        "entropy_reduction": score_entropy(metrics),
        "operation_coverage": score_operation_coverage(test_results),
        "metric_accuracy": score_metric_accuracy(test_results),
        "budget_efficiency": score_budget_efficiency(),
        "data_integrity": score_data_integrity(),
    }
    
    total = 0
    for dimension, config in SCORING_DIMENSIONS.items():
        weight = config["weight"]
        score = scores.get(dimension, 0)
        total += score * (weight / 100)
    
    return scores, total

def get_grade(score):
    """Convert score to letter grade"""
    if score >= 95: return "A+"
    if score >= 90: return "A"
    if score >= 85: return "A-"
    if score >= 80: return "B+"
    if score >= 75: return "B"
    if score >= 70: return "B-"
    if score >= 65: return "C+"
    if score >= 60: return "C"
    if score >= 55: return "D"
    return "F"

def execute(test_results=None):
    """Main scoring execution"""
    log("=" * 70)
    log("UNIFIED SCORING: MULTI-DIMENSIONAL EVALUATION")
    log("=" * 70)
    
    scores, total = calculate_weighted_score(test_results)
    grade = get_grade(total)
    
    log("")
    log("Dimension Scores:")
    for dimension, config in SCORING_DIMENSIONS.items():
        score = scores.get(dimension, 0)
        weight = config["weight"]
        contribution = score * (weight / 100)
        log(f"  {dimension}:")
        log(f"    Score: {score:.1f}/100 (weight: {weight}%)")
        log(f"    Contribution: {contribution:.1f}")
    
    log("")
    log(f"TOTAL SCORE: {total:.1f}/100")
    log(f"GRADE: {grade}")
    
    remaining = get_budget()
    log(f"Budget remaining: {remaining}/{INITIAL_BUDGET}")
    log("=" * 70)
    
    return {
        "scores": scores,
        "total": total,
        "grade": grade,
        "budget_used": INITIAL_BUDGET - remaining,
    }

# Run scoring
result = execute()
`;

// ===== UNIFIED POLICY =====
export const UNIFIED_POLICY = `"""
Unified Policy Validator
Comprehensive validation across all system aspects
"""

from bitwise_api import (
    get_bits, get_metric, get_all_metrics,
    get_available_operations, get_budget, log
)

# Policy configuration
POLICY_CONFIG = {
    # Data constraints
    "min_data_length": 8,
    "max_data_length": 100000000,
    "require_valid_binary": True,
    
    # Balance constraints
    "max_imbalance": 0.98,
    
    # Entropy constraints
    "max_entropy_increase": 0.5,
    
    # Budget constraints
    "min_budget_ratio": 0.02,
    "warn_budget_ratio": 0.10,
    
    # Operation constraints
    "min_operations_available": 5,
    
    # Metric constraints
    "min_metrics_available": 5,
}

class PolicyResult:
    def __init__(self):
        self.passed = True
        self.failures = []
        self.warnings = []
    
    def fail(self, msg):
        self.passed = False
        self.failures.append(msg)
    
    def warn(self, msg):
        self.warnings.append(msg)

def validate_data_integrity(result):
    """Validate data integrity policies"""
    bits = get_bits()
    
    # Check length
    if len(bits) < POLICY_CONFIG["min_data_length"]:
        result.fail(f"Data too short: {len(bits)} < {POLICY_CONFIG['min_data_length']}")
    
    if len(bits) > POLICY_CONFIG["max_data_length"]:
        result.fail(f"Data too long: {len(bits)} > {POLICY_CONFIG['max_data_length']}")
    
    # Check valid binary
    if POLICY_CONFIG["require_valid_binary"]:
        invalid_chars = [c for c in bits if c not in '01']
        if invalid_chars:
            result.fail(f"Invalid binary characters found: {set(invalid_chars)}")

def validate_balance(result):
    """Validate bit balance policies"""
    metrics = get_all_metrics()
    balance = metrics.get('balance', 0.5)
    
    if balance > POLICY_CONFIG["max_imbalance"]:
        result.warn(f"High imbalance: {balance:.2f} (>{POLICY_CONFIG['max_imbalance']})")
    elif balance < (1 - POLICY_CONFIG["max_imbalance"]):
        result.warn(f"Low balance: {balance:.2f} (<{1 - POLICY_CONFIG['max_imbalance']})")

def validate_budget(result, initial_budget=1000):
    """Validate budget policies"""
    remaining = get_budget()
    ratio = remaining / initial_budget if initial_budget > 0 else 0
    
    if ratio < POLICY_CONFIG["min_budget_ratio"]:
        result.fail(f"Budget critical: {ratio:.1%} < {POLICY_CONFIG['min_budget_ratio']:.1%}")
    elif ratio < POLICY_CONFIG["warn_budget_ratio"]:
        result.warn(f"Budget low: {ratio:.1%}")

def validate_operations(result):
    """Validate operation availability"""
    ops = get_available_operations()
    
    if len(ops) < POLICY_CONFIG["min_operations_available"]:
        result.fail(f"Too few operations: {len(ops)} < {POLICY_CONFIG['min_operations_available']}")

def validate_metrics(result):
    """Validate metric availability"""
    metrics = get_all_metrics()
    
    if len(metrics) < POLICY_CONFIG["min_metrics_available"]:
        result.fail(f"Too few metrics: {len(metrics)} < {POLICY_CONFIG['min_metrics_available']}")

def execute(initial_budget=1000):
    """Main policy validation"""
    log("=" * 70)
    log("UNIFIED POLICY: COMPREHENSIVE VALIDATION")
    log("=" * 70)
    
    result = PolicyResult()
    
    # Run all validations
    log("\\nValidating data integrity...")
    validate_data_integrity(result)
    
    log("Validating balance...")
    validate_balance(result)
    
    log("Validating budget...")
    validate_budget(result, initial_budget)
    
    log("Validating operations...")
    validate_operations(result)
    
    log("Validating metrics...")
    validate_metrics(result)
    
    # Report results
    log("")
    if result.passed:
        log("✓ ALL POLICIES PASSED")
    else:
        log("✗ POLICY FAILURES:")
        for failure in result.failures:
            log(f"  - {failure}")
    
    if result.warnings:
        log("⚠ WARNINGS:")
        for warning in result.warnings:
            log(f"  - {warning}")
    
    log("=" * 70)
    
    return {
        "passed": result.passed,
        "failures": result.failures,
        "warnings": result.warnings,
    }

# Run policy validation
result = execute()
`;

// ===== UNIFIED AI ANALYZER (JavaScript) =====
export const UNIFIED_AI_ANALYZER = `/**
 * Unified AI Analyzer - Pattern detection and optimization suggestions
 * Uses heuristics to analyze binary data and suggest improvements
 */

class UnifiedAIAnalyzer {
  constructor() {
    this.patterns = new Map();
    this.suggestions = [];
  }

  analyze(bits) {
    this.patterns.clear();
    this.suggestions = [];
    
    // Pattern detection
    this.detectRepeatingPatterns(bits);
    this.detectLongRuns(bits);
    this.analyzeEntropy(bits);
    
    return {
      patterns: Array.from(this.patterns.entries()),
      suggestions: this.suggestions,
    };
  }

  detectRepeatingPatterns(bits) {
    // Find 2-8 bit repeating patterns
    for (let len = 2; len <= 8; len++) {
      const patternCounts = {};
      for (let i = 0; i <= bits.length - len; i++) {
        const pattern = bits.slice(i, i + len);
        patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
      }
      
      // Find high-frequency patterns
      for (const [pattern, count] of Object.entries(patternCounts)) {
        const frequency = count / (bits.length / len);
        if (frequency > 0.3) {
          this.patterns.set(pattern, { count, frequency, length: len });
          this.suggestions.push({
            type: 'pattern',
            message: \`High frequency pattern "\${pattern}" detected (\${(frequency*100).toFixed(1)}%)\`,
            operation: 'XOR',
            params: { mask: pattern },
          });
        }
      }
    }
  }

  detectLongRuns(bits) {
    let currentChar = bits[0];
    let runStart = 0;
    let maxRun = 0;
    let maxRunChar = '0';
    
    for (let i = 1; i <= bits.length; i++) {
      if (i === bits.length || bits[i] !== currentChar) {
        const runLength = i - runStart;
        if (runLength > maxRun) {
          maxRun = runLength;
          maxRunChar = currentChar;
        }
        if (i < bits.length) {
          currentChar = bits[i];
          runStart = i;
        }
      }
    }
    
    if (maxRun > bits.length / 4) {
      this.suggestions.push({
        type: 'run',
        message: \`Long run of \${maxRunChar}s detected: \${maxRun} bits\`,
        operation: 'NOT',
        params: { start: runStart, end: runStart + maxRun },
      });
    }
  }

  analyzeEntropy(bits) {
    const ones = (bits.match(/1/g) || []).length;
    const p1 = ones / bits.length;
    
    if (p1 < 0.1 || p1 > 0.9) {
      this.suggestions.push({
        type: 'entropy',
        message: \`Very low entropy detected (balance: \${(p1*100).toFixed(1)}%)\`,
        operation: 'XOR',
        params: { mask: '10101010' },
      });
    }
  }

  getSuggestions() {
    return this.suggestions;
  }

  getPatterns() {
    return Array.from(this.patterns.entries());
  }
}

// Export analyzer instance
const analyzer = new UnifiedAIAnalyzer();
`;

/**
 * Load all unified strategy files into the Python module system
 * Clears existing files/strategies and creates a fresh unified setup
 */
export function loadUnifiedStrategyFiles(system: typeof pythonModuleSystem): void {
  // Clear existing files and strategies
  system.clearAll();
  
  // Add unified scheduler (required)
  system.addFile('UnifiedScheduler.py', UNIFIED_SCHEDULER, 'scheduler');
  
  // Add unified algorithm
  system.addFile('UnifiedAlgorithm.py', UNIFIED_ALGORITHM, 'algorithm');
  
  // Add unified scoring
  system.addFile('UnifiedScoring.py', UNIFIED_SCORING, 'scoring');
  
  // Add unified policy
  system.addFile('UnifiedPolicy.py', UNIFIED_POLICY, 'policies');
  
  // Add AI analyzer (JavaScript)
  system.addFile('UnifiedAIAnalyzer.js', UNIFIED_AI_ANALYZER, 'ai');
  
  // Create the unified strategy
  system.createStrategy(
    'Unified Comprehensive Strategy',
    'UnifiedScheduler.py',
    ['UnifiedAlgorithm.py'],
    ['UnifiedScoring.py'],
    ['UnifiedPolicy.py']
  );
}
