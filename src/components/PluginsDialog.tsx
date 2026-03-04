/**
 * Plugin Management Dialog
 */
import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Puzzle, Plus, Trash2, Download, Upload, Power, PowerOff, RefreshCw, Edit, Save, X } from 'lucide-react';
import { pluginManager, Plugin, PluginType } from '@/lib/pluginManager';
import { toast } from 'sonner';

interface PluginsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PluginsDialog({ open, onOpenChange }: PluginsDialogProps) {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [activeTab, setActiveTab] = useState('installed');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPlugin, setNewPlugin] = useState({ name: '', version: '1.0', description: '', type: 'operation' as PluginType, code: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPlugins(pluginManager.getAll());
    const unsub = pluginManager.subscribe(() => setPlugins(pluginManager.getAll()));
    return unsub;
  }, []);

  const stats = pluginManager.getStats();

  const handleAdd = () => {
    if (!newPlugin.name.trim()) { toast.error('Plugin name required'); return; }
    pluginManager.add({ ...newPlugin, enabled: false, config: {} });
    setNewPlugin({ name: '', version: '1.0', description: '', type: 'operation', code: '' });
    setActiveTab('installed');
    toast.success('Plugin added');
  };

  const handleDelete = (id: string) => {
    pluginManager.remove(id);
    toast.success('Plugin removed');
  };

  const handleToggle = (id: string) => { pluginManager.toggle(id); };

  const handleExport = () => {
    const json = pluginManager.exportPlugins();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `bsee-plugins-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Plugins exported');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = pluginManager.importPlugins(ev.target?.result as string);
      if (result.imported > 0) toast.success(`Imported ${result.imported} plugin(s)`);
      if (result.errors.length > 0) toast.error(result.errors.join('\n'));
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleRestart = () => {
    // In a real app this would reload plugin code; here we just re-read from storage
    setPlugins(pluginManager.getAll());
    toast.success('Plugins reloaded');
  };

  const typeColors: Record<PluginType, string> = {
    operation: 'border-blue-500 text-blue-500',
    metric: 'border-purple-500 text-purple-500',
    visualization: 'border-green-500 text-green-500',
    export: 'border-orange-500 text-orange-500',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Puzzle className="w-5 h-5 text-primary" />
              <div>
                <DialogTitle>Plugins</DialogTitle>
                <DialogDescription>{stats.total} plugins • {stats.enabled} enabled</DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRestart}><RefreshCw className="w-3 h-3 mr-1" />Restart</Button>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={plugins.length === 0}><Download className="w-3 h-3 mr-1" />Export</Button>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Upload className="w-3 h-3 mr-1" />Import</Button>
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-6 mt-4 grid w-auto grid-cols-3">
            <TabsTrigger value="installed" className="text-xs">Installed ({plugins.length})</TabsTrigger>
            <TabsTrigger value="add" className="text-xs">Add New</TabsTrigger>
            <TabsTrigger value="manage" className="text-xs">Manage</TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 overflow-hidden">
            <TabsContent value="installed" className="h-full m-0 p-0">
              <ScrollArea className="h-[400px]">
                <div className="p-6 space-y-2">
                  {plugins.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Puzzle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No plugins installed</p>
                      <Button variant="link" size="sm" onClick={() => setActiveTab('add')}>Add your first plugin</Button>
                    </div>
                  ) : (
                    plugins.map(p => (
                      <Card key={p.id} className={p.enabled ? 'border-primary/30' : 'opacity-60'}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Switch checked={p.enabled} onCheckedChange={() => handleToggle(p.id)} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm truncate">{p.name}</span>
                                  <Badge variant="outline" className={`text-[10px] ${typeColors[p.type]}`}>{p.type}</Badge>
                                  <span className="text-[10px] text-muted-foreground">v{p.version}</span>
                                </div>
                                {p.description && <p className="text-xs text-muted-foreground truncate">{p.description}</p>}
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(p.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="add" className="h-full m-0 p-0">
              <ScrollArea className="h-[400px]">
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Name</Label><Input value={newPlugin.name} onChange={e => setNewPlugin(p => ({ ...p, name: e.target.value }))} placeholder="My Plugin" /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label>Version</Label><Input value={newPlugin.version} onChange={e => setNewPlugin(p => ({ ...p, version: e.target.value }))} /></div>
                      <div><Label>Type</Label>
                        <Select value={newPlugin.type} onValueChange={v => setNewPlugin(p => ({ ...p, type: v as PluginType }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="operation">Operation</SelectItem>
                            <SelectItem value="metric">Metric</SelectItem>
                            <SelectItem value="visualization">Visualization</SelectItem>
                            <SelectItem value="export">Export</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <div><Label>Description</Label><Input value={newPlugin.description} onChange={e => setNewPlugin(p => ({ ...p, description: e.target.value }))} placeholder="What does this plugin do?" /></div>
                  <div><Label>Code</Label><Textarea value={newPlugin.code} onChange={e => setNewPlugin(p => ({ ...p, code: e.target.value }))} rows={10} placeholder="// Plugin code here..." className="font-mono text-xs" /></div>
                  <Button onClick={handleAdd} className="w-full"><Plus className="w-4 h-4 mr-2" />Add Plugin</Button>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="manage" className="h-full m-0 p-0">
              <ScrollArea className="h-[400px]">
                <div className="p-6 space-y-4">
                  <Card><CardContent className="p-4 space-y-3">
                    <h4 className="text-sm font-semibold">Bulk Actions</h4>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { pluginManager.enableAll(); toast.success('All enabled'); }}><Power className="w-3 h-3 mr-1" />Enable All</Button>
                      <Button variant="outline" size="sm" onClick={() => { pluginManager.disableAll(); toast.success('All disabled'); }}><PowerOff className="w-3 h-3 mr-1" />Disable All</Button>
                    </div>
                  </CardContent></Card>
                  <Card><CardContent className="p-4 space-y-3">
                    <h4 className="text-sm font-semibold">Statistics</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(stats.byType).map(([type, count]) => (
                        <div key={type} className="flex justify-between"><span className="capitalize">{type}</span><Badge variant="secondary" className="text-[10px]">{count}</Badge></div>
                      ))}
                    </div>
                  </CardContent></Card>
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
