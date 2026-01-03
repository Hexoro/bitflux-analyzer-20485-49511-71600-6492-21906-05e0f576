/**
 * Complete Working Example Algorithm Files
 * Scheduler, Algorithm, Scoring, Policy - all work together
 * Budget is defined ONLY in the Scoring file
 * AI/TensorFlow.js file examples included
 */

// ===== SCHEDULER =====
export const EXAMPLE_SCHEDULER = `"""
Master Scheduler - Orchestrates execution pipeline
Divides data into segments, tracks iterations, manages workflow
"""

from bitwise_api import get_bits, log, get_all_metrics

def schedule():
    """
    Generate execution batches for the algorithm.
    Returns list of segments to process.
    """
    bits = get_bits()
    total_length = len(bits)
    
    log("=" * 50)
    log("SCHEDULER: Starting execution planning")
    log(f"Total data size: {total_length} bits")
    
    # Get initial metrics
    metrics = get_all_metrics()
    log(f"Initial entropy: {metrics.get('entropy', 0):.4f}")
    
    # Calculate optimal segment size
    if total_length < 64:
        segment_size = total_length
        segments = 1
    elif total_length < 256:
        segment_size = 32
        segments = (total_length + segment_size - 1) // segment_size
    else:
        segment_size = 64
        segments = min(8, (total_length + segment_size - 1) // segment_size)
    
    log(f"Segment size: {segment_size}")
    log(f"Number of segments: {segments}")
    
    # Create batch list
    batches = []
    for i in range(segments):
        start = i * segment_size
        end = min(start + segment_size, total_length)
        batches.append({
            "segment_id": i,
            "start": start,
            "end": end,
            "priority": segments - i,
            "max_iterations": 3
        })
    
    log(f"Scheduled {len(batches)} batches for processing")
    log("=" * 50)
    
    return batches

# Execute scheduler
result = schedule()
log(f"Scheduler complete. Batches: {len(result)}")
`;

