/**
 * Strategy Tab V6 - Sub-tabbed interface with View, Execute, and Create zones
 * Features: File counts, search, ETA estimation, parallel operations support
 */

import { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
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
  Plus,
  Play,
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

const STRATEGY_STORAGE_KEY = 'bsee_saved_strategies_v6';

type StrategySubTab = 'view' | 'execute' | 'create';

interface StrategyTabV6Props {
  onRunStrategy?: (strategy: StrategyConfig) => void;
  isExecuting?: boolean;
  onNavigateToTimeline?: () => void;
}

// ETA estimation based on file complexity and historical data
const estimateETA = (strategy: StrategyConfig, dataFileSize: number): { minutes: number; seconds: number; confidence: string } => {
  const fileCount = strategy.algorithmFiles.length + strategy.scoringFiles.length + strategy.policyFiles.length + 1;
  const baseTime = 0.5; // 500ms per file base
  const sizeMultiplier = Math.log2(dataFileSize + 1) * 0.1;
  const totalSeconds = fileCount * baseTime * (1 + sizeMultiplier);
  
  return {
    minutes: Math.floor(totalSeconds / 60),
    seconds: Math.round(totalSeconds % 60),
    confidence: fileCount > 5 ? 'medium' : 'high'
  };
};

export const StrategyTabV6 = ({ onRunStrategy, isExecuting = false, onNavigateToTimeline }: StrategyTabV6Props) => {
  const [activeSubTab, setActiveSubTab] = useState<StrategySubTab>('view');
  const [strategies, setStrategies] = useState<StrategyConfig[]>([]);
  const [files, setFiles] = useState<PythonFile[]>([]);
  const [binaryFiles, setBinaryFiles] = useState<BinaryFile[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyConfig | null>(null);
  const [selectedDataFile, setSelectedDataFile] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<string>('');
  const [executionProgress, setExecutionProgress] = useState(0);

  // Search states for each file type
  const [strategySearch, setStrategySearch] = useState('');
  const [schedulerSearch, setSchedulerSearch] = useState('');
  const [algorithmSearch, setAlgorithmSearch] = useState('');
  const [scoringSearch, setScoringSearch] = useState('');
  const [policySearch, setPolicySearch] = useState('');

  // Create form state
  const [strategyName, setStrategyName] = useState('');
  const [strategyDescription, setStrategyDescription] = useState('');
  const [selectedScheduler, setSelectedScheduler] = useState('');
  const [selectedAlgorithms, setSelectedAlgorithms] = useState<string[]>([]);
  const [selectedScoring, setSelectedScoring] = useState<string[]>([]);
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);
  const [enableParallel, setEnableParallel] = useState(false);

  // Expanded states
  const [expandedStrategy, setExpandedStrategy] = useState<string | null>(null);

  // Load saved strategies
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STRATEGY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        parsed.forEach((s: StrategyConfig) => {
          if (!pythonModuleSystem.getAllStrategies().find(existing => existing.id === s.id)) {
            try {
              pythonModuleSystem.createStrategy(s.name, s.schedulerFile, s.algorithmFiles, s.scoringFiles, s.policyFiles);
            } catch (e) {
              // Strategy might already exist
            }
          }
        });
      }
    } catch (e) {
      console.error('Failed to load saved strategies:', e);
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
    setStrategies(pythonModuleSystem.getAllStrategies());
    setFiles(pythonModuleSystem.getAllFiles());
    setBinaryFiles(fileSystemManager.getFiles());
    
    const activeFile = fileSystemManager.getActiveFile();
    if (activeFile) setSelectedDataFile(activeFile.id);
    
    const unsub1 = pythonModuleSystem.subscribe(() => {
      setStrategies(pythonModuleSystem.getAllStrategies());
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
        if (onNavigateToTimeline) {
          onNavigateToTimeline();
        }
      } else if (status === 'failed') {
        toast.error(`Failed: ${result?.error || 'Unknown error'}`);
      } else if (status.includes('running')) {
        // Update progress based on status
        const match = status.match(/(\d+)/);
        if (match) {
          setExecutionProgress(parseInt(match[1], 10));
        }
      }
    });

    return () => { unsub1(); unsub2(); unsub3(); };
  }, [onNavigateToTimeline]);

  // Save strategies
  useEffect(() => {
    if (strategies.length > 0) {
      localStorage.setItem(STRATEGY_STORAGE_KEY, JSON.stringify(strategies));
    }
  }, [strategies]);

  // Memoized file lists with search filtering
  const schedulerFiles = useMemo(() => 
    files.filter(f => f.group === 'scheduler' && f.name.toLowerCase().includes(schedulerSearch.toLowerCase())),
    [files, schedulerSearch]
  );
  const algorithmFiles = useMemo(() => 
    files.filter(f => f.group === 'algorithm' && f.name.toLowerCase().includes(algorithmSearch.toLowerCase())),
    [files, algorithmSearch]
  );
  const scoringFiles = useMemo(() => 
    files.filter(f => f.group === 'scoring' && f.name.toLowerCase().includes(scoringSearch.toLowerCase())),
    [files, scoringSearch]
  );
  const policyFiles = useMemo(() => 
    files.filter(f => f.group === 'policies' && f.name.toLowerCase().includes(policySearch.toLowerCase())),
    [files, policySearch]
  );

  const filteredStrategies = useMemo(() => 
    strategies.filter(s => s.name.toLowerCase().includes(strategySearch.toLowerCase())),
    [strategies, strategySearch]
  );

  // File counts
  const fileCounts = useMemo(() => ({
    scheduler: files.filter(f => f.group === 'scheduler').length,
    algorithm: files.filter(f => f.group === 'algorithm').length,
    scoring: files.filter(f => f.group === 'scoring').length,
    policy: files.filter(f => f.group === 'policies').length,
  }), [files]);

  // Get data file size for ETA calculation
  const selectedDataFileSize = useMemo(() => {
    if (!selectedDataFile) return 0;
    const file = binaryFiles.find(f => f.id === selectedDataFile);
    return file?.state?.model?.getBits()?.length || 0;
  }, [selectedDataFile, binaryFiles]);

  const toggleFile = (fileName: string, list: string[], setter: (val: string[]) => void) => {
    if (list.includes(fileName)) {
      setter(list.filter(f => f !== fileName));
    } else {
      setter([...list, fileName]);
    }
  };

  const handleCreateStrategy = () => {
    if (!strategyName.trim()) {
      toast.error('Enter a strategy name');
      return;
    }
    if (!selectedScheduler) {
      toast.error('Select a scheduler file');
      return;
    }

    try {
      const strategy = pythonModuleSystem.createStrategy(
        strategyName,
        selectedScheduler,
        selectedAlgorithms,
        selectedScoring,
        selectedPolicies
      );
      toast.success(`Strategy "${strategyName}" created`);
      
      // Reset form
      setStrategyName('');
      setStrategyDescription('');
      setSelectedScheduler('');
      setSelectedAlgorithms([]);
      setSelectedScoring([]);
      setSelectedPolicies([]);
      setSelectedStrategy(strategy);
      setActiveSubTab('view');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleDeleteStrategy = (id: string) => {
    pythonModuleSystem.deleteStrategy(id);
    if (selectedStrategy?.id === id) {
      setSelectedStrategy(null);
    }
    toast.success('Strategy deleted');
  };

  const handleRunStrategy = async () => {
    if (!selectedStrategy || !selectedDataFile) return;

    const validation = pythonModuleSystem.validateStrategy(selectedStrategy.id);
    if (!validation.valid) {
      toast.error(validation.errors.join(', '));
      return;
    }

    setIsRunning(true);
    setExecutionProgress(0);
    try {
      const result = await strategyExecutionEngine.executeStrategy(
        selectedStrategy,
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

  const getValidationStatus = (strategy: StrategyConfig) => {
    return pythonModuleSystem.validateStrategy(strategy.id);
  };

  // File picker component with search
  const FilePicker = ({ 
    title, 
    files: fileList, 
    selected, 
    onToggle, 
    search, 
    onSearchChange,
    icon: Icon,
    color,
    multi = true
  }: {
    title: string;
    files: PythonFile[];
    selected: string | string[];
    onToggle: (name: string) => void;
    search: string;
    onSearchChange: (val: string) => void;
    icon: any;
    color: string;
    multi?: boolean;
  }) => (
    <Card className={`border-${color}-500/30`}>
      <CardHeader className="py-2 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs flex items-center gap-2">
            <Icon className={`w-3 h-3 text-${color}-400`} />
            {title}
            <Badge variant="outline" className="text-[10px] h-4">{fileList.length}</Badge>
          </CardTitle>
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            className="pl-7 h-7 text-xs"
          />
        </div>
      </CardHeader>
      <CardContent className="p-2">
        <ScrollArea className="h-32">
          <div className="space-y-1">
            {fileList.map(file => {
              const isSelected = multi 
                ? (selected as string[]).includes(file.name)
                : selected === file.name;
              return (
                <div
                  key={file.id}
                  className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                    isSelected ? `bg-${color}-500/20 border border-${color}-400/50` : 'hover:bg-muted/30'
                  }`}
                  onClick={() => onToggle(file.name)}
                >
                  {multi ? (
                    <Checkbox checked={isSelected} className="h-3 w-3" />
                  ) : (
                    <div className={`w-2 h-2 rounded-full ${isSelected ? `bg-${color}-400` : 'bg-muted'}`} />
                  )}
                  <FileCode className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs truncate flex-1">{file.name}</span>
                  <Badge variant="secondary" className="text-[9px] h-4">
                    {file.content.split('\n').length}L
                  </Badge>
                </div>
              );
            })}
            {fileList.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No files found</p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-cyan-950/30 via-background to-emerald-950/30">
      {/* Sub-tab Navigation */}
      <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as StrategySubTab)} className="h-full flex flex-col">
        <div className="border-b border-cyan-500/30 bg-cyan-950/20 px-2">
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
              <Wrench className="w-3 h-3" />
              Create
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          {/* VIEW SUB-TAB */}
          <TabsContent value="view" className="h-full m-0 p-3">
            <div className="h-full flex gap-3">
              {/* Strategy List */}
              <div className="w-1/2 flex flex-col gap-3">
                {/* File Counts Summary */}
                <Card className="flex-shrink-0">
                  <CardContent className="p-3">
                    <div className="grid grid-cols-4 gap-2">
                      <div className="text-center p-2 rounded bg-blue-500/10 border border-blue-500/30">
                        <Clock className="w-4 h-4 mx-auto text-blue-400 mb-1" />
                        <span className="text-lg font-bold text-blue-300">{fileCounts.scheduler}</span>
                        <p className="text-[10px] text-blue-400">Schedulers</p>
                      </div>
                      <div className="text-center p-2 rounded bg-cyan-500/10 border border-cyan-500/30">
                        <Code className="w-4 h-4 mx-auto text-cyan-400 mb-1" />
                        <span className="text-lg font-bold text-cyan-300">{fileCounts.algorithm}</span>
                        <p className="text-[10px] text-cyan-400">Algorithms</p>
                      </div>
                      <div className="text-center p-2 rounded bg-amber-500/10 border border-amber-500/30">
                        <Calculator className="w-4 h-4 mx-auto text-amber-400 mb-1" />
                        <span className="text-lg font-bold text-amber-300">{fileCounts.scoring}</span>
                        <p className="text-[10px] text-amber-400">Scoring</p>
                      </div>
                      <div className="text-center p-2 rounded bg-emerald-500/10 border border-emerald-500/30">
                        <Shield className="w-4 h-4 mx-auto text-emerald-400 mb-1" />
                        <span className="text-lg font-bold text-emerald-300">{fileCounts.policy}</span>
                        <p className="text-[10px] text-emerald-400">Policies</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Strategy Search */}
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400/60" />
                  <Input
                    value={strategySearch}
                    onChange={(e) => setStrategySearch(e.target.value)}
                    placeholder="Search strategies..."
                    className="pl-8 h-8 text-sm bg-background/50 border-cyan-400/30"
                  />
                </div>

                {/* Strategy Cards */}
                <ScrollArea className="flex-1">
                  <div className="space-y-2">
                    {filteredStrategies.map(strategy => {
                      const validation = getValidationStatus(strategy);
                      const isExpanded = expandedStrategy === strategy.id;
                      const isSelected = selectedStrategy?.id === strategy.id;
                      
                      return (
                        <Card 
                          key={strategy.id}
                          className={`cursor-pointer transition-all ${
                            isSelected ? 'ring-2 ring-cyan-400 bg-cyan-500/10' : 'hover:bg-muted/30'
                          }`}
                          onClick={() => setSelectedStrategy(strategy)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Layers className="w-4 h-4 text-cyan-400" />
                                <span className="font-medium text-sm">{strategy.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {validation.valid ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-400" />
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedStrategy(isExpanded ? null : strategy.id);
                                  }}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </div>

                            {/* File Counts */}
                            <div className="flex gap-1 mt-2">
                              <Badge variant="outline" className="text-[10px] h-5">
                                <Clock className="w-2.5 h-2.5 mr-0.5" />
                                1
                              </Badge>
                              <Badge variant="outline" className="text-[10px] h-5">
                                <Code className="w-2.5 h-2.5 mr-0.5" />
                                {strategy.algorithmFiles.length}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] h-5">
                                <Calculator className="w-2.5 h-2.5 mr-0.5" />
                                {strategy.scoringFiles.length}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] h-5">
                                <Shield className="w-2.5 h-2.5 mr-0.5" />
                                {strategy.policyFiles.length}
                              </Badge>
                            </div>

                            {/* Expanded Details */}
                            {isExpanded && (
                              <div className="mt-3 pt-3 border-t border-cyan-500/20 space-y-2">
                                <div>
                                  <p className="text-[10px] text-muted-foreground uppercase mb-1">Scheduler</p>
                                  <Badge variant="secondary" className="text-xs">{strategy.schedulerFile}</Badge>
                                </div>
                                <div>
                                  <p className="text-[10px] text-muted-foreground uppercase mb-1">Algorithms</p>
                                  <div className="flex flex-wrap gap-1">
                                    {strategy.algorithmFiles.map(f => (
                                      <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-[10px] text-muted-foreground uppercase mb-1">Scoring</p>
                                  <div className="flex flex-wrap gap-1">
                                    {strategy.scoringFiles.map(f => (
                                      <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>
                                    ))}
                                  </div>
                                </div>
                                {strategy.policyFiles.length > 0 && (
                                  <div>
                                    <p className="text-[10px] text-muted-foreground uppercase mb-1">Policies</p>
                                    <div className="flex flex-wrap gap-1">
                                      {strategy.policyFiles.map(f => (
                                        <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="h-6 text-xs w-full mt-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteStrategy(strategy.id);
                                  }}
                                >
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  Delete
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                    {filteredStrategies.length === 0 && (
                      <Card>
                        <CardContent className="p-6 text-center">
                          <Layers className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">No strategies found</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={() => setActiveSubTab('create')}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Create One
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Selected Strategy Details */}
              <div className="w-1/2">
                {selectedStrategy ? (
                  <Card className="h-full">
                    <CardHeader className="py-3 px-4 border-b">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Layers className="w-4 h-4 text-cyan-400" />
                          {selectedStrategy.name}
                        </CardTitle>
                        <Button
                          size="sm"
                          className="h-7 bg-emerald-500 hover:bg-emerald-600"
                          onClick={() => {
                            setActiveSubTab('execute');
                          }}
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Execute
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <ScrollArea className="h-[calc(100%-1rem)]">
                        <div className="space-y-4">
                          {/* Pipeline Visualization */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-medium text-muted-foreground uppercase">Pipeline</h4>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className="bg-blue-500/20 text-blue-300 border border-blue-400/50">
                                <Clock className="w-3 h-3 mr-1" />
                                {selectedStrategy.schedulerFile}
                              </Badge>
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              {selectedStrategy.algorithmFiles.map((f, i) => (
                                <div key={f} className="flex items-center gap-2">
                                  <Badge className="bg-cyan-500/20 text-cyan-300 border border-cyan-400/50">
                                    <Code className="w-3 h-3 mr-1" />
                                    {f}
                                  </Badge>
                                  {i < selectedStrategy.algorithmFiles.length - 1 && (
                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                  )}
                                </div>
                              ))}
                              {selectedStrategy.scoringFiles.length > 0 && (
                                <>
                                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                  {selectedStrategy.scoringFiles.map(f => (
                                    <Badge key={f} className="bg-amber-500/20 text-amber-300 border border-amber-400/50">
                                      <Calculator className="w-3 h-3 mr-1" />
                                      {f}
                                    </Badge>
                                  ))}
                                </>
                              )}
                              {selectedStrategy.policyFiles.length > 0 && (
                                <>
                                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                  {selectedStrategy.policyFiles.map(f => (
                                    <Badge key={f} className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/50">
                                      <Shield className="w-3 h-3 mr-1" />
                                      {f}
                                    </Badge>
                                  ))}
                                </>
                              )}
                            </div>
                          </div>

                          {/* Statistics */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded bg-muted/30 border">
                              <p className="text-[10px] text-muted-foreground uppercase">Total Files</p>
                              <p className="text-lg font-bold">
                                {1 + selectedStrategy.algorithmFiles.length + selectedStrategy.scoringFiles.length + selectedStrategy.policyFiles.length}
                              </p>
                            </div>
                            <div className="p-3 rounded bg-muted/30 border">
                              <p className="text-[10px] text-muted-foreground uppercase">Status</p>
                              {getValidationStatus(selectedStrategy).valid ? (
                                <p className="text-lg font-bold text-emerald-400">Ready</p>
                              ) : (
                                <p className="text-lg font-bold text-red-400">Invalid</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="h-full flex items-center justify-center">
                    <CardContent className="text-center">
                      <Info className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Select a strategy to view details</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* EXECUTE SUB-TAB */}
          <TabsContent value="execute" className="h-full m-0 p-3">
            <div className="h-full flex flex-col gap-4">
              {/* Selection Panel */}
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Rocket className="w-4 h-4 text-emerald-400" />
                    Execution Setup
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Strategy Selection */}
                    <div>
                      <Label className="text-xs">Strategy</Label>
                      <Select 
                        value={selectedStrategy?.id || ''} 
                        onValueChange={(id) => setSelectedStrategy(strategies.find(s => s.id === id) || null)}
                      >
                        <SelectTrigger className="h-9 mt-1">
                          <SelectValue placeholder="Select strategy" />
                        </SelectTrigger>
                        <SelectContent>
                          {strategies.map(s => (
                            <SelectItem key={s.id} value={s.id}>
                              <div className="flex items-center gap-2">
                                <Layers className="w-3 h-3" />
                                {s.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Data File Selection */}
                    <div>
                      <Label className="text-xs">Data File</Label>
                      <Select value={selectedDataFile} onValueChange={setSelectedDataFile}>
                        <SelectTrigger className="h-9 mt-1">
                          <SelectValue placeholder="Select data file" />
                        </SelectTrigger>
                        <SelectContent>
                          {binaryFiles.map(file => (
                            <SelectItem key={file.id} value={file.id}>
                              <div className="flex items-center gap-2">
                                <FileCode className="w-3 h-3" />
                                {file.name}
                                <Badge variant="secondary" className="text-[9px]">
                                  {file.state?.model?.getBits()?.length || 0} bits
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Parallel Execution Toggle */}
                  <div className="flex items-center gap-2 mt-4 p-3 rounded bg-muted/30 border">
                    <Checkbox 
                      id="parallel"
                      checked={enableParallel} 
                      onCheckedChange={(v) => setEnableParallel(!!v)}
                    />
                    <Label htmlFor="parallel" className="text-xs cursor-pointer">
                      Enable parallel operations (non-overlapping ranges execute concurrently)
                    </Label>
                    <Cpu className="w-4 h-4 text-cyan-400 ml-auto" />
                  </div>
                </CardContent>
              </Card>

              {/* ETA & Run Panel */}
              {selectedStrategy && selectedDataFile && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium">Estimated Time</h4>
                        {(() => {
                          const eta = estimateETA(selectedStrategy, selectedDataFileSize);
                          return (
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <Timer className="w-4 h-4 text-cyan-400" />
                                <span className="text-2xl font-bold">
                                  {eta.minutes > 0 ? `${eta.minutes}m ` : ''}{eta.seconds}s
                                </span>
                              </div>
                              <Badge variant="outline" className="text-[10px]">
                                {eta.confidence} confidence
                              </Badge>
                            </div>
                          );
                        })()}
                      </div>

                      <Button
                        size="lg"
                        className="h-12 px-8 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
                        onClick={handleRunStrategy}
                        disabled={isRunning || isExecuting}
                      >
                        {isRunning || isExecuting ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Running...
                          </>
                        ) : (
                          <>
                            <Play className="w-5 h-5 mr-2" />
                            Run Strategy
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Execution Progress */}
                    {(isRunning || isExecuting) && (
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="text-cyan-400">{executionStatus}</span>
                        </div>
                        <Progress value={executionProgress} className="h-2" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Strategy Preview */}
              {selectedStrategy && (
                <Card className="flex-1">
                  <CardHeader className="py-2 px-4 border-b">
                    <CardTitle className="text-xs">Pipeline Preview</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="p-3 rounded bg-blue-500/10 border border-blue-500/30">
                        <Clock className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                        <p className="text-[10px] text-center text-blue-300">{selectedStrategy.schedulerFile}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      {selectedStrategy.algorithmFiles.map((f, i) => (
                        <div key={f} className="flex items-center gap-3">
                          <div className="p-3 rounded bg-cyan-500/10 border border-cyan-500/30">
                            <Code className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
                            <p className="text-[10px] text-center text-cyan-300">{f}</p>
                          </div>
                          {i < selectedStrategy.algorithmFiles.length - 1 && (
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                      ))}
                      {selectedStrategy.scoringFiles.length > 0 && (
                        <>
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          {selectedStrategy.scoringFiles.map(f => (
                            <div key={f} className="p-3 rounded bg-amber-500/10 border border-amber-500/30">
                              <Calculator className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                              <p className="text-[10px] text-center text-amber-300">{f}</p>
                            </div>
                          ))}
                        </>
                      )}
                      {selectedStrategy.policyFiles.length > 0 && (
                        <>
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          {selectedStrategy.policyFiles.map(f => (
                            <div key={f} className="p-3 rounded bg-emerald-500/10 border border-emerald-500/30">
                              <Shield className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                              <p className="text-[10px] text-center text-emerald-300">{f}</p>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* CREATE SUB-TAB */}
          <TabsContent value="create" className="h-full m-0 p-3">
            <div className="h-full flex flex-col gap-3">
              {/* Strategy Name */}
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Strategy Name</Label>
                      <Input
                        value={strategyName}
                        onChange={(e) => setStrategyName(e.target.value)}
                        placeholder="My Strategy"
                        className="h-9 mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Description (optional)</Label>
                      <Input
                        value={strategyDescription}
                        onChange={(e) => setStrategyDescription(e.target.value)}
                        placeholder="Brief description..."
                        className="h-9 mt-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* File Pickers */}
              <div className="flex-1 grid grid-cols-2 gap-3 overflow-hidden">
                <div className="space-y-3 overflow-auto">
                  {/* Scheduler Picker */}
                  <FilePicker
                    title="Scheduler (Required)"
                    files={schedulerFiles}
                    selected={selectedScheduler}
                    onToggle={(name) => setSelectedScheduler(name === selectedScheduler ? '' : name)}
                    search={schedulerSearch}
                    onSearchChange={setSchedulerSearch}
                    icon={Clock}
                    color="blue"
                    multi={false}
                  />

                  {/* Algorithm Picker */}
                  <FilePicker
                    title="Algorithms"
                    files={algorithmFiles}
                    selected={selectedAlgorithms}
                    onToggle={(name) => toggleFile(name, selectedAlgorithms, setSelectedAlgorithms)}
                    search={algorithmSearch}
                    onSearchChange={setAlgorithmSearch}
                    icon={Code}
                    color="cyan"
                  />
                </div>

                <div className="space-y-3 overflow-auto">
                  {/* Scoring Picker */}
                  <FilePicker
                    title="Scoring"
                    files={scoringFiles}
                    selected={selectedScoring}
                    onToggle={(name) => toggleFile(name, selectedScoring, setSelectedScoring)}
                    search={scoringSearch}
                    onSearchChange={setScoringSearch}
                    icon={Calculator}
                    color="amber"
                  />

                  {/* Policy Picker */}
                  <FilePicker
                    title="Policies"
                    files={policyFiles}
                    selected={selectedPolicies}
                    onToggle={(name) => toggleFile(name, selectedPolicies, setSelectedPolicies)}
                    search={policySearch}
                    onSearchChange={setPolicySearch}
                    icon={Shield}
                    color="emerald"
                  />
                </div>
              </div>

              {/* Create Button */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Selected Files</p>
                        <p className="text-sm font-medium">
                          {selectedScheduler ? 1 : 0} scheduler, {selectedAlgorithms.length} algorithms, {selectedScoring.length} scoring, {selectedPolicies.length} policies
                        </p>
                      </div>
                      {!selectedScheduler && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Scheduler required
                        </Badge>
                      )}
                    </div>

                    <Button
                      size="lg"
                      className="h-10 px-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                      onClick={handleCreateStrategy}
                      disabled={!strategyName.trim() || !selectedScheduler}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Create Strategy
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};
