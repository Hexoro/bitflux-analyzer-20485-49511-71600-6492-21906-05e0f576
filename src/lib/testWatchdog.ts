/**
 * Test Watchdog - Monitors test execution for stalls and auto-resumes
 */

export interface TestWatchdogState {
  isStalled: boolean;
  stallCount: number;
  lastStallAt: Date | null;
  lastResumeAt: Date | null;
  stalledOnId: string | null;
  stallDurationMs: number;
}

export interface TestWatchdogConfig {
  /** Max time without progress before considering stalled (ms) */
  stallThresholdMs: number;
  /** How often to check for stalls (ms) */
  checkIntervalMs: number;
  /** Max consecutive stalls before giving up */
  maxConsecutiveStalls: number;
  /** Callback when stall detected */
  onStall?: (state: TestWatchdogState) => void;
  /** Callback when auto-resuming */
  onResume?: (state: TestWatchdogState) => void;
  /** Callback when max stalls reached */
  onMaxStalls?: (state: TestWatchdogState) => void;
}

const DEFAULT_CONFIG: TestWatchdogConfig = {
  stallThresholdMs: 10000, // 10 seconds
  checkIntervalMs: 2000, // Check every 2 seconds
  maxConsecutiveStalls: 3,
};

export class TestWatchdog {
  private config: TestWatchdogConfig;
  private state: TestWatchdogState;
  private lastProgress: number = 0;
  private lastProgressTime: number = 0;
  private currentPhase: string = '';
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private resumeCallback: (() => void) | null = null;
  private consecutiveStalls: number = 0;

  constructor(config: Partial<TestWatchdogConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      isStalled: false,
      stallCount: 0,
      lastStallAt: null,
      lastResumeAt: null,
      stalledOnId: null,
      stallDurationMs: 0,
    };
  }

  /**
   * Start monitoring
   */
  start(resumeCallback: () => void): void {
    this.stop(); // Clear any existing
    this.resumeCallback = resumeCallback;
    this.lastProgressTime = performance.now();
    this.consecutiveStalls = 0;
    
    this.intervalId = setInterval(() => {
      this.checkForStall();
    }, this.config.checkIntervalMs);
  }

  /**
   * Report progress - resets stall timer
   */
  reportProgress(current: number, phase: string): void {
    const now = performance.now();
    
    // Only reset timer if actual progress was made
    if (current !== this.lastProgress || phase !== this.currentPhase) {
      this.lastProgress = current;
      this.currentPhase = phase;
      this.lastProgressTime = now;
      
      // Reset consecutive stalls on successful progress
      this.consecutiveStalls = 0;
      
      // Recover from stall if we were stalled
      if (this.state.isStalled) {
        this.state.isStalled = false;
        this.state.lastResumeAt = new Date();
        this.config.onResume?.(this.state);
      }
    }
  }

  /**
   * Check if tests are stalled
   */
  private checkForStall(): void {
    const now = performance.now();
    const timeSinceProgress = now - this.lastProgressTime;
    
    if (timeSinceProgress > this.config.stallThresholdMs && !this.state.isStalled) {
      // Detected stall
      this.state.isStalled = true;
      this.state.stallCount++;
      this.state.lastStallAt = new Date();
      this.state.stalledOnId = this.currentPhase;
      this.state.stallDurationMs = timeSinceProgress;
      this.consecutiveStalls++;
      
      this.config.onStall?.(this.state);
      
      // Check if we've hit max consecutive stalls
      if (this.consecutiveStalls >= this.config.maxConsecutiveStalls) {
        this.config.onMaxStalls?.(this.state);
        this.stop();
        return;
      }
      
      // Attempt auto-resume
      if (this.resumeCallback) {
        this.resumeCallback();
      }
    }
    
    // Update stall duration if currently stalled
    if (this.state.isStalled) {
      this.state.stallDurationMs = now - this.lastProgressTime;
    }
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.resumeCallback = null;
  }

  /**
   * Get current state
   */
  getState(): TestWatchdogState {
    return { ...this.state };
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.stop();
    this.state = {
      isStalled: false,
      stallCount: 0,
      lastStallAt: null,
      lastResumeAt: null,
      stalledOnId: null,
      stallDurationMs: 0,
    };
    this.lastProgress = 0;
    this.lastProgressTime = 0;
    this.currentPhase = '';
    this.consecutiveStalls = 0;
  }
}

// Singleton instance for global test monitoring
export const globalTestWatchdog = new TestWatchdog();