// ===== ALGORITHM =====
export const EXAMPLE_ALGORITHM = `"""
Entropy Reduction Algorithm
Applies operations to minimize entropy within segments
Tracks all transformations for analysis
"""

from bitwise_api import (
    get_bits, set_bits, apply_operation, apply_operation_range,
    get_metric, get_all_metrics, get_available_operations,
    deduct_budget, get_budget, log
)

def analyze_segment(start, end):
    """Analyze a segment of the binary data"""
    bits = get_bits()
    segment = bits[start:end]
    
    ones = segment.count('1')
    zeros = segment.count('0')
    balance = ones / len(segment) if len(segment) > 0 else 0.5
    
    return {
        "length": len(segment),
        "ones": ones,
        "zeros": zeros,
        "balance": balance,
        "entropy": get_metric("entropy", segment)
    }

def find_best_operation(start, end):
    """Find the operation that best reduces entropy using apply_operation_range for proper tracking"""
    bits = get_bits()
    segment = bits[start:end]
    current_entropy = get_metric("entropy", segment)
    
    best_op = None
    best_improvement = 0
    
    # Test each operation on a copy (don't modify actual data during search)
    ops = get_available_operations()
    test_ops = ['XOR', 'NOT', 'AND', 'OR', 'left_shift', 'right_shift', 'reverse']
    
    for op in test_ops:
        if op not in ops:
            continue
            
        if not deduct_budget(1):
            log("Budget exhausted during operation search")
            break
        
        try:
            # Test operation on segment copy (doesn't record transformation)
            result = apply_operation(op, segment)
            new_entropy = get_metric("entropy", result)
            improvement = current_entropy - new_entropy
            
            if improvement > best_improvement:
                best_improvement = improvement
                best_op = op
        except Exception as e:
            log(f"Operation {op} failed: {e}")
    
    return best_op, best_improvement

def optimize_segment(start, end, max_iters=3):
    """Apply optimizations to a segment"""
    log(f"\\nOptimizing segment [{start}:{end}]")
    
    analysis = analyze_segment(start, end)
    log(f"  Initial: entropy={analysis['entropy']:.4f}, balance={analysis['balance']:.2f}")
    
    iterations = 0
    total_improvement = 0
    
    while iterations < max_iters and get_budget() > 5:
        best_op, improvement = find_best_operation(start, end)
        
        if best_op and improvement > 0.001:
            log(f"  Iteration {iterations + 1}: Applying {best_op} (improvement: {improvement:.4f})")
            apply_operation_range(best_op, start, end)
            total_improvement += improvement
            iterations += 1
        else:
            log(f"  No further improvement possible")
            break
    
    final_analysis = analyze_segment(start, end)
    log(f"  Final: entropy={final_analysis['entropy']:.4f}, balance={final_analysis['balance']:.2f}")
    log(f"  Total improvement: {total_improvement:.4f}")
    
    return {
        "iterations": iterations,
        "improvement": total_improvement,
        "final_entropy": final_analysis['entropy']
    }

def execute():
    """Main algorithm execution"""
    log("=" * 50)
    log("ALGORITHM: Starting entropy reduction")
    
    bits = get_bits()
    initial_entropy = get_metric("entropy")
    initial_budget = get_budget()
    
    log(f"Data size: {len(bits)} bits")
    log(f"Initial entropy: {initial_entropy:.4f}")
    log(f"Available budget: {initial_budget}")
    
    # Divide into segments
    segment_size = max(8, len(bits) // 4)
    segments = []
    
    for i in range(0, len(bits), segment_size):
        end = min(i + segment_size, len(bits))
        result = optimize_segment(i, end)
        segments.append(result)
    
    # Final analysis
    final_bits = get_bits()
    final_entropy = get_metric("entropy")
    bits_changed = sum(1 for a, b in zip(bits, final_bits) if a != b)
    
    log("")
    log("=" * 50)
    log("ALGORITHM: Execution complete")
    log(f"Final entropy: {final_entropy:.4f}")
    log(f"Entropy reduction: {initial_entropy - final_entropy:.4f}")
    log(f"Bits changed: {bits_changed}")
    log(f"Budget used: {initial_budget - get_budget()}")
    log("=" * 50)
    
    return {
        "initial_entropy": initial_entropy,
        "final_entropy": final_entropy,
        "reduction": initial_entropy - final_entropy,
        "bits_changed": bits_changed,
        "segments_processed": len(segments)
    }

# Run algorithm
result = execute()
`;

