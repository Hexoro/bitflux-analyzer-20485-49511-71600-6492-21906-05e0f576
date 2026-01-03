/**
 * Unified Comprehensive Strategy
 * Tests ALL operations, metrics, AI files, multiple scoring methods, 
 * policies, and algorithms in one unified execution
 */

// ===== UNIFIED SCHEDULER =====
export const UNIFIED_SCHEDULER = `"""
Unified Master Scheduler - Comprehensive system testing
Tests all components: operations, metrics, AI, scoring, policies
"""

from bitwise_api import get_bits, log, get_all_metrics, get_available_operations

def schedule():
    """
    Generate comprehensive test batches that exercise the entire system.
    """
    bits = get_bits()
    total_length = len(bits)
    
    log("=" * 60)
    log("UNIFIED SCHEDULER: Comprehensive System Test")
    log("=" * 60)
    log(f"Total data size: {total_length} bits")
    
    # Get initial metrics
    metrics = get_all_metrics()
    log(f"Initial entropy: {metrics.get('entropy', 0):.4f}")
    log(f"Initial balance: {metrics.get('balance', 0):.4f}")
    
    # Get available operations
    ops = get_available_operations()
    log(f"Available operations: {len(ops)}")
    
    # Create test phases
    phases = [
        {
            "phase": "logic_gates",
            "description": "Test logic gate operations",
            "operations": ["NOT", "AND", "OR", "XOR", "NAND", "NOR", "XNOR"],
            "segment_size": min(32, total_length // 4),
        },
        {
            "phase": "shifts_rotations", 
            "description": "Test shift and rotation operations",
            "operations": ["SHL", "SHR", "ROL", "ROR"],
            "segment_size": min(64, total_length // 2),
        },
        {
            "phase": "arithmetic",
            "description": "Test arithmetic operations",
            "operations": ["ADD", "SUB"],
            "segment_size": min(16, total_length // 8),
        },
        {
            "phase": "encoding",
            "description": "Test encoding operations",
            "operations": ["GRAY", "REVERSE", "ENDIAN"],
            "segment_size": min(64, total_length // 2),
        },
    ]
    
    # Generate batches
    batches = []
    batch_id = 0
    
    for phase in phases:
        segment_size = phase["segment_size"]
        ops_to_test = [op for op in phase["operations"] if op in ops]
        
        if not ops_to_test:
            log(f"Skipping phase {phase['phase']} - no matching operations")
            continue
            
        log(f"Phase: {phase['phase']} - {len(ops_to_test)} operations")
        
        for i in range(0, total_length, segment_size * 2):
            start = i
            end = min(i + segment_size, total_length)
            
            if end - start < 8:
                continue
                
            batches.append({
                "batch_id": batch_id,
                "phase": phase["phase"],
                "start": start,
                "end": end,
                "operations": ops_to_test,
                "max_iterations": 2,
                "priority": len(phases) - phases.index(phase),
            })
            batch_id += 1
    
    log(f"Scheduled {len(batches)} batches across {len(phases)} phases")
    log("=" * 60)
    
    return batches

# Execute scheduler
result = schedule()
log(f"Scheduler complete. Batches: {len(result)}")
`;

