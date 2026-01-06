/**
 * MaskOverlayView - Visual mask overlay that highlights which bits are affected
 * Shows data bits with mask overlay color coding
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Layers, Eye, EyeOff } from 'lucide-react';

interface MaskOverlayViewProps {
  bits: string;
  mask?: string;
  bitRanges?: { start: number; end: number }[];
  bytesPerRow?: number;
}

export const MaskOverlayView = ({ 
  bits, 
  mask, 
  bitRanges = [],
  bytesPerRow = 16 
}: MaskOverlayViewProps) => {
  const bitsPerRow = bytesPerRow * 8;

  // Calculate which bits are affected by mask or ranges
  const affectedBits = useMemo(() => {
    const affected = new Set<number>();
    
    // Add bits from mask (where mask bit is '1')
    if (mask) {
      for (let i = 0; i < mask.length && i < bits.length; i++) {
        if (mask[i] === '1') {
          affected.add(i);
        }
      }
    }
    
    // Add bits from ranges
    for (const range of bitRanges) {
      for (let i = range.start; i < range.end && i < bits.length; i++) {
        affected.add(i);
      }
    }
    
    return affected;
  }, [bits, mask, bitRanges]);

  // Create rows of bits for display
  const rows = useMemo(() => {
    const result: { bits: string; startIndex: number }[] = [];
    for (let i = 0; i < bits.length; i += bitsPerRow) {
      result.push({
        bits: bits.slice(i, i + bitsPerRow),
        startIndex: i,
      });
    }
    return result;
  }, [bits, bitsPerRow]);

  // Stats
  const totalAffected = affectedBits.size;
  const percentAffected = bits.length > 0 ? ((totalAffected / bits.length) * 100).toFixed(1) : '0';
  const maskOnes = mask ? (mask.match(/1/g) || []).length : 0;
  const maskZeros = mask ? mask.length - maskOnes : 0;

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="flex items-center gap-4 flex-wrap">
        <Badge variant="outline" className="flex items-center gap-1">
          <Layers className="w-3 h-3" />
          {bits.length} bits total
        </Badge>
        <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 flex items-center gap-1">
          <Eye className="w-3 h-3" />
          {totalAffected} affected ({percentAffected}%)
        </Badge>
        <Badge variant="secondary" className="flex items-center gap-1">
          <EyeOff className="w-3 h-3" />
          {bits.length - totalAffected} unchanged
        </Badge>
        {mask && (
          <Badge variant="outline" className="font-mono text-xs">
            Mask: {maskOnes} active / {maskZeros} inactive
          </Badge>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-cyan-500/40 border border-cyan-500"></span>
          <span>Affected by operation</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-muted/30"></span>
          <span>Unchanged</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-green-400 font-bold">1</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground">0</span>
          <span>= Bit value</span>
        </div>
      </div>

      {/* Visual Grid */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Mask Overlay View
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[350px]">
            <div className="font-mono text-xs space-y-1">
              {rows.slice(0, 50).map((row, rowIndex) => (
                <div key={rowIndex} className="flex items-center gap-2">
                  {/* Address */}
                  <span className="text-muted-foreground w-12 text-right flex-shrink-0">
                    {row.startIndex.toString(16).padStart(4, '0').toUpperCase()}
                  </span>
                  
                  {/* Bits with overlay */}
                  <div className="flex flex-wrap gap-px">
                    {row.bits.split('').map((bit, bitIndex) => {
                      const globalIndex = row.startIndex + bitIndex;
                      const isAffected = affectedBits.has(globalIndex);
                      const isByteBoundary = bitIndex > 0 && bitIndex % 8 === 0;
                      
                      return (
                        <span key={bitIndex} className="flex items-center">
                          {isByteBoundary && <span className="w-1" />}
                          <span
                            className={`
                              w-4 h-5 flex items-center justify-center rounded-sm transition-colors
                              ${isAffected 
                                ? 'bg-cyan-500/40 border border-cyan-500/60' 
                                : 'bg-muted/20'
                              }
                              ${bit === '1' 
                                ? isAffected ? 'text-cyan-300 font-bold' : 'text-green-400 font-bold'
                                : 'text-muted-foreground'
                              }
                            `}
                            title={`Bit ${globalIndex}: ${bit} ${isAffected ? '(affected)' : ''}`}
                          >
                            {bit}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                  
                  {/* Byte count */}
                  <span className="text-muted-foreground/50 text-xs">
                    {Math.ceil(row.bits.length / 8)} B
                  </span>
                </div>
              ))}
              {rows.length > 50 && (
                <div className="text-center text-muted-foreground py-4">
                  ... and {rows.length - 50} more rows ({(rows.length - 50) * bitsPerRow} bits)
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Bit Range Details */}
      {bitRanges.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Affected Ranges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {bitRanges.map((range, i) => (
                <div 
                  key={i} 
                  className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded text-xs"
                >
                  <div className="font-mono text-cyan-400">
                    [{range.start} : {range.end}]
                  </div>
                  <div className="text-muted-foreground">
                    {range.end - range.start} bits
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mask Pattern Analysis */}
      {mask && mask.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Mask Pattern</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Pattern preview */}
              <div className="p-2 bg-muted/20 rounded font-mono text-xs break-all max-h-20 overflow-y-auto">
                {mask.slice(0, 256).split('').map((bit, i) => (
                  <span 
                    key={i} 
                    className={bit === '1' ? 'text-cyan-400 font-bold' : 'text-muted-foreground/50'}
                  >
                    {bit}
                  </span>
                ))}
                {mask.length > 256 && <span className="text-muted-foreground">...</span>}
              </div>
              
              {/* Pattern stats */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2 bg-muted/30 rounded text-center">
                  <div className="text-lg font-bold text-cyan-400">{maskOnes}</div>
                  <div className="text-muted-foreground">Active (1)</div>
                </div>
                <div className="p-2 bg-muted/30 rounded text-center">
                  <div className="text-lg font-bold">{maskZeros}</div>
                  <div className="text-muted-foreground">Inactive (0)</div>
                </div>
                <div className="p-2 bg-muted/30 rounded text-center">
                  <div className="text-lg font-bold">{((maskOnes / mask.length) * 100).toFixed(1)}%</div>
                  <div className="text-muted-foreground">Coverage</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
