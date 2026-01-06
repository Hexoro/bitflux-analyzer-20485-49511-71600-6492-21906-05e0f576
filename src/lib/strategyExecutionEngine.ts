/**
 * Strategy Execution Engine - Full pipeline execution
 * Runs Scheduler → Algorithm → Scoring → Policy in sequence
 * Creates single result file with all transformations
 * Budget is defined in Scoring files only
 */

import { pythonExecutor, PythonContext, TransformationRecord } from './pythonExecutor';
import { fileSystemManager, BinaryFile } from './fileSystemManager';
import { pythonModuleSystem, PythonFile, StrategyConfig } from './pythonModuleSystem';
import { resultsManager, ExecutionResultV2, TransformationStep } from './resultsManager';
import { calculateAllMetrics } from './metricsCalculator';
import { getAvailableOperations } from './operationsRouter';

export interface StepResult {
  stepIndex: number;
  stepType: 'scheduler' | 'algorithm' | 'scoring' | 'policy';
  fileName: string;
  bits: string;
  metrics: Record<string, number>;
  score?: number;
  policyPassed?: boolean;
  logs: string[];
  transformations: TransformationRecord[];
  duration: number;
}

export interface ExecutionPipelineResult {
  success: boolean;
  error?: string;
  
  // Strategy info
  strategyId: string;
  strategyName: string;
  
  // Source file
  sourceFileId: string;
  sourceFileName: string;
  
  // Timing
  startTime: Date;
  endTime: Date;
  totalDuration: number;
  
  // Data
  initialBits: string;
  finalBits: string;
  
  // Steps
  steps: StepResult[];
  
  // Aggregated metrics
  initialMetrics: Record<string, number>;
  finalMetrics: Record<string, number>;
  metricsChange: Record<string, number>;
  
  // Scoring summary
  scores: { fileName: string; score: number }[];
  totalScore: number;
  
  // Budget tracking (from Scoring file)
  budgetConfig: {
    initial: number;
    used: number;
    remaining: number;
    costPerOperation: Record<string, number>;
  };
  
  // Operation summary
  totalOperations: number;
  totalBitsChanged: number;
  operationCounts: Record<string, number>;
  
  // Bit range summary (for parallel transformations)
  bitRangesProcessed: { start: number; end: number; operation: string }[];
  
  // Single result file for Player
  resultFileId: string;
  resultFileName: string;
  
  // Result ID (for resultsManager)
  resultId: string;
}

// Default scoring config - used when scoring file doesn't specify
const DEFAULT_SCORING_CONFIG = {
  initialBudget: 1000,
  operationCosts: {
    'NOT': 1,
    'AND': 2,
    'OR': 2,
    'XOR': 2,
    'NAND': 3,
    'NOR': 3,
    'XNOR': 3,
    'left_shift': 1,
    'right_shift': 1,
    'rotate_left': 2,
    'rotate_right': 2,
    'reverse': 1,
    'invert': 1,
    'swap_pairs': 2,
    'swap_nibbles': 2,
    'mirror': 1,
  },
};

class StrategyExecutionEngine {
  private isRunning = false;
  private currentRun: ExecutionPipelineResult | null = null;
  private listeners: Set<(result: ExecutionPipelineResult | null, status: string) => void> = new Set();
  private runCounter = 0;