// ===== SCORING =====
// NOTE: Budget configuration is defined here, not in UI
export const EXAMPLE_SCORING = `"""
Performance Scoring System
Evaluates algorithm performance based on multiple metrics

*** BUDGET CONFIGURATION ***
This file defines the budget economy:
- Initial budget
- Operation costs
- Efficiency bonuses
"""

from bitwise_api import (
    get_bits, get_metric, get_all_metrics,
    get_budget, log
)

# ============================================
# BUDGET CONFIGURATION (Define budget here!)
# ============================================
INITIAL_BUDGET = 1000

OPERATION_COSTS = {
    "NOT": 1,
    "AND": 2,
    "OR": 2,
    "XOR": 2,
    "NAND": 3,
    "NOR": 3,
    "XNOR": 3,
    "left_shift": 1,
    "right_shift": 1,
    "rotate_left": 2,
    "rotate_right": 2,
    "reverse": 1,
    "invert": 1,
    "swap_pairs": 2,
    "swap_nibbles": 2,
    "mirror": 1,
}

# Combo discounts for chained operations
COMBO_DISCOUNTS = [
    (["NOT", "NOT"], 0.5),      # Double NOT = 50% discount
    (["XOR", "XOR"], 0.5),      # Double XOR = 50% discount
    (["left_shift", "right_shift"], 0.3),  # Shift pair = 30% discount
]

# Budget efficiency bonuses
BUDGET_THRESHOLDS = [
    (0.9, 1.5),   # 90%+ remaining = 1.5x bonus
    (0.7, 1.3),   # 70%+ remaining = 1.3x bonus
    (0.5, 1.1),   # 50%+ remaining = 1.1x bonus
    (0.3, 1.0),   # 30%+ remaining = no penalty
    (0.0, 0.8),   # <30% remaining = 0.8x penalty
]

# Scoring weights
WEIGHTS = {
    "entropy_reduction": 40,
    "compression_potential": 25,
    "bit_balance": 15,
    "budget_efficiency": 20
}

def calculate_entropy_score(metrics):
    """Score based on entropy (lower is better)"""
    entropy = metrics.get('entropy', 1.0)
    score = (1.0 - entropy) * 100
    return max(0, min(100, score))

def calculate_compression_score(metrics):
    """Score based on compression potential"""
    bits = get_bits()
    unique_patterns = len(set(bits[i:i+8] for i in range(0, len(bits)-7, 8)))
    max_patterns = min(256, len(bits) // 8)
    
    if max_patterns == 0:
        return 50
    
    ratio = unique_patterns / max_patterns
    score = (1.0 - ratio) * 100
    return max(0, min(100, score))

def calculate_balance_score(metrics):
    """Score based on bit balance"""
    bits = get_bits()
    if len(bits) == 0:
        return 50
    
    ones_ratio = bits.count('1') / len(bits)
    deviation = abs(ones_ratio - 0.5)
    score = deviation * 200
    return max(0, min(100, score))

def calculate_budget_score():
    """Score based on budget efficiency"""
    remaining = get_budget()
    ratio = remaining / INITIAL_BUDGET if INITIAL_BUDGET > 0 else 0
    
    # Find applicable bonus
    multiplier = 1.0
    for threshold, bonus in BUDGET_THRESHOLDS:
        if ratio >= threshold:
            multiplier = bonus
            break
    
    base_score = ratio * 100
    return base_score * multiplier

def calculate_total_score():
    """Calculate weighted total score"""
    metrics = get_all_metrics()
    
    scores = {
        "entropy_reduction": calculate_entropy_score(metrics),
        "compression_potential": calculate_compression_score(metrics),
        "bit_balance": calculate_balance_score(metrics),
        "budget_efficiency": calculate_budget_score()
    }
    
    weighted_total = sum(
        scores[key] * (WEIGHTS[key] / 100)
        for key in scores
    )
    
    return scores, weighted_total

def execute():
    """Main scoring execution"""
    log("=" * 50)
    log("SCORING: Evaluating performance")
    log(f"Budget Configuration: Initial={INITIAL_BUDGET}")
    
    scores, total = calculate_total_score()
    
    log("")
    log("Component Scores:")
    for key, score in scores.items():
        weight = WEIGHTS[key]
        weighted = score * (weight / 100)
        log(f"  {key}: {score:.2f} (weight: {weight}%, contribution: {weighted:.2f})")
    
    log("")
    log(f"TOTAL SCORE: {total:.2f}")
    
    # Grade
    if total >= 90:
        grade = "A+"
    elif total >= 80:
        grade = "A"
    elif total >= 70:
        grade = "B"
    elif total >= 60:
        grade = "C"
    elif total >= 50:
        grade = "D"
    else:
        grade = "F"
    
    log(f"GRADE: {grade}")
    log("=" * 50)
    
    return {
        "scores": scores,
        "total": total,
        "grade": grade,
        "budget_config": {
            "initial": INITIAL_BUDGET,
            "remaining": get_budget(),
            "operation_costs": OPERATION_COSTS
        }
    }

# Run scoring
result = execute()
log(f"Score: {result['total']:.2f}")
`;

