/**
 * EnhancedMetricsTimeline - Professional metrics visualization over execution steps
 * Multi-chart view with sparklines, trends, and detailed analysis
 */

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
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
  AreaChart,
  Area,
  BarChart,
  Bar,
} from 'recharts';
import { 
  TrendingDown, 
  TrendingUp, 
  Activity, 
  BarChart3,
  LineChart as LineChartIcon,
  Sparkles,
  Target,
  Zap,
  DollarSign
} from 'lucide-react';

interface TransformationStep {
  operation: string;
  metrics?: Record<string, number>;
  cost?: number;
  duration?: number;
}

interface EnhancedMetricsTimelineProps {
  steps: TransformationStep[];
  initialMetrics?: Record<string, number>;
  currentStepIndex?: number;
  budget?: number;
}

const METRIC_CONFIG: Record<string, { color: string; label: string; ideal: 'low' | 'high' | 'balanced' }> = {
  entropy: { color: '#8b5cf6', label: 'Entropy', ideal: 'low' },
  balance: { color: '#06b6d4', label: 'Balance', ideal: 'balanced' },
  compression_ratio: { color: '#22c55e', label: 'Compression', ideal: 'low' },
  transition_rate: { color: '#f59e0b', label: 'Transitions', ideal: 'low' },
  hamming_weight: { color: '#ec4899', label: 'Hamming', ideal: 'balanced' },
  pattern_diversity: { color: '#3b82f6', label: 'Diversity', ideal: 'low' },
};

