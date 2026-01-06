/**
 * EnhancedDiffView - Professional visual diff between two bit strings
 * Shows changed bits with advanced highlighting, statistics, and heatmap
 */

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  GitCompare, 
  ArrowRight, 
  Maximize2, 
  Minimize2, 
  Grid, 
  List,
  Activity,
  Zap,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface EnhancedDiffViewProps {
  beforeBits: string;
  afterBits: string;
  operationName?: string;
  highlightRanges?: { start: number; end: number }[];
  maxDisplayBits?: number;
}

export const EnhancedDiffView = ({ 
  beforeBits, 
  afterBits, 
  operationName = 'Operation',
  highlightRanges = [],
  maxDisplayBits = 1024
}: EnhancedDiffViewProps) => {
  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified' | 'heatmap'>('side-by-side');
  const [expanded, setExpanded] = useState(false);
  const [bytesPerRow] = useState(16);

  const displayLimit = expanded ? maxDisplayBits * 4 : maxDisplayBits;

  const analysis = useMemo(() => {
    const changes: Array<{
      index: number;
      before: string;
      after: string;
      type: '0->1' | '1->0';
    }> = [];
    
    const maxLen = Math.max(beforeBits.length, afterBits.length);
    const displayLen = Math.min(maxLen, displayLimit);
    
    let flipsZeroToOne = 0;
    let flipsOneToZero = 0;
    
    // Track consecutive change regions
    const changeRegions: Array<{ start: number; end: number; count: number }> = [];
    let currentRegion: { start: number; end: number; count: number } | null = null;
    
    for (let i = 0; i < displayLen; i++) {
      const beforeBit = beforeBits[i] || '0';
      const afterBit = afterBits[i] || '0';
      const isChanged = beforeBit !== afterBit;
      
      if (isChanged) {
        const type = beforeBit === '0' ? '0->1' : '1->0';
        if (type === '0->1') flipsZeroToOne++;
        else flipsOneToZero++;
        
        changes.push({ index: i, before: beforeBit, after: afterBit, type });
        
        if (!currentRegion || i > currentRegion.end + 1) {
          if (currentRegion) changeRegions.push(currentRegion);
          currentRegion = { start: i, end: i, count: 1 };
        } else {
          currentRegion.end = i;
          currentRegion.count++;
        }
      }
    }
    
    if (currentRegion) changeRegions.push(currentRegion);
    
    // Calculate byte-level changes
    const byteChanges: Array<{ byteIndex: number; changedBits: number; before: string; after: string }> = [];
    for (let i = 0; i < displayLen; i += 8) {
      const beforeByte = beforeBits.slice(i, i + 8);
      const afterByte = afterBits.slice(i, i + 8);
      if (beforeByte !== afterByte) {
        let changedBits = 0;
        for (let j = 0; j < 8; j++) {
          if (beforeByte[j] !== afterByte[j]) changedBits++;
        }
        byteChanges.push({ byteIndex: i / 8, changedBits, before: beforeByte, after: afterByte });
      }
    }
    
    return {
      totalChanges: changes.length,
      flipsZeroToOne,
      flipsOneToZero,
      changePercent: maxLen > 0 ? (changes.length / maxLen) * 100 : 0,
      changes,
      changeRegions,
      byteChanges,
      beforeLen: beforeBits.length,
      afterLen: afterBits.length,
      lenDiff: afterBits.length - beforeBits.length,
      truncated: maxLen > displayLimit,
    };
  }, [beforeBits, afterBits, displayLimit]);

  // Generate heatmap data
  const heatmapRows = useMemo(() => {
    const rows: Array<{
      index: number;
      bytes: Array<{
        before: string;
        after: string;
        changedCount: number;
        intensity: number;
      }>;
    }> = [];
    
    const bitsPerRow = bytesPerRow * 8;
    for (let rowStart = 0; rowStart < Math.min(beforeBits.length, displayLimit); rowStart += bitsPerRow) {
      const bytes: typeof rows[0]['bytes'] = [];
      
      for (let byteOffset = 0; byteOffset < bitsPerRow; byteOffset += 8) {
        const start = rowStart + byteOffset;
        const beforeByte = beforeBits.slice(start, start + 8);
        const afterByte = afterBits.slice(start, start + 8);
        
        let changedCount = 0;
        for (let i = 0; i < 8; i++) {
          if (beforeByte[i] !== afterByte[i]) changedCount++;
        }
        
        bytes.push({
          before: beforeByte,
          after: afterByte,
          changedCount,
          intensity: changedCount / 8,
        });
      }
      
      rows.push({ index: rowStart, bytes });
    }
    
    return rows;
  }, [beforeBits, afterBits, bytesPerRow, displayLimit]);

  const getIntensityColor = (intensity: number) => {
    if (intensity === 0) return 'bg-muted/30';
    if (intensity < 0.25) return 'bg-blue-500/30';
    if (intensity < 0.5) return 'bg-yellow-500/40';
    if (intensity < 0.75) return 'bg-orange-500/50';
    return 'bg-red-500/60';
  };

  return (
    <Card className="bg-gradient-to-b from-card via-card to-muted/10 border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center">
              <GitCompare className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                Visual Diff
                <Badge variant="outline" className="font-mono text-xs">
                  {operationName}
                </Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Bit-level comparison analysis
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={viewMode === 'side-by-side' ? 'default' : 'outline'}
              onClick={() => setViewMode('side-by-side')}
              className="h-7 px-2"
            >
              <Grid className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'unified' ? 'default' : 'outline'}
              onClick={() => setViewMode('unified')}
              className="h-7 px-2"
            >
              <List className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'heatmap' ? 'default' : 'outline'}
              onClick={() => setViewMode('heatmap')}
              className="h-7 px-2"
            >
              <Activity className="w-3 h-3" />
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
        {/* Stats Grid */}
        <div className="grid grid-cols-5 gap-2">
          <div className="p-2 bg-gradient-to-br from-muted/40 to-muted/20 rounded-lg text-center">
            <div className="text-lg font-bold text-primary">{analysis.totalChanges}</div>
            <div className="text-[10px] text-muted-foreground">Changed</div>
          </div>
          <div className="p-2 bg-gradient-to-br from-green-500/10 to-transparent rounded-lg text-center">
            <div className="text-lg font-bold text-green-400 flex items-center justify-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {analysis.flipsZeroToOne}
            </div>
            <div className="text-[10px] text-muted-foreground">0→1</div>
          </div>
          <div className="p-2 bg-gradient-to-br from-red-500/10 to-transparent rounded-lg text-center">
            <div className="text-lg font-bold text-red-400 flex items-center justify-center gap-1">
              <TrendingDown className="w-3 h-3" />
              {analysis.flipsOneToZero}
            </div>
            <div className="text-[10px] text-muted-foreground">1→0</div>
          </div>
          <div className="p-2 bg-gradient-to-br from-muted/40 to-muted/20 rounded-lg text-center">
            <div className="text-lg font-bold">{analysis.changePercent.toFixed(1)}%</div>
            <div className="text-[10px] text-muted-foreground">Rate</div>
          </div>
          <div className="p-2 bg-gradient-to-br from-muted/40 to-muted/20 rounded-lg text-center">
            <div className="text-lg font-bold">{analysis.changeRegions.length}</div>
            <div className="text-[10px] text-muted-foreground">Regions</div>
          </div>
        </div>

        {/* Length Change Indicator */}
        {analysis.lenDiff !== 0 && (
          <div className={`p-2 rounded-lg flex items-center gap-2 text-sm ${
            analysis.lenDiff > 0 
              ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            <Zap className="w-4 h-4" />
            <span>Length changed: {analysis.beforeLen} → {analysis.afterLen} ({analysis.lenDiff > 0 ? '+' : ''}{analysis.lenDiff} bits)</span>
          </div>
        )}

        {analysis.truncated && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Activity className="w-3 h-3" />
            Showing first {displayLimit} of {analysis.beforeLen} bits
          </p>
        )}

        {/* View Content */}
        {viewMode === 'side-by-side' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">Before</Badge>
                <span className="text-xs text-muted-foreground">{analysis.beforeLen} bits</span>
              </div>
              <ScrollArea className={`border rounded-lg bg-muted/10 ${expanded ? 'h-64' : 'h-32'}`}>
                <div className="p-3 font-mono text-xs leading-relaxed">
                  {beforeBits.slice(0, displayLimit).split('').map((bit, i) => {
                    const isChanged = afterBits[i] !== bit;
                    const inRange = highlightRanges.some(r => i >= r.start && i < r.end);
                    return (
                      <span
                        key={i}
                        className={`
                          ${isChanged ? 'bg-red-500/40 text-red-300 font-bold' : ''}
                          ${inRange && !isChanged ? 'bg-primary/20' : ''}
                          ${!isChanged && !inRange ? 'text-muted-foreground' : ''}
                        `}
                      >
                        {bit}
                        {(i + 1) % 8 === 0 && i < displayLimit - 1 && <span className="text-muted-foreground/30"> </span>}
                      </span>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30">After</Badge>
                <span className="text-xs text-muted-foreground">{analysis.afterLen} bits</span>
              </div>
              <ScrollArea className={`border rounded-lg bg-muted/10 ${expanded ? 'h-64' : 'h-32'}`}>
                <div className="p-3 font-mono text-xs leading-relaxed">
                  {afterBits.slice(0, displayLimit).split('').map((bit, i) => {
                    const isChanged = beforeBits[i] !== bit;
                    const inRange = highlightRanges.some(r => i >= r.start && i < r.end);
                    return (
                      <span
                        key={i}
                        className={`
                          ${isChanged ? 'bg-green-500/40 text-green-300 font-bold' : ''}
                          ${inRange && !isChanged ? 'bg-primary/20' : ''}
                          ${!isChanged && !inRange ? 'text-muted-foreground' : ''}
                        `}
                      >
                        {bit}
                        {(i + 1) % 8 === 0 && i < displayLimit - 1 && <span className="text-muted-foreground/30"> </span>}
                      </span>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        {viewMode === 'unified' && (
          <ScrollArea className={`border rounded-lg bg-muted/10 ${expanded ? 'h-80' : 'h-48'}`}>
            <div className="p-3 font-mono text-xs space-y-1">
              {analysis.changeRegions.slice(0, 50).map((region, i) => (
                <div key={i} className="flex items-start gap-3 p-2 bg-muted/20 rounded">
                  <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                    @{region.start}
                  </Badge>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-red-400 line-through">
                        {beforeBits.slice(region.start, region.end + 1)}
                      </span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <span className="text-green-400">
                        {afterBits.slice(region.start, region.end + 1)}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {region.count} bit{region.count !== 1 ? 's' : ''} changed
                    </div>
                  </div>
                </div>
              ))}
              {analysis.changeRegions.length > 50 && (
                <p className="text-center text-muted-foreground py-2">
                  + {analysis.changeRegions.length - 50} more regions
                </p>
              )}
            </div>
          </ScrollArea>
        )}

        {viewMode === 'heatmap' && (
          <div className="space-y-2">
            <div className="flex items-center gap-4 text-xs">
              <span className="text-muted-foreground">Intensity:</span>
              <div className="flex items-center gap-1">
                <span className="w-4 h-4 rounded bg-muted/30"></span>
                <span>0</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-4 h-4 rounded bg-blue-500/30"></span>
                <span>1-2</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-4 h-4 rounded bg-yellow-500/40"></span>
                <span>3-4</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-4 h-4 rounded bg-orange-500/50"></span>
                <span>5-6</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-4 h-4 rounded bg-red-500/60"></span>
                <span>7-8</span>
              </div>
            </div>
            <ScrollArea className={`border rounded-lg bg-muted/10 ${expanded ? 'h-80' : 'h-48'}`}>
              <div className="p-3 space-y-1">
                {heatmapRows.map((row, rowIdx) => (
                  <div key={rowIdx} className="flex items-center gap-1">
                    <span className="text-[10px] font-mono text-muted-foreground w-12 text-right">
                      {row.index.toString(16).padStart(4, '0').toUpperCase()}
                    </span>
                    {row.bytes.map((byte, byteIdx) => (
                      <div
                        key={byteIdx}
                        className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-mono cursor-default ${getIntensityColor(byte.intensity)}`}
                        title={`Byte ${(row.index / 8) + byteIdx}: ${byte.changedCount}/8 bits changed\nBefore: ${byte.before}\nAfter: ${byte.after}`}
                      >
                        {byte.changedCount > 0 ? byte.changedCount : ''}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Change Summary */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Modified regions:</span>
          {analysis.changeRegions.slice(0, 8).map((region, i) => (
            <Badge key={i} variant="outline" className="text-xs font-mono">
              [{region.start}:{region.end + 1}]
            </Badge>
          ))}
          {analysis.changeRegions.length > 8 && (
            <span className="text-xs text-muted-foreground">+{analysis.changeRegions.length - 8} more</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
