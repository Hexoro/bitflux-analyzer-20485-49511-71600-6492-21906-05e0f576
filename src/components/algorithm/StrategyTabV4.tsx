/**
 * Strategy Tab V4 - Clean, modern, space-efficient design
 * Features: Unified preset maker, strategy list, handles large numbers of files/strategies
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  ChevronUp,
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

const STRATEGY_STORAGE_KEY = 'bsee_saved_strategies';

interface StrategyTabV4Props {
  onRunStrategy?: (strategy: StrategyConfig) => void;
  isExecuting?: boolean;
  onNavigateToTimeline?: () => void;
}

export const StrategyTabV4 = ({ onRunStrategy, isExecuting = false, onNavigateToTimeline }: StrategyTabV4Props) => {
  const [strategies, setStrategies] = useState<StrategyConfig[]>([]);
  const [files, setFiles] = useState<PythonFile[]>([]);
  const [binaryFiles, setBinaryFiles] = useState<BinaryFile[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyConfig | null>(null);
  const [selectedDataFile, setSelectedDataFile] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form state for new strategy
  const [strategyName, setStrategyName] = useState('');
  const [selectedScheduler, setSelectedScheduler] = useState('');
  const [selectedAlgorithms, setSelectedAlgorithms] = useState<string[]>([]);
  const [selectedScoring, setSelectedScoring] = useState<string[]>([]);
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);

  // Load saved strategies from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STRATEGY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        parsed.forEach((s: StrategyConfig) => {
          if (!pythonModuleSystem.getAllStrategies().find(existing => existing.id === s.id)) {
            // Re-register saved strategies
            try {
              pythonModuleSystem.createStrategy(s.name, s.schedulerFile, s.algorithmFiles, s.scoringFiles, s.policyFiles);
            } catch (e) {
              // Strategy might already exist or files missing
            }
          }
        });
      }
    } catch (e) {
      console.error('Failed to load saved strategies:', e);
    }
  }, []);

  // Ensure unified strategy files exist on mount
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
        // Navigate to timeline after completion
        if (onNavigateToTimeline) {
          onNavigateToTimeline();
        }
      } else if (status === 'failed') {
        toast.error(`Failed: ${result?.error || 'Unknown error'}`);
      }
    });

    return () => { unsub1(); unsub2(); unsub3(); };
  }, [onNavigateToTimeline]);

  // Save strategies to localStorage whenever they change
  useEffect(() => {
    if (strategies.length > 0) {
      localStorage.setItem(STRATEGY_STORAGE_KEY, JSON.stringify(strategies));
    }
  }, [strategies]);

  const schedulerFiles = files.filter(f => f.group === 'scheduler');
  const algorithmFiles = files.filter(f => f.group === 'algorithm');
  const scoringFiles = files.filter(f => f.group === 'scoring');
  const policyFiles = files.filter(f => f.group === 'policies');

  const filteredStrategies = strategies.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      setSelectedScheduler('');
      setSelectedAlgorithms([]);
      setSelectedScoring([]);
      setSelectedPolicies([]);
      setShowCreateForm(false);
      setSelectedStrategy(strategy);
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

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-cyan-950/30 via-background to-emerald-950/30">
      {/* Compact Header */}
      <div className="flex items-center justify-between p-3 border-b border-cyan-500/30 bg-cyan-950/20">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-gradient-to-br from-cyan-500/30 to-emerald-500/30 border border-cyan-400/50">
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="font-medium text-cyan-100 text-sm">Strategies</span>
          <Badge variant="outline" className="text-[10px] h-5 border-cyan-400/50 text-cyan-300">
            {strategies.length}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedDataFile} onValueChange={setSelectedDataFile}>
            <SelectTrigger className="w-36 h-7 text-xs bg-background/50 border-cyan-400/30">
              <SelectValue placeholder="Data file" />
            </SelectTrigger>
            <SelectContent>
              {binaryFiles.map(file => (
                <SelectItem key={file.id} value={file.id} className="text-xs">
                  {file.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-cyan-400/50 hover:bg-cyan-500/20"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? <ChevronUp className="w-3 h-3 mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
            {showCreateForm ? 'Hide' : 'New'}
          </Button>

          {executionStatus && (
            <Badge className="text-[10px] bg-cyan-500/20 border-cyan-400/50 animate-pulse">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              {executionStatus}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Strategy List */}
        <div className="w-1/2 border-r border-cyan-500/20 flex flex-col">
          {/* Search */}
          <div className="p-2 border-b border-cyan-500/20">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-cyan-400/60" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="pl-7 h-7 text-xs bg-background/50 border-cyan-400/30"
              />
            </div>
          </div>

          {/* Strategy Cards */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {filteredStrategies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">No strategies yet</p>
                  <p className="text-[10px] mt-1">Create one above</p>
                </div>
              ) : (
                filteredStrategies.map(strategy => {
                  const validation = getValidationStatus(strategy);
                  const isSelected = selectedStrategy?.id === strategy.id;
                  
                  return (
                    <div
                      key={strategy.id}
                      className={`p-2 rounded-lg cursor-pointer transition-all border ${
                        isSelected 
                          ? 'bg-cyan-500/20 border-cyan-400/70 shadow-lg shadow-cyan-500/10' 
                          : 'bg-background/30 border-cyan-500/20 hover:border-cyan-400/50 hover:bg-cyan-500/10'
                      }`}
                      onClick={() => setSelectedStrategy(strategy)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {validation.valid ? (
                            <CheckCircle2 className="w-3 h-3 text-green-400" />
                          ) : (
                            <XCircle className="w-3 h-3 text-red-400" />
                          )}
                          <span className="font-medium text-xs truncate max-w-[120px]">{strategy.name}</span>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5"
                          onClick={(e) => { e.stopPropagation(); handleDeleteStrategy(strategy.id); }}
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </Button>
                      </div>
                      
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[9px] h-4 px-1 border-purple-500/50 text-purple-300">
                          <Clock className="w-2 h-2 mr-0.5" />
                          {strategy.schedulerFile.replace('.py', '').slice(0, 10)}
                        </Badge>
                        <Badge variant="outline" className="text-[9px] h-4 px-1 border-blue-500/50 text-blue-300">
                          <Code className="w-2 h-2 mr-0.5" />
                          {strategy.algorithmFiles.length}
                        </Badge>
                        <Badge variant="outline" className="text-[9px] h-4 px-1 border-yellow-500/50 text-yellow-300">
                          <Calculator className="w-2 h-2 mr-0.5" />
                          {strategy.scoringFiles.length}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Create Form or Selected Strategy */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          {showCreateForm ? (
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-3">
                <div className="text-xs font-medium text-cyan-200 flex items-center gap-2">
                  <Plus className="w-3 h-3" />
                  Create Strategy
                </div>

                <div>
                  <Label className="text-[10px] text-cyan-300">Name</Label>
                  <Input
                    value={strategyName}
                    onChange={(e) => setStrategyName(e.target.value)}
                    placeholder="My Strategy"
                    className="h-7 text-xs mt-1 bg-background/50 border-cyan-400/30"
                  />
                </div>

                <div>
                  <Label className="text-[10px] text-cyan-300 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" /> Scheduler
                    <Badge className="text-[8px] h-3 ml-1 bg-red-500/20 text-red-300 border-red-500/50">Required</Badge>
                  </Label>
                  <Select value={selectedScheduler} onValueChange={setSelectedScheduler}>
                    <SelectTrigger className="h-7 text-xs mt-1 bg-background/50 border-cyan-400/30">
                      <SelectValue placeholder="Select scheduler" />
                    </SelectTrigger>
                    <SelectContent>
                      {schedulerFiles.map(file => (
                        <SelectItem key={file.name} value={file.name} className="text-xs">{file.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Algorithm Files */}
                <div>
                  <Label className="text-[10px] text-cyan-300 flex items-center gap-1">
                    <Code className="w-2.5 h-2.5" /> Algorithms ({algorithmFiles.length})
                  </Label>
                  <div className="mt-1 max-h-24 overflow-y-auto space-y-1 bg-background/30 rounded p-1.5 border border-cyan-400/20">
                    {algorithmFiles.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground">No algorithm files</p>
                    ) : (
                      algorithmFiles.map(file => (
                        <label key={file.name} className="flex items-center gap-1.5 text-[10px] cursor-pointer hover:bg-cyan-500/10 p-0.5 rounded">
                          <Checkbox
                            checked={selectedAlgorithms.includes(file.name)}
                            onCheckedChange={() => toggleFile(file.name, selectedAlgorithms, setSelectedAlgorithms)}
                            className="h-3 w-3"
                          />
                          <span className="truncate">{file.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                {/* Scoring Files */}
                <div>
                  <Label className="text-[10px] text-cyan-300 flex items-center gap-1">
                    <Calculator className="w-2.5 h-2.5" /> Scoring ({scoringFiles.length})
                  </Label>
                  <div className="mt-1 max-h-24 overflow-y-auto space-y-1 bg-background/30 rounded p-1.5 border border-cyan-400/20">
                    {scoringFiles.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground">No scoring files</p>
                    ) : (
                      scoringFiles.map(file => (
                        <label key={file.name} className="flex items-center gap-1.5 text-[10px] cursor-pointer hover:bg-cyan-500/10 p-0.5 rounded">
                          <Checkbox
                            checked={selectedScoring.includes(file.name)}
                            onCheckedChange={() => toggleFile(file.name, selectedScoring, setSelectedScoring)}
                            className="h-3 w-3"
                          />
                          <span className="truncate">{file.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                {/* Policy Files */}
                <div>
                  <Label className="text-[10px] text-cyan-300 flex items-center gap-1">
                    <Shield className="w-2.5 h-2.5" /> Policies ({policyFiles.length})
                  </Label>
                  <div className="mt-1 max-h-24 overflow-y-auto space-y-1 bg-background/30 rounded p-1.5 border border-cyan-400/20">
                    {policyFiles.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground">No policy files</p>
                    ) : (
                      policyFiles.map(file => (
                        <label key={file.name} className="flex items-center gap-1.5 text-[10px] cursor-pointer hover:bg-cyan-500/10 p-0.5 rounded">
                          <Checkbox
                            checked={selectedPolicies.includes(file.name)}
                            onCheckedChange={() => toggleFile(file.name, selectedPolicies, setSelectedPolicies)}
                            className="h-3 w-3"
                          />
                          <span className="truncate">{file.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <Button
                  className="w-full h-8 text-xs bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 border-0"
                  onClick={handleCreateStrategy}
                >
                  <Save className="w-3 h-3 mr-1" />
                  Create Strategy
                </Button>
              </div>
            </ScrollArea>
          ) : selectedStrategy ? (
            <div className="flex-1 flex flex-col p-3">
              <Card className="flex-1 bg-gradient-to-br from-cyan-950/30 to-emerald-950/30 border-cyan-400/30">
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-cyan-400" />
                    {selectedStrategy.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-3">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center p-2 bg-background/30 rounded">
                      <span className="text-muted-foreground">Scheduler</span>
                      <Badge variant="outline" className="text-[10px]">{selectedStrategy.schedulerFile}</Badge>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-background/30 rounded">
                      <span className="text-muted-foreground">Algorithms</span>
                      <span className="text-cyan-300">{selectedStrategy.algorithmFiles.length} files</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-background/30 rounded">
                      <span className="text-muted-foreground">Scoring</span>
                      <span className="text-yellow-300">{selectedStrategy.scoringFiles.length} files</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-background/30 rounded">
                      <span className="text-muted-foreground">Policies</span>
                      <span className="text-purple-300">{selectedStrategy.policyFiles.length} files</span>
                    </div>
                  </div>

                  <Button
                    className="w-full h-9 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 border-0 shadow-lg shadow-cyan-500/20"
                    onClick={handleRunStrategy}
                    disabled={isRunning || isExecuting || !selectedDataFile}
                  >
                    {isRunning || isExecuting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    {isRunning ? 'Running...' : 'Run Strategy'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Layers className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-xs">Select a strategy or create new</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
