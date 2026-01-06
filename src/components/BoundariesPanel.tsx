import { useState, useMemo } from 'react';
import { BinaryMetrics } from '@/lib/binaryMetrics';
import { Boundary, PartitionManager } from '@/lib/partitionManager';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Sparkles, X, Eye, EyeOff, MapPin, Layers, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface BoundariesPanelProps {
  bits: string;
  stats: any;
  boundaries: Boundary[];
  partitionManager: PartitionManager;
  onJumpTo: (index: number) => void;
  onAppendBoundary: (boundary: string, description: string, color: string) => void;
  onInsertBoundary: (boundary: string, description: string, color: string, position: number) => void;
  onRemoveBoundary: (id: string) => void;
  onToggleHighlight: (id: string) => void;
}

const findUniquePalindrome = (bits: string): { sequence: string; position: number } | null => {
  const palindromes: Array<{ sequence: string; position: number }> = [];
  
  for (let i = 0; i < bits.length; i++) {
    let len = 1;
    while (i - len >= 0 && i + len < bits.length && bits[i - len] === bits[i + len]) {
      len++;
    }
    const oddPal = bits.substring(i - len + 1, i + len);
    if (oddPal.length >= 8) {
      palindromes.push({ sequence: oddPal, position: i - len + 1 });
    }
    
    len = 0;
    while (i - len >= 0 && i + 1 + len < bits.length && bits[i - len] === bits[i + 1 + len]) {
      len++;
    }
    const evenPal = bits.substring(i - len + 1, i + len + 1);
    if (evenPal.length >= 8) {
      palindromes.push({ sequence: evenPal, position: i - len + 1 });
    }
  }
  
  palindromes.sort((a, b) => b.sequence.length - a.sequence.length);
  
  for (const pal of palindromes) {
    const occurrences = (bits.match(new RegExp(pal.sequence, 'g')) || []).length;
    if (occurrences === 1) {
      return pal;
    }
  }
  
  return null;
};

