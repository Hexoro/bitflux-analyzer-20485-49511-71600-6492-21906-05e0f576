import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BinaryMetrics } from '@/lib/binaryMetrics';
import { IdealityMetrics } from '@/lib/idealityMetrics';
import type { Partition } from '@/lib/partitionManager';
import { Download, FileDown, Eye, BarChart3 } from 'lucide-react';
import { ChartExporter } from '@/lib/chartExport';
import { useToast } from '@/hooks/use-toast';
import { customPresetsManager, GraphDefinition } from '@/lib/customPresetsManager';
import { ScrollArea } from './ui/scroll-area';

interface DataGraphsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  binaryData: string;
  partitions: Partition[];
}

export const DataGraphsDialog = ({ open, onOpenChange, binaryData, partitions }: DataGraphsDialogProps) => {
  const { toast } = useToast();
  const [showGrid, setShowGrid] = useState(true);
  const [animate, setAnimate] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [idealityStart, setIdealityStart] = useState('0');
  const [idealityEnd, setIdealityEnd] = useState(String(binaryData.length - 1));
  const [activeTab, setActiveTab] = useState<'builtin' | 'custom'>('builtin');
  const [customGraphs, setCustomGraphs] = useState<GraphDefinition[]>([]);
  const [selectedCustomGraph, setSelectedCustomGraph] = useState<GraphDefinition | null>(null);
  const [customGraphData, setCustomGraphData] = useState<any[]>([]);

  // Load custom graphs from manager
  useEffect(() => {
    setCustomGraphs(customPresetsManager.getEnabledGraphs());
    const unsubscribe = customPresetsManager.subscribe(() => {
      setCustomGraphs(customPresetsManager.getEnabledGraphs());
    });
    return unsubscribe;
  }, []);

  // Execute custom graph data function
  const executeGraphDataFn = (graph: GraphDefinition) => {
    try {
      // Extract function body and execute
      const fnBody = graph.dataFn;
      const getDataFn = new Function('bits', `${fnBody}\nreturn getData(bits);`);
      const data = getDataFn(binaryData);
      setCustomGraphData(data || []);
      setSelectedCustomGraph(graph);
    } catch (e) {
      toast({
        title: 'Error',
        description: `Failed to execute graph function: ${(e as Error).message}`,
        variant: 'destructive',
      });
      setCustomGraphData([]);
    }
  };

  // Render custom graph based on type
  const renderCustomGraph = () => {
    if (!selectedCustomGraph || customGraphData.length === 0) return null;
    
    const dataKeys = Object.keys(customGraphData[0] || {}).filter(k => k !== 'position' && k !== 'name' && k !== 'label');
    const xKey = customGraphData[0]?.position !== undefined ? 'position' : 
                 customGraphData[0]?.name !== undefined ? 'name' : 
                 customGraphData[0]?.label !== undefined ? 'label' : 
                 Object.keys(customGraphData[0])[0];
    
    switch (selectedCustomGraph.type) {
      case 'bar':
        return (
          <BarChart data={customGraphData}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />}
            <XAxis dataKey={xKey} stroke="hsl(var(--foreground))" />
            <YAxis stroke="hsl(var(--foreground))" />
            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
            {showLegend && <Legend />}
            {dataKeys.map((key, i) => (
              <Bar key={key} dataKey={key} fill={`hsl(${(i * 60) % 360}, 70%, 50%)`} animationDuration={animate ? 1000 : 0} />
            ))}
          </BarChart>
        );
      case 'line':
        return (
          <LineChart data={customGraphData}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />}
            <XAxis dataKey={xKey} stroke="hsl(var(--foreground))" />
            <YAxis stroke="hsl(var(--foreground))" />
            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
            {showLegend && <Legend />}
            {dataKeys.map((key, i) => (
              <Line key={key} type="monotone" dataKey={key} stroke={`hsl(${(i * 60) % 360}, 70%, 50%)`} strokeWidth={2} dot={false} animationDuration={animate ? 1000 : 0} />
            ))}
          </LineChart>
        );
      case 'area':
        return (
          <AreaChart data={customGraphData}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />}
            <XAxis dataKey={xKey} stroke="hsl(var(--foreground))" />
            <YAxis stroke="hsl(var(--foreground))" />
            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
            {showLegend && <Legend />}
            {dataKeys.map((key, i) => (
              <Area key={key} type="monotone" dataKey={key} stroke={`hsl(${(i * 60) % 360}, 70%, 50%)`} fill={`hsl(${(i * 60) % 360}, 70%, 50%)`} fillOpacity={0.5} animationDuration={animate ? 1000 : 0} />
            ))}
          </AreaChart>
        );
      case 'scatter':
        return (
          <ScatterChart>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />}
            <XAxis dataKey={xKey} stroke="hsl(var(--foreground))" />
            <YAxis dataKey={dataKeys[0]} stroke="hsl(var(--foreground))" />
            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
            <Scatter data={customGraphData} fill="hsl(var(--primary))" animationDuration={animate ? 1000 : 0} />
          </ScatterChart>
        );
      default:
        return (
          <LineChart data={customGraphData}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />}
            <XAxis dataKey={xKey} stroke="hsl(var(--foreground))" />
            <YAxis stroke="hsl(var(--foreground))" />
            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
            {showLegend && <Legend />}
            {dataKeys.map((key, i) => (
              <Line key={key} type="monotone" dataKey={key} stroke={`hsl(${(i * 60) % 360}, 70%, 50%)`} strokeWidth={2} animationDuration={animate ? 1000 : 0} />
            ))}
          </LineChart>
        );
    }
  };

  const stats = useMemo(() => BinaryMetrics.analyze(binaryData), [binaryData]);

  const bitDistribution = [
    { name: 'Zeros', value: stats.zeroCount, percentage: stats.zeroPercent },
    { name: 'Ones', value: stats.oneCount, percentage: stats.onePercent },
  ];

  const entropyOverTime = useMemo(() => {
    const windowSize = Math.max(64, Math.floor(binaryData.length / 100));
    const step = Math.max(32, Math.floor(windowSize / 4));
    const data = [];
    
    for (let i = 0; i < binaryData.length - windowSize; i += step) {
      const window = binaryData.slice(i, i + windowSize);
      const zeros = (window.match(/0/g) || []).length;
      const ones = window.length - zeros;
      const entropy = BinaryMetrics.calculateEntropy(zeros, ones);
      data.push({ 
        position: i, 
        entropy: parseFloat(entropy.toFixed(4)),
        zeroRatio: parseFloat((zeros / window.length).toFixed(4))
      });
    }
    return data;
  }, [binaryData]);

  const byteDistribution = useMemo(() => {
    const byteCounts: { [key: number]: number } = {};
    for (let i = 0; i < Math.min(binaryData.length, 10000); i += 8) {
      const byte = binaryData.slice(i, i + 8).padEnd(8, '0');
      const value = parseInt(byte, 2);
      byteCounts[value] = (byteCounts[value] || 0) + 1;
    }
    
    return Object.entries(byteCounts)
      .map(([value, count]) => ({ 
        value: parseInt(value), 
        count,
        hex: `0x${parseInt(value).toString(16).toUpperCase().padStart(2, '0')}`
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30);
  }, [binaryData]);

  const runLengthAnalysis = useMemo(() => {
    const zeroRuns: number[] = [];
    const oneRuns: number[] = [];
    let currentRun = 1;
    let currentBit = binaryData[0];
    
    for (let i = 1; i < Math.min(binaryData.length, 50000); i++) {
      if (binaryData[i] === currentBit) {
        currentRun++;
      } else {
        if (currentBit === '0') zeroRuns.push(currentRun);
        else oneRuns.push(currentRun);
        currentRun = 1;
        currentBit = binaryData[i];
      }
    }

    const maxLength = Math.max(...zeroRuns, ...oneRuns);
    const data = [];
    for (let len = 1; len <= Math.min(maxLength, 50); len++) {
      data.push({
        length: len,
        zeros: zeroRuns.filter(r => r === len).length,
        ones: oneRuns.filter(r => r === len).length,
      });
    }
    return data;
  }, [binaryData]);

  const partitionComparison = useMemo(() => {
    return partitions.slice(0, 15).map((p, i) => ({
      name: `P${i + 1}`,
      id: i + 1,
      size: p.bits.length,
      zeros: p.stats.zeroCount,
      ones: p.stats.oneCount,
      entropy: parseFloat(p.stats.entropy.toFixed(4)),
      zeroPercent: parseFloat(p.stats.zeroPercent.toFixed(2)),
      onePercent: parseFloat(p.stats.onePercent.toFixed(2)),
    }));
  }, [partitions]);

  const autocorrelation = useMemo(() => {
    const data = [];
    const sampleSize = Math.min(binaryData.length, 1000);
    const sample = binaryData.slice(0, sampleSize);
    
    for (let lag = 0; lag < Math.min(100, sampleSize / 2); lag++) {
      let sum = 0;
      for (let i = 0; i < sampleSize - lag; i++) {
        const val1 = sample[i] === '1' ? 1 : -1;
        const val2 = sample[i + lag] === '1' ? 1 : -1;
        sum += val1 * val2;
      }
      const correlation = sum / (sampleSize - lag);
      data.push({ lag, correlation: parseFloat(correlation.toFixed(4)) });
    }
    return data;
  }, [binaryData]);

  const complexityMetrics = useMemo(() => {
    const windowSize = 256;
    const data = [];
    
    for (let i = 0; i < Math.min(binaryData.length - windowSize, 1000); i += windowSize) {
      const window = binaryData.slice(i, i + windowSize);
      
      // Calculate transitions
      let transitions = 0;
      for (let j = 1; j < window.length; j++) {
        if (window[j] !== window[j - 1]) transitions++;
      }
      
      // Calculate unique patterns
      const patterns = new Set();
      for (let j = 0; j < window.length - 4; j++) {
        patterns.add(window.slice(j, j + 4));
      }
      
      data.push({
        position: i,
        transitions,
        uniquePatterns: patterns.size,
        complexity: parseFloat(((transitions / window.length) * (patterns.size / 16)).toFixed(4))
      });
    }
    return data;
  }, [binaryData]);

  const topIdealityWindows = useMemo(() => {
    const start = Math.max(0, parseInt(idealityStart) || 0);
    const end = Math.min(binaryData.length - 1, parseInt(idealityEnd) || binaryData.length - 1);
    
    if (start >= end || end - start < 4) {
      return [];
    }
    
    return IdealityMetrics.getTopIdealityWindows(binaryData, 10, start, end);
  }, [binaryData, idealityStart, idealityEnd]);

  const exportChart = async (chartId: string, data: any[]) => {
    try {
      const element = document.getElementById(chartId);
      if (!element) {
        toast({ title: 'Error', description: 'Chart not found', variant: 'destructive' });
        return;
      }
      
      // Export as PNG
      await ChartExporter.toPNG(element, `${chartId}.png`);
      toast({ title: 'Success', description: 'Chart exported as PNG' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to export chart', variant: 'destructive' });
    }
  };

  const exportChartData = (chartId: string, data: any[], format: 'csv' | 'json') => {
    try {
      if (format === 'csv') {
        ChartExporter.toCSV(data, `${chartId}.csv`);
      } else {
        ChartExporter.toJSON(data, `${chartId}.json`);
      }
      toast({ title: 'Success', description: `Data exported as ${format.toUpperCase()}` });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to export data', variant: 'destructive' });
    }
  };

  const colors = {
    primary: 'hsl(var(--primary))',
    destructive: 'hsl(var(--destructive))',
    accent: 'hsl(var(--accent))',
    muted: 'hsl(var(--muted-foreground))',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Binary Data Analysis & Visualizations</span>
            {binaryData && binaryData.length > 0 && (
              <div className="flex items-center gap-4 text-sm font-normal">
                <div className="flex items-center gap-2">
                  <Switch id="grid" checked={showGrid} onCheckedChange={setShowGrid} />
                  <Label htmlFor="grid">Grid</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="animate" checked={animate} onCheckedChange={setAnimate} />
                  <Label htmlFor="animate">Animate</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="legend" checked={showLegend} onCheckedChange={setShowLegend} />
                  <Label htmlFor="legend">Legend</Label>
                </div>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        {!binaryData || binaryData.length === 0 ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-lg text-muted-foreground">No binary data available</p>
              <p className="text-sm text-muted-foreground mt-2">Please load or generate data first</p>
            </div>
          </div>
        ) : (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'builtin' | 'custom')}>
          <TabsList className="mb-4">
            <TabsTrigger value="builtin">Built-in Graphs</TabsTrigger>
            <TabsTrigger value="custom" className="flex items-center gap-1">
              <BarChart3 className="w-4 h-4" />
              Custom Graphs ({customGraphs.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="builtin">
        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Total Bits</div>
              <div className="text-2xl font-bold">{stats.totalBits.toLocaleString()}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Entropy</div>
              <div className="text-2xl font-bold">{stats.entropy.toFixed(4)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Mean Run Length</div>
              <div className="text-2xl font-bold">{stats.meanRunLength.toFixed(2)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Balance</div>
              <div className="text-2xl font-bold">{(Math.abs(50 - stats.zeroPercent)).toFixed(2)}%</div>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Bit Distribution */}
            <Card className="p-4" id="bit-distribution-chart">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Bit Distribution</h3>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => exportChart('bit-distribution-chart', bitDistribution)}>
                    <Download className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => exportChartData('bit-distribution', bitDistribution, 'csv')}>
                    <FileDown className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={bitDistribution}>
                  {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />}
                  <XAxis dataKey="name" stroke="hsl(var(--foreground))" />
                  <YAxis stroke="hsl(var(--foreground))" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                    formatter={(value: any, name: string, props: any) => [
                      `${value.toLocaleString()} (${props.payload.percentage.toFixed(2)}%)`,
                      name
                    ]}
                  />
                  {showLegend && <Legend />}
                  <Bar dataKey="value" fill={colors.primary} animationDuration={animate ? 1000 : 0} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Entropy Over Position */}
            <Card className="p-4" id="entropy-chart">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Entropy Analysis (Sliding Window)</h3>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => exportChart('entropy-chart', entropyOverTime)}>
                    <Download className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => exportChartData('entropy', entropyOverTime, 'csv')}>
                    <FileDown className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={entropyOverTime}>
                  {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />}
                  <XAxis dataKey="position" stroke="hsl(var(--foreground))" />
                  <YAxis stroke="hsl(var(--foreground))" domain={[0, 1]} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                  {showLegend && <Legend />}
                  <Area type="monotone" dataKey="entropy" stroke={colors.primary} fill={colors.primary} fillOpacity={0.6} animationDuration={animate ? 1000 : 0} />
                  <Area type="monotone" dataKey="zeroRatio" stroke={colors.destructive} fill={colors.destructive} fillOpacity={0.3} animationDuration={animate ? 1000 : 0} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* Byte Value Distribution */}
            <Card className="p-4" id="byte-distribution-chart">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Top 30 Byte Values (Frequency)</h3>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => exportChart('byte-distribution-chart', byteDistribution)}>
                    <Download className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => exportChartData('byte-distribution', byteDistribution, 'csv')}>
                    <FileDown className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byteDistribution}>
                  {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />}
                  <XAxis dataKey="hex" stroke="hsl(var(--foreground))" angle={-45} textAnchor="end" height={60} />
                  <YAxis stroke="hsl(var(--foreground))" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                    formatter={(value: any, name: string, props: any) => [
                      `${value} occurrences (${props.payload.hex})`,
                      'Count'
                    ]}
                  />
                  <Bar dataKey="count" fill={colors.accent} animationDuration={animate ? 1000 : 0} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Run Length Analysis */}
            <Card className="p-4" id="run-length-chart">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Run Length Distribution</h3>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => exportChart('run-length-chart', runLengthAnalysis)}>
                    <Download className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => exportChartData('run-length', runLengthAnalysis, 'csv')}>
                    <FileDown className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={runLengthAnalysis}>
                  {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />}
                  <XAxis dataKey="length" stroke="hsl(var(--foreground))" label={{ value: 'Run Length', position: 'insideBottom', offset: -5 }} />
                  <YAxis stroke="hsl(var(--foreground))" />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                  {showLegend && <Legend />}
                  <Line type="monotone" dataKey="zeros" stroke={colors.destructive} strokeWidth={2} dot={false} animationDuration={animate ? 1000 : 0} />
                  <Line type="monotone" dataKey="ones" stroke={colors.primary} strokeWidth={2} dot={false} animationDuration={animate ? 1000 : 0} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Autocorrelation */}
            <Card className="p-4" id="autocorrelation-chart">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Autocorrelation (Pattern Detection)</h3>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => exportChart('autocorrelation-chart', autocorrelation)}>
                    <Download className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => exportChartData('autocorrelation', autocorrelation, 'csv')}>
                    <FileDown className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={autocorrelation}>
                  {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />}
                  <XAxis dataKey="lag" stroke="hsl(var(--foreground))" label={{ value: 'Lag', position: 'insideBottom', offset: -5 }} />
                  <YAxis stroke="hsl(var(--foreground))" domain={[-1, 1]} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                  <Line type="monotone" dataKey="correlation" stroke={colors.primary} strokeWidth={2} dot={false} animationDuration={animate ? 1000 : 0} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Complexity Metrics */}
            <Card className="p-4" id="complexity-chart">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Complexity Analysis</h3>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => exportChart('complexity-chart', complexityMetrics)}>
                    <Download className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => exportChartData('complexity', complexityMetrics, 'csv')}>
                    <FileDown className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <ScatterChart>
                  {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />}
                  <XAxis dataKey="transitions" stroke="hsl(var(--foreground))" label={{ value: 'Transitions', position: 'insideBottom', offset: -5 }} />
                  <YAxis dataKey="uniquePatterns" stroke="hsl(var(--foreground))" label={{ value: 'Unique Patterns', angle: -90, position: 'insideLeft' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                    formatter={(value: any, name: string, props: any) => [
                      `${value} (Complexity: ${props.payload.complexity})`,
                      name
                    ]}
                  />
                  <Scatter data={complexityMetrics} fill={colors.primary} animationDuration={animate ? 1000 : 0} />
                </ScatterChart>
              </ResponsiveContainer>
            </Card>

            {/* File Ideality - Top Window Sizes */}
            <Card className="p-4" id="ideality-chart">
              <div className="flex items-center justify-between mb-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold">Top 10 Window Sizes by Ideality</h3>
                  <div className="flex gap-2 items-center">
                    <div className="flex items-center gap-1">
                      <Label htmlFor="ideality-start-graph" className="text-xs">Start:</Label>
                      <Input
                        id="ideality-start-graph"
                        type="number"
                        min="0"
                        max={binaryData.length - 1}
                        value={idealityStart}
                        onChange={(e) => setIdealityStart(e.target.value)}
                        className="font-mono text-xs h-6 w-20"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <Label htmlFor="ideality-end-graph" className="text-xs">End:</Label>
                      <Input
                        id="ideality-end-graph"
                        type="number"
                        min="0"
                        max={binaryData.length - 1}
                        value={idealityEnd}
                        onChange={(e) => setIdealityEnd(e.target.value)}
                        className="font-mono text-xs h-6 w-20"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => exportChart('ideality-chart', topIdealityWindows)}>
                    <Download className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => exportChartData('ideality', topIdealityWindows, 'csv')}>
                    <FileDown className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              {topIdealityWindows.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topIdealityWindows}>
                    {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />}
                    <XAxis 
                      dataKey="windowSize" 
                      stroke="hsl(var(--foreground))" 
                      label={{ value: 'Window Size', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      stroke="hsl(var(--foreground))" 
                      label={{ value: 'Ideality %', angle: -90, position: 'insideLeft' }}
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                      formatter={(value: any, name: string, props: any) => [
                        `${value}% (${props.payload.repeatingCount}/${props.payload.totalBits} bits)`,
                        'Ideality'
                      ]}
                    />
                    <Bar dataKey="idealityPercentage" fill={colors.accent} animationDuration={animate ? 1000 : 0} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
                  Section too small for ideality analysis
                </div>
              )}
            </Card>
          </div>

          {/* Partition Analysis */}
          {partitionComparison.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Partition Analysis</h3>
              
              <div className="grid grid-cols-2 gap-6">
                <Card className="p-4" id="partitions-chart">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold">Partition Sizes & Bit Counts</h3>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => exportChart('partitions-chart', partitionComparison)}>
                        <Download className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => exportChartData('partitions', partitionComparison, 'csv')}>
                        <FileDown className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={partitionComparison}>
                      {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />}
                      <XAxis dataKey="name" stroke="hsl(var(--foreground))" />
                      <YAxis stroke="hsl(var(--foreground))" />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                      {showLegend && <Legend />}
                      <Bar dataKey="zeros" fill={colors.destructive} stackId="bits" animationDuration={animate ? 1000 : 0} />
                      <Bar dataKey="ones" fill={colors.primary} stackId="bits" animationDuration={animate ? 1000 : 0} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                <Card className="p-4" id="partition-entropy-chart">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold">Partition Entropy Comparison</h3>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => exportChart('partition-entropy-chart', partitionComparison)}>
                        <Download className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => exportChartData('partition-entropy', partitionComparison, 'csv')}>
                        <FileDown className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={250}>
                    <RadarChart data={partitionComparison}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="name" stroke="hsl(var(--foreground))" />
                      <PolarRadiusAxis domain={[0, 1]} stroke="hsl(var(--foreground))" />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                      <Radar dataKey="entropy" stroke={colors.primary} fill={colors.primary} fillOpacity={0.6} animationDuration={animate ? 1000 : 0} />
                    </RadarChart>
                  </ResponsiveContainer>
                </Card>
              </div>
            </div>
          )}
          </div>
          </TabsContent>
          
          <TabsContent value="custom">
            <div className="space-y-4">
              {customGraphs.length === 0 ? (
                <Card className="p-8 text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">No custom graphs defined</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add custom graphs in Backend Mode → Graphs tab
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {/* Graph selector sidebar */}
                  <Card className="p-4">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Custom Graphs
                    </h3>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2">
                        {customGraphs.map(graph => (
                          <div
                            key={graph.id}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedCustomGraph?.id === graph.id
                                ? 'bg-primary/10 border-primary'
                                : 'hover:bg-muted/50'
                            }`}
                            onClick={() => executeGraphDataFn(graph)}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{graph.name}</span>
                              <Badge variant="secondary" className="text-xs">
                                {graph.type}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {graph.description}
                            </p>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="mt-2 w-full h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                executeGraphDataFn(graph);
                              }}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View Graph
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </Card>
                  
                  {/* Graph display area */}
                  <Card className="col-span-2 p-4">
                    {selectedCustomGraph ? (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-sm font-semibold">{selectedCustomGraph.name}</h3>
                            <p className="text-xs text-muted-foreground">{selectedCustomGraph.description}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => exportChartData(selectedCustomGraph.id, customGraphData, 'csv')}>
                              <FileDown className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        {customGraphData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={350}>
                            {renderCustomGraph() || <div />}
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                            No data returned from graph function
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <div className="text-center">
                          <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>Select a graph to view</p>
                          <p className="text-sm mt-1">Click on a graph from the list or press View Graph</p>
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};
