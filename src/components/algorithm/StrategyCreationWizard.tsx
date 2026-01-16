/**
 * Strategy Creation Wizard - Step-by-step strategy builder
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  Code,
  Calculator,
  Shield,
  FileCode,
  Sparkles,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { PythonFile, StrategyConfig, pythonModuleSystem } from '@/lib/pythonModuleSystem';
import { toast } from 'sonner';
import { Highlight, themes } from 'prism-react-renderer';

interface StrategyCreationWizardProps {
  files: PythonFile[];
  onComplete: (strategy: StrategyConfig) => void;
  onCancel: () => void;
}

const STEPS = [
  { id: 'name', title: 'Name & Description', icon: Sparkles },
  { id: 'scheduler', title: 'Select Scheduler', icon: Clock },
  { id: 'algorithms', title: 'Select Algorithms', icon: Code },
  { id: 'scoring', title: 'Select Scoring', icon: Calculator },
  { id: 'policies', title: 'Select Policies', icon: Shield },
  { id: 'review', title: 'Review & Create', icon: Check },
];

export const StrategyCreationWizard = ({ files, onComplete, onCancel }: StrategyCreationWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [strategyName, setStrategyName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedScheduler, setSelectedScheduler] = useState('');
  const [selectedAlgorithms, setSelectedAlgorithms] = useState<string[]>([]);
  const [selectedScoring, setSelectedScoring] = useState<string[]>([]);
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);
  const [previewFile, setPreviewFile] = useState<PythonFile | null>(null);

  const schedulerFiles = files.filter(f => f.group === 'scheduler');
  const algorithmFiles = files.filter(f => f.group === 'algorithm');
  const scoringFiles = files.filter(f => f.group === 'scoring');
  const policyFiles = files.filter(f => f.group === 'policies');

  const canProceed = () => {
    switch (currentStep) {
      case 0: return strategyName.trim().length > 0;
      case 1: return selectedScheduler.length > 0;
      case 2: return true; // Algorithms optional
      case 3: return true; // Scoring optional
      case 4: return true; // Policies optional
      case 5: return true;
      default: return false;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreate = () => {
    if (!strategyName.trim()) {
      toast.error('Enter a strategy name');
      return;
    }
    if (!selectedScheduler) {
      toast.error('Select a scheduler');
      return;
    }

    try {
      const strategy = pythonModuleSystem.createStrategy(
        strategyName,
        selectedScheduler,
        selectedAlgorithms,
        selectedScoring,
        selectedPolicies
      );
      onComplete(strategy);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const toggleFile = (fileName: string, list: string[], setter: (val: string[]) => void) => {
    if (list.includes(fileName)) {
      setter(list.filter(f => f !== fileName));
    } else {
      setter([...list, fileName]);
    }
  };

  const renderFileCard = (file: PythonFile, isSelected: boolean, onClick: () => void, type: string) => {
    const lines = file.content.split('\n').length;
    const hasFunctions = file.content.includes('def ');
    const hasLoops = file.content.includes('for ') || file.content.includes('while ');
    
    return (
      <Card
        key={file.name}
        className={`cursor-pointer transition-all ${
          isSelected 
            ? 'ring-2 ring-primary border-primary/50 bg-primary/10' 
            : 'hover:border-primary/30 bg-background/50'
        }`}
        onClick={onClick}
      >
        <CardContent className="p-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <FileCode className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
              <div>
                <div className="font-medium text-sm">{file.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {lines} lines {hasFunctions && '• functions'} {hasLoops && '• loops'}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewFile(file);
                }}
              >
                <Eye className="w-3 h-3" />
              </Button>
              {isSelected && <Check className="w-4 h-4 text-primary" />}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Strategy Name</Label>
              <Input
                value={strategyName}
                onChange={(e) => setStrategyName(e.target.value)}
                placeholder="My Awesome Strategy"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Description (optional)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this strategy do?"
                className="mt-1"
              />
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" />
                Scheduler File
                <Badge variant="destructive" className="text-[10px]">Required</Badge>
              </Label>
              <span className="text-xs text-muted-foreground">{schedulerFiles.length} available</span>
            </div>
            
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {schedulerFiles.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No scheduler files found</p>
                    <p className="text-xs mt-1">Create a scheduler file first</p>
                  </div>
                ) : (
                  schedulerFiles.map(file => renderFileCard(
                    file,
                    selectedScheduler === file.name,
                    () => setSelectedScheduler(file.name),
                    'scheduler'
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        );

      case 2:
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2">
                <Code className="w-4 h-4 text-blue-400" />
                Algorithm Files
                <Badge variant="secondary" className="text-[10px]">Optional</Badge>
              </Label>
              <span className="text-xs text-muted-foreground">
                {selectedAlgorithms.length} of {algorithmFiles.length} selected
              </span>
            </div>
            
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {algorithmFiles.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No algorithm files found</p>
                  </div>
                ) : (
                  algorithmFiles.map(file => renderFileCard(
                    file,
                    selectedAlgorithms.includes(file.name),
                    () => toggleFile(file.name, selectedAlgorithms, setSelectedAlgorithms),
                    'algorithm'
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        );

      case 3:
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2">
                <Calculator className="w-4 h-4 text-yellow-400" />
                Scoring Files
                <Badge variant="secondary" className="text-[10px]">Optional</Badge>
              </Label>
              <span className="text-xs text-muted-foreground">
                {selectedScoring.length} of {scoringFiles.length} selected
              </span>
            </div>
            
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {scoringFiles.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No scoring files found</p>
                  </div>
                ) : (
                  scoringFiles.map(file => renderFileCard(
                    file,
                    selectedScoring.includes(file.name),
                    () => toggleFile(file.name, selectedScoring, setSelectedScoring),
                    'scoring'
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        );

      case 4:
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-400" />
                Policy Files
                <Badge variant="secondary" className="text-[10px]">Optional</Badge>
              </Label>
              <span className="text-xs text-muted-foreground">
                {selectedPolicies.length} of {policyFiles.length} selected
              </span>
            </div>
            
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {policyFiles.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No policy files found</p>
                  </div>
                ) : (
                  policyFiles.map(file => renderFileCard(
                    file,
                    selectedPolicies.includes(file.name),
                    () => toggleFile(file.name, selectedPolicies, setSelectedPolicies),
                    'policy'
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="text-center pb-4">
              <Check className="w-12 h-12 mx-auto text-green-400 mb-2" />
              <h3 className="text-lg font-bold">Ready to Create</h3>
              <p className="text-sm text-muted-foreground">Review your strategy configuration</p>
            </div>

            <Card className="bg-muted/30">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Name</span>
                  <span className="text-sm">{strategyName}</span>
                </div>
                
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3 text-purple-400" />
                    Scheduler
                  </span>
                  <span className="text-sm font-mono">{selectedScheduler}</span>
                </div>

                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium flex items-center gap-1">
                    <Code className="w-3 h-3 text-blue-400" />
                    Algorithms
                  </span>
                  <div className="text-right">
                    {selectedAlgorithms.length === 0 ? (
                      <span className="text-sm text-muted-foreground">None</span>
                    ) : (
                      selectedAlgorithms.map(f => (
                        <div key={f} className="text-sm font-mono">{f}</div>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium flex items-center gap-1">
                    <Calculator className="w-3 h-3 text-yellow-400" />
                    Scoring
                  </span>
                  <div className="text-right">
                    {selectedScoring.length === 0 ? (
                      <span className="text-sm text-muted-foreground">None</span>
                    ) : (
                      selectedScoring.map(f => (
                        <div key={f} className="text-sm font-mono">{f}</div>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium flex items-center gap-1">
                    <Shield className="w-3 h-3 text-green-400" />
                    Policies
                  </span>
                  <div className="text-right">
                    {selectedPolicies.length === 0 ? (
                      <span className="text-sm text-muted-foreground">None</span>
                    ) : (
                      selectedPolicies.map(f => (
                        <div key={f} className="text-sm font-mono">{f}</div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex gap-4 h-full min-h-[400px]">
      {/* Main Wizard */}
      <div className="flex-1 flex flex-col">
        {/* Progress Steps */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((step, i) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                    i < currentStep
                      ? 'bg-primary text-primary-foreground'
                      : i === currentStep
                      ? 'bg-primary/20 text-primary border-2 border-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {i < currentStep ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-8 h-0.5 mx-1 ${i < currentStep ? 'bg-primary' : 'bg-muted'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{STEPS[currentStep].title}</span>
            <span className="text-xs text-muted-foreground">Step {currentStep + 1} of {STEPS.length}</span>
          </div>
          <Progress value={((currentStep + 1) / STEPS.length) * 100} className="mt-2 h-1" />
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-auto">
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
            
            {currentStep < STEPS.length - 1 ? (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleCreate} className="bg-gradient-to-r from-green-500 to-emerald-500">
                <Sparkles className="w-4 h-4 mr-1" />
                Create Strategy
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* File Preview Panel */}
      {previewFile && (
        <Card className="w-80 bg-muted/30 border-border/50">
          <CardHeader className="py-2 px-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">{previewFile.name}</CardTitle>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setPreviewFile(null)}>
                ×
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-72">
              <Highlight theme={themes.nightOwl} code={previewFile.content} language="python">
                {({ tokens, getLineProps, getTokenProps }) => (
                  <pre className="text-xs p-3">
                    {tokens.map((line, i) => (
                      <div key={i} {...getLineProps({ line })} className="flex">
                        <span className="w-6 text-muted-foreground text-right mr-2 select-none">{i + 1}</span>
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
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
