/**
 * Queue Timeline - Visual timeline of job queue with ETA and priority
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Clock,
  Play,
  Pause,
  Square,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronRight,
  Zap,
  AlertTriangle,
  Timer,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { jobManagerV2, Job, JobPriority } from '@/lib/jobManagerV2';

export const QueueTimeline = () => {
  const [, forceUpdate] = useState({});
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const unsub = jobManagerV2.subscribe(() => forceUpdate({}));
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { unsub(); clearInterval(timer); };
  }, []);

  const allJobs = jobManagerV2.getAllJobs();
  const stats = jobManagerV2.getQueueStats();

  const sortedJobs = useMemo(() => {
    const priorityOrder: Record<JobPriority, number> = {
      critical: 0,
      high: 1,
      normal: 2,
      low: 3,
    };
    
    return [...allJobs].sort((a, b) => {
      // Running first
      if (a.status === 'running' && b.status !== 'running') return -1;
      if (b.status === 'running' && a.status !== 'running') return 1;
      
      // Then by priority
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by creation time
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }, [allJobs]);

  const getPriorityColor = (priority: JobPriority) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'normal': return 'bg-blue-500';
      case 'low': return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: Job['status']) => {
    switch (status) {
      case 'running': return <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'paused': return <Pause className="w-4 h-4 text-yellow-500" />;
      case 'cancelled': return <Square className="w-4 h-4 text-gray-500" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    const secs = Math.floor(ms / 1000);
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ${secs % 60}s`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m`;
  };

  const getTimelineWidth = (job: Job) => {
    if (job.status === 'completed' || job.status === 'failed') return 100;
    if (job.status === 'running') return job.progress;
    return 0;
  };

  // Calculate total ETA for pending jobs
  const totalETA = useMemo(() => {
    let total = 0;
    sortedJobs.forEach(job => {
      if (job.status === 'pending' || job.status === 'running') {
        if (job.eta) {
          total += job.eta.estimatedMs * (1 - job.progress / 100);
        } else if (stats.avgDuration > 0) {
          total += stats.avgDuration * (1 - job.progress / 100);
        }
      }
    });
    return total;
  }, [sortedJobs, stats.avgDuration]);

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-5 gap-2">
        <Card className="bg-gradient-to-br from-cyan-500/10 to-transparent">
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-cyan-500" />
              <span className="text-xs text-muted-foreground">Running</span>
            </div>
            <p className="text-xl font-bold">{stats.runningJobs}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-500/10 to-transparent">
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-muted-foreground">Pending</span>
            </div>
            <p className="text-xl font-bold">{stats.pendingJobs}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-transparent">
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Completed</span>
            </div>
            <p className="text-xl font-bold">{stats.completedJobs}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-transparent">
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Total ETA</span>
            </div>
            <p className="text-xl font-bold">{formatDuration(totalETA)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-transparent">
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Throughput</span>
            </div>
            <p className="text-xl font-bold">{stats.throughputPerHour.toFixed(1)}/hr</p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Queue Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            {sortedJobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No jobs in queue</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedJobs.map((job, idx) => (
                  <div key={job.id} className="relative">
                    {/* Timeline connector */}
                    {idx < sortedJobs.length - 1 && (
                      <div className="absolute left-[11px] top-8 w-0.5 h-6 bg-border" />
                    )}
                    
                    <div className="flex gap-3">
                      {/* Status indicator */}
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        job.status === 'running' ? 'bg-cyan-500/20' :
                        job.status === 'completed' ? 'bg-green-500/20' :
                        job.status === 'failed' ? 'bg-red-500/20' :
                        'bg-muted'
                      }`}>
                        {getStatusIcon(job.status)}
                      </div>
                      
                      {/* Job details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">{job.name}</span>
                          <div className={`w-2 h-2 rounded-full ${getPriorityColor(job.priority)}`} />
                          {job.queuePosition && job.status === 'pending' && (
                            <Badge variant="outline" className="text-[10px]">
                              #{job.queuePosition}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Progress bar for running jobs */}
                        {job.status === 'running' && (
                          <div className="mb-1">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>{job.presets[job.currentPresetIndex]?.strategyName || 'Processing'}</span>
                              <span className="font-mono">{job.progress}%</span>
                            </div>
                            <Progress value={job.progress} className="h-1.5" />
                          </div>
                        )}
                        
                        {/* Progress bar for pending jobs - show 0% */}
                        {job.status === 'pending' && (
                          <div className="mb-1">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Waiting...</span>
                              <span className="font-mono">0%</span>
                            </div>
                            <Progress value={0} className="h-1.5 opacity-50" />
                          </div>
                        )}
                        
                        {/* Meta info */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{job.dataFileName}</span>
                          <span>•</span>
                          <span>{job.presets.length} strategies</span>
                          {job.eta && job.status === 'running' && (
                            <>
                              <span>•</span>
                              <span className="text-primary">ETA: {job.eta.formatted}</span>
                            </>
                          )}
                          {job.startTime && job.status === 'running' && (
                            <>
                              <span>•</span>
                              <span>{formatDuration(now - job.startTime.getTime())}</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex gap-1">
                        {job.status === 'pending' && (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7"
                            onClick={() => jobManagerV2.startJob(job.id)}
                          >
                            <Play className="w-3 h-3" />
                          </Button>
                        )}
                        {job.status === 'running' && (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7"
                            onClick={() => jobManagerV2.pauseJob(job.id)}
                          >
                            <Pause className="w-3 h-3" />
                          </Button>
                        )}
                        {job.status === 'paused' && (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7"
                            onClick={() => jobManagerV2.resumeJob(job.id)}
                          >
                            <Play className="w-3 h-3" />
                          </Button>
                        )}
                        {(job.status === 'pending' || job.status === 'running' || job.status === 'paused') && (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7 text-destructive"
                            onClick={() => jobManagerV2.cancelJob(job.id)}
                          >
                            <Square className="w-3 h-3" />
                          </Button>
                        )}
                        {job.priority !== 'critical' && job.status === 'pending' && (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7"
                            onClick={() => jobManagerV2.prioritize(job.id)}
                            title="Prioritize"
                          >
                            <Zap className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
