/**
 * Startup Test Suite Display Component V5
 * Hybrid idle-based test scheduler with badge-only UI
 * Tests run in web workers to never freeze the UI
 * Includes stall watchdog for auto-resume
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  AlertTriangle,
  Loader2,
  FlaskConical,
  AlertCircle,
} from 'lucide-react';
import { TestSuiteResults } from '@/lib/testSuite';
import { runSmokeTests, SmokeTestSummary } from '@/lib/smokeTests';
import { onIdle } from '@/lib/idleDetector';
import {
  loadTestSchedulerSettings,
  TestSchedulerSettings,
} from '@/lib/testScheduler';
import { TestSettingsDialog, TestState, VectorTestResult } from '@/components/TestSettingsDialog';
import { toast } from 'sonner';

// Import workers using Vite's ?worker syntax for proper bundling
import CoreTestsWorker from '@/workers/coreTests.worker?worker';
import ExtendedTestsWorker from '@/workers/extendedTests.worker?worker';

interface StartupTestSuiteProps {
  onComplete?: (results: TestSuiteResults) => void;
  onApproved?: () => void;
  requireApproval?: boolean;
}

type TestPhase = 'idle' | 'smoke' | 'core-pending' | 'core-running' | 'extended-pending' | 'extended-running' | 'complete' | 'stalled';

// Stall detection configuration
const STALL_THRESHOLD_MS = 15000; // 15 seconds without progress = stall
const STALL_CHECK_INTERVAL_MS = 3000; // Check every 3 seconds
const MAX_AUTO_RESUMES = 3;

export const StartupTestSuite = ({ 
  onComplete, 
  onApproved,
  requireApproval = false
}: StartupTestSuiteProps) => {
  // Settings
  const [settings, setSettings] = useState<TestSchedulerSettings>(() => loadTestSchedulerSettings());
  
  // Dialog state
  const [showDialog, setShowDialog] = useState(false);
  
  // Test state
  const [phase, setPhase] = useState<TestPhase>('idle');
  const [smokeResults, setSmokeResults] = useState<SmokeTestSummary | null>(null);
  const [coreResults, setCoreResults] = useState<TestSuiteResults | null>(null);
  const [coreProgress, setCoreProgress] = useState({ current: 0, total: 0, category: '', eta: '' });
  const [vectorSummary, setVectorSummary] = useState({ opPassed: 0, opFailed: 0, metricPassed: 0, metricFailed: 0 });
  const [vectorProgress, setVectorProgress] = useState({ current: 0, total: 0, phase: '', eta: '' });
  const [vectorFailures, setVectorFailures] = useState<VectorTestResult[]>([]);
  const [extendedDuration, setExtendedDuration] = useState(0);
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null);
  const [stallCount, setStallCount] = useState(0);
  const [isStalled, setIsStalled] = useState(false);

  // Refs
  const coreWorkerRef = useRef<Worker | null>(null);
  const extendedWorkerRef = useRef<Worker | null>(null);
  const idleCleanupRef = useRef<(() => void) | null>(null);
  const hasRunOnce = useRef(false);
  const lastProgressTimeRef = useRef<number>(0);
  const lastProgressValueRef = useRef<number>(0);
  const stallCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoResumeCountRef = useRef<number>(0);

  // Computed states
  const isCoreRunning = phase === 'core-running';
  const isExtendedRunning = phase === 'extended-running';
  const isAnyRunning = isCoreRunning || isExtendedRunning;

  // Calculate totals for badge
  const totalFailed = (smokeResults?.failed ?? 0) + 
    (coreResults?.failed ?? 0) + 
    vectorSummary.opFailed + 
    vectorSummary.metricFailed;
  
  const totalPassed = (smokeResults?.passed ?? 0) + 
    (coreResults?.passed ?? 0) + 
    vectorSummary.opPassed + 
    vectorSummary.metricPassed;

  const hasResults = smokeResults !== null || coreResults !== null || 
    (vectorSummary.opPassed + vectorSummary.opFailed + vectorSummary.metricPassed + vectorSummary.metricFailed) > 0;

  // Stop stall checker
  const stopStallChecker = useCallback(() => {
    if (stallCheckIntervalRef.current) {
      clearInterval(stallCheckIntervalRef.current);
      stallCheckIntervalRef.current = null;
    }
  }, []);

  // Start stall checker for extended tests
  const startStallChecker = useCallback((onStallDetected: () => void) => {
    stopStallChecker();
    lastProgressTimeRef.current = performance.now();
    
    stallCheckIntervalRef.current = setInterval(() => {
      const now = performance.now();
      const timeSinceProgress = now - lastProgressTimeRef.current;
      
      if (timeSinceProgress > STALL_THRESHOLD_MS) {
        setIsStalled(true);
        setStallCount(prev => prev + 1);
        
        if (autoResumeCountRef.current < MAX_AUTO_RESUMES) {
          autoResumeCountRef.current++;
          toast.warning(`Test stall detected, auto-resuming (${autoResumeCountRef.current}/${MAX_AUTO_RESUMES})...`);
          onStallDetected();
        } else {
          stopStallChecker();
          toast.error('Tests stalled repeatedly. Check the Failures tab for details.');
        }
      }
    }, STALL_CHECK_INTERVAL_MS);
  }, [stopStallChecker]);

  // Cancel all workers
  const cancelAll = useCallback(() => {
    stopStallChecker();
    if (coreWorkerRef.current) {
      coreWorkerRef.current.postMessage({ type: 'cancel' });
      coreWorkerRef.current.terminate();
      coreWorkerRef.current = null;
    }
    if (extendedWorkerRef.current) {
      extendedWorkerRef.current.postMessage({ type: 'cancel' });
      extendedWorkerRef.current.terminate();
      extendedWorkerRef.current = null;
    }
    if (idleCleanupRef.current) {
      idleCleanupRef.current();
      idleCleanupRef.current = null;
    }
    setIsStalled(false);
  }, [stopStallChecker]);

  // Run smoke tests (sync, instant)
  const runSmoke = useCallback(() => {
    setPhase('smoke');
    const results = runSmokeTests();
    setSmokeResults(results);
    setLastRunTime(new Date());
    return results;
  }, []);

  // Run core tests in worker
  const runCore = useCallback(() => {
    return new Promise<TestSuiteResults | null>((resolve) => {
      cancelAll();
      setPhase('core-running');
      setCoreProgress({ current: 0, total: 0, category: 'Loading...', eta: '' });

      const worker = new CoreTestsWorker();
      coreWorkerRef.current = worker;

      worker.onmessage = (ev) => {
        const msg = ev.data;
        if (!msg || typeof msg !== 'object') return;

        if (msg.type === 'progress') {
          setCoreProgress({
            current: msg.current,
            total: msg.total,
            category: msg.category,
            eta: msg.eta || ''
          });
          return;
        }

        if (msg.type === 'done') {
          const results: TestSuiteResults = {
            totalTests: msg.totalTests,
            passed: msg.passed,
            failed: msg.failed,
            duration: msg.duration,
            results: msg.results,
            timestamp: new Date()
          };
          setCoreResults(results);
          setLastRunTime(new Date());
          onComplete?.(results);
          
          coreWorkerRef.current?.terminate();
          coreWorkerRef.current = null;
          setPhase('extended-pending');
          resolve(results);
          return;
        }

        if (msg.type === 'error') {
          console.error('Core tests error:', msg.message);
          coreWorkerRef.current?.terminate();
          coreWorkerRef.current = null;
          setPhase('complete');
          resolve(null);
        }
      };

      worker.onerror = (err) => {
        console.error('Core worker error:', err);
        coreWorkerRef.current?.terminate();
        coreWorkerRef.current = null;
        setPhase('complete');
        resolve(null);
      };

      worker.postMessage({ type: 'run' });
    });
  }, [cancelAll, onComplete]);

  // Run extended tests in worker with stall detection
  const runExtended = useCallback((resumeFrom: number = 0) => {
    return new Promise<void>((resolve) => {
      // Don't cancel core worker, just extended
      if (extendedWorkerRef.current) {
        extendedWorkerRef.current.postMessage({ type: 'cancel' });
        extendedWorkerRef.current.terminate();
        extendedWorkerRef.current = null;
      }
      stopStallChecker();

      setPhase('extended-running');
      setIsStalled(false);
      if (resumeFrom === 0) {
        setVectorProgress({ current: 0, total: 0, phase: 'Loading...', eta: '' });
        setVectorFailures([]);
        setVectorSummary({ opPassed: 0, opFailed: 0, metricPassed: 0, metricFailed: 0 });
        autoResumeCountRef.current = 0;
      }

      const worker = new ExtendedTestsWorker();
      extendedWorkerRef.current = worker;

      // Start stall detection
      startStallChecker(() => {
        // On stall, try to resume from last known progress
        const resumeIndex = lastProgressValueRef.current + 1;
        worker.terminate();
        extendedWorkerRef.current = null;
        runExtended(resumeIndex);
      });

      worker.onmessage = (ev) => {
        const msg = ev.data;
        if (!msg || typeof msg !== 'object') return;

        if (msg.type === 'progress') {
          // Update stall detection
          lastProgressTimeRef.current = performance.now();
          lastProgressValueRef.current = msg.current;
          setIsStalled(false);
          
          setVectorProgress({
            current: msg.current,
            total: msg.total,
            phase: msg.phase,
            eta: msg.eta || ''
          });
          return;
        }

        if (msg.type === 'done') {
          stopStallChecker();
          setVectorSummary(prev => ({
            opPassed: prev.opPassed + msg.summary.opPassed,
            opFailed: prev.opFailed + msg.summary.opFailed,
            metricPassed: prev.metricPassed + msg.summary.metricPassed,
            metricFailed: prev.metricFailed + msg.summary.metricFailed,
          }));
          setVectorFailures(prev => [...prev, ...(msg.failures || [])]);
          setExtendedDuration(prev => prev + (msg.durationMs || 0));
          setLastRunTime(new Date());
          
          extendedWorkerRef.current?.terminate();
          extendedWorkerRef.current = null;
          setPhase('complete');
          setIsStalled(false);
          resolve();
          return;
        }

        if (msg.type === 'error') {
          console.error('Extended tests error:', msg.message);
          stopStallChecker();
          extendedWorkerRef.current?.terminate();
          extendedWorkerRef.current = null;
          setPhase('complete');
          setIsStalled(false);
          resolve();
        }
      };

      worker.onerror = (err) => {
        console.error('Extended worker error:', err);
        stopStallChecker();
        extendedWorkerRef.current?.terminate();
        extendedWorkerRef.current = null;
        setPhase('complete');
        setIsStalled(false);
        resolve();
      };

      worker.postMessage({ 
        type: 'run', 
        maxFailures: settings.maxTrackedFailures,
        batchSize: settings.extendedBatchSize,
        resumeFrom
      });
    });
  }, [settings.maxTrackedFailures, settings.extendedBatchSize, startStallChecker, stopStallChecker]);

  // Run all tests in sequence
  const runAll = useCallback(async () => {
    hasRunOnce.current = true;
    cancelAll();
    
    // Smoke first (instant)
    runSmoke();
    
    // Then core in worker
    await runCore();
    
    // Then extended in worker (runCore sets phase to extended-pending, so we start immediately)
    await runExtended();
  }, [cancelAll, runSmoke, runCore, runExtended]);

  // Schedule tests based on idle detection
  useEffect(() => {
    if (!settings.autoRunEnabled) return;
    if (hasRunOnce.current) return;

    // Run smoke test immediately on mount
    const smokeResult = runSmoke();
    setPhase('core-pending');

    // Schedule core tests after idle
    const cleanupIdle = onIdle(() => {
      if (hasRunOnce.current) return;
      hasRunOnce.current = true;

      runCore().then(() => {
        // Schedule extended tests after more idle time
        const extendedCleanup = onIdle(() => {
          runExtended();
        }, settings.extendedIdleDelaySec * 1000);
        
        // Store for cleanup
        idleCleanupRef.current = extendedCleanup;
      });
    }, settings.coreIdleDelaySec * 1000);

    idleCleanupRef.current = cleanupIdle;

    return () => {
      cancelAll();
    };
  }, [settings.autoRunEnabled, settings.coreIdleDelaySec, settings.extendedIdleDelaySec, runSmoke, runCore, runExtended, cancelAll]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAll();
    };
  }, [cancelAll]);

  // Build test state for dialog
  const testState: TestState = {
    smokeResults,
    coreResults,
    coreProgress,
    isCoreRunning,
    vectorSummary,
    vectorProgress,
    vectorFailures,
    isExtendedRunning,
    extendedDuration,
    lastRunTime,
  };

  // Badge appearance
  const getBadgeColor = () => {
    if (isStalled) return 'text-orange-500';
    if (isAnyRunning) return 'text-primary';
    if (!hasResults) return 'text-muted-foreground';
    if (totalFailed > 0) return 'text-amber-500';
    return 'text-green-500';
  };

  const getBadgeHoverBg = () => {
    if (isStalled) return 'hover:bg-orange-500/10';
    if (isAnyRunning) return 'hover:bg-primary/10';
    if (!hasResults) return 'hover:bg-muted';
    if (totalFailed > 0) return 'hover:bg-amber-500/10';
    return 'hover:bg-green-500/10';
  };

  return (
    <>
      {/* Badge button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setShowDialog(true);
          // Auto-start tests if none have run
          if (!hasResults && !isAnyRunning && !hasRunOnce.current) {
            runAll();
          }
        }}
        className={`h-8 px-2 text-xs gap-1.5 transition-all duration-300 relative overflow-hidden ${getBadgeColor()} ${getBadgeHoverBg()}`}
      >
        {/* Animated background for running state */}
        {isAnyRunning && !isStalled && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-pulse" />
        )}
        
        {/* Warning background for stalled state */}
        {isStalled && (
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-orange-500/20 to-orange-500/10 animate-pulse" />
        )}
        
        <FlaskConical className={`w-3.5 h-3.5 ${isAnyRunning && !isStalled ? 'animate-bounce' : ''}`} />
        
        {isStalled ? (
          <div className="flex items-center gap-1.5 relative">
            <AlertCircle className="w-3 h-3 text-orange-500" />
            <div className="hidden sm:flex flex-col items-start text-[10px] leading-tight">
              <span className="font-semibold text-orange-500">Stalled</span>
              <span className="text-muted-foreground">Resuming...</span>
            </div>
          </div>
        ) : isAnyRunning ? (
          <div className="flex items-center gap-1.5 relative">
            <Loader2 className="w-3 h-3 animate-spin" />
            <div className="hidden sm:flex flex-col items-start text-[10px] leading-tight">
              <span className="font-semibold">Testing...</span>
              <span className="text-muted-foreground">
                {isExtendedRunning 
                  ? `${vectorProgress.current}/${vectorProgress.total || '?'}`
                  : `${coreProgress.current}/${coreProgress.total || '?'}`}
              </span>
            </div>
          </div>
        ) : hasResults ? (
          <div className="flex items-center gap-1.5">
            {totalFailed > 0 ? (
              <>
                <AlertTriangle className="w-3 h-3" />
                <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                  {totalFailed}
                </Badge>
              </>
            ) : (
              <CheckCircle className="w-3 h-3" />
            )}
            <span className="hidden sm:inline font-medium text-[11px]">
              {totalPassed} passed
            </span>
          </div>
        ) : (
          <span className="hidden sm:inline font-medium">Tests</span>
        )}
      </Button>

      {/* Settings/Results Dialog */}
      <TestSettingsDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        testState={testState}
        onRunSmoke={runSmoke}
        onRunCore={() => {
          hasRunOnce.current = true;
          runCore();
        }}
        onRunExtended={() => {
          hasRunOnce.current = true;
          runExtended();
        }}
        onRunAll={runAll}
        onCancel={() => {
          cancelAll();
          setPhase('complete');
        }}
        settings={settings}
        onSettingsChange={setSettings}
      />
    </>
  );
};
