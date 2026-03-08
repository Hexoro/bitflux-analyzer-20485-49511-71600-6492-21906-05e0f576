/**
 * Canonical Replay Engine - Shared authoritative replay from stored steps
 * Extracts replay logic from PlayerModePanel into a reusable library
 * Re-execution is VALIDATION only; stored cumulative bits are authoritative
 */

import { ExecutionResultV2, TransformationStep } from './resultsManager';
import { executeOperation, getOperationCost } from './operationsRouter';
import { calculateAllMetrics } from './metricsCalculator';
import { hashBits } from './verificationSystem';

export interface ReplayStep {
  stepIndex: number;
  operation: string;
  params: Record<string, any>;
  // Authoritative state (from stored result)
  authoritativeBeforeBits: string;
  authoritativeAfterBits: string;
  authoritativeCumulativeBits: string;
  // Segment data
  segmentBeforeBits: string;
  segmentAfterBits: string;
  isSegmentOnly: boolean;
  segmentBitsChanged: number;
  fullBitsChanged: number;
  // Verification
  verified: boolean;
  verificationNote?: string;
  executionError?: string;
  // Metrics at this point
  metrics: Record<string, number>;
  cost: number;
  duration: number;
  bitRanges?: { start: number; end: number }[];
  bitsLength: number;
  // Hashes for strict comparison
  beforeHash: string;
  afterHash: string;
}

export interface ReplayReport {
  steps: ReplayStep[];
  totalSteps: number;
  verifiedSteps: number;
  failedSteps: number;
  segmentOnlySteps: number;
  chainVerified: boolean;
  initialHash: string;
  finalHash: string;
  reconstructedFinalHash: string;
  strictMode: boolean;
}

function countMismatches(a: string, b: string): number {
  const len = Math.max(a.length, b.length);
  let count = 0;
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) count++;
  }
  return count;
}

function countChangedBits(a: string, b: string): number {
  let count = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) count++;
  }
  return count;
}

/**
 * Replay all steps from a stored ExecutionResultV2
 * Uses stored cumulative bits as authoritative state
 * Re-executes operations for validation only
 */
export function replayFromStoredSteps(
  result: ExecutionResultV2,
  strictMode: boolean = true
): ReplayReport {
  const steps: ReplayStep[] = [];
  let currentBits = result.initialBits;
  let verifiedCount = 0;
  let failedCount = 0;
  let segmentOnlyCount = 0;

  for (let i = 0; i < result.steps.length; i++) {
    const originalStep = result.steps[i];
    const beforeBits = currentBits;

    // Determine authoritative after state
    const authoritativeAfter = originalStep.cumulativeBits 
      || originalStep.fullAfterBits 
      || originalStep.afterBits 
      || currentBits;

    // Detect segment-only operation
    const isSegmentOp = (originalStep as any).segmentOnly === true
      || (originalStep.beforeBits && originalStep.fullBeforeBits
          && originalStep.beforeBits.length !== originalStep.fullBeforeBits.length)
      || (originalStep.fullBeforeBits === originalStep.fullAfterBits
          && originalStep.beforeBits !== originalStep.afterBits);

    if (isSegmentOp) segmentOnlyCount++;

    let verified = true;
    let verificationNote: string | undefined;
    let executionError: string | undefined;

    // Re-execute for validation
    if (originalStep.params) {
      try {
        if (isSegmentOp) {
          // Segment-only: re-execute on the SEGMENT data
          const segmentInput = originalStep.beforeBits || currentBits;
          const expectedSegmentAfter = originalStep.afterBits || '';
          const opResult = executeOperation(originalStep.operation, segmentInput, originalStep.params || {});

          if (opResult.success) {
            if (opResult.bits !== expectedSegmentAfter) {
              const mismatches = countMismatches(opResult.bits, expectedSegmentAfter);
              verified = false;
              verificationNote = `Segment re-execution mismatch: ${mismatches} bits differ`;
            }
          } else {
            executionError = opResult.error;
            verified = false;
          }
        } else {
          // Full file operation
          const bitRange = originalStep.bitRanges?.[0];
          let reExecutedBits: string;

          if (bitRange && bitRange.start !== undefined && bitRange.end !== undefined
              && !(bitRange.start === 0 && bitRange.end === currentBits.length)) {
            const before = currentBits.slice(0, bitRange.start);
            const target = currentBits.slice(bitRange.start, bitRange.end);
            const after = currentBits.slice(bitRange.end);
            const opResult = executeOperation(originalStep.operation, target, originalStep.params || {});
            reExecutedBits = opResult.success ? before + opResult.bits + after : currentBits;
            if (!opResult.success) executionError = opResult.error;
          } else {
            const opResult = executeOperation(originalStep.operation, currentBits, originalStep.params || {});
            reExecutedBits = opResult.success && opResult.bits.length > 0 ? opResult.bits : currentBits;
            if (!opResult.success) executionError = opResult.error;
          }

          if (authoritativeAfter && reExecutedBits !== authoritativeAfter) {
            const mismatches = countMismatches(reExecutedBits, authoritativeAfter);
            if (strictMode || mismatches > 0) {
              verified = false;
              verificationNote = `Re-execution mismatch: ${mismatches} bits differ (stored state used for playback)`;
            }
          }
        }
      } catch (e) {
        executionError = (e as Error).message;
        verified = false;
      }
    }

    if (verified) verifiedCount++;
    else failedCount++;

    // Compute deltas
    const segmentBefore = originalStep.beforeBits || beforeBits;
    const segmentAfter = originalStep.afterBits || authoritativeAfter;
    const segmentBitsChanged = countChangedBits(segmentBefore, segmentAfter);
    const fullBitsChanged = countChangedBits(beforeBits, authoritativeAfter);

    const metricsResult = calculateAllMetrics(authoritativeAfter);

    steps.push({
      stepIndex: i,
      operation: originalStep.operation,
      params: originalStep.params || {},
      authoritativeBeforeBits: beforeBits,
      authoritativeAfterBits: authoritativeAfter,
      authoritativeCumulativeBits: authoritativeAfter,
      segmentBeforeBits: originalStep.beforeBits || beforeBits,
      segmentAfterBits: originalStep.afterBits || authoritativeAfter,
      isSegmentOnly: isSegmentOp,
      segmentBitsChanged,
      fullBitsChanged,
      verified,
      verificationNote,
      executionError,
      metrics: metricsResult.metrics,
      cost: originalStep.cost || getOperationCost(originalStep.operation),
      duration: originalStep.duration,
      bitRanges: originalStep.bitRanges,
      bitsLength: authoritativeAfter.length,
      beforeHash: hashBits(beforeBits),
      afterHash: hashBits(authoritativeAfter),
    });

    // Advance using authoritative state
    currentBits = authoritativeAfter;
  }

  const reconstructedFinalHash = hashBits(currentBits);
  const expectedFinalHash = hashBits(result.finalBits);
  const chainVerified = reconstructedFinalHash === expectedFinalHash;

  return {
    steps,
    totalSteps: result.steps.length,
    verifiedSteps: verifiedCount,
    failedSteps: failedCount,
    segmentOnlySteps: segmentOnlyCount,
    chainVerified,
    initialHash: hashBits(result.initialBits),
    finalHash: expectedFinalHash,
    reconstructedFinalHash,
    strictMode,
  };
}
