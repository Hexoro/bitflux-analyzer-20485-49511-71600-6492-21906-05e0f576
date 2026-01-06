/**
 * Results Tab V2 - Enhanced with rich cards, Player button, and comparison feature
 * Displays execution results with full CSV export and sorting
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Download,
  Bookmark,
  BookmarkCheck,
  Trash2,
  FileText,
  Clock,
  Activity,
  CheckCircle2,
  XCircle,
  Tag,
  Plus,
  Search,
  Calendar,
  ArrowUpDown,
  TrendingDown,
  TrendingUp,
  Zap,
  DollarSign,
  BarChart3,
  Play,
  GitCompare,
  X,
  Layers,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { resultsManager, ExecutionResultV2 } from '@/lib/resultsManager';
import { fileSystemManager } from '@/lib/fileSystemManager';
import { ExecutionResult, TransformationStep } from '@/components/algorithm/PlayerTab';

interface ResultsTabProps {
  onSelectResult?: (result: ExecutionResult | null) => void;
}

type SortField = 'date' | 'duration' | 'operations' | 'score' | 'entropy_change' | 'cost';
type SortDirection = 'asc' | 'desc';

export const ResultsTab = ({ onSelectResult }: ResultsTabProps) => {
  const [results, setResults] = useState<ExecutionResultV2[]>([]);
  const [selectedResult, setSelectedResult] = useState<ExecutionResultV2 | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBookmarked, setFilterBookmarked] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Comparison mode
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompareDialog, setShowCompareDialog] = useState(false);

  useEffect(() => {
    setResults(resultsManager.getAllResults());
    const unsubscribe = resultsManager.subscribe(() => {
      setResults(resultsManager.getAllResults());
    });
    return unsubscribe;
  }, []);

  // Sort and filter results
  const sortedResults = useMemo(() => {
    let filtered = results.filter(r => {
      const matchesSearch = r.strategyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesBookmark = !filterBookmarked || r.bookmarked;
      return matchesSearch && matchesBookmark;
    });

    // Sort
    filtered.sort((a, b) => {
      let aVal: number;
      let bVal: number;

      switch (sortField) {
        case 'date':
          aVal = a.startTime;
          bVal = b.startTime;
          break;
        case 'duration':
          aVal = a.duration;
          bVal = b.duration;
          break;
        case 'operations':
          aVal = a.benchmarks.operationCount;
          bVal = b.benchmarks.operationCount;
          break;
        case 'score':
          aVal = a.benchmarks.totalCost || 0;
          bVal = b.benchmarks.totalCost || 0;
          break;
        case 'entropy_change':
          aVal = (a.finalMetrics?.entropy || 0) - (a.initialMetrics?.entropy || 0);
          bVal = (b.finalMetrics?.entropy || 0) - (b.initialMetrics?.entropy || 0);
          break;
        case 'cost':
          aVal = a.benchmarks.totalCost || 0;
          bVal = b.benchmarks.totalCost || 0;
          break;
        default:
          aVal = a.startTime;
          bVal = b.startTime;
      }

      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return filtered;
  }, [results, searchQuery, filterBookmarked, sortField, sortDirection]);

  const handleSelect = (result: ExecutionResultV2) => {
    setSelectedResult(result);
  };

  const handleOpenInPlayer = (result: ExecutionResultV2) => {
    // Prefer using the already-created result file (no extra temp files)
    const existingResultFileId = result.resultFileId && fileSystemManager.getFile(result.resultFileId)
      ? result.resultFileId
      : null;

    let targetFileId = existingResultFileId;
    let targetFileName = existingResultFileId ? (fileSystemManager.getFile(existingResultFileId)?.name || 'result') : '';

    // Fallback (only if we have no stored result file)
    if (!targetFileId) {
      const fileName = `result_${result.strategyName.replace(/\s+/g, '_')}_${Date.now()}.tmp`;
      const tempFile = fileSystemManager.createFile(fileName, result.finalBits, 'binary');
      fileSystemManager.setFileGroup(tempFile.id, 'Results');
      targetFileId = tempFile.id;
      targetFileName = fileName;
    }

    fileSystemManager.setActiveFile(targetFileId);

    // Convert to ExecutionResult format for Player
    const executionResult: ExecutionResult = {
      id: result.id,
      strategyId: result.strategyId,
      strategyName: result.strategyName,
      dataFileId: targetFileId,
      dataFileName: targetFileName,
      initialBits: result.initialBits,
      finalBits: result.finalBits,
      steps: result.steps.map((s, i) => ({
        stepIndex: i,
        operation: s.operation,
        params: s.params || {},
        beforeBits: s.beforeBits,
        afterBits: s.afterBits,
        metrics: s.metrics || {},
        duration: s.duration,
        timestamp: new Date(s.timestamp),
        bitRanges: s.bitRanges || [],
        cost: s.cost || 1,
      })),
      totalDuration: result.duration,
      startTime: new Date(result.startTime),
      endTime: new Date(result.endTime),
      metricsHistory: {},
      success: result.status === 'completed',
      resourceUsage: {
        peakMemory: result.benchmarks.peakMemory,
        cpuTime: result.duration,
        operationsCount: result.steps.length,
      },
      budgetConfig: {
        initial: 1000,
        used: result.benchmarks.totalCost || 0,
        remaining: 1000 - (result.benchmarks.totalCost || 0),
      },
    };

    onSelectResult?.(executionResult);
    toast.success('Opened in Player (highlights shown on the loaded file)');
  };

  const handleExportCSV = (result: ExecutionResultV2) => {
    // Generate comprehensive CSV with all details
    const lines: string[] = [];
    
    // Header section
    lines.push('# ====================================');
    lines.push('# STRATEGY EXECUTION REPORT');
    lines.push('# ====================================');
    lines.push(`# Strategy: ${result.strategyName}`);
    lines.push(`# Executed: ${new Date(result.startTime).toISOString()}`);
    lines.push(`# Duration: ${result.duration}ms`);
    lines.push(`# Status: ${result.status}`);
    lines.push('');
    
    // Summary section
    lines.push('# ====================================');
    lines.push('# SUMMARY');
    lines.push('# ====================================');
    lines.push('Metric,Value');
    lines.push(`Status,${result.status}`);
    lines.push(`Total Steps,${result.steps.length}`);
    lines.push(`Total Operations,${result.benchmarks.operationCount}`);
    lines.push(`Initial Size,${result.initialBits.length} bits`);
    lines.push(`Final Size,${result.finalBits.length} bits`);
    lines.push(`Size Change,${result.finalBits.length - result.initialBits.length} bits`);
    lines.push(`Total Cost,${result.benchmarks.totalCost}`);
    lines.push(`Avg Step Duration,${result.benchmarks.avgStepDuration.toFixed(2)}ms`);
    lines.push(`Peak Memory,${result.benchmarks.peakMemory} bytes`);
    lines.push('');
    
    // Metrics Comparison section
    lines.push('# ====================================');
    lines.push('# METRICS COMPARISON');
    lines.push('# ====================================');
    lines.push('Metric,Initial,Final,Change,Change %');
    if (result.initialMetrics && result.finalMetrics) {
      Object.keys(result.initialMetrics).forEach(key => {
        const initial = result.initialMetrics[key] || 0;
        const final = result.finalMetrics[key] || initial;
        const change = final - initial;
        const changePercent = initial !== 0 ? ((change / initial) * 100).toFixed(2) : 'N/A';
        lines.push(`${key},${initial.toFixed(6)},${final.toFixed(6)},${change >= 0 ? '+' : ''}${change.toFixed(6)},${changePercent}%`);
      });
    }
    lines.push('');
    
    // All Transformations section
    lines.push('# ====================================');
    lines.push('# ALL TRANSFORMATIONS');
    lines.push('# ====================================');
    lines.push('Step,Operation,Parameters,Before Size,After Size,Bits Changed,Duration (ms),Cost');
    result.steps.forEach((step, idx) => {
      const bitsChanged = countChangedBits(step.beforeBits, step.afterBits);
      const cost = (step as any).cost || 1;
      lines.push([
        idx + 1,
        step.operation,
        `"${JSON.stringify(step.params || {}).replace(/"/g, '""')}"`,
        step.beforeBits.length,
        step.afterBits.length,
        bitsChanged,
        step.duration.toFixed(2),
        cost,
      ].join(','));
    });
    lines.push('');
    
    // Operation Summary
    lines.push('# ====================================');
    lines.push('# OPERATION SUMMARY');
    lines.push('# ====================================');
    lines.push('Operation,Count,Total Cost');
    const opCounts: Record<string, { count: number; cost: number }> = {};
    result.steps.forEach(step => {
      const cost = (step as any).cost || 1;
      if (!opCounts[step.operation]) {
        opCounts[step.operation] = { count: 0, cost: 0 };
      }
      opCounts[step.operation].count++;
      opCounts[step.operation].cost += cost;
    });
    Object.entries(opCounts).forEach(([op, data]) => {
      lines.push(`${op},${data.count},${data.cost}`);
    });
    lines.push('');
    
    // Files Used section
    lines.push('# ====================================');
    lines.push('# FILES USED');
    lines.push('# ====================================');
    lines.push('Type,Files');
    lines.push(`Algorithm,${result.filesUsed.algorithm}`);
    lines.push(`Scoring,${result.filesUsed.scoring}`);
    lines.push(`Policy,${result.filesUsed.policy}`);
    lines.push('');
    
    // Tags
    if (result.tags.length > 0) {
      lines.push('# ====================================');
      lines.push('# TAGS');
      lines.push('# ====================================');
      lines.push(`Tags,"${result.tags.join(', ')}"`);
      lines.push('');
    }
    
    // Notes
    if (result.notes) {
      lines.push('# ====================================');
      lines.push('# NOTES');
      lines.push('# ====================================');
      lines.push(`"${result.notes.replace(/"/g, '""')}"`);
    }
    
    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `result_${result.strategyName}_${new Date(result.startTime).toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Full CSV exported with all details');
  };

  const handleExportZIP = async (result: ExecutionResultV2) => {
    try {
      const blob = await resultsManager.exportAsZip(result);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `result_${result.strategyName.replace(/\s+/g, '_')}_${new Date(result.startTime).toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('ZIP exported with CSV, initial data, final data, and step details');
    } catch (error) {
      toast.error('Failed to export ZIP');
      console.error(error);
    }
  };

  const handleExportJSON = (result: ExecutionResultV2) => {
    const json = resultsManager.exportFullReport(result);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `result_${result.strategyName}_${result.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('JSON exported');
  };

  const handleToggleBookmark = (id: string) => {
    resultsManager.toggleBookmark(id);
  };

  const handleDelete = (id: string) => {
    resultsManager.deleteResult(id);
    if (selectedResult?.id === id) {
      setSelectedResult(null);
      onSelectResult?.(null);
    }
    toast.success('Result deleted');
  };

  const handleAddTag = (id: string) => {
    if (newTag.trim()) {
      resultsManager.addTag(id, newTag.trim());
      setNewTag('');
    }
  };

  const handleRemoveTag = (id: string, tag: string) => {
    resultsManager.removeTag(id, tag);
  };

  const handleToggleCompare = (id: string) => {
    if (compareIds.includes(id)) {
      setCompareIds(compareIds.filter(i => i !== id));
    } else if (compareIds.length < 4) {
      setCompareIds([...compareIds, id]);
    } else {
      toast.error('Maximum 4 results can be compared');
    }
  };

  const stats = resultsManager.getStatistics();

  const getEntropyChange = (result: ExecutionResultV2) => {
    if (!result.initialMetrics?.entropy || !result.finalMetrics?.entropy) return null;
    return result.finalMetrics.entropy - result.initialMetrics.entropy;
  };

  // Get results for comparison
  const compareResults = compareIds.map(id => results.find(r => r.id === id)).filter(Boolean) as ExecutionResultV2[];

  return (
    <div className="h-full flex flex-col gap-3 p-4">
      {/* Stats Bar */}
      <Card className="flex-shrink-0">
        <CardContent className="py-2">
          <div className="flex items-center gap-4 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span>{stats.totalResults} results</span>
            </div>
            <div className="flex items-center gap-2">
              <BookmarkCheck className="w-4 h-4 text-muted-foreground" />
              <span>{stats.bookmarkedCount} bookmarked</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>Avg: {stats.avgDuration.toFixed(0)}ms</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
              <span>{stats.successRate.toFixed(0)}% success</span>
            </div>
            <div className="flex-1" />
            <Button
              variant={compareMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setCompareMode(!compareMode);
                if (compareMode) setCompareIds([]);
              }}
            >
              <GitCompare className="w-4 h-4 mr-1" />
              {compareMode ? `Compare (${compareIds.length})` : 'Compare'}
            </Button>
            {compareMode && compareIds.length >= 2 && (
              <Button size="sm" onClick={() => setShowCompareDialog(true)}>
                View Comparison
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Search, Filter, Sort */}
      <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or tag..."
            className="pl-9"
          />
        </div>
        <Button
          variant={filterBookmarked ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterBookmarked(!filterBookmarked)}
        >
          <Bookmark className="w-4 h-4 mr-1" />
          Bookmarked
        </Button>
        <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
          <SelectTrigger className="w-[140px]">
            <ArrowUpDown className="w-4 h-4 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="duration">Duration</SelectItem>
            <SelectItem value="operations">Operations</SelectItem>
            <SelectItem value="entropy_change">Entropy Change</SelectItem>
            <SelectItem value="cost">Cost</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')}
        >
          {sortDirection === 'asc' ? '↑' : '↓'}
        </Button>
      </div>

      <div className="flex-1 flex gap-3 overflow-hidden">
        {/* Results List */}
        <ScrollArea className="w-1/2">
          <div className="space-y-2 pr-2">
            {sortedResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No results found</p>
                <p className="text-sm mt-1">Run a strategy to see results here</p>
              </div>
            ) : (
              sortedResults.map((result) => {
                const entropyChange = getEntropyChange(result);
                const isSelected = selectedResult?.id === result.id;
                const isInCompare = compareIds.includes(result.id);
                
                return (
                  <Card
                    key={result.id}
                    className={`cursor-pointer transition-all ${
                      isSelected ? 'border-primary ring-1 ring-primary' : 'hover:bg-muted/30'
                    } ${isInCompare ? 'bg-blue-500/10' : ''}`}
                    onClick={() => handleSelect(result)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        {/* Compare checkbox */}
                        {compareMode && (
                          <Checkbox
                            checked={isInCompare}
                            onCheckedChange={() => handleToggleCompare(result.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1"
                          />
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-medium truncate">{result.strategyName}</h4>
                            <Badge variant={result.status === 'completed' ? 'default' : 'destructive'} className="text-xs">
                              {result.status}
                            </Badge>
                            {result.bookmarked && (
                              <BookmarkCheck className="w-4 h-4 text-primary flex-shrink-0" />
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(result.startTime).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {result.duration.toFixed(0)}ms
                            </span>
                            <span className="flex items-center gap-1">
                              <Layers className="w-3 h-3" />
                              {result.steps.length} steps
                            </span>
                            {entropyChange !== null && (
                              <span className={`flex items-center gap-1 ${entropyChange < 0 ? 'text-green-500' : entropyChange > 0 ? 'text-red-500' : ''}`}>
                                {entropyChange < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                                {entropyChange >= 0 ? '+' : ''}{entropyChange.toFixed(4)}
                              </span>
                            )}
                            {result.benchmarks.totalCost > 0 && (
                              <span className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                {result.benchmarks.totalCost}
                              </span>
                            )}
                          </div>
                          
                          {result.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {result.tags.map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs px-1">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleToggleBookmark(result.id)}
                          >
                            {result.bookmarked ? (
                              <BookmarkCheck className="w-3 h-3 text-primary" />
                            ) : (
                              <Bookmark className="w-3 h-3" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleExportCSV(result)}
                            title="Export CSV"
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive"
                            onClick={() => handleDelete(result.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Selected Result Detail - Rich Card */}
        <Card className="w-1/2 flex flex-col overflow-hidden">
          {selectedResult ? (
            <>
              <CardHeader className="pb-2 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm truncate">{selectedResult.strategyName}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" onClick={() => handleExportZIP(selectedResult)}>
                      <Package className="w-3 h-3 mr-1" />
                      Export ZIP
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto space-y-4">
                {/* Quick Stats Grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 rounded bg-muted/30 text-center">
                    <div className="text-lg font-bold">{selectedResult.steps.length}</div>
                    <div className="text-xs text-muted-foreground">Steps</div>
                  </div>
                  <div className="p-2 rounded bg-muted/30 text-center">
                    <div className="text-lg font-bold">{selectedResult.benchmarks.totalCost || 0}</div>
                    <div className="text-xs text-muted-foreground">Cost</div>
                  </div>
                  <div className="p-2 rounded bg-muted/30 text-center">
                    <div className="text-lg font-bold">{selectedResult.duration.toFixed(0)}ms</div>
                    <div className="text-xs text-muted-foreground">Duration</div>
                  </div>
                </div>

                {/* Metrics Comparison */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">METRICS COMPARISON</h4>
                  <div className="space-y-1">
                    {selectedResult.initialMetrics && Object.entries(selectedResult.initialMetrics).slice(0, 5).map(([key, initial]) => {
                      const final = selectedResult.finalMetrics?.[key] || initial;
                      const change = final - initial;
                      const isImprovement = key === 'entropy' ? change < 0 : change > 0;
                      
                      return (
                        <div key={key} className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/20">
                          <span className="font-medium">{key}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{initial.toFixed(4)}</span>
                            <span>→</span>
                            <span>{final.toFixed(4)}</span>
                            {change !== 0 && (
                              <Badge variant={isImprovement ? 'default' : 'secondary'} className="text-xs px-1">
                                {change > 0 ? '+' : ''}{change.toFixed(4)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Size Change */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">DATA SIZE</h4>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono">{selectedResult.initialBits.length} bits</span>
                    <span>→</span>
                    <span className="font-mono">{selectedResult.finalBits.length} bits</span>
                    <Badge variant="outline">
                      {selectedResult.finalBits.length - selectedResult.initialBits.length >= 0 ? '+' : ''}
                      {selectedResult.finalBits.length - selectedResult.initialBits.length}
                    </Badge>
                  </div>
                </div>

                {/* Files Used */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">FILES USED</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex gap-2">
                      <span className="text-muted-foreground w-16">Algorithm:</span>
                      <span className="font-mono truncate">{selectedResult.filesUsed.algorithm}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground w-16">Scoring:</span>
                      <span className="font-mono truncate">{selectedResult.filesUsed.scoring}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground w-16">Policy:</span>
                      <span className="font-mono truncate">{selectedResult.filesUsed.policy || 'None'}</span>
                    </div>
                  </div>
                </div>

                {/* Transformations Preview */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">TRANSFORMATIONS ({selectedResult.steps.length})</h4>
                  <div className="space-y-1 max-h-32 overflow-auto">
                    {selectedResult.steps.slice(0, 10).map((step, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs p-1 rounded bg-muted/20">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground w-4">{idx + 1}.</span>
                          <span className="font-mono">{step.operation}</span>
                        </div>
                        <span className="text-muted-foreground">{step.duration.toFixed(1)}ms</span>
                      </div>
                    ))}
                    {selectedResult.steps.length > 10 && (
                      <p className="text-xs text-muted-foreground text-center">+{selectedResult.steps.length - 10} more</p>
                    )}
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">TAGS</h4>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {selectedResult.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                        <button
                          className="ml-1 hover:text-destructive"
                          onClick={() => handleRemoveTag(selectedResult.id, tag)}
                        >
                          <X className="w-2 h-2" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add tag..."
                      className="h-7 text-xs"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTag(selectedResult.id)}
                    />
                    <Button size="sm" variant="outline" className="h-7" onClick={() => handleAddTag(selectedResult.id)}>
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">NOTES</h4>
                  <Textarea
                    value={selectedResult.notes}
                    onChange={(e) => resultsManager.updateNotes(selectedResult.id, e.target.value)}
                    placeholder="Add notes..."
                    className="text-xs min-h-[60px]"
                  />
                </div>

                {/* Export Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    size="sm" 
                    variant="default" 
                    className="col-span-3" 
                    onClick={() => handleExportZIP(selectedResult)}
                    title="ZIP contains: result_report.csv, initial_data.txt, final_data.txt, steps_detail.json, steps_playback.csv"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Export ZIP (Full Package)
                  </Button>
                  <p className="col-span-3 text-xs text-muted-foreground text-center">
                    Includes CSV report, initial/final data, step details with full params
                  </p>
                  <Button size="sm" variant="outline" onClick={() => handleExportCSV(selectedResult)}>
                    <Download className="w-3 h-3 mr-1" />
                    CSV
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleExportJSON(selectedResult)}>
                    <Download className="w-3 h-3 mr-1" />
                    JSON
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(selectedResult.id)}>
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a result to view details</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Comparison Dialog */}
      <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Results Comparison</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Comparison Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Metric</th>
                    {compareResults.map(r => (
                      <th key={r.id} className="text-left p-2">{r.strategyName}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-2 font-medium">Duration</td>
                    {compareResults.map(r => (
                      <td key={r.id} className="p-2">{r.duration.toFixed(0)}ms</td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 font-medium">Steps</td>
                    {compareResults.map(r => (
                      <td key={r.id} className="p-2">{r.steps.length}</td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 font-medium">Total Cost</td>
                    {compareResults.map(r => (
                      <td key={r.id} className="p-2">{r.benchmarks.totalCost || 0}</td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 font-medium">Initial Entropy</td>
                    {compareResults.map(r => (
                      <td key={r.id} className="p-2">{r.initialMetrics?.entropy?.toFixed(4) || 'N/A'}</td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 font-medium">Final Entropy</td>
                    {compareResults.map(r => (
                      <td key={r.id} className="p-2">{r.finalMetrics?.entropy?.toFixed(4) || 'N/A'}</td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 font-medium">Entropy Change</td>
                    {compareResults.map(r => {
                      const change = getEntropyChange(r);
                      return (
                        <td key={r.id} className={`p-2 ${change && change < 0 ? 'text-green-500' : change && change > 0 ? 'text-red-500' : ''}`}>
                          {change !== null ? `${change >= 0 ? '+' : ''}${change.toFixed(4)}` : 'N/A'}
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 font-medium">Final Size</td>
                    {compareResults.map(r => (
                      <td key={r.id} className="p-2">{r.finalBits.length} bits</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            
            <Button onClick={() => setShowCompareDialog(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Helper function
function countChangedBits(before: string, after: string): number {
  let count = 0;
  const maxLen = Math.max(before.length, after.length);
  for (let i = 0; i < maxLen; i++) {
    if ((before[i] || '0') !== (after[i] || '0')) count++;
  }
  return count;
}
