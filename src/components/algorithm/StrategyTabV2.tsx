/**
 * Strategy Tab V2 - Completely redesigned with distinct visual identity
 * Features: Custom groups, unified strategy example, visual differentiation from Results
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Layers,
  Sparkles,
  FileCode,
  Target,
  Settings2,
  Wand2,
  BookOpen,
  Brain,
} from 'lucide-react';
import { toast } from 'sonner';
import { pythonModuleSystem, PythonFile, StrategyConfig } from '@/lib/pythonModuleSystem';
import { fileSystemManager, BinaryFile } from '@/lib/fileSystemManager';
import { strategyExecutionEngine } from '@/lib/strategyExecutionEngine';
import { loadExampleAlgorithmFiles } from '@/lib/exampleAlgorithmFiles';
import { 
  UNIFIED_SCHEDULER_V2, 
  UNIFIED_ALGORITHM_V2, 
  UNIFIED_SCORING_V2,
  UNIFIED_POLICY_V2,
  ALL_OPERATIONS,
  ALL_METRICS
} from '@/lib/unifiedStrategy';

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
  const [activeTab, setActiveTab] = useState<'browse' | 'create' | 'examples'>('browse');

  // Form state for new strategy
  const [strategyName, setStrategyName] = useState('');
  const [strategyDescription, setStrategyDescription] = useState('');
  const [selectedScheduler, setSelectedScheduler] = useState('');
  const [selectedAlgorithms, setSelectedAlgorithms] = useState<string[]>([]);
  const [selectedScoring, setSelectedScoring] = useState<string[]>([]);
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);

  // Custom groups
  const [customGroups, setCustomGroups] = useState<string[]>([]);
  const [newGroupName, setNewGroupName] = useState('');

  useEffect(() => {
    loadExampleAlgorithmFiles(pythonModuleSystem);
    
    setStrategies(pythonModuleSystem.getAllStrategies());
    setFiles(pythonModuleSystem.getAllFiles());
    setBinaryFiles(fileSystemManager.getFiles());
    setCustomGroups(pythonModuleSystem.getCustomGroups());
    
    const activeFile = fileSystemManager.getActiveFile();
    if (activeFile) setSelectedDataFile(activeFile.id);
    
    const unsub1 = pythonModuleSystem.subscribe(() => {
      setStrategies(pythonModuleSystem.getAllStrategies());
      setFiles(pythonModuleSystem.getAllFiles());
      setCustomGroups(pythonModuleSystem.getCustomGroups());
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
  const aiFiles = files.filter(f => f.group === 'ai');

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

  const handleAddCustomGroup = () => {
    if (newGroupName.trim() && !customGroups.includes(newGroupName.trim())) {
      pythonModuleSystem.registerCustomGroup(newGroupName.trim());
      setNewGroupName('');
      toast.success(`Group "${newGroupName.trim()}" created`);
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
      setStrategyDescription('');
      setSelectedScheduler('');
      setSelectedAlgorithms([]);
      setSelectedScoring([]);
      setSelectedPolicies([]);
      setActiveTab('browse');
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

  const handleLoadUnifiedExample = () => {
    // Add unified strategy files
    pythonModuleSystem.addFile('UnifiedScheduler.py', UNIFIED_SCHEDULER_V2, 'scheduler');
    pythonModuleSystem.addFile('UnifiedAlgorithm.py', UNIFIED_ALGORITHM_V2, 'algorithm');
    pythonModuleSystem.addFile('UnifiedScoring.py', UNIFIED_SCORING_V2, 'scoring');
    pythonModuleSystem.addFile('UnifiedPolicy.py', UNIFIED_POLICY_V2, 'policies');
    
    toast.success('Unified strategy example loaded! Files added to respective groups.');
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
    <div className="h-full flex flex-col p-3 bg-gradient-to-br from-cyan-950/20 via-background to-emerald-950/20">
      {/* Header with neon styling */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-cyan-400/40 shadow-[0_0_15px_rgba(0,255,255,0.1)]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-400/40 shadow-[0_0_10px_rgba(0,255,255,0.2)]">
            <Layers className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_5px_rgba(0,255,255,0.5)]" />
          </div>
          <div>
            <h2 className="font-semibold text-cyan-100 drop-shadow-[0_0_5px_rgba(0,255,255,0.3)]">Strategy Builder</h2>
            <p className="text-xs text-muted-foreground">{strategies.length} strategies • {files.length} files</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedDataFile} onValueChange={setSelectedDataFile}>
            <SelectTrigger className="w-40 h-8 bg-background/50 border-cyan-400/30 focus:border-cyan-400/60 focus:shadow-[0_0_10px_rgba(0,255,255,0.2)]">
              <SelectValue placeholder="Data file" />
            </SelectTrigger>
            <SelectContent>
              {binaryFiles.map(file => (
                <SelectItem key={file.id} value={file.id}>
                  {file.name} ({file.state.model.getBits().length}b)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {executionStatus && (
            <Badge className="bg-cyan-500/20 border-cyan-400/50 animate-pulse shadow-[0_0_10px_rgba(0,255,255,0.3)]">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              {executionStatus}
            </Badge>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-3 overflow-hidden">
        {/* Left Panel - Strategy List with Tabs */}
        <div className="w-2/5 flex flex-col">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
            <TabsList className="grid grid-cols-3 mb-2 bg-cyan-950/50">
              <TabsTrigger value="browse" className="text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-emerald-600 data-[state=active]:shadow-[0_0_10px_rgba(0,255,255,0.3)]">
                <Search className="w-3 h-3 mr-1" />
                Browse
              </TabsTrigger>
              <TabsTrigger value="create" className="text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-emerald-600 data-[state=active]:shadow-[0_0_10px_rgba(0,255,255,0.3)]">
                <Plus className="w-3 h-3 mr-1" />
                Create
              </TabsTrigger>
              <TabsTrigger value="examples" className="text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-emerald-600 data-[state=active]:shadow-[0_0_10px_rgba(0,255,255,0.3)]">
                <BookOpen className="w-3 h-3 mr-1" />
                Examples
              </TabsTrigger>
            </TabsList>

            <TabsContent value="browse" className="flex-1 flex flex-col gap-2 mt-0">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400/60" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search strategies..."
                  className="pl-8 h-8 bg-background/50 border-cyan-400/30 focus:border-cyan-400/60 focus:shadow-[0_0_10px_rgba(0,255,255,0.15)]"
                />
              </div>
              
              <ScrollArea className="flex-1">
                <div className="space-y-2 pr-2">
                  {filteredStrategies.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No strategies</p>
                      <Button size="sm" variant="link" onClick={() => setActiveTab('examples')}>
                        Load examples
                      </Button>
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
                              ? 'bg-cyan-500/15 border-cyan-400/70 shadow-lg shadow-cyan-500/20' 
                              : 'bg-background/30 border-cyan-500/20 hover:border-cyan-400/50 hover:bg-cyan-500/10'
                          }`}
                          onClick={() => setSelectedStrategy(strategy)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded ${validation.valid ? 'bg-green-500/20' : 'bg-destructive/20'}`}>
                                  {validation.valid ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-destructive" />
                                  )}
                                </div>
                                <span className="font-medium text-sm">{strategy.name}</span>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                onClick={(e) => { e.stopPropagation(); handleDeleteStrategy(strategy.id); }}
                              >
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </Button>
                            </div>
                            
                            <div className="flex flex-wrap gap-1">
                              <Badge variant="outline" className="text-[10px] border-purple-500/50 text-purple-300">
                                <Clock className="w-2.5 h-2.5 mr-1" />
                                {strategy.schedulerFile.replace('.py', '')}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] border-blue-500/50 text-blue-300">
                                <Code className="w-2.5 h-2.5 mr-1" />
                                {strategy.algorithmFiles.length} alg
                              </Badge>
                              <Badge variant="outline" className="text-[10px] border-yellow-500/50 text-yellow-300">
                                <Calculator className="w-2.5 h-2.5 mr-1" />
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
            </TabsContent>

            <TabsContent value="create" className="flex-1 overflow-auto mt-0">
              <Card className="bg-background/30 border-cyan-400/20">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2 text-cyan-200">
                    <Wand2 className="w-4 h-4 text-cyan-400" />
                    Create New Strategy
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs text-cyan-200">Strategy Name</Label>
                    <Input
                      value={strategyName}
                      onChange={(e) => setStrategyName(e.target.value)}
                      placeholder="My Strategy"
                      className="h-8 mt-1 bg-background/50 border-cyan-400/30 focus:border-cyan-400/60"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-cyan-200">Description (optional)</Label>
                    <Textarea
                      value={strategyDescription}
                      onChange={(e) => setStrategyDescription(e.target.value)}
                      placeholder="What this strategy does..."
                      className="mt-1 min-h-[60px] bg-background/50 border-cyan-400/30"
                    />
                  </div>

                  <div>
                    <Label className="text-xs flex items-center gap-2 text-cyan-200">
                      <Clock className="w-3 h-3 text-cyan-400" />
                      Scheduler
                      <Badge className="text-[10px] h-4 bg-pink-500/20 text-pink-300 border-pink-500/50">Required</Badge>
                    </Label>
                    <Select value={selectedScheduler} onValueChange={setSelectedScheduler}>
                      <SelectTrigger className="h-8 mt-1 bg-background/50 border-cyan-400/30">
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
                    <Label className="text-xs flex items-center gap-2 text-cyan-200">
                      <Code className="w-3 h-3 text-emerald-400" />
                      Algorithms ({selectedAlgorithms.length} selected)
                    </Label>
                    <ScrollArea className="h-20 mt-1 border border-cyan-400/30 rounded-md p-2 bg-background/30">
                      {algorithmFiles.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No algorithm files. Load examples first.</p>
                      ) : (
                        algorithmFiles.map(f => (
                          <div key={f.id} className="flex items-center gap-2 py-1">
                            <Checkbox
                              checked={selectedAlgorithms.includes(f.name)}
                              onCheckedChange={() => toggleFile(f.name, selectedAlgorithms, setSelectedAlgorithms)}
                            />
                            <span className="text-xs font-mono truncate">{f.name}</span>
                          </div>
                        ))
                      )}
                    </ScrollArea>
                  </div>

                  <div>
                    <Label className="text-xs flex items-center gap-2 text-cyan-200">
                      <Calculator className="w-3 h-3 text-yellow-400" />
                      Scoring ({selectedScoring.length} selected)
                    </Label>
                    <ScrollArea className="h-16 mt-1 border border-cyan-400/30 rounded-md p-2 bg-background/30">
                      {scoringFiles.map(f => (
                        <div key={f.id} className="flex items-center gap-2 py-1">
                          <Checkbox
                            checked={selectedScoring.includes(f.name)}
                            onCheckedChange={() => toggleFile(f.name, selectedScoring, setSelectedScoring)}
                          />
                          <span className="text-xs font-mono truncate">{f.name}</span>
                        </div>
                      ))}
                    </ScrollArea>
                  </div>

                  {/* Custom Groups Section */}
                  <div className="pt-2 border-t border-cyan-400/20">
                    <Label className="text-xs flex items-center gap-2 text-cyan-200 mb-2">
                      <FolderOpen className="w-3 h-3 text-pink-400" />
                      Custom Groups
                    </Label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="New group name..."
                        className="h-7 text-xs flex-1 bg-background/50 border-cyan-400/30"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddCustomGroup()}
                      />
                      <Button size="sm" className="h-7 text-xs bg-cyan-600 hover:bg-cyan-500" onClick={handleAddCustomGroup}>
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {customGroups.map(group => (
                        <Badge 
                          key={group} 
                          variant="outline" 
                          className="text-[10px] border-orange-500/50 text-orange-300"
                        >
                          {group}
                        </Badge>
                      ))}
                      {customGroups.length === 0 && (
                        <span className="text-[10px] text-muted-foreground">No custom groups</span>
                      )}
                    </div>
                  </div>

                  <Button className="w-full bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 shadow-[0_0_15px_rgba(0,255,255,0.2)]" onClick={handleCreateStrategy}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Strategy
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="examples" className="flex-1 overflow-auto mt-0">
              <div className="space-y-3">
                {/* Unified Strategy Example - Featured */}
                <Card className="bg-gradient-to-br from-cyan-600/20 to-emerald-600/20 border-cyan-400/50 shadow-[0_0_20px_rgba(0,255,255,0.1)]">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-yellow-400 drop-shadow-[0_0_5px_rgba(255,255,0,0.5)]" />
                      <span className="text-cyan-100 drop-shadow-[0_0_3px_rgba(0,255,255,0.3)]">Unified Comprehensive Strategy</span>
                      <Badge className="bg-pink-500/20 text-pink-300 border-pink-500/50 shadow-[0_0_8px_rgba(255,0,255,0.2)]">Featured</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Complete testing framework that verifies ALL {ALL_OPERATIONS.length} operations and {ALL_METRICS.length}+ metrics. 
                      Includes scheduler, algorithm, scoring, and policy files.
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded bg-background/30 border border-cyan-400/20">
                        <div className="font-medium text-cyan-200 mb-1">Scheduler</div>
                        <code className="text-[10px] text-pink-300">UnifiedScheduler.py</code>
                      </div>
                      <div className="p-2 rounded bg-background/30 border border-cyan-400/20">
                        <div className="font-medium text-cyan-200 mb-1">Algorithm</div>
                        <code className="text-[10px] text-emerald-300">UnifiedAlgorithm.py</code>
                      </div>
                      <div className="p-2 rounded bg-background/30 border border-cyan-400/20">
                        <div className="font-medium text-cyan-200 mb-1">Scoring</div>
                        <code className="text-[10px] text-yellow-300">UnifiedScoring.py</code>
                      </div>
                      <div className="p-2 rounded bg-background/30 border border-cyan-400/20">
                        <div className="font-medium text-cyan-200 mb-1">Policy</div>
                        <code className="text-[10px] text-cyan-300">UnifiedPolicy.py</code>
                      </div>
                    </div>
                    <Button className="w-full bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 shadow-[0_0_15px_rgba(0,255,255,0.2)]" onClick={handleLoadUnifiedExample}>
                      <Zap className="w-4 h-4 mr-2" />
                      Load Unified Strategy
                    </Button>
                  </CardContent>
                </Card>

                {/* Basic Example */}
                <Card className="bg-background/30 border-cyan-400/20">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2 text-cyan-200">
                      <Target className="w-4 h-4 text-emerald-400" />
                      Basic Entropy Reduction
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-3">
                      Simple strategy focused on reducing entropy through targeted operations.
                    </p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full border-cyan-400/30 hover:bg-cyan-500/10"
                      onClick={() => {
                        loadExampleAlgorithmFiles(pythonModuleSystem);
                        toast.success('Basic example files loaded');
                      }}
                    >
                      Load Basic Examples
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Panel - Strategy Details */}
        <Card className="flex-1 flex flex-col overflow-hidden bg-background/30 border-cyan-400/20">
          {selectedStrategy ? (
            <>
              <CardHeader className="py-3 border-b border-cyan-400/20 bg-gradient-to-r from-cyan-500/10 to-transparent">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2 text-cyan-100">
                    <Settings2 className="w-4 h-4" />
                    {selectedStrategy.name}
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive h-7"
                    onClick={() => handleDeleteStrategy(selectedStrategy.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto p-4 space-y-4">
                {/* Validation Status */}
                {(() => {
                  const validation = getValidationStatus(selectedStrategy);
                  return (
                    <div className={`p-3 rounded-lg border ${
                      validation.valid 
                        ? 'bg-green-500/10 border-green-500/30' 
                        : 'bg-destructive/10 border-destructive/30'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {validation.valid ? (
                          <>
                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                            <span className="text-green-400 font-medium">Ready to Execute</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-5 h-5 text-destructive" />
                            <span className="text-destructive font-medium">Configuration Issues</span>
                          </>
                        )}
                      </div>
                      {validation.errors.length > 0 && (
                        <ul className="text-xs text-destructive space-y-1">
                          {validation.errors.map((err, i) => <li key={i}>• {err}</li>)}
                        </ul>
                      )}
                      {validation.warnings.length > 0 && (
                        <ul className="text-xs text-yellow-400 space-y-1 mt-2">
                          {validation.warnings.map((warn, i) => <li key={i}>⚠ {warn}</li>)}
                        </ul>
                      )}
                    </div>
                  );
                })()}

                {/* Strategy Components */}
                <div className="grid gap-3">
                  {/* Scheduler */}
                  <div className="p-3 rounded-lg border border-purple-500/30 bg-purple-500/5">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded bg-purple-500/20">
                        <Clock className="w-4 h-4 text-purple-400" />
                      </div>
                      <span className="font-medium text-sm text-purple-200">Scheduler</span>
                    </div>
                    <code className="text-xs font-mono text-purple-300 bg-background/30 px-2 py-1 rounded">
                      {selectedStrategy.schedulerFile}
                    </code>
                  </div>

                  {/* Algorithms */}
                  <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/5">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded bg-blue-500/20">
                        <Code className="w-4 h-4 text-blue-400" />
                      </div>
                      <span className="font-medium text-sm text-blue-200">
                        Algorithms ({selectedStrategy.algorithmFiles.length})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedStrategy.algorithmFiles.map(f => (
                        <Badge key={f} variant="outline" className="text-[10px] border-blue-500/50 text-blue-300 font-mono">
                          {f}
                        </Badge>
                      ))}
                      {selectedStrategy.algorithmFiles.length === 0 && (
                        <span className="text-xs text-muted-foreground">None selected</span>
                      )}
                    </div>
                  </div>

                  {/* Scoring */}
                  <div className="p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded bg-yellow-500/20">
                        <Calculator className="w-4 h-4 text-yellow-400" />
                      </div>
                      <span className="font-medium text-sm text-yellow-200">
                        Scoring ({selectedStrategy.scoringFiles.length})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedStrategy.scoringFiles.map(f => (
                        <Badge key={f} variant="outline" className="text-[10px] border-yellow-500/50 text-yellow-300 font-mono">
                          {f}
                        </Badge>
                      ))}
                      {selectedStrategy.scoringFiles.length === 0 && (
                        <span className="text-xs text-muted-foreground">Using default budget</span>
                      )}
                    </div>
                  </div>

                  {/* Policies */}
                  {selectedStrategy.policyFiles.length > 0 && (
                    <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/5">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded bg-green-500/20">
                          <Shield className="w-4 h-4 text-green-400" />
                        </div>
                        <span className="font-medium text-sm text-green-200">
                          Policies ({selectedStrategy.policyFiles.length})
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {selectedStrategy.policyFiles.map(f => (
                          <Badge key={f} variant="outline" className="text-[10px] border-green-500/50 text-green-300 font-mono">
                            {f}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Run Button */}
                <Button
                  onClick={handleRunStrategy}
                  className="w-full h-12 text-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-500/20"
                  disabled={isRunning || isExecuting || !getValidationStatus(selectedStrategy).valid || !selectedDataFile}
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      Execute Strategy
                    </>
                  )}
                </Button>
              </CardContent>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Layers className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium mb-2">No Strategy Selected</p>
                <p className="text-sm">Choose a strategy from the list or create a new one</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};