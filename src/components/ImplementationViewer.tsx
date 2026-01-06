/**
 * Implementation Viewer - Shows source code for all built-in operations and metrics
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Code,
  Search,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Play,
  FileCode,
  TestTube,
  Copy,
} from 'lucide-react';
import { predefinedManager } from '@/lib/predefinedManager';
import { 
  getOperationImplementationInfo, 
  getMetricImplementationInfo,
  getImplementationStats,
  OPERATION_TEST_VECTORS,
  METRIC_TEST_VECTORS,
} from '@/lib/implementationRegistry';
import { testOperation, testMetric } from '@/lib/comprehensiveTestSuite';
import { toast } from 'sonner';
import Highlight from 'prism-react-renderer';

interface ImplementationViewerProps {
  type: 'operations' | 'metrics';
}

export const ImplementationViewer = ({ type }: ImplementationViewerProps) => {
  const [search, setSearch] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [testResults, setTestResults] = useState<Record<string, { passed: boolean; results: any[] }>>({});
  
  const items = useMemo(() => {
    if (type === 'operations') {
      return predefinedManager.getAllOperations().map(op => ({
        ...op,
        info: getOperationImplementationInfo(op.id),
        testVectors: OPERATION_TEST_VECTORS[op.id] || [],
      }));
    } else {
      return predefinedManager.getAllMetrics().map(metric => ({
        ...metric,
        info: getMetricImplementationInfo(metric.id),
        testVectors: METRIC_TEST_VECTORS[metric.id] || [],
      }));
    }
  }, [type]);
  
  const filteredItems = useMemo(() => {
    if (!search) return items;
    const lower = search.toLowerCase();
    return items.filter(item => 
      item.id.toLowerCase().includes(lower) ||
      item.name.toLowerCase().includes(lower) ||
      (item.category || '').toLowerCase().includes(lower)
    );
  }, [items, search]);
  
  const stats = useMemo(() => getImplementationStats(), []);
  const typeStats = type === 'operations' ? stats.operations : stats.metrics;
  
  const categorizedItems = useMemo(() => {
    const categories: Record<string, typeof filteredItems> = {};
    for (const item of filteredItems) {
      const cat = item.category || 'Uncategorized';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(item);
    }
    return Object.entries(categories).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredItems]);
  
  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  
  const runTest = (id: string) => {
    if (type === 'operations') {
      const result = testOperation(id);
      setTestResults(prev => ({
        ...prev,
        [id]: {
          passed: result.testResults.every(r => r.pass),
          results: result.testResults,
        },
      }));
      if (result.testResults.every(r => r.pass)) {
        toast.success(`All ${result.testResults.length} tests passed for ${id}`);
      } else {
        const failed = result.testResults.filter(r => !r.pass).length;
        toast.error(`${failed} of ${result.testResults.length} tests failed for ${id}`);
      }
    } else {
      const result = testMetric(id);
      setTestResults(prev => ({
        ...prev,
        [id]: {
          passed: result.testResults.every(r => r.pass),
          results: result.testResults,
        },
      }));
      if (result.testResults.every(r => r.pass)) {
        toast.success(`All ${result.testResults.length} tests passed for ${id}`);
      } else {
        const failed = result.testResults.filter(r => !r.pass).length;
        toast.error(`${failed} of ${result.testResults.length} tests failed for ${id}`);
      }
    }
  };
  
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard');
  };
  
  return (
    <div className="h-full flex flex-col gap-4 p-4">
      {/* Header Stats */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-4">
              <FileCode className="w-5 h-5 text-primary" />
              <span className="font-medium">
                {type === 'operations' ? 'Operations' : 'Metrics'} Implementation Status
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default">
                {typeStats.implemented} / {typeStats.total} Implemented
              </Badge>
              <Badge variant={typeStats.missing.length === 0 ? 'default' : 'secondary'}>
                {((typeStats.implemented / typeStats.total) * 100).toFixed(0)}% Coverage
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={`Search ${type}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>
      
      {/* Items List */}
      <ScrollArea className="flex-1">
        <div className="space-y-4">
          {categorizedItems.map(([category, categoryItems]) => (
            <div key={category}>
              <h3 className="font-semibold text-sm text-muted-foreground mb-2 px-1">
                {category} ({categoryItems.length})
              </h3>
              <div className="space-y-2">
                {categoryItems.map((item) => (
                  <Collapsible
                    key={item.id}
                    open={expandedItems.has(item.id)}
                    onOpenChange={() => toggleExpand(item.id)}
                  >
                    <Card className={item.info.implemented ? '' : 'opacity-60'}>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="py-2 px-3 cursor-pointer hover:bg-accent/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {item.info.implemented ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-destructive" />
                              )}
                              <span className="font-mono text-sm">{item.id}</span>
                              <span className="text-xs text-muted-foreground">
                                {item.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {item.testVectors.length > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  <TestTube className="w-3 h-3 mr-1" />
                                  {item.testVectors.length} tests
                                </Badge>
                              )}
                              {item.info.hasBuiltIn && (
                                <Badge variant="secondary" className="text-xs">Built-in</Badge>
                              )}
                              {item.info.hasCodeBased && (
                                <Badge variant="default" className="text-xs">Code</Badge>
                              )}
                              <ChevronDown className={`w-4 h-4 transition-transform ${expandedItems.has(item.id) ? 'rotate-180' : ''}`} />
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <CardContent className="py-2 px-3 border-t">
                          <div className="space-y-3">
                            {/* Description */}
                            <div className="text-sm text-muted-foreground">
                              {item.description}
                            </div>
                            
                            {/* Source Code */}
                            {item.info.sourceCode && (
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-medium">Source Code</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => copyCode(item.info.sourceCode!)}
                                    className="h-6 px-2"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                </div>
                                <pre className="bg-muted p-2 rounded text-xs overflow-x-auto font-mono">
                                  {item.info.sourceCode}
                                </pre>
                              </div>
                            )}
                            
                            {/* Test Vectors */}
                            {item.testVectors.length > 0 && (
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-medium">
                                    Test Vectors ({item.testVectors.length})
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => runTest(item.id)}
                                    className="h-6 px-2"
                                  >
                                    <Play className="w-3 h-3 mr-1" />
                                    Run Tests
                                  </Button>
                                </div>
                                <div className="space-y-1">
                                  {item.testVectors.slice(0, 3).map((vector, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-xs font-mono bg-muted/50 p-1 rounded">
                                      <span className="text-muted-foreground">
                                        {vector.input} → {String(vector.expected)}
                                      </span>
                                      {testResults[item.id] && (
                                        testResults[item.id].results[idx]?.pass ? (
                                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                                        ) : (
                                          <XCircle className="w-3 h-3 text-destructive" />
                                        )
                                      )}
                                    </div>
                                  ))}
                                  {item.testVectors.length > 3 && (
                                    <span className="text-xs text-muted-foreground">
                                      +{item.testVectors.length - 3} more tests
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Parameters (for operations) */}
                            {'parameters' in item && item.parameters && item.parameters.length > 0 && (
                              <div>
                                <span className="text-xs font-medium">Parameters</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {item.parameters.map((p: any, idx: number) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {p.name}: {p.type}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Formula (for metrics) */}
                            {'formula' in item && item.formula && (
                              <div>
                                <span className="text-xs font-medium">Formula</span>
                                <div className="font-mono text-xs bg-muted/50 p-1 rounded mt-1">
                                  {item.formula}
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ImplementationViewer;
