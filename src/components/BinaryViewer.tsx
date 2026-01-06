import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { BinaryModel } from '@/lib/binaryModel';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface BinaryViewerProps {
  model: BinaryModel;
  bitsPerRow: number;
  highlightRanges?: Array<{ start: number; end: number; color: string }>;
  editMode: boolean;
  idealBitIndices?: number[]; // Indices of bits that should be underlined
}

export const BinaryViewer = forwardRef<any, BinaryViewerProps>(({ 
  model, 
  bitsPerRow, 
  highlightRanges = [],
  editMode,
  idealBitIndices = []
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [infoPanelCollapsed, setInfoPanelCollapsed] = useState(false);

  useImperativeHandle(ref, () => ({
    jumpTo: (index: number) => {
      setCursorPosition(index);
      setSelectedRange(null);
    }
  }));

  const bits = model.getBits();
  const totalRows = Math.ceil(bits.length / bitsPerRow);

  const getBitColor = (index: number): string => {
    // Check if bit is in selected range
    if (selectedRange && index >= selectedRange.start && index <= selectedRange.end) {
      return 'bg-bit-selected text-foreground';
    }
    
    // Check if bit is in any highlight range (check in reverse to prioritize later ranges)
    for (let i = highlightRanges.length - 1; i >= 0; i--) {
      const range = highlightRanges[i];
      if (index >= range.start && index <= range.end) {
        // Use the color directly from the range
        return `text-foreground`;
      }
    }
    
    return 'text-primary/60';
  };

  const getBitBackground = (index: number): string => {
    // Check if bit is in selected range
    if (selectedRange && index >= selectedRange.start && index <= selectedRange.end) {
      return '#00d4ff';
    }
    
    // Check if bit is in any highlight range
    for (let i = highlightRanges.length - 1; i >= 0; i--) {
      const range = highlightRanges[i];
      if (index >= range.start && index <= range.end) {
        return range.color;
      }
    }
    
    return 'transparent';
  };

  const handleBitClick = useCallback((index: number) => {
    if (!editMode) return;
    setCursorPosition(index);
    setSelectedRange(null);
  }, [editMode]);

  useEffect(() => {
    if (!editMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInputFocused = activeElement?.tagName === 'INPUT' || 
                            activeElement?.tagName === 'TEXTAREA' ||
                            activeElement?.hasAttribute('contenteditable');
      
      if (isInputFocused) return;

      const bits = model.getBits();

      // Handle typing 0s and 1s
      if (e.key === '0' || e.key === '1') {
        e.preventDefault();
        if (selectedRange) {
          // Replace selection
          const before = bits.substring(0, selectedRange.start);
          const after = bits.substring(selectedRange.end + 1);
          model.loadBits(before + e.key + after, true);
          setCursorPosition(selectedRange.start + 1);
          setSelectedRange(null);
        } else {
          // Insert at cursor
          const before = bits.substring(0, cursorPosition);
          const after = bits.substring(cursorPosition);
          model.loadBits(before + e.key + after, true);
          setCursorPosition(cursorPosition + 1);
        }
      }
      
      // Handle arrow keys
      else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (e.shiftKey && !selectedRange) {
          setSelectedRange({ start: Math.max(0, cursorPosition - 1), end: cursorPosition - 1 });
          setIsSelecting(true);
        } else if (e.shiftKey && selectedRange) {
          if (cursorPosition === selectedRange.end + 1) {
            setSelectedRange({ start: selectedRange.start, end: Math.max(selectedRange.start, selectedRange.end - 1) });
          } else {
            setSelectedRange({ start: Math.max(0, selectedRange.start - 1), end: selectedRange.end });
          }
        } else {
          setCursorPosition(Math.max(0, cursorPosition - 1));
          setSelectedRange(null);
        }
      }
      else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (e.shiftKey && !selectedRange) {
          setSelectedRange({ start: cursorPosition, end: cursorPosition });
          setIsSelecting(true);
          setCursorPosition(Math.min(bits.length, cursorPosition + 1));
        } else if (e.shiftKey && selectedRange) {
          if (cursorPosition === selectedRange.start) {
            setSelectedRange({ start: Math.min(selectedRange.end, selectedRange.start + 1), end: selectedRange.end });
          } else {
            setSelectedRange({ start: selectedRange.start, end: Math.min(bits.length - 1, selectedRange.end + 1) });
          }
          setCursorPosition(Math.min(bits.length, cursorPosition + 1));
        } else {
          setCursorPosition(Math.min(bits.length, cursorPosition + 1));
          setSelectedRange(null);
        }
      }
      else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const newPos = Math.max(0, cursorPosition - bitsPerRow);
        if (e.shiftKey && selectedRange) {
          setSelectedRange({ start: Math.min(newPos, selectedRange.start), end: selectedRange.end });
        } else if (e.shiftKey) {
          setSelectedRange({ start: newPos, end: cursorPosition - 1 });
        }
        setCursorPosition(newPos);
        if (!e.shiftKey) setSelectedRange(null);
      }
      else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const newPos = Math.min(bits.length, cursorPosition + bitsPerRow);
        if (e.shiftKey && selectedRange) {
          setSelectedRange({ start: selectedRange.start, end: Math.min(bits.length - 1, newPos - 1) });
        } else if (e.shiftKey) {
          setSelectedRange({ start: cursorPosition, end: Math.min(bits.length - 1, newPos - 1) });
        }
        setCursorPosition(newPos);
        if (!e.shiftKey) setSelectedRange(null);
      }
      
      // Handle delete/backspace
      else if (e.key === 'Delete') {
        e.preventDefault();
        if (selectedRange) {
          const before = bits.substring(0, selectedRange.start);
          const after = bits.substring(selectedRange.end + 1);
          model.loadBits(before + after, true);
          setCursorPosition(selectedRange.start);
          setSelectedRange(null);
        } else if (cursorPosition < bits.length) {
          const before = bits.substring(0, cursorPosition);
          const after = bits.substring(cursorPosition + 1);
          model.loadBits(before + after, true);
        }
      }
      else if (e.key === 'Backspace') {
        e.preventDefault();
        if (selectedRange) {
          const before = bits.substring(0, selectedRange.start);
          const after = bits.substring(selectedRange.end + 1);
          model.loadBits(before + after, true);
          setCursorPosition(selectedRange.start);
          setSelectedRange(null);
        } else if (cursorPosition > 0) {
          const before = bits.substring(0, cursorPosition - 1);
          const after = bits.substring(cursorPosition);
          model.loadBits(before + after, true);
          setCursorPosition(cursorPosition - 1);
        }
      }
      
      // Handle Escape
      else if (e.key === 'Escape') {
        setSelectedRange(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [editMode, cursorPosition, selectedRange, model, bitsPerRow, isSelecting]);

  const renderRow = (rowIndex: number) => {
    const startIndex = rowIndex * bitsPerRow;
    const endIndex = Math.min(startIndex + bitsPerRow, bits.length);
    const rowBits = bits.substring(startIndex, endIndex);

    return (
      <div key={rowIndex} className="flex items-center gap-2 hover:bg-card/30 px-2 py-1 group">
        <span className="text-muted-foreground text-xs w-16 text-right select-none">
          {startIndex.toString().padStart(8, '0')}
        </span>
        <div className="flex flex-wrap gap-x-2">
          {Array.from(rowBits).map((bit, colIndex) => {
            const bitIndex = startIndex + colIndex;
            const isCursor = editMode && bitIndex === cursorPosition && !selectedRange;
            const isIdeal = idealBitIndices.includes(bitIndex);
            
            return (
              <span
                key={bitIndex}
                className={`
                  ${getBitColor(bitIndex)} 
                  ${editMode ? 'cursor-text' : 'cursor-default'}
                  hover:brightness-125 transition-all
                  select-none font-bold px-1 rounded relative
                  ${isCursor ? 'ring-2 ring-primary animate-pulse' : ''}
                  ${isIdeal ? 'underline decoration-2' : ''}
                `}
                style={{
                  backgroundColor: getBitBackground(bitIndex),
                  textDecorationColor: isIdeal ? (bit === '1' ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.6)') : undefined,
                }}
                onClick={() => handleBitClick(bitIndex)}
                title={`Bit ${bitIndex}${isIdeal ? ' (ideal)' : ''}`}
              >
                {bit}
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div 
      ref={containerRef}
      className="h-full overflow-auto bg-viewer-bg p-4 monospace text-sm scrollbar-thin"
      tabIndex={0}
    >
      {bits.length === 0 ? (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center">
            <p className="text-lg mb-2">No binary data loaded</p>
            <p className="text-sm">Generate, load, or paste binary data to begin</p>
          </div>
        </div>
      ) : (
        <div className="space-y-0">
          {Array.from({ length: totalRows }, (_, i) => renderRow(i))}
        </div>
      )}
      
      {editMode && (
        <div className="fixed bottom-4 left-4 bg-card border border-border rounded-lg shadow-lg z-50">
          <button
            onClick={() => setInfoPanelCollapsed(!infoPanelCollapsed)}
            className="w-full flex items-center justify-between px-4 py-2 hover:bg-accent/50 rounded-t-lg transition-colors"
          >
            <span className="text-primary font-semibold text-xs">Edit Mode: ON</span>
            {infoPanelCollapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {!infoPanelCollapsed && (
            <div className="px-4 pb-2 text-xs">
              <div className="text-foreground font-mono">
                Cursor Position: {cursorPosition}
              </div>
              {selectedRange && (
                <div className="text-foreground font-mono">
                  Selected: {selectedRange.start} - {selectedRange.end} ({selectedRange.end - selectedRange.start + 1} bits)
                </div>
              )}
              <div className="text-muted-foreground text-[10px] mt-2 space-y-0.5">
                <div>Type 0/1 to insert • Shift+Arrows to select</div>
                <div>Delete/Backspace to remove • Esc to deselect</div>
                <div>Ctrl+Z/Y: Undo/Redo • Ctrl+C/V: Copy/Paste</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
