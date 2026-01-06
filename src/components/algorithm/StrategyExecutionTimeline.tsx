/**
 * Strategy Execution Timeline - Visual timeline showing step-by-step execution
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Zap,
  Activity,
  ChevronRight,
} from 'lucide-react';
import { strategyExecutionEngine, StepResult } from '@/lib/strategyExecutionEngine';

interface ExecutionStep {
  id: string;
  operation: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  duration: number;
  cost?: number;
  bitRange?: { start: number; end: number };
  params?: Record<string, any>;
  error?: string;
}

interface StrategyExecutionTimelineProps {
  isExecuting?: boolean;
}

export const StrategyExecutionTimeline = ({ isExecuting = false }: StrategyExecutionTimelineProps) => {
  const [steps, setSteps] = useState<ExecutionStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<string>('idle');
  const [totalDuration, setTotalDuration] = useState(0);

  useEffect(() => {
    const unsubscribe = strategyExecutionEngine.subscribe((result, status) => {
      if (result?.steps) {
        // Convert StepResult to ExecutionStep format
        const convertedSteps: ExecutionStep[] = result.steps.map((s, idx) => ({
          id: `step-${idx}`,
          operation: s.fileName || s.stepType,
          status: 'completed' as const,
          duration: s.duration,
          cost: s.transformations?.reduce((sum, t) => sum + (t.cost || 0), 0) || 0,
          bitRange: s.transformations?.[0] ? { start: 0, end: s.bits.length } : undefined,
          params: {},
          error: undefined
        }));
        setSteps(convertedSteps);
        setCurrentStepIndex(convertedSteps.length - 1);
        setTotalDuration(result.totalDuration || 0);
      }
      setExecutionStatus(status);
    });

    return () => unsubscribe();
  }, []);

  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const failedSteps = steps.filter(s => s.status === 'failed').length;
  const progress = steps.length > 0 ? (completedSteps / steps.length) * 100 : 0;

  const getStepStatusIcon = (status: ExecutionStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStepColor = (status: ExecutionStep['status'], index: number) => {
    if (index === currentStepIndex && executionStatus === 'running') {
      return 'border-cyan-400 bg-cyan-500/10 shadow-[0_0_15px_rgba(0,255,255,0.2)]';
    }
    switch (status) {
      case 'completed':
        return 'border-green-500/50 bg-green-500/5';
      case 'failed':
        return 'border-red-500/50 bg-red-500/5';
      case 'running':
        return 'border-cyan-400 bg-cyan-500/10';
      default:
        return 'border-border bg-background/50';
    }
  };

  const handleStepClick = (index: number) => {
    setCurrentStepIndex(index);
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleNextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const currentStep = steps[currentStepIndex];

  if (steps.length === 0) {
    return (
      <Card className="bg-background/30 border-cyan-400/20">
        <CardContent className="py-8 text-center">
          <Activity className="w-12 h-12 mx-auto mb-3 text-cyan-400/30" />
          <p className="text-muted-foreground">No execution history</p>
          <p className="text-xs text-muted-foreground mt-1">
            Run a strategy to see the execution timeline
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-cyan-950/20 via-background to-emerald-950/20 border-cyan-400/30">
      <CardHeader className="py-3 border-b border-cyan-400/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2 text-cyan-100">
            <Activity className="w-4 h-4 text-cyan-400" />
            Execution Timeline
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] border-cyan-400/50 text-cyan-300">
              {steps.length} steps
            </Badge>
            <Badge 
              className={`text-[10px] ${
                executionStatus === 'completed' ? 'bg-green-500/20 text-green-300 border-green-500/50' :
                executionStatus === 'running' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50 animate-pulse' :
                executionStatus === 'failed' ? 'bg-red-500/20 text-red-300 border-red-500/50' :
                'bg-muted text-muted-foreground'
              }`}
            >
              {executionStatus}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Progress Overview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="text-cyan-300">{completedSteps}/{steps.length} completed</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{failedSteps > 0 ? `${failedSteps} failed` : 'No failures'}</span>
            <span>Total: {totalDuration.toFixed(2)}ms</span>
          </div>
        </div>

        {/* Timeline Controls */}
        <div className="flex items-center justify-center gap-2 py-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 border-cyan-400/30"
            onClick={handlePrevStep}
            disabled={currentStepIndex === 0}
          >
            <SkipBack className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-3 border-cyan-400/30"
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? <Play className="w-4 h-4 mr-1" /> : <Pause className="w-4 h-4 mr-1" />}
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 border-cyan-400/30"
            onClick={handleNextStep}
            disabled={currentStepIndex === steps.length - 1}
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>

        {/* Timeline Visualization */}
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-400/50 via-emerald-400/50 to-cyan-400/50" />
          
          <ScrollArea className="h-64">
            <div className="space-y-2 pl-10 pr-2">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`relative p-3 rounded-lg border cursor-pointer transition-all ${getStepColor(step.status, index)}`}
                  onClick={() => handleStepClick(index)}
                >
                  {/* Timeline dot */}
                  <div 
                    className={`absolute -left-[26px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 ${
                      step.status === 'completed' ? 'bg-green-400 border-green-400' :
                      step.status === 'failed' ? 'bg-red-400 border-red-400' :
                      step.status === 'running' ? 'bg-cyan-400 border-cyan-400 animate-pulse' :
                      'bg-background border-muted-foreground'
                    }`}
                  />
                  
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {getStepStatusIcon(step.status)}
                      <span className="font-mono text-xs font-medium">{step.operation}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      Step {index + 1}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {step.duration.toFixed(2)}ms
                    </span>
                    {step.cost !== undefined && (
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        Cost: {step.cost}
                      </span>
                    )}
                    {step.bitRange && (
                      <span className="font-mono">
                        [{step.bitRange.start}:{step.bitRange.end}]
                      </span>
                    )}
                  </div>
                  
                  {step.error && (
                    <div className="mt-2 p-2 bg-red-500/10 rounded text-[10px] text-red-300">
                      {step.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Current Step Details */}
        {currentStep && (
          <Card className="bg-background/30 border-cyan-400/20">
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-xs flex items-center gap-2">
                <ChevronRight className="w-3 h-3 text-cyan-400" />
                Step {currentStepIndex + 1} Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-muted/30 rounded">
                  <div className="text-muted-foreground text-[10px]">Operation</div>
                  <div className="font-mono font-medium">{currentStep.operation}</div>
                </div>
                <div className="p-2 bg-muted/30 rounded">
                  <div className="text-muted-foreground text-[10px]">Duration</div>
                  <div className="font-mono font-medium">{currentStep.duration.toFixed(4)}ms</div>
                </div>
                {currentStep.params && Object.keys(currentStep.params).length > 0 && (
                  <div className="col-span-2 p-2 bg-muted/30 rounded">
                    <div className="text-muted-foreground text-[10px] mb-1">Parameters</div>
                    <div className="font-mono text-[10px]">
                      {JSON.stringify(currentStep.params, null, 2)}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};