// ===== POLICY =====
export const EXAMPLE_POLICY = `"""
Execution Policy Validator
Enforces constraints and validates algorithm behavior
Checks for violations and safety limits
"""

from bitwise_api import (
    get_bits, get_metric, get_all_metrics,
    get_budget, log
)

# Policy Configuration
POLICY_CONFIG = {
    # Size constraints
    "max_size_multiplier": 2.0,
    "min_size_multiplier": 0.1,
    
    # Entropy constraints
    "max_entropy": 0.999,
    "max_entropy_increase": 0.3,
    
    # Budget constraints (references Scoring budget)
    "min_budget_remaining": 0.05,
    
    # Data integrity
    "require_valid_binary": True,
    "min_length": 8,
    
    # Balance constraints
    "max_imbalance": 0.95,
}

def check_size_policy(bits, initial_size):
    """Check size constraints"""
    current_size = len(bits)
    ratio = current_size / initial_size if initial_size > 0 else 1.0
    
    if ratio > POLICY_CONFIG["max_size_multiplier"]:
        return False, f"Size exceeded: {ratio:.2f}x (max: {POLICY_CONFIG['max_size_multiplier']}x)"
    
    if ratio < POLICY_CONFIG["min_size_multiplier"]:
        return False, f"Size too small: {ratio:.2f}x (min: {POLICY_CONFIG['min_size_multiplier']}x)"
    
    return True, "Size OK"

def check_entropy_policy(metrics, initial_entropy):
    """Check entropy constraints"""
    entropy = metrics.get('entropy', 0)
    
    if entropy > POLICY_CONFIG["max_entropy"]:
        return False, f"Maximum entropy reached: {entropy:.4f}"
    
    increase = entropy - initial_entropy
    if increase > POLICY_CONFIG["max_entropy_increase"]:
        return False, f"Entropy increased too much: +{increase:.4f}"
    
    return True, f"Entropy OK ({entropy:.4f})"

def check_budget_policy(initial_budget=1000):
    """Check budget constraints"""
    remaining = get_budget()
    ratio = remaining / initial_budget if initial_budget > 0 else 0
    
    if ratio < POLICY_CONFIG["min_budget_remaining"]:
        return False, f"Budget nearly exhausted: {ratio*100:.1f}% remaining"
    
    return True, f"Budget OK ({ratio*100:.1f}% remaining)"

def check_data_integrity():
    """Check data integrity"""
    bits = get_bits()
    
    if len(bits) < POLICY_CONFIG["min_length"]:
        return False, f"Data too short: {len(bits)} bits (min: {POLICY_CONFIG['min_length']})"
    
    if POLICY_CONFIG["require_valid_binary"]:
        if not all(b in '01' for b in bits):
            return False, "Invalid binary data (contains non-0/1 characters)"
    
    if len(bits) > 0:
        ones_ratio = bits.count('1') / len(bits)
        if ones_ratio > POLICY_CONFIG["max_imbalance"] or ones_ratio < (1 - POLICY_CONFIG["max_imbalance"]):
            return False, f"Extreme imbalance: {ones_ratio*100:.1f}% ones"
    
    return True, "Data integrity OK"

def validate_all(initial_size=None, initial_entropy=None, initial_budget=1000):
    """Run all policy checks"""
    bits = get_bits()
    metrics = get_all_metrics()
    
    if initial_size is None:
        initial_size = len(bits)
    if initial_entropy is None:
        initial_entropy = metrics.get('entropy', 0.5)
    
    checks = [
        ("Size", check_size_policy(bits, initial_size)),
        ("Entropy", check_entropy_policy(metrics, initial_entropy)),
        ("Budget", check_budget_policy(initial_budget)),
        ("Integrity", check_data_integrity()),
    ]
    
    all_passed = True
    results = []
    
    for name, (passed, message) in checks:
        results.append({
            "check": name,
            "passed": passed,
            "message": message
        })
        if not passed:
            all_passed = False
    
    return all_passed, results

def execute():
    """Main policy execution"""
    log("=" * 50)
    log("POLICY: Running validation checks")
    
    all_passed, results = validate_all()
    
    for result in results:
        status = "✓" if result["passed"] else "✗"
        log(f"  [{status}] {result['check']}: {result['message']}")
    
    log("")
    if all_passed:
        log("POLICY: All checks passed")
    else:
        log("POLICY: Some checks failed - review required")
    log("=" * 50)
    
    return {
        "passed": all_passed,
        "results": results
    }

# Run policy validation
result = execute()
`;

