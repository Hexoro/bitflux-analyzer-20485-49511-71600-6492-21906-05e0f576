/**
 * Test Settings Dialog
 * Shows test results, ETA, failure triage, and allows configuration of test scheduling
 */

import { useState, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Settings,
  Zap,
  Activity,
  Code2,
  Clock,
  Play,
  Pause,
  RotateCcw,
  FlaskConical,
  Search,
  Filter,
  Download,
  AlertTriangle,
} from 'lucide-react';
import {
  TestSchedulerSettings,
  loadTestSchedulerSettings,
  saveTestSchedulerSettings,
  resetTestSchedulerSettings,
  formatDuration,
} from '@/lib/testScheduler';
import { SmokeTestSummary } from '@/lib/smokeTests';
import { TestSuiteResults, TestResult } from '@/lib/testSuite';

export interface VectorTestResult {
  category: 'operation' | 'metric';
  id: string;
  description: string;
  passed: boolean;
  expected: string | number;
  actual: string | number;
}

export interface TestState {
  // Smoke tests
  smokeResults: SmokeTestSummary | null;
  
  // Core tests
  coreResults: TestSuiteResults | null;
  coreProgress: { current: number; total: number; category: string; eta?: string };
  isCoreRunning: boolean;
  
  // Extended tests
  vectorSummary: { opPassed: number; opFailed: number; metricPassed: number; metricFailed: number };
  vectorProgress: { current: number; total: number; phase: string; eta?: string };
  vectorFailures: VectorTestResult[];
  isExtendedRunning: boolean;
  extendedDuration: number;
  
  // Overall
  lastRunTime: Date | null;
}

interface TestSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testState: TestState;
  onRunSmoke: () => void;
  onRunCore: () => void;
  onRunExtended: () => void;
  onRunAll: () => void;
  onCancel: () => void;
  settings: TestSchedulerSettings;
  onSettingsChange: (settings: TestSchedulerSettings) => void;
}