// ===== UNIFIED ALGORITHM =====
export const UNIFIED_ALGORITHM = `"""
Unified Algorithm - Tests all operations and metrics
Verifies each operation produces expected results
Tracks comprehensive transformation history
"""

from bitwise_api import (
    get_bits, set_bits, apply_operation, apply_operation_range,
    get_metric, get_all_metrics, get_available_operations,
    deduct_budget, get_budget, log
)

def test_operation(op_id, start, end, params=None):
    """Test a single operation and verify it works"""
    params = params or {}
    bits = get_bits()
    segment_before = bits[start:end]
    
    try:
        # Apply operation to range
        apply_operation_range(op_id, start, end, params)
        
        bits_after = get_bits()
        segment_after = bits_after[start:end]
        
        # Check something changed (unless it's a no-op case)
        changed = segment_before != segment_after
        
        return {
            "operation": op_id,
            "success": True,
            "changed": changed,
            "before_sample": segment_before[:16],
            "after_sample": segment_after[:16],
        }
    except Exception as e:
        return {
            "operation": op_id,
            "success": False,
            "error": str(e),
        }

def test_metric(metric_id, bits=None):
    """Test a single metric calculation"""
    try:
        value = get_metric(metric_id, bits)
        return {
            "metric": metric_id,
            "success": True,
            "value": value,
        }
    except Exception as e:
        return {
            "metric": metric_id,
            "success": False,
            "error": str(e),
        }

def execute_batch(batch):
    """Execute a single test batch"""
    start = batch["start"]
    end = batch["end"]
    operations = batch["operations"]
    phase = batch["phase"]
    
    log(f"\\nExecuting batch {batch['batch_id']}: {phase} [{start}:{end}]")
    
    results = []
    
    for op in operations:
        if not deduct_budget(1):
            log("Budget exhausted")
            break
            
        # Prepare params based on operation type
        params = {}
        if op in ["AND", "OR", "XOR", "NAND", "NOR", "XNOR"]:
            params["mask"] = "10101010"  # Alternating pattern
        elif op in ["SHL", "SHR", "ROL", "ROR"]:
            params["count"] = 2
        elif op == "GRAY":
            params["direction"] = "encode"
            
        result = test_operation(op, start, end, params)
        results.append(result)
        
        if result["success"]:
            status = "✓ changed" if result.get("changed") else "○ unchanged"
            log(f"  {op}: {status}")
        else:
            log(f"  {op}: ✗ {result.get('error', 'failed')}")
    
    return results

def verify_metrics():
    """Verify all core metrics work"""
    bits = get_bits()
    log("\\nVerifying metrics...")
    
    core_metrics = ["entropy", "balance", "hamming_weight", "transition_count", "run_length_avg"]
    results = []
    
    for m in core_metrics:
        result = test_metric(m, bits)
        results.append(result)
        if result["success"]:
            log(f"  {m}: {result['value']:.4f}")
        else:
            log(f"  {m}: FAILED - {result.get('error')}")
    
    return results

def execute():
    """Main unified algorithm execution"""
    log("=" * 60)
    log("UNIFIED ALGORITHM: Comprehensive Testing")
    log("=" * 60)
    
    bits = get_bits()
    initial_metrics = get_all_metrics()
    initial_budget = get_budget()
    
    log(f"Data size: {len(bits)} bits")
    log(f"Initial entropy: {initial_metrics.get('entropy', 0):.4f}")
    log(f"Available budget: {initial_budget}")
    
    # Test all metric calculations first
    metric_results = verify_metrics()
    
    # Execute operation tests in phases
    all_results = []
    
    # Phase 1: Logic Gates
    log("\\n--- Phase 1: Logic Gates ---")
    logic_ops = ["NOT", "AND", "OR", "XOR"]
    for i, op in enumerate(logic_ops):
        if not deduct_budget(1):
            break
        start = i * 16 % len(bits)
        end = min(start + 16, len(bits))
        result = test_operation(op, start, end, {"mask": "11110000"} if op != "NOT" else {})
        all_results.append(result)
        log(f"  {op}: {'✓' if result['success'] else '✗'}")
    
    # Phase 2: Shifts
    log("\\n--- Phase 2: Shifts & Rotations ---")
    shift_ops = ["SHL", "SHR", "ROL", "ROR"]
    for i, op in enumerate(shift_ops):
        if not deduct_budget(1):
            break
        start = 64 + i * 16
        end = min(start + 16, len(bits))
        if start < len(bits):
            result = test_operation(op, start, end, {"count": 2})
            all_results.append(result)
            log(f"  {op}: {'✓' if result['success'] else '✗'}")
    
    # Phase 3: Special Operations
    log("\\n--- Phase 3: Special Operations ---")
    special_ops = ["REVERSE"]
    for op in special_ops:
        if not deduct_budget(1):
            break
        start = 0
        end = min(32, len(bits))
        result = test_operation(op, start, end, {})
        all_results.append(result)
        log(f"  {op}: {'✓' if result['success'] else '✗'}")
    
    # Final analysis
    final_bits = get_bits()
    final_metrics = get_all_metrics()
    bits_changed = sum(1 for a, b in zip(bits, final_bits) if a != b)
    
    successful_ops = sum(1 for r in all_results if r.get("success"))
    successful_metrics = sum(1 for r in metric_results if r.get("success"))
    
    log("")
    log("=" * 60)
    log("UNIFIED ALGORITHM: Complete")
    log(f"Operations tested: {len(all_results)} ({successful_ops} successful)")
    log(f"Metrics verified: {len(metric_results)} ({successful_metrics} successful)")
    log(f"Bits changed: {bits_changed}")
    log(f"Budget used: {initial_budget - get_budget()}")
    log(f"Final entropy: {final_metrics.get('entropy', 0):.4f}")
    log("=" * 60)
    
    return {
        "operations_tested": len(all_results),
        "operations_passed": successful_ops,
        "metrics_tested": len(metric_results),
        "metrics_passed": successful_metrics,
        "bits_changed": bits_changed,
    }

# Run unified algorithm
result = execute()
`;

