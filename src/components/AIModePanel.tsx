/**
 * AI Mode Panel - Train models from execution history, visualize, export as JS strategies
 * Features: dataset visualization, operation frequency charts, metric delta heatmap,
 * model comparison, weight distribution, and JS strategy export
 */
import { useState, useCallback, useMemo } from 'react';
import { Brain, Database, Download, Trash2, BarChart3, Zap, FileCode, RefreshCw, TrendingUp, Activity, Target, Layers, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ScatterChart, Scatter, ZAxis, Tooltip as RechartsTooltip, Legend,
  LineChart, Line, Area, AreaChart,
} from 'recharts';
import {
  buildTrainingDataset, trainHeuristicModel, trainBanditModel,
  selectOperations, exportModelAsJSStrategy,
  saveModel, loadModels, deleteModel, saveDataset, loadDataset,
  type TrainingDataset, type HeuristicModel, type BanditModel,
} from '@/lib/aiTrainingPipeline';
import { pythonModuleSystem } from '@/lib/pythonModuleSystem';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(210, 70%, 55%)',
  'hsl(150, 60%, 45%)',
  'hsl(340, 65%, 50%)',
  'hsl(45, 80%, 50%)',
  'hsl(280, 55%, 55%)',
  'hsl(20, 75%, 50%)',
  'hsl(170, 60%, 40%)',
  'hsl(0, 65%, 50%)',
];

