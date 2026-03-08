

# Plan: Fix Player Mode Architecture, Fallback Parser, and Add E2E Auto-Debug Tests

## Root Cause Analysis (from verification report)

The verification report shows **all 280 steps have `beforeHash === afterHash === "1C0C2D75"`** — zero bits changed across every operation. Two distinct causes:

### Cause 1: Segment operations don't update file state (by design, but recorded misleadingly)

In `pythonExecutor.ts` line 253, the bridge checks:
```
const isFullOperation = !bits || bits === currentBits || bits.length === currentBits.length;
```
The unified strategy calls `apply_operation(op_id, test_segment, params)` where `test_segment` is a 64-bit slice. Since `test_segment.length !== currentBits.length`, `isFullOperation = false`, so **`currentBits` is never updated** (line 262-268). The transformation is recorded with `fullAfterBits = currentBits` (unchanged) and `cumulativeBits = currentBits` (unchanged).

This is correct behavior for the strategy's "testing" intent, but the Player sees 280 steps with zero change and marks 218 as "Re-execution mismatch" because when Player re-executes the same operation on full `currentBits`, it DOES produce changes (different input length → different result).

### Cause 2: Fallback parser cannot handle real Python

When Pyodide fails to load, the fallback parser cannot handle: function definitions, `list(x)[:N]` slicing, `if` conditionals, nested function calls, or `dict.get()` patterns. It executes zero operations.

## Fix Strategy

### Fix 1: Bridge must record segment changes accurately

When `isFullOperation = false`, the bridge currently records `fullAfterBits = currentBits` (no change). This is misleading. Fix: always record what actually happened to the segment, and flag it as a segment-only operation. Add a `segmentOnly: boolean` field to `TransformationRecord`.

More critically: **the bridge should apply segment results back to the full file** when `apply_operation` is called with a bits argument that's a substring of `currentBits`. The Python strategy expects `apply_operation(op, segment, params)` to return the result but NOT modify state — the bridge should still record an accurate `fullAfterBits` by splicing the result into the right position.

Actually the real fix is simpler: the **Player verification logic** needs to understand that when `beforeBits !== fullBeforeBits` (segment operation), re-execution should use `beforeBits` not `currentBits`. Currently Player line 179 does:
```
executeOperation(originalStep.operation, currentBits, originalStep.params || {})
```
But it should use `originalStep.beforeBits` (the segment) when the step was a segment operation.

### Fix 2: Rewrite fallback parser as a mini Python interpreter

Replace the regex-based fallback with a structured approach:
- Parse function definitions and store their bodies
- Track variable assignments including slicing and `list()` wrapping  
- Handle `for/if/try` blocks with proper indentation tracking
- Resolve function calls by inlining stored function bodies
- Execute `apply_operation` calls with resolved variables

### Fix 3: Player verification must match execution context

In `PlayerModePanel.tsx` reconstruction (line 158-233):
- When a step has `bitRanges` and `beforeBits !== fullBeforeBits`, use `beforeBits` for re-execution, not `currentBits`
- Compare re-executed result against `afterBits` (segment), not `fullAfterBits`
- Track and display `segmentOnly` badge per step

## Implementation Tasks

### Task 1: Fix bridge segment handling (`pythonExecutor.ts`)
- Add `segmentOnly` field to `TransformationRecord`
- When `isFullOperation = false`, set `segmentOnly: true`
- Still record accurate `beforeBits` and `afterBits` for the segment

### Task 2: Fix Player verification logic (`PlayerModePanel.tsx`)
- When step has `bitRanges` and segment data, re-execute on `originalStep.beforeBits` (segment)
- Compare result against `originalStep.afterBits` (segment result)
- Only flag mismatch when the segment-level comparison fails
- Display "Segment Operation" badge for segment-only steps

### Task 3: Rewrite fallback parser (`pythonExecutor.ts`)
- Add function definition tracker: `functionDefs: Map<string, {params: string[], body: string[]}>`
- Add `if/elif/else` handling with condition evaluation for simple patterns (`x in y`, `x > N`)
- Add `try/except` block handling (execute try body, skip except)
- Add function call resolution: when seeing `test_operation(op_id, segment)`, look up function body and inline it
- Handle `list(x)[:N]` → resolve to first N items of the list
- Handle `for x in list(y)[:N]:` patterns

### Task 4: Create E2E auto-debug test suite (`playerTestSuite.ts`)
Add 50+ new tests that:
1. **Generate data** → create a known bit string
2. **Execute operations directly** via `executeOperation` and record results
3. **Build mock TransformationStep[]** from those results  
4. **Feed into Player verification** (`verifyAllStepsIndependently`)
5. **Assert 100% match** — if Player disagrees with direct execution, the test fails with detailed divergence info

Test categories:
- **Direct execution E2E**: Execute NOT/XOR/ROL etc on known input, build step records, verify Player matches
- **Segment operation E2E**: Execute on a segment, record with bitRanges, verify Player handles correctly
- **Chain E2E**: Execute 5-10 ops in sequence, verify Player can replay entire chain
- **Parameter roundtrip**: Execute with auto-generated params, store, re-execute with stored params, verify match
- **Fallback parser**: Feed simple Python code into fallback, verify operations execute and produce correct bits
- **Mixed segment/full**: Alternate between full-file and segment operations, verify cumulative state is correct

### Task 5: Add execution options to engine (`strategyExecutionEngine.ts`)
Wire the existing `ExecutionRuntimeOptions` fields into actual behavior:
- `operationWhitelist/Blacklist`: filter operations before passing to Python context
- `iterationCount`: run strategy N times, collect all results
- `retryOnFailure`: wrap step execution in retry loop
- `seed`: pass deterministic seed to context
- `budgetOverride`: use provided budget instead of default

### Task 6: Integrate tests into StartupTestSuite
- Add E2E player tests to `runPlayerTestSuite()`
- Show results in TestSettingsDialog Player tab
- Include in exported test report

## Files to Modify
| File | Change |
|------|--------|
| `src/lib/pythonExecutor.ts` | Add `segmentOnly` to TransformationRecord; rewrite fallback parser with function/if/try handling |
| `src/components/PlayerModePanel.tsx` | Fix verification to use segment data for segment operations |
| `src/lib/playerTestSuite.ts` | Add 50+ E2E tests covering execution→player→verification pipeline |
| `src/lib/strategyExecutionEngine.ts` | Wire execution options into actual behavior |
| `src/lib/playerVerification.ts` | Handle segment-only steps in independent verification |

## Implementation Order
1. Fix bridge `segmentOnly` field + Player verification logic (unblocks accurate reports)
2. Rewrite fallback parser (unblocks fallback mode execution)
3. Wire execution options into engine
4. Create E2E auto-debug tests
5. Integrate into test suite

