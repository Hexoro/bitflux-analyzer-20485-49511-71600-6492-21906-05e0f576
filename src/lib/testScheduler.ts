/**
 * Test Scheduler Settings
 * Manages user preferences for when and how tests run
 */

export interface TestSchedulerSettings {
  /** Whether to auto-run tests at all */
  autoRunEnabled: boolean;
  /** Seconds of idle before starting core tests (0 = manual only) */
  coreIdleDelaySec: number;
  /** Seconds of idle after core tests before starting extended tests */
  extendedIdleDelaySec: number;
  /** Batch size for extended tests (smaller = less blocking) */
  extendedBatchSize: number;
  /** Whether to show notifications for failures */
  showFailureNotifications: boolean;
  /** Maximum failures to track (memory optimization) */
  maxTrackedFailures: number;
}

const STORAGE_KEY = 'bsee_test_scheduler_settings';

const DEFAULT_SETTINGS: TestSchedulerSettings = {
  autoRunEnabled: true,
  coreIdleDelaySec: 30,
  extendedIdleDelaySec: 60,
  extendedBatchSize: 3,
  showFailureNotifications: true,
  maxTrackedFailures: 500
};

/**
 * Load settings from localStorage, or return defaults
 */
export function loadTestSchedulerSettings(): TestSchedulerSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    // Ignore parse errors
  }
  return { ...DEFAULT_SETTINGS };
}

/**
 * Save settings to localStorage
 */
export function saveTestSchedulerSettings(settings: TestSchedulerSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Reset to default settings
 */
export function resetTestSchedulerSettings(): TestSchedulerSettings {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
  return { ...DEFAULT_SETTINGS };
}

/**
 * Get default settings (for reference)
 */
export function getDefaultTestSchedulerSettings(): TestSchedulerSettings {
  return { ...DEFAULT_SETTINGS };
}

/**
 * Calculate ETA for test completion
 */
export interface TestETA {
  estimatedSecondsRemaining: number;
  estimatedCompletionTime: Date;
  formattedRemaining: string;
}

export function calculateTestETA(
  current: number,
  total: number,
  startTime: number,
  avgMsPerTest?: number
): TestETA | null {
  if (current === 0 || total === 0) return null;
  
  const elapsedMs = performance.now() - startTime;
  const avgMs = avgMsPerTest ?? (elapsedMs / current);
  const remainingTests = total - current;
  const estimatedMsRemaining = remainingTests * avgMs;
  const estimatedSecondsRemaining = Math.ceil(estimatedMsRemaining / 1000);
  const estimatedCompletionTime = new Date(Date.now() + estimatedMsRemaining);
  
  // Format as "Xm Ys" or "Xs"
  let formattedRemaining: string;
  if (estimatedSecondsRemaining >= 60) {
    const mins = Math.floor(estimatedSecondsRemaining / 60);
    const secs = estimatedSecondsRemaining % 60;
    formattedRemaining = `${mins}m ${secs}s`;
  } else {
    formattedRemaining = `${estimatedSecondsRemaining}s`;
  }
  
  return {
    estimatedSecondsRemaining,
    estimatedCompletionTime,
    formattedRemaining
  };
}

/**
 * Format duration in milliseconds to human readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const secs = ms / 1000;
  if (secs < 60) return `${secs.toFixed(1)}s`;
  const mins = Math.floor(secs / 60);
  const remainingSecs = Math.round(secs % 60);
  return `${mins}m ${remainingSecs}s`;
}