export const AIModePanel = () => {
  const [dataset, setDataset] = useState<TrainingDataset | null>(() => loadDataset());
  const [models, setModels] = useState<(HeuristicModel | BanditModel)[]>(() => loadModels());
  const [selectedObjective, setSelectedObjective] = useState<HeuristicModel['objective']>('maximize_entropy');
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [isTraining, setIsTraining] = useState(false);
  const [dataSubTab, setDataSubTab] = useState<'overview' | 'operations' | 'metrics' | 'scatter'>('overview');

  // ============ DATASET VISUALIZATIONS ============

  const opFrequencyData = useMemo(() => {
    if (!dataset) return [];
    const counts: Record<string, number> = {};
    dataset.examples.forEach(ex => { counts[ex.operation] = (counts[ex.operation] || 0) + 1; });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([op, count]) => ({ operation: op, count, pct: ((count / dataset.examples.length) * 100).toFixed(1) }));
  }, [dataset]);

  const metricDeltaData = useMemo(() => {
    if (!dataset) return [];
    const byOp: Record<string, { entropy: number[]; balance: number[]; compression: number[] }> = {};
    dataset.examples.forEach(ex => {
      if (!byOp[ex.operation]) byOp[ex.operation] = { entropy: [], balance: [], compression: [] };
      byOp[ex.operation].entropy.push(ex.entropyDelta);
      byOp[ex.operation].balance.push(ex.balanceDelta);
      byOp[ex.operation].compression.push(ex.compressionDelta);
    });
    return Object.entries(byOp)
      .map(([op, deltas]) => ({
        operation: op,
        avgEntropy: deltas.entropy.length ? deltas.entropy.reduce((a, b) => a + b, 0) / deltas.entropy.length : 0,
        avgBalance: deltas.balance.length ? deltas.balance.reduce((a, b) => a + b, 0) / deltas.balance.length : 0,
        avgCompression: deltas.compression.length ? deltas.compression.reduce((a, b) => a + b, 0) / deltas.compression.length : 0,
        count: deltas.entropy.length,
      }))
      .sort((a, b) => Math.abs(b.avgEntropy) - Math.abs(a.avgEntropy))
      .slice(0, 12);
  }, [dataset]);

  const scatterData = useMemo(() => {
    if (!dataset) return [];
    return dataset.examples.slice(0, 200).map((ex, i) => ({
      x: ex.entropy,
      y: ex.entropyDelta,
      z: Math.max(1, ex.bitsChanged / 10),
      operation: ex.operation,
      cost: ex.operationCost,
    }));
  }, [dataset]);

  const segmentPieData = useMemo(() => {
    if (!dataset) return [];
    const seg = dataset.examples.filter(e => e.isSegmentOnly).length;
    const full = dataset.examples.length - seg;
    return [
      { name: 'Full File', value: full },
      { name: 'Segment Only', value: seg },
    ];
  }, [dataset]);

  const costDistData = useMemo(() => {
    if (!dataset) return [];
    const byCost: Record<number, number> = {};
    dataset.examples.forEach(ex => { byCost[ex.operationCost] = (byCost[ex.operationCost] || 0) + 1; });
    return Object.entries(byCost)
      .map(([cost, count]) => ({ cost: Number(cost), count }))
      .sort((a, b) => a.cost - b.cost);
  }, [dataset]);

  // ============ MODEL VISUALIZATIONS ============

  const modelWeightsData = useMemo(() => {
    const m = models.find(m => m.name === selectedModel);
    if (!m) return [];
    if (m.type === 'heuristic') {
      return Object.entries(m.weights)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([op, weight]) => ({ operation: op, weight, absWeight: Math.abs(weight) }));
    }
    return Object.entries(m.arms)
      .sort((a, b) => (b[1].avgReward + b[1].ucbBonus) - (a[1].avgReward + a[1].ucbBonus))
      .slice(0, 12)
      .map(([op, arm]) => ({
        operation: op,
        weight: arm.avgReward,
        absWeight: arm.avgReward + arm.ucbBonus,
        pulls: arm.pulls,
        ucb: arm.ucbBonus,
      }));
  }, [models, selectedModel]);

  const radarData = useMemo(() => {
    const m = models.find(m => m.name === selectedModel);
    if (!m) return [];
    const topOps = selectOperations(m, 6);
    return topOps.map(op => ({
      operation: op.op,
      score: Math.max(0, op.score * 100),
      weight: Math.max(0, op.weight * 100),
    }));
  }, [models, selectedModel]);

  // ============ HANDLERS ============

  const handleBuildDataset = useCallback(() => {
    const ds = buildTrainingDataset();
    setDataset(ds);
    saveDataset(ds);
    toast.success(`Dataset built: ${ds.examples.length} examples from ${ds.metadata.totalResults} results`);
  }, []);

  const handleTrainHeuristic = useCallback(() => {
    if (!dataset || dataset.examples.length === 0) { toast.error('Build dataset first'); return; }
    setIsTraining(true);
    setTimeout(() => {
      const model = trainHeuristicModel(dataset, selectedObjective, `Heuristic-${selectedObjective}`);
      saveModel(model);
      setModels(loadModels());
      setIsTraining(false);
      toast.success(`Heuristic model trained on ${model.trainingExamples} examples`);
    }, 100);
  }, [dataset, selectedObjective]);

  const handleTrainBandit = useCallback(() => {
    if (!dataset || dataset.examples.length === 0) { toast.error('Build dataset first'); return; }
    setIsTraining(true);
    setTimeout(() => {
      const model = trainBanditModel(dataset, selectedObjective, `Bandit-UCB1-${selectedObjective}`);
      saveModel(model);
      setModels(loadModels());
      setIsTraining(false);
      toast.success(`Bandit model trained on ${model.trainingExamples} examples`);
    }, 100);
  }, [dataset, selectedObjective]);

  const handleExportJS = useCallback((modelName: string) => {
    const model = models.find(m => m.name === modelName);
    if (!model) return;
    const jsCode = exportModelAsJSStrategy(model);
    const fileName = `ai_strategy_${model.name.replace(/[^a-zA-Z0-9_]/g, '_')}.js`;
    try { pythonModuleSystem.addFile(fileName, jsCode, 'custom'); } catch { /* may already exist */ }
    const blob = new Blob([jsCode], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${fileName} — added to Files tab and downloaded`);
  }, [models]);

  const handleDeleteModel = useCallback((name: string) => {
    deleteModel(name);
    setModels(loadModels());
    if (selectedModel === name) setSelectedModel(null);
    toast.info(`Deleted model: ${name}`);
  }, [selectedModel]);

  const handleExportDataset = useCallback(() => {
    if (!dataset) return;
    const blob = new Blob([JSON.stringify(dataset, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ai-training-dataset-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Dataset exported');
  }, [dataset]);

  const activeModel = models.find(m => m.name === selectedModel) || null;
  const topOps = activeModel ? selectOperations(activeModel, 10) : [];

  return (
    <div className="h-full flex flex-col bg-background">
      <Tabs defaultValue="data" className="flex-1 flex flex-col">
        <div className="border-b border-border px-3 py-1.5 flex items-center justify-between">
          <TabsList className="h-8">
            <TabsTrigger value="data" className="text-xs gap-1"><Database className="w-3 h-3" />Data</TabsTrigger>
            <TabsTrigger value="train" className="text-xs gap-1"><Brain className="w-3 h-3" />Train</TabsTrigger>
            <TabsTrigger value="models" className="text-xs gap-1"><BarChart3 className="w-3 h-3" />Models</TabsTrigger>
            <TabsTrigger value="export" className="text-xs gap-1"><FileCode className="w-3 h-3" />Export</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-1.5">
            {dataset && <Badge variant="outline" className="text-[10px]">{dataset.examples.length} examples</Badge>}
            <Badge variant="secondary" className="text-[10px]">{models.length} models</Badge>
          </div>
        </div>

        <ScrollArea className="flex-1">
          {/* =================== DATA TAB =================== */}
          <TabsContent value="data" className="p-3 space-y-3 m-0">
            <div className="flex gap-2">
              <Button onClick={handleBuildDataset} size="sm" className="flex-1 gap-1">
                <RefreshCw className="w-3 h-3" />Build Dataset from Results
              </Button>
              {dataset && (
                <Button onClick={handleExportDataset} size="sm" variant="outline" className="gap-1">
                  <Download className="w-3 h-3" />Export
                </Button>
              )}
            </div>

            {!dataset ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Database className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No dataset built yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Run some strategies first, then build a dataset from execution results.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Stats row */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Examples', value: dataset.examples.length, icon: Layers },
                    { label: 'Results', value: dataset.metadata.totalResults, icon: Database },
                    { label: 'Operations', value: dataset.metadata.operations.length, icon: Activity },
                    { label: 'Avg Size', value: `${dataset.metadata.fileStats.avgSize.toFixed(0)}b`, icon: Target },
                  ].map(stat => (
                    <div key={stat.label} className="p-2 rounded-lg bg-muted/30 border border-border text-center">
                      <stat.icon className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-1" />
                      <p className="text-sm font-semibold text-foreground">{stat.value}</p>
                      <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Sub-tabs for data views */}
                <div className="flex gap-1 border-b border-border pb-1">
                  {(['overview', 'operations', 'metrics', 'scatter'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setDataSubTab(tab)}
                      className={`px-2 py-1 text-[10px] rounded-md transition-colors ${
                        dataSubTab === tab
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Overview: pie charts */}
                {dataSubTab === 'overview' && (
                  <div className="grid grid-cols-2 gap-3">
                    <Card>
                      <CardHeader className="py-2 px-3"><CardTitle className="text-[11px]">Operation Type Split</CardTitle></CardHeader>
                      <CardContent className="px-3 pb-2">
                        <ResponsiveContainer width="100%" height={140}>
                          <PieChart>
                            <Pie data={segmentPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={55} strokeWidth={1}>
                              {segmentPieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                            </Pie>
                            <RechartsTooltip contentStyle={{ fontSize: 10, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                            <Legend wrapperStyle={{ fontSize: 10 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="py-2 px-3"><CardTitle className="text-[11px]">Cost Distribution</CardTitle></CardHeader>
                      <CardContent className="px-3 pb-2">
                        <ResponsiveContainer width="100%" height={140}>
                          <BarChart data={costDistData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="cost" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                            <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                            <RechartsTooltip contentStyle={{ fontSize: 10, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Operations frequency */}
                {dataSubTab === 'operations' && (
                  <Card>
                    <CardHeader className="py-2 px-3"><CardTitle className="text-[11px]">Operation Frequency (Top 15)</CardTitle></CardHeader>
                    <CardContent className="px-3 pb-2">
                      <ResponsiveContainer width="100%" height={Math.max(200, opFrequencyData.length * 22)}>
                        <BarChart data={opFrequencyData} layout="vertical" margin={{ left: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis type="number" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis type="category" dataKey="operation" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" width={55} />
                          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 2, 2, 0]} />
                          <RechartsTooltip
                            contentStyle={{ fontSize: 10, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                            formatter={(value: number, name: string, props: any) => [`${value} (${props.payload.pct}%)`, 'Count']}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Metrics deltas */}
                {dataSubTab === 'metrics' && (
                  <Card>
                    <CardHeader className="py-2 px-3"><CardTitle className="text-[11px]">Average Metric Deltas by Operation</CardTitle></CardHeader>
                    <CardContent className="px-3 pb-2">
                      <ResponsiveContainer width="100%" height={Math.max(200, metricDeltaData.length * 24)}>
                        <BarChart data={metricDeltaData} layout="vertical" margin={{ left: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis type="number" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis type="category" dataKey="operation" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" width={55} />
                          <Bar dataKey="avgEntropy" name="Entropy Δ" fill={CHART_COLORS[0]} />
                          <Bar dataKey="avgBalance" name="Balance Δ" fill={CHART_COLORS[2]} />
                          <Bar dataKey="avgCompression" name="Compress Δ" fill={CHART_COLORS[3]} />
                          <RechartsTooltip contentStyle={{ fontSize: 10, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Scatter plot */}
                {dataSubTab === 'scatter' && (
                  <Card>
                    <CardHeader className="py-2 px-3"><CardTitle className="text-[11px]">Entropy vs Entropy Delta (bubble = bits changed)</CardTitle></CardHeader>
                    <CardContent className="px-3 pb-2">
                      <ResponsiveContainer width="100%" height={250}>
                        <ScatterChart margin={{ left: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="x" name="Entropy" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis dataKey="y" name="Entropy Δ" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                          <ZAxis dataKey="z" range={[20, 200]} />
                          <Scatter data={scatterData} fill="hsl(var(--primary))" fillOpacity={0.6} />
                          <RechartsTooltip
                            contentStyle={{ fontSize: 10, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                            formatter={(value: number, name: string) => [value.toFixed(4), name]}
                          />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* =================== TRAIN TAB =================== */}
          <TabsContent value="train" className="p-3 space-y-3 m-0">
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />Training Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 space-y-3">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Optimization Objective</label>
                  <Select value={selectedObjective} onValueChange={(v: any) => setSelectedObjective(v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="maximize_entropy">Maximize Entropy</SelectItem>
                      <SelectItem value="minimize_entropy">Minimize Entropy</SelectItem>
                      <SelectItem value="maximize_balance">Maximize Balance (→0.5)</SelectItem>
                      <SelectItem value="minimize_cost">Minimize Cost (efficiency)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Card className="bg-muted/20">
                    <CardContent className="p-3 text-center">
                      <Zap className="w-5 h-5 text-primary mx-auto mb-1" />
                      <p className="text-[11px] font-medium text-foreground">Heuristic Scorer</p>
                      <p className="text-[9px] text-muted-foreground mb-2">Average metric delta per operation. Fast, deterministic.</p>
                      <Button onClick={handleTrainHeuristic} size="sm" disabled={isTraining || !dataset} className="w-full h-7 text-xs">
                        {isTraining ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Train'}
                      </Button>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/20">
                    <CardContent className="p-3 text-center">
                      <Brain className="w-5 h-5 text-primary mx-auto mb-1" />
                      <p className="text-[11px] font-medium text-foreground">UCB1 Bandit</p>
                      <p className="text-[9px] text-muted-foreground mb-2">Explore/exploit balance with upper confidence bound.</p>
                      <Button onClick={handleTrainBandit} size="sm" disabled={isTraining || !dataset} className="w-full h-7 text-xs">
                        {isTraining ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Train'}
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {!dataset && (
                  <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
                    <p className="text-xs text-muted-foreground">Build a dataset first in the Data tab to enable training.</p>
                  </div>
                )}

                {dataset && dataset.examples.length > 0 && (
                  <div className="p-2 rounded bg-muted/20 border border-border text-[10px] text-muted-foreground">
                    Dataset ready: {dataset.examples.length} examples, {dataset.metadata.operations.length} unique operations
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* =================== MODELS TAB =================== */}
          <TabsContent value="models" className="p-3 space-y-3 m-0">
            {models.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Brain className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No models trained yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Go to Train tab to create your first model.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <Select value={selectedModel || ''} onValueChange={setSelectedModel}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select a model to inspect" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map(m => (
                      <SelectItem key={m.name} value={m.name}>
                        {m.name} ({m.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {activeModel && (
                  <>
                    {/* Model info card */}
                    <Card>
                      <CardHeader className="py-2 px-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          {activeModel.type === 'heuristic' ? <Zap className="w-4 h-4 text-primary" /> : <Brain className="w-4 h-4 text-primary" />}
                          {activeModel.name}
                          <Badge variant="outline" className="text-[10px] ml-auto">{activeModel.type}</Badge>
                          <Badge variant="secondary" className="text-[10px]">{activeModel.objective.replace('_', ' ')}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-3 pb-2 space-y-1">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-muted-foreground">Training examples</span>
                          <span className="font-medium text-foreground">{activeModel.trainingExamples}</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-muted-foreground">Trained at</span>
                          <span className="font-mono text-foreground">{new Date(activeModel.timestamp).toLocaleString()}</span>
                        </div>
                        {activeModel.type === 'bandit' && (
                          <div className="flex justify-between text-[10px]">
                            <span className="text-muted-foreground">Total pulls</span>
                            <span className="font-medium text-foreground">{activeModel.totalPulls}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Weight distribution chart */}
                    <Card>
                      <CardHeader className="py-2 px-3"><CardTitle className="text-[11px]">Operation Weights (Top 12)</CardTitle></CardHeader>
                      <CardContent className="px-3 pb-2">
                        <ResponsiveContainer width="100%" height={Math.max(180, modelWeightsData.length * 20)}>
                          <BarChart data={modelWeightsData} layout="vertical" margin={{ left: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis type="number" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                            <YAxis type="category" dataKey="operation" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" width={55} />
                            <Bar dataKey="weight" fill="hsl(var(--primary))" radius={[0, 2, 2, 0]} />
                            <RechartsTooltip contentStyle={{ fontSize: 10, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Radar chart for top ops */}
                    {radarData.length >= 3 && (
                      <Card>
                        <CardHeader className="py-2 px-3"><CardTitle className="text-[11px]">Top Operations Radar</CardTitle></CardHeader>
                        <CardContent className="px-3 pb-2">
                          <ResponsiveContainer width="100%" height={200}>
                            <RadarChart data={radarData}>
                              <PolarGrid stroke="hsl(var(--border))" />
                              <PolarAngleAxis dataKey="operation" tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" />
                              <PolarRadiusAxis tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" />
                              <Radar name="Score" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    )}

                    {/* Top ops list */}
                    <Card>
                      <CardHeader className="py-2 px-3"><CardTitle className="text-[11px]">Recommended Sequence (Top 10)</CardTitle></CardHeader>
                      <CardContent className="px-3 pb-2 space-y-1">
                        {topOps.map((op, i) => {
                          const maxScore = topOps[0]?.score || 1;
                          const pct = maxScore !== 0 ? Math.max(0, Math.min(100, (op.score / maxScore) * 100)) : 0;
                          return (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <span className="w-4 text-[10px] text-muted-foreground">{i + 1}</span>
                              <span className="font-mono w-16 truncate text-foreground">{op.op}</span>
                              <div className="flex-1">
                                <Progress value={pct} className="h-1.5" />
                              </div>
                              <span className="w-14 text-right text-[10px] text-muted-foreground">{op.score.toFixed(4)}</span>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="gap-1 flex-1" onClick={() => handleExportJS(activeModel.name)}>
                        <Download className="w-3 h-3" />Export as JS Strategy
                      </Button>
                      <Button size="sm" variant="destructive" className="gap-1" onClick={() => handleDeleteModel(activeModel.name)}>
                        <Trash2 className="w-3 h-3" />Delete
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
          </TabsContent>

          {/* =================== EXPORT TAB =================== */}
          <TabsContent value="export" className="p-3 space-y-3 m-0">
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-primary" />Export as JS Strategy
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 space-y-2">
                <p className="text-xs text-muted-foreground">Export a trained model as a runnable JavaScript strategy file. The file uses the sandboxed <code className="text-foreground font-mono text-[10px]">api</code> bridge — same interface as Python strategies.</p>

                {models.length === 0 ? (
                  <div className="p-4 rounded-lg bg-muted/30 border border-border text-center">
                    <p className="text-xs text-muted-foreground">Train a model first.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {models.map(m => (
                      <div key={m.name} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-medium text-foreground truncate">{m.name}</p>
                            <Badge variant="outline" className="text-[9px] shrink-0">{m.type}</Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground">{m.objective.replace('_', ' ')} · {m.trainingExamples} examples</p>
                        </div>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 ml-2 shrink-0" onClick={() => handleExportJS(m.name)}>
                          <FileCode className="w-3 h-3" />Export .js
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Eye className="w-4 h-4 text-muted-foreground" />JS Runtime API Reference
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="space-y-1.5 text-[10px] font-mono">
                  {[
                    ['api.apply_operation(op, bits, params)', 'Execute operation on bits'],
                    ['api.apply_operation_range(op, start, end)', 'Execute on bit range'],
                    ['api.get_metric(name, bits?)', 'Get single metric value'],
                    ['api.get_all_metrics(bits?)', 'Get all metrics as object'],
                    ['api.get_cost(op)', 'Get operation cost'],
                    ['api.get_budget()', 'Get remaining budget'],
                    ['api.get_bits()', 'Get current bit string'],
                    ['api.set_bits(newBits)', 'Replace current bits'],
                    ['api.log(msg)', 'Log message to output'],
                    ['api.get_available_operations()', 'List all operations'],
                  ].map(([fn, desc]) => (
                    <div key={fn} className="flex items-start gap-2 py-0.5">
                      <code className="text-primary shrink-0">{fn}</code>
                      <span className="text-muted-foreground">{desc}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};
