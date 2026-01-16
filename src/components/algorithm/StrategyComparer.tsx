/**
 * Strategy Comparer - Side-by-side comparison of strategies
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  GitCompare,
  Clock,
  Code,
  Calculator,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Zap,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from 'lucide-react';
import { StrategyConfig, pythonModuleSystem } from '@/lib/pythonModuleSystem';
import { ExecutionResultV2 } from '@/lib/resultsManager';

interface StrategyComparerProps {
  strategies: StrategyConfig[];
  results: ExecutionResultV2[];
}

export const StrategyComparer = ({ strategies, results }: StrategyComparerProps) => {
  const [leftStrategyId, setLeftStrategyId] = useState<string>('');
  const [rightStrategyId, setRightStrategyId] = useState<string>('');

  const leftStrategy = strategies.find(s => s.id === leftStrategyId);
  const rightStrategy = strategies.find(s => s.id === rightStrategyId);

  const leftResults = useMemo(() => 
    results.filter(r => r.strategyId === leftStrategyId),
    [results, leftStrategyId]
  );

  const rightResults = useMemo(() => 
    results.filter(r => r.strategyId === rightStrategyId),
    [results, rightStrategyId]
  );

  const leftStats = useMemo(() => {
    if (leftResults.length === 0) return null;
    const durations = leftResults.map(r => r.duration);
    const costs = leftResults.map(r => r.benchmarks?.totalCost || 0);
    const entropyChanges = leftResults.map(r => 
      (r.finalMetrics?.entropy || 0) - (r.initialMetrics?.entropy || 0)
    );
    return {
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      avgCost: costs.reduce((a, b) => a + b, 0) / costs.length,
      avgEntropyChange: entropyChanges.reduce((a, b) => a + b, 0) / entropyChanges.length,
      successRate: leftResults.filter(r => r.status === 'completed').length / leftResults.length,
      runCount: leftResults.length,
    };
  }, [leftResults]);

  const rightStats = useMemo(() => {
    if (rightResults.length === 0) return null;
    const durations = rightResults.map(r => r.duration);
    const costs = rightResults.map(r => r.benchmarks?.totalCost || 0);
    const entropyChanges = rightResults.map(r => 
      (r.finalMetrics?.entropy || 0) - (r.initialMetrics?.entropy || 0)
    );
    return {
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      avgCost: costs.reduce((a, b) => a + b, 0) / costs.length,
      avgEntropyChange: entropyChanges.reduce((a, b) => a + b, 0) / entropyChanges.length,
      successRate: rightResults.filter(r => r.status === 'completed').length / rightResults.length,
      runCount: rightResults.length,
    };
  }, [rightResults]);

  const renderTrendIcon = (left: number, right: number, higherIsBetter: boolean = true) => {
    if (left === right) return <Minus className="w-4 h-4 text-muted-foreground" />;
    const leftBetter = higherIsBetter ? left > right : left < right;
    return leftBetter 
      ? <TrendingUp className="w-4 h-4 text-green-400" />
      : <TrendingDown className="w-4 h-4 text-red-400" />;
  };

  const renderStrategyCard = (strategy: StrategyConfig | undefined, side: 'left' | 'right') => {
    if (!strategy) {
      return (
        <Card className="flex-1 bg-muted/20 border-dashed border-2">
          <CardContent className="py-12 text-center">
            <GitCompare className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">Select a strategy</p>
          </CardContent>
        </Card>
      );
    }

    const validation = pythonModuleSystem.validateStrategy(strategy.id);
    const stats = side === 'left' ? leftStats : rightStats;

    return (
      <Card className="flex-1 bg-background/50 border-green-400/30">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              {validation.valid ? (
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400" />
              )}
              {strategy.name}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Files */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <Clock className="w-3 h-3 text-purple-400" />
              <span className="text-muted-foreground">Scheduler:</span>
              <Badge variant="outline" className="text-[10px]">{strategy.schedulerFile}</Badge>
            </div>
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <Code className="w-3 h-3 text-blue-400" />
              <span className="text-muted-foreground">Algorithms:</span>
              {strategy.algorithmFiles.length === 0 ? (
                <span className="text-muted-foreground/50">None</span>
              ) : (
                strategy.algorithmFiles.map(f => (
                  <Badge key={f} variant="outline" className="text-[10px]">{f}</Badge>
                ))
              )}
            </div>
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <Calculator className="w-3 h-3 text-yellow-400" />
              <span className="text-muted-foreground">Scoring:</span>
              {strategy.scoringFiles.length === 0 ? (
                <span className="text-muted-foreground/50">None</span>
              ) : (
                strategy.scoringFiles.map(f => (
                  <Badge key={f} variant="outline" className="text-[10px]">{f}</Badge>
                ))
              )}
            </div>
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <Shield className="w-3 h-3 text-green-400" />
              <span className="text-muted-foreground">Policies:</span>
              {strategy.policyFiles.length === 0 ? (
                <span className="text-muted-foreground/50">None</span>
              ) : (
                strategy.policyFiles.map(f => (
                  <Badge key={f} variant="outline" className="text-[10px]">{f}</Badge>
                ))
              )}
            </div>
          </div>

          {/* Stats */}
          {stats ? (
            <div className="pt-3 border-t border-border/50 space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Performance ({stats.runCount} runs)</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded bg-muted/30">
                  <div className="text-[10px] text-muted-foreground">Avg Duration</div>
                  <div className="text-sm font-mono">{stats.avgDuration.toFixed(0)}ms</div>
                </div>
                <div className="p-2 rounded bg-muted/30">
                  <div className="text-[10px] text-muted-foreground">Avg Cost</div>
                  <div className="text-sm font-mono">{stats.avgCost.toFixed(0)}</div>
                </div>
                <div className="p-2 rounded bg-muted/30">
                  <div className="text-[10px] text-muted-foreground">Entropy Δ</div>
                  <div className="text-sm font-mono">{stats.avgEntropyChange.toFixed(4)}</div>
                </div>
                <div className="p-2 rounded bg-muted/30">
                  <div className="text-[10px] text-muted-foreground">Success Rate</div>
                  <div className="text-sm font-mono">{(stats.successRate * 100).toFixed(0)}%</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="pt-3 border-t border-border/50 text-center py-4">
              <BarChart3 className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No execution data</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <Card className="bg-green-950/20 border-green-400/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2 text-green-100">
            <GitCompare className="w-5 h-5 text-green-400" />
            Strategy Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-green-300 mb-1 block">Strategy A</label>
              <Select value={leftStrategyId} onValueChange={setLeftStrategyId}>
                <SelectTrigger className="bg-background/50 border-green-400/30">
                  <SelectValue placeholder="Select strategy..." />
                </SelectTrigger>
                <SelectContent>
                  {strategies.map(s => (
                    <SelectItem key={s.id} value={s.id} disabled={s.id === rightStrategyId}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-green-300 mb-1 block">Strategy B</label>
              <Select value={rightStrategyId} onValueChange={setRightStrategyId}>
                <SelectTrigger className="bg-background/50 border-green-400/30">
                  <SelectValue placeholder="Select strategy..." />
                </SelectTrigger>
                <SelectContent>
                  {strategies.map(s => (
                    <SelectItem key={s.id} value={s.id} disabled={s.id === leftStrategyId}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison View */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {renderStrategyCard(leftStrategy, 'left')}
        
        {/* Comparison Metrics */}
        {leftStats && rightStats && (
          <Card className="w-48 bg-background/50 border-border/50">
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-xs text-center">Comparison</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span>Duration</span>
                {renderTrendIcon(leftStats.avgDuration, rightStats.avgDuration, false)}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>Cost</span>
                {renderTrendIcon(leftStats.avgCost, rightStats.avgCost, false)}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>Entropy Δ</span>
                {renderTrendIcon(leftStats.avgEntropyChange, rightStats.avgEntropyChange, true)}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>Success</span>
                {renderTrendIcon(leftStats.successRate, rightStats.successRate, true)}
              </div>

              <div className="pt-3 border-t text-center">
                <div className="text-[10px] text-muted-foreground mb-1">Winner</div>
                <Badge className="bg-green-500/20 text-green-300 border-green-500/50">
                  {(() => {
                    let leftScore = 0;
                    let rightScore = 0;
                    // Lower duration is better
                    if (leftStats.avgDuration < rightStats.avgDuration) leftScore++;
                    else if (rightStats.avgDuration < leftStats.avgDuration) rightScore++;
                    // Lower cost is better
                    if (leftStats.avgCost < rightStats.avgCost) leftScore++;
                    else if (rightStats.avgCost < leftStats.avgCost) rightScore++;
                    // Higher entropy change is better
                    if (leftStats.avgEntropyChange > rightStats.avgEntropyChange) leftScore++;
                    else if (rightStats.avgEntropyChange > leftStats.avgEntropyChange) rightScore++;
                    // Higher success rate is better
                    if (leftStats.successRate > rightStats.successRate) leftScore++;
                    else if (rightStats.successRate > leftStats.successRate) rightScore++;
                    
                    if (leftScore > rightScore) return leftStrategy?.name || 'A';
                    if (rightScore > leftScore) return rightStrategy?.name || 'B';
                    return 'Tie';
                  })()}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
        
        {renderStrategyCard(rightStrategy, 'right')}
      </div>

      {/* File Differences */}
      {leftStrategy && rightStrategy && (
        <Card className="bg-background/50 border-border/50">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-sm">File Differences</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <ScrollArea className="max-h-32">
              <div className="space-y-1 text-xs">
                {/* Scheduler comparison */}
                {leftStrategy.schedulerFile !== rightStrategy.schedulerFile && (
                  <div className="flex items-center gap-2 p-1 bg-purple-500/10 rounded">
                    <Clock className="w-3 h-3 text-purple-400" />
                    <span>{leftStrategy.schedulerFile}</span>
                    <ArrowRight className="w-3 h-3" />
                    <span>{rightStrategy.schedulerFile}</span>
                  </div>
                )}
                
                {/* Algorithm differences */}
                {(() => {
                  const leftOnly = leftStrategy.algorithmFiles.filter(f => !rightStrategy.algorithmFiles.includes(f));
                  const rightOnly = rightStrategy.algorithmFiles.filter(f => !leftStrategy.algorithmFiles.includes(f));
                  const common = leftStrategy.algorithmFiles.filter(f => rightStrategy.algorithmFiles.includes(f));
                  
                  return (
                    <>
                      {leftOnly.map(f => (
                        <div key={f} className="flex items-center gap-2 p-1 bg-red-500/10 rounded">
                          <Code className="w-3 h-3 text-blue-400" />
                          <span className="text-red-400">- {f}</span>
                          <span className="text-muted-foreground">(only in A)</span>
                        </div>
                      ))}
                      {rightOnly.map(f => (
                        <div key={f} className="flex items-center gap-2 p-1 bg-green-500/10 rounded">
                          <Code className="w-3 h-3 text-blue-400" />
                          <span className="text-green-400">+ {f}</span>
                          <span className="text-muted-foreground">(only in B)</span>
                        </div>
                      ))}
                    </>
                  );
                })()}

                {/* Scoring differences */}
                {(() => {
                  const leftOnly = leftStrategy.scoringFiles.filter(f => !rightStrategy.scoringFiles.includes(f));
                  const rightOnly = rightStrategy.scoringFiles.filter(f => !leftStrategy.scoringFiles.includes(f));
                  
                  return (
                    <>
                      {leftOnly.map(f => (
                        <div key={f} className="flex items-center gap-2 p-1 bg-red-500/10 rounded">
                          <Calculator className="w-3 h-3 text-yellow-400" />
                          <span className="text-red-400">- {f}</span>
                        </div>
                      ))}
                      {rightOnly.map(f => (
                        <div key={f} className="flex items-center gap-2 p-1 bg-green-500/10 rounded">
                          <Calculator className="w-3 h-3 text-yellow-400" />
                          <span className="text-green-400">+ {f}</span>
                        </div>
                      ))}
                    </>
                  );
                })()}

                {leftStrategy.schedulerFile === rightStrategy.schedulerFile &&
                 leftStrategy.algorithmFiles.join(',') === rightStrategy.algorithmFiles.join(',') &&
                 leftStrategy.scoringFiles.join(',') === rightStrategy.scoringFiles.join(',') &&
                 leftStrategy.policyFiles.join(',') === rightStrategy.policyFiles.join(',') && (
                  <div className="text-center py-2 text-muted-foreground">
                    Strategies have identical file configurations
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
