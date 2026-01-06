/**
 * Strategy Tab - Create and manage strategies
 * Runs strategies on selected data files, results go to Results tab
 * Budget is defined in Scoring files only
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
  Save,
  Play,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Code,
  Calculator,
  Shield,
  Clock,
  Loader2,
  FileText,
  Zap,
  FileCode,
} from 'lucide-react';
import { toast } from 'sonner';
import { pythonModuleSystem, PythonFile, StrategyConfig } from '@/lib/pythonModuleSystem';
import { fileSystemManager, BinaryFile } from '@/lib/fileSystemManager';
import { strategyExecutionEngine, ExecutionPipelineResult } from '@/lib/strategyExecutionEngine';
import { loadExampleAlgorithmFiles } from '@/lib/exampleAlgorithmFiles';

interface StrategyTabProps {
  onRunStrategy?: (strategy: StrategyConfig) => void;
  isExecuting?: boolean;
}

export const StrategyTab = ({ onRunStrategy, isExecuting = false }: StrategyTabProps) => {
  const [strategies, setStrategies] = useState<StrategyConfig[]>([]);
  const [files, setFiles] = useState<PythonFile[]>([]);
  const [binaryFiles, setBinaryFiles] = useState<BinaryFile[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyConfig | null>(null);
  const [selectedDataFile, setSelectedDataFile] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<string>('');

  // Form state for new strategy
  const [strategyName, setStrategyName] = useState('');
  const [selectedScheduler, setSelectedScheduler] = useState('');
  const [selectedAlgorithms, setSelectedAlgorithms] = useState<string[]>([]);
  const [selectedScoring, setSelectedScoring] = useState<string[]>([]);
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);

  useEffect(() => {
    // Load example files
    loadExampleAlgorithmFiles(pythonModuleSystem);
    
    setStrategies(pythonModuleSystem.getAllStrategies());
    setFiles(pythonModuleSystem.getAllFiles());
    setBinaryFiles(fileSystemManager.getFiles());
    
    const activeFile = fileSystemManager.getActiveFile();
    if (activeFile) setSelectedDataFile(activeFile.id);
    
    const unsubscribe1 = pythonModuleSystem.subscribe(() => {
      setStrategies(pythonModuleSystem.getAllStrategies());
      setFiles(pythonModuleSystem.getAllFiles());
    });
    const unsubscribe2 = fileSystemManager.subscribe(() => {
      setBinaryFiles(fileSystemManager.getFiles());
    });

    // Subscribe to execution engine updates
    const unsubscribe3 = strategyExecutionEngine.subscribe((result, status) => {
      setExecutionStatus(status);
      if (status === 'completed' && result?.success) {
        toast.success(`Strategy completed! Check Results tab for details.`);
      } else if (status === 'failed') {
        toast.error(`Strategy failed: ${result?.error || 'Unknown error'}`);
      }
    });

    return () => { 
      unsubscribe1(); 
      unsubscribe2(); 
      unsubscribe3();
    };
  }, []);

  const schedulerFiles = files.filter(f => f.group === 'scheduler');
  const algorithmFiles = files.filter(f => f.group === 'algorithm');
  const scoringFiles = files.filter(f => f.group === 'scoring');
  const policyFiles = files.filter(f => f.group === 'policies');
  const aiFiles = files.filter(f => f.group === 'ai');
  const customFiles = files.filter(f => f.group === 'custom');
  const customGroups = pythonModuleSystem.getCustomGroups();

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
      toast.error('Select a scheduler file (required)');
      return;
    }
    // Algorithm and scoring are now optional with warnings
    if (selectedAlgorithms.length === 0) {
      toast.warning('No algorithm files selected - strategy may not perform transformations');
    }
    if (selectedScoring.length === 0) {
      toast.warning('No scoring files selected - using default budget');
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
    if (!selectedStrategy) {
      toast.error('Select a strategy first');
      return;
    }

    if (!selectedDataFile) {
      toast.error('Select a data file first');
      return;
    }

    const validation = pythonModuleSystem.validateStrategy(selectedStrategy.id);
    if (!validation.valid) {
      toast.error(validation.errors.join(', '));
      return;
    }

    setIsRunning(true);
    toast.info('Starting strategy execution...');

    try {
      // Budget comes from scoring file - use default config
      const result = await strategyExecutionEngine.executeStrategy(
        selectedStrategy,
        selectedDataFile
      );

      if (result.success) {
        // Results are automatically saved to resultsManager by the engine
        toast.success(`Strategy completed! Score: ${result.totalScore.toFixed(2)} - Check Results tab`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Execution failed');
    } finally {
      setIsRunning(false);
      setExecutionStatus('');
    }
  };

  const getValidationStatus = (strategy: StrategyConfig) => {
    const validation = pythonModuleSystem.validateStrategy(strategy.id);
    return validation;
  };

  const FileCheckboxList = ({ 
    files, 
    selected, 
    onChange,
    emptyText 
  }: { 
    files: PythonFile[]; 
    selected: string[]; 
    onChange: (fileName: string) => void;
    emptyText: string;
  }) => (
    <div className="space-y-2 max-h-32 overflow-y-auto">
      {files.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyText}</p>
      ) : (
        files.map(f => (
          <div key={f.id} className="flex items-center gap-2">
            <Checkbox
              id={f.id}
              checked={selected.includes(f.name)}
              onCheckedChange={() => onChange(f.name)}
            />
            <label htmlFor={f.id} className="text-sm font-mono cursor-pointer">
              {f.name}
            </label>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col gap-4 p-4">
      {/* Data File Selection */}
      <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg flex-shrink-0">
        <div className="flex items-center gap-2 flex-1">
          <Label className="text-sm whitespace-nowrap">Data File:</Label>
          <Select value={selectedDataFile} onValueChange={setSelectedDataFile}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select data file to analyze..." />
            </SelectTrigger>
            <SelectContent>
              {binaryFiles.map(file => (
                <SelectItem key={file.id} value={file.id}>
                  {file.name} ({file.state.model.getBits().length} bits)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {executionStatus && (
          <Badge variant="secondary" className="animate-pulse">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            {executionStatus}
          </Badge>
        )}
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Left: Strategy List */}
        <div className="w-1/2 flex flex-col gap-4">
          {/* Create New Strategy */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create New Strategy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Strategy Name</Label>
                <Input
                  value={strategyName}
                  onChange={(e) => setStrategyName(e.target.value)}
                  placeholder="My Analysis Strategy"
                  className="h-9"
                />
              </div>

              {/* Scheduler - Required, Single Select */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-2">
                  <Clock className="w-3 h-3 text-purple-500" />
                  Scheduler File
                  <Badge variant="destructive" className="text-xs">Required</Badge>
                </Label>
                {schedulerFiles.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No scheduler files uploaded</p>
                ) : (
                  <Select value={selectedScheduler} onValueChange={setSelectedScheduler}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select scheduler" />
                    </SelectTrigger>
                    <SelectContent>
                      {schedulerFiles.map(f => (
                        <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Algorithm - Multiple Select */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-2">
                  <Code className="w-3 h-3 text-primary" />
                  Algorithm Files
                  <Badge variant="secondary" className="text-xs">{selectedAlgorithms.length} selected</Badge>
                </Label>
                <FileCheckboxList
                  files={algorithmFiles}
                  selected={selectedAlgorithms}
                  onChange={(name) => toggleFile(name, selectedAlgorithms, setSelectedAlgorithms)}
                  emptyText="No algorithm files uploaded"
                />
              </div>

              {/* Scoring - Multiple Select */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-2">
                  <Calculator className="w-3 h-3 text-yellow-500" />
                  Scoring Files
                  <Badge variant="secondary" className="text-xs">{selectedScoring.length} selected</Badge>
                  <span className="text-xs text-muted-foreground">(defines budget)</span>
                </Label>
                <FileCheckboxList
                  files={scoringFiles}
                  selected={selectedScoring}
                  onChange={(name) => toggleFile(name, selectedScoring, setSelectedScoring)}
                  emptyText="No scoring files uploaded"
                />
              </div>

              {/* Policies - Multiple Select (Optional) */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-2">
                  <Shield className="w-3 h-3 text-green-500" />
                  Policy Files
                  <Badge variant="outline" className="text-xs">Optional</Badge>
                </Label>
                <FileCheckboxList
                  files={policyFiles}
                  selected={selectedPolicies}
                  onChange={(name) => toggleFile(name, selectedPolicies, setSelectedPolicies)}
                  emptyText="No policy files uploaded"
                />
              </div>

              {/* AI Files - Multiple Select (Optional) */}
              {aiFiles.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-2">
                    <Zap className="w-3 h-3 text-cyan-500" />
                    AI Files
                    <Badge variant="secondary" className="text-xs bg-cyan-500/10 text-cyan-600">{aiFiles.length} available</Badge>
                  </Label>
                  <FileCheckboxList
                    files={aiFiles}
                    selected={selectedAlgorithms}
                    onChange={(name) => toggleFile(name, selectedAlgorithms, setSelectedAlgorithms)}
                    emptyText="No AI files uploaded"
                  />
                </div>
              )}

              {/* Custom Files - Multiple Select (Optional) */}
              {customFiles.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-2">
                    <FileCode className="w-3 h-3 text-orange-500" />
                    Custom Files
                    <Badge variant="secondary" className="text-xs bg-orange-500/10 text-orange-600">{customFiles.length} available</Badge>
                  </Label>
                  <FileCheckboxList
                    files={customFiles}
                    selected={selectedAlgorithms}
                    onChange={(name) => toggleFile(name, selectedAlgorithms, setSelectedAlgorithms)}
                    emptyText="No custom files uploaded"
                  />
                </div>
              )}

              {/* Custom Groups */}
              {customGroups.map(groupName => {
                const groupFiles = files.filter(f => f.customGroup === groupName);
                if (groupFiles.length === 0) return null;
                return (
                  <div key={groupName} className="space-y-2">
                    <Label className="text-xs flex items-center gap-2">
                      <FileCode className="w-3 h-3 text-violet-500" />
                      {groupName}
                      <Badge variant="secondary" className="text-xs">{groupFiles.length} files</Badge>
                    </Label>
                    <FileCheckboxList
                      files={groupFiles}
                      selected={selectedAlgorithms}
                      onChange={(name) => toggleFile(name, selectedAlgorithms, setSelectedAlgorithms)}
                      emptyText={`No ${groupName} files`}
                    />
                  </div>
                );
              })}

              <Button
                onClick={handleCreateStrategy}
                className="w-full"
                disabled={!strategyName || !selectedScheduler}
              >
                <Save className="w-4 h-4 mr-2" />
                Create Strategy
              </Button>
            </CardContent>
          </Card>

          {/* Strategy List */}
          <ScrollArea className="flex-1">
            <div className="space-y-2">
              {strategies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No strategies created yet</p>
                  <p className="text-sm mt-1">Upload files and create a strategy above</p>
                </div>
              ) : (
                strategies.map(strategy => {
                  const validation = getValidationStatus(strategy);
                  return (
                    <Card
                      key={strategy.id}
                      className={`cursor-pointer transition-colors ${
                        selectedStrategy?.id === strategy.id ? 'border-primary' : 'hover:bg-muted/30'
                      }`}
                      onClick={() => setSelectedStrategy(strategy)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{strategy.name}</h4>
                              {validation.valid ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-destructive" />
                              )}
                            </div>
                            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Clock className="w-3 h-3" />
                                {strategy.schedulerFile}
                              </div>
                              <div className="flex items-center gap-2">
                                <Code className="w-3 h-3" />
                                {strategy.algorithmFiles.length} algorithm(s)
                              </div>
                              <div className="flex items-center gap-2">
                                <Calculator className="w-3 h-3" />
                                {strategy.scoringFiles.length} scoring
                              </div>
                              {strategy.policyFiles.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <Shield className="w-3 h-3" />
                                  {strategy.policyFiles.length} policies
                                </div>
                              )}
                            </div>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteStrategy(strategy.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right: Selected Strategy Details */}
        <Card className="w-1/2 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {selectedStrategy ? selectedStrategy.name : 'Strategy Details'}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col overflow-hidden">
            {selectedStrategy ? (
              <>
                {/* Validation Status */}
                {(() => {
                  const validation = getValidationStatus(selectedStrategy);
                  return (
                    <div className={`p-3 rounded-lg mb-4 ${validation.valid ? 'bg-green-500/10' : 'bg-destructive/10'}`}>
                      <div className="flex items-center gap-2">
                        {validation.valid ? (
                          <>
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                            <span className="text-green-500 font-medium">Ready to run</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-5 h-5 text-destructive" />
                            <span className="text-destructive font-medium">Missing files</span>
                          </>
                        )}
                      </div>
                      {!validation.valid && (
                        <ul className="mt-2 text-sm text-destructive">
                          {validation.errors.map((err, i) => (
                            <li key={i}>• {err}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })()}

                {/* File Details */}
                <ScrollArea className="flex-1">
                  <div className="space-y-4">
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-purple-500" />
                        <span className="font-medium">Scheduler</span>
                      </div>
                      <p className="font-mono text-sm">{selectedStrategy.schedulerFile}</p>
                    </div>

                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Code className="w-4 h-4 text-primary" />
                        <span className="font-medium">Algorithms ({selectedStrategy.algorithmFiles.length})</span>
                      </div>
                      <div className="space-y-1">
                        {selectedStrategy.algorithmFiles.map(f => (
                          <p key={f} className="font-mono text-sm">{f}</p>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Calculator className="w-4 h-4 text-yellow-500" />
                        <span className="font-medium">Scoring ({selectedStrategy.scoringFiles.length})</span>
                        <span className="text-xs text-muted-foreground">(defines budget)</span>
                      </div>
                      <div className="space-y-1">
                        {selectedStrategy.scoringFiles.map(f => (
                          <p key={f} className="font-mono text-sm">{f}</p>
                        ))}
                      </div>
                    </div>

                    {selectedStrategy.policyFiles.length > 0 && (
                      <div className="p-3 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="w-4 h-4 text-green-500" />
                          <span className="font-medium">Policies ({selectedStrategy.policyFiles.length})</span>
                        </div>
                        <div className="space-y-1">
                          {selectedStrategy.policyFiles.map(f => (
                            <p key={f} className="font-mono text-sm">{f}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Info about results */}
                    <div className="p-3 border rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-primary" />
                        <span className="font-medium">Results</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Results will be saved to the Results tab with full CSV export, 
                        step-by-step transformations, and metrics comparison.
                      </p>
                    </div>
                  </div>
                </ScrollArea>

                {/* Run Button */}
                <Button
                  onClick={handleRunStrategy}
                  className="w-full mt-4"
                  disabled={isRunning || isExecuting || !getValidationStatus(selectedStrategy).valid || !selectedDataFile}
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {executionStatus || 'Executing...'}
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Run Strategy
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Code className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select a strategy to view details</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
