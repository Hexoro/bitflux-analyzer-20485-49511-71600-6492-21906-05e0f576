/**
 * Metrics Code Editor - Write and edit metric formulas with full documentation
 * Supports both formula documentation mode and executable JavaScript code mode
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Calculator,
  Save,
  Plus,
  Trash2,
  Code,
  Info,
  Link,
  Play,
  CheckCircle2,
  XCircle,
  FileCode,
} from 'lucide-react';
import { toast } from 'sonner';
import { predefinedManager, PredefinedMetric } from '@/lib/predefinedManager';
import { fileSystemManager } from '@/lib/fileSystemManager';

interface MetricReference {
  usedIn: string[];
  dependsOn: string[];
  formula: string;
}

const DEFAULT_METRIC_CODE = `function calculate(bits) {
  // bits is a string of '0' and '1'
  // Return a number
  let ones = 0;
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') ones++;
  }
  return ones / bits.length;
}`;

// Built-in metric code snippets for display
const BUILTIN_METRIC_CODE: Record<string, string> = {
  'entropy': `function calculate(bits) {
  if (bits.length === 0) return 0;
  const ones = (bits.match(/1/g) || []).length;
  const p1 = ones / bits.length;
  const p0 = 1 - p1;
  if (p1 === 0 || p1 === 1) return 0;
  return -(p1 * Math.log2(p1) + p0 * Math.log2(p0));
}`,
  'balance': `function calculate(bits) {
  if (bits.length === 0) return 0.5;
  const ones = (bits.match(/1/g) || []).length;
  return ones / bits.length;
}`,
  'hamming_weight': `function calculate(bits) {
  return (bits.match(/1/g) || []).length;
}`,
  'transition_count': `function calculate(bits) {
  let transitions = 0;
  for (let i = 1; i < bits.length; i++) {
    if (bits[i] !== bits[i-1]) transitions++;
  }
  return transitions;
}`,
  'run_length_avg': `function calculate(bits) {
  if (bits.length === 0) return 0;
  let runs = 1;
  for (let i = 1; i < bits.length; i++) {
    if (bits[i] !== bits[i-1]) runs++;
  }
  return bits.length / runs;
}`,
  'compression_ratio': `function calculate(bits) {
  // Simple LZ-style compression estimate
  const patterns = new Set();
  for (let i = 0; i <= bits.length - 8; i++) {
    patterns.add(bits.slice(i, i + 8));
  }
  const uniqueRatio = patterns.size / (bits.length / 8);
  return 1 / uniqueRatio;
}`,
};

export const MetricsCodeEditor = () => {
  const [selectedMetric, setSelectedMetric] = useState<PredefinedMetric | null>(null);
  const [editForm, setEditForm] = useState<Partial<PredefinedMetric>>({});
  const [isNew, setIsNew] = useState(false);
  const [, forceUpdate] = useState({});
  const [testResult, setTestResult] = useState<{ success: boolean; value?: number; error?: string } | null>(null);

  useEffect(() => {
    const unsubscribe = predefinedManager.subscribe(() => forceUpdate({}));
    return unsubscribe;
  }, []);

  const metrics = predefinedManager.getAllMetrics();

  const getMetricReferences = (metricId: string): MetricReference => {
    const usedIn: string[] = [];
    const dependsOn: string[] = [];
    
    const metric = predefinedManager.getMetric(metricId);
    if (!metric) return { usedIn: [], dependsOn: [], formula: '' };

    metrics.forEach(m => {
      if (m.id !== metricId && m.formula.includes(metricId)) {
        usedIn.push(m.name);
      }
      if (metric.formula.includes(m.id)) {
        dependsOn.push(m.name);
      }
    });

    if (localStorage.getItem('bitwise_strategies')?.includes(metricId)) {
      usedIn.push('Strategy Files');
    }

    return { usedIn, dependsOn, formula: metric.formula };
  };

  const handleSelectMetric = (metric: PredefinedMetric) => {
    setSelectedMetric(metric);
    setEditForm({ ...metric });
    setIsNew(false);
    setTestResult(null);
  };

  const handleNewMetric = () => {
    setSelectedMetric(null);
    setEditForm({
      id: '',
      name: '',
      description: '',
      formula: '',
      unit: '',
      category: 'Custom',
      isCodeBased: false,
      code: DEFAULT_METRIC_CODE,
    });
    setIsNew(true);
    setTestResult(null);
  };

  const handleSave = () => {
    if (!editForm.id || !editForm.name) {
      toast.error('ID and Name are required');
      return;
    }

    if (!editForm.isCodeBased && !editForm.formula) {
      toast.error('Formula is required in formula mode');
      return;
    }

    if (editForm.isCodeBased && !editForm.code) {
      toast.error('Code is required in code mode');
      return;
    }

    const metric: PredefinedMetric = {
      id: editForm.id,
      name: editForm.name,
      description: editForm.description || '',
      formula: editForm.formula || '',
      unit: editForm.unit,
      category: editForm.category,
      isCodeBased: editForm.isCodeBased,
      code: editForm.isCodeBased ? editForm.code : undefined,
    };

    if (isNew) {
      predefinedManager.addMetric(metric);
      toast.success('Metric created');
    } else {
      predefinedManager.updateMetric(metric.id, metric);
      toast.success('Metric updated');
    }

    setSelectedMetric(metric);
    setIsNew(false);
  };

  const handleDelete = () => {
    if (selectedMetric) {
      predefinedManager.deleteMetric(selectedMetric.id);
      setSelectedMetric(null);
      setEditForm({});
      toast.success('Metric deleted');
    }
  };

  const handleTestCode = () => {
    if (!editForm.code) {
      setTestResult({ success: false, error: 'No code to test' });
      return;
    }

    // Get bits from active file
    const activeFile = fileSystemManager.getActiveFile();
    let testBits = '10101010'; // Default test bits
    if (activeFile?.state?.model) {
      const modelBits = activeFile.state.model.getBits();
      testBits = modelBits.slice(0, 1000); // Use first 1000 bits
    }

    try {
      const fn = new Function('bits', editForm.code + '\nreturn calculate(bits);');
      const value = fn(testBits);
      if (typeof value !== 'number') {
        setTestResult({ success: false, error: `Must return a number, got ${typeof value}` });
      } else {
        setTestResult({ success: true, value });
      }
    } catch (error) {
      setTestResult({ success: false, error: (error as Error).message });
    }
  };

  const categories = predefinedManager.getMetricCategories();

  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      {/* Left: Metric List with References */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">Metrics ({metrics.length})</h3>
          <Button size="sm" variant="outline" onClick={handleNewMetric}>
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <Accordion type="multiple" className="space-y-2">
            {categories.map(category => (
              <AccordionItem key={category} value={category} className="border rounded-lg">
                <AccordionTrigger className="px-3 py-2 text-xs hover:no-underline">
                  <span className="uppercase text-muted-foreground">{category}</span>
                </AccordionTrigger>
                <AccordionContent className="px-2 pb-2">
                  <div className="space-y-1">
                    {metrics.filter(m => m.category === category).map(metric => {
                      const refs = getMetricReferences(metric.id);
                      return (
                        <div
                          key={metric.id}
                          className={`p-2 rounded cursor-pointer transition-colors ${
                            selectedMetric?.id === metric.id
                              ? 'bg-primary/20 border border-primary'
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => handleSelectMetric(metric)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {metric.isCodeBased ? (
                                <FileCode className="w-4 h-4 text-cyan-500" />
                              ) : (
                                <Calculator className="w-4 h-4 text-purple-500" />
                              )}
                              <span className="font-medium text-sm">{metric.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {metric.isCodeBased && (
                                <Badge variant="secondary" className="text-xs">Code</Badge>
                              )}
                              {metric.unit && (
                                <Badge variant="outline" className="text-xs">{metric.unit}</Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
                          
                          <div className="flex flex-wrap gap-1 mt-2">
                            {refs.usedIn.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                <Link className="w-3 h-3 mr-1" />
                                Used by {refs.usedIn.length}
                              </Badge>
                            )}
                            {refs.dependsOn.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                Depends on {refs.dependsOn.length}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>
      </div>

      {/* Right: Code Editor */}
      <div className="flex flex-col">
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4" />
                {isNew ? 'New Metric' : selectedMetric?.name || 'Select a metric'}
              </div>
              <div className="flex gap-1">
                {(selectedMetric || isNew) && (
                  <>
                    <Button size="sm" variant="outline" onClick={handleSave}>
                      <Save className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                    {selectedMetric && (
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={handleDelete}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col space-y-3 overflow-auto">
            {(selectedMetric || isNew) ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">ID (unique)</Label>
                    <Input
                      value={editForm.id || ''}
                      onChange={e => setEditForm({ ...editForm, id: e.target.value })}
                      placeholder="entropy"
                      disabled={!isNew}
                      className="h-8 text-sm font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Category</Label>
                    <Input
                      value={editForm.category || ''}
                      onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                      placeholder="Statistics"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={editForm.name || ''}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Shannon Entropy"
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Description</Label>
                  <Input
                    value={editForm.description || ''}
                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Measures information density"
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Unit</Label>
                  <Input
                    value={editForm.unit || ''}
                    onChange={e => setEditForm({ ...editForm, unit: e.target.value })}
                    placeholder="bits"
                    className="h-8 text-sm"
                  />
                </div>

                {/* Code Mode Toggle */}
                <div className="flex items-center justify-between p-2 bg-muted/30 rounded border">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-cyan-500" />
                    <div>
                      <Label className="text-sm font-medium">Code Mode</Label>
                      <p className="text-xs text-muted-foreground">Write executable JavaScript</p>
                    </div>
                  </div>
                  <Switch
                    checked={editForm.isCodeBased || false}
                    onCheckedChange={(checked) => {
                      setEditForm({ 
                        ...editForm, 
                        isCodeBased: checked,
                        code: checked && !editForm.code ? DEFAULT_METRIC_CODE : editForm.code,
                      });
                      setTestResult(null);
                    }}
                  />
                </div>

                {editForm.isCodeBased ? (
                  /* Code Editor */
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">JavaScript Code</Label>
                      <Button size="sm" variant="outline" onClick={handleTestCode}>
                        <Play className="w-3 h-3 mr-1" />
                        Test
                      </Button>
                    </div>
                    <Textarea
                      value={editForm.code || ''}
                      onChange={e => {
                        setEditForm({ ...editForm, code: e.target.value });
                        setTestResult(null);
                      }}
                      placeholder={DEFAULT_METRIC_CODE}
                      className="flex-1 min-h-[150px] font-mono text-xs"
                    />
                    
                    {/* Test Result */}
                    {testResult && (
                      <div className={`p-2 rounded text-xs flex items-center gap-2 ${
                        testResult.success 
                          ? 'bg-green-500/10 text-green-500 border border-green-500/30' 
                          : 'bg-red-500/10 text-red-500 border border-red-500/30'
                      }`}>
                        {testResult.success ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Result: {testResult.value?.toFixed(6)}</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4" />
                            <span>Error: {testResult.error}</span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Code Hints */}
                    <div className="p-2 bg-muted/30 rounded text-xs space-y-1">
                      <p className="font-medium">Function Signature:</p>
                      <code className="text-cyan-500">function calculate(bits: string): number</code>
                      <p className="text-muted-foreground mt-1">
                        <span className="font-medium">bits</span> - Binary string of '0' and '1'
                      </p>
                      <p className="text-muted-foreground">
                        <span className="font-medium">return</span> - Number (the metric value)
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Formula Editor */
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Formula (Documentation)</Label>
                    <Textarea
                      value={editForm.formula || ''}
                      onChange={e => setEditForm({ ...editForm, formula: e.target.value })}
                      placeholder="-Σ(p(x) * log₂(p(x))) for all symbols x"
                      className="flex-1 min-h-[100px] font-mono text-sm"
                    />
                  </div>
                )}

                {/* Show built-in code for non-code-based metrics */}
                {!editForm.isCodeBased && selectedMetric && BUILTIN_METRIC_CODE[selectedMetric.id] && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Built-in Implementation (Read-only)</Label>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          // Test built-in metric
                          const activeFile = fileSystemManager.getActiveFile();
                          let testBits = '10101010';
                          if (activeFile?.state?.model) {
                            testBits = activeFile.state.model.getBits().slice(0, 1000);
                          }
                          try {
                            const fn = new Function('bits', BUILTIN_METRIC_CODE[selectedMetric.id] + '\nreturn calculate(bits);');
                            const value = fn(testBits);
                            setTestResult({ success: true, value });
                          } catch (e) {
                            setTestResult({ success: false, error: (e as Error).message });
                          }
                        }}
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Test
                      </Button>
                    </div>
                    <pre className="p-2 bg-muted/30 rounded text-xs font-mono overflow-auto max-h-32 whitespace-pre-wrap">
                      {BUILTIN_METRIC_CODE[selectedMetric.id]}
                    </pre>
                    
                    {/* Test Result */}
                    {testResult && (
                      <div className={`p-2 rounded text-xs flex items-center gap-2 ${
                        testResult.success 
                          ? 'bg-green-500/10 text-green-500 border border-green-500/30' 
                          : 'bg-red-500/10 text-red-500 border border-red-500/30'
                      }`}>
                        {testResult.success ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Result: {testResult.value?.toFixed(6)}</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4" />
                            <span>Error: {testResult.error}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Documentation for this metric */}
                {selectedMetric && (
                  <div className="p-2 bg-muted/30 rounded text-xs space-y-1">
                    <div className="flex items-center gap-1 font-medium">
                      <Info className="w-3 h-3" />
                      Reference Info
                    </div>
                    <p><span className="text-muted-foreground">Access in code:</span> <code className="text-cyan-500">get_metric("{selectedMetric.id}")</code></p>
                    <p><span className="text-muted-foreground">Returns:</span> number{selectedMetric.unit ? ` (${selectedMetric.unit})` : ''}</p>
                    {getMetricReferences(selectedMetric.id).usedIn.length > 0 && (
                      <p><span className="text-muted-foreground">Used in:</span> {getMetricReferences(selectedMetric.id).usedIn.join(', ')}</p>
                    )}
                    {selectedMetric.isCodeBased && (
                      <p className="text-yellow-500 font-medium mt-2">⚡ Custom code takes priority over built-in implementation</p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Calculator className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>Select a metric to edit or create new</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};