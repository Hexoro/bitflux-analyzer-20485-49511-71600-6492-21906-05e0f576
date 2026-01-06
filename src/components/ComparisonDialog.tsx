import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Card } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { BinaryStats } from '@/lib/binaryMetrics';

interface ComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBits: string;
  currentStats: BinaryStats;
  compareBits: string;
  compareStats: BinaryStats;
}

export const ComparisonDialog = ({
  open,
  onOpenChange,
  currentBits,
  currentStats,
  compareBits,
  compareStats,
}: ComparisonDialogProps) => {
  const formatBytes = (bits: number) => {
    const bytes = bits / 8;
    return bytes < 1024 ? `${bytes.toFixed(2)} bytes` : `${(bytes / 1024).toFixed(2)} KB`;
  };

  const getDifference = (current: number, compare: number) => {
    const diff = current - compare;
    const percent = compare !== 0 ? ((diff / compare) * 100).toFixed(2) : 'N/A';
    return {
      diff,
      percent,
      color: diff > 0 ? 'text-green-500' : diff < 0 ? 'text-red-500' : 'text-muted-foreground',
      symbol: diff > 0 ? '+' : '',
    };
  };

  const statsComparison = [
    {
      label: 'Total Bits',
      current: currentStats.totalBits,
      compare: compareStats.totalBits,
    },
    {
      label: 'Zeros',
      current: currentStats.zeroCount,
      compare: compareStats.zeroCount,
    },
    {
      label: 'Ones',
      current: currentStats.oneCount,
      compare: compareStats.oneCount,
    },
    {
      label: 'Entropy',
      current: currentStats.entropy,
      compare: compareStats.entropy,
      isFloat: true,
    },
    {
      label: 'Mean Run Length',
      current: currentStats.meanRunLength,
      compare: compareStats.meanRunLength,
      isFloat: true,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Comparison View</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(80vh-100px)]">
          <div className="space-y-4 p-4">
            {/* Stats Comparison */}
            <Card className="p-4 bg-card border-border">
              <h3 className="text-sm font-semibold text-primary mb-3">Statistics Comparison</h3>
              <div className="space-y-3">
                {statsComparison.map((stat) => {
                  const diff = getDifference(stat.current, stat.compare);
                  const currentValue = stat.isFloat ? stat.current.toFixed(4) : stat.current;
                  const compareValue = stat.isFloat ? stat.compare.toFixed(4) : stat.compare;
                  
                  return (
                    <div key={stat.label} className="grid grid-cols-4 gap-4 text-sm">
                      <div className="text-muted-foreground">{stat.label}:</div>
                      <div className="text-foreground font-mono">{currentValue}</div>
                      <div className="text-muted-foreground font-mono">{compareValue}</div>
                      <div className={`${diff.color} font-mono text-right`}>
                        {diff.symbol}{stat.isFloat ? diff.diff.toFixed(4) : diff.diff}
                        {typeof diff.percent === 'string' ? '' : ` (${diff.symbol}${diff.percent}%)`}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-4 gap-4 mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                <div></div>
                <div>Current</div>
                <div>Compare</div>
                <div className="text-right">Difference</div>
              </div>
            </Card>

            {/* Distribution Comparison */}
            <Card className="p-4 bg-card border-border">
              <h3 className="text-sm font-semibold text-primary mb-3">Distribution</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-2">Current (0s: {currentStats.zeroPercent.toFixed(2)}% / 1s: {currentStats.onePercent.toFixed(2)}%)</div>
                  <div className="flex h-4 rounded overflow-hidden">
                    <div 
                      className="bg-blue-500" 
                      style={{ width: `${currentStats.zeroPercent}%` }}
                    />
                    <div 
                      className="bg-green-500" 
                      style={{ width: `${currentStats.onePercent}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-2">Compare (0s: {compareStats.zeroPercent.toFixed(2)}% / 1s: {compareStats.onePercent.toFixed(2)}%)</div>
                  <div className="flex h-4 rounded overflow-hidden">
                    <div 
                      className="bg-blue-500" 
                      style={{ width: `${compareStats.zeroPercent}%` }}
                    />
                    <div 
                      className="bg-green-500" 
                      style={{ width: `${compareStats.onePercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Bit-level Differences */}
            <Card className="p-4 bg-card border-border">
              <h3 className="text-sm font-semibold text-primary mb-3">Bit-level Differences</h3>
              <div className="space-y-2 text-sm">
                {(() => {
                  const minLen = Math.min(currentBits.length, compareBits.length);
                  const maxLen = Math.max(currentBits.length, compareBits.length);
                  let differences = 0;
                  
                  for (let i = 0; i < minLen; i++) {
                    if (currentBits[i] !== compareBits[i]) differences++;
                  }
                  
                  const lengthDiff = maxLen - minLen;
                  const totalDifferences = differences + lengthDiff;
                  const similarityPercent = minLen > 0 ? (((minLen - differences) / minLen) * 100).toFixed(2) : 0;
                  
                  return (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Differing Bits:</span>
                        <span className="text-foreground font-mono">{differences} / {minLen}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Length Difference:</span>
                        <span className="text-foreground font-mono">{lengthDiff} bits</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Similarity:</span>
                        <span className="text-foreground font-mono">{similarityPercent}%</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-border">
                        <span className="text-muted-foreground font-semibold">Total Differences:</span>
                        <span className="text-foreground font-mono font-semibold">{totalDifferences}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
