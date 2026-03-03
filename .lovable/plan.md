

# Comprehensive Plan: Player Mode Fixes, Phase 5 Features, Execution Options, AI Mode, and Player Tests

## Part 1: Critical Bug - Why Operations Show No Change in Player Mode

### Root Cause Analysis

After deep-diving into the code, the root cause of "NOT and most operations not changing anything" in File Player mode is a **multi-layered problem**:

**Bug 1: Fallback execution drops parameters**
In `src/lib/pythonExecutor.ts` line 451, when Pyodide fails to load (very common in browser), the fallback parser calls:
```text
bridgeObj.bridge.apply_operation(opName, '', {});
```
It passes **empty params `{}`** regardless of what the Python code specifies. The `executeOperation` function then auto-generates a new seed/mask, but the fallback parser never passes custom params from the Python code at all.

**Bug 2: Re-execution in Player generates different seeds**
In `PlayerModePanel.tsx` lines 146-204, when re-executing for verification, it passes `originalStep.params` which SHOULD contain the stored seed. However, `executeOperation` at line 1277 generates `${Date.now()}_${operationId}_${bits.length}` - a **new timestamp-based seed** for every call. If the stored params don't have a `seed` field (because the original execution was via fallback mode which passed `{}`), the re-execution generates a completely different mask.

