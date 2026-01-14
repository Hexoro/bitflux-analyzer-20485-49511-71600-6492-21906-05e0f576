/**
 * History Comparison Dialog - Compare two history entries side by side
 */

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  GitCompare,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Edit,
  ArrowRight,
} from 'lucide-react';
import { HistoryEntry } from '@/lib/historyManager';
import { BinaryMetrics } from '@/lib/binaryMetrics';

interface HistoryComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: HistoryEntry[];
  initialEntry?: HistoryEntry;
}

export const HistoryComparisonDialog = ({
  open,
  onOpenChange,
  entries,
  initialEntry,
}: HistoryComparisonDialogProps) => {
  const [leftEntryId, setLeftEntryId] = useState<string>(initialEntry?.id || entries[0]?.id || '');
  const [rightEntryId, setRightEntryId] = useState<string>(entries[1]?.id || entries[0]?.id || '');

  const leftEntry = entries.find(e => e.id === leftEntryId);
  const rightEntry = entries.find(e => e.id === rightEntryId);

  const comparison = useMemo(() => {
    if (!leftEntry || !rightEntry) return null;

    const leftBits = leftEntry.bits;
    const rightBits = rightEntry.bits;
    
    // Calculate detailed stats
    const leftStats = BinaryMetrics.analyze(leftBits);
    const rightStats = BinaryMetrics.analyze(rightBits);

    // Find differences
    const differences: Array<{
      type: 'added' | 'removed' | 'changed';
      position: number;
      length: number;
    }> = [];

    const maxLen = Math.max(leftBits.length, rightBits.length);
    let diffStart = -1;

    for (let i = 0; i < maxLen; i++) {
      const leftChar = leftBits[i];
      const rightChar = rightBits[i];

      if (leftChar !== rightChar) {
        if (diffStart === -1) diffStart = i;
      } else if (diffStart !== -1) {
        differences.push({
          type: leftBits[diffStart] === undefined ? 'added' :
                rightBits[diffStart] === undefined ? 'removed' : 'changed',
          position: diffStart,
          length: i - diffStart,
        });
        diffStart = -1;
      }
    }

    if (diffStart !== -1) {
      differences.push({
        type: leftBits[diffStart] === undefined ? 'added' :
              rightBits[diffStart] === undefined ? 'removed' : 'changed',
        position: diffStart,
        length: maxLen - diffStart,
      });
    }

    // Calculate change summary
    const totalChangedBits = differences.reduce((sum, d) => sum + d.length, 0);
    const changePercent = maxLen > 0 ? (totalChangedBits / maxLen) * 100 : 0;

    return {
      leftStats,
      rightStats,
      differences,
      totalChangedBits,
      changePercent,
      lengthDiff: rightBits.length - leftBits.length,
      entropyDiff: rightStats.entropy - leftStats.entropy,
      balanceDiff: rightStats.onePercent - leftStats.onePercent,
    };
  }, [leftEntry, rightEntry]);

  const formatDiff = (diff: number, unit = '') => {
    if (diff > 0) return `+${diff.toFixed(4)}${unit}`;
    if (diff < 0) return `${diff.toFixed(4)}${unit}`;
    return `0${unit}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-primary" />
            Compare History Entries
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Entry Selectors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Left (Earlier)</label>
              <Select value={leftEntryId} onValueChange={setLeftEntryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select entry" />
                </SelectTrigger>
                <SelectContent>
                  {entries.map((entry, idx) => (
                    <SelectItem key={entry.id} value={entry.id}>
                      #{entries.length - idx} - {entry.description.slice(0, 30)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Right (Later)</label>
              <Select value={rightEntryId} onValueChange={setRightEntryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select entry" />
                </SelectTrigger>
                <SelectContent>
                  {entries.map((entry, idx) => (
                    <SelectItem key={entry.id} value={entry.id}>
                      #{entries.length - idx} - {entry.description.slice(0, 30)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {comparison && leftEntry && rightEntry && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 bg-muted/30 rounded-lg text-center">
                  <div className="text-xs text-muted-foreground">Length Change</div>
                  <div className={`text-lg font-bold flex items-center justify-center gap-1 ${
                    comparison.lengthDiff > 0 ? 'text-green-500' :
                    comparison.lengthDiff < 0 ? 'text-red-500' : 'text-muted-foreground'
                  }`}>
                    {comparison.lengthDiff > 0 ? <Plus className="w-4 h-4" /> :
                     comparison.lengthDiff < 0 ? <Minus className="w-4 h-4" /> : null}
                    {Math.abs(comparison.lengthDiff)}
                  </div>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg text-center">
                  <div className="text-xs text-muted-foreground">Bits Changed</div>
                  <div className="text-lg font-bold text-primary">
                    {comparison.totalChangedBits}
                    <span className="text-xs text-muted-foreground ml-1">
                      ({comparison.changePercent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg text-center">
                  <div className="text-xs text-muted-foreground">Entropy Δ</div>
                  <div className={`text-lg font-bold flex items-center justify-center gap-1 ${
                    comparison.entropyDiff < 0 ? 'text-green-500' :
                    comparison.entropyDiff > 0 ? 'text-red-500' : 'text-muted-foreground'
                  }`}>
                    {comparison.entropyDiff < 0 ? <TrendingDown className="w-4 h-4" /> :
                     comparison.entropyDiff > 0 ? <TrendingUp className="w-4 h-4" /> : null}
                    {formatDiff(comparison.entropyDiff)}
                  </div>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg text-center">
                  <div className="text-xs text-muted-foreground">Balance Δ</div>
                  <div className="text-lg font-bold">
                    {formatDiff(comparison.balanceDiff, '%')}
                  </div>
                </div>
              </div>

              {/* Side-by-side Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-card rounded-lg border">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Badge variant="outline">{leftEntry.description.slice(0, 25)}</Badge>
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bits:</span>
                      <span className="font-mono">{comparison.leftStats.totalBits}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Entropy:</span>
                      <span className="font-mono">{comparison.leftStats.entropy.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ones:</span>
                      <span className="font-mono">{comparison.leftStats.onePercent.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mean Run:</span>
                      <span className="font-mono">{comparison.leftStats.meanRunLength.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-card rounded-lg border">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Badge variant="outline">{rightEntry.description.slice(0, 25)}</Badge>
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bits:</span>
                      <span className="font-mono">{comparison.rightStats.totalBits}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Entropy:</span>
                      <span className="font-mono">{comparison.rightStats.entropy.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ones:</span>
                      <span className="font-mono">{comparison.rightStats.onePercent.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mean Run:</span>
                      <span className="font-mono">{comparison.rightStats.meanRunLength.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Differences List */}
              <div>
                <h4 className="text-sm font-medium mb-2">Differences ({comparison.differences.length})</h4>
                <ScrollArea className="h-40 border rounded-lg">
                  <div className="p-2 space-y-1">
                    {comparison.differences.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">No differences found</p>
                    ) : (
                      comparison.differences.slice(0, 50).map((diff, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs p-1.5 bg-muted/20 rounded">
                          <Badge className={`text-[10px] ${
                            diff.type === 'added' ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                            diff.type === 'removed' ? 'bg-red-500/20 text-red-400 border-red-500/50' :
                            'bg-blue-500/20 text-blue-400 border-blue-500/50'
                          }`}>
                            {diff.type === 'added' ? <Plus className="w-2 h-2 mr-0.5" /> :
                             diff.type === 'removed' ? <Minus className="w-2 h-2 mr-0.5" /> :
                             <Edit className="w-2 h-2 mr-0.5" />}
                            {diff.type}
                          </Badge>
                          <span className="font-mono">@{diff.position}</span>
                          <span className="text-muted-foreground">{diff.length} bits</span>
                        </div>
                      ))
                    )}
                    {comparison.differences.length > 50 && (
                      <p className="text-center text-muted-foreground text-xs py-2">
                        ...and {comparison.differences.length - 50} more
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