// ===== AI TENSORFLOW.JS EXAMPLE =====
export const EXAMPLE_AI_TENSORFLOW = `/**
 * AI Pattern Recognition using TensorFlow.js
 * Analyzes binary patterns to predict optimal transformations
 * 
 * This file runs in the browser with TensorFlow.js
 * Group: AI
 */

// TensorFlow.js Pattern Analyzer
class BinaryPatternAnalyzer {
  constructor() {
    this.model = null;
    this.patternSize = 8;
    this.historySize = 100;
    this.patterns = [];
  }

  // Convert binary string to tensor-compatible format
  bitsToTensor(bits) {
    const normalized = [];
    for (let i = 0; i < bits.length; i++) {
      normalized.push(bits[i] === '1' ? 1 : 0);
    }
    return normalized;
  }

  // Extract patterns from binary data
  extractPatterns(bits) {
    const patterns = [];
    for (let i = 0; i <= bits.length - this.patternSize; i++) {
      const pattern = bits.slice(i, i + this.patternSize);
      patterns.push(this.bitsToTensor(pattern));
    }
    return patterns;
  }

  // Calculate pattern frequency
  analyzePatternFrequency(bits) {
    const freq = {};
    for (let i = 0; i <= bits.length - this.patternSize; i++) {
      const pattern = bits.slice(i, i + this.patternSize);
      freq[pattern] = (freq[pattern] || 0) + 1;
    }
    return freq;
  }

  // Predict next likely pattern
  predictNextPattern(bits) {
    const lastPattern = bits.slice(-this.patternSize);
    const freq = this.analyzePatternFrequency(bits);
    
    // Find patterns that commonly follow this pattern
    let bestNext = null;
    let bestScore = 0;
    
    for (let i = 0; i < bits.length - this.patternSize * 2; i++) {
      const current = bits.slice(i, i + this.patternSize);
      if (current === lastPattern) {
        const next = bits.slice(i + this.patternSize, i + this.patternSize * 2);
        const score = freq[next] || 0;
        if (score > bestScore) {
          bestScore = score;
          bestNext = next;
        }
      }
    }
    
    return { pattern: bestNext, confidence: bestScore };
  }

  // Suggest operation based on pattern analysis
  suggestOperation(bits) {
    const entropy = this.calculateEntropy(bits);
    const balance = this.calculateBalance(bits);
    const transitions = this.countTransitions(bits);
    
    // Decision logic based on metrics
    if (entropy > 0.95) {
      // High entropy - try XOR with repeating pattern
      return { operation: 'XOR', reason: 'High entropy - apply XOR to reduce' };
    }
    if (balance > 0.7) {
      // Too many 1s - apply AND with alternating mask
      return { operation: 'AND', reason: 'Too many 1s - mask down' };
    }
    if (balance < 0.3) {
      // Too many 0s - apply OR with sparse mask
      return { operation: 'OR', reason: 'Too many 0s - fill up' };
    }
    if (transitions / bits.length > 0.5) {
      // High transitions - group with shifts
      return { operation: 'ROL', reason: 'High transitions - try rotation' };
    }
    
    return { operation: 'NOT', reason: 'Default operation' };
  }

  // Helper: Calculate entropy
  calculateEntropy(bits) {
    if (bits.length === 0) return 0;
    const ones = (bits.match(/1/g) || []).length;
    const p1 = ones / bits.length;
    const p0 = 1 - p1;
    if (p1 === 0 || p1 === 1) return 0;
    return -(p1 * Math.log2(p1) + p0 * Math.log2(p0));
  }

  // Helper: Calculate balance
  calculateBalance(bits) {
    if (bits.length === 0) return 0.5;
    const ones = (bits.match(/1/g) || []).length;
    return ones / bits.length;
  }

  // Helper: Count transitions
  countTransitions(bits) {
    let count = 0;
    for (let i = 1; i < bits.length; i++) {
      if (bits[i] !== bits[i-1]) count++;
    }
    return count;
  }

  // Find optimal segment for transformation
  findOptimalSegment(bits, segmentSize = 64) {
    let bestSegment = { start: 0, end: segmentSize, entropy: 1 };
    
    for (let i = 0; i <= bits.length - segmentSize; i += 8) {
      const segment = bits.slice(i, i + segmentSize);
      const entropy = this.calculateEntropy(segment);
      if (entropy < bestSegment.entropy) {
        bestSegment = { start: i, end: i + segmentSize, entropy };
      }
    }
    
    return bestSegment;
  }

  // Generate operation sequence recommendation
  generateSequence(bits, steps = 5) {
    const sequence = [];
    let currentBits = bits;
    
    for (let i = 0; i < steps; i++) {
      const suggestion = this.suggestOperation(currentBits);
      sequence.push(suggestion);
      
      // Simulate operation effect
      if (suggestion.operation === 'NOT') {
        currentBits = currentBits.split('').map(b => b === '1' ? '0' : '1').join('');
      }
      // Add more operation simulations as needed
    }
    
    return sequence;
  }
}

// Export for use in strategies
const analyzer = new BinaryPatternAnalyzer();

// Main execution function
function execute(bits) {
  console.log('AI Pattern Analyzer initialized');
  console.log('Input size:', bits.length, 'bits');
  
  const patterns = analyzer.extractPatterns(bits);
  console.log('Extracted patterns:', patterns.length);
  
  const suggestion = analyzer.suggestOperation(bits);
  console.log('Suggested operation:', suggestion.operation, '-', suggestion.reason);
  
  const optimalSegment = analyzer.findOptimalSegment(bits);
  console.log('Optimal segment:', optimalSegment);
  
  const sequence = analyzer.generateSequence(bits, 3);
  console.log('Recommended sequence:', sequence);
  
  return {
    patterns: patterns.length,
    suggestion,
    optimalSegment,
    sequence
  };
}

// For testing
if (typeof module !== 'undefined') {
  module.exports = { BinaryPatternAnalyzer, execute };
}
`;

