/**
 * Console Tab - NeoVim-style Multi-Terminal Console
 * Features:
 * - Multiple terminals with splits
 * - Execute strategies, jobs, view results
 * - Python and JavaScript execution
 * - Console log export
 * - Command history and auto-complete
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Play, 
  Trash2, 
  Terminal, 
  Loader2, 
  Plus, 
  X, 
  Copy,
  Check,
  Keyboard,
  MoreVertical,
  RotateCcw,
  Download,
  Split,
  Columns,
  Rows,
  Maximize2,
  FileCode,
  Zap,
  Activity,
  FolderOpen,
  Settings,
} from 'lucide-react';
import { pythonExecutor } from '@/lib/pythonExecutor';
import { fileSystemManager } from '@/lib/fileSystemManager';
import { pythonModuleSystem } from '@/lib/pythonModuleSystem';
import { strategyExecutionEngine } from '@/lib/strategyExecutionEngine';
import { resultsManager } from '@/lib/resultsManager';
import { toast } from 'sonner';
import { Highlight, themes } from 'prism-react-renderer';

interface ConsoleEntry {
  id: string;
  type: 'input' | 'output' | 'error' | 'info' | 'success' | 'system';
  content: string;
  timestamp: Date;
}

interface TerminalPane {
  id: string;
  name: string;
  type: 'python' | 'javascript' | 'system';
  entries: ConsoleEntry[];
  history: string[];
  historyIndex: number;
  input: string;
  isActive: boolean;
}

interface SplitLayout {
  type: 'single' | 'horizontal' | 'vertical';
  panes: string[];
}

// Built-in commands for the system terminal
const SYSTEM_COMMANDS = {
  help: 'Show all available commands',
  'list-files': 'List all binary files',
  'list-strategies': 'List all strategies',
  'list-jobs': 'List pending and completed jobs',
  'list-results': 'List execution results',
  'run <strategy>': 'Execute a strategy by name',
  'load <file>': 'Load a file by name',
  'export-logs': 'Export all console logs',
  'clear': 'Clear current terminal',
  'stats': 'Show application statistics',
  'metrics <bits>': 'Calculate metrics for bits',
  'op <name> <bits>': 'Execute operation on bits',
};

export const ConsoleTab = () => {
  const [panes, setPanes] = useState<TerminalPane[]>([
    {
      id: 'main',
      name: 'System',
      type: 'system',
      entries: [{
        id: 'welcome',
        type: 'system',
        content: '╔════════════════════════════════════════════════════════════════╗\n║          BSEE Console - NeoVim-style Terminal                  ║\n║  Type "help" for commands, Ctrl+T for new terminal             ║\n╚════════════════════════════════════════════════════════════════╝',
        timestamp: new Date(),
      }],
      history: [],
      historyIndex: -1,
      input: '',
      isActive: true,
    },
    {
      id: 'python',
      name: 'Python',
      type: 'python',
      entries: [{
        id: 'py-welcome',
        type: 'info',
        content: '🐍 Python Console - Pyodide Runtime',
        timestamp: new Date(),
      }],
      history: [],
      historyIndex: -1,
      input: '',
      isActive: false,
    }
  ]);
  
  const [activePaneId, setActivePaneId] = useState('main');
  const [layout, setLayout] = useState<SplitLayout>({ type: 'horizontal', panes: ['main', 'python'] });
  const [isMaximized, setIsMaximized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPyodideReady, setIsPyodideReady] = useState(pythonExecutor.isReady());
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const paneCounter = useRef(2);

  useEffect(() => {
    const unsubscribe = pythonExecutor.subscribeProgress((progress) => {
      if (progress >= 100) setIsPyodideReady(true);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Auto-scroll on new entries
    Object.entries(scrollRefs.current).forEach(([id, ref]) => {
      if (ref) ref.scrollTop = ref.scrollHeight;
    });
  }, [panes]);

  const activePane = useMemo(() => panes.find(p => p.id === activePaneId), [panes, activePaneId]);

  const updatePane = useCallback((paneId: string, updater: (pane: TerminalPane) => TerminalPane) => {
    setPanes(prev => prev.map(p => p.id === paneId ? updater(p) : p));
  }, []);

  const addEntry = useCallback((paneId: string, type: ConsoleEntry['type'], content: string) => {
    updatePane(paneId, pane => ({
      ...pane,
      entries: [...pane.entries, {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        content,
        timestamp: new Date(),
      }],
    }));
  }, [updatePane]);

  const executeSystemCommand = useCallback(async (paneId: string, command: string) => {
    const parts = command.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
      case 'help':
        addEntry(paneId, 'output', '┌─ Available Commands ─────────────────────────────────────────┐');
        Object.entries(SYSTEM_COMMANDS).forEach(([c, desc]) => {
          addEntry(paneId, 'output', `│  ${c.padEnd(20)} │ ${desc}`);
        });
        addEntry(paneId, 'output', '└──────────────────────────────────────────────────────────────┘');
        break;
      
      case 'list-files':
        const files = fileSystemManager.getFiles();
        addEntry(paneId, 'output', `📁 Binary Files (${files.length}):`);
        files.forEach((f, i) => {
          addEntry(paneId, 'output', `   ${i + 1}. ${f.name} (${f.state.model.getBits().length} bits)`);
        });
        break;
      
      case 'list-strategies':
        const strategies = pythonModuleSystem.getAllStrategies();
        addEntry(paneId, 'output', `📋 Strategies (${strategies.length}):`);
        strategies.forEach((s, i) => {
          addEntry(paneId, 'output', `   ${i + 1}. ${s.name} - ${s.algorithmFiles.length} algorithms`);
        });
        break;
      
      case 'list-results':
        const results = resultsManager.getAllResults();
        addEntry(paneId, 'output', `📊 Results (${results.length}):`);
        results.slice(0, 10).forEach((r, i) => {
          const score = r.benchmarks?.totalCost || 0;
          addEntry(paneId, 'output', `   ${i + 1}. ${r.strategyName} - Cost: ${score.toFixed(2)}`);
        });
        break;
      
      case 'run':
        if (args.length === 0) {
          addEntry(paneId, 'error', 'Usage: run <strategy-name>');
        } else {
          const stratName = args.join(' ');
          const strat = pythonModuleSystem.getAllStrategies().find(s => 
            s.name.toLowerCase() === stratName.toLowerCase()
          );
          if (strat) {
            const activeFile = fileSystemManager.getActiveFile();
            if (activeFile) {
              addEntry(paneId, 'info', `🚀 Running strategy: ${strat.name}...`);
              try {
                const result = await strategyExecutionEngine.executeStrategy(strat, activeFile.id);
                addEntry(paneId, 'success', `✓ Completed! Score: ${result.totalScore.toFixed(2)}, Steps: ${result.steps.length}`);
              } catch (e) {
                addEntry(paneId, 'error', `✗ Failed: ${(e as Error).message}`);
              }
            } else {
              addEntry(paneId, 'error', 'No active file. Load a file first.');
            }
          } else {
            addEntry(paneId, 'error', `Strategy "${stratName}" not found`);
          }
        }
        break;
      
      case 'stats':
        addEntry(paneId, 'output', '┌─ Application Statistics ─────────────────────────────────────┐');
        addEntry(paneId, 'output', `│  Files:      ${fileSystemManager.getFiles().length}`);
        addEntry(paneId, 'output', `│  Strategies: ${pythonModuleSystem.getAllStrategies().length}`);
        addEntry(paneId, 'output', `│  Results:    ${resultsManager.getAllResults().length}`);
        addEntry(paneId, 'output', `│  Pyodide:    ${isPyodideReady ? 'Ready' : 'Not loaded'}`);
        addEntry(paneId, 'output', '└──────────────────────────────────────────────────────────────┘');
        break;
      
      case 'clear':
        updatePane(paneId, pane => ({ ...pane, entries: [] }));
        break;
      
      case 'export-logs':
        handleExportLogs();
        addEntry(paneId, 'success', '✓ Logs exported');
        break;
      
      default:
        addEntry(paneId, 'error', `Unknown command: ${cmd}. Type "help" for available commands.`);
    }
  }, [addEntry, updatePane, isPyodideReady]);

  const executePythonCommand = useCallback(async (paneId: string, code: string) => {
    if (!pythonExecutor.isReady()) {
      addEntry(paneId, 'info', '⏳ Loading Python runtime...');
      await pythonExecutor.loadPyodide();
    }

    const activeFile = fileSystemManager.getActiveFile();
    const bits = activeFile?.state.model.getBits() || '01010101';

    try {
      const result = await pythonExecutor.sandboxTest(code, {
        bits,
        budget: 1000,
        metrics: {},
        operations: [],
      });
      
      result.logs.forEach(log => addEntry(paneId, 'output', log));
      addEntry(paneId, 'success', `✓ Executed (${result.finalBits.length} bits)`);
    } catch (e) {
      addEntry(paneId, 'error', `Error: ${(e as Error).message}`);
    }
  }, [addEntry]);

  const executeJavaScriptCommand = useCallback((paneId: string, code: string) => {
    const activeFile = fileSystemManager.getActiveFile();
    const bits = activeFile?.state.model.getBits() || '01010101';
    
    try {
      const fn = new Function('bits', 'fileSystemManager', 'pythonModuleSystem', 'console', `
        const log = (...args) => console.log(args.map(a => String(a)).join(' '));
        ${code}
      `);
      
      const logs: string[] = [];
      const mockConsole = {
        log: (...args: any[]) => logs.push(args.map(a => String(a)).join(' ')),
        error: (...args: any[]) => logs.push('ERROR: ' + args.map(a => String(a)).join(' ')),
      };
      
      const result = fn(bits, fileSystemManager, pythonModuleSystem, mockConsole);
      logs.forEach(log => addEntry(paneId, 'output', log));
      if (result !== undefined) addEntry(paneId, 'output', String(result));
      addEntry(paneId, 'success', '✓ JavaScript executed');
    } catch (e) {
      addEntry(paneId, 'error', `Error: ${(e as Error).message}`);
    }
  }, [addEntry]);

  const handleSubmit = useCallback(async (paneId: string) => {
    const pane = panes.find(p => p.id === paneId);
    if (!pane || !pane.input.trim()) return;

    const input = pane.input.trim();
    addEntry(paneId, 'input', `❯ ${input}`);
    
    updatePane(paneId, p => ({
      ...p,
      input: '',
      history: [input, ...p.history.filter(h => h !== input)].slice(0, 100),
      historyIndex: -1,
    }));

    setIsLoading(true);
    try {
      if (pane.type === 'system') {
        await executeSystemCommand(paneId, input);
      } else if (pane.type === 'python') {
        await executePythonCommand(paneId, input);
      } else {
        executeJavaScriptCommand(paneId, input);
      }
    } finally {
      setIsLoading(false);
    }
  }, [panes, addEntry, updatePane, executeSystemCommand, executePythonCommand, executeJavaScriptCommand]);

  const handleKeyDown = useCallback((paneId: string, e: React.KeyboardEvent) => {
    const pane = panes.find(p => p.id === paneId);
    if (!pane) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(paneId);
    } else if (e.key === 'ArrowUp' && e.ctrlKey) {
      e.preventDefault();
      const newIndex = Math.min(pane.historyIndex + 1, pane.history.length - 1);
      if (pane.history[newIndex]) {
        updatePane(paneId, p => ({ ...p, historyIndex: newIndex, input: p.history[newIndex] }));
      }
    } else if (e.key === 'ArrowDown' && e.ctrlKey) {
      e.preventDefault();
      const newIndex = Math.max(pane.historyIndex - 1, -1);
      updatePane(paneId, p => ({
        ...p,
        historyIndex: newIndex,
        input: newIndex >= 0 ? p.history[newIndex] : '',
      }));
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      updatePane(paneId, p => ({ ...p, entries: [] }));
    } else if (e.key === 't' && e.ctrlKey) {
      e.preventDefault();
      addNewPane('system');
    }
  }, [panes, handleSubmit, updatePane]);

  const addNewPane = useCallback((type: TerminalPane['type']) => {
    const id = `pane-${paneCounter.current++}`;
    const name = type === 'python' ? 'Python' : type === 'javascript' ? 'JavaScript' : `Term ${paneCounter.current}`;
    
    const newPane: TerminalPane = {
      id,
      name,
      type,
      entries: [{
        id: 'welcome',
        type: 'info',
        content: `New ${type} terminal`,
        timestamp: new Date(),
      }],
      history: [],
      historyIndex: -1,
      input: '',
      isActive: false,
    };
    
    setPanes(prev => [...prev, newPane]);
    setLayout(prev => ({ ...prev, panes: [...prev.panes, id] }));
    setActivePaneId(id);
    toast.success(`New ${type} terminal created`);
  }, []);

  const closePane = useCallback((paneId: string) => {
    if (panes.length <= 1) {
      toast.error('Cannot close last terminal');
      return;
    }
    setPanes(prev => prev.filter(p => p.id !== paneId));
    setLayout(prev => ({ ...prev, panes: prev.panes.filter(id => id !== paneId) }));
    if (activePaneId === paneId) {
      setActivePaneId(panes.find(p => p.id !== paneId)?.id || panes[0].id);
    }
  }, [panes, activePaneId]);

  const handleExportLogs = useCallback(() => {
    const allLogs = panes.flatMap(pane => 
      pane.entries.map(e => ({
        terminal: pane.name,
        type: e.type,
        content: e.content,
        timestamp: e.timestamp.toISOString(),
      }))
    );
    
    const blob = new Blob([JSON.stringify(allLogs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `console_logs_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Console logs exported');
  }, [panes]);

  const getEntryColor = (type: ConsoleEntry['type']) => {
    switch (type) {
      case 'input': return 'text-cyan-400';
      case 'output': return 'text-foreground';
      case 'error': return 'text-red-400';
      case 'info': return 'text-blue-400';
      case 'success': return 'text-green-400';
      case 'system': return 'text-yellow-400';
      default: return 'text-foreground';
    }
  };

  const renderPane = (pane: TerminalPane) => (
    <div
      key={pane.id}
      className={`flex-1 flex flex-col min-w-0 border rounded-lg overflow-hidden transition-all ${
        pane.id === activePaneId 
          ? 'border-cyan-400/60 shadow-[0_0_15px_rgba(0,255,255,0.15)]' 
          : 'border-border/50'
      }`}
      onClick={() => setActivePaneId(pane.id)}
    >
      {/* Pane Header */}
      <div className="flex items-center justify-between px-2 py-1 bg-muted/50 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Terminal className="w-3 h-3 text-cyan-400" />
          <span className="text-xs font-medium">{pane.name}</span>
          <Badge variant="outline" className="text-[9px] h-4 px-1">
            {pane.type}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            onClick={(e) => { e.stopPropagation(); closePane(pane.id); }}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
      
      {/* Pane Content */}
      <div 
        ref={el => scrollRefs.current[pane.id] = el}
        className="flex-1 overflow-auto p-2 font-mono text-xs bg-background/80"
      >
        {pane.entries.map(entry => (
          <div key={entry.id} className={`whitespace-pre-wrap mb-1 ${getEntryColor(entry.type)}`}>
            {entry.content}
          </div>
        ))}
      </div>
      
      {/* Pane Input */}
      <div className="flex items-center gap-2 p-2 border-t border-border/50 bg-muted/30">
        <span className="text-cyan-400 text-xs">❯</span>
        <Input
          ref={el => inputRefs.current[pane.id] = el}
          value={pane.input}
          onChange={(e) => updatePane(pane.id, p => ({ ...p, input: e.target.value }))}
          onKeyDown={(e) => handleKeyDown(pane.id, e)}
          placeholder={pane.type === 'python' ? 'Python code...' : 'Command...'}
          disabled={isLoading}
          className="flex-1 h-7 text-xs bg-transparent border-none focus-visible:ring-0 font-mono"
        />
        {isLoading && pane.id === activePaneId && (
          <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-950 via-background to-cyan-950/20">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-cyan-400/30">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-400/40">
            <Terminal className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="font-medium text-sm text-cyan-100">Console</span>
          <Badge variant="outline" className="text-[10px] border-cyan-400/40 text-cyan-300">
            {panes.length} terminals
          </Badge>
        </div>
        
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-xs border-cyan-400/30">
                <Plus className="w-3 h-3 mr-1" />
                New
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => addNewPane('system')}>
                <Terminal className="w-3 h-3 mr-2" />
                System Terminal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addNewPane('python')}>
                <FileCode className="w-3 h-3 mr-2" />
                Python Console
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addNewPane('javascript')}>
                <Zap className="w-3 h-3 mr-2" />
                JavaScript Console
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => setLayout(prev => ({ 
              ...prev, 
              type: prev.type === 'horizontal' ? 'vertical' : 'horizontal' 
            }))}
          >
            {layout.type === 'horizontal' ? <Columns className="w-3 h-3" /> : <Rows className="w-3 h-3" />}
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => setIsMaximized(!isMaximized)}
          >
            <Maximize2 className="w-3 h-3" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={handleExportLogs}
          >
            <Download className="w-3 h-3" />
          </Button>
        </div>
      </div>
      
      {/* Terminal Panes */}
      <div className={`flex-1 p-2 gap-2 overflow-hidden ${
        layout.type === 'horizontal' ? 'flex' : 'flex flex-col'
      }`}>
        {isMaximized && activePane ? (
          renderPane(activePane)
        ) : (
          layout.panes.map(paneId => {
            const pane = panes.find(p => p.id === paneId);
            return pane ? renderPane(pane) : null;
          })
        )}
      </div>
      
      {/* Status Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-muted/30 border-t border-border/50 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>Active: {activePane?.name}</span>
          <span>•</span>
          <span>Pyodide: {isPyodideReady ? '✓ Ready' : '○ Not loaded'}</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Ctrl+T: New</span>
          <span>Ctrl+L: Clear</span>
          <span>Ctrl+↑↓: History</span>
        </div>
      </div>
    </div>
  );
};
