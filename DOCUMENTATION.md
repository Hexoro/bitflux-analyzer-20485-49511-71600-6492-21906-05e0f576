# BSEE — Binary Stream Exploration Engine

## Complete Technical Documentation

> **Version**: 2.0 (Unified Strategy V2 with Dual-Runtime Execution)  
> **Last Updated**: 2026-03-08  
> **Architecture**: React 18 + TypeScript + Vite + Tailwind CSS  
> **Runtime**: Client-side SPA with optional Pyodide (CPython in WebAssembly)  
> **Total Source Lines**: ~25,000+ across 100+ files  

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Overview](#2-architecture-overview)
3. [Binary Operations Library](#3-binary-operations-library)
4. [Operations Router](#4-operations-router)
5. [Metrics Calculator](#5-metrics-calculator)
6. [Binary Metrics (Core)](#6-binary-metrics-core)
7. [Advanced Metrics](#7-advanced-metrics)
8. [Ideality Metrics](#8-ideality-metrics)
9. [Bitstream Analysis](#9-bitstream-analysis)
10. [Binary Model & File State](#10-binary-model--file-state)
11. [File System Manager](#11-file-system-manager)
12. [History Manager](#12-history-manager)
13. [Python Module System](#13-python-module-system)
14. [Python Executor (Pyodide)](#14-python-executor-pyodide)
15. [JavaScript Strategy Runtime](#15-javascript-strategy-runtime)
16. [JS Strategy Files (Native Fallback)](#16-js-strategy-files-native-fallback)
17. [Sandboxed Execution Layer](#17-sandboxed-execution-layer)
18. [Strategy Execution Engine](#18-strategy-execution-engine)
19. [Unified Strategy V2](#19-unified-strategy-v2)
20. [Canonical Replay Engine](#20-canonical-replay-engine)
21. [Player Verification](#21-player-verification)
22. [Verification System](#22-verification-system)
23. [Results Manager](#23-results-manager)
24. [Report Generator](#24-report-generator)
25. [Result Exporter](#25-result-exporter)
26. [Job System](#26-job-system)
27. [Plugin Manager](#27-plugin-manager)
28. [Anomalies Manager](#28-anomalies-manager)
29. [Data Generation](#29-data-generation)
30. [Notes Manager](#30-notes-manager)
31. [Predefined Manager](#31-predefined-manager)
32. [Command Parser](#32-command-parser)
33. [Encoding Functions](#33-encoding-functions)
34. [Audio Utilities](#34-audio-utilities)
35. [Chart Export](#35-chart-export)
36. [UI Components — Main Panels](#36-ui-components--main-panels)
37. [UI Components — Algorithm Panel](#37-ui-components--algorithm-panel)
38. [UI Components — File Player](#38-ui-components--file-player)
39. [UI Components — Backend Panel](#39-ui-components--backend-panel)
40. [UI Components — Dialogs](#40-ui-components--dialogs)
41. [Web Workers](#41-web-workers)
42. [Test Infrastructure](#42-test-infrastructure)
43. [Security Model](#43-security-model)
44. [Data Flow Diagrams](#44-data-flow-diagrams)
45. [Diagnostic Logging](#45-diagnostic-logging)
46. [Complete Operation Reference](#46-complete-operation-reference)
47. [Complete Metric Reference](#47-complete-metric-reference)
48. [Complete Interface Reference](#48-complete-interface-reference)
49. [Complete Function Reference](#49-complete-function-reference)
50. [Configuration & Build](#50-configuration--build)
51. [How-To Guides](#51-how-to-guides)
52. [Known Limitations](#52-known-limitations)
53. [File Index](#53-file-index)

---

## 1. Project Overview

BSEE (Binary Stream Exploration Engine) is a **research-grade, client-side binary data analysis and transformation platform**. It provides a comprehensive environment for exploring, transforming, analyzing, and verifying binary data through an extensible pipeline architecture.

### Core Capabilities

| Capability | Details |
|-----------|---------|
| **Binary Operations** | 106+ operations: logic gates, shifts, rotations, encoding, compression, error correction, arithmetic, crypto primitives, advanced bit manipulation |
| **Metrics** | 76+ metrics: entropy, balance, statistical tests, randomness, correlation, compression estimates, ideality, spectral analysis, complexity |
| **Strategy Execution** | Full pipeline: Scheduler → Algorithm → Scoring → Policy with dual-runtime (Pyodide + native JS) |
| **Deterministic Replay** | Seed-chain-based 100% bit-exact replay for lossless algorithm testing |
| **File Player** | Research environment with step-by-step analysis, diff views, verification, breakpoints, annotations |
| **Plugin System** | User-defined operations, metrics, visualizations, exports via sandboxed JS |
| **Anomaly Detection** | Customizable anomaly detection functions |
| **Reporting** | PDF/JSON/CSV export for publication-grade scientific output |
| **Job System** | Priority-based batch processing with queue management and ETA |
| **Data Generation** | Random, pattern, structured, and file-format binary generation |

### Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Research Integrity** | All operations are real implementations; mock code is strictly prohibited |
| **Determinism** | Seed chains ensure 100% bit-exact replay across executions |
| **Immutability** | All operations return new strings; undo/redo via history snapshots |
| **Security** | Sandboxed execution for all user-defined code; restricted API surface |
| **Extensibility** | Plugin system + custom anomalies + custom operations/metrics |
| **Auditability** | Tagged diagnostic logging across entire pipeline |
| **Standards Compliance** | Operations audited against C99/x86 ISA semantics and truth tables |

### Technology Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 18.3.1 |
| Language | TypeScript (strict) |
| Build | Vite |
| Styling | Tailwind CSS + shadcn/ui + Radix primitives |
| State | React hooks + singleton managers + localStorage |
| Charts | Recharts |
| 3D | Three.js + React Three Fiber |
| PDF | jsPDF |
| Spreadsheet | xlsx (SheetJS) |
| Python | Pyodide 0.24.1 (WebAssembly CPython) |
| Routing | React Router v6 |
| Forms | React Hook Form + Zod |

---

## 2. Architecture Overview

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          UI LAYER (React)                           │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────┐   │
│  │  Analysis   │ │  Backend   │ │  Algorithm  │ │  File Player   │   │
│  │   Panel     │ │   Panel    │ │   Panel     │ │ (Research Env) │   │
│  └────────────┘ └────────────┘ └────────────┘ └────────────────┘   │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Toolbar | Sidebar | Dialogs | 3D Viz | Audio Viz            │ │
│  └────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│                       EXECUTION LAYER                               │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │              Strategy Execution Engine                         │ │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐  │ │
│  │  │   Pyodide    │  │  JS Runtime  │  │  Python Fallback    │  │ │
│  │  │  (Primary)   │  │  (Native JS) │  │  (Regex Parser)     │  │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬──────────────┘  │ │
│  │         └─────────────────┼─────────────────┘                 │ │
│  │                           ▼                                   │ │
│  │                ┌──────────────────────┐                       │ │
│  │                │  Sandboxed Execution  │                      │ │
│  │                │  (Code Validation)    │                      │ │
│  │                └──────────────────────┘                       │ │
│  └────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│                       CORE LIBRARY LAYER                            │
│  ┌────────────────┐ ┌────────────────┐ ┌──────────────────────┐    │
│  │  Operations     │ │    Metrics     │ │  Binary Operations   │    │
│  │   Router        │ │   Calculator   │ │  (106+ impls)        │    │
│  │  (1,486 lines)  │ │  (1,349 lines) │ │  (536 lines)         │    │
│  └───────┬─────────┘ └──────┬────────┘ └──────────────────────┘    │
│          │                  │                                       │
│  ┌───────┴──────────────────┴────────────────────────────────────┐  │
│  │            Predefined Manager (Operation/Metric Registry)      │  │
│  └────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                       DATA LAYER                                    │
│  ┌───────────┐ ┌───────────┐ ┌────────────┐ ┌────────────────┐    │
│  │  File      │ │  Results  │ │  History    │ │  Python Module │    │
│  │  System    │ │  Manager  │ │  Manager    │ │  System        │    │
│  │  Manager   │ │(LocalSt.) │ │             │ │ (Strategies)   │    │
│  └───────────┘ └───────────┘ └────────────┘ └────────────────┘    │
├─────────────────────────────────────────────────────────────────────┤
│                    VERIFICATION LAYER                                │
│  ┌───────────────┐ ┌───────────────┐ ┌──────────────────────┐      │
│  │  Canonical     │ │   Player      │ │   Verification       │      │
│  │  Replay        │ │ Verification  │ │   System (Hashes)    │      │
│  │  (225 lines)   │ │ (249 lines)   │ │   (232 lines)        │      │
│  └───────────────┘ └───────────────┘ └──────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
```

### Runtime Priority Chain

When executing strategy files, the engine uses this priority order:

```
1. Pyodide (Full Python)     — Research-grade, full Python support, deterministic
   │ Falls back to ↓ when Pyodide CDN fails or times out (15s)
2. JS Native Equivalent      — Pre-written JS versions of strategy files
   │ Falls back to ↓ when no JS equivalent exists for the file
3. Python Fallback (Regex)   — Limited regex-based Python interpreter
```

### Singleton Pattern

Core managers are singletons exported from their modules:

```typescript
// Created once, imported everywhere
export const fileSystemManager = new FileSystemManager();
export const pythonExecutor = new PythonExecutor();
export const strategyExecutionEngine = new StrategyExecutionEngine();
export const pythonModuleSystem = new PythonModuleSystem();
export const resultsManager = new ResultsManager();
```

### Observer Pattern

All managers use Set-based listeners for reactive updates:

```typescript
class Manager {
  private listeners: Set<() => void> = new Set();
  
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  private notify(): void {
    this.listeners.forEach(l => l());
  }
}
```

---

## 3. Binary Operations Library

**File**: `src/lib/binaryOperations.ts` (536 lines)  
**Purpose**: Core implementations of all binary operations  
**Dependencies**: None (pure functions)

### Organization

The library is organized into five exported objects and one internal helper:

#### 3.1 LogicGates

```typescript
export const LogicGates: LogicGateOperation = {
  AND(a, b): string    // Bitwise AND with operand extension
  OR(a, b): string     // Bitwise OR with operand extension
  XOR(a, b): string    // Bitwise XOR with operand extension
  NOT(a): string       // Bitwise NOT (complement)
  NAND(a, b): string   // NOT(AND(a, b))
  NOR(a, b): string    // NOT(OR(a, b))
  XNOR(a, b): string   // NOT(XOR(a, b))
}
```

**Operand Extension**: For two-operand gates, the shorter operand `b` is repeated to match `a`'s length:
```typescript
const extendedB = b.repeat(Math.ceil(a.length / b.length)).substring(0, a.length);
```

**Truth Tables** (per bit position):

| A | B | AND | OR | XOR | NAND | NOR | XNOR |
|---|---|-----|----|----|------|-----|------|
| 0 | 0 | 0   | 0  | 0  | 1    | 1   | 1    |
| 0 | 1 | 0   | 1  | 1  | 1    | 0   | 0    |
| 1 | 0 | 0   | 1  | 1  | 1    | 0   | 0    |
| 1 | 1 | 1   | 1  | 0  | 0    | 0   | 1    |

#### 3.2 ShiftOperations

```typescript
export const ShiftOperations = {
  logicalShiftLeft(bits, amount): string   // SHL: fill with zeros from right
  logicalShiftRight(bits, amount): string  // SHR: fill with zeros from left
  arithmeticShiftLeft(bits, amount): string  // ASHL: same as SHL
  arithmeticShiftRight(bits, amount): string // ASHR: preserve sign bit (MSB)
  rotateLeft(bits, amount): string   // ROL: circular shift left
  rotateRight(bits, amount): string  // ROR: circular shift right
}
```

**Edge Cases**:
- `amount <= 0`: returns input unchanged
- `amount >= bits.length`: SHL/SHR return all zeros; ASHR fills with sign bit; ROL/ROR wraps via modulo
- Empty string: returns empty string

**Shift Semantics** (example: "10110100", shift 2):
```
SHL  → "11010000"  (bits shifted left, zeros fill right)
SHR  → "00101101"  (bits shifted right, zeros fill left)
ASHR → "11101101"  (sign bit '1' fills left)
ROL  → "11010010"  (left bits wrap to right)
ROR  → "0010110100" → "00101101" (right bits wrap to left)
```

#### 3.3 BitManipulation

```typescript
export const BitManipulation = {
  insertBits(bits, index, insertedBits): string    // Insert at position
  deleteBits(bits, start, end): string             // Remove range
  replaceBits(bits, start, replacement): string     // Overwrite at position
  peekBits(bits, start, length): string            // Read without modify
  moveBits(bits, srcStart, srcEnd, destIndex): string  // Relocate range
  applyMask(bits, mask, operation): string         // Apply mask via AND/OR/XOR
  appendBits(bits, appendedBits): string           // Concatenate
  truncate(bits, length): string                   // Trim to length
}
```

**Boundary Safety**: All functions clamp indices to valid ranges. Negative starts become 0, ends exceeding length are clamped.

#### 3.4 BitPacking

```typescript
export const BitPacking = {
  packValues(values: {value, bits}[]): string    // Pack decimals to binary
  unpackValues(bits, bitWidths): number[]         // Extract decimals from binary
  padLeft(bits, length, padWith): string          // Left-pad to length
  padRight(bits, length, padWith): string         // Right-pad to length
  alignToBytes(bits, padWith): string             // Pad to 8-bit boundary
  alignToNibbles(bits, padWith): string           // Pad to 4-bit boundary
}
```

#### 3.5 ArithmeticOperations

```typescript
export const ArithmeticOperations = {
  add(a, b): string            // Full-adder with carry chain
  subtract(a, b): string       // Full-subtractor with borrow chain
  multiply(a, b): string       // Shift-and-add multiplication
  divide(dividend, divisor): { quotient, remainder }  // Division
  modulo(a, b): string         // Remainder
  power(base, exponent): string // Exponentiation
  fromDecimal(num, minBits): string  // Decimal → binary string
  toDecimal(bits): number      // Binary string → decimal number
}
```

**Addition Algorithm** (ripple-carry adder):
```typescript
for (let i = maxLen - 1; i >= 0; i--) {
  const sum = bitA + bitB + carry;
  result = (sum % 2).toString() + result;
  carry = Math.floor(sum / 2);
}
```

#### 3.6 AdvancedBitOperations

```typescript
export const AdvancedBitOperations = {
  populationCount(bits): number          // Count 1s (Hamming weight)
  swapBits(bits, r1Start, r1End, r2Start, r2End): string  // Swap ranges
  reverseBits(bits): string              // Reverse bit order
  binaryToGray(bits): string             // Binary → Gray code
  grayToBinary(gray): string             // Gray code → Binary
  swapEndianness(bits): string           // Reverse byte order
  countTransitions(bits): number         // Count 0→1 and 1→0 transitions
}
```

**Gray Code Conversion**:
```typescript
// Binary to Gray: gray[0] = binary[0], gray[i] = binary[i-1] XOR binary[i]
binaryToGray(bits) {
  let gray = bits[0];
  for (let i = 1; i < bits.length; i++) {
    gray += bits[i - 1] === bits[i] ? '0' : '1';
  }
  return gray;
}

// Gray to Binary: binary[0] = gray[0], binary[i] = binary[i-1] XOR gray[i]
grayToBinary(gray) {
  let binary = gray[0];
  for (let i = 1; i < gray.length; i++) {
    binary += binary[i - 1] === gray[i] ? '0' : '1';
  }
  return binary;
}
```

---

## 4. Operations Router

**File**: `src/lib/operationsRouter.ts` (1,486 lines)  
**Purpose**: Central registry mapping operation IDs to implementations  
**Dependencies**: `binaryOperations.ts`, `predefinedManager.ts`, `sandboxedExec.ts`

### Architecture

```
executeOperation(opId, bits, params)
    │
    ├─ Validate: exists in predefinedManager OR OPERATION_IMPLEMENTATIONS OR customOperations
    ├─ Generate deterministic seed (if not provided)
    ├─ Generate deterministic mask (for mask-requiring ops, using seed)
    ├─ Auto-fill structural params (INSERT position, MOVE source/dest)
    │
    ├─ Try: customOperations.get(opId)
    ├─ Try: predefinedManager code-based operation (safeExecute)
    ├─ Try: OPERATION_IMPLEMENTATIONS[opId]
    │
    └─ Return: { success, bits, operationId, params, seed }
```

### Seed System

Every operation gets a deterministic seed for reproducible results:

```typescript
// Auto-generate seed if not provided
let operationSeed = paramsUsed.seed;
if (!operationSeed || operationSeed === '') {
  operationSeed = `${Date.now()}_${operationId}_${bits.length}`;
  paramsUsed.seed = operationSeed;
}
```

**CRITICAL for Replay**: During replay, the stored seed is reused (not regenerated), ensuring identical masks and randomization.

### Deterministic Mask Generation

```typescript
function generateDeterministicMask(length: number, seed: string): string {
  let mask = '';
  let rng = hashSeed(seed);
  for (let i = 0; i < length; i++) {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff;  // LCG PRNG
    mask += (rng % 2).toString();
  }
  return mask;
}
```

Uses a Linear Congruential Generator (LCG) with constants from POSIX `rand()`: multiplier 1103515245, increment 12345.

### Non-Trivial Default Masks

When no mask is provided for testing/verification:

```typescript
function generateNonTrivialMask(length: number): string {
  // Alternating 10101010... pattern - always changes ~50% of bits
  let mask = '';
  for (let i = 0; i < length; i++) {
    mask += (i % 2 === 0) ? '1' : '0';
  }
  return mask;
}
```

### Operations Requiring Masks

```typescript
const OPS_REQUIRING_MASK = new Set([
  'AND', 'OR', 'XOR', 'NAND', 'NOR', 'XNOR',
  'IMPLY', 'NIMPLY', 'CONVERSE', 'MUX', 'MAJ',
  'PDEP', 'PEXT', 'BLEND', 'FEISTEL'
]);
```

### Complete Implementation Map (OPERATION_IMPLEMENTATIONS)

Every operation listed here has a real, functional implementation:

**Logic Gates** (7 + 5 extended + 2 parity):
- `NOT`: `LogicGates.NOT(bits)`
- `AND`: `LogicGates.AND(bits, mask || generateNonTrivialMask())`
- `OR`, `XOR`, `NAND`, `NOR`, `XNOR`: Same pattern with respective gate
- `IMPLY`: `¬A ∨ B` — result is '1' if A=0 or B=1
- `NIMPLY`: `A ∧ ¬B` — result is '1' only if A=1 and B=0
- `CONVERSE`: `A ∨ ¬B` — result is '1' if A=1 or B=0
- `MUX`: Selector-based multiplexer between bits and input1
- `MAJ`: Majority vote (result='1' if 2 of 3 inputs are '1')
- `ODD`: Odd parity per byte
- `EVEN`: Even parity per byte

**Shifts & Rotations** (10):
- `SHL`, `SHR`, `ASHL`, `ASHR`, `ASR`, `ASL`: Shift operations
- `ROL`, `ROR`: Circular rotations
- `RCL`, `RCR`: Rotate through carry

**Bit Manipulation** (12):
- `INSERT`, `DELETE`, `REPLACE`, `MOVE`, `TRUNCATE`, `APPEND`
- `BSET` (set bit), `BCLR` (clear bit), `BTOG` (toggle bit)
- `BEXTRACT` (extract field), `BINSERT` (insert field), `BTEST` (test bit, returns unchanged)

**Byte/Word Operations** (6):
- `BSWAP`: Reverse byte order
- `WSWAP`: Reverse 16-bit word order
- `NIBSWAP`: Swap nibbles within each byte
- `BITREV`: Reverse all bits
- `BYTEREV`: Reverse bits within each byte
- `ENDIAN`: Swap endianness

**Arithmetic** (14):
- `ADD`, `SUB`, `MUL`, `DIV`, `MOD`: Basic arithmetic
- `ABS`: Absolute value (two's complement)
- `SAT_ADD`, `SAT_SUB`: Saturating arithmetic
- `INC`, `DEC`: Increment/decrement by 1
- `NEG`: Two's complement negation
- `POPCNT`: Population count (returns count as binary)
- `CLZ`: Count leading zeros
- `CTZ`: Count trailing zeros

**Encoding** (12):
- `GRAY`: Binary ↔ Gray code
- `REVERSE`: Reverse bit order
- `MANCHESTER`: Manchester line coding
- `DEMANCHESTER`: Manchester decoding
- `DIFF`: Differential encoding
- `DEDIFF`: Differential decoding
- `NRZI`: Non-Return-to-Zero Inverted encoding
- `DENRZI`: NRZI decoding
- `RLL`: Run-Length Limited encoding
- `BASE64_ENC`: Base64 encoding

**Compression** (10):
- `RLE`: Run-length encoding (8-bit count + 1-bit value per run)
- `DERLE`: RLE decoding
- `DELTA`: Delta encoding (byte-level differences)
- `DEDELTA`: Delta decoding
- `ZIGZAG`: ZigZag encoding for signed integers
- `DEZIGZAG`: ZigZag decoding
- `BWT`: Burrows-Wheeler Transform (simplified, 64-bit limit)
- `IBWT`: Inverse BWT
- `MTF`: Move-to-Front encoding
- `IMTF`: Inverse MTF

**Checksums & Error Correction** (8):
- `CHECKSUM8`: 8-bit checksum
- `CRC8`: CRC-8 with polynomial 0x07
- `CRC16`: CRC-16 CCITT with polynomial 0x1021
- `CRC32`: CRC-32 with polynomial 0xEDB88320
- `FLETCHER`: Fletcher checksum
- `ADLER`: Adler-32 checksum
- `LUHN`: Luhn check digit
- `HAMMING_ENC`: Hamming(7,4) encoding

**Advanced / Crypto** (8):
- `SHUFFLE`: Fisher-Yates shuffle with deterministic seed
- `UNSHUFFLE`: Reverse shuffle (same seed required)
- `LFSR`: Linear Feedback Shift Register scrambling
- `SBOX`: AES-like S-box substitution (nibble-based)
- `PERMUTE`: Permutation table application
- `FEISTEL`: Single Feistel round (XOR-based F function)
- `MIXCOL`: AES-like MixColumns (GF(2^8) multiplication)
- `SHIFTROW`: AES-like ShiftRows

**Data Operations** (12):
- `SWAP`: Swap two halves
- `COPY`: Identity operation
- `FILL`: Fill with repeating pattern
- `EXTEND`: Extend by appending pattern
- `CONCAT`: Full concatenation
- `SPLICE`: Insert at position
- `SPLIT`: Split and keep first half
- `MERGE`: XOR-merge with another stream
- `PREFIX`, `SUFFIX`: Add prefix/suffix
- `REPEAT`: Repeat pattern to fill
- `MIRROR`: Reflect around center

**Bit Field Operations** (6):
- `SCATTER`: Spread bits apart (insert zeros)
- `GATHER`: Compact bits (take every other)
- `INTERLEAVE`: Interleave with another stream
- `DEINTERLEAVE`: Split into even/odd positions
- `PDEP`: Parallel bit deposit (Intel BMI2)
- `PEXT`: Parallel bit extract (Intel BMI2)

**Others** (6):
- `BUFFER`: Identity (pass-through)
- `PACK`: Remove leading zeros per byte
- `UNPACK`: Identity (placeholder)
- `CLAMP`: Clamp to min/max range
- `WRAP`: Modular wrap
- `BLEND`: Conditional blend via mask
- `DEMUX`: Demultiplex (extract channel)
- `BEXTR`: Bit field extract with width
- `BDEPOSIT`: Bit deposit via mask

### Operation Costs

Every operation has an associated budget cost (used by the Scoring system):

```typescript
const OPERATION_COSTS: Record<string, number> = {
  // Cost 0
  BUFFER: 0,
  // Cost 1
  NOT: 1, AND: 1, OR: 1, XOR: 1, SHL: 1, SHR: 1, ASHL: 1, ASHR: 1, ASR: 1, ASL: 1,
  ROL: 1, ROR: 1, REVERSE: 1, TRUNCATE: 1, APPEND: 1, BSET: 1, BCLR: 1, BTOG: 1,
  BTEST: 1, PAD: 1, PAD_LEFT: 1, PAD_RIGHT: 1, COPY: 1, PREFIX: 1, SUFFIX: 1,
  // Cost 2
  NAND: 2, NOR: 2, XNOR: 2, IMPLY: 2, NIMPLY: 2, CONVERSE: 2, ODD: 2, EVEN: 2,
  RCL: 2, RCR: 2, BSWAP: 2, WSWAP: 2, NIBSWAP: 2, BYTEREV: 2,
  INSERT: 2, DELETE: 2, REPLACE: 2, SWAP: 2, BEXTRACT: 2, BINSERT: 2,
  GRAY: 2, ENDIAN: 2, MANCHESTER: 2, DEMANCHESTER: 2, NRZI: 2, DENRZI: 2,
  DIFF: 2, DEDIFF: 2, ZIGZAG: 2, DEZIGZAG: 2,
  ABS: 2, INC: 2, DEC: 2, NEG: 2, POPCNT: 2, CLZ: 2, CTZ: 2, CLAMP: 2, WRAP: 2,
  PACK: 2, UNPACK: 2, FILL: 2, EXTEND: 2, CONCAT: 2, SPLIT: 2, REPEAT: 2, MIRROR: 2,
  CHECKSUM8: 2,
  // Cost 3
  MUX: 3, MAJ: 3, FUNNEL: 3, MOVE: 3, BDEPOSIT: 3, BGATHER: 3,
  INTERLEAVE: 3, DEINTERLEAVE: 3,
  ADD: 3, SUB: 3, SAT_ADD: 3, SAT_SUB: 3,
  RLE: 3, DERLE: 3, DELTA: 3, DEDELTA: 3, RLL: 3, BASE64_ENC: 3,
  SPLICE: 3, MERGE: 3, SCATTER: 3, GATHER: 3,
  FLETCHER: 3, ADLER: 3, MTF: 3, IMTF: 3,
  // Cost 4+
  SHUFFLE: 4, UNSHUFFLE: 4, SBOX: 4, PERMUTE: 4, LFSR: 4,
  HAMMING_ENC: 4, CRC8: 4, LUHN: 4,
  MUL: 5, DIV: 5, FEISTEL: 5, CRC16: 5,
  CRC32: 6, BWT: 8,
};
```

### Exported Functions

```typescript
executeOperation(operationId: string, bits: string, params?: OperationParams): OperationResult
executeOperationOnRange(operationId: string, bits: string, start: number, end: number, params?: OperationParams): OperationResult
registerOperation(operationId: string, impl: (bits, params) => string): void
unregisterOperation(operationId: string): void
hasImplementation(operationId: string): boolean
getAvailableOperations(): string[]
getOperationCost(operationId: string): number
getImplementedOperations(): string[]
```

---

## 5. Metrics Calculator

**File**: `src/lib/metricsCalculator.ts` (1,349 lines)  
**Purpose**: Central registry mapping metric IDs to calculation implementations  
**Dependencies**: `binaryMetrics.ts`, `advancedMetrics.ts`, `binaryOperations.ts`, `idealityMetrics.ts`, `predefinedManager.ts`, `sandboxedExec.ts`

### Architecture

```
calculateMetric(metricId, bits)
    │
    ├─ Try: customMetrics.get(metricId)
    ├─ Try: predefinedManager code-based metric (safeExecute)
    ├─ Try: METRIC_IMPLEMENTATIONS[metricId]
    │
    └─ Return: { success, value, metricId }
```

### Complete Metric Implementation Map

**Core Metrics** (5):
| Metric | Formula | Range |
|--------|---------|-------|
| `entropy` | Shannon entropy: -Σ p·log₂(p) | 0.0 – 1.0 |
| `balance` | ones / totalBits | 0.0 – 1.0 |
| `hamming_weight` | Count of 1-bits | 0 – length |
| `transition_count` | Count of bit-value changes | 0 – length-1 |
| `run_length_avg` | Average run length | 1.0 – length |

**Statistical Metrics** (12):
| Metric | Description |
|--------|------------|
| `variance` | Bit-level variance |
| `standard_deviation` | √(variance) |
| `skewness` | Third moment (asymmetry) |
| `kurtosis` | Fourth moment - 3 (excess kurtosis) |
| `serial_correlation` | Lag-1 correlation coefficient |
| `std_dev` | Standard deviation of byte values |
| `median` | Median byte value |
| `mode` | Most frequent byte value |
| `range` | max(byte) - min(byte) |
| `iqr` | Interquartile range of byte values |
| `mad` | Mean absolute deviation of byte values |
| `cv` | Coefficient of variation (stddev/mean) |

**Information Theory Metrics** (12):
| Metric | Description |
|--------|------------|
| `conditional_entropy` | H(X|Y) for adjacent bits |
| `mutual_info` | I(X;Y) = H(X) + H(Y) - H(X,Y) |
| `joint_entropy` | H(X,Y) for adjacent bit pairs |
| `min_entropy` | H∞ = -log₂(max(p)) |
| `renyi_entropy` | H₂ = -log₂(Σp²) (collision entropy) |
| `cross_entropy` | Cross entropy with uniform q=0.5 |
| `kl_divergence` | KL divergence from uniform |
| `collision_entropy` | Same as Rényi H₂ |
| `byte_entropy` | Shannon entropy on byte level |
| `nibble_entropy` | Shannon entropy on nibble level |
| `block_entropy` | Block entropy (size=8) |
| `block_entropy_overlapping` | Overlapping block entropy |

**Compression Metrics** (4):
| Metric | Description |
|--------|------------|
| `compression_ratio` | totalBytes / compressedSize |
| `lz77_estimate` | LZ77 compression ratio estimate |
| `rle_ratio` | RLE compression ratio |
| `huffman_estimate` | Huffman compression ratio estimate |

**Randomness Tests** (7):
| Metric | Description |
|--------|------------|
| `chi_square` | Chi-square statistic |
| `monobit_test` | NIST monobit test statistic |
| `runs_test` | Total number of runs |
| `poker_test` | 4-bit pattern frequency test |
| `serial_test` | Serial test for 2-bit patterns |
| `apen` | Approximate entropy |
| `sample_entropy` | Sample entropy |

**Transition & Run Metrics** (10):
| Metric | Description |
|--------|------------|
| `transition_rate` | Transitions / (length - 1) |
| `transition_entropy` | Entropy of transition matrix |
| `rise_count` | Count of 0→1 transitions |
| `fall_count` | Count of 1→0 transitions |
| `rise_fall_ratio` | rises / falls |
| `toggle_rate` | Same as transition_rate |
| `max_stable_run` | Longest run of same bit |
| `avg_stable_run` | Average run length |
| `longest_run_ones` | Longest consecutive 1s |
| `longest_run_zeros` | Longest consecutive 0s |

**Pattern & Complexity Metrics** (10):
| Metric | Description |
|--------|------------|
| `pattern_diversity` | Unique 8-bit pattern ratio |
| `lempel_ziv` | Lempel-Ziv complexity (normalized) |
| `bit_complexity` | Kolmogorov complexity approximation |
| `t_complexity` | Titchener complexity |
| `longest_repeat` | Longest repeated substring length |
| `periodicity` | Smallest repeating period |
| `unique_ngrams_2` | Unique 2-bit patterns |
| `unique_ngrams_4` | Unique 4-bit patterns |
| `unique_ngrams_8` | Unique 8-bit patterns |
| `effective_complexity` | Entropy × regularity balance |

**Spectral & Frequency Metrics** (5):
| Metric | Description |
|--------|------------|
| `spectral_flatness` | Wiener entropy (geometric/arithmetic mean) |
| `spectral_centroid` | Weighted center of byte values |
| `bandwidth` | Spectral bandwidth (std dev) |
| `dominant_freq` | Most common run length |
| `spectral_test` | DFT-based periodicity peak |

**Structure Metrics** (8):
| Metric | Description |
|--------|------------|
| `block_regularity` | 1 - √(variance of block entropies) |
| `segment_count` | Entropy transition count |
| `symmetry_index` | Palindromic symmetry |
| `byte_alignment` | 1 if length % 8 == 0 |
| `word_alignment` | 1 if length % 32 == 0 |
| `header_size` | First high-entropy transition point |
| `footer_size` | Last high-entropy transition point |
| `hamming_distance_self` | Hamming distance between halves |

**Advanced Metrics** (8):
| Metric | Description |
|--------|------------|
| `ideality` | Repeating sequence percentage |
| `kolmogorov_estimate` | compressedSize × 8 |
| `bit_density` | Same as balance |
| `bias_percentage` | Bias from 50/50 |
| `bit_reversal_distance` | Hamming distance from reversed |
| `complement_distance` | Always equals length |
| `fractal_dimension` | Box-counting dimension |
| `logical_depth` | LZ complexity × log(length) / length |

**Autocorrelation** (3):
| Metric | Description |
|--------|------------|
| `autocorrelation` | Lag-1 autocorrelation (±1 mapping) |
| `autocorr_lag1` | Same as autocorrelation |
| `autocorr_lag2` | Lag-2 autocorrelation |

**Misc** (5):
| Metric | Description |
|--------|------------|
| `leading_zeros` | Count of leading 0s |
| `trailing_zeros` | Count of trailing 0s |
| `popcount` | Population count |
| `parity` | XOR of all bits |
| `runs_count` | Total runs from runs test |
| `block_entropy_8` | Block entropy (size=8) |
| `block_entropy_16` | Block entropy (size=16) |
| `time_stamp` | Current Unix timestamp |
| `execution_id` | Random ID |

### Exported Functions

```typescript
calculateMetric(metricId: string, bits: string): MetricResult
calculateMetricOnRange(metricId: string, bits: string, start: number, end: number): MetricResult
calculateAllMetrics(bits: string): AllMetricsResult
calculateMetrics(bits: string, metricIds: string[]): AllMetricsResult
registerMetric(metricId: string, impl: (bits) => number): void
unregisterMetric(metricId: string): void
getAvailableMetrics(): string[]
getAllDefinedMetrics(): string[]
hasImplementation(metricId: string): boolean
getFullAnalysis(bits: string): BinaryStats
getAdvancedAnalysis(bits: string): AdvancedMetrics
getImplementedMetrics(): string[]
getMetricsByCategory(): Record<string, string[]>
```

---

## 6. Binary Metrics (Core)

**File**: `src/lib/binaryMetrics.ts` (258 lines)

### BinaryStats Interface

```typescript
interface BinaryStats {
  totalBits: number;
  totalBytes: number;
  zeroCount: number;
  oneCount: number;
  zeroPercent: number;      // 0-100
  onePercent: number;       // 0-100
  entropy: number;          // 0.0-1.0
  longestZeroRun: { start, end, length } | null;
  longestOneRun: { start, end, length } | null;
  meanRunLength: number;
  estimatedCompressedSize: number;  // bytes
}
```

### Key Methods

```typescript
BinaryMetrics.analyze(bits: string): BinaryStats
BinaryMetrics.findSequences(bits: string, pattern: string, minCount: number): SequenceMatch[]
BinaryMetrics.findLongestRun(bits: string, targetBit: '0' | '1'): { start, end, length } | null
```

### Entropy Calculation

```typescript
static calculateEntropy(zeroCount: number, oneCount: number): number {
  const total = zeroCount + oneCount;
  if (total === 0) return 0;
  
  const pZero = zeroCount / total;
  const pOne = oneCount / total;
  
  let entropy = 0;
  if (pZero > 0) entropy -= pZero * Math.log2(pZero);
  if (pOne > 0) entropy -= pOne * Math.log2(pOne);
  
  return entropy;  // 0.0 (all same) to 1.0 (perfectly balanced)
}
```

---

## 7. Advanced Metrics

**File**: `src/lib/advancedMetrics.ts` (403 lines)

### AdvancedMetricsCalculator (Static Methods)

| Method | Returns | Description |
|--------|---------|-------------|
| `calculateVariance(bits)` | number | Bit-level variance |
| `calculateStandardDeviation(bits)` | number | √(variance) |
| `calculateSkewness(bits)` | number | Third standardized moment |
| `calculateKurtosis(bits)` | number | Fourth moment - 3 (excess) |
| `chiSquareTest(bits)` | {value, pValue, isRandom} | Chi-square randomness test |
| `runsTest(bits)` | {runs, expected, isRandom} | Runs test for randomness |
| `calculateSerialCorrelation(bits)` | number | Lag-1 correlation coefficient |
| `calculateNGramDistribution(bits, n)` | Map<string, number> | N-gram frequency map |
| `calculateTransitions(bits)` | {zeroToOne, oneToZero, total, rate, entropy} | Transition analysis |
| `calculateAutocorrelation(bits, maxLag)` | number[] | Autocorrelation coefficients |
| `calculateBlockEntropy(bits, blockSizes)` | BlockEntropy[] | Per-block entropy statistics |
| `detectBias(bits)` | {percentage, direction} | Bias detection |
| `calculatePatternDiversity(bits, patternSize)` | number | Unique pattern ratio |
| `analyze(bits, entropy)` | AdvancedMetrics | Full advanced analysis |

---

## 8. Ideality Metrics

**File**: `src/lib/idealityMetrics.ts` (174 lines)

Measures the proportion of binary data that consists of consecutive repeating patterns.

```typescript
IdealityMetrics.calculateIdeality(
  bits: string,
  windowSize: number,
  startIndex?: number,
  endIndex?: number,
  excludedBitIndices?: Set<number>
): IdealityResult

IdealityMetrics.getTopIdealityWindows(
  bits: string,
  topN: number
): IdealityResult[]
```

**Algorithm**: For each position, check if the next `windowSize` bits match the current `windowSize` bits. Count consecutive matches.

---

## 9. Bitstream Analysis

**File**: `src/lib/bitstreamAnalysis.ts` (448 lines)

### PatternAnalysis

```typescript
PatternAnalysis.findPattern(bits, pattern): PatternMatch
PatternAnalysis.findAllPatterns(bits, minLength, maxLength): PatternMatch[]
PatternAnalysis.findRepeats(bits, windowSize): RepeatInfo[]
```

### Tokenization

```typescript
Tokenizer.tokenize(bits, tokenSize): TokenInfo[]
Tokenizer.frequencyAnalysis(tokens): Map<string, number>
```

---

## 10. Binary Model & File State

**File**: `src/lib/binaryModel.ts` — Core binary data model  
**File**: `src/lib/fileState.ts` — File state wrapper with undo/redo

The `FileState` wraps a `BinaryModel` and provides the mutable state layer for files in the file system.

---

## 11. File System Manager

**File**: `src/lib/fileSystemManager.ts` (344 lines)

```typescript
interface BinaryFile {
  id: string;
  name: string;
  created: Date;
  modified: Date;
  type: 'binary' | 'text';
  state: FileState;
  group?: string;
  isTemp?: boolean;
}
```

### Key Methods

```typescript
createFile(name, bits, type): BinaryFile
getFile(id): BinaryFile | undefined
getActiveFile(): BinaryFile | undefined
setActiveFile(id): void
deleteFile(id): void
renameFile(id, newName): void
getAllFiles(): BinaryFile[]
getFilesByGroup(group): BinaryFile[]
cleanupTempFiles(): void  // Auto-runs on startup
```

### Storage

- Files: `bitwise_files` in localStorage
- Groups: `bitwise_groups` in localStorage
- Active file: `bitwise_active_file` in localStorage
- Temp file max age: 1 hour
- Temp file max count: 10

---

## 12. History Manager

**File**: `src/lib/historyManager.ts` (114 lines)

```typescript
interface HistoryEntry {
  id: string;
  timestamp: Date;
  description: string;
  bits: string;
  stats?: { totalBits, zeroCount, oneCount, entropy };
}
```

- Max 100 entries
- Auto-groups same-type edits within 30 seconds
- Full bit snapshot per entry (for undo)

---

## 13. Python Module System

**File**: `src/lib/pythonModuleSystem.ts` (378 lines)

### File Groups

| Group | Purpose |
|-------|---------|
| `scheduler` | Pipeline orchestration |
| `algorithm` | Core transformation logic |
| `scoring` | Budget + scoring dimensions |
| `policies` | Validation rules |
| `ai` | ML model files |
| `custom` | User-defined |

### Strategy Configuration

```typescript
interface StrategyConfig {
  id: string;
  name: string;
  schedulerFile: string;      // Exactly 1
  algorithmFiles: string[];   // 1+
  scoringFiles: string[];     // 1+ (define budget)
  policyFiles: string[];      // 0+ (optional)
  created: Date;
}
```

### Key Methods

```typescript
addFile(name, content, group): PythonFile
getFile(id): PythonFile | undefined
getFileByName(name): PythonFile | undefined
getFilesByGroup(group): PythonFile[]
createStrategy(config): StrategyConfig
getStrategy(id): StrategyConfig | undefined
getAllStrategies(): StrategyConfig[]
```

### Storage Keys

- Files: `bitwise_python_files_v2`
- Strategies: `bitwise_strategies_v3`
- Custom groups: `bitwise_custom_groups`

---

## 14. Python Executor (Pyodide)

**File**: `src/lib/pythonExecutor.ts` (1,570 lines)

### Lifecycle

```
constructor → loadPyodide() → [CDN load + Pyodide init + numpy] → isReady()
                                    │ failure
                                    ▼
                              fallbackMode = true
```

### CDN Sources (tried in order)

1. `https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js`
2. `https://pyodide-cdn2.iodide.io/v0.24.1/full/pyodide.js`

Timeout: 15 seconds per source.

### Bridge API

The Python executor injects a `bitwise_api` object into the Python global scope:

```python
# Available in Python strategy code:
bitwise_api.apply_operation("XOR", bits, {"mask": "10101010"})
bitwise_api.get_metric("entropy", bits)
bitwise_api.get_all_metrics(bits)
bitwise_api.get_cost("XOR")
bitwise_api.get_budget()
bitwise_api.deduct_budget(5)
bitwise_api.log("message")
bitwise_api.get_bits()
bitwise_api.set_bits(new_bits)
bitwise_api.get_available_operations()
bitwise_api.get_available_metrics()
```

### TransformationRecord

```typescript
interface TransformationRecord {
  operation: string;
  params: Record<string, any>;
  fullBeforeBits: string;       // Full file before
  fullAfterBits: string;        // Full file after
  beforeBits: string;           // Segment before
  afterBits: string;            // Segment after
  bitRanges: { start, end }[];
  bitsChanged: number;
  segmentBitsChanged: number;
  cost: number;
  duration: number;
  cumulativeBits: string;       // Full file state (for Player)
  metricsSnapshot: Record<string, number>;
  segmentOnly: boolean;
}
```

### Runtime Policy

```typescript
type RuntimePolicy = 'strict' | 'legacy_fallback';
```

- `strict`: Requires Pyodide; throws if unavailable
- `legacy_fallback`: Falls through to regex parser when Pyodide is unavailable

### Fallback Interpreter

A regex-based Python interpreter that handles:
- Variable assignment (`x = value`)
- For loops (`for x in range(n):`)
- If/elif/else conditionals
- Function calls (`bitwise_api.apply_operation(...)`)
- Tuple unpacking (`success, result = func()`)
- Dictionary operations
- F-strings (basic)
- `global`, `return`, `pass` keywords
- Multi-line dictionaries

**Limitations**: Cannot handle list comprehensions, classes, generators, decorators, try/except, nested functions, or complex expressions.

---

## 15. JavaScript Strategy Runtime

**File**: `src/lib/jsStrategyRuntime.ts` (273 lines)

### API Bridge

Mirrors the Python `bitwise_api`:

```typescript
const api = {
  apply_operation(opName, bits?, params?),    // → executeOperation()
  apply_operation_range(opName, start, end, params?),  // → range operation
  get_metric(metricName, bits?),              // → calculateMetric()
  get_all_metrics(bits?),                     // → calculateAllMetrics()
  get_cost(opName),                           // → getOperationCost()
  get_available_operations(),                 // → getAvailableOperations()
  get_available_metrics(),                    // → getAvailableMetrics()
  get_budget(),
  deduct_budget(amount),
  log(msg),
  get_bits(),
  set_bits(newBits),
  get_bits_length(),
};
```

### Execution Flow

```typescript
executeJSStrategy(jsCode: string, context: JSStrategyContext): JSStrategyResult
```

1. Validate code safety via `validateCode()`
2. Build API bridge with closures over mutable state
3. Execute via `safeExecute()` with shadowed globals
4. Return transformations, final bits, metrics, stats

### Strategy Generation

```typescript
generateJSStrategyFile(modelName, operationSequence, config): string
```

Generates executable JS strategy code from an operation sequence with weights.

---

## 16. JS Strategy Files (Native Fallback)

**File**: `src/lib/jsStrategyFiles.ts` (320 lines)

### Four Native JS Strategies

**JS_UNIFIED_SCHEDULER** — System setup reporting:
- Reports available operations, metrics, data size
- Minimal execution (no transformations)

**JS_UNIFIED_ALGORITHM** — Complete system verification:
- **Phase 1**: Tests all metrics (up to 76)
- **Phase 2**: Tests all operations (up to 106) on full bits
- **Phase 3**: Tests operation combinations (NOT+XOR, XOR+ROL, etc.)
- **Phase 4**: Tests range-based operations on first quarter

**JS_UNIFIED_SCORING** — 6-dimension scoring:
| Dimension | Weight | Calculation |
|-----------|--------|-------------|
| entropy_quality | 15% | (1.5 - entropy) × 66.67 |
| operation_coverage | 25% | Default 80 |
| metric_accuracy | 25% | Default 80 |
| combination_success | 15% | Default 70 |
| budget_efficiency | 10% | Based on budget ratio (sweet spot 0.3-0.7) |
| data_integrity | 10% | Valid binary check |

**JS_UNIFIED_POLICY** — Validation:
- Data length (8 – 100,000,000 bits)
- Character validation (only '0' and '1')
- Balance warnings (>0.98 or <0.02)
- Budget depletion alerts

### Mapping Function

```typescript
getJSEquivalent(pythonFileName: string): { name, content, type } | null
```

Supports filenames: `UnifiedSchedulerV2.py`, `UnifiedAlgorithmV2.py`, `ComprehensiveMultiFile.py`, `UnifiedScoringV2.py`, `UnifiedPolicyV2.py`, and non-V2 variants.

---

## 17. Sandboxed Execution Layer

**File**: `src/lib/sandboxedExec.ts` (125 lines)

### Blocked Patterns (36)

| Category | Patterns |
|----------|----------|
| **Network** | `fetch()`, `XMLHttpRequest`, `WebSocket`, `Worker`, `SharedWorker`, `ServiceWorker` |
| **Storage** | `localStorage`, `sessionStorage`, `IndexedDB`, `openDatabase`, `cookies` |
| **DOM** | `document`, `window`, `navigator`, `location`, `globalThis` |
| **Frames** | `parent`, `top`, `self`, `frames` |
| **Escape** | `eval()`, `Function()`, `import()`, `postMessage` |
| **Other** | `setTimeout` with string, `setInterval` with string |

### Execution Pipeline

```
1. stripComments(code)         — Remove // and /* */ comments
2. validateCode(stripped)      — Check against 36 blocked patterns
3. new Function(params, body)  — Create function with shadowed globals
4. fn(...args, ...undefined)   — Execute with globals as undefined
```

### Shadowed Globals

```typescript
const shadowedGlobals = [
  'window', 'document', 'globalThis', 'fetch', 'XMLHttpRequest',
  'localStorage', 'sessionStorage', 'navigator', 'location',
  'eval', 'Function', 'WebSocket', 'Worker', 'importScripts',
  'postMessage', 'parent', 'top', 'self', 'frames', 'opener',
];
```

### Exported Functions

```typescript
validateCode(code: string): ValidationResult      // { safe, violations[] }
safeExecute<T>(paramNames, body, args): T          // Validated + sandboxed execution
validateSyntax(paramNames, body): { valid, error? } // Syntax-only check
```

---

## 18. Strategy Execution Engine

**File**: `src/lib/strategyExecutionEngine.ts` (785 lines)

### Execution Pipeline

```
executeStrategy(strategy, sourceFileId, options?)
    │
    ├─ 1. Load source file
    ├─ 2. Calculate initial metrics
    ├─ 3. Run Scheduler file
    ├─ 4. Run Algorithm file(s) — update bits, track transformations
    ├─ 5. Run Scoring file(s) — extract scores
    ├─ 6. Run Policy file(s) — check pass/fail
    ├─ 7. NO-OP FAIL GUARD — throw if 0 bits changed
    ├─ 8. Create result file in FileSystemManager
    └─ 9. Save to ResultsManager
```

### Runtime Options

```typescript
interface ExecutionRuntimeOptions {
  seed?: string;                    // Deterministic seed
  timeout?: number;                 // Seconds (default 300)
  memoryLimit?: number;
  budgetOverride?: number | null;   // Override scoring budget
  verifyAfterStep?: boolean;
  stepMode?: 'continuous' | 'step' | 'breakpoint' | 'step_by_step' | 'breakpoints';
  logDetailedMetrics?: boolean;
  storeFullHistory?: boolean;
  saveMasksAndParams?: boolean;
  iterationCount?: number;
  retryOnFailure?: number;          // Retry count with exponential backoff
  operationWhitelist?: string[];
  operationBlacklist?: string[];
  maxWorkers?: number;
  enableParallel?: boolean;
  breakpoints?: any[];
}
```

### No-Op Fail Guard

```typescript
if (totalOperations > 0 && totalBitsChanged === 0) {
  const noOpOps = allTransformations
    .filter(t => t.bitsChanged === 0)
    .map(t => t.operation);
  throw new Error(
    `Execution produced no changes: ${totalOperations} operations ran ` +
    `but 0 bits were modified. No-op operations: ${[...new Set(noOpOps)].join(', ')}`
  );
}
```

### CSV Export

The engine can export full CSV reports containing:
- Strategy info, execution time, duration
- Summary (status, total ops, bits changed, scores)
- Budget tracking (initial, used, remaining)
- Per-operation costs
- Step-by-step execution log
- Detailed transformation records
- Bit range summary
- Metrics comparison (initial vs final)
- Scoring summary

### runStep() — Runtime Selection

```typescript
private async runStep(file, stepType, stepIndex, bits, budget, runId, options?) {
  const jsEquivalent = getJSEquivalent(file.name);
  const useFallback = pythonExecutor.isFallbackMode() || !pythonExecutor.isPyodideAvailable();
  
  if (useFallback && jsEquivalent) {
    // Native JS execution
    return executeJSStrategy(jsEquivalent.content, jsContext);
  }
  
  // Python execution (Pyodide or regex fallback)
  return pythonExecutor.sandboxTest(file.content, context);
}
```

---

## 19. Unified Strategy V2

**File**: `src/lib/unifiedStrategy.ts` (1,089 lines)

### ALL_OPERATIONS (106+)

```typescript
export const ALL_OPERATIONS = [
  // Logic Gates (7): NOT, AND, OR, XOR, NAND, NOR, XNOR
  // Extended Logic (5): IMPLY, NIMPLY, CONVERSE, MUX, MAJ
  // Shifts (4): SHL, SHR, ASHL, ASHR
  // Rotations (2): ROL, ROR
  // Bit Manipulation (8): INSERT, DELETE, REPLACE, MOVE, TRUNCATE, APPEND, SWAP, EXTRACT
  // Packing (5): PAD, PAD_LEFT, PAD_RIGHT, UNPAD, ALIGN
  // Encoding (8+): GRAY, DEGRAY, ENDIAN, REVERSE, MANCHESTER, DEMANCHESTER, DIFF, DEDIFF
  // Line Codes (4): NRZI, DENRZI, RLL, DERLL
  // Compression (9): RLE, DERLE, DELTA, DEDELTA, ZIGZAG, DEZIGZAG, BWT, MTF, IMTF
  // Error Correction (5): HAMMING_ENC, HAMMING_DEC, CRC8, CRC16, CRC32
  // Base Encoding (4): BASE64_ENC, BASE64_DEC, HEX_ENC, HEX_DEC
  // Arithmetic (6): ADD, SUB, INCREMENT, DECREMENT, NEGATE, ABS
  // Advanced (8): SHUFFLE, DESHUFFLE, LFSR, SBOX, PERMUTE, FEISTEL, SCATTER, GATHER
  // Bit Operations (10+): MIRROR, REVERSE_BYTES, NIBBLE_SWAP, BIT_SPREAD, BIT_COMPACT, etc.
  // Checksums (4): FLETCHER, ADLER, LUHN, CHECKSUM
];
```

### ALL_METRICS (76+)

```typescript
export const ALL_METRICS = [
  // Core (5), Statistical (12), Information Theory (12), Compression (4),
  // Randomness (7), Transition (10), Pattern (10), Spectral (5),
  // Structure (8), Advanced (8), Autocorrelation (3)
];
```

---

## 20. Canonical Replay Engine

**File**: `src/lib/canonicalReplay.ts` (225 lines)

### Core Principle

> **Stored cumulative bits are the source of truth.** Re-execution is validation only.

```typescript
function replayFromStoredSteps(result: ExecutionResultV2, strictMode?: boolean): ReplayReport
```

### Replay Algorithm

For each step:
1. Get authoritative after-state: `cumulativeBits || fullAfterBits || afterBits`
2. Detect if segment-only operation
3. Re-execute operation with stored params (validation only)
4. Compare re-execution result to stored state
5. Flag mismatches via `verificationNote` (stored state still used for playback)
6. Advance `currentBits` to authoritative after-state
7. Compute hashes for chain verification

### Chain Verification

```typescript
const reconstructedFinalHash = hashBits(currentBits);
const expectedFinalHash = hashBits(result.finalBits);
const chainVerified = reconstructedFinalHash === expectedFinalHash;
```

---

## 21. Player Verification

**File**: `src/lib/playerVerification.ts` (249 lines)

### Independent "Source + Mask = Result" Verification

For each step:
1. Extract source bits and params
2. Re-execute operation independently
3. Compare to expected result
4. Report mismatches with exact positions

```typescript
interface IndependentVerificationResult {
  stepIndex: number;
  operation: string;
  passed: boolean;
  expectedBits: string;
  actualBits: string;
  mismatchCount: number;
  mismatchPositions: number[];
  paramsComplete: boolean;
  missingParams: string[];
  expectedHash: string;
  actualHash: string;
  segmentOnly: boolean;
  segmentPassed?: boolean;
}
```

---

## 22. Verification System

**File**: `src/lib/verificationSystem.ts` (232 lines)

### Hash Function

```typescript
function hashBits(bits: string): string {
  let hash = 0;
  for (let i = 0; i < bits.length; i++) {
    hash = ((hash << 5) - hash) + bits.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
}
```

Produces 8-character uppercase hex hash. Deterministic for same input.

### Stored Replay Verification

```typescript
function verifyReplayFromStored(
  initialBits: string,
  steps: TransformationStep[],
  expectedFinalBits: string,
  tolerancePercent: number = 0.1  // 0.1% mismatch tolerance
): VerificationResult
```

---

## 23. Results Manager

**File**: `src/lib/resultsManager.ts` (626 lines)

### ExecutionResultV2

```typescript
interface ExecutionResultV2 {
  id: string;
  strategyId: string;
  strategyName: string;
  startTime: number;
  endTime: number;
  duration: number;
  sourceFileId?: string;
  sourceFileName?: string;
  resultFileId?: string;
  initialBits: string;
  finalBits: string;
  initialMetrics: Record<string, number>;
  finalMetrics: Record<string, number>;
  steps: TransformationStep[];
  seedChain?: string[];
  summary: ExecutionSummary;
  benchmarks?: { cpuTime, peakMemory, operationCount, avgStepDuration, totalCost };
  filesUsed?: { algorithm, scoring, policy };
  status: 'completed' | 'failed' | 'partial';
}
```

### Storage

Results stored in localStorage with automatic ID generation and bookmarking support.

---

## 24. Report Generator

**File**: `src/lib/reportGenerator.ts` (823 lines)

Creates professional PDF reports using jsPDF with:
- Job reports, batch reports, comprehensive analysis
- Formatted headers, sections, tables
- Sequences, boundaries, anomalies data
- Page management with auto-pagination

---

## 25. Result Exporter

**File**: `src/lib/resultExporter.ts`

- **CSV**: Operation history with per-step metrics
- **JSON**: Full execution data
- **Journal Export**: Bundled publication-ready package

---

## 26. Job System

### Job Queue (`src/lib/jobQueue.ts`, 269 lines)

```typescript
type JobPriority = 'low' | 'normal' | 'high' | 'critical';
type JobQueueStatus = 'idle' | 'running' | 'paused' | 'stalled';
```

Features: Priority scheduling, pause/resume, progress tracking, stall detection, ETA estimation, queue statistics.

### Job Manager V2 (`src/lib/jobManagerV2.ts`)

Full job lifecycle management with result storage and batch coordination.

---

## 27. Plugin Manager

**File**: `src/lib/pluginManager.ts` (202 lines)

```typescript
type PluginType = 'operation' | 'metric' | 'visualization' | 'export';

interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  type: PluginType;
  enabled: boolean;
  code: string;         // Sandboxed JavaScript
  config: Record<string, any>;
}
```

Storage: `bsee_plugins` in localStorage. All plugin code executes via `safeExecute()`.

---

## 28. Anomalies Manager

**File**: `src/lib/anomaliesManager.ts` (443 lines)

```typescript
interface AnomalyDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high';
  minLength: number;
  enabled: boolean;
  detectFn: string;  // JavaScript function code (sandboxed)
}
```

Built-in anomalies: Palindrome detection. Users can add custom detection functions via Backend panel.

---

## 29. Data Generation

**File**: `src/lib/generationPresets.ts` (152 lines)

```typescript
interface GenerationConfig {
  mode: 'random' | 'pattern' | 'structured' | 'file-format';
  length: number;
  probability?: number;
  seed?: string;
  distribution?: 'uniform' | 'bernoulli' | 'gaussian';
  targetEntropy?: number;
  pattern?: string;
  repetitions?: number;
  noise?: number;
  template?: 'zeros' | 'ones' | 'alternating' | 'blocks' | 'gray-code' | 'fibonacci' | 'custom-rle';
  includeHeader?: boolean;
  headerPattern?: string;
}
```

Additional: `src/lib/expandedPresets.ts`, `src/lib/customPresetsManager.ts`

---

## 30. Notes Manager

**File**: `src/lib/notesManager.ts` (148 lines)

```typescript
interface Note {
  id: string;
  timestamp: Date;
  content: string;
  tags?: string[];
  pinned: boolean;
}
```

Pre-populated with a binary analysis cheat sheet (file signatures, common patterns).

---

## 31. Predefined Manager

**File**: `src/lib/predefinedManager.ts`

Central registry for all operations and metrics. Provides:
- `getOperation(id)`, `getAllOperations()`
- `getMetric(id)`, `getAllMetrics()`
- Support for code-based operations/metrics (user-defined JS)
- Enable/disable toggling

---

## 32. Command Parser

**File**: `src/lib/commandParser.ts`

Parses command-line syntax for the Transformations tab:
```
XOR mask=10101010
SHL count=3
GRAY direction=encode
```

---

## 33. Encoding Functions

**File**: `src/lib/encodingFunctions.ts`

Additional encoding/decoding utilities beyond the core operations.

---

## 34. Audio Utilities

**File**: `src/lib/audioUtils.ts`, `src/lib/audioExport.ts`

Convert binary data to audio representations for auditory analysis. Export as WAV using lamejs.

---

## 35. Chart Export

**File**: `src/lib/chartExport.ts`

Export chart visualizations as images using html2canvas.

---

## 36. UI Components — Main Panels

| Component | File | Purpose |
|-----------|------|---------|
| `AnalysisPanel` | `src/components/AnalysisPanel.tsx` | Primary binary viewer, metrics, transformations |
| `BackendPanel` | `src/components/BackendPanel.tsx` | System config, anomalies, guides |
| `AlgorithmPanel` | `src/components/AlgorithmPanel.tsx` | Strategy management, execution |
| `PlayerModePanel` | `src/components/PlayerModePanel.tsx` | File Player research environment |
| `Toolbar` | `src/components/Toolbar.tsx` | File ops, view controls, generation |
| `FileSystemSidebar` | `src/components/FileSystemSidebar.tsx` | File browser with groups |

---

## 37. UI Components — Algorithm Panel

| Component | Purpose |
|-----------|---------|
| `StrategyTabV7` | Main strategy management (cards, tagging, pinning) |
| `StrategyCreateTab` | Strategy creation wizard |
| `StrategyExecuteTab` | Execute strategies against files |
| `StrategyViewTab` | View strategy details |
| `StrategyComparer` | Cross-strategy comparison |
| `StrategyCreationWizard` | Step-by-step strategy builder |
| `StrategyExecutionTimeline` | Visual execution progress |
| `FilesTabV4` | Strategy file editor |
| `ResultsTab` | View execution results |
| `ConsoleTab` | Execution console output |
| `NeuralNetworkTab` | Neural network visualization |
| `PlayerTab` | Embedded player view |
| `PythonConsoleTab` | Python REPL |
| `ComparisonTab` | Side-by-side result comparison |
| `MetricsTimelineChart` | Metrics over execution steps |
| `BitDiffView` | Binary diff visualization |
| `MaskOverlayView` | Mask overlay on binary data |

---

## 38. UI Components — File Player

| Component | Tab | Purpose |
|-----------|-----|---------|
| `EnhancedDataView` | Analysis | Binary data inspection |
| `EnhancedDiffView` | Analysis | Step-by-step diff view |
| `EnhancedMaskView` | Analysis | Mask overlay visualization |
| `VerificationDashboard` | Verify | Independent verification results |
| `EnhancedMetricsTimeline` | Metrics | Metric evolution chart |
| `MetricSparklines` | Metrics | Mini metric charts |
| `CostTimeline` | Metrics | Budget consumption over time |
| `CodeContextView` | Code | Operation source code view |
| `ParameterInspector` | Code | Operation parameter details |
| `EnhancedStepDetails` | Data | Full step data view |
| `BitFieldViewer` | Data | Field decomposition |
| `BreakpointManager` | — | Step/metric breakpoints |
| `CheckpointPanel` | — | Save/restore state snapshots |
| `AnnotationSystem` | — | Notes on specific steps |
| `RegressionDetector` | — | Metric regression detection |
| `ErrorSummaryBar` | — | Aggregate error display |

---

## 39. UI Components — Backend Panel

| Sub-tab | Component | Purpose |
|---------|-----------|---------|
| Viewer | `ViewerTab` | Data inspection |
| Anomalies | `AnomaliesTab` | Anomaly definitions |
| Generation | `GenerationTab` | Data generation controls |
| Graphs | `GraphsTab` | Custom graph logic |
| Guides | `GuidesTab` | Documentation + operations guide |

---

## 40. UI Components — Dialogs

| Dialog | Purpose |
|--------|---------|
| `AudioVisualizerDialog` | Audio representation of binary data |
| `BitSelectionDialog` | Select bit ranges |
| `BitRangesWindow` | View/manage bit ranges |
| `ComparisonDialog` | Compare two files |
| `ConverterDialog` | Format conversion |
| `DataGraphsDialog` | Data visualization graphs |
| `GenerateDialog` | Binary data generation |
| `HistoryComparisonDialog` | Compare history entries |
| `JobsDialog` | Job management |
| `JumpToDialog` | Navigate to bit position |
| `PatternHeatmapDialog` | Pattern frequency heatmap |
| `PluginsDialog` | Plugin management |
| `ReportViewerDialog` | View generated reports |
| `TestSettingsDialog` | Test configuration |

---

## 41. Web Workers

| Worker | Purpose |
|--------|---------|
| `coreTests.worker.ts` | Core test execution in background thread |
| `extendedTests.worker.ts` | Extended test execution in background thread |

Communication via standard `postMessage` / `onmessage` protocol.

---

## 42. Test Infrastructure

| File | Tests | Scope |
|------|-------|-------|
| `comprehensiveTestSuite.ts` | 200+ | Full system verification |
| `testSuite.ts` | Core | Basic operation/metric tests |
| `smokeTests.ts` | Quick | Startup health check |
| `playerTestSuite.ts` | Player | Replay accuracy tests |
| `playerPipelineTestSuite.ts` | E2E | Generate → Execute → Replay → Verify |
| `testVectorsComplete.ts` | — | Complete test vectors for operations |
| `testStrategies.ts` | — | Strategy test configurations |
| `testScheduler.ts` | — | Test scheduling logic |
| `testWatchdog.ts` | — | Test timeout management |
| `tests/binaryMetrics.test.ts` | Unit | BinaryMetrics class |
| `tests/binaryModel.test.ts` | Unit | BinaryModel class |
| `tests/historyManager.test.ts` | Unit | HistoryManager class |
| `tests/testRunner.ts` | — | Test runner utilities |

### E2E Pipeline Test

```
1. Generate binary data (known seed)
2. Execute strategy (record all transformations)
3. Replay from stored results
4. Independently verify each step (Source + Params = Result)
5. Assert 100% bit-match between stored and replayed final bits
6. Verify chain hash: initialBits → step1 → step2 → ... → finalBits
```

---

## 43. Security Model

### Defense Layers

1. **Comment Stripping**: Prevents bypass via `// fetch(...)` hidden in comments
2. **Pattern Validation**: 36 regex patterns blocking network, storage, DOM, eval
3. **Global Shadowing**: Dangerous browser globals passed as `undefined` params
4. **Strict Mode**: All sandboxed code runs in `"use strict"`
5. **Type Checking**: Return value types validated (string for ops, number for metrics)
6. **Error Isolation**: Exceptions caught and wrapped in safe error messages

### What's Allowed

- Pure computation (math, string, loops, conditionals)
- `api.*` bridge methods
- Standard JS built-ins (`Math`, `JSON`, `Array`, `Object`, `String`, `Number`, `RegExp`, `Map`, `Set`, `Date`)
- `console.log` is NOT available (use `api.log`)

### What's Blocked

- All network access
- All persistent storage access
- All DOM manipulation
- All code generation (eval, new Function, dynamic import)
- All frame/worker access
- All navigation

---

## 44. Data Flow Diagrams

### Strategy Execution Flow

```
User clicks "Execute"
        │
        ▼
StrategyExecutionEngine.executeStrategy(strategy, sourceFileId, options)
        │
        ├─ fileSystemManager.getFile(sourceFileId) → sourceFile
        ├─ sourceFile.state.model.getBits() → initialBits
        ├─ calculateAllMetrics(initialBits) → initialMetrics
        │
        ▼
    ┌─────────────────────────┐
    │  For each file in:      │
    │  1. Scheduler           │
    │  2. Algorithm(s)        │
    │  3. Scoring(s)          │
    │  4. Policy(s)           │
    └────────┬────────────────┘
             │
             ▼
    runStep(file, stepType, bits, budget)
             │
             ├─ Build PythonContext { bits, budget, metrics, operations }
             ├─ Check: Pyodide available?
             │    ├─ No: Check JS equivalent?
             │    │    ├─ Yes: executeJSStrategy(jsContent, context) ← PRIMARY FALLBACK
             │    │    └─ No: pythonExecutor.sandboxTest() → regex fallback
             │    └─ Yes: pythonExecutor.sandboxTest() → Pyodide execution
             │
             ▼
    For each api.apply_operation() call inside strategy:
             │
             ├─ jsStrategyRuntime.api.apply_operation(opName, bits, params)
             │    ├─ executeOperation(opName, bits, params) ← operationsRouter
             │    │    ├─ Generate/reuse seed
             │    │    ├─ Generate deterministic mask (if needed)
             │    │    └─ OPERATION_IMPLEMENTATIONS[opName](bits, params)
             │    │         └─ binaryOperations.ts (actual math)
             │    │
             │    ├─ Record TransformationRecord
             │    ├─ calculateAllMetrics(currentBits) → metricsSnapshot
             │    └─ Deduct budget
             │
             ▼
    After all steps complete:
             │
             ├─ NO-OP FAIL GUARD: if totalOps > 0 && totalBitsChanged === 0 → throw
             ├─ fileSystemManager.createFile(resultFileName, finalBits) → resultFile
             ├─ resultsManager.createResult(executionData) → executionResult
             └─ Return ExecutionPipelineResult
```

### Replay & Verification Flow

```
File Player loads result from resultsManager
        │
        ▼
canonicalReplay.replayFromStoredSteps(result, strictMode)
        │
        ├── currentBits = result.initialBits
        ├── For each step i:
        │   ├── authoritativeAfter = step.cumulativeBits || step.fullAfterBits
        │   ├── RE-EXECUTE (validation only):
        │   │   └── executeOperation(step.operation, currentBits, step.params)
        │   ├── COMPARE: re-executed vs authoritative
        │   │   ├── Match → verified = true
        │   │   └── Mismatch → verified = false, verificationNote = "N bits differ"
        │   ├── USE AUTHORITATIVE for playback (never re-executed)
        │   ├── computeMetrics(authoritativeAfter) → metricsSnapshot
        │   └── currentBits = authoritativeAfter
        │
        ├── chainVerified = hashBits(currentBits) === hashBits(result.finalBits)
        │
        └── Return ReplayReport { steps[], verifiedSteps, failedSteps, chainVerified }

playerVerification.verifyAll(steps)
        │
        ├── For each step:
        │   ├── Extract source bits + params
        │   ├── Re-execute independently
        │   ├── Compare expected vs actual
        │   └── Record mismatchCount, mismatchPositions[]
        │
        └── Return FullVerificationReport
```

---

## 45. Diagnostic Logging

### Tagged Log Prefixes

| Tag | Source File | Purpose |
|-----|-----------|---------|
| `[PYEXEC]` | pythonExecutor.ts | Pyodide execution lifecycle |
| `[PYEXEC-FALLBACK]` | pythonExecutor.ts | Fallback interpreter activated |
| `[FALLBACK-PARSE]` | pythonExecutor.ts | Line-by-line regex parsing |
| `[BRIDGE]` | pythonExecutor.ts | API bridge calls with params |
| `[OP-ROUTER] ▶` | operationsRouter.ts | Operation start with input info |
| `[OP-ROUTER] ✓` | operationsRouter.ts | Operation complete with results |
| `[OP-ROUTER] ⚠` | operationsRouter.ts | Zero bits changed warning |
| `[OP-ROUTER] ✗` | operationsRouter.ts | Operation not found / failed |
| `[EXEC-ENGINE]` | strategyExecutionEngine.ts | Pipeline step results |
| `[EXEC-ENGINE] ⛔` | strategyExecutionEngine.ts | No-op fail guard / JS errors |
| `[REPLAY] ▶` | canonicalReplay.ts | Replay start |
| `[REPLAY]` | canonicalReplay.ts | Per-step replay info |
| `[REPLAY] ✓` | canonicalReplay.ts | Replay complete summary |
| `[PLAYER-UI]` | PlayerModePanel.tsx | UI state interpretation |

### Debugging Workflow

1. Open browser DevTools → Console
2. Filter by `[EXEC-ENGINE]` — see pipeline status
3. Look for `⛔` or `⚠` markers — critical issues
4. Filter by `[OP-ROUTER]` — see individual operation results
5. If zero bits changed: check `[BRIDGE]` — parameter issues
6. If replay fails: check `[REPLAY]` — stored state vs re-executed state

---

## 46. Complete Operation Reference

See Section 4 (Operations Router) for the complete list of 106+ operations with:
- Implementation details
- Default parameters
- Cost values
- Truth tables (for logic gates)
- Algorithm descriptions

---

## 47. Complete Metric Reference

See Section 5 (Metrics Calculator) for the complete list of 76+ metrics with:
- Formulas and algorithms
- Return value ranges
- Categories and groupings

---

## 48. Complete Interface Reference

### Core Data Interfaces

```typescript
// Operation execution
interface OperationParams { mask?, count?, position?, bits?, start?, end?, source?, dest?, direction?, value?, alignment?, word_size?, seed? }
interface OperationResult { success, bits, error?, operationId, params, seed? }

// Metric calculation
interface MetricResult { success, value, error?, metricId }
interface AllMetricsResult { success, metrics, errors, coreMetricsComputed }

// Transformation recording
interface TransformationRecord { operation, params, fullBeforeBits, fullAfterBits, beforeBits, afterBits, bitRanges, bitsChanged, segmentBitsChanged, cost, duration, cumulativeBits, metricsSnapshot, segmentOnly }

// Strategy
interface PythonFile { id, name, content, group, customGroup?, created, modified }
interface StrategyConfig { id, name, schedulerFile, algorithmFiles[], scoringFiles[], policyFiles[], created }

// Execution
interface ExecutionRuntimeOptions { seed?, timeout?, budgetOverride?, stepMode?, retryOnFailure?, operationWhitelist?, operationBlacklist?, ... }
interface ExecutionPipelineResult { success, error?, strategyId, strategyName, sourceFileId, initialBits, finalBits, steps[], scores[], budgetConfig, totalOperations, totalBitsChanged, resultFileId, resultId }
interface StepResult { stepIndex, stepType, fileName, bits, metrics, score?, policyPassed?, logs[], transformations[], duration }

// Results storage
interface TransformationStep { index, operation, params?, fullBeforeBits, fullAfterBits, beforeBits, afterBits, metrics, timestamp, duration, bitRanges?, cost?, cumulativeBits?, segmentOnly?, segmentBitsChanged?, fullBitsChanged?, memoryWindow? }
interface ExecutionResultV2 { id, strategyId, strategyName, initialBits, finalBits, steps[], seedChain?, summary, benchmarks?, status }

// Replay
interface ReplayStep { stepIndex, operation, params, authoritativeBeforeBits, authoritativeAfterBits, authoritativeCumulativeBits, verified, verificationNote?, metrics, cost, beforeHash, afterHash }
interface ReplayReport { steps[], totalSteps, verifiedSteps, failedSteps, chainVerified, initialHash, finalHash, reconstructedFinalHash }

// Verification
interface IndependentVerificationResult { stepIndex, operation, passed, expectedBits, actualBits, mismatchCount, mismatchPositions[], paramsComplete, missingParams[] }
interface FullVerificationReport { totalSteps, passedSteps, failedSteps, overallPassed, chainVerified, stepResults[] }

// File system
interface BinaryFile { id, name, created, modified, type, state, group?, isTemp? }
interface BinaryStats { totalBits, totalBytes, zeroCount, oneCount, entropy, longestZeroRun, longestOneRun, meanRunLength, estimatedCompressedSize }

// Jobs
interface QueuedJob { id, priority, createdAt, startedAt?, progress, estimatedDuration? }
type JobPriority = 'low' | 'normal' | 'high' | 'critical';

// Plugins
interface Plugin { id, name, version, description, type, enabled, code, config }
type PluginType = 'operation' | 'metric' | 'visualization' | 'export';

// Anomalies
interface AnomalyDefinition { id, name, description, category, severity, minLength, enabled, detectFn }

// History
interface HistoryEntry { id, timestamp, description, bits, stats? }

// Notes
interface Note { id, timestamp, content, tags?, pinned }

// Sandbox
interface ValidationResult { safe, violations[] }

// Generation
interface GenerationConfig { mode, length, probability?, seed?, distribution?, pattern?, template?, ... }

// JS Strategy Runtime
interface JSStrategyContext { bits, budget, metrics, operations, seed? }
interface JSStrategyResult { success, output, logs[], error?, duration, transformations[], finalBits, metrics, stats }
```

---

## 49. Complete Function Reference

### operationsRouter.ts

| Function | Signature | Description |
|----------|-----------|-------------|
| `executeOperation` | `(opId, bits, params?) → OperationResult` | Execute operation by ID |
| `executeOperationOnRange` | `(opId, bits, start, end, params?) → OperationResult` | Execute on bit range |
| `registerOperation` | `(opId, impl) → void` | Register custom operation |
| `unregisterOperation` | `(opId) → void` | Remove custom operation |
| `hasImplementation` | `(opId) → boolean` | Check if implemented |
| `getAvailableOperations` | `() → string[]` | Get all executable operation IDs |
| `getOperationCost` | `(opId) → number` | Get budget cost |
| `getImplementedOperations` | `() → string[]` | Same as getAvailableOperations |

### metricsCalculator.ts

| Function | Signature | Description |
|----------|-----------|-------------|
| `calculateMetric` | `(metricId, bits) → MetricResult` | Calculate single metric |
| `calculateMetricOnRange` | `(metricId, bits, start, end) → MetricResult` | Calculate on range |
| `calculateAllMetrics` | `(bits) → AllMetricsResult` | Calculate all available metrics |
| `calculateMetrics` | `(bits, metricIds[]) → AllMetricsResult` | Calculate specific metrics |
| `registerMetric` | `(metricId, impl) → void` | Register custom metric |
| `unregisterMetric` | `(metricId) → void` | Remove custom metric |
| `getAvailableMetrics` | `() → string[]` | Get all available metric IDs |
| `hasImplementation` | `(metricId) → boolean` | Check if implemented |
| `getFullAnalysis` | `(bits) → BinaryStats` | Full BinaryMetrics analysis |
| `getAdvancedAnalysis` | `(bits) → AdvancedMetrics` | Full advanced analysis |

### sandboxedExec.ts

| Function | Signature | Description |
|----------|-----------|-------------|
| `validateCode` | `(code) → ValidationResult` | Check for blocked patterns |
| `safeExecute` | `(paramNames, body, args) → T` | Validated sandboxed execution |
| `validateSyntax` | `(paramNames, body) → {valid, error?}` | Syntax-only validation |

### jsStrategyRuntime.ts

| Function | Signature | Description |
|----------|-----------|-------------|
| `executeJSStrategy` | `(jsCode, context) → JSStrategyResult` | Execute JS strategy |
| `generateJSStrategyFile` | `(modelName, sequence, config) → string` | Generate strategy code |

### jsStrategyFiles.ts

| Function | Signature | Description |
|----------|-----------|-------------|
| `getJSEquivalent` | `(pythonFileName) → {name, content, type} \| null` | Get JS version of Python file |

### canonicalReplay.ts

| Function | Signature | Description |
|----------|-----------|-------------|
| `replayFromStoredSteps` | `(result, strictMode?) → ReplayReport` | Replay all steps |

### verificationSystem.ts

| Function | Signature | Description |
|----------|-----------|-------------|
| `hashBits` | `(bits) → string` | Deterministic 8-char hex hash |
| `verifyReplayFromStored` | `(initial, steps, expected, tolerance?) → VerificationResult` | Verify replay |

---

## 50. Configuration & Build

### Vite Config (`vite.config.ts`)

Standard Vite + React setup with path aliases.

### TypeScript Config

- `tsconfig.json` — Base config
- `tsconfig.app.json` — App-specific (strict, JSX)
- `tsconfig.node.json` — Node tools config

### Tailwind Config (`tailwind.config.ts`)

Uses shadcn/ui design tokens with semantic CSS variables:
- `--background`, `--foreground`
- `--primary`, `--primary-foreground`
- `--secondary`, `--muted`, `--accent`
- `--destructive`, `--border`, `--ring`
- Dark mode support via `class` strategy

### CSS Design System (`src/index.css`)

HSL-based color tokens in `:root` and `.dark` selectors.

---

## 51. How-To Guides

### Add a New Operation

1. **Implement** in `binaryOperations.ts` under the appropriate class
2. **Register** in `operationsRouter.ts` → `OPERATION_IMPLEMENTATIONS` map
3. **Set cost** in `operationsRouter.ts` → `OPERATION_COSTS`
4. **Add default params** in `unifiedStrategy.ts` → `OPERATION_PARAMS`
5. **Add JS fallback params** in `jsStrategyFiles.ts` → `OP_PARAMS_JS`
6. **Add to list** in `unifiedStrategy.ts` → `ALL_OPERATIONS`
7. **Register in predefinedManager** for UI visibility

### Add a New Metric

1. **Implement** function in `binaryMetrics.ts` or `advancedMetrics.ts`
2. **Register** in `metricsCalculator.ts` → `METRIC_IMPLEMENTATIONS`
3. **Add to list** in `unifiedStrategy.ts` → `ALL_METRICS`
4. **Register in predefinedManager** for UI visibility

### Add a Custom Anomaly

1. Open Backend panel → Anomalies tab
2. Click "Add Anomaly"
3. Fill: name, category, severity, min length
4. Write detection function:
   ```javascript
   function detect(bits, minLength) {
     const results = [];
     // ... detection logic ...
     results.push({ start: pos, length: len, description: "..." });
     return results;
   }
   ```
5. Detection code runs in sandbox — no network/DOM access

### Add a Plugin

1. Open Plugins dialog from toolbar
2. Click "Create Plugin"
3. Select type: operation | metric | visualization | export
4. Write plugin code (sandboxed JavaScript)
5. Configure settings
6. Enable/disable without deletion

### Create a Strategy

1. Open Algorithm panel → Strategy tab → Create
2. Select/create files for each role:
   - **Scheduler** (1 required): Pipeline setup
   - **Algorithm** (1+ required): Transformation logic
   - **Scoring** (1+ required): Budget + evaluation
   - **Policy** (0+ optional): Validation rules
3. Name and save the strategy
4. Execute against a data file

### Export Results

- **PDF**: Backend → Reports → Generate Report
- **CSV**: After execution → Export CSV
- **JSON**: Results tab → Export JSON
- **Journal**: Full artifact bundle for publication

---

## 52. Known Limitations

| Limitation | Impact | Mitigation |
|-----------|--------|------------|
| Pyodide unavailable in preview/some environments | No full Python execution | JS Native fallback provides complete coverage |
| Python regex fallback limited | Cannot parse classes, generators, try/except | JS equivalents bypass it entirely |
| localStorage ~5-10MB limit | Large results may fail to persist | Consider IndexedDB for future |
| Single-threaded execution | Long strategies block UI | Web Workers available for tests |
| BWT limited to 64 bits | Performance constraint | Sufficient for research scenarios |
| No server persistence | Data lost on browser clear | Export features preserve data |
| `\bself\b` blocked in sandbox | Cannot use `self` variable name | Use different variable names |
| `\btop\b` blocked in sandbox | Cannot use `top` standalone | Use qualified references |

---

## 53. File Index

### Core Libraries (`src/lib/`) — 30+ files, ~15,000+ lines

| File | Lines | Purpose |
|------|-------|---------|
| `binaryOperations.ts` | 536 | 106+ binary operation implementations |
| `operationsRouter.ts` | 1,486 | Operation ID → implementation registry |
| `metricsCalculator.ts` | 1,349 | Metric ID → calculation registry |
| `binaryMetrics.ts` | 258 | Core binary statistics |
| `advancedMetrics.ts` | 403 | Statistical and randomness analysis |
| `idealityMetrics.ts` | 174 | Repeating sequence detection |
| `bitstreamAnalysis.ts` | 448 | Pattern matching, tokenization |
| `pythonExecutor.ts` | 1,570 | Pyodide lifecycle + Python bridge + fallback |
| `jsStrategyRuntime.ts` | 273 | JS sandbox execution with API bridge |
| `jsStrategyFiles.ts` | 320 | Native JS strategy implementations |
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
| `expandedPresets.ts` | — | Additional generation presets |
| `customPresetsManager.ts` | — | User-defined presets |
| `predefinedManager.ts` | — | Operation/metric registry |
| `commandParser.ts` | — | CLI syntax parser |
| `encodingFunctions.ts` | — | Additional encoding utilities |
| `audioUtils.ts` | — | Binary → audio conversion |
| `audioExport.ts` | — | WAV export |
| `chartExport.ts` | — | Chart → image export |
| `idleDetector.ts` | — | User idle detection |
| `fileValidator.ts` | — | File validation utilities |
| `implementationRegistry.ts` | — | Implementation tracking |
| `enhancedMetrics.ts` | — | Enhanced metric calculations |

### UI Components (`src/components/`) — 70+ files

#### Main Panels
- `AnalysisPanel.tsx`, `BackendPanel.tsx`, `AlgorithmPanel.tsx`
- `PlayerModePanel.tsx`, `Toolbar.tsx`, `FileSystemSidebar.tsx`

#### Algorithm Sub-components (`src/components/algorithm/`)
- `StrategyTabV7.tsx` (and V1-V6 legacy)
- `StrategyCreateTab.tsx`, `StrategyExecuteTab.tsx`, `StrategyViewTab.tsx`
- `StrategyComparer.tsx`, `StrategyCreationWizard.tsx`
- `StrategyExecutionTimeline.tsx`, `StrategyTimelineV2.tsx`, `StrategyTimelineV3.tsx`
- `FilesTab.tsx` through `FilesTabV4.tsx`
- `ResultsTab.tsx`, `ConsoleTab.tsx`, `PythonConsoleTab.tsx`
- `NeuralNetworkTab.tsx`, `PlayerTab.tsx`, `ComparisonTab.tsx`
- `MetricsTimelineChart.tsx`, `BitDiffView.tsx`, `MaskOverlayView.tsx`

#### Player Sub-components (`src/components/player/`)
- `EnhancedDataView.tsx`, `EnhancedDiffView.tsx`, `EnhancedMaskView.tsx`
- `EnhancedMetricsTimeline.tsx`, `EnhancedStepDetails.tsx`
- `VerificationDashboard.tsx`, `BitFieldViewer.tsx`
- `BreakpointManager.tsx`, `CheckpointPanel.tsx`
- `AnnotationSystem.tsx`, `RegressionDetector.tsx`
- `CodeContextView.tsx`, `ParameterInspector.tsx`
- `CostTimeline.tsx`, `MetricSparklines.tsx`
- `ErrorSummaryBar.tsx`

#### Backend Sub-components (`src/components/backend/`)
- `ViewerTab.tsx`, `AnomaliesTab.tsx`, `GenerationTab.tsx`
- `GraphsTab.tsx`, `GuidesTab.tsx`

#### Dialogs
- `AudioVisualizerDialog.tsx`, `BitSelectionDialog.tsx`
- `ComparisonDialog.tsx`, `ConverterDialog.tsx`
- `DataGraphsDialog.tsx`, `GenerateDialog.tsx`
- `HistoryComparisonDialog.tsx`, `JobsDialog.tsx`
- `JumpToDialog.tsx`, `PatternHeatmapDialog.tsx`
- `PluginsDialog.tsx`, `ReportViewerDialog.tsx`
- `TestSettingsDialog.tsx`

#### Other Components
- `AIModePanel.tsx`, `BatchJobsUI.tsx`
- `BinaryViewer.tsx`, `BitRangesWindow.tsx`
- `BitstreamAnalysisPanel.tsx`, `BoundariesPanel.tsx`
- `CodeFileEditor.tsx`, `HistoryPanel.tsx`, `HistoryPanelNew.tsx`
- `ImplementationViewer.tsx`, `MetricsCodeEditor.tsx`
- `NotesPanel.tsx`, `OperationsCodeEditor.tsx`
- `OperationsGuide.tsx`, `PartialRangeMetrics.tsx`
- `PartitionsPanel.tsx`, `QueueTimeline.tsx`
- `SequencesPanel.tsx`, `StartupTestSuite.tsx`
- `TransformationsPanel.tsx`

### Test Files (`src/lib/` + `src/tests/`)
- `comprehensiveTestSuite.ts`, `testSuite.ts`, `smokeTests.ts`
- `playerTestSuite.ts`, `playerPipelineTestSuite.ts`
- `testVectorsComplete.ts`, `testStrategies.ts`
- `testScheduler.ts`, `testWatchdog.ts`
- `playerReportGenerator.ts`, `playerVerification.ts`
- `tests/binaryMetrics.test.ts`, `tests/binaryModel.test.ts`
- `tests/historyManager.test.ts`, `tests/testRunner.ts`

### Workers (`src/workers/`)
- `coreTests.worker.ts`, `extendedTests.worker.ts`
- `worker-types.d.ts`

### Configuration
- `vite.config.ts`, `tailwind.config.ts`, `tsconfig.json`
- `tsconfig.app.json`, `tsconfig.node.json`
- `postcss.config.js`, `eslint.config.js`
- `components.json` (shadcn/ui config)
- `package.json`, `index.html`

---

*This documentation covers every file, interface, function, operation, metric, and data flow in the BSEE project. For implementation-level details, refer to the source files directly. Total documented items: 106+ operations, 76+ metrics, 48+ interfaces, 50+ exported functions, 100+ source files.*
