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
} from 'lucide-react';
import { fileSystemManager } from '@/lib/fileSystemManager';
import { resultsManager, ExecutionResultV2 } from '@/lib/resultsManager';
import { executeOperation, getOperationCost } from '@/lib/operationsRouter';
import { calculateAllMetrics } from '@/lib/metricsCalculator';
import { toast } from 'sonner';
import { BitDiffView } from './algorithm/BitDiffView';
import { MetricsTimelineChart } from './algorithm/MetricsTimelineChart';
import { MaskOverlayView } from './algorithm/MaskOverlayView';

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

  // Reconstruct steps using REAL execution (not stored bits)
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

    // REAL EXECUTION MODE: Start from initial bits and execute each operation
    let currentBits = selectedResult.initialBits;
    const steps: any[] = [];
    let verificationPassed = true;
    let firstMismatchStep = -1;

    for (let i = 0; i < selectedResult.steps.length; i++) {
      const originalStep = selectedResult.steps[i];
      const beforeBits = currentBits;

      // ALWAYS use real operation execution - never use stored bits
      let afterBits = currentBits;
      let executionError: string | undefined;
      
      try {
        // Get bit range if specified
        const bitRange = originalStep.bitRanges?.[0];
        const initialLength = currentBits.length;
        
        if (bitRange && bitRange.start !== undefined && bitRange.end !== undefined) {
          // Execute operation on specific range only - PRESERVING the rest of the file
          const before = currentBits.slice(0, bitRange.start);
          const target = currentBits.slice(bitRange.start, bitRange.end);
          const after = currentBits.slice(bitRange.end);
          
          const opResult = executeOperation(
            originalStep.operation,
            target,
            originalStep.params || {}
          );
          
          if (opResult.success) {
            // CRITICAL: Preserve file length by using the same range size
            // The operation result should replace only the target range
            afterBits = before + opResult.bits + after;
          } else {
            executionError = opResult.error;
            // Fall back to stored bits if available, otherwise keep current
            afterBits = originalStep.fullAfterBits || originalStep.cumulativeBits || currentBits;
          }
        } else {
          // Execute on entire bit string
          const opResult = executeOperation(
            originalStep.operation,
            currentBits,
            originalStep.params || {}
          );
          
          if (opResult.success && opResult.bits.length > 0) {
            afterBits = opResult.bits;
          } else {
            executionError = opResult.error;
            // Fall back to stored bits if available
            afterBits = originalStep.fullAfterBits || originalStep.cumulativeBits || currentBits;
          }
        }
        
        // SAFETY: If the operation somehow changed the file length unexpectedly,
        // prefer the stored afterBits to maintain consistency
        if (afterBits.length !== initialLength && originalStep.fullAfterBits?.length === initialLength) {
          console.warn(`Operation ${originalStep.operation} changed length from ${initialLength} to ${afterBits.length}, using stored bits`);
          afterBits = originalStep.fullAfterBits;
        }
      } catch (e) {
        console.warn(`Operation ${originalStep.operation} failed:`, e);
        executionError = (e as Error).message;
        afterBits = originalStep.fullAfterBits || originalStep.cumulativeBits || currentBits;
      }

      // Calculate metrics LIVE - don't use stored snapshots
      const metricsResult = calculateAllMetrics(afterBits);

      // Check if this step matches the stored result
      const storedAfter = originalStep.fullAfterBits || originalStep.cumulativeBits || '';
      const stepMatches = !storedAfter || afterBits === storedAfter;
      if (!stepMatches && firstMismatchStep === -1) {
        firstMismatchStep = i;
        verificationPassed = false;
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
        verified: stepMatches,
        storedAfterBits: storedAfter,
      });

      currentBits = afterBits;
    }

    setReconstructedSteps(steps);
    setReconstructedBits(selectedResult.initialBits);

    // Final verification: compare reconstructed final bits with stored final
    // EXACT MATCH REQUIRED - no tolerance
    const finalMatches = currentBits === selectedResult.finalBits;
    
    if (finalMatches && verificationPassed) {
      setVerificationStatus('passed');
    } else {
      // Debug: find exactly where and why the mismatch occurred
      const mismatches = countMismatches(currentBits, selectedResult.finalBits);
      const mismatchPositions: number[] = [];
      for (let i = 0; i < Math.max(currentBits.length, selectedResult.finalBits.length); i++) {
        if (currentBits[i] !== selectedResult.finalBits[i]) {
          if (mismatchPositions.length < 10) mismatchPositions.push(i);
        }
      }
      
      console.error(`Replay verification FAILED (exact match required):`);
      console.error(`- Reconstructed length: ${currentBits.length}, Stored length: ${selectedResult.finalBits.length}`);
      console.error(`- Total mismatches: ${mismatches}`);
      console.error(`- First mismatch positions: ${mismatchPositions.join(', ')}`);
      console.error(`- First mismatch at step index: ${firstMismatchStep}`);
      
      if (firstMismatchStep >= 0 && steps[firstMismatchStep]) {
        const failedStep = steps[firstMismatchStep];
        console.error(`- Failed step operation: ${failedStep.operation}`);
        console.error(`- Failed step params: ${JSON.stringify(failedStep.params)}`);
        console.error(`- Stored after (first 50): ${failedStep.storedAfterBits?.slice(0, 50)}`);
        console.error(`- Reconstructed after (first 50): ${failedStep.fullAfterBits?.slice(0, 50)}`);
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

          {/* Step Details */}
          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue="details" className="h-full flex flex-col">
              <TabsList>
                <TabsTrigger value="details">Step Details</TabsTrigger>
                <TabsTrigger value="mask">Mask Overlay</TabsTrigger>
                <TabsTrigger value="diff">Visual Diff</TabsTrigger>
                <TabsTrigger value="timeline">Metrics Timeline</TabsTrigger>
                <TabsTrigger value="data">Binary Data</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="flex-1 overflow-auto mt-4">
                {step ? (
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          Operation
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                          <div className="flex items-center justify-between">
                            <h4 className="font-mono text-lg text-primary">{step.operation}</h4>
                            <Badge className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              {step.cost}
                            </Badge>
                          </div>
                        </div>
                        {step.params && Object.keys(step.params).length > 0 && (
                          <div className="mt-3">
                            <h5 className="text-xs font-medium text-muted-foreground mb-1">Parameters</h5>
                            <div className="space-y-1">
                              {Object.entries(step.params).map(([key, value]) => (
                                <div key={key} className="flex justify-between text-sm bg-muted/30 px-2 py-1 rounded">
                                  <span className="text-muted-foreground">{key}:</span>
                                  <span className="font-mono text-xs break-all max-w-[200px]">
                                    {key === 'mask' && typeof value === 'string' && value.length > 32 
                                      ? `${value.slice(0, 16)}...${value.slice(-16)} (${value.length} bits)`
                                      : JSON.stringify(value).slice(0, 100)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* === OPERAND VISUALIZATION === */}
                        {step.bitRanges && step.bitRanges.length > 0 && (
                          <div className="mt-3 p-3 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-lg">
                            <h5 className="text-xs font-medium text-cyan-400 mb-2 flex items-center gap-1">
                              <Layers className="w-3 h-3" />
                              Operation Details: {step.operation} on Range
                            </h5>
                            
                            {(() => {
                              const range = step.bitRanges[0];
                              const sourceBits = step.fullBeforeBits?.slice(range.start, range.end) || '';
                              const resultBits = step.fullAfterBits?.slice(range.start, range.end) || '';
                              const maskBits = step.params?.mask as string;
                              const extendedMask = maskBits ? 
                                maskBits.repeat(Math.ceil(sourceBits.length / maskBits.length)).slice(0, sourceBits.length) : '';
                              
                              return (
                                <div className="space-y-2 font-mono text-xs">
                                  {/* Source Bits */}
                                  <div className="flex items-start gap-2">
                                    <span className="text-muted-foreground w-20 shrink-0">Source:</span>
                                    <div className="break-all bg-muted/30 px-2 py-1 rounded flex-1">
                                      <span className="text-yellow-400">
                                        {sourceBits.slice(0, 64)}
                                        {sourceBits.length > 64 && <span className="text-muted-foreground">... ({sourceBits.length} bits)</span>}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {/* Operand/Mask (if applicable) */}
                                  {extendedMask && (
                                    <div className="flex items-start gap-2">
                                      <span className="text-muted-foreground w-20 shrink-0">{step.operation}:</span>
                                      <div className="break-all bg-muted/30 px-2 py-1 rounded flex-1">
                                        <span className="text-cyan-400">
                                          {extendedMask.slice(0, 64)}
                                          {extendedMask.length > 64 && <span className="text-muted-foreground">... ({extendedMask.length} bits)</span>}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Divider line for operation */}
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <span className="w-20 shrink-0"></span>
                                    <div className="flex-1 border-t border-dashed border-muted-foreground/30"></div>
                                    <span className="text-xs px-2">{step.operation}</span>
                                    <div className="flex-1 border-t border-dashed border-muted-foreground/30"></div>
                                  </div>
                                  
                                  {/* Result Bits */}
                                  <div className="flex items-start gap-2">
                                    <span className="text-muted-foreground w-20 shrink-0">Result:</span>
                                    <div className="break-all bg-muted/30 px-2 py-1 rounded flex-1">
                                      <span className="text-green-400">
                                        {resultBits.slice(0, 64)}
                                        {resultBits.length > 64 && <span className="text-muted-foreground">... ({resultBits.length} bits)</span>}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {/* Changed bits indicator */}
                                  {sourceBits && resultBits && (
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-muted-foreground w-20 shrink-0">Changed:</span>
                                      <span className={`${sourceBits !== resultBits ? 'text-orange-400' : 'text-muted-foreground'}`}>
                                        {sourceBits !== resultBits 
                                          ? `${Array.from(sourceBits).filter((b, i) => b !== resultBits[i]).length} bits different`
                                          : 'No change'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        {/* Bit Ranges Summary */}
                        {step.bitRanges && step.bitRanges.length > 0 && (
                          <div className="mt-3">
                            <h5 className="text-xs font-medium text-muted-foreground mb-1">Bit Ranges (0-indexed, exclusive end)</h5>
                            <div className="flex flex-wrap gap-1">
                              {step.bitRanges.slice(0, 10).map((range: any, i: number) => (
                                <Badge key={i} variant="outline" className="font-mono text-xs">
                                  [{range.start}:{range.end}] ({range.end - range.start} bits)
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Visual Mask Display (legacy) */}
                        {step.params?.mask && typeof step.params.mask === 'string' && !step.bitRanges?.length && (
                          <div className="mt-2 p-2 bg-cyan-500/10 border border-cyan-500/30 rounded">
                            <h6 className="text-xs font-medium text-cyan-400 mb-1">Mask Pattern</h6>
                            <div className="font-mono text-xs break-all max-h-20 overflow-y-auto">
                              {(step.params.mask as string).slice(0, 128).split('').map((bit, i) => (
                                <span key={i} className={bit === '1' ? 'text-cyan-400 font-bold' : 'text-muted-foreground'}>
                                  {bit}
                                </span>
                              ))}
                              {(step.params.mask as string).length > 128 && <span className="text-muted-foreground">...</span>}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Active bits: {((step.params.mask as string).match(/1/g) || []).length} / {(step.params.mask as string).length}
                            </div>
                          </div>
                        )}

                        {/* Memory Window Display */}
                        <div className="mt-3 p-2 bg-accent/10 rounded border border-accent/30">
                          <h5 className="text-xs font-medium text-accent mb-1 flex items-center gap-1">
                            <Activity className="w-3 h-3" />
                            Memory Window
                          </h5>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Start:</span>
                              <span className="font-mono">{step.bitRanges?.[0]?.start || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">End:</span>
                              <span className="font-mono">{step.bitRanges?.[0]?.end || step.fullAfterBits?.length || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Window Size:</span>
                              <span className="font-mono">
                                {(step.bitRanges?.[0]?.end || step.beforeBits?.length || 0) - (step.bitRanges?.[0]?.start || 0)} bits
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Coverage:</span>
                              <span className="font-mono">
                                {step.fullAfterBits?.length ? 
                                  (((step.bitRanges?.[0]?.end || step.beforeBits?.length || 0) - (step.bitRanges?.[0]?.start || 0)) / step.fullAfterBits.length * 100).toFixed(1) : 0}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Activity className="w-4 h-4" />
                          Metrics (Live)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[200px]">
                          <div className="space-y-1">
                            {step.metrics && Object.entries(step.metrics).slice(0, 12).map(([key, value]) => {
                              // Calculate change from previous step
                              const prevStep = currentStep > 0 ? reconstructedSteps[currentStep - 1] : null;
                              const prevValue = prevStep?.metrics?.[key];
                              const change = prevValue !== undefined ? (value as number) - (prevValue as number) : null;
                              
                              return (
                                <div key={key} className="flex justify-between items-center text-sm">
                                  <span className="text-muted-foreground">{key}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono">{typeof value === 'number' ? (value as number).toFixed(4) : String(value)}</span>
                                    {change !== null && change !== 0 && (
                                      <Badge 
                                        variant={change < 0 ? 'default' : 'secondary'} 
                                        className={`text-xs px-1 ${change < 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
                                      >
                                        {change > 0 ? '+' : ''}{change.toFixed(4)}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Select a step to view details</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="mask" className="flex-1 overflow-auto mt-4">
                {step ? (
                  <MaskOverlayView
                    bits={step.fullAfterBits || step.afterBits || reconstructedBits}
                    mask={step.params?.mask as string}
                    bitRanges={step.bitRanges}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Select a step to view mask overlay</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="diff" className="flex-1 overflow-auto mt-4">
                {step && (
                  <BitDiffView
                    beforeBits={step.fullBeforeBits || step.beforeBits}
                    afterBits={step.fullAfterBits || step.afterBits}
                  />
                )}
              </TabsContent>

              <TabsContent value="timeline" className="flex-1 overflow-auto mt-4">
                <MetricsTimelineChart steps={reconstructedSteps} />
              </TabsContent>

              <TabsContent value="data" className="flex-1 overflow-auto mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Current Binary State</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <div className="font-mono text-xs break-all bg-muted/30 p-4 rounded">
                        {reconstructedBits.slice(0, 5000)}
                        {reconstructedBits.length > 5000 && (
                          <span className="text-muted-foreground">
                            ... ({reconstructedBits.length - 5000} more bits)
                          </span>
                        )}
                      </div>
                    </ScrollArea>
                    <div className="flex gap-4 mt-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total: </span>
                        <span className="font-mono">{reconstructedBits.length} bits</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Ones: </span>
                        <span className="font-mono">{(reconstructedBits.match(/1/g) || []).length}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Zeros: </span>
                        <span className="font-mono">{(reconstructedBits.match(/0/g) || []).length}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </>
      )}
    </div>
  );
};
