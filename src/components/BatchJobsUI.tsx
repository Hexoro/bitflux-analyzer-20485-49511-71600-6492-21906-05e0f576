/**
 * Batch Jobs UI - Create and manage batch jobs with queue timeline
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Layers,
  Play,
  Pause,
  Square,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  FileText,
  Settings2,
  ChevronRight,
  AlertTriangle,
  Trash2,
  Plus,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { jobManagerV2, Job, JobPreset, JobPriority, BatchJobConfig } from '@/lib/jobManagerV2';
import { fileSystemManager } from '@/lib/fileSystemManager';
import { pythonModuleSystem } from '@/lib/pythonModuleSystem';

interface BatchJobsUIProps {
  onClose?: () => void;
}

export const BatchJobsUI = ({ onClose }: BatchJobsUIProps) => {
  const [, forceUpdate] = useState({});
  const [batchName, setBatchName] = useState('');
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [presets, setPresets] = useState<JobPreset[]>([]);
  const [selectedStrategyId, setSelectedStrategyId] = useState('');
  const [iterations, setIterations] = useState(1);
  const [priority, setPriority] = useState<JobPriority>('normal');
  const [runParallel, setRunParallel] = useState(false);
  const [maxParallel, setMaxParallel] = useState(3);

  useEffect(() => {
    const unsub1 = jobManagerV2.subscribe(() => forceUpdate({}));
    const unsub2 = fileSystemManager.subscribe(() => forceUpdate({}));
    const unsub3 = pythonModuleSystem.subscribe(() => forceUpdate({}));
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  const dataFiles = fileSystemManager.getFiles().filter(f => f.state.model.getBits()?.length > 0);
  const strategies = pythonModuleSystem.getAllStrategies();

  const toggleFileSelection = (fileId: string) => {
    setSelectedFileIds(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  const selectAllFiles = () => {
    if (selectedFileIds.length === dataFiles.length) {
      setSelectedFileIds([]);
    } else {
      setSelectedFileIds(dataFiles.map(f => f.id));
    }
  };

  const addPreset = () => {
    if (!selectedStrategyId) return;
    const strategy = strategies.find(s => s.id === selectedStrategyId);
    if (!strategy) return;
    
    setPresets([...presets, {
      strategyId: selectedStrategyId,
      strategyName: strategy.name,
      iterations,
    }]);
    setSelectedStrategyId('');
    setIterations(1);
  };

  const removePreset = (index: number) => {
    setPresets(presets.filter((_, i) => i !== index));
  };

  const createBatch = () => {
    if (!batchName.trim()) {
      toast.error('Enter a batch name');
      return;
    }
    if (selectedFileIds.length === 0) {
      toast.error('Select at least one file');
      return;
    }
    if (presets.length === 0) {
      toast.error('Add at least one strategy');
      return;
    }

    const config: BatchJobConfig = {
      name: batchName,
      dataFileIds: selectedFileIds,
      presets,
      priority,
      runParallel,
      maxParallel: runParallel ? maxParallel : undefined,
    };

    try {
      const result = jobManagerV2.createBatch(config);
      toast.success(`Batch created with ${result.jobs.length} jobs`);
      
      // Reset form
      setBatchName('');
      setSelectedFileIds([]);
      setPresets([]);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const startBatch = (batchId: string) => {
    jobManagerV2.startBatch(batchId).catch(err => {
      toast.error(`Failed to start batch: ${err.message}`);
    });
  };

  // Get unique batch IDs
  const activeBatches = useMemo(() => {
    const batchMap = new Map<string, Job[]>();
    jobManagerV2.getAllJobs().forEach(job => {
      if (job.batchId) {
        if (!batchMap.has(job.batchId)) batchMap.set(job.batchId, []);
        batchMap.get(job.batchId)!.push(job);
      }
    });
    return Array.from(batchMap.entries());
  }, [jobManagerV2.getAllJobs()]);

  return (
    <div className="space-y-4">
      {/* Create Batch */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Create Batch Job
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Batch Name */}
          <div className="space-y-2">
            <Label className="text-xs">Batch Name</Label>
            <Input
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="e.g., Full Analysis Run"
            />
          </div>

          {/* File Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Select Files ({selectedFileIds.length}/{dataFiles.length})</Label>
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={selectAllFiles}>
                {selectedFileIds.length === dataFiles.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <ScrollArea className="h-32 border rounded-lg p-2">
              {dataFiles.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No files with data available
                </p>
              ) : (
                <div className="space-y-1">
                  {dataFiles.map(file => (
                    <div
                      key={file.id}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                        selectedFileIds.includes(file.id) 
                          ? 'bg-primary/10 border border-primary/30' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => toggleFileSelection(file.id)}
                    >
                      <Checkbox 
                        checked={selectedFileIds.includes(file.id)}
                        onCheckedChange={() => toggleFileSelection(file.id)}
                      />
                      <FileText className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm flex-1 truncate">{file.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {file.state.model.getBits().length} bits
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Strategy Selection */}
          <div className="space-y-2">
            <Label className="text-xs">Strategies</Label>
            <div className="flex gap-2">
              <Select value={selectedStrategyId} onValueChange={setSelectedStrategyId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select strategy..." />
                </SelectTrigger>
                <SelectContent>
                  {strategies.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                value={iterations}
                onChange={(e) => setIterations(parseInt(e.target.value) || 1)}
                className="w-20"
                min={1}
                placeholder="×"
              />
              <Button size="icon" onClick={addPreset} disabled={!selectedStrategyId}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            {presets.length > 0 && (
              <div className="space-y-1 mt-2">
                {presets.map((preset, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-muted/30 rounded text-sm">
                    <Badge variant="outline" className="text-xs">{idx + 1}</Badge>
                    <Settings2 className="w-3 h-3" />
                    <span className="flex-1">{preset.strategyName}</span>
                    <Badge>×{preset.iterations}</Badge>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-6 w-6"
                      onClick={() => removePreset(idx)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as JobPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Run Parallel</Label>
                <Switch checked={runParallel} onCheckedChange={setRunParallel} />
              </div>
              {runParallel && (
                <Input
                  type="number"
                  value={maxParallel}
                  onChange={(e) => setMaxParallel(parseInt(e.target.value) || 1)}
                  min={1}
                  max={10}
                  placeholder="Max parallel"
                />
              )}
            </div>
          </div>

          {/* Create Button */}
          <Button onClick={createBatch} className="w-full" disabled={selectedFileIds.length === 0 || presets.length === 0}>
            <Layers className="w-4 h-4 mr-2" />
            Create Batch ({selectedFileIds.length} files × {presets.reduce((sum, p) => sum + p.iterations, 0)} iterations)
          </Button>
        </CardContent>
      </Card>

      {/* Active Batches */}
      {activeBatches.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Active Batches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeBatches.map(([batchId, jobs]) => {
                const completed = jobs.filter(j => j.status === 'completed').length;
                const failed = jobs.filter(j => j.status === 'failed').length;
                const running = jobs.filter(j => j.status === 'running').length;
                const pending = jobs.filter(j => j.status === 'pending').length;
                const progress = (completed / jobs.length) * 100;
                
                return (
                  <div key={batchId} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-primary" />
                        <span className="font-medium text-sm">{batchId}</span>
                        <Badge variant="outline" className="text-xs">{jobs.length} jobs</Badge>
                      </div>
                      <div className="flex gap-1">
                        {pending > 0 && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="h-7"
                            onClick={() => startBatch(batchId)}
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Start
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="h-7 text-destructive"
                          onClick={() => jobManagerV2.cancelBatch(batchId)}
                        >
                          <Square className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <Progress value={progress} className="h-2 mb-2" />
                    
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      {running > 0 && (
                        <span className="flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin text-cyan-500" />
                          {running} running
                        </span>
                      )}
                      {pending > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {pending} pending
                        </span>
                      )}
                      {completed > 0 && (
                        <span className="flex items-center gap-1 text-green-500">
                          <CheckCircle className="w-3 h-3" />
                          {completed} done
                        </span>
                      )}
                      {failed > 0 && (
                        <span className="flex items-center gap-1 text-destructive">
                          <XCircle className="w-3 h-3" />
                          {failed} failed
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
