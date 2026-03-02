/**
 * Bit Field Correctness Viewer - Side-by-side before/after with change highlighting
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowRight, Eye } from 'lucide-react';
import { useMemo } from 'react';

interface BitFieldViewerProps {
  beforeBits: string;
  afterBits: string;
  operationName: string;
  params?: Record<string, any>;
  mask?: string;
}

// Operations that should flip ALL bits
const INVOLUTION_OPS = new Set(['NOT']);
// Operations that should flip ~50% of bits with mask
const MASK_OPS = new Set(['XOR', 'AND', 'OR', 'NAND', 'NOR', 'XNOR']);

export const BitFieldViewer = ({
  beforeBits,
  afterBits,
  operationName,
  params,
  mask,
}: BitFieldViewerProps) => {
  const analysis = useMemo(() => {
    const maxLen = Math.max(beforeBits.length, afterBits.length);
    const changes: { index: number; from: string; to: string; expected: boolean }[] = [];
    let flippedCount = 0;
    let unchangedCount = 0;

    for (let i = 0; i < maxLen; i++) {
      const b = beforeBits[i] || '0';
      const a = afterBits[i] || '0';
      if (b !== a) {
        flippedCount++;
        // Determine if this change was expected based on operation
        let expected = true;
        if (INVOLUTION_OPS.has(operationName)) {
          expected = true; // All flips expected
        } else if (mask && MASK_OPS.has(operationName)) {
          // For XOR with mask, only bits where mask='1' should flip
          expected = (mask[i] || '0') === '1';
        }
        changes.push({ index: i, from: b, to: a, expected });
      } else {
        unchangedCount++;
        // For NOT, unchanged bits are unexpected
        if (INVOLUTION_OPS.has(operationName) && i < beforeBits.length) {
          changes.push({ index: i, from: b, to: a, expected: false });
        }
      }
    }

    return { changes, flippedCount, unchangedCount, totalBits: maxLen };
  }, [beforeBits, afterBits, operationName, mask]);

  const BYTES_PER_ROW = 4;
  const BITS_PER_ROW = BYTES_PER_ROW * 8;
  const rowCount = Math.ceil(Math.max(beforeBits.length, afterBits.length) / BITS_PER_ROW);

  // Limit display for performance
  const maxRows = Math.min(rowCount, 32);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{operationName}</span>
              {params && Object.keys(params).length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {Object.keys(params).filter(k => k !== 'seed').length} params
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Badge className="bg-green-500/20 text-green-500">
                {analysis.flippedCount} flipped
              </Badge>
              <Badge variant="secondary">
                {analysis.unchangedCount} unchanged
              </Badge>
              <Badge variant="outline">
                {((analysis.flippedCount / analysis.totalBits) * 100).toFixed(1)}% changed
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bit Field Grid */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Bit-Level View</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <ScrollArea className="h-[400px]">
            {/* Header */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mb-2 px-1 sticky top-0 bg-card z-10">
              <span className="w-10">Idx</span>
              <span className="flex-1 text-center">Before</span>
              <span className="w-6" />
              <span className="flex-1 text-center">After</span>
              <span className="w-16 text-right">Hex</span>
            </div>
            
            <div className="space-y-1">
              {Array.from({ length: maxRows }).map((_, rowIdx) => {
                const startBit = rowIdx * BITS_PER_ROW;
                const endBit = Math.min(startBit + BITS_PER_ROW, Math.max(beforeBits.length, afterBits.length));

                return (
                  <div key={rowIdx} className="flex items-center gap-2 text-xs font-mono">
                    {/* Index */}
                    <span className="w-10 text-muted-foreground">{startBit}</span>
                    
                    {/* Before bits */}
                    <div className="flex-1 flex flex-wrap gap-px">
                      {Array.from({ length: endBit - startBit }).map((_, i) => {
                        const bitIdx = startBit + i;
                        const b = beforeBits[bitIdx] || ' ';
                        const a = afterBits[bitIdx] || ' ';
                        const changed = b !== a;
                        return (
                          <span
                            key={i}
                            className={`w-3 text-center ${
                              changed ? 'text-yellow-500 font-bold' : 'text-muted-foreground'
                            } ${i > 0 && i % 8 === 0 ? 'ml-1' : ''}`}
                          >
                            {b}
                          </span>
                        );
                      })}
                    </div>

                    {/* Arrow */}
                    <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />

                    {/* After bits */}
                    <div className="flex-1 flex flex-wrap gap-px">
                      {Array.from({ length: endBit - startBit }).map((_, i) => {
                        const bitIdx = startBit + i;
                        const b = beforeBits[bitIdx] || ' ';
                        const a = afterBits[bitIdx] || ' ';
                        const changed = b !== a;
                        const isExpected = !analysis.changes.find(c => c.index === bitIdx && !c.expected);
                        return (
                          <span
                            key={i}
                            className={`w-3 text-center ${
                              changed
                                ? isExpected ? 'text-green-500 font-bold' : 'text-destructive font-bold'
                                : 'text-muted-foreground'
                            } ${i > 0 && i % 8 === 0 ? 'ml-1' : ''}`}
                          >
                            {a}
                          </span>
                        );
                      })}
                    </div>

                    {/* Hex */}
                    <span className="w-16 text-right text-muted-foreground">
                      {parseInt(afterBits.slice(startBit, startBit + 8).padEnd(8, '0'), 2)
                        .toString(16).toUpperCase().padStart(2, '0')}
                    </span>
                  </div>
                );
              })}
              {rowCount > maxRows && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Showing {maxRows * BITS_PER_ROW} of {analysis.totalBits} bits
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
