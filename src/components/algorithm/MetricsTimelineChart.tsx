/**
 * MetricsTimelineChart - Shows metrics changes over execution steps
 * Line chart visualization for entropy, balance, etc.
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { TrendingDown, TrendingUp, Activity } from 'lucide-react';

interface TransformationStep {
  operation: string;
  metrics: Record<string, number>;
  cost?: number;
}

interface MetricsTimelineChartProps {
  steps: TransformationStep[];
  initialMetrics?: Record<string, number>;
  currentStepIndex?: number;
}

const METRIC_COLORS: Record<string, string> = {
  entropy: 'hsl(var(--chart-1))',
  balance: 'hsl(var(--chart-2))',
  compression_ratio: 'hsl(var(--chart-3))',
  transition_rate: 'hsl(var(--chart-4))',
};

const METRIC_LABELS: Record<string, string> = {
  entropy: 'Entropy',
  balance: 'Balance',
  compression_ratio: 'Compression',
  transition_rate: 'Transitions',
};

export const MetricsTimelineChart = ({
  steps,
  initialMetrics,
  currentStepIndex = 0,
}: MetricsTimelineChartProps) => {
  const { chartData, metricKeys, summaryStats } = useMemo(() => {
    if (steps.length === 0) {
      return { chartData: [], metricKeys: [], summaryStats: {} };
    }

    // Collect all metric keys
    const keys = new Set<string>();
    steps.forEach(s => Object.keys(s.metrics || {}).forEach(k => keys.add(k)));
    const metricKeys = Array.from(keys).filter(k => METRIC_COLORS[k]);

    // Build chart data starting with initial metrics
    const data: Array<Record<string, any>> = [];
    
    if (initialMetrics) {
      data.push({
        step: 0,
        name: 'Initial',
        operation: 'Start',
        ...initialMetrics,
      });
    }

    steps.forEach((step, i) => {
      data.push({
        step: (initialMetrics ? 1 : 0) + i,
        name: `Step ${i + 1}`,
        operation: step.operation,
        cost: step.cost || 1,
        ...step.metrics,
      });
    });

    // Calculate summary stats
    const stats: Record<string, { start: number; end: number; change: number }> = {};
    metricKeys.forEach(key => {
      const start = data[0]?.[key] ?? 0;
      const end = data[data.length - 1]?.[key] ?? 0;
      stats[key] = {
        start,
        end,
        change: end - start,
      };
    });

    return { chartData: data, metricKeys, summaryStats: stats };
  }, [steps, initialMetrics]);

  if (steps.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No metrics data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Metrics Timeline
          </CardTitle>
          <div className="flex items-center gap-2">
            {Object.entries(summaryStats).map(([key, stats]) => (
              <Badge 
                key={key} 
                variant={stats.change < 0 && key === 'entropy' ? 'default' : 'secondary'}
                className="text-xs flex items-center gap-1"
              >
                {key === 'entropy' && stats.change < 0 ? (
                  <TrendingDown className="w-3 h-3" />
                ) : (
                  <TrendingUp className="w-3 h-3" />
                )}
                {METRIC_LABELS[key] || key}: {stats.change >= 0 ? '+' : ''}{stats.change.toFixed(4)}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10 }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10 }}
                tickLine={false}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number, name: string) => [
                  value.toFixed(4),
                  METRIC_LABELS[name] || name
                ]}
                labelFormatter={(label, payload) => {
                  const item = payload?.[0]?.payload;
                  return item ? `${label}: ${item.operation}` : label;
                }}
              />
              <Legend 
                iconSize={8}
                wrapperStyle={{ fontSize: '11px' }}
                formatter={(value) => METRIC_LABELS[value] || value}
              />
              
              {/* Current step indicator */}
              {currentStepIndex !== undefined && (
                <ReferenceLine
                  x={chartData[currentStepIndex + (initialMetrics ? 1 : 0)]?.name}
                  stroke="hsl(var(--primary))"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                />
              )}
              
              {metricKeys.map(key => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={METRIC_COLORS[key]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend showing cost per step */}
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground overflow-x-auto">
          <span>Cost per step:</span>
          {steps.slice(0, 10).map((step, i) => (
            <Badge 
              key={i} 
              variant={i === currentStepIndex ? 'default' : 'outline'}
              className="text-xs shrink-0"
            >
              {step.operation}: {step.cost || 1}
            </Badge>
          ))}
          {steps.length > 10 && <span>+{steps.length - 10} more</span>}
        </div>
      </CardContent>
    </Card>
  );
};
