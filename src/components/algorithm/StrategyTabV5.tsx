/**
 * Strategy Tab V5 - Gamified Strategy Command Center
 * Zones: Discovery, Workshop, Arena, Compare, Runs
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  ChevronRight,
  ChevronDown,
  Star,
  Compass,
  Wrench,
  Swords,
  GitCompare,
  History,
  Tag,
  Award,
  Target,
  Sparkles,
  Copy,
  Edit3,
  Eye,
  TrendingUp,
  BarChart3,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { pythonModuleSystem, PythonFile, StrategyConfig } from '@/lib/pythonModuleSystem';
import { fileSystemManager, BinaryFile } from '@/lib/fileSystemManager';
import { strategyExecutionEngine } from '@/lib/strategyExecutionEngine';
import { resultsManager, ExecutionResultV2 } from '@/lib/resultsManager';
import { StrategyCreationWizard } from './StrategyCreationWizard';
import { StrategyComparer } from './StrategyComparer';
import { 
  UNIFIED_SCHEDULER_V2, 
  UNIFIED_ALGORITHM_V2, 
  UNIFIED_SCORING_V2,
  UNIFIED_POLICY_V2,
} from '@/lib/unifiedStrategy';

const STRATEGY_STORAGE_KEY = 'bsee_saved_strategies';
const STRATEGY_LABELS_KEY = 'bsee_strategy_labels';
const STRATEGY_RATINGS_KEY = 'bsee_strategy_ratings';

interface StrategyLabel {
  strategyId: string;
  labels: string[];
  color: string;
  icon: string;
  rating: number;
  lastRunScore?: number;
  runCount: number;
}

interface StrategyTabV5Props {
  onRunStrategy?: (strategy: StrategyConfig) => void;
  isExecuting?: boolean;
  onNavigateToTimeline?: () => void;
}

export const StrategyTabV5 = ({ onRunStrategy, isExecuting = false, onNavigateToTimeline }: StrategyTabV5Props) => {
  const [activeZone, setActiveZone] = useState<'discovery' | 'workshop' | 'arena' | 'compare' | 'runs'>('discovery');
  const [strategies, setStrategies] = useState<StrategyConfig[]>([]);
  const [strategyLabels, setStrategyLabels] = useState<Map<string, StrategyLabel>>(new Map());
  const [files, setFiles] = useState<PythonFile[]>([]);
  const [binaryFiles, setBinaryFiles] = useState<BinaryFile[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyConfig | null>(null);
  const [selectedDataFile, setSelectedDataFile] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLabel, setFilterLabel] = useState<string>('');
  const [showWizard, setShowWizard] = useState(false);
  const [results, setResults] = useState<ExecutionResultV2[]>([]);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Load labels from storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STRATEGY_LABELS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const map = new Map<string, StrategyLabel>();
        parsed.forEach((l: StrategyLabel) => map.set(l.strategyId, l));
        setStrategyLabels(map);
      }
    } catch (e) {
      console.error('Failed to load strategy labels:', e);
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

  useEffect(() => {
    setStrategies(pythonModuleSystem.getAllStrategies());
    setFiles(pythonModuleSystem.getAllFiles());
    setBinaryFiles(fileSystemManager.getFiles());
    setResults(resultsManager.getAllResults());
    
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
        toast.success('Strategy completed!');
        // Update strategy stats
        if (result.strategyId) {
          updateStrategyStats(result.strategyId, result.totalScore);
        }
        if (onNavigateToTimeline) {
          onNavigateToTimeline();
        }
      } else if (status === 'failed') {
        toast.error(`Failed: ${result?.error || 'Unknown error'}`);
      }
    });
    const unsub4 = resultsManager.subscribe(() => {
      setResults(resultsManager.getAllResults());
    });

    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, [onNavigateToTimeline]);

  // Save labels to storage
  const saveLabels = (labels: Map<string, StrategyLabel>) => {
    setStrategyLabels(labels);
    localStorage.setItem(STRATEGY_LABELS_KEY, JSON.stringify(Array.from(labels.values())));
  };

  const updateStrategyStats = (strategyId: string, score: number) => {
    const newLabels = new Map(strategyLabels);
    const existing = newLabels.get(strategyId) || {
      strategyId,
      labels: [],
      color: 'cyan',
      icon: 'zap',
      rating: 0,
      runCount: 0,
    };
    existing.lastRunScore = score;
    existing.runCount++;
    newLabels.set(strategyId, existing);
    saveLabels(newLabels);
  };

  const addLabelToStrategy = (strategyId: string, label: string) => {
    const newLabels = new Map(strategyLabels);
    const existing = newLabels.get(strategyId) || {
      strategyId,
      labels: [],
      color: 'cyan',
      icon: 'zap',
      rating: 0,
      runCount: 0,
    };
    if (!existing.labels.includes(label)) {
      existing.labels.push(label);
    }
    newLabels.set(strategyId, existing);
    saveLabels(newLabels);
    toast.success(`Label "${label}" added`);
  };

  const setStrategyRating = (strategyId: string, rating: number) => {
    const newLabels = new Map(strategyLabels);
    const existing = newLabels.get(strategyId) || {
      strategyId,
      labels: [],
      color: 'cyan',
      icon: 'zap',
      rating: 0,
      runCount: 0,
    };
    existing.rating = rating;
    newLabels.set(strategyId, existing);
    saveLabels(newLabels);
  };

  const schedulerFiles = files.filter(f => f.group === 'scheduler');
  const algorithmFiles = files.filter(f => f.group === 'algorithm');
  const scoringFiles = files.filter(f => f.group === 'scoring');
  const policyFiles = files.filter(f => f.group === 'policies');

  // Filter strategies
  const filteredStrategies = strategies.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const labels = strategyLabels.get(s.id);
    const matchesLabel = !filterLabel || labels?.labels.includes(filterLabel);
    return matchesSearch && matchesLabel;
  });

  // Get all unique labels
  const allLabels = Array.from(new Set(
    Array.from(strategyLabels.values()).flatMap(l => l.labels)
  ));

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

  const handleCloneStrategy = (strategy: StrategyConfig) => {
    try {
      const newStrategy = pythonModuleSystem.createStrategy(
        `${strategy.name} (Copy)`,
        strategy.schedulerFile,
        strategy.algorithmFiles,
        strategy.scoringFiles,
        strategy.policyFiles
      );
      toast.success(`Cloned as "${newStrategy.name}"`);
    } catch (e) {
      toast.error('Failed to clone');
    }
  };

  const getValidationStatus = (strategy: StrategyConfig) => {
    return pythonModuleSystem.validateStrategy(strategy.id);
  };

  const toggleCardExpand = (id: string) => {
    const next = new Set(expandedCards);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedCards(next);
  };

  // Get results for a strategy
  const getStrategyResults = (strategyId: string) => {
    return results.filter(r => r.strategyId === strategyId);
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-indigo-950/30 via-background to-purple-950/30">
      {/* Command Center Header */}
      <div className="flex items-center justify-between p-3 border-b border-indigo-500/30 bg-indigo-950/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/30 to-purple-500/30 border border-indigo-400/50">
            <Target className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="font-bold text-indigo-100">Strategy Command Center</h1>
            <p className="text-[10px] text-indigo-300/70">{strategies.length} strategies • {results.length} runs</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {executionStatus && (
            <Badge className="text-xs bg-indigo-500/20 border-indigo-400/50 animate-pulse">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              {executionStatus}
            </Badge>
          )}
        </div>
      </div>

      {/* Zone Navigation */}
      <div className="flex items-center gap-1 p-2 border-b border-indigo-500/20 bg-indigo-950/10">
        {[
          { id: 'discovery', label: 'Discovery', icon: Compass, color: 'cyan' },
          { id: 'workshop', label: 'Workshop', icon: Wrench, color: 'yellow' },
          { id: 'arena', label: 'Arena', icon: Swords, color: 'red' },
          { id: 'compare', label: 'Compare', icon: GitCompare, color: 'green' },
          { id: 'runs', label: 'Runs', icon: History, color: 'purple' },
        ].map(zone => (
          <Button
            key={zone.id}
            size="sm"
            variant={activeZone === zone.id ? 'default' : 'ghost'}
            className={`h-8 text-xs gap-1.5 ${
              activeZone === zone.id 
                ? `bg-${zone.color}-500/20 text-${zone.color}-300 border border-${zone.color}-400/50` 
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveZone(zone.id as any)}
          >
            <zone.icon className="w-3.5 h-3.5" />
            {zone.label}
          </Button>
        ))}
      </div>

      {/* Zone Content */}
      <div className="flex-1 overflow-hidden">
        {/* DISCOVERY ZONE */}
        {activeZone === 'discovery' && (
          <div className="h-full flex flex-col">
            {/* Search & Filter Bar */}
            <div className="p-3 border-b border-indigo-500/20 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-400/60" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search strategies..."
                  className="pl-8 h-8 text-xs bg-background/50 border-indigo-400/30"
                />
              </div>
              
              <Select value={filterLabel} onValueChange={setFilterLabel}>
                <SelectTrigger className="w-32 h-8 text-xs bg-background/50 border-indigo-400/30">
                  <Tag className="w-3 h-3 mr-1" />
                  <SelectValue placeholder="All labels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="" className="text-xs">All labels</SelectItem>
                  {allLabels.map(label => (
                    <SelectItem key={label} value={label} className="text-xs">{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                size="sm"
                className="h-8 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                onClick={() => setShowWizard(true)}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                New Strategy
              </Button>
            </div>

            {/* Strategy Grid */}
            <ScrollArea className="flex-1">
              <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredStrategies.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 text-indigo-400/30" />
                    <p className="text-muted-foreground">No strategies found</p>
                    <Button
                      variant="link"
                      className="text-indigo-400 mt-2"
                      onClick={() => setShowWizard(true)}
                    >
                      Create your first strategy
                    </Button>
                  </div>
                ) : (
                  filteredStrategies.map(strategy => {
                    const validation = getValidationStatus(strategy);
                    const labels = strategyLabels.get(strategy.id);
                    const strategyResults = getStrategyResults(strategy.id);
                    const isExpanded = expandedCards.has(strategy.id);

                    return (
                      <Card
                        key={strategy.id}
                        className={`bg-background/50 border-indigo-400/30 hover:border-indigo-400/60 transition-all cursor-pointer ${
                          selectedStrategy?.id === strategy.id ? 'ring-2 ring-indigo-400/50' : ''
                        }`}
                        onClick={() => setSelectedStrategy(strategy)}
                      >
                        <CardHeader className="p-3 pb-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              {validation.valid ? (
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-400" />
                              )}
                              <CardTitle className="text-sm truncate">{strategy.name}</CardTitle>
                            </div>
                            
                            {/* Rating Stars */}
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map(star => (
                                <Star
                                  key={star}
                                  className={`w-3 h-3 cursor-pointer ${
                                    (labels?.rating || 0) >= star 
                                      ? 'text-yellow-400 fill-yellow-400' 
                                      : 'text-muted-foreground'
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setStrategyRating(strategy.id, star);
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="p-3 pt-0 space-y-2">
                          {/* File Badges */}
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-purple-500/50 text-purple-300">
                              <Clock className="w-2.5 h-2.5 mr-0.5" />
                              {strategy.schedulerFile.replace('.py', '').slice(0, 12)}
                            </Badge>
                            <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-blue-500/50 text-blue-300">
                              <Code className="w-2.5 h-2.5 mr-0.5" />
                              {strategy.algorithmFiles.length} algo
                            </Badge>
                            <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-yellow-500/50 text-yellow-300">
                              <Calculator className="w-2.5 h-2.5 mr-0.5" />
                              {strategy.scoringFiles.length} score
                            </Badge>
                            {strategy.policyFiles.length > 0 && (
                              <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-green-500/50 text-green-300">
                                <Shield className="w-2.5 h-2.5 mr-0.5" />
                                {strategy.policyFiles.length}
                              </Badge>
                            )}
                          </div>

                          {/* Labels */}
                          {labels?.labels && labels.labels.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {labels.labels.map(label => (
                                <Badge key={label} className="text-[8px] h-4 bg-indigo-500/20 text-indigo-300 border-indigo-500/50">
                                  {label}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* Stats */}
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>{strategyResults.length} runs</span>
                            {labels?.lastRunScore !== undefined && (
                              <span className="text-indigo-300">Last: {labels.lastRunScore.toFixed(2)}</span>
                            )}
                          </div>

                          {/* Expanded Details */}
                          {isExpanded && (
                            <div className="pt-2 border-t border-indigo-500/20 space-y-2">
                              <div className="text-[10px] text-muted-foreground">
                                <div className="font-medium text-indigo-300 mb-1">Files:</div>
                                <div className="space-y-0.5">
                                  <div>📅 {strategy.schedulerFile}</div>
                                  {strategy.algorithmFiles.map(f => (
                                    <div key={f}>⚙️ {f}</div>
                                  ))}
                                  {strategy.scoringFiles.map(f => (
                                    <div key={f}>📊 {f}</div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-1 pt-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-[10px]"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCardExpand(strategy.id);
                              }}
                            >
                              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                              {isExpanded ? 'Less' : 'More'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-[10px]"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCloneStrategy(strategy);
                              }}
                            >
                              <Copy className="w-3 h-3 mr-0.5" />
                              Clone
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-[10px] text-red-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteStrategy(strategy.id);
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            {/* Add Label Dialog */}
            {selectedStrategy && (
              <div className="p-3 border-t border-indigo-500/20 bg-indigo-950/10">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Add label..."
                    className="h-7 text-xs flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && selectedStrategy) {
                        addLabelToStrategy(selectedStrategy.id, (e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    className="h-7 bg-indigo-500/20 hover:bg-indigo-500/30"
                    onClick={() => setActiveZone('arena')}
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Run Selected
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* WORKSHOP ZONE */}
        {activeZone === 'workshop' && (
          <div className="h-full p-4">
            <StrategyCreationWizard
              files={files}
              onComplete={(strategy) => {
                toast.success(`Strategy "${strategy.name}" created!`);
                setSelectedStrategy(strategy);
                setActiveZone('discovery');
              }}
              onCancel={() => setActiveZone('discovery')}
            />
          </div>
        )}

        {/* ARENA ZONE */}
        {activeZone === 'arena' && (
          <div className="h-full p-4 space-y-4">
            <Card className="bg-gradient-to-br from-red-950/20 to-orange-950/20 border-red-400/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-red-100">
                  <Swords className="w-5 h-5 text-red-400" />
                  Execution Arena
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Strategy Selector */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-red-300">Strategy</Label>
                    <Select
                      value={selectedStrategy?.id || ''}
                      onValueChange={(id) => {
                        const s = strategies.find(s => s.id === id);
                        if (s) setSelectedStrategy(s);
                      }}
                    >
                      <SelectTrigger className="mt-1 bg-background/50 border-red-400/30">
                        <SelectValue placeholder="Choose strategy..." />
                      </SelectTrigger>
                      <SelectContent>
                        {strategies.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs text-red-300">Data File</Label>
                    <Select value={selectedDataFile} onValueChange={setSelectedDataFile}>
                      <SelectTrigger className="mt-1 bg-background/50 border-red-400/30">
                        <SelectValue placeholder="Choose data file..." />
                      </SelectTrigger>
                      <SelectContent>
                        {binaryFiles.map(f => (
                          <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Selected Strategy Preview */}
                {selectedStrategy && (
                  <div className="p-3 rounded-lg bg-background/30 border border-red-400/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-red-100">{selectedStrategy.name}</span>
                      <Badge variant={getValidationStatus(selectedStrategy).valid ? 'default' : 'destructive'}>
                        {getValidationStatus(selectedStrategy).valid ? 'Valid' : 'Invalid'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="text-purple-300">📅 {selectedStrategy.schedulerFile}</span>
                      <span className="text-blue-300">⚙️ {selectedStrategy.algorithmFiles.length} algorithms</span>
                      <span className="text-yellow-300">📊 {selectedStrategy.scoringFiles.length} scoring</span>
                    </div>
                  </div>
                )}

                {/* Run Button */}
                <Button
                  className="w-full h-12 text-lg font-bold bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                  disabled={!selectedStrategy || !selectedDataFile || isRunning}
                  onClick={handleRunStrategy}
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 mr-2" />
                      EXECUTE STRATEGY
                    </>
                  )}
                </Button>

                {/* Execution Progress */}
                {isRunning && executionStatus && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{executionStatus}</span>
                      <Loader2 className="w-3 h-3 animate-spin" />
                    </div>
                    <Progress className="h-2" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Runs */}
            <Card className="flex-1 bg-background/50 border-red-400/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-100">Recent Executions</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {results.slice(0, 10).map(result => (
                      <div
                        key={result.id}
                        className="p-2 rounded bg-background/30 border border-border/50 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-medium">{result.strategyName}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {new Date(result.startTime).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={result.status === 'completed' ? 'default' : 'destructive'} className="text-[10px]">
                            {result.status}
                          </Badge>
                          <span className="text-xs font-mono">{result.duration}ms</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}

        {/* COMPARE ZONE */}
        {activeZone === 'compare' && (
          <div className="h-full p-4">
            <StrategyComparer strategies={strategies} results={results} />
          </div>
        )}

        {/* RUNS ZONE */}
        {activeZone === 'runs' && (
          <div className="h-full flex flex-col">
            <div className="p-3 border-b border-purple-500/20">
              <div className="flex items-center justify-between">
                <h2 className="font-medium text-purple-100">Execution History</h2>
                <Badge variant="outline" className="border-purple-400/50 text-purple-300">
                  {results.length} runs
                </Badge>
              </div>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-2">
                {results.map(result => {
                  const strategy = strategies.find(s => s.id === result.strategyId);
                  return (
                    <Card key={result.id} className="bg-background/50 border-purple-400/20">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">{result.strategyName}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {result.sourceFileName} • {result.steps.length} steps • {result.duration}ms
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={result.status === 'completed' ? 'default' : 'destructive'}>
                              {result.status}
                            </Badge>
                            <div className="text-right">
                              <div className="text-xs font-mono">{new Date(result.startTime).toLocaleDateString()}</div>
                              <div className="text-[10px] text-muted-foreground">{new Date(result.startTime).toLocaleTimeString()}</div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Metrics Summary */}
                        <div className="mt-2 flex gap-4 text-[10px]">
                          <span className="text-cyan-300">
                            Entropy: {result.finalMetrics?.entropy?.toFixed(4) || 'N/A'}
                          </span>
                          <span className="text-green-300">
                            Balance: {result.finalMetrics?.balance?.toFixed(4) || 'N/A'}
                          </span>
                          <span className="text-yellow-300">
                            Cost: {result.benchmarks?.totalCost || 0}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Creation Wizard Dialog */}
      <Dialog open={showWizard} onOpenChange={setShowWizard}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Strategy</DialogTitle>
          </DialogHeader>
          <StrategyCreationWizard
            files={files}
            onComplete={(strategy) => {
              toast.success(`Strategy "${strategy.name}" created!`);
              setSelectedStrategy(strategy);
              setShowWizard(false);
            }}
            onCancel={() => setShowWizard(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
