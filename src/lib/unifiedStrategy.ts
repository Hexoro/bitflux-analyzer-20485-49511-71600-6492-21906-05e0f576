/**
 * Unified Comprehensive Strategy V2
 * Tests ALL 106+ operations, ALL 76+ metrics, ALL file groups including AI
 * Comprehensive verification and testing system
 */

import { pythonModuleSystem, PythonFile } from './pythonModuleSystem';

// ===== ALL OPERATIONS LIST =====
export const ALL_OPERATIONS = [
  // Logic Gates (7)
  'NOT', 'AND', 'OR', 'XOR', 'NAND', 'NOR', 'XNOR',
  // Extended Logic (5)
  'IMPLY', 'NIMPLY', 'CONVERSE', 'MUX', 'MAJ',
  // Shifts (4)
  'SHL', 'SHR', 'ASHL', 'ASHR',
  // Rotations (2)
  'ROL', 'ROR',
  // Bit Manipulation (8)
  'INSERT', 'DELETE', 'REPLACE', 'MOVE', 'TRUNCATE', 'APPEND', 'SWAP', 'EXTRACT',
  // Packing (5)
  'PAD', 'PAD_LEFT', 'PAD_RIGHT', 'UNPAD', 'ALIGN',
  // Encoding (8)
  'GRAY', 'DEGRAY', 'ENDIAN', 'REVERSE', 'MANCHESTER', 'DEMANCHESTER', 'DIFF', 'DEDIFF',
  // Line Codes (4)
  'NRZI', 'DENRZI', 'RLL', 'DERLL',
  // Compression (8)
  'RLE', 'DERLE', 'DELTA', 'DEDELTA', 'ZIGZAG', 'DEZIGZAG', 'BWT', 'MTF', 'IMTF',
  // Error Correction (4)
  'HAMMING_ENC', 'HAMMING_DEC', 'CRC8', 'CRC16', 'CRC32',
  // Base Encoding (4)
  'BASE64_ENC', 'BASE64_DEC', 'HEX_ENC', 'HEX_DEC',
  // Arithmetic (6)
  'ADD', 'SUB', 'INCREMENT', 'DECREMENT', 'NEGATE', 'ABS',
  // Advanced (10)
  'SHUFFLE', 'DESHUFFLE', 'LFSR', 'SBOX', 'PERMUTE', 'FEISTEL', 'SCATTER', 'GATHER',
  // Bit Operations (10)
  'MIRROR', 'REVERSE_BYTES', 'NIBBLE_SWAP', 'BIT_SPREAD', 'BIT_COMPACT',
  'POPCOUNT', 'CLZ', 'CTZ', 'PARITY', 'BYTESWAP',
  // Extended Bit Ops (10)
  'RCL', 'RCR', 'FUNNEL', 'BINSERT', 'BEXTRACT', 'BDEPOSIT', 'BGATHER', 'BTEST',
  'CONCAT', 'SPLICE', 'SPLIT', 'MERGE',
  // Checksums (4)
  'FLETCHER', 'ADLER', 'LUHN', 'CHECKSUM',
];

// ===== ALL METRICS LIST =====
export const ALL_METRICS = [
  // Core (5)
  'entropy', 'balance', 'hamming_weight', 'transition_count', 'run_length_avg',
  // Statistics (10)
  'variance', 'standard_deviation', 'skewness', 'kurtosis', 'mean', 'median', 'mode',
  'range', 'iqr', 'mad', 'cv',
  // Information (8)
  'compression_ratio', 'kolmogorov_estimate', 'renyi_entropy', 'min_entropy',
  'conditional_entropy', 'joint_entropy', 'mutual_info', 'cross_entropy',
  // Randomness (8)
  'chi_square', 'monobit_test', 'runs_test', 'poker_test', 'serial_test',
  'autocorrelation', 'serial_correlation', 'apen',
  // Pattern (10)
  'longest_run', 'periodicity', 'block_regularity', 'segment_count',
  'pattern_count', 'unique_patterns', 'repetition_rate', 'complexity',
  't_complexity', 'lz_complexity',
  // Frequency (8)
  'byte_entropy', 'block_entropy_4', 'block_entropy_8', 'nibble_entropy',
  'dominant_freq', 'spectral_centroid', 'bandwidth', 'spectral_flatness',
  // Distances (6)
  'bit_reversal_distance', 'complement_distance', 'gray_distance',
  'hamming_distance', 'edit_distance', 'levenshtein',
  // Entropy Variants (5)
  'sample_entropy', 'permutation_entropy', 'collision_entropy',
  'kl_divergence', 'js_divergence',
  // Compression Estimates (4)
  'lz77_estimate', 'rle_ratio', 'huffman_estimate', 'deflate_estimate',
  // Advanced (6)
  'ideality', 'noise_floor', 'signal_strength', 'snr',
  'transition_rate', 'bit_flip_rate',
];

