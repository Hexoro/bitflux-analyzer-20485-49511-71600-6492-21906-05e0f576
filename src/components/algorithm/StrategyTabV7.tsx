/**
 * Strategy Tab V7 - Enhanced gamified strategy interface
 * Features:
 * - Unified file browser with filters (no 4 separate pickers)
 * - Tags support for strategies
 * - Custom files support
 * - More sub-tabs: View, Execute, Create, Analytics, Templates
 * - Parallel operations support
 * - Enhanced execution with ETA, queue, history
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Plus,
  Play,
  Pause,
  Square,
  Trash2,
  CheckCircle2,
  XCircle,
  Code,
  Calculator,
  Shield,
  Clock,
  Loader2,
  Zap,
  Search,
  FolderOpen,
  Layers,
  FileCode,
  Save,
  ChevronDown,
  ChevronRight,
  Eye,
  Rocket,
  Wrench,
  Filter,
  Timer,
  TrendingUp,
  AlertCircle,
  Info,
  GitBranch,
  Cpu,
  Tag,
  Star,
  StarOff,
  Copy,
  MoreVertical,
  Edit,
  Download,
  Upload,
  BarChart3,
  Library,
  Sparkles,
  RefreshCw,
  History,
  Settings,
  Gauge,
  Activity,
  FileText,
  X,
  Check,
  ChevronUp,
  ListFilter,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
  Package,
  Puzzle,
  Workflow,
  Brain,
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

const STRATEGY_STORAGE_KEY = 'bsee_saved_strategies_v7';
const STRATEGY_TAGS_KEY = 'bsee_strategy_tags_v7';
const EXECUTION_HISTORY_KEY = 'bsee_execution_history_v7';
const STRATEGY_VERSIONS_KEY = 'bsee_strategy_versions_v1';
const BREAKPOINTS_KEY = 'bsee_breakpoints_v1';

type StrategySubTab = 'view' | 'execute' | 'create' | 'analytics' | 'templates' | 'versions';
type FileViewMode = 'grid' | 'list';
type FileGroup = 'all' | 'scheduler' | 'algorithm' | 'scoring' | 'policies' | 'custom';

interface StrategyTag {
  id: string;
  name: string;
  color: string;
}

interface StrategyVersion {
  id: string;
  strategyId: string;
  version: number;
  snapshot: EnhancedStrategy;
  timestamp: number;
  message: string;
  author?: string;
}

interface Breakpoint {
  id: string;
  strategyId: string;
  operation: string;
  stepIndex?: number;
  condition?: string; // e.g., "entropy < 0.5"
  enabled: boolean;
  hitCount: number;
}

interface EnhancedStrategy extends Omit<StrategyConfig, 'created'> {
  tags: string[];
  starred: boolean;
  customFiles: string[];
  description?: string;
  createdAt: number;
  created: Date | number;
  lastRun?: number;
  runCount: number;
  avgScore?: number;
  avgDuration?: number;
  version?: number;
  breakpoints?: string[]; // Breakpoint IDs
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

// Predefined tag colors
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

// ETA estimation
const estimateETA = (strategy: EnhancedStrategy, dataFileSize: number, parallelEnabled: boolean): { 
  minutes: number; 
  seconds: number; 
  confidence: 'high' | 'medium' | 'low';
  breakdown: { phase: string; seconds: number }[];
} => {
  const fileCount = strategy.algorithmFiles.length + strategy.scoringFiles.length + 
                   strategy.policyFiles.length + (strategy.customFiles?.length || 0) + 1;
  const baseTime = 0.5;
  const sizeMultiplier = Math.log2(dataFileSize + 1) * 0.1;
  let totalSeconds = fileCount * baseTime * (1 + sizeMultiplier);
  
  // Parallel reduces time
  if (parallelEnabled && strategy.algorithmFiles.length > 1) {
    totalSeconds *= 0.6;
  }
  
  const breakdown = [
    { phase: 'Scheduler', seconds: baseTime * (1 + sizeMultiplier) },
    { phase: 'Algorithms', seconds: strategy.algorithmFiles.length * baseTime * (parallelEnabled ? 0.5 : 1) },
    { phase: 'Scoring', seconds: strategy.scoringFiles.length * baseTime * 0.5 },
    { phase: 'Policies', seconds: strategy.policyFiles.length * baseTime * 0.3 },
  ];
  
  if (strategy.customFiles?.length) {
    breakdown.push({ phase: 'Custom', seconds: strategy.customFiles.length * baseTime });
  }
  
  return {
    minutes: Math.floor(totalSeconds / 60),
    seconds: Math.round(totalSeconds % 60),
    confidence: fileCount > 8 ? 'low' : fileCount > 4 ? 'medium' : 'high',
    breakdown,
  };
};

// Strategy Templates
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
  
  // Unified file browser state
  const [fileSearch, setFileSearch] = useState('');
  const [fileGroupFilter, setFileGroupFilter] = useState<FileGroup>('all');
  const [fileViewMode, setFileViewMode] = useState<FileViewMode>('list');
  const [sortBy, setSortBy] = useState<'name' | 'lines' | 'date'>('name');
  const [sortAsc, setSortAsc] = useState(true);
  
  // View tab state
  const [strategySearch, setStrategySearch] = useState('');
  const [viewFilter, setViewFilter] = useState<'all' | 'starred' | 'recent'>('all');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [expandedStrategy, setExpandedStrategy] = useState<string | null>(null);
  
  // Create tab state
  const [strategyName, setStrategyName] = useState('');
  const [strategyDescription, setStrategyDescription] = useState('');
  const [selectedScheduler, setSelectedScheduler] = useState('');
  const [selectedAlgorithms, setSelectedAlgorithms] = useState<string[]>([]);
  const [selectedScoring, setSelectedScoring] = useState<string[]>([]);
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);
  const [selectedCustomFiles, setSelectedCustomFiles] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  // Execute tab state
  const [enableParallel, setEnableParallel] = useState(true);
  const [autoNavigate, setAutoNavigate] = useState(true);
  const [executionQueue, setExecutionQueue] = useState<string[]>([]);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  
  // Versioning state
  const [strategyVersions, setStrategyVersions] = useState<StrategyVersion[]>([]);
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [versionMessage, setVersionMessage] = useState('');
  const [selectedVersionStrategy, setSelectedVersionStrategy] = useState<string | null>(null);
  
  // Breakpoints state
  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>([]);
  const [showBreakpointDialog, setShowBreakpointDialog] = useState(false);
  const [newBreakpointOp, setNewBreakpointOp] = useState('');
  const [newBreakpointCondition, setNewBreakpointCondition] = useState('');
  const [newBreakpointStep, setNewBreakpointStep] = useState<number | undefined>();
  
  // Dialog states
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [editingStrategy, setEditingStrategy] = useState<EnhancedStrategy | null>(null);

  // Load saved data
  useEffect(() => {
    try {
      const savedStrategies = localStorage.getItem(STRATEGY_STORAGE_KEY);
      if (savedStrategies) {
        setStrategies(JSON.parse(savedStrategies));
      }
      
      const savedTags = localStorage.getItem(STRATEGY_TAGS_KEY);
      if (savedTags) {
        setTags(JSON.parse(savedTags));
      } else {
        // Default tags
        setTags([
          { id: 'quick', name: 'Quick', color: TAG_COLORS[8] },
          { id: 'complete', name: 'Complete', color: TAG_COLORS[5] },
          { id: 'experimental', name: 'Experimental', color: TAG_COLORS[13] },
          { id: 'production', name: 'Production', color: TAG_COLORS[4] },
        ]);
      }
      
      const savedHistory = localStorage.getItem(EXECUTION_HISTORY_KEY);
      if (savedHistory) {
        setExecutionHistory(JSON.parse(savedHistory));
      }
      
      // Load versions
      const savedVersions = localStorage.getItem(STRATEGY_VERSIONS_KEY);
      if (savedVersions) {
        setStrategyVersions(JSON.parse(savedVersions));
      }
      
      // Load breakpoints
      const savedBreakpoints = localStorage.getItem(BREAKPOINTS_KEY);
      if (savedBreakpoints) {
        setBreakpoints(JSON.parse(savedBreakpoints));
      }
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
    
    const unsub1 = pythonModuleSystem.subscribe(() => {
      setFiles(pythonModuleSystem.getAllFiles());
    });
    const unsub2 = fileSystemManager.subscribe(() => {
      setBinaryFiles(fileSystemManager.getFiles());
    });
    const unsub3 = strategyExecutionEngine.subscribe((result, status) => {
      setExecutionStatus(status);
      if (status === 'completed' && result?.success) {
        setExecutionProgress(100);
        toast.success('Strategy completed!');
        
        // Update history
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
            parallelEnabled: enableParallel,
            operationCount: result.totalOperations,
          };
          setExecutionHistory(prev => [entry, ...prev].slice(0, 100));
          
          // Update strategy stats
          setStrategies(prev => prev.map(s => {
            if (s.id === selectedStrategy.id) {
              const newRunCount = s.runCount + 1;
              const newAvgScore = s.avgScore 
                ? (s.avgScore * s.runCount + result.totalScore) / newRunCount 
                : result.totalScore;
              const newAvgDuration = s.avgDuration 
                ? (s.avgDuration * s.runCount + result.totalDuration) / newRunCount 
                : result.totalDuration;
              return {
                ...s,
                runCount: newRunCount,
                lastRun: Date.now(),
                avgScore: newAvgScore,
                avgDuration: newAvgDuration,
              };
            }
            return s;
          }));
        }
        
        if (autoNavigate && onNavigateToTimeline) {
          onNavigateToTimeline();
        }
      } else if (status === 'failed') {
        toast.error(`Failed: ${result?.error || 'Unknown error'}`);
      } else if (status.includes('running')) {
        const match = status.match(/(\d+)/);
        if (match) {
          setExecutionProgress(parseInt(match[1], 10));
        }
      }
    });

    return () => { unsub1(); unsub2(); unsub3(); };
  }, [onNavigateToTimeline, autoNavigate, selectedStrategy, selectedDataFile, binaryFiles, enableParallel]);

  // Save data
  useEffect(() => {
    if (strategies.length > 0) {
      localStorage.setItem(STRATEGY_STORAGE_KEY, JSON.stringify(strategies));
    }
  }, [strategies]);

  useEffect(() => {
    if (tags.length > 0) {
      localStorage.setItem(STRATEGY_TAGS_KEY, JSON.stringify(tags));
    }
  }, [tags]);

  useEffect(() => {
    if (executionHistory.length > 0) {
      localStorage.setItem(EXECUTION_HISTORY_KEY, JSON.stringify(executionHistory));
    }
  }, [executionHistory]);

  // File filtering and sorting
  const filteredFiles = useMemo(() => {
    let filtered = files.filter(f => {
      const matchesSearch = f.name.toLowerCase().includes(fileSearch.toLowerCase());
      let matchesGroup = false;
      
      if (fileGroupFilter === 'all') {
        matchesGroup = true;
      } else if (fileGroupFilter === 'custom') {
        // Show custom, ai, and any non-standard groups
        matchesGroup = f.group === 'custom' || f.group === 'ai' || !['scheduler', 'algorithm', 'scoring', 'policies'].includes(f.group);
      } else {
        matchesGroup = f.group === fileGroupFilter;
      }
      
      return matchesSearch && matchesGroup;
    });
    
    // Sort
    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortBy === 'lines') cmp = a.content.split('\n').length - b.content.split('\n').length;
      else if (sortBy === 'date') cmp = new Date(b.modified).getTime() - new Date(a.modified).getTime();
      return sortAsc ? cmp : -cmp;
    });
    
    return filtered;
  }, [files, fileSearch, fileGroupFilter, sortBy, sortAsc]);

  // File counts by group
  const fileCounts = useMemo(() => ({
    all: files.length,
    scheduler: files.filter(f => f.group === 'scheduler').length,
    algorithm: files.filter(f => f.group === 'algorithm').length,
    scoring: files.filter(f => f.group === 'scoring').length,
    policies: files.filter(f => f.group === 'policies').length,
    custom: files.filter(f => f.group === 'custom' || f.group === 'ai' || !['scheduler', 'algorithm', 'scoring', 'policies'].includes(f.group)).length,
  }), [files]);

  // Strategy filtering
  const filteredStrategies = useMemo(() => {
    return strategies.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(strategySearch.toLowerCase()) ||
                           s.description?.toLowerCase().includes(strategySearch.toLowerCase());
      const matchesView = viewFilter === 'all' || 
                         (viewFilter === 'starred' && s.starred) ||
                         (viewFilter === 'recent' && s.lastRun && Date.now() - s.lastRun < 7 * 24 * 60 * 60 * 1000);
      const matchesTag = !tagFilter || s.tags.includes(tagFilter);
      return matchesSearch && matchesView && matchesTag;
    });
  }, [strategies, strategySearch, viewFilter, tagFilter]);

  // Data file size for ETA
  const selectedDataFileSize = useMemo(() => {
    if (!selectedDataFile) return 0;
    const file = binaryFiles.find(f => f.id === selectedDataFile);
    return file?.state?.model?.getBits()?.length || 0;
  }, [selectedDataFile, binaryFiles]);

  // Handlers
  const toggleFileSelection = useCallback((fileName: string, group: FileGroup) => {
    if (group === 'scheduler') {
      setSelectedScheduler(prev => prev === fileName ? '' : fileName);
    } else if (group === 'algorithm') {
      setSelectedAlgorithms(prev => 
        prev.includes(fileName) ? prev.filter(f => f !== fileName) : [...prev, fileName]
      );
    } else if (group === 'scoring') {
      setSelectedScoring(prev => 
        prev.includes(fileName) ? prev.filter(f => f !== fileName) : [...prev, fileName]
      );
    } else if (group === 'policies') {
      setSelectedPolicies(prev => 
        prev.includes(fileName) ? prev.filter(f => f !== fileName) : [...prev, fileName]
      );
    } else {
      setSelectedCustomFiles(prev => 
        prev.includes(fileName) ? prev.filter(f => f !== fileName) : [...prev, fileName]
      );
    }
  }, []);

  const isFileSelected = useCallback((fileName: string, group: string) => {
    if (group === 'scheduler') return selectedScheduler === fileName;
    if (group === 'algorithm') return selectedAlgorithms.includes(fileName);
    if (group === 'scoring') return selectedScoring.includes(fileName);
    if (group === 'policies') return selectedPolicies.includes(fileName);
    return selectedCustomFiles.includes(fileName);
  }, [selectedScheduler, selectedAlgorithms, selectedScoring, selectedPolicies, selectedCustomFiles]);

  const handleCreateStrategy = () => {
    if (!strategyName.trim()) {
      toast.error('Enter a strategy name');
      return;
    }
    if (!selectedScheduler) {
      toast.error('Select a scheduler file');
      return;
    }

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
      createdAt: Date.now(),
      runCount: 0,
      created: new Date(),
    };

    setStrategies(prev => [...prev, newStrategy]);
    toast.success(`Strategy "${strategyName}" created`);
    
    // Reset form
    setStrategyName('');
    setStrategyDescription('');
    setSelectedScheduler('');
    setSelectedAlgorithms([]);
    setSelectedScoring([]);
    setSelectedPolicies([]);
    setSelectedCustomFiles([]);
    setSelectedTags([]);
    setSelectedStrategy(newStrategy);
    setActiveSubTab('view');
  };

  const handleDeleteStrategy = (id: string) => {
    setStrategies(prev => prev.filter(s => s.id !== id));
    if (selectedStrategy?.id === id) {
      setSelectedStrategy(null);
    }
    toast.success('Strategy deleted');
  };

  const handleDuplicateStrategy = (strategy: EnhancedStrategy) => {
    const duplicate: EnhancedStrategy = {
      ...strategy,
      id: `strategy_${Date.now()}`,
      name: `${strategy.name} (Copy)`,
      createdAt: Date.now(),
      created: Date.now(),
      runCount: 0,
      lastRun: undefined,
      avgScore: undefined,
      avgDuration: undefined,
    };
    setStrategies(prev => [...prev, duplicate]);
    toast.success('Strategy duplicated');
  };

  const handleToggleStar = (id: string) => {
    setStrategies(prev => prev.map(s => 
      s.id === id ? { ...s, starred: !s.starred } : s
    ));
  };

  const handleRunStrategy = async () => {
    if (!selectedStrategy || !selectedDataFile) return;

    setIsRunning(true);
    setExecutionProgress(0);
    try {
      // Convert to base StrategyConfig
      const createdDate = selectedStrategy.created instanceof Date 
        ? selectedStrategy.created 
        : new Date(selectedStrategy.createdAt || selectedStrategy.created);
      const baseConfig: StrategyConfig = {
        id: selectedStrategy.id,
        name: selectedStrategy.name,
        schedulerFile: selectedStrategy.schedulerFile,
        algorithmFiles: [...selectedStrategy.algorithmFiles, ...(selectedStrategy.customFiles || [])],
        scoringFiles: selectedStrategy.scoringFiles,
        policyFiles: selectedStrategy.policyFiles,
        created: createdDate,
      };
      
      const result = await strategyExecutionEngine.executeStrategy(
        baseConfig,
        selectedDataFile
      );
      if (result.success) {
        toast.success(`Score: ${result.totalScore.toFixed(2)}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Execution failed');
    } finally {
      setIsRunning(false);
      setExecutionStatus('');
    }
  };

  const handleAddTag = () => {
    if (!newTagName.trim()) return;
    const newTag: StrategyTag = {
      id: newTagName.toLowerCase().replace(/\s+/g, '_'),
      name: newTagName,
      color: newTagColor,
    };
    setTags(prev => [...prev, newTag]);
    setNewTagName('');
    setShowTagDialog(false);
    toast.success('Tag created');
  };

  const handleApplyTemplate = (template: Partial<EnhancedStrategy>) => {
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
  };

  // --- VERSION MANAGEMENT ---
  const handleSaveVersion = (strategy: EnhancedStrategy) => {
    if (!versionMessage.trim()) {
      toast.error('Please enter a version message');
      return;
    }
    
    const existingVersions = strategyVersions.filter(v => v.strategyId === strategy.id);
    const nextVersion = existingVersions.length + 1;
    
    const newVersion: StrategyVersion = {
      id: `ver_${Date.now()}`,
      strategyId: strategy.id,
      version: nextVersion,
      snapshot: { ...strategy },
      timestamp: Date.now(),
      message: versionMessage,
    };
    
    setStrategyVersions(prev => [...prev, newVersion]);
    setStrategies(prev => prev.map(s => 
      s.id === strategy.id ? { ...s, version: nextVersion } : s
    ));
    setVersionMessage('');
    setShowVersionDialog(false);
    toast.success(`Version ${nextVersion} saved`);
  };

  const handleRestoreVersion = (version: StrategyVersion) => {
    setStrategies(prev => prev.map(s => 
      s.id === version.strategyId ? { ...version.snapshot, version: s.version } : s
    ));
    toast.success(`Restored to version ${version.version}`);
  };

  const handleDeleteVersion = (versionId: string) => {
    setStrategyVersions(prev => prev.filter(v => v.id !== versionId));
    toast.success('Version deleted');
  };

  // Get versions for a strategy
  const getStrategyVersions = (strategyId: string) => {
    return strategyVersions.filter(v => v.strategyId === strategyId).sort((a, b) => b.version - a.version);
  };

  // --- BREAKPOINT MANAGEMENT ---
  const handleAddBreakpoint = () => {
    if (!newBreakpointOp.trim() || !selectedStrategy) {
      toast.error('Select an operation for the breakpoint');
      return;
    }
    
    const newBreakpoint: Breakpoint = {
      id: `bp_${Date.now()}`,
      strategyId: selectedStrategy.id,
      operation: newBreakpointOp,
      stepIndex: newBreakpointStep,
      condition: newBreakpointCondition || undefined,
      enabled: true,
      hitCount: 0,
    };
    
    setBreakpoints(prev => [...prev, newBreakpoint]);
    setNewBreakpointOp('');
    setNewBreakpointCondition('');
    setNewBreakpointStep(undefined);
    setShowBreakpointDialog(false);
    toast.success('Breakpoint added');
  };

  const handleToggleBreakpoint = (breakpointId: string) => {
    setBreakpoints(prev => prev.map(bp => 
      bp.id === breakpointId ? { ...bp, enabled: !bp.enabled } : bp
    ));
  };

  const handleDeleteBreakpoint = (breakpointId: string) => {
    setBreakpoints(prev => prev.filter(bp => bp.id !== breakpointId));
    toast.success('Breakpoint removed');
  };

  // Get breakpoints for a strategy
  const getStrategyBreakpoints = (strategyId: string) => {
    return breakpoints.filter(bp => bp.strategyId === strategyId);
  };

  // Save versions to localStorage
  useEffect(() => {
    if (strategyVersions.length > 0) {
      localStorage.setItem(STRATEGY_VERSIONS_KEY, JSON.stringify(strategyVersions));
    }
  }, [strategyVersions]);

  // Save breakpoints to localStorage
  useEffect(() => {
    if (breakpoints.length > 0) {
      localStorage.setItem(BREAKPOINTS_KEY, JSON.stringify(breakpoints));
    }
  }, [breakpoints]);

  // Get group icon
  const getGroupIcon = (group: string) => {
    switch (group) {
      case 'scheduler': return <Clock className="w-3 h-3" />;
      case 'algorithm': return <Code className="w-3 h-3" />;
      case 'scoring': return <Calculator className="w-3 h-3" />;
      case 'policies': return <Shield className="w-3 h-3" />;
      default: return <Puzzle className="w-3 h-3" />;
    }
  };

  const getGroupColor = (group: string) => {
    switch (group) {
      case 'scheduler': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      case 'algorithm': return 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30';
      case 'scoring': return 'text-amber-400 bg-amber-500/20 border-amber-500/30';
      case 'policies': return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
      default: return 'text-purple-400 bg-purple-500/20 border-purple-500/30';
    }
  };

  // Unified File Browser Component
  const UnifiedFileBrowser = ({ selectable = false }: { selectable?: boolean }) => (
    <Card className="h-full flex flex-col">
      <CardHeader className="py-2 px-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-xs flex items-center gap-2">
            <FolderOpen className="w-3 h-3 text-cyan-400" />
            Files
            <Badge variant="outline" className="text-[10px] h-4">{filteredFiles.length}</Badge>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setFileViewMode(fileViewMode === 'grid' ? 'list' : 'grid')}
            >
              {fileViewMode === 'grid' ? <List className="w-3 h-3" /> : <Grid3X3 className="w-3 h-3" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setSortAsc(!sortAsc)}
            >
              {sortAsc ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />}
            </Button>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative mt-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            value={fileSearch}
            onChange={(e) => setFileSearch(e.target.value)}
            placeholder="Search files..."
            className="pl-7 h-7 text-xs"
          />
        </div>
        
        {/* Filter buttons */}
        <div className="flex flex-wrap gap-1 mt-2">
          {(['all', 'scheduler', 'algorithm', 'scoring', 'policies', 'custom'] as FileGroup[]).map(group => (
            <Button
              key={group}
              variant={fileGroupFilter === group ? 'secondary' : 'ghost'}
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => setFileGroupFilter(group)}
            >
              {group === 'all' ? <Layers className="w-3 h-3 mr-1" /> : getGroupIcon(group)}
              <span className="ml-1 capitalize">{group}</span>
              <Badge variant="outline" className="ml-1 text-[9px] h-4 px-1">
                {fileCounts[group]}
              </Badge>
            </Button>
          ))}
        </div>
      </CardHeader>
      
      <CardContent className="p-2 flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className={fileViewMode === 'grid' ? 'grid grid-cols-2 gap-2' : 'space-y-1'}>
            {filteredFiles.map(file => {
              const lineCount = file.content.split('\n').length;
              const isSelected = selectable && isFileSelected(file.name, file.group);
              const colorClass = getGroupColor(file.group);
              
              return (
                <div
                  key={file.id}
                  className={`
                    ${fileViewMode === 'grid' ? 'p-2' : 'flex items-center gap-2 p-2'}
                    rounded cursor-pointer transition-colors border
                    ${isSelected ? colorClass : 'border-transparent hover:bg-muted/30'}
                  `}
                  onClick={() => selectable && toggleFileSelection(file.name, file.group as FileGroup)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {selectable && (
                      file.group === 'scheduler' ? (
                        <div className={`w-3 h-3 rounded-full border ${isSelected ? 'bg-current' : ''}`} />
                      ) : (
                        <Checkbox checked={isSelected} className="h-3 w-3" />
                      )
                    )}
                    <div className={`p-1 rounded ${colorClass}`}>
                      {getGroupIcon(file.group)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate font-medium">{file.name}</p>
                      {fileViewMode === 'grid' && (
                        <p className="text-[10px] text-muted-foreground">{lineCount} lines</p>
                      )}
                    </div>
                  </div>
                  {fileViewMode === 'list' && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="secondary" className="text-[9px] h-4 capitalize">
                        {file.group}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] h-4">
                        {lineCount}L
                      </Badge>
                    </div>
                  )}
                </div>
              );
            })}
            {filteredFiles.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">No files found</p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );

  // Strategy Card Component
  const StrategyCard = ({ strategy }: { strategy: EnhancedStrategy }) => {
    const validation = pythonModuleSystem.validateStrategy(strategy.id);
    const isExpanded = expandedStrategy === strategy.id;
    const totalFiles = 1 + strategy.algorithmFiles.length + strategy.scoringFiles.length + 
                      strategy.policyFiles.length + (strategy.customFiles?.length || 0);
    
    return (
      <Card className={`border transition-colors ${
        selectedStrategy?.id === strategy.id ? 'border-cyan-500/50 bg-cyan-950/20' : ''
      }`}>
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div 
              className="flex-1 cursor-pointer"
              onClick={() => setSelectedStrategy(strategy)}
            >
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleStar(strategy.id);
                  }}
                >
                  {strategy.starred ? (
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  ) : (
                    <StarOff className="w-3 h-3 text-muted-foreground" />
                  )}
                </Button>
                <h3 className="font-medium text-sm">{strategy.name}</h3>
                {!validation.valid && (
                  <AlertCircle className="w-3 h-3 text-destructive" />
                )}
              </div>
              {strategy.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                  {strategy.description}
                </p>
              )}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditingStrategy(strategy)}>
                  <Edit className="w-3 h-3 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDuplicateStrategy(strategy)}>
                  <Copy className="w-3 h-3 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={() => handleDeleteStrategy(strategy.id)}
                >
                  <Trash2 className="w-3 h-3 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Tags */}
          {strategy.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {strategy.tags.map(tagId => {
                const tag = tags.find(t => t.id === tagId);
                return tag ? (
                  <Badge key={tagId} className={`text-[9px] h-4 ${tag.color}`}>
                    {tag.name}
                  </Badge>
                ) : null;
              })}
            </div>
          )}
          
          {/* File counts */}
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileCode className="w-3 h-3" />
              {totalFiles} files
            </span>
            {strategy.runCount > 0 && (
              <>
                <Separator orientation="vertical" className="h-3" />
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  {strategy.runCount} runs
                </span>
                {strategy.avgScore !== undefined && (
                  <>
                    <Separator orientation="vertical" className="h-3" />
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {strategy.avgScore.toFixed(1)} avg
                    </span>
                  </>
                )}
              </>
            )}
          </div>
          
          {/* Expanded view */}
          <Collapsible open={isExpanded} onOpenChange={() => setExpandedStrategy(isExpanded ? null : strategy.id)}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full mt-2 h-6 text-xs">
                {isExpanded ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
                {isExpanded ? 'Hide' : 'Show'} details
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {/* Scheduler */}
              <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-2 text-xs">
                  <Clock className="w-3 h-3 text-blue-400" />
                  <span className="text-blue-400 font-medium">Scheduler</span>
                </div>
                <p className="text-xs ml-5 mt-1">{strategy.schedulerFile}</p>
              </div>
              
              {/* Algorithms */}
              {strategy.algorithmFiles.length > 0 && (
                <div className="p-2 rounded bg-cyan-500/10 border border-cyan-500/20">
                  <div className="flex items-center gap-2 text-xs">
                    <Code className="w-3 h-3 text-cyan-400" />
                    <span className="text-cyan-400 font-medium">Algorithms ({strategy.algorithmFiles.length})</span>
                  </div>
                  <div className="ml-5 mt-1 space-y-0.5">
                    {strategy.algorithmFiles.map(f => (
                      <p key={f} className="text-xs">{f}</p>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Scoring */}
              {strategy.scoringFiles.length > 0 && (
                <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-2 text-xs">
                    <Calculator className="w-3 h-3 text-amber-400" />
                    <span className="text-amber-400 font-medium">Scoring ({strategy.scoringFiles.length})</span>
                  </div>
                  <div className="ml-5 mt-1 space-y-0.5">
                    {strategy.scoringFiles.map(f => (
                      <p key={f} className="text-xs">{f}</p>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Policies */}
              {strategy.policyFiles.length > 0 && (
                <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2 text-xs">
                    <Shield className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">Policies ({strategy.policyFiles.length})</span>
                  </div>
                  <div className="ml-5 mt-1 space-y-0.5">
                    {strategy.policyFiles.map(f => (
                      <p key={f} className="text-xs">{f}</p>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Custom Files */}
              {strategy.customFiles && strategy.customFiles.length > 0 && (
                <div className="p-2 rounded bg-purple-500/10 border border-purple-500/20">
                  <div className="flex items-center gap-2 text-xs">
                    <Puzzle className="w-3 h-3 text-purple-400" />
                    <span className="text-purple-400 font-medium">Custom ({strategy.customFiles.length})</span>
                  </div>
                  <div className="ml-5 mt-1 space-y-0.5">
                    {strategy.customFiles.map(f => (
                      <p key={f} className="text-xs">{f}</p>
                    ))}
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-cyan-950/30 via-background to-emerald-950/30">
      <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as StrategySubTab)} className="h-full flex flex-col">
        {/* Sub-tab Navigation */}
        <div className="border-b border-cyan-500/30 bg-cyan-950/20 px-2 flex-shrink-0">
          <TabsList className="bg-transparent h-9">
            <TabsTrigger value="view" className="text-xs gap-1.5 data-[state=active]:bg-cyan-500/20">
              <Eye className="w-3 h-3" />
              View
              <Badge variant="outline" className="text-[9px] h-4 ml-1">{strategies.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="execute" className="text-xs gap-1.5 data-[state=active]:bg-emerald-500/20">
              <Rocket className="w-3 h-3" />
              Execute
            </TabsTrigger>
            <TabsTrigger value="create" className="text-xs gap-1.5 data-[state=active]:bg-purple-500/20">
              <Plus className="w-3 h-3" />
              Create
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs gap-1.5 data-[state=active]:bg-amber-500/20">
              <BarChart3 className="w-3 h-3" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="templates" className="text-xs gap-1.5 data-[state=active]:bg-pink-500/20">
              <Library className="w-3 h-3" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="versions" className="text-xs gap-1.5 data-[state=active]:bg-indigo-500/20">
              <GitBranch className="w-3 h-3" />
              Versions
              <Badge variant="outline" className="text-[9px] h-4 ml-1">{strategyVersions.length}</Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          {/* VIEW TAB */}
          <TabsContent value="view" className="h-full m-0 p-3">
            <div className="h-full flex flex-col gap-3">
              {/* Filters Row */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={strategySearch}
                    onChange={(e) => setStrategySearch(e.target.value)}
                    placeholder="Search strategies..."
                    className="pl-8 h-8 text-sm"
                  />
                </div>
                
                <Select value={viewFilter} onValueChange={(v: any) => setViewFilter(v)}>
                  <SelectTrigger className="w-28 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="starred">Starred</SelectItem>
                    <SelectItem value="recent">Recent</SelectItem>
                  </SelectContent>
                </Select>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs">
                      <Tag className="w-3 h-3 mr-1" />
                      Tags
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setTagFilter(null)}>
                      <Check className={`w-3 h-3 mr-2 ${!tagFilter ? '' : 'invisible'}`} />
                      All Tags
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {tags.map(tag => (
                      <DropdownMenuItem key={tag.id} onClick={() => setTagFilter(tag.id)}>
                        <Check className={`w-3 h-3 mr-2 ${tagFilter === tag.id ? '' : 'invisible'}`} />
                        <Badge className={`${tag.color} text-[10px]`}>{tag.name}</Badge>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowTagDialog(true)}>
                      <Plus className="w-3 h-3 mr-2" />
                      Create Tag
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              {/* Stats Row */}
              <div className="grid grid-cols-5 gap-2 flex-shrink-0">
                <Card className="bg-blue-500/10 border-blue-500/30">
                  <CardContent className="p-2 text-center">
                    <Clock className="w-4 h-4 mx-auto text-blue-400 mb-1" />
                    <span className="text-lg font-bold text-blue-300">{fileCounts.scheduler}</span>
                    <p className="text-[9px] text-blue-400">Schedulers</p>
                  </CardContent>
                </Card>
                <Card className="bg-cyan-500/10 border-cyan-500/30">
                  <CardContent className="p-2 text-center">
                    <Code className="w-4 h-4 mx-auto text-cyan-400 mb-1" />
                    <span className="text-lg font-bold text-cyan-300">{fileCounts.algorithm}</span>
                    <p className="text-[9px] text-cyan-400">Algorithms</p>
                  </CardContent>
                </Card>
                <Card className="bg-amber-500/10 border-amber-500/30">
                  <CardContent className="p-2 text-center">
                    <Calculator className="w-4 h-4 mx-auto text-amber-400 mb-1" />
                    <span className="text-lg font-bold text-amber-300">{fileCounts.scoring}</span>
                    <p className="text-[9px] text-amber-400">Scoring</p>
                  </CardContent>
                </Card>
                <Card className="bg-emerald-500/10 border-emerald-500/30">
                  <CardContent className="p-2 text-center">
                    <Shield className="w-4 h-4 mx-auto text-emerald-400 mb-1" />
                    <span className="text-lg font-bold text-emerald-300">{fileCounts.policies}</span>
                    <p className="text-[9px] text-emerald-400">Policies</p>
                  </CardContent>
                </Card>
                <Card className="bg-purple-500/10 border-purple-500/30">
                  <CardContent className="p-2 text-center">
                    <Puzzle className="w-4 h-4 mx-auto text-purple-400 mb-1" />
                    <span className="text-lg font-bold text-purple-300">{fileCounts.custom}</span>
                    <p className="text-[9px] text-purple-400">Custom</p>
                  </CardContent>
                </Card>
              </div>
              
              {/* Strategy List */}
              <ScrollArea className="flex-1">
                <div className="grid grid-cols-2 gap-3">
                  {filteredStrategies.map(strategy => (
                    <StrategyCard key={strategy.id} strategy={strategy} />
                  ))}
                  {filteredStrategies.length === 0 && (
                    <div className="col-span-2 text-center py-12">
                      <Package className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                      <p className="text-sm text-muted-foreground">No strategies found</p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => setActiveSubTab('create')}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Strategy
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          {/* EXECUTE TAB */}
          <TabsContent value="execute" className="h-full m-0 p-3">
            <div className="h-full flex gap-3">
              {/* Left: Selection & Config */}
              <div className="w-1/2 flex flex-col gap-3">
                {/* Strategy Selection */}
                <Card>
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-xs flex items-center gap-2">
                      <Workflow className="w-3 h-3 text-cyan-400" />
                      Select Strategy
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3">
                    <Select 
                      value={selectedStrategy?.id || ''} 
                      onValueChange={(v) => setSelectedStrategy(strategies.find(s => s.id === v) || null)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Choose a strategy..." />
                      </SelectTrigger>
                      <SelectContent>
                        {strategies.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            <div className="flex items-center gap-2">
                              {s.starred && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
                              <span>{s.name}</span>
                              <Badge variant="outline" className="text-[9px] ml-2">
                                {1 + s.algorithmFiles.length + s.scoringFiles.length + s.policyFiles.length} files
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {selectedStrategy && (
                      <div className="mt-3 p-2 rounded bg-muted/30 border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium">{selectedStrategy.name}</span>
                          {selectedStrategy.tags.length > 0 && (
                            <div className="flex gap-1">
                              {selectedStrategy.tags.slice(0, 2).map(tagId => {
                                const tag = tags.find(t => t.id === tagId);
                                return tag ? (
                                  <Badge key={tagId} className={`text-[9px] h-4 ${tag.color}`}>
                                    {tag.name}
                                  </Badge>
                                ) : null;
                              })}
                            </div>
                          )}
                        </div>
                        {selectedStrategy.description && (
                          <p className="text-[10px] text-muted-foreground">{selectedStrategy.description}</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Data File Selection */}
                <Card>
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-xs flex items-center gap-2">
                      <FileText className="w-3 h-3 text-emerald-400" />
                      Select Data File
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3">
                    <Select value={selectedDataFile} onValueChange={setSelectedDataFile}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Choose data file..." />
                      </SelectTrigger>
                      <SelectContent>
                        {binaryFiles.map(f => (
                          <SelectItem key={f.id} value={f.id}>
                            <div className="flex items-center gap-2">
                              <span>{f.name}</span>
                              <Badge variant="outline" className="text-[9px]">
                                {f.state?.model?.getBits()?.length || 0} bits
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
                
                {/* Execution Options */}
                <Card>
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-xs flex items-center gap-2">
                      <Settings className="w-3 h-3 text-amber-400" />
                      Execution Options
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="w-3 h-3 text-yellow-400" />
                        <Label className="text-xs">Parallel Operations</Label>
                      </div>
                      <Switch checked={enableParallel} onCheckedChange={setEnableParallel} />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Rocket className="w-3 h-3 text-cyan-400" />
                        <Label className="text-xs">Auto-navigate to Timeline</Label>
                      </div>
                      <Switch checked={autoNavigate} onCheckedChange={setAutoNavigate} />
                    </div>
                    
                    <Collapsible open={showAdvancedOptions} onOpenChange={setShowAdvancedOptions}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full h-6 text-xs">
                          {showAdvancedOptions ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
                          Advanced Options
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-3 space-y-3">
                        <div className="space-y-2">
                          <Label className="text-[10px] text-muted-foreground">Max Parallel Workers</Label>
                          <Select defaultValue="4">
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 (Sequential)</SelectItem>
                              <SelectItem value="2">2 Workers</SelectItem>
                              <SelectItem value="4">4 Workers</SelectItem>
                              <SelectItem value="8">8 Workers</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-[10px] text-muted-foreground">Budget Override</Label>
                          <Input type="number" defaultValue="1000" className="h-7 text-xs" />
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-[10px] text-muted-foreground">Step Mode</Label>
                          <Select defaultValue="continuous">
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="continuous">Continuous</SelectItem>
                              <SelectItem value="step">Step-by-Step</SelectItem>
                              <SelectItem value="breakpoint">Breakpoints</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Verify After Each Step</Label>
                          <Switch defaultChecked={false} />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Log Detailed Metrics</Label>
                          <Switch defaultChecked={true} />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Store Full Bit History</Label>
                          <Switch defaultChecked={true} />
                        </div>
                        
                        <Separator />
                        
                        <div className="space-y-2">
                          <Label className="text-[10px] text-muted-foreground">Timeout (seconds)</Label>
                          <Input type="number" defaultValue="300" className="h-7 text-xs" />
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-[10px] text-muted-foreground">Memory Limit (MB)</Label>
                          <Input type="number" defaultValue="512" className="h-7 text-xs" />
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </CardContent>
                </Card>
                
                {/* Run Button */}
                <Button 
                  size="lg" 
                  className="w-full bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500"
                  disabled={!selectedStrategy || !selectedDataFile || isRunning || isExecuting}
                  onClick={handleRunStrategy}
                >
                  {isRunning || isExecuting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Execute Strategy
                    </>
                  )}
                </Button>
              </div>
              
              {/* Right: ETA & Status */}
              <div className="w-1/2 flex flex-col gap-3">
                {/* ETA Card */}
                {selectedStrategy && selectedDataFile && (
                  <Card className="bg-gradient-to-br from-cyan-950/50 to-emerald-950/50">
                    <CardHeader className="py-2 px-3">
                      <CardTitle className="text-xs flex items-center gap-2">
                        <Timer className="w-3 h-3 text-cyan-400" />
                        Estimated Time
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3">
                      {(() => {
                        const eta = estimateETA(selectedStrategy, selectedDataFileSize, enableParallel);
                        return (
                          <>
                            <div className="text-center mb-3">
                              <span className="text-3xl font-bold text-cyan-300">
                                {eta.minutes > 0 ? `${eta.minutes}m ` : ''}{eta.seconds}s
                              </span>
                              <Badge 
                                variant="outline" 
                                className={`ml-2 text-[9px] ${
                                  eta.confidence === 'high' ? 'text-emerald-400 border-emerald-400/50' :
                                  eta.confidence === 'medium' ? 'text-amber-400 border-amber-400/50' :
                                  'text-red-400 border-red-400/50'
                                }`}
                              >
                                {eta.confidence} confidence
                              </Badge>
                            </div>
                            
                            <div className="space-y-1">
                              {eta.breakdown.map((phase, i) => (
                                <div key={i} className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">{phase.phase}</span>
                                  <span>{phase.seconds.toFixed(1)}s</span>
                                </div>
                              ))}
                            </div>
                            
                            {enableParallel && (
                              <p className="text-[10px] text-emerald-400 text-center mt-2">
                                <Zap className="w-3 h-3 inline mr-1" />
                                Parallel mode: ~40% faster
                              </p>
                            )}
                          </>
                        );
                      })()}
                    </CardContent>
                  </Card>
                )}
                
                {/* Execution Progress */}
                {(isRunning || isExecuting) && (
                  <Card className="border-cyan-500/30">
                    <CardHeader className="py-2 px-3">
                      <CardTitle className="text-xs flex items-center gap-2">
                        <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
                        Execution Progress
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3">
                      <Progress value={executionProgress} className="h-2 mb-2" />
                      <p className="text-xs text-center text-muted-foreground">
                        {executionStatus || `${executionProgress}% complete`}
                      </p>
                    </CardContent>
                  </Card>
                )}
                
                {/* Recent Runs */}
                <Card className="flex-1">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-xs flex items-center gap-2">
                      <History className="w-3 h-3 text-amber-400" />
                      Recent Executions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2">
                    <ScrollArea className="h-48">
                      <div className="space-y-2">
                        {executionHistory.slice(0, 10).map(entry => (
                          <div 
                            key={entry.id} 
                            className={`p-2 rounded border text-xs ${
                              entry.success 
                                ? 'bg-emerald-500/10 border-emerald-500/30' 
                                : 'bg-red-500/10 border-red-500/30'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{entry.strategyName}</span>
                              {entry.success ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <XCircle className="w-3 h-3 text-red-400" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                              <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                              <span>•</span>
                              <span>{entry.duration}ms</span>
                              {entry.success && (
                                <>
                                  <span>•</span>
                                  <span>Score: {entry.score.toFixed(1)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                        {executionHistory.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-8">
                            No executions yet
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* CREATE TAB */}
          <TabsContent value="create" className="h-full m-0 p-3">
            <div className="h-full flex gap-3">
              {/* Left: Unified File Browser */}
              <div className="w-1/2 h-full">
                <UnifiedFileBrowser selectable />
              </div>
              
              {/* Right: Strategy Form */}
              <div className="w-1/2 flex flex-col gap-3">
                <Card className="flex-shrink-0">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-xs flex items-center gap-2">
                      <Wrench className="w-3 h-3 text-purple-400" />
                      New Strategy
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Name</Label>
                      <Input
                        value={strategyName}
                        onChange={(e) => setStrategyName(e.target.value)}
                        placeholder="My Strategy"
                        className="h-8 text-sm"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Description (optional)</Label>
                      <Textarea
                        value={strategyDescription}
                        onChange={(e) => setStrategyDescription(e.target.value)}
                        placeholder="What does this strategy do?"
                        className="text-sm resize-none h-16"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Tags</Label>
                      <div className="flex flex-wrap gap-1">
                        {tags.map(tag => (
                          <Badge
                            key={tag.id}
                            className={`cursor-pointer ${tag.color} ${selectedTags.includes(tag.id) ? 'ring-2 ring-white/50' : 'opacity-50'}`}
                            onClick={() => {
                              setSelectedTags(prev => 
                                prev.includes(tag.id) 
                                  ? prev.filter(t => t !== tag.id) 
                                  : [...prev, tag.id]
                              );
                            }}
                          >
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Selected Files Summary */}
                <Card className="flex-1 overflow-hidden">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-xs flex items-center gap-2">
                      <Layers className="w-3 h-3 text-cyan-400" />
                      Selected Files
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 h-[calc(100%-40px)]">
                    <ScrollArea className="h-full">
                      <div className="space-y-3">
                        {/* Scheduler */}
                        <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20">
                          <div className="flex items-center gap-2 text-xs mb-1">
                            <Clock className="w-3 h-3 text-blue-400" />
                            <span className="text-blue-400 font-medium">Scheduler</span>
                            <Badge variant="outline" className="text-[9px] h-4">Required</Badge>
                          </div>
                          {selectedScheduler ? (
                            <div className="flex items-center justify-between ml-5">
                              <span className="text-xs">{selectedScheduler}</span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-5 w-5"
                                onClick={() => setSelectedScheduler('')}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground ml-5">Select from file browser</p>
                          )}
                        </div>
                        
                        {/* Algorithms */}
                        <div className="p-2 rounded bg-cyan-500/10 border border-cyan-500/20">
                          <div className="flex items-center gap-2 text-xs mb-1">
                            <Code className="w-3 h-3 text-cyan-400" />
                            <span className="text-cyan-400 font-medium">Algorithms</span>
                            <Badge variant="outline" className="text-[9px] h-4">{selectedAlgorithms.length}</Badge>
                          </div>
                          {selectedAlgorithms.length > 0 ? (
                            <div className="ml-5 space-y-1">
                              {selectedAlgorithms.map(f => (
                                <div key={f} className="flex items-center justify-between">
                                  <span className="text-xs">{f}</span>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-5 w-5"
                                    onClick={() => setSelectedAlgorithms(prev => prev.filter(x => x !== f))}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground ml-5">Select from file browser</p>
                          )}
                        </div>
                        
                        {/* Scoring */}
                        <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
                          <div className="flex items-center gap-2 text-xs mb-1">
                            <Calculator className="w-3 h-3 text-amber-400" />
                            <span className="text-amber-400 font-medium">Scoring</span>
                            <Badge variant="outline" className="text-[9px] h-4">{selectedScoring.length}</Badge>
                          </div>
                          {selectedScoring.length > 0 ? (
                            <div className="ml-5 space-y-1">
                              {selectedScoring.map(f => (
                                <div key={f} className="flex items-center justify-between">
                                  <span className="text-xs">{f}</span>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-5 w-5"
                                    onClick={() => setSelectedScoring(prev => prev.filter(x => x !== f))}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground ml-5">Optional</p>
                          )}
                        </div>
                        
                        {/* Policies */}
                        <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                          <div className="flex items-center gap-2 text-xs mb-1">
                            <Shield className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400 font-medium">Policies</span>
                            <Badge variant="outline" className="text-[9px] h-4">{selectedPolicies.length}</Badge>
                          </div>
                          {selectedPolicies.length > 0 ? (
                            <div className="ml-5 space-y-1">
                              {selectedPolicies.map(f => (
                                <div key={f} className="flex items-center justify-between">
                                  <span className="text-xs">{f}</span>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-5 w-5"
                                    onClick={() => setSelectedPolicies(prev => prev.filter(x => x !== f))}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground ml-5">Optional</p>
                          )}
                        </div>
                        
                        {/* Custom Files */}
                        <div className="p-2 rounded bg-purple-500/10 border border-purple-500/20">
                          <div className="flex items-center gap-2 text-xs mb-1">
                            <Puzzle className="w-3 h-3 text-purple-400" />
                            <span className="text-purple-400 font-medium">Custom Files</span>
                            <Badge variant="outline" className="text-[9px] h-4">{selectedCustomFiles.length}</Badge>
                          </div>
                          {selectedCustomFiles.length > 0 ? (
                            <div className="ml-5 space-y-1">
                              {selectedCustomFiles.map(f => (
                                <div key={f} className="flex items-center justify-between">
                                  <span className="text-xs">{f}</span>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-5 w-5"
                                    onClick={() => setSelectedCustomFiles(prev => prev.filter(x => x !== f))}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground ml-5">Optional</p>
                          )}
                        </div>
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
                
                {/* Create Button */}
                <Button
                  size="lg"
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
                  onClick={handleCreateStrategy}
                  disabled={!strategyName.trim() || !selectedScheduler}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create Strategy
                </Button>
              </div>
            </div>
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
                      {executionHistory.length > 0 
                        ? (executionHistory.filter(e => e.success).length / executionHistory.length * 100).toFixed(0)
                        : 0}%
                    </span>
                    <p className="text-xs text-amber-400">Success Rate</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-950/50 to-pink-950/50">
                  <CardContent className="p-4 text-center">
                    <Timer className="w-8 h-8 mx-auto text-purple-400 mb-2" />
                    <span className="text-2xl font-bold text-purple-300">
                      {executionHistory.length > 0 
                        ? Math.round(executionHistory.reduce((sum, e) => sum + e.duration, 0) / executionHistory.length)
                        : 0}ms
                    </span>
                    <p className="text-xs text-purple-400">Avg Duration</p>
                  </CardContent>
                </Card>
              </div>
              
              {/* Top Strategies */}
              <Card className="flex-1">
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-xs flex items-center gap-2">
                    <Star className="w-3 h-3 text-yellow-400" />
                    Top Performing Strategies
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {strategies
                        .filter(s => s.runCount > 0)
                        .sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0))
                        .slice(0, 10)
                        .map((strategy, i) => (
                          <div 
                            key={strategy.id} 
                            className="flex items-center gap-3 p-2 rounded bg-muted/30"
                          >
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                              i === 1 ? 'bg-slate-400/20 text-slate-400' :
                              i === 2 ? 'bg-amber-700/20 text-amber-600' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {i + 1}
                            </span>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{strategy.name}</p>
                              <p className="text-xs text-muted-foreground">{strategy.runCount} runs</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-cyan-400">
                                {strategy.avgScore?.toFixed(1) || 0}
                              </p>
                              <p className="text-[10px] text-muted-foreground">avg score</p>
                            </div>
                          </div>
                        ))}
                      {strategies.filter(s => s.runCount > 0).length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          Run some strategies to see analytics
                        </p>
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
                      <CardDescription className="text-xs">
                        {template.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="flex flex-wrap gap-1 mb-3">
                        {template.tags?.map(tagId => (
                          <Badge key={tagId} variant="secondary" className="text-[9px]">
                            {tagId}
                          </Badge>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>• {template.schedulerFile}</p>
                        <p>• {template.algorithmFiles?.length || 0} algorithms</p>
                        <p>• {template.scoringFiles?.length || 0} scoring</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-3"
                        onClick={() => handleApplyTemplate(template)}
                      >
                        <Download className="w-3 h-3 mr-2" />
                        Use Template
                      </Button>
                    </CardContent>
                  </Card>
                ))}
                
                {/* Create Custom Template */}
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
              {/* Strategy selector */}
              <div className="w-1/3 flex flex-col gap-3">
                <Card>
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-xs flex items-center gap-2">
                      <Package className="w-3 h-3 text-indigo-400" />
                      Select Strategy
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3">
                    <Select 
                      value={selectedVersionStrategy || ''} 
                      onValueChange={setSelectedVersionStrategy}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Choose a strategy..." />
                      </SelectTrigger>
                      <SelectContent>
                        {strategies.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            <div className="flex items-center gap-2">
                              <span>{s.name}</span>
                              {s.version && (
                                <Badge variant="outline" className="text-[9px]">v{s.version}</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
                
                {selectedVersionStrategy && (
                  <Card className="flex-1">
                    <CardHeader className="py-2 px-3">
                      <CardTitle className="text-xs flex items-center gap-2">
                        <Zap className="w-3 h-3 text-yellow-400" />
                        Breakpoints
                        <Badge variant="outline" className="text-[9px] h-4">
                          {getStrategyBreakpoints(selectedVersionStrategy).length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 space-y-2">
                      <ScrollArea className="h-40">
                        {getStrategyBreakpoints(selectedVersionStrategy).map(bp => (
                          <div key={bp.id} className="flex items-center gap-2 p-2 rounded bg-muted/30 mb-2">
                            <Switch 
                              checked={bp.enabled} 
                              onCheckedChange={() => handleToggleBreakpoint(bp.id)} 
                              className="scale-75"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-mono truncate">{bp.operation}</p>
                              {bp.condition && (
                                <p className="text-[10px] text-muted-foreground">if: {bp.condition}</p>
                              )}
                              {bp.stepIndex !== undefined && (
                                <p className="text-[10px] text-muted-foreground">Step: {bp.stepIndex}</p>
                              )}
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-destructive"
                              onClick={() => handleDeleteBreakpoint(bp.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                        {getStrategyBreakpoints(selectedVersionStrategy).length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-4">No breakpoints</p>
                        )}
                      </ScrollArea>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-7 text-xs"
                        onClick={() => {
                          setSelectedStrategy(strategies.find(s => s.id === selectedVersionStrategy) || null);
                          setShowBreakpointDialog(true);
                        }}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Breakpoint
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
              
              {/* Version History */}
              <Card className="flex-1">
                <CardHeader className="py-2 px-3 flex-row items-center justify-between">
                  <CardTitle className="text-xs flex items-center gap-2">
                    <History className="w-3 h-3 text-indigo-400" />
                    Version History
                  </CardTitle>
                  {selectedVersionStrategy && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs"
                      onClick={() => setShowVersionDialog(true)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Save Version
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
                                  <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30">
                                    v{version.version}
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground">
                                    {new Date(version.timestamp).toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={() => handleRestoreVersion(version)}
                                  >
                                    <RefreshCw className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 text-destructive"
                                    onClick={() => handleDeleteVersion(version.id)}
                                  >
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
                            <p className="text-xs text-muted-foreground mt-1">
                              Save a version to track changes
                            </p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-12">
                      <Package className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                      <p className="text-sm text-muted-foreground">Select a strategy</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Choose a strategy to view its version history
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </div>
      </Tabs>
      
      {/* Tag Creation Dialog */}
      <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Create Tag</DialogTitle>
            <DialogDescription className="text-xs">
              Add a new tag to organize your strategies
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs">Tag Name</Label>
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="e.g. Production"
                className="h-8"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Color</Label>
              <div className="flex flex-wrap gap-1">
                {TAG_COLORS.map(color => (
                  <button
                    key={color}
                    className={`w-6 h-6 rounded border-2 ${color} ${newTagColor === color ? 'ring-2 ring-white/50' : ''}`}
                    onClick={() => setNewTagColor(color)}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs">Preview:</span>
              <Badge className={newTagColor}>{newTagName || 'Tag'}</Badge>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTagDialog(false)}>Cancel</Button>
            <Button onClick={handleAddTag}>Create Tag</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Version Save Dialog */}
      <Dialog open={showVersionDialog} onOpenChange={setShowVersionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-indigo-400" />
              Save Version
            </DialogTitle>
            <DialogDescription className="text-xs">
              Save the current state of this strategy as a version
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs">Version Message</Label>
              <Textarea
                value={versionMessage}
                onChange={(e) => setVersionMessage(e.target.value)}
                placeholder="Describe what changed in this version..."
                className="min-h-[80px]"
              />
            </div>
            {selectedVersionStrategy && (
              <div className="p-3 rounded bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">Saving version for:</p>
                <p className="text-sm font-medium">
                  {strategies.find(s => s.id === selectedVersionStrategy)?.name}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVersionDialog(false)}>Cancel</Button>
            <Button 
              onClick={() => {
                const strategy = strategies.find(s => s.id === selectedVersionStrategy);
                if (strategy) handleSaveVersion(strategy);
              }}
              disabled={!versionMessage.trim()}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Breakpoint Dialog */}
      <Dialog open={showBreakpointDialog} onOpenChange={setShowBreakpointDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              Add Breakpoint
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pause execution when this operation is reached
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs">Operation Name</Label>
              <Input
                value={newBreakpointOp}
                onChange={(e) => setNewBreakpointOp(e.target.value)}
                placeholder="e.g. XOR, ROTATE_LEFT, SWAP"
                className="h-8 font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Step Index (Optional)</Label>
              <Input
                type="number"
                value={newBreakpointStep || ''}
                onChange={(e) => setNewBreakpointStep(e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="Leave empty for all occurrences"
                className="h-8"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Condition (Optional)</Label>
              <Input
                value={newBreakpointCondition}
                onChange={(e) => setNewBreakpointCondition(e.target.value)}
                placeholder="e.g. entropy < 0.5"
                className="h-8 font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Break only when this condition is true
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBreakpointDialog(false)}>Cancel</Button>
            <Button onClick={handleAddBreakpoint} disabled={!newBreakpointOp.trim()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Breakpoint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