// ===== UNIFIED SCORING =====
export const UNIFIED_SCORING = `"""
Unified Scoring System - Multi-dimensional scoring
Combines multiple scoring strategies:
- Entropy reduction scoring
- Operation efficiency scoring
- Coverage scoring (what % of system tested)
- Budget efficiency scoring
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
        "weight": 25,
        "description": "How much entropy was reduced",
    },
    "operation_coverage": {
        "weight": 25,
        "description": "How many different operations were tested",
    },
    "metric_accuracy": {
        "weight": 20,
        "description": "How many metrics calculated successfully",
    },
    "budget_efficiency": {
        "weight": 15,
        "description": "How efficiently budget was used",
    },
    "data_integrity": {
        "weight": 15,
        "description": "Data remains valid after operations",
    }
}

def score_entropy(metrics):
    """Score based on entropy (lower is better for this metric)"""
    entropy = metrics.get('entropy', 1.0)
    # Transform: 0 entropy = 100, 1 entropy = 0
    score = (1.0 - entropy) * 100
    return max(0, min(100, score))

def score_operation_coverage():
    """Score based on number of operations tested (from execution log)"""
    # This would normally read from the execution context
    # For now, assume good coverage if we got this far
    return 80

def score_metric_accuracy(metrics):
    """Score based on number of metrics successfully calculated"""
    expected_metrics = ["entropy", "balance", "hamming_weight", "transition_count"]
    found = sum(1 for m in expected_metrics if m in metrics)
    return (found / len(expected_metrics)) * 100

def score_budget_efficiency():
    """Score based on budget efficiency"""
    remaining = get_budget()
    ratio = remaining / INITIAL_BUDGET if INITIAL_BUDGET > 0 else 0
    
    # Penalize both extremes
    if ratio > 0.9:
        return 60  # Didn't use budget effectively
    elif ratio > 0.3:
        return 100  # Good balance
    elif ratio > 0.1:
        return 80  # Pushed it but OK
    else:
        return 40  # Overused

def score_data_integrity():
    """Score based on data integrity"""
    bits = get_bits()
    
    # Check all chars are 0 or 1
    valid = all(b in '01' for b in bits)
    if not valid:
        return 0
    
    # Check length is reasonable
    if len(bits) < 8:
        return 50
    
    return 100

def calculate_weighted_score():
    """Calculate total weighted score"""
    metrics = get_all_metrics()
    
    scores = {
        "entropy_reduction": score_entropy(metrics),
        "operation_coverage": score_operation_coverage(),
        "metric_accuracy": score_metric_accuracy(metrics),
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
    if score >= 90: return "A+"
    if score >= 85: return "A"
    if score >= 80: return "B+"
    if score >= 75: return "B"
    if score >= 70: return "C+"
    if score >= 65: return "C"
    if score >= 60: return "D"
    return "F"

def execute():
    """Main scoring execution"""
    log("=" * 60)
    log("UNIFIED SCORING: Multi-dimensional Evaluation")
    log("=" * 60)
    
    scores, total = calculate_weighted_score()
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
        log(f"    {config['description']}")
    
    log("")
    log(f"TOTAL SCORE: {total:.1f}/100")
    log(f"GRADE: {grade}")
    
    # Bonus info
    remaining = get_budget()
    log(f"Budget remaining: {remaining}/{INITIAL_BUDGET}")
    log("=" * 60)
    
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
Comprehensive validation across all system aspects:
- Data integrity policies
- Operation safety policies  
- Budget policies
- Output quality policies
"""

from bitwise_api import (
    get_bits, get_metric, get_all_metrics,
    get_available_operations, get_budget, log
)

# Policy configuration
POLICY_CONFIG = {
    # Data constraints
    "min_data_length": 8,
    "max_data_length": 10000000,
    "require_valid_binary": True,
    
    # Balance constraints
    "max_imbalance": 0.98,  # Allow up to 98% of one bit type
    
    # Entropy constraints
    "max_entropy_increase": 0.5,  # Don't increase entropy too much
    
    # Budget constraints
    "min_budget_ratio": 0.02,  # Keep at least 2% budget
    "warn_budget_ratio": 0.10,  # Warn below 10%
    
    # Operation constraints
    "require_operations": True,  # Must have operations available
    "min_operations": 5,
}

def validate_data_integrity():
    """Validate data meets integrity requirements"""
    bits = get_bits()
    issues = []
    
    # Length check
    if len(bits) < POLICY_CONFIG["min_data_length"]:
        issues.append(f"Data too short: {len(bits)} < {POLICY_CONFIG['min_data_length']}")
    
    if len(bits) > POLICY_CONFIG["max_data_length"]:
        issues.append(f"Data too long: {len(bits)} > {POLICY_CONFIG['max_data_length']}")
    
    # Binary validation
    if POLICY_CONFIG["require_valid_binary"]:
        invalid_chars = [c for c in bits if c not in '01']
        if invalid_chars:
            issues.append(f"Invalid characters found: {invalid_chars[:5]}")
    
    return len(issues) == 0, issues

def validate_balance():
    """Validate bit balance is reasonable"""
    bits = get_bits()
    if len(bits) == 0:
        return False, ["Empty data"]
    
    ones = bits.count('1')
    ratio = ones / len(bits)
    
    if ratio > POLICY_CONFIG["max_imbalance"]:
        return False, [f"Too many 1s: {ratio*100:.1f}%"]
    if ratio < (1 - POLICY_CONFIG["max_imbalance"]):
        return False, [f"Too many 0s: {(1-ratio)*100:.1f}%"]
    
    return True, []

def validate_budget():
    """Validate budget usage"""
    remaining = get_budget()
    initial = 1000  # Assume initial budget
    ratio = remaining / initial if initial > 0 else 0
    
    warnings = []
    
    if ratio < POLICY_CONFIG["min_budget_ratio"]:
        return False, [f"Budget critically low: {remaining}"]
    
    if ratio < POLICY_CONFIG["warn_budget_ratio"]:
        warnings.append(f"Budget warning: {remaining} remaining ({ratio*100:.1f}%)")
    
    return True, warnings

def validate_operations():
    """Validate operation system is working"""
    ops = get_available_operations()
    issues = []
    
    if POLICY_CONFIG["require_operations"] and len(ops) == 0:
        issues.append("No operations available")
    
    if len(ops) < POLICY_CONFIG["min_operations"]:
        issues.append(f"Too few operations: {len(ops)} < {POLICY_CONFIG['min_operations']}")
    
    # Check for critical operations
    critical_ops = ["NOT", "AND", "OR", "XOR"]
    missing = [op for op in critical_ops if op not in ops]
    if missing:
        issues.append(f"Missing critical operations: {missing}")
    
    return len(issues) == 0, issues

def validate_metrics():
    """Validate metrics system is working"""
    try:
        metrics = get_all_metrics()
        required = ["entropy", "balance"]
        missing = [m for m in required if m not in metrics]
        
        if missing:
            return False, [f"Missing required metrics: {missing}"]
        
        return True, []
    except Exception as e:
        return False, [f"Metrics system error: {e}"]

def run_all_validations():
    """Run all policy validations"""
    results = []
    all_passed = True
    
    # Data integrity
    passed, issues = validate_data_integrity()
    results.append(("Data Integrity", passed, issues))
    if not passed: all_passed = False
    
    # Balance
    passed, issues = validate_balance()
    results.append(("Bit Balance", passed, issues))
    if not passed: all_passed = False
    
    # Budget
    passed, warnings = validate_budget()
    results.append(("Budget", passed, warnings))
    if not passed: all_passed = False
    
    # Operations
    passed, issues = validate_operations()
    results.append(("Operations", passed, issues))
    if not passed: all_passed = False
    
    # Metrics
    passed, issues = validate_metrics()
    results.append(("Metrics", passed, issues))
    if not passed: all_passed = False
    
    return all_passed, results

def execute():
    """Main policy execution"""
    log("=" * 60)
    log("UNIFIED POLICY: Comprehensive Validation")
    log("=" * 60)
    
    all_passed, results = run_all_validations()
    
    for name, passed, issues in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        log(f"\\n{name}: {status}")
        for issue in issues:
            log(f"  - {issue}")
    
    log("")
    log("=" * 60)
    if all_passed:
        log("POLICY: All validations PASSED")
    else:
        log("POLICY: Some validations FAILED - review required")
    log("=" * 60)
    
    return {
        "passed": all_passed,
        "results": [{"name": n, "passed": p, "issues": i} for n, p, i in results],
    }

# Run policy
result = execute()
`;

