/**
 * Code Context View - Shows source code that triggered operations
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileCode,
  Play,
  ChevronRight,
  ChevronDown,
  GitBranch,
  AlertCircle,
  CheckCircle2,
  Code,
  Layers,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { Highlight, themes } from 'prism-react-renderer';

export interface CodeContext {
  fileName: string;
  lineNumber: number;
  lineContent: string;
  contextBefore: string[];
  contextAfter: string[];
  condition?: string;
  conditionResult?: boolean;
  callStack?: string[];
  isCustomCode?: boolean;
  parallelGroup?: string;
}

interface CodeContextViewProps {
  step: {
    operation: string;
    params?: Record<string, any>;
    bitRanges?: { start: number; end: number }[];
    codeContext?: CodeContext;
    reasoning?: ReasoningEntry;
  } | null;
  stepIndex: number;
  totalSteps: number;
}

export interface ReasoningEntry {
  condition: string;
  conditionValue: any;
  result: boolean;
  explanation: string;
  branchTaken?: string;
  branchSkipped?: string;
  alternatives?: string[];
}

export const CodeContextView = ({ step, stepIndex, totalSteps }: CodeContextViewProps) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['code', 'reasoning']));

  const toggleSection = (section: string) => {
    const next = new Set(expandedSections);
    if (next.has(section)) next.delete(section);
    else next.add(section);
    setExpandedSections(next);
  };

  if (!step) {
    return (
      <Card className="h-full bg-background/50 border-border/50">
        <CardContent className="py-12 text-center">
          <Code className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground">Select a step to view code context</p>
        </CardContent>
      </Card>
    );
  }

  const codeContext = step.codeContext;
  const reasoning = step.reasoning;

  // Generate simulated code context if not available
  const simulatedContext: CodeContext = codeContext || {
    fileName: 'Algorithm.py',
    lineNumber: 42,
    lineContent: `apply_operation('${step.operation}', bits${step.bitRanges?.[0] ? `, ${step.bitRanges[0].start}, ${step.bitRanges[0].end}` : ''})`,
    contextBefore: [
      '# Check metrics before applying operation',
      'metrics = get_all_metrics()',
      `if metrics['entropy'] < 0.8:`,
    ],
    contextAfter: [
      '    log(f"Applied {operation}, new entropy: {get_metric(\'entropy\')}")',
      'else:',
      '    log("Skipped operation, entropy already sufficient")',
    ],
    condition: "metrics['entropy'] < 0.8",
    conditionResult: true,
  };

  const simulatedReasoning: ReasoningEntry = reasoning || {
    condition: "metrics['entropy'] < 0.8",
    conditionValue: { entropy: 0.72 },
    result: true,
    explanation: `Entropy (0.72) was below threshold (0.8), so ${step.operation} was applied to increase randomness`,
    branchTaken: 'if',
    branchSkipped: 'else',
    alternatives: [
      'If entropy was >= 0.8, operation would have been skipped',
      'Alternative: SHUFFLE could also increase entropy',
    ],
  };

  const renderCodeBlock = (code: string[], highlightLine?: number) => {
    const fullCode = code.join('\n');
    return (
      <Highlight theme={themes.nightOwl} code={fullCode} language="python">
        {({ tokens, getLineProps, getTokenProps }) => (
          <pre className="text-xs font-mono">
            {tokens.map((line, i) => (
              <div
                key={i}
                {...getLineProps({ line })}
                className={`flex ${i === highlightLine ? 'bg-cyan-500/20 border-l-2 border-cyan-400' : ''}`}
              >
                <span className="w-6 text-muted-foreground text-right mr-2 select-none opacity-50">
                  {(simulatedContext.lineNumber - (simulatedContext.contextBefore?.length || 0)) + i}
                </span>
                <span>
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </span>
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    );
  };

  return (
    <Card className="h-full bg-background/50 border-cyan-400/30 flex flex-col">
      <CardHeader className="py-2 px-3 border-b border-cyan-400/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2 text-cyan-100">
            <FileCode className="w-4 h-4 text-cyan-400" />
            Code Context
          </CardTitle>
          <Badge variant="outline" className="text-[10px] border-cyan-400/50 text-cyan-300">
            Step {stepIndex + 1}/{totalSteps}
          </Badge>
        </div>
      </CardHeader>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* Operation Header */}
          <div className="p-3 rounded-lg bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-400/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span className="font-mono font-bold">{step.operation}</span>
              </div>
              {step.bitRanges?.[0] && (
                <Badge className="text-[10px] bg-cyan-500/20 text-cyan-300 border-cyan-500/50">
                  [{step.bitRanges[0].start}:{step.bitRanges[0].end}]
                </Badge>
              )}
            </div>
            {step.params && Object.keys(step.params).length > 0 && (
              <div className="text-xs text-muted-foreground">
                Params: <code className="text-cyan-300">{JSON.stringify(step.params)}</code>
              </div>
            )}
          </div>

          {/* Source Code Section */}
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <button
              className="w-full p-2 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors"
              onClick={() => toggleSection('code')}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                {expandedSections.has('code') ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <Code className="w-4 h-4 text-blue-400" />
                Source Code
              </div>
              <Badge variant="outline" className="text-[10px]">
                {simulatedContext.fileName}:{simulatedContext.lineNumber}
              </Badge>
            </button>

            {expandedSections.has('code') && (
              <div className="p-2 bg-[#011627]">
                {renderCodeBlock(
                  [
                    ...simulatedContext.contextBefore,
                    simulatedContext.lineContent,
                    ...simulatedContext.contextAfter,
                  ],
                  simulatedContext.contextBefore.length
                )}
              </div>
            )}
          </div>

          {/* Condition/Decision Section */}
          {simulatedContext.condition && (
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <button
                className="w-full p-2 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors"
                onClick={() => toggleSection('condition')}
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  {expandedSections.has('condition') ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  <GitBranch className="w-4 h-4 text-yellow-400" />
                  Condition
                </div>
                <Badge className={simulatedContext.conditionResult ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}>
                  {simulatedContext.conditionResult ? 'True' : 'False'}
                </Badge>
              </button>

              {expandedSections.has('condition') && (
                <div className="p-3 space-y-2">
                  <div className="p-2 rounded bg-muted/30 font-mono text-xs">
                    {simulatedContext.condition}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <ArrowRight className="w-3 h-3" />
                    <span className="text-muted-foreground">Result:</span>
                    {simulatedContext.conditionResult ? (
                      <CheckCircle2 className="w-3 h-3 text-green-400" />
                    ) : (
                      <AlertCircle className="w-3 h-3 text-red-400" />
                    )}
                    <span>{simulatedContext.conditionResult ? 'Condition passed' : 'Condition failed'}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reasoning Section */}
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <button
              className="w-full p-2 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors"
              onClick={() => toggleSection('reasoning')}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                {expandedSections.has('reasoning') ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <Layers className="w-4 h-4 text-purple-400" />
                Reasoning
              </div>
            </button>

            {expandedSections.has('reasoning') && (
              <div className="p-3 space-y-3">
                <div className="p-2 rounded bg-purple-500/10 border border-purple-500/30">
                  <p className="text-sm">{simulatedReasoning.explanation}</p>
                </div>

                {simulatedReasoning.conditionValue && (
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Condition values:</div>
                    <div className="p-2 rounded bg-muted/30 font-mono text-xs">
                      {JSON.stringify(simulatedReasoning.conditionValue, null, 2)}
                    </div>
                  </div>
                )}

                {simulatedReasoning.branchTaken && (
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-green-400" />
                      <span className="text-green-400">Took: {simulatedReasoning.branchTaken}</span>
                    </div>
                    {simulatedReasoning.branchSkipped && (
                      <div className="flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-red-400" />
                        <span className="text-red-400">Skipped: {simulatedReasoning.branchSkipped}</span>
                      </div>
                    )}
                  </div>
                )}

                {simulatedReasoning.alternatives && simulatedReasoning.alternatives.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Alternatives:</div>
                    <ul className="space-y-1">
                      {simulatedReasoning.alternatives.map((alt, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                          <span className="text-muted-foreground/50">•</span>
                          {alt}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Call Stack (if available) */}
          {simulatedContext.callStack && simulatedContext.callStack.length > 0 && (
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <button
                className="w-full p-2 flex items-center gap-2 bg-muted/30 hover:bg-muted/50 transition-colors text-sm font-medium"
                onClick={() => toggleSection('callstack')}
              >
                {expandedSections.has('callstack') ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                Call Stack
              </button>

              {expandedSections.has('callstack') && (
                <div className="p-3">
                  <div className="space-y-1">
                    {simulatedContext.callStack.map((call, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs font-mono">
                        <span className="text-muted-foreground w-4">{i}</span>
                        <span>{call}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Parallel Operations Indicator */}
          {simulatedContext.parallelGroup && (
            <div className="p-2 rounded bg-orange-500/10 border border-orange-500/30">
              <div className="flex items-center gap-2 text-xs">
                <Play className="w-3 h-3 text-orange-400" />
                <span className="text-orange-300">
                  Part of parallel group: {simulatedContext.parallelGroup}
                </span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};
