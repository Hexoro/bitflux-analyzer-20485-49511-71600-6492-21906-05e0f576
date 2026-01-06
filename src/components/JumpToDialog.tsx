import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface JumpToDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJump: (position: number) => void;
  maxPosition: number;
}

export const JumpToDialog = ({ open, onOpenChange, onJump, maxPosition }: JumpToDialogProps) => {
  const [position, setPosition] = useState('');

  const handleJump = () => {
    const pos = parseInt(position);
    if (!isNaN(pos) && pos >= 0 && pos < maxPosition) {
      onJump(pos);
      onOpenChange(false);
      setPosition('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Jump to Position</DialogTitle>
          <DialogDescription>
            Enter a bit position to jump to (0 to {maxPosition - 1})
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="position">Bit Position</Label>
            <Input
              id="position"
              type="number"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJump()}
              placeholder={`0 - ${maxPosition - 1}`}
              className="font-mono"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleJump}>
              Jump
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
