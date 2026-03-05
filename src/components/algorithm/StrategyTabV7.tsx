/**
 * Strategy Tab V7 - Thin shell importing sub-tab components
 * State management lives here, rendering delegated to sub-tabs
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Plus,
  Trash2,
  Eye,
  Rocket,
  BarChart3,
  Library,
  GitBranch,
  Star,
  Activity,
  TrendingUp,
  Timer,
  Gauge,
  Package,
  Brain,
  Download,
  History,
  RefreshCw,
  Save,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { pythonModuleSystem, PythonFile, StrategyConfig } from '@/lib/pythonModuleSystem';
import { fileSystemManager, BinaryFile } from '@/lib/fileSystemManager';
import { strategyExecutionEngine } from '@/lib/strategyExecutionEngine';
import {
  UNIFIED_SCHEDULER_V2,
  UNIFIED_ALGORITHM_V2,
  UNIFIED_SCORING_V2,
  UNIFIED_POLICY_V2,
} from '@/lib/unifiedStrategy';

import { StrategyViewTab } from './StrategyViewTab';
import { StrategyExecuteTab, ExecutionOptions, Breakpoint } from './StrategyExecuteTab';
import { StrategyCreateTab } from './StrategyCreateTab';

const STRATEGY_STORAGE_KEY = 'bsee_saved_strategies_v7';
const STRATEGY_TAGS_KEY = 'bsee_strategy_tags_v7';
const EXECUTION_HISTORY_KEY = 'bsee_execution_history_v7';
const STRATEGY_VERSIONS_KEY = 'bsee_strategy_versions_v1';
const EXECUTION_OPTIONS_KEY = 'bsee_execution_options_v1';

type StrategySubTab = 'view' | 'execute' | 'create' | 'analytics' | 'templates' | 'versions';

interface StrategyTag {
  id: string;
  name: string;
  color: string;
}

const TAG_COLORS = [
  'bg-red-500/20 text-red-400 border-red-500/30',
  'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'bg-lime-500/20 text-lime-400 border-lime-500/30',
  'bg-green-500/20 text-green-400 border-green-500/30',
  'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'bg-teal-500/20 text-teal-400 border-teal-500/30',
  'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  'bg-sky-500/20 text-sky-400 border-sky-500/30',
  'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  'bg-violet-500/20 text-violet-400 border-violet-500/30',
  'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30',
  'bg-pink-500/20 text-pink-400 border-pink-500/30',
];

interface StrategyVersion {
  id: string;
  strategyId: string;
  version: number;
  snapshot: EnhancedStrategy;
  timestamp: number;
  message: string;
  fileHashes: Record<string, string>;
  changedFiles?: string[];
  fileContents?: Record<string, string>;
  linkedFiles?: string[];
}

interface EnhancedStrategy {
  id: string;
  name: string;
  description?: string;
  schedulerFile: string;
  algorithmFiles: string[];
  scoringFiles: string[];
  policyFiles: string[];
  customFiles: string[];
  tags: string[];
  starred: boolean;
  pinned?: boolean;
  createdAt: number;
  created: Date | number;
  lastRun?: number;
  runCount: number;
  avgScore?: number;
  avgDuration?: number;
  version?: number;
  breakpoints?: string[];
}

interface ExecutionHistoryEntry {
  id: string;
  strategyId: string;
  strategyName: string;
  dataFileName: string;
  timestamp: number;
  duration: number;
  score: number;
  success: boolean;
  parallelEnabled: boolean;
  operationCount: number;
}

interface StrategyTabV7Props {
  onRunStrategy?: (strategy: StrategyConfig) => void;
  isExecuting?: boolean;
  onNavigateToTimeline?: () => void;
}

const hashContent = (content: string): string => {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) - hash) + content.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
};

const STRATEGY_TEMPLATES: Partial<EnhancedStrategy>[] = [
  {
    name: 'Quick Entropy Test',
    description: 'Fast entropy optimization check',
    schedulerFile: 'UnifiedScheduler.py',
    algorithmFiles: ['UnifiedAlgorithm.py'],
    scoringFiles: ['UnifiedScoring.py'],
    policyFiles: [],
    customFiles: [],
    tags: ['quick', 'entropy'],
  },
  {
    name: 'Full Verification',
    description: 'Complete system verification with all components',
    schedulerFile: 'UnifiedScheduler.py',
    algorithmFiles: ['UnifiedAlgorithm.py'],
    scoringFiles: ['UnifiedScoring.py'],
    policyFiles: ['UnifiedPolicy.py'],
    customFiles: [],
    tags: ['complete', 'verification'],
  },
  {
    name: 'Compression Focus',
    description: 'Optimized for compression metrics',
    schedulerFile: 'UnifiedScheduler.py',
    algorithmFiles: ['UnifiedAlgorithm.py'],
    scoringFiles: ['UnifiedScoring.py'],
    policyFiles: [],
    customFiles: [],
    tags: ['compression', 'optimization'],
  },
];

const DEFAULT_EXECUTION_OPTIONS: ExecutionOptions = {
  enableParallel: true,
  autoNavigate: true,
  maxWorkers: 4,
  stepMode: 'continuous',
  verifyAfterStep: false,
  logDetailedMetrics: true,
  storeFullHistory: true,
  saveMasksAndParams: true,
  seed: '',
  timeout: 300,
  memoryLimit: 512,
  budgetOverride: null,
  breakpoints: [],
};

export const StrategyTabV7 = ({ onRunStrategy, isExecuting = false, onNavigateToTimeline }: StrategyTabV7Props) => {
  const [activeSubTab, setActiveSubTab] = useState<StrategySubTab>('view');
  const [strategies, setStrategies] = useState<EnhancedStrategy[]>([]);
  const [files, setFiles] = useState<PythonFile[]>([]);
  const [binaryFiles, setBinaryFiles] = useState<BinaryFile[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<EnhancedStrategy | null>(null);
  const [selectedDataFile, setSelectedDataFile] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<string>('');
  const [executionProgress, setExecutionProgress] = useState(0);
  const [tags, setTags] = useState<StrategyTag[]>([]);
  const [executionHistory, setExecutionHistory] = useState<ExecutionHistoryEntry[]>([]);
  const [executionOptions, setExecutionOptions] = useState<ExecutionOptions>(DEFAULT_EXECUTION_OPTIONS);
  const [unsavedChanges, setUnsavedChanges] = useState<Record<string, string[]>>({});

  // Create tab state
  const [strategyName, setStrategyName] = useState('');
  const [strategyDescription, setStrategyDescription] = useState('');
  const [selectedScheduler, setSelectedScheduler] = useState('');
  const [selectedAlgorithms, setSelectedAlgorithms] = useState<string[]>([]);
  const [selectedScoring, setSelectedScoring] = useState<string[]>([]);
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);
  const [selectedCustomFiles, setSelectedCustomFiles] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Versioning
  const [strategyVersions, setStrategyVersions] = useState<StrategyVersion[]>([]);
  const [selectedVersionStrategy, setSelectedVersionStrategy] = useState<string | null>(null);
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [versionMessage, setVersionMessage] = useState('');

  // Editing
  const [editingStrategy, setEditingStrategy] = useState<EnhancedStrategy | null>(null);

  // Load saved data
  useEffect(() => {
    try {
      const savedStrategies = localStorage.getItem(STRATEGY_STORAGE_KEY);
      if (savedStrategies) setStrategies(JSON.parse(savedStrategies));

      const savedTags = localStorage.getItem(STRATEGY_TAGS_KEY);
      if (savedTags) {
        setTags(JSON.parse(savedTags));
      } else {
        setTags([
          { id: 'quick', name: 'Quick', color: TAG_COLORS[8] },
          { id: 'complete', name: 'Complete', color: TAG_COLORS[5] },
          { id: 'experimental', name: 'Experimental', color: TAG_COLORS[13] },
          { id: 'production', name: 'Production', color: TAG_COLORS[4] },
        ]);
      }

      const savedHistory = localStorage.getItem(EXECUTION_HISTORY_KEY);
      if (savedHistory) setExecutionHistory(JSON.parse(savedHistory));

      const savedVersions = localStorage.getItem(STRATEGY_VERSIONS_KEY);
      if (savedVersions) setStrategyVersions(JSON.parse(savedVersions));

      const savedOptions = localStorage.getItem(EXECUTION_OPTIONS_KEY);
      if (savedOptions) setExecutionOptions({ ...DEFAULT_EXECUTION_OPTIONS, ...JSON.parse(savedOptions) });
    } catch (e) {
      console.error('Failed to load saved data:', e);
    }
  }, []);

  // Ensure unified strategy files exist
  useEffect(() => {
    const existingFiles = pythonModuleSystem.getAllFiles();
    if (!existingFiles.find(f => f.name === 'UnifiedScheduler.py')) {
      pythonModuleSystem.addFile('UnifiedScheduler.py', UNIFIED_SCHEDULER_V2, 'scheduler');
      pythonModuleSystem.addFile('UnifiedAlgorithm.py', UNIFIED_ALGORITHM_V2, 'algorithm');
      pythonModuleSystem.addFile('UnifiedScoring.py', UNIFIED_SCORING_V2, 'scoring');
      pythonModuleSystem.addFile('UnifiedPolicy.py', UNIFIED_POLICY_V2, 'policies');
    }
  }, []);

  // Subscribe to changes
  useEffect(() => {
    setFiles(pythonModuleSystem.getAllFiles());
    setBinaryFiles(fileSystemManager.getFiles());

    const activeFile = fileSystemManager.getActiveFile();
    if (activeFile) setSelectedDataFile(activeFile.id);

    const unsub1 = pythonModuleSystem.subscribe(() => setFiles(pythonModuleSystem.getAllFiles()));
    const unsub2 = fileSystemManager.subscribe(() => setBinaryFiles(fileSystemManager.getFiles()));
    const unsub3 = strategyExecutionEngine.subscribe((result, status) => {
      setExecutionStatus(status);
      if (status === 'completed' && result?.success) {
        setExecutionProgress(100);
        toast.success('Strategy completed!');

        if (selectedStrategy) {
          const entry: ExecutionHistoryEntry = {
            id: `exec_${Date.now()}`,
            strategyId: selectedStrategy.id,
            strategyName: selectedStrategy.name,
            dataFileName: binaryFiles.find(f => f.id === selectedDataFile)?.name || 'Unknown',
            timestamp: Date.now(),
            duration: result.totalDuration,
            score: result.totalScore,
            success: true,
            parallelEnabled: executionOptions.enableParallel,
            operationCount: result.totalOperations,
          };
          setExecutionHistory(prev => [entry, ...prev].slice(0, 100));

          setStrategies(prev => prev.map(s => {
            if (s.id === selectedStrategy.id) {
              const newRunCount = s.runCount + 1;
              return {
                ...s,
                runCount: newRunCount,
                lastRun: Date.now(),
                avgScore: s.avgScore ? (s.avgScore * s.runCount + result.totalScore) / newRunCount : result.totalScore,
                avgDuration: s.avgDuration ? (s.avgDuration * s.runCount + result.totalDuration) / newRunCount : result.totalDuration,
              };
            }
            return s;
          }));
        }

        if (executionOptions.autoNavigate && onNavigateToTimeline) {
          onNavigateToTimeline();
        }
      } else if (status === 'failed') {
        toast.error(`Failed: ${result?.error || 'Unknown error'}`);
      } else if (status.includes('running')) {
        const match = status.match(/(\d+)/);
        if (match) setExecutionProgress(parseInt(match[1], 10));
      }
    });

    return () => { unsub1(); unsub2(); unsub3(); };
  }, [onNavigateToTimeline, executionOptions.autoNavigate, selectedStrategy, selectedDataFile, binaryFiles, executionOptions.enableParallel]);

  // Persist data
  useEffect(() => { if (strategies.length > 0) localStorage.setItem(STRATEGY_STORAGE_KEY, JSON.stringify(strategies)); }, [strategies]);
  useEffect(() => { if (tags.length > 0) localStorage.setItem(STRATEGY_TAGS_KEY, JSON.stringify(tags)); }, [tags]);
  useEffect(() => { if (executionHistory.length > 0) localStorage.setItem(EXECUTION_HISTORY_KEY, JSON.stringify(executionHistory)); }, [executionHistory]);
  useEffect(() => { if (strategyVersions.length > 0) localStorage.setItem(STRATEGY_VERSIONS_KEY, JSON.stringify(strategyVersions)); }, [strategyVersions]);
  useEffect(() => { localStorage.setItem(EXECUTION_OPTIONS_KEY, JSON.stringify(executionOptions)); }, [executionOptions]);

  // File change detection for versioning
  useEffect(() => {
    strategies.forEach(strategy => {
      const versions = strategyVersions.filter(v => v.strategyId === strategy.id).sort((a, b) => b.version - a.version);
      if (versions.length === 0) return;
      const lastVersion = versions[0];
      if (!lastVersion.fileHashes) return;

      const allFiles = [strategy.schedulerFile, ...strategy.algorithmFiles, ...strategy.scoringFiles, ...strategy.policyFiles, ...(strategy.customFiles || [])];
      const changedFiles: string[] = [];
      allFiles.forEach(name => {
        const file = files.find(f => f.name === name);
        if (file && lastVersion.fileHashes[name] && hashContent(file.content) !== lastVersion.fileHashes[name]) {
          changedFiles.push(name);
        }
      });

      if (changedFiles.length > 0) {
        setUnsavedChanges(prev => ({ ...prev, [strategy.id]: changedFiles }));
      } else {
        setUnsavedChanges(prev => { const u = { ...prev }; delete u[strategy.id]; return u; });
      }
    });
  }, [files, strategies, strategyVersions]);

  // --- Handlers ---
  const handleCreateStrategy = useCallback(() => {
    if (!strategyName.trim()) { toast.error('Enter a strategy name'); return; }
    if (!selectedScheduler) { toast.error('Select a scheduler file'); return; }

    const newStrategy: EnhancedStrategy = {
      id: `strategy_${Date.now()}`,
      name: strategyName,
      description: strategyDescription,
      schedulerFile: selectedScheduler,
      algorithmFiles: selectedAlgorithms,
      scoringFiles: selectedScoring,
      policyFiles: selectedPolicies,
      customFiles: selectedCustomFiles,
      tags: selectedTags,
      starred: false,
      pinned: false,
      createdAt: Date.now(),
      runCount: 0,
      created: new Date(),
    };

    setStrategies(prev => [...prev, newStrategy]);
    toast.success(`Strategy "${strategyName}" created`);
    setStrategyName(''); setStrategyDescription('');
    setSelectedScheduler(''); setSelectedAlgorithms([]); setSelectedScoring([]);
    setSelectedPolicies([]); setSelectedCustomFiles([]); setSelectedTags([]);
    setSelectedStrategy(newStrategy);
    setActiveSubTab('view');
  }, [strategyName, strategyDescription, selectedScheduler, selectedAlgorithms, selectedScoring, selectedPolicies, selectedCustomFiles, selectedTags]);

  const handleDeleteStrategy = useCallback((id: string) => {
    setStrategies(prev => prev.filter(s => s.id !== id));
    if (selectedStrategy?.id === id) setSelectedStrategy(null);
    toast.success('Strategy deleted');
  }, [selectedStrategy]);

  const handleDuplicateStrategy = useCallback((strategy: EnhancedStrategy) => {
    const dup: EnhancedStrategy = { ...strategy, id: `strategy_${Date.now()}`, name: `${strategy.name} (Copy)`, createdAt: Date.now(), created: Date.now(), runCount: 0, lastRun: undefined, avgScore: undefined, avgDuration: undefined };
    setStrategies(prev => [...prev, dup]);
    toast.success('Strategy duplicated');
  }, []);

  const handleToggleStar = useCallback((id: string) => {
    setStrategies(prev => prev.map(s => s.id === id ? { ...s, starred: !s.starred } : s));
  }, []);

  const handleTogglePin = useCallback((id: string) => {
    setStrategies(prev => prev.map(s => s.id === id ? { ...s, pinned: !s.pinned } : s));
  }, []);

  const handleAddTag = useCallback((name: string, color: string) => {
    const newTag: StrategyTag = { id: name.toLowerCase().replace(/\s+/g, '_'), name, color };
    setTags(prev => [...prev, newTag]);
    toast.success('Tag created');
  }, []);

  const handleUpdateOptions = useCallback((opts: Partial<ExecutionOptions>) => {
    setExecutionOptions(prev => ({ ...prev, ...opts }));
  }, []);

  const handleRunStrategy = useCallback(async () => {
    if (!selectedStrategy || !selectedDataFile) return;
    setIsRunning(true);
    setExecutionProgress(0);
    try {
      const createdDate = selectedStrategy.created instanceof Date ? selectedStrategy.created : new Date(selectedStrategy.createdAt || selectedStrategy.created as number);
      const baseConfig: StrategyConfig = {
        id: selectedStrategy.id,
        name: selectedStrategy.name,
        schedulerFile: selectedStrategy.schedulerFile,
        algorithmFiles: [...selectedStrategy.algorithmFiles, ...(selectedStrategy.customFiles || [])],
        scoringFiles: selectedStrategy.scoringFiles,
        policyFiles: selectedStrategy.policyFiles,
        created: createdDate,
      };
      const result = await strategyExecutionEngine.executeStrategy(baseConfig, selectedDataFile, {
        seed: executionOptions.seed || undefined,
        timeout: executionOptions.timeout,
        memoryLimit: executionOptions.memoryLimit,
        budgetOverride: executionOptions.budgetOverride,
        verifyAfterStep: executionOptions.verifyAfterStep,
        stepMode: executionOptions.stepMode,
        logDetailedMetrics: executionOptions.logDetailedMetrics,
        storeFullHistory: executionOptions.storeFullHistory,
        saveMasksAndParams: executionOptions.saveMasksAndParams,
        enableParallel: executionOptions.enableParallel,
        maxWorkers: executionOptions.maxWorkers,
        breakpoints: executionOptions.breakpoints,
      });
      if (result.success) toast.success(`Score: ${result.totalScore.toFixed(2)}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Execution failed');
    } finally {
      setIsRunning(false);
      setExecutionStatus('');
    }
  }, [selectedStrategy, selectedDataFile]);

  const handleApplyTemplate = useCallback((template: Partial<EnhancedStrategy>) => {
    setStrategyName(template.name || '');
    setStrategyDescription(template.description || '');
    setSelectedScheduler(template.schedulerFile || '');
    setSelectedAlgorithms(template.algorithmFiles || []);
    setSelectedScoring(template.scoringFiles || []);
    setSelectedPolicies(template.policyFiles || []);
    setSelectedCustomFiles(template.customFiles || []);
    setSelectedTags(template.tags || []);
    setActiveSubTab('create');
    toast.success('Template applied');
  }, []);

  // Version management - stores full file contents for git-like snapshots
  const handleSaveVersion = useCallback((strategy: EnhancedStrategy) => {
    if (!versionMessage.trim()) { toast.error('Please enter a version message'); return; }
    const existingVersions = strategyVersions.filter(v => v.strategyId === strategy.id);
    const nextVersion = existingVersions.length + 1;
    const allFileNames = [strategy.schedulerFile, ...strategy.algorithmFiles, ...strategy.scoringFiles, ...strategy.policyFiles, ...(strategy.customFiles || [])];
    const fileHashes: Record<string, string> = {};
    const fileContents: Record<string, string> = {};
    allFileNames.forEach(name => { 
      const file = files.find(f => f.name === name); 
      if (file) {
        fileHashes[name] = hashContent(file.content);
        fileContents[name] = file.content;
      }
    });
    const lastVersion = existingVersions.sort((a, b) => b.version - a.version)[0];
    const changedFiles = lastVersion ? Object.keys(fileHashes).filter(name => fileHashes[name] !== lastVersion.fileHashes?.[name]) : allFileNames;

    const newVersion: StrategyVersion = { 
      id: `ver_${Date.now()}`, 
      strategyId: strategy.id, 
      version: nextVersion, 
      snapshot: { ...strategy }, 
      timestamp: Date.now(), 
      message: versionMessage, 
      fileHashes, 
      changedFiles,
      fileContents,
      linkedFiles: allFileNames,
    };
    setStrategyVersions(prev => [...prev, newVersion]);
    setStrategies(prev => prev.map(s => s.id === strategy.id ? { ...s, version: nextVersion } : s));
    setUnsavedChanges(prev => { const u = { ...prev }; delete u[strategy.id]; return u; });
    setVersionMessage('');
    setShowVersionDialog(false);
    toast.success(`Version ${nextVersion} saved (full snapshot)`);
  }, [versionMessage, strategyVersions, files]);

  const handleRestoreVersion = useCallback((version: StrategyVersion, restoreContents: boolean = false) => {
    setStrategies(prev => prev.map(s => s.id === version.strategyId ? { ...version.snapshot, version: s.version } : s));
    
    if (restoreContents && version.fileContents) {
      // Restore full file contents - git-like behavior
      Object.entries(version.fileContents).forEach(([name, content]) => {
        const file = pythonModuleSystem.getFileByName(name);
        if (file) {
          pythonModuleSystem.updateFile(file.id, { content });
        }
      });
      toast.success(`Restored to version ${version.version} (files + links)`);
    } else {
      toast.success(`Restored to version ${version.version} (links only)`);
    }
  }, []);

  const getStrategyVersions = useCallback((strategyId: string) => {
    return strategyVersions.filter(v => v.strategyId === strategyId).sort((a, b) => b.version - a.version);
  }, [strategyVersions]);

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-cyan-950/30 via-background to-emerald-950/30">
      <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as StrategySubTab)} className="h-full flex flex-col">
        <div className="border-b border-cyan-500/30 bg-cyan-950/20 px-2 flex-shrink-0">
          <TabsList className="bg-transparent h-9">
            <TabsTrigger value="view" className="text-xs gap-1.5 data-[state=active]:bg-cyan-500/20">
              <Eye className="w-3 h-3" /> View
              <Badge variant="outline" className="text-[9px] h-4 ml-1">{strategies.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="execute" className="text-xs gap-1.5 data-[state=active]:bg-emerald-500/20">
              <Rocket className="w-3 h-3" /> Execute
            </TabsTrigger>
            <TabsTrigger value="create" className="text-xs gap-1.5 data-[state=active]:bg-purple-500/20">
              <Plus className="w-3 h-3" /> Create
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs gap-1.5 data-[state=active]:bg-amber-500/20">
              <BarChart3 className="w-3 h-3" /> Analytics
            </TabsTrigger>
            <TabsTrigger value="templates" className="text-xs gap-1.5 data-[state=active]:bg-pink-500/20">
              <Library className="w-3 h-3" /> Templates
            </TabsTrigger>
            <TabsTrigger value="versions" className="text-xs gap-1.5 data-[state=active]:bg-indigo-500/20">
              <GitBranch className="w-3 h-3" /> Versions
              <Badge variant="outline" className="text-[9px] h-4 ml-1">{strategyVersions.length}</Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          {/* VIEW TAB */}
          <TabsContent value="view" className="h-full m-0">
            <StrategyViewTab
              strategies={strategies}
              tags={tags}
              selectedStrategy={selectedStrategy}
              unsavedChanges={unsavedChanges}
              files={files}
              onSelectStrategy={setSelectedStrategy}
              onToggleStar={handleToggleStar}
              onTogglePin={handleTogglePin}
              onDuplicate={handleDuplicateStrategy}
              onDelete={handleDeleteStrategy}
              onEdit={setEditingStrategy}
              onCreateNew={() => setActiveSubTab('create')}
              onAddTag={handleAddTag}
            />
          </TabsContent>

          {/* EXECUTE TAB */}
          <TabsContent value="execute" className="h-full m-0">
            <StrategyExecuteTab
              strategies={strategies}
              tags={tags}
              binaryFiles={binaryFiles}
              selectedStrategy={selectedStrategy}
              selectedDataFile={selectedDataFile}
              isRunning={isRunning}
              isExecuting={isExecuting}
              executionStatus={executionStatus}
              executionProgress={executionProgress}
              executionHistory={executionHistory}
              executionOptions={executionOptions}
              onSelectStrategy={setSelectedStrategy}
              onSelectDataFile={setSelectedDataFile}
              onUpdateOptions={handleUpdateOptions}
              onRun={handleRunStrategy}
            />
          </TabsContent>

          {/* CREATE TAB */}
          <TabsContent value="create" className="h-full m-0">
            <StrategyCreateTab
              files={files}
              tags={tags}
              selectedScheduler={selectedScheduler}
              selectedAlgorithms={selectedAlgorithms}
              selectedScoring={selectedScoring}
              selectedPolicies={selectedPolicies}
              selectedCustomFiles={selectedCustomFiles}
              selectedTags={selectedTags}
              strategyName={strategyName}
              strategyDescription={strategyDescription}
              onSetScheduler={setSelectedScheduler}
              onSetAlgorithms={setSelectedAlgorithms}
              onSetScoring={setSelectedScoring}
              onSetPolicies={setSelectedPolicies}
              onSetCustomFiles={setSelectedCustomFiles}
              onSetTags={setSelectedTags}
              onSetName={setStrategyName}
              onSetDescription={setStrategyDescription}
              onCreate={handleCreateStrategy}
            />
          </TabsContent>

          {/* ANALYTICS TAB */}
          <TabsContent value="analytics" className="h-full m-0 p-3">
            <div className="h-full flex flex-col gap-3">
              <div className="grid grid-cols-4 gap-3">
                <Card className="bg-gradient-to-br from-cyan-950/50 to-blue-950/50">
                  <CardContent className="p-4 text-center">
                    <Gauge className="w-8 h-8 mx-auto text-cyan-400 mb-2" />
                    <span className="text-2xl font-bold text-cyan-300">{strategies.length}</span>
                    <p className="text-xs text-cyan-400">Total Strategies</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-950/50 to-green-950/50">
                  <CardContent className="p-4 text-center">
                    <Activity className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
                    <span className="text-2xl font-bold text-emerald-300">{executionHistory.length}</span>
                    <p className="text-xs text-emerald-400">Total Runs</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-950/50 to-orange-950/50">
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="w-8 h-8 mx-auto text-amber-400 mb-2" />
                    <span className="text-2xl font-bold text-amber-300">
                      {executionHistory.length > 0 ? (executionHistory.filter(e => e.success).length / executionHistory.length * 100).toFixed(0) : 0}%
                    </span>
                    <p className="text-xs text-amber-400">Success Rate</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-950/50 to-pink-950/50">
                  <CardContent className="p-4 text-center">
                    <Timer className="w-8 h-8 mx-auto text-purple-400 mb-2" />
                    <span className="text-2xl font-bold text-purple-300">
                      {executionHistory.length > 0 ? Math.round(executionHistory.reduce((sum, e) => sum + e.duration, 0) / executionHistory.length) : 0}ms
                    </span>
                    <p className="text-xs text-purple-400">Avg Duration</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="flex-1">
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-xs flex items-center gap-2">
                    <Star className="w-3 h-3 text-yellow-400" /> Top Performing Strategies
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {strategies.filter(s => s.runCount > 0).sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0)).slice(0, 10).map((strategy, i) => (
                        <div key={strategy.id} className="flex items-center gap-3 p-2 rounded bg-muted/30">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-500/20 text-yellow-400' : i === 1 ? 'bg-slate-400/20 text-slate-400' : i === 2 ? 'bg-amber-700/20 text-amber-600' : 'bg-muted text-muted-foreground'}`}>
                            {i + 1}
                          </span>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{strategy.name}</p>
                            <p className="text-xs text-muted-foreground">{strategy.runCount} runs</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-cyan-400">{strategy.avgScore?.toFixed(1) || 0}</p>
                            <p className="text-[10px] text-muted-foreground">avg score</p>
                          </div>
                        </div>
                      ))}
                      {strategies.filter(s => s.runCount > 0).length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-8">Run some strategies to see analytics</p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TEMPLATES TAB */}
          <TabsContent value="templates" className="h-full m-0 p-3">
            <ScrollArea className="h-full">
              <div className="grid grid-cols-3 gap-3">
                {STRATEGY_TEMPLATES.map((template, i) => (
                  <Card key={i} className="hover:border-pink-500/50 transition-colors cursor-pointer">
                    <CardHeader className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-pink-500/20">
                          <Brain className="w-4 h-4 text-pink-400" />
                        </div>
                        <CardTitle className="text-sm">{template.name}</CardTitle>
                      </div>
                      <CardDescription className="text-xs">{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="flex flex-wrap gap-1 mb-3">
                        {template.tags?.map(tagId => (
                          <Badge key={tagId} variant="secondary" className="text-[9px]">{tagId}</Badge>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>• {template.schedulerFile}</p>
                        <p>• {template.algorithmFiles?.length || 0} algorithms</p>
                        <p>• {template.scoringFiles?.length || 0} scoring</p>
                      </div>
                      <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => handleApplyTemplate(template)}>
                        <Download className="w-3 h-3 mr-2" /> Use Template
                      </Button>
                    </CardContent>
                  </Card>
                ))}
                <Card className="border-dashed hover:border-pink-500/50 transition-colors cursor-pointer">
                  <CardContent className="h-full flex flex-col items-center justify-center py-8">
                    <Plus className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Create Template</p>
                    <p className="text-xs text-muted-foreground">Save your strategy as a template</p>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* VERSIONS TAB */}
          <TabsContent value="versions" className="h-full m-0 p-3">
            <div className="h-full flex gap-3">
              <div className="w-1/3 flex flex-col gap-3">
                <Card>
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-xs flex items-center gap-2">
                      <Package className="w-3 h-3 text-indigo-400" /> Select Strategy
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3">
                    <Select value={selectedVersionStrategy || ''} onValueChange={setSelectedVersionStrategy}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Choose a strategy..." /></SelectTrigger>
                      <SelectContent>
                        {strategies.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            <div className="flex items-center gap-2">
                              <span>{s.name}</span>
                              {s.version && <Badge variant="outline" className="text-[9px]">v{s.version}</Badge>}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              </div>

              <Card className="flex-1">
                <CardHeader className="py-2 px-3 flex-row items-center justify-between">
                  <CardTitle className="text-xs flex items-center gap-2">
                    <History className="w-3 h-3 text-indigo-400" /> Version History
                  </CardTitle>
                  {selectedVersionStrategy && (
                    <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => setShowVersionDialog(true)}>
                      <Plus className="w-3 h-3 mr-1" /> Save Version
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-3">
                  {selectedVersionStrategy ? (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2">
                        {getStrategyVersions(selectedVersionStrategy).map(version => (
                          <Card key={version.id} className="bg-muted/30">
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30">v{version.version}</Badge>
                                  <span className="text-[10px] text-muted-foreground">{new Date(version.timestamp).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => handleRestoreVersion(version, false)}>
                                    Links Only
                                  </Button>
                                  {version.fileContents && (
                                    <Button size="sm" variant="default" className="h-6 text-[10px]" onClick={() => handleRestoreVersion(version, true)}>
                                      Full Restore
                                    </Button>
                                  )}
                                  <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => setStrategyVersions(prev => prev.filter(v => v.id !== version.id))}>
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                              <p className="text-sm">{version.message}</p>
                              <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                                <span>{version.snapshot.algorithmFiles.length} algorithms</span>
                                <Separator orientation="vertical" className="h-3" />
                                <span>{version.snapshot.scoringFiles.length} scoring</span>
                                <Separator orientation="vertical" className="h-3" />
                                <span>{version.snapshot.policyFiles.length} policies</span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        {getStrategyVersions(selectedVersionStrategy).length === 0 && (
                          <div className="text-center py-8">
                            <GitBranch className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                            <p className="text-sm text-muted-foreground">No versions saved</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-12">
                      <Package className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                      <p className="text-sm text-muted-foreground">Select a strategy to view versions</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Version Save Dialog */}
      <Dialog open={showVersionDialog} onOpenChange={setShowVersionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-indigo-400" /> Save Version
            </DialogTitle>
            <DialogDescription className="text-xs">Save the current state of this strategy</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs">Version Message</Label>
              <Textarea value={versionMessage} onChange={(e) => setVersionMessage(e.target.value)} placeholder="Describe what changed..." className="min-h-[80px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVersionDialog(false)}>Cancel</Button>
            <Button
              onClick={() => { const s = strategies.find(s => s.id === selectedVersionStrategy); if (s) handleSaveVersion(s); }}
              disabled={!versionMessage.trim()}
            >
              <Save className="w-4 h-4 mr-2" /> Save Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
