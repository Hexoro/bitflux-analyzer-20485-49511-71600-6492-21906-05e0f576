/**
 * Anomalies Tab for Backend Mode
 * Allows creating and editing custom anomaly definitions
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  Code,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { anomaliesManager, AnomalyDefinition } from '@/lib/anomaliesManager';

export const AnomaliesTab = () => {
  const [definitions, setDefinitions] = useState<AnomalyDefinition[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDef, setEditingDef] = useState<AnomalyDefinition | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [, forceUpdate] = useState({});

  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'Pattern',
    severity: 'medium' as 'low' | 'medium' | 'high',
    minLength: 5,
    detectFn: '',
  });

  useEffect(() => {
    setDefinitions(anomaliesManager.getAllDefinitions());
    const unsubscribe = anomaliesManager.subscribe(() => {
      setDefinitions(anomaliesManager.getAllDefinitions());
      forceUpdate({});
    });
    return unsubscribe;
  }, []);

  const categories = anomaliesManager.getCategories();

  const handleAdd = () => {
    setEditingDef(null);
    setForm({
      name: '',
      description: '',
      category: 'Pattern',
      severity: 'medium',
      minLength: 5,
      detectFn: `function detect(bits, minLength) {
  const results = [];
  
  // Your detection logic here
  // Return array of { position, length, ...other_data }
  
  return results;
}`,
    });
    setDialogOpen(true);
  };

  const handleEdit = (def: AnomalyDefinition) => {
    setEditingDef(def);
    setForm({
      name: def.name,
      description: def.description,
      category: def.category,
      severity: def.severity,
      minLength: def.minLength,
      detectFn: def.detectFn,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!form.detectFn.trim()) {
      toast.error('Detection function is required');
      return;
    }

    try {
      // Validate the function syntax
      new Function('bits', 'minLength', form.detectFn);
    } catch (e) {
      toast.error(`Invalid function syntax: ${(e as Error).message}`);
      return;
    }

    if (editingDef) {
      anomaliesManager.updateDefinition(editingDef.id, {
        name: form.name,
        description: form.description,
        category: form.category,
        severity: form.severity,
        minLength: form.minLength,
        detectFn: form.detectFn,
      });
      toast.success('Anomaly definition updated');
    } else {
      anomaliesManager.addDefinition({
        name: form.name,
        description: form.description,
        category: form.category,
        severity: form.severity,
        minLength: form.minLength,
        enabled: true,
        detectFn: form.detectFn,
      });
      toast.success('Anomaly definition added');
    }

    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    anomaliesManager.deleteDefinition(id);
    toast.success('Anomaly definition deleted');
  };

  const handleToggle = (id: string) => {
    anomaliesManager.toggleEnabled(id);
  };

  const handleReset = () => {
    anomaliesManager.resetToDefaults();
    toast.success('Reset to default anomaly definitions');
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-500 bg-red-500/10';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10';
      case 'low': return 'text-blue-500 bg-blue-500/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Anomaly Definitions ({definitions.length})
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
            <p className="text-xs text-muted-foreground">
              Define custom anomaly detectors. These will be available in Analysis mode.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {categories.map(category => (
                <div key={category} className="mb-3">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">{category}</h4>
                  <div className="space-y-1">
                    {definitions.filter(d => d.category === category).map(def => (
                      <div key={def.id} className="border rounded-lg overflow-hidden">
                        <div
                          className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30"
                          onClick={() => setExpandedId(expandedId === def.id ? null : def.id)}
                        >
                          <div className="flex items-center gap-3">
                            {expandedId === def.id ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{def.name}</span>
                                <Badge className={`text-xs ${getSeverityColor(def.severity)}`}>
                                  {def.severity}
                                </Badge>
                                {!def.enabled && (
                                  <Badge variant="outline" className="text-xs">disabled</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{def.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            <Switch
                              checked={def.enabled}
                              onCheckedChange={() => handleToggle(def.id)}
                            />
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(def)}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(def.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        {expandedId === def.id && (
                          <div className="px-3 pb-3 pt-1 bg-muted/20 border-t">
                            <div className="flex items-center gap-4 text-xs mb-2">
                              <span><strong>Min Length:</strong> {def.minLength}</span>
                              <span><strong>ID:</strong> {def.id}</span>
                            </div>
                            <div className="font-mono text-xs bg-background/50 p-2 rounded max-h-48 overflow-auto">
                              <pre>{def.detectFn}</pre>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
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
              <Code className="w-5 h-5" />
              {editingDef ? 'Edit Anomaly Definition' : 'Add Anomaly Definition'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Custom Pattern Detector"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pattern">Pattern</SelectItem>
                    <SelectItem value="Run">Run</SelectItem>
                    <SelectItem value="Density">Density</SelectItem>
                    <SelectItem value="Structure">Structure</SelectItem>
                    <SelectItem value="Custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What does this anomaly detector find?"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select value={form.severity} onValueChange={(v: any) => setForm({ ...form, severity: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Min Length</Label>
                <Input
                  type="number"
                  value={form.minLength}
                  onChange={(e) => setForm({ ...form, minLength: parseInt(e.target.value) || 1 })}
                  min={1}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Detection Function (JavaScript)</Label>
              <Textarea
                value={form.detectFn}
                onChange={(e) => setForm({ ...form, detectFn: e.target.value })}
                className="font-mono text-xs h-64"
                placeholder="function detect(bits, minLength) { ... }"
              />
              <p className="text-xs text-muted-foreground">
                Function receives <code>bits</code> (string) and <code>minLength</code> (number). 
                Return array of objects with at least <code>position</code> and <code>length</code>.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>
              {editingDef ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ScrollArea>
  );
};
