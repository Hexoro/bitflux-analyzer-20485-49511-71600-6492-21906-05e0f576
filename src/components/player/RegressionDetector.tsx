/**
 * Regression Detector - Compare two execution results side-by-side
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GitCompare, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { ExecutionResultV2 } from '@/lib/resultsManager';
import { hashBits } from '@/lib/verificationSystem';

interface RegressionDetectorProps {
  resultA: ExecutionResultV2;
  resultB: ExecutionResultV2;
}

export const RegressionDetector = ({ resultA, resultB }: RegressionDetectorProps) => {
  const comparison = useMemo(() => {
    const maxSteps = Math.max(resultA.steps.length, resultB.steps.length);
    let divergenceStep = -1;
    const stepComparisons: Array<{
      index: number;
      opA?: string;
      opB?: string;
      match: boolean;
      hashA?: string;
      hashB?: string;
    }> = [];

    for (let i = 0; i < maxSteps; i++) {
      const sA = resultA.steps[i];
      const sB = resultB.steps[i];
      const bitsA = sA?.cumulativeBits || sA?.fullAfterBits || sA?.afterBits || '';
      const bitsB = sB?.cumulativeBits || sB?.fullAfterBits || sB?.afterBits || '';
      const hashA = bitsA ? hashBits(bitsA) : 'N/A';
      const hashB = bitsB ? hashBits(bitsB) : 'N/A';
      const match = hashA === hashB;

      if (!match && divergenceStep === -1) divergenceStep = i;

      stepComparisons.push({
        index: i,
        opA: sA?.operation,
        opB: sB?.operation,
        match,
        hashA,
        hashB,
      });
    }

    // Metric comparison
    const metricDiffs: Array<{ key: string; valueA: number; valueB: number; delta: number }> = [];
    const allKeys = new Set([...Object.keys(resultA.finalMetrics || {}), ...Object.keys(resultB.finalMetrics || {})]);
    allKeys.forEach(key => {
      const vA = resultA.finalMetrics?.[key] ?? 0;
      const vB = resultB.finalMetrics?.[key] ?? 0;
      if (vA !== vB) {
        metricDiffs.push({ key, valueA: vA, valueB: vB, delta: vB - vA });
      }
    });

    return { divergenceStep, stepComparisons, metricDiffs, finalMatch: hashBits(resultA.finalBits) === hashBits(resultB.finalBits) };
  }, [resultA, resultB]);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card className={comparison.finalMatch ? 'border-green-500/30' : 'border-destructive/30'}>
        <CardContent className="py-3">
          <div className="flex items-center gap-3">
            {comparison.finalMatch ? (
              <CheckCircle className="w-6 h-6 text-green-500" />
            ) : (
              <XCircle className="w-6 h-6 text-destructive" />
            )}
            <div>
              <h3 className="font-medium text-sm">
                {comparison.finalMatch ? 'Results Match' : 'Regression Detected'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {comparison.divergenceStep >= 0
                  ? `First divergence at step ${comparison.divergenceStep + 1}`
                  : 'All steps produce identical output'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step Comparison */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <GitCompare className="w-4 h-4" />
            Step-by-Step ({comparison.stepComparisons.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <ScrollArea className="h-[250px]">
            <div className="space-y-1">
              {comparison.stepComparisons.map(sc => (
                <div key={sc.index} className={`flex items-center gap-2 p-1.5 rounded text-xs ${sc.match ? '' : 'bg-destructive/5 border border-destructive/20'}`}>
                  {sc.match ? <CheckCircle className="w-3 h-3 text-green-500" /> : <XCircle className="w-3 h-3 text-destructive" />}
                  <span className="text-muted-foreground w-6">#{sc.index + 1}</span>
                  <Badge variant="outline" className="text-xs">{sc.opA || '—'}</Badge>
                  {sc.opA !== sc.opB && <Badge variant="outline" className="text-xs text-yellow-500">{sc.opB || '—'}</Badge>}
                  <code className="ml-auto text-muted-foreground font-mono">{sc.hashA?.slice(0, 6)} {sc.match ? '=' : '≠'} {sc.hashB?.slice(0, 6)}</code>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Metric Diffs */}
      {comparison.metricDiffs.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Metric Differences ({comparison.metricDiffs.length})</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="space-y-1 text-xs">
              {comparison.metricDiffs.slice(0, 15).map(d => (
                <div key={d.key} className="flex items-center justify-between p-1.5 rounded bg-muted/20">
                  <span className="text-muted-foreground">{d.key}</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span>{d.valueA.toFixed(4)}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className={d.delta > 0 ? 'text-green-500' : 'text-red-500'}>{d.valueB.toFixed(4)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
