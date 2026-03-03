/**
 * Breakpoint Manager - Configure and manage player breakpoints
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Bug, Plus, X, Pause, SkipForward, Play } from 'lucide-react';

export interface PlayerBreakpoint {
  id: string;
  type: 'step' | 'operation' | 'metric';
  stepIndex?: number;
  operationName?: string;
  metricCondition?: { metric: string; operator: '<' | '>' | '='; value: number };
  enabled: boolean;
  hitCount: number;
}

interface BreakpointManagerProps {
  breakpoints: PlayerBreakpoint[];
  onAdd: (bp: PlayerBreakpoint) => void;
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
  onContinueToNext: () => void;
  isPaused: boolean;
  currentStep: number;
  totalSteps: number;
}

export const BreakpointManager = ({
  breakpoints,
  onAdd,
  onRemove,
  onToggle,
  onContinueToNext,
  isPaused,
  currentStep,
  totalSteps,
}: BreakpointManagerProps) => {
  const [newType, setNewType] = useState<PlayerBreakpoint['type']>('step');
  const [newStep, setNewStep] = useState(0);
  const [newOp, setNewOp] = useState('');
  const [newMetric, setNewMetric] = useState('entropy');
  const [newOperator, setNewOperator] = useState<'<' | '>' | '='>('<');
  const [newValue, setNewValue] = useState(0.5);
  const [showAdd, setShowAdd] = useState(false);

  const handleAdd = () => {
    const bp: PlayerBreakpoint = {
      id: `pbp_${Date.now()}`,
      type: newType,
      stepIndex: newType === 'step' ? newStep : undefined,
      operationName: newType === 'operation' ? newOp : undefined,
      metricCondition: newType === 'metric' ? { metric: newMetric, operator: newOperator, value: newValue } : undefined,
      enabled: true,
      hitCount: 0,
    };
    onAdd(bp);
    setShowAdd(false);
  };

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bug className="w-4 h-4 text-red-500" />
            Breakpoints ({breakpoints.length})
          </CardTitle>
          <div className="flex items-center gap-1">
            {isPaused && (
              <Button variant="default" size="sm" onClick={onContinueToNext} className="h-7 text-xs">
                <SkipForward className="w-3 h-3 mr-1" />
                Continue
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowAdd(!showAdd)} className="h-7 text-xs">
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="py-2 space-y-2">
        {isPaused && (
          <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs flex items-center gap-2">
            <Pause className="w-3 h-3 text-yellow-500" />
            <span>Paused at step {currentStep + 1}</span>
          </div>
        )}

        {showAdd && (
          <div className="p-3 border rounded space-y-2 bg-muted/20">
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={newType} onValueChange={(v: any) => setNewType(v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="step">At Step Index</SelectItem>
                  <SelectItem value="operation">On Operation</SelectItem>
                  <SelectItem value="metric">Metric Condition</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newType === 'step' && (
              <Input type="number" min={0} max={totalSteps - 1} value={newStep}
                onChange={e => setNewStep(parseInt(e.target.value) || 0)} className="h-7 text-xs" placeholder="Step index" />
            )}
            {newType === 'operation' && (
              <Input value={newOp} onChange={e => setNewOp(e.target.value)} className="h-7 text-xs" placeholder="e.g. XOR, NOT" />
            )}
            {newType === 'metric' && (
              <div className="flex items-center gap-1">
                <Input value={newMetric} onChange={e => setNewMetric(e.target.value)} className="h-7 text-xs flex-1" placeholder="entropy" />
                <Select value={newOperator} onValueChange={(v: any) => setNewOperator(v)}>
                  <SelectTrigger className="h-7 text-xs w-14"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="<">&lt;</SelectItem>
                    <SelectItem value=">">&gt;</SelectItem>
                    <SelectItem value="=">=</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" step={0.1} value={newValue} onChange={e => setNewValue(parseFloat(e.target.value) || 0)}
                  className="h-7 text-xs w-16" />
              </div>
            )}
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)} className="h-6 text-xs">Cancel</Button>
              <Button size="sm" onClick={handleAdd} className="h-6 text-xs">Add</Button>
            </div>
          </div>
        )}

        <ScrollArea className="max-h-[200px]">
          <div className="space-y-1">
            {breakpoints.map(bp => (
              <div key={bp.id} className={`flex items-center gap-2 p-1.5 rounded border text-xs ${bp.enabled ? 'border-red-500/30 bg-red-500/5' : 'opacity-50 border-muted'}`}>
                <button className={`w-2.5 h-2.5 rounded-full shrink-0 ${bp.enabled ? 'bg-red-500' : 'bg-muted-foreground'}`}
                  onClick={() => onToggle(bp.id)} />
                <span className="flex-1 font-mono truncate">
                  {bp.type === 'step' && `step ${bp.stepIndex}`}
                  {bp.type === 'operation' && `on ${bp.operationName}`}
                  {bp.type === 'metric' && `${bp.metricCondition?.metric} ${bp.metricCondition?.operator} ${bp.metricCondition?.value}`}
                </span>
                {bp.hitCount > 0 && <Badge variant="secondary" className="text-[9px] h-4">{bp.hitCount}×</Badge>}
                <button className="text-muted-foreground hover:text-destructive" onClick={() => onRemove(bp.id)}>
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {breakpoints.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No breakpoints set</p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
