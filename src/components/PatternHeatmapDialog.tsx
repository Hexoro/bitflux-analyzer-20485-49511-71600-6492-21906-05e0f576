import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IdealityMetrics } from '@/lib/idealityMetrics';
import { PatternAnalysis, TransitionAnalysis } from '@/lib/bitstreamAnalysis';

interface PatternHeatmapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  binaryData: string;
}

type MetricType = 'ideality' | 'transitions' | 'patterns' | 'entropy';

export const PatternHeatmapDialog = ({
  open,
  onOpenChange,
  binaryData,
}: PatternHeatmapDialogProps) => {
  const [cellSize, setCellSize] = useState(64);
  const [windowSize, setWindowSize] = useState(8);
  const [metricType, setMetricType] = useState<MetricType>('ideality');

  const heatmapData = useMemo(() => {
    if (!binaryData || binaryData.length === 0) return [];

    const cells = Math.ceil(binaryData.length / cellSize);
    const data: Array<{ x: number; y: number; value: number; bits: string }> = [];

    for (let i = 0; i < cells; i++) {
      const start = i * cellSize;
      const end = Math.min(start + cellSize, binaryData.length);
      const segment = binaryData.substring(start, end);

      let value = 0;

      switch (metricType) {
        case 'ideality': {
          const idealityResult = IdealityMetrics.calculateIdeality(
            binaryData,
            windowSize,
            start,
            end - 1
          );
          value = idealityResult.idealityPercentage;
          break;
        }
        case 'transitions': {
          const transitions = TransitionAnalysis.analyzeTransitions(segment);
          value = transitions.transitionRate * 100;
          break;
        }
        case 'patterns': {
          const patterns = PatternAnalysis.findAllPatterns(segment, windowSize, 2);
          const totalMatches = patterns.reduce((sum, p) => sum + p.count, 0);
          value = (totalMatches / segment.length) * 100;
          break;
        }
        case 'entropy': {
          const zeros = (segment.match(/0/g) || []).length;
          const ones = (segment.match(/1/g) || []).length;
          const total = segment.length;
          const p0 = zeros / total;
          const p1 = ones / total;
          const entropy = p0 > 0 && p1 > 0 
            ? -(p0 * Math.log2(p0) + p1 * Math.log2(p1))
            : 0;
          value = entropy * 100;
          break;
        }
      }

      data.push({
        x: i,
        y: 0,
        value: Math.min(100, Math.max(0, value)),
        bits: segment,
      });
    }

    return data;
  }, [binaryData, cellSize, metricType, windowSize]);

  const gridCols = Math.min(32, heatmapData.length);
  const gridRows = Math.ceil(heatmapData.length / gridCols);

  const getColor = (value: number) => {
    // Use semantic colors from design system
    if (value < 20) return 'hsl(180, 100%, 50%)'; // primary/cyan
    if (value < 40) return 'hsl(180, 100%, 40%)';
    if (value < 60) return 'hsl(45, 100%, 50%)'; // yellow
    if (value < 80) return 'hsl(30, 100%, 50%)'; // orange
    return 'hsl(0, 84%, 60%)'; // red/destructive
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pattern Heatmap</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Controls */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Metric Type</Label>
              <Select value={metricType} onValueChange={(v) => setMetricType(v as MetricType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ideality">Ideality</SelectItem>
                  <SelectItem value="transitions">Transitions</SelectItem>
                  <SelectItem value="patterns">Pattern Density</SelectItem>
                  <SelectItem value="entropy">Entropy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cell Size: {cellSize} bits</Label>
              <Slider
                value={[cellSize]}
                onValueChange={(v) => setCellSize(v[0])}
                min={16}
                max={256}
                step={16}
              />
            </div>

            {(metricType === 'ideality' || metricType === 'patterns') && (
              <div className="space-y-2">
                <Label>Window Size: {windowSize}</Label>
                <Slider
                  value={[windowSize]}
                  onValueChange={(v) => setWindowSize(v[0])}
                  min={2}
                  max={32}
                  step={1}
                />
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Total Cells</div>
              <div className="font-semibold">{heatmapData.length}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Avg {metricType}</div>
              <div className="font-semibold">
                {heatmapData.length > 0
                  ? (heatmapData.reduce((sum, d) => sum + d.value, 0) / heatmapData.length).toFixed(2)
                  : 0}
                %
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Max Value</div>
              <div className="font-semibold">
                {heatmapData.length > 0 ? Math.max(...heatmapData.map(d => d.value)).toFixed(2) : 0}%
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Min Value</div>
              <div className="font-semibold">
                {heatmapData.length > 0 ? Math.min(...heatmapData.map(d => d.value)).toFixed(2) : 0}%
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Scale:</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(180, 100%, 50%)' }} />
              <span>0-20%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(180, 100%, 40%)' }} />
              <span>20-40%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(45, 100%, 50%)' }} />
              <span>40-60%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(30, 100%, 50%)' }} />
              <span>60-80%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(0, 84%, 60%)' }} />
              <span>80-100%</span>
            </div>
          </div>

          {/* Heatmap Grid */}
          <div className="border rounded-lg p-4 bg-card">
            <div
              className="grid gap-1"
              style={{
                gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
              }}
            >
              {heatmapData.map((cell, idx) => (
                <div
                  key={idx}
                  className="aspect-square rounded transition-all hover:scale-110 cursor-pointer"
                  style={{
                    backgroundColor: getColor(cell.value),
                  }}
                  title={`Cell ${idx}: ${cell.value.toFixed(2)}% ${metricType}\nBits: ${cell.bits.substring(0, 20)}...`}
                />
              ))}
            </div>
            {heatmapData.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No data to display
              </div>
            )}
          </div>

          {/* Description */}
          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong>Ideality:</strong> Measures repeating pattern quality (higher = more ideal)</p>
            <p><strong>Transitions:</strong> Rate of bit changes (0→1, 1→0)</p>
            <p><strong>Pattern Density:</strong> Concentration of repeating sequences</p>
            <p><strong>Entropy:</strong> Randomness measure (higher = more random)</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
