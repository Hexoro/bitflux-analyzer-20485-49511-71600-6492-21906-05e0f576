/**
 * EnhancedStepDetails - Professional step-by-step execution details
 * Shows operation info, parameters, metrics, and before/after visualization
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { predefinedManager } from '@/lib/predefinedManager';
import { 
  Zap, 
  DollarSign, 
  Clock, 
  Activity, 
  Layers,
  Check,
  X,
  ArrowRight,
  Hash,
  AlertCircle,
  FileCode,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

interface StepData {
  operation: string;
  params?: Record<string, any>;
  cost?: number;
  duration?: number;
  bitRanges?: Array<{ start: number; end: number }>;
  fullBeforeBits?: string;
  fullAfterBits?: string;
  metrics?: Record<string, number>;
  verified?: boolean;
  executionError?: string;
  bitsLength?: number;
}

interface EnhancedStepDetailsProps {
  step: StepData | null;
  stepIndex: number;
  totalSteps: number;
  previousMetrics?: Record<string, number>;
}

export const EnhancedStepDetails = ({ 
  step, 
  stepIndex, 
  totalSteps,
  previousMetrics 
}: EnhancedStepDetailsProps) => {
  // Get operation definition for parameter info - MUST be called unconditionally
  const operationDef = useMemo(() => {
    if (!step) return null;
    return predefinedManager.getOperation(step.operation);
  }, [step]);

  // Calculate bit changes - MUST be called unconditionally
  const bitChanges = useMemo(() => {
    if (!step?.fullBeforeBits || !step?.fullAfterBits) return null;
    
    let changed = 0;
    let zeroToOne = 0;
    let oneToZero = 0;
    
    const len = Math.min(step.fullBeforeBits.length, step.fullAfterBits.length);
    for (let i = 0; i < len; i++) {
      if (step.fullBeforeBits[i] !== step.fullAfterBits[i]) {
        changed++;
        if (step.fullBeforeBits[i] === '0') zeroToOne++;
        else oneToZero++;
      }
    }
    
    return { changed, zeroToOne, oneToZero, total: len };
  }, [step?.fullBeforeBits, step?.fullAfterBits]);

  // Merge parameters with operation definition - MUST be called unconditionally
  const parameterDetails = useMemo(() => {
    if (!step) return [];
    
    const details: Array<{
      name: string;
      value: any;
      type?: string;
      description?: string;
      isDefault?: boolean;
    }> = [];
    
    const definedParams = operationDef?.parameters || [];
    const actualParams = step.params || {};
    
    // Add all defined parameters
    definedParams.forEach(param => {
      const value = actualParams[param.name];
      details.push({
        name: param.name,
        value: value !== undefined ? value : 'Not provided',
        type: param.type,
        description: param.description,
        isDefault: value === undefined,
      });
    });
    
    // Add any extra params not in definition
    Object.entries(actualParams).forEach(([key, value]) => {
      if (!definedParams.find(p => p.name === key)) {
        details.push({
          name: key,
          value,
          type: typeof value,
        });
      }
    });
    
    return details;
  }, [operationDef, step]);

  // Early return AFTER all hooks
  if (!step) {
    return (
      <Card className="bg-gradient-to-b from-card to-muted/10">
        <CardContent className="py-12 text-center">
          <Layers className="w-12 h-12 mx-auto mb-4 opacity-30 text-muted-foreground" />
          <p className="text-lg font-medium text-muted-foreground">Select a Step</p>
          <p className="text-sm text-muted-foreground">Click on a step in the timeline to view details</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Operation Header Card */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20 overflow-hidden">
        <CardContent className="py-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/40 flex items-center justify-center shadow-lg shadow-primary/10">
              <Zap className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-mono text-2xl font-bold text-primary">{step.operation}</h3>
                <Badge variant="outline" className="text-xs">
                  Step {stepIndex + 1}/{totalSteps}
                </Badge>
                {step.verified !== undefined && (
                  <Badge 
                    variant={step.verified ? 'default' : 'destructive'}
                    className={`text-xs ${step.verified ? 'bg-green-500/20 text-green-400 border-green-500/30' : ''}`}
                  >
                    {step.verified ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                    {step.verified ? 'Verified' : 'Mismatch'}
                  </Badge>
                )}
              </div>
              {operationDef && (
                <p className="text-sm text-muted-foreground mb-2">
                  {operationDef.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1 text-primary">
                  <DollarSign className="w-3 h-3" />
                  Cost: {step.cost || 1}
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {(step.duration || 0).toFixed(2)}ms
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Hash className="w-3 h-3" />
                  {step.bitsLength || 0} bits
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {step.executionError && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="py-3 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-red-400">Execution Error</div>
              <div className="text-sm text-red-300/80">{step.executionError}</div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Parameters Card */}
        <Card>
          <CardHeader className="py-2 bg-muted/30">
            <CardTitle className="text-xs flex items-center gap-2">
              <FileCode className="w-3 h-3" />
              Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="py-3">
            {parameterDetails.length > 0 ? (
              <div className="space-y-2">
                {parameterDetails.map((param, i) => (
                  <div key={i} className="p-2 bg-muted/20 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-muted-foreground">{param.name}</span>
                      {param.type && (
                        <Badge variant="outline" className="text-[10px] h-4">
                          {param.type}
                        </Badge>
                      )}
                    </div>
                    <div className="font-mono text-sm break-all">
                      {param.name === 'mask' && typeof param.value === 'string' && param.value.length > 32 ? (
                        <span className="text-primary">
                          {param.value.slice(0, 16)}...{param.value.slice(-12)}
                          <span className="text-muted-foreground text-xs ml-1">({param.value.length} bits)</span>
                        </span>
                      ) : (
                        <span className={param.isDefault ? 'text-muted-foreground italic' : 'text-primary'}>
                          {JSON.stringify(param.value)}
                        </span>
                      )}
                    </div>
                    {param.description && (
                      <div className="text-[10px] text-muted-foreground mt-1">{param.description}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground text-sm">
                <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No parameters required
              </div>
            )}
          </CardContent>
        </Card>

        {/* Affected Ranges Card */}
        <Card>
          <CardHeader className="py-2 bg-muted/30">
            <CardTitle className="text-xs flex items-center gap-2">
              <Layers className="w-3 h-3" />
              Affected Ranges
            </CardTitle>
          </CardHeader>
          <CardContent className="py-3">
            {step.bitRanges && step.bitRanges.length > 0 ? (
              <ScrollArea className="max-h-32">
                <div className="space-y-2">
                  {step.bitRanges.map((range, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                      <Badge variant="outline" className="font-mono text-cyan-400 border-cyan-500/30">
                        [{range.start}:{range.end}]
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {range.end - range.start} bits
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-4 text-muted-foreground text-sm">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Full bit range
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bit Changes Visualization */}
      {bitChanges && (
        <Card className="bg-gradient-to-r from-cyan-500/5 via-transparent to-green-500/5">
          <CardHeader className="py-2">
            <CardTitle className="text-xs flex items-center gap-2">
              <ArrowRight className="w-3 h-3 text-cyan-400" />
              Before → After
            </CardTitle>
          </CardHeader>
          <CardContent className="py-3 space-y-3">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2 bg-muted/20 rounded-lg">
                <div className="text-lg font-bold">{bitChanges.changed}</div>
                <div className="text-[10px] text-muted-foreground">Changed</div>
              </div>
              <div className="p-2 bg-green-500/10 rounded-lg">
                <div className="text-lg font-bold text-green-400">{bitChanges.zeroToOne}</div>
                <div className="text-[10px] text-muted-foreground">0→1</div>
              </div>
              <div className="p-2 bg-red-500/10 rounded-lg">
                <div className="text-lg font-bold text-red-400">{bitChanges.oneToZero}</div>
                <div className="text-[10px] text-muted-foreground">1→0</div>
              </div>
              <div className="p-2 bg-muted/20 rounded-lg">
                <div className="text-lg font-bold">{((bitChanges.changed / bitChanges.total) * 100).toFixed(1)}%</div>
                <div className="text-[10px] text-muted-foreground">Rate</div>
              </div>
            </div>
            
            {step.bitRanges?.[0] && step.fullBeforeBits && step.fullAfterBits && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2 bg-muted/20 rounded-lg">
                  <div className="text-[10px] text-muted-foreground mb-1">Before (range)</div>
                  <div className="font-mono text-xs text-yellow-400 break-all">
                    {step.fullBeforeBits.slice(step.bitRanges[0].start, step.bitRanges[0].end).slice(0, 48)}
                    {step.bitRanges[0].end - step.bitRanges[0].start > 48 && '...'}
                  </div>
                </div>
                <div className="p-2 bg-muted/20 rounded-lg">
                  <div className="text-[10px] text-muted-foreground mb-1">After (range)</div>
                  <div className="font-mono text-xs text-green-400 break-all">
                    {step.fullAfterBits.slice(step.bitRanges[0].start, step.bitRanges[0].end).slice(0, 48)}
                    {step.bitRanges[0].end - step.bitRanges[0].start > 48 && '...'}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Live Metrics */}
      {step.metrics && Object.keys(step.metrics).length > 0 && (
        <Card>
          <CardHeader className="py-2 bg-muted/30">
            <CardTitle className="text-xs flex items-center gap-2">
              <Activity className="w-3 h-3" />
              Live Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="py-3">
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(step.metrics).slice(0, 9).map(([key, value]) => {
                const prevValue = previousMetrics?.[key];
                const change = prevValue !== undefined ? (value as number) - (prevValue as number) : null;
                
                return (
                  <div key={key} className="p-2 bg-muted/20 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground truncate">{key}</span>
                      {change !== null && change !== 0 && (
                        change < 0 
                          ? <TrendingDown className="w-3 h-3 text-green-400" />
                          : <TrendingUp className="w-3 h-3 text-red-400" />
                      )}
                    </div>
                    <div className="font-mono text-sm font-medium">
                      {typeof value === 'number' ? value.toFixed(4) : String(value)}
                    </div>
                    {change !== null && change !== 0 && (
                      <div className={`text-[10px] ${change < 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {change > 0 ? '+' : ''}{change.toFixed(4)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
