/**
 * Job Manager V2 - Reworked with real strategy execution
 * Uses the strategyExecutionEngine for actual transformation execution
 */

import { fileSystemManager, BinaryFile } from './fileSystemManager';
import { pythonModuleSystem, StrategyConfig } from './pythonModuleSystem';
import { strategyExecutionEngine, ExecutionPipelineResult } from './strategyExecutionEngine';

export type JobStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

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
  error?: string;
  results: JobExecutionResult[];
}

const JOBS_KEY = 'bitwise_jobs_v2';
const COMPLETED_KEY = 'bitwise_completed_jobs_v2';

class JobManagerV2 {
  private jobs: Map<string, Job> = new Map();
  private completedJobs: Job[] = [];
  private activeJobId: string | null = null;
  private abortControllers: Map<string, AbortController> = new Map();
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
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
          });
        });
      }

      const completedData = localStorage.getItem(COMPLETED_KEY);
      if (completedData) {
        this.completedJobs = JSON.parse(completedData).map((job: any) => ({
          ...job,
          startTime: job.startTime ? new Date(job.startTime) : undefined,
          endTime: job.endTime ? new Date(job.endTime) : undefined,
        }));
      }
    } catch (e) {
      console.error('Failed to load jobs:', e);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(JOBS_KEY, JSON.stringify(Array.from(this.jobs.values())));
      localStorage.setItem(COMPLETED_KEY, JSON.stringify(this.completedJobs.slice(0, 50)));
    } catch (e) {
      console.error('Failed to save jobs:', e);
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
   * Create a new job
   */
  createJob(name: string, dataFileId: string, presets: JobPreset[]): Job {
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
    };

    this.jobs.set(job.id, job);
    this.saveToStorage();
    this.notifyListeners();
    return job;
  }

  /**
   * Start a job with real execution
   */
  async startJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error('Job not found');
    if (job.status === 'running') throw new Error('Job already running');

    // Check if another job is running
    if (this.activeJobId) {
      throw new Error('Another job is already running');
    }

    const abortController = new AbortController();
    this.abortControllers.set(jobId, abortController);
    this.activeJobId = jobId;

    job.status = 'running';
    job.startTime = new Date();
    job.results = [];
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
      }
      job.endTime = new Date();
    } finally {
      this.activeJobId = null;
      this.abortControllers.delete(jobId);
      this.saveToStorage();
      this.notifyListeners();
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

        job.currentIteration = iteration;
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
        job.progress = Math.round((completedIterations / totalIterations) * 100);
        this.saveToStorage();
        this.notifyListeners();
      }
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
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Get all pending/active jobs
   */
  getAllJobs(): Job[] {
    return Array.from(this.jobs.values());
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
   * Get available strategies for job creation
   */
  getAvailableStrategies(): StrategyConfig[] {
    return pythonModuleSystem.getAllStrategies();
  }

  /**
   * Get running job count
   */
  getRunningCount(): number {
    return Array.from(this.jobs.values()).filter(j => j.status === 'running').length;
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
   * Subscribe to changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l());
  }
}

export const jobManagerV2 = new JobManagerV2();
