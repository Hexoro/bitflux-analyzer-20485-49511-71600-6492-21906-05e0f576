/**
 * Operations Code Editor - Write and edit operation definitions with full documentation
 * Supports both parameter-only mode and executable JavaScript code mode
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
  Cog,
  Save,
  Plus,
  Trash2,
  Code,
  Info,
  Link,
  Variable,
  Play,
  CheckCircle2,
  XCircle,
  FileCode,
} from 'lucide-react';
import { toast } from 'sonner';
import { predefinedManager, PredefinedOperation } from '@/lib/predefinedManager';
import { fileSystemManager } from '@/lib/fileSystemManager';

interface OperationReference {
  usedIn: string[];
  costInScoring?: number;
  policies: string[];
}

const DEFAULT_OPERATION_CODE = `function execute(bits, params) {
  // bits is a string of '0' and '1'
  // params has: mask, count, position, etc.
  // Return transformed bits string
  const mask = params.mask || '1'.repeat(bits.length);
  let result = '';
  for (let i = 0; i < bits.length; i++) {
    // XOR example
    result += bits[i] === mask[i % mask.length] ? '0' : '1';
  }
  return result;
}`;

// Built-in operation code snippets for display - ALL operations
const BUILTIN_OPERATION_CODE: Record<string, string> = {
  // Logic Gates
  'NOT': `function execute(bits, params) {
  return bits.split('').map(bit => bit === '0' ? '1' : '0').join('');
}`,
  'AND': `function execute(bits, params) {
  const mask = params.mask || '1'.repeat(bits.length);
  const ext = mask.repeat(Math.ceil(bits.length / mask.length)).slice(0, bits.length);
  return bits.split('').map((b, i) => (b === '1' && ext[i] === '1') ? '1' : '0').join('');
}`,
  'OR': `function execute(bits, params) {
  const mask = params.mask || '0'.repeat(bits.length);
  const ext = mask.repeat(Math.ceil(bits.length / mask.length)).slice(0, bits.length);
  return bits.split('').map((b, i) => (b === '1' || ext[i] === '1') ? '1' : '0').join('');
}`,
  'XOR': `function execute(bits, params) {
  const mask = params.mask || '1'.repeat(bits.length);
  const ext = mask.repeat(Math.ceil(bits.length / mask.length)).slice(0, bits.length);
  return bits.split('').map((b, i) => b !== ext[i] ? '1' : '0').join('');
}`,
  'NAND': `function execute(bits, params) {
  const mask = params.mask || '1'.repeat(bits.length);
  const ext = mask.repeat(Math.ceil(bits.length / mask.length)).slice(0, bits.length);
  return bits.split('').map((b, i) => (b === '1' && ext[i] === '1') ? '0' : '1').join('');
}`,
  'NOR': `function execute(bits, params) {
  const mask = params.mask || '0'.repeat(bits.length);
  const ext = mask.repeat(Math.ceil(bits.length / mask.length)).slice(0, bits.length);
  return bits.split('').map((b, i) => (b === '1' || ext[i] === '1') ? '0' : '1').join('');
}`,
  'XNOR': `function execute(bits, params) {
  const mask = params.mask || '1'.repeat(bits.length);
  const ext = mask.repeat(Math.ceil(bits.length / mask.length)).slice(0, bits.length);
  return bits.split('').map((b, i) => b === ext[i] ? '1' : '0').join('');
}`,
  
  // Shifts
  'SHL': `function execute(bits, params) {
  const amount = params.count || 1;
  if (amount >= bits.length) return '0'.repeat(bits.length);
  return bits.substring(amount) + '0'.repeat(amount);
}`,
  'SHR': `function execute(bits, params) {
  const amount = params.count || 1;
  if (amount >= bits.length) return '0'.repeat(bits.length);
  return '0'.repeat(amount) + bits.substring(0, bits.length - amount);
}`,
  'ASHL': `function execute(bits, params) {
  const amount = params.count || 1;
  const sign = bits[0];
  if (amount >= bits.length) return sign.repeat(bits.length);
  return bits.substring(amount) + '0'.repeat(amount);
}`,
  'ASHR': `function execute(bits, params) {
  const amount = params.count || 1;
  const sign = bits[0];
  if (amount >= bits.length) return sign.repeat(bits.length);
  return sign.repeat(amount) + bits.substring(0, bits.length - amount);
}`,
  
  // Rotations
  'ROL': `function execute(bits, params) {
  const amount = (params.count || 1) % bits.length;
  if (amount === 0) return bits;
  return bits.substring(amount) + bits.substring(0, amount);
}`,
  'ROR': `function execute(bits, params) {
  const amount = (params.count || 1) % bits.length;
  if (amount === 0) return bits;
  return bits.substring(bits.length - amount) + bits.substring(0, bits.length - amount);
}`,
  
  // Bit Manipulation
  'REVERSE': `function execute(bits, params) {
  return bits.split('').reverse().join('');
}`,
  'TRUNCATE': `function execute(bits, params) {
  const count = params.count || bits.length;
  return bits.slice(0, count);
}`,
  'APPEND': `function execute(bits, params) {
  return bits + (params.bits || '');
}`,
  'INSERT': `function execute(bits, params) {
  const pos = params.position || 0;
  const insert = params.bits || '';
  return bits.slice(0, pos) + insert + bits.slice(pos);
}`,
  'DELETE': `function execute(bits, params) {
  const start = params.start || 0;
  const count = params.count || 1;
  return bits.slice(0, start) + bits.slice(start + count);
}`,
  'REPLACE': `function execute(bits, params) {
  const start = params.start || 0;
  const replace = params.bits || '';
  return bits.slice(0, start) + replace + bits.slice(start + replace.length);
}`,
  'MOVE': `function execute(bits, params) {
  const src = params.source || 0;
  const count = params.count || 1;
  const dest = params.dest || 0;
  const segment = bits.slice(src, src + count);
  const without = bits.slice(0, src) + bits.slice(src + count);
  return without.slice(0, dest) + segment + without.slice(dest);
}`,
  
  // Packing & Alignment
  'PAD': `function execute(bits, params) {
  const alignment = params.alignment || 8;
  const padWith = params.value === '1' ? '1' : '0';
  const remainder = bits.length % alignment;
  if (remainder === 0) return bits;
  return bits + padWith.repeat(alignment - remainder);
}`,
  'PAD_LEFT': `function execute(bits, params) {
  const count = params.count || bits.length + 8;
  const padWith = params.value === '1' ? '1' : '0';
  if (bits.length >= count) return bits;
  return padWith.repeat(count - bits.length) + bits;
}`,
  'PAD_RIGHT': `function execute(bits, params) {
  const count = params.count || bits.length + 8;
  const padWith = params.value === '1' ? '1' : '0';
  if (bits.length >= count) return bits;
  return bits + padWith.repeat(count - bits.length);
}`,
  
  // Encoding
  'GRAY': `function execute(bits, params) {
  if (params.direction === 'decode') {
    let result = bits[0];
    for (let i = 1; i < bits.length; i++) {
      result += result[i-1] === bits[i] ? '0' : '1';
    }
    return result;
  }
  // Encode: binary to gray
  let result = bits[0];
  for (let i = 1; i < bits.length; i++) {
    result += bits[i-1] === bits[i] ? '0' : '1';
  }
  return result;
}`,
  'ENDIAN': `function execute(bits, params) {
  const byteSize = 8;
  const bytes = [];
  for (let i = 0; i < bits.length; i += byteSize) {
    bytes.push(bits.slice(i, i + byteSize));
  }
  return bytes.reverse().join('');
}`,
  
  // Arithmetic
  'ADD': `function execute(bits, params) {
  const value = params.value || '1';
  let carry = 0;
  let result = '';
  const a = bits.padStart(Math.max(bits.length, value.length), '0');
  const b = value.padStart(a.length, '0');
  for (let i = a.length - 1; i >= 0; i--) {
    const sum = parseInt(a[i]) + parseInt(b[i]) + carry;
    result = (sum % 2) + result;
    carry = Math.floor(sum / 2);
  }
  return result.slice(-bits.length);
}`,
  'SUB': `function execute(bits, params) {
  const value = params.value || '1';
  // Two's complement subtraction
  const inverted = value.split('').map(b => b === '0' ? '1' : '0').join('');
  let carry = 1;
  let twoComp = '';
  for (let i = inverted.length - 1; i >= 0; i--) {
    const sum = parseInt(inverted[i]) + carry;
    twoComp = (sum % 2) + twoComp;
    carry = Math.floor(sum / 2);
  }
  // Now add bits + twoComp
  let result = '';
  carry = 0;
  const a = bits.padStart(Math.max(bits.length, twoComp.length), '0');
  const b = twoComp.padStart(a.length, '0');
  for (let i = a.length - 1; i >= 0; i--) {
    const sum = parseInt(a[i]) + parseInt(b[i]) + carry;
    result = (sum % 2) + result;
    carry = Math.floor(sum / 2);
  }
  return result.slice(-bits.length);
}`,
  
  // Advanced
  'SWAP': `function execute(bits, params) {
  const mid = Math.floor(bits.length / 2);
  const start1 = params.start || 0;
  const end1 = params.end || mid;
  const start2 = end1;
  const end2 = Math.min(end1 + (end1 - start1), bits.length);
  const seg1 = bits.slice(start1, end1);
  const seg2 = bits.slice(start2, end2);
  return bits.slice(0, start1) + seg2 + bits.slice(end1, start2) + seg1 + bits.slice(end2);
}`,
};

export const OperationsCodeEditor = () => {
  const [selectedOp, setSelectedOp] = useState<PredefinedOperation | null>(null);
  const [editForm, setEditForm] = useState<Partial<PredefinedOperation>>({});
  const [paramInput, setParamInput] = useState({ name: '', type: '', description: '' });
  const [isNew, setIsNew] = useState(false);
  const [, forceUpdate] = useState({});
  const [testResult, setTestResult] = useState<{ success: boolean; result?: string; error?: string } | null>(null);
  const [testParams, setTestParams] = useState<string>('{}');

  useEffect(() => {
    const unsubscribe = predefinedManager.subscribe(() => forceUpdate({}));
    return unsubscribe;
  }, []);

  const operations = predefinedManager.getAllOperations();

  const getOperationReferences = (opId: string): OperationReference => {
    const usedIn: string[] = [];
    const policies: string[] = [];
    let costInScoring: number | undefined;

    try {
      const strategies = localStorage.getItem('bitwise_strategies');
      if (strategies?.includes(opId)) {
        usedIn.push('Strategy Files');
      }

      const scoring = localStorage.getItem('bitwise_scoring_lua');
      if (scoring) {
        const parsed = JSON.parse(scoring);
        for (const file of parsed) {
          const costMatch = file.content.match(new RegExp(`${opId}\\s*=\\s*(\\d+)`));
          if (costMatch) {
            costInScoring = parseInt(costMatch[1]);
          }
        }
      }

      const policiesData = localStorage.getItem('bitwise_policies');
      if (policiesData) {
        const parsed = JSON.parse(policiesData);
        for (const file of parsed) {
          if (file.content.includes(opId)) {
            policies.push(file.name);
          }
        }
      }
    } catch (e) {
      // Ignore parse errors
    }

    return { usedIn, costInScoring, policies };
  };

  const handleSelectOp = (op: PredefinedOperation) => {
    setSelectedOp(op);
    setEditForm({ ...op });
    setIsNew(false);
    setTestResult(null);
  };

  const handleNewOp = () => {
    setSelectedOp(null);
    setEditForm({
      id: '',
      name: '',
      description: '',
      parameters: [],
      category: 'Custom',
      isCodeBased: false,
      code: DEFAULT_OPERATION_CODE,
    });
    setIsNew(true);
    setTestResult(null);
  };

  const handleAddParam = () => {
    if (!paramInput.name || !paramInput.type) {
      toast.error('Parameter name and type required');
      return;
    }

    setEditForm({
      ...editForm,
      parameters: [...(editForm.parameters || []), { ...paramInput }],
    });
    setParamInput({ name: '', type: '', description: '' });
  };

  const handleRemoveParam = (index: number) => {
    setEditForm({
      ...editForm,
      parameters: editForm.parameters?.filter((_, i) => i !== index),
    });
  };

  const handleSave = () => {
    if (!editForm.id || !editForm.name) {
      toast.error('ID and Name are required');
      return;
    }

    if (editForm.isCodeBased && !editForm.code) {
      toast.error('Code is required in code mode');
      return;
    }

    const op: PredefinedOperation = {
      id: editForm.id,
      name: editForm.name,
      description: editForm.description || '',
      parameters: editForm.parameters || [],
      category: editForm.category,
      isCodeBased: editForm.isCodeBased,
      code: editForm.isCodeBased ? editForm.code : undefined,
    };

    if (isNew) {
      predefinedManager.addOperation(op);
      toast.success('Operation created');
    } else {
      predefinedManager.updateOperation(op.id, op);
      toast.success('Operation updated');
    }

    setSelectedOp(op);
    setIsNew(false);
  };

  const handleDelete = () => {
    if (selectedOp) {
      predefinedManager.deleteOperation(selectedOp.id);
      setSelectedOp(null);
      setEditForm({});
      toast.success('Operation deleted');
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
      testBits = modelBits.slice(0, 100); // Use first 100 bits
    }

    let params = {};
    try {
      params = JSON.parse(testParams);
    } catch (e) {
      setTestResult({ success: false, error: 'Invalid JSON params' });
      return;
    }

    try {
      const fn = new Function('bits', 'params', editForm.code + '\nreturn execute(bits, params);');
      const result = fn(testBits, params);
      if (typeof result !== 'string') {
        setTestResult({ success: false, error: `Must return a string, got ${typeof result}` });
      } else {
        setTestResult({ success: true, result: result.slice(0, 50) + (result.length > 50 ? '...' : '') });
      }
    } catch (error) {
      setTestResult({ success: false, error: (error as Error).message });
    }
  };

  const categories = predefinedManager.getOperationCategories();

  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      {/* Left: Operation List with References */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">Operations ({operations.length})</h3>
          <Button size="sm" variant="outline" onClick={handleNewOp}>
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
                    {operations.filter(op => op.category === category).map(op => {
                      const refs = getOperationReferences(op.id);
                      return (
                        <div
                          key={op.id}
                          className={`p-2 rounded cursor-pointer transition-colors ${
                            selectedOp?.id === op.id
                              ? 'bg-primary/20 border border-primary'
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => handleSelectOp(op)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {op.isCodeBased ? (
                                <FileCode className="w-4 h-4 text-cyan-500" />
                              ) : (
                                <Badge variant="outline" className="font-mono text-xs">{op.id}</Badge>
                              )}
                              <span className="text-sm">{op.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {op.isCodeBased && (
                                <Badge variant="secondary" className="text-xs">Code</Badge>
                              )}
                              {refs.costInScoring !== undefined && (
                                <Badge className="bg-cyan-500/20 text-cyan-500 text-xs">
                                  Cost: {refs.costInScoring}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{op.description}</p>
                          
                          {op.parameters && op.parameters.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {op.parameters.map((p, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {p.name}: {p.type}
                                </Badge>
                              ))}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-1 mt-2">
                            {refs.usedIn.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                <Link className="w-3 h-3 mr-1" />
                                Used
                              </Badge>
                            )}
                            {refs.policies.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                In {refs.policies.length} policies
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

      {/* Right: Editor */}
      <div className="flex flex-col">
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Cog className="w-4 h-4" />
                {isNew ? 'New Operation' : selectedOp?.name || 'Select an operation'}
              </div>
              <div className="flex gap-1">
                {(selectedOp || isNew) && (
                  <>
                    <Button size="sm" variant="outline" onClick={handleSave}>
                      <Save className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                    {selectedOp && (
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={handleDelete}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto space-y-3">
            {(selectedOp || isNew) ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">ID (uppercase)</Label>
                    <Input
                      value={editForm.id || ''}
                      onChange={e => setEditForm({ ...editForm, id: e.target.value.toUpperCase() })}
                      placeholder="XOR"
                      disabled={!isNew}
                      className="h-8 text-sm font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Category</Label>
                    <Input
                      value={editForm.category || ''}
                      onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                      placeholder="Logic Gates"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={editForm.name || ''}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="XOR Gate"
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    value={editForm.description || ''}
                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Bitwise exclusive OR operation"
                    className="text-sm min-h-[60px]"
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
                        code: checked && !editForm.code ? DEFAULT_OPERATION_CODE : editForm.code,
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
                      placeholder={DEFAULT_OPERATION_CODE}
                      className="flex-1 min-h-[120px] font-mono text-xs"
                    />
                    
                    {/* Test Params Input */}
                    <div className="space-y-1">
                      <Label className="text-xs">Test Parameters (JSON)</Label>
                      <Input
                        value={testParams}
                        onChange={e => setTestParams(e.target.value)}
                        placeholder='{"mask": "10101010"}'
                        className="h-7 text-xs font-mono"
                      />
                    </div>
                    
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
                            <span className="font-mono">Result: {testResult.result}</span>
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
                      <code className="text-cyan-500">function execute(bits: string, params: object): string</code>
                      <p className="text-muted-foreground mt-1">
                        <span className="font-medium">bits</span> - Binary string of '0' and '1'
                      </p>
                      <p className="text-muted-foreground">
                        <span className="font-medium">params</span> - Object with mask, count, position, etc.
                      </p>
                      <p className="text-muted-foreground">
                        <span className="font-medium">return</span> - Transformed binary string
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Parameters Editor */
                  <div className="space-y-2">
                    <Label className="text-xs">Parameters</Label>
                    
                    {editForm.parameters && editForm.parameters.length > 0 && (
                      <div className="space-y-1">
                        {editForm.parameters.map((p, i) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded text-xs">
                            <div className="flex items-center gap-2">
                              <Variable className="w-3 h-3" />
                              <span className="font-mono">{p.name}</span>
                              <Badge variant="outline">{p.type}</Badge>
                              <span className="text-muted-foreground">{p.description}</span>
                            </div>
                            <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => handleRemoveParam(i)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Input
                        value={paramInput.name}
                        onChange={e => setParamInput({ ...paramInput, name: e.target.value })}
                        placeholder="name"
                        className="h-7 text-xs flex-1"
                      />
                      <Input
                        value={paramInput.type}
                        onChange={e => setParamInput({ ...paramInput, type: e.target.value })}
                        placeholder="type"
                        className="h-7 text-xs w-20"
                      />
                      <Input
                        value={paramInput.description}
                        onChange={e => setParamInput({ ...paramInput, description: e.target.value })}
                        placeholder="description"
                        className="h-7 text-xs flex-1"
                      />
                      <Button size="sm" variant="outline" className="h-7" onClick={handleAddParam}>
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Show built-in code for non-code-based operations */}
                {!editForm.isCodeBased && selectedOp && BUILTIN_OPERATION_CODE[selectedOp.id] && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Built-in Implementation (Read-only)</Label>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          // Test built-in operation
                          const activeFile = fileSystemManager.getActiveFile();
                          let testBits = '10101010';
                          if (activeFile?.state?.model) {
                            testBits = activeFile.state.model.getBits().slice(0, 100);
                          }
                          let params = {};
                          try { params = JSON.parse(testParams); } catch {}
                          try {
                            const fn = new Function('bits', 'params', BUILTIN_OPERATION_CODE[selectedOp.id] + '\nreturn execute(bits, params);');
                            const result = fn(testBits, params);
                            setTestResult({ success: true, result: result.slice(0, 50) + (result.length > 50 ? '...' : '') });
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
                      {BUILTIN_OPERATION_CODE[selectedOp.id]}
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
                            <span className="font-mono">Result: {testResult.result}</span>
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

                {/* Documentation */}
                {selectedOp && (
                  <div className="p-2 bg-muted/30 rounded text-xs space-y-1">
                    <div className="flex items-center gap-1 font-medium">
                      <Info className="w-3 h-3" />
                      Usage in Code
                    </div>
                    <p>
                      <code className="text-cyan-500">
                        apply_operation("{selectedOp.id}"
                        {selectedOp.parameters && selectedOp.parameters.length > 0 && 
                          `, {${selectedOp.parameters.map(p => `"${p.name}": value`).join(', ')}}`
                        })
                      </code>
                    </p>
                    <p><span className="text-muted-foreground">Check allowed:</span> <code className="text-cyan-500">is_operation_allowed("{selectedOp.id}")</code></p>
                    <p><span className="text-muted-foreground">Get cost:</span> <code className="text-cyan-500">get_cost("{selectedOp.id}")</code></p>
                    {selectedOp.isCodeBased && (
                      <p className="text-yellow-500 font-medium mt-2">⚡ Custom code takes priority over built-in implementation</p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Cog className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>Select an operation to edit or create new</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};