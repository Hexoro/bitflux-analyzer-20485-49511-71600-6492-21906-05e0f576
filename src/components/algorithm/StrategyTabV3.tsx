/**
 * Strategy Tab V3 - Neon themed, space-efficient, unified strategy only
 * Features: Neon styling, only unified strategy, better space usage
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
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
  Sparkles,
  FileCode,
  Target,
  Brain,
  Save,
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

const STRATEGY_PRESETS_KEY = 'bsee_strategy_presets';

interface StrategyPreset {
  id: string;
  name: string;
  schedulerFile: string;
  algorithmFiles: string[];
  scoringFiles: string[];
  policyFiles: string[];
  created: Date;
}

interface StrategyTabV3Props {
  onRunStrategy?: (strategy: StrategyConfig) => void;
  isExecuting?: boolean;
}

export const StrategyTabV3 = ({ onRunStrategy, isExecuting = false }: StrategyTabV3Props) => {
  const [strategies, setStrategies] = useState<StrategyConfig[]>([]);
  const [files, setFiles] = useState<PythonFile[]>([]);
  const [binaryFiles, setBinaryFiles] = useState<BinaryFile[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyConfig | null>(null);
  const [selectedDataFile, setSelectedDataFile] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [presets, setPresets] = useState<StrategyPreset[]>([]);

  // Form state
  const [strategyName, setStrategyName] = useState('');
  const [selectedScheduler, setSelectedScheduler] = useState('');
  const [selectedAlgorithms, setSelectedAlgorithms] = useState<string[]>([]);
  const [selectedScoring, setSelectedScoring] = useState<string[]>([]);
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);

  // Load presets from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STRATEGY_PRESETS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setPresets(parsed.map((p: any) => ({ ...p, created: new Date(p.created) })));
      }
    } catch (e) {
      console.error('Failed to load presets:', e);
    }
  }, []);

  // Save presets to localStorage
  const savePresets = (newPresets: StrategyPreset[]) => {
    setPresets(newPresets);
    localStorage.setItem(STRATEGY_PRESETS_KEY, JSON.stringify(newPresets));
  };

  useEffect(() => {
    // Load unified strategy files if not already present
    const hasUnifiedScheduler = pythonModuleSystem.getFileByName('UnifiedScheduler.py');
    if (!hasUnifiedScheduler) {
      pythonModuleSystem.addFile('UnifiedScheduler.py', UNIFIED_SCHEDULER_V2, 'scheduler');
      pythonModuleSystem.addFile('UnifiedAlgorithm.py', UNIFIED_ALGORITHM_V2, 'algorithm');
      pythonModuleSystem.addFile('UnifiedScoring.py', UNIFIED_SCORING_V2, 'scoring');
      pythonModuleSystem.addFile('UnifiedPolicy.py', UNIFIED_POLICY_V2, 'policies');
    }
    
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
      } else if (status === 'failed') {
        toast.error(`Failed: ${result?.error || 'Unknown error'}`);
      }
    });

    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

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
      
      // Save as preset
      const preset: StrategyPreset = {
        id: strategy.id,
        name: strategyName,
        schedulerFile: selectedScheduler,
        algorithmFiles: [...selectedAlgorithms],
        scoringFiles: [...selectedScoring],
        policyFiles: [...selectedPolicies],
        created: new Date(),
      };
      savePresets([...presets, preset]);
      
      toast.success(`Strategy "${strategyName}" created & saved`);
      
      setStrategyName('');
      setSelectedScheduler('');
      setSelectedAlgorithms([]);
      setSelectedScoring([]);
      setSelectedPolicies([]);
      setSelectedStrategy(strategy);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleDeleteStrategy = (id: string) => {
    pythonModuleSystem.deleteStrategy(id);
    savePresets(presets.filter(p => p.id !== id));
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

  const getGroupIcon = (group: PythonFile['group']) => {
    switch (group) {
      case 'scheduler': return <Clock className="w-3 h-3" />;
      case 'algorithm': return <Code className="w-3 h-3" />;
      case 'scoring': return <Calculator className="w-3 h-3" />;
      case 'policies': return <Shield className="w-3 h-3" />;
      case 'ai': return <Brain className="w-3 h-3" />;
      default: return <FileCode className="w-3 h-3" />;
    }
  };

  return (
    <div className="h-full flex bg-gradient-to-br from-slate-950 via-background to-cyan-950/30">
      {/* Left: Strategy List */}
      <div className="w-1/3 flex flex-col border-r border-cyan-400/30 p-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/30 to-emerald-500/30 border border-cyan-400/50 shadow-[0_0_15px_rgba(0,255,255,0.2)]">
            <Layers className="w-4 h-4 text-cyan-400 drop-shadow-[0_0_8px_rgba(0,255,255,0.8)]" />
          </div>
          <div>
            <h2 className="font-semibold text-cyan-100 text-sm drop-shadow-[0_0_5px_rgba(0,255,255,0.3)]">Strategies</h2>
            <p className="text-[10px] text-muted-foreground">{strategies.length} available</p>
          </div>
        </div>
        
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-cyan-400/60" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="pl-7 h-7 text-xs bg-background/50 border-cyan-400/30 focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(0,255,255,0.2)]"
          />
        </div>
        
        <Select value={selectedDataFile} onValueChange={setSelectedDataFile}>
          <SelectTrigger className="h-7 text-xs bg-background/50 border-cyan-400/30 mb-2">
            <SelectValue placeholder="Select data file" />
          </SelectTrigger>
          <SelectContent>
            {binaryFiles.map(file => (
              <SelectItem key={file.id} value={file.id}>
                {file.name} ({file.state.model.getBits().length}b)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ScrollArea className="flex-1">
          <div className="space-y-1.5 pr-2">
            {filteredStrategies.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">No strategies yet</p>
              </div>
            ) : (
              filteredStrategies.map(strategy => {
                const validation = getValidationStatus(strategy);
                const isSelected = selectedStrategy?.id === strategy.id;
                
                return (
                  <Card
                    key={strategy.id}
                    className={`cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-cyan-500/20 border-cyan-400/70 shadow-[0_0_20px_rgba(0,255,255,0.25)]' 
                        : 'bg-background/40 border-cyan-500/20 hover:border-cyan-400/50 hover:bg-cyan-500/10'
                    }`}
                    onClick={() => setSelectedStrategy(strategy)}
                  >
                    <CardContent className="p-2.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className={`p-1 rounded ${validation.valid ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                            {validation.valid ? (
                              <CheckCircle2 className="w-3 h-3 text-green-400" />
                            ) : (
                              <XCircle className="w-3 h-3 text-red-400" />
                            )}
                          </div>
                          <span className="font-medium text-xs text-cyan-100">{strategy.name}</span>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5"
                          onClick={(e) => { e.stopPropagation(); handleDeleteStrategy(strategy.id); }}
                        >
                          <Trash2 className="w-2.5 h-2.5 text-red-400" />
                        </Button>
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-[9px] h-4 border-purple-500/50 text-purple-300">
                          <Clock className="w-2 h-2 mr-0.5" />
                          {strategy.schedulerFile.replace('.py', '')}
                        </Badge>
                        <Badge variant="outline" className="text-[9px] h-4 border-blue-500/50 text-blue-300">
                          {strategy.algorithmFiles.length} alg
                        </Badge>
                        <Badge variant="outline" className="text-[9px] h-4 border-yellow-500/50 text-yellow-300">
                          {strategy.scoringFiles.length} score
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Run Button */}
        {selectedStrategy && (
          <Button
            className="mt-2 w-full bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 shadow-[0_0_15px_rgba(0,255,255,0.3)] text-sm"
            onClick={handleRunStrategy}
            disabled={isRunning || !selectedDataFile}
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {executionStatus || 'Running...'}
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run Strategy
              </>
            )}
          </Button>
        )}
      </div>

      {/* Right: Create Strategy */}
      <div className="flex-1 p-3 overflow-auto">
        <Card className="bg-gradient-to-br from-cyan-950/30 to-emerald-950/30 border-cyan-400/30 shadow-[0_0_20px_rgba(0,255,255,0.1)]">
          <CardHeader className="py-3 border-b border-cyan-400/20">
            <CardTitle className="text-sm flex items-center gap-2 text-cyan-100">
              <Sparkles className="w-4 h-4 text-cyan-400 drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]" />
              Create New Strategy
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-cyan-200 mb-1 block">Strategy Name</Label>
                <Input
                  value={strategyName}
                  onChange={(e) => setStrategyName(e.target.value)}
                  placeholder="My Strategy"
                  className="h-8 bg-background/50 border-cyan-400/30 focus:border-cyan-400 text-xs"
                />
              </div>
              
              <div>
                <Label className="text-xs text-cyan-200 mb-1 block flex items-center gap-1">
                  <Clock className="w-3 h-3 text-purple-400" />
                  Scheduler
                  <Badge className="text-[8px] h-3 bg-pink-500/20 text-pink-300 ml-1">Required</Badge>
                </Label>
                <Select value={selectedScheduler} onValueChange={setSelectedScheduler}>
                  <SelectTrigger className="h-8 bg-background/50 border-cyan-400/30 text-xs">
                    <SelectValue placeholder="Select scheduler" />
                  </SelectTrigger>
                  <SelectContent>
                    {schedulerFiles.map(f => (
                      <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Algorithm Files */}
            <div>
              <Label className="text-xs text-cyan-200 mb-1 block flex items-center gap-1">
                <Code className="w-3 h-3 text-blue-400" />
                Algorithms ({selectedAlgorithms.length} selected)
              </Label>
              <div className="flex flex-wrap gap-1 p-2 bg-background/30 rounded-lg border border-cyan-400/20 max-h-20 overflow-y-auto">
                {algorithmFiles.map(f => (
                  <Badge
                    key={f.id}
                    variant="outline"
                    className={`cursor-pointer text-[10px] transition-all ${
                      selectedAlgorithms.includes(f.name)
                        ? 'bg-blue-500/30 border-blue-400 text-blue-200 shadow-[0_0_8px_rgba(59,130,246,0.3)]'
                        : 'border-border hover:border-blue-400/50'
                    }`}
                    onClick={() => toggleFile(f.name, selectedAlgorithms, setSelectedAlgorithms)}
                  >
                    {f.name.replace('.py', '')}
                  </Badge>
                ))}
                {algorithmFiles.length === 0 && (
                  <span className="text-xs text-muted-foreground">No algorithm files</span>
                )}
              </div>
            </div>

            {/* Scoring Files */}
            <div>
              <Label className="text-xs text-cyan-200 mb-1 block flex items-center gap-1">
                <Calculator className="w-3 h-3 text-yellow-400" />
                Scoring ({selectedScoring.length} selected)
              </Label>
              <div className="flex flex-wrap gap-1 p-2 bg-background/30 rounded-lg border border-cyan-400/20 max-h-16 overflow-y-auto">
                {scoringFiles.map(f => (
                  <Badge
                    key={f.id}
                    variant="outline"
                    className={`cursor-pointer text-[10px] transition-all ${
                      selectedScoring.includes(f.name)
                        ? 'bg-yellow-500/30 border-yellow-400 text-yellow-200 shadow-[0_0_8px_rgba(234,179,8,0.3)]'
                        : 'border-border hover:border-yellow-400/50'
                    }`}
                    onClick={() => toggleFile(f.name, selectedScoring, setSelectedScoring)}
                  >
                    {f.name.replace('.py', '')}
                  </Badge>
                ))}
                {scoringFiles.length === 0 && (
                  <span className="text-xs text-muted-foreground">No scoring files</span>
                )}
              </div>
            </div>

            {/* Policy Files */}
            <div>
              <Label className="text-xs text-cyan-200 mb-1 block flex items-center gap-1">
                <Shield className="w-3 h-3 text-green-400" />
                Policies ({selectedPolicies.length} selected)
              </Label>
              <div className="flex flex-wrap gap-1 p-2 bg-background/30 rounded-lg border border-cyan-400/20 max-h-16 overflow-y-auto">
                {policyFiles.map(f => (
                  <Badge
                    key={f.id}
                    variant="outline"
                    className={`cursor-pointer text-[10px] transition-all ${
                      selectedPolicies.includes(f.name)
                        ? 'bg-green-500/30 border-green-400 text-green-200 shadow-[0_0_8px_rgba(34,197,94,0.3)]'
                        : 'border-border hover:border-green-400/50'
                    }`}
                    onClick={() => toggleFile(f.name, selectedPolicies, setSelectedPolicies)}
                  >
                    {f.name.replace('.py', '')}
                  </Badge>
                ))}
                {policyFiles.length === 0 && (
                  <span className="text-xs text-muted-foreground">No policy files</span>
                )}
              </div>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 shadow-[0_0_15px_rgba(0,255,255,0.3)] text-sm"
              onClick={handleCreateStrategy}
              disabled={!strategyName || !selectedScheduler}
            >
              <Save className="w-4 h-4 mr-2" />
              Create & Save Strategy
            </Button>
          </CardContent>
        </Card>

        {/* Unified Strategy Info */}
        <Card className="mt-3 bg-gradient-to-r from-cyan-950/40 to-emerald-950/40 border-cyan-400/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-cyan-400 drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]" />
              <span className="font-medium text-sm text-cyan-100">Unified Strategy Files</span>
              <Badge className="text-[9px] bg-cyan-500/20 text-cyan-300 border-cyan-400/50">Pre-loaded</Badge>
            </div>
            <p className="text-[10px] text-muted-foreground mb-2">
              The Unified Strategy is automatically loaded with optimized scheduler, algorithm, scoring, and policy files.
            </p>
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" className="text-[9px] border-purple-400/50 text-purple-300">UnifiedScheduler.py</Badge>
              <Badge variant="outline" className="text-[9px] border-blue-400/50 text-blue-300">UnifiedAlgorithm.py</Badge>
              <Badge variant="outline" className="text-[9px] border-yellow-400/50 text-yellow-300">UnifiedScoring.py</Badge>
              <Badge variant="outline" className="text-[9px] border-green-400/50 text-green-300">UnifiedPolicy.py</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
