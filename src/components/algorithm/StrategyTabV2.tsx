/**
 * Strategy Tab V2 - Redesigned with cleaner UX
 * Split view: Strategy list on left, details + run on right
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
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { pythonModuleSystem, PythonFile, StrategyConfig } from '@/lib/pythonModuleSystem';
import { fileSystemManager, BinaryFile } from '@/lib/fileSystemManager';
import { strategyExecutionEngine } from '@/lib/strategyExecutionEngine';
import { loadExampleAlgorithmFiles } from '@/lib/exampleAlgorithmFiles';

interface StrategyTabV2Props {
  onRunStrategy?: (strategy: StrategyConfig) => void;
  isExecuting?: boolean;
}

export const StrategyTabV2 = ({ onRunStrategy, isExecuting = false }: StrategyTabV2Props) => {
  const [strategies, setStrategies] = useState<StrategyConfig[]>([]);
  const [files, setFiles] = useState<PythonFile[]>([]);
  const [binaryFiles, setBinaryFiles] = useState<BinaryFile[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyConfig | null>(null);
  const [selectedDataFile, setSelectedDataFile] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreatePanel, setShowCreatePanel] = useState(false);

  // Form state
  const [strategyName, setStrategyName] = useState('');
  const [selectedScheduler, setSelectedScheduler] = useState('');
  const [selectedAlgorithms, setSelectedAlgorithms] = useState<string[]>([]);
  const [selectedScoring, setSelectedScoring] = useState<string[]>([]);
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);

  useEffect(() => {
    loadExampleAlgorithmFiles(pythonModuleSystem);
    
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
      toast.success(`Strategy "${strategyName}" created`);
      
      setStrategyName('');
      setSelectedScheduler('');
      setSelectedAlgorithms([]);
      setSelectedScoring([]);
      setSelectedPolicies([]);
      setShowCreatePanel(false);
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
    <div className="h-full flex flex-col gap-3 p-3">
      {/* Top Bar */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search strategies..."
            className="pl-8 h-8"
          />
        </div>
        
        <Select value={selectedDataFile} onValueChange={setSelectedDataFile}>
          <SelectTrigger className="w-48 h-8">
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

        <Button size="sm" onClick={() => setShowCreatePanel(!showCreatePanel)}>
          <Plus className="w-4 h-4 mr-1" />
          New
        </Button>

        {executionStatus && (
          <Badge variant="secondary" className="animate-pulse">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            {executionStatus}
          </Badge>
        )}
      </div>

      <div className="flex-1 flex gap-3 overflow-hidden">
        {/* Left: Strategy List */}
        <div className="w-1/3 flex flex-col gap-2">
          <ScrollArea className="flex-1">
            <div className="space-y-1 pr-2">
              {filteredStrategies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No strategies</p>
                </div>
              ) : (
                filteredStrategies.map(strategy => {
                  const validation = getValidationStatus(strategy);
                  const isSelected = selectedStrategy?.id === strategy.id;
                  
                  return (
                    <div
                      key={strategy.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-primary/10 border-primary shadow-sm' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedStrategy(strategy)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {validation.valid ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-destructive" />
                          )}
                          <span className="font-medium text-sm truncate">{strategy.name}</span>
                        </div>
                        <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                        <span>{strategy.algorithmFiles.length} alg</span>
                        <span>•</span>
                        <span>{strategy.scoringFiles.length} score</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right: Details or Create Panel */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardContent className="flex-1 overflow-auto p-4">
            {showCreatePanel ? (
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create Strategy
                </h3>

                <div>
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={strategyName}
                    onChange={(e) => setStrategyName(e.target.value)}
                    placeholder="My Strategy"
                    className="h-8 mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs flex items-center gap-2">
                    <Clock className="w-3 h-3 text-purple-500" />
                    Scheduler
                    <Badge variant="destructive" className="text-[10px]">Required</Badge>
                  </Label>
                  <Select value={selectedScheduler} onValueChange={setSelectedScheduler}>
                    <SelectTrigger className="h-8 mt-1">
                      <SelectValue placeholder="Select scheduler" />
                    </SelectTrigger>
                    <SelectContent>
                      {schedulerFiles.map(f => (
                        <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs flex items-center gap-2">
                    <Code className="w-3 h-3 text-primary" />
                    Algorithms
                  </Label>
                  <div className="max-h-24 overflow-y-auto mt-1 space-y-1">
                    {algorithmFiles.map(f => (
                      <div key={f.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedAlgorithms.includes(f.name)}
                          onCheckedChange={() => toggleFile(f.name, selectedAlgorithms, setSelectedAlgorithms)}
                        />
                        <span className="text-xs font-mono">{f.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-xs flex items-center gap-2">
                    <Calculator className="w-3 h-3 text-yellow-500" />
                    Scoring
                  </Label>
                  <div className="max-h-24 overflow-y-auto mt-1 space-y-1">
                    {scoringFiles.map(f => (
                      <div key={f.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedScoring.includes(f.name)}
                          onCheckedChange={() => toggleFile(f.name, selectedScoring, setSelectedScoring)}
                        />
                        <span className="text-xs font-mono">{f.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={handleCreateStrategy}>
                    Create
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowCreatePanel(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : selectedStrategy ? (
              <div className="space-y-4">
                {/* Validation Status */}
                {(() => {
                  const validation = getValidationStatus(selectedStrategy);
                  return (
                    <div className={`p-3 rounded-lg ${validation.valid ? 'bg-green-500/10' : 'bg-destructive/10'}`}>
                      <div className="flex items-center gap-2">
                        {validation.valid ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span className="text-green-500 font-medium text-sm">Ready</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-destructive" />
                            <span className="text-destructive font-medium text-sm">Missing files</span>
                          </>
                        )}
                      </div>
                      {!validation.valid && (
                        <ul className="mt-1 text-xs text-destructive">
                          {validation.errors.map((err, i) => <li key={i}>• {err}</li>)}
                        </ul>
                      )}
                    </div>
                  );
                })()}

                {/* Files Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2 text-xs font-medium">
                      <Clock className="w-3 h-3 text-purple-500" />
                      Scheduler
                    </div>
                    <p className="font-mono text-xs truncate">{selectedStrategy.schedulerFile}</p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2 text-xs font-medium">
                      <Code className="w-3 h-3 text-primary" />
                      Algorithms ({selectedStrategy.algorithmFiles.length})
                    </div>
                    <div className="space-y-1">
                      {selectedStrategy.algorithmFiles.slice(0, 3).map(f => (
                        <p key={f} className="font-mono text-xs truncate">{f}</p>
                      ))}
                      {selectedStrategy.algorithmFiles.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{selectedStrategy.algorithmFiles.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2 text-xs font-medium">
                      <Calculator className="w-3 h-3 text-yellow-500" />
                      Scoring ({selectedStrategy.scoringFiles.length})
                    </div>
                    <div className="space-y-1">
                      {selectedStrategy.scoringFiles.slice(0, 3).map(f => (
                        <p key={f} className="font-mono text-xs truncate">{f}</p>
                      ))}
                    </div>
                  </div>

                  {selectedStrategy.policyFiles.length > 0 && (
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2 text-xs font-medium">
                        <Shield className="w-3 h-3 text-green-500" />
                        Policies ({selectedStrategy.policyFiles.length})
                      </div>
                      <div className="space-y-1">
                        {selectedStrategy.policyFiles.slice(0, 3).map(f => (
                          <p key={f} className="font-mono text-xs truncate">{f}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleRunStrategy}
                    className="flex-1"
                    disabled={isRunning || isExecuting || !getValidationStatus(selectedStrategy).valid || !selectedDataFile}
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Run Strategy
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDeleteStrategy(selectedStrategy.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Zap className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Select a strategy</p>
                  <p className="text-xs">or create a new one</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
