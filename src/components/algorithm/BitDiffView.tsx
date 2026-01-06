/**
 * BitDiffView - Visual diff between two bit strings
 * Shows changed bits highlighted with before/after comparison
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GitCompare, ArrowRight } from 'lucide-react';

interface BitDiffViewProps {
  beforeBits: string;
  afterBits: string;
  highlightRanges?: { start: number; end: number }[];
  maxDisplayBits?: number;
}

export const BitDiffView = ({ 
  beforeBits, 
  afterBits, 
  highlightRanges = [],
  maxDisplayBits = 512
}: BitDiffViewProps) => {
  const { diffChunks, stats } = useMemo(() => {
    const chunks: Array<{
      type: 'unchanged' | 'changed';
      startIndex: number;
      beforeSlice: string;
      afterSlice: string;
    }> = [];
    
    let changedCount = 0;
    let currentChunk: typeof chunks[0] | null = null;
    
    const maxLen = Math.max(beforeBits.length, afterBits.length);
    const displayLen = Math.min(maxLen, maxDisplayBits);
    
    for (let i = 0; i < displayLen; i++) {
      const beforeBit = beforeBits[i] || '0';
      const afterBit = afterBits[i] || '0';
      const isChanged = beforeBit !== afterBit;
      
      if (isChanged) changedCount++;
      
      const chunkType = isChanged ? 'changed' : 'unchanged';
      
      if (!currentChunk || currentChunk.type !== chunkType) {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = {
          type: chunkType,
          startIndex: i,
          beforeSlice: beforeBit,
          afterSlice: afterBit,
        };
      } else {
        currentChunk.beforeSlice += beforeBit;
        currentChunk.afterSlice += afterBit;
      }
    }
    
    if (currentChunk) chunks.push(currentChunk);
    
    return {
      diffChunks: chunks,
      stats: {
        beforeLen: beforeBits.length,
        afterLen: afterBits.length,
        changedCount,
        changePercent: ((changedCount / Math.max(beforeBits.length, 1)) * 100).toFixed(1),
        truncated: maxLen > maxDisplayBits,
      }
    };
  }, [beforeBits, afterBits, maxDisplayBits]);

  // Check if a position is in a highlight range
  const isHighlighted = (index: number) => {
    return highlightRanges.some(r => index >= r.start && index < r.end);
  };

  return (
    <Card className="bg-card/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <GitCompare className="w-4 h-4" />
            Visual Diff
          </CardTitle>
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline">{stats.beforeLen} → {stats.afterLen} bits</Badge>
            <Badge variant={stats.changedCount > 0 ? 'default' : 'secondary'}>
              {stats.changedCount} changed ({stats.changePercent}%)
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {stats.truncated && (
          <p className="text-xs text-muted-foreground mb-2">
            Showing first {maxDisplayBits} bits of {stats.beforeLen}
          </p>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          {/* Before */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">Before</div>
            <ScrollArea className="h-24 border rounded p-2 bg-muted/20">
              <div className="font-mono text-xs leading-relaxed break-all">
                {diffChunks.map((chunk, i) => (
                  <span
                    key={i}
                    className={
                      chunk.type === 'changed' 
                        ? 'bg-destructive/30 text-destructive-foreground' 
                        : 'text-muted-foreground'
                    }
                  >
                    {chunk.beforeSlice}
                  </span>
                ))}
              </div>
            </ScrollArea>
          </div>
          
          {/* After */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">After</div>
            <ScrollArea className="h-24 border rounded p-2 bg-muted/20">
              <div className="font-mono text-xs leading-relaxed break-all">
                {diffChunks.map((chunk, i) => (
                  <span
                    key={i}
                    className={
                      chunk.type === 'changed' 
                        ? 'bg-green-500/30 text-green-500' 
                        : 'text-muted-foreground'
                    }
                  >
                    {chunk.afterSlice}
                  </span>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
        
        {/* Highlight ranges legend */}
        {highlightRanges.length > 0 && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Modified ranges:</span>
            {highlightRanges.slice(0, 5).map((range, i) => (
              <Badge key={i} variant="outline" className="text-xs font-mono">
                [{range.start}:{range.end}]
              </Badge>
            ))}
            {highlightRanges.length > 5 && (
              <span className="text-xs text-muted-foreground">+{highlightRanges.length - 5} more</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
