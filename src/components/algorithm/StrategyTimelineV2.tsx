/**
 * Strategy Timeline V2 - Enhanced timeline with full persistence and detail
 * Shows all execution runs with comprehensive step-by-step info
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Zap,
  Activity,
  ChevronRight,
  ChevronDown,
  History,
  Trash2,
  Download,
  FileJson,
} from 'lucide-react';
import { strategyExecutionEngine, ExecutionPipelineResult, StepResult } from '@/lib/strategyExecutionEngine';
import { toast } from 'sonner';

interface ExecutionStep {
  id: string;
  operation: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  duration: number;
  cost: number;
  bitRange?: { start: number; end: number };
  params?: Record<string, any>;
  error?: string;
  beforeBits?: string;
  afterBits?: string;
  metricsSnapshot?: Record<string, number>;
}

interface ExecutionRun {
  id: string;
  strategyName: string;
  timestamp: Date;
  steps: ExecutionStep[];
  totalDuration: number;
  success: boolean;
  score: number;
  initialBits?: string;
  finalBits?: string;
}

const TIMELINE_STORAGE_KEY = 'bsee_execution_timeline_v2';

interface StrategyTimelineV2Props {
  isExecuting?: boolean;
}

export const StrategyTimelineV2 = ({ isExecuting = false }: StrategyTimelineV2Props) => {
  const [runs, setRuns] = useState<ExecutionRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(true);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  // Load runs from storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TIMELINE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const loadedRuns = parsed.map((r: any) => ({ ...r, timestamp: new Date(r.timestamp) }));
        setRuns(loadedRuns);
        if (loadedRuns.length > 0 && !selectedRunId) {
          setSelectedRunId(loadedRuns[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load timeline:', e);
    }
  }, []);

  // Save runs to storage
  const saveRuns = (newRuns: ExecutionRun[]) => {
    setRuns(newRuns);
    // Keep last 100 runs
    const toSave = newRuns.slice(0, 100);
    localStorage.setItem(TIMELINE_STORAGE_KEY, JSON.stringify(toSave));
  };

  // Subscribe to execution engine
  useEffect(() => {
    const unsubscribe = strategyExecutionEngine.subscribe((result, status) => {
      if (result?.steps && status === 'completed') {
        // Build comprehensive step data
        const convertedSteps: ExecutionStep[] = result.steps.map((s, idx) => ({
          id: `step-${idx}-${Date.now()}`,
          operation: s.fileName || s.stepType || 'Unknown',
          status: 'completed' as const,
          duration: s.duration || 0,
          cost: s.transformations?.reduce((sum, t) => sum + (t.cost || 0), 0) || 0,
          bitRange: s.transformations?.[0]?.bitRanges?.[0] 
            ? { start: s.transformations[0].bitRanges[0].start, end: s.transformations[0].bitRanges[0].end }
            : undefined,
          params: s.transformations?.[0]?.params || {},
          beforeBits: (s as any).initialBits?.slice(0, 100),
          afterBits: s.bits?.slice(0, 100),
          metricsSnapshot: (s as any).metricsSnapshot || {},
        }));
        
        const newRun: ExecutionRun = {
          id: `run-${Date.now()}`,
          strategyName: result.strategyName || 'Unknown Strategy',
          timestamp: new Date(),
          steps: convertedSteps,
          totalDuration: result.totalDuration || 0,
          success: result.success,
          score: result.totalScore || 0,
          initialBits: result.initialBits?.slice(0, 200),
          finalBits: result.finalBits?.slice(0, 200),
        };
        
        const newRuns = [newRun, ...runs];
        saveRuns(newRuns);
        setSelectedRunId(newRun.id);
        setCurrentStepIndex(0);
        setIsPaused(true);
      }
    });

    return () => unsubscribe();
  }, [runs]);

  const selectedRun = runs.find(r => r.id === selectedRunId);
  const steps = selectedRun?.steps || [];
  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const failedSteps = steps.filter(s => s.status === 'failed').length;
  const progress = steps.length > 0 ? (completedSteps / steps.length) * 100 : 0;
  const currentStep = steps[currentStepIndex];
  const totalCost = steps.reduce((sum, s) => sum + (s.cost || 0), 0);
  const cumulativeCost = steps.slice(0, currentStepIndex + 1).reduce((sum, s) => sum + (s.cost || 0), 0);

  const handlePrevStep = () => {
    if (currentStepIndex > 0) setCurrentStepIndex(currentStepIndex - 1);
  };

  const handleNextStep = () => {
    if (currentStepIndex < steps.length - 1) setCurrentStepIndex(currentStepIndex + 1);
  };

  const handleDeleteRun = (runId: string) => {
    const newRuns = runs.filter(r => r.id !== runId);
    saveRuns(newRuns);
    if (selectedRunId === runId) {
      setSelectedRunId(newRuns[0]?.id || null);
    }
    toast.success('Run deleted');
  };

  const handleClearAll = () => {
    saveRuns([]);
    setSelectedRunId(null);
    toast.success('All runs cleared');
  };

  const handleExportRun = () => {
    if (!selectedRun) return;
    const blob = new Blob([JSON.stringify(selectedRun, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `run_${selectedRun.strategyName}_${selectedRun.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Run exported');
  };

  const toggleStepExpansion = (stepId: string) => {
    const next = new Set(expandedSteps);
    if (next.has(stepId)) {
      next.delete(stepId);
    } else {
      next.add(stepId);
    }
    setExpandedSteps(next);
  };

  if (runs.length === 0 && !isExecuting) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="bg-gradient-to-br from-cyan-950/20 via-background to-emerald-950/20 border-cyan-400/30 max-w-md">
          <CardContent className="py-12 text-center">
            <Activity className="w-16 h-16 mx-auto mb-4 text-cyan-400/30" />
            <p className="text-muted-foreground text-lg">No execution history</p>
            <p className="text-xs text-muted-foreground mt-2">
              Run a strategy to see the timeline
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-3 p-3 bg-gradient-to-br from-cyan-950/20 via-background to-emerald-950/20">
      {/* Header with Run Selector */}
      <Card className="bg-background/50 border-cyan-400/30">
        <CardContent className="py-2 px-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium text-cyan-100">Timeline</span>
              <Badge variant="outline" className="text-[10px] border-cyan-400/50 text-cyan-300">
                {runs.length} runs
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedRunId || ''} onValueChange={setSelectedRunId}>
                <SelectTrigger className="w-52 h-7 text-xs bg-background/50 border-cyan-400/30">
                  <SelectValue placeholder="Select run" />
                </SelectTrigger>
                <SelectContent>
                  {runs.map(run => (
                    <SelectItem key={run.id} value={run.id} className="text-xs">
                      {run.strategyName} - {run.timestamp.toLocaleTimeString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedRun && (
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleExportRun}>
                  <Download className="w-3 h-3" />
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400" onClick={handleClearAll}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Timeline View */}
      {selectedRun && (
        <div className="flex-1 flex gap-3 overflow-hidden">
          {/* Steps List */}
          <Card className="flex-1 bg-background/50 border-cyan-400/30 flex flex-col">
            <CardHeader className="py-2 px-3 border-b border-cyan-400/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2 text-cyan-100">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  {selectedRun.strategyName}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className={`text-[10px] ${selectedRun.success ? 'bg-green-500/20 text-green-300 border-green-500/50' : 'bg-red-500/20 text-red-300 border-red-500/50'}`}>
                    {selectedRun.success ? 'Success' : 'Failed'}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] border-yellow-400/50 text-yellow-300">
                    Score: {selectedRun.score.toFixed(2)}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden p-3">
              {/* Progress & Controls */}
              <div className="mb-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Step {currentStepIndex + 1} of {steps.length}</span>
                  <span className="text-cyan-300">{selectedRun.totalDuration.toFixed(0)}ms total</span>
                </div>
                <Progress value={((currentStepIndex + 1) / steps.length) * 100} className="h-1.5" />
                
                <div className="flex items-center justify-center gap-2">
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-cyan-400/30" onClick={handlePrevStep} disabled={currentStepIndex === 0}>
                    <SkipBack className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-cyan-400/30" onClick={handleNextStep} disabled={currentStepIndex >= steps.length - 1}>
                    <SkipForward className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Steps Timeline */}
              <ScrollArea className="h-[calc(100%-80px)]">
                <div className="relative space-y-1 pl-4">
                  {/* Timeline line */}
                  <div className="absolute left-1 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-400/50 via-emerald-400/50 to-cyan-400/50" />
                  
                  {steps.map((step, index) => (
                    <Collapsible key={step.id} open={expandedSteps.has(step.id)}>
                      <div
                        className={`relative rounded-lg border transition-all ${
                          index === currentStepIndex 
                            ? 'bg-cyan-500/15 border-cyan-400/60 shadow-lg shadow-cyan-500/10' 
                            : 'bg-background/30 border-border/50 hover:border-cyan-400/30'
                        }`}
                      >
                        {/* Timeline dot */}
                        <div className={`absolute -left-3 top-3 w-2 h-2 rounded-full border ${
                          step.status === 'completed' ? 'bg-green-400 border-green-400' :
                          step.status === 'failed' ? 'bg-red-400 border-red-400' :
                          'bg-muted-foreground border-muted-foreground'
                        }`} />

                        <CollapsibleTrigger 
                          className="w-full p-2 cursor-pointer"
                          onClick={() => {
                            setCurrentStepIndex(index);
                            toggleStepExpansion(step.id);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {expandedSteps.has(step.id) ? (
                                <ChevronDown className="w-3 h-3 text-cyan-400" />
                              ) : (
                                <ChevronRight className="w-3 h-3 text-muted-foreground" />
                              )}
                              <span className="font-mono text-xs">{step.operation}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <span className="flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                {step.duration.toFixed(1)}ms
                              </span>
                              <span className="flex items-center gap-0.5">
                                <Zap className="w-2.5 h-2.5" />
                                {step.cost}
                              </span>
                            </div>
                          </div>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="px-2 pb-2 pt-1 space-y-2 border-t border-border/30 mt-1">
                            {step.bitRange && (
                              <div className="text-[10px] text-muted-foreground">
                                Range: [{step.bitRange.start}:{step.bitRange.end}]
                              </div>
                            )}
                            {step.params && Object.keys(step.params).length > 0 && (
                              <div className="text-[10px]">
                                <span className="text-muted-foreground">Params:</span>
                                <code className="ml-1 text-cyan-300">{JSON.stringify(step.params)}</code>
                              </div>
                            )}
                            {step.beforeBits && (
                              <div className="text-[10px]">
                                <span className="text-muted-foreground">Before:</span>
                                <code className="ml-1 text-yellow-300 break-all">{step.beforeBits}...</code>
                              </div>
                            )}
                            {step.afterBits && (
                              <div className="text-[10px]">
                                <span className="text-muted-foreground">After:</span>
                                <code className="ml-1 text-green-300 break-all">{step.afterBits}...</code>
                              </div>
                            )}
                            {step.error && (
                              <div className="text-[10px] text-red-400 bg-red-500/10 p-1 rounded">
                                {step.error}
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Current Step Details */}
          <Card className="w-72 bg-background/50 border-cyan-400/30">
            <CardHeader className="py-2 px-3 border-b border-cyan-400/20">
              <CardTitle className="text-sm text-cyan-100">Step Details</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              {currentStep ? (
                <div className="space-y-3">
                  <div className="p-2 bg-muted/30 rounded">
                    <div className="text-[10px] text-muted-foreground">Operation</div>
                    <div className="font-mono text-sm font-medium">{currentStep.operation}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-muted/30 rounded">
                      <div className="text-[10px] text-muted-foreground">Duration</div>
                      <div className="font-mono text-sm">{currentStep.duration.toFixed(2)}ms</div>
                    </div>
                    <div className="p-2 bg-muted/30 rounded">
                      <div className="text-[10px] text-muted-foreground">Cost</div>
                      <div className="font-mono text-sm">{currentStep.cost}</div>
                    </div>
                  </div>
                  <div className="p-2 bg-muted/30 rounded">
                    <div className="text-[10px] text-muted-foreground">Cumulative Cost</div>
                    <div className="font-mono text-sm">{cumulativeCost} / {totalCost}</div>
                    <Progress value={(cumulativeCost / totalCost) * 100} className="h-1 mt-1" />
                  </div>
                  {currentStep.bitRange && (
                    <div className="p-2 bg-muted/30 rounded">
                      <div className="text-[10px] text-muted-foreground">Bit Range</div>
                      <div className="font-mono text-sm">[{currentStep.bitRange.start}:{currentStep.bitRange.end}]</div>
                    </div>
                  )}
                  <div className="p-2 bg-muted/30 rounded">
                    <div className="text-[10px] text-muted-foreground">Status</div>
                    <Badge className={`mt-1 text-[10px] ${
                      currentStep.status === 'completed' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                    }`}>
                      {currentStep.status}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground text-xs py-8">
                  Select a step to view details
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
