
What I found (from your current code + uploaded reports)

1) Execution options are mostly UI-only right now  
- Strategy options are captured in `StrategyExecuteTab` / `StrategyTabV7`, but `handleRunStrategy` calls:
  `strategyExecutionEngine.executeStrategy(baseConfig, selectedDataFile)` (no options passed).
- Jobs advanced options are stored (`Job.executionOptions`) but never applied inside `jobManagerV2.executeJob` / engine.

2) “Local snapshots like git” are NOT full snapshots today  
- Versioning in `StrategyTabV7` stores strategy metadata + file hashes only.
- `handleRestoreVersion` restores strategy links, not file contents, not file add/remove state.
- So: changing file content or adding/removing linked files is not truly restorable like git snapshots.

3) Why many Player steps show no bit changes  
- In your “Full Verification” strategy code, many operations run on `test_segment` (a local slice), not on full file state.
- Bridge records full-file before/after; if full file wasn’t updated, reports show unchanged hashes.
- Player transformation report currently computes `bitsChanged` from `fullBeforeBits/fullAfterBits` only (not segment delta), making many steps appear as 0-change.
- There is also a verification logic bug in Player reconstruction: when stored state exists, `verified` is effectively forced true (`storedAfter ? true : executionMatches`), hiding mismatches.

4) Fallback parser still misses important Python patterns  
- Current fallback handles simple loops/assignments, but not many real patterns in unified strategies (e.g. `for op_id in list(all_ops)[:106]:`, nested/get_params flows), so fallback parity is incomplete.

5) Reporting gaps and truncation gaps  
- Report Viewer type detection mismatches generated player reports (`verification/transformation/issues` nested under `data`) and may render as unknown/raw.
- Report export from Test dialog does not include full player failure details in a journal-friendly unified format.
- UI still truncates expected/actual values in several places.

6) Your uploaded test report (7 failing)  
- `test-report-2026-03-05.json` shows 7 fails total.
- Explicit failures listed: 3 core timeouts in Results-related tests:
  - `ResultsManager: Get all results`
  - `ResultsManager: Statistics`
  - `ModeCollision: Results manager isolation`
- Remaining failed count likely comes from player tests not fully represented in exported failure section.

Implementation plan (next build)

Phase A — Fix execution options end-to-end (Strategy + Jobs + Engine)
- Extend `strategyExecutionEngine.executeStrategy` to accept a typed `ExecutionRuntimeOptions`.
- Thread options from:
  - `StrategyTabV7 -> handleRunStrategy -> strategyExecutionEngine`
  - `jobManagerV2.executeJob -> strategyExecutionEngine` using `job.executionOptions`.
- Implement missing controls behavior:
  - `iterationCount`, `retryOnFailure`, `operationWhitelist`, `operationBlacklist`,
  - `seed`, `verifyAfterStep`, `stepMode`, `timeout`, `memoryLimit`, `budgetOverride`.
- Add persisted defaults and validation (conflicting whitelist/blacklist, invalid ranges).

Phase B — Real git-like local snapshots for strategy versioning
- Replace hash-only versioning with full snapshot object:
  - strategy metadata
  - full contents of all linked files at snapshot time
  - linked file list (including additions/removals)
  - snapshot hash + parent snapshot pointer
- Add restore modes:
  - “Restore Strategy Links only”
  - “Restore Links + File Contents” (true git-like local snapshot)
- Add diff view (files added/removed/modified, line-level summary).
- Add one-click rollback and snapshot labels/tags.

Phase C — Player “no bit changes” deep fix
- Fix reporting semantics:
  - Track BOTH full-file delta and segment delta per step.
  - In Player/report UI show:
    - `fullBitsChanged`
    - `segmentBitsChanged`
    - “segment-only operation” badge.
- Fix verification correctness in `PlayerModePanel`:
  - `verified` must reflect re-exec match, not auto-true when stored bits exist.
- Improve fallback parser robustness:
  - support richer `for ... in ...` expressions, variable slicing/list wrappers, and param indirection patterns used by unified strategy.