export const EnhancedMetricsTimeline = ({
  steps,
  initialMetrics,
  currentStepIndex = 0,
  budget = 1000,
}: EnhancedMetricsTimelineProps) => {
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line');
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(new Set(['entropy', 'balance']));

  const { chartData, metricKeys, summaryStats, costData } = useMemo(() => {
    if (steps.length === 0) {
      return { chartData: [], metricKeys: [], summaryStats: {}, costData: [] };
    }

    // Collect all metric keys
    const keys = new Set<string>();
    steps.forEach(s => {
      if (s.metrics) {
        Object.keys(s.metrics).forEach(k => keys.add(k));
      }
    });
    const metricKeys = Array.from(keys).filter(k => METRIC_CONFIG[k]);

    // Build chart data
    const data: Array<Record<string, any>> = [];
    let cumulativeCost = 0;
    
    if (initialMetrics) {
      data.push({
        step: 0,
        name: 'Initial',
        operation: 'Start',
        cost: 0,
        cumulativeCost: 0,
        budgetRemaining: budget,
        ...initialMetrics,
      });
    }

    steps.forEach((step, i) => {
      cumulativeCost += step.cost || 1;
      data.push({
        step: (initialMetrics ? 1 : 0) + i,
        name: `${i + 1}`,
        operation: step.operation,
        cost: step.cost || 1,
        duration: step.duration || 0,
        cumulativeCost,
        budgetRemaining: budget - cumulativeCost,
        ...(step.metrics || {}),
      });
    });

    // Calculate summary stats
    const stats: Record<string, { 
      start: number; 
      end: number; 
      change: number; 
      min: number; 
      max: number;
      trend: 'improving' | 'degrading' | 'stable';
    }> = {};
    
    metricKeys.forEach(key => {
      const values = data.map(d => d[key]).filter(v => v !== undefined);
      const start = values[0] ?? 0;
      const end = values[values.length - 1] ?? 0;
      const change = end - start;
      const min = Math.min(...values);
      const max = Math.max(...values);
      
      const config = METRIC_CONFIG[key];
      let trend: 'improving' | 'degrading' | 'stable' = 'stable';
      if (Math.abs(change) > 0.01) {
        if (config?.ideal === 'low') {
          trend = change < 0 ? 'improving' : 'degrading';
        } else if (config?.ideal === 'high') {
          trend = change > 0 ? 'improving' : 'degrading';
        } else {
          trend = Math.abs(end - 0.5) < Math.abs(start - 0.5) ? 'improving' : 'degrading';
        }
      }
      
      stats[key] = { start, end, change, min, max, trend };
    });

    // Cost data for bar chart
    const costData = steps.map((step, i) => ({
      name: `${i + 1}`,
      operation: step.operation,
      cost: step.cost || 1,
      duration: step.duration || 0,
    }));

    return { chartData: data, metricKeys, summaryStats: stats, costData };
  }, [steps, initialMetrics, budget]);

  const toggleMetric = (key: string) => {
    setSelectedMetrics(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  if (steps.length === 0) {
    return (
      <Card className="bg-gradient-to-b from-card to-muted/10">
        <CardContent className="py-12 text-center text-muted-foreground">
          <Activity className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No Metrics Data</p>
          <p className="text-sm">Execute steps to see metrics timeline</p>
        </CardContent>
      </Card>
    );
  }

  const totalCost = steps.reduce((sum, s) => sum + (s.cost || 1), 0);
  const totalDuration = steps.reduce((sum, s) => sum + (s.duration || 0), 0);

  return (
    <Card className="bg-gradient-to-b from-card via-card to-muted/10 border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/20 to-cyan-500/20 border border-green-500/30 flex items-center justify-center">
              <Activity className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <CardTitle className="text-sm">Metrics Timeline</CardTitle>
              <p className="text-xs text-muted-foreground">
                {steps.length} steps • {totalCost} cost • {totalDuration.toFixed(1)}ms
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={chartType === 'line' ? 'default' : 'outline'}
              onClick={() => setChartType('line')}
              className="h-7 px-2"
            >
              <LineChartIcon className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant={chartType === 'area' ? 'default' : 'outline'}
              onClick={() => setChartType('area')}
              className="h-7 px-2"
            >
              <Sparkles className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant={chartType === 'bar' ? 'default' : 'outline'}
              onClick={() => setChartType('bar')}
              className="h-7 px-2"
            >
              <BarChart3 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(summaryStats).slice(0, 4).map(([key, stats]) => {
            const config = METRIC_CONFIG[key];
            if (!config) return null;
            
            return (
              <div 
                key={key} 
                className={`p-2 rounded-lg cursor-pointer transition-all ${
                  selectedMetrics.has(key) 
                    ? 'bg-primary/10 border border-primary/30' 
                    : 'bg-muted/20 border border-transparent hover:bg-muted/30'
                }`}
                onClick={() => toggleMetric(key)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{config.label}</span>
                  {stats.trend === 'improving' && <TrendingDown className="w-3 h-3 text-green-400" />}
                  {stats.trend === 'degrading' && <TrendingUp className="w-3 h-3 text-red-400" />}
                </div>
                <div className="text-lg font-bold" style={{ color: config.color }}>
                  {stats.end.toFixed(3)}
                </div>
                <div className={`text-[10px] ${
                  stats.trend === 'improving' ? 'text-green-400' : 
                  stats.trend === 'degrading' ? 'text-red-400' : 
                  'text-muted-foreground'
                }`}>
                  {stats.change >= 0 ? '+' : ''}{stats.change.toFixed(4)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Budget Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              Budget Usage
            </span>
            <span className={totalCost <= budget ? 'text-green-400' : 'text-red-400'}>
              {totalCost} / {budget} ({((totalCost / budget) * 100).toFixed(0)}%)
            </span>
          </div>
          <Progress 
            value={Math.min(100, (totalCost / budget) * 100)} 
            className="h-2"
          />
        </div>

        {/* Main Chart */}
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' ? (
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelFormatter={(label, payload) => {
                    const item = payload?.[0]?.payload;
                    return item ? `Step ${label}: ${item.operation}` : `Step ${label}`;
                  }}
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                {currentStepIndex !== undefined && (
                  <ReferenceLine
                    x={chartData[currentStepIndex + (initialMetrics ? 1 : 0)]?.name}
                    stroke="hsl(var(--primary))"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                  />
                )}
                {metricKeys.filter(k => selectedMetrics.has(k)).map(key => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={METRIC_CONFIG[key]?.label || key}
                    stroke={METRIC_CONFIG[key]?.color || 'hsl(var(--primary))'}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            ) : chartType === 'area' ? (
              <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                {metricKeys.filter(k => selectedMetrics.has(k)).map(key => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={METRIC_CONFIG[key]?.label || key}
                    stroke={METRIC_CONFIG[key]?.color || 'hsl(var(--primary))'}
                    fill={METRIC_CONFIG[key]?.color || 'hsl(var(--primary))'}
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                ))}
              </AreaChart>
            ) : (
              <BarChart data={costData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelFormatter={(label, payload) => {
                    const item = payload?.[0]?.payload;
                    return item ? `Step ${label}: ${item.operation}` : `Step ${label}`;
                  }}
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="cost" name="Cost" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="duration" name="Duration (ms)" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Metric Legend/Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Metrics:</span>
          {metricKeys.map(key => {
            const config = METRIC_CONFIG[key];
            if (!config) return null;
            return (
              <Badge
                key={key}
                variant={selectedMetrics.has(key) ? 'default' : 'outline'}
                className="cursor-pointer text-xs"
                style={{ 
                  backgroundColor: selectedMetrics.has(key) ? config.color + '30' : undefined,
                  borderColor: config.color,
                  color: selectedMetrics.has(key) ? config.color : undefined,
                }}
                onClick={() => toggleMetric(key)}
              >
                {config.label}
              </Badge>
            );
          })}
        </div>

        {/* Step Cost Legend */}
        <ScrollArea className="max-h-20">
          <div className="flex items-center gap-2 flex-wrap">
            {steps.slice(0, 15).map((step, i) => (
              <Badge 
                key={i} 
                variant={i === currentStepIndex ? 'default' : 'outline'}
                className="text-xs shrink-0"
              >
                {step.operation}: <DollarSign className="w-2 h-2 inline" />{step.cost || 1}
              </Badge>
            ))}
            {steps.length > 15 && (
              <span className="text-xs text-muted-foreground">+{steps.length - 15} more</span>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
