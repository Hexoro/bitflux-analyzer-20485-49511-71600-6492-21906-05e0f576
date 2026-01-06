/**
 * EnhancedMaskView - Professional mask overlay visualization
 * Shows which bits are affected with detailed analysis
 */

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Layers, 
  Eye, 
  EyeOff, 
  Grid, 
  Maximize2, 
  Minimize2,
  Activity,
  Target,
  Zap
} from 'lucide-react';

interface EnhancedMaskViewProps {
  bits: string;
  mask?: string;
  bitRanges?: { start: number; end: number }[];
  operationName?: string;
  bytesPerRow?: number;
}

export const EnhancedMaskView = ({ 
  bits, 
  mask, 
  bitRanges = [],
  operationName = 'Operation',
  bytesPerRow = 16 
}: EnhancedMaskViewProps) => {
  const [expanded, setExpanded] = useState(false);
  const [showMaskOnly, setShowMaskOnly] = useState(false);
  const bitsPerRow = bytesPerRow * 8;

  const analysis = useMemo(() => {
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
    
    // Byte-level analysis
    const byteStats: Array<{
      index: number;
      affectedCount: number;
      intensity: number;
      before: string;
    }> = [];
    
    for (let i = 0; i < bits.length; i += 8) {
      let affectedCount = 0;
      for (let j = i; j < i + 8 && j < bits.length; j++) {
        if (affected.has(j)) affectedCount++;
      }
      byteStats.push({
        index: i / 8,
        affectedCount,
        intensity: affectedCount / 8,
        before: bits.slice(i, i + 8),
      });
    }
    
    // Pattern analysis on affected bits
    let consecutiveRuns = 0;
    let currentRun = 0;
    let maxRun = 0;
    for (let i = 0; i < bits.length; i++) {
      if (affected.has(i)) {
        currentRun++;
        maxRun = Math.max(maxRun, currentRun);
      } else if (currentRun > 0) {
        consecutiveRuns++;
        currentRun = 0;
      }
    }
    if (currentRun > 0) consecutiveRuns++;
    
    return {
      affected,
      totalAffected: affected.size,
      percentAffected: bits.length > 0 ? (affected.size / bits.length) * 100 : 0,
      byteStats,
      consecutiveRuns,
      maxRun,
      maskOnes: mask ? (mask.match(/1/g) || []).length : 0,
      maskZeros: mask ? mask.length - (mask.match(/1/g) || []).length : 0,
    };
  }, [bits, mask, bitRanges]);

  // Create rows for display
  const rows = useMemo(() => {
    const result: { bits: string; startIndex: number }[] = [];
    const maxBits = expanded ? bits.length : Math.min(bits.length, bitsPerRow * 25);
    for (let i = 0; i < maxBits; i += bitsPerRow) {
      result.push({
        bits: bits.slice(i, i + bitsPerRow),
        startIndex: i,
      });
    }
    return result;
  }, [bits, bitsPerRow, expanded]);

  const getIntensityColor = (intensity: number) => {
    if (intensity === 0) return 'bg-muted/20';
    if (intensity < 0.25) return 'bg-cyan-500/20 border-cyan-500/30';
    if (intensity < 0.5) return 'bg-cyan-500/40 border-cyan-500/50';
    if (intensity < 0.75) return 'bg-cyan-500/60 border-cyan-500/70';
    return 'bg-cyan-500/80 border-cyan-500/90';
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-2">
        <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/30">
          <CardContent className="py-3 text-center">
            <div className="text-2xl font-bold text-primary">{bits.length}</div>
            <div className="text-[10px] text-muted-foreground">Total Bits</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-cyan-500/10 to-transparent border-cyan-500/30">
          <CardContent className="py-3 text-center">
            <div className="text-2xl font-bold text-cyan-400">{analysis.totalAffected}</div>
            <div className="text-[10px] text-muted-foreground">Affected</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-muted/30 to-transparent">
          <CardContent className="py-3 text-center">
            <div className="text-2xl font-bold">{bits.length - analysis.totalAffected}</div>
            <div className="text-[10px] text-muted-foreground">Unchanged</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/30">
          <CardContent className="py-3 text-center">
            <div className="text-2xl font-bold text-green-400">{analysis.percentAffected.toFixed(1)}%</div>
            <div className="text-[10px] text-muted-foreground">Coverage</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-500/10 to-transparent border-yellow-500/30">
          <CardContent className="py-3 text-center">
            <div className="text-2xl font-bold text-yellow-400">{analysis.consecutiveRuns}</div>
            <div className="text-[10px] text-muted-foreground">Regions</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Visualization */}
      <Card className="bg-gradient-to-b from-card to-muted/10">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
                <Layers className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  Mask Overlay
                  <Badge variant="outline" className="font-mono text-xs">
                    {operationName}
                  </Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Visualizing affected bits
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={showMaskOnly ? 'default' : 'outline'}
                onClick={() => setShowMaskOnly(!showMaskOnly)}
                className="h-7 px-2"
              >
                {showMaskOnly ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setExpanded(!expanded)}
                className="h-7 w-7 p-0"
              >
                {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs flex-wrap">
            <div className="flex items-center gap-1">
              <span className="w-4 h-4 rounded bg-cyan-500/60 border border-cyan-500"></span>
              <span>Affected</span>
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

          {/* Bit Grid */}
          <ScrollArea className={expanded ? 'h-[400px]' : 'h-[300px]'}>
            <div className="font-mono text-xs space-y-1">
              {rows.map((row, rowIndex) => (
                <div key={rowIndex} className="flex items-center gap-2">
                  {/* Address */}
                  <span className="text-muted-foreground w-12 text-right flex-shrink-0 text-[10px]">
                    {row.startIndex.toString(16).padStart(4, '0').toUpperCase()}
                  </span>
                  
                  {/* Bits with overlay */}
                  <div className="flex flex-wrap gap-px">
                    {row.bits.split('').map((bit, bitIndex) => {
                      const globalIndex = row.startIndex + bitIndex;
                      const isAffected = analysis.affected.has(globalIndex);
                      const isByteBoundary = bitIndex > 0 && bitIndex % 8 === 0;
                      
                      if (showMaskOnly && !isAffected) {
                        return (
                          <span key={bitIndex} className="flex items-center">
                            {isByteBoundary && <span className="w-1" />}
                            <span className="w-4 h-5 flex items-center justify-center rounded-sm bg-muted/10 text-muted-foreground/30">
                              ·
                            </span>
                          </span>
                        );
                      }
                      
                      return (
                        <span key={bitIndex} className="flex items-center">
                          {isByteBoundary && <span className="w-1" />}
                          <span
                            className={`
                              w-4 h-5 flex items-center justify-center rounded-sm transition-all
                              ${isAffected 
                                ? 'bg-cyan-500/50 border border-cyan-500/70 shadow-sm shadow-cyan-500/20' 
                                : 'bg-muted/20'
                              }
                              ${bit === '1' 
                                ? isAffected ? 'text-cyan-200 font-bold' : 'text-green-400 font-bold'
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
                  <span className="text-muted-foreground/50 text-[10px]">
                    {Math.ceil(row.bits.length / 8)} B
                  </span>
                </div>
              ))}
              {!expanded && bits.length > bitsPerRow * 25 && (
                <div className="text-center text-muted-foreground py-4">
                  <Button variant="ghost" size="sm" onClick={() => setExpanded(true)}>
                    Show all ({Math.ceil(bits.length / bitsPerRow) - 25} more rows)
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Bit Range Details */}
      {bitRanges.length > 0 && (
        <Card>
          <CardHeader className="py-2 bg-muted/30">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Affected Ranges
            </CardTitle>
          </CardHeader>
          <CardContent className="py-3">
            <div className="flex flex-wrap gap-2">
              {bitRanges.map((range, i) => (
                <div 
                  key={i} 
                  className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg"
                >
                  <div className="font-mono text-sm text-cyan-400">
                    [{range.start} : {range.end}]
                  </div>
                  <div className="text-xs text-muted-foreground">
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
          <CardHeader className="py-2 bg-muted/30">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              Mask Pattern
            </CardTitle>
          </CardHeader>
          <CardContent className="py-3 space-y-3">
            {/* Pattern preview */}
            <ScrollArea className="h-20">
              <div className="p-2 bg-muted/20 rounded-lg font-mono text-xs break-all">
                {mask.split('').map((bit, i) => (
                  <span 
                    key={i} 
                    className={bit === '1' ? 'text-cyan-400 font-bold' : 'text-muted-foreground/30'}
                  >
                    {bit}
                    {(i + 1) % 8 === 0 && i < mask.length - 1 && <span className="text-muted-foreground/10"> </span>}
                  </span>
                ))}
              </div>
            </ScrollArea>
            
            {/* Pattern stats */}
            <div className="grid grid-cols-4 gap-2">
              <div className="p-2 bg-muted/30 rounded-lg text-center">
                <div className="text-lg font-bold text-cyan-400">{analysis.maskOnes}</div>
                <div className="text-[10px] text-muted-foreground">Active (1)</div>
              </div>
              <div className="p-2 bg-muted/30 rounded-lg text-center">
                <div className="text-lg font-bold">{analysis.maskZeros}</div>
                <div className="text-[10px] text-muted-foreground">Inactive (0)</div>
              </div>
              <div className="p-2 bg-muted/30 rounded-lg text-center">
                <div className="text-lg font-bold text-green-400">
                  {((analysis.maskOnes / mask.length) * 100).toFixed(1)}%
                </div>
                <div className="text-[10px] text-muted-foreground">Density</div>
              </div>
              <div className="p-2 bg-muted/30 rounded-lg text-center">
                <div className="text-lg font-bold text-yellow-400">{analysis.maxRun}</div>
                <div className="text-[10px] text-muted-foreground">Max Run</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
