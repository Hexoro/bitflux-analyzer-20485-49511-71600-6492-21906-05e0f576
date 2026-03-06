/**
 * Player Verification - Independent step-by-step verification engine
 * Verifies source + mask/params = expected result independently
 * V2 - Handles segment-only operations correctly
 */

import { executeOperation, getOperationCost } from './operationsRouter';
import { hashBits, verifyReplayFromStored } from './verificationSystem';
import { TransformationStep } from './resultsManager';

export interface IndependentVerificationResult {
  stepIndex: number;
  operation: string;
  passed: boolean;
  expectedBits: string;
  actualBits: string;
  mismatchCount: number;
  mismatchPositions: number[];
  paramsComplete: boolean;
  missingParams: string[];
  error?: string;
  expectedHash: string;
  actualHash: string;
  segmentOnly: boolean;
  segmentPassed?: boolean;
}

export interface FullVerificationReport {
  timestamp: string;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  segmentOnlySteps: number;
  incompleteParams: number;
  overallPassed: boolean;
  chainVerified: boolean;
  initialHash: string;
  finalHash: string;
  reconstructedHash: string;
  stepResults: IndependentVerificationResult[];
  summary: string;
}

const MASK_OPS = new Set(['XOR', 'AND', 'OR', 'NAND', 'NOR', 'XNOR']);
const PARAM_OPS = new Set(['SHL', 'SHR', 'ROL', 'ROR', 'SHUFFLE', 'UNSHUFFLE', 'LFSR']);

/**
 * Detect if a step is a segment-only operation
 */
function isSegmentOnlyStep(step: TransformationStep): boolean {
  // Explicit flag
  if ((step as any).segmentOnly) return true;
  
  // Heuristic: beforeBits length differs from fullBeforeBits length
  if (step.beforeBits && step.fullBeforeBits && step.beforeBits.length !== step.fullBeforeBits.length) {
    return true;
  }
  
  // Heuristic: fullBeforeBits === fullAfterBits but beforeBits !== afterBits
  if (step.fullBeforeBits && step.fullAfterBits && step.fullBeforeBits === step.fullAfterBits 
      && step.beforeBits && step.afterBits && step.beforeBits !== step.afterBits) {
    return true;
  }
  
  return false;
}

/**
 * Verify a single step independently by re-executing with stored params
 * For segment-only operations, verifies against the segment, not the full file
 */