export const BoundariesPanel = ({ 
  bits, 
  stats, 
  boundaries,
  partitionManager,
  onJumpTo, 
  onAppendBoundary,
  onInsertBoundary,
  onRemoveBoundary,
  onToggleHighlight 
}: BoundariesPanelProps) => {
  const [customBoundary, setCustomBoundary] = useState('');
  const [generatedBoundary, setGeneratedBoundary] = useState<string | null>(null);
  const [boundaryColor, setBoundaryColor] = useState('#00FFFF');
  const [insertPosition, setInsertPosition] = useState('');

  const handleGenerateUnique = () => {
    const boundary = BinaryMetrics.findUniqueBoundary(bits, 8, 32);
    if (boundary) {
      setGeneratedBoundary(boundary);
      toast.success(`Generated unique ${boundary.length}-bit boundary`);
    } else {
      toast.error('Could not find a unique boundary sequence');
    }
  };

  const validateBoundary = (sequence: string) => {
    if (!/^[01]+$/.test(sequence)) {
      toast.error('Boundary must only contain 0s and 1s');
      return false;
    }
    
    const occurrences = (bits.match(new RegExp(sequence, 'g')) || []).length;
    if (occurrences > 1) {
      toast.error('This sequence occurs multiple times in the file');
      return false;
    }
    
    if (occurrences === 0) {
      return true;
    }
    
    toast.error('This sequence already exists in the file exactly once');
    return false;
  };

  const multipleBoundaries = boundaries.filter(b => b.positions.length > 1);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Stats Header */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-gradient-to-br from-primary/20 to-transparent border-primary/30">
            <CardContent className="py-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <MapPin className="w-3 h-3" />
                Boundaries
              </div>
              <div className="text-2xl font-bold text-primary">{boundaries.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/20 to-transparent border-green-500/30">
            <CardContent className="py-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Layers className="w-3 h-3" />
                Partitions
              </div>
              <div className="text-2xl font-bold text-green-400">{boundaries.length + 1}</div>
            </CardContent>
          </Card>
          {multipleBoundaries.length > 0 && (
            <Card className="bg-gradient-to-br from-red-500/20 to-transparent border-red-500/30">
              <CardContent className="py-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <AlertTriangle className="w-3 h-3" />
                  Duplicates
                </div>
                <div className="text-2xl font-bold text-red-400">{multipleBoundaries.length}</div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Active Boundaries */}
        {boundaries.length > 0 && (
          <Card className="overflow-hidden">
            <CardHeader className="py-3 bg-muted/30">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Active Boundaries ({boundaries.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {boundaries.map((boundary) => {
                  const hasMultiple = boundary.positions.length > 1;
                  const isHighlighted = partitionManager.isHighlightEnabled(boundary.id);
                  
                  return (
                    <div 
                      key={boundary.id} 
                      className={`p-3 hover:bg-muted/20 transition-colors ${hasMultiple ? 'bg-red-500/5' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div
                            className="w-4 h-4 rounded-md border border-border flex-shrink-0 mt-1"
                            style={{ backgroundColor: boundary.color }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm truncate">{boundary.description}</span>
                              {hasMultiple && (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Multiple
                                </Badge>
                              )}
                            </div>
                            <div className="font-mono text-xs text-muted-foreground truncate">
                              {boundary.sequence.substring(0, 30)}
                              {boundary.sequence.length > 30 && '...'}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">{boundary.sequence.length} bits</Badge>
                              <Badge variant="secondary" className="text-xs">{boundary.positions.length} occurrence{boundary.positions.length !== 1 ? 's' : ''}</Badge>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {boundary.positions.slice(0, 5).map((pos, idx) => (
                                <Button
                                  key={idx}
                                  size="sm"
                                  variant="outline"
                                  onClick={() => onJumpTo(pos)}
                                  className="h-5 px-2 text-xs font-mono"
                                >
                                  {pos}
                                </Button>
                              ))}
                              {boundary.positions.length > 5 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{boundary.positions.length - 5}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            onClick={() => onToggleHighlight(boundary.id)}
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                          >
                            {isHighlighted ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4" />}
                          </Button>
                          <Button
                            onClick={() => onRemoveBoundary(boundary.id)}
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generate Unique Boundary */}
        <Card className="bg-gradient-to-r from-card to-muted/20 overflow-hidden">
          <CardHeader className="py-3 bg-muted/30">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Generate Unique Boundary
            </CardTitle>
          </CardHeader>
          <CardContent className="py-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Create a boundary sequence that doesn't appear anywhere in your data.
            </p>
            
            <Button 
              onClick={handleGenerateUnique} 
              className="w-full bg-primary hover:bg-primary/90"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Unique Boundary
            </Button>

            {generatedBoundary && (
              <div className="space-y-3">
                <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Generated Boundary:</div>
                  <div className="text-sm font-mono text-primary break-all">
                    {generatedBoundary.substring(0, 80)}
                    {generatedBoundary.length > 80 && '...'}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">{generatedBoundary.length} bits</Badge>
                    <Badge variant="secondary">{generatedBoundary.split('1').length - 1} ones</Badge>
                    <Badge variant="secondary">{generatedBoundary.split('0').length - 1} zeros</Badge>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={boundaryColor}
                    onChange={(e) => setBoundaryColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border border-border bg-transparent"
                  />
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <Button 
                      onClick={() => {
                        onAppendBoundary(generatedBoundary, 'Boundary sequence', boundaryColor);
                        setGeneratedBoundary(null);
                      }}
                    >
                      Append
                    </Button>
                    <div className="flex gap-1">
                      <Input
                        type="number"
                        placeholder="Pos"
                        value={insertPosition}
                        onChange={(e) => setInsertPosition(e.target.value)}
                        className="w-20"
                      />
                      <Button 
                        onClick={() => {
                          const pos = parseInt(insertPosition);
                          if (!isNaN(pos) && pos >= 0 && pos <= bits.length) {
                            onInsertBoundary(generatedBoundary, 'Boundary sequence', boundaryColor, pos);
                            setGeneratedBoundary(null);
                            setInsertPosition('');
                          } else {
                            toast.error('Invalid position');
                          }
                        }}
                        disabled={!insertPosition}
                        className="flex-1"
                      >
                        Insert
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Custom Boundary */}
        <Card className="overflow-hidden">
          <CardHeader className="py-3 bg-muted/30">
            <CardTitle className="text-sm">Custom Boundary</CardTitle>
          </CardHeader>
          <CardContent className="py-4 space-y-3">
            <Input
              placeholder="Enter binary sequence (e.g., 11110000)"
              value={customBoundary}
              onChange={(e) => setCustomBoundary(e.target.value)}
              className="font-mono bg-background"
            />
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={boundaryColor}
                onChange={(e) => setBoundaryColor(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border border-border bg-transparent"
              />
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Button 
                  onClick={() => {
                    if (validateBoundary(customBoundary)) {
                      onAppendBoundary(customBoundary, `Custom: ${customBoundary.substring(0, 10)}...`, boundaryColor);
                      setCustomBoundary('');
                    }
                  }}
                  disabled={!customBoundary}
                  variant="outline"
                >
                  Append
                </Button>
                <div className="flex gap-1">
                  <Input
                    type="number"
                    placeholder="Pos"
                    value={insertPosition}
                    onChange={(e) => setInsertPosition(e.target.value)}
                    className="w-20"
                  />
                  <Button 
                    onClick={() => {
                      const pos = parseInt(insertPosition);
                      if (validateBoundary(customBoundary) && !isNaN(pos) && pos >= 0 && pos <= bits.length) {
                        onInsertBoundary(customBoundary, `Custom: ${customBoundary.substring(0, 10)}...`, boundaryColor, pos);
                        setCustomBoundary('');
                        setInsertPosition('');
                      }
                    }}
                    disabled={!customBoundary || !insertPosition}
                    variant="outline"
                    className="flex-1"
                  >
                    Insert
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-muted/20 border-muted">
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">
              <strong>💡 About Boundaries:</strong> Boundaries are special sequences that mark divisions in your binary data. 
              They're useful for partitioning files or adding markers. A good boundary should be unique and recognizable.
            </p>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};
