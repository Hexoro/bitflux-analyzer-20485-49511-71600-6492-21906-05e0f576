

# Plan: Fix Player Mode Operations, Add Reports Viewer, Plugin System, AI Mode, and Player Tests

## Critical Bug: Why ALL Operations Show bitsChanged=0

**Root Cause Found**: The fallback parser regex in `pythonExecutor.ts` line 448 only matches **literal quoted operation names** like `apply_operation('NOT', ...)`. But the actual Python strategies use **variables**: `apply_operation(op_id, bits, params)`. The regex `["'](\w+)["']` requires quotes, so the line is silently skipped. No operations execute, `currentBits` never changes, and every step records `bitsChanged: 0`.

**Fix**: Expand the regex to also match variable-based calls, and add a variable resolution system that tracks Python variable assignments (e.g., `op_id = 'NOT'`) so the fallback parser can resolve them.

---

## Implementation Tasks

### Task 1: Fix Fallback Parser (Critical)
**File**: `src/lib/pythonExecutor.ts`
- Expand the `apply_operation` regex to match both quoted literals AND variable names
- Add a simple variable tracker that records `varName = 'value'` assignments from Python code
- When `apply_operation(op_id, bits, params)` is encountered, resolve `op_id` from the variable tracker
- Also handle `for op_id in operations:` loop patterns by tracking loop variables
- Handle dict lookups like `params = OPERATION_PARAMS.get(op_id, {})` by storing the OPERATION_PARAMS dict

### Task 2: Integrate Player Tests into Test Suite
**File**: `src/components/StartupTestSuite.tsx`, `src/components/TestSettingsDialog.tsx`
- Add a "Player" tab in the test settings dialog showing player test results
- Import and run `runPlayerTestSuite()` from `playerTestSuite.ts`
- Show results grouped by category (operation, param_persistence, replay, etc.)
- Add player test count to the overall badge display

### Task 3: Built-in Report Viewer
**New file**: `src/components/ReportViewerDialog.tsx`
- Dialog that accepts any JSON report (verification, transformation, issues, test)
- Auto-detects report type from the `type` field
- Renders appropriate visualization: pass/fail badges for verification, bar charts for transformation costs, error lists for issues
- Download button for each report
- Load report from file (drag-drop or file picker)
- Load from stored results (select strategy → execution → report type)

### Task 4: Reports Button on Toolbar
**File**: `src/components/Toolbar.tsx`, `src/pages/Index.tsx`
- Add "Reports" dropdown button to toolbar
- Dropdown shows: select a strategy, then its execution reports, player reports, test reports
- Shows results with source file and changed file info
- "Journal Export" option that bundles: strategy config, execution report, player verification report, test report, source file hash, final file hash into a single downloadable package

### Task 5: Plugin System
**New files**: `src/lib/pluginManager.ts`, `src/components/PluginsDialog.tsx`
- Plugin interface: `{ id, name, version, description, type: 'operation' | 'metric' | 'visualization' | 'export', enabled, code, config }`
- PluginManager class: add, remove, enable/disable, import/export plugins
- Plugins stored in localStorage
- Operations plugins register via `registerOperation()`
- Metric plugins register via custom metric system
- Plugin dialog: list all plugins, toggle on/off, add new, edit, delete, import/export JSON
- "Restart" button that reloads all enabled plugins
- Toolbar button: "Plugins" with count badge of active plugins

### Task 6: Toolbar Reorganization
**File**: `src/components/Toolbar.tsx`
- Group into logical sections with clear labels:
  - **File**: Load, Save, Export
  - **Edit**: Undo, Redo, Edit toggle
  - **Navigate**: Jump To, Find
  - **Tools**: Generate, Convert
  - **View**: Graphs, Audio, Heatmap
  - **System**: Reports, Plugins, Jobs
  - **Mode**: Mode selector dropdown (rightmost)
- Add Reports button, Plugins button
- Add AI mode to mode selector

### Task 7: AI Mode (Blank)
**File**: `src/components/Toolbar.tsx`, `src/pages/Index.tsx`
- Add `'ai'` to `AppMode` type
- Add "AI Mode" option in mode selector dropdown
- When selected, show a blank panel with placeholder text: "AI Mode - Coming Soon"
- New file: `src/components/AIModePanel.tsx` - empty panel with title and description

### Task 8: Additional Research-Grade Tests
**File**: `src/lib/playerTestSuite.ts`
- Add statistical rigor tests: run same operation 100x with same seed, verify identical output every time
- Add round-trip tests: encode → decode for all reversible ops (GRAY/DEGRAY, ZIGZAG/DEZIGZAG, etc.)
- Add composition tests: (A XOR B) XOR B == A for all mask operations
- Add commutativity/associativity checks where applicable
- Add large-data tests: 10,000+ bit strings to catch overflow/edge cases
- Add metric stability tests: same input always produces same metric values
- Add cross-operation interference tests: verify operation A doesn't corrupt state for operation B
- Add parameter boundary tests: count=0, count=MAX, position=-1, etc.
- Target: 200+ total player tests for journal-publishable verification

---

## Files to Create
| File | Purpose |
|------|---------|
| `src/components/ReportViewerDialog.tsx` | Built-in report viewer with download |
| `src/components/PluginsDialog.tsx` | Plugin management UI |
| `src/lib/pluginManager.ts` | Plugin lifecycle management |
| `src/components/AIModePanel.tsx` | Blank AI mode placeholder |

## Files to Modify
| File | Changes |
|------|---------|
| `src/lib/pythonExecutor.ts` | Fix fallback parser to handle variable-based apply_operation calls |
| `src/components/Toolbar.tsx` | Reorganize, add Reports/Plugins/AI mode |
| `src/pages/Index.tsx` | Wire Reports dialog, Plugins dialog, AI mode panel |
| `src/components/StartupTestSuite.tsx` | Integrate player test suite |
| `src/components/TestSettingsDialog.tsx` | Add player tests tab |
| `src/lib/playerTestSuite.ts` | Add 80+ more research-grade tests |

## Implementation Order
1. Fix fallback parser (unblocks ALL player functionality)
2. Toolbar reorganization + Reports button + Plugins button + AI mode
3. Report viewer dialog
4. Plugin system
5. Player tests integration + additional tests
6. AI mode blank panel

