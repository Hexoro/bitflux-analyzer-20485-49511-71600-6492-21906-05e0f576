/**
 * Strategy Timeline V3 - Enhanced timeline with reasoning export and parallel ops support
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
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
  FileText,
  Code,
  GitBranch,
  Layers,
  Pin,
  PinOff,
} from 'lucide-react';
import { strategyExecutionEngine, ExecutionPipelineResult } from '@/lib/strategyExecutionEngine';
import { CodeContextView, ReasoningEntry } from '@/components/player/CodeContextView';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

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
  // Code context for this step
  codeContext?: {
    fileName: string;
    lineNumber: number;
    lineContent: string;
    contextBefore: string[];
    contextAfter: string[];
    condition?: string;
    conditionResult?: boolean;
  };
  // Reasoning for why this step happened
  reasoning?: ReasoningEntry;
  // Parallel execution info
  parallelGroup?: string;
  isParallel?: boolean;
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
  // Persistence flags
  pinned: boolean;
  deletedAt?: number;
}

const TIMELINE_STORAGE_KEY = 'bsee_execution_timeline_v3';
const MAX_RUNS = 500;

interface ExportOptions {
  includeCode: boolean;
  includeReasoning: boolean;
  includeBits: 'all' | 'summary' | 'none';
  format: 'pdf' | 'json' | 'html';
}

interface StrategyTimelineV3Props {
  isExecuting?: boolean;
}

export const StrategyTimelineV3 = ({ isExecuting = false }: StrategyTimelineV3Props) => {
  const [runs, setRuns] = useState<ExecutionRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeCode: true,
    includeReasoning: true,
    includeBits: 'summary',
    format: 'json',
  });
  const [showCodeContext, setShowCodeContext] = useState(false);

  // Load runs from storage (excluding soft-deleted)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TIMELINE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const loadedRuns = parsed
          .map((r: any) => ({ ...r, timestamp: new Date(r.timestamp) }))
          .filter((r: ExecutionRun) => !r.deletedAt);
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
    setRuns(newRuns.filter(r => !r.deletedAt));
    // Keep last MAX_RUNS (but keep all pinned)
    const pinned = newRuns.filter(r => r.pinned);
    const unpinned = newRuns.filter(r => !r.pinned).slice(0, MAX_RUNS - pinned.length);
    const toSave = [...pinned, ...unpinned];
    localStorage.setItem(TIMELINE_STORAGE_KEY, JSON.stringify(toSave));
  };

  // Subscribe to execution engine
  useEffect(() => {
    const unsubscribe = strategyExecutionEngine.subscribe((result, status) => {
      if (result?.steps && status === 'completed') {
        // Generate reasoning for each step
        const convertedSteps: ExecutionStep[] = result.steps.map((s, idx) => {
          // Simulate reasoning based on step data
          const reasoning: ReasoningEntry = {
            condition: `Step ${idx} trigger condition`,
            conditionValue: s.metrics || {},
            result: true,
            explanation: `${s.stepType} step executed ${s.fileName} which applied ${s.transformations?.length || 0} transformations`,
            branchTaken: 'execute',
            alternatives: s.transformations?.length === 0 ? ['Could have applied different operations'] : [],
          };

          return {
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
            metricsSnapshot: s.metrics || {},
            codeContext: {
              fileName: s.fileName,
              lineNumber: 1,
              lineContent: `execute(bits, budget)`,
              contextBefore: ['# Strategy step'],
              contextAfter: ['# End step'],
            },
            reasoning,
          };
        });
        
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
          pinned: false,
        };
        
        const newRuns = [newRun, ...runs];
        saveRuns(newRuns);
        setSelectedRunId(newRun.id);
        setCurrentStepIndex(0);
      }
    });

    return () => unsubscribe();
  }, [runs]);

  const selectedRun = runs.find(r => r.id === selectedRunId);
  const steps = selectedRun?.steps || [];
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
    // Soft delete
    const updated = runs.map(r => r.id === runId ? { ...r, deletedAt: Date.now() } : r);
    saveRuns(updated);
    if (selectedRunId === runId) {
      const remaining = updated.filter(r => !r.deletedAt);
      setSelectedRunId(remaining[0]?.id || null);
    }
    toast.success('Run deleted');
  };

  const handleClearAll = () => {
    // Keep pinned runs
    const pinned = runs.filter(r => r.pinned);
    saveRuns(pinned);
    setSelectedRunId(pinned[0]?.id || null);
    toast.success('Unpinned runs cleared');
  };

  const handleTogglePin = (runId: string) => {
    const updated = runs.map(r => r.id === runId ? { ...r, pinned: !r.pinned } : r);
    saveRuns(updated);
    toast.success(runs.find(r => r.id === runId)?.pinned ? 'Unpinned' : 'Pinned');
  };

  const handleExport = () => {
    if (!selectedRun) return;

    const exportData = {
      run: {
        id: selectedRun.id,
        strategyName: selectedRun.strategyName,
        timestamp: selectedRun.timestamp,
        totalDuration: selectedRun.totalDuration,
        success: selectedRun.success,
        score: selectedRun.score,
      },
      steps: selectedRun.steps.map(step => ({
        operation: step.operation,
        duration: step.duration,
        cost: step.cost,
        bitRange: step.bitRange,
        params: step.params,
        status: step.status,
        ...(exportOptions.includeCode && step.codeContext ? { codeContext: step.codeContext } : {}),
        ...(exportOptions.includeReasoning && step.reasoning ? { reasoning: step.reasoning } : {}),
        ...(exportOptions.includeBits === 'all' ? { beforeBits: step.beforeBits, afterBits: step.afterBits } : {}),
        ...(exportOptions.includeBits === 'summary' ? { 
          bitsSummary: `Before: ${step.beforeBits?.length || 0} chars, After: ${step.afterBits?.length || 0} chars` 
        } : {}),
        metrics: step.metricsSnapshot,
      })),
      ...(exportOptions.includeBits !== 'none' ? {
        initialBits: exportOptions.includeBits === 'all' ? selectedRun.initialBits : `${selectedRun.initialBits?.length || 0} bits`,
        finalBits: exportOptions.includeBits === 'all' ? selectedRun.finalBits : `${selectedRun.finalBits?.length || 0} bits`,
      } : {}),
    };

    if (exportOptions.format === 'json') {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timeline_${selectedRun.strategyName}_${selectedRun.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (exportOptions.format === 'pdf') {
      const pdf = new jsPDF();
      let y = 20;
      
      pdf.setFontSize(16);
      pdf.text('Execution Timeline Report', 20, y);
      y += 15;
      
      pdf.setFontSize(12);
      pdf.text(`Strategy: ${selectedRun.strategyName}`, 20, y);
      y += 8;
      pdf.text(`Duration: ${selectedRun.totalDuration}ms`, 20, y);
      y += 8;
      pdf.text(`Score: ${selectedRun.score.toFixed(2)}`, 20, y);
      y += 8;
      pdf.text(`Status: ${selectedRun.success ? 'Success' : 'Failed'}`, 20, y);
      y += 15;
      
      pdf.setFontSize(14);
      pdf.text('Steps:', 20, y);
      y += 10;
      
      pdf.setFontSize(10);
      selectedRun.steps.forEach((step, i) => {
        if (y > 270) {
          pdf.addPage();
          y = 20;
        }
        pdf.text(`${i + 1}. ${step.operation} - ${step.duration.toFixed(1)}ms - Cost: ${step.cost}`, 25, y);
        y += 6;
        
        if (exportOptions.includeReasoning && step.reasoning) {
          pdf.setFontSize(9);
          pdf.text(`   Reason: ${step.reasoning.explanation.slice(0, 80)}...`, 25, y);
          y += 5;
          pdf.setFontSize(10);
        }
      });
      
      pdf.save(`timeline_${selectedRun.strategyName}_${selectedRun.id}.pdf`);
    } else if (exportOptions.format === 'html') {
      const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Timeline: ${selectedRun.strategyName}</title>
  <style>
    body { font-family: system-ui; max-width: 800px; margin: 0 auto; padding: 20px; }
    .step { padding: 15px; margin: 10px 0; border: 1px solid #ddd; border-radius: 8px; }
    .step-header { font-weight: bold; margin-bottom: 8px; }
    .reasoning { background: #f5f5f5; padding: 10px; margin-top: 10px; border-radius: 4px; }
    .code { background: #1e1e1e; color: #d4d4d4; padding: 10px; font-family: monospace; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>Execution Timeline</h1>
  <p><strong>Strategy:</strong> ${selectedRun.strategyName}</p>
  <p><strong>Duration:</strong> ${selectedRun.totalDuration}ms | <strong>Score:</strong> ${selectedRun.score.toFixed(2)}</p>
  
  ${selectedRun.steps.map((step, i) => `
    <div class="step">
      <div class="step-header">${i + 1}. ${step.operation}</div>
      <p>Duration: ${step.duration.toFixed(1)}ms | Cost: ${step.cost}</p>
      ${step.bitRange ? `<p>Bit Range: [${step.bitRange.start}:${step.bitRange.end}]</p>` : ''}
      ${exportOptions.includeReasoning && step.reasoning ? `
        <div class="reasoning">
          <strong>Reasoning:</strong> ${step.reasoning.explanation}
        </div>
      ` : ''}
      ${exportOptions.includeCode && step.codeContext ? `
        <pre class="code">${step.codeContext.lineContent}</pre>
      ` : ''}
    </div>
  `).join('')}
</body>
</html>`;
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timeline_${selectedRun.strategyName}_${selectedRun.id}.html`;
      a.click();
      URL.revokeObjectURL(url);
    }

    setShowExportDialog(false);
    toast.success('Timeline exported');
  };

  const toggleStepExpansion = (stepId: string) => {
    const next = new Set(expandedSteps);
    if (next.has(stepId)) next.delete(stepId);
    else next.add(stepId);
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
    <div className="h-full flex gap-3 p-3 bg-gradient-to-br from-cyan-950/20 via-background to-emerald-950/20">
      {/* Main Timeline */}
      <div className="flex-1 flex flex-col gap-3">
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
                        <div className="flex items-center gap-1">
                          {run.pinned && <Pin className="w-2 h-2" />}
                          {run.strategyName} - {run.timestamp.toLocaleTimeString()}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {selectedRun && (
                  <>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-7 w-7 p-0" 
                      onClick={() => handleTogglePin(selectedRun.id)}
                    >
                      {selectedRun.pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                    </Button>
                    
                    <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                          <Download className="w-3 h-3" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Export Timeline</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Format</Label>
                            <Select 
                              value={exportOptions.format} 
                              onValueChange={(v) => setExportOptions({...exportOptions, format: v as any})}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="json">JSON (Full data)</SelectItem>
                                <SelectItem value="pdf">PDF (Report)</SelectItem>
                                <SelectItem value="html">HTML (Interactive)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Checkbox 
                                checked={exportOptions.includeCode}
                                onCheckedChange={(c) => setExportOptions({...exportOptions, includeCode: !!c})}
                              />
                              <Label>Include source code snippets</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox 
                                checked={exportOptions.includeReasoning}
                                onCheckedChange={(c) => setExportOptions({...exportOptions, includeReasoning: !!c})}
                              />
                              <Label>Include reasoning explanations</Label>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Bit data</Label>
                            <Select 
                              value={exportOptions.includeBits} 
                              onValueChange={(v) => setExportOptions({...exportOptions, includeBits: v as any})}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All bits</SelectItem>
                                <SelectItem value="summary">Summary only</SelectItem>
                                <SelectItem value="none">None</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <Button onClick={handleExport} className="w-full">
                            Export
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
                
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-7 text-xs text-red-400" 
                  onClick={handleClearAll}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline Content */}
        {selectedRun && (
          <Card className="flex-1 bg-background/50 border-cyan-400/30 flex flex-col overflow-hidden">
            <CardHeader className="py-2 px-3 border-b border-cyan-400/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2 text-cyan-100">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  {selectedRun.strategyName}
                  {selectedRun.pinned && <Pin className="w-3 h-3 text-yellow-400" />}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className={`text-[10px] ${selectedRun.success ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                    {selectedRun.success ? 'Success' : 'Failed'}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] border-yellow-400/50 text-yellow-300">
                    Score: {selectedRun.score.toFixed(2)}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden p-3">
              {/* Controls */}
              <div className="mb-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Step {currentStepIndex + 1} of {steps.length}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={showCodeContext ? 'default' : 'outline'}
                      className="h-6 text-[10px]"
                      onClick={() => setShowCodeContext(!showCodeContext)}
                    >
                      <Code className="w-3 h-3 mr-1" />
                      Code
                    </Button>
                    <span className="text-cyan-300">{selectedRun.totalDuration.toFixed(0)}ms</span>
                  </div>
                </div>
                <Progress value={((currentStepIndex + 1) / steps.length) * 100} className="h-1.5" />
                
                <div className="flex items-center justify-center gap-2">
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={handlePrevStep} disabled={currentStepIndex === 0}>
                    <SkipBack className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={handleNextStep} disabled={currentStepIndex >= steps.length - 1}>
                    <SkipForward className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Steps List */}
              <ScrollArea className="h-[calc(100%-100px)]">
                <div className="relative space-y-1 pl-4">
                  <div className="absolute left-1 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-400/50 via-emerald-400/50 to-cyan-400/50" />
                  
                  {steps.map((step, index) => (
                    <Collapsible key={step.id} open={expandedSteps.has(step.id)}>
                      <div
                        className={`relative rounded-lg border transition-all ${
                          index === currentStepIndex 
                            ? 'bg-cyan-500/15 border-cyan-400/60' 
                            : 'bg-background/30 border-border/50 hover:border-cyan-400/30'
                        }`}
                      >
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
                              {step.isParallel && (
                                <Badge className="text-[8px] h-3 bg-orange-500/20 text-orange-300">
                                  ∥
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <span><Clock className="w-2.5 h-2.5 inline" /> {step.duration.toFixed(1)}ms</span>
                              <span><Zap className="w-2.5 h-2.5 inline" /> {step.cost}</span>
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
                            
                            {/* Reasoning Preview */}
                            {step.reasoning && (
                              <div className="p-2 rounded bg-purple-500/10 border border-purple-500/20">
                                <div className="text-[10px] text-purple-300 flex items-center gap-1 mb-1">
                                  <GitBranch className="w-3 h-3" />
                                  Why this happened:
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                  {step.reasoning.explanation}
                                </p>
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
        )}
      </div>

      {/* Code Context Panel */}
      {showCodeContext && selectedRun && (
        <div className="w-80">
          <CodeContextView 
            step={currentStep || null}
            stepIndex={currentStepIndex}
            totalSteps={steps.length}
          />
        </div>
      )}
    </div>
  );
};
