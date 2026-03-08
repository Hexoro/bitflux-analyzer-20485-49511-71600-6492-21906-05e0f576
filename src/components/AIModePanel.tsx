/**
 * AI Mode Panel - Train models from execution history, export as JS strategies
 */
import { useState, useCallback } from 'react';
import { Brain, Database, Play, Download, Trash2, BarChart3, Zap, FileCode } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  buildTrainingDataset, trainHeuristicModel, trainBanditModel,
  selectOperations, exportModelAsJSStrategy,
  saveModel, loadModels, deleteModel, saveDataset, loadDataset,
  type TrainingDataset, type HeuristicModel, type BanditModel,
} from '@/lib/aiTrainingPipeline';
import { pythonModuleSystem } from '@/lib/pythonModuleSystem';

export const AIModePanel = () => {
  const [dataset, setDataset] = useState<TrainingDataset | null>(() => loadDataset());
  const [models, setModels] = useState<(HeuristicModel | BanditModel)[]>(() => loadModels());
  const [selectedObjective, setSelectedObjective] = useState<HeuristicModel['objective']>('maximize_entropy');
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [isTraining, setIsTraining] = useState(false);

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
    // Save as a file in the module system
    const fileName = `ai_strategy_${model.name.replace(/\s+/g, '_')}.js`;
    pythonModuleSystem.createFile(fileName, jsCode, 'custom');
    // Also download
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
    toast.info(`Deleted model: ${name}`);
  }, []);

  const activeModel = models.find(m => m.name === selectedModel) || null;
  const topOps = activeModel ? selectOperations(activeModel, 10) : [];

  return (
    <div className="h-full flex flex-col bg-background">
      <Tabs defaultValue="data" className="flex-1 flex flex-col">
        <div className="border-b border-border px-3 py-1">
          <TabsList className="h-8">
            <TabsTrigger value="data" className="text-xs gap-1"><Database className="w-3 h-3" />Data</TabsTrigger>
            <TabsTrigger value="train" className="text-xs gap-1"><Brain className="w-3 h-3" />Train</TabsTrigger>
            <TabsTrigger value="models" className="text-xs gap-1"><BarChart3 className="w-3 h-3" />Models</TabsTrigger>
            <TabsTrigger value="export" className="text-xs gap-1"><FileCode className="w-3 h-3" />Export</TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          {/* DATA TAB */}
          <TabsContent value="data" className="p-3 space-y-3 m-0">
            <Card>
              <CardHeader className="py-3 px-4"><CardTitle className="text-sm">Training Dataset</CardTitle></CardHeader>
              <CardContent className="px-4 pb-3 space-y-2">
                <p className="text-xs text-muted-foreground">Build a dataset from all stored execution results. Each operation step becomes a training example with input features, operation applied, and metric deltas.</p>
                <Button onClick={handleBuildDataset} size="sm" className="w-full gap-1"><Database className="w-3 h-3" />Build Dataset from Results</Button>
                {dataset && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-muted/30 border border-border">
                      <p className="font-medium text-foreground">{dataset.examples.length}</p>
                      <p className="text-muted-foreground">Examples</p>
                    </div>
                    <div className="p-2 rounded bg-muted/30 border border-border">
                      <p className="font-medium text-foreground">{dataset.metadata.totalResults}</p>
                      <p className="text-muted-foreground">Results</p>
                    </div>
                    <div className="p-2 rounded bg-muted/30 border border-border">
                      <p className="font-medium text-foreground">{dataset.metadata.operations.length}</p>
                      <p className="text-muted-foreground">Operations</p>
                    </div>
                    <div className="p-2 rounded bg-muted/30 border border-border">
                      <p className="font-medium text-foreground">{dataset.metadata.fileStats.avgSize.toFixed(0)}</p>
                      <p className="text-muted-foreground">Avg File Size</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TRAIN TAB */}
          <TabsContent value="train" className="p-3 space-y-3 m-0">
            <Card>
              <CardHeader className="py-3 px-4"><CardTitle className="text-sm">Training Objective</CardTitle></CardHeader>
              <CardContent className="px-4 pb-3 space-y-3">
                <Select value={selectedObjective} onValueChange={(v: any) => setSelectedObjective(v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maximize_entropy">Maximize Entropy</SelectItem>
                    <SelectItem value="minimize_entropy">Minimize Entropy</SelectItem>
                    <SelectItem value="maximize_balance">Maximize Balance</SelectItem>
                    <SelectItem value="minimize_cost">Minimize Cost</SelectItem>
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={handleTrainHeuristic} size="sm" disabled={isTraining || !dataset} className="gap-1">
                    <Zap className="w-3 h-3" />Heuristic
                  </Button>
                  <Button onClick={handleTrainBandit} size="sm" disabled={isTraining || !dataset} className="gap-1">
                    <Brain className="w-3 h-3" />Bandit UCB1
                  </Button>
                </div>
                {!dataset && <p className="text-xs text-muted-foreground">Build a dataset first in the Data tab.</p>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* MODELS TAB */}
          <TabsContent value="models" className="p-3 space-y-3 m-0">
            {models.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No models trained yet. Go to Train tab.</div>
            ) : (
              <>
                <Select value={selectedModel || ''} onValueChange={setSelectedModel}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select a model" /></SelectTrigger>
                  <SelectContent>
                    {models.map(m => <SelectItem key={m.name} value={m.name}>{m.name} ({m.type})</SelectItem>)}
                  </SelectContent>
                </Select>
                {activeModel && (
                  <Card>
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {activeModel.name}
                        <Badge variant="outline" className="text-[10px]">{activeModel.type}</Badge>
                        <Badge variant="secondary" className="text-[10px]">{activeModel.objective}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3 space-y-2">
                      <p className="text-xs text-muted-foreground">Trained on {activeModel.trainingExamples} examples</p>
                      <p className="text-xs font-medium text-foreground">Top Operations:</p>
                      <div className="space-y-1">
                        {topOps.slice(0, 8).map((op, i) => (
                          <div key={i} className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/30 border border-border">
                            <span className="font-mono text-foreground">{op.op}</span>
                            <span className="text-muted-foreground">score: {op.score.toFixed(4)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" className="gap-1 flex-1" onClick={() => handleExportJS(activeModel.name)}>
                          <Download className="w-3 h-3" />Export JS
                        </Button>
                        <Button size="sm" variant="destructive" className="gap-1" onClick={() => handleDeleteModel(activeModel.name)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* EXPORT TAB */}
          <TabsContent value="export" className="p-3 space-y-3 m-0">
            <Card>
              <CardHeader className="py-3 px-4"><CardTitle className="text-sm">Export as JS Strategy</CardTitle></CardHeader>
              <CardContent className="px-4 pb-3 space-y-2">
                <p className="text-xs text-muted-foreground">Export a trained model as a runnable JavaScript strategy file. The file can be used directly in the Strategy Execute tab with the JS runtime.</p>
                {models.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Train a model first.</p>
                ) : (
                  <div className="space-y-2">
                    {models.map(m => (
                      <div key={m.name} className="flex items-center justify-between p-2 rounded bg-muted/30 border border-border">
                        <div>
                          <p className="text-xs font-medium text-foreground">{m.name}</p>
                          <p className="text-[10px] text-muted-foreground">{m.type} · {m.objective} · {m.trainingExamples} examples</p>
                        </div>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleExportJS(m.name)}>
                          <FileCode className="w-3 h-3" />Export
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-3 px-4"><CardTitle className="text-sm">JS Runtime Info</CardTitle></CardHeader>
              <CardContent className="px-4 pb-3">
                <p className="text-xs text-muted-foreground">JS strategies execute in a sandboxed environment with the same <code className="text-foreground">api</code> object as Python strategies. Available methods: <code className="text-foreground">apply_operation</code>, <code className="text-foreground">get_metric</code>, <code className="text-foreground">get_all_metrics</code>, <code className="text-foreground">get_budget</code>, <code className="text-foreground">get_bits</code>, <code className="text-foreground">set_bits</code>, <code className="text-foreground">log</code>.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};
