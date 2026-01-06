/**
 * Job Manager - Manages parallel and sequential job execution
 * Jobs run presets on data files with proper scheduling
 */

import { fileSystemManager, BinaryFile, FileSystemManager } from './fileSystemManager';
import { algorithmManager, AlgorithmFile } from './algorithmManager';
import { predefinedManager } from './predefinedManager';
import { luaExecutor } from './luaExecutor';

export type JobStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface JobPresetConfig {
  presetId: string;
  presetName: string;
  iterations: number;
}

export interface Job {
  id: string;
  name: string;
  dataFileId: string;
  dataFileName: string;
  presets: JobPresetConfig[];
  status: JobStatus;
  progress: number; // 0-100
  currentPresetIndex: number;
  currentIteration: number;
  startTime?: Date;
  endTime?: Date;
  error?: string;
  results: JobResult[];
  bitRangesAccessed: { start: number; end: number; operation: string }[];
}

export interface JobResult {
  presetId: string;
  presetName: string;
  iteration: number;
  success: boolean;
  duration: number;
  operationsExecuted: number;
  finalBits: string;
  metricsChange: Record<string, { before: number; after: number }>;
  costUsed: number;
  error?: string;
}

export interface JobQueueEntry {
  jobId: string;
  fileId: string;
}

const STORAGE_KEY = 'bitwise_jobs';
const COMPLETED_JOBS_KEY = 'bitwise_completed_jobs';

