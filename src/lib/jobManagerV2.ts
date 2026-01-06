/**
 * Job Manager V2 - Reworked with real strategy execution
 * Uses the strategyExecutionEngine for actual transformation execution
 * Includes priority queuing, batch operations, ETA calculation, and stall detection
 */

import { fileSystemManager, BinaryFile } from './fileSystemManager';
import { pythonModuleSystem, StrategyConfig } from './pythonModuleSystem';
import { strategyExecutionEngine, ExecutionPipelineResult } from './strategyExecutionEngine';

export type JobStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type JobPriority = 'low' | 'normal' | 'high' | 'critical';

const PRIORITY_ORDER: Record<JobPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export interface JobPreset {
  strategyId: string;
  strategyName: string;
  iterations: number;
}

export interface JobExecutionResult {
  id: string;
  strategyId: string;
  strategyName: string;
  dataFileId: string;
  dataFileName: string;
  initialBits: string;
  finalBits: string;
  totalDuration: number;
  startTime: Date;
  endTime: Date;
  success: boolean;
  error?: string;
  totalScore?: number;
  totalOperations?: number;
}

export interface ETAEstimate {
  estimatedMs: number;
  estimatedCompletion: Date;
  formatted: string;
  confidence: 'low' | 'medium' | 'high';
}

export interface Job {
  id: string;
  name: string;
  dataFileId: string;
  dataFileName: string;
  presets: JobPreset[];
  status: JobStatus;
  progress: number;
  currentPresetIndex: number;
  currentIteration: number;
  startTime?: Date;
  endTime?: Date;
  pausedAt?: Date;
  error?: string;
  results: JobExecutionResult[];
  // Priority and queue management
  priority: JobPriority;
  queuePosition?: number;
  createdAt: Date;
  // ETA tracking
  eta?: ETAEstimate;
  lastProgressUpdate?: Date;
  avgMsPerPercent?: number;
  // Tags for filtering
  tags: string[];
  // Retry configuration
  maxRetries: number;
  retryCount: number;
  // Dependencies
  dependsOn?: string[];
  // Batch ID for grouped jobs
  batchId?: string;
}

export interface JobQueueStats {
  totalJobs: number;
  runningJobs: number;
  pausedJobs: number;
  pendingJobs: number;
  completedJobs: number;
  failedJobs: number;
  avgWaitTime: number;
  avgDuration: number;
  throughputPerHour: number;
}

export interface BatchJobConfig {
  name: string;
  dataFileIds: string[];
  presets: JobPreset[];
  priority?: JobPriority;
  tags?: string[];
  runParallel?: boolean;
  maxParallel?: number;
}

const JOBS_KEY = 'bitwise_jobs_v2';
const COMPLETED_KEY = 'bitwise_completed_jobs_v2';
const MAX_PARALLEL_JOBS = 3;
const STALL_THRESHOLD_MS = 30000; // 30 seconds

class JobManagerV2 {
  private jobs: Map<string, Job> = new Map();
  private completedJobs: Job[] = [];
  private activeJobIds: Set<string> = new Set();
  private abortControllers: Map<string, AbortController> = new Map();
  private listeners: Set<() => void> = new Set();
  private stallCheckIntervalId: ReturnType<typeof setInterval> | null = null;
  private maxParallel: number = MAX_PARALLEL_JOBS;
  private batchIdCounter: number = 0;

  constructor() {
    this.loadFromStorage();
    this.startStallDetection();
  }

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(JOBS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        parsed.forEach((job: any) => {
          this.jobs.set(job.id, {
            ...job,
            startTime: job.startTime ? new Date(job.startTime) : undefined,
            endTime: job.endTime ? new Date(job.endTime) : undefined,
            createdAt: job.createdAt ? new Date(job.createdAt) : new Date(),
            pausedAt: job.pausedAt ? new Date(job.pausedAt) : undefined,
            lastProgressUpdate: job.lastProgressUpdate ? new Date(job.lastProgressUpdate) : undefined,
            priority: job.priority || 'normal',
            tags: job.tags || [],
            maxRetries: job.maxRetries ?? 0,
            retryCount: job.retryCount ?? 0,
          });
        });
      }