**Bug 3: Stored `cumulativeBits` may equal `beforeBits`**
When the fallback execution parses Python but fails to match the regex patterns (e.g., the Python uses `params={'mask': '...'}` which the simple regex at line 448 doesn't capture), no operation is actually applied, so `cumulativeBits === beforeBits`. The Player then shows zero changes because the stored "truth" IS identical.

### Fixes Required

**File: `src/lib/pythonExecutor.ts`**
- Enhance the fallback parser to extract params from `apply_operation` calls (parse the second and third arguments)
- Handle `apply_operation('NOT')`, `apply_operation('XOR', bits, {'mask': '...'})`, and similar patterns
- Pass extracted params through to the bridge instead of hardcoded `{}`

**File: `src/components/PlayerModePanel.tsx`**
- Add an **independent verification** path: take the source bits from step N, take the stored params (mask, seed), call `executeOperation` directly, and compare with `afterBits`
- If stored params have no seed/mask, flag as "params not stored - cannot verify independently"
- Add a "Re-execute from scratch" button that runs the full chain from `initialBits` using stored params

**File: `src/lib/operationsRouter.ts`**
- When `params.seed` already exists (from stored replay), do NOT overwrite it with a new timestamp seed
- Only generate a new seed when `paramsUsed.seed` is genuinely undefined/empty

---

## Part 2: Independent Operation Verification (Source + Mask = Expected Result)

Add a dedicated verification function that:
1. Takes the source bits (the specific range from `fullBeforeBits`)
2. Takes the stored mask/seed from `params`
3. Calls `executeOperation(opId, sourceBits, storedParams)` independently
4. Compares the result with `fullAfterBits` at the same range
5. Reports: match/mismatch, bit positions that differ, whether the stored params were complete

**New file: `src/lib/playerVerification.ts`**
- `verifyStepIndependently(step)` - verifies a single step
- `verifyAllStepsIndependently(initialBits, steps)` - chain verification from scratch
- `generateVerificationReport(result)` - exportable JSON/PDF report
- Tracks: seed match, mask match, output match, length match, parameter completeness

**Integration into Player:**
- Add "Independent Verify" button on each step in the Verification Dashboard
- Show green/red indicator per step based on independent verification
- Export verification report from Player mode

---

## Part 3: Player Mode Tab Consolidation (Reduce Redundancy)

Currently there are 9 tabs: Step, Verify, Params, Bits, Code, Mask, Diff, Metrics, Data. Several overlap significantly:

### Proposed Consolidation: 5 Primary Tabs with Sub-tabs

**Tab 1: "Analysis" (merges Step + Bits + Diff)**
- Sub-view: Step Details (operation info, params summary, bit change stats)
- Sub-view: Bit Field (before/after side-by-side with highlighting)
- Sub-view: Diff (side-by-side, unified, heatmap modes)

**Tab 2: "Verify" (merges Verify + Params + independent verification)**
- Sub-view: Dashboard (overall status, hash comparison, per-step list)
- Sub-view: Parameters (inspector with seed chain, auto/manual badges)
- Sub-view: Independent Verify (source + mask = result check)

**Tab 3: "Metrics" (keeps current timeline + adds sparklines and cost)**
- Sub-view: Timeline (charts for entropy, balance, budget)
- Sub-view: Sparklines (inline metric deltas per step)
- Sub-view: Cost (budget timeline, operation cost breakdown)

**Tab 4: "Code" (keeps current code context)**
- Source file, line number, execution reasoning

**Tab 5: "Data" (merges Data + Mask)**
- Sub-view: Hex/ASCII/Binary stats
- Sub-view: Mask overlay and byte-level intensity

This reduces the tab bar from 9 items to 5, grouping related features logically.

---

## Part 4: Phase 5 Features

### 4A. Breakpoint Replay
**File: `src/components/PlayerModePanel.tsx`**
- Add `breakpoints: Set<number>` state for step indices
- Add `breakpointConditions: Map<number, { type: 'metric' | 'operation'; condition: string }>` for conditional breakpoints
- During playback (`isPlaying`), check if current step is a breakpoint and pause
- Add breakpoint toggle button on each step in the step list
- Add "Continue to next breakpoint" button
- Support breakpoint types: step index, operation name, metric threshold (e.g., "pause when entropy < 0.5")

### 4B. Metric Overlay Sparklines
**New file: `src/components/player/MetricSparklines.tsx`**
- For each tracked metric, render a tiny inline sparkline (using recharts `<Sparkline>` or simple SVG path)
- Show alongside the step list or in the Metrics sub-tab
- Highlight the current step position on each sparkline
- Show delta arrows (up/down) with magnitude
- Configurable: user selects which 3-5 metrics to track

### 4C. Operation Cost Timeline
**New file: `src/components/player/CostTimeline.tsx`**
- Stacked bar chart showing cost per step (using recharts)
- Running total line overlaid
- Budget remaining indicator with warning zone
- Pie chart breakdown by operation type
- Cost efficiency metric (bits changed per unit cost)

### 4D. Checkpoint System
**State additions to `PlayerModePanel.tsx`:**
- `checkpoints: Map<string, { stepIndex: number; name: string; bits: string; metrics: Record<string, number> }>`
- Save checkpoint: captures current step state
- Restore checkpoint: jumps to saved step and loads bits
- Compare two checkpoints: side-by-side bit diff
- Persist checkpoints in localStorage per result ID
- "Mark as known good" flag for regression baseline

### 4E. Regression Detection
**New file: `src/components/player/RegressionDetector.tsx`**
- Select two results from the results database
- Side-by-side step comparison
- Highlight divergence point (first step where outputs differ)
- Show parameter differences between runs
- Compare final metrics
- Useful for "did my algorithm change break something?"

### 4F. Annotation System
**State additions to `PlayerModePanel.tsx`:**
- `annotations: Map<number, { text: string; timestamp: Date; author?: string }>`
- Per-step annotation input (inline textarea)
- Markdown rendering for annotations
- Export annotations with verification report
- Persist in localStorage with result ID

---

## Part 5: More Execution Options (Strategy Tab and Jobs Tab)

### New Options to Add

**File: `src/components/algorithm/StrategyExecuteTab.tsx` (add to advanced options section)**
**File: `src/components/JobsDialog.tsx` (mirror same options)**

1. **Iteration Count** - Run strategy N times, aggregate results
   - Input field: number (default 1)
   - Shows average/min/max metrics across iterations

2. **Retry on Failure** - Auto-retry failed steps
   - Switch + retry count input (default 0)
   - Exponential backoff between retries

3. **Operation Whitelist** - Only allow specific operations
   - Multi-select dropdown from all available operations
   - Empty = all allowed

4. **Operation Blacklist** - Exclude specific operations
   - Multi-select dropdown
   - Mutually exclusive with whitelist

5. **Snapshot Interval** - Save full bit state every N steps
   - Number input (default: every step)
   - Reduces memory for large step counts

6. **Dry Run** - Validate without executing
   - Switch
   - Checks file existence, param validity, budget sufficiency

7. **Profile Mode** - Measure per-operation timing
   - Switch
   - Stores `performance.now()` deltas per step

8. **Bit Range Restriction** - Only apply to specific range
   - Start/End inputs
   - Operations only affect bits[start:end]

9. **Budget Mode** - Strict / Soft / Unlimited
   - Select dropdown
   - Strict: stop at zero, Soft: warn but continue, Unlimited: no budget tracking

10. **Comparison Baseline** - Auto-compare with a stored result
    - Result selector dropdown
    - Shows diff after execution

---

## Part 6: Strategy Tab Enhancements (Analysis Mode)

### Additional features for the Strategy Tab:

1. **Strategy Diff** - Compare two strategies' file contents side-by-side
2. **Strategy Templates Gallery** - Pre-built strategies for common tasks (maximize entropy, minimize cost, balanced optimization)
3. **Strategy Cloning** - Duplicate a strategy with all files
4. **Strategy Export/Import** - ZIP containing all strategy files + config
5. **Execution History Graph** - Trend chart of scores/metrics across multiple runs of the same strategy
6. **Parameter Sweep** - Run strategy with varying parameters (e.g., budget from 100 to 10000 in steps)
7. **A/B Testing Mode** - Run two strategies on the same file, compare results automatically
8. **Strategy Health Check** - Validate all files exist, syntax is correct, operations referenced exist
9. **Quick Run** - Execute with defaults on the currently active file (one click)
10. **Favorite Operations** - Pin frequently used operations in the strategy creation wizard

---

## Part 7: AI Mode Assessment

### Is AI Worth Adding?

**Potential AI Mode architecture:**
- Train a model (or use Lovable AI gateway) to predict which operation sequences improve specific metrics
- Input: current bit state features (entropy, balance, transition rate, etc.)
- Output: suggested operation + params + expected metric improvement + cost
- Could use reinforcement learning: reward = metric improvement / cost

**Pros:**
- Could discover non-obvious operation sequences humans wouldn't try
- Adaptive strategies that learn from execution history
- Could pre-screen operations before spending budget

**Cons:**
- Training data comes from your own execution history (chicken-and-egg for new setups)
- External AI API calls add latency and cost per operation decision
- Binary operations are deterministic - the "best" sequence for a given input is computable, not learned
- Adds complexity to an already complex system
- AI model suggestions still need verification (adds overhead)

**Recommendation:** Start with a **rule-based heuristic system** instead:
- Analyze current bit state
- Recommend operations based on metric goals (e.g., "entropy too low? Try SHUFFLE or XOR with random mask")
- No training needed, fully deterministic, zero latency
- Later, optionally add an AI advisor that calls Lovable AI to analyze execution history and suggest strategy improvements

**If you DO want AI:**
- Create a Supabase edge function `strategy-advisor` that calls Lovable AI
- Send: current metrics, available operations with costs, optimization goal
- Receive: ranked operation suggestions with expected improvements
- Display in Strategy Tab as "AI Suggestions" panel
- Requires enabling Lovable Cloud first

---

## Part 8: Export Reports from Player Mode

**New file: `src/lib/playerReportGenerator.ts`**

Generate comprehensive PDF/JSON reports from Player mode including:

1. **Verification Report**
   - Overall pass/fail status
   - Per-step verification results
   - Independent verification results (source + mask = expected)
   - Hash chain (initial -> step 1 -> step 2 -> ... -> final)

2. **Issues Report**
   - All errors classified by category
   - Steps with identity operations (no change)
   - Steps with missing params
   - Steps with length mismatches
   - Suggested fixes for each issue

3. **Transformation Report**
   - Full operation chain with before/after bits
   - Parameter details per step
   - Metric changes per step
   - Cost breakdown

4. **Comparison Report**
   - Side-by-side comparison between two runs
   - Divergence point identification
   - Metric drift analysis

**UI:** Add an "Export" dropdown button in the Player header with options for each report type.

---

## Part 9: Comprehensive Player Mode Test Suite (100+ tests)

**New file: `src/lib/playerTestSuite.ts`**

### Test Categories:

**A. Operation Correctness Tests (30+ tests)**
Test each operation independently with known input/output:
- NOT: `10101010` should produce `01010101` (verify every bit flipped)
- XOR with mask `11110000`: first 4 bits flip, last 4 unchanged
- ROL by 1: `10000000` -> `00000001`
- AND with mask: only bits where mask=1 survive
- SHL by 2: `11000000` -> `00000000` (shifted out)
- GRAY encode: `0000` -> `0000`, `0001` -> `0001`, `0010` -> `0011`
- One test per operation type, verifying exact bit-level output

**B. Parameter Persistence Tests (20+ tests)**
- Verify that `executeOperation` stores seed in `result.params.seed`
- Verify that mask-requiring ops store mask in `result.params.mask`
- Verify that SHUFFLE stores count/seed
- Verify that LFSR stores count
- Verify that re-executing with stored params produces identical output
- Verify that two executions with same seed produce same mask
- Verify that different seeds produce different masks

**C. Replay Determinism Tests (20+ tests)**
- Execute operation, store result, re-execute with stored params, compare
- Chain of 3 operations: execute, store all params, replay from scratch, verify 100% match
- Test with NOT (no params needed)
- Test with XOR (mask needed)
- Test with SHUFFLE (seed needed)
- Test with ROL (count needed)
- Test chains: NOT -> XOR -> ROL, verify final bits match
- Test that `Date.now()` seed is NOT regenerated when `params.seed` exists

**D. Bit Range Tests (15+ tests)**
- Operation on range [0:4] only affects those 4 bits
- Rest of bits unchanged after range operation
- Range [4:8] with NOT flips only bits 4-7
- Overlapping ranges handled correctly
- Edge cases: range [0:0], range [0:length], range [length:length]

**E. Verification System Tests (15+ tests)**
- `hashBits` produces consistent hash for same input
- `hashBits` produces different hash for different input
- `verifyReplayFromStored` passes for correct replay
- `verifyReplayFromStored` fails for corrupted step
- Independent verification matches stored result
- Length mismatch detection works
- Identity operation detection works
- Missing param detection works

**F. Edge Case Tests (10+ tests)**
- Empty bit string operations
- Single bit operations
- Very long bit strings (1000+ bits)
- All zeros input
- All ones input
- Alternating pattern input
- Operations that change length (EXTEND, CONCAT)
- Operations that don't change bits (BUFFER, COPY, BTEST)

**G. Error Classification Tests (10+ tests)**
- Verify `operation_failure` category on invalid operation
- Verify `length_mismatch` on length-changing ops
- Verify `identity_op` on no-change ops
- Verify `param_missing` when no mask stored
- Verify `non_deterministic` when replay differs

### Test Infrastructure

```text
interface PlayerTest {
  id: string;
  category: 'operation' | 'param_persistence' | 'replay' | 'bit_range' | 'verification' | 'edge_case' | 'error_class';
  name: string;
  description: string;
  run: () => { passed: boolean; expected: any; actual: any; details?: string };
}
```

Test runner produces a report showing:
- Total tests, passed, failed
- Per-category breakdown
- Detailed failure messages with expected vs actual
- Exportable as JSON

---

## Part 10: Implementation Order

### Phase A: Fix Critical Bugs (must do first)
1. Fix `operationsRouter.ts` - don't overwrite existing seed in params
2. Fix `pythonExecutor.ts` fallback parser to extract and pass params
3. Fix `PlayerModePanel.tsx` re-execution to use stored params correctly
4. Add independent verification function in `playerVerification.ts`

### Phase B: Player Tab Consolidation
1. Merge Step + Bits + Diff into "Analysis" tab with sub-views
2. Merge Verify + Params into "Verify" tab with sub-views
3. Merge Data + Mask into "Data" tab with sub-views
4. Add Export dropdown to Player header

### Phase C: Phase 5 Features
1. Breakpoint system
2. Metric sparklines
3. Cost timeline chart
4. Checkpoint system
5. Regression detection
6. Annotation system

### Phase D: Execution Options
1. Add 10 new options to StrategyExecuteTab
2. Mirror in JobsDialog
3. Wire through to execution engine

### Phase E: Player Test Suite
1. Create `playerTestSuite.ts` with 120+ tests
2. Add "Run Player Tests" button in test suite UI
3. Generate test report

### Phase F: Reports and Strategy Enhancements
1. Player report generator (PDF/JSON)
2. Strategy Tab enhancements (diff, templates, sweep)
3. AI advisor assessment (optional future phase)

---

## Technical Details

### Files to Create
| File | Purpose |
|------|---------|
| `src/lib/playerVerification.ts` | Independent step verification engine |
| `src/lib/playerTestSuite.ts` | 120+ player mode tests |
| `src/lib/playerReportGenerator.ts` | Export verification/issue reports |
| `src/components/player/MetricSparklines.tsx` | Inline metric sparklines |
| `src/components/player/CostTimeline.tsx` | Budget/cost visualization |
| `src/components/player/RegressionDetector.tsx` | Side-by-side result comparison |
| `src/components/player/BreakpointManager.tsx` | Breakpoint UI controls |
| `src/components/player/CheckpointPanel.tsx` | Save/restore checkpoints |

### Files to Modify
| File | Changes |
|------|---------|
| `src/lib/operationsRouter.ts` | Fix seed preservation bug (line 1275-1279) |
| `src/lib/pythonExecutor.ts` | Fix fallback parser param extraction (line 448-451) |
| `src/components/PlayerModePanel.tsx` | Tab consolidation, breakpoints, checkpoints, annotations, export |
| `src/components/algorithm/StrategyExecuteTab.tsx` | Add 10 new execution options |
| `src/components/JobsDialog.tsx` | Mirror new execution options |
| `src/lib/jobManagerV2.ts` | Add new option fields to Job interface |
| `src/components/player/VerificationDashboard.tsx` | Add independent verification integration |
| `src/components/player/ErrorSummaryBar.tsx` | Improve error classification |
| `src/components/StartupTestSuite.tsx` | Add player test suite section |

### Risk Assessment
| Change | Risk | Mitigation |
|--------|------|------------|
| Seed preservation fix | **High** - changes operation output for all future runs | Only affects cases where seed was already provided; new runs behave same |
| Fallback parser fix | **High** - changes what operations actually execute | Add logging so users can see what was parsed |
| Tab consolidation | **Medium** - UI restructuring | Use sub-tabs, no feature removal |
| Phase 5 features | **Low** - all additive | Behind feature toggles where possible |
| Test suite | **Low** - read-only verification | No behavior changes |

