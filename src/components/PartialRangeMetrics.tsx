/**
 * Partial Range Metrics - Calculate and display metrics for a selected bit range
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Calculator,
  Activity,
  BarChart3,
  Target,
  RefreshCw,
  Download,
} from 'lucide-react';
import { calculateAllMetrics } from '@/lib/metricsCalculator';
import { BinaryMetrics } from '@/lib/binaryMetrics';
import { toast } from 'sonner';

interface PartialRangeMetricsProps {
  bits: string;
  selectedRanges?: Array<{ start: number; end: number }>;
}

export const PartialRangeMetrics = ({ bits, selectedRanges = [] }: PartialRangeMetricsProps) => {
  const [startIndex, setStartIndex] = useState('0');
  const [endIndex, setEndIndex] = useState(String(Math.min(bits.length - 1, 1023)));
  const [isCalculating, setIsCalculating] = useState(false);
  const [rangeMetrics, setRangeMetrics] = useState<Record<string, number> | null>(null);
  const [rangeStats, setRangeStats] = useState<any>(null);

  const handleCalculate = () => {
    const start = Math.max(0, parseInt(startIndex) || 0);
    const end = Math.min(bits.length - 1, parseInt(endIndex) || bits.length - 1);
    
    if (start >= end) {
      toast.error('End index must be greater than start index');
      return;
    }

    setIsCalculating(true);
    
    // Small timeout to allow UI to update
    setTimeout(() => {
      try {
        const rangeBits = bits.slice(start, end + 1);
        const metrics = calculateAllMetrics(rangeBits);
        const stats = BinaryMetrics.analyze(rangeBits);
        
        setRangeMetrics(metrics.metrics);
        setRangeStats(stats);
        toast.success(`Calculated ${Object.keys(metrics.metrics).length} metrics for range [${start}:${end}]`);
      } catch (e) {
        toast.error('Failed to calculate metrics');
      } finally {
        setIsCalculating(false);
      }
    }, 10);
  };

  const handleExport = () => {
    if (!rangeMetrics) return;
    
    const exportData = {
      range: { start: parseInt(startIndex), end: parseInt(endIndex) },
      metrics: rangeMetrics,
      stats: rangeStats,
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `range_metrics_${startIndex}_${endIndex}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Range metrics exported');
  };

  // Auto-update from selected ranges
  useMemo(() => {
    if (selectedRanges.length > 0) {
      const range = selectedRanges[0];
      setStartIndex(String(range.start));
      setEndIndex(String(range.end));
    }
  }, [selectedRanges]);

  const rangeLength = Math.max(0, (parseInt(endIndex) || 0) - (parseInt(startIndex) || 0) + 1);
  const rangePercent = bits.length > 0 ? (rangeLength / bits.length) * 100 : 0;

  return (
    <Card className="bg-card border">
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          Partial Range Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Range Input */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Start Index</Label>
            <Input
              type="number"
              value={startIndex}
              onChange={(e) => setStartIndex(e.target.value)}
              min={0}
              max={bits.length - 1}
              className="h-8 mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">End Index</Label>
            <Input
              type="number"
              value={endIndex}
              onChange={(e) => setEndIndex(e.target.value)}
              min={0}
              max={bits.length - 1}
              className="h-8 mt-1"
            />
          </div>
        </div>

        {/* Range Info */}
        <div className="p-2 bg-muted/30 rounded-lg">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Range Size:</span>
            <span className="font-mono">{rangeLength.toLocaleString()} bits ({rangePercent.toFixed(1)}%)</span>
          </div>
          <Progress value={rangePercent} className="h-1.5" />
        </div>

        {/* Calculate Button */}
        <div className="flex gap-2">
          <Button
            onClick={handleCalculate}
            disabled={isCalculating || bits.length === 0}
            className="flex-1"
            size="sm"
          >
            {isCalculating ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Calculator className="w-4 h-4 mr-2" />
            )}
            Calculate Metrics
          </Button>
          {rangeMetrics && (
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Results */}
        {rangeStats && (
          <div className="space-y-3">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 bg-primary/10 rounded text-center">
                <div className="text-[10px] text-muted-foreground">Entropy</div>
                <div className="font-mono text-sm font-bold text-primary">{rangeStats.entropy.toFixed(4)}</div>
              </div>
              <div className="p-2 bg-green-500/10 rounded text-center">
                <div className="text-[10px] text-muted-foreground">Ones</div>
                <div className="font-mono text-sm font-bold text-green-500">{rangeStats.onePercent.toFixed(1)}%</div>
              </div>
              <div className="p-2 bg-yellow-500/10 rounded text-center">
                <div className="text-[10px] text-muted-foreground">Mean Run</div>
                <div className="font-mono text-sm font-bold text-yellow-500">{rangeStats.meanRunLength.toFixed(2)}</div>
              </div>
            </div>

            {/* All Metrics */}
            {rangeMetrics && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    All Metrics
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {Object.keys(rangeMetrics).length}
                  </Badge>
                </div>
                <ScrollArea className="h-40 border rounded-lg">
                  <div className="p-2 space-y-1">
                    {Object.entries(rangeMetrics).slice(0, 50).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center text-xs py-0.5">
                        <span className="text-muted-foreground truncate max-w-[150px]">{key}</span>
                        <span className="font-mono">{typeof value === 'number' ? value.toFixed(4) : String(value)}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
