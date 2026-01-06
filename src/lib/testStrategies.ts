/**
 * Test Strategies - Complete sample files for testing the execution system
 * 
 * HOW THE SYSTEM WORKS:
 * 
 * 1. STRATEGY (Lua/Python/C++)
 *    - The main algorithm that processes binary data
 *    - Uses apply_operation() to modify bits
 *    - Uses get_metric() to check data properties
 *    - Uses get_cost() to check operation costs before applying
 * 
 * 2. SCORING (Lua)
 *    - Defines operation costs (economy model)
 *    - Sets initial budget
 *    - Can define combo discounts for operation pairs
 * 
 * 3. POLICY (Lua)
 *    - Defines rules and constraints
 *    - Whitelist/blacklist operations
 *    - Set max operations limit
 *    - Validate parameters
 * 
 * 4. METRICS (Pre-defined)
 *    - Available via get_metric() in strategies
 *    - entropy, hamming_weight, transitions, etc.
 *    - Enable/disable in UI to control what strategy can access
 * 
 * 5. OPERATIONS (Pre-defined)
 *    - Logic gates: AND, OR, XOR, NOT, NAND, NOR, XNOR
 *    - Shifts: SHL, SHR, ROL, ROR
 *    - Manipulation: INSERT, DELETE, MOVE
 *    - Enable/disable in UI to control what strategy can use
 * 
 * 6. PRESET (JSON)
 *    - Bundles strategy + scoring + policies together
 *    - References files by ID (not name)
 *    - Used for quick loading and Jobs system
 */

import { algorithmManager } from './algorithmManager';

// ============= TEST LUA STRATEGY =============
export const TEST_LUA_STRATEGY = `-- Entropy Reduction Strategy
-- Applies XOR and NOT operations to reduce entropy

function execute()
  log("Starting entropy reduction strategy")
  log("Budget: " .. tostring(budget))
  
  local ops_applied = 0
  local max_ops = 10
  
  while ops_applied < max_ops and budget > 0 do
    -- Apply XOR to reduce patterns
    if is_operation_allowed("XOR") then
      local cost = get_cost("XOR")
      if cost <= budget then
        apply_operation("XOR", {mask = "10101010"})
        ops_applied = ops_applied + 1
        log("Applied XOR, cost: " .. cost)
      else
        log("Insufficient budget for XOR")
        break
      end
    end
    
    -- Apply NOT to invert
    if is_operation_allowed("NOT") then
      local cost = get_cost("NOT")
      if cost <= budget then
        apply_operation("NOT")
        ops_applied = ops_applied + 1
        log("Applied NOT, cost: " .. cost)
      else
        break
      end
    end
    
    -- Apply AND gate
    if is_operation_allowed("AND") then
      local cost = get_cost("AND")
      if cost <= budget then
        apply_operation("AND", {mask = "11110000"})
        ops_applied = ops_applied + 1
        log("Applied AND, cost: " .. cost)
      else
        break
      end
    end
    
    -- Check if target reached
    local entropy = get_metric("entropy")
    if entropy < 0.5 then
      log("Target entropy reached: " .. entropy)
      break
    end
  end
  
  log("Completed. Operations applied: " .. ops_applied)
end

execute()
`;

// ============= TEST PYTHON STRATEGY =============
export const TEST_PYTHON_STRATEGY = `# Pattern Optimization Strategy (Python)
# Uses multiple gate operations to optimize bit patterns

from bitwise_api import apply_operation, get_metric, get_cost, log, is_operation_allowed

def execute():
    log("Starting Python pattern optimization")
    
    ops_count = 0
    
    # Apply a series of gate operations
    operations = ["NOT", "XOR", "AND", "OR", "ROL", "SHR"]
    
    for op in operations:
        if is_operation_allowed(op):
            cost = get_cost(op)
            if cost <= budget:
                apply_operation(op, {})
                ops_count += 1
                log(f"Applied {op}, cost: {cost}")
    
    # Check final metrics
    entropy = get_metric("entropy")
    log(f"Final entropy: {entropy:.4f}")
    log(f"Total operations: {ops_count}")

execute()
`;

// ============= TEST SCORING (COSTS) =============
export const TEST_SCORING_LUA = `-- Scoring Configuration
-- Defines operation costs and economy rules

-- Initial budget for executions
initial_budget = 1000

-- Operation costs
costs = {
  -- Logic gates (cheap)
  NOT = 2,
  AND = 3,
  OR = 3,
  XOR = 4,
  NAND = 5,
  NOR = 5,
  XNOR = 6,
  
  -- Shifts (medium)
  SHL = 5,
  SHR = 5,
  ROL = 6,
  ROR = 6,
  
  -- Manipulation (expensive)
  INSERT = 10,
  DELETE = 10,
  MOVE = 15,
  
  -- Encoding
  GRAY = 8,
  ENDIAN = 7,
  
  -- Arithmetic (most expensive)
  ADD = 12,
  SUB = 12,
  PAD = 4,
}

-- Combo discounts (consecutive operations cost less)
combos = {
  {"NOT", "NOT", 0},   -- Double NOT cancels out = free
  {"XOR", "XOR", 0},   -- Double XOR cancels = free
  {"SHL", "SHR", 3},   -- Shift pair = discount
  {"ROL", "ROR", 4},   -- Rotation pair = discount
}

function get_operation_cost(op_name)
  return costs[op_name] or 10
end

function check_combo(prev_op, current_op)
  for _, combo in ipairs(combos) do
    if combo[1] == prev_op and combo[2] == current_op then
      return combo[3]
    end
  end
  return nil
end
`;

