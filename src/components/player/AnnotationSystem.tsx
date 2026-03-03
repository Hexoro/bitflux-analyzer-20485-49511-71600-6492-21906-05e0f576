/**
 * Annotation System - Per-step annotations with persistence
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Plus, Trash2, Clock } from 'lucide-react';

export interface Annotation {
  id: string;
  stepIndex: number;
  text: string;
  timestamp: number;
}

interface AnnotationSystemProps {
  annotations: Annotation[];
  currentStep: number;
  onAdd: (annotation: Annotation) => void;
  onDelete: (id: string) => void;
  onJumpToStep: (index: number) => void;
}

export const AnnotationSystem = ({
  annotations,
  currentStep,
  onAdd,
  onDelete,
  onJumpToStep,
}: AnnotationSystemProps) => {
  const [newText, setNewText] = useState('');
  const [showAll, setShowAll] = useState(false);

  const currentAnnotations = annotations.filter(a => a.stepIndex === currentStep);
  const displayAnnotations = showAll ? annotations : currentAnnotations;

  const handleAdd = () => {
    if (!newText.trim()) return;
    onAdd({
      id: `ann_${Date.now()}`,
      stepIndex: currentStep,
      text: newText.trim(),
      timestamp: Date.now(),
    });
    setNewText('');
  };

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Annotations ({annotations.length})
          </CardTitle>
          <Button variant={showAll ? 'default' : 'outline'} size="sm" onClick={() => setShowAll(!showAll)} className="h-6 text-xs">
            {showAll ? 'Current Step' : 'Show All'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="py-2 space-y-3">
        {/* Add Annotation */}
        <div className="space-y-2">
          <Textarea
            value={newText}
            onChange={e => setNewText(e.target.value)}
            placeholder={`Add note for step ${currentStep + 1}...`}
            className="min-h-[60px] text-xs"
          />
          <Button size="sm" onClick={handleAdd} disabled={!newText.trim()} className="h-7 text-xs w-full">
            <Plus className="w-3 h-3 mr-1" />
            Add Note
          </Button>
        </div>

        {/* Annotations List */}
        <ScrollArea className="max-h-[250px]">
          <div className="space-y-2">
            {displayAnnotations.map(ann => (
              <div key={ann.id} className="p-2 rounded border bg-muted/10 text-xs cursor-pointer hover:bg-muted/20"
                onClick={() => onJumpToStep(ann.stepIndex)}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[9px]">Step {ann.stepIndex + 1}</Badge>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(ann.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive"
                    onClick={e => { e.stopPropagation(); onDelete(ann.id); }}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                <p className="text-foreground whitespace-pre-wrap">{ann.text}</p>
              </div>
            ))}
            {displayAnnotations.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                {showAll ? 'No annotations yet' : `No notes for step ${currentStep + 1}`}
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
