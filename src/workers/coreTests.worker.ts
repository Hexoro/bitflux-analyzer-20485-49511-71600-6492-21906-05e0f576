/// <reference lib="webworker" />

/**
 * Core Tests Worker - Runs the main test suite in background
 * Uses dynamic imports to avoid blocking module loading
 */

type TestResult = {
  name: string;
  category: string;
  passed: boolean;
  message: string;
  duration: number;
};

type ProgressMessage = {
  type: 'progress';
  current: number;
  total: number;
  category: string;
  eta?: string;
};

type DoneMessage = {
  type: 'done';
  results: TestResult[];
  totalTests: number;
  passed: number;
  failed: number;
  duration: number;
};

type ErrorMessage = { type: 'error'; message: string };

type RunMessage = { type: 'run' };
type CancelMessage = { type: 'cancel' };

let cancelled = false;

const post = (msg: ProgressMessage | DoneMessage | ErrorMessage) => {
  (self as unknown as Worker).postMessage(msg);
};

// Micro-yield to allow cancellation and prevent blocking
const microYield = (): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, 0));
};

self.onmessage = async (ev: MessageEvent<RunMessage | CancelMessage>) => {
  const data = ev.data;
  if (data.type === 'cancel') {
    cancelled = true;
    return;
  }

  cancelled = false;
  const startTime = performance.now();

  try {
    // Dynamically import the test suite
    const { testSuite } = await import('@/lib/testSuite');
    
    const results: TestResult[] = [];
    let passed = 0;
    let failed = 0;

    // Run all tests with progress callback
    const suiteResults = await testSuite.runAll((current, total, category) => {
      if (cancelled) return;
      
      const elapsed = performance.now() - startTime;
      const avgMs = current > 0 ? elapsed / current : 50;
      const remaining = total - current;
      const etaMs = remaining * avgMs;
      const etaSec = Math.ceil(etaMs / 1000);
      const eta = etaSec >= 60 
        ? `${Math.floor(etaSec / 60)}m ${etaSec % 60}s`
        : `${etaSec}s`;

      post({ 
        type: 'progress', 
        current, 
        total, 
        category,
        eta
      });
    });

    if (cancelled) {
      return;
    }

    post({
      type: 'done',
      results: suiteResults.results,
      totalTests: suiteResults.totalTests,
      passed: suiteResults.passed,
      failed: suiteResults.failed,
      duration: suiteResults.duration
    });
  } catch (e) {
    post({ type: 'error', message: (e as Error).message || 'Unknown worker error' });
  }
};
