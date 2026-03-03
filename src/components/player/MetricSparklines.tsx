/**
 * Metric Sparklines - Inline metric delta sparklines per step
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';

interface MetricSparklinesProps {
  steps: Array<{
    operation: string;
    metrics?: Record<string, number>;
    cost?: number;
  }>;
  currentStep: number;
  trackedMetrics?: string[];
}

const DEFAULT_METRICS = ['entropy', 'balance', 'transition_density', 'compression_ratio', 'autocorrelation'];

export const MetricSparklines = ({
  steps,
  currentStep,
  trackedMetrics = DEFAULT_METRICS,
}: MetricSparklinesProps) => {
  const sparkData = useMemo(() => {
    return trackedMetrics.map(metricKey => {
      const values = steps.map(s => s.metrics?.[metricKey] ?? 0);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min || 1;
      const current = values[currentStep] ?? 0;
      const prev = currentStep > 0 ? (values[currentStep - 1] ?? 0) : current;
      const delta = current - prev;
      const initial = values[0] ?? 0;
      const totalDelta = current - initial;

      return { key: metricKey, values, min, max, range, current, delta, totalDelta };
    });
  }, [steps, currentStep, trackedMetrics]);

  const renderSparkline = (values: number[], min: number, range: number, currentIdx: number) => {
    const width = 120;
    const height = 24;
    const stepW = values.length > 1 ? width / (values.length - 1) : width;

    const points = values.map((v, i) => {
      const x = i * stepW;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    }).join(' ');

    const currentX = currentIdx * stepW;
    const currentY = height - ((values[currentIdx] - min) / range) * (height - 4) - 2;

    return (
      <svg width={width} height={height} className="flex-shrink-0">
        <polyline
          points={points}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <circle cx={currentX} cy={currentY} r="3" fill="hsl(var(--primary))" />
      </svg>
    );
  };

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Metric Sparklines
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2 space-y-2">
        {sparkData.map(metric => (
          <div key={metric.key} className="flex items-center gap-3 p-2 rounded bg-muted/20">
            <span className="text-xs text-muted-foreground w-28 truncate">{metric.key}</span>
            {renderSparkline(metric.values, metric.min, metric.range, currentStep)}
            <span className="text-xs font-mono w-16 text-right">
              {metric.current.toFixed(3)}
            </span>
            <div className="flex items-center gap-1 w-16">
              {metric.delta > 0.001 ? (
                <><TrendingUp className="w-3 h-3 text-green-500" /><span className="text-xs text-green-500">+{metric.delta.toFixed(3)}</span></>
              ) : metric.delta < -0.001 ? (
                <><TrendingDown className="w-3 h-3 text-red-500" /><span className="text-xs text-red-500">{metric.delta.toFixed(3)}</span></>
              ) : (
                <><Minus className="w-3 h-3 text-muted-foreground" /><span className="text-xs text-muted-foreground">0</span></>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
