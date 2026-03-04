/**
 * Built-in Report Viewer - view, download, and load JSON reports
 */
import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, Upload, CheckCircle, XCircle, AlertTriangle, BarChart3, Clock, Hash } from 'lucide-react';
import { toast } from 'sonner';

interface ReportViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialReport?: any;
}

type ReportType = 'verification' | 'transformation' | 'issues' | 'test' | 'report' | 'failures' | 'unknown';

function detectReportType(data: any): ReportType {
  if (!data || typeof data !== 'object') return 'unknown';
  if (data.type === 'player-verification') return 'verification';
  if (data.type === 'player-transformation') return 'transformation';
  if (data.type === 'player-issues') return 'issues';
  if (data.type === 'report') return 'test';
  if (data.type === 'failures') return 'failures';
  if (data.byCategory) return 'test';
  if (data.stepResults) return 'verification';
  if (data.steps) return 'transformation';
  return 'unknown';
}

const typeLabels: Record<ReportType, string> = {
  verification: 'Verification Report',
  transformation: 'Transformation Report',
  issues: 'Issues Report',
  test: 'Test Report',
  report: 'Test Report',
  failures: 'Failures Report',
  unknown: 'Report',
};

const typeColors: Record<ReportType, string> = {
  verification: 'text-blue-500',
  transformation: 'text-purple-500',
  issues: 'text-orange-500',
  test: 'text-green-500',
  report: 'text-green-500',
  failures: 'text-destructive',
  unknown: 'text-muted-foreground',
};

function VerificationView({ data }: { data: any }) {
  const results = data.stepResults || [];
  const passed = results.filter((r: any) => r.passed).length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold text-green-500">{passed}</div>
          <div className="text-xs text-muted-foreground">Passed</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold text-destructive">{results.length - passed}</div>
          <div className="text-xs text-muted-foreground">Failed</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold">{results.length}</div>
          <div className="text-xs text-muted-foreground">Total Steps</div>
        </CardContent></Card>
      </div>
      {data.overallPassed !== undefined && (
        <Badge className={data.overallPassed ? 'bg-green-500/20 text-green-500' : 'bg-destructive/20 text-destructive'}>
          {data.overallPassed ? 'VERIFIED' : 'FAILED'}
        </Badge>
      )}
      <div className="space-y-1">
        {results.map((r: any, i: number) => (
          <div key={i} className="flex items-center gap-2 text-xs py-1 px-2 rounded hover:bg-muted/50">
            {r.passed ? <CheckCircle className="w-3 h-3 text-green-500 shrink-0" /> : <XCircle className="w-3 h-3 text-destructive shrink-0" />}
            <span className="font-mono">Step {r.stepIndex ?? i}</span>
            <span className="text-muted-foreground">{r.operation}</span>
            {r.mismatchCount > 0 && <Badge variant="destructive" className="text-[10px] ml-auto">{r.mismatchCount} mismatches</Badge>}
          </div>
        ))}
      </div>
    </div>
  );
}

