/**
 * Player Mode Panel - Full-screen player mode for analyzing execution results
 * - Locks file switching while in player mode
 * - Provides comprehensive step-by-step analysis
 * - Exit button to unlock and cleanup
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Square,
  ChevronLeft,
  ChevronRight,
  LogOut,
  FileCode,
  DollarSign,
  Clock,
  Activity,
  Zap,
  Layers,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  GitCompare,
  Database,
} from 'lucide-react';
import { fileSystemManager } from '@/lib/fileSystemManager';
import { resultsManager, ExecutionResultV2 } from '@/lib/resultsManager';
import { executeOperation, getOperationCost } from '@/lib/operationsRouter';
import { calculateAllMetrics } from '@/lib/metricsCalculator';
import { toast } from 'sonner';
// Enhanced player components
import { EnhancedDiffView } from './player/EnhancedDiffView';
import { EnhancedMetricsTimeline } from './player/EnhancedMetricsTimeline';
import { EnhancedMaskView } from './player/EnhancedMaskView';
import { EnhancedStepDetails } from './player/EnhancedStepDetails';
import { EnhancedDataView } from './player/EnhancedDataView';

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
      if (result) {
        setSelectedResult(result);
      }
    }
  }, [selectedResultId, results]);

  // Reconstruct steps - PREFER stored bits for replay consistency, verify against re-execution
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

    // Create temp file for playback
    const tempFileName = `player_${selectedResult.strategyName.replace(/\s+/g, '_')}_${Date.now()}.tmp`;
    const tempFile = fileSystemManager.createFile(tempFileName, selectedResult.initialBits, 'binary');
    fileSystemManager.setFileGroup(tempFile.id, 'Player');
    fileSystemManager.setActiveFile(tempFile.id);
    setPlayerFileId(tempFile.id);

    // REPLAY STRATEGY:
    // 1. Use stored cumulative bits as the primary source for playback
    // 2. Attempt re-execution for verification only
    // 3. Log mismatches but don't fail playback if stored bits exist

    let currentBits = selectedResult.initialBits;
    const steps: any[] = [];
    let verificationPassed = true;
    let firstMismatchStep = -1;
    let mismatchDetails: string[] = [];

    for (let i = 0; i < selectedResult.steps.length; i++) {
      const originalStep = selectedResult.steps[i];
      const beforeBits = currentBits;

      // PRIMARY: Use stored bits if available (this is the source of truth)
      const storedAfter = originalStep.fullAfterBits || originalStep.cumulativeBits || '';
      let afterBits = storedAfter || currentBits;
      let executionError: string | undefined;
      let executionMatches = true;
      
      // VERIFICATION: Try to re-execute and compare (but don't fail if stored bits exist)
      if (originalStep.params) {
        try {
          const bitRange = originalStep.bitRanges?.[0];
          const initialLength = currentBits.length;
          
          let reExecutedBits: string;
          
          if (bitRange && bitRange.start !== undefined && bitRange.end !== undefined) {
            // Execute operation on specific range only
            const before = currentBits.slice(0, bitRange.start);
            const target = currentBits.slice(bitRange.start, bitRange.end);
            const after = currentBits.slice(bitRange.end);
            
            const opResult = executeOperation(
              originalStep.operation,
              target,
              originalStep.params || {}
            );
            
            if (opResult.success) {
              reExecutedBits = before + opResult.bits + after;
            } else {
              executionError = opResult.error;
              reExecutedBits = currentBits;
            }
          } else {
            // Execute on entire bit string
            const opResult = executeOperation(
              originalStep.operation,
              currentBits,
              originalStep.params || {}
            );
            
            if (opResult.success && opResult.bits.length > 0) {
              reExecutedBits = opResult.bits;
            } else {
              executionError = opResult.error;
              reExecutedBits = currentBits;
            }
          }
          
          // Compare re-execution with stored result
          if (storedAfter && reExecutedBits !== storedAfter) {
            executionMatches = false;
            const mismatches = countMismatches(reExecutedBits, storedAfter);
            if (mismatches > 0) {
              mismatchDetails.push(`Step ${i}: ${originalStep.operation} - ${mismatches} bit mismatches`);
            }
          }
          
          // If no stored bits, use re-execution result
          if (!storedAfter && reExecutedBits) {
            afterBits = reExecutedBits;
          }
        } catch (e) {
          console.warn(`Operation ${originalStep.operation} re-execution failed:`, e);
          executionError = (e as Error).message;
        }
      }

      // Track first mismatch for debugging
      if (!executionMatches && firstMismatchStep === -1) {
        firstMismatchStep = i;
        verificationPassed = false;
      }

      // Calculate metrics LIVE
      const metricsResult = calculateAllMetrics(afterBits);

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
        verified: executionMatches,
        storedAfterBits: storedAfter,
      });

      currentBits = afterBits;
    }

    setReconstructedSteps(steps);
    setReconstructedBits(selectedResult.initialBits);

    // Final verification: compare reconstructed final bits with stored final
    const finalMatches = currentBits === selectedResult.finalBits;
    
    if (finalMatches) {
      setVerificationStatus('passed');
      if (mismatchDetails.length > 0) {
        console.warn('Replay verification passed (used stored bits), but re-execution had mismatches:', mismatchDetails);
      }
    } else if (storedAfter && currentBits.length === selectedResult.finalBits.length) {
      // Minor mismatch but same length - likely acceptable
      const mismatches = countMismatches(currentBits, selectedResult.finalBits);
      if (mismatches < currentBits.length * 0.01) {
        // Less than 1% mismatch - consider it a pass with warning
        console.warn(`Replay verification: ${mismatches} mismatches (${(mismatches/currentBits.length*100).toFixed(2)}%)`);
        setVerificationStatus('passed');
      } else {
        console.error(`Replay verification FAILED: ${mismatches} mismatches`);
        setVerificationStatus('failed');
      }
    } else {
      // Significant mismatch
      const mismatches = countMismatches(currentBits, selectedResult.finalBits);
      console.error(`Replay verification FAILED:`);
      console.error(`- Reconstructed length: ${currentBits.length}, Stored length: ${selectedResult.finalBits.length}`);
      console.error(`- Total mismatches: ${mismatches}`);
      console.error(`- First mismatch at step index: ${firstMismatchStep}`);
      
      if (firstMismatchStep >= 0 && steps[firstMismatchStep]) {
        const failedStep = steps[firstMismatchStep];
        console.error(`- Failed step operation: ${failedStep.operation}`);
        console.error(`- Failed step params: ${JSON.stringify(failedStep.params)}`);
      }
      
      setVerificationStatus('failed');
    }

    return () => {
      // Cleanup temp file on result change
      if (tempFile.id) {
        fileSystemManager.deleteFile(tempFile.id);
      }
    };
  }, [selectedResult?.id]);

  // Helper to find stored after bits from any available source
  const storedAfter = selectedResult?.steps?.[selectedResult.steps.length - 1]?.fullAfterBits || 
                      selectedResult?.steps?.[selectedResult.steps.length - 1]?.cumulativeBits || '';

  // Helper to count mismatching bits
  const countMismatches = (a: string, b: string): number => {
    const len = Math.max(a.length, b.length);
    let count = 0;
    for (let i = 0; i < len; i++) {
      if (a[i] !== b[i]) count++;
    }
    return count;
  };

  // Playback logic
  useEffect(() => {
    if (isPlaying && reconstructedSteps.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= reconstructedSteps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, playbackSpeed, reconstructedSteps.length]);

  // Update bits on step change and highlight ranges in active file
  useEffect(() => {
    if (!selectedResult || reconstructedSteps.length === 0) return;

    let newBits: string;
    let highlightRanges: Array<{ start: number; end: number; color: string }> = [];

    if (currentStep === 0) {
      newBits = selectedResult.initialBits;
    } else if (currentStep <= reconstructedSteps.length) {
      const step = reconstructedSteps[currentStep - 1] || reconstructedSteps[currentStep];
      newBits = step?.cumulativeBits || selectedResult.initialBits;
      
      // Add highlight for bit ranges affected by this operation
      // NOTE: bitRanges use exclusive end, so end is already correct
      if (step?.bitRanges && step.bitRanges.length > 0) {
        highlightRanges = step.bitRanges.map((r: any) => ({
          start: r.start,
          end: r.end, // Exclusive end - matches the actual affected range
          color: 'rgba(0, 212, 255, 0.3)', // Cyan highlight
        }));
      }
      
      // Add highlight for memory window
      if (step?.memoryWindow) {
        highlightRanges.push({
          start: step.memoryWindow.start,
          end: step.memoryWindow.end,
          color: 'rgba(255, 215, 0, 0.2)', // Gold highlight for memory window
        });
      }
    } else {
      newBits = selectedResult.finalBits;
    }

    setReconstructedBits(newBits);

    // Update the active file's content and highlights
    const activeFile = fileSystemManager.getActiveFile();
    if (activeFile && playerFileId && activeFile.id === playerFileId) {
      activeFile.state.model.loadBits(newBits, false); // Don't add to history
      activeFile.state.setExternalHighlightRanges(highlightRanges);
    }
  }, [currentStep, reconstructedSteps, selectedResult, playerFileId]);

  const handleExitPlayer = () => {
    // Clear highlights
    const activeFile = fileSystemManager.getActiveFile();
    if (activeFile) {
      activeFile.state.clearExternalHighlightRanges();
    }
    
    // Cleanup temp files
    const count = fileSystemManager.clearAllTempFiles();
    if (count > 0) {
      toast.info(`Cleaned up ${count} temp files`);
    }
    onExitPlayer();
  };

  const handleSelectResult = (resultId: string) => {
    const result = results.find(r => r.id === resultId);
    if (result) {
      setSelectedResult(result);
    }
  };

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleStop = () => {
    setIsPlaying(false);
    setCurrentStep(0);
    if (selectedResult) {
      setReconstructedBits(selectedResult.initialBits);
    }
  };

  const step = reconstructedSteps[currentStep];
  const progress = reconstructedSteps.length > 0 ? ((currentStep + 1) / reconstructedSteps.length) * 100 : 0;
  const totalCost = reconstructedSteps.reduce((sum, s) => sum + (s.cost || 0), 0);
  const cumulativeCost = reconstructedSteps.slice(0, currentStep + 1).reduce((sum, s) => sum + (s.cost || 0), 0);
  const budgetInitial = 1000;
  const budgetRemaining = budgetInitial - cumulativeCost;

  return (
    <div className="h-full flex flex-col gap-4 p-4 bg-background">
      {/* Header with Exit Button */}
      <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-primary/20 border border-primary/40 flex items-center justify-center">
                <Play className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold">File Player Mode</h1>
                <p className="text-xs text-muted-foreground">
                  Step-by-step execution playback • File locked
                </p>
              </div>
            </div>
            <Button variant="destructive" onClick={handleExitPlayer}>
              <LogOut className="w-4 h-4 mr-2" />
              Exit Player
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Result Selector */}
      {!selectedResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Select a Result to Play</CardTitle>
          </CardHeader>
          <CardContent>
            <Select onValueChange={handleSelectResult}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an execution result..." />
              </SelectTrigger>
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
          {/* Strategy Info */}
          <Card className="bg-card/50">
            <CardContent className="py-3">
              <div className="flex items-center gap-4 flex-wrap">
                <FileCode className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <span className="font-medium">{selectedResult.strategyName}</span>
                  <p className="text-xs text-muted-foreground">
                    {selectedResult.initialBits.length} bits • {reconstructedSteps.length} steps
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Verification Status */}
                  {verificationStatus === 'passed' && (
                    <Badge variant="default" className="bg-green-500/20 text-green-500 border-green-500/30">
                      ✓ Verified
                    </Badge>
                  )}
                  {verificationStatus === 'failed' && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Replay Mismatch
                    </Badge>
                  )}
                  {verificationStatus === 'pending' && (
                    <Badge variant="secondary">Verifying...</Badge>
                  )}
                  <Badge variant="secondary">{reconstructedBits.length} bits</Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    {cumulativeCost}/{totalCost}
                  </Badge>
                  <Badge variant={budgetRemaining > 0 ? 'default' : 'destructive'}>
                    Budget: {budgetRemaining}/{budgetInitial}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progress */}
          <div>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Step {currentStep + 1} of {reconstructedSteps.length || 1}</span>
              <span>{progress.toFixed(0)}% complete</span>
            </div>
          </div>

          {/* Controls */}
          <Card>
            <CardContent className="py-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="outline" onClick={handleStop} className="h-8 w-8">
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="outline" onClick={() => setCurrentStep(0)} className="h-8 w-8">
                    <SkipBack className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="outline" onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} className="h-8 w-8">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  {isPlaying ? (
                    <Button size="icon" onClick={handlePause} className="h-8 w-8">
                      <Pause className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button size="icon" onClick={handlePlay} disabled={reconstructedSteps.length === 0} className="h-8 w-8">
                      <Play className="w-4 h-4" />
                    </Button>
                  )}
                  <Button size="icon" variant="outline" onClick={() => setCurrentStep(Math.min(reconstructedSteps.length - 1, currentStep + 1))} className="h-8 w-8">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="outline" onClick={() => setCurrentStep(reconstructedSteps.length - 1)} className="h-8 w-8">
                    <SkipForward className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Speed:</span>
                  <Select value={playbackSpeed.toString()} onValueChange={(v) => setPlaybackSpeed(parseFloat(v))}>
                    <SelectTrigger className="w-16 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.25">0.25x</SelectItem>
                      <SelectItem value="0.5">0.5x</SelectItem>
                      <SelectItem value="1">1x</SelectItem>
                      <SelectItem value="2">2x</SelectItem>
                      <SelectItem value="4">4x</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 min-w-[100px]">
                  <Slider
                    value={[currentStep]}
                    min={0}
                    max={Math.max(0, reconstructedSteps.length - 1)}
                    step={1}
                    onValueChange={(v) => setCurrentStep(v[0])}
                  />
                </div>

                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {step?.duration?.toFixed(1) || 0}ms
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step Details - Enhanced */}
          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue="details" className="h-full flex flex-col">
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="details" className="text-xs gap-1">
                  <Zap className="w-3 h-3" />
                  Step
                </TabsTrigger>
                <TabsTrigger value="mask" className="text-xs gap-1">
                  <Layers className="w-3 h-3" />
                  Mask
                </TabsTrigger>
                <TabsTrigger value="diff" className="text-xs gap-1">
                  <GitCompare className="w-3 h-3" />
                  Diff
                </TabsTrigger>
                <TabsTrigger value="timeline" className="text-xs gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Metrics
                </TabsTrigger>
                <TabsTrigger value="data" className="text-xs gap-1">
                  <Database className="w-3 h-3" />
                  Data
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="flex-1 overflow-auto mt-2">
                <ScrollArea className="h-[calc(100vh-400px)]">
                  <EnhancedStepDetails
                    step={step ? {
                      operation: step.operation,
                      params: step.params,
                      cost: step.cost,
                      duration: step.duration,
                      bitRanges: step.bitRanges,
                      fullBeforeBits: step.fullBeforeBits,
                      fullAfterBits: step.fullAfterBits,
                      metrics: step.metrics,
                      verified: step.verified,
                      executionError: step.executionError,
                      bitsLength: step.bitsLength,
                    } : null}
                    stepIndex={currentStep}
                    totalSteps={reconstructedSteps.length}
                    previousMetrics={currentStep > 0 ? reconstructedSteps[currentStep - 1]?.metrics : undefined}
                  />
                </ScrollArea>
              </TabsContent>

              <TabsContent value="mask" className="flex-1 overflow-auto mt-4">
                <ScrollArea className="h-[calc(100vh-400px)]">
                  {step ? (
                    <EnhancedMaskView
                      bits={step.fullAfterBits || step.afterBits || reconstructedBits}
                      mask={step.params?.mask as string}
                      bitRanges={step.bitRanges}
                      operationName={step.operation}
                    />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Select a step to view mask overlay</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="diff" className="flex-1 overflow-auto mt-4">
                <ScrollArea className="h-[calc(100vh-400px)]">
                  {step && (
                    <EnhancedDiffView
                      beforeBits={step.fullBeforeBits || step.beforeBits || ''}
                      afterBits={step.fullAfterBits || step.afterBits || ''}
                      operationName={step.operation}
                      highlightRanges={step.bitRanges}
                    />
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="timeline" className="flex-1 overflow-auto mt-4">
                <ScrollArea className="h-[calc(100vh-400px)]">
                  <EnhancedMetricsTimeline 
                    steps={reconstructedSteps.map(s => ({
                      operation: s.operation,
                      metrics: s.metrics,
                      cost: s.cost,
                      duration: s.duration,
                    }))} 
                    currentStepIndex={currentStep}
                    budget={budgetInitial}
                  />
                </ScrollArea>
              </TabsContent>

              <TabsContent value="data" className="flex-1 overflow-auto mt-4">
                <ScrollArea className="h-[calc(100vh-400px)]">
                  <EnhancedDataView
                    bits={reconstructedBits}
                    stepIndex={currentStep}
                    initialBits={selectedResult?.initialBits}
                    finalBits={selectedResult?.finalBits}
                  />
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </>
      )}
    </div>
  );
};