- Add explicit “operation had effect on segment but not committed to full file” diagnostics.

Phase D — Reports Center + download + no truncation
- Build a unified Reports Center (Toolbar “Reports”):
  - Select Strategy
  - Select execution result
  - Select report family:
    - execution report
    - file player reports (verification/transformation/issues)
    - test reports
    - journal bundle
- Add report registry (`reportsManager`) for persisted generated reports + metadata.
- Add download button on every report view.
- Remove truncation for key scientific fields (expected/actual/mismatch slices); replace with:
  - expandable blocks
  - copy-to-clipboard
  - lazy rendering for very large payloads.
- Fix report type detection to parse current player report schema (`type` + nested `data`).

Phase E — Plugin runtime system (real, not only metadata)
- Keep current plugin CRUD UI, add runtime lifecycle:
  - load enabled plugins on startup
  - unload/reload on “Restart Plugins”
  - isolate plugin errors and show health status
- Add plugin hook API:
  - operation hooks (register/unregister custom operations)
  - metric hooks
  - report/export hooks
  - optional UI contribution hooks (safe, constrained)
- Add plugin state controls:
  - enabled/disabled
  - startup order
  - crash-safe fallback (disable faulty plugin automatically).

Phase F — Advanced publication-grade testing + auto-debug loop
- Add E2E “Full Verification Pipeline” tests:
  1) run strategy execution
  2) open/reconstruct in Player logic
  3) independent verification
  4) compare source/changed files + hashes
  5) assert deterministic replay
- Add randomized property tests:
  - seed determinism over many seeds/runs
  - operation composition invariants
  - segment-vs-full consistency checks
- Add “auto-debug mode” for failing runs:
  - capture first divergence step
  - capture params/mask/seed
  - generate machine-readable failure artifact.
- Add journal artifact export pack:
  - strategy snapshot
  - source/final bits
  - execution report
  - player verification report
  - full test report
  - environment metadata + hashes.

Phase G — Close the 7 failing tests
- Fix ResultsManager timeout failures by:
  - lightweight statistics path
  - bounded/lazy hydration from localStorage for tests
  - optional dedicated test storage namespace isolation.
- Ensure player failures are fully included in exported report/failure sections.
- Re-run full suite, verify `0 failed`, then export final audit report.

Primary files to update
- Execution/options:  
  `src/components/algorithm/StrategyExecuteTab.tsx`  
  `src/components/algorithm/StrategyTabV7.tsx`  
  `src/components/JobsDialog.tsx`  
  `src/lib/jobManagerV2.ts`  
  `src/lib/strategyExecutionEngine.ts`
- Versioning/snapshots:  
  `src/components/algorithm/StrategyTabV7.tsx`  
  `src/lib/pythonModuleSystem.ts` (snapshot restore helpers)
- Player/replay/verification/reporting:  
  `src/components/PlayerModePanel.tsx`  
  `src/lib/pythonExecutor.ts`  
  `src/lib/playerVerification.ts`  
  `src/lib/playerReportGenerator.ts`
- Reports center + test export completeness:  
  `src/components/ReportViewerDialog.tsx`  
  `src/components/TestSettingsDialog.tsx`  
  `src/components/StartupTestSuite.tsx`  
  `src/pages/Index.tsx` / `src/components/Toolbar.tsx`
- Plugin runtime:  
  `src/lib/pluginManager.ts`  
  `src/components/PluginsDialog.tsx`  
  plus operation/metric registration points.

Acceptance criteria
- Advanced execution options demonstrably affect both manual and job runs.
- Version restore can fully revert file content + linked file set (add/remove included).
- Player reports distinguish segment changes from full-file changes; verification mismatch is never silently marked “passed”.
- Reports Center can select strategy/result/report type and download all artifacts without truncating scientific values.
- Plugin enable/disable/restart actually changes runtime behavior safely.
- Full test suite passes (including player + new E2E), with an exportable journal-ready bundle.
