/**
 * Generation Settings Tab for Backend Mode
 * Uses customPresetsManager for shared state with GenerateDialog
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
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
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Save,
  Code,
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  GENERATION_PRESETS, 
  PRESET_DESCRIPTIONS, 
  GenerationConfig,
  QUICK_SIZES,
} from '@/lib/generationPresets';
import { customPresetsManager, CustomPreset } from '@/lib/customPresetsManager';

export const GenerationTab = () => {
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<CustomPreset | null>(null);
  const [expandedPreset, setExpandedPreset] = useState<string | null>(null);

  const [form, setForm] = useState<{
    name: string;
    description: string;
    config: GenerationConfig & { patterns?: string[] };
    code?: string;
    isCodeBased?: boolean;
  }>({
    name: '',
    description: '',
    config: {
      mode: 'random',
      length: 1024,
      probability: 0.5,
      patterns: ['1010'],
    },
    code: '',
    isCodeBased: false,
  });

  useEffect(() => {
    setCustomPresets(customPresetsManager.getCustomPresets());
    const unsubscribe = customPresetsManager.subscribe(() => {
      setCustomPresets(customPresetsManager.getCustomPresets());
    });
    return unsubscribe;
  }, []);

  const handleAdd = () => {
    setEditingPreset(null);
    setForm({
      name: '',
      description: '',
      config: {
        mode: 'random',
        length: 1024,
        probability: 0.5,
        patterns: ['1010'],
      },
      code: '',
      isCodeBased: false,
    });
    setDialogOpen(true);
  };

  const handleEdit = (preset: CustomPreset) => {
    setEditingPreset(preset);
    setForm({
      name: preset.name,
      description: preset.description,
      config: { 
        ...preset.config,
        patterns: (preset.config as any).patterns || [preset.config.pattern || '1010'],
      },
      code: preset.code || '',
      isCodeBased: preset.isCodeBased || false,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }

    // Validate code if code-based
    if (form.isCodeBased && form.code) {
      try {
        new Function('length', 'seed', 'probability', form.code);
      } catch (e) {
        toast.error(`Invalid code syntax: ${(e as Error).message}`);
        return;
      }
    }

    if (editingPreset) {
      customPresetsManager.updatePreset(editingPreset.id, {
        name: form.name,
        description: form.description,
        config: form.config,
        code: form.code,
        isCodeBased: form.isCodeBased,
      });
      toast.success('Preset updated');
    } else {
      customPresetsManager.addPreset({
        name: form.name,
        description: form.description,
        config: form.config,
        code: form.code,
        isCodeBased: form.isCodeBased,
      });
      toast.success('Preset created');
    }

    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    customPresetsManager.deletePreset(id);
    toast.success('Preset deleted');
  };

  const handleReset = () => {
    customPresetsManager.clearPresets();
    toast.success('Custom presets cleared');
  };

  const allPresets = [
    ...Object.entries(GENERATION_PRESETS).map(([key, config]) => ({
      id: key,
      name: key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: PRESET_DESCRIPTIONS[key] || '',
      config,
      isBuiltin: true,
    })),
    ...customPresets.map(p => ({ ...p, isBuiltin: false })),
  ];

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Generation Presets ({allPresets.length})
              </div>
              <div className="flex items-center gap-2">
                {customPresets.length > 0 && (
                  <Button size="sm" variant="outline" onClick={handleReset}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Clear Custom
                  </Button>
                )}
                <Button size="sm" variant="default" onClick={handleAdd}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Preset
                </Button>
              </div>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Define custom presets that appear in the Generate Dialog. Supports both config-based and code-based generation.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Built-in Presets */}
              <h4 className="text-xs font-medium text-muted-foreground uppercase mt-2">Built-in Presets</h4>
              {allPresets.filter(p => p.isBuiltin).map(preset => (
                <div key={preset.id} className="border rounded-lg overflow-hidden">
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30"
                    onClick={() => setExpandedPreset(expandedPreset === preset.id ? null : preset.id)}
                  >
                    <div className="flex items-center gap-3">
                      {expandedPreset === preset.id ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      <div>
                        <span className="font-medium">{preset.name}</span>
                        <p className="text-xs text-muted-foreground">{preset.description}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">{preset.config.mode}</Badge>
                  </div>
                  {expandedPreset === preset.id && (
                    <div className="px-3 pb-3 pt-1 bg-muted/20 border-t text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Length:</span>
                        <span className="font-mono">{preset.config.length} bits</span>
                      </div>
                      {preset.config.probability !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Probability:</span>
                          <span className="font-mono">{(preset.config.probability * 100).toFixed(0)}%</span>
                        </div>
                      )}
                      {preset.config.template && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Template:</span>
                          <span className="font-mono">{preset.config.template}</span>
                        </div>
                      )}
                      {preset.config.pattern && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Pattern:</span>
                          <span className="font-mono">{preset.config.pattern}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Custom Presets */}
              {customPresets.length > 0 && (
                <>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase mt-4">Custom Presets</h4>
                  {customPresets.map(preset => (
                    <div key={preset.id} className="border rounded-lg overflow-hidden border-primary/30">
                      <div
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30"
                        onClick={() => setExpandedPreset(expandedPreset === preset.id ? null : preset.id)}
                      >
                        <div className="flex items-center gap-3">
                          {expandedPreset === preset.id ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{preset.name}</span>
                              {preset.isCodeBased && (
                                <Badge variant="outline" className="text-xs">
                                  <Code className="w-3 h-3 mr-1" />
                                  Code
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{preset.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <Badge variant="outline" className="text-xs">{preset.config.mode}</Badge>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(preset)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(preset.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      {expandedPreset === preset.id && (
                        <div className="px-3 pb-3 pt-1 bg-muted/20 border-t text-xs space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Length:</span>
                            <span className="font-mono">{preset.config.length} bits</span>
                          </div>
                          {preset.config.probability !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Probability:</span>
                              <span className="font-mono">{(preset.config.probability * 100).toFixed(0)}%</span>
                            </div>
                          )}
                          {preset.isCodeBased && preset.code && (
                            <div className="mt-2">
                              <span className="text-muted-foreground block mb-1">Code:</span>
                              <pre className="font-mono text-xs bg-background/50 p-2 rounded max-h-32 overflow-auto">
                                {preset.code}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Size Reference */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Quick Size Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2">
              {QUICK_SIZES.map(({ label, value }) => (
                <div key={value} className="p-2 bg-muted/30 rounded text-center">
                  <div className="font-medium text-sm">{label}</div>
                  <div className="text-xs text-muted-foreground font-mono">{value.toLocaleString()} bits</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPreset ? 'Edit Preset' : 'Create Preset'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="My Custom Preset"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What this preset does"
              />
            </div>

            <div className="space-y-2">
              <Label>Mode</Label>
              <Select 
                value={form.config.mode} 
                onValueChange={(v: any) => setForm({ ...form, config: { ...form.config, mode: v } })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="random">Random</SelectItem>
                  <SelectItem value="pattern">Pattern</SelectItem>
                  <SelectItem value="structured">Structured</SelectItem>
                  <SelectItem value="file-format">File Format</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Length (bits)</Label>
              <Input
                type="number"
                value={form.config.length}
                onChange={(e) => setForm({ 
                  ...form, 
                  config: { ...form.config, length: parseInt(e.target.value) || 1024 } 
                })}
                min={8}
                max={10000000}
              />
            </div>

            {form.config.mode === 'random' && (
              <div className="space-y-2">
                <Label>Probability of 1s: {((form.config.probability || 0.5) * 100).toFixed(0)}%</Label>
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={[form.config.probability || 0.5]}
                  onValueChange={([v]) => setForm({ 
                    ...form, 
                    config: { ...form.config, probability: v } 
                  })}
                />
              </div>
            )}

            {form.config.mode === 'pattern' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Patterns</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const currentPatterns = form.config.patterns || ['1010'];
                      if (currentPatterns.length < 8) {
                        setForm({
                          ...form,
                          config: { ...form.config, patterns: [...currentPatterns, '01'] }
                        });
                      }
                    }}
                    className="h-7"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add
                  </Button>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {(form.config.patterns || ['1010']).map((p, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={p}
                        onChange={(e) => {
                          const newPatterns = [...(form.config.patterns || ['1010'])];
                          newPatterns[idx] = e.target.value;
                          setForm({ ...form, config: { ...form.config, patterns: newPatterns } });
                        }}
                        placeholder="e.g., 1010"
                        className="font-mono flex-1"
                      />
                      {(form.config.patterns || ['1010']).length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newPatterns = (form.config.patterns || ['1010']).filter((_, i) => i !== idx);
                            setForm({ ...form, config: { ...form.config, patterns: newPatterns } });
                          }}
                          className="h-8 w-8 text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Multiple patterns will be combined sequentially
                </p>
              </div>
            )}

            {form.config.mode === 'structured' && (
              <div className="space-y-2">
                <Label>Template</Label>
                <Select 
                  value={form.config.template || 'alternating'} 
                  onValueChange={(v: any) => setForm({ 
                    ...form, 
                    config: { ...form.config, template: v } 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zeros">All Zeros</SelectItem>
                    <SelectItem value="ones">All Ones</SelectItem>
                    <SelectItem value="alternating">Alternating</SelectItem>
                    <SelectItem value="blocks">Blocks</SelectItem>
                    <SelectItem value="gray-code">Gray Code</SelectItem>
                    <SelectItem value="fibonacci">Fibonacci</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.config.mode === 'file-format' && (
              <div className="space-y-2">
                <Label>Header Pattern (8 bits)</Label>
                <Input
                  value={form.config.headerPattern || '11111111'}
                  onChange={(e) => setForm({ 
                    ...form, 
                    config: { ...form.config, headerPattern: e.target.value } 
                  })}
                  placeholder="e.g., 11111111"
                  className="font-mono"
                  maxLength={8}
                />
              </div>
            )}

            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label>Use Custom Code</Label>
                <Button
                  size="sm"
                  variant={form.isCodeBased ? 'default' : 'outline'}
                  onClick={() => setForm({ ...form, isCodeBased: !form.isCodeBased })}
                >
                  <Code className="w-4 h-4 mr-2" />
                  {form.isCodeBased ? 'Code Enabled' : 'Enable Code'}
                </Button>
              </div>
              
              {form.isCodeBased && (
                <div className="space-y-2">
                  <Textarea
                    value={form.code || ''}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="font-mono text-xs h-40"
                    placeholder={`// Custom generation function
// Available: length, seed, probability
// Must return a string of only 0s and 1s

let result = '';
for (let i = 0; i < length; i++) {
  result += Math.random() < probability ? '1' : '0';
}
return result;`}
                  />
                  <p className="text-xs text-muted-foreground">
                    When enabled, this code overrides config settings. Function receives: length, seed, probability.
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ScrollArea>
  );
};