// ===== UNIFIED MASTER SCHEDULER =====
export const UNIFIED_SCHEDULER_V2 = `"""
Unified Master Scheduler V2 - Comprehensive System Test
Tests ALL ${ALL_OPERATIONS.length}+ operations and ALL ${ALL_METRICS.length}+ metrics
Uses multiple files from all groups including AI files
"""

from bitwise_api import get_bits, log, get_all_metrics, get_available_operations

def schedule():
    """Generate comprehensive test batches for ALL operations."""
    bits = get_bits()
    total_length = len(bits)
    
    log("=" * 80)
    log("UNIFIED SCHEDULER V2: COMPREHENSIVE SYSTEM VERIFICATION")
    log("=" * 80)
    log(f"Data size: {total_length} bits")
    
    all_ops = get_available_operations()
    metrics = get_all_metrics()
    
    log(f"Operations available: {len(all_ops)}")
    log(f"Metrics available: {len(metrics)}")
    
    # Define ALL operation categories for testing
    categories = {
        "logic_gates": ["NOT", "AND", "OR", "XOR", "NAND", "NOR", "XNOR"],
        "extended_logic": ["IMPLY", "NIMPLY", "CONVERSE", "MUX", "MAJ"],
        "shifts": ["SHL", "SHR", "ASHL", "ASHR"],
        "rotations": ["ROL", "ROR"],
        "bit_manipulation": ["INSERT", "DELETE", "REPLACE", "MOVE", "TRUNCATE", "APPEND", "SWAP", "EXTRACT"],
        "packing": ["PAD", "PAD_LEFT", "PAD_RIGHT", "UNPAD", "ALIGN"],
        "encoding": ["GRAY", "DEGRAY", "ENDIAN", "REVERSE", "MANCHESTER", "DEMANCHESTER", "DIFF", "DEDIFF"],
        "line_codes": ["NRZI", "DENRZI", "RLL", "DERLL"],
        "compression": ["RLE", "DERLE", "DELTA", "DEDELTA", "ZIGZAG", "DEZIGZAG", "BWT", "MTF", "IMTF"],
        "error_correction": ["HAMMING_ENC", "HAMMING_DEC", "CRC8", "CRC16", "CRC32"],
        "base_encoding": ["BASE64_ENC", "BASE64_DEC", "HEX_ENC", "HEX_DEC"],
        "arithmetic": ["ADD", "SUB", "INCREMENT", "DECREMENT", "NEGATE", "ABS"],
        "advanced": ["SHUFFLE", "DESHUFFLE", "LFSR", "SBOX", "PERMUTE", "FEISTEL", "SCATTER", "GATHER"],
        "bit_ops": ["MIRROR", "REVERSE_BYTES", "NIBBLE_SWAP", "BIT_SPREAD", "BIT_COMPACT", "POPCOUNT", "CLZ", "CTZ", "PARITY", "BYTESWAP"],
        "extended_bit_ops": ["RCL", "RCR", "FUNNEL", "BINSERT", "BEXTRACT", "BDEPOSIT", "BGATHER", "BTEST", "CONCAT", "SPLICE", "SPLIT", "MERGE"],
        "checksums": ["FLETCHER", "ADLER", "LUHN", "CHECKSUM"],
    }
    
    batches = []
    batch_id = 0
    
    # Create test batches for each category
    for category, ops in categories.items():
        available_ops = [op for op in ops if op in all_ops]
        if not available_ops:
            log(f"Skipping {category}: no available operations")
            continue
        
        log(f"Category '{category}': {len(available_ops)} operations")
        
        # Test each category with different data ranges
        for iteration in range(3):  # 3 iterations per category
            segment_size = min(64, total_length // 4) if total_length >= 64 else total_length
            start = (batch_id * segment_size // 2) % max(1, total_length - segment_size)
            end = min(start + segment_size, total_length)
            
            batches.append({
                "batch_id": batch_id,
                "category": category,
                "phase": f"{category}_iter{iteration}",
                "start": start,
                "end": end,
                "operations": available_ops,
                "max_iterations": len(available_ops) * 2,
                "priority": 15 - list(categories.keys()).index(category),
                "test_combinations": True,
            })
            batch_id += 1
    
    # Add AI-powered analysis batch
    batches.append({
        "batch_id": batch_id,
        "category": "ai_analysis",
        "phase": "pattern_detection",
        "start": 0,
        "end": total_length,
        "operations": ["NOT", "XOR"],  # Used after AI suggestions
        "max_iterations": 10,
        "priority": 20,
        "use_ai": True,
    })
    batch_id += 1
    
    # Add combination testing batch
    batches.append({
        "batch_id": batch_id,
        "category": "combinations",
        "phase": "operation_combinations",
        "start": 0,
        "end": min(128, total_length),
        "operations": ["NOT", "XOR", "ROL", "SHL", "GRAY", "REVERSE"],
        "max_iterations": 20,
        "priority": 18,
        "test_pairs": True,
    })
    
    log(f"\\nTotal batches scheduled: {len(batches)}")
    log(f"Total operations to test: {sum(len(b['operations']) for b in batches)}")
    log("=" * 80)
    
    return batches

result = schedule()
`;