export function TestSettingsDialog({
  open,
  onOpenChange,
  testState,
  onRunSmoke,
  onRunCore,
  onRunExtended,
  onRunAll,
  onCancel,
  settings,
  onSettingsChange,
}: TestSettingsDialogProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'operation' | 'metric' | 'core'>('all');
  
  const {
    smokeResults,
    coreResults,
    coreProgress,
    isCoreRunning,
    vectorSummary,
    vectorProgress,
    vectorFailures,
    isExtendedRunning,
    extendedDuration,
    lastRunTime,
  } = testState;

  const isAnyRunning = isCoreRunning || isExtendedRunning;

  // Calculate totals
  const smokePassed = smokeResults?.passed ?? 0;
  const smokeFailed = smokeResults?.failed ?? 0;
  const coreTotal = coreResults?.totalTests ?? 0;
  const corePassed = coreResults?.passed ?? 0;
  const coreFailed = coreResults?.failed ?? 0;
  const extendedTotal = vectorSummary.opPassed + vectorSummary.opFailed + vectorSummary.metricPassed + vectorSummary.metricFailed;
  const extendedPassed = vectorSummary.opPassed + vectorSummary.metricPassed;
  const extendedFailed = vectorSummary.opFailed + vectorSummary.metricFailed;

  const totalTests = (smokeResults?.total ?? 0) + coreTotal + extendedTotal;
  const totalPassed = smokePassed + corePassed + extendedPassed;
  const totalFailed = smokeFailed + coreFailed + extendedFailed;

  // Collect all failures for triage
  const allFailures = useMemo(() => {
    const failures: Array<{
      type: 'core' | 'operation' | 'metric';
      category: string;
      id: string;
      name: string;
      description: string;
      expected?: string | number;
      actual?: string | number;
      message?: string;
    }> = [];

    // Core test failures
    coreResults?.results.filter(r => !r.passed).forEach(test => {
      failures.push({
        type: 'core',
        category: test.category,
        id: test.name,
        name: test.name,
        description: test.message,
        message: test.message,
      });
    });

    // Vector test failures
    vectorFailures.forEach(test => {
      failures.push({
        type: test.category,
        category: test.id,
        id: test.id,
        name: `${test.id}: ${test.description}`,
        description: test.description,
        expected: test.expected,
        actual: test.actual,
      });
    });

    return failures;
  }, [coreResults, vectorFailures]);

  // Get unique categories for filter
  const categories = useMemo(() => {
    const cats = new Set(allFailures.map(f => f.category));
    return Array.from(cats).sort();
  }, [allFailures]);

  // Filter failures
  const filteredFailures = useMemo(() => {
    return allFailures.filter(f => {
      const matchesSearch = searchQuery === '' || 
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || f.category === categoryFilter;
      const matchesType = typeFilter === 'all' || f.type === typeFilter;

      return matchesSearch && matchesCategory && matchesType;
    });
  }, [allFailures, searchQuery, categoryFilter, typeFilter]);

  // Export failures as JSON
  const handleExportFailures = useCallback(() => {
    const exportData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests,
        totalPassed,
        totalFailed,
        smokePassed,
        smokeFailed,
        corePassed,
        coreFailed,
        extendedPassed,
        extendedFailed,
      },
      failures: allFailures,
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-failures-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [allFailures, totalTests, totalPassed, totalFailed, smokePassed, smokeFailed, corePassed, coreFailed, extendedPassed, extendedFailed]);

  const handleSettingChange = <K extends keyof TestSchedulerSettings>(
    key: K,
    value: TestSchedulerSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    saveTestSchedulerSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleResetSettings = () => {
    const defaultSettings = resetTestSchedulerSettings();
    onSettingsChange(defaultSettings);
  };

  // Current progress display
  const currentProgress = isCoreRunning
    ? coreProgress
    : isExtendedRunning
    ? { current: vectorProgress.current, total: vectorProgress.total, category: vectorProgress.phase, eta: vectorProgress.eta }
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FlaskConical className="w-5 h-5 text-primary" />
              <div>
                <DialogTitle>Test Suite</DialogTitle>
                <DialogDescription>
                  {totalTests > 0 
                    ? `${totalPassed}/${totalTests} tests passed`
                    : 'Run tests to verify system integrity'}
                </DialogDescription>
              </div>
            </div>
            
            {/* Quick stats badges */}
            <div className="flex items-center gap-2">
              {totalFailed > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {totalFailed} failed
                </Badge>
              )}
              {totalPassed > 0 && totalFailed === 0 && (
                <Badge className="bg-green-500/20 text-green-500 text-xs">
                  All passed
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Progress bar when running */}
        {isAnyRunning && currentProgress && (
          <div className="px-6 py-3 bg-muted/30 border-b">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                {currentProgress.category}
              </span>
              <div className="flex items-center gap-3">
                <span className="font-mono">
                  {currentProgress.current}/{currentProgress.total}
                </span>
                {currentProgress.eta && (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    ETA: {currentProgress.eta}
                  </span>
                )}
              </div>
            </div>
            <Progress 
              value={(currentProgress.current / currentProgress.total) * 100} 
              className="h-1.5"
            />
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-6 mt-4 grid w-auto grid-cols-4">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="failures" className="text-xs">
              Failures {totalFailed > 0 && `(${totalFailed})`}
            </TabsTrigger>
            <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs">Settings</TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 overflow-hidden">
            {/* Overview Tab */}
            <TabsContent value="overview" className="h-full m-0 p-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                {/* Smoke Tests Card */}
                <Card className={smokeFailed > 0 ? 'border-destructive/50' : smokeResults ? 'border-green-500/50' : ''}>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Smoke Tests
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="flex items-baseline justify-between">
                      <span className={`text-2xl font-bold ${
                        smokeFailed > 0 ? 'text-destructive' : 
                        smokeResults ? 'text-green-500' : 'text-muted-foreground'
                      }`}>
                        {smokeResults ? `${smokePassed}/${smokeResults.total}` : '—'}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={onRunSmoke}
                        disabled={isAnyRunning}
                      >
                        <RefreshCw className="w-3 h-3" />
                      </Button>
                    </div>
                    {smokeResults && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDuration(smokeResults.durationMs)}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Core Tests Card */}
                <Card className={coreFailed > 0 ? 'border-destructive/50' : coreResults ? 'border-green-500/50' : ''}>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Code2 className="w-4 h-4" />
                      Core Tests
                      {isCoreRunning && <Loader2 className="w-3 h-3 animate-spin" />}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="flex items-baseline justify-between">
                      <span className={`text-2xl font-bold ${
                        coreFailed > 0 ? 'text-destructive' : 
                        coreResults ? 'text-green-500' : 'text-muted-foreground'
                      }`}>
                        {coreResults ? `${corePassed}/${coreTotal}` : isCoreRunning ? `${coreProgress.current}/?` : '—'}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={onRunCore}
                        disabled={isAnyRunning}
                      >
                        <RefreshCw className="w-3 h-3" />
                      </Button>
                    </div>
                    {coreResults && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDuration(coreResults.duration)}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Extended Tests Card */}
                <Card className={extendedFailed > 0 ? 'border-destructive/50' : extendedTotal > 0 ? 'border-green-500/50' : ''}>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Extended Tests
                      {isExtendedRunning && <Loader2 className="w-3 h-3 animate-spin" />}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="flex items-baseline justify-between">
                      <span className={`text-2xl font-bold ${
                        extendedFailed > 0 ? 'text-destructive' : 
                        extendedTotal > 0 ? 'text-green-500' : 'text-muted-foreground'
                      }`}>
                        {extendedTotal > 0 
                          ? `${extendedPassed}/${extendedTotal}` 
                          : isExtendedRunning 
                            ? `${vectorProgress.current}/${vectorProgress.total || '?'}` 
                            : '—'}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={onRunExtended}
                        disabled={isAnyRunning}
                      >
                        <RefreshCw className="w-3 h-3" />
                      </Button>
                    </div>
                    {extendedTotal > 0 && extendedDuration > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDuration(extendedDuration)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {lastRunTime && (
                    <span>Last run: {lastRunTime.toLocaleTimeString()}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isAnyRunning ? (
                    <Button variant="destructive" size="sm" onClick={onCancel}>
                      <Pause className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  ) : (
                    <Button onClick={onRunAll} size="sm">
                      <Play className="w-4 h-4 mr-2" />
                      Run All Tests
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Failures Tab - Enhanced Triage UI */}
            <TabsContent value="failures" className="h-full m-0 p-0">
              <div className="p-4 border-b space-y-3">
                {/* Search and filters */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search failures..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-8 text-sm"
                    />
                  </div>
                  <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                    <SelectTrigger className="w-[120px] h-8">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="core">Core</SelectItem>
                      <SelectItem value="operation">Operations</SelectItem>
                      <SelectItem value="metric">Metrics</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={handleExportFailures}
                    disabled={allFailures.length === 0}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Export
                  </Button>
                </div>
                
                {/* Summary stats */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>
                    Showing {filteredFailures.length} of {allFailures.length} failures
                  </span>
                  {allFailures.length > 0 && (
                    <>
                      <span className="flex items-center gap-1">
                        <Badge variant="outline" className="h-4 px-1 text-[10px]">CORE</Badge>
                        {allFailures.filter(f => f.type === 'core').length}
                      </span>
                      <span className="flex items-center gap-1">
                        <Badge variant="outline" className="h-4 px-1 text-[10px]">OP</Badge>
                        {allFailures.filter(f => f.type === 'operation').length}
                      </span>
                      <span className="flex items-center gap-1">
                        <Badge variant="outline" className="h-4 px-1 text-[10px]">METRIC</Badge>
                        {allFailures.filter(f => f.type === 'metric').length}
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              <ScrollArea className="h-[340px]">
                <div className="p-4 space-y-2">
                  {filteredFailures.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      {allFailures.length === 0 ? (
                        <>
                          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500/50" />
                          <p>No failures detected</p>
                        </>
                      ) : (
                        <>
                          <Filter className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>No failures match your filters</p>
                          <Button 
                            variant="link" 
                            size="sm" 
                            onClick={() => {
                              setSearchQuery('');
                              setCategoryFilter('all');
                              setTypeFilter('all');
                            }}
                          >
                            Clear filters
                          </Button>
                        </>
                      )}
                    </div>
                  ) : (
                    filteredFailures.map((failure, i) => (
                      <Card key={`failure-${i}`} className="border-destructive/30">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline" 
                                className={`text-[10px] font-mono ${
                                  failure.type === 'core' ? 'border-blue-500 text-blue-500' :
                                  failure.type === 'operation' ? 'border-orange-500 text-orange-500' :
                                  'border-purple-500 text-purple-500'
                                }`}
                              >
                                {failure.type.toUpperCase()}
                              </Badge>
                              <Badge variant="secondary" className="text-[10px] font-mono">
                                {failure.category}
                              </Badge>
                            </div>
                            <XCircle className="w-3 h-3 text-destructive" />
                          </div>
                          <p className="text-sm font-medium truncate" title={failure.name}>
                            {failure.name}
                          </p>
                          {failure.expected !== undefined && (
                            <div className="flex gap-4 font-mono text-[10px] mt-2 bg-muted/50 p-2 rounded">
                              <div className="flex-1">
                                <span className="text-muted-foreground">Expected: </span>
                                <span className="text-green-600 break-all">
                                  {String(failure.expected).slice(0, 50)}
                                  {String(failure.expected).length > 50 && '...'}
                                </span>
                              </div>
                              <div className="flex-1">
                                <span className="text-muted-foreground">Actual: </span>
                                <span className="text-destructive break-all">
                                  {String(failure.actual).slice(0, 50)}
                                  {String(failure.actual).length > 50 && '...'}
                                </span>
                              </div>
                            </div>
                          )}
                          {failure.message && failure.expected === undefined && (
                            <p className="text-xs text-muted-foreground mt-1 truncate" title={failure.message}>
                              {failure.message}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="details" className="h-full m-0 p-0">
              <ScrollArea className="h-[400px]">
                <div className="p-6">
                  {/* Smoke test details */}
                  {smokeResults && (
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Smoke Tests ({smokeResults.passed}/{smokeResults.total})
                      </h4>
                      <div className="space-y-1">
                        {smokeResults.results.map((r, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs py-1">
                            {r.passed ? (
                              <CheckCircle className="w-3 h-3 text-green-500" />
                            ) : (
                              <XCircle className="w-3 h-3 text-destructive" />
                            )}
                            <span className={r.passed ? '' : 'text-destructive'}>{r.name}</span>
                            <span className="text-muted-foreground ml-auto">{r.durationMs.toFixed(1)}ms</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Core test categories */}
                  {coreResults && (
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Code2 className="w-4 h-4" />
                        Core Tests ({coreResults.passed}/{coreResults.totalTests})
                      </h4>
                      <div className="space-y-1">
                        {Object.entries(
                          coreResults.results.reduce((acc, r) => {
                            if (!acc[r.category]) acc[r.category] = { passed: 0, failed: 0 };
                            if (r.passed) acc[r.category].passed++;
                            else acc[r.category].failed++;
                            return acc;
                          }, {} as Record<string, { passed: number; failed: number }>)
                        ).map(([cat, stats]) => (
                          <div key={cat} className="flex items-center gap-2 text-xs py-1">
                            {stats.failed === 0 ? (
                              <CheckCircle className="w-3 h-3 text-green-500" />
                            ) : (
                              <XCircle className="w-3 h-3 text-destructive" />
                            )}
                            <span>{cat}</span>
                            <span className="text-muted-foreground ml-auto">
                              {stats.passed}/{stats.passed + stats.failed}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Extended test summary */}
                  {extendedTotal > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Extended Tests ({extendedPassed}/{extendedTotal})
                      </h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2 py-1">
                          {vectorSummary.opFailed === 0 ? (
                            <CheckCircle className="w-3 h-3 text-green-500" />
                          ) : (
                            <XCircle className="w-3 h-3 text-destructive" />
                          )}
                          <span>Operations</span>
                          <span className="text-muted-foreground ml-auto">
                            {vectorSummary.opPassed}/{vectorSummary.opPassed + vectorSummary.opFailed}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 py-1">
                          {vectorSummary.metricFailed === 0 ? (
                            <CheckCircle className="w-3 h-3 text-green-500" />
                          ) : (
                            <XCircle className="w-3 h-3 text-destructive" />
                          )}
                          <span>Metrics</span>
                          <span className="text-muted-foreground ml-auto">
                            {vectorSummary.metricPassed}/{vectorSummary.metricPassed + vectorSummary.metricFailed}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {!smokeResults && !coreResults && extendedTotal === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <FlaskConical className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No test results yet</p>
                      <p className="text-xs mt-1">Run tests to see detailed results</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="h-full m-0 p-0">
              <ScrollArea className="h-[400px]">
                <div className="p-6 space-y-6">
                  {/* Auto-run toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="auto-run">Auto-run tests</Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically run tests when idle
                      </p>
                    </div>
                    <Switch
                      id="auto-run"
                      checked={settings.autoRunEnabled}
                      onCheckedChange={(checked) => handleSettingChange('autoRunEnabled', checked)}
                    />
                  </div>

                  {settings.autoRunEnabled && (
                    <>
                      {/* Core idle delay */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Core tests idle delay</Label>
                          <span className="text-sm font-mono">{settings.coreIdleDelaySec}s</span>
                        </div>
                        <Slider
                          value={[settings.coreIdleDelaySec]}
                          onValueChange={([v]) => handleSettingChange('coreIdleDelaySec', v)}
                          min={5}
                          max={120}
                          step={5}
                        />
                        <p className="text-xs text-muted-foreground">
                          Wait this long after last activity before starting core tests
                        </p>
                      </div>

                      {/* Extended idle delay */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Extended tests delay</Label>
                          <span className="text-sm font-mono">{settings.extendedIdleDelaySec}s</span>
                        </div>
                        <Slider
                          value={[settings.extendedIdleDelaySec]}
                          onValueChange={([v]) => handleSettingChange('extendedIdleDelaySec', v)}
                          min={30}
                          max={300}
                          step={10}
                        />
                        <p className="text-xs text-muted-foreground">
                          Additional idle time after core tests before starting extended tests
                        </p>
                      </div>
                    </>
                  )}

                  {/* Batch size */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Batch size</Label>
                      <span className="text-sm font-mono">{settings.extendedBatchSize}</span>
                    </div>
                    <Slider
                      value={[settings.extendedBatchSize]}
                      onValueChange={([v]) => handleSettingChange('extendedBatchSize', v)}
                      min={1}
                      max={10}
                      step={1}
                    />
                    <p className="text-xs text-muted-foreground">
                      Smaller = smoother UI, larger = faster completion
                    </p>
                  </div>

                  {/* Show failure notifications */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="show-notifications">Failure notifications</Label>
                      <p className="text-xs text-muted-foreground">
                        Show popup when failures are detected
                      </p>
                    </div>
                    <Switch
                      id="show-notifications"
                      checked={settings.showFailureNotifications}
                      onCheckedChange={(checked) => handleSettingChange('showFailureNotifications', checked)}
                    />
                  </div>

                  {/* Reset button */}
                  <div className="pt-4 border-t">
                    <Button variant="outline" size="sm" onClick={handleResetSettings}>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset to Defaults
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