class JobManager {
  private jobs: Map<string, Job> = new Map();
  private completedJobs: Job[] = [];
  private activeJobs: Set<string> = new Set();
  private fileJobMap: Map<string, Set<string>> = new Map(); // fileId -> jobIds currently using it
  private listeners: Set<() => void> = new Set();
  private abortControllers: Map<string, AbortController> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        parsed.forEach((job: any) => {
          const reconstructed: Job = {
            ...job,
            startTime: job.startTime ? new Date(job.startTime) : undefined,
            endTime: job.endTime ? new Date(job.endTime) : undefined,
          };
          this.jobs.set(job.id, reconstructed);
        });
      }

      const completedData = localStorage.getItem(COMPLETED_JOBS_KEY);
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
      const jobsArray = Array.from(this.jobs.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(jobsArray));
      localStorage.setItem(COMPLETED_JOBS_KEY, JSON.stringify(this.completedJobs.slice(0, 50)));
    } catch (e) {
      console.error('Failed to save jobs:', e);
    }
  }

  /**
   * Create a new job
   */
  createJob(
    name: string,
    dataFileId: string,
    presets: JobPresetConfig[]
  ): Job {
    const dataFile = fileSystemManager.getFiles().find(f => f.id === dataFileId);
    if (!dataFile) {
      throw new Error('Data file not found');
    }

    if (presets.length === 0) {
      throw new Error('At least one preset is required');
    }

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
      bitRangesAccessed: [],
    };

    this.jobs.set(job.id, job);
    this.saveToStorage();
    this.notifyListeners();
    return job;
  }

  /**
   * Start a job - handles file locking for sequential access
   */
  async startJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error('Job not found');
    if (job.status === 'running') throw new Error('Job already running');

    // Check if file is in use by another job
    const fileInUse = this.fileJobMap.get(job.dataFileId);
    if (fileInUse && fileInUse.size > 0) {
      // Queue this job - it will start when file is free
      job.status = 'pending';
      this.saveToStorage();
      this.notifyListeners();
      return;
    }

    // Mark file as in use
    if (!this.fileJobMap.has(job.dataFileId)) {
      this.fileJobMap.set(job.dataFileId, new Set());
    }
    this.fileJobMap.get(job.dataFileId)!.add(jobId);

    const abortController = new AbortController();
    this.abortControllers.set(jobId, abortController);
    
    job.status = 'running';
    job.startTime = new Date();
    this.activeJobs.add(jobId);
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
      // Release file lock
      this.fileJobMap.get(job.dataFileId)?.delete(jobId);
      if (this.fileJobMap.get(job.dataFileId)?.size === 0) {
        this.fileJobMap.delete(job.dataFileId);
      }
      
      this.activeJobs.delete(jobId);
      this.abortControllers.delete(jobId);
      this.saveToStorage();
      this.notifyListeners();

      // Check for queued jobs waiting for this file
      this.processQueuedJobsForFile(job.dataFileId);
    }
  }

  /**
   * Execute job presets and iterations
   */
  private async executeJob(job: Job, signal: AbortSignal): Promise<void> {
    const dataFile = fileSystemManager.getFiles().find(f => f.id === job.dataFileId);
    if (!dataFile) throw new Error('Data file not found');

    const bits = dataFile.state.model.getBits();
    if (!bits || bits.length === 0) {
      throw new Error('Data file has no binary content');
    }

    const totalIterations = job.presets.reduce((sum, p) => sum + p.iterations, 0);
    let completedIterations = 0;

    for (let presetIdx = 0; presetIdx < job.presets.length; presetIdx++) {
      if (signal.aborted) throw new Error('Job cancelled');

      const presetConfig = job.presets[presetIdx];
      job.currentPresetIndex = presetIdx;

      for (let iteration = 0; iteration < presetConfig.iterations; iteration++) {
        if (signal.aborted) throw new Error('Job cancelled');

        job.currentIteration = iteration;
        
        const result = await this.executePreset(
          presetConfig.presetId,
          presetConfig.presetName,
          bits,
          job,
          iteration
        );
        
        job.results.push(result);
        completedIterations++;
        job.progress = Math.round((completedIterations / totalIterations) * 100);
        
        this.saveToStorage();
        this.notifyListeners();
      }
    }
  }

  /**
   * Execute a single preset iteration
   */
  private async executePreset(
    presetId: string,
    presetName: string,
    bits: string,
    job: Job,
    iteration: number
  ): Promise<JobResult> {
    const startTime = performance.now();
    let currentBits = bits;
    let operationsExecuted = 0;
    let costUsed = 0;

    const metricsBefore: Record<string, number> = {};
    const metricsAfter: Record<string, number> = {};

    try {
      // Get preset configuration
      const presetFile = algorithmManager.getFile(presetId);
      if (!presetFile) {
        throw new Error(`Preset ${presetName} not found`);
      }

      const presetConfig = JSON.parse(presetFile.content);

      // Load scoring configuration
      let scoring = { costs: {} as Record<string, number>, initialBudget: 1000 };
      if (presetConfig.scoringId) {
        const scoringFile = algorithmManager.getFile(presetConfig.scoringId);
        if (scoringFile) {
          scoring = await luaExecutor.parseScoringScript(scoringFile.content);
        }
      }

      let budget = scoring.initialBudget;

      // Calculate initial metrics
      const enabledMetrics = predefinedManager.getAllMetrics();
      for (const metric of enabledMetrics) {
        metricsBefore[metric.id] = this.calculateMetric(currentBits, metric.id);
      }

      // Get enabled operations
      const enabledOps = predefinedManager.getAllOperations().map(o => o.id);

      // Simple execution: apply random operations based on budget
      while (budget > 0 && operationsExecuted < 100) {
        const opIndex = Math.floor(Math.random() * enabledOps.length);
        const op = enabledOps[opIndex];
        const cost = scoring.costs[op] ?? 5;

        if (cost > budget) break;

        // Track bit range accessed
        const rangeStart = Math.floor(Math.random() * Math.max(1, currentBits.length - 10));
        const rangeEnd = Math.min(rangeStart + 10, currentBits.length);
        job.bitRangesAccessed.push({ start: rangeStart, end: rangeEnd, operation: op });

        // Apply operation (simplified)
        currentBits = this.applyOperation(currentBits, op);
        budget -= cost;
        costUsed += cost;
        operationsExecuted++;
      }

      // Calculate final metrics
      for (const metric of enabledMetrics) {
        metricsAfter[metric.id] = this.calculateMetric(currentBits, metric.id);
      }

      const metricsChange: Record<string, { before: number; after: number }> = {};
      for (const id of Object.keys(metricsBefore)) {
        metricsChange[id] = { before: metricsBefore[id], after: metricsAfter[id] };
      }

      return {
        presetId,
        presetName,
        iteration,
        success: true,
        duration: performance.now() - startTime,
        operationsExecuted,
        finalBits: currentBits.slice(0, 64) + (currentBits.length > 64 ? '...' : ''),
        metricsChange,
        costUsed,
      };
    } catch (error) {
      return {
        presetId,
        presetName,
        iteration,
        success: false,
        duration: performance.now() - startTime,
        operationsExecuted,
        finalBits: currentBits,
        metricsChange: {},
        costUsed,
        error: (error as Error).message,
      };
    }
  }

  private applyOperation(bits: string, op: string): string {
    // Apply all 7 logic gates plus shifts/rotations
    switch (op) {
      case 'NOT':
        return bits.split('').map(b => b === '0' ? '1' : '0').join('');
      case 'AND':
        return bits.split('').map((b, i) => (b === '1' && (i % 2 === 0)) ? '1' : '0').join('');
      case 'OR':
        return bits.split('').map((b, i) => (b === '1' || (i % 2 === 0)) ? '1' : '0').join('');
      case 'XOR':
        return bits.split('').map((b, i) => b === ((i % 2 === 0) ? '1' : '0') ? '0' : '1').join('');
      case 'NAND':
        return bits.split('').map((b, i) => (b === '1' && (i % 2 === 0)) ? '0' : '1').join('');
      case 'NOR':
        return bits.split('').map((b, i) => (b === '1' || (i % 2 === 0)) ? '0' : '1').join('');
      case 'XNOR':
        return bits.split('').map((b, i) => b === ((i % 2 === 0) ? '1' : '0') ? '1' : '0').join('');
      case 'SHL':
        return bits.slice(1) + '0';
      case 'SHR':
        return '0' + bits.slice(0, -1);
      case 'ROL':
        return bits.slice(1) + bits.charAt(0);
      case 'ROR':
        return bits.charAt(bits.length - 1) + bits.slice(0, -1);
      case 'GRAY':
        // Binary to Gray code
        return bits.charAt(0) + bits.split('').slice(1).map((b, i) => 
          (parseInt(bits[i]) ^ parseInt(b)).toString()
        ).join('');
      default:
        return bits;
    }
  }

  private calculateMetric(bits: string, metricId: string): number {
    if (!bits || bits.length === 0) return 0;
    
    const ones = (bits.match(/1/g) || []).length;
    const zeros = bits.length - ones;

    switch (metricId) {
      case 'entropy':
        const p0 = zeros / bits.length;
        const p1 = ones / bits.length;
        let entropy = 0;
        if (p0 > 0) entropy -= p0 * Math.log2(p0);
        if (p1 > 0) entropy -= p1 * Math.log2(p1);
        return parseFloat(entropy.toFixed(4));
      case 'hamming_weight':
        return ones;
      case 'balance':
        return parseFloat((ones / bits.length).toFixed(4));
      case 'transition_count':
        let transitions = 0;
        for (let i = 1; i < bits.length; i++) {
          if (bits[i] !== bits[i - 1]) transitions++;
        }
        return transitions;
      default:
        return 0;
    }
  }

  private processQueuedJobsForFile(fileId: string): void {
    // Find pending jobs that need this file
    for (const [, job] of this.jobs) {
      if (job.status === 'pending' && job.dataFileId === fileId) {
        this.startJob(job.id);
        break; // Only start one to maintain sequential access
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
      this.startJob(jobId);
    }
  }

  /**
   * Cancel a job
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
   * Delete a completed/cancelled job
   */
  deleteJob(jobId: string): void {
    this.jobs.delete(jobId);
    this.completedJobs = this.completedJobs.filter(j => j.id !== jobId);
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Get all jobs
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
   * Get running job count
   */
  getRunningCount(): number {
    return this.activeJobs.size;
  }

  /**
   * Get pending job count
   */
  getPendingCount(): number {
    let count = 0;
    for (const job of this.jobs.values()) {
      if (job.status === 'pending') count++;
    }
    return count;
  }

  /**
   * Get completed job count
   */
  getCompletedCount(): number {
    return this.completedJobs.length;
  }

  /**
   * Get failed job count
   */
  getFailedCount(): number {
    let count = 0;
    for (const job of this.completedJobs) {
      if (job.status === 'failed') count++;
    }
    return count;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l());
  }
}

export const jobManager = new JobManager();