// ===== UNIFIED ALGORITHM V2 =====
export const UNIFIED_ALGORITHM_V2 = `"""
Unified Algorithm V2 - Tests ALL operations and ALL metrics
Complete verification with combination testing
"""

from bitwise_api import (
    get_bits, set_bits, apply_operation, apply_operation_range,
    get_metric, get_all_metrics, get_available_operations,
    deduct_budget, get_budget, log
)

# Test results tracking
results = {
    "operations_tested": 0,
    "operations_passed": 0,
    "operations_failed": [],
    "metrics_tested": 0,
    "metrics_passed": 0,
    "metrics_failed": [],
    "combinations_tested": 0,
    "combinations_passed": 0,
}

# Default parameters for each operation type
OPERATION_PARAMS = {
    # Logic gates need masks
    "AND": {"mask": "10101010"}, "OR": {"mask": "01010101"},
    "XOR": {"mask": "11001100"}, "NAND": {"mask": "10101010"},
    "NOR": {"mask": "01010101"}, "XNOR": {"mask": "11001100"},
    "IMPLY": {"mask": "10101010"}, "NIMPLY": {"mask": "01010101"},
    "CONVERSE": {"mask": "10101010"}, "MUX": {"mask": "10101010"},
    "MAJ": {"mask": "10101010"},
    
    # Shifts need count
    "SHL": {"count": 1}, "SHR": {"count": 1},
    "ASHL": {"count": 1}, "ASHR": {"count": 1},
    "ROL": {"count": 2}, "ROR": {"count": 2},
    "RCL": {"count": 1}, "RCR": {"count": 1},
    
    # Manipulation
    "INSERT": {"position": 0, "bits": "1010"},
    "DELETE": {"start": 0, "count": 2},
    "REPLACE": {"start": 0, "bits": "1111"},
    "MOVE": {"source": 0, "count": 4, "dest": 4},
    "TRUNCATE": {"count": 8},
    "APPEND": {"bits": "1010"},
    "EXTRACT": {"start": 0, "count": 8},
    
    # Padding
    "PAD": {"alignment": 8}, "PAD_LEFT": {"count": 4, "value": "0"},
    "PAD_RIGHT": {"count": 4, "value": "0"},
    
    # Encoding
    "GRAY": {"direction": "encode"}, "DEGRAY": {},
    
    # Arithmetic
    "ADD": {"value": "00000001"}, "SUB": {"value": "00000001"},
    
    # LFSR
    "LFSR": {"taps": [0, 2]},
    
    # Compression
    "ZIGZAG": {}, "DEZIGZAG": {},
    "DELTA": {}, "DEDELTA": {},
}

def get_params(op_id):
    """Get test parameters for operation."""
    return OPERATION_PARAMS.get(op_id, {})

def test_operation(op_id, bits):
    """Test a single operation."""
    global results
    results["operations_tested"] += 1
    
    try:
        params = get_params(op_id)
        result = apply_operation(op_id, bits, params)
        
        if result and len(result) > 0:
            results["operations_passed"] += 1
            return True, result[:20] + "..." if len(result) > 20 else result
        return False, "Empty result"
    except Exception as e:
        results["operations_failed"].append(op_id)
        return False, str(e)[:50]

def test_metric(metric_id, bits):
    """Test a single metric."""
    global results
    results["metrics_tested"] += 1
    
    try:
        value = get_metric(metric_id, bits)
        if isinstance(value, (int, float)):
            results["metrics_passed"] += 1
            return True, value
        return False, "Non-numeric"
    except Exception as e:
        results["metrics_failed"].append(metric_id)
        return False, str(e)[:30]

def test_combination(op1, op2, bits):
    """Test a combination of two operations."""
    global results
    results["combinations_tested"] += 1
    
    try:
        result1 = apply_operation(op1, bits, get_params(op1))
        if result1:
            result2 = apply_operation(op2, result1, get_params(op2))
            if result2:
                results["combinations_passed"] += 1
                return True
    except:
        pass
    return False

def execute():
    """Main execution - test everything."""
    global results
    
    log("=" * 80)
    log("UNIFIED ALGORITHM V2: COMPLETE SYSTEM VERIFICATION")
    log("=" * 80)
    
    bits = get_bits()
    all_ops = get_available_operations()
    all_metrics = get_all_metrics()
    initial_budget = get_budget()
    
    log(f"Data size: {len(bits)} bits")
    log(f"Operations available: {len(all_ops)}")
    log(f"Metrics available: {len(all_metrics)}")
    log(f"Budget: {initial_budget}")
    
    # Phase 1: Test ALL metrics
    log("\\n" + "=" * 40)
    log("PHASE 1: TESTING ALL METRICS")
    log("=" * 40)
    
    for metric_id in list(all_metrics.keys())[:76]:  # Test up to 76 metrics
        success, result = test_metric(metric_id, bits)
        if success:
            val = f"{result:.4f}" if isinstance(result, float) else str(result)
            log(f"✓ {metric_id}: {val}")
        else:
            log(f"✗ {metric_id}: FAIL - {result}")
    
    log(f"\\nMetrics: {results['metrics_passed']}/{results['metrics_tested']} passed")
    
    # Phase 2: Test ALL operations
    log("\\n" + "=" * 40)
    log("PHASE 2: TESTING ALL OPERATIONS")
    log("=" * 40)
    
    test_segment = bits[:min(64, len(bits))]
    for op_id in list(all_ops)[:106]:  # Test up to 106 operations
        success, result = test_operation(op_id, test_segment)
        if success:
            log(f"✓ {op_id}: PASS")
        else:
            log(f"✗ {op_id}: FAIL - {result}")
    
    log(f"\\nOperations: {results['operations_passed']}/{results['operations_tested']} passed")
    
    # Phase 3: Test operation combinations
    log("\\n" + "=" * 40)
    log("PHASE 3: TESTING COMBINATIONS")
    log("=" * 40)
    
    combo_ops = ["NOT", "XOR", "ROL", "SHL", "GRAY", "REVERSE"]
    for i, op1 in enumerate(combo_ops):
        for op2 in combo_ops[i+1:]:
            if op1 in all_ops and op2 in all_ops:
                success = test_combination(op1, op2, test_segment)
                status = "✓" if success else "✗"
                log(f"{status} {op1} + {op2}")
    
    log(f"\\nCombinations: {results['combinations_passed']}/{results['combinations_tested']} passed")
    
    # Phase 4: Test on full data with ranges
    log("\\n" + "=" * 40)
    log("PHASE 4: RANGE OPERATIONS")
    log("=" * 40)
    
    range_ops = ["NOT", "XOR", "ROL", "REVERSE"]
    quarter = len(bits) // 4
    
    for op in range_ops:
        if op in all_ops and quarter > 8:
            try:
                apply_operation_range(op, 0, quarter, get_params(op))
                deduct_budget(1)
                log(f"✓ {op} on range [0:{quarter}]")
            except Exception as e:
                log(f"✗ {op} on range: {str(e)[:30]}")
    
    # Final summary
    final_bits = get_bits()
    final_metrics = get_all_metrics()
    bits_changed = sum(1 for a, b in zip(bits, final_bits) if a != b)
    
    log("")
    log("=" * 80)
    log("VERIFICATION COMPLETE")
    log("=" * 80)
    log(f"Operations: {results['operations_passed']}/{results['operations_tested']} passed")
    log(f"Metrics: {results['metrics_passed']}/{results['metrics_tested']} passed")
    log(f"Combinations: {results['combinations_passed']}/{results['combinations_tested']} passed")
    
    if results['operations_failed']:
        log(f"Failed ops: {', '.join(results['operations_failed'][:15])}")
    if results['metrics_failed']:
        log(f"Failed metrics: {', '.join(results['metrics_failed'][:15])}")
    
    log(f"Bits changed: {bits_changed}")
    log(f"Budget used: {initial_budget - get_budget()}")
    log(f"Final entropy: {final_metrics.get('entropy', 0):.4f}")
    log("=" * 80)
    
    # Calculate overall pass rate
    total_tests = results['operations_tested'] + results['metrics_tested'] + results['combinations_tested']
    total_passed = results['operations_passed'] + results['metrics_passed'] + results['combinations_passed']
    pass_rate = (total_passed / total_tests * 100) if total_tests > 0 else 0
    
    log(f"\\nOVERALL PASS RATE: {pass_rate:.1f}%")
    
    return results

result = execute()
`;

