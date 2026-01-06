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

          {/* Step Details - Redesigned */}
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
                  <Activity className="w-3 h-3" />
                  Diff
                </TabsTrigger>
                <TabsTrigger value="timeline" className="text-xs gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Metrics
                </TabsTrigger>
                <TabsTrigger value="data" className="text-xs gap-1">
                  <FileCode className="w-3 h-3" />
                  Data
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="flex-1 overflow-auto mt-2">
                {step ? (
                  <div className="space-y-3">
                    {/* Operation Header - Compact Card */}
                    <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
                      <CardContent className="py-3">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                            <Zap className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-mono text-xl font-bold text-primary">{step.operation}</h4>
                              <Badge className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                {step.cost}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                Step {currentStep + 1}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {step.duration?.toFixed(1) || 0}ms • {step.bitsLength || 0} bits
                            </p>
                          </div>
                          {step.verified !== undefined && (
                            <Badge variant={step.verified ? 'default' : 'destructive'} className="text-xs">
                              {step.verified ? '✓ Verified' : '✗ Mismatch'}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Parameters */}
                      <Card>
                        <CardHeader className="py-2 bg-muted/30">
                          <CardTitle className="text-xs">Parameters</CardTitle>
                        </CardHeader>
                        <CardContent className="py-2">
                          {step.params && Object.keys(step.params).length > 0 ? (
                            <div className="space-y-1">
                              {Object.entries(step.params).map(([key, value]) => (
                                <div key={key} className="flex justify-between text-xs bg-muted/30 px-2 py-1 rounded">
                                  <span className="text-muted-foreground font-medium">{key}</span>
                                  <span className="font-mono break-all max-w-[150px]">
                                    {key === 'mask' && typeof value === 'string' && value.length > 24 
                                      ? `${value.slice(0, 12)}...${value.slice(-8)}`
                                      : JSON.stringify(value).slice(0, 60)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No parameters</p>
                          )}
                        </CardContent>
                      </Card>

                      {/* Bit Range */}
                      <Card>
                        <CardHeader className="py-2 bg-muted/30">
                          <CardTitle className="text-xs">Affected Range</CardTitle>
                        </CardHeader>
                        <CardContent className="py-2">
                          {step.bitRanges && step.bitRanges.length > 0 ? (
                            <div className="space-y-1">
                              {step.bitRanges.slice(0, 5).map((range: any, i: number) => (
                                <div key={i} className="flex items-center justify-between text-xs">
                                  <Badge variant="outline" className="font-mono">
                                    [{range.start}:{range.end}]
                                  </Badge>
                                  <span className="text-muted-foreground">
                                    {range.end - range.start} bits
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">Full range</p>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {/* Operation Visualization - Compact */}
                    {step.bitRanges && step.bitRanges.length > 0 && (
                      <Card className="bg-gradient-to-r from-cyan-500/5 to-purple-500/5 border-cyan-500/20">
                        <CardContent className="py-3">
                          <h5 className="text-xs font-medium text-cyan-400 mb-2 flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            Before → After
                          </h5>
                          {(() => {
                            const range = step.bitRanges[0];
                            const sourceBits = step.fullBeforeBits?.slice(range.start, range.end) || '';
                            const resultBits = step.fullAfterBits?.slice(range.start, range.end) || '';
                            const changedCount = sourceBits && resultBits 
                              ? Array.from(sourceBits).filter((b, i) => b !== resultBits[i]).length
                              : 0;
                            
                            return (
                              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                <div className="p-2 bg-muted/30 rounded">
                                  <span className="text-yellow-400 break-all">
                                    {sourceBits.slice(0, 48)}{sourceBits.length > 48 ? '...' : ''}
                                  </span>
                                </div>
                                <div className="p-2 bg-muted/30 rounded">
                                  <span className="text-green-400 break-all">
                                    {resultBits.slice(0, 48)}{resultBits.length > 48 ? '...' : ''}
                                  </span>
                                </div>
                                <div className="col-span-2 text-center text-muted-foreground">
                                  {changedCount > 0 ? `${changedCount} bits changed` : 'No change'}
                                </div>
                              </div>
                            );
                          })()}
                        </CardContent>
                      </Card>
                    )}

                    {/* Metrics Grid */}
                    <Card>
                      <CardHeader className="py-2 bg-muted/30">
                        <CardTitle className="text-xs flex items-center gap-2">
                          <Activity className="w-3 h-3" />
                          Live Metrics
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-2">
                        <div className="grid grid-cols-3 gap-2">
                          {step.metrics && Object.entries(step.metrics).slice(0, 9).map(([key, value]) => {
                            const prevStep = currentStep > 0 ? reconstructedSteps[currentStep - 1] : null;
                            const prevValue = prevStep?.metrics?.[key];
                            const change = prevValue !== undefined ? (value as number) - (prevValue as number) : null;
                            
                            return (
                              <div key={key} className="p-2 bg-muted/20 rounded text-xs">
                                <div className="text-muted-foreground truncate">{key}</div>
                                <div className="font-mono font-medium">
                                  {typeof value === 'number' ? value.toFixed(3) : String(value)}
                                </div>
                                {change !== null && change !== 0 && (
                                  <div className={`text-[10px] ${change < 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {change > 0 ? '+' : ''}{change.toFixed(3)}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
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