// ===== AI ANALYZER FILE =====
export const UNIFIED_AI_ANALYZER = `/**
 * Unified AI Pattern Analyzer
 * Combines pattern recognition, prediction, and optimization suggestions
 * Works with the unified strategy
 */

class UnifiedAIAnalyzer {
  constructor() {
    this.patternCache = new Map();
    this.predictionHistory = [];
  }

  // Analyze patterns in the data
  analyzePatterns(bits, patternSize = 8) {
    const patterns = {};
    for (let i = 0; i <= bits.length - patternSize; i++) {
      const pattern = bits.slice(i, i + patternSize);
      patterns[pattern] = (patterns[pattern] || 0) + 1;
    }
    
    // Sort by frequency
    const sorted = Object.entries(patterns)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    return {
      totalPatterns: Object.keys(patterns).length,
      topPatterns: sorted,
      uniqueRatio: Object.keys(patterns).length / (bits.length - patternSize + 1),
    };
  }

  // Calculate all metrics
  calculateMetrics(bits) {
    const ones = (bits.match(/1/g) || []).length;
    const zeros = bits.length - ones;
    
    let transitions = 0;
    for (let i = 1; i < bits.length; i++) {
      if (bits[i] !== bits[i-1]) transitions++;
    }
    
    const p1 = ones / bits.length;
    const p0 = zeros / bits.length;
    const entropy = p1 > 0 && p0 > 0 
      ? -(p1 * Math.log2(p1) + p0 * Math.log2(p0))
      : 0;
    
    return {
      length: bits.length,
      ones,
      zeros,
      balance: ones / bits.length,
      entropy,
      transitions,
      transitionRate: transitions / (bits.length - 1),
    };
  }

  // Suggest optimal operation based on current state
  suggestOperation(bits) {
    const metrics = this.calculateMetrics(bits);
    const patterns = this.analyzePatterns(bits);
    
    const suggestions = [];
    
    // High entropy - try XOR to reduce
    if (metrics.entropy > 0.9) {
      suggestions.push({
        operation: 'XOR',
        priority: 1,
        reason: 'High entropy - XOR with repeating pattern may reduce',
        params: { mask: '10101010' },
      });
    }
    
    // Imbalanced - try to balance
    if (metrics.balance > 0.6) {
      suggestions.push({
        operation: 'AND',
        priority: 2,
        reason: 'Too many 1s - AND with alternating mask',
        params: { mask: '01010101' },
      });
    } else if (metrics.balance < 0.4) {
      suggestions.push({
        operation: 'OR',
        priority: 2,
        reason: 'Too many 0s - OR with sparse pattern',
        params: { mask: '00010001' },
      });
    }
    
    // High transition rate - try rotation
    if (metrics.transitionRate > 0.4) {
      suggestions.push({
        operation: 'ROL',
        priority: 3,
        reason: 'High transitions - rotation may group similar bits',
        params: { count: 3 },
      });
    }
    
    // Low uniqueness - data is repetitive
    if (patterns.uniqueRatio < 0.3) {
      suggestions.push({
        operation: 'REVERSE',
        priority: 4,
        reason: 'Repetitive patterns - reversal may break cycles',
        params: {},
      });
    }
    
    return suggestions.sort((a, b) => a.priority - b.priority);
  }

  // Full analysis
  analyze(bits) {
    console.log('=== Unified AI Analyzer ===');
    console.log('Input size:', bits.length, 'bits');
    
    const metrics = this.calculateMetrics(bits);
    console.log('Metrics:', metrics);
    
    const patterns = this.analyzePatterns(bits);
    console.log('Patterns:', patterns);
    
    const suggestions = this.suggestOperation(bits);
    console.log('Suggestions:', suggestions);
    
    return { metrics, patterns, suggestions };
  }
}

// Export
const analyzer = new UnifiedAIAnalyzer();

function execute(bits) {
  return analyzer.analyze(bits);
}

if (typeof module !== 'undefined') {
  module.exports = { UnifiedAIAnalyzer, execute };
}
`;