function TransformationView({ data }: { data: any }) {
  const steps = data.steps || [];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center"><div className="text-2xl font-bold">{steps.length}</div><div className="text-xs text-muted-foreground">Steps</div></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><div className="text-2xl font-bold">{data.totalBitsChanged?.toLocaleString() ?? '—'}</div><div className="text-xs text-muted-foreground">Bits Changed</div></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><div className="text-2xl font-bold">{data.totalCost ?? '—'}</div><div className="text-xs text-muted-foreground">Total Cost</div></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><div className="text-2xl font-bold">{data.totalDurationMs ? `${(data.totalDurationMs / 1000).toFixed(1)}s` : '—'}</div><div className="text-xs text-muted-foreground">Duration</div></CardContent></Card>
      </div>
      <div className="space-y-1">
        {steps.map((s: any, i: number) => (
          <div key={i} className="flex items-center gap-2 text-xs py-1 px-2 rounded hover:bg-muted/50">
            <span className="font-mono w-8 text-muted-foreground">#{i}</span>
            <Badge variant="outline" className="text-[10px]">{s.operation}</Badge>
            <span className="text-muted-foreground">{s.bitsChanged} bits changed</span>
            <span className="ml-auto text-muted-foreground">cost: {s.cost}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function IssuesView({ data }: { data: any }) {
  const issues = data.issues || [];
  return (
    <div className="space-y-2">
      {data.summary && <p className="text-sm text-muted-foreground">{data.summary}</p>}
      {issues.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground"><CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500/50" /><p>No issues found</p></div>
      ) : issues.map((issue: any, i: number) => (
        <Card key={i} className="border-orange-500/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-3 h-3 text-orange-500" />
              <Badge variant="outline" className="text-[10px]">{issue.category || issue.type}</Badge>
            </div>
            <p className="text-xs">{issue.description || issue.message}</p>
            {issue.suggestion && <p className="text-xs text-muted-foreground mt-1">💡 {issue.suggestion}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TestReportView({ data }: { data: any }) {
  const summary = data.summary || data;
  const failures = data.failures || [];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3 text-center"><div className="text-2xl font-bold text-green-500">{summary.totalPassed ?? summary.passed ?? 0}</div><div className="text-xs text-muted-foreground">Passed</div></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><div className="text-2xl font-bold text-destructive">{summary.totalFailed ?? summary.failed ?? 0}</div><div className="text-xs text-muted-foreground">Failed</div></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><div className="text-2xl font-bold">{summary.totalTests ?? (summary.totalPassed ?? 0) + (summary.totalFailed ?? 0)}</div><div className="text-xs text-muted-foreground">Total</div></CardContent></Card>
      </div>
      {failures.length > 0 && (
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-destructive">Failures ({failures.length})</h4>
          {failures.map((f: any, i: number) => (
            <Card key={i} className="border-destructive/30"><CardContent className="p-2 text-xs">
              <div className="font-medium">{f.name || f.id}</div>
              {f.expected !== undefined && (
                <div className="flex gap-4 font-mono text-[10px] mt-1">
                  <span><span className="text-muted-foreground">Expected: </span><span className="text-green-600">{String(f.expected).slice(0, 40)}</span></span>
                  <span><span className="text-muted-foreground">Actual: </span><span className="text-destructive">{String(f.actual).slice(0, 40)}</span></span>
                </div>
              )}
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}

function RawJsonView({ data }: { data: any }) {
  return <pre className="text-xs font-mono bg-muted/50 p-4 rounded overflow-auto max-h-[400px] whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>;
}

export function ReportViewerDialog({ open, onOpenChange, initialReport }: ReportViewerDialogProps) {
  const [report, setReport] = useState<any>(initialReport || null);
  const [activeTab, setActiveTab] = useState('visual');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reportType = report ? detectReportType(report) : 'unknown';

  const handleLoad = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        setReport(data);
        setActiveTab('visual');
        toast.success(`Loaded: ${typeLabels[detectReportType(data)]}`);
      } catch { toast.error('Invalid JSON file'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  const handleDownload = useCallback(() => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `bsee-${reportType}-report-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Report downloaded');
  }, [report, reportType]);

  const renderVisual = () => {
    if (!report) return <div className="text-center py-12 text-muted-foreground"><FileText className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No report loaded</p><Button variant="link" onClick={() => fileInputRef.current?.click()}>Load a report file</Button></div>;
    switch (reportType) {
      case 'verification': return <VerificationView data={report} />;
      case 'transformation': return <TransformationView data={report} />;
      case 'issues': return <IssuesView data={report} />;
      case 'test': case 'report': case 'failures': return <TestReportView data={report} />;
      default: return <RawJsonView data={report} />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-primary" />
              <div>
                <DialogTitle>Report Viewer</DialogTitle>
                <DialogDescription>{report ? typeLabels[reportType] : 'Load or view reports'}</DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {report && <Badge className={typeColors[reportType]}>{reportType}</Badge>}
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Upload className="w-3 h-3 mr-1" />Load</Button>
              <Button variant="outline" size="sm" onClick={handleDownload} disabled={!report}><Download className="w-3 h-3 mr-1" />Download</Button>
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleLoad} className="hidden" />
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-6 mt-4 grid w-auto grid-cols-2">
            <TabsTrigger value="visual" className="text-xs">Visual</TabsTrigger>
            <TabsTrigger value="raw" className="text-xs">Raw JSON</TabsTrigger>
          </TabsList>
          <div className="flex-1 min-h-0 overflow-hidden">
            <TabsContent value="visual" className="h-full m-0"><ScrollArea className="h-[450px]"><div className="p-6">{renderVisual()}</div></ScrollArea></TabsContent>
            <TabsContent value="raw" className="h-full m-0"><ScrollArea className="h-[450px]"><div className="p-6">{report ? <RawJsonView data={report} /> : <p className="text-muted-foreground text-center py-12">No report loaded</p>}</div></ScrollArea></TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
