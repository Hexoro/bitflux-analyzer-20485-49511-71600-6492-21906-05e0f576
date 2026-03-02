/**
 * Verification Dashboard - Per-step verification status with hash comparison
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, XCircle, AlertTriangle, RefreshCw, Download, 
  Shield, Hash, Target 
} from 'lucide-react';
import { hashBits } from '@/lib/verificationSystem';

interface StepData {
  operation: string;
  params?: Record<string, any>;
  fullBeforeBits?: string;
  fullAfterBits?: string;
  storedAfterBits?: string;
  verified?: boolean;
  verificationNote?: string;
  executionError?: string;
  cost?: number;
  duration?: number;
}

interface VerificationDashboardProps {
  steps: StepData[];
  currentStep: number;
  initialBits: string;
  finalBits: string;
  overallStatus: 'pending' | 'passed' | 'failed' | 'skipped';
  onJumpToStep?: (index: number) => void;
  onReverifyAll?: () => void;
}

export const VerificationDashboard = ({
  steps,
  currentStep,
  initialBits,
  finalBits,
  overallStatus,
  onJumpToStep,
  onReverifyAll,
}: VerificationDashboardProps) => {
  const verifiedCount = steps.filter(s => s.verified).length;
  const failedCount = steps.filter(s => s.verified === false).length;
  const warningCount = steps.filter(s => s.verificationNote).length;
  const matchPercentage = steps.length > 0 ? (verifiedCount / steps.length) * 100 : 100;

  const initialHash = hashBits(initialBits);
  const finalHash = hashBits(finalBits);
  const reconstructedFinal = steps.length > 0 
    ? (steps[steps.length - 1]?.fullAfterBits || finalBits) 
    : initialBits;
  const reconstructedHash = hashBits(reconstructedFinal);

  const handleExportReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      totalSteps: steps.length,
      verified: verifiedCount,
      failed: failedCount,
      warnings: warningCount,
      matchPercentage,
      initialHash,
      finalHash,
      reconstructedHash,
      hashMatch: finalHash === reconstructedHash,
      steps: steps.map((s, i) => ({
        index: i,
        operation: s.operation,
        verified: s.verified,
        note: s.verificationNote,
        error: s.executionError,
        beforeHash: s.fullBeforeBits ? hashBits(s.fullBeforeBits) : null,
        afterHash: s.fullAfterBits ? hashBits(s.fullAfterBits) : null,
      })),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verification-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Overall Status */}
      <Card className={
        overallStatus === 'passed' ? 'border-green-500/30 bg-green-500/5' :
        overallStatus === 'failed' ? 'border-destructive/30 bg-destructive/5' :
        'border-border'
      }>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className={`w-8 h-8 ${
                overallStatus === 'passed' ? 'text-green-500' :
                overallStatus === 'failed' ? 'text-destructive' :
                'text-muted-foreground'
              }`} />
              <div>
                <h3 className="font-bold text-lg">
                  {overallStatus === 'passed' ? '100% Verified' :
                   overallStatus === 'failed' ? 'Verification Failed' :
                   'Verification Pending'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {verifiedCount}/{steps.length} steps verified • {warningCount} warnings
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onReverifyAll}>
                <RefreshCw className="w-3 h-3 mr-1" />
                Re-verify
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportReport}>
                <Download className="w-3 h-3 mr-1" />
                Export
              </Button>
            </div>
          </div>
          <Progress value={matchPercentage} className="h-2 mt-3" />
        </CardContent>
      </Card>

      {/* Hash Comparison */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Hash className="w-4 h-4" />
            Hash Comparison
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-muted/30 rounded">
              <span className="text-muted-foreground">Initial:</span>
              <code className="ml-2 font-mono">{initialHash}</code>
            </div>
            <div className="p-2 bg-muted/30 rounded">
              <span className="text-muted-foreground">Expected Final:</span>
              <code className="ml-2 font-mono">{finalHash}</code>
            </div>
            <div className={`p-2 rounded col-span-2 ${
              finalHash === reconstructedHash ? 'bg-green-500/10' : 'bg-destructive/10'
            }`}>
              <span className="text-muted-foreground">Reconstructed:</span>
              <code className="ml-2 font-mono">{reconstructedHash}</code>
              {finalHash === reconstructedHash ? (
                <CheckCircle className="w-3 h-3 inline ml-2 text-green-500" />
              ) : (
                <XCircle className="w-3 h-3 inline ml-2 text-destructive" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-Step Verification */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="w-4 h-4" />
            Step Verification ({steps.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <ScrollArea className="h-[300px]">
            <div className="space-y-1">
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-2 rounded text-xs cursor-pointer transition-colors ${
                    idx === currentStep ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/30'
                  }`}
                  onClick={() => onJumpToStep?.(idx)}
                >
                  <div className="flex items-center gap-2">
                    {step.verified === true ? (
                      <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                    ) : step.verified === false ? (
                      <XCircle className="w-3 h-3 text-destructive flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                    )}
                    <span className="text-muted-foreground">#{idx + 1}</span>
                    <Badge variant="outline" className="text-xs">{step.operation}</Badge>
                    {step.verificationNote && (
                      <span className="text-yellow-500 truncate max-w-[200px]">{step.verificationNote}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {step.fullAfterBits && (
                      <code className="text-muted-foreground font-mono">
                        {hashBits(step.fullAfterBits).slice(0, 6)}
                      </code>
                    )}
                    {step.executionError && (
                      <Badge variant="destructive" className="text-xs">Error</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
