/**
 * Viewer Tab for Backend Mode
 * View raw code of any file in the program
 * Now includes Built-in Code Display for operations and metrics
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileCode,
  Search,
  Copy,
  Download,
  Eye,
  Binary,
  FileText,
  Code,
  Zap,
  Activity,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { fileSystemManager, BinaryFile } from '@/lib/fileSystemManager';
import { pythonModuleSystem } from '@/lib/pythonModuleSystem';
import { predefinedManager } from '@/lib/predefinedManager';
import { getImplementedOperations } from '@/lib/operationsRouter';
import { getImplementedMetrics } from '@/lib/metricsCalculator';

// Built-in operation code definitions
const OPERATION_CODE: Record<string, string> = {
  NOT: `function execute(bits, params) {
  let result = '';
  for (const bit of bits) {
    result += bit === '1' ? '0' : '1';
  }
  return result;
}`,
  AND: `function execute(bits, params) {
  const mask = params.mask || '1'.repeat(bits.length);
  let result = '';
  for (let i = 0; i < bits.length; i++) {
    result += (bits[i] === '1' && mask[i % mask.length] === '1') ? '1' : '0';
  }
  return result;
}`,
  OR: `function execute(bits, params) {
  const mask = params.mask || '0'.repeat(bits.length);
  let result = '';
  for (let i = 0; i < bits.length; i++) {
    result += (bits[i] === '1' || mask[i % mask.length] === '1') ? '1' : '0';
  }
  return result;
}`,
  XOR: `function execute(bits, params) {
  const mask = params.mask || '0'.repeat(bits.length);
  let result = '';
  for (let i = 0; i < bits.length; i++) {
    result += bits[i] !== mask[i % mask.length] ? '1' : '0';
  }
  return result;
}`,
  SHL: `function execute(bits, params) {
  const count = params.count || 1;
  return bits.slice(count) + '0'.repeat(count);
}`,
  SHR: `function execute(bits, params) {
  const count = params.count || 1;
  return '0'.repeat(count) + bits.slice(0, -count);
}`,
  ROL: `function execute(bits, params) {
  const count = params.count % bits.length;
  return bits.slice(count) + bits.slice(0, count);
}`,
  ROR: `function execute(bits, params) {
  const count = params.count % bits.length;
  return bits.slice(-count) + bits.slice(0, -count);
}`,
  REVERSE: `function execute(bits, params) {
  return bits.split('').reverse().join('');
}`,
  GRAY: `function execute(bits, params) {
  let result = bits[0];
  for (let i = 1; i < bits.length; i++) {
    result += bits[i - 1] === bits[i] ? '0' : '1';
  }
  return result;
}`,
  INC: `function execute(bits, params) {
  let carry = 1;
  let result = '';
  for (let i = bits.length - 1; i >= 0; i--) {
    const sum = parseInt(bits[i]) + carry;
    result = (sum % 2) + result;
    carry = Math.floor(sum / 2);
  }
  return result;
}`,
  DEC: `function execute(bits, params) {
  let borrow = 1;
  let result = '';
  for (let i = bits.length - 1; i >= 0; i--) {
    const bit = parseInt(bits[i]) - borrow;
    if (bit < 0) {
      result = '1' + result;
      borrow = 1;
    } else {
      result = bit.toString() + result;
      borrow = 0;
    }
  }
  return result;
}`,
  BSWAP: `function execute(bits, params) {
  const bytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    bytes.push(bits.slice(i, i + 8));
  }
  return bytes.reverse().join('');
}`,
  POPCNT: `function execute(bits, params) {
  let count = 0;
  for (const bit of bits) {
    if (bit === '1') count++;
  }
  return count.toString(2).padStart(bits.length, '0');
}`,
  INTERLEAVE: `function execute(bits, params) {
  const other = params.value || '0'.repeat(bits.length);
  let result = '';
  for (let i = 0; i < bits.length; i++) {
    result += bits[i] + (other[i] || '0');
  }
  return result.slice(0, bits.length);
}`,
};

// Built-in metric code definitions
const METRIC_CODE: Record<string, string> = {
  entropy: `function calculate(bits) {
  const ones = bits.split('').filter(b => b === '1').length;
  const zeros = bits.length - ones;
  if (ones === 0 || zeros === 0) return 0;
  const p1 = ones / bits.length;
  const p0 = zeros / bits.length;
  return -(p1 * Math.log2(p1) + p0 * Math.log2(p0));
}`,
  balance: `function calculate(bits) {
  const ones = bits.split('').filter(b => b === '1').length;
  return ones / bits.length;
}`,
  hamming_weight: `function calculate(bits) {
  return bits.split('').filter(b => b === '1').length;
}`,
  transition_count: `function calculate(bits) {
  let transitions = 0;
  for (let i = 1; i < bits.length; i++) {
    if (bits[i] !== bits[i - 1]) transitions++;
  }
  return transitions;
}`,
  run_length_avg: `function calculate(bits) {
  let runs = 0, totalLen = 0, currentLen = 1;
  for (let i = 1; i < bits.length; i++) {
    if (bits[i] === bits[i - 1]) {
      currentLen++;
    } else {
      runs++;
      totalLen += currentLen;
      currentLen = 1;
    }
  }
  runs++;
  totalLen += currentLen;
  return totalLen / runs;
}`,
  chi_square: `function calculate(bits) {
  const ones = bits.split('').filter(b => b === '1').length;
  const zeros = bits.length - ones;
  const expected = bits.length / 2;
  return ((ones - expected) ** 2 + (zeros - expected) ** 2) / expected;
}`,
  parity: `function calculate(bits) {
  let parity = 0;
  for (const bit of bits) {
    if (bit === '1') parity ^= 1;
  }
  return parity;
}`,
  leading_zeros: `function calculate(bits) {
  let count = 0;
  for (const bit of bits) {
    if (bit === '1') break;
    count++;
  }
  return count;
}`,
  trailing_zeros: `function calculate(bits) {
  let count = 0;
  for (let i = bits.length - 1; i >= 0; i--) {
    if (bits[i] === '1') break;
    count++;
  }
  return count;
}`,
  symmetry_index: `function calculate(bits) {
  let matches = 0;
  const half = Math.floor(bits.length / 2);
  for (let i = 0; i < half; i++) {
    if (bits[i] === bits[bits.length - 1 - i]) matches++;
  }
  return matches / half;
}`,
};

export const ViewerTab = () => {
  const [files, setFiles] = useState<BinaryFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'binary' | 'hex' | 'ascii'>('binary');
  const [activeTab, setActiveTab] = useState<'files' | 'operations' | 'metrics'>('files');
  const [selectedOpId, setSelectedOpId] = useState<string | null>(null);
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null);

  useEffect(() => {
    const updateFiles = () => {
      setFiles(fileSystemManager.getFiles());
    };
    updateFiles();
    const unsub = fileSystemManager.subscribe(updateFiles);
    return unsub;
  }, []);

  const selectedFile = useMemo(() => {
    if (!selectedFileId) return null;
    return files.find(f => f.id === selectedFileId) || null;
  }, [selectedFileId, files]);

  const algorithmFiles = useMemo(() => {
    return pythonModuleSystem.getAllFiles();
  }, []);

  const filteredFiles = useMemo(() => {
    if (!searchQuery) return files;
    return files.filter(f => 
      f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [files, searchQuery]);

  const implementedOps = useMemo(() => getImplementedOperations(), []);
  const implementedMetrics = useMemo(() => getImplementedMetrics(), []);
  const allOperations = useMemo(() => predefinedManager.getAllOperations(), []);
  const allMetrics = useMemo(() => predefinedManager.getAllMetrics(), []);

  const formatBits = (bits: string) => {
    if (viewMode === 'binary') {
      // Split into bytes
      const bytes: string[] = [];
      for (let i = 0; i < bits.length; i += 8) {
        bytes.push(bits.slice(i, i + 8).padEnd(8, '0'));
      }
      return bytes.join(' ');
    } else if (viewMode === 'hex') {
      // Convert to hex
      const hexBytes: string[] = [];
      for (let i = 0; i < bits.length; i += 8) {
        const byte = bits.slice(i, i + 8).padEnd(8, '0');
        hexBytes.push(parseInt(byte, 2).toString(16).toUpperCase().padStart(2, '0'));
      }
      return hexBytes.join(' ');
    } else {
      // ASCII
      const chars: string[] = [];
      for (let i = 0; i < bits.length; i += 8) {
        const byte = bits.slice(i, i + 8).padEnd(8, '0');
        const charCode = parseInt(byte, 2);
        chars.push(charCode >= 32 && charCode < 127 ? String.fromCharCode(charCode) : '.');
      }
      return chars.join('');
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleDownload = () => {
    if (!selectedFile) return;
    const bits = selectedFile.state.model.getBits();
    const content = formatBits(bits);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedFile.name}_${viewMode}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('File downloaded');
  };

  const getOperationCode = (opId: string): string | null => {
    // Check if custom code exists in predefinedManager
    const opDef = predefinedManager.getOperation(opId);
    if (opDef?.isCodeBased && opDef.code) {
      return opDef.code;
    }
    // Return built-in code
    return OPERATION_CODE[opId] || null;
  };

  const getMetricCode = (metricId: string): string | null => {
    // Check if custom code exists in predefinedManager
    const metricDef = predefinedManager.getMetric(metricId);
    if (metricDef?.isCodeBased && metricDef.code) {
      return metricDef.code;
    }
    // Return built-in code
    return METRIC_CODE[metricId] || null;
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <Card className="bg-gradient-to-r from-primary/10 to-transparent border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Code & File Viewer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              View file contents, operation implementations, and metric calculations.
            </p>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="w-full">
            <TabsTrigger value="files" className="flex-1 gap-1">
              <FileCode className="w-4 h-4" />
              Files
            </TabsTrigger>
            <TabsTrigger value="operations" className="flex-1 gap-1">
              <Zap className="w-4 h-4" />
              Operations ({implementedOps.length})
            </TabsTrigger>
            <TabsTrigger value="metrics" className="flex-1 gap-1">
              <Activity className="w-4 h-4" />
              Metrics ({implementedMetrics.length})
            </TabsTrigger>
          </TabsList>

          {/* Files Tab */}
          <TabsContent value="files" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileCode className="w-4 h-4" />
                  Select File
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search files..."
                    className="pl-9"
                  />
                </div>

                <div className="space-y-2 max-h-48 overflow-auto">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase">Binary Files</h4>
                  {filteredFiles.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No files found</p>
                  ) : (
                    filteredFiles.map(file => (
                      <div
                        key={file.id}
                        className={`p-2 rounded border cursor-pointer transition-colors ${
                          selectedFileId === file.id
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedFileId(file.id)}
                      >
                        <div className="flex items-center gap-2">
                          <Binary className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">{file.name}</span>
                          <Badge variant="secondary" className="text-xs ml-auto">
                            {file.state.model.getBits().length} bits
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {algorithmFiles.length > 0 && (
                  <>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase mt-4">Algorithm Files</h4>
                    {algorithmFiles.map(file => (
                      <div
                        key={file.id}
                        className="p-2 rounded border border-border hover:border-primary/50 cursor-pointer"
                        onClick={() => toast.info(`Algorithm file: ${file.name}\n${file.content.slice(0, 200)}...`)}
                      >
                        <div className="flex items-center gap-2">
                          <Code className="w-4 h-4 text-accent" />
                          <span className="text-sm font-medium">{file.name}</span>
                          <Badge variant="outline" className="text-xs ml-auto">
                            {file.group}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>

            {/* File Content */}
            {selectedFile && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      {selectedFile.name}
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
                        <SelectTrigger className="w-24 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="binary">Binary</SelectItem>
                          <SelectItem value="hex">Hex</SelectItem>
                          <SelectItem value="ascii">ASCII</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" onClick={() => handleCopy(formatBits(selectedFile.state.model.getBits()))}>
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleDownload}>
                        <Download className="w-3 h-3 mr-1" />
                        Export
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/30 rounded p-3 font-mono text-xs max-h-96 overflow-auto whitespace-pre-wrap break-all">
                    {formatBits(selectedFile.state.model.getBits()).slice(0, 10000)}
                    {selectedFile.state.model.getBits().length > 10000 * 8 && (
                      <span className="text-muted-foreground">... (truncated)</span>
                    )}
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>{selectedFile.state.model.getBits().length} bits</span>
                    <span>{Math.ceil(selectedFile.state.model.getBits().length / 8)} bytes</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Operations Tab */}
          <TabsContent value="operations" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Operation Implementations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-auto">
                  {allOperations.map(op => {
                    const isImplemented = implementedOps.includes(op.id);
                    const hasCode = getOperationCode(op.id) !== null;
                    
                    return (
                      <div
                        key={op.id}
                        className={`p-2 rounded border cursor-pointer transition-colors ${
                          selectedOpId === op.id
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedOpId(selectedOpId === op.id ? null : op.id)}
                      >
                        <div className="flex items-center gap-2">
                          {isImplemented ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className="font-mono text-sm font-medium">{op.id}</span>
                          <span className="text-xs text-muted-foreground">{op.name}</span>
                          <div className="ml-auto flex gap-1">
                            {op.isCodeBased && (
                              <Badge variant="secondary" className="text-xs">custom</Badge>
                            )}
                            {hasCode && (
                              <Badge variant="outline" className="text-xs">code</Badge>
                            )}
                            <Badge variant={isImplemented ? 'default' : 'destructive'} className="text-xs">
                              {isImplemented ? 'implemented' : 'pending'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Operation Code Display */}
            {selectedOpId && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Code className="w-4 h-4" />
                      {selectedOpId} Implementation
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        const code = getOperationCode(selectedOpId);
                        if (code) handleCopy(code);
                      }}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {getOperationCode(selectedOpId) ? (
                    <pre className="bg-muted/30 rounded p-3 font-mono text-xs overflow-auto max-h-80 whitespace-pre-wrap">
                      {getOperationCode(selectedOpId)}
                    </pre>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <XCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No code available for this operation</p>
                      <p className="text-xs mt-1">This operation uses native implementation</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Metrics Tab */}
          <TabsContent value="metrics" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Metric Implementations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-auto">
                  {allMetrics.map(metric => {
                    const isImplemented = implementedMetrics.includes(metric.id);
                    const hasCode = getMetricCode(metric.id) !== null;
                    
                    return (
                      <div
                        key={metric.id}
                        className={`p-2 rounded border cursor-pointer transition-colors ${
                          selectedMetricId === metric.id
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedMetricId(selectedMetricId === metric.id ? null : metric.id)}
                      >
                        <div className="flex items-center gap-2">
                          {isImplemented ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className="font-mono text-sm font-medium">{metric.id}</span>
                          <span className="text-xs text-muted-foreground">{metric.name}</span>
                          <div className="ml-auto flex gap-1">
                            {metric.isCodeBased && (
                              <Badge variant="secondary" className="text-xs">custom</Badge>
                            )}
                            {hasCode && (
                              <Badge variant="outline" className="text-xs">code</Badge>
                            )}
                            <Badge variant={isImplemented ? 'default' : 'destructive'} className="text-xs">
                              {isImplemented ? 'implemented' : 'pending'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Metric Code Display */}
            {selectedMetricId && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Code className="w-4 h-4" />
                      {selectedMetricId} Implementation
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        const code = getMetricCode(selectedMetricId);
                        if (code) handleCopy(code);
                      }}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {getMetricCode(selectedMetricId) ? (
                    <pre className="bg-muted/30 rounded p-3 font-mono text-xs overflow-auto max-h-80 whitespace-pre-wrap">
                      {getMetricCode(selectedMetricId)}
                    </pre>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <XCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No code available for this metric</p>
                      <p className="text-xs mt-1">This metric uses native implementation</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
};
