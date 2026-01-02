/**
 * Startup Test Suite Display Component
 * Runs tests on boot and displays results with approval gating
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  FlaskConical,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Play,
} from 'lucide-react';
import { testSuite, TestSuiteResults, TestResult } from '@/lib/testSuite';

interface StartupTestSuiteProps {
  onComplete?: (results: TestSuiteResults) => void;
  onApproved?: () => void;
  requireApproval?: boolean;
}

export const StartupTestSuite = ({ 
  onComplete, 
  onApproved,
  requireApproval = true 
}: StartupTestSuiteProps) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestSuiteResults | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showDialog, setShowDialog] = useState(true);
  const [isApproved, setIsApproved] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    setIsApproved(false);
    try {
      const testResults = await testSuite.runAll();
      setResults(testResults);
      onComplete?.(testResults);
      
      // Auto-expand failed categories
      const failedCategories = new Set(
        testResults.results.filter(r => !r.passed).map(r => r.category)
      );
      setExpandedCategories(failedCategories);
      
      // Keep dialog open for review
      setShowDialog(true);
    } catch (error) {
      console.error('Test suite error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleApprove = () => {
    setIsApproved(true);
    setShowDialog(false);
    onApproved?.();
  };

  const getResultsByCategory = () => {
    if (!results) return {};
    const grouped: { [category: string]: TestResult[] } = {};
    for (const result of results.results) {
      if (!grouped[result.category]) {
        grouped[result.category] = [];
      }
      grouped[result.category].push(result);
    }
    return grouped;
  };

  const resultsByCategory = getResultsByCategory();

  // Show loading state while running
  if (isRunning) {
    return (
      <Dialog open={true}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5" />
              System Test Suite
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Running Tests...</p>
            <p className="text-sm text-muted-foreground">Verifying system integrity</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Mini status badge when approved
  if (isApproved && results && !showDialog) {
    const allPassed = results.failed === 0;
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowDialog(true)}
        className={`h-6 px-2 text-xs ${allPassed ? 'text-green-500' : 'text-destructive'}`}
      >
        <FlaskConical className="w-3 h-3 mr-1" />
        {allPassed ? (
          <CheckCircle className="w-3 h-3 mr-1" />
        ) : (
          <XCircle className="w-3 h-3 mr-1" />
        )}
        {results.passed}/{results.totalTests}
      </Button>
    );
  }

  // Main dialog with approval gate
  return (
    <Dialog open={showDialog && results !== null} onOpenChange={(open) => {
      // Only allow closing if approved or not requiring approval
      if (!open && (isApproved || !requireApproval)) {
        setShowDialog(false);
      }
    }}>
      <DialogContent className="max-w-2xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5" />
            System Test Suite - Review Required
          </DialogTitle>
        </DialogHeader>

        {results && (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Summary */}
            <Card className="mb-4 flex-shrink-0">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4">
                    {results.failed === 0 ? (
                      <Badge className="bg-green-500/20 text-green-500 text-lg px-3 py-1">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        All Tests Passed
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-lg px-3 py-1">
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        {results.failed} Test{results.failed !== 1 ? 's' : ''} Failed
                      </Badge>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {results.duration.toFixed(0)}ms
                    </span>
                  </div>
                  <Button size="sm" variant="outline" onClick={runTests} disabled={isRunning}>
                    <RefreshCw className={`w-3 h-3 mr-1 ${isRunning ? 'animate-spin' : ''}`} />
                    Re-run
                  </Button>
                </div>
                <Progress 
                  value={(results.passed / results.totalTests) * 100} 
                  className="h-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{results.passed} passed</span>
                  <span>{results.failed} failed</span>
                  <span>{results.totalTests} total</span>
                </div>
              </CardContent>
            </Card>

            {/* Results by Category - Scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="space-y-2 pr-4">
                {Object.entries(resultsByCategory).map(([category, tests]) => {
                  const passed = tests.filter(t => t.passed).length;
                  const failed = tests.length - passed;
                  const isExpanded = expandedCategories.has(category);

                  return (
                    <Card key={category}>
                      <div
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30"
                        onClick={() => toggleCategory(category)}
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                          <span className="font-medium">{category}</span>
                          <Badge variant="secondary" className="text-xs">
                            {tests.length} tests
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {passed > 0 && (
                            <Badge className="bg-green-500/20 text-green-500 text-xs">
                              {passed} passed
                            </Badge>
                          )}
                          {failed > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {failed} failed
                            </Badge>
                          )}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="border-t px-3 pb-3">
                          <div className="space-y-1 mt-2">
                            {tests.map((test, idx) => (
                              <div
                                key={idx}
                                className={`flex items-center justify-between p-2 rounded text-sm ${
                                  test.passed ? 'bg-green-500/5' : 'bg-destructive/10'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {test.passed ? (
                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                  ) : (
                                    <XCircle className="w-3 h-3 text-destructive" />
                                  )}
                                  <span className="font-mono text-xs">{test.name}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {test.duration.toFixed(1)}ms
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Approval Footer */}
            <DialogFooter className="mt-4 flex-shrink-0 border-t pt-4">
              <div className="flex items-center gap-3 w-full justify-between">
                <p className="text-sm text-muted-foreground">
                  {results.failed > 0 
                    ? 'Some tests failed. Review results before continuing.' 
                    : 'All tests passed. Continue to the application.'}
                </p>
                <div className="flex gap-2">
                  {results.failed > 0 && (
                    <Button 
                      variant="outline" 
                      onClick={handleApprove}
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Continue Anyway
                    </Button>
                  )}
                  <Button 
                    onClick={handleApprove}
                    className={results.failed === 0 ? '' : 'bg-green-600 hover:bg-green-700'}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {results.failed === 0 ? 'Continue to App' : 'Acknowledge & Continue'}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
