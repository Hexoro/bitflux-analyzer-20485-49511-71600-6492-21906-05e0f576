/**
 * Error Summary Bar - Error classification display at top of Player
 */

import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, XCircle, AlertOctagon, Zap, 
  ArrowLeftRight, Key, Infinity 
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

export type ErrorCategory = 
  | 'operation_failure'
  | 'length_mismatch'
  | 'param_missing'
  | 'non_deterministic'
  | 'overflow'
  | 'identity_op';

interface StepError {
  stepIndex: number;
  operation: string;
  category: ErrorCategory;
  message: string;
  suggestion?: string;
}

interface ErrorSummaryBarProps {
  steps: Array<{
    operation: string;
    params?: Record<string, any>;
    fullBeforeBits?: string;
    fullAfterBits?: string;
    verified?: boolean;
    verificationNote?: string;
    executionError?: string;
  }>;
}

const CATEGORY_CONFIG: Record<ErrorCategory, { icon: React.ElementType; label: string; color: string }> = {
  operation_failure: { icon: XCircle, label: 'Failures', color: 'text-destructive' },
  length_mismatch: { icon: ArrowLeftRight, label: 'Length', color: 'text-orange-500' },
  param_missing: { icon: Key, label: 'Params', color: 'text-yellow-500' },
  non_deterministic: { icon: AlertOctagon, label: 'Non-det', color: 'text-purple-500' },
  overflow: { icon: Zap, label: 'Overflow', color: 'text-red-400' },
  identity_op: { icon: Infinity, label: 'No-op', color: 'text-muted-foreground' },
};

function classifyStepErrors(steps: ErrorSummaryBarProps['steps']): StepError[] {
  const errors: StepError[] = [];

  steps.forEach((step, idx) => {
    // Operation failure
    if (step.executionError) {
      errors.push({
        stepIndex: idx,
        operation: step.operation,
        category: 'operation_failure',
        message: step.executionError,
        suggestion: 'Check operation parameters or input data',
      });
    }

    // Length mismatch
    if (step.fullBeforeBits && step.fullAfterBits && 
        step.fullBeforeBits.length !== step.fullAfterBits.length) {
      errors.push({
        stepIndex: idx,
        operation: step.operation,
        category: 'length_mismatch',
        message: `Length changed: ${step.fullBeforeBits.length} → ${step.fullAfterBits.length}`,
      });
    }

    // Non-deterministic
    if (step.verificationNote?.includes('mismatch')) {
      errors.push({
        stepIndex: idx,
        operation: step.operation,
        category: 'non_deterministic',
        message: step.verificationNote,
        suggestion: `Operation ${step.operation} may need a stored seed for deterministic replay`,
      });
    }

    // Identity operation (no change)
    if (step.fullBeforeBits && step.fullAfterBits && 
        step.fullBeforeBits === step.fullAfterBits &&
        step.operation !== 'BUFFER' && step.operation !== 'COPY') {
      errors.push({
        stepIndex: idx,
        operation: step.operation,
        category: 'identity_op',
        message: 'Operation produced no change',
        suggestion: 'Check if mask or parameters are causing a no-op',
      });
    }

    // Missing params for mask operations
    const MASK_OPS = ['XOR', 'AND', 'OR', 'NAND', 'NOR', 'XNOR'];
    if (MASK_OPS.includes(step.operation) && !step.params?.mask && !step.params?.seed) {
      errors.push({
        stepIndex: idx,
        operation: step.operation,
        category: 'param_missing',
        message: 'No mask or seed stored',
        suggestion: 'Replay may not match without stored mask/seed',
      });
    }
  });

  return errors;
}

export const ErrorSummaryBar = ({ steps }: ErrorSummaryBarProps) => {
  const errors = classifyStepErrors(steps);
  
  if (errors.length === 0) return null;

  // Group by category
  const grouped = errors.reduce((acc, err) => {
    acc[err.category] = (acc[err.category] || 0) + 1;
    return acc;
  }, {} as Record<ErrorCategory, number>);

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 p-2 border border-border rounded-lg bg-muted/20">
        <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
        <span className="text-xs text-muted-foreground">{errors.length} issues:</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {Object.entries(grouped).map(([category, count]) => {
            const config = CATEGORY_CONFIG[category as ErrorCategory];
            const Icon = config.icon;
            const categoryErrors = errors.filter(e => e.category === category);
            
            return (
              <Tooltip key={category}>
                <TooltipTrigger>
                  <Badge variant="outline" className={`text-xs ${config.color} gap-1`}>
                    <Icon className="w-3 h-3" />
                    {count} {config.label}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <div className="space-y-1 text-xs">
                    {categoryErrors.slice(0, 5).map((err, i) => (
                      <div key={i}>
                        <span className="font-medium">Step #{err.stepIndex + 1} ({err.operation}):</span>{' '}
                        {err.message}
                        {err.suggestion && (
                          <p className="text-muted-foreground mt-0.5">💡 {err.suggestion}</p>
                        )}
                      </div>
                    ))}
                    {categoryErrors.length > 5 && (
                      <p className="text-muted-foreground">...and {categoryErrors.length - 5} more</p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
};
