# BSEE — Binary Stream Exploration Engine

## Complete Technical Documentation

> **Version**: 2.0 (Unified Strategy V2 with Dual-Runtime Execution)
> **Last Updated**: 2026-03-08
> **Architecture**: React + TypeScript + Vite | Client-side binary research environment

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Core Systems](#3-core-systems)
   - 3.1 [Binary Operations Library](#31-binary-operations-library)
   - 3.2 [Metrics Calculator](#32-metrics-calculator)
   - 3.3 [Operations Router](#33-operations-router)
   - 3.4 [File System Manager](#34-file-system-manager)
   - 3.5 [History Manager](#35-history-manager)
4. [Execution Pipeline](#4-execution-pipeline)
   - 4.1 [Strategy Execution Engine](#41-strategy-execution-engine)
   - 4.2 [Python Executor (Pyodide)](#42-python-executor-pyodide)
   - 4.3 [JavaScript Strategy Runtime](#43-javascript-strategy-runtime)
   - 4.4 [JS Strategy Files (Native Fallback)](#44-js-strategy-files-native-fallback)
   - 4.5 [Sandboxed Execution Layer](#45-sandboxed-execution-layer)
   - 4.6 [No-Op Fail Guard](#46-no-op-fail-guard)
5. [Strategy System](#5-strategy-system)
   - 5.1 [Python Module System](#51-python-module-system)
   - 5.2 [Unified Strategy V2](#52-unified-strategy-v2)
   - 5.3 [Strategy File Types](#53-strategy-file-types)
   - 5.4 [Strategy Lifecycle](#54-strategy-lifecycle)
6. [Replay & Verification](#6-replay--verification)
   - 6.1 [Canonical Replay Engine](#61-canonical-replay-engine)
   - 6.2 [Player Verification](#62-player-verification)
   - 6.3 [Verification System](#63-verification-system)
   - 6.4 [Determinism & Seed Chain](#64-determinism--seed-chain)
7. [Analysis & Metrics](#7-analysis--metrics)
   - 7.1 [Binary Metrics](#71-binary-metrics)
   - 7.2 [Advanced Metrics](#72-advanced-metrics)
   - 7.3 [Ideality Metrics](#73-ideality-metrics)
   - 7.4 [Bitstream Analysis](#74-bitstream-analysis)
   - 7.5 [Anomalies Manager](#75-anomalies-manager)
8. [Results & Reporting](#8-results--reporting)
   - 8.1 [Results Manager](#81-results-manager)
   - 8.2 [Report Generator](#82-report-generator)
   - 8.3 [Result Exporter](#83-result-exporter)
9. [Job System](#9-job-system)
   - 9.1 [Job Queue](#91-job-queue)
   - 9.2 [Job Manager V2](#92-job-manager-v2)
   - 9.3 [Batch Jobs](#93-batch-jobs)
10. [Plugin System](#10-plugin-system)
11. [Data Generation](#11-data-generation)
12. [UI Architecture](#12-ui-architecture)
    - 12.1 [Main Panels](#121-main-panels)
    - 12.2 [File Player (Research Environment)](#122-file-player-research-environment)
    - 12.3 [Algorithm Panel & Strategy Tabs](#123-algorithm-panel--strategy-tabs)
13. [Security Model](#13-security-model)
14. [Testing Infrastructure](#14-testing-infrastructure)
15. [Data Flow Diagrams](#15-data-flow-diagrams)
16. [Diagnostic Logging](#16-diagnostic-logging)
17. [Known Limitations & Future Work](#17-known-limitations--future-work)

---

## 1. Project Overview

BSEE (Binary Stream Exploration Engine) is a **research-grade, client-side binary data analysis and transformation platform**. It provides:

- **106+ binary operations** (logic gates, shifts, rotations, encoding, compression, error correction, arithmetic, advanced bit manipulation)
- **76+ metrics** (entropy, balance, statistical tests, randomness, correlation, compression estimates, ideality)
- **Full strategy execution pipeline** with dual-runtime support (Python via Pyodide, native JavaScript)
- **Deterministic replay** with bit-exact verification for lossless algorithm testing
- **File Player** research environment with step-by-step analysis, verification, breakpoints, and annotations
- **Plugin system** for user-defined operations, metrics, visualizations, and exports
- **Anomaly detection** with customizable detection functions
- **PDF/JSON/CSV reporting** for publication-grade scientific output

### Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Research Integrity** | All operations are real implementations; mock code is strictly prohibited |
| **Determinism** | Seed chains ensure 100% bit-exact replay across executions |
| **Immutability** | All operations return new strings; undo/redo via history snapshots |
| **Security** | Sandboxed execution for all user-defined code; restricted API surface |
| **Extensibility** | Plugin system + custom anomalies + custom operations/metrics |

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        UI LAYER (React)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────────┐  │
│  │ Analysis │ │ Backend  │ │Algorithm │ │   File Player     │  │
│  │  Panel   │ │  Panel   │ │  Panel   │ │(Research Environ.)│  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                    EXECUTION LAYER                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         Strategy Execution Engine                        │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐ │   │
│  │  │  Pyodide   │  │ JS Runtime │  │ Python Fallback    │ │   │
│  │  │ (Primary)  │  │ (Native)   │  │ (Regex Parser)     │ │   │
│  │  └──────┬─────┘  └──────┬─────┘  └──────┬─────────────┘ │   │
│  │         └───────────────┼───────────────┘               │   │
│  │                         ▼                                │   │
│  │              ┌─────────────────────┐                     │   │
│  │              │  Sandboxed Exec     │                     │   │
│  │              │  (Code Validation)  │                     │   │
│  │              └─────────────────────┘                     │   │
│  └──────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                    CORE LIBRARY LAYER                           │
│  ┌───────────────┐ ┌──────────────┐ ┌────────────────────┐     │
│  │  Operations   │ │   Metrics    │ │  Binary Operations │     │
│  │   Router      │ │  Calculator  │ │  (106+ impls)      │     │
│  └───────┬───────┘ └──────┬───────┘ └────────────────────┘     │
│          │                │                                     │
│  ┌───────┴────────────────┴──────────────────────────────┐     │
│  │              Predefined Manager (Registry)             │     │
│  └────────────────────────────────────────────────────────┘     │
├─────────────────────────────────────────────────────────────────┤
│                    DATA LAYER                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐     │
│  │  File    │ │  Results │ │  History  │ │  Python Module│     │
│  │  System  │ │  Manager │ │  Manager  │ │  System       │     │
│  │ Manager  │ │(LocalSt.)│ │           │ │(Strategies)   │     │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘     │
├─────────────────────────────────────────────────────────────────┤
│                VERIFICATION LAYER                               │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────────┐     │
│  │  Canonical   │ │   Player     │ │   Verification     │     │
│  │  Replay      │ │ Verification │ │   System (Hashes)  │     │
│  └──────────────┘ └──────────────┘ └────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

### Runtime Priority Chain

When executing strategy files, the engine follows this priority:

```
1. Pyodide (Full Python)     — Research-grade, deterministic
2. JS Native Equivalent      — Bypasses regex parser, full fidelity
3. Python Fallback (Regex)   — Last resort, limited Python support
```

---

## 3. Core Systems

### 3.1 Binary Operations Library

**File**: `src/lib/binaryOperations.ts` (536 lines)

Provides all 106+ binary operations organized into categories:

| Category | Operations | Count |
|----------|-----------|-------|
| **Logic Gates** | NOT, AND, OR, XOR, NAND, NOR, XNOR | 7 |
| **Extended Logic** | IMPLY, NIMPLY, CONVERSE, MUX, MAJ | 5 |
| **Shifts** | SHL, SHR, ASHL, ASHR | 4 |
| **Rotations** | ROL, ROR, RCL, RCR | 4 |
| **Bit Manipulation** | INSERT, DELETE, REPLACE, MOVE, TRUNCATE, APPEND, SWAP, EXTRACT | 8 |
| **Packing** | PAD, PAD_LEFT, PAD_RIGHT, UNPAD, ALIGN | 5 |
| **Encoding** | GRAY, DEGRAY, ENDIAN, REVERSE, MANCHESTER, DIFF, NRZI, RLL | 12 |
| **Compression** | RLE, DELTA, ZIGZAG, BWT, MTF (+ inverses) | 10 |
| **Error Correction** | HAMMING_ENC, HAMMING_DEC, CRC8, CRC16, CRC32 | 5 |
| **Base Encoding** | BASE64_ENC/DEC, HEX_ENC/DEC | 4 |
| **Arithmetic** | ADD, SUB, INCREMENT, DECREMENT, NEGATE, ABS | 6 |
| **Advanced** | SHUFFLE, LFSR, SBOX, PERMUTE, FEISTEL, SCATTER, GATHER | 10 |
| **Bit Ops** | MIRROR, REVERSE_BYTES, NIBBLE_SWAP, POPCOUNT, CLZ, CTZ, PARITY, BYTESWAP | 12+ |
| **Checksums** | FLETCHER, ADLER, LUHN, CHECKSUM | 4 |

**Key Design Decisions**:
- **Operand Extension**: For two-operand gates (AND, OR, XOR, etc.), the shorter operand is repeated to match the target length: `b.repeat(Math.ceil(a.length / b.length)).substring(0, a.length)`
- **Immutability**: All operations return new strings, never mutating input
- **Organized by class**: `LogicGates`, `ShiftOperations`, `BitManipulation`, `BitPacking`, `ArithmeticOperations`, `AdvancedBitOperations`

### 3.2 Metrics Calculator

**File**: `src/lib/metricsCalculator.ts` (1,349 lines)

Maps 76+ metric IDs to real calculation implementations. Sources:

- `BinaryMetrics` — Core statistics (entropy, balance, run lengths)
- `AdvancedMetricsCalculator` — Statistical tests, n-gram analysis, correlation
- `IdealityMetrics` — Repeating sequence detection
- Custom metrics via sandboxed user code

**Core Metrics** (always available):
- `entropy` — Shannon entropy (0.0–1.0)
- `balance` — Ratio of 1s to total bits
- `hamming_weight` — Population count
- `transition_count` — Number of 0→1 and 1→0 transitions
- `run_length_avg` — Average run length

**API**:
```typescript
calculateMetric(metricId: string, bits: string): MetricResult
calculateAllMetrics(bits: string): AllMetricsResult
getAvailableMetrics(): string[]
hasImplementation(metricId: string): boolean
```

### 3.3 Operations Router

**File**: `src/lib/operationsRouter.ts` (1,486 lines)

Central registry that maps operation IDs to implementations. Connects the predefined operations database (`predefinedManager`) to the actual binary operations library.

**Key Features**:
- **Deterministic seeds**: Each operation generates/stores a seed for reproducible results
- **Mask generation**: Uses seeded pseudo-random for XOR/AND/OR mask operations
- **Cost tracking**: Each operation has an associated budget cost
- **Custom operations**: User-defined operations run via `safeExecute()`

**API**:
```typescript
executeOperation(opId: string, bits: string, params?: OperationParams): OperationResult
getOperationCost(opId: string): number
getAvailableOperations(): string[]
hasImplementation(opId: string): boolean
```

**Seed System**:
```typescript
// Seeds ensure deterministic masks for reproducible replay
function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
```

### 3.4 File System Manager

**File**: `src/lib/fileSystemManager.ts` (344 lines)

Manages multiple binary files with grouping, temporary file lifecycle, and persistence.

```typescript
interface BinaryFile {
  id: string;
  name: string;
  created: Date;
  modified: Date;
  type: 'binary' | 'text';
  state: FileState;       // Wraps BinaryModel
  group?: string;
  isTemp?: boolean;
}
```

- **Persistence**: Files saved to `localStorage` under `bitwise_files`
- **Temp files**: Auto-cleanup after 1 hour, max 10 temp files
- **Groups**: Organize files into named groups (e.g., "Strategy Results")
- **Observer pattern**: Listeners notified on file changes

### 3.5 History Manager

**File**: `src/lib/historyManager.ts` (114 lines)

Tracks all binary edits with auto-grouping of rapid same-type edits (within 30 seconds).

```typescript
interface HistoryEntry {
  id: string;
  timestamp: Date;
  description: string;
  bits: string;              // Full snapshot
  stats?: { totalBits, zeroCount, oneCount, entropy };
}
```

- Max 100 entries
- Manual edits within 30s are merged into a single entry
- Quick stats calculated on each snapshot

---

## 4. Execution Pipeline

### 4.1 Strategy Execution Engine

**File**: `src/lib/strategyExecutionEngine.ts` (785 lines)

The central orchestrator that runs strategy files in sequence:

```
Scheduler → Algorithm(s) → Scoring → Policy
```

**Key responsibilities**:
1. Load source binary file
2. Apply runtime options (budget override, seed, timeout, whitelist/blacklist)
3. Execute each file in order via the appropriate runtime
4. Track transformations, budget consumption, operation counts
5. Apply the **No-Op Fail Guard** (see §4.6)
6. Create result file for File Player
7. Save execution result to `resultsManager`

**Runtime Selection** (in `runStep()`):
```
if (Pyodide unavailable AND JS equivalent exists) → executeJSStrategy()
else → pythonExecutor.sandboxTest() (Pyodide or regex fallback)
```

**Budget System**: Budget is defined in Scoring files (default: 1000). Each operation deducts its cost. The engine tracks budget throughout execution.

### 4.2 Python Executor (Pyodide)

**File**: `src/lib/pythonExecutor.ts` (1,570 lines)

Manages Pyodide lifecycle and provides a bridge between Python strategy code and TypeScript operations/metrics.

**Architecture**:
```
Python Code → bitwise_api (Python bridge) → TypeScript routers → Real implementations
```

**Bridge API** (injected as `bitwise_api` global in Python):
- `apply_operation(op_name, bits, params)` → `executeOperation()`
- `get_metric(metric_name, bits)` → `calculateMetric()`
- `get_all_metrics(bits)` → `calculateAllMetrics()`
- `get_cost(op_name)` → `getOperationCost()`
- `get_budget()` / `deduct_budget(amount)`
- `log(msg)` — Captures execution logs
- `get_bits()` / `set_bits(new_bits)`

**Fallback Mode**: When Pyodide is unavailable, a regex-based Python interpreter parses basic constructs (for loops, if/else, variable assignment, function calls). This is fragile and limited—the JS Native path is preferred.

### 4.3 JavaScript Strategy Runtime

**File**: `src/lib/jsStrategyRuntime.ts` (273 lines)

Executes JavaScript strategy code in a sandboxed environment with the same API bridge as the Python executor.

**API Object** (mirrors `bitwise_api`):
```typescript
const api = {
  apply_operation(opName, bits?, params?),
  apply_operation_range(opName, start, end, params?),
  get_metric(metricName, bits?),
  get_all_metrics(bits?),
  get_cost(opName),
  get_available_operations(),
  get_available_metrics(),
  get_budget(),
  deduct_budget(amount),
  log(msg),
  get_bits(),
  set_bits(newBits),
  get_bits_length(),
};
```

**Execution**:
```typescript
safeExecute(
  ['api', 'bits', 'budget', 'operations', 'metrics', 'seed'],
  jsCode,
  [api, context.bits, context.budget, context.operations, context.metrics, context.seed]
);
```

Each `apply_operation` call:
1. Executes via `operationsRouter`
2. Records a full `TransformationRecord` with before/after bits, cost, duration, metrics snapshot
3. Deducts budget

### 4.4 JS Strategy Files (Native Fallback)

**File**: `src/lib/jsStrategyFiles.ts` (320 lines)

Pre-written JavaScript equivalents of the unified Python strategy files. These are the **primary fallback** when Pyodide is unavailable, bypassing the fragile regex parser entirely.

| Python File | JS Equivalent | Purpose |
|-------------|---------------|---------|
| `UnifiedSchedulerV2.py` | `JS_UNIFIED_SCHEDULER` | System setup, reports available ops/metrics |
| `UnifiedAlgorithmV2.py` | `JS_UNIFIED_ALGORITHM` | Tests ALL operations + metrics + combinations + ranges |
| `UnifiedScoringV2.py` | `JS_UNIFIED_SCORING` | Scores across 6 dimensions with weighted totals |
| `UnifiedPolicyV2.py` | `JS_UNIFIED_POLICY` | Validates data integrity, budget, balance |

**Mapping function**:
```typescript
getJSEquivalent(pythonFileName: string): { name, content, type } | null
```

Supports both V2 names (`UnifiedAlgorithmV2.py`) and non-V2 names (`UnifiedAlgorithm.py`).

### 4.5 Sandboxed Execution Layer

**File**: `src/lib/sandboxedExec.ts` (125 lines)

All user-defined JavaScript (strategy code, custom metrics, custom operations, console commands) runs through this security layer.

**Blocked Patterns** (36 patterns):
- Network: `fetch`, `XMLHttpRequest`, `WebSocket`, `Worker`
- Storage: `localStorage`, `sessionStorage`, `IndexedDB`, `cookies`
- DOM: `document`, `window`, `navigator`, `location`
- Escape: `eval()`, `Function()`, `import()`, `postMessage`
- Frames: `parent`, `top`, `self`, `frames`

**Execution**:
1. Strip comments from code
2. Validate against all blocked patterns
3. Create `new Function()` with shadowed globals as `undefined` parameters
4. Execute in strict mode

```typescript
// Shadowed globals become undefined in the sandbox
const shadowedGlobals = ['window', 'document', 'globalThis', 'fetch', ...];
const fn = new Function(...paramNames, ...shadowedGlobals, `"use strict";\n${body}`);
fn(...args, ...Array(shadowedGlobals.length).fill(undefined));
```

### 4.6 No-Op Fail Guard

Implemented in `strategyExecutionEngine.ts` at the end of the execution pipeline:

```typescript
if (totalOperations > 0 && totalBitsChanged === 0) {
  const noOpOps = allTransformations
    .filter(t => t.bitsChanged === 0)
    .map(t => t.operation);
  throw new Error(
    `Execution produced no changes: ${totalOperations} operations ran but 0 bits were modified.`
  );
}
```

This prevents **silent execution failures** where operations appear to succeed but return identity results (no actual bit changes). The error message identifies the specific no-op operations.

---

## 5. Strategy System

### 5.1 Python Module System

**File**: `src/lib/pythonModuleSystem.ts` (378 lines)

Manages strategy files and configurations. Files are organized into groups:

| Group | Purpose |
|-------|---------|
| `scheduler` | Pipeline orchestration, batch definitions |
| `algorithm` | Core transformation logic |
| `scoring` | Budget allocation, scoring dimensions |
| `policies` | Validation rules, data integrity checks |
| `ai` | ML model strategy files |
| `custom` | User-defined files |

**Strategy Configuration**:
```typescript
interface StrategyConfig {
  id: string;
  name: string;
  schedulerFile: string;      // Exactly 1 required
  algorithmFiles: string[];   // 1+ algorithm files
  scoringFiles: string[];     // 1+ scoring files (define budget)
  policyFiles: string[];      // 0+ policy files (optional)
  created: Date;
}
```

Storage: `localStorage` keys `bitwise_python_files_v2` and `bitwise_strategies_v3`.

### 5.2 Unified Strategy V2

**File**: `src/lib/unifiedStrategy.ts` (1,089 lines)

The master strategy definition that tests **all** 106+ operations and **all** 76+ metrics. Contains:

- `ALL_OPERATIONS` — Complete operation ID list
- `ALL_METRICS` — Complete metric ID list
- `OPERATION_PARAMS` — Default parameter sets for each operation
- Strategy file generators (Python and JS)

### 5.3 Strategy File Types

**Scheduler** — Runs first. Sets up the execution context:
- Reports available operations, metrics, data size
- May define batch parameters

**Algorithm** — The core transformation engine:
- Phase 1: Test all metrics (read-only)
- Phase 2: Test all operations (applies transformations)
- Phase 3: Test operation combinations
- Phase 4: Test range-based operations

**Scoring** — Evaluates execution quality across 6 dimensions:
| Dimension | Weight | Description |
|-----------|--------|-------------|
| entropy_quality | 15% | How close entropy is to target |
| operation_coverage | 25% | Percentage of operations that succeeded |
| metric_accuracy | 25% | Percentage of metrics that returned valid values |
| combination_success | 15% | Multi-operation pipeline success rate |
| budget_efficiency | 10% | Budget utilization (sweet spot: 30-70%) |
| data_integrity | 10% | Valid binary data maintained throughout |

**Policy** — Post-execution validation:
- Data length checks (min 8 bits, max 100M bits)
- Character validation (only '0' and '1')
- Balance warnings (extreme imbalance detection)
- Budget depletion alerts

### 5.4 Strategy Lifecycle

```
1. CREATE  → Register files in PythonModuleSystem
2. LINK    → Create StrategyConfig linking files
3. EXECUTE → StrategyExecutionEngine runs pipeline
4. RESULT  → ResultsManager stores execution data
5. REPLAY  → CanonicalReplay reconstructs step-by-step
6. VERIFY  → PlayerVerification validates each step
7. EXPORT  → ReportGenerator creates PDF/JSON/CSV
```

---

## 6. Replay & Verification

### 6.1 Canonical Replay Engine

**File**: `src/lib/canonicalReplay.ts` (225 lines)

The authoritative replay system. **Stored cumulative bits are the source of truth**; re-execution is validation only.

```typescript
interface ReplayStep {
  authoritativeBeforeBits: string;    // From stored result
  authoritativeAfterBits: string;
  authoritativeCumulativeBits: string;
  verified: boolean;
  verificationNote?: string;
  beforeHash: string;
  afterHash: string;
}
```

**Key Principle**: The replay engine never overwrites stored state with re-executed state. If re-execution produces different bits, the discrepancy is flagged via `verificationNote`, but the stored (authoritative) bits are used for playback.

### 6.2 Player Verification

**File**: `src/lib/playerVerification.ts` (249 lines)

Independent **"Source + Mask = Result"** verification for every transformation step.

For each step:
1. Extract source bits (from stored `beforeBits`)
2. Extract operation + parameters
3. Re-execute the operation independently
4. Compare result to stored `afterBits`
5. Report mismatch count and positions

```typescript
interface IndependentVerificationResult {
  passed: boolean;
  expectedBits: string;
  actualBits: string;
  mismatchCount: number;
  mismatchPositions: number[];
  paramsComplete: boolean;
  missingParams: string[];
}
```

**Tolerance**: For lossless algorithm research, 0% tolerance (exact match required). For general use, configurable tolerance (default 0.1%) accounts for floating-point/timing differences.

### 6.3 Verification System

**File**: `src/lib/verificationSystem.ts` (232 lines)

Provides hash-based verification primitives:

```typescript
hashBits(bits: string): string  // Deterministic 8-char hex hash
verifyReplayFromStored(initialBits, steps, expectedFinalBits, tolerancePercent): VerificationResult
```

### 6.4 Determinism & Seed Chain

Operations that involve randomization (mask generation, shuffle, LFSR) use **deterministic seeds**:

1. On first execution, a seed is generated and stored in `TransformationRecord.params.seed`
2. On replay, the stored seed is reused (not regenerated)
3. The `hashSeed()` function converts string seeds to stable integers
4. This ensures bit-exact replay regardless of when/where replay occurs

---

## 7. Analysis & Metrics

### 7.1 Binary Metrics

**File**: `src/lib/binaryMetrics.ts` (258 lines)

Core statistical analysis:
```typescript
BinaryMetrics.analyze(bits: string): BinaryStats
// Returns: totalBits, zeroCount, oneCount, entropy, longestRuns, meanRunLength, compressedSize

BinaryMetrics.findSequences(bits, pattern, minCount): SequenceMatch[]
// Pattern search with position tracking
```

### 7.2 Advanced Metrics

**File**: `src/lib/advancedMetrics.ts` (403 lines)

Statistical and randomness analysis:
- **Statistical**: variance, standard deviation, skewness, kurtosis
- **Randomness**: chi-square test, runs test, serial correlation
- **N-gram**: bigram, trigram, nybble, byte distributions
- **Transition**: transition count, rate, entropy
- **Correlation**: autocorrelation coefficients, block entropy
- **Bias**: local bias region detection, pattern diversity
- **Compression**: multiple compression ratio estimates

### 7.3 Ideality Metrics

**File**: `src/lib/idealityMetrics.ts` (174 lines)

Measures how much of the data consists of repeating sequences:

```typescript
IdealityMetrics.calculateIdeality(
  bits: string,
  windowSize: number,
  startIndex?: number,
  endIndex?: number,
  excludedBitIndices?: Set<number>
): IdealityResult
```

`idealityPercentage` = (bits in repeating sequences / total bits) × 100

### 7.4 Bitstream Analysis

**File**: `src/lib/bitstreamAnalysis.ts` (448 lines)

Advanced pattern matching and correlation:
- Pattern finding with position tracking
- Tokenization and token frequency analysis
- Compression ratio estimation
- Entropy windowing

### 7.5 Anomalies Manager

**File**: `src/lib/anomaliesManager.ts` (443 lines)

User-extensible anomaly detection system:

```typescript
interface AnomalyDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high';
  minLength: number;
  enabled: boolean;
  detectFn: string;  // JavaScript function as string (sandboxed)
}
```

**Built-in Anomalies**: Palindrome detection, and more. Users can add custom detection functions via the Backend panel. All detection code runs through `safeExecute()`.

---

## 8. Results & Reporting

### 8.1 Results Manager

**File**: `src/lib/resultsManager.ts` (626 lines)

LocalStorage-based results database with bookmarking and comparison support.

```typescript
interface ExecutionResultV2 {
  id: string;
  strategyId: string;
  strategyName: string;
  initialBits: string;
  finalBits: string;
  initialMetrics: Record<string, number>;
  finalMetrics: Record<string, number>;
  steps: TransformationStep[];
  seedChain?: string[];
  summary: ExecutionSummary;
}
```

**TransformationStep** (the core data unit for replay):
```typescript
interface TransformationStep {
  index: number;
  operation: string;
  params?: Record<string, any>;
  fullBeforeBits: string;      // Full file state before
  fullAfterBits: string;       // Full file state after
  beforeBits: string;          // Segment operated on
  afterBits: string;           // Segment result
  cumulativeBits?: string;     // Full file state (authoritative)
  bitRanges?: { start, end }[];
  cost?: number;
  metrics: Record<string, number>;
  segmentBitsChanged?: number;
  fullBitsChanged?: number;
  segmentOnly?: boolean;
}
```

### 8.2 Report Generator

**File**: `src/lib/reportGenerator.ts` (823 lines)

Creates professional PDF reports using jsPDF:
- Job execution reports
- Batch analysis reports
- Comprehensive binary analysis with sequences, boundaries, anomalies
- Formatted tables, headers, sections

### 8.3 Result Exporter

**File**: `src/lib/resultExporter.ts`

Exports execution results as:
- **CSV**: Operation history with metrics at each step
- **JSON**: Full execution data for programmatic analysis
- **Journal Export**: Bundled package of all artifacts for publication

---

## 9. Job System

### 9.1 Job Queue

**File**: `src/lib/jobQueue.ts` (269 lines)

Priority-based queue with pause/resume and ETA estimation:

```typescript
type JobPriority = 'low' | 'normal' | 'high' | 'critical';
type JobQueueStatus = 'idle' | 'running' | 'paused' | 'stalled';
```

Features: Priority scheduling, pause/resume per job, progress tracking, stall detection, queue statistics.

### 9.2 Job Manager V2

**File**: `src/lib/jobManagerV2.ts`

Manages job lifecycle (create → queue → run → complete/fail), result storage, and batch coordination.

### 9.3 Batch Jobs

**File**: `src/components/BatchJobsUI.tsx`

UI for creating and managing batches of jobs that run sequentially or in parallel.

---

## 10. Plugin System

**File**: `src/lib/pluginManager.ts` (202 lines)

Extensible plugin architecture supporting four types:

| Type | Description |
|------|-------------|
| `operation` | Custom binary operations |
| `metric` | Custom metrics/analysis |
| `visualization` | Custom data visualizations |
| `export` | Custom export formats |

```typescript
interface Plugin {
  id: string;
  name: string;
  version: string;
  type: PluginType;
  enabled: boolean;
  code: string;         // Sandboxed JavaScript
  config: Record<string, any>;
}
```

Plugins are stored in `localStorage` under `bsee_plugins`. All plugin code executes through the sandboxed execution layer.

---

## 11. Data Generation

**File**: `src/lib/generationPresets.ts` (152 lines)

Binary data generation with four modes:

| Mode | Description |
|------|-------------|
| `random` | Bernoulli/Gaussian/uniform distributions with target entropy |
| `pattern` | Repeating patterns with optional noise |
| `structured` | Templates: zeros, ones, alternating, blocks, gray-code, fibonacci |
| `file-format` | Mock file headers (PNG, JPEG, etc.) with binary payload |

```typescript
interface GenerationConfig {
  mode: 'random' | 'pattern' | 'structured' | 'file-format';
  length: number;
  probability?: number;
  seed?: string;
  distribution?: 'uniform' | 'bernoulli' | 'gaussian';
  pattern?: string;
  template?: 'zeros' | 'ones' | 'alternating' | 'blocks' | 'gray-code' | 'fibonacci';
}
```

Additional presets in `src/lib/expandedPresets.ts` and `src/lib/customPresetsManager.ts`.

---

## 12. UI Architecture

### 12.1 Main Panels

| Component | Purpose |
|-----------|---------|
| `AnalysisPanel` | Primary binary viewer, hex/binary/ASCII views, metrics display |
| `BackendPanel` | System configuration, anomaly definitions, operation guides |
| `AlgorithmPanel` | Strategy management, execution, results comparison |
| `PlayerModePanel` | File Player research environment |
| `Toolbar` | File operations, view controls, generation, export |

### 12.2 File Player (Research Environment)

**Component**: `src/components/PlayerModePanel.tsx`

Five primary tabs:

| Tab | Components | Purpose |
|-----|-----------|---------|
| **Analysis** | `EnhancedDataView`, `EnhancedDiffView`, `EnhancedMaskView` | Binary diff, mask overlay, data inspection |
| **Verify** | `VerificationDashboard` | Independent step verification, chain validation |
| **Metrics** | `EnhancedMetricsTimeline`, `MetricSparklines`, `CostTimeline` | Metric evolution, budget tracking |
| **Code** | `CodeContextView`, `ParameterInspector` | Operation source code, parameter inspection |
| **Data** | `EnhancedStepDetails`, `BitFieldViewer` | Detailed step data, field decomposition |

**Research Tools**:
- `BreakpointManager` — Step-based and metric-based breakpoints
- `CheckpointPanel` — Save/restore execution state snapshots
- `AnnotationSystem` — Attach notes to specific steps
- `RegressionDetector` — Detect metric regressions across steps
- `ErrorSummaryBar` — Aggregate error display

### 12.3 Algorithm Panel & Strategy Tabs

**Component**: `src/components/algorithm/StrategyTabV7.tsx`

Sub-tabs:
- **Manage**: Visual cards for strategies with tagging, pinning, versioning
- **Execute**: Run strategies against selected files
- **Create**: Strategy creation wizard
- **Analytics**: Cross-strategy comparison
- **Snapshots**: Git-like version control with full state capture

---

## 13. Security Model

### Sandboxed Execution

All user-defined code runs through `sandboxedExec.ts`:

1. **Comment stripping** — Prevents bypass via `// fetch(...)` tricks
2. **Pattern validation** — 36 blocked patterns covering network, storage, DOM, eval
3. **Global shadowing** — Dangerous globals passed as `undefined` parameters
4. **Strict mode** — All code runs in `"use strict"`

### What's Allowed in Sandbox

- Pure computation (math, string manipulation, loops, conditionals)
- `api.*` bridge methods (operations, metrics, logging)
- `console.log` (not available — use `api.log` instead)
- Standard JavaScript built-ins (`Math`, `JSON`, `Array`, `Object`, etc.)

### What's Blocked

- Network access (fetch, XHR, WebSocket)
- Storage access (localStorage, sessionStorage, IndexedDB, cookies)
- DOM manipulation (document, window, navigator)
- Code generation (eval, Function, dynamic import)
- Frame access (parent, top, self, frames)
- Worker creation (Worker, SharedWorker, ServiceWorker)

---

## 14. Testing Infrastructure

### Test Suites

| File | Tests | Scope |
|------|-------|-------|
| `src/lib/comprehensiveTestSuite.ts` | 200+ | Full system verification |
| `src/lib/testSuite.ts` | Core | Basic operation/metric tests |
| `src/lib/smokeTests.ts` | Quick | Startup health check |
| `src/lib/playerTestSuite.ts` | Player | Replay accuracy tests |
| `src/lib/playerPipelineTestSuite.ts` | E2E | Generate → Execute → Replay → Verify |
| `src/tests/binaryMetrics.test.ts` | Unit | BinaryMetrics class |
| `src/tests/binaryModel.test.ts` | Unit | BinaryModel class |
| `src/tests/historyManager.test.ts` | Unit | HistoryManager class |

### E2E Pipeline Test

The gold standard test:
```
1. Generate binary data (known seed)
2. Execute strategy (record transformations)
3. Replay from stored results
4. Independently verify each step
5. Assert 100% bit-match between stored and replayed final bits
```

### Workers

- `src/workers/coreTests.worker.ts` — Core test execution in web worker
- `src/workers/extendedTests.worker.ts` — Extended test execution in web worker

---

## 15. Data Flow Diagrams

### Strategy Execution Flow

```
User clicks "Execute"
        │
        ▼
StrategyExecutionEngine.executeStrategy()
        │
        ├─ Load source file from FileSystemManager
        ├─ Calculate initial metrics
        │
        ▼
    ┌─────────────────────┐
    │  For each file in:  │
    │  Scheduler →        │
    │  Algorithm(s) →     │
    │  Scoring →          │
    │  Policy             │
    └────────┬────────────┘
             │
             ▼
    ┌─────────────────────┐
    │     runStep()       │
    │                     │
    │  Pyodide available? │──Yes──▶ pythonExecutor.sandboxTest()
    │         │           │                    │
    │        No           │                    ▼
    │         │           │         Python code → Bridge API
    │         ▼           │         Bridge → operationsRouter
    │  JS equivalent?     │         Router → binaryOperations
    │    │         │      │
    │   Yes       No      │
    │    │         │      │
    │    ▼         ▼      │
    │ executeJS  Python   │
    │ Strategy   fallback │
    │    │       (regex)  │
    │    ▼                │
    │  api.* bridge       │
    │    │                │
    │    ▼                │
    │ operationsRouter    │
    │    │                │
    │    ▼                │
    │ TransformationRecord│
    └────────┬────────────┘
             │
             ▼
    No-Op Fail Guard check
             │
             ▼
    Create result file (FileSystemManager)
    Save to ResultsManager (localStorage)
             │
             ▼
    File Player can replay via CanonicalReplay
```

### Replay & Verification Flow

```
ResultsManager.getResult(id)
        │
        ▼
CanonicalReplay.replayFromResult()
        │
        ├── For each stored TransformationStep:
        │   ├── Use stored cumulativeBits (authoritative)
        │   ├── Re-execute operation (validation only)
        │   ├── Compare re-executed vs stored
        │   └── Flag discrepancies via verificationNote
        │
        ▼
PlayerVerification.verifyAll()
        │
        ├── For each step:
        │   ├── Extract source bits + params
        │   ├── Re-execute independently
        │   ├── Compare expected vs actual
        │   └── Record mismatch positions
        │
        ▼
FullVerificationReport
  ├── passedSteps / failedSteps
  ├── chainVerified (hash comparison)
  └── stepResults[]
```

---

## 16. Diagnostic Logging

Tagged console logs for debugging the full pipeline:

| Tag | Source | Purpose |
|-----|--------|---------|
| `[PYEXEC]` | pythonExecutor | Pyodide execution lifecycle |
| `[PYEXEC-FALLBACK]` | pythonExecutor | Fallback interpreter activation |
| `[FALLBACK-PARSE]` | pythonExecutor | Regex parser line-by-line trace |
| `[BRIDGE]` | pythonExecutor | API bridge calls (operation params, bits) |
| `[OP-ROUTER]` | operationsRouter | Operation execution, bit changes, warnings |
| `[EXEC-ENGINE]` | strategyExecutionEngine | Pipeline orchestration, step results |
| `[EXEC-ENGINE] ⛔` | strategyExecutionEngine | No-op fail guard / JS execution errors |
| `[REPLAY]` | canonicalReplay | Replay step reconstruction |
| `[PLAYER-UI]` | PlayerModePanel | UI state interpretation |

**To debug a silent execution failure**:
1. Open browser console
2. Filter by `[EXEC-ENGINE]` to see pipeline status
3. Check for `⛔` or `⚠` markers
4. Filter by `[OP-ROUTER]` to see individual operation results
5. If zero bits changed, check `[BRIDGE]` for parameter issues

---

## 17. Known Limitations & Future Work

### Current Limitations

| Limitation | Mitigation |
|-----------|------------|
| **Pyodide unavailable in preview** | JS Native fallback provides full coverage |
| **Python regex fallback is fragile** | JS equivalent files bypass it entirely |
| **localStorage size limits** | Large results may hit browser limits (~5-10MB) |
| **Single-threaded execution** | Web Workers available for tests, not yet for strategies |
| **No server-side persistence** | All data in browser localStorage |

### Potential Future Enhancements

- **WebAssembly operations**: Compile hot-path operations to WASM for performance
- **Streaming execution**: Process files larger than memory via chunked pipeline
- **Collaborative mode**: Share strategies and results via cloud backend
- **GPU-accelerated metrics**: Use WebGPU for bulk statistical analysis
- **Differential testing**: Automatically compare Pyodide vs JS execution results
- **Strategy marketplace**: Community-contributed strategy files

---

## Appendix A: File Index

### Core Libraries (`src/lib/`)

| File | Lines | Purpose |
|------|-------|---------|
| `binaryOperations.ts` | 536 | 106+ binary operation implementations |
| `binaryMetrics.ts` | 258 | Core binary statistics |
| `advancedMetrics.ts` | 403 | Statistical and randomness analysis |
| `idealityMetrics.ts` | 174 | Repeating sequence detection |
| `bitstreamAnalysis.ts` | 448 | Pattern matching, tokenization |
| `operationsRouter.ts` | 1,486 | Operation ID → implementation mapping |
| `metricsCalculator.ts` | 1,349 | Metric ID → calculation mapping |
| `pythonExecutor.ts` | 1,570 | Pyodide lifecycle + Python bridge |
| `jsStrategyRuntime.ts` | 273 | JS sandbox execution with API bridge |
| `jsStrategyFiles.ts` | 320 | Native JS strategy file implementations |
| `sandboxedExec.ts` | 125 | Security: code validation + sandboxing |
| `strategyExecutionEngine.ts` | 785 | Pipeline orchestrator |
| `unifiedStrategy.ts` | 1,089 | Unified V2 strategy definitions |
| `pythonModuleSystem.ts` | 378 | Strategy file + config management |
| `fileSystemManager.ts` | 344 | Multi-file management with groups |
| `fileState.ts` | — | Binary file state wrapper |
| `binaryModel.ts` | — | Core binary data model |
| `historyManager.ts` | 114 | Edit history with auto-grouping |
| `resultsManager.ts` | 626 | Results database (localStorage) |
| `canonicalReplay.ts` | 225 | Authoritative replay engine |
| `playerVerification.ts` | 249 | Independent step verification |
| `verificationSystem.ts` | 232 | Hash-based verification primitives |
| `reportGenerator.ts` | 823 | PDF report generation |
| `resultExporter.ts` | — | CSV/JSON export |
| `pluginManager.ts` | 202 | Plugin lifecycle management |
| `anomaliesManager.ts` | 443 | Custom anomaly detection |
| `jobQueue.ts` | 269 | Priority job queue |
| `jobManagerV2.ts` | — | Job lifecycle management |
| `notesManager.ts` | 148 | User notes with tagging |
| `generationPresets.ts` | 152 | Binary data generation configs |
| `predefinedManager.ts` | — | Operation/metric registry |

### Test Files

| File | Purpose |
|------|---------|
| `comprehensiveTestSuite.ts` | 200+ system tests |
| `testSuite.ts` | Core operation/metric tests |
| `smokeTests.ts` | Startup health check |
| `playerTestSuite.ts` | Replay accuracy tests |
| `playerPipelineTestSuite.ts` | Full E2E pipeline test |
| `tests/binaryMetrics.test.ts` | Unit: BinaryMetrics |
| `tests/binaryModel.test.ts` | Unit: BinaryModel |
| `tests/historyManager.test.ts` | Unit: HistoryManager |

---

## Appendix B: How To Add…

### …a New Operation

1. Add implementation to `binaryOperations.ts` in the appropriate class
2. Register in `operationsRouter.ts` `OPERATION_IMPLEMENTATIONS` map
3. Add default params to `unifiedStrategy.ts` `OPERATION_PARAMS`
4. Add to `jsStrategyFiles.ts` `OP_PARAMS_JS` for JS fallback
5. Add to `ALL_OPERATIONS` list in `unifiedStrategy.ts`

### …a New Metric

1. Add calculation function to `binaryMetrics.ts` or `advancedMetrics.ts`
2. Register in `metricsCalculator.ts` `METRIC_IMPLEMENTATIONS` map
3. Add to `ALL_METRICS` list in `unifiedStrategy.ts`

### …a New Anomaly

1. Open Backend panel → Anomalies tab
2. Define: name, category, severity, minimum length
3. Write detection function: `function detect(bits, minLength) { return [...matches]; }`
4. Detection code runs in sandbox — no network/DOM access

### …a New Plugin

1. Open Plugins dialog
2. Select type: operation | metric | visualization | export
3. Write plugin code (sandboxed JavaScript)
4. Enable/disable without deletion
5. Plugins persist in localStorage

---

*This documentation is auto-maintained alongside the codebase. For the latest implementation details, refer to the source files listed in Appendix A.*
