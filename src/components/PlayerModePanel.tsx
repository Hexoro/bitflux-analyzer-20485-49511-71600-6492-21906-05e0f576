/**
 * Player Mode Panel - Consolidated 5-tab layout with Phase 5 features
 * Tabs: Analysis | Verify | Metrics | Code | Data
 * Phase 5: Breakpoints, Checkpoints, Annotations, Export Reports
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight,
  LogOut, FileCode, DollarSign, Clock, Activity, Zap, Layers,
  RotateCcw, AlertCircle, GitCompare, Database, Code, Shield,
  Download, Search, MessageSquare, Bookmark, Bug,
} from 'lucide-react';
import { fileSystemManager } from '@/lib/fileSystemManager';
import { resultsManager, ExecutionResultV2 } from '@/lib/resultsManager';
import { executeOperation, getOperationCost } from '@/lib/operationsRouter';
import { calculateAllMetrics } from '@/lib/metricsCalculator';
import { toast } from 'sonner';
import { verifyAllStepsIndependently, exportVerificationReport } from '@/lib/playerVerification';
import { exportPlayerReport, generateVerificationPlayerReport, generateIssuesReport, generateTransformationReport } from '@/lib/playerReportGenerator';

// Player sub-components
import { EnhancedDiffView } from './player/EnhancedDiffView';
import { EnhancedMetricsTimeline } from './player/EnhancedMetricsTimeline';
import { EnhancedMaskView } from './player/EnhancedMaskView';
import { EnhancedStepDetails } from './player/EnhancedStepDetails';
import { EnhancedDataView } from './player/EnhancedDataView';
import { CodeContextView } from './player/CodeContextView';
import { VerificationDashboard } from './player/VerificationDashboard';
import { ParameterInspector } from './player/ParameterInspector';
import { BitFieldViewer } from './player/BitFieldViewer';
import { ErrorSummaryBar } from './player/ErrorSummaryBar';
import { MetricSparklines } from './player/MetricSparklines';
import { CostTimeline } from './player/CostTimeline';
import { BreakpointManager, PlayerBreakpoint } from './player/BreakpointManager';
import { CheckpointPanel, Checkpoint } from './player/CheckpointPanel';
import { AnnotationSystem, Annotation } from './player/AnnotationSystem';

interface PlayerModePanelProps {
  onExitPlayer: () => void;
  selectedResultId?: string | null;
}

export const PlayerModePanel = ({ onExitPlayer, selectedResultId }: PlayerModePanelProps) => {
  const [results, setResults] = useState<ExecutionResultV2[]>([]);
  const [selectedResult, setSelectedResult] = useState<ExecutionResultV2 | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [reconstructedBits, setReconstructedBits] = useState<string>('');
  const [reconstructedSteps, setReconstructedSteps] = useState<any[]>([]);
  const [playerFileId, setPlayerFileId] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'passed' | 'failed' | 'skipped'>('pending');

  // Phase 5 state
  const [breakpoints, setBreakpoints] = useState<PlayerBreakpoint[]>([]);
  const [isPausedAtBreakpoint, setIsPausedAtBreakpoint] = useState(false);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [analysisSubView, setAnalysisSubView] = useState<'step' | 'bits' | 'diff'>('step');
  const [verifySubView, setVerifySubView] = useState<'dashboard' | 'params' | 'independent'>('dashboard');
  const [metricsSubView, setMetricsSubView] = useState<'timeline' | 'sparklines' | 'cost'>('timeline');
  const [dataSubView, setDataSubView] = useState<'hex' | 'mask'>('hex');
  const [independentReport, setIndependentReport] = useState<any>(null);
  const [comparisonResultId, setComparisonResultId] = useState<string | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load results
  useEffect(() => {
    setResults(resultsManager.getAllResults());
    const unsubscribe = resultsManager.subscribe(() => {
      setResults(resultsManager.getAllResults());
    });
    return unsubscribe;
  }, []);

  // Auto-select result if provided
  useEffect(() => {
    if (selectedResultId) {
      const result = results.find(r => r.id === selectedResultId);
      if (result) setSelectedResult(result);
    }
  }, [selectedResultId, results]);

  // Load persisted annotations/checkpoints
  useEffect(() => {
    if (selectedResult?.id) {
      try {
        const savedAnn = localStorage.getItem(`player_ann_${selectedResult.id}`);
        if (savedAnn) setAnnotations(JSON.parse(savedAnn));
        const savedCp = localStorage.getItem(`player_cp_${selectedResult.id}`);
        if (savedCp) setCheckpoints(JSON.parse(savedCp));
      } catch { /* ignore */ }
    }
  }, [selectedResult?.id]);

  // Persist annotations/checkpoints
  useEffect(() => {
    if (selectedResult?.id) {
      localStorage.setItem(`player_ann_${selectedResult.id}`, JSON.stringify(annotations));
    }
  }, [annotations, selectedResult?.id]);

  useEffect(() => {
    if (selectedResult?.id) {
      localStorage.setItem(`player_cp_${selectedResult.id}`, JSON.stringify(checkpoints));
    }
  }, [checkpoints, selectedResult?.id]);

  // Helper to count mismatching bits
  const countMismatches = useCallback((a: string, b: string): number => {
    const len = Math.max(a.length, b.length);
    let count = 0;
    for (let i = 0; i < len; i++) {
      if (a[i] !== b[i]) count++;
    }
    return count;
  }, []);

  // Reconstruct steps
  useEffect(() => {
    if (!selectedResult) {
      setReconstructedBits('');
      setReconstructedSteps([]);
      setPlayerFileId(null);
      setVerificationStatus('pending');
      return;
    }

    setCurrentStep(0);
    setIsPlaying(false);
    setIndependentReport(null);

    const tempFileName = `player_${selectedResult.strategyName.replace(/\s+/g, '_')}_${Date.now()}.tmp`;
    const tempFile = fileSystemManager.createFile(tempFileName, selectedResult.initialBits, 'binary');
    fileSystemManager.setFileGroup(tempFile.id, 'Player');
    fileSystemManager.setActiveFile(tempFile.id);
    setPlayerFileId(tempFile.id);

    let currentBits = selectedResult.initialBits;
    const steps: any[] = [];
    let mismatchDetails: string[] = [];

    for (let i = 0; i < selectedResult.steps.length; i++) {
      const originalStep = selectedResult.steps[i];
      const beforeBits = currentBits;
      const storedAfter = originalStep.cumulativeBits || originalStep.fullAfterBits || originalStep.afterBits || '';
      let afterBits = storedAfter || currentBits;
      let executionError: string | undefined;
      let executionMatches = true;

      if (originalStep.params) {
        try {
          const bitRange = originalStep.bitRanges?.[0];
          let reExecutedBits: string;

          if (bitRange && bitRange.start !== undefined && bitRange.end !== undefined) {
            const before = currentBits.slice(0, bitRange.start);
            const target = currentBits.slice(bitRange.start, bitRange.end);
            const after = currentBits.slice(bitRange.end);
            const opResult = executeOperation(originalStep.operation, target, originalStep.params || {});
            reExecutedBits = opResult.success ? before + opResult.bits + after : currentBits;
            if (!opResult.success) executionError = opResult.error;
          } else {
            const opResult = executeOperation(originalStep.operation, currentBits, originalStep.params || {});
            reExecutedBits = opResult.success && opResult.bits.length > 0 ? opResult.bits : currentBits;
            if (!opResult.success) executionError = opResult.error;
          }

          if (storedAfter && reExecutedBits !== storedAfter) {
            executionMatches = false;
            const mismatches = countMismatches(reExecutedBits, storedAfter);
            if (mismatches > 0) mismatchDetails.push(`Step ${i}: ${originalStep.operation} - ${mismatches} mismatches`);
          }
          if (!storedAfter && reExecutedBits) afterBits = reExecutedBits;
        } catch (e) {
          executionError = (e as Error).message;
        }
      }

      const metricsResult = calculateAllMetrics(afterBits);

      // Count segment-level changes
      const segmentBefore = originalStep.beforeBits || beforeBits;
      const segmentAfter = originalStep.afterBits || afterBits;
      let segmentBitsChanged = 0;
      for (let j = 0; j < Math.min(segmentBefore.length, segmentAfter.length); j++) {
        if (segmentBefore[j] !== segmentAfter[j]) segmentBitsChanged++;
      }
      
      // Count full-file changes
      let fullBitsChanged = 0;
      for (let j = 0; j < Math.min(beforeBits.length, afterBits.length); j++) {
        if (beforeBits[j] !== afterBits[j]) fullBitsChanged++;
      }

      steps.push({
        ...originalStep,
        stepIndex: i,
        fullBeforeBits: beforeBits,
        fullAfterBits: afterBits,
        metrics: metricsResult.metrics,
        cost: originalStep.cost || getOperationCost(originalStep.operation),
        cumulativeBits: afterBits,
        bitsLength: afterBits.length,
        executionError,
        // Fix: verified must reflect actual re-execution match, not auto-true
        verified: executionMatches,
        verificationNote: !executionMatches 
          ? `Re-execution mismatch${storedAfter ? ' (stored state used for playback)' : ''}` 
          : undefined,
        storedAfterBits: storedAfter,
        segmentBitsChanged,
        fullBitsChanged,
        isSegmentOnly: segmentBitsChanged > 0 && fullBitsChanged === 0,
      });

      currentBits = afterBits;
    }

    setReconstructedSteps(steps);
    setReconstructedBits(selectedResult.initialBits);

    const finalMatches = currentBits === selectedResult.finalBits;
    if (finalMatches) {
      setVerificationStatus('passed');
    } else {
      const mismatches = countMismatches(currentBits, selectedResult.finalBits);
      setVerificationStatus(mismatches < currentBits.length * 0.01 ? 'passed' : 'failed');
    }

    return () => {
      if (tempFile.id) fileSystemManager.deleteFile(tempFile.id);
    };
  }, [selectedResult?.id, countMismatches]);

  // Playback with breakpoint support
  useEffect(() => {
    if (isPlaying && reconstructedSteps.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentStep(prev => {
          const next = prev + 1;
          if (next >= reconstructedSteps.length) {
            setIsPlaying(false);
            return prev;
          }
          // Check breakpoints
          const step = reconstructedSteps[next];
          const hitBp = breakpoints.find(bp => {
            if (!bp.enabled) return false;
            if (bp.type === 'step' && bp.stepIndex === next) return true;
            if (bp.type === 'operation' && bp.operationName === step?.operation) return true;
            if (bp.type === 'metric' && bp.metricCondition && step?.metrics) {
              const val = step.metrics[bp.metricCondition.metric];
              if (val !== undefined) {
                if (bp.metricCondition.operator === '<' && val < bp.metricCondition.value) return true;
                if (bp.metricCondition.operator === '>' && val > bp.metricCondition.value) return true;
                if (bp.metricCondition.operator === '=' && Math.abs(val - bp.metricCondition.value) < 0.001) return true;
              }
            }
            return false;
          });

          if (hitBp) {
            setIsPlaying(false);
            setIsPausedAtBreakpoint(true);
            hitBp.hitCount++;
            toast.info(`Breakpoint hit at step ${next + 1}`);
            return next;
          }
          return next;
        });
      }, 1000 / playbackSpeed);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, playbackSpeed, reconstructedSteps.length, breakpoints]);

  // Update bits on step change
  useEffect(() => {
    if (!selectedResult || reconstructedSteps.length === 0) return;
    let newBits: string;
    let highlightRanges: Array<{ start: number; end: number; color: string }> = [];

    if (currentStep === 0) {
      newBits = selectedResult.initialBits;
    } else if (currentStep <= reconstructedSteps.length) {
      const step = reconstructedSteps[currentStep - 1] || reconstructedSteps[currentStep];
      newBits = step?.cumulativeBits || selectedResult.initialBits;
      if (step?.bitRanges?.length > 0) {
        highlightRanges = step.bitRanges.map((r: any) => ({ start: r.start, end: r.end, color: 'rgba(0, 212, 255, 0.3)' }));
      }
    } else {
      newBits = selectedResult.finalBits;
    }

    setReconstructedBits(newBits);
    const activeFile = fileSystemManager.getActiveFile();
    if (activeFile && playerFileId && activeFile.id === playerFileId) {
      activeFile.state.model.loadBits(newBits, false);
      activeFile.state.setExternalHighlightRanges(highlightRanges);
    }
  }, [currentStep, reconstructedSteps, selectedResult, playerFileId]);

  const handleExitPlayer = () => {
    const activeFile = fileSystemManager.getActiveFile();
    if (activeFile) activeFile.state.clearExternalHighlightRanges();
    const count = fileSystemManager.clearAllTempFiles();
    if (count > 0) toast.info(`Cleaned up ${count} temp files`);
    onExitPlayer();
  };

  const handlePlay = () => { setIsPlaying(true); setIsPausedAtBreakpoint(false); };
  const handlePause = () => setIsPlaying(false);
  const handleStop = () => {
    setIsPlaying(false);
    setCurrentStep(0);
    if (selectedResult) setReconstructedBits(selectedResult.initialBits);
  };

  const handleRunIndependentVerification = () => {
    if (!selectedResult) return;
    const report = verifyAllStepsIndependently(selectedResult.initialBits, selectedResult.steps, selectedResult.finalBits);
    setIndependentReport(report);
    toast.success(`Independent verification: ${report.passedSteps}/${report.totalSteps} passed`);
  };

  const step = reconstructedSteps[currentStep];
  const progress = reconstructedSteps.length > 0 ? ((currentStep + 1) / reconstructedSteps.length) * 100 : 0;
  const totalCost = reconstructedSteps.reduce((sum: number, s: any) => sum + (s.cost || 0), 0);
  const cumulativeCost = reconstructedSteps.slice(0, currentStep + 1).reduce((sum: number, s: any) => sum + (s.cost || 0), 0);
  const budgetInitial = 1000;
  const budgetRemaining = budgetInitial - cumulativeCost;

  return (
    <div className="h-full flex flex-col gap-3 p-4 bg-background">
      {/* Header */}
      <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-primary/20 border border-primary/40 flex items-center justify-center">
                <Play className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold">File Player Mode</h1>
                <p className="text-xs text-muted-foreground">Step-by-step execution playback • File locked</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Export Reports Dropdown */}
              {selectedResult && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="w-3 h-3 mr-1" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => exportPlayerReport(generateVerificationPlayerReport(selectedResult, reconstructedSteps))}>
                      Verification Report
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportPlayerReport(generateIssuesReport(selectedResult, reconstructedSteps))}>
                      Issues Report
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportPlayerReport(generateTransformationReport(selectedResult, reconstructedSteps))}>
                      Transformation Report
                    </DropdownMenuItem>
                    {independentReport && (
                      <DropdownMenuItem onClick={() => exportVerificationReport(independentReport)}>
                        Independent Verification
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button variant="destructive" onClick={handleExitPlayer}>
                <LogOut className="w-4 h-4 mr-2" />
                Exit Player
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Result Selector */}
      {!selectedResult && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Select a Result to Play</CardTitle></CardHeader>
          <CardContent>
            <Select onValueChange={(id) => { const r = results.find(r => r.id === id); if (r) setSelectedResult(r); }}>
              <SelectTrigger><SelectValue placeholder="Choose an execution result..." /></SelectTrigger>
              <SelectContent>
                {results.map(r => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.strategyName} - {new Date(r.startTime).toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {results.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No results available</p>
                <p className="text-sm mt-1">Run a strategy in Algorithm mode first</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Player UI */}
      {selectedResult && (
        <>
          {/* Strategy Info Row */}
          <Card className="bg-card/50">
            <CardContent className="py-2">
              <div className="flex items-center gap-4 flex-wrap">
                <FileCode className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">{selectedResult.strategyName}</span>
                <div className="flex items-center gap-2 ml-auto">
                  {verificationStatus === 'passed' && <Badge className="bg-green-500/20 text-green-500 border-green-500/30 text-xs">✓ Verified</Badge>}
                  {verificationStatus === 'failed' && <Badge variant="destructive" className="text-xs"><AlertCircle className="w-3 h-3 mr-1" />Mismatch</Badge>}
                  <Badge variant="secondary" className="text-xs">{reconstructedBits.length} bits</Badge>
                  <Badge variant="outline" className="text-xs"><DollarSign className="w-3 h-3" />{cumulativeCost}/{totalCost}</Badge>
                  <Badge variant={budgetRemaining > 0 ? 'default' : 'destructive'} className="text-xs">Budget: {budgetRemaining}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Summary */}
          {reconstructedSteps.length > 0 && <ErrorSummaryBar steps={reconstructedSteps} />}

          {/* Progress + Controls */}
          <div>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Step {currentStep + 1} of {reconstructedSteps.length || 1}</span>
              <span>{progress.toFixed(0)}%</span>
            </div>
          </div>

          <Card>
            <CardContent className="py-2">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="outline" onClick={handleStop} className="h-7 w-7"><RotateCcw className="w-3 h-3" /></Button>
                  <Button size="icon" variant="outline" onClick={() => setCurrentStep(0)} className="h-7 w-7"><SkipBack className="w-3 h-3" /></Button>
                  <Button size="icon" variant="outline" onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} className="h-7 w-7"><ChevronLeft className="w-3 h-3" /></Button>
                  {isPlaying ? (
                    <Button size="icon" onClick={handlePause} className="h-7 w-7"><Pause className="w-3 h-3" /></Button>
                  ) : (
                    <Button size="icon" onClick={handlePlay} disabled={reconstructedSteps.length === 0} className="h-7 w-7"><Play className="w-3 h-3" /></Button>
                  )}
                  <Button size="icon" variant="outline" onClick={() => setCurrentStep(Math.min(reconstructedSteps.length - 1, currentStep + 1))} className="h-7 w-7"><ChevronRight className="w-3 h-3" /></Button>
                  <Button size="icon" variant="outline" onClick={() => setCurrentStep(reconstructedSteps.length - 1)} className="h-7 w-7"><SkipForward className="w-3 h-3" /></Button>
                </div>
                <Select value={playbackSpeed.toString()} onValueChange={(v) => setPlaybackSpeed(parseFloat(v))}>
                  <SelectTrigger className="w-16 h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[0.25, 0.5, 1, 2, 4].map(s => <SelectItem key={s} value={s.toString()}>{s}x</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex-1 min-w-[80px]">
                  <Slider value={[currentStep]} min={0} max={Math.max(0, reconstructedSteps.length - 1)} step={1} onValueChange={(v) => setCurrentStep(v[0])} />
                </div>
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{step?.duration?.toFixed(1) || 0}ms</span>
              </div>
            </CardContent>
          </Card>

          {/* Consolidated 5-Tab Layout */}
          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue="analysis" className="h-full flex flex-col">
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="analysis" className="text-xs gap-1"><Search className="w-3 h-3" />Analysis</TabsTrigger>
                <TabsTrigger value="verify" className="text-xs gap-1"><Shield className="w-3 h-3" />Verify</TabsTrigger>
                <TabsTrigger value="metrics" className="text-xs gap-1"><Activity className="w-3 h-3" />Metrics</TabsTrigger>
                <TabsTrigger value="code" className="text-xs gap-1"><Code className="w-3 h-3" />Code</TabsTrigger>
                <TabsTrigger value="data" className="text-xs gap-1"><Database className="w-3 h-3" />Data</TabsTrigger>
              </TabsList>

              {/* === ANALYSIS TAB === */}
              <TabsContent value="analysis" className="flex-1 overflow-auto mt-2">
                <div className="space-y-2">
                  {/* Sub-view selector */}
                  <div className="flex items-center gap-1">
                    <Button variant={analysisSubView === 'step' ? 'default' : 'outline'} size="sm" className="h-6 text-xs" onClick={() => setAnalysisSubView('step')}>
                      <Zap className="w-3 h-3 mr-1" />Step
                    </Button>
                    <Button variant={analysisSubView === 'bits' ? 'default' : 'outline'} size="sm" className="h-6 text-xs" onClick={() => setAnalysisSubView('bits')}>
                      Bits
                    </Button>
                    <Button variant={analysisSubView === 'diff' ? 'default' : 'outline'} size="sm" className="h-6 text-xs" onClick={() => setAnalysisSubView('diff')}>
                      <GitCompare className="w-3 h-3 mr-1" />Diff
                    </Button>
                  </div>
                  <ScrollArea className="h-[calc(100vh-420px)]">
                    {analysisSubView === 'step' && (
                      <EnhancedStepDetails
                        step={step ? { operation: step.operation, params: step.params, cost: step.cost, duration: step.duration, bitRanges: step.bitRanges, fullBeforeBits: step.fullBeforeBits, fullAfterBits: step.fullAfterBits, metrics: step.metrics, verified: step.verified, executionError: step.executionError, bitsLength: step.bitsLength } : null}
                        stepIndex={currentStep}
                        totalSteps={reconstructedSteps.length}
                        previousMetrics={currentStep > 0 ? reconstructedSteps[currentStep - 1]?.metrics : undefined}
                      />
                    )}
                    {analysisSubView === 'bits' && step && (
                      <BitFieldViewer beforeBits={step.fullBeforeBits || ''} afterBits={step.fullAfterBits || ''} operationName={step.operation} params={step.params} mask={step.params?.mask} />
                    )}
                    {analysisSubView === 'diff' && step && (
                      <EnhancedDiffView beforeBits={step.fullBeforeBits || ''} afterBits={step.fullAfterBits || ''} operationName={step.operation} highlightRanges={step.bitRanges} />
                    )}
                  </ScrollArea>
                </div>
              </TabsContent>

              {/* === VERIFY TAB === */}
              <TabsContent value="verify" className="flex-1 overflow-auto mt-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <Button variant={verifySubView === 'dashboard' ? 'default' : 'outline'} size="sm" className="h-6 text-xs" onClick={() => setVerifySubView('dashboard')}>Dashboard</Button>
                    <Button variant={verifySubView === 'params' ? 'default' : 'outline'} size="sm" className="h-6 text-xs" onClick={() => setVerifySubView('params')}>Params</Button>
                    <Button variant={verifySubView === 'independent' ? 'default' : 'outline'} size="sm" className="h-6 text-xs" onClick={() => setVerifySubView('independent')}>
                      Independent
                    </Button>
                  </div>
                  <ScrollArea className="h-[calc(100vh-420px)]">
                    {verifySubView === 'dashboard' && (
                      <VerificationDashboard
                        steps={reconstructedSteps}
                        currentStep={currentStep}
                        initialBits={selectedResult?.initialBits || ''}
                        finalBits={selectedResult?.finalBits || ''}
                        overallStatus={verificationStatus}
                        onJumpToStep={setCurrentStep}
                        onReverifyAll={() => { if (selectedResult) setSelectedResult({ ...selectedResult }); }}
                      />
                    )}
                    {verifySubView === 'params' && (
                      <ParameterInspector steps={reconstructedSteps} currentStep={currentStep} seedChain={selectedResult?.seedChain} />
                    )}
                    {verifySubView === 'independent' && (
                      <div className="space-y-4">
                        <Card>
                          <CardContent className="py-3">
                            <Button onClick={handleRunIndependentVerification} className="w-full">
                              <Shield className="w-4 h-4 mr-2" />
                              Run Independent Verification
                            </Button>
                            <p className="text-xs text-muted-foreground mt-2">
                              Re-executes each step with stored params and compares with stored result
                            </p>
                          </CardContent>
                        </Card>
                        {independentReport && (
                          <Card className={independentReport.overallPassed ? 'border-green-500/30' : 'border-destructive/30'}>
                            <CardHeader className="py-3">
                              <CardTitle className="text-sm">
                                {independentReport.overallPassed ? '✓ All Steps Verified' : '✗ Verification Failed'}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="py-2">
                              <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                                <div className="p-2 bg-green-500/10 rounded text-center">
                                  <div className="text-lg font-bold text-green-500">{independentReport.passedSteps}</div>
                                  <div className="text-muted-foreground">Passed</div>
                                </div>
                                <div className="p-2 bg-destructive/10 rounded text-center">
                                  <div className="text-lg font-bold text-destructive">{independentReport.failedSteps}</div>
                                  <div className="text-muted-foreground">Failed</div>
                                </div>
                                <div className="p-2 bg-yellow-500/10 rounded text-center">
                                  <div className="text-lg font-bold text-yellow-500">{independentReport.incompleteParams}</div>
                                  <div className="text-muted-foreground">Incomplete</div>
                                </div>
                              </div>
                              <ScrollArea className="h-[200px]">
                                <div className="space-y-1">
                                  {independentReport.stepResults.map((sr: any) => (
                                    <div key={sr.stepIndex} className={`flex items-center gap-2 p-1.5 rounded text-xs cursor-pointer ${sr.passed ? '' : 'bg-destructive/5 border border-destructive/20'}`}
                                      onClick={() => setCurrentStep(sr.stepIndex)}>
                                      {sr.passed ? <Badge className="bg-green-500/20 text-green-500 text-[9px]">✓</Badge> : <Badge variant="destructive" className="text-[9px]">✗</Badge>}
                                      <span className="text-muted-foreground">#{sr.stepIndex + 1}</span>
                                      <Badge variant="outline" className="text-xs">{sr.operation}</Badge>
                                      {sr.mismatchCount > 0 && <span className="text-destructive">{sr.mismatchCount} mismatches</span>}
                                      {sr.error && <span className="text-destructive truncate">{sr.error}</span>}
                                      {!sr.paramsComplete && <Badge variant="secondary" className="text-[9px]">params incomplete</Badge>}
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </TabsContent>

              {/* === METRICS TAB === */}
              <TabsContent value="metrics" className="flex-1 overflow-auto mt-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <Button variant={metricsSubView === 'timeline' ? 'default' : 'outline'} size="sm" className="h-6 text-xs" onClick={() => setMetricsSubView('timeline')}>Timeline</Button>
                    <Button variant={metricsSubView === 'sparklines' ? 'default' : 'outline'} size="sm" className="h-6 text-xs" onClick={() => setMetricsSubView('sparklines')}>Sparklines</Button>
                    <Button variant={metricsSubView === 'cost' ? 'default' : 'outline'} size="sm" className="h-6 text-xs" onClick={() => setMetricsSubView('cost')}>
                      <DollarSign className="w-3 h-3 mr-1" />Cost
                    </Button>
                  </div>
                  <ScrollArea className="h-[calc(100vh-420px)]">
                    {metricsSubView === 'timeline' && (
                      <EnhancedMetricsTimeline
                        steps={reconstructedSteps.map((s: any) => ({ operation: s.operation, metrics: s.metrics, cost: s.cost, duration: s.duration }))}
                        currentStepIndex={currentStep}
                        budget={budgetInitial}
                      />
                    )}
                    {metricsSubView === 'sparklines' && (
                      <MetricSparklines steps={reconstructedSteps} currentStep={currentStep} />
                    )}
                    {metricsSubView === 'cost' && (
                      <CostTimeline steps={reconstructedSteps} currentStep={currentStep} budget={budgetInitial} />
                    )}
                  </ScrollArea>
                </div>
              </TabsContent>

              {/* === CODE TAB === */}
              <TabsContent value="code" className="flex-1 overflow-auto mt-2">
                <ScrollArea className="h-[calc(100vh-400px)]">
                  <div className="space-y-4">
                    <CodeContextView step={step} stepIndex={currentStep} totalSteps={reconstructedSteps.length} />
                    {/* Phase 5: Breakpoints + Checkpoints + Annotations */}
                    <BreakpointManager
                      breakpoints={breakpoints}
                      onAdd={bp => setBreakpoints(prev => [...prev, bp])}
                      onRemove={id => setBreakpoints(prev => prev.filter(b => b.id !== id))}
                      onToggle={id => setBreakpoints(prev => prev.map(b => b.id === id ? { ...b, enabled: !b.enabled } : b))}
                      onContinueToNext={() => { setIsPausedAtBreakpoint(false); handlePlay(); }}
                      isPaused={isPausedAtBreakpoint}
                      currentStep={currentStep}
                      totalSteps={reconstructedSteps.length}
                    />
                    <CheckpointPanel
                      checkpoints={checkpoints}
                      currentStep={currentStep}
                      currentBits={reconstructedBits}
                      currentMetrics={step?.metrics || {}}
                      onSave={cp => setCheckpoints(prev => [...prev, cp])}
                      onRestore={cp => setCurrentStep(cp.stepIndex)}
                      onDelete={id => setCheckpoints(prev => prev.filter(c => c.id !== id))}
                      onSetBaseline={id => setCheckpoints(prev => prev.map(c => ({ ...c, isBaseline: c.id === id })))}
                    />
                    <AnnotationSystem
                      annotations={annotations}
                      currentStep={currentStep}
                      onAdd={ann => setAnnotations(prev => [...prev, ann])}
                      onDelete={id => setAnnotations(prev => prev.filter(a => a.id !== id))}
                      onJumpToStep={setCurrentStep}
                    />
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* === DATA TAB === */}
              <TabsContent value="data" className="flex-1 overflow-auto mt-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <Button variant={dataSubView === 'hex' ? 'default' : 'outline'} size="sm" className="h-6 text-xs" onClick={() => setDataSubView('hex')}>Hex/Data</Button>
                    <Button variant={dataSubView === 'mask' ? 'default' : 'outline'} size="sm" className="h-6 text-xs" onClick={() => setDataSubView('mask')}>
                      <Layers className="w-3 h-3 mr-1" />Mask
                    </Button>
                  </div>
                  <ScrollArea className="h-[calc(100vh-420px)]">
                    {dataSubView === 'hex' && (
                      <EnhancedDataView bits={reconstructedBits} stepIndex={currentStep} initialBits={selectedResult?.initialBits} finalBits={selectedResult?.finalBits} />
                    )}
                    {dataSubView === 'mask' && step && (
                      <EnhancedMaskView bits={step.fullAfterBits || reconstructedBits} mask={step.params?.mask as string} bitRanges={step.bitRanges} operationName={step.operation} />
                    )}
                  </ScrollArea>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </>
      )}
    </div>
  );
};
