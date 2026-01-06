import { HistoryEntry } from '@/lib/historyManager';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Clock, Eye } from 'lucide-react';

interface HistoryPanelProps {
  entries: HistoryEntry[];
  onRestoreVersion: (entry: HistoryEntry) => void;
  onCompareVersion: (entry: HistoryEntry) => void;
}

export const HistoryPanel = ({ entries, onRestoreVersion, onCompareVersion }: HistoryPanelProps) => {
  const formatTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatBytes = (bits: number) => {
    const bytes = Math.ceil(bits / 8);
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(2)} KB`;
  };

  return (
    <ScrollArea className="h-full p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-primary">
            Edit History ({entries.length})
          </h3>
        </div>

        {entries.length === 0 ? (
          <Card className="p-6 bg-card border-border text-center">
            <p className="text-muted-foreground">
              No history yet. Make edits to see them tracked here.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {entries.map((entry, idx) => (
              <Card key={entry.id} className="p-4 bg-card border-border hover:border-primary/50 transition-colors">
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-primary truncate">
                          {entry.description}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(entry.timestamp)}
                          {idx === 0 && <span className="ml-2 text-primary">(Current)</span>}
                        </p>
                      </div>
                    </div>

                    {entry.stats && (
                      <div className="space-y-1 text-xs mb-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Size:</span>
                          <span className="text-foreground font-mono">
                            {entry.stats.totalBits} bits ({formatBytes(entry.stats.totalBits)})
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Entropy:</span>
                          <span className="text-foreground font-mono">
                            {entry.stats.entropy.toFixed(4)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Distribution:</span>
                          <span className="text-foreground font-mono">
                            0s: {entry.stats.zeroCount} | 1s: {entry.stats.oneCount}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onCompareVersion(entry)}
                        className="h-7 text-xs flex-1"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Compare
                      </Button>
                      {idx > 0 && (
                        <Button
                          size="sm"
                          onClick={() => onRestoreVersion(entry)}
                          className="h-7 text-xs flex-1"
                        >
                          Restore
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
};
