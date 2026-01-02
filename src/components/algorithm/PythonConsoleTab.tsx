/**
 * Python Console Tab - Master Control CLI
 * Features:
 * - Load files, run strategies, manage temp files
 * - Full execution logging
 * - Syntax highlighting
 * - Command history and multiple terminals
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  CheckCircle, 
  Plus, 
  X, 
  Copy,
  Check,
  FileCode,
  Keyboard,
  MoreVertical,
  RotateCcw,
  Clipboard,
  FolderOpen,
  Zap,
  Settings,
} from 'lucide-react';
import { pythonExecutor } from '@/lib/pythonExecutor';
import { fileSystemManager } from '@/lib/fileSystemManager';
import { pythonModuleSystem } from '@/lib/pythonModuleSystem';
import { strategyExecutionEngine } from '@/lib/strategyExecutionEngine';
import { toast } from 'sonner';
import { Highlight, themes } from 'prism-react-renderer';

interface ConsoleEntry {
  id: string;
  type: 'input' | 'output' | 'error' | 'info' | 'success';
  content: string;
  timestamp: Date;
}

interface TerminalTab {
  id: string;
  name: string;
  entries: ConsoleEntry[];
  history: string[];
  historyIndex: number;
  code: string;
}

const EXAMPLE_SNIPPETS = [
  {
    name: 'Hello World',
    code: `print("Hello from Python!")

# Basic Python works here
x = 5 + 3
print(f"5 + 3 = {x}")

for i in range(5):
    print(f"  Count: {i}")`,
  },
  {
    name: 'Load and Analyze File',
    code: `from bitwise_api import get_bits, get_all_metrics, log

# Get current bits
bits = get_bits()
print(f"Current data: {len(bits)} bits")

# Get all metrics
metrics = get_all_metrics()
for name, value in metrics.items():
    print(f"  {name}: {value:.4f}")`,
  },
  {
    name: 'Apply Operations',
    code: `from bitwise_api import (
    get_bits, apply_operation, apply_operation_range,
    get_metric, log
)

# Get initial state
bits = get_bits()
print(f"Initial: {len(bits)} bits, entropy={get_metric('entropy'):.4f}")

# Apply XOR to first 32 bits
apply_operation_range('XOR', 0, 32)
print(f"After XOR: entropy={get_metric('entropy'):.4f}")

# Apply NOT
apply_operation('NOT')
print(f"After NOT: entropy={get_metric('entropy'):.4f}")`,
  },
  {
    name: 'List Available Operations',
    code: `from bitwise_api import get_available_operations, get_available_metrics

print("Available Operations:")
for op in get_available_operations():
    print(f"  - {op}")

print("\\nAvailable Metrics:")
for metric in get_available_metrics():
    print(f"  - {metric}")`,
  },
  {
    name: 'Budget Management',
    code: `from bitwise_api import get_budget, deduct_budget, get_cost, log

budget = get_budget()
print(f"Current budget: {budget}")

# Check operation costs
ops = ['NOT', 'XOR', 'AND', 'left_shift']
for op in ops:
    cost = get_cost(op)
    print(f"  {op}: {cost}")

# Deduct some budget
if deduct_budget(10):
    print(f"Deducted 10, remaining: {get_budget()}")`,
  },
];

const CLI_COMMANDS = [
  { cmd: 'help()', desc: 'Show available commands' },
  { cmd: 'list_files()', desc: 'List all files in sidebar' },
  { cmd: 'load_file("name")', desc: 'Load a file by name' },
  { cmd: 'list_strategies()', desc: 'List all strategies' },
  { cmd: 'run_strategy("name")', desc: 'Run a strategy by name' },
  { cmd: 'cleanup_temp()', desc: 'Clean up temp files' },
  { cmd: 'get_results()', desc: 'Get recent results' },
];

const KEYBOARD_SHORTCUTS = [
  { keys: 'Ctrl+Enter', description: 'Run code' },
  { keys: 'Ctrl+L', description: 'Clear console' },
  { keys: 'Ctrl+↑', description: 'Previous history' },
  { keys: 'Ctrl+↓', description: 'Next history' },
  { keys: 'Ctrl+K', description: 'Clear input' },
  { keys: 'Ctrl+D', description: 'Duplicate terminal' },
  { keys: 'Ctrl+W', description: 'Close terminal' },
  { keys: 'Ctrl+T', description: 'New terminal' },
];

// Python syntax highlighting component
const PythonCodeHighlight = ({ code, className = '' }: { code: string; className?: string }) => {
  return (
    <Highlight theme={themes.nightOwl} code={code} language="python">
      {({ className: hlClassName, style, tokens, getLineProps, getTokenProps }) => (
        <pre className={`${hlClassName} ${className} bg-transparent m-0 p-0`} style={{ ...style, background: 'transparent' }}>
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line })}>
              {line.map((token, key) => (
                <span key={key} {...getTokenProps({ token })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  );
};

// Syntax-highlighted textarea overlay
const SyntaxTextarea = ({ 
  value, 
  onChange, 
  onKeyDown, 
  placeholder,
  disabled,
  textareaRef
}: { 
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  placeholder: string;
  disabled?: boolean;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
}) => {
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const ref = textareaRef || internalRef;
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleScroll = () => {
    if (ref.current) {
      setScrollTop(ref.current.scrollTop);
      setScrollLeft(ref.current.scrollLeft);
    }
  };

  return (
    <div className="relative font-mono text-sm min-h-[120px] border rounded-md overflow-hidden bg-card">
      <div 
        className="absolute inset-0 p-3 pointer-events-none overflow-hidden whitespace-pre-wrap break-words"
        style={{ transform: `translate(${-scrollLeft}px, ${-scrollTop}px)` }}
      >
        {value ? (
          <PythonCodeHighlight code={value} />
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onScroll={handleScroll}
        disabled={disabled}
        className="relative z-10 w-full h-full min-h-[120px] p-3 bg-transparent text-transparent caret-foreground resize-none outline-none"
        spellCheck={false}
        style={{ caretColor: 'hsl(var(--foreground))' }}
      />
    </div>
  );
};

// Keyboard Shortcuts Dialog
const KeyboardShortcutsDialog = () => (
  <Dialog>
    <DialogTrigger asChild>
      <Button variant="ghost" size="sm">
        <Keyboard className="w-4 h-4" />
      </Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Keyboard className="w-5 h-5" />
          Keyboard Shortcuts
        </DialogTitle>
      </DialogHeader>
      <div className="grid gap-2">
        {KEYBOARD_SHORTCUTS.map(shortcut => (
          <div key={shortcut.keys} className="flex items-center justify-between py-1.5 border-b last:border-0">
            <span className="text-sm">{shortcut.description}</span>
            <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">{shortcut.keys}</kbd>
          </div>
        ))}
      </div>
    </DialogContent>
  </Dialog>
);

export const PythonConsoleTab = () => {
  const [tabs, setTabs] = useState<TerminalTab[]>([{
    id: 'terminal-1',
    name: 'Python',
    entries: [{
      id: 'welcome',
      type: 'info',
      content: '🐍 Python Console - Master Control CLI\nType help() for available commands\n',
      timestamp: new Date(),
    }],
    history: [],
    historyIndex: -1,
    code: '',
  }, {
    id: 'terminal-js',
    name: 'JavaScript',
    entries: [{
      id: 'welcome-js',
      type: 'info',
      content: '📜 JavaScript Console\nAccess: bits, metrics, operations, fileSystemManager\nType help() for commands\n',
      timestamp: new Date(),
    }],
    history: [],
    historyIndex: -1,
    code: '',
  }]);
  const [activeTabId, setActiveTabId] = useState('terminal-1');
  const [isLoading, setIsLoading] = useState(false);
  const [pyodideProgress, setPyodideProgress] = useState(0);
  const [isPyodideReady, setIsPyodideReady] = useState(pythonExecutor.isReady());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const tabCounter = useRef(2);

  const activeTab = useMemo(() => tabs.find(t => t.id === activeTabId), [tabs, activeTabId]);

  useEffect(() => {
    const unsubscribe = pythonExecutor.subscribeProgress((progress) => {
      setPyodideProgress(progress);
      if (progress >= 100) setIsPyodideReady(true);
    });
    return unsubscribe;
  }, []);

  const updateActiveTab = useCallback((updater: (tab: TerminalTab) => TerminalTab) => {
    setTabs(prev => prev.map(tab => 
      tab.id === activeTabId ? updater(tab) : tab
    ));
  }, [activeTabId]);

  const addEntry = useCallback((type: ConsoleEntry['type'], content: string) => {
    updateActiveTab(tab => ({
      ...tab,
      entries: [...tab.entries, {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        content,
        timestamp: new Date(),
      }],
    }));
  }, [updateActiveTab]);

  const setCode = useCallback((code: string) => {
    updateActiveTab(tab => ({ ...tab, code }));
  }, [updateActiveTab]);

  const clearConsole = useCallback(() => {
    updateActiveTab(tab => ({ ...tab, entries: [] }));
    toast.success('Console cleared');
  }, [updateActiveTab]);

  const clearInput = useCallback(() => {
    setCode('');
  }, [setCode]);

  const copyAllOutput = useCallback(() => {
    if (!activeTab) return;
    const output = activeTab.entries
      .filter(e => e.type !== 'input')
      .map(e => e.content)
      .join('\n');
    navigator.clipboard.writeText(output);
    toast.success('Output copied');
  }, [activeTab]);

  const addTab = useCallback(() => {
    const newTab: TerminalTab = {
      id: `terminal-${tabCounter.current}`,
      name: `Terminal ${tabCounter.current}`,
      entries: [],
      history: [],
      historyIndex: -1,
      code: '',
    };
    tabCounter.current++;
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, []);

  const duplicateTab = useCallback(() => {
    if (!activeTab) return;
    const newTab: TerminalTab = {
      id: `terminal-${tabCounter.current}`,
      name: `Terminal ${tabCounter.current}`,
      entries: [...activeTab.entries],
      history: [...activeTab.history],
      historyIndex: -1,
      code: activeTab.code,
    };
    tabCounter.current++;
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, [activeTab]);

  const closeTab = useCallback((tabId: string) => {
    if (tabs.length <= 1) {
      toast.error('Cannot close the last terminal');
      return;
    }
    setTabs(prev => {
      const newTabs = prev.filter(t => t.id !== tabId);
      if (activeTabId === tabId) {
        setActiveTabId(newTabs[newTabs.length - 1].id);
      }
      return newTabs;
    });
  }, [tabs.length, activeTabId]);

  const runCode = useCallback(async () => {
    const code = activeTab?.code || '';
    if (!code.trim()) return;

    setIsLoading(true);
    addEntry('input', `>>> ${code.split('\n').join('\n... ')}`);

    updateActiveTab(tab => ({
      ...tab,
      history: [code, ...tab.history.filter(h => h !== code)].slice(0, 50),
      historyIndex: -1,
    }));

    const isJsTerminal = activeTab?.name === 'JavaScript' || activeTab?.id === 'terminal-js';

    try {
      if (isJsTerminal) {
        // JavaScript execution
        const activeFile = fileSystemManager.getActiveFile();
        const bits = activeFile?.state.model.getBits() || '01010101';
        
        // Create a sandboxed context for JS execution
        const jsContext = {
          bits,
          fileSystemManager,
          pythonModuleSystem,
          console: {
            log: (...args: any[]) => addEntry('output', args.map(a => String(a)).join(' ')),
            error: (...args: any[]) => addEntry('error', args.map(a => String(a)).join(' ')),
            warn: (...args: any[]) => addEntry('info', args.map(a => String(a)).join(' ')),
          },
          help: () => {
            addEntry('output', `📜 JavaScript Console Commands:
  bits           - Current file bits (string)
  bits.length    - Number of bits
  fileSystemManager.getFiles() - List all files
  fileSystemManager.getActiveFile() - Get active file
  pythonModuleSystem.getAllStrategies() - List strategies
  
Example:
  console.log("Bits:", bits.length);
  const ones = bits.split('').filter(b => b === '1').length;
  console.log("Ones:", ones, "Zeros:", bits.length - ones);`);
            return 'See output above';
          },
        };
        
        try {
          // Create function with context
          const fn = new Function(...Object.keys(jsContext), `
            "use strict";
            ${code}
          `);
          const result = fn(...Object.values(jsContext));
          if (result !== undefined) {
            addEntry('output', String(result));
          }
          addEntry('success', '✓ JavaScript executed');
        } catch (jsError) {
          addEntry('error', `JS Error: ${(jsError as Error).message}`);
        }
      } else {
        // Python execution
        if (!pythonExecutor.isReady()) {
          addEntry('info', '⏳ Loading Python runtime (first time only)...');
          await pythonExecutor.loadPyodide();
        }

        // Get active file for context
        const activeFile = fileSystemManager.getActiveFile();
        const bits = activeFile?.state.model.getBits() || '01010101';

        // Create enhanced context with CLI commands
        const enhancedCode = `
# CLI Helper Functions
def help():
    """Show available commands"""
    commands = [
        ("help()", "Show this help message"),
        ("list_files()", "List all files in sidebar"),
        ("load_file('name')", "Load a file by name"),
        ("list_strategies()", "List all strategies"),
        ("run_strategy('name')", "Run a strategy by name"),
        ("cleanup_temp()", "Clean up temp files"),
        ("get_results()", "Get recent results count"),
    ]
    print("Available CLI Commands:")
    for cmd, desc in commands:
        print(f"  {cmd:25} - {desc}")
    return "Type any command to execute"

def list_files():
    """List all files"""
    log("[FILES]")
    return "Check console output for file list"

def list_strategies():
    """List all strategies"""
    log("[STRATEGIES]")
    return "Check console output for strategies"

def run_strategy(name):
    """Run a strategy by name"""
    log(f"[RUN_STRATEGY] {name}")
    return f"Strategy '{name}' execution requested"

def load_file(name):
    """Load a file by name"""
    log(f"[LOAD_FILE] {name}")
    return f"File '{name}' load requested"

def cleanup_temp():
    """Clean up temp files"""
    log("[CLEANUP_TEMP]")
    return "Temp file cleanup requested"

def get_results():
    """Get results count"""
    log("[GET_RESULTS]")
    return "Check console output for results"

# User code
${code}
`;

        // Run with full context
        const result = await pythonExecutor.sandboxTest(enhancedCode, {
          bits,
          budget: 1000,
          metrics: {},
          operations: ['NOT', 'AND', 'OR', 'XOR', 'NAND', 'NOR', 'XNOR', 'left_shift', 'right_shift', 'rotate_left', 'rotate_right', 'reverse', 'invert']
        });

        // Process CLI commands from logs
        for (const log of result.logs) {
          if (log.startsWith('[FILES]')) {
            const files = fileSystemManager.getFiles();
            addEntry('output', `📁 Files (${files.length}):\n${files.map(f => `  ${f.isTemp ? '⏱️' : '📄'} ${f.name} (${f.state.model.getBits().length} bits)`).join('\n')}`);
          } else if (log.startsWith('[STRATEGIES]')) {
            const strategies = pythonModuleSystem.getAllStrategies();
            addEntry('output', `📋 Strategies (${strategies.length}):\n${strategies.map(s => `  - ${s.name}`).join('\n') || '  (none)'}`);
          } else if (log.startsWith('[RUN_STRATEGY]')) {
            const stratName = log.replace('[RUN_STRATEGY]', '').trim();
            const strategies = pythonModuleSystem.getAllStrategies();
            const strategy = strategies.find(s => s.name.toLowerCase().includes(stratName.toLowerCase()));
            if (strategy) {
              const activeFile = fileSystemManager.getActiveFile();
              if (activeFile) {
                addEntry('info', `🚀 Running strategy: ${strategy.name}...`);
                try {
                  const stratResult = await strategyExecutionEngine.executeStrategy(strategy, activeFile.id);
                  addEntry('success', `✅ Strategy completed!\n  Score: ${stratResult.totalScore.toFixed(2)}\n  Operations: ${stratResult.totalOperations}\n  Duration: ${stratResult.totalDuration}ms`);
                } catch (e) {
                  addEntry('error', `❌ Strategy failed: ${e}`);
                }
              } else {
                addEntry('error', 'No active file selected');
              }
            } else {
              addEntry('error', `Strategy "${stratName}" not found`);
            }
          } else if (log.startsWith('[LOAD_FILE]')) {
            const fileName = log.replace('[LOAD_FILE]', '').trim();
            const files = fileSystemManager.getFiles();
            const file = files.find(f => f.name.toLowerCase().includes(fileName.toLowerCase()));
            if (file) {
              fileSystemManager.setActiveFile(file.id);
              addEntry('success', `📄 Loaded: ${file.name} (${file.state.model.getBits().length} bits)`);
            } else {
              addEntry('error', `File "${fileName}" not found`);
            }
          } else if (log.startsWith('[CLEANUP_TEMP]')) {
            const { deleted, remaining } = fileSystemManager.cleanupTempFiles();
            addEntry('success', `🧹 Cleaned up ${deleted} temp files (${remaining} remaining)`);
          } else if (log.startsWith('[GET_RESULTS]')) {
            const { resultsManager } = await import('@/lib/resultsManager');
            const stats = resultsManager.getStatistics();
            addEntry('output', `📊 Results: ${stats.totalResults} total, ${stats.bookmarkedCount} bookmarked, ${stats.successRate.toFixed(0)}% success rate`);
          } else if (log.startsWith('[ERROR]')) {
            addEntry('error', log);
          } else if (log.startsWith('[WARN]')) {
            addEntry('info', log);
          } else {
            addEntry('output', log);
          }
        }

        // Add output
        if (result.output !== null && result.output !== undefined && result.output !== 'None') {
          addEntry('output', String(result.output));
        }

        if (result.error) {
          addEntry('error', result.error);
        } else if (result.transformations.length > 0) {
          addEntry('success', `✓ ${result.transformations.length} transformations, ${result.stats.totalBitsChanged} bits changed`);
        } else {
          addEntry('info', `✓ Completed in ${result.duration.toFixed(0)}ms`);
        }
      }
    } catch (error) {
      addEntry('error', error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
      setCode('');
    }
  }, [activeTab?.code, activeTab?.name, activeTab?.id, addEntry, setCode, updateActiveTab]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      
      if (isCtrl && e.key === 'l') { e.preventDefault(); clearConsole(); }
      else if (isCtrl && e.key === 't') { e.preventDefault(); addTab(); }
      else if (isCtrl && e.key === 'd') { e.preventDefault(); duplicateTab(); }
      else if (isCtrl && e.key === 'w') { e.preventDefault(); closeTab(activeTabId); }
      else if (isCtrl && e.shiftKey && e.key === 'C') { e.preventDefault(); copyAllOutput(); }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [clearConsole, addTab, duplicateTab, closeTab, activeTabId, copyAllOutput]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const isCtrl = e.ctrlKey || e.metaKey;

    if (e.key === 'Enter' && isCtrl) { e.preventDefault(); runCode(); return; }
    if (e.key === 'k' && isCtrl) { e.preventDefault(); clearInput(); return; }
    if (e.key === 'ArrowUp' && isCtrl) {
      e.preventDefault();
      updateActiveTab(tab => {
        const newIndex = Math.min(tab.historyIndex + 1, tab.history.length - 1);
        if (newIndex >= 0 && tab.history[newIndex]) {
          return { ...tab, historyIndex: newIndex, code: tab.history[newIndex] };
        }
        return tab;
      });
      return;
    }
    if (e.key === 'ArrowDown' && isCtrl) {
      e.preventDefault();
      updateActiveTab(tab => {
        const newIndex = tab.historyIndex - 1;
        if (newIndex < 0) return { ...tab, historyIndex: -1, code: '' };
        return { ...tab, historyIndex: newIndex, code: tab.history[newIndex] || '' };
      });
    }
  }, [runCode, clearInput, updateActiveTab]);

  const loadSnippet = useCallback((snippet: typeof EXAMPLE_SNIPPETS[0]) => {
    setCode(snippet.code);
    toast.success(`Loaded: ${snippet.name}`);
  }, [setCode]);

  const copyEntry = useCallback((entry: ConsoleEntry) => {
    navigator.clipboard.writeText(entry.content);
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeTab?.entries]);

  return (
    <div className="h-full flex flex-col p-4 gap-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5" />
          <h3 className="font-semibold">Python Console</h3>
          <Badge variant="outline" className="text-xs">Master CLI</Badge>
          {isPyodideReady ? (
            <Badge variant="default" className="bg-green-600">
              <CheckCircle className="w-3 h-3 mr-1" />
              Ready
            </Badge>
          ) : pyodideProgress > 0 ? (
            <Badge variant="secondary">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              {pyodideProgress}%
            </Badge>
          ) : (
            <Badge variant="outline">Not loaded</Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <FileCode className="w-4 h-4 mr-1" />
                Examples
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {EXAMPLE_SNIPPETS.map((snippet) => (
                <DropdownMenuItem key={snippet.name} onClick={() => loadSnippet(snippet)}>
                  <Zap className="w-4 h-4 mr-2" />
                  {snippet.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-1" />
                Commands
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {CLI_COMMANDS.map((cmd) => (
                <DropdownMenuItem key={cmd.cmd} onClick={() => setCode(cmd.cmd)}>
                  <code className="text-xs mr-2">{cmd.cmd}</code>
                  <span className="text-muted-foreground text-xs">{cmd.desc}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <KeyboardShortcutsDialog />
        </div>
      </div>

      {/* Terminal Tabs */}
      <div className="flex items-center gap-1 border-b overflow-x-auto flex-shrink-0">
        {tabs.map(tab => (
          <div 
            key={tab.id}
            className={`flex items-center gap-1 px-3 py-1.5 cursor-pointer border-b-2 transition-colors ${
              tab.id === activeTabId 
                ? 'border-primary text-foreground bg-muted/30' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTabId(tab.id)}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="text-sm">{tab.name}</span>
            {tabs.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 ml-1"
                onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        ))}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={addTab}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Console Output */}
      <Card className="flex-1 overflow-hidden">
        <ScrollArea className="h-full" ref={scrollRef as any}>
          <div className="p-3 font-mono text-sm space-y-2">
            {activeTab?.entries.map(entry => (
              <div 
                key={entry.id} 
                className={`group relative p-2 rounded ${
                  entry.type === 'input' ? 'bg-muted/30 text-muted-foreground' :
                  entry.type === 'error' ? 'bg-destructive/10 text-destructive' :
                  entry.type === 'success' ? 'bg-green-500/10 text-green-500' :
                  entry.type === 'info' ? 'bg-blue-500/10 text-blue-400' :
                  'bg-background'
                }`}
              >
                <pre className="whitespace-pre-wrap break-words">{entry.content}</pre>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => copyEntry(entry)}
                >
                  {copiedId === entry.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
            ))}
            {activeTab?.entries.length === 0 && (
              <div className="text-muted-foreground text-center py-4">
                Console is empty. Type code below and press Ctrl+Enter to run.
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Input Area */}
      <div className="flex-shrink-0 space-y-2">
        <SyntaxTextarea
          value={activeTab?.code || ''}
          onChange={setCode}
          onKeyDown={handleKeyDown}
          placeholder="Enter Python code... (Ctrl+Enter to run)"
          disabled={isLoading}
          textareaRef={textareaRef}
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button onClick={runCode} disabled={isLoading || !activeTab?.code.trim()}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Run (Ctrl+Enter)
            </Button>
            <Button variant="outline" onClick={clearConsole}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            {activeTab?.history.length || 0} commands in history
          </div>
        </div>
      </div>
    </div>
  );
};