// ============= TEST POLICY =============
export const TEST_POLICY_LUA = `-- Policy Configuration
-- Defines rules and constraints for operations

-- Allowed operations (whitelist)
allowed_operations = {
  "NOT", "AND", "OR", "XOR",
  "NAND", "NOR", "XNOR",
  "SHL", "SHR", "ROL", "ROR",
  "PAD", "GRAY", "ENDIAN"
}

-- Blocked operations (never allowed)
blocked_operations = {
  "DELETE"  -- Prevent data loss
}

-- Maximum operations per execution
max_operations = 100

-- Maximum budget spend per step
max_cost_per_step = 50

-- Constraints
constraints = {
  min_file_size = 8,
  max_file_size = 1000000,
  preserve_length = false,
}

function is_allowed(op_name)
  -- Check blocklist first
  for _, blocked in ipairs(blocked_operations) do
    if blocked == op_name then
      return false, "Operation is blocked by policy"
    end
  end
  
  -- Check allowlist
  for _, allowed in ipairs(allowed_operations) do
    if allowed == op_name then
      return true
    end
  end
  
  return false, "Operation not in allowed list"
end

function validate_params(op_name, params)
  if op_name == "SHL" or op_name == "SHR" then
    local count = params.count or 1
    if count > 32 then
      return false, "Shift count cannot exceed 32"
    end
  end
  return true
end
`;

// ============= GATE OPERATIONS STRATEGY =============
export const GATE_OPERATIONS_STRATEGY = `-- Gate Operations Test Strategy
-- Tests all logic gates systematically

function execute()
  log("Testing all logic gate operations")
  
  local gates = {"NOT", "AND", "OR", "XOR", "NAND", "NOR", "XNOR"}
  local applied = 0
  
  for _, gate in ipairs(gates) do
    if is_operation_allowed(gate) then
      local cost = get_cost(gate)
      if cost <= budget then
        apply_operation(gate, {mask = "11001100"})
        applied = applied + 1
        log("Applied " .. gate .. " gate, cost: " .. cost)
        
        -- Log metrics after each gate
        local entropy = get_metric("entropy")
        local hamming = get_metric("hamming_weight")
        log("  -> Entropy: " .. string.format("%.4f", entropy))
        log("  -> Hamming: " .. tostring(hamming))
      end
    end
  end
  
  log("Gate test complete. Applied " .. applied .. " gates.")
end

execute()
`;

/**
 * Load all test files into the algorithm manager
 */
export function loadTestFiles(): void {
  // Check if test files already exist
  const strategies = algorithmManager.getStrategies();
  const hasTestFiles = strategies.some(s => s.name.startsWith('test_'));
  
  if (hasTestFiles) {
    console.log('Test files already loaded');
    return;
  }

  // Add test Lua strategy
  algorithmManager.addFile('test_entropy.lua', TEST_LUA_STRATEGY, 'strategy');
  
  // Add gate operations strategy
  algorithmManager.addFile('test_gates.lua', GATE_OPERATIONS_STRATEGY, 'strategy');
  
  // Add test scoring
  algorithmManager.addFile('test_scoring.lua', TEST_SCORING_LUA, 'scoring');
  
  // Add test policy
  algorithmManager.addFile('test_policy.lua', TEST_POLICY_LUA, 'policies');

  console.log('Test files loaded successfully');
}

/**
 * Get documentation about how the system works
 */
export function getSystemDocumentation(): string {
  return `
# Algorithm Execution System

## Components

### 1. Strategy (Lua/Python)
The main algorithm that processes binary data.
- **apply_operation(name, params)** - Apply an operation to the bits
- **get_metric(name)** - Get current metric value
- **get_cost(name)** - Get operation cost from scoring
- **is_operation_allowed(name)** - Check if operation is enabled
- **log(message)** - Log execution info

### 2. Scoring (Lua)
Defines the economy/cost model.
- **costs** table - Cost for each operation
- **initial_budget** - Starting budget
- **combos** - Discounts for operation pairs

### 3. Policy (Lua)
Defines rules and constraints.
- **allowed_operations** - Whitelist of operations
- **blocked_operations** - Blacklist of operations
- **max_operations** - Maximum operations per run
- **constraints** - Size limits, etc.

### 4. Metrics (Pre-defined)
Available metrics the strategy can query:
- entropy, compression_ratio, hamming_weight
- transition_count, run_length_avg, balance
- autocorrelation, chi_square, ideality

### 5. Operations (Pre-defined)
Available operations the strategy can apply:
- Logic: AND, OR, XOR, NOT, NAND, NOR, XNOR
- Shifts: SHL, SHR, ROL, ROR
- Manipulation: INSERT, DELETE, MOVE
- Encoding: GRAY, ENDIAN

## Execution Flow

1. Load binary data (Generate or upload)
2. Upload strategy file (Lua or Python)
3. Upload scoring file (Lua)
4. Upload policy file (Lua)
5. Enable required operations and metrics
6. Run the strategy
7. View results and bit access patterns
`;
}