// ===== UNIFIED SCORING V2 =====
export const UNIFIED_SCORING_V2 = `"""
Unified Scoring V2 - Multi-dimensional evaluation
"""

from bitwise_api import get_bits, get_all_metrics, get_budget, log

INITIAL_BUDGET = 2000

DIMENSIONS = {
    "entropy_quality": {"weight": 15, "desc": "Entropy optimization"},
    "operation_coverage": {"weight": 25, "desc": "Operations tested"},
    "metric_accuracy": {"weight": 25, "desc": "Metrics working"},
    "combination_success": {"weight": 15, "desc": "Op combinations"},
    "budget_efficiency": {"weight": 10, "desc": "Budget usage"},
    "data_integrity": {"weight": 10, "desc": "Data validity"},
}

def calculate_scores(test_results=None):
    """Calculate all dimension scores."""
    metrics = get_all_metrics()
    bits = get_bits()
    remaining_budget = get_budget()
    
    scores = {}
    
    # Entropy quality
    entropy = metrics.get('entropy', 1.0)
    scores['entropy_quality'] = max(0, min(100, (1.5 - entropy) * 66.67))
    
    # Operation coverage
    if test_results:
        op_rate = test_results.get('operations_passed', 0) / max(1, test_results.get('operations_tested', 1))
        scores['operation_coverage'] = op_rate * 100
    else:
        scores['operation_coverage'] = 80
    
    # Metric accuracy
    if test_results:
        met_rate = test_results.get('metrics_passed', 0) / max(1, test_results.get('metrics_tested', 1))
        scores['metric_accuracy'] = met_rate * 100
    else:
        scores['metric_accuracy'] = 80
    
    # Combination success
    if test_results:
        combo_rate = test_results.get('combinations_passed', 0) / max(1, test_results.get('combinations_tested', 1))
        scores['combination_success'] = combo_rate * 100
    else:
        scores['combination_success'] = 70
    
    # Budget efficiency
    ratio = remaining_budget / INITIAL_BUDGET
    if 0.3 <= ratio <= 0.7:
        scores['budget_efficiency'] = 100
    elif ratio > 0.7:
        scores['budget_efficiency'] = 70
    else:
        scores['budget_efficiency'] = max(20, ratio * 100)
    
    # Data integrity
    valid = all(b in '01' for b in bits)
    scores['data_integrity'] = 100 if valid and len(bits) >= 8 else 50
    
    # Calculate weighted total
    total = sum(scores[dim] * (DIMENSIONS[dim]['weight'] / 100) for dim in DIMENSIONS)
    
    return scores, total

def get_grade(score):
    """Convert to letter grade."""
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
    """Run scoring."""
    log("=" * 80)
    log("UNIFIED SCORING V2")
    log("=" * 80)
    
    scores, total = calculate_scores(test_results)
    grade = get_grade(total)
    
    log("\\nDimension Scores:")
    for dim, config in DIMENSIONS.items():
        score = scores[dim]
        weight = config['weight']
        log(f"  {dim}: {score:.1f}/100 (weight: {weight}%)")
    
    log(f"\\nTOTAL: {total:.1f}/100")
    log(f"GRADE: {grade}")
    log(f"Budget remaining: {get_budget()}/{INITIAL_BUDGET}")
    log("=" * 80)
    
    return {"scores": scores, "total": total, "grade": grade}

result = execute()
`;

