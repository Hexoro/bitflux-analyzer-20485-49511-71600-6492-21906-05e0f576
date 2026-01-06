/**
 * Algorithm Panel V8 - Enhanced with Console, Timeline persistence, auto-switch
 * Tabs: Files, Strategy, Timeline, Results, Compare, Metrics, Operations, Console
 */

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  FolderOpen,
  Code,
  Activity,
  Cog,
  ChevronRight,
  ChevronDown,
  Terminal,
  GitCompare,
  Clock,
} from 'lucide-react';
import { predefinedManager } from '@/lib/predefinedManager';
import { ExecutionResult, TransformationStep } from './algorithm/PlayerTab';
import { ResultsTab } from './algorithm/ResultsTab';
import { FilesTabV3 } from './algorithm/FilesTabV3';
import { StrategyTabV3 } from './algorithm/StrategyTabV3';
import { ConsoleTab } from './algorithm/ConsoleTab';
import { ComparisonTab } from './algorithm/ComparisonTab';
import { StrategyExecutionTimeline } from './algorithm/StrategyExecutionTimeline';
import { strategyExecutionEngine } from '@/lib/strategyExecutionEngine';

type AlgorithmTab = 'files' | 'strategy' | 'timeline' | 'results' | 'compare' | 'metrics' | 'operations' | 'console';

export const AlgorithmPanel = () => {
  const [activeTab, setActiveTab] = useState<AlgorithmTab>('files');
  const [currentResult, setCurrentResult] = useState<ExecutionResult | null>(null);
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  const [expandedOperation, setExpandedOperation] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const unsubscribe = predefinedManager.subscribe(() => forceUpdate({}));
    return unsubscribe;
  }, []);

  // Auto-switch to timeline after strategy execution
  useEffect(() => {
    const unsubscribe = strategyExecutionEngine.subscribe((result, status) => {
      if (status === 'completed' && result?.success) {
        setActiveTab('timeline');
      }
      setIsExecuting(status === 'running' || status === 'starting');
    });
    return unsubscribe;
  }, []);

  const metrics = predefinedManager.getAllMetrics();
  const operations = predefinedManager.getAllOperations();
  const metricCategories = predefinedManager.getMetricCategories();
  const operationCategories = predefinedManager.getOperationCategories();

  const handleResultSelect = useCallback((result: ExecutionResult | null) => {
    setCurrentResult(result);
    if (result) {
      setActiveTab('results');
    }
  }, []);

  const handleRunStrategy = useCallback(async (strategy: any) => {
    setIsExecuting(true);
    // After execution completes, useEffect will switch to timeline
  }, []);

  const handleStepChange = useCallback((step: TransformationStep | null) => {
    // Step change handling
  }, []);

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AlgorithmTab)} className="h-full flex flex-col">
      <TabsList className="w-full justify-start rounded-none border-b overflow-x-auto flex-shrink-0">
        <TabsTrigger value="files">
          <FolderOpen className="w-4 h-4 mr-1" />
          Files
        </TabsTrigger>
        <TabsTrigger value="strategy">
          <Code className="w-4 h-4 mr-1" />
          Strategy
        </TabsTrigger>
        <TabsTrigger value="timeline" className="relative">
          <Clock className="w-4 h-4 mr-1" />
          Timeline
          {isExecuting && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
          )}
        </TabsTrigger>
        <TabsTrigger value="results">
          <FileText className="w-4 h-4 mr-1" />
          Results
        </TabsTrigger>
        <TabsTrigger value="compare">
          <GitCompare className="w-4 h-4 mr-1" />
          Compare
        </TabsTrigger>
        <TabsTrigger value="metrics">
          <Activity className="w-4 h-4 mr-1" />
          Metrics
        </TabsTrigger>
        <TabsTrigger value="operations">
          <Cog className="w-4 h-4 mr-1" />
          Operations
        </TabsTrigger>
        <TabsTrigger value="console">
          <Terminal className="w-4 h-4 mr-1" />
          Console
        </TabsTrigger>
      </TabsList>

      <div className="flex-1 overflow-hidden">
        <TabsContent value="files" className="h-full m-0">
          <FilesTabV3 />
        </TabsContent>

        <TabsContent value="strategy" className="h-full m-0">
          <StrategyTabV3 onRunStrategy={handleRunStrategy} isExecuting={isExecuting} />
        </TabsContent>

        <TabsContent value="timeline" className="h-full m-0">
          <ScrollArea className="h-full p-4">
            <StrategyExecutionTimeline isExecuting={isExecuting} />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="results" className="h-full m-0">
          <ResultsTab onSelectResult={handleResultSelect} />
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="compare" className="h-full m-0">
          <ComparisonTab />
        </TabsContent>

        {/* Metrics Tab - Display only */}
        <TabsContent value="metrics" className="h-full m-0">
          <ScrollArea className="h-full p-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Available Metrics ({metrics.length})
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  These metrics are available to all strategies. Edit them in Backend mode.
                </p>
              </CardHeader>
              <CardContent>
                {metricCategories.map(category => (
                  <div key={category} className="mb-4">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">{category}</h4>
                    <div className="space-y-1">
                      {metrics.filter(m => m.category === category).map(metric => (
                        <div
                          key={metric.id}
                          className="border rounded-lg overflow-hidden"
                        >
                          <div
                            className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30"
                            onClick={() => setExpandedMetric(expandedMetric === metric.id ? null : metric.id)}
                          >
                            <div className="flex items-center gap-3">
                              {expandedMetric === metric.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              <div>
                                <span className="font-medium">{metric.name}</span>
                                {metric.unit && <Badge variant="secondary" className="ml-2 text-xs">{metric.unit}</Badge>}
                              </div>
                            </div>
                          </div>
                          {expandedMetric === metric.id && (
                            <div className="px-3 pb-3 pt-1 bg-muted/20 border-t">
                              <p className="text-sm text-muted-foreground mb-2">{metric.description}</p>
                              <div className="font-mono text-xs bg-background/50 p-2 rounded">{metric.formula}</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </ScrollArea>
        </TabsContent>

        {/* Operations Tab - Display only */}
        <TabsContent value="operations" className="h-full m-0">
          <ScrollArea className="h-full p-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Cog className="w-4 h-4" />
                  Available Operations ({operations.length})
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  These operations are available to all strategies. Edit them in Backend mode.
                </p>
              </CardHeader>
              <CardContent>
                {operationCategories.map(category => (
                  <div key={category} className="mb-4">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">{category}</h4>
                    <div className="space-y-1">
                      {operations.filter(op => op.category === category).map(op => (
                        <div key={op.id} className="border rounded-lg overflow-hidden">
                          <div
                            className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30"
                            onClick={() => setExpandedOperation(expandedOperation === op.id ? null : op.id)}
                          >
                            <div className="flex items-center gap-3">
                              {expandedOperation === op.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              <span className="font-mono font-medium">{op.id}</span>
                              <span className="text-muted-foreground">-</span>
                              <span>{op.name}</span>
                            </div>
                          </div>
                          {expandedOperation === op.id && (
                            <div className="px-3 pb-3 pt-1 bg-muted/20 border-t">
                              <p className="text-sm text-muted-foreground mb-2">{op.description}</p>
                              {op.parameters && op.parameters.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {op.parameters.map(p => (
                                    <Badge key={p.name} variant="outline" className="text-xs">{p.name}: {p.type}</Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </ScrollArea>
        </TabsContent>

        {/* Console Tab */}
        <TabsContent value="console" className="h-full m-0">
          <ConsoleTab />
        </TabsContent>
      </div>
    </Tabs>
  );
};