/**
 * Cost Timeline - Budget/cost visualization with stacked bars and running total
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DollarSign, TrendingDown, Zap, PieChart } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, ComposedChart, Cell } from 'recharts';

interface CostTimelineProps {
  steps: Array<{
    operation: string;
    cost?: number;
    fullBeforeBits?: string;
    fullAfterBits?: string;
  }>;
  currentStep: number;
  budget: number;
}

export const CostTimeline = ({ steps, currentStep, budget }: CostTimelineProps) => {
  const chartData = useMemo(() => {
    let running = 0;
    return steps.map((step, i) => {
      const cost = step.cost || 1;
      running += cost;
      // Calculate bits changed for efficiency
      let bitsChanged = 0;
      if (step.fullBeforeBits && step.fullAfterBits) {
        for (let j = 0; j < Math.min(step.fullBeforeBits.length, step.fullAfterBits.length); j++) {
          if (step.fullBeforeBits[j] !== step.fullAfterBits[j]) bitsChanged++;
        }
      }
      return {
        step: i + 1,
        cost,
        runningTotal: running,
        remaining: Math.max(0, budget - running),
        bitsChanged,
        efficiency: cost > 0 ? bitsChanged / cost : 0,
        operation: step.operation,
      };
    });
  }, [steps, budget]);

  const totalCost = chartData.length > 0 ? chartData[chartData.length - 1].runningTotal : 0;
  const currentCost = currentStep < chartData.length ? chartData[currentStep].runningTotal : 0;
  const budgetUsedPercent = budget > 0 ? (currentCost / budget) * 100 : 0;

  // Group costs by operation type
  const costByOp = useMemo(() => {
    const map: Record<string, number> = {};
    steps.forEach(s => {
      map[s.operation] = (map[s.operation] || 0) + (s.cost || 1);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [steps]);

  const avgEfficiency = chartData.length > 0
    ? chartData.reduce((s, d) => s + d.efficiency, 0) / chartData.length
    : 0;

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="bg-gradient-to-br from-primary/10 to-transparent">
          <CardContent className="py-3 text-center">
            <div className="text-xl font-bold text-primary">{currentCost}</div>
            <div className="text-[10px] text-muted-foreground">Spent</div>
          </CardContent>
        </Card>
        <Card className={`bg-gradient-to-br ${budgetUsedPercent > 80 ? 'from-destructive/10' : 'from-green-500/10'} to-transparent`}>
          <CardContent className="py-3 text-center">
            <div className={`text-xl font-bold ${budgetUsedPercent > 80 ? 'text-destructive' : 'text-green-500'}`}>
              {Math.max(0, budget - currentCost)}
            </div>
            <div className="text-[10px] text-muted-foreground">Remaining</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <div className="text-xl font-bold">{totalCost}</div>
            <div className="text-[10px] text-muted-foreground">Total Cost</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <div className="text-xl font-bold">{avgEfficiency.toFixed(1)}</div>
            <div className="text-[10px] text-muted-foreground">Bits/Cost</div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Progress */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-muted-foreground">Budget Usage</span>
            <span>{budgetUsedPercent.toFixed(1)}%</span>
          </div>
          <Progress value={Math.min(100, budgetUsedPercent)} className="h-2" />
        </CardContent>
      </Card>

      {/* Cost Chart */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Cost Per Step
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={chartData}>
              <XAxis dataKey="step" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                labelFormatter={(v) => `Step ${v}`}
              />
              <Bar dataKey="cost" name="Step Cost" radius={[2, 2, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={i === currentStep ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.3)'} />
                ))}
              </Bar>
              <Line type="monotone" dataKey="runningTotal" name="Running Total" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cost by Operation */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            Cost by Operation
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2 space-y-1">
          {costByOp.map(([op, cost]) => (
            <div key={op} className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/20">
              <Badge variant="outline" className="font-mono">{op}</Badge>
              <div className="flex items-center gap-2">
                <Progress value={(cost / totalCost) * 100} className="h-1.5 w-24" />
                <span className="w-12 text-right">{cost}</span>
                <span className="text-muted-foreground w-10 text-right">
                  {((cost / totalCost) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
