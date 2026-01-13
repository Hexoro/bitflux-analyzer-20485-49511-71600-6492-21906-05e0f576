/**
 * Analysis Panel - Uses centralized metrics from metricsCalculator
 * All hooks MUST be called before any conditional returns to follow Rules of Hooks
 */

import { CompressionMetrics } from '@/lib/enhancedMetrics';
import { AdvancedMetricsCalculator } from '@/lib/advancedMetrics';
import { BinaryStats } from '@/lib/binaryMetrics';
import { PatternAnalysis, TransitionAnalysis, CompressionAnalysisTools } from '@/lib/bitstreamAnalysis';
import { IdealityMetrics } from '@/lib/idealityMetrics';
import { calculateAllMetrics, getMetricsByCategory } from '@/lib/metricsCalculator';
import { predefinedManager } from '@/lib/predefinedManager';
import { generateAnalysisReport, downloadBlob } from '@/lib/reportGenerator';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { ChevronDown, Activity, Database, Download, FileText } from 'lucide-react';

interface Partition {
  id: string;
  startIndex: number;
  endIndex: number;
  bits: string;
  stats: {
    totalBits: number;
    entropy: number;
    onePercent: number;
    zeroPercent: number;
    meanRunLength: number;
  };
}

interface Boundary {
  sequence: string;
  description: string;
  positions: number[];
  color?: string;
}

interface HistoryEntry {
  id: string;
  timestamp: Date;
  description: string;
  bits?: string;
  stats?: {
    totalBits: number;
    zeroCount: number;
    oneCount: number;
    entropy: number;
  };
}

interface AnalysisPanelProps {
  stats: BinaryStats | null;
  bits: string;
  bitsPerRow: number;
  onJumpTo: (index: number) => void;
  onIdealityChange: (idealBitIndices: number[]) => void;
  partitions?: Partition[];
  boundaries?: Boundary[];
  history?: HistoryEntry[];
  anomalies?: Array<{ name: string; position: number; length: number; severity: string; description?: string }>;
}