  /**
   * Execute a full strategy pipeline
   * Budget comes from Scoring file, not from UI
   */
  async executeStrategy(
    strategy: StrategyConfig,
    sourceFileId: string
  ): Promise<ExecutionPipelineResult> {
    if (this.isRunning) {
      throw new Error('An execution is already in progress');
    }

    this.isRunning = true;
    this.runCounter++;
    const runId = this.runCounter;
    this.notify(null, 'starting');

    const startTime = new Date();
    const steps: StepResult[] = [];
    const scores: { fileName: string; score: number }[] = [];
    const operationCounts: Record<string, number> = {};
    const bitRangesProcessed: { start: number; end: number; operation: string }[] = [];
    const allTransformations: TransformationRecord[] = [];

    let currentBits = '';
    let currentBudget = DEFAULT_SCORING_CONFIG.initialBudget;
    let budgetUsed = 0;

    try {
      // Get source file
      const sourceFile = fileSystemManager.getFile(sourceFileId);
      if (!sourceFile) {
        throw new Error('Source file not found');
      }

      currentBits = sourceFile.state.model.getBits();
      if (!currentBits || currentBits.length === 0) {
        throw new Error('Source file is empty');
      }

      const initialBits = currentBits;
      const initialMetricsResult = calculateAllMetrics(initialBits);
      const initialMetrics = initialMetricsResult.metrics;

      this.notify(null, 'running scheduler');

      // Step 1: Run Scheduler
      const schedulerFile = pythonModuleSystem.getFileByName(strategy.schedulerFile);
      if (!schedulerFile) {
        throw new Error(`Scheduler file "${strategy.schedulerFile}" not found`);
      }

      const schedulerResult = await this.runStep(
        schedulerFile,
        'scheduler',
        0,
        currentBits,
        currentBudget,
        runId
      );
      steps.push(schedulerResult);
      allTransformations.push(...schedulerResult.transformations);

      // Step 2: Run each Algorithm
      let stepIndex = 1;
      for (const algoFileName of strategy.algorithmFiles) {
        this.notify(null, `running algorithm: ${algoFileName}`);
        
        const algoFile = pythonModuleSystem.getFileByName(algoFileName);
        if (!algoFile) {
          throw new Error(`Algorithm file "${algoFileName}" not found`);
        }

        const algoResult = await this.runStep(
          algoFile,
          'algorithm',
          stepIndex,
          currentBits,
          currentBudget,
          runId
        );

        // Update state
        currentBits = algoResult.bits;
        
        // Calculate cost from transformations
        const stepCost = algoResult.transformations.reduce((sum, t) => {
          const cost = DEFAULT_SCORING_CONFIG.operationCosts[t.operation as keyof typeof DEFAULT_SCORING_CONFIG.operationCosts] || 1;
          return sum + cost;
        }, 0);
        currentBudget -= stepCost;

        // Track operations
        algoResult.transformations.forEach(t => {
          operationCounts[t.operation] = (operationCounts[t.operation] || 0) + 1;
          t.bitRanges.forEach(r => {
            bitRangesProcessed.push({ start: r.start, end: r.end, operation: t.operation });
          });
        });

        steps.push(algoResult);
        allTransformations.push(...algoResult.transformations);
        stepIndex++;
      }

      budgetUsed = DEFAULT_SCORING_CONFIG.initialBudget - currentBudget;

      // Step 3: Run Scoring files (budget defined here)
      for (const scoringFileName of strategy.scoringFiles) {
        this.notify(null, `running scoring: ${scoringFileName}`);
        
        const scoringFile = pythonModuleSystem.getFileByName(scoringFileName);
        if (!scoringFile) {
          throw new Error(`Scoring file "${scoringFileName}" not found`);
        }

        const scoringResult = await this.runStep(
          scoringFile,
          'scoring',
          stepIndex,
          currentBits,
          currentBudget,
          runId
        );

        // Extract score from logs
        const scoreMatch = scoringResult.logs.find(l => l.toLowerCase().includes('score'));
        const scoreValue = scoreMatch 
          ? parseFloat(scoreMatch.match(/[\d.]+/)?.[0] || '0')
          : 0;
        
        scoringResult.score = scoreValue;
        scores.push({ fileName: scoringFileName, score: scoreValue });

        steps.push(scoringResult);
        stepIndex++;
      }

      // Step 4: Run Policy files
      for (const policyFileName of strategy.policyFiles) {
        this.notify(null, `running policy: ${policyFileName}`);
        
        const policyFile = pythonModuleSystem.getFileByName(policyFileName);
        if (!policyFile) {
          throw new Error(`Policy file "${policyFileName}" not found`);
        }

        const policyResult = await this.runStep(
          policyFile,
          'policy',
          stepIndex,
          currentBits,
          currentBudget,
          runId
        );

        // Check if policy passed
        const passedLog = policyResult.logs.some(l => 
          l.toLowerCase().includes('pass') || l.toLowerCase().includes('true')
        );
        policyResult.policyPassed = passedLog;

        steps.push(policyResult);
        stepIndex++;
      }

      const endTime = new Date();

      // Calculate final metrics
      const finalMetricsResult = calculateAllMetrics(currentBits);
      const finalMetrics = finalMetricsResult.metrics;

      // Calculate change
      const metricsChange: Record<string, number> = {};
      Object.keys(initialMetrics).forEach(key => {
        metricsChange[key] = (finalMetrics[key] || 0) - initialMetrics[key];
      });

      // Total operations
      const totalOperations = allTransformations.length;
      const totalBitsChanged = allTransformations.reduce((sum, t) => sum + t.bitsChanged, 0);

      // Total score
      const totalScore = scores.reduce((sum, s) => sum + s.score, 0);

      // Create single result file for Player
      const resultFileName = `result_${strategy.name.replace(/\s+/g, '_')}_run${runId}.txt`;
      const resultFile = fileSystemManager.createFile(resultFileName, currentBits, 'binary');
      resultFile.group = 'Strategy Results';

      // Create result for resultsManager
      const executionResult = this.createExecutionResult(
        strategy,
        sourceFile,
        startTime,
        endTime,
        initialBits,
        currentBits,
        initialMetrics,
        finalMetrics,
        steps,
        allTransformations,
        budgetUsed,
        currentBudget
      );

      const result: ExecutionPipelineResult = {
        success: true,
        strategyId: strategy.id,
        strategyName: strategy.name,
        sourceFileId,
        sourceFileName: sourceFile.name,
        startTime,
        endTime,
        totalDuration: endTime.getTime() - startTime.getTime(),
        initialBits,
        finalBits: currentBits,
        steps,
        initialMetrics,
        finalMetrics,
        metricsChange,
        scores,
        totalScore,
        budgetConfig: {
          initial: DEFAULT_SCORING_CONFIG.initialBudget,
          used: budgetUsed,
          remaining: currentBudget,
          costPerOperation: DEFAULT_SCORING_CONFIG.operationCosts,
        },
        totalOperations,
        totalBitsChanged,
        operationCounts,
        bitRangesProcessed,
        resultFileId: resultFile.id,
        resultFileName,
        resultId: executionResult.id,
      };

      this.currentRun = result;
      this.notify(result, 'completed');
      return result;

    } catch (error) {
      const endTime = new Date();
      const result: ExecutionPipelineResult = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        strategyId: strategy.id,
        strategyName: strategy.name,
        sourceFileId,
        sourceFileName: '',
        startTime,
        endTime,
        totalDuration: endTime.getTime() - startTime.getTime(),
        initialBits: '',
        finalBits: '',
        steps,
        initialMetrics: {},
        finalMetrics: {},
        metricsChange: {},
        scores,
        totalScore: 0,
        budgetConfig: {
          initial: DEFAULT_SCORING_CONFIG.initialBudget,
          used: budgetUsed,
          remaining: currentBudget,
          costPerOperation: DEFAULT_SCORING_CONFIG.operationCosts,
        },
        totalOperations: 0,
        totalBitsChanged: 0,
        operationCounts: {},
        bitRangesProcessed: [],
        resultFileId: '',
        resultFileName: '',
        resultId: '',
      };

      this.currentRun = result;
      this.notify(result, 'failed');
      return result;

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run a single step (scheduler/algorithm/scoring/policy)
   */
  private async runStep(
    file: PythonFile,
    stepType: StepResult['stepType'],
    stepIndex: number,
    bits: string,
    budget: number,
    runId: number
  ): Promise<StepResult> {
    const startTime = performance.now();

    const context: PythonContext = {
      bits,
      budget,
      metrics: calculateAllMetrics(bits).metrics,
      operations: getAvailableOperations(),
    };

    const execResult = await pythonExecutor.sandboxTest(file.content, context);
    const finalMetrics = calculateAllMetrics(execResult.finalBits).metrics;

    return {
      stepIndex,
      stepType,
      fileName: file.name,
      bits: execResult.finalBits,
      metrics: finalMetrics,
      logs: execResult.logs,
      transformations: execResult.transformations,
      duration: performance.now() - startTime,
    };
  }

  /**
   * Create and save execution result to resultsManager
   */
  private createExecutionResult(
    strategy: StrategyConfig,
    sourceFile: BinaryFile,
    startTime: Date,
    endTime: Date,
    initialBits: string,
    finalBits: string,
    initialMetrics: Record<string, number>,
    finalMetrics: Record<string, number>,
    steps: StepResult[],
    allTransformations: TransformationRecord[],
    budgetUsed: number,
    budgetRemaining: number
  ): ExecutionResultV2 {
    // Convert transformations to TransformationStep format (and include bit ranges, costs, lightweight metrics)
    const METRIC_IDS = ['entropy', 'balance', 'compression_ratio', 'transition_rate'];

    const transformationSteps: TransformationStep[] = allTransformations.map((t, i) => {
      // Use metricsSnapshot if available, otherwise calculate
      const metrics = t.metricsSnapshot || calculateAllMetrics(t.fullAfterBits || t.afterBits).metrics;
      const cost = t.cost || DEFAULT_SCORING_CONFIG.operationCosts[t.operation as keyof typeof DEFAULT_SCORING_CONFIG.operationCosts] || 1;
      return {
        index: i,
        operation: t.operation,
        params: t.params,
        fullBeforeBits: t.fullBeforeBits || t.beforeBits,
        fullAfterBits: t.fullAfterBits || t.afterBits,
        beforeBits: t.beforeBits,
        afterBits: t.afterBits,
        metrics: Object.fromEntries(
          Object.entries(metrics).filter(([k]) => METRIC_IDS.includes(k))
        ),
        timestamp: Date.now(),
        duration: t.duration,
        bitRanges: t.bitRanges,
        cost,
        cumulativeBits: t.cumulativeBits || t.fullAfterBits || t.afterBits,
      };
    });

    const avgDuration = transformationSteps.length > 0 
      ? transformationSteps.reduce((sum, s) => sum + s.duration, 0) / transformationSteps.length
      : 0;

    return resultsManager.createResult({
      strategyId: strategy.id,
      strategyName: strategy.name,
      startTime: startTime.getTime(),
      endTime: endTime.getTime(),
      duration: endTime.getTime() - startTime.getTime(),
      sourceFileId: sourceFile.id,
      sourceFileName: sourceFile.name,
      initialBits,
      finalBits,
      initialMetrics,
      finalMetrics,
      steps: transformationSteps,
      benchmarks: {
        cpuTime: endTime.getTime() - startTime.getTime(),
        peakMemory: 0,
        operationCount: allTransformations.length,
        avgStepDuration: avgDuration,
        totalCost: budgetUsed,
      },
      filesUsed: {
        algorithm: strategy.algorithmFiles.join(', '),
        scoring: strategy.scoringFiles.join(', '),
        policy: strategy.policyFiles.join(', '),
      },
      status: 'completed',
    });
  }

  /**
   * Export full CSV report
   */
  exportFullCSV(result: ExecutionPipelineResult): string {
    const lines: string[] = [];
    
    // Header
    lines.push('# Strategy Execution Report');
    lines.push(`# Strategy: ${result.strategyName}`);
    lines.push(`# Source File: ${result.sourceFileName}`);
    lines.push(`# Executed: ${result.startTime.toISOString()}`);
    lines.push(`# Duration: ${result.totalDuration}ms`);
    lines.push('');
    
    // Summary Section
    lines.push('## Summary');
    lines.push('Metric,Value');
    lines.push(`Status,${result.success ? 'Success' : 'Failed'}`);
    lines.push(`Total Steps,${result.steps.length}`);
    lines.push(`Total Operations,${result.totalOperations}`);
    lines.push(`Total Bits Changed,${result.totalBitsChanged}`);
    lines.push(`Initial Size,${result.initialBits.length} bits`);
    lines.push(`Final Size,${result.finalBits.length} bits`);
    lines.push(`Total Score,${result.totalScore.toFixed(4)}`);
    lines.push('');
    
    // Budget Section
    lines.push('## Budget (from Scoring)');
    lines.push('Metric,Value');
    lines.push(`Initial Budget,${result.budgetConfig.initial}`);
    lines.push(`Budget Used,${result.budgetConfig.used}`);
    lines.push(`Budget Remaining,${result.budgetConfig.remaining}`);
    lines.push('');
    
    // Operation Costs
    lines.push('## Operation Costs');
    lines.push('Operation,Cost,Count,Total Cost');
    Object.entries(result.operationCounts).forEach(([op, count]) => {
      const cost = result.budgetConfig.costPerOperation[op] || 1;
      lines.push(`${op},${cost},${count},${cost * count}`);
    });
    lines.push('');
    
    // Steps Section
    lines.push('## Execution Steps');
    lines.push('Step,Type,File,Transformations,Duration (ms)');
    result.steps.forEach(step => {
      lines.push([
        step.stepIndex,
        step.stepType,
        step.fileName,
        step.transformations.length,
        step.duration.toFixed(2),
      ].join(','));
    });
    lines.push('');
    
    // Detailed Transformations
    lines.push('## All Transformations');
    lines.push('Index,Step Type,Operation,Params,Bit Ranges,Bits Changed,Duration (ms)');
    let globalIndex = 0;
    result.steps.forEach(step => {
      step.transformations.forEach(t => {
        const ranges = t.bitRanges.map(r => `${r.start}-${r.end}`).join('; ');
        lines.push([
          globalIndex++,
          step.stepType,
          t.operation,
          `"${JSON.stringify(t.params)}"`,
          `"${ranges}"`,
          t.bitsChanged,
          t.duration.toFixed(2),
        ].join(','));
      });
    });
    lines.push('');
    
    // Bit Ranges Summary
    lines.push('## Bit Ranges Processed');
    lines.push('Start,End,Length,Operation');
    result.bitRangesProcessed.forEach(r => {
      lines.push(`${r.start},${r.end},${r.end - r.start},${r.operation}`);
    });
    lines.push('');
    
    // Metrics Comparison
    lines.push('## Metrics Comparison');
    lines.push('Metric,Initial,Final,Change');
    Object.keys(result.initialMetrics).forEach(key => {
      const initial = result.initialMetrics[key];
      const final = result.finalMetrics[key] ?? initial;
      const change = result.metricsChange[key] ?? 0;
      lines.push(`${key},${initial.toFixed(6)},${final.toFixed(6)},${change >= 0 ? '+' : ''}${change.toFixed(6)}`);
    });
    lines.push('');
    
    // Scoring Summary
    lines.push('## Scoring Summary');
    lines.push('File,Score');
    result.scores.forEach(s => {
      lines.push(`${s.fileName},${s.score.toFixed(4)}`);
    });
    lines.push(`Total,${result.totalScore.toFixed(4)}`);
    lines.push('');
    
    // Result File
    lines.push('## Generated Result File');
    lines.push(`File Name,${result.resultFileName}`);
    lines.push(`File ID,${result.resultFileId}`);
    
    return lines.join('\n');
  }

  /**
   * Get current run
   */
  getCurrentRun(): ExecutionPipelineResult | null {
    return this.currentRun;
  }

  /**
   * Check if running
   */
  isExecuting(): boolean {
    return this.isRunning;
  }

  /**
   * Subscribe to updates
   */
  subscribe(listener: (result: ExecutionPipelineResult | null, status: string) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(result: ExecutionPipelineResult | null, status: string): void {
    this.listeners.forEach(l => l(result, status));
  }
}

export const strategyExecutionEngine = new StrategyExecutionEngine();
