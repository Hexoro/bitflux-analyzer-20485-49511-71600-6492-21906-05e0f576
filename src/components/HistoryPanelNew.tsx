import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HistoryEntry } from '@/lib/historyManager';
import { HistoryGroup } from '@/lib/fileState';
import { Badge } from '@/components/ui/badge';
import jsPDF from 'jspdf';
import { 
  Clock, 
  GitCompare, 
  RotateCcw, 
  ChevronDown, 
  ChevronRight, 
  FolderOpen, 
  Plus, 
  Minus, 
  Edit,
  Activity,
  Zap,
  TrendingUp,
  TrendingDown,
  Download,
  FileJson,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

interface ChangeInfo {
  type: 'added' | 'deleted' | 'modified';
  position: number;
  count: number;
  preview?: string;
}

interface HistoryPanelNewProps {
  groups: HistoryGroup[];
  onRestoreVersion: (entry: HistoryEntry) => void;
  onRestoreToNewFile: (entry: HistoryEntry) => void;
  onCompareVersion: (entry: HistoryEntry) => void;
  onToggleGroup: (groupId: string) => void;
}

export const HistoryPanelNew = ({ 
  groups, 
  onRestoreVersion,
  onRestoreToNewFile, 
  onCompareVersion,
  onToggleGroup 
}: HistoryPanelNewProps) => {
  
  const calculateDiff = (currentEntry: HistoryEntry, previousEntry: HistoryEntry | null): ChangeInfo[] => {
    if (!previousEntry) {
      return [{
        type: 'added',
        position: 0,
        count: currentEntry.bits.length,
        preview: currentEntry.bits.substring(0, 20) + (currentEntry.bits.length > 20 ? '...' : '')
      }];
    }

    const changes: ChangeInfo[] = [];
    const current = currentEntry.bits;
    const previous = previousEntry.bits;
    const lengthDiff = current.length - previous.length;
    
    if (lengthDiff > 0) {
      changes.push({
        type: 'added',
        position: previous.length,
        count: lengthDiff,
        preview: current.substring(previous.length, previous.length + 20) + (lengthDiff > 20 ? '...' : '')
      });
    } else if (lengthDiff < 0) {
      changes.push({
        type: 'deleted',
        position: current.length,
        count: Math.abs(lengthDiff),
        preview: previous.substring(current.length, current.length + 20) + (Math.abs(lengthDiff) > 20 ? '...' : '')
      });
    }
    
    const minLength = Math.min(current.length, previous.length);
    let modifiedStart = -1;
    let modifiedCount = 0;
    
    for (let i = 0; i < minLength; i++) {
      if (current[i] !== previous[i]) {
        if (modifiedStart === -1) modifiedStart = i;
        modifiedCount++;
      } else if (modifiedStart !== -1 && modifiedCount > 0) {
        changes.push({
          type: 'modified',
          position: modifiedStart,
          count: modifiedCount,
          preview: current.substring(modifiedStart, Math.min(modifiedStart + 20, current.length))
        });
        modifiedStart = -1;
        modifiedCount = 0;
      }
    }
    
    if (modifiedStart !== -1 && modifiedCount > 0) {
      changes.push({
        type: 'modified',
        position: modifiedStart,
        count: modifiedCount,
        preview: current.substring(modifiedStart, Math.min(modifiedStart + 20, current.length))
      });
    }
    
    return changes.length > 0 ? changes : [];
  };

  const getEntropyDelta = (current: HistoryEntry, previous: HistoryEntry | null) => {
    if (!previous || !current.stats || !previous.stats) return null;
    return current.stats.entropy - previous.stats.entropy;
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  };

  const formatBytes = (bits: number) => {
    const bytes = bits / 8;
    if (bytes < 1024) return `${bytes.toFixed(0)} B`;
    return `${(bytes / 1024).toFixed(2)} KB`;
  };

  const handleExportHistory = () => {
    if (groups.length === 0) {
      toast.info('No history to export');
      return;
    }

    const allEntries = groups.flatMap(g => g.entries);
    const exportData = {
      exportedAt: new Date().toISOString(),
      totalEntries: allEntries.length,
      groups: groups.map(g => ({
        id: g.id,
        type: g.type,
        count: g.count,
        lastTimestamp: g.lastTimestamp.toISOString(),
        entries: g.entries.map(e => ({
          id: e.id,
          timestamp: e.timestamp.toISOString(),
          description: e.description,
          stats: e.stats,
          bitsPreview: e.bits.substring(0, 100) + (e.bits.length > 100 ? '...' : ''),
          totalBits: e.bits.length
        }))
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `history_export_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('History exported successfully');
  };

  const handleExportFullHistory = () => {
    if (groups.length === 0) {
      toast.info('No history to export');
      return;
    }

    const allEntries = groups.flatMap(g => g.entries);
    const exportData = {
      exportedAt: new Date().toISOString(),
      totalEntries: allEntries.length,
      entries: allEntries.map(e => ({
        id: e.id,
        timestamp: e.timestamp.toISOString(),
        description: e.description,
        stats: e.stats,
        bits: e.bits
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `full_history_export_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Full history with bits exported');
  };

  const handleExportPDF = () => {
    if (groups.length === 0) {
      toast.info('No history to export');
      return;
    }

    const allEntries = groups.flatMap(g => g.entries);
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Edit History Report', 20, 25);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(156, 163, 175);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 35);
    doc.setTextColor(100, 200, 255);
    doc.text('BSEE', pageWidth - 30, 25);
    
    let y = 55;
    
    // Summary stats
    doc.setFillColor(241, 245, 249);
    doc.rect(15, y - 5, pageWidth - 30, 12, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 132, 255);
    doc.text('SUMMARY', 20, y + 3);
    y += 15;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`Total Entries: ${allEntries.length}`, 20, y);
    y += 6;
    doc.text(`Groups: ${groups.length}`, 20, y);
    y += 6;
    if (allEntries[0]) {
      doc.text(`Latest: ${new Date(allEntries[0].timestamp).toLocaleString()}`, 20, y);
      y += 6;
    }
    if (allEntries[allEntries.length - 1]) {
      doc.text(`Oldest: ${new Date(allEntries[allEntries.length - 1].timestamp).toLocaleString()}`, 20, y);
    }
    y += 15;
    
    // Entries
    doc.setFillColor(241, 245, 249);
    doc.rect(15, y - 5, pageWidth - 30, 12, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 132, 255);
    doc.text(`HISTORY ENTRIES (${allEntries.length})`, 20, y + 3);
    y += 15;
    
    allEntries.slice(0, 50).forEach((entry, idx) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(128, 128, 128);
      doc.text(new Date(entry.timestamp).toLocaleString(), 20, y);
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      const desc = entry.description.length > 60 ? entry.description.slice(0, 57) + '...' : entry.description;
      doc.text(desc, 75, y);
      
      if (entry.stats) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(128, 128, 128);
        doc.text(`${entry.stats.totalBits} bits | H=${entry.stats.entropy.toFixed(3)}`, 160, y);
      }
      
      y += 7;
    });
    
    if (allEntries.length > 50) {
      y += 5;
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(128, 128, 128);
      doc.text(`... and ${allEntries.length - 50} more entries`, 20, y);
    }
    
    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 40, 285);
      doc.text('BSEE - Binary Structural Exploration Engine', pageWidth / 2, 285, { align: 'center' });
    }
    
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `history_report_${Date.now()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('History PDF exported');
  };

  const totalEntries = groups.reduce((sum, g) => sum + g.count, 0);

  if (groups.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <Card className="bg-muted/20 border-dashed max-w-md">
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-1">No History Available</p>
              <p className="text-sm">Edits will appear here as you make changes</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header Stats */}
      <div className="p-4 border-b border-border bg-card">
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="p-2 bg-primary/10 rounded-lg text-center">
            <div className="text-xs text-muted-foreground">Total Entries</div>
            <div className="text-xl font-bold text-primary">{totalEntries}</div>
          </div>
          <div className="p-2 bg-cyan-500/10 rounded-lg text-center">
            <div className="text-xs text-muted-foreground">Groups</div>
            <div className="text-xl font-bold text-cyan-400">{groups.length}</div>
          </div>
          <div className="p-2 bg-green-500/10 rounded-lg text-center">
            <div className="text-xs text-muted-foreground">Latest</div>
            <div className="text-sm font-bold text-green-400">
              {groups[0] ? formatTime(groups[0].lastTimestamp) : '--'}
            </div>
          </div>
        </div>
        
        {/* Export Buttons */}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1" onClick={handleExportHistory}>
            <Download className="w-3 h-3 mr-1" />
            Summary
          </Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={handleExportFullHistory}>
            <FileJson className="w-3 h-3 mr-1" />
            Full JSON
          </Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={handleExportPDF}>
            <FileText className="w-3 h-3 mr-1" />
            PDF
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {groups.map((group, groupIndex) => {
            const previousEntry = groupIndex < groups.length - 1 
              ? groups[groupIndex + 1].entries[0] 
              : null;
            
            return (
              <div key={group.id}>
                {group.count === 1 ? (
                  <Card className="bg-gradient-to-r from-card to-transparent border-border hover:border-primary/50 transition-all overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="font-mono text-xs">
                              #{groups.length - groupIndex}
                            </Badge>
                            <span className="font-medium text-sm truncate">
                              {group.entries[0].description}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-2">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(group.entries[0].timestamp)}
                            </span>
                            {group.entries[0].stats && (
                              <>
                                <Badge variant="secondary" className="text-[10px]">
                                  {formatBytes(group.entries[0].stats.totalBits)}
                                </Badge>
                                <Badge variant="secondary" className="text-[10px]">
                                  E: {group.entries[0].stats.entropy.toFixed(3)}
                                </Badge>
                              </>
                            )}
                          </div>

                          {/* Transformation Details */}
                          <div className="space-y-1">
                            {calculateDiff(group.entries[0], previousEntry).map((change, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs">
                                {change.type === 'added' && (
                                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">
                                    <Plus className="w-3 h-3 mr-1" />
                                    +{change.count} bits
                                  </Badge>
                                )}
                                {change.type === 'deleted' && (
                                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">
                                    <Minus className="w-3 h-3 mr-1" />
                                    -{change.count} bits
                                  </Badge>
                                )}
                                {change.type === 'modified' && (
                                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]">
                                    <Edit className="w-3 h-3 mr-1" />
                                    ~{change.count} changed
                                  </Badge>
                                )}
                                <code className="font-mono text-[10px] bg-muted/50 px-1 rounded truncate max-w-[150px]">
                                  @{change.position}
                                </code>
                              </div>
                            ))}

                            {/* Entropy Delta */}
                            {(() => {
                              const delta = getEntropyDelta(group.entries[0], previousEntry);
                              if (delta === null) return null;
                              return (
                                <div className="flex items-center gap-2 text-xs mt-1">
                                  {delta < 0 ? (
                                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">
                                      <TrendingDown className="w-3 h-3 mr-1" />
                                      Entropy: {delta.toFixed(4)}
                                    </Badge>
                                  ) : delta > 0 ? (
                                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">
                                      <TrendingUp className="w-3 h-3 mr-1" />
                                      Entropy: +{delta.toFixed(4)}
                                    </Badge>
                                  ) : null}
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onCompareVersion(group.entries[0])}
                            className="h-7 w-7 p-0"
                            title="Compare"
                          >
                            <GitCompare className="w-3 h-3" />
                          </Button>
                          {groupIndex > 0 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onRestoreVersion(group.entries[0])}
                              className="h-7 w-7 p-0"
                              title="Restore"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onRestoreToNewFile(group.entries[0])}
                            className="h-7 w-7 p-0"
                            title="New file"
                          >
                            <FolderOpen className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="overflow-hidden">
                    <button
                      className="w-full p-4 flex items-center justify-between gap-2 hover:bg-muted/20 transition-colors text-left"
                      onClick={() => onToggleGroup(group.id)}
                    >
                      <div className="flex items-center gap-3">
                        {group.expanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                        <Badge variant="outline" className="font-mono text-xs">
                          #{groups.length - groupIndex}
                        </Badge>
                        <span className="font-medium text-sm">
                          {group.type} ({group.count} changes)
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(group.lastTimestamp)}
                      </span>
                    </button>

                    {group.expanded && (
                      <div className="border-t border-border">
                        {group.entries.map((entry, entryIndex) => {
                          const prevEntry = entryIndex < group.entries.length - 1
                            ? group.entries[entryIndex + 1]
                            : (groupIndex < groups.length - 1 ? groups[groupIndex + 1].entries[0] : null);
                          
                          return (
                            <div
                              key={entry.id}
                              className="p-3 border-b border-border/50 last:border-b-0 hover:bg-muted/10"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm mb-1 truncate">{entry.description}</div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Clock className="w-3 h-3" />
                                    {formatTime(entry.timestamp)}
                                    {entry.stats && (
                                      <Badge variant="secondary" className="text-[10px]">
                                        E: {entry.stats.entropy.toFixed(3)}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => onCompareVersion(entry)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <GitCompare className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => onRestoreVersion(entry)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};