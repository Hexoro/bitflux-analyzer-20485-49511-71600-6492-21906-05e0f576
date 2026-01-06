/**
 * Job Queue System with Priority, Pause/Resume, and ETA
 * Manages background jobs with proper queue management
 */

export type JobPriority = 'low' | 'normal' | 'high' | 'critical';
export type JobQueueStatus = 'idle' | 'running' | 'paused' | 'stalled';

export interface QueuedJob {
  id: string;
  priority: JobPriority;
  createdAt: Date;
  startedAt?: Date;
  pausedAt?: Date;
  resumedAt?: Date;
  estimatedDuration?: number;
  progress: number;
  lastProgressUpdate?: Date;
}

export interface QueueStats {
  totalJobs: number;
  runningJobs: number;
  pausedJobs: number;
  pendingJobs: number;
  completedJobs: number;
  failedJobs: number;
  avgWaitTime: number;
  avgDuration: number;
}

export interface ETAEstimate {
  estimatedMs: number;
  estimatedCompletion: Date;
  formatted: string;
  confidence: 'low' | 'medium' | 'high';
}

const PRIORITY_ORDER: Record<JobPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

/**
 * Calculate ETA based on progress and elapsed time
 */
export function calculateJobETA(
  progress: number,
  startTime: number,
  avgMsPerPercent?: number
): ETAEstimate | null {
  if (progress <= 0 || progress >= 100) return null;
  
  const elapsedMs = performance.now() - startTime;
  const msPerPercent = avgMsPerPercent ?? (elapsedMs / progress);
  const remainingPercent = 100 - progress;
  const estimatedMs = remainingPercent * msPerPercent;
  const estimatedCompletion = new Date(Date.now() + estimatedMs);
  
  // Format as human readable
  const secs = Math.ceil(estimatedMs / 1000);
  let formatted: string;
  if (secs < 60) {
    formatted = `${secs}s`;
  } else if (secs < 3600) {
    const mins = Math.floor(secs / 60);
    const remainSecs = secs % 60;
    formatted = `${mins}m ${remainSecs}s`;
  } else {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    formatted = `${hours}h ${mins}m`;
  }
  
  // Confidence based on progress (more progress = more confident)
  const confidence: 'low' | 'medium' | 'high' = 
    progress < 10 ? 'low' : progress < 50 ? 'medium' : 'high';
  
  return { estimatedMs, estimatedCompletion, formatted, confidence };
}

/**
 * Sort jobs by priority then by creation time
 */
export function sortByPriority<T extends { priority: JobPriority; createdAt: Date }>(
  jobs: T[]
): T[] {
  return [...jobs].sort((a, b) => {
    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

/**
 * Stall Watchdog - Detects stalled operations
 */
export interface StallWatchdogConfig {
  maxStallMs: number;
  checkIntervalMs: number;
  onStall: (lastProgress: number, stallDurationMs: number) => void;
  onRecovery: () => void;
}

export class StallWatchdog {
  private lastProgressTime: number = 0;
  private lastProgress: number = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isStalled: boolean = false;
  private config: StallWatchdogConfig;

  constructor(config: StallWatchdogConfig) {
    this.config = config;
  }

  start(): void {
    this.lastProgressTime = performance.now();
    this.lastProgress = 0;
    this.isStalled = false;
    
    this.intervalId = setInterval(() => {
      this.check();
    }, this.config.checkIntervalMs);
  }

  reportProgress(progress: number): void {
    if (progress !== this.lastProgress) {
      this.lastProgress = progress;
      this.lastProgressTime = performance.now();
      
      // Recover from stall if progress resumed
      if (this.isStalled) {
        this.isStalled = false;
        this.config.onRecovery();
      }
    }
  }

  private check(): void {
    const now = performance.now();
    const stallDuration = now - this.lastProgressTime;
    
    if (stallDuration > this.config.maxStallMs && !this.isStalled) {
      this.isStalled = true;
      this.config.onStall(this.lastProgress, stallDuration);
    }
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isStalled = false;
  }

  getIsStalled(): boolean {
    return this.isStalled;
  }

  getStallDuration(): number {
    if (!this.isStalled) return 0;
    return performance.now() - this.lastProgressTime;
  }
}

/**
 * Format duration in various units
 */
export function formatDurationExtended(ms: number): {
  short: string;
  medium: string;
  long: string;
} {
  const secs = Math.round(ms / 1000);
  const mins = Math.floor(secs / 60);
  const hours = Math.floor(mins / 60);
  
  if (secs < 60) {
    return {
      short: `${secs}s`,
      medium: `${secs} seconds`,
      long: `${secs} seconds`,
    };
  } else if (mins < 60) {
    const remainSecs = secs % 60;
    return {
      short: `${mins}m ${remainSecs}s`,
      medium: `${mins} min ${remainSecs}s`,
      long: `${mins} minutes, ${remainSecs} seconds`,
    };
  } else {
    const remainMins = mins % 60;
    return {
      short: `${hours}h ${remainMins}m`,
      medium: `${hours}h ${remainMins}m`,
      long: `${hours} hours, ${remainMins} minutes`,
    };
  }
}

/**
 * Calculate queue statistics
 */
export function calculateQueueStats(
  jobs: Array<{
    status: string;
    startTime?: Date;
    endTime?: Date;
    createdAt?: Date;
  }>
): QueueStats {
  const now = Date.now();
  let totalWaitTime = 0;
  let totalDuration = 0;
  let waitCount = 0;
  let durationCount = 0;

  const stats: QueueStats = {
    totalJobs: jobs.length,
    runningJobs: 0,
    pausedJobs: 0,
    pendingJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    avgWaitTime: 0,
    avgDuration: 0,
  };

  for (const job of jobs) {
    switch (job.status) {
      case 'running':
        stats.runningJobs++;
        break;
      case 'paused':
        stats.pausedJobs++;
        break;
      case 'pending':
        stats.pendingJobs++;
        break;
      case 'completed':
        stats.completedJobs++;
        break;
      case 'failed':
      case 'cancelled':
        stats.failedJobs++;
        break;
    }

    // Calculate wait time (created to started)
    if (job.createdAt && job.startTime) {
      totalWaitTime += job.startTime.getTime() - job.createdAt.getTime();
      waitCount++;
    }

    // Calculate duration (started to ended)
    if (job.startTime && job.endTime) {
      totalDuration += job.endTime.getTime() - job.startTime.getTime();
      durationCount++;
    }
  }

  stats.avgWaitTime = waitCount > 0 ? totalWaitTime / waitCount : 0;
  stats.avgDuration = durationCount > 0 ? totalDuration / durationCount : 0;

  return stats;
}