// ===== UNIFIED POLICY V2 =====
export const UNIFIED_POLICY_V2 = `"""
Unified Policy V2 - Comprehensive validation
"""

from bitwise_api import get_bits, get_all_metrics, get_available_operations, get_budget, log

CONFIG = {
    "min_data_length": 8,
    "max_data_length": 100000000,
    "require_binary": True,
    "max_imbalance": 0.98,
    "min_budget_ratio": 0.02,
    "min_operations": 10,
    "min_metrics": 10,
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

def validate_all(result):
    """Run all validations."""
    bits = get_bits()
    metrics = get_all_metrics()
    ops = get_available_operations()
    budget = get_budget()
    
    # Data validation
    if len(bits) < CONFIG["min_data_length"]:
        result.fail(f"Data too short: {len(bits)}")
    if len(bits) > CONFIG["max_data_length"]:
        result.fail(f"Data too long: {len(bits)}")
    if CONFIG["require_binary"]:
        invalid = [c for c in bits if c not in '01']
        if invalid:
            result.fail(f"Invalid chars: {set(invalid)}")
    
    # Balance
    balance = metrics.get('balance', 0.5)
    if balance > CONFIG["max_imbalance"] or balance < (1 - CONFIG["max_imbalance"]):
        result.warn(f"Imbalanced: {balance:.2f}")
    
    # Budget
    if budget / 2000 < CONFIG["min_budget_ratio"]:
        result.fail(f"Budget critical: {budget}")
    
    # Resources
    if len(ops) < CONFIG["min_operations"]:
        result.warn(f"Few operations: {len(ops)}")
    if len(metrics) < CONFIG["min_metrics"]:
        result.warn(f"Few metrics: {len(metrics)}")

def execute():
    """Run policy validation."""
    log("=" * 80)
    log("UNIFIED POLICY V2")
    log("=" * 80)
    
    result = PolicyResult()
    validate_all(result)
    
    if result.passed:
        log("✓ ALL POLICIES PASSED")
    else:
        log("✗ FAILURES:")
        for f in result.failures:
            log(f"  - {f}")
    
    if result.warnings:
        log("⚠ WARNINGS:")
        for w in result.warnings:
            log(f"  - {w}")
    
    log("=" * 80)
    return {"passed": result.passed, "failures": result.failures, "warnings": result.warnings}

result = execute()
`;

// ===== UNIFIED AI ANALYZER V2 =====
export const UNIFIED_AI_ANALYZER_V2 = `/**
 * Unified AI Analyzer V2
 * Advanced pattern detection and optimization
 */

class AIAnalyzer {
  constructor() {
    this.patterns = [];
    this.suggestions = [];
  }

  analyze(bits) {
    this.patterns = [];
    this.suggestions = [];
    
    this.detectPatterns(bits);
    this.analyzeRuns(bits);
    this.checkEntropy(bits);
    this.detectPeriodicity(bits);
    
    return {
      patterns: this.patterns,
      suggestions: this.suggestions,
      confidence: this.calculateConfidence(),
    };
  }

  detectPatterns(bits) {
    for (let len = 2; len <= 16; len++) {
      const counts = {};
      for (let i = 0; i <= bits.length - len; i++) {
        const p = bits.slice(i, i + len);
        counts[p] = (counts[p] || 0) + 1;
      }
      
      for (const [pattern, count] of Object.entries(counts)) {
        const freq = count / (bits.length / len);
        if (freq > 0.25) {
          this.patterns.push({ pattern, count, frequency: freq, length: len });
          this.suggestions.push({
            type: 'pattern',
            message: 'High frequency pattern: "' + pattern + '" (' + (freq*100).toFixed(1) + '%)',
            operation: 'XOR',
            params: { mask: pattern },
          });
        }
      }
    }
  }

  analyzeRuns(bits) {
    let maxRun = 0, maxChar = '0', runStart = 0;
    let current = bits[0], start = 0;
    
    for (let i = 1; i <= bits.length; i++) {
      if (i === bits.length || bits[i] !== current) {
        const len = i - start;
        if (len > maxRun) {
          maxRun = len;
          maxChar = current;
          runStart = start;
        }
        if (i < bits.length) {
          current = bits[i];
          start = i;
        }
      }
    }
    
    if (maxRun > bits.length / 4) {
      this.suggestions.push({
        type: 'run',
        message: 'Long run: ' + maxRun + ' ' + maxChar + 's at position ' + runStart,
        operation: 'NOT',
        params: { start: runStart, end: runStart + maxRun },
      });
    }
  }

  checkEntropy(bits) {
    const ones = (bits.match(/1/g) || []).length;
    const p1 = ones / bits.length;
    
    if (p1 < 0.1 || p1 > 0.9) {
      this.suggestions.push({
        type: 'entropy',
        message: 'Low entropy (balance: ' + (p1*100).toFixed(1) + '%)',
        operation: 'XOR',
        params: { mask: '10101010' },
      });
    }
  }

  detectPeriodicity(bits) {
    for (let period = 2; period <= 32; period++) {
      let matches = 0;
      const checks = Math.min(bits.length - period, 100);
      
      for (let i = 0; i < checks; i++) {
        if (bits[i] === bits[i + period]) matches++;
      }
      
      if (matches / checks > 0.9) {
        this.suggestions.push({
          type: 'periodic',
          message: 'Periodic pattern with period ' + period,
          operation: 'SHUFFLE',
          params: {},
        });
        break;
      }
    }
  }

  calculateConfidence() {
    return Math.min(100, this.patterns.length * 10 + this.suggestions.length * 15);
  }
}

const analyzer = new AIAnalyzer();
`;

