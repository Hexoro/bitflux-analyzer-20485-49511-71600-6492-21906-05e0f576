import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Briefcase, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Plus,
  Play,
  Pause,
  Square,
  Trash2,
  FileText,
  Settings2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Layers,
  BarChart3,
  Download,
} from 'lucide-react';
import { Terminal } from 'lucide-react';
import { toast } from 'sonner';
import { jobManagerV2, Job, JobPreset, JobPriority } from '@/lib/jobManagerV2';
import { fileSystemManager } from '@/lib/fileSystemManager';
import { pythonModuleSystem } from '@/lib/pythonModuleSystem';
import { BatchJobsUI } from './BatchJobsUI';
import { QueueTimeline } from './QueueTimeline';
import { generateJobReport, generateBatchReport, downloadBlob } from '@/lib/reportGenerator';

interface JobsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const JobsDialog = ({ open, onOpenChange }: JobsDialogProps) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'timeline' | 'completed' | 'create' | 'batch'>('queue');
  const [, forceUpdate] = useState({});
  
  // Create job state
  const [jobName, setJobName] = useState('');
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [presets, setPresets] = useState<JobPreset[]>([]);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('');
  const [presetIterations, setPresetIterations] = useState(1);
  const [selectedPriority, setSelectedPriority] = useState<JobPriority>('normal');
  
  // Expanded job details
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe1 = jobManagerV2.subscribe(() => forceUpdate({}));
    const unsubscribe2 = fileSystemManager.subscribe(() => forceUpdate({}));
    const unsubscribe3 = pythonModuleSystem.subscribe(() => forceUpdate({}));
    return () => {
      unsubscribe1();
      unsubscribe2();
      unsubscribe3();
    };
  }, []);

  const dataFiles = fileSystemManager.getFiles();
  const strategies = pythonModuleSystem.getAllStrategies();
  const activeJobs = jobManagerV2.getAllJobs();
  const completedJobs = jobManagerV2.getCompletedJobs();

  const handleAddStrategy = () => {
    if (!selectedStrategyId) {
      toast.error('Select a strategy');
      return;
    }
    
    const strategy = strategies.find(s => s.id === selectedStrategyId);
    if (!strategy) return;

    setPresets([...presets, {
      strategyId: selectedStrategyId,
      strategyName: strategy.name,
      iterations: presetIterations,
    }]);
    
    setSelectedStrategyId('');
    setPresetIterations(1);
  };

  const handleRemovePreset = (index: number) => {
    setPresets(presets.filter((_, i) => i !== index));
  };

  const handleCreateJob = () => {
    if (!jobName.trim()) {
      toast.error('Enter a job name');
      return;
    }
    if (!selectedFileId) {
      toast.error('Select a data file');
      return;
    }
    if (presets.length === 0) {
      toast.error('Add at least one strategy');
      return;
    }

    const file = dataFiles.find(f => f.id === selectedFileId);
    if (!file?.state.model.getBits()) {
      toast.error('Selected file has no data loaded');
      return;
    }

    try {
      // Create job with priority
      const job = jobManagerV2.createJob(jobName, selectedFileId, presets, {
        priority: selectedPriority,
      });
      toast.success(`Job "${jobName}" created - Click play to start`);
      
      // Reset form
      setJobName('');
      setSelectedFileId('');
      setPresets([]);
      setSelectedPriority('normal');
      setActiveTab('queue');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const getPriorityBadge = (priority: JobPriority) => {
    switch (priority) {
      case 'critical':
        return <Badge className="bg-red-500/20 text-red-500 text-xs">Critical</Badge>;
      case 'high':
        return <Badge className="bg-orange-500/20 text-orange-500 text-xs">High</Badge>;
      case 'low':
        return <Badge className="bg-gray-500/20 text-gray-500 text-xs">Low</Badge>;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: Job['status']) => {
    switch (status) {
      case 'running':
        return <Badge className="bg-cyan-500/20 text-cyan-500"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Running</Badge>;
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-500"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'paused':
        return <Badge variant="secondary"><Pause className="w-3 h-3 mr-1" />Paused</Badge>;
      case 'cancelled':
        return <Badge variant="secondary"><Square className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const JobCard = ({ job, showControls = true }: { job: Job; showControls?: boolean }) => {
    const isExpanded = expandedJobId === job.id;

    return (
      <Card className="mb-2">
        <CardContent className="pt-4">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
          >
            <div className="flex items-center gap-3">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{job.name}</p>
                  {job.priority !== 'normal' && getPriorityBadge(job.priority)}
                  {job.queuePosition && job.status === 'pending' && (
                    <Badge variant="outline" className="text-xs">#{job.queuePosition} in queue</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {job.dataFileName} • {job.presets.length} strategy(ies)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(job.status)}
              {showControls && (
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  {job.status === 'pending' && (
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-green-500" onClick={() => jobManagerV2.startJob(job.id)}>
                      <Play className="w-3 h-3" />
                    </Button>
                  )}
                  {job.status === 'running' && (
                    <>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => jobManagerV2.pauseJob(job.id)}>
                        <Pause className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => jobManagerV2.cancelJob(job.id)}>
                        <Square className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                  {job.status === 'paused' && (
                    <>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-green-500" onClick={() => jobManagerV2.resumeJob(job.id)}>
                        <Play className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => jobManagerV2.cancelJob(job.id)}>
                        <Square className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                  {(job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') && (
                    <>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7" 
                        onClick={() => {
                          const blob = generateJobReport(job);
                          downloadBlob(blob, `job-report-${job.name.replace(/\s+/g, '-')}.pdf`);
                          toast.success('Report downloaded');
                        }}
                        title="Download Report"
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => jobManagerV2.deleteJob(job.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {job.status === 'running' && (
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-medium">
                  Strategy {job.currentPresetIndex + 1}/{job.presets.length}: {job.presets[job.currentPresetIndex]?.strategyName}
                </span>
                <Badge variant="outline" className="text-xs">
                  Iteration {job.currentIteration + 1}/{job.presets[job.currentPresetIndex]?.iterations || 1}
                </Badge>
              </div>
              <Progress value={job.progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{job.progress}% complete</span>
                <span>
                  {job.eta ? `ETA: ${job.eta.formatted}` : 
                    job.startTime && job.progress > 0 && (() => {
                      const elapsed = Date.now() - job.startTime.getTime();
                      const estimated = (elapsed / job.progress) * (100 - job.progress);
                      const mins = Math.floor(estimated / 60000);
                      const secs = Math.floor((estimated % 60000) / 1000);
                      return `ETA: ${mins}m ${secs}s`;
                    })()
                  }
                </span>
              </div>
            </div>
          )}

          {job.status === 'pending' && (
            <div className="mt-3 text-center">
              <Badge variant="outline" className="text-xs">Ready to start - Click play button</Badge>
            </div>
          )}

          {isExpanded && (
            <div className="mt-4 pt-4 border-t space-y-3">
              {/* Strategies */}
              <div>
                <h4 className="text-xs font-medium mb-2">Strategies in Order</h4>
                <div className="space-y-1">
                  {job.presets.map((preset, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-muted/30 rounded text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{idx + 1}.</span>
                        <Settings2 className="w-3 h-3" />
                        <span>{preset.strategyName}</span>
                      </div>
                      <Badge variant="outline">×{preset.iterations}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Results */}
              {job.results.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium mb-2">Results ({job.results.length})</h4>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {job.results.map((result, idx) => (
                      <div key={idx} className={`flex items-center justify-between p-2 rounded text-xs ${result.success ? 'bg-green-500/10' : 'bg-destructive/10'}`}>
                        <div className="flex items-center gap-2">
                          {result.success ? <CheckCircle className="w-3 h-3 text-green-500" /> : <XCircle className="w-3 h-3 text-destructive" />}
                          <span>{result.strategyName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span>{result.totalOperations || 0} ops</span>
                          <span>{result.totalDuration.toFixed(0)}ms</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error */}
              {job.error && (
                <div className="p-2 bg-destructive/10 rounded text-xs text-destructive">
                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                  {job.error}
                </div>
              )}

              {/* Timing */}
              {job.startTime && (
                <div className="text-xs text-muted-foreground">
                  Started: {job.startTime.toLocaleString()}
                  {job.endTime && ` • Ended: ${job.endTime.toLocaleString()}`}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Jobs Manager
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="queue">
              Queue ({activeJobs.length})
            </TabsTrigger>
            <TabsTrigger value="timeline">
              <BarChart3 className="w-4 h-4 mr-1" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="batch">
              <Layers className="w-4 h-4 mr-1" />
              Batch
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedJobs.length})
            </TabsTrigger>
            <TabsTrigger value="create">
              <Plus className="w-4 h-4 mr-1" />
              New Job
            </TabsTrigger>
          </TabsList>

          {/* Queue Tab */}
          <TabsContent value="queue" className="flex-1 overflow-hidden m-0 mt-4">
            <ScrollArea className="h-[400px]">
              {activeJobs.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Clock className="w-12 h-12 mb-4 opacity-50" />
                      <p className="text-lg font-medium">No Active Jobs</p>
                      <p className="text-sm">Create a new job to get started</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                activeJobs.map(job => <JobCard key={job.id} job={job} />)
              )}
            </ScrollArea>

            <div className="grid grid-cols-4 gap-4 mt-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="w-4 h-4 text-cyan-500" />
                    <span>Running</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{jobManagerV2.getRunningCount()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-yellow-500" />
                    <span>Pending</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{jobManagerV2.getPendingCount()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Completed</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{jobManagerV2.getCompletedCount()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-sm">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span>Failed</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{jobManagerV2.getFailedCount()}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="flex-1 overflow-hidden m-0 mt-4">
            <ScrollArea className="h-[500px]">
              <QueueTimeline />
            </ScrollArea>
          </TabsContent>

          {/* Batch Tab */}
          <TabsContent value="batch" className="flex-1 overflow-hidden m-0 mt-4">
            <ScrollArea className="h-[500px]">
              <BatchJobsUI />
            </ScrollArea>
          </TabsContent>

          {/* Completed Tab */}
          <TabsContent value="completed" className="flex-1 overflow-hidden m-0 mt-4">
            <ScrollArea className="h-[450px]">
              {completedJobs.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <CheckCircle className="w-12 h-12 mb-4 opacity-50" />
                      <p className="text-lg font-medium">No Completed Jobs</p>
                      <p className="text-sm">Jobs will appear here after completion</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                completedJobs.map(job => <JobCard key={job.id} job={job} showControls={true} />)
              )}
            </ScrollArea>
          </TabsContent>

          {/* Create Job Tab */}
          <TabsContent value="create" className="flex-1 overflow-hidden m-0 mt-4">
            <ScrollArea className="h-[450px]">
              <div className="space-y-4 pr-4">
                {/* Strategy Info Panel */}
                <Card className="bg-gradient-to-r from-primary/10 to-transparent border-primary/30">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-primary" />
                      Strategy Execution Guide
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 space-y-4">
                    {/* Execution Pipeline */}
                    <div>
                      <div className="text-xs font-medium mb-2 text-muted-foreground">Execution Pipeline</div>
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="bg-primary/10">Scheduler</Badge>
                        <span className="text-muted-foreground">→</span>
                        <Badge variant="outline" className="bg-blue-500/10">Algorithm</Badge>
                        <span className="text-muted-foreground">→</span>
                        <Badge variant="outline" className="bg-green-500/10">Scoring</Badge>
                        <span className="text-muted-foreground">→</span>
                        <Badge variant="outline" className="bg-yellow-500/10">Policies</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        The scheduler orchestrates execution, algorithm applies transformations,
                        scoring tracks costs/budget, and policies enforce constraints.
                      </p>
                    </div>

                    {/* CLI Commands */}
                    <div>
                      <div className="text-xs font-medium mb-2 text-muted-foreground">Python Console Commands</div>
                      <div className="space-y-1 text-xs font-mono bg-card p-3 rounded border border-border">
                        <div className="flex justify-between">
                          <span><span className="text-primary">run_strategy</span>("<span className="text-green-400">name</span>", "<span className="text-yellow-400">file_id</span>")</span>
                          <span className="text-muted-foreground"># Execute strategy</span>
                        </div>
                        <div className="flex justify-between">
                          <span><span className="text-primary">list_strategies</span>()</span>
                          <span className="text-muted-foreground"># Show available</span>
                        </div>
                        <div className="flex justify-between">
                          <span><span className="text-primary">list_files</span>()</span>
                          <span className="text-muted-foreground"># Show data files</span>
                        </div>
                        <div className="flex justify-between">
                          <span><span className="text-primary">get_results</span>()</span>
                          <span className="text-muted-foreground"># View all results</span>
                        </div>
                        <div className="flex justify-between">
                          <span><span className="text-primary">export_csv</span>("<span className="text-green-400">result_id</span>")</span>
                          <span className="text-muted-foreground"># Export to CSV</span>
                        </div>
                      </div>
                    </div>

                    {/* Parameter Docs */}
                    <div>
                      <div className="text-xs font-medium mb-2 text-muted-foreground">Job Parameters</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-card rounded border border-border">
                          <span className="font-medium">Iterations</span>
                          <p className="text-muted-foreground">Times to run each strategy on the data</p>
                        </div>
                        <div className="p-2 bg-card rounded border border-border">
                          <span className="font-medium">Execution Order</span>
                          <p className="text-muted-foreground">Sequential order of strategy application</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Create New Job</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Job Name */}
                    <div className="space-y-2">
                      <Label>Job Name</Label>
                      <Input
                        value={jobName}
                        onChange={e => setJobName(e.target.value)}
                        placeholder="My compression job"
                      />
                    </div>

                    {/* Data File Selection */}
                    <div className="space-y-2">
                      <Label>Data File</Label>
                      {dataFiles.length === 0 ? (
                        <div className="p-3 border border-dashed rounded-lg text-center text-muted-foreground text-sm">
                          <FileText className="w-6 h-6 mx-auto mb-1 opacity-50" />
                          No data files available. Load or generate data first.
                        </div>
                      ) : (
                        <Select value={selectedFileId} onValueChange={setSelectedFileId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a data file" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border border-border z-50">
                            {dataFiles.map(file => {
                              const hasBits = file.state.model.getBits().length > 0;
                              return (
                                <SelectItem key={file.id} value={file.id} disabled={!hasBits}>
                                  <div className="flex items-center gap-2">
                                    <FileText className="w-3 h-3" />
                                    <span>{file.name}</span>
                                    {!hasBits && <Badge variant="outline" className="ml-2 text-xs">No data</Badge>}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {/* Strategy Selection */}
                    <div className="space-y-2">
                      <Label>Add Strategies</Label>
                      <div className="flex gap-2">
                        <Select value={selectedStrategyId} onValueChange={setSelectedStrategyId}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select a strategy" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border border-border z-50 max-w-md">
                            {strategies.length === 0 ? (
                              <div className="p-2 text-center text-muted-foreground text-sm">
                                No strategies available. Create one in the Strategy tab.
                              </div>
                            ) : (
                              strategies.map(strategy => (
                                <SelectItem key={strategy.id} value={strategy.id}>
                                  <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-2">
                                      <Settings2 className="w-3 h-3" />
                                      <span className="font-medium">{strategy.name}</span>
                                      {strategy.schedulerFile && <Badge variant="secondary" className="text-xs">Ready</Badge>}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {strategy.algorithmFiles.length} algorithm(s), {strategy.scoringFiles.length} scoring, {strategy.policyFiles.length} policy
                                    </div>
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={presetIterations}
                          onChange={e => setPresetIterations(parseInt(e.target.value) || 1)}
                          className="w-20"
                          placeholder="×"
                        />
                        <Button onClick={handleAddStrategy} disabled={!selectedStrategyId}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Selected Strategies */}
                    {presets.length > 0 && (
                      <div className="space-y-2">
                        <Label>Execution Order</Label>
                        <div className="space-y-1">
                          {presets.map((preset, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">{idx + 1}.</span>
                                <Settings2 className="w-3 h-3" />
                                <span>{preset.strategyName}</span>
                                <Badge variant="outline">×{preset.iterations}</Badge>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-destructive"
                                onClick={() => handleRemovePreset(idx)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Priority Selection */}
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select value={selectedPriority} onValueChange={(v) => setSelectedPriority(v as JobPriority)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border border-border z-50">
                          <SelectItem value="critical">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-red-500" />
                              Critical
                            </div>
                          </SelectItem>
                          <SelectItem value="high">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-orange-500" />
                              High
                            </div>
                          </SelectItem>
                          <SelectItem value="normal">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-blue-500" />
                              Normal
                            </div>
                          </SelectItem>
                          <SelectItem value="low">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-gray-500" />
                              Low
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      className="w-full"
                      onClick={handleCreateJob}
                      disabled={!jobName.trim() || !selectedFileId || presets.length === 0}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Create & Start Job
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
