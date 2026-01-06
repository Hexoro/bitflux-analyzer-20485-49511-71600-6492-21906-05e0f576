/**
 * Graphs Tab for Backend Mode
 * Allows editing graph definitions using code
 * Now syncs with customPresetsManager for shared state
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Code,
} from 'lucide-react';
import { toast } from 'sonner';
import { customPresetsManager, GraphDefinition } from '@/lib/customPresetsManager';
import { EXAMPLE_GRAPHS } from '@/lib/expandedPresets';

const DEFAULT_GRAPHS: GraphDefinition[] = [
  {
    id: 'entropy_window',
    name: 'Entropy Window Analysis',
    description: 'Shows entropy calculated over sliding windows',
    type: 'area',
    enabled: true,
    dataFn: `function getData(bits) {
  const windowSize = Math.max(64, Math.floor(bits.length / 50));
  const data = [];
  
  for (let i = 0; i < bits.length - windowSize; i += windowSize / 4) {
    const window = bits.slice(i, i + windowSize);
    const ones = (window.match(/1/g) || []).length;
    const zeros = window.length - ones;
    const p = ones / window.length;
    const entropy = p > 0 && p < 1 ? -p * Math.log2(p) - (1-p) * Math.log2(1-p) : 0;
    data.push({ position: i, entropy: entropy.toFixed(4) });
  }
  return data;
}`,
  },
  {
    id: 'run_distribution',
    name: 'Run Length Distribution',
    description: 'Distribution of consecutive bit runs',
    type: 'bar',
    enabled: true,
    dataFn: `function getData(bits) {
  const runs = { zeros: {}, ones: {} };
  let currentBit = bits[0];
  let runLength = 1;
  
  for (let i = 1; i < bits.length; i++) {
    if (bits[i] === currentBit) {
      runLength++;
    } else {
      const key = currentBit === '0' ? 'zeros' : 'ones';
      runs[key][runLength] = (runs[key][runLength] || 0) + 1;
      currentBit = bits[i];
      runLength = 1;
    }
  }
  
  const data = [];
  const maxLen = Math.max(...Object.keys(runs.zeros).concat(Object.keys(runs.ones)).map(Number));
  for (let len = 1; len <= Math.min(maxLen, 30); len++) {
    data.push({
      length: len,
      zeros: runs.zeros[len] || 0,
      ones: runs.ones[len] || 0,
    });
  }
  return data;
}`,
  },
  {
    id: 'byte_frequency',
    name: 'Byte Frequency',
    description: 'Frequency of each byte value (0-255)',
    type: 'bar',
    enabled: true,
    dataFn: `function getData(bits) {
  const freq = {};
  for (let i = 0; i < bits.length; i += 8) {
    const byte = parseInt(bits.slice(i, i + 8).padEnd(8, '0'), 2);
    freq[byte] = (freq[byte] || 0) + 1;
  }
  
  return Object.entries(freq)
    .map(([value, count]) => ({ 
      value: parseInt(value), 
      count,
      hex: '0x' + parseInt(value).toString(16).toUpperCase().padStart(2, '0')
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);
}`,
  },
];

export const GraphsTab = () => {
  const [graphs, setGraphs] = useState<GraphDefinition[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGraph, setEditingGraph] = useState<GraphDefinition | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'bar' as GraphDefinition['type'],
    dataFn: '',
  });

  useEffect(() => {
    loadGraphs();
    // Subscribe to customPresetsManager for live updates
    const unsubscribe = customPresetsManager.subscribe(() => {
      setGraphs(customPresetsManager.getGraphs());
    });
    return unsubscribe;
  }, []);

  const loadGraphs = () => {
    const existingGraphs = customPresetsManager.getGraphs();
    if (existingGraphs.length === 0) {
      // Load defaults + examples with generated IDs
      const allDefaults: GraphDefinition[] = [
        ...DEFAULT_GRAPHS,
        ...EXAMPLE_GRAPHS.map((g, i) => ({
          ...g,
          id: `example_graph_${i}_${Date.now()}`,
        })),
      ];
      customPresetsManager.setGraphs(allDefaults);
      setGraphs(allDefaults);
    } else {
      setGraphs(existingGraphs);
    }
  };

  const saveGraphs = (newGraphs: GraphDefinition[]) => {
    customPresetsManager.setGraphs(newGraphs);
    setGraphs(newGraphs);
  };

  const handleAdd = () => {
    setEditingGraph(null);
    setForm({
      name: '',
      description: '',
      type: 'bar',
      dataFn: `function getData(bits) {
  // bits: string of 0s and 1s
  // Return array of objects for chart data
  // e.g., [{ x: 0, y: 10 }, { x: 1, y: 20 }]
  
  return [];
}`,
    });
    setDialogOpen(true);
  };

  const handleEdit = (graph: GraphDefinition) => {
    setEditingGraph(graph);
    setForm({
      name: graph.name,
      description: graph.description,
      type: graph.type,
      dataFn: graph.dataFn,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!form.dataFn.trim()) {
      toast.error('Data function is required');
      return;
    }

    try {
      // Validate function syntax
      new Function('bits', form.dataFn);
    } catch (e) {
      toast.error(`Invalid function: ${(e as Error).message}`);
      return;
    }

    const graph: GraphDefinition = {
      id: editingGraph?.id || `custom_${Date.now()}`,
      name: form.name,
      description: form.description,
      type: form.type,
      enabled: editingGraph?.enabled ?? true,
      dataFn: form.dataFn,
    };

    let newGraphs: GraphDefinition[];
    if (editingGraph) {
      newGraphs = graphs.map(g => g.id === editingGraph.id ? graph : g);
      toast.success('Graph updated');
    } else {
      newGraphs = [...graphs, graph];
      toast.success('Graph created');
    }

    saveGraphs(newGraphs);
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    const newGraphs = graphs.filter(g => g.id !== id);
    saveGraphs(newGraphs);
    toast.success('Graph deleted');
  };

  const handleToggle = (id: string) => {
    const newGraphs = graphs.map(g => 
      g.id === id ? { ...g, enabled: !g.enabled } : g
    );
    saveGraphs(newGraphs);
  };

  const handleReset = () => {
    saveGraphs([...DEFAULT_GRAPHS]);
    toast.success('Reset to default graphs');
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'bar': return 'bg-blue-500/20 text-blue-500';
      case 'line': return 'bg-green-500/20 text-green-500';
      case 'area': return 'bg-cyan-500/20 text-cyan-500';
      case 'scatter': return 'bg-yellow-500/20 text-yellow-500';
      case 'radar': return 'bg-purple-500/20 text-purple-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <Card className="bg-gradient-to-r from-primary/10 to-transparent border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Graph Definitions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Define custom graphs using JavaScript. Graphs work only for the currently viewed file.
              Each graph function receives the binary data as input and returns chart data.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4" />
                Graphs ({graphs.length})
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleReset}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
                <Button size="sm" variant="default" onClick={handleAdd}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {graphs.map(graph => (
                <div key={graph.id} className="border rounded-lg overflow-hidden">
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30"
                    onClick={() => setExpandedId(expandedId === graph.id ? null : graph.id)}
                  >
                    <div className="flex items-center gap-3">
                      {expandedId === graph.id ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{graph.name}</span>
                          <Badge className={`text-xs ${getTypeColor(graph.type)}`}>
                            {graph.type}
                          </Badge>
                          {!graph.enabled && (
                            <Badge variant="outline" className="text-xs">disabled</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{graph.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <Switch
                        checked={graph.enabled}
                        onCheckedChange={() => handleToggle(graph.id)}
                      />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(graph)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(graph.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  {expandedId === graph.id && (
                    <div className="px-3 pb-3 pt-1 bg-muted/20 border-t">
                      <div className="font-mono text-xs bg-background/50 p-2 rounded max-h-48 overflow-auto">
                        <pre>{graph.dataFn}</pre>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              {editingGraph ? 'Edit Graph' : 'Add Graph'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Custom Analysis"
                />
              </div>
              <div className="space-y-2">
                <Label>Chart Type</Label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  <option value="bar">Bar Chart</option>
                  <option value="line">Line Chart</option>
                  <option value="area">Area Chart</option>
                  <option value="scatter">Scatter Plot</option>
                  <option value="radar">Radar Chart</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What this graph shows"
              />
            </div>

            <div className="space-y-2">
              <Label>Data Function (JavaScript)</Label>
              <Textarea
                value={form.dataFn}
                onChange={(e) => setForm({ ...form, dataFn: e.target.value })}
                className="font-mono text-xs h-64"
                placeholder="function getData(bits) { ... }"
              />
              <p className="text-xs text-muted-foreground">
                Function receives <code>bits</code> (string of 0s and 1s).
                Return an array of objects with data points for the chart.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>
              {editingGraph ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ScrollArea>
  );
};
