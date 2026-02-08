/**
 * Strategy Execute Tab - Enhanced execution with working advanced options
 * Breakpoints, verify after step, seed, timeout — all connected to real state
 */

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Play,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Zap,
  Rocket,
  Timer,
  AlertCircle,
  Star,
  History,
  Settings,
  FileText,
  Workflow,
  ChevronDown,
  ChevronUp,
  Shield,
  Target,
  Hash,
  Bug,
  Eye,
  Gauge,
  HardDrive,
  StopCircle,
  Plus,
  X,
  Code,
} from 'lucide-react';
import { BinaryFile } from '@/lib/fileSystemManager';
import { predefinedManager } from '@/lib/predefinedManager';

interface StrategyTag {
  id: string;
  name: string;
  color: string;
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
  runCount: number;
  avgScore?: number;
  avgDuration?: number;
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

export interface Breakpoint {
  id: string;
  strategyId: string;
  type: 'operation' | 'line' | 'condition' | 'module' | 'step';
  operation?: string;
  fileName?: string;
  lineNumber?: number;
  condition?: string;
  conditionType?: 'metric' | 'budget' | 'step' | 'custom';
  moduleNames?: string[];
  stepIndex?: number;
  enabled: boolean;
  hitCount: number;
  action: 'break' | 'log' | 'skip';
  logMessage?: string;
}

export interface ExecutionOptions {
  enableParallel: boolean;
  autoNavigate: boolean;
  maxWorkers: number;
  stepMode: 'continuous' | 'step' | 'breakpoint';
  verifyAfterStep: boolean;
  logDetailedMetrics: boolean;
  storeFullHistory: boolean;
  saveMasksAndParams: boolean;
  seed: string;
  timeout: number;
  memoryLimit: number;
  budgetOverride: number | null;
  breakpoints: Breakpoint[];
}

// ETA estimation
const estimateETA = (
  strategy: EnhancedStrategy,
  dataFileSize: number,
  parallelEnabled: boolean,
  executionHistory: ExecutionHistoryEntry[] = []
): {
  minutes: number;
  seconds: number;
  confidence: 'high' | 'medium' | 'low';
  breakdown: { phase: string; seconds: number }[];
} => {
  const similarRuns = executionHistory.filter(h =>
    h.strategyId === strategy.id || h.strategyName === strategy.name
  );

  if (similarRuns.length >= 2) {
    const recentRuns = similarRuns.slice(0, 10);
    const avgDuration = recentRuns.reduce((sum, r) => sum + r.duration, 0) / recentRuns.length;
    const sizeMultiplier = dataFileSize > 0 ? Math.max(1, Math.log2(dataFileSize) / 10) : 1;
    const adjustedTime = avgDuration * sizeMultiplier * (parallelEnabled ? 0.7 : 1);
    const totalSeconds = Math.max(2, adjustedTime / 1000);
    return {
      minutes: Math.floor(totalSeconds / 60),
      seconds: Math.round(totalSeconds % 60),
      confidence: similarRuns.length >= 5 ? 'high' : 'medium',
      breakdown: [
        { phase: `Based on ${recentRuns.length} runs`, seconds: totalSeconds },
      ]
    };
  }

  const fileCount = 1 + strategy.algorithmFiles.length + strategy.scoringFiles.length +
    strategy.policyFiles.length + (strategy.customFiles?.length || 0);
  const pyodideOverhead = 3;
  const perFileTime = 1.5;
  const sizeLog2 = dataFileSize > 0 ? Math.log2(dataFileSize) : 0;
  const sizeSeconds = Math.max(0, sizeLog2 - 8) * 0.8;
  let totalSeconds = pyodideOverhead + (fileCount * perFileTime) + sizeSeconds;
  if (parallelEnabled && strategy.algorithmFiles.length > 1) {
    totalSeconds -= strategy.algorithmFiles.length * perFileTime * 0.3;
  }
  totalSeconds = Math.max(3, totalSeconds);
  const breakdown = [
    { phase: 'Pyodide Init', seconds: pyodideOverhead },
    { phase: 'Scheduler', seconds: Math.max(0.5, perFileTime + sizeSeconds * 0.2) },
    { phase: 'Algorithms', seconds: Math.max(1, strategy.algorithmFiles.length * perFileTime * (parallelEnabled ? 0.7 : 1)) },
    { phase: 'Scoring', seconds: Math.max(0.3, strategy.scoringFiles.length * 0.5) },
    { phase: 'Policies', seconds: Math.max(0.2, strategy.policyFiles.length * 0.3) },
  ];
  if (sizeSeconds > 0) breakdown.push({ phase: `Data (${dataFileSize} bits)`, seconds: sizeSeconds });

  return { minutes: Math.floor(totalSeconds / 60), seconds: Math.round(totalSeconds % 60), confidence: 'low', breakdown };
};

interface StrategyExecuteTabProps {
  strategies: EnhancedStrategy[];
  tags: StrategyTag[];
  binaryFiles: BinaryFile[];
  selectedStrategy: EnhancedStrategy | null;
  selectedDataFile: string;
  isRunning: boolean;
  isExecuting: boolean;
  executionStatus: string;
  executionProgress: number;
  executionHistory: ExecutionHistoryEntry[];
  executionOptions: ExecutionOptions;
  onSelectStrategy: (s: EnhancedStrategy | null) => void;
  onSelectDataFile: (id: string) => void;
  onUpdateOptions: (opts: Partial<ExecutionOptions>) => void;
  onRun: () => void;
}

export const StrategyExecuteTab = ({
  strategies,
  tags,
  binaryFiles,
  selectedStrategy,
  selectedDataFile,
  isRunning,
  isExecuting,
  executionStatus,
  executionProgress,
  executionHistory,
  executionOptions,
  onSelectStrategy,
  onSelectDataFile,
  onUpdateOptions,
  onRun,
}: StrategyExecuteTabProps) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showBreakpointDialog, setShowBreakpointDialog] = useState(false);
  const [newBpType, setNewBpType] = useState<Breakpoint['type']>('operation');
  const [newBpOp, setNewBpOp] = useState('');
  const [newBpCondition, setNewBpCondition] = useState('');
  const [newBpAction, setNewBpAction] = useState<Breakpoint['action']>('break');
  const [newBpStep, setNewBpStep] = useState<number>(0);

  const selectedDataFileSize = useMemo(() => {
    if (!selectedDataFile) return 0;
    const file = binaryFiles.find(f => f.id === selectedDataFile);
    return file?.state?.model?.getBits()?.length || 0;
  }, [selectedDataFile, binaryFiles]);

  const availableOperations = useMemo(() => predefinedManager.getAllOperations(), []);

  const handleAddBreakpoint = () => {
    if (!selectedStrategy) return;
    const bp: Breakpoint = {
      id: `bp_${Date.now()}`,
      strategyId: selectedStrategy.id,
      type: newBpType,
      operation: newBpType === 'operation' ? newBpOp : undefined,
      condition: newBpType === 'condition' ? newBpCondition : undefined,
      conditionType: newBpType === 'condition' ? 'custom' : undefined,
      stepIndex: newBpType === 'step' ? newBpStep : undefined,
      enabled: true,
      hitCount: 0,
      action: newBpAction,
    };
    onUpdateOptions({ breakpoints: [...executionOptions.breakpoints, bp] });
    setShowBreakpointDialog(false);
    setNewBpOp('');
    setNewBpCondition('');
  };

  const removeBreakpoint = (id: string) => {
    onUpdateOptions({ breakpoints: executionOptions.breakpoints.filter(bp => bp.id !== id) });
  };

  const toggleBreakpoint = (id: string) => {
    onUpdateOptions({
      breakpoints: executionOptions.breakpoints.map(bp =>
        bp.id === id ? { ...bp, enabled: !bp.enabled } : bp
      )
    });
  };

  return (
    <div className="h-full flex gap-3 p-3 overflow-hidden">
      {/* Left: Selection & Config */}
      <ScrollArea className="w-1/2">
        <div className="flex flex-col gap-3 pr-2">
          {/* Strategy Selection */}
          <Card>
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-xs flex items-center gap-2">
                <Workflow className="w-3 h-3 text-cyan-400" /> Select Strategy
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <Select
                value={selectedStrategy?.id || ''}
                onValueChange={(v) => onSelectStrategy(strategies.find(s => s.id === v) || null)}
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
              {selectedStrategy?.description && (
                <p className="text-[10px] text-muted-foreground mt-2">{selectedStrategy.description}</p>
              )}
            </CardContent>
          </Card>

          {/* Data File Selection */}
          <Card>
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-xs flex items-center gap-2">
                <FileText className="w-3 h-3 text-emerald-400" /> Select Data File
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <Select value={selectedDataFile} onValueChange={onSelectDataFile}>
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
                <Settings className="w-3 h-3 text-amber-400" /> Execution Options
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              <OptionRow icon={<Zap className="w-3 h-3 text-yellow-400" />} label="Parallel Operations">
                <Switch checked={executionOptions.enableParallel} onCheckedChange={(v) => onUpdateOptions({ enableParallel: v })} />
              </OptionRow>

              <OptionRow icon={<Rocket className="w-3 h-3 text-cyan-400" />} label="Auto-navigate to Timeline">
                <Switch checked={executionOptions.autoNavigate} onCheckedChange={(v) => onUpdateOptions({ autoNavigate: v })} />
              </OptionRow>

              <OptionRow icon={<Eye className="w-3 h-3 text-blue-400" />} label="Verify After Each Step">
                <Switch checked={executionOptions.verifyAfterStep} onCheckedChange={(v) => onUpdateOptions({ verifyAfterStep: v })} />
              </OptionRow>

              <OptionRow icon={<Shield className="w-3 h-3 text-emerald-400" />} label="Save Masks & Parameters">
                <Switch checked={executionOptions.saveMasksAndParams} onCheckedChange={(v) => onUpdateOptions({ saveMasksAndParams: v })} />
              </OptionRow>

              {/* Advanced Section */}
              <button
                type="button"
                className="w-full flex items-center justify-center gap-1 h-7 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded transition-colors"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Advanced Options
              </button>

              {showAdvanced && (
                <div className="space-y-3 pt-2 border-t animate-in fade-in-0 slide-in-from-top-1 duration-200">
                  {/* Step Mode */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Step Mode</Label>
                    <Select
                      value={executionOptions.stepMode}
                      onValueChange={(v: any) => onUpdateOptions({ stepMode: v })}
                    >
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="continuous">Continuous</SelectItem>
                        <SelectItem value="step">Step-by-Step</SelectItem>
                        <SelectItem value="breakpoint">Breakpoints Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Max Workers */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Max Parallel Workers</Label>
                    <Select
                      value={String(executionOptions.maxWorkers)}
                      onValueChange={(v) => onUpdateOptions({ maxWorkers: parseInt(v) })}
                    >
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 (Sequential)</SelectItem>
                        <SelectItem value="2">2 Workers</SelectItem>
                        <SelectItem value="4">4 Workers</SelectItem>
                        <SelectItem value="8">8 Workers</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Seed */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Hash className="w-3 h-3" /> Random Seed
                    </Label>
                    <Input
                      value={executionOptions.seed}
                      onChange={(e) => onUpdateOptions({ seed: e.target.value })}
                      placeholder="Leave empty for random"
                      className="h-7 text-xs font-mono"
                    />
                    <p className="text-[9px] text-muted-foreground">Same seed = reproducible masks & random params</p>
                  </div>

                  <OptionRow icon={<Gauge className="w-3 h-3 text-purple-400" />} label="Log Detailed Metrics">
                    <Switch checked={executionOptions.logDetailedMetrics} onCheckedChange={(v) => onUpdateOptions({ logDetailedMetrics: v })} />
                  </OptionRow>

                  <OptionRow icon={<HardDrive className="w-3 h-3 text-orange-400" />} label="Store Full Bit History">
                    <Switch checked={executionOptions.storeFullHistory} onCheckedChange={(v) => onUpdateOptions({ storeFullHistory: v })} />
                  </OptionRow>

                  <Separator />

                  {/* Timeout */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <StopCircle className="w-3 h-3" /> Timeout (seconds)
                    </Label>
                    <Input
                      type="number"
                      value={executionOptions.timeout}
                      onChange={(e) => onUpdateOptions({ timeout: parseInt(e.target.value) || 300 })}
                      className="h-7 text-xs"
                    />
                  </div>

                  {/* Memory Limit */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <HardDrive className="w-3 h-3" /> Memory Limit (MB)
                    </Label>
                    <Input
                      type="number"
                      value={executionOptions.memoryLimit}
                      onChange={(e) => onUpdateOptions({ memoryLimit: parseInt(e.target.value) || 512 })}
                      className="h-7 text-xs"
                    />
                  </div>

                  {/* Budget Override */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Budget Override (empty = from scoring file)</Label>
                    <Input
                      type="number"
                      value={executionOptions.budgetOverride ?? ''}
                      onChange={(e) => onUpdateOptions({ budgetOverride: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="Default from scoring"
                      className="h-7 text-xs"
                    />
                  </div>

                  <Separator />

                  {/* Breakpoints Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs flex items-center gap-1">
                        <Bug className="w-3 h-3 text-red-400" /> Breakpoints
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px]"
                        onClick={() => setShowBreakpointDialog(true)}
                        disabled={!selectedStrategy}
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add
                      </Button>
                    </div>

                    {executionOptions.breakpoints.length > 0 ? (
                      <div className="space-y-1">
                        {executionOptions.breakpoints.map(bp => (
                          <div key={bp.id} className={`flex items-center gap-2 p-1.5 rounded border text-xs ${bp.enabled ? 'bg-red-500/10 border-red-500/30' : 'opacity-50 border-muted'}`}>
                            <button
                              type="button"
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${bp.enabled ? 'bg-red-500' : 'bg-muted-foreground'}`}
                              onClick={() => toggleBreakpoint(bp.id)}
                            />
                            <span className="flex-1 truncate font-mono">
                              {bp.type === 'operation' && `on ${bp.operation}`}
                              {bp.type === 'step' && `at step ${bp.stepIndex}`}
                              {bp.type === 'condition' && `when ${bp.condition}`}
                              {bp.type === 'module' && `in module`}
                              {bp.type === 'line' && `line ${bp.lineNumber}`}
                            </span>
                            <Badge variant="outline" className="text-[9px] h-4 shrink-0">
                              {bp.action}
                            </Badge>
                            <button
                              type="button"
                              className="shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={() => removeBreakpoint(bp.id)}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">No breakpoints set</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Run Button */}
          <Button
            size="lg"
            className="w-full bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500"
            disabled={!selectedStrategy || !selectedDataFile || isRunning || isExecuting}
            onClick={onRun}
          >
            {isRunning || isExecuting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Running...</>
            ) : (
              <><Play className="w-4 h-4 mr-2" /> Execute Strategy</>
            )}
          </Button>
        </div>
      </ScrollArea>

      {/* Right: ETA & Status */}
      <ScrollArea className="w-1/2">
        <div className="flex flex-col gap-3 pl-1">
          {/* ETA Card */}
          {selectedStrategy && selectedDataFile && (
            <Card className="bg-gradient-to-br from-cyan-950/50 to-emerald-950/50">
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs flex items-center gap-2">
                  <Timer className="w-3 h-3 text-cyan-400" /> Estimated Time
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                {(() => {
                  const eta = estimateETA(selectedStrategy, selectedDataFileSize, executionOptions.enableParallel, executionHistory);
                  return (
                    <>
                      <div className="text-center mb-3">
                        <span className="text-3xl font-bold text-cyan-300">
                          {eta.minutes > 0 ? `${eta.minutes}m ` : ''}{eta.seconds}s
                        </span>
                        <Badge
                          variant="outline"
                          className={`ml-2 text-[9px] ${eta.confidence === 'high' ? 'text-emerald-400 border-emerald-400/50' :
                            eta.confidence === 'medium' ? 'text-amber-400 border-amber-400/50' :
                              'text-red-400 border-red-400/50'}`}
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
                      {executionOptions.enableParallel && (
                        <p className="text-[10px] text-emerald-400 text-center mt-2">
                          <Zap className="w-3 h-3 inline mr-1" /> Parallel mode: ~30% faster
                        </p>
                      )}
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* Active Config Summary */}
          {selectedStrategy && (
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs flex items-center gap-2">
                  <Settings className="w-3 h-3" /> Active Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-yellow-400" />
                    <span className="text-muted-foreground">Parallel:</span>
                    <span>{executionOptions.enableParallel ? 'On' : 'Off'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3 text-blue-400" />
                    <span className="text-muted-foreground">Verify:</span>
                    <span>{executionOptions.verifyAfterStep ? 'On' : 'Off'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Target className="w-3 h-3 text-purple-400" />
                    <span className="text-muted-foreground">Mode:</span>
                    <span className="capitalize">{executionOptions.stepMode}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Bug className="w-3 h-3 text-red-400" />
                    <span className="text-muted-foreground">Breakpoints:</span>
                    <span>{executionOptions.breakpoints.filter(b => b.enabled).length}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Hash className="w-3 h-3 text-orange-400" />
                    <span className="text-muted-foreground">Seed:</span>
                    <span className="font-mono truncate">{executionOptions.seed || 'random'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Shield className="w-3 h-3 text-emerald-400" />
                    <span className="text-muted-foreground">Masks:</span>
                    <span>{executionOptions.saveMasksAndParams ? 'Saved' : 'Off'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Execution Progress */}
          {(isRunning || isExecuting) && (
            <Card className="border-cyan-500/30">
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs flex items-center gap-2">
                  <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" /> Execution Progress
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
                <History className="w-3 h-3 text-amber-400" /> Recent Executions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="space-y-2">
                {executionHistory.slice(0, 10).map(entry => (
                  <div
                    key={entry.id}
                    className={`p-2 rounded border text-xs ${entry.success
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-red-500/10 border-red-500/30'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{entry.strategyName}</span>
                      {entry.success
                        ? <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        : <XCircle className="w-3 h-3 text-red-400" />}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                      <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                      <span>•</span>
                      <span>{entry.duration}ms</span>
                      {entry.success && (
                        <><span>•</span><span>Score: {entry.score.toFixed(1)}</span></>
                      )}
                    </div>
                  </div>
                ))}
                {executionHistory.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">No executions yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      {/* Breakpoint Dialog */}
      <Dialog open={showBreakpointDialog} onOpenChange={setShowBreakpointDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="w-4 h-4 text-red-400" /> Add Breakpoint
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={newBpType} onValueChange={(v: any) => setNewBpType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="operation">On Operation</SelectItem>
                  <SelectItem value="step">At Step Index</SelectItem>
                  <SelectItem value="condition">When Condition Met</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newBpType === 'operation' && (
              <div className="space-y-1">
                <Label className="text-xs">Operation</Label>
                <Select value={newBpOp} onValueChange={setNewBpOp}>
                  <SelectTrigger><SelectValue placeholder="Select operation..." /></SelectTrigger>
                  <SelectContent>
                    {availableOperations.map(op => (
                      <SelectItem key={op.id} value={op.id}>{op.id} — {op.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {newBpType === 'step' && (
              <div className="space-y-1">
                <Label className="text-xs">Step Index</Label>
                <Input
                  type="number"
                  min={0}
                  value={newBpStep}
                  onChange={(e) => setNewBpStep(parseInt(e.target.value) || 0)}
                />
              </div>
            )}

            {newBpType === 'condition' && (
              <div className="space-y-1">
                <Label className="text-xs">Condition (e.g. entropy &lt; 0.5, budget &lt; 100)</Label>
                <Input
                  value={newBpCondition}
                  onChange={(e) => setNewBpCondition(e.target.value)}
                  placeholder="entropy < 0.5"
                  className="font-mono"
                />
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Action</Label>
              <Select value={newBpAction} onValueChange={(v: any) => setNewBpAction(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="break">Pause execution</SelectItem>
                  <SelectItem value="log">Log message</SelectItem>
                  <SelectItem value="skip">Skip operation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBreakpointDialog(false)}>Cancel</Button>
            <Button onClick={handleAddBreakpoint}>Add Breakpoint</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const OptionRow = ({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      {icon}
      <Label className="text-xs">{label}</Label>
    </div>
    {children}
  </div>
);
