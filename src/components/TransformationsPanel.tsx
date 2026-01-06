import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Terminal,
  Binary,
  Zap,
  RotateCcw,
  Move,
  Calculator,
  GitBranch,
  CircleDot,
  ChevronRight,
  HelpCircle,
  Repeat,
  GitMerge,
  Code,
} from 'lucide-react';
import { LogicGates, ShiftOperations, BitManipulation, BitPacking, AdvancedBitOperations, ArithmeticOperations } from '@/lib/binaryOperations';
import { predefinedManager, PredefinedOperation } from '@/lib/predefinedManager';
import { executeOperation, getAvailableOperations, getOperationCost } from '@/lib/operationsRouter';
import { parseCommand, executeCommand, getAutocompleteSuggestions, getStoredMacros } from '@/lib/commandParser';
import { BitRange } from '@/lib/fileState';
import { toast } from 'sonner';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface TransformationsPanelProps {
  bits: string;
  selectedRanges: BitRange[];
  onTransform: (newBits: string, description: string) => void;
}

export const TransformationsPanel = ({ bits, selectedRanges, onTransform }: TransformationsPanelProps) => {
  const [operandInput, setOperandInput] = useState('');
  const [shiftAmount, setShiftAmount] = useState('1');
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [commandInput, setCommandInput] = useState('');
  const [commandResult, setCommandResult] = useState('');
  const [operations, setOperations] = useState<PredefinedOperation[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [, forceUpdate] = useState({});
  const commandInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setOperations(predefinedManager.getAllOperations());
    const unsubscribe = predefinedManager.subscribe(() => {
      setOperations(predefinedManager.getAllOperations());
      forceUpdate({});
    });
    return unsubscribe;
  }, []);

  const availableOperations = useMemo(() => getAvailableOperations(), []);

  const hasData = bits && bits.length > 0;
  const hasSelection = selectedRanges.length > 0;
  
  // Get effective range - use manual input, selection, or full range
  const getEffectiveRange = () => {
    const start = rangeStart ? parseInt(rangeStart) : (hasSelection ? selectedRanges[0].start : 0);
    const end = rangeEnd ? parseInt(rangeEnd) : (hasSelection ? selectedRanges[0].end + 1 : bits.length);
    return { start: Math.max(0, start), end: Math.min(bits.length, end) };
  };

  const applyTransformation = (transformFn: (input: string) => string, description: string) => {
    const range = getEffectiveRange();
    
    // If we have a specific range, only transform that range
    if (range.start > 0 || range.end < bits.length) {
      const before = bits.substring(0, range.start);
      const selected = bits.substring(range.start, range.end);
      const after = bits.substring(range.end);
      const transformed = transformFn(selected);
      const result = before + transformed + after;
      onTransform(result, `${description} (range ${range.start}-${range.end})`);
      return;
    }

    // Transform entire data
    const result = transformFn(bits);
    onTransform(result, description);
  };

  const executeOperationById = (opId: string, customParams?: Record<string, any>) => {
    const range = getEffectiveRange();
    
    // Validate range
    if (range.start < 0 || range.end > bits.length || range.start >= range.end) {
      toast.error('Invalid range specified');
      return;
    }
    
    // Get the operation from predefinedManager to check if it's code-based
    const opDef = predefinedManager.getOperation(opId);
    if (!opDef && !availableOperations.includes(opId)) {
      toast.error(`Operation ${opId} not found`);
      return;
    }
    
    // Build params based on operation requirements
    let params: Record<string, any> = customParams || {};
    
    // Operations that need an operand/mask
    if (['AND', 'OR', 'XOR', 'NAND', 'NOR', 'XNOR', 'IMPLY', 'NIMPLY', 'CONVERSE'].includes(opId)) {
      if (!params.mask && !operandInput) {
        toast.error('Enter operand (binary pattern) for this operation');
        return;
      }
      params.mask = params.mask || operandInput;
    }
    
    // Operations that need a count
    if (['SHL', 'SHR', 'ROL', 'ROR', 'ASHL', 'ASHR', 'ASL', 'ASR'].includes(opId)) {
      params.count = params.count || parseInt(shiftAmount) || 1;
    }
    
    // Apply transformation with range handling
    const before = bits.substring(0, range.start);
    const selected = bits.substring(range.start, range.end);
    const after = bits.substring(range.end);
    
    // Use the unified executeOperation from operationsRouter
    const result = executeOperation(opId, selected, params);
    
    if (result.success) {
      const finalBits = before + result.bits + after;
      const cost = getOperationCost(opId);
      onTransform(finalBits, `Applied ${opDef?.name || opId} on range [${range.start}:${range.end}] (cost: ${cost})`);
    } else {
      toast.error(result.error || `Operation ${opId} failed`);
    }
  };

  const handleExecuteCommand = () => {
    if (!commandInput.trim()) return;
    setCommandResult('');
    
    // Add to history
    setCommandHistory(prev => [commandInput, ...prev.slice(0, 49)]);
    setHistoryIndex(-1);
    
    try {
      // Use the advanced command parser
      const parsed = parseCommand(commandInput);
      const result = executeCommand(parsed, bits);
      
      if (result.success) {
        if (result.bits !== bits) {
          onTransform(result.bits, `Command: ${commandInput} (${result.operationsExecuted} ops)`);
        }
        if (result.message) {
          setCommandResult(result.message);
        } else {
          setCommandResult(`✓ Success: ${result.operationsExecuted} operation(s) executed`);
        }
        setCommandInput('');
      } else {
        setCommandResult(`Error: ${result.error}`);
      }
    } catch (error: any) {
      setCommandResult(`Error: ${error.message}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleExecuteCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCommandInput(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommandInput(commandHistory[newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommandInput('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Use advanced autocomplete
      const suggestions = getAutocompleteSuggestions(commandInput);
      if (suggestions.length === 1) {
        setCommandInput(suggestions[0] + ' ');
      } else if (suggestions.length > 1) {
        setCommandResult(`Suggestions: ${suggestions.slice(0, 10).join(', ')}${suggestions.length > 10 ? '...' : ''}`);
      }
    }
  };

  // Get stored macros for display
  const storedMacros = useMemo(() => getStoredMacros(), [commandInput]);

  const popCount = hasData ? AdvancedBitOperations.populationCount(bits) : 0;
  const transitionCount = hasData ? AdvancedBitOperations.countTransitions(bits) : 0;

  const operationsByCategory = operations.reduce((acc, op) => {
    const cat = op.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(op);
    return acc;
  }, {} as Record<string, PredefinedOperation[]>);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Logic Gates': return <Binary className="w-4 h-4" />;
      case 'Shifts': return <ChevronRight className="w-4 h-4" />;
      case 'Rotations': return <RotateCcw className="w-4 h-4" />;
      case 'Manipulation': return <Move className="w-4 h-4" />;
      case 'Advanced': return <Zap className="w-4 h-4" />;
      default: return <GitBranch className="w-4 h-4" />;
    }
  };

  if (!hasData) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <Card className="bg-muted/20 border-dashed max-w-md">
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Binary className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-1">No Binary Data</p>
              <p className="text-sm">Generate or load a file to apply transformations</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Stats Header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Transformations</h3>
            {hasSelection && (
              <Badge variant="secondary" className="text-xs">
                {selectedRanges.reduce((sum, r) => sum + (r.end - r.start + 1), 0)} bits selected
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {availableOperations.length} operations available
            </Badge>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">
              <CircleDot className="w-3 h-3 mr-1" />
              {popCount} ones
            </Badge>
            <Badge variant="outline" className="text-xs">
              <GitBranch className="w-3 h-3 mr-1" />
              {transitionCount} trans
            </Badge>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Enhanced Command Interface */}
          <Card className="bg-gradient-to-r from-card to-muted/20 overflow-hidden">
            <CardHeader className="py-3 bg-muted/30">
              <CardTitle className="text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-primary" />
                  Command Interface
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <HelpCircle className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Command Help</h4>
                      <p className="text-xs text-muted-foreground">
                        Type any operation followed by parameters. Use Tab for autocomplete, ↑↓ for history.
                      </p>
                      <div className="text-xs space-y-1">
                        <p><code className="bg-muted px-1 rounded">NOT</code> - Invert bits</p>
                        <p><code className="bg-muted px-1 rounded">AND 1010</code> - AND with mask</p>
                        <p><code className="bg-muted px-1 rounded">XOR 11110000</code> - XOR with mask</p>
                        <p><code className="bg-muted px-1 rounded">SHL 4</code> - Shift left 4 bits</p>
                        <p><code className="bg-muted px-1 rounded">ROL 2</code> - Rotate left 2 bits</p>
                        <p><code className="bg-muted px-1 rounded">REVERSE</code> - Reverse bit order</p>
                        <p><code className="bg-muted px-1 rounded">GRAY</code> - Gray code encode</p>
                        <p><code className="bg-muted px-1 rounded">BSWAP</code> - Swap bytes</p>
                        <p><code className="bg-muted px-1 rounded">INC</code> - Increment</p>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </CardTitle>
            </CardHeader>
            <CardContent className="py-4 space-y-3">
              <Textarea
                ref={commandInputRef}
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                placeholder={`Enter command (${availableOperations.length} available). Tab to autocomplete, ↑↓ for history`}
                className="font-mono text-sm min-h-[60px] bg-background"
                onKeyDown={handleKeyDown}
              />
              <div className="flex gap-2">
                <Button onClick={handleExecuteCommand} className="flex-1 bg-primary hover:bg-primary/90">
                  Execute Command
                </Button>
                <Popover open={showAutocomplete} onOpenChange={setShowAutocomplete}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" onClick={() => setShowAutocomplete(true)}>
                      Browse
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0" align="end">
                    <Command>
                      <CommandInput placeholder="Search operations..." />
                      <CommandList>
                        <CommandEmpty>No operation found.</CommandEmpty>
                        <CommandGroup heading="Available Operations">
                          {availableOperations.slice(0, 20).map(op => (
                            <CommandItem
                              key={op}
                              onSelect={() => {
                                setCommandInput(op + ' ');
                                setShowAutocomplete(false);
                                commandInputRef.current?.focus();
                              }}
                            >
                              <span className="font-mono">{op}</span>
                            </CommandItem>
                          ))}
                          {availableOperations.length > 20 && (
                            <CommandItem disabled>
                              +{availableOperations.length - 20} more...
                            </CommandItem>
                          )}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              {commandResult && (
                <div className={`p-2 border rounded text-xs font-mono whitespace-pre-wrap ${
                  commandResult.startsWith('Error') 
                    ? 'bg-destructive/10 border-destructive/30 text-destructive'
                    : 'bg-muted/50 border-border'
                }`}>
                  {commandResult}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Parameters */}
          <Card>
            <CardHeader className="py-3 bg-muted/30">
              <CardTitle className="text-sm">Operation Parameters</CardTitle>
            </CardHeader>
            <CardContent className="py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Operand (binary)</Label>
                  <Input
                    value={operandInput}
                    onChange={(e) => setOperandInput(e.target.value)}
                    placeholder="e.g., 10101010"
                    className="font-mono bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Shift/Rotate Amount</Label>
                  <Input
                    type="number"
                    value={shiftAmount}
                    onChange={(e) => setShiftAmount(e.target.value)}
                    min={1}
                    className="bg-background"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-xs">Range Start (optional)</Label>
                  <Input
                    type="number"
                    value={rangeStart}
                    onChange={(e) => setRangeStart(e.target.value)}
                    placeholder={hasSelection ? String(selectedRanges[0].start) : "0"}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Range End (optional)</Label>
                  <Input
                    type="number"
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(e.target.value)}
                    placeholder={hasSelection ? String(selectedRanges[0].end + 1) : String(bits.length)}
                    className="bg-background"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                💡 Leave range empty to use selection or full file. Operations will only affect the specified range.
              </p>
            </CardContent>
          </Card>

          {/* Operations Grid by Category */}
          <Tabs defaultValue="Logic Gates" className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto">
              {Object.keys(operationsByCategory).slice(0, 5).map(cat => (
                <TabsTrigger key={cat} value={cat} className="gap-1 text-xs">
                  {getCategoryIcon(cat)}
                  {cat}
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.entries(operationsByCategory).map(([category, ops]) => (
              <TabsContent key={category} value={category} className="mt-4">
                <div className="grid grid-cols-3 gap-2">
                  {ops.map(op => {
                    const isImplemented = availableOperations.includes(op.id);
                    return (
                      <Button
                        key={op.id}
                        variant="outline"
                        size="sm"
                        onClick={() => executeOperationById(op.id)}
                        disabled={!isImplemented}
                        className={`h-auto py-2 flex flex-col items-start text-left ${
                          isImplemented 
                            ? 'hover:bg-primary/10 hover:border-primary/50' 
                            : 'opacity-50'
                        }`}
                      >
                        <div className="flex items-center gap-1 w-full">
                          <span className="font-medium text-xs">{op.id}</span>
                          {!isImplemented && (
                            <Badge variant="outline" className="text-[9px] ml-auto">pending</Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground truncate w-full">
                          {op.name}
                        </span>
                      </Button>
                    );
                  })}
                </div>
                {ops.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No operations in this category
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="py-3 bg-muted/30">
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="py-4">
              <div className="grid grid-cols-4 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => executeOperationById('NOT')}
                  className="flex-col h-auto py-2"
                >
                  <Binary className="w-4 h-4 mb-1" />
                  <span className="text-xs">NOT</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => executeOperationById('REVERSE')}
                  className="flex-col h-auto py-2"
                >
                  <RotateCcw className="w-4 h-4 mb-1" />
                  <span className="text-xs">Reverse</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => executeOperationById('BSWAP')}
                  className="flex-col h-auto py-2"
                >
                  <Move className="w-4 h-4 mb-1" />
                  <span className="text-xs">Byte Swap</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => executeOperationById('GRAY')}
                  className="flex-col h-auto py-2"
                >
                  <GitBranch className="w-4 h-4 mb-1" />
                  <span className="text-xs">Gray</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
};