// ===== AI NEURAL NETWORK HELPER =====
export const EXAMPLE_AI_NEURAL = `/**
 * Neural Network Helper for Binary Analysis
 * Builds and trains simple models for pattern prediction
 * 
 * Group: AI
 */

// Simple Neural Network Implementation (no TF.js dependency)
class SimpleNeuralNetwork {
  constructor(inputSize, hiddenSize, outputSize) {
    this.inputSize = inputSize;
    this.hiddenSize = hiddenSize;
    this.outputSize = outputSize;
    
    // Initialize weights with random values
    this.weightsIH = this.randomMatrix(hiddenSize, inputSize);
    this.weightsHO = this.randomMatrix(outputSize, hiddenSize);
    this.biasH = new Array(hiddenSize).fill(0);
    this.biasO = new Array(outputSize).fill(0);
    
    this.learningRate = 0.1;
  }

  randomMatrix(rows, cols) {
    const matrix = [];
    for (let i = 0; i < rows; i++) {
      matrix[i] = [];
      for (let j = 0; j < cols; j++) {
        matrix[i][j] = (Math.random() - 0.5) * 2;
      }
    }
    return matrix;
  }

  sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
  }

  sigmoidDerivative(x) {
    return x * (1 - x);
  }

  // Forward pass
  forward(inputs) {
    // Hidden layer
    this.hiddenOutputs = [];
    for (let i = 0; i < this.hiddenSize; i++) {
      let sum = this.biasH[i];
      for (let j = 0; j < this.inputSize; j++) {
        sum += inputs[j] * this.weightsIH[i][j];
      }
      this.hiddenOutputs[i] = this.sigmoid(sum);
    }
    
    // Output layer
    const outputs = [];
    for (let i = 0; i < this.outputSize; i++) {
      let sum = this.biasO[i];
      for (let j = 0; j < this.hiddenSize; j++) {
        sum += this.hiddenOutputs[j] * this.weightsHO[i][j];
      }
      outputs[i] = this.sigmoid(sum);
    }
    
    return outputs;
  }

  // Train on a single example
  train(inputs, targets) {
    const outputs = this.forward(inputs);
    
    // Calculate output errors
    const outputErrors = [];
    for (let i = 0; i < this.outputSize; i++) {
      outputErrors[i] = targets[i] - outputs[i];
    }
    
    // Calculate hidden errors
    const hiddenErrors = [];
    for (let i = 0; i < this.hiddenSize; i++) {
      let error = 0;
      for (let j = 0; j < this.outputSize; j++) {
        error += outputErrors[j] * this.weightsHO[j][i];
      }
      hiddenErrors[i] = error;
    }
    
    // Update output weights
    for (let i = 0; i < this.outputSize; i++) {
      const gradient = outputErrors[i] * this.sigmoidDerivative(outputs[i]);
      for (let j = 0; j < this.hiddenSize; j++) {
        this.weightsHO[i][j] += this.learningRate * gradient * this.hiddenOutputs[j];
      }
      this.biasO[i] += this.learningRate * gradient;
    }
    
    // Update hidden weights
    for (let i = 0; i < this.hiddenSize; i++) {
      const gradient = hiddenErrors[i] * this.sigmoidDerivative(this.hiddenOutputs[i]);
      for (let j = 0; j < this.inputSize; j++) {
        this.weightsIH[i][j] += this.learningRate * gradient * inputs[j];
      }
      this.biasH[i] += this.learningRate * gradient;
    }
    
    return outputs;
  }

  // Predict next bit based on pattern
  predictNextBit(pattern) {
    const inputs = pattern.split('').map(b => b === '1' ? 1 : 0);
    const outputs = this.forward(inputs);
    return outputs[0] > 0.5 ? '1' : '0';
  }
}

// Binary Pattern Predictor
class PatternPredictor {
  constructor(patternSize = 8) {
    this.patternSize = patternSize;
    this.nn = new SimpleNeuralNetwork(patternSize, patternSize * 2, 1);
    this.trained = false;
  }

  // Train on binary data
  train(bits, epochs = 100) {
    if (bits.length < this.patternSize + 1) return;
    
    for (let epoch = 0; epoch < epochs; epoch++) {
      for (let i = 0; i <= bits.length - this.patternSize - 1; i++) {
        const pattern = bits.slice(i, i + this.patternSize);
        const nextBit = bits[i + this.patternSize];
        
        const inputs = pattern.split('').map(b => b === '1' ? 1 : 0);
        const targets = [nextBit === '1' ? 1 : 0];
        
        this.nn.train(inputs, targets);
      }
    }
    
    this.trained = true;
  }

  // Predict next bit
  predict(pattern) {
    if (!this.trained) return '0';
    return this.nn.predictNextBit(pattern);
  }

  // Generate continuation
  generate(seed, length) {
    let result = seed;
    for (let i = 0; i < length; i++) {
      const pattern = result.slice(-this.patternSize);
      const nextBit = this.predict(pattern);
      result += nextBit;
    }
    return result.slice(seed.length);
  }
}

// Export
const predictor = new PatternPredictor(8);

function execute(bits) {
  console.log('Neural Network Pattern Predictor');
  console.log('Training on', bits.length, 'bits...');
  
  predictor.train(bits, 50);
  
  const testPattern = bits.slice(-8);
  const prediction = predictor.predict(testPattern);
  
  const generated = predictor.generate(testPattern, 16);
  
  console.log('Test pattern:', testPattern);
  console.log('Predicted next bit:', prediction);
  console.log('Generated continuation:', generated);
  
  return { prediction, generated };
}

if (typeof module !== 'undefined') {
  module.exports = { SimpleNeuralNetwork, PatternPredictor, execute };
}
`;

// Full AI Strategy combining all files
export const EXAMPLE_AI_STRATEGY = {
  scheduler: 'MasterScheduler.py',
  algorithm: 'EntropyReduction.py',
  scoring: 'PerformanceScoring.py',
  policy: 'ExecutionPolicy.py',
  ai: [
    { name: 'PatternAnalyzer.js', content: EXAMPLE_AI_TENSORFLOW },
    { name: 'NeuralPredictor.js', content: EXAMPLE_AI_NEURAL }
  ]
};

// Helper function to load all example files (for legacy compatibility)
export const loadExampleAlgorithmFiles = (pythonModuleSystem: any) => {
  pythonModuleSystem.addFile('MasterScheduler.py', EXAMPLE_SCHEDULER, 'scheduler');
  pythonModuleSystem.addFile('EntropyReduction.py', EXAMPLE_ALGORITHM, 'algorithm');
  pythonModuleSystem.addFile('PerformanceScoring.py', EXAMPLE_SCORING, 'scoring');
  pythonModuleSystem.addFile('ExecutionPolicy.py', EXAMPLE_POLICY, 'policies');
};