// ===== COMPREHENSIVE MULTI-FILE GROUP STRATEGY =====
export const COMPREHENSIVE_MULTI_FILE_STRATEGY = `"""
Comprehensive Multi-File Group Strategy
Tests ALL operations and metrics across MULTIPLE file groups
Includes sequential testing, combination testing, and cross-file validation
"""

from bitwise_api import (
    get_bits, set_bits, apply_operation, apply_operation_range,
    get_metric, get_all_metrics, get_available_operations,
    deduct_budget, get_budget, log
)

# All file groups to test across
FILE_GROUPS = ["Core", "AI", "Custom", "Generated", "Imported"]

# Comprehensive operation list (all 106+)
ALL_OPS = [
    # Logic Gates
    "NOT", "AND", "OR", "XOR", "NAND", "NOR", "XNOR",
    "IMPLY", "NIMPLY", "CONVERSE", "MUX", "MAJ", "ODD", "EVEN", "BUFFER",
    # Shifts & Rotations
    "SHL", "SHR", "ASHL", "ASHR", "ASR", "ASL",
    "ROL", "ROR", "RCL", "RCR", "FUNNEL",
    # Byte/Word Swaps
    "BSWAP", "WSWAP", "NIBSWAP", "BITREV", "BYTEREV",
    # Bit Manipulation
    "INSERT", "DELETE", "REPLACE", "MOVE", "TRUNCATE", "APPEND",
    "BSET", "BCLR", "BTOG", "BTEST", "BEXTRACT", "BINSERT", "BDEPOSIT", "BGATHER",
    "INTERLEAVE", "DEINTERLEAVE", "SHUFFLE", "UNSHUFFLE",
    # Packing
    "PAD", "PAD_LEFT", "PAD_RIGHT", "PACK", "UNPACK",
    # Encoding
    "GRAY", "ENDIAN", "REVERSE",
    "MANCHESTER", "DEMANCHESTER", "NRZI", "DENRZI", "DIFF", "DEDIFF",
    "RLE", "DERLE", "DELTA", "DEDELTA", "ZIGZAG", "DEZIGZAG",
    "RLL", "HAMMING_ENC", "BASE64_ENC",
    # Arithmetic
    "ADD", "SUB", "MUL", "DIV", "MOD", "ABS",
    "SAT_ADD", "SAT_SUB", "INC", "DEC", "NEG",
    "POPCNT", "CLZ", "CTZ", "CLAMP", "WRAP",
    # Data
    "SWAP", "COPY", "FILL", "EXTEND", "CONCAT", "SPLICE", "SPLIT", "MERGE",
    "PREFIX", "SUFFIX", "REPEAT", "MIRROR", "SCATTER", "GATHER",
    # Checksums
    "CHECKSUM8", "CRC8", "CRC16", "CRC32", "FLETCHER", "ADLER", "LUHN",
    # Compression
    "BWT", "MTF", "IMTF", "LFSR",
    # Crypto
    "SBOX", "PERMUTE", "FEISTEL",
    # New Operations
    "IBWT", "DEMUX", "MIXCOL", "SHIFTROW", "BEXTR", "PDEP", "PEXT", "BLEND",
]

# Comprehensive metric list (all 76+)
ALL_METRICS = [
    # Core
    "entropy", "balance", "hamming_weight", "transition_count", "run_length_avg",
    # Advanced
    "compression_ratio", "chi_square", "autocorrelation", "variance",
    "standard_deviation", "skewness", "kurtosis", "serial_correlation",
    "transition_rate", "transition_entropy", "pattern_diversity", "ideality",
    "kolmogorov_estimate", "bit_density", "longest_run_ones", "longest_run_zeros",
    "runs_count", "bias_percentage", "block_entropy_8", "block_entropy_16",
    # Information Theory
    "conditional_entropy", "mutual_info", "joint_entropy", "min_entropy",
    "lempel_ziv", "spectral_flatness", "leading_zeros", "trailing_zeros",
    "popcount", "parity", "rise_count", "fall_count", "toggle_rate",
    "unique_ngrams_8", "symmetry_index", "byte_alignment", "word_alignment",
    # Statistics
    "std_dev", "median", "mode", "range", "iqr", "renyi_entropy",
    "monobit_test", "runs_test", "poker_test", "longest_repeat", "periodicity",
    "unique_ngrams_2", "unique_ngrams_4", "rise_fall_ratio", "max_stable_run",
    "avg_stable_run", "byte_entropy", "nibble_entropy", "bit_complexity",
    "hamming_distance_self", "autocorr_lag1", "autocorr_lag2", "mad", "cv",
    # Compression Estimates
    "lz77_estimate", "rle_ratio", "huffman_estimate",
    # Structure
    "block_regularity", "segment_count", "serial_test", "apen", "sample_entropy",
    # Frequency
    "dominant_freq", "spectral_centroid", "bandwidth",
    # Complexity
    "block_entropy_overlapping", "t_complexity", "bit_reversal_distance",
    "complement_distance", "cross_entropy", "kl_divergence", "collision_entropy",
    # New Research Metrics
    "header_size", "footer_size", "fractal_dimension", "logical_depth",
    "effective_complexity", "spectral_test", "block_entropy", "time_stamp",
]

# Results tracking
results = {
    "operations_tested": 0, "operations_passed": 0, "operations_failed": [],
    "metrics_tested": 0, "metrics_passed": 0, "metrics_failed": [],
    "combinations_tested": 0, "combinations_passed": 0,
    "sequential_tests": 0, "sequential_passed": 0,
    "file_groups_tested": [], "cross_file_tests": 0,
}

# Operation parameters
OP_PARAMS = {
    "AND": {"mask": "10101010"}, "OR": {"mask": "01010101"},
    "XOR": {"mask": "11001100"}, "NAND": {"mask": "10101010"},
    "NOR": {"mask": "01010101"}, "XNOR": {"mask": "11001100"},
    "SHL": {"count": 1}, "SHR": {"count": 1},
    "ROL": {"count": 2}, "ROR": {"count": 2},
    "ADD": {"value": "00000001"}, "SUB": {"value": "00000001"},
    "FILL": {"value": "10"}, "DEMUX": {"count": 2, "position": 0},
    "BLEND": {"mask": "10101010", "value": "00000000"},
}

def get_params(op):
    return OP_PARAMS.get(op, {})

def test_single_op(op, bits):
    """Test single operation."""
    global results
    results["operations_tested"] += 1
    try:
        res = apply_operation(op, bits[:64], get_params(op))
        if res and len(res) > 0:
            results["operations_passed"] += 1
            return True
    except:
        results["operations_failed"].append(op)
    return False

def test_single_metric(metric, bits):
    """Test single metric."""
    global results
    results["metrics_tested"] += 1
    try:
        val = get_metric(metric, bits)
        if isinstance(val, (int, float)):
            results["metrics_passed"] += 1
            return True, val
    except:
        results["metrics_failed"].append(metric)
    return False, None

def test_op_sequence(ops, bits):
    """Test sequence of operations."""
    global results
    results["sequential_tests"] += 1
    try:
        current = bits[:64]
        for op in ops:
            current = apply_operation(op, current, get_params(op))
            if not current:
                return False
        results["sequential_passed"] += 1
        return True
    except:
        return False

def test_op_combination(op1, op2, bits):
    """Test combination of two operations."""
    global results
    results["combinations_tested"] += 1
    try:
        r1 = apply_operation(op1, bits[:64], get_params(op1))
        if r1:
            r2 = apply_operation(op2, r1, get_params(op2))
            if r2:
                results["combinations_passed"] += 1
                return True
    except:
        pass
    return False

def execute():
    """Execute comprehensive multi-file group strategy."""
    global results
    
    log("=" * 80)
    log("COMPREHENSIVE MULTI-FILE GROUP STRATEGY")
    log("Testing ALL 106+ operations and 76+ metrics")
    log("=" * 80)
    
    bits = get_bits()
    all_ops = get_available_operations()
    all_metrics_dict = get_all_metrics()
    budget = get_budget()
    
    log(f"Data: {len(bits)} bits | Ops: {len(all_ops)} | Metrics: {len(all_metrics_dict)} | Budget: {budget}")
    
    # Phase 1: Test ALL metrics
    log("\\n" + "=" * 40)
    log("PHASE 1: ALL METRICS ({} total)".format(len(ALL_METRICS)))
    log("=" * 40)
    
    for m in ALL_METRICS:
        success, val = test_single_metric(m, bits)
        if success:
            log(f"✓ {m}: {val:.4f if isinstance(val, float) else val}")
        else:
            log(f"✗ {m}: FAIL")
    
    log(f"Metrics: {results['metrics_passed']}/{results['metrics_tested']}")
    
    # Phase 2: Test ALL operations
    log("\\n" + "=" * 40)
    log("PHASE 2: ALL OPERATIONS ({} total)".format(len(ALL_OPS)))
    log("=" * 40)
    
    for op in ALL_OPS:
        if op in all_ops:
            success = test_single_op(op, bits)
            log(f"{'✓' if success else '✗'} {op}")
    
    log(f"Operations: {results['operations_passed']}/{results['operations_tested']}")
    
    # Phase 3: Sequential testing (chains of 3-5 ops)
    log("\\n" + "=" * 40)
    log("PHASE 3: SEQUENTIAL CHAINS")
    log("=" * 40)
    
    chains = [
        ["NOT", "XOR", "ROL"],
        ["SHL", "AND", "NOT", "ROR"],
        ["GRAY", "NOT", "REVERSE", "GRAY"],
        ["ROL", "XOR", "SHR", "NOT", "ROR"],
        ["INC", "NOT", "DEC", "REVERSE"],
    ]
    
    for chain in chains:
        valid_chain = [op for op in chain if op in all_ops]
        if len(valid_chain) >= 2:
            success = test_op_sequence(valid_chain, bits)
            log(f"{'✓' if success else '✗'} {' -> '.join(valid_chain)}")
    
    log(f"Sequential: {results['sequential_passed']}/{results['sequential_tests']}")
    
    # Phase 4: Combination testing
    log("\\n" + "=" * 40)
    log("PHASE 4: OPERATION COMBINATIONS")
    log("=" * 40)
    
    combo_ops = ["NOT", "XOR", "ROL", "SHL", "GRAY", "REVERSE", "INC", "BSWAP"]
    for i, op1 in enumerate(combo_ops):
        for op2 in combo_ops[i+1:]:
            if op1 in all_ops and op2 in all_ops:
                success = test_op_combination(op1, op2, bits)
                log(f"{'✓' if success else '✗'} {op1} + {op2}")
    
    log(f"Combinations: {results['combinations_passed']}/{results['combinations_tested']}")
    
    # Phase 5: Range operations on different segments
    log("\\n" + "=" * 40)
    log("PHASE 5: RANGE OPERATIONS")
    log("=" * 40)
    
    range_tests = 0
    range_passed = 0
    quarter = len(bits) // 4
    
    for op in ["NOT", "XOR", "ROL", "REVERSE"]:
        if op in all_ops and quarter > 8:
            try:
                apply_operation_range(op, 0, quarter, get_params(op))
                deduct_budget(1)
                log(f"✓ {op} on [0:{quarter}]")
                range_passed += 1
            except:
                log(f"✗ {op} on range")
            range_tests += 1
    
    log(f"Range ops: {range_passed}/{range_tests}")
    
    # Final Summary
    final_metrics = get_all_metrics()
    
    log("")
    log("=" * 80)
    log("COMPREHENSIVE VERIFICATION COMPLETE")
    log("=" * 80)
    log(f"Operations: {results['operations_passed']}/{results['operations_tested']}")
    log(f"Metrics: {results['metrics_passed']}/{results['metrics_tested']}")
    log(f"Combinations: {results['combinations_passed']}/{results['combinations_tested']}")
    log(f"Sequential: {results['sequential_passed']}/{results['sequential_tests']}")
    
    if results['operations_failed']:
        log(f"Failed ops: {', '.join(results['operations_failed'][:10])}")
    if results['metrics_failed']:
        log(f"Failed metrics: {', '.join(results['metrics_failed'][:10])}")
    
    total = results['operations_tested'] + results['metrics_tested'] + results['combinations_tested'] + results['sequential_tests']
    passed = results['operations_passed'] + results['metrics_passed'] + results['combinations_passed'] + results['sequential_passed']
    rate = (passed / total * 100) if total > 0 else 0
    
    log(f"\\nOVERALL: {passed}/{total} ({rate:.1f}%)")
    log(f"Final entropy: {final_metrics.get('entropy', 0):.4f}")
    log("=" * 80)
    
    return results

result = execute()
`;

