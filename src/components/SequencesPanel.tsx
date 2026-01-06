import { useState, useEffect } from 'react';
import { BinaryMetrics } from '@/lib/binaryMetrics';
import { FileState, SavedSequence } from '@/lib/fileState';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Search, X, Grid, List, Eye, EyeOff, Sparkles, TrendingUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { toast } from 'sonner';

interface SequencesPanelProps {
  fileState: FileState;
  onJumpTo: (index: number) => void;
}

export const SequencesPanel = ({ fileState, onJumpTo }: SequencesPanelProps) => {
  const [searchInput, setSearchInput] = useState('');
  const [colorInput, setColorInput] = useState('#00FFFF');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [sortFilter, setSortFilter] = useState<string>('serial');
  const [savedSequences, setSavedSequences] = useState<SavedSequence[]>([]);

  const bits = fileState.model.getBits();

  useEffect(() => {
    setSavedSequences(Array.isArray(fileState.savedSequences) ? fileState.savedSequences : []);
  }, [fileState.savedSequences]);

  useEffect(() => {
    const unsubscribe = fileState.subscribe(() => {
      setSavedSequences(Array.isArray(fileState.savedSequences) ? [...fileState.savedSequences] : []);
    });
    return unsubscribe;
  }, [fileState]);

  const handleSearch = () => {
    const sequences = searchInput
      .split(/[,\s]+/)
      .map(s => s.trim())
      .filter(s => /^[01]+$/.test(s));

    if (sequences.length === 0) {
      toast.error('Please enter valid binary sequences');
      return;
    }

    const matches = BinaryMetrics.searchMultipleSequences(bits, sequences);
    
    let addedCount = 0;
    matches.forEach(match => {
      if (!fileState.savedSequences.find(s => s.sequence === match.sequence)) {
        fileState.addSequence(match, colorInput);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      toast.success(`Added ${addedCount} sequence${addedCount > 1 ? 's' : ''}`);
    } else {
      toast.info('All sequences already added');
    }

    setSearchInput('');
  };

  const handleFindAll = () => {
    if (savedSequences.length === 0) {
      toast.info('No sequences to find');
      return;
    }

    const allSequences = savedSequences.map(s => s.sequence);
    const matches = BinaryMetrics.searchMultipleSequences(bits, allSequences);
    
    matches.forEach(match => {
      const existing = fileState.savedSequences.find(s => s.sequence === match.sequence);
      if (existing) {
        fileState.removeSequence(existing.id);
        fileState.addSequence(match, existing.color);
      }
    });

    toast.success('Updated all sequence positions');
  };

  const handleExportSequences = () => {
    if (savedSequences.length === 0) {
      toast.info('No sequences to export');
      return;
    }

    const exportData = savedSequences.map(seq => ({
      sequence: seq.sequence,
      color: seq.color,
      count: seq.count,
      positions: seq.positions,
      meanDistance: seq.meanDistance,
      varianceDistance: seq.varianceDistance
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sequences_export_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Sequences exported');
  };

  const handleToggleHighlight = (id: string) => {
    fileState.toggleSequenceHighlight(id);
  };

  const handleRemoveSequence = (id: string) => {
    fileState.removeSequence(id);
    toast.success('Sequence removed');
  };

  const handleClearAll = () => {
    fileState.clearAllSequences();
    toast.success('All sequences cleared');
  };

  const sortedSequences = (Array.isArray(savedSequences) ? [...savedSequences] : []).sort((a, b) => {
    switch (sortFilter) {
      case 'serial': return a.serialNumber - b.serialNumber;
      case 'count': return b.count - a.count;
      case 'length': return b.sequence.length - a.sequence.length;
      case 'position': return (a.positions[0] || 0) - (b.positions[0] || 0);
      default: return 0;
    }
  });

  const totalOccurrences = savedSequences.reduce((sum, s) => sum + s.count, 0);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Header Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-gradient-to-br from-primary/20 to-transparent border-primary/30">
            <CardContent className="py-3">
              <div className="text-xs text-muted-foreground">Sequences</div>
              <div className="text-2xl font-bold text-primary">{savedSequences.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-cyan-500/20 to-transparent border-cyan-500/30">
            <CardContent className="py-3">
              <div className="text-xs text-muted-foreground">Total Occurrences</div>
              <div className="text-2xl font-bold text-cyan-400">{totalOccurrences}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/20 to-transparent border-green-500/30">
            <CardContent className="py-3">
              <div className="text-xs text-muted-foreground">Coverage</div>
              <div className="text-2xl font-bold text-green-400">
                {bits.length > 0 ? ((totalOccurrences / bits.length) * 100).toFixed(1) : 0}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Card */}
        <Card className="bg-gradient-to-r from-card to-muted/20 border-border overflow-hidden">
          <CardHeader className="py-3 bg-muted/30">
            <CardTitle className="text-sm flex items-center gap-2">
              <Search className="w-4 h-4 text-primary" />
              Sequence Search
            </CardTitle>
          </CardHeader>
          <CardContent className="py-4 space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Enter binary sequences (e.g., 1010, 0011)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="font-mono flex-1 bg-background"
              />
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={colorInput}
                  onChange={(e) => setColorInput(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border border-border bg-transparent"
                  title="Choose highlight color"
                />
                <Button onClick={handleSearch} className="bg-primary hover:bg-primary/90">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>
            {savedSequences.length > 0 && (
              <div className="flex gap-2">
                <Button onClick={handleFindAll} variant="outline" size="sm" className="flex-1">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Refresh All
                </Button>
                <Button onClick={handleExportSequences} variant="outline" size="sm" className="flex-1">
                  Export
                </Button>
                <Button onClick={handleClearAll} variant="outline" size="sm" className="flex-1 text-destructive hover:text-destructive">
                  Clear
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Separate multiple sequences with commas or spaces. Choose color before searching.
            </p>
          </CardContent>
        </Card>

        {savedSequences.length > 0 && (
          <>
            {/* Controls */}
            <Card className="bg-card border-border">
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-muted-foreground">Sort by:</div>
                    <Select value={sortFilter} onValueChange={setSortFilter}>
                      <SelectTrigger className="h-8 w-32 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="serial">Serial #</SelectItem>
                        <SelectItem value="count">Count</SelectItem>
                        <SelectItem value="length">Length</SelectItem>
                        <SelectItem value="position">Position</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={viewMode === 'cards' ? 'default' : 'outline'}
                      onClick={() => setViewMode('cards')}
                      className="h-7 px-2"
                    >
                      <Grid className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant={viewMode === 'table' ? 'default' : 'outline'}
                      onClick={() => setViewMode('table')}
                      className="h-7 px-2"
                    >
                      <List className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {viewMode === 'cards' ? (
              <div className="space-y-3">
                {sortedSequences.map((seq) => (
                  <Card key={seq.id} className="bg-gradient-to-r from-card to-transparent border-border hover:border-primary/50 transition-all overflow-hidden group">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                            style={{ backgroundColor: seq.color + '30', color: seq.color }}
                          >
                            #{seq.serialNumber}
                          </div>
                          <Button
                            onClick={() => handleToggleHighlight(seq.id)}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title={seq.highlighted ? 'Hide highlights' : 'Show highlights'}
                          >
                            {seq.highlighted ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4" />}
                          </Button>
                        </div>
                        <Button
                          onClick={() => handleRemoveSequence(seq.id)}
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="mb-3">
                        <div 
                          className="text-sm font-mono break-all p-2 rounded-lg"
                          style={{ backgroundColor: seq.color + '15' }}
                        >
                          {seq.sequence}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary">{seq.count} match{seq.count !== 1 ? 'es' : ''}</Badge>
                          <Badge variant="outline">{seq.sequence.length} bits</Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                        <div className="p-2 bg-muted/30 rounded-lg">
                          <span className="text-muted-foreground text-xs">Mean Distance</span>
                          <div className="font-mono text-primary">{seq.meanDistance.toFixed(2)}</div>
                        </div>
                        <div className="p-2 bg-muted/30 rounded-lg">
                          <span className="text-muted-foreground text-xs">Variance</span>
                          <div className="font-mono text-primary">{seq.varianceDistance.toFixed(2)}</div>
                        </div>
                      </div>

                      {seq.positions.length > 0 && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-2">
                            Positions (first 8):
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {seq.positions.slice(0, 8).map((pos, posIdx) => (
                              <Button
                                key={posIdx}
                                size="sm"
                                variant="outline"
                                onClick={() => onJumpTo(pos)}
                                className="h-6 px-2 text-xs font-mono hover:bg-primary/20"
                              >
                                {pos}
                              </Button>
                            ))}
                            {seq.positions.length > 8 && (
                              <Badge variant="secondary" className="text-xs">
                                +{seq.positions.length - 8} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-card border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-12">#</TableHead>
                      <TableHead className="w-12">
                        <Eye className="w-4 h-4" />
                      </TableHead>
                      <TableHead className="w-12">Color</TableHead>
                      <TableHead>Sequence</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">Length</TableHead>
                      <TableHead className="text-right">Mean Dist</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedSequences.map((seq) => (
                      <TableRow key={seq.id} className="hover:bg-muted/20">
                        <TableCell className="font-bold text-primary">
                          {seq.serialNumber}
                        </TableCell>
                        <TableCell>
                          <Checkbox
                            checked={seq.highlighted}
                            onCheckedChange={() => handleToggleHighlight(seq.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div
                            className="w-5 h-5 rounded-md border border-border"
                            style={{ backgroundColor: seq.color }}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs max-w-[200px] truncate">
                          {seq.sequence}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {seq.count}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {seq.sequence.length}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {seq.meanDistance.toFixed(1)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => seq.positions[0] && onJumpTo(seq.positions[0])}
                              className="h-6 text-xs px-2"
                            >
                              Jump
                            </Button>
                            <Button
                              onClick={() => handleRemoveSequence(seq.id)}
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-destructive"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </>
        )}

        {savedSequences.length === 0 && (
          <Card className="bg-muted/20 border-dashed">
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium mb-1">No Sequences Found</p>
                <p className="text-sm">Enter binary patterns above to search</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
};