      const completedData = localStorage.getItem(COMPLETED_KEY);
      if (completedData) {
        this.completedJobs = JSON.parse(completedData).map((job: any) => ({
          ...job,
          startTime: job.startTime ? new Date(job.startTime) : undefined,
          endTime: job.endTime ? new Date(job.endTime) : undefined,
          createdAt: job.createdAt ? new Date(job.createdAt) : new Date(),
          priority: job.priority || 'normal',
          tags: job.tags || [],
        }));
      }
    } catch (e) {
      console.error('Failed to load jobs:', e);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(JOBS_KEY, JSON.stringify(Array.from(this.jobs.values())));
      localStorage.setItem(COMPLETED_KEY, JSON.stringify(this.completedJobs.slice(0, 100)));
    } catch (e) {
      console.error('Failed to save jobs:', e);
    }
  }

  private startStallDetection(): void {
    if (this.stallCheckIntervalId) return;
    
    this.stallCheckIntervalId = setInterval(() => {
      const now = Date.now();
      for (const jobId of this.activeJobIds) {
        const job = this.jobs.get(jobId);
        if (job && job.status === 'running' && job.lastProgressUpdate) {
          const stallDuration = now - job.lastProgressUpdate.getTime();
          if (stallDuration > STALL_THRESHOLD_MS) {
            console.warn(`Job ${job.name} appears stalled (${Math.round(stallDuration / 1000)}s no progress)`);
            // Could auto-pause or notify here
          }
        }
      }
    }, 10000); // Check every 10 seconds
  }

  private stopStallDetection(): void {
    if (this.stallCheckIntervalId) {
      clearInterval(this.stallCheckIntervalId);
      this.stallCheckIntervalId = null;
    }
  }

  /**
   * Calculate ETA based on progress and elapsed time
   */
  private calculateETA(job: Job): ETAEstimate | null {
    if (!job.startTime || job.progress <= 0 || job.progress >= 100) return null;
    
    const elapsedMs = Date.now() - job.startTime.getTime();
    const msPerPercent = job.avgMsPerPercent ?? (elapsedMs / job.progress);
    const remainingPercent = 100 - job.progress;
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
    
    // Confidence based on progress
    const confidence: 'low' | 'medium' | 'high' = 
      job.progress < 10 ? 'low' : job.progress < 50 ? 'medium' : 'high';
    
    return { estimatedMs, estimatedCompletion, formatted, confidence };
  }

  /**
   * Sort jobs by priority then by creation time
   */
  private sortByPriority(jobs: Job[]): Job[] {
    return [...jobs].sort((a, b) => {
      const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  /**
   * Update queue positions for pending jobs
   */
  private updateQueuePositions(): void {
    const pending = this.sortByPriority(
      Array.from(this.jobs.values()).filter(j => j.status === 'pending')
    );
    pending.forEach((job, index) => {
      job.queuePosition = index + 1;
    });
  }

  /**
   * Process the queue - start next jobs if slots available
   */
  private async processQueue(): Promise<void> {
    if (this.activeJobIds.size >= this.maxParallel) return;
    
    // Get pending jobs sorted by priority
    const pending = this.sortByPriority(
      Array.from(this.jobs.values()).filter(j => j.status === 'pending')
    );
    
    // Check dependencies and start eligible jobs
    for (const job of pending) {
      if (this.activeJobIds.size >= this.maxParallel) break;
      
      // Check if dependencies are met
      if (job.dependsOn && job.dependsOn.length > 0) {
        const depsComplete = job.dependsOn.every(depId => {
          const dep = this.completedJobs.find(j => j.id === depId);
          return dep && dep.status === 'completed';
        });
        if (!depsComplete) continue;
      }
      
      // Start this job
      this.startJobInternal(job.id).catch(err => {
        console.error(`Failed to start queued job ${job.id}:`, err);
      });
    }
  }

  /**
   * Validate job requirements before creation
   */
  validateJobRequirements(dataFileId: string, presets: JobPreset[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check data file
    const dataFile = fileSystemManager.getFiles().find(f => f.id === dataFileId);
    if (!dataFile) {
      errors.push('Data file not found');
    } else {
      const bits = dataFile.state.model.getBits();
      if (!bits || bits.length === 0) {
        errors.push('Data file has no binary content');
      }
    }

    // Check presets
    if (presets.length === 0) {
      errors.push('At least one strategy preset is required');
    }

    // Validate each strategy
    presets.forEach((preset, index) => {
      const strategy = pythonModuleSystem.getStrategy(preset.strategyId);
      if (!strategy) {
        errors.push(`Strategy "${preset.strategyName}" not found`);
      } else {
        const validation = pythonModuleSystem.validateStrategy(preset.strategyId);
        if (!validation.valid) {
          errors.push(`Strategy "${preset.strategyName}": ${validation.errors.join(', ')}`);
        }
      }

      if (preset.iterations < 1) {
        errors.push(`Preset ${index + 1}: iterations must be at least 1`);
      }
    });

    return { valid: errors.length === 0, errors };
  }

  /**
   * Create a new job with priority support
   */
  createJob(
    name: string, 
    dataFileId: string, 
    presets: JobPreset[],
    options?: {
      priority?: JobPriority;
      tags?: string[];
      maxRetries?: number;
      dependsOn?: string[];
      batchId?: string;
    }
  ): Job {
    const validation = this.validateJobRequirements(dataFileId, presets);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    const dataFile = fileSystemManager.getFiles().find(f => f.id === dataFileId)!;

    const job: Job = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      dataFileId,
      dataFileName: dataFile.name,
      presets,
      status: 'pending',
      progress: 0,
      currentPresetIndex: 0,
      currentIteration: 0,
      results: [],
      priority: options?.priority || 'normal',
      createdAt: new Date(),
      tags: options?.tags || [],
      maxRetries: options?.maxRetries ?? 0,
      retryCount: 0,
      dependsOn: options?.dependsOn,
      batchId: options?.batchId,
    };

    this.jobs.set(job.id, job);
    this.updateQueuePositions();
    this.saveToStorage();
    this.notifyListeners();
    return job;
  }

  /**
   * Create a batch of jobs from multiple files
   */
  createBatch(config: BatchJobConfig): { batchId: string; jobs: Job[] } {
    const batchId = `batch_${Date.now()}_${this.batchIdCounter++}`;
    const createdJobs: Job[] = [];
    
    let prevJobId: string | undefined;
    
    for (const dataFileId of config.dataFileIds) {
      try {
        const file = fileSystemManager.getFiles().find(f => f.id === dataFileId);
        const jobName = `${config.name} - ${file?.name || dataFileId}`;
        
        const job = this.createJob(jobName, dataFileId, config.presets, {
          priority: config.priority,
          tags: config.tags,
          batchId,
          // If not parallel, depend on previous job
          dependsOn: !config.runParallel && prevJobId ? [prevJobId] : undefined,
        });
        
        createdJobs.push(job);
        prevJobId = job.id;
      } catch (err) {
        console.error(`Failed to create batch job for ${dataFileId}:`, err);
      }
    }
    
    return { batchId, jobs: createdJobs };
  }

  /**
   * Start a batch - starts first job or all if parallel
   */
  async startBatch(batchId: string): Promise<void> {
    const batchJobs = Array.from(this.jobs.values())
      .filter(j => j.batchId === batchId && j.status === 'pending')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    
    if (batchJobs.length === 0) return;
    
    // Check if parallel or sequential based on dependencies
    const hasSequentialDeps = batchJobs.some(j => j.dependsOn && j.dependsOn.length > 0);
    
    if (hasSequentialDeps) {
      // Start only the first job, queue processing will handle rest
      await this.startJob(batchJobs[0].id);
    } else {
      // Start all jobs up to max parallel
      for (const job of batchJobs.slice(0, this.maxParallel)) {
        this.startJob(job.id).catch(console.error);
      }
    }
  }

  /**
   * Cancel all jobs in a batch
   */
  cancelBatch(batchId: string): void {
    const batchJobs = Array.from(this.jobs.values()).filter(j => j.batchId === batchId);
    for (const job of batchJobs) {
      this.cancelJob(job.id);
    }
  }

  /**
   * Update job priority
   */
  setPriority(jobId: string, priority: JobPriority): void {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'pending') {
      job.priority = priority;
      this.updateQueuePositions();
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  /**
   * Move job to front of queue (set critical priority)
   */
  prioritize(jobId: string): void {
    this.setPriority(jobId, 'critical');
  }

  /**
   * Add tags to a job
   */
  addTags(jobId: string, tags: string[]): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.tags = [...new Set([...job.tags, ...tags])];
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  /**
   * Remove tags from a job
   */
  removeTags(jobId: string, tags: string[]): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.tags = job.tags.filter(t => !tags.includes(t));
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  /**
   * Get jobs by tag
   */
  getJobsByTag(tag: string): Job[] {
    return Array.from(this.jobs.values()).filter(j => j.tags.includes(tag));
  }

  /**
   * Start a job with real execution (public API)
   */
  async startJob(jobId: string): Promise<void> {
    return this.startJobInternal(jobId);
  }

  /**
   * Internal job start implementation
   */
  private async startJobInternal(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error('Job not found');
    if (job.status === 'running') throw new Error('Job already running');

    // Check max parallel
    if (this.activeJobIds.size >= this.maxParallel) {
      // Already at capacity, job stays pending
      return;
    }

    const abortController = new AbortController();
    this.abortControllers.set(jobId, abortController);
    this.activeJobIds.add(jobId);

    job.status = 'running';
    job.startTime = new Date();
    job.lastProgressUpdate = new Date();
    job.results = [];
    job.queuePosition = undefined;
    this.updateQueuePositions();
    this.saveToStorage();
    this.notifyListeners();

    try {
      await this.executeJob(job, abortController.signal);

      job.status = 'completed';
      job.endTime = new Date();
      job.progress = 100;

      // Move to completed
      this.completedJobs.unshift({ ...job });
      this.jobs.delete(jobId);
    } catch (error) {
      if ((error as Error).message === 'Job cancelled') {
        job.status = 'cancelled';
      } else {
        job.status = 'failed';
        job.error = (error as Error).message;
        
        // Retry if configured
        if (job.retryCount < job.maxRetries) {
          job.retryCount++;
          job.status = 'pending';
          job.error = undefined;
          console.log(`Retrying job ${job.name} (attempt ${job.retryCount}/${job.maxRetries})`);
        }
      }
      job.endTime = new Date();
    } finally {
      this.activeJobIds.delete(jobId);
      this.abortControllers.delete(jobId);
      this.saveToStorage();
      this.notifyListeners();
      
      // Process queue for next jobs
      this.processQueue();
    }
  }

  /**
   * Execute job with real strategy execution
   */
  private async executeJob(job: Job, signal: AbortSignal): Promise<void> {
    // Set the data file as active
    const dataFile = fileSystemManager.getFiles().find(f => f.id === job.dataFileId);
    if (!dataFile) throw new Error('Data file not found');

    fileSystemManager.setActiveFile(job.dataFileId);

    const totalIterations = job.presets.reduce((sum, p) => sum + p.iterations, 0);
    let completedIterations = 0;

    for (let presetIdx = 0; presetIdx < job.presets.length; presetIdx++) {
      if (signal.aborted) throw new Error('Job cancelled');

      const preset = job.presets[presetIdx];
      const strategy = pythonModuleSystem.getStrategy(preset.strategyId);
      if (!strategy) throw new Error(`Strategy ${preset.strategyName} not found`);

      job.currentPresetIndex = presetIdx;

      for (let iteration = 0; iteration < preset.iterations; iteration++) {
        if (signal.aborted) throw new Error('Job cancelled');

        // Check if paused
        while (job.status === 'paused') {
          await new Promise(resolve => setTimeout(resolve, 500));
          if (signal.aborted) throw new Error('Job cancelled');
        }

        job.currentIteration = iteration;
        job.lastProgressUpdate = new Date();
        this.notifyListeners();

        try {
          // Real strategy execution using strategyExecutionEngine
          const pipelineResult = await strategyExecutionEngine.executeStrategy(
            strategy,
            job.dataFileId
          );

          // Convert to JobExecutionResult
          const result: JobExecutionResult = {
            id: pipelineResult.resultId,
            strategyId: preset.strategyId,
            strategyName: preset.strategyName,
            dataFileId: job.dataFileId,
            dataFileName: job.dataFileName,
            initialBits: pipelineResult.initialBits,
            finalBits: pipelineResult.finalBits,
            totalDuration: pipelineResult.totalDuration,
            startTime: pipelineResult.startTime,
            endTime: pipelineResult.endTime,
            success: pipelineResult.success,
            error: pipelineResult.error,
            totalScore: pipelineResult.totalScore,
            totalOperations: pipelineResult.totalOperations,
          };
          job.results.push(result);
        } catch (error) {
          // Create failed result
          const failedResult: JobExecutionResult = {
            id: `exec_failed_${Date.now()}`,
            strategyId: preset.strategyId,
            strategyName: preset.strategyName,
            dataFileId: job.dataFileId,
            dataFileName: job.dataFileName,
            initialBits: '',
            finalBits: '',
            totalDuration: 0,
            startTime: new Date(),
            endTime: new Date(),
            success: false,
            error: (error as Error).message,
          };
          job.results.push(failedResult);
        }

        completedIterations++;
        const newProgress = Math.round((completedIterations / totalIterations) * 100);
        
        // Update ETA tracking
        const elapsedMs = Date.now() - (job.startTime?.getTime() || Date.now());
        job.avgMsPerPercent = newProgress > 0 ? elapsedMs / newProgress : undefined;
        job.progress = newProgress;
        job.eta = this.calculateETA(job) || undefined;
        job.lastProgressUpdate = new Date();
        
        this.saveToStorage();
        this.notifyListeners();
      }
    }
  }

  /**
   * Pause a running job
   */
  pauseJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'running') {
      job.status = 'paused';
      job.pausedAt = new Date();
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  /**
   * Resume a paused job
   */
  resumeJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'paused') {
      job.status = 'running';
      job.pausedAt = undefined;
      job.lastProgressUpdate = new Date();
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  /**
   * Cancel a running job
   */
  cancelJob(jobId: string): void {
    const controller = this.abortControllers.get(jobId);
    if (controller) {
      controller.abort();
    }

    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'cancelled';
      job.endTime = new Date();
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  /**
   * Delete a job
   */
  deleteJob(jobId: string): void {
    this.jobs.delete(jobId);
    this.completedJobs = this.completedJobs.filter(j => j.id !== jobId);
    this.updateQueuePositions();
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Clear all completed jobs
   */
  clearCompleted(): void {
    this.completedJobs = [];
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Clear all failed jobs
   */
  clearFailed(): void {
    this.completedJobs = this.completedJobs.filter(j => j.status !== 'failed');
    for (const [id, job] of this.jobs) {
      if (job.status === 'failed') {
        this.jobs.delete(id);
      }
    }
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<void> {
    const job = this.completedJobs.find(j => j.id === jobId && j.status === 'failed');
    if (!job) {
      const activeJob = this.jobs.get(jobId);
      if (activeJob && activeJob.status === 'failed') {
        activeJob.status = 'pending';
        activeJob.error = undefined;
        activeJob.retryCount++;
        this.updateQueuePositions();
        this.saveToStorage();
        this.notifyListeners();
        return;
      }
      throw new Error('Job not found or not failed');
    }
    
    // Re-create the job
    const newJob = this.createJob(job.name, job.dataFileId, job.presets, {
      priority: job.priority,
      tags: job.tags,
    });
    
    // Remove old completed job
    this.completedJobs = this.completedJobs.filter(j => j.id !== jobId);
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Get all pending/active jobs sorted by priority
   */
  getAllJobs(): Job[] {
    return this.sortByPriority(Array.from(this.jobs.values()));
  }

  /**
   * Get completed jobs
   */
  getCompletedJobs(): Job[] {
    return this.completedJobs;
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId) || this.completedJobs.find(j => j.id === jobId);
  }

  /**
   * Get batch jobs
   */
  getBatchJobs(batchId: string): Job[] {
    const active = Array.from(this.jobs.values()).filter(j => j.batchId === batchId);
    const completed = this.completedJobs.filter(j => j.batchId === batchId);
    return [...active, ...completed];
  }

  /**
   * Get available strategies for job creation
   */
  getAvailableStrategies(): StrategyConfig[] {
    return pythonModuleSystem.getAllStrategies();
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): JobQueueStats {
    const allJobs = [...Array.from(this.jobs.values()), ...this.completedJobs];
    
    let totalWaitTime = 0;
    let totalDuration = 0;
    let waitCount = 0;
    let durationCount = 0;
    let completedInLastHour = 0;
    const oneHourAgo = Date.now() - 3600000;

    for (const job of allJobs) {
      if (job.createdAt && job.startTime) {
        totalWaitTime += job.startTime.getTime() - job.createdAt.getTime();
        waitCount++;
      }
      if (job.startTime && job.endTime) {
        totalDuration += job.endTime.getTime() - job.startTime.getTime();
        durationCount++;
        if (job.endTime.getTime() > oneHourAgo) {
          completedInLastHour++;
        }
      }
    }

    return {
      totalJobs: allJobs.length,
      runningJobs: this.activeJobIds.size,
      pausedJobs: Array.from(this.jobs.values()).filter(j => j.status === 'paused').length,
      pendingJobs: Array.from(this.jobs.values()).filter(j => j.status === 'pending').length,
      completedJobs: this.completedJobs.filter(j => j.status === 'completed').length,
      failedJobs: this.completedJobs.filter(j => j.status === 'failed').length,
      avgWaitTime: waitCount > 0 ? totalWaitTime / waitCount : 0,
      avgDuration: durationCount > 0 ? totalDuration / durationCount : 0,
      throughputPerHour: completedInLastHour,
    };
  }

  /**
   * Get running job count
   */
  getRunningCount(): number {
    return this.activeJobIds.size;
  }

  /**
   * Get pending job count
   */
  getPendingCount(): number {
    return Array.from(this.jobs.values()).filter(j => j.status === 'pending').length;
  }

  /**
   * Get completed job count
   */
  getCompletedCount(): number {
    return this.completedJobs.filter(j => j.status === 'completed').length;
  }

  /**
   * Get failed job count
   */
  getFailedCount(): number {
    return this.completedJobs.filter(j => j.status === 'failed').length;
  }

  /**
   * Set max parallel jobs
   */
  setMaxParallel(max: number): void {
    this.maxParallel = Math.max(1, Math.min(10, max));
    this.processQueue();
  }

  /**
   * Get max parallel jobs
   */
  getMaxParallel(): number {
    return this.maxParallel;
  }

  /**
   * Subscribe to changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l());
  }

  /**
   * Cleanup on destroy
   */
  destroy(): void {
    this.stopStallDetection();
    this.listeners.clear();
  }
}

export const jobManagerV2 = new JobManagerV2();