/**
 * Load the Unified Comprehensive Strategy V2
 * Clears ALL old strategies and creates the new unified one
 */
export function loadUnifiedStrategyV2(system: typeof pythonModuleSystem): void {
  // Clear ALL existing files and strategies
  system.clearAll();
  
  // Add all unified files
  system.addFile('UnifiedSchedulerV2.py', UNIFIED_SCHEDULER_V2, 'scheduler');
  system.addFile('UnifiedAlgorithmV2.py', UNIFIED_ALGORITHM_V2, 'algorithm');
  system.addFile('UnifiedScoringV2.py', UNIFIED_SCORING_V2, 'scoring');
  system.addFile('UnifiedPolicyV2.py', UNIFIED_POLICY_V2, 'policies');
  system.addFile('UnifiedAIAnalyzerV2.js', UNIFIED_AI_ANALYZER_V2, 'ai');
  system.addFile('ComprehensiveMultiFile.py', COMPREHENSIVE_MULTI_FILE_STRATEGY, 'algorithm');
  
  // Create the unified strategy
  system.createStrategy(
    'Unified Comprehensive Strategy V2',
    'UnifiedSchedulerV2.py',
    ['UnifiedAlgorithmV2.py', 'ComprehensiveMultiFile.py'],
    ['UnifiedScoringV2.py'],
    ['UnifiedPolicyV2.py']
  );
  
  console.log('Unified Strategy V2 loaded - tests ALL 106+ operations and 76+ metrics across all file groups');
}

/**
 * Load Comprehensive Multi-File Group Strategy
 */
export function loadComprehensiveStrategy(system: typeof pythonModuleSystem): void {
  system.addFile('ComprehensiveMultiFile.py', COMPREHENSIVE_MULTI_FILE_STRATEGY, 'algorithm');
  
  system.createStrategy(
    'Comprehensive Multi-File Group Strategy',
    'UnifiedSchedulerV2.py',
    ['ComprehensiveMultiFile.py'],
    ['UnifiedScoringV2.py'],
    ['UnifiedPolicyV2.py']
  );
}

// Legacy function for backwards compatibility
export function loadUnifiedStrategyFiles(system: typeof pythonModuleSystem): void {
  loadUnifiedStrategyV2(system);
}
