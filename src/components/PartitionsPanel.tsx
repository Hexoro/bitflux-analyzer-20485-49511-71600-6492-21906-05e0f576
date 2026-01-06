import { Partition } from '@/lib/partitionManager';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Layers, Activity, TrendingUp, Database, ChevronRight } from 'lucide-react';

interface PartitionsPanelProps {
  partitions: Partition[];
  onJumpTo: (index: number) => void;
}

export const PartitionsPanel = ({ partitions, onJumpTo }: PartitionsPanelProps) => {
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const totalBits = partitions.reduce((sum, p) => sum + p.stats.totalBits, 0);
  const avgEntropy = partitions.length > 0 
    ? partitions.reduce((sum, p) => sum + p.stats.entropy, 0) / partitions.length 
    : 0;

  const getEntropyColor = (entropy: number) => {
    if (entropy < 0.3) return 'text-green-400';
    if (entropy < 0.7) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getBalanceColor = (onePercent: number) => {
    const diff = Math.abs(50 - onePercent);
    if (diff < 5) return 'bg-green-500';
    if (diff < 15) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Stats Header */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-gradient-to-br from-primary/20 to-transparent border-primary/30">
            <CardContent className="py-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Layers className="w-3 h-3" />
                Partitions
              </div>
              <div className="text-2xl font-bold text-primary">{partitions.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-cyan-500/20 to-transparent border-cyan-500/30">
            <CardContent className="py-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Database className="w-3 h-3" />
                Total Size
              </div>
              <div className="text-2xl font-bold text-cyan-400">{formatBytes(totalBits / 8)}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/20 to-transparent border-green-500/30">
            <CardContent className="py-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Activity className="w-3 h-3" />
                Avg Entropy
              </div>
              <div className={`text-2xl font-bold ${getEntropyColor(avgEntropy)}`}>
                {avgEntropy.toFixed(3)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="bg-primary/5 border-primary/30">
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Partitions are automatically created from boundaries. Add or remove boundaries in the Boundaries tab.
            </p>
          </CardContent>
        </Card>

        {partitions.length === 0 ? (
          <Card className="bg-muted/20 border-dashed">
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Layers className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium mb-1">No Partitions</p>
                <p className="text-sm">Add boundaries to create partitions</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {partitions.map((partition, idx) => {
              const sizePercent = totalBits > 0 ? (partition.stats.totalBits / totalBits) * 100 : 0;
              
              return (
                <Card 
                  key={partition.id} 
                  className="bg-gradient-to-r from-card to-transparent border-border hover:border-primary/50 transition-all overflow-hidden group"
                >
                  <CardContent className="p-4">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                          <span className="text-lg font-bold text-primary">{idx + 1}</span>
                        </div>
                        <div>
                          <div className="font-medium">Partition {idx + 1}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {partition.startIndex.toLocaleString()} - {partition.endIndex.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onJumpTo(partition.startIndex)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ChevronRight className="w-4 h-4 mr-1" />
                        Jump
                      </Button>
                    </div>

                    {/* Size Bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Size: {partition.stats.totalBits.toLocaleString()} bits</span>
                        <span>{sizePercent.toFixed(1)}% of total</span>
                      </div>
                      <Progress value={sizePercent} className="h-2" />
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      <div className="p-2 bg-muted/30 rounded-lg text-center">
                        <div className="text-xs text-muted-foreground">Entropy</div>
                        <div className={`text-sm font-mono font-bold ${getEntropyColor(partition.stats.entropy)}`}>
                          {partition.stats.entropy.toFixed(4)}
                        </div>
                      </div>
                      <div className="p-2 bg-muted/30 rounded-lg text-center">
                        <div className="text-xs text-muted-foreground">Ones</div>
                        <div className="text-sm font-mono font-bold text-primary">
                          {partition.stats.onePercent.toFixed(1)}%
                        </div>
                      </div>
                      <div className="p-2 bg-muted/30 rounded-lg text-center">
                        <div className="text-xs text-muted-foreground">Zeros</div>
                        <div className="text-sm font-mono font-bold text-cyan-400">
                          {partition.stats.zeroPercent.toFixed(1)}%
                        </div>
                      </div>
                      <div className="p-2 bg-muted/30 rounded-lg text-center">
                        <div className="text-xs text-muted-foreground">Mean Run</div>
                        <div className="text-sm font-mono font-bold">
                          {partition.stats.meanRunLength.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Balance Indicator */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>Balance</span>
                        <span>{Math.abs(50 - partition.stats.onePercent).toFixed(1)}% off center</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${getBalanceColor(partition.stats.onePercent)}`}
                          style={{ width: `${partition.stats.onePercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Bit Preview */}
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Preview (first 64 bits):</div>
                      <div className="font-mono text-xs p-2 bg-background rounded border border-border break-all">
                        {partition.bits.substring(0, 64)}
                        {partition.bits.length > 64 && (
                          <span className="text-muted-foreground">...</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ScrollArea>
  );
};
