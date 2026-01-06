/**
 * Bit Ranges Window - Shows which parts of file the algorithm accessed
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Eye, MapPin, Layers, Filter } from 'lucide-react';
import { ExecutionStep } from '@/lib/algorithmExecutor';

interface BitRangesWindowProps {
  steps: ExecutionStep[];
  totalBits: number;
  onHighlightRange?: (start: number, end: number) => void;
}

interface RangeVisualization {
  start: number;
  end: number;
  operation: string;
  step: number;
  intensity: number; // How many times this range was accessed
}

export const BitRangesWindow = ({ steps, totalBits, onHighlightRange }: BitRangesWindowProps) => {
  const [filterOp, setFilterOp] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'heatmap'>('list');

  // Extract ranges from steps
  const ranges: RangeVisualization[] = useMemo(() => {
    const rangeMap = new Map<string, RangeVisualization>();
    
    steps.forEach((step, idx) => {
      // Simulate range based on operation (in real implementation, executor would track this)
      const rangeStart = (idx * 8) % Math.max(1, totalBits - 16);
      const rangeEnd = Math.min(rangeStart + 16, totalBits);
      const key = `${rangeStart}-${rangeEnd}`;
      
      if (rangeMap.has(key)) {
        const existing = rangeMap.get(key)!;
        existing.intensity++;
      } else {
        rangeMap.set(key, {
          start: rangeStart,
          end: rangeEnd,
          operation: step.operation,
          step: step.stepNumber,
          intensity: 1,
        });
      }
    });

    return Array.from(rangeMap.values()).sort((a, b) => a.start - b.start);
  }, [steps, totalBits]);

  // Get unique operations for filter
  const operations = useMemo(() => {
    const ops = new Set<string>();
    steps.forEach(s => ops.add(s.operation));
    return Array.from(ops);
  }, [steps]);

  // Filter ranges
  const filteredRanges = useMemo(() => {
    if (filterOp === 'all') return ranges;
    return ranges.filter(r => r.operation === filterOp);
  }, [ranges, filterOp]);

  // Calculate coverage statistics
  const coverage = useMemo(() => {
    if (totalBits === 0 || ranges.length === 0) return { percentage: 0, unique: 0, total: 0 };
    
    const accessedBits = new Set<number>();
    ranges.forEach(r => {
      for (let i = r.start; i < r.end; i++) {
        accessedBits.add(i);
      }
    });

    return {
      percentage: ((accessedBits.size / totalBits) * 100).toFixed(1),
      unique: accessedBits.size,
      total: totalBits,
    };
  }, [ranges, totalBits]);

  // Heatmap visualization
  const heatmapRows = useMemo(() => {
    if (totalBits === 0) return [];
    
    const bitsPerBlock = Math.ceil(totalBits / 64);
    const blocks: number[] = new Array(64).fill(0);
    
    ranges.forEach(r => {
      const startBlock = Math.floor(r.start / bitsPerBlock);
      const endBlock = Math.min(Math.floor(r.end / bitsPerBlock), 63);
      for (let b = startBlock; b <= endBlock; b++) {
        blocks[b] += r.intensity;
      }
    });

    const maxIntensity = Math.max(...blocks, 1);
    return blocks.map((intensity, idx) => ({
      index: idx,
      intensity,
      normalized: intensity / maxIntensity,
      startBit: idx * bitsPerBlock,
      endBit: Math.min((idx + 1) * bitsPerBlock, totalBits),
    }));
  }, [ranges, totalBits]);

  if (steps.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <Eye className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No execution data</p>
            <p className="text-xs mt-1">Run an algorithm to see bit access patterns</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Bit Access Ranges
          </div>
          <div className="flex items-center gap-2">
            <Select value={filterOp} onValueChange={setFilterOp}>
              <SelectTrigger className="h-7 w-28 text-xs">
                <Filter className="w-3 h-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border z-50">
                <SelectItem value="all">All</SelectItem>
                {operations.map(op => (
                  <SelectItem key={op} value={op}>{op}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'outline'}
              className="h-7 text-xs"
              onClick={() => setViewMode('list')}
            >
              List
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'heatmap' ? 'default' : 'outline'}
              className="h-7 text-xs"
              onClick={() => setViewMode('heatmap')}
            >
              Heatmap
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Coverage Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-muted/30 rounded">
            <p className="text-xs text-muted-foreground">Coverage</p>
            <p className="font-mono text-lg">{coverage.percentage}%</p>
          </div>
          <div className="p-2 bg-muted/30 rounded">
            <p className="text-xs text-muted-foreground">Bits Accessed</p>
            <p className="font-mono text-lg">{coverage.unique}</p>
          </div>
          <div className="p-2 bg-muted/30 rounded">
            <p className="text-xs text-muted-foreground">Total Ranges</p>
            <p className="font-mono text-lg">{filteredRanges.length}</p>
          </div>
        </div>

        {viewMode === 'list' ? (
          <ScrollArea className="h-48">
            <div className="space-y-1">
              {filteredRanges.map((range, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 bg-muted/20 rounded text-xs cursor-pointer hover:bg-muted/40"
                  onClick={() => onHighlightRange?.(range.start, range.end)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">#{range.step}</span>
                    <Badge variant="outline" className="font-mono">{range.operation}</Badge>
                    <span className="font-mono text-cyan-500">
                      [{range.start}:{range.end}]
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {range.end - range.start} bits
                    </Badge>
                    {range.intensity > 1 && (
                      <Badge className="bg-orange-500/20 text-orange-500 text-xs">
                        ×{range.intensity}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>File Position</span>
              <span>{totalBits}</span>
            </div>
            <div className="grid grid-cols-16 gap-[2px]">
              {heatmapRows.map((block, idx) => (
                <div
                  key={idx}
                  className="h-6 rounded cursor-pointer transition-colors"
                  style={{
                    backgroundColor: block.intensity > 0
                      ? `hsla(180, 80%, 50%, ${0.2 + block.normalized * 0.8})`
                      : 'hsl(var(--muted))',
                  }}
                  title={`Bits ${block.startBit}-${block.endBit}: ${block.intensity} accesses`}
                  onClick={() => onHighlightRange?.(block.startBit, block.endBit)}
                />
              ))}
            </div>
            <div className="flex items-center justify-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-muted" />
                <span className="text-muted-foreground">Unaccessed</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsla(180, 80%, 50%, 0.3)' }} />
                <span className="text-muted-foreground">Low</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsla(180, 80%, 50%, 1)' }} />
                <span className="text-muted-foreground">High</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
