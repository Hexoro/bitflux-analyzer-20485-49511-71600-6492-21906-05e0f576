/**
 * Checkpoint Panel - Save/restore/compare checkpoints during playback
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Save, RotateCcw, GitCompare, Trash2, Star, Bookmark } from 'lucide-react';
import { hashBits } from '@/lib/verificationSystem';

export interface Checkpoint {
  id: string;
  name: string;
  stepIndex: number;
  bits: string;
  hash: string;
  metrics: Record<string, number>;
  timestamp: number;
  isBaseline: boolean;
}

interface CheckpointPanelProps {
  checkpoints: Checkpoint[];
  currentStep: number;
  currentBits: string;
  currentMetrics: Record<string, number>;
  onSave: (checkpoint: Checkpoint) => void;
  onRestore: (checkpoint: Checkpoint) => void;
  onDelete: (id: string) => void;
  onSetBaseline: (id: string) => void;
}

export const CheckpointPanel = ({
  checkpoints,
  currentStep,
  currentBits,
  currentMetrics,
  onSave,
  onRestore,
  onDelete,
  onSetBaseline,
}: CheckpointPanelProps) => {
  const [newName, setNewName] = useState('');

  const handleSave = () => {
    const cp: Checkpoint = {
      id: `cp_${Date.now()}`,
      name: newName || `Step ${currentStep + 1}`,
      stepIndex: currentStep,
      bits: currentBits,
      hash: hashBits(currentBits),
      metrics: { ...currentMetrics },
      timestamp: Date.now(),
      isBaseline: false,
    };
    onSave(cp);
    setNewName('');
  };

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bookmark className="w-4 h-4" />
          Checkpoints ({checkpoints.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2 space-y-3">
        {/* Save New */}
        <div className="flex items-center gap-2">
          <Input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder={`Step ${currentStep + 1} checkpoint`}
            className="h-7 text-xs flex-1"
          />
          <Button size="sm" onClick={handleSave} className="h-7 text-xs">
            <Save className="w-3 h-3 mr-1" />
            Save
          </Button>
        </div>

        {/* Checkpoint List */}
        <ScrollArea className="max-h-[250px]">
          <div className="space-y-1">
            {checkpoints.map(cp => (
              <div key={cp.id} className={`p-2 rounded border text-xs ${cp.isBaseline ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-border bg-muted/10'}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    {cp.isBaseline && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                    <span className="font-medium">{cp.name}</span>
                    <Badge variant="outline" className="text-[9px]">Step {cp.stepIndex + 1}</Badge>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => onRestore(cp)}
                      title="Restore">
                      <RotateCcw className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => onSetBaseline(cp.id)}
                      title="Set as baseline">
                      <Star className={`w-3 h-3 ${cp.isBaseline ? 'text-yellow-500 fill-yellow-500' : ''}`} />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive" onClick={() => onDelete(cp.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <code className="font-mono">{cp.hash.slice(0, 8)}</code>
                  <span>{cp.bits.length} bits</span>
                  {cp.metrics.entropy !== undefined && <span>H={cp.metrics.entropy.toFixed(3)}</span>}
                </div>
              </div>
            ))}
            {checkpoints.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No checkpoints saved</p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
