
Goal: stabilize File Player deterministically, stop relying on brittle Python fallback parsing, integrate true end-to-end pipeline tests, and add a modular AI Mode with real JS execution + trainable operation-selection models.

What is currently wrong (from code audit):
1) File Player architecture drift:
- `segmentOnly` / segment deltas are created in `pythonExecutor` but dropped when persisted to `resultsManager` (`TransformationStep` lacks full segment metadata).
- `PlayerModePanel` reconstruction rewrites step context (`fullBeforeBits` from evolving `currentBits`) instead of always using authoritative stored step state.
- Final verification still uses tolerance logic in places; lossless flows should be strict.
- Reports still compute bit changes from full-state only in some paths (`playerReportGenerator`), hiding segment effects.

2) Fallback parser is still structurally unsafe:
- Assignment form `x = apply_operation(...)` executes but does not reliably bind return value for downstream logic.
- Complex control-flow/value semantics (nested calls, chained vars, boolean conditions) remain non-Python-complete.
- Rewriting parser repeatedly is high-risk and low-confidence for research-grade reproducibility.

3) “50+ tests not integrated” gap:
- Player tests exist, but not as a true execution→player-replay pipeline suite tied to strategy engine outputs.
- Current startup flow does not guarantee strict blocking/visibility for this pipeline class in one authoritative report.

4) JS/AI mode gap:
- `.js/.ts` files are accepted in module system, but strategy execution path is Python-only.
- No modular training/inference pipeline exists for operation-selection AI.

Implementation plan (modular):
Phase 1 — File Player architecture hardening
- Add canonical replay model in shared lib (extract from `PlayerModePanel`): `replayFromStoredSteps(result)`.
- Preserve and persist metadata end-to-end:
  - `segmentOnly`, `segmentBitsChanged`, `fullBitsChanged`, original `fullBeforeBits/fullAfterBits`.
- Make replay authoritative from stored cumulative bits; re-execution becomes validation channel only.
- Enforce strict bit-exact mode for lossless runs (no tolerance fallback).

Phase 2 — Replace fallback strategy
- Introduce runtime policy:
  - `strict` (default for research): if Pyodide unavailable => hard fail with actionable diagnostics.
  - `legacy_fallback` (explicit opt-in): current parser path retained only for simple scripts.
- Improve Pyodide reliability instead of parser complexity:
  - multi-source + cached bootstrap + clear health status in UI.
- Add explicit “fallback compatibility check” before run (flags unsupported constructs).

Phase 3 — Massive E2E auto-debug suite (true pipeline)
- New pipeline tests: generate data → run `strategyExecutionEngine` (Full Verification template) → reconstruct via shared replay lib → run `verifyAllStepsIndependently` → compare hashes/step-level invariants.
- Add stress matrix:
  - full-file ops, segment-only ops, mixed chains, long files, deterministic seed replay, whitelist/blacklist constraints.
- Auto-debug artifact on first divergence:
  - step index, op, params, before/after hashes, expected vs actual bits, report bundle JSON.

Phase 4 — Integrate tests into startup/reporting
- Integrate pipeline suite into Startup tests as first-class category (not separate ad-hoc).
- Ensure exported test report includes:
  - pipeline category totals,
  - full failure payloads (non-truncated),
  - linked execution/player report IDs.

Phase 5 — AI Mode modular system with JS execution option
- Add strategy runtime adapters:
  - `PythonStrategyRuntime` (existing),
  - `JavaScriptStrategyRuntime` (new, sandboxed via `sandboxedExec`).
- Add AI workspace data pipeline:
  - dataset builder from results/files: operation sequence, costs, metrics deltas, bit-change stats, file features.
- Add train/infer modules in AI mode:
  - baseline models: heuristic scorer + contextual bandit (JS, local, deterministic),
  - model artifacts saved as `.json` + generated runnable `.js` strategy file.
- Add “Export as JS Strategy” button:
  - creates executable JS strategy file usable in execution tab via JS runtime adapter.

Phase 6 — Reports and observability upgrades
- Extend report schema to include segment/full delta fields and strict verification flags.
- Add one-click “Research bundle” export:
  - execution report + player verification + independent verification + pipeline-test artifact + model metadata (if AI used).

Primary files to update:
- Replay/verification: `src/components/PlayerModePanel.tsx`, `src/lib/playerVerification.ts`, `src/lib/playerReportGenerator.ts`, `src/lib/resultsManager.ts`
- Execution runtime/fallback: `src/lib/pythonExecutor.ts`, `src/lib/strategyExecutionEngine.ts`
- Tests/integration: `src/lib/playerTestSuite.ts` (or new `playerPipelineTestSuite.ts`), `src/components/StartupTestSuite.tsx`, `src/components/TestSettingsDialog.tsx`
- AI/JS modular runtime: `src/components/AIModePanel.tsx`, `src/lib/pythonModuleSystem.ts`, new JS runtime module (sandboxed), strategy runtime adapter layer.

Acceptance criteria:
- Full Verification template run + File Player replay shows strict, deterministic pass/fail with no silent tolerance masking.
- Segment-only operations are explicitly represented and reported.
- Pipeline E2E suite runs in startup flow and exports complete non-truncated diagnostics.
- Pyodide-unavailable path is deterministic (strict fail unless explicit fallback mode).
- AI Mode can train from local execution history and export runnable JS strategy files for execution.