export function verifyStepIndependently(
  beforeBits: string,
  step: TransformationStep,
  stepIndex: number
): IndependentVerificationResult {
  const params = step.params || {};
  const segmentOnly = isSegmentOnlyStep(step);
  
  // Check param completeness
  const missingParams: string[] = [];
  if (MASK_OPS.has(step.operation) && !params.mask && !params.seed) {
    missingParams.push('mask or seed');
  }
  if (PARAM_OPS.has(step.operation) && params.count === undefined && !params.seed) {
    missingParams.push('count or seed');
  }

  try {
    if (segmentOnly) {
      // SEGMENT-ONLY: verify against segment data, not full file
      const segmentInput = step.beforeBits || beforeBits;
      const expectedSegmentAfter = step.afterBits || '';
      
      const opResult = executeOperation(step.operation, segmentInput, { ...params });
      const reExecutedSegment = opResult.success ? opResult.bits : segmentInput;
      
      // Compare segment results
      const mismatchPositions: number[] = [];
      const maxLen = Math.max(reExecutedSegment.length, expectedSegmentAfter.length);
      for (let i = 0; i < maxLen; i++) {
        if ((reExecutedSegment[i] || '0') !== (expectedSegmentAfter[i] || '0')) {
          mismatchPositions.push(i);
        }
      }
      
      const segmentPassed = mismatchPositions.length === 0;
      
      return {
        stepIndex,
        operation: step.operation,
        passed: segmentPassed,
        expectedBits: expectedSegmentAfter.slice(0, 64) + (expectedSegmentAfter.length > 64 ? '...' : ''),
        actualBits: reExecutedSegment.slice(0, 64) + (reExecutedSegment.length > 64 ? '...' : ''),
        mismatchCount: mismatchPositions.length,
        mismatchPositions: mismatchPositions.slice(0, 100),
        paramsComplete: missingParams.length === 0,
        missingParams,
        expectedHash: hashBits(expectedSegmentAfter),
        actualHash: hashBits(reExecutedSegment),
        segmentOnly: true,
        segmentPassed,
      };
    }
    
    // FULL FILE: verify against cumulative/full after bits
    const expectedAfter = step.cumulativeBits || step.fullAfterBits || step.afterBits || '';
    const inputBits = step.fullBeforeBits || beforeBits;
    
    let reExecutedBits: string;
    const bitRange = step.bitRanges?.[0];
    
    if (bitRange && bitRange.start !== undefined && bitRange.end !== undefined 
        && !(bitRange.start === 0 && bitRange.end === inputBits.length)) {
      const before = inputBits.slice(0, bitRange.start);
      const target = inputBits.slice(bitRange.start, bitRange.end);
      const after = inputBits.slice(bitRange.end);
      const opResult = executeOperation(step.operation, target, { ...params });
      reExecutedBits = opResult.success ? before + opResult.bits + after : inputBits;
    } else {
      const opResult = executeOperation(step.operation, inputBits, { ...params });
      reExecutedBits = opResult.success && opResult.bits.length > 0 ? opResult.bits : inputBits;
    }

    // Compare
    const mismatchPositions: number[] = [];
    const maxLen = Math.max(reExecutedBits.length, expectedAfter.length);
    for (let i = 0; i < maxLen; i++) {
      if ((reExecutedBits[i] || '0') !== (expectedAfter[i] || '0')) {
        mismatchPositions.push(i);
      }
    }

    return {
      stepIndex,
      operation: step.operation,
      passed: mismatchPositions.length === 0,
      expectedBits: expectedAfter.slice(0, 64) + (expectedAfter.length > 64 ? '...' : ''),
      actualBits: reExecutedBits.slice(0, 64) + (reExecutedBits.length > 64 ? '...' : ''),
      mismatchCount: mismatchPositions.length,
      mismatchPositions: mismatchPositions.slice(0, 100),
      paramsComplete: missingParams.length === 0,
      missingParams,
      expectedHash: hashBits(expectedAfter),
      actualHash: hashBits(reExecutedBits),
      segmentOnly: false,
    };
  } catch (e) {
    return {
      stepIndex,
      operation: step.operation,
      passed: false,
      expectedBits: '',
      actualBits: '',
      mismatchCount: -1,
      mismatchPositions: [],
      paramsComplete: missingParams.length === 0,
      missingParams,
      error: (e as Error).message,
      expectedHash: 'ERROR',
      actualHash: 'ERROR',
      segmentOnly,
    };
  }
}

/**
 * Verify all steps independently from initial bits
 */
export function verifyAllStepsIndependently(
  initialBits: string,
  steps: TransformationStep[],
  expectedFinalBits: string
): FullVerificationReport {
  const stepResults: IndependentVerificationResult[] = [];
  let currentBits = initialBits;
  let allPassed = true;
  let segmentOnlyCount = 0;

  for (let i = 0; i < steps.length; i++) {
    const result = verifyStepIndependently(currentBits, steps[i], i);
    stepResults.push(result);
    if (!result.passed) allPassed = false;
    if (result.segmentOnly) segmentOnlyCount++;
    
    // Use stored bits for chain continuation (authoritative)
    const storedAfter = steps[i].cumulativeBits || steps[i].fullAfterBits || steps[i].afterBits;
    currentBits = storedAfter || currentBits;
  }

  const reconstructedHash = hashBits(currentBits);
  const finalHash = hashBits(expectedFinalBits);
  const chainVerified = reconstructedHash === finalHash;

  const passedCount = stepResults.filter(r => r.passed).length;
  const failedCount = stepResults.filter(r => !r.passed).length;
  const incompleteCount = stepResults.filter(r => !r.paramsComplete).length;

  return {
    timestamp: new Date().toISOString(),
    totalSteps: steps.length,
    passedSteps: passedCount,
    failedSteps: failedCount,
    segmentOnlySteps: segmentOnlyCount,
    incompleteParams: incompleteCount,
    overallPassed: allPassed && chainVerified,
    chainVerified,
    initialHash: hashBits(initialBits),
    finalHash,
    reconstructedHash,
    stepResults,
    summary: allPassed && chainVerified
      ? `All ${steps.length} steps verified (${segmentOnlyCount} segment-only). Chain hash matches.`
      : `${failedCount} of ${steps.length} steps failed. ${segmentOnlyCount} segment-only. ${incompleteCount} incomplete params. Chain: ${chainVerified ? 'OK' : 'MISMATCH'}`,
  };
}

/**
 * Generate downloadable verification report
 */
export function exportVerificationReport(report: FullVerificationReport): void {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `verification-report-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
