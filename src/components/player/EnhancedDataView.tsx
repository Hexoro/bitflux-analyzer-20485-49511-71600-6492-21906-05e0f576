/**
 * EnhancedDataView - Professional binary data visualization
 * Shows current state with hex view, statistics, and export options
 */

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileCode, 
  Copy, 
  Download, 
  Hash, 
  Binary,
  Grid,
  List,
  Activity,
  Database,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

interface EnhancedDataViewProps {
  bits: string;
  stepIndex: number;
  initialBits?: string;
  finalBits?: string;
}

export const EnhancedDataView = ({ 
  bits, 
  stepIndex,
  initialBits,
  finalBits 
}: EnhancedDataViewProps) => {
  const [viewMode, setViewMode] = useState<'binary' | 'hex' | 'ascii'>('binary');
  const [groupSize, setGroupSize] = useState(8);

  const stats = useMemo(() => {
    const ones = (bits.match(/1/g) || []).length;
    const zeros = bits.length - ones;
    const balance = bits.length > 0 ? ones / bits.length : 0;
    
    // Calculate entropy
    let entropy = 0;
    if (bits.length > 0) {
      const p1 = ones / bits.length;
      const p0 = zeros / bits.length;
      if (p1 > 0) entropy -= p1 * Math.log2(p1);
      if (p0 > 0) entropy -= p0 * Math.log2(p0);
    }
    
    // Calculate transitions
    let transitions = 0;
    for (let i = 1; i < bits.length; i++) {
      if (bits[i] !== bits[i - 1]) transitions++;
    }
    
    return {
      total: bits.length,
      bytes: Math.ceil(bits.length / 8),
      ones,
      zeros,
      balance,
      entropy,
      transitions,
      transitionRate: bits.length > 1 ? transitions / (bits.length - 1) : 0,
    };
  }, [bits]);

  // Convert to hex
  const hexView = useMemo(() => {
    const hexRows: Array<{ offset: number; hex: string; ascii: string }> = [];
    const bytesPerRow = 16;
    
    for (let i = 0; i < bits.length; i += bytesPerRow * 8) {
      let hex = '';
      let ascii = '';
      
      for (let j = 0; j < bytesPerRow; j++) {
        const byteStart = i + j * 8;
        if (byteStart >= bits.length) break;
        
        const byte = bits.slice(byteStart, byteStart + 8).padEnd(8, '0');
        const value = parseInt(byte, 2);
        hex += value.toString(16).padStart(2, '0').toUpperCase() + ' ';
        ascii += value >= 32 && value <= 126 ? String.fromCharCode(value) : '.';
      }
      
      hexRows.push({
        offset: i / 8,
        hex: hex.trim(),
        ascii,
      });
    }
    
    return hexRows;
  }, [bits]);

  // Format binary for display
  const formattedBinary = useMemo(() => {
    const groups: string[] = [];
    for (let i = 0; i < bits.length; i += groupSize) {
      groups.push(bits.slice(i, i + groupSize));
    }
    return groups;
  }, [bits, groupSize]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(bits);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([bits], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `binary-step-${stepIndex}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded');
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-6 gap-2">
        <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/30">
          <CardContent className="py-2 text-center">
            <div className="text-lg font-bold text-primary">{stats.total}</div>
            <div className="text-[10px] text-muted-foreground">Bits</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-cyan-500/10 to-transparent border-cyan-500/30">
          <CardContent className="py-2 text-center">
            <div className="text-lg font-bold text-cyan-400">{stats.bytes}</div>
            <div className="text-[10px] text-muted-foreground">Bytes</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/30">
          <CardContent className="py-2 text-center">
            <div className="text-lg font-bold text-green-400">{stats.ones}</div>
            <div className="text-[10px] text-muted-foreground">Ones</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-muted/30 to-transparent">
          <CardContent className="py-2 text-center">
            <div className="text-lg font-bold">{stats.zeros}</div>
            <div className="text-[10px] text-muted-foreground">Zeros</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-500/10 to-transparent border-yellow-500/30">
          <CardContent className="py-2 text-center">
            <div className="text-lg font-bold text-yellow-400">{stats.entropy.toFixed(3)}</div>
            <div className="text-[10px] text-muted-foreground">Entropy</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/30">
          <CardContent className="py-2 text-center">
            <div className="text-lg font-bold text-purple-400">{(stats.balance * 100).toFixed(1)}%</div>
            <div className="text-[10px] text-muted-foreground">Balance</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Data Card */}
      <Card className="bg-gradient-to-b from-card to-muted/10">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center">
                <Database className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-sm">Current Binary State</CardTitle>
                <p className="text-xs text-muted-foreground">Step {stepIndex}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 mr-2">
                <Button
                  size="sm"
                  variant={viewMode === 'binary' ? 'default' : 'outline'}
                  onClick={() => setViewMode('binary')}
                  className="h-7 px-2"
                >
                  <Binary className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'hex' ? 'default' : 'outline'}
                  onClick={() => setViewMode('hex')}
                  className="h-7 px-2"
                >
                  <Hash className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'ascii' ? 'default' : 'outline'}
                  onClick={() => setViewMode('ascii')}
                  className="h-7 px-2"
                >
                  <FileCode className="w-3 h-3" />
                </Button>
              </div>
              <Button size="sm" variant="outline" onClick={handleCopy} className="h-7">
                <Copy className="w-3 h-3 mr-1" />
                Copy
              </Button>
              <Button size="sm" variant="outline" onClick={handleDownload} className="h-7">
                <Download className="w-3 h-3 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] border rounded-lg bg-muted/10">
            {viewMode === 'binary' && (
              <div className="p-4 font-mono text-xs">
                <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                  <span>Group by:</span>
                  {[4, 8, 16, 32].map(size => (
                    <Button
                      key={size}
                      size="sm"
                      variant={groupSize === size ? 'default' : 'ghost'}
                      onClick={() => setGroupSize(size)}
                      className="h-5 px-2 text-[10px]"
                    >
                      {size}
                    </Button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1 leading-relaxed">
                  {formattedBinary.slice(0, 500).map((group, i) => (
                    <span 
                      key={i} 
                      className="hover:bg-primary/20 rounded px-0.5 cursor-default"
                      title={`Offset: ${i * groupSize}`}
                    >
                      {group.split('').map((bit, j) => (
                        <span 
                          key={j}
                          className={bit === '1' ? 'text-green-400' : 'text-muted-foreground'}
                        >
                          {bit}
                        </span>
                      ))}
                    </span>
                  ))}
                  {formattedBinary.length > 500 && (
                    <span className="text-muted-foreground">
                      ... ({formattedBinary.length - 500} more groups)
                    </span>
                  )}
                </div>
              </div>
            )}
            
            {viewMode === 'hex' && (
              <div className="p-4 font-mono text-xs space-y-1">
                <div className="flex text-muted-foreground mb-2">
                  <span className="w-16">Offset</span>
                  <span className="flex-1">Hex</span>
                  <span className="w-20 text-right">ASCII</span>
                </div>
                {hexView.slice(0, 100).map((row, i) => (
                  <div key={i} className="flex hover:bg-muted/20 rounded">
                    <span className="w-16 text-muted-foreground">
                      {row.offset.toString(16).padStart(6, '0').toUpperCase()}
                    </span>
                    <span className="flex-1 text-primary">
                      {row.hex}
                    </span>
                    <span className="w-20 text-right text-cyan-400">
                      {row.ascii}
                    </span>
                  </div>
                ))}
                {hexView.length > 100 && (
                  <div className="text-center text-muted-foreground py-2">
                    ... ({hexView.length - 100} more rows)
                  </div>
                )}
              </div>
            )}
            
            {viewMode === 'ascii' && (
              <div className="p-4 font-mono text-sm leading-relaxed">
                {hexView.slice(0, 100).map(row => row.ascii).join('')}
                {hexView.length > 100 && (
                  <span className="text-muted-foreground"> ... (truncated)</span>
                )}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Comparison with Initial/Final */}
      {(initialBits || finalBits) && (
        <Card>
          <CardHeader className="py-2 bg-muted/30">
            <CardTitle className="text-xs flex items-center gap-2">
              <Sparkles className="w-3 h-3" />
              Comparison
            </CardTitle>
          </CardHeader>
          <CardContent className="py-3">
            <div className="grid grid-cols-2 gap-4 text-xs">
              {initialBits && (
                <div>
                  <div className="text-muted-foreground mb-1">vs Initial</div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {bits.length === initialBits.length ? 'Same length' : `${bits.length - initialBits.length > 0 ? '+' : ''}${bits.length - initialBits.length} bits`}
                    </Badge>
                    <Badge variant="secondary">
                      {(() => {
                        let diff = 0;
                        for (let i = 0; i < Math.min(bits.length, initialBits.length); i++) {
                          if (bits[i] !== initialBits[i]) diff++;
                        }
                        return `${diff} changed`;
                      })()}
                    </Badge>
                  </div>
                </div>
              )}
              {finalBits && bits !== finalBits && (
                <div>
                  <div className="text-muted-foreground mb-1">vs Final</div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {bits.length === finalBits.length ? 'Same length' : `${bits.length - finalBits.length > 0 ? '+' : ''}${bits.length - finalBits.length} bits`}
                    </Badge>
                    <Badge variant="secondary">
                      {(() => {
                        let diff = 0;
                        for (let i = 0; i < Math.min(bits.length, finalBits.length); i++) {
                          if (bits[i] !== finalBits[i]) diff++;
                        }
                        return `${diff} remaining`;
                      })()}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
