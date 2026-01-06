import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  Calculator,
  Cog,
  ChevronRight,
  ChevronDown,
  Info,
  Code,
  BookOpen,
  Zap,
  Binary,
  FileCode,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  predefinedManager,
  PredefinedMetric,
  PredefinedOperation,
} from '@/lib/predefinedManager';
import { MetricsCodeEditor } from './MetricsCodeEditor';
import { OperationsCodeEditor } from './OperationsCodeEditor';
import { CodeFileEditor } from './CodeFileEditor';
import { GuidesTab } from './backend/GuidesTab';
import { AnomaliesTab } from './backend/AnomaliesTab';
import { GenerationTab } from './backend/GenerationTab';
import { GraphsTab } from './backend/GraphsTab';
type BackendTab = 'overview' | 'metrics' | 'operations' | 'anomalies' | 'generation' | 'graphs' | 'guides' | 'info';

export const BackendPanel = () => {
  const [activeTab, setActiveTab] = useState<BackendTab>('overview');
  const [, forceUpdate] = useState({});

  // Dialog states
  const [metricDialogOpen, setMetricDialogOpen] = useState(false);
  const [operationDialogOpen, setOperationDialogOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<PredefinedMetric | null>(null);
  const [editingOperation, setEditingOperation] = useState<PredefinedOperation | null>(null);
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  const [expandedOperation, setExpandedOperation] = useState<string | null>(null);

  // Form states
  const [metricForm, setMetricForm] = useState<Partial<PredefinedMetric>>({});
  const [operationForm, setOperationForm] = useState<Partial<PredefinedOperation>>({});

  useEffect(() => {
    const unsubscribe = predefinedManager.subscribe(() => forceUpdate({}));
    return unsubscribe;
  }, []);

  const handleAddMetric = () => {
    setEditingMetric(null);
    setMetricForm({
      id: '',
      name: '',
      description: '',
      formula: '',
      unit: '',
      category: '',
    });
    setMetricDialogOpen(true);
  };

  const handleEditMetric = (metric: PredefinedMetric) => {
    setEditingMetric(metric);
    setMetricForm({ ...metric });
    setMetricDialogOpen(true);
  };

  const handleSaveMetric = () => {
    if (!metricForm.id || !metricForm.name || !metricForm.formula) {
      toast.error('ID, Name, and Formula are required');
      return;
    }

    const metric: PredefinedMetric = {
      id: metricForm.id,
      name: metricForm.name,
      description: metricForm.description || '',
      formula: metricForm.formula,
      unit: metricForm.unit,
      category: metricForm.category,
    };

    if (editingMetric) {
      predefinedManager.updateMetric(editingMetric.id, metric);
      toast.success('Metric updated');
    } else {
      predefinedManager.addMetric(metric);
      toast.success('Metric added');
    }
    setMetricDialogOpen(false);
  };

  const handleDeleteMetric = (id: string) => {
    predefinedManager.deleteMetric(id);
    toast.success('Metric deleted');
  };

  const handleAddOperation = () => {
    setEditingOperation(null);
    setOperationForm({
      id: '',
      name: '',
      description: '',
      parameters: [],
      category: '',
    });
    setOperationDialogOpen(true);
  };

  const handleEditOperation = (op: PredefinedOperation) => {
    setEditingOperation(op);
    setOperationForm({ ...op });
    setOperationDialogOpen(true);
  };

  const handleSaveOperation = () => {
    if (!operationForm.id || !operationForm.name) {
      toast.error('ID and Name are required');
      return;
    }

    const operation: PredefinedOperation = {
      id: operationForm.id,
      name: operationForm.name,
      description: operationForm.description || '',
      parameters: operationForm.parameters || [],
      category: operationForm.category,
    };

    if (editingOperation) {
      predefinedManager.updateOperation(editingOperation.id, operation);
      toast.success('Operation updated');
    } else {
      predefinedManager.addOperation(operation);
      toast.success('Operation added');
    }
    setOperationDialogOpen(false);
  };

  const handleDeleteOperation = (id: string) => {
    predefinedManager.deleteOperation(id);
    toast.success('Operation deleted');
  };

  const metrics = predefinedManager.getAllMetrics();
  const operations = predefinedManager.getAllOperations();
  const metricCategories = predefinedManager.getMetricCategories();
  const operationCategories = predefinedManager.getOperationCategories();

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as BackendTab)} className="h-full flex flex-col">
      <TabsList className="w-full justify-start rounded-none border-b overflow-x-auto flex-shrink-0">
        <TabsTrigger value="overview">
          <Binary className="w-4 h-4 mr-1" />
          Overview
        </TabsTrigger>
        <TabsTrigger value="metrics">
          <Calculator className="w-4 h-4 mr-1" />
          Metrics
        </TabsTrigger>
        <TabsTrigger value="operations">
          <Cog className="w-4 h-4 mr-1" />
          Operations
        </TabsTrigger>
        <TabsTrigger value="anomalies">
          <Activity className="w-4 h-4 mr-1" />
          Anomalies
        </TabsTrigger>
        <TabsTrigger value="generation">
          <Zap className="w-4 h-4 mr-1" />
          Generation
        </TabsTrigger>
        <TabsTrigger value="graphs">
          <FileCode className="w-4 h-4 mr-1" />
          Graphs
        </TabsTrigger>
        <TabsTrigger value="guides">
          <BookOpen className="w-4 h-4 mr-1" />
          Guides
        </TabsTrigger>
        <TabsTrigger value="info">
          <Info className="w-4 h-4 mr-1" />
          Info
        </TabsTrigger>
      </TabsList>

      <div className="flex-1 overflow-hidden">
        {/* Overview Tab - All Metrics and Operations */}
        <TabsContent value="overview" className="h-full m-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Binary className="w-4 h-4" />
                    All Metrics & Operations
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Complete view of all available metrics and operations for strategies.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Metrics Summary */}
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-primary" />
                      Metrics ({metrics.length})
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {metricCategories.map(cat => (
                        <div key={cat} className="p-2 bg-muted/30 rounded">
                          <div className="text-xs font-medium text-muted-foreground uppercase mb-1">{cat}</div>
                          <div className="flex flex-wrap gap-1">
                            {metrics.filter(m => m.category === cat).map(m => (
                              <Badge key={m.id} variant="secondary" className="text-xs">
                                {m.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Operations Summary */}
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Cog className="w-4 h-4 text-primary" />
                      Operations ({operations.length})
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {operationCategories.map(cat => (
                        <div key={cat} className="p-2 bg-muted/30 rounded">
                          <div className="text-xs font-medium text-muted-foreground uppercase mb-1">{cat}</div>
                          <div className="flex flex-wrap gap-1">
                            {operations.filter(o => o.category === cat).map(o => (
                              <Badge key={o.id} variant="outline" className="text-xs font-mono">
                                {o.id}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Metrics Tab - Use Full Code Editor */}
        <TabsContent value="metrics" className="h-full m-0">
          <MetricsCodeEditor />
        </TabsContent>

        {/* Operations Tab - Use Full Code Editor */}
        <TabsContent value="operations" className="h-full m-0">
          <OperationsCodeEditor />
        </TabsContent>

        {/* Anomalies Tab */}
        <TabsContent value="anomalies" className="h-full m-0">
          <AnomaliesTab />
        </TabsContent>

        {/* Generation Tab */}
        <TabsContent value="generation" className="h-full m-0">
          <GenerationTab />
        </TabsContent>

        {/* Graphs Tab */}
        <TabsContent value="graphs" className="h-full m-0">
          <GraphsTab />
        </TabsContent>


        {/* Guides Tab */}
        <TabsContent value="guides" className="h-full m-0">
          <GuidesTab />
        </TabsContent>

        {/* Info Tab - Rewritten */}
        <TabsContent value="info" className="h-full m-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Bitwise Analysis System
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* System Overview */}
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Binary className="w-4 h-4" />
                      System Overview
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      This system provides a Python-based environment for analyzing and transforming binary data.
                      Strategies are composed of modular Python scripts organized into groups: Scheduler, Algorithm, Scoring, and Policies.
                    </p>
                  </div>

                  {/* Architecture */}
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Architecture
                    </h3>
                    <div className="grid gap-3">
                      <div className="p-3 border rounded-lg">
                        <h4 className="font-medium text-sm flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="bg-purple-500/10">Scheduler</Badge>
                          Required (1 file)
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Controls execution flow. Defines how data is batched, iteration counts, and scheduling logic.
                        </p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <h4 className="font-medium text-sm flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="bg-primary/10">Algorithm</Badge>
                          Multiple allowed
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Core transformation logic. Applies operations to binary data based on analysis results.
                        </p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <h4 className="font-medium text-sm flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="bg-yellow-500/10">Scoring</Badge>
                          Multiple allowed
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Evaluation functions. Calculate quality scores using available metrics.
                        </p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <h4 className="font-medium text-sm flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="bg-green-500/10">Policies</Badge>
                          Optional
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Constraints and rules. Define boundaries and validation for algorithm behavior.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Python API */}
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Code className="w-4 h-4" />
                      Python API (bitwise_api)
                    </h3>
                    <div className="bg-muted/30 p-3 rounded-lg font-mono text-xs space-y-2">
                      <p><span className="text-primary">get_bits()</span> - Get current binary data</p>
                      <p><span className="text-primary">set_bits(data)</span> - Update binary data</p>
                      <p><span className="text-primary">apply_operation(name, params)</span> - Apply an operation</p>
                      <p><span className="text-primary">get_metric(name)</span> - Get metric value</p>
                      <p><span className="text-primary">log(msg)</span> - Log a message</p>
                      <p><span className="text-primary">OPERATIONS</span> - List of available operations</p>
                      <p><span className="text-primary">METRICS</span> - Dict of current metric values</p>
                    </div>
                  </div>

                  {/* Metrics & Operations */}
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Metrics & Operations
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Metrics and Operations are defined in this Backend panel and automatically available to all Python strategies.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 border rounded-lg">
                        <h4 className="font-medium text-sm mb-1">Metrics ({metrics.length})</h4>
                        <p className="text-xs text-muted-foreground">
                          Quantitative measurements of binary data properties (entropy, balance, runs, etc.)
                        </p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <h4 className="font-medium text-sm mb-1">Operations ({operations.length})</h4>
                        <p className="text-xs text-muted-foreground">
                          Transformations that can be applied to binary data (XOR, shifts, RLE, etc.)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Workflow */}
                  <div>
                    <h3 className="font-semibold mb-2">Workflow</h3>
                    <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                      <li>Upload Python files to the Files tab in Algorithm mode</li>
                      <li>Create a Strategy by selecting files from each group</li>
                      <li>Load or generate binary data</li>
                      <li>Run the strategy and view results in the Player tab</li>
                      <li>Analyze transformations step-by-step with the timeline</li>
                      <li>Export results from the Results tab</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>
      </div>

      {/* Metric Dialog */}
      <Dialog open={metricDialogOpen} onOpenChange={setMetricDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingMetric ? 'Edit Metric' : 'Add Metric'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ID</Label>
                <Input
                  value={metricForm.id || ''}
                  onChange={e => setMetricForm({ ...metricForm, id: e.target.value })}
                  placeholder="entropy"
                  disabled={!!editingMetric}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={metricForm.category || ''}
                  onChange={e => setMetricForm({ ...metricForm, category: e.target.value })}
                  placeholder="Statistics"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={metricForm.name || ''}
                onChange={e => setMetricForm({ ...metricForm, name: e.target.value })}
                placeholder="Shannon Entropy"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={metricForm.description || ''}
                onChange={e => setMetricForm({ ...metricForm, description: e.target.value })}
                placeholder="Measures randomness"
              />
            </div>
            <div className="space-y-2">
              <Label>Formula</Label>
              <Textarea
                value={metricForm.formula || ''}
                onChange={e => setMetricForm({ ...metricForm, formula: e.target.value })}
                placeholder="-Σ(p(x) * log₂(p(x)))"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Input
                value={metricForm.unit || ''}
                onChange={e => setMetricForm({ ...metricForm, unit: e.target.value })}
                placeholder="bits"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMetricDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveMetric}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Operation Dialog */}
      <Dialog open={operationDialogOpen} onOpenChange={setOperationDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingOperation ? 'Edit Operation' : 'Add Operation'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ID</Label>
                <Input
                  value={operationForm.id || ''}
                  onChange={e => setOperationForm({ ...operationForm, id: e.target.value })}
                  placeholder="XOR"
                  disabled={!!editingOperation}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={operationForm.category || ''}
                  onChange={e => setOperationForm({ ...operationForm, category: e.target.value })}
                  placeholder="Logic Gates"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={operationForm.name || ''}
                onChange={e => setOperationForm({ ...operationForm, name: e.target.value })}
                placeholder="XOR Gate"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={operationForm.description || ''}
                onChange={e => setOperationForm({ ...operationForm, description: e.target.value })}
                placeholder="Bitwise exclusive OR operation"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOperationDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveOperation}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
};
