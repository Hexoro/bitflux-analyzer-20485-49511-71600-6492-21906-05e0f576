/**
 * Comparison Tab V2 - Comprehensive side-by-side comparison of multiple results
 * Features: Charts, detailed metrics, CSV export, ranking system
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  GitCompare,
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  X,
  BarChart3,
  Download,
  FileSpreadsheet,
  Activity,
  Clock,
  Zap,
  DollarSign,
  Binary,
  Award,
  Medal,
} from 'lucide-react';
import { resultsManager, ExecutionResultV2 } from '@/lib/resultsManager';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

export const ComparisonTab = () => {
  const [results, setResults] = useState<ExecutionResultV2[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setResults(resultsManager.getAllResults());
    const unsubscribe = resultsManager.subscribe(() => {
      setResults(resultsManager.getAllResults());
    });
    return unsubscribe;
  }, []);

  const selectedResults = useMemo(() => {
    return selectedIds.map(id => results.find(r => r.id === id)).filter(Boolean) as ExecutionResultV2[];
  }, [selectedIds, results]);

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else if (selectedIds.length < 6) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  // Color palette for charts
  const colors = ['hsl(180, 100%, 50%)', 'hsl(0, 84%, 60%)', 'hsl(120, 60%, 50%)', 'hsl(280, 80%, 60%)', 'hsl(45, 100%, 50%)', 'hsl(200, 80%, 50%)'];

  // Calculate rankings
  const rankings = useMemo(() => {
    if (selectedResults.length < 2) return {};
    
    const scores: Record<string, number> = {};
    selectedResults.forEach(r => { scores[r.id] = 0; });

    // Duration - lower is better (3 points for best)
    const byDuration = [...selectedResults].sort((a, b) => a.duration - b.duration);
    byDuration.forEach((r, i) => { scores[r.id] += (selectedResults.length - i); });

    // Cost - lower is better
    const byCost = [...selectedResults].sort((a, b) => (a.benchmarks.totalCost || 0) - (b.benchmarks.totalCost || 0));
    byCost.forEach((r, i) => { scores[r.id] += (selectedResults.length - i); });

    // Entropy reduction - more negative is better
    const byEntropy = [...selectedResults].sort((a, b) => {
      const aChange = (a.finalMetrics?.entropy || 0) - (a.initialMetrics?.entropy || 0);
      const bChange = (b.finalMetrics?.entropy || 0) - (b.initialMetrics?.entropy || 0);
      return aChange - bChange;
    });
    byEntropy.forEach((r, i) => { scores[r.id] += (selectedResults.length - i) * 2; }); // Weight entropy more

    // Sort by total score
    const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const result: Record<string, { rank: number; score: number }> = {};
    ranked.forEach(([id, score], i) => {
      result[id] = { rank: i + 1, score };
    });
    return result;
  }, [selectedResults]);

  // Prepare chart data
  const barChartData = useMemo(() => {
    return selectedResults.map((r, i) => ({
      name: r.strategyName.slice(0, 15),
      duration: r.duration,
      cost: r.benchmarks.totalCost || 0,
      operations: r.benchmarks.operationCount || 0,
      fill: colors[i % colors.length],
    }));
  }, [selectedResults]);

  const entropyChartData = useMemo(() => {
    return selectedResults.map((r, i) => ({
      name: r.strategyName.slice(0, 15),
      initial: r.initialMetrics?.entropy || 0,
      final: r.finalMetrics?.entropy || 0,
      change: (r.finalMetrics?.entropy || 0) - (r.initialMetrics?.entropy || 0),
    }));
  }, [selectedResults]);

  const radarData = useMemo(() => {
    if (selectedResults.length < 2) return [];
    
    // Normalize metrics to 0-100 scale
    const maxDuration = Math.max(...selectedResults.map(r => r.duration));
    const maxCost = Math.max(...selectedResults.map(r => r.benchmarks.totalCost || 1));
    const maxOps = Math.max(...selectedResults.map(r => r.benchmarks.operationCount || 1));
    
    return [
      { metric: 'Speed', ...Object.fromEntries(selectedResults.map((r, i) => [r.id, 100 - (r.duration / maxDuration * 100)])) },
      { metric: 'Efficiency', ...Object.fromEntries(selectedResults.map((r, i) => [r.id, 100 - ((r.benchmarks.totalCost || 0) / maxCost * 100)])) },
      { metric: 'Entropy Reduction', ...Object.fromEntries(selectedResults.map((r, i) => [r.id, Math.max(0, (1 - (r.finalMetrics?.entropy || 0)) * 100)])) },
      { metric: 'Simplicity', ...Object.fromEntries(selectedResults.map((r, i) => [r.id, 100 - ((r.benchmarks.operationCount || 0) / maxOps * 100)])) },
    ];
  }, [selectedResults]);

  const handleExportCSV = () => {
    if (selectedResults.length < 2) return;
    
    const headers = ['Metric', ...selectedResults.map(r => r.strategyName)];
    const rows = [
      ['Duration (ms)', ...selectedResults.map(r => r.duration.toFixed(2))],
      ['Total Cost', ...selectedResults.map(r => String(r.benchmarks.totalCost || 0))],
      ['Operations', ...selectedResults.map(r => String(r.benchmarks.operationCount || 0))],
      ['Initial Bits', ...selectedResults.map(r => String(r.initialBits.length))],
      ['Final Bits', ...selectedResults.map(r => String(r.finalBits.length))],
      ['Initial Entropy', ...selectedResults.map(r => (r.initialMetrics?.entropy || 0).toFixed(4))],
      ['Final Entropy', ...selectedResults.map(r => (r.finalMetrics?.entropy || 0).toFixed(4))],
      ['Entropy Change', ...selectedResults.map(r => ((r.finalMetrics?.entropy || 0) - (r.initialMetrics?.entropy || 0)).toFixed(4))],
      ['Status', ...selectedResults.map(r => r.status)],
      ['Ranking Score', ...selectedResults.map(r => String(rankings[r.id]?.score || 0))],
      ['Rank', ...selectedResults.map(r => String(rankings[r.id]?.rank || '-'))],
    ];
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Comparison exported to CSV');
  };

  const getChangeIndicator = (initial: number, final: number) => {
    const change = final - initial;
    if (Math.abs(change) < 0.0001) {
      return <Minus className="w-3 h-3 text-muted-foreground" />;
    }
    if (change < 0) {
      return <TrendingDown className="w-3 h-3 text-green-500" />;
    }
    return <TrendingUp className="w-3 h-3 text-red-500" />;
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-4 h-4 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-4 h-4 text-gray-400" />;
    if (rank === 3) return <Award className="w-4 h-4 text-amber-600" />;
    return <span className="text-xs text-muted-foreground">#{rank}</span>;
  };

  return (
    <div className="h-full flex flex-col gap-3 p-4 overflow-hidden">
      {/* Selection Panel */}
      <Card className="flex-shrink-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitCompare className="w-4 h-4" />
              Select Results to Compare (max 6)
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.length >= 2 && (
                <Button size="sm" variant="outline" onClick={handleExportCSV}>
                  <Download className="w-4 h-4 mr-1" />
                  Export CSV
                </Button>
              )}
              {selectedIds.length > 0 && (
                <Button size="sm" variant="ghost" onClick={handleClearSelection}>
                  <X className="w-4 h-4 mr-1" />
                  Clear ({selectedIds.length})
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-28">
            <div className="space-y-1">
              {results.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No results available. Run strategies to compare them.
                </div>
              ) : (
                results.map((result, idx) => (
                  <div
                    key={result.id}
                    className={`flex items-center gap-3 p-2 rounded hover:bg-muted/30 cursor-pointer transition-colors ${
                      selectedIds.includes(result.id) ? 'bg-primary/10 border border-primary/30' : ''
                    }`}
                    onClick={() => handleToggleSelect(result.id)}
                  >
                    <Checkbox
                      checked={selectedIds.includes(result.id)}
                      onCheckedChange={() => handleToggleSelect(result.id)}
                    />
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: colors[idx % colors.length] }} 
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate">{result.strategyName}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {new Date(result.startTime).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className="text-xs">{result.duration.toFixed(0)}ms</Badge>
                      <Badge variant="secondary" className="text-xs">{result.benchmarks.operationCount} ops</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Comparison Content */}
      {selectedResults.length >= 2 ? (
        <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="flex-shrink-0">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="table">Detailed Table</TabsTrigger>
            <TabsTrigger value="charts">Charts</TabsTrigger>
            <TabsTrigger value="radar">Radar</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="flex-1 overflow-auto mt-3">
            <div className="grid grid-cols-3 gap-3">
              {/* Rankings */}
              <Card className="col-span-3">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    Overall Rankings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 flex-wrap">
                    {selectedResults
                      .sort((a, b) => (rankings[a.id]?.rank || 99) - (rankings[b.id]?.rank || 99))
                      .map((result, i) => (
                        <div 
                          key={result.id} 
                          className={`flex items-center gap-2 p-2 rounded border ${
                            rankings[result.id]?.rank === 1 ? 'bg-yellow-500/10 border-yellow-500/30' :
                            rankings[result.id]?.rank === 2 ? 'bg-gray-500/10 border-gray-500/30' :
                            rankings[result.id]?.rank === 3 ? 'bg-amber-500/10 border-amber-500/30' :
                            'bg-muted/30 border-border'
                          }`}
                        >
                          {getRankIcon(rankings[result.id]?.rank || 99)}
                          <div>
                            <div className="text-sm font-medium">{result.strategyName}</div>
                            <div className="text-xs text-muted-foreground">
                              Score: {rankings[result.id]?.score || 0}
                            </div>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats Cards */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Clock className="w-4 h-4" />
                    Fastest
                  </div>
                  <div className="text-lg font-bold">
                    {Math.min(...selectedResults.map(r => r.duration)).toFixed(0)}ms
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedResults.find(r => r.duration === Math.min(...selectedResults.map(r => r.duration)))?.strategyName}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <DollarSign className="w-4 h-4" />
                    Cheapest
                  </div>
                  <div className="text-lg font-bold">
                    {Math.min(...selectedResults.map(r => r.benchmarks.totalCost || 0))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedResults.find(r => (r.benchmarks.totalCost || 0) === Math.min(...selectedResults.map(r => r.benchmarks.totalCost || 0)))?.strategyName}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Activity className="w-4 h-4" />
                    Best Entropy
                  </div>
                  <div className="text-lg font-bold">
                    {Math.min(...selectedResults.map(r => r.finalMetrics?.entropy || 1)).toFixed(4)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedResults.find(r => (r.finalMetrics?.entropy || 1) === Math.min(...selectedResults.map(r => r.finalMetrics?.entropy || 1)))?.strategyName}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Detailed Table Tab */}
          <TabsContent value="table" className="flex-1 overflow-auto mt-3">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-40">Metric</TableHead>
                      {selectedResults.map((result, i) => (
                        <TableHead key={result.id} className="text-center">
                          <div className="flex flex-col items-center">
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                              <span className="font-medium text-xs">{result.strategyName.slice(0, 12)}</span>
                            </div>
                            {getRankIcon(rankings[result.id]?.rank || 99)}
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Duration</TableCell>
                      {selectedResults.map(result => (
                        <TableCell key={result.id} className="text-center">{result.duration.toFixed(0)}ms</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Total Cost</TableCell>
                      {selectedResults.map(result => (
                        <TableCell key={result.id} className="text-center">{result.benchmarks.totalCost || 0}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Operations</TableCell>
                      {selectedResults.map(result => (
                        <TableCell key={result.id} className="text-center">{result.benchmarks.operationCount}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Initial Size</TableCell>
                      {selectedResults.map(result => (
                        <TableCell key={result.id} className="text-center">{result.initialBits.length}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Final Size</TableCell>
                      {selectedResults.map(result => (
                        <TableCell key={result.id} className="text-center">{result.finalBits.length}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Initial Entropy</TableCell>
                      {selectedResults.map(result => (
                        <TableCell key={result.id} className="text-center">{(result.initialMetrics?.entropy || 0).toFixed(4)}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Final Entropy</TableCell>
                      {selectedResults.map(result => (
                        <TableCell key={result.id} className="text-center">{(result.finalMetrics?.entropy || 0).toFixed(4)}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Entropy Change</TableCell>
                      {selectedResults.map(result => {
                        const change = (result.finalMetrics?.entropy || 0) - (result.initialMetrics?.entropy || 0);
                        return (
                          <TableCell key={result.id} className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              {getChangeIndicator(result.initialMetrics?.entropy || 0, result.finalMetrics?.entropy || 0)}
                              <span className={change < 0 ? 'text-green-500' : change > 0 ? 'text-red-500' : ''}>
                                {change >= 0 ? '+' : ''}{change.toFixed(4)}
                              </span>
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Ranking Score</TableCell>
                      {selectedResults.map(result => (
                        <TableCell key={result.id} className="text-center font-bold">{rankings[result.id]?.score || 0}</TableCell>
                      ))}
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Charts Tab */}
          <TabsContent value="charts" className="flex-1 overflow-auto mt-3">
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Duration & Cost</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={barChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Bar dataKey="duration" fill="hsl(180, 100%, 50%)" name="Duration (ms)" />
                      <Bar dataKey="cost" fill="hsl(0, 84%, 60%)" name="Cost" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Entropy Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={entropyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Bar dataKey="initial" fill="hsl(var(--muted))" name="Initial" />
                      <Bar dataKey="final" fill="hsl(120, 60%, 50%)" name="Final" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Radar Tab */}
          <TabsContent value="radar" className="flex-1 overflow-auto mt-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Performance Radar</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" />
                    {selectedResults.map((result, i) => (
                      <Radar
                        key={result.id}
                        name={result.strategyName}
                        dataKey={result.id}
                        stroke={colors[i % colors.length]}
                        fill={colors[i % colors.length]}
                        fillOpacity={0.2}
                      />
                    ))}
                    <Legend />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <GitCompare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Select at least 2 results to compare</p>
            <p className="text-sm mt-1">Click on results above to select them</p>
            <p className="text-xs mt-4 max-w-md">
              The comparison view shows rankings, detailed metrics tables, 
              bar charts, and radar charts to help you understand which 
              strategies perform best.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};
