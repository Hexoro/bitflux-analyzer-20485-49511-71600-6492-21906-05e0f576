import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { CheckSquare, X, Plus } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

interface BitRange {
  id: string;
  start: number;
  end: number;
}

interface BitSelectionDialogProps {
  maxBits: number;
  onApplySelection: (ranges: BitRange[]) => void;
  currentSelection: BitRange[];
}

export const BitSelectionDialog = ({ maxBits, onApplySelection, currentSelection }: BitSelectionDialogProps) => {
  const [open, setOpen] = useState(false);
  const [ranges, setRanges] = useState<BitRange[]>(currentSelection.length > 0 ? currentSelection : []);
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');

  const addRange = () => {
    const start = parseInt(startInput);
    const end = parseInt(endInput);

    if (isNaN(start) || isNaN(end)) return;
    if (start < 0 || end >= maxBits) return;
    if (start > end) return;

    const newRange: BitRange = {
      id: `range-${Date.now()}-${Math.random()}`,
      start,
      end,
    };

    setRanges([...ranges, newRange]);
    setStartInput('');
    setEndInput('');
  };

  const removeRange = (id: string) => {
    setRanges(ranges.filter(r => r.id !== id));
  };

  const handleApply = () => {
    onApplySelection(ranges);
    setOpen(false);
  };

  const handleClear = () => {
    setRanges([]);
    onApplySelection([]);
    setOpen(false);
  };

  const totalBitsSelected = ranges.reduce((sum, r) => sum + (r.end - r.start + 1), 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CheckSquare className="w-4 h-4" />
          Select Bits
          {currentSelection.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {currentSelection.length} range{currentSelection.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select Bit Ranges</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-muted/50 p-3 rounded-lg space-y-2">
            <p className="text-xs text-muted-foreground">
              Select specific bits by defining ranges. Transformations will only apply to selected bits.
            </p>
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="secondary">{maxBits} total bits</Badge>
              {totalBitsSelected > 0 && (
                <Badge variant="default">{totalBitsSelected} selected</Badge>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Add Range</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Start"
                type="number"
                min="0"
                max={maxBits - 1}
                value={startInput}
                onChange={(e) => setStartInput(e.target.value)}
                className="text-sm"
              />
              <span className="flex items-center text-muted-foreground">to</span>
              <Input
                placeholder="End"
                type="number"
                min="0"
                max={maxBits - 1}
                value={endInput}
                onChange={(e) => setEndInput(e.target.value)}
                className="text-sm"
              />
              <Button onClick={addRange} size="sm" variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {ranges.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Selected Ranges</Label>
              <ScrollArea className="max-h-40 border rounded-md p-2">
                <div className="space-y-1">
                  {ranges.map((range) => (
                    <div
                      key={range.id}
                      className="flex items-center justify-between bg-card p-2 rounded border"
                    >
                      <span className="font-mono text-sm">
                        {range.start} - {range.end} ({range.end - range.start + 1} bits)
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRange(range.id)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button onClick={handleApply} className="flex-1">
              Apply Selection
            </Button>
            <Button onClick={handleClear} variant="outline">
              Clear
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