export const AnalysisPanel = ({ stats, bits, bitsPerRow, onJumpTo, onIdealityChange, partitions = [], boundaries = [], history = [], anomalies = [] }: AnalysisPanelProps) => {
  // Create safe defaults - MUST be before any hooks
  const safeStats = stats || {
    totalBits: 0,
    totalBytes: 0,
    zeroCount: 0,
    oneCount: 0,
    zeroPercent: 0,
    onePercent: 0,
    entropy: 0,
    meanRunLength: 0,
    estimatedCompressedSize: 0,
    longestZeroRun: null,
    longestOneRun: null
  };
  
  const safeBits = bits || '';
  const hasData = safeBits.length > 0;

  // ALL HOOKS MUST BE CALLED UNCONDITIONALLY - before any early returns
  const [idealityWindowSize, setIdealityWindowSize] = useState('4');
  const [idealityStart, setIdealityStart] = useState('0');
  const [idealityEnd, setIdealityEnd] = useState('0');
  const [showIdealBits, setShowIdealBits] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Core', 'Statistics']));
  const [availableMetrics, setAvailableMetrics] = useState<any[]>([]);

  // Update idealityEnd when bits change
  useEffect(() => {
    setIdealityEnd(String(Math.max(0, safeBits.length - 1)));
  }, [safeBits.length]);

  // Subscribe to predefined metrics changes
  useEffect(() => {
    setAvailableMetrics(predefinedManager.getAllMetrics());
    const unsubscribe = predefinedManager.subscribe(() => {
      setAvailableMetrics(predefinedManager.getAllMetrics());
    });
    return unsubscribe;
  }, []);

  // Compute enhanced metrics - always call even if no data (returns default)
  const enhanced = useMemo(() => {
    if (!hasData) return { rleRatio: 0, lz77Estimate: 0, huffmanEstimate: 0, markovComplexity: 0 };
    return CompressionMetrics.analyze(safeBits, safeStats.entropy);
  }, [safeBits, safeStats.entropy, hasData]);

  // Compute advanced metrics
  const advanced = useMemo(() => {
    if (!hasData) {
      return {
        compressionEstimates: { rle: 1, huffman: 1 },
        variance: 0,
        chiSquare: { isRandom: false, value: 0, pValue: 0 },
        transitionCount: { total: 0, zeroToOne: 0, oneToZero: 0 },
        transitionRate: 0,
        patternDiversity: 0,
        bigramDistribution: new Map(),
        trigramDistribution: new Map(),
        nybbleDistribution: new Map(),
        byteDistribution: new Map(),
      };
    }
    return AdvancedMetricsCalculator.analyze(safeBits, safeStats.entropy);
  }, [safeBits, safeStats.entropy, hasData]);

  // Calculate ALL metrics using centralized metricsCalculator
  const allMetrics = useMemo(() => {
    if (!hasData) return { success: false, metrics: {}, errors: [], coreMetricsComputed: false };
    return calculateAllMetrics(safeBits);
  }, [safeBits, hasData]);

  // Get metrics organized by category
  const metricsByCategory = useMemo(() => getMetricsByCategory(), []);

  // Calculate ideality metrics
  const currentIdeality = useMemo(() => {
    if (!hasData) return { idealityPercentage: 0, windowSize: 4, repeatingCount: 0, totalBits: 0, idealBitIndices: [] };
    
    const windowSize = parseInt(idealityWindowSize) || 4;
    const start = Math.max(0, parseInt(idealityStart) || 0);
    const end = Math.min(safeBits.length - 1, parseInt(idealityEnd) || safeBits.length - 1);
    
    if (windowSize < 1 || start >= end) {
      return { idealityPercentage: 0, windowSize, repeatingCount: 0, totalBits: 0, idealBitIndices: [] };
    }
    
    const allResults = IdealityMetrics.calculateAllIdealities(safeBits, start, end);
    const result = allResults.find(r => r.windowSize === windowSize);
    
    return result || { idealityPercentage: 0, windowSize, repeatingCount: 0, totalBits: end - start + 1, idealBitIndices: [] };
  }, [safeBits, idealityWindowSize, idealityStart, idealityEnd, hasData]);

  // Calculate top patterns
  const topPatterns = useMemo(() => {
    if (!hasData) return [];
    const patterns8 = PatternAnalysis.findAllPatterns(safeBits, 8, 2);
    return patterns8.slice(0, 5);
  }, [safeBits, hasData]);

  // Helper functions
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const exportMetrics = () => {
    const metricsExport = {
      basic: safeStats,
      enhanced,
      advanced: {
        ...advanced,
        bigramDistribution: Array.from(advanced.bigramDistribution.entries()),
        trigramDistribution: Array.from(advanced.trigramDistribution.entries()),
        nybbleDistribution: Array.from(advanced.nybbleDistribution.entries()),
        byteDistribution: Array.from(advanced.byteDistribution.entries()),
      },
      allMetrics: allMetrics.metrics,
      ideality: currentIdeality,
    };
    
    const json = JSON.stringify(metricsExport, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'binary-analysis-metrics.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Metrics exported successfully');
  };

  // Generate PDF report
  const generateReport = () => {
    // Collect sequences from topPatterns - map to SequenceData format
    const sequences = topPatterns.map(p => ({
      sequence: p.pattern,
      count: p.count,
      positions: p.positions || [],
    }));
    
    // Collect bitstream analysis data
    const transitionData = TransitionAnalysis.analyzeTransitions(safeBits);
    const compressionData = CompressionAnalysisTools.estimateRLECompression(safeBits);
    const runLengths = TransitionAnalysis.runLengthEncode(safeBits);
    const onesCount = safeBits.split('1').length - 1;
    const bitBalance = onesCount / safeBits.length;
    const commonPatterns = PatternAnalysis.findAllPatterns(safeBits, 8, 3).slice(0, 10);
    const longestRepeated = PatternAnalysis.findLongestRepeatedSubstring(safeBits, 64);
    
    const bitstreamAnalysis = {
      entropy: compressionData.entropy,
      transitionRate: transitionData.transitionRate,
      compressionRatio: compressionData.compressionRatio,
      bitBalance,
      zeroToOneTransitions: transitionData.zeroToOne,
      oneToZeroTransitions: transitionData.oneToZero,
      totalTransitions: transitionData.totalTransitions,
      avgRunLength: runLengths.reduce((sum, r) => sum + r.length, 0) / (runLengths.length || 1),
      maxRunLength: Math.max(...runLengths.map(r => r.length), 0),
      commonPatterns: commonPatterns.map(p => ({ pattern: p.pattern, count: p.count })),
      longestRepeatedSubstring: longestRepeated ? { pattern: longestRepeated.pattern, positions: longestRepeated.positions } : undefined,
    };
    
    // Convert partitions to proper format for report
    const partitionData = partitions.map(p => ({
      id: p.id,
      startIndex: p.startIndex,
      endIndex: p.endIndex,
      bits: p.bits,
      stats: p.stats,
    }));
    
    // Convert boundaries to proper format
    const boundaryData = boundaries.map(b => ({
      sequence: b.sequence,
      description: b.description,
      positions: b.positions,
      color: b.color,
    }));
    
    // Convert history entries
    const historyData = history.map(h => ({
      id: h.id,
      timestamp: h.timestamp,
      description: h.description,
      bits: h.bits,
      stats: h.stats,
    }));
    
    const blob = generateAnalysisReport(
      'Binary Analysis',
      safeBits,
      allMetrics.metrics,
      anomalies,
      sequences,
      boundaryData,
      partitionData,
      historyData,
      bitstreamAnalysis
    );
    
    downloadBlob(blob, `analysis-report-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF report generated');
  };

  // NOW we can do early returns AFTER all hooks
  if (!hasData) {
    return (
      <div className="h-full overflow-auto p-4 flex items-center justify-center">
        <p className="text-muted-foreground">No data to analyze. Load or generate a binary file.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4 space-y-4 scrollbar-thin">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-primary">Comprehensive Analysis</h2>
          <Badge variant="outline" className="text-xs">
            <Database className="w-3 h-3 mr-1" />
            {Object.keys(allMetrics.metrics).length} metrics
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={generateReport}>
            <FileText className="w-4 h-4 mr-1" />
            PDF Report
          </Button>
          <Button variant="outline" size="sm" onClick={exportMetrics}>
            <Download className="w-4 h-4 mr-1" />
            Export JSON
          </Button>
        </div>
      </div>

      <Accordion type="multiple" defaultValue={["file-info", "compression", "all-metrics", "patterns"]} className="space-y-2">
        <AccordionItem value="file-info" className="border-border">
          <AccordionTrigger className="text-sm font-semibold text-primary hover:no-underline px-4 py-2 bg-card rounded-t-lg">
            File Information
          </AccordionTrigger>
          <AccordionContent className="p-4 bg-card rounded-b-lg border-t border-border">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Size:</span>
                <span className="text-foreground font-mono">{safeStats.totalBits} bits ({formatBytes(safeStats.totalBytes)})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bits per Row:</span>
                <span className="text-foreground font-mono">{bitsPerRow}</span>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="distribution" className="border-border">
          <AccordionTrigger className="text-sm font-semibold text-primary hover:no-underline px-4 py-2 bg-card rounded-t-lg">
            Bit Distribution
          </AccordionTrigger>
          <AccordionContent className="p-4 bg-card rounded-b-lg border-t border-border">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Zeros (0)</span>
                  <span className="text-foreground font-mono">{safeStats.zeroCount} ({safeStats.zeroPercent.toFixed(2)}%)</span>
                </div>
                <Progress value={safeStats.zeroPercent} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Ones (1)</span>
                  <span className="text-foreground font-mono">{safeStats.oneCount} ({safeStats.onePercent.toFixed(2)}%)</span>
                </div>
                <Progress value={safeStats.onePercent} className="h-2" />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="compression" className="border-border">
          <AccordionTrigger className="text-sm font-semibold text-primary hover:no-underline px-4 py-2 bg-card rounded-t-lg">
            Compression & Binary Metrics
          </AccordionTrigger>
          <AccordionContent className="p-4 bg-card rounded-b-lg border-t border-border">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Shannon Entropy:</span><span className="text-foreground font-mono">{safeStats.entropy.toFixed(4)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">RLE Ratio:</span><span className="text-foreground font-mono">{advanced.compressionEstimates.rle.toFixed(2)}:1</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Huffman (est):</span><span className="text-foreground font-mono">{advanced.compressionEstimates.huffman.toFixed(2)}:1</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Variance:</span><span className="text-foreground font-mono">{advanced.variance.toFixed(4)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Chi-Square:</span><span className={`font-mono ${advanced.chiSquare.isRandom ? 'text-green-500' : 'text-yellow-500'}`}>{advanced.chiSquare.isRandom ? '✓ Random' : '⚠ Biased'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Transitions:</span><span className="text-foreground font-mono">{advanced.transitionCount.total} ({(advanced.transitionRate * 100).toFixed(1)}%)</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Pattern Diversity:</span><span className="text-foreground font-mono">{(advanced.patternDiversity * 100).toFixed(1)}%</span></div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ALL METRICS - Grouped by Category */}
        <AccordionItem value="all-metrics" className="border-border">
          <AccordionTrigger className="text-sm font-semibold text-primary hover:no-underline px-4 py-2 bg-card rounded-t-lg">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              All Metrics ({Object.keys(allMetrics.metrics).length})
            </div>
          </AccordionTrigger>
          <AccordionContent className="p-4 bg-card rounded-b-lg border-t border-border">
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {Object.entries(metricsByCategory).map(([category, metricIds]) => {
                  const categoryMetrics = (metricIds as string[]).filter(id => id in allMetrics.metrics);
                  if (categoryMetrics.length === 0) return null;
                  
                  return (
                    <Collapsible
                      key={category}
                      open={expandedCategories.has(category)}
                      onOpenChange={() => toggleCategory(category)}
                    >
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-muted/30 rounded hover:bg-muted/50">
                        <span className="text-sm font-medium">{category}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">{categoryMetrics.length}</Badge>
                          <ChevronDown className={`w-4 h-4 transition-transform ${expandedCategories.has(category) ? 'rotate-180' : ''}`} />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-2 space-y-1">
                        {categoryMetrics.map(metricId => {
                          const metricDef = availableMetrics.find(m => m.id === metricId);
                          const value = allMetrics.metrics[metricId];
                          return (
                            <div key={metricId} className="flex justify-between text-sm px-2 py-1 bg-secondary/20 rounded">
                              <span className="text-muted-foreground">{metricDef?.name || metricId}:</span>
                              <span className="font-mono">{typeof value === 'number' ? value.toFixed(4) : value}</span>
                            </div>
                          );
                        })}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            </ScrollArea>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="patterns" className="border-border">
          <AccordionTrigger className="text-sm font-semibold text-primary hover:no-underline px-4 py-2 bg-card rounded-t-lg">
            Top Patterns
          </AccordionTrigger>
          <AccordionContent className="p-4 bg-card rounded-b-lg border-t border-border">
            {topPatterns.length > 0 ? (
              <div className="space-y-1">
                {topPatterns.map((p, idx) => (
                  <div key={idx} className="flex justify-between text-xs bg-secondary/20 p-2 rounded">
                    <span className="font-mono">{p.pattern}</span>
                    <span className="text-muted-foreground">{p.count}x</span>
                  </div>
                ))}
              </div>
            ) : <div className="text-xs text-muted-foreground">No patterns</div>}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="sequences" className="border-border">
          <AccordionTrigger className="text-sm font-semibold text-primary hover:no-underline px-4 py-2 bg-card rounded-t-lg">
            Longest Runs
          </AccordionTrigger>
          <AccordionContent className="p-4 bg-card rounded-b-lg border-t border-border space-y-3">
            {safeStats.longestZeroRun && (
              <div className="p-2 bg-secondary/20 rounded">
                <div className="flex justify-between mb-1"><span className="text-sm font-medium">Longest 0s</span><Button variant="outline" size="sm" onClick={() => onJumpTo(safeStats.longestZeroRun!.start)}>Jump</Button></div>
                <div className="text-xs text-muted-foreground">Length: {safeStats.longestZeroRun.length} • Pos: {safeStats.longestZeroRun.start}-{safeStats.longestZeroRun.end}</div>
              </div>
            )}
            {safeStats.longestOneRun && (
              <div className="p-2 bg-secondary/20 rounded">
                <div className="flex justify-between mb-1"><span className="text-sm font-medium">Longest 1s</span><Button variant="outline" size="sm" onClick={() => onJumpTo(safeStats.longestOneRun!.start)}>Jump</Button></div>
                <div className="text-xs text-muted-foreground">Length: {safeStats.longestOneRun.length} • Pos: {safeStats.longestOneRun.start}-{safeStats.longestOneRun.end}</div>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="ideality" className="border-border">
          <AccordionTrigger className="text-sm font-semibold text-primary hover:no-underline px-4 py-2 bg-card rounded-t-lg">
            File Ideality
          </AccordionTrigger>
          <AccordionContent className="p-4 bg-card rounded-b-lg border-t border-border">
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-xs">Window</Label><Input type="number" min="2" value={idealityWindowSize} onChange={(e) => setIdealityWindowSize(e.target.value)} className="h-8 text-xs font-mono bg-input"/></div>
                <div><Label className="text-xs">Start</Label><Input type="number" min="0" value={idealityStart} onChange={(e) => setIdealityStart(e.target.value)} className="h-8 text-xs font-mono bg-input"/></div>
                <div><Label className="text-xs">End</Label><Input type="number" min="0" value={idealityEnd} onChange={(e) => setIdealityEnd(e.target.value)} className="h-8 text-xs font-mono bg-input"/></div>
              </div>
              <div className="p-3 bg-secondary/30 rounded space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Score:</span><span className="text-primary font-mono font-semibold">{currentIdeality.idealityPercentage.toFixed(2)}%</span></div>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Repeating:</span><span className="font-mono">{currentIdeality.repeatingCount}</span></div>
              </div>
              <Button variant="outline" className="w-full" onClick={() => { onIdealityChange(currentIdeality.idealBitIndices); setShowIdealBits(!showIdealBits); toast.success(showIdealBits ? 'Hidden' : 'Highlighted'); }}>{showIdealBits ? 'Hide' : 'Show'} Ideal Bits</Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