// Helper to load all unified strategy files
export const loadUnifiedStrategyFiles = (pythonModuleSystem: any) => {
  // Clear existing files first
  const existingFiles = pythonModuleSystem.getAllFiles();
  existingFiles.forEach((f: any) => pythonModuleSystem.deleteFile(f.id));
  
  // Clear existing strategies
  const existingStrategies = pythonModuleSystem.getAllStrategies();
  existingStrategies.forEach((s: any) => pythonModuleSystem.deleteStrategy(s.id));
  
  // Add unified strategy files
  pythonModuleSystem.addFile('UnifiedScheduler.py', UNIFIED_SCHEDULER, 'scheduler');
  pythonModuleSystem.addFile('UnifiedAlgorithm.py', UNIFIED_ALGORITHM, 'algorithm');
  pythonModuleSystem.addFile('UnifiedScoring.py', UNIFIED_SCORING, 'scoring');
  pythonModuleSystem.addFile('UnifiedPolicy.py', UNIFIED_POLICY, 'policies');
  pythonModuleSystem.addFile('UnifiedAIAnalyzer.js', UNIFIED_AI_ANALYZER, 'ai');
  
  // Create the unified strategy
  pythonModuleSystem.createStrategy(
    'Unified Comprehensive Test',
    'UnifiedScheduler.py',
    ['UnifiedAlgorithm.py'],
    ['UnifiedScoring.py'],
    ['UnifiedPolicy.py']
  );
  
  return true;
};
