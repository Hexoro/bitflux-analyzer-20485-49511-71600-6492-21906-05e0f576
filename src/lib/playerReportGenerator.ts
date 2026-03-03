/**
 * Player Report Generator - Export verification, issues, and transformation reports
 */

import { hashBits } from './verificationSystem';
import { TransformationStep, ExecutionResultV2 } from './resultsManager';
import { getOperationCost } from './operationsRouter';

export interface PlayerReport {
  type: 'verification' | 'issues' | 'transformation' | 'comparison';
  timestamp: string;
  resultId: string;
  strategyName: string;
  data: any;
}

/**
 * Generate verification report
 */
export function generateVerificationPlayerReport(
  result: ExecutionResultV2,
  reconstructedSteps: any[]
): PlayerReport {
  const stepVerifications = reconstructedSteps.map((step, i) => ({
    index: i,
    operation: step.operation,
    verified: step.verified,
    verificationNote: step.verificationNote,
    executionError: step.executionError,
    beforeHash: step.fullBeforeBits ? hashBits(step.fullBeforeBits) : null,
    afterHash: step.fullAfterBits ? hashBits(step.fullAfterBits) : null,
    paramsStored: !!step.params && Object.keys(step.params).length > 0,
    hasSeed: !!step.params?.seed,
    hasMask: !!step.params?.mask,
  }));

  return {
    type: 'verification',
    timestamp: new Date().toISOString(),
    resultId: result.id,
    strategyName: result.strategyName,
    data: {
      initialHash: hashBits(result.initialBits),
      finalHash: hashBits(result.finalBits),
      totalSteps: result.steps.length,
      verifiedCount: stepVerifications.filter(s => s.verified).length,
      failedCount: stepVerifications.filter(s => s.verified === false).length,
      seedChain: result.seedChain,
      stepVerifications,
    },
  };
}

/**
 * Generate issues report
 */
export function generateIssuesReport(
  result: ExecutionResultV2,
  reconstructedSteps: any[]
): PlayerReport {
  const issues: any[] = [];

  reconstructedSteps.forEach((step, i) => {
    if (step.executionError) {
      issues.push({ type: 'error', step: i, operation: step.operation, message: step.executionError });
    }
    if (step.fullBeforeBits && step.fullAfterBits && step.fullBeforeBits === step.fullAfterBits
        && !['BUFFER', 'COPY', 'BTEST'].includes(step.operation)) {
      issues.push({ type: 'identity', step: i, operation: step.operation, message: 'No change produced' });
    }
    if (step.fullBeforeBits && step.fullAfterBits && step.fullBeforeBits.length !== step.fullAfterBits.length) {
      issues.push({ type: 'length', step: i, operation: step.operation, 
        message: `${step.fullBeforeBits.length} → ${step.fullAfterBits.length}` });
    }
    const MASK_OPS = ['XOR', 'AND', 'OR', 'NAND', 'NOR', 'XNOR'];
    if (MASK_OPS.includes(step.operation) && !step.params?.mask && !step.params?.seed) {
      issues.push({ type: 'missing_params', step: i, operation: step.operation, message: 'No mask/seed stored' });
    }
    if (step.verificationNote?.includes('mismatch')) {
      issues.push({ type: 'non_deterministic', step: i, operation: step.operation, message: step.verificationNote });
    }
  });

  return {
    type: 'issues',
    timestamp: new Date().toISOString(),
    resultId: result.id,
    strategyName: result.strategyName,
    data: {
      totalIssues: issues.length,
      byType: {
        errors: issues.filter(i => i.type === 'error').length,
        identity: issues.filter(i => i.type === 'identity').length,
        length: issues.filter(i => i.type === 'length').length,
        missingParams: issues.filter(i => i.type === 'missing_params').length,
        nonDeterministic: issues.filter(i => i.type === 'non_deterministic').length,
      },
      issues,
    },
  };
}

/**
 * Generate transformation report
 */
export function generateTransformationReport(
  result: ExecutionResultV2,
  reconstructedSteps: any[]
): PlayerReport {
  return {
    type: 'transformation',
    timestamp: new Date().toISOString(),
    resultId: result.id,
    strategyName: result.strategyName,
    data: {
      initialBitsLength: result.initialBits.length,
      finalBitsLength: result.finalBits.length,
      totalSteps: result.steps.length,
      totalCost: reconstructedSteps.reduce((sum, s) => sum + (s.cost || 0), 0),
      totalDuration: result.duration,
      steps: reconstructedSteps.map((step, i) => ({
        index: i,
        operation: step.operation,
        cost: step.cost || getOperationCost(step.operation),
        duration: step.duration,
        bitsChanged: (() => {
          if (!step.fullBeforeBits || !step.fullAfterBits) return 0;
          let c = 0;
          for (let j = 0; j < Math.min(step.fullBeforeBits.length, step.fullAfterBits.length); j++) {
            if (step.fullBeforeBits[j] !== step.fullAfterBits[j]) c++;
          }
          return c;
        })(),
        params: step.params ? Object.keys(step.params) : [],
        metrics: step.metrics ? {
          entropy: step.metrics.entropy,
          balance: step.metrics.balance,
        } : null,
      })),
      initialMetrics: result.initialMetrics,
      finalMetrics: result.finalMetrics,
    },
  };
}

/**
 * Export any report as JSON download
 */
export function exportPlayerReport(report: PlayerReport): void {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `player-${report.type}-report-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
