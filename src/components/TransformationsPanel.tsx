import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { LogicGates, ShiftOperations, BitManipulation, BitPacking, AdvancedBitOperations, ArithmeticOperations } from '@/lib/binaryOperations';
import { predefinedManager, PredefinedOperation } from '@/lib/predefinedManager';
import { BitRange } from '@/lib/fileState';
import { toast } from 'sonner';

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
  const [, forceUpdate] = useState({});

  useEffect(() => {
    setOperations(predefinedManager.getAllOperations());
    const unsubscribe = predefinedManager.subscribe(() => {
      setOperations(predefinedManager.getAllOperations());
      forceUpdate({});
    });
    return unsubscribe;
  }, []);

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

  const executeOperation = (opId: string) => {
    const amount = parseInt(shiftAmount) || 1;
    const range = getEffectiveRange();
    
    // Validate range
    if (range.start < 0 || range.end > bits.length || range.start >= range.end) {
      toast.error('Invalid range specified');
      return;
    }
    
    // Get the operation from predefinedManager to check if it's code-based
    const opDef = predefinedManager.getOperation(opId);
    if (!opDef) {
      toast.error(`Operation ${opId} not found`);
      return;
    }
    
    // Build params based on operation requirements
    let params: Record<string, any> = {};
    
    // Operations that need an operand/mask
    if (['AND', 'OR', 'XOR', 'NAND', 'NOR', 'XNOR'].includes(opId)) {
      if (!operandInput) {
        toast.error('Enter operand (binary pattern) for this operation');
        return;
      }
      params.mask = operandInput;
    }
    
    // Operations that need a count
    if (['SHL', 'SHR', 'ROL', 'ROR', 'ASHL', 'ASHR'].includes(opId)) {
      params.count = amount;
    }
    
    // Apply transformation with range handling
    const before = bits.substring(0, range.start);
    const selected = bits.substring(range.start, range.end);
    const after = bits.substring(range.end);
    
    // If code-based, execute the code
    if (opDef.isCodeBased && opDef.code) {
      try {
        const fn = new Function('bits', 'params', opDef.code + '\nreturn execute(bits, params);');
        const result = fn(selected, params);
        if (typeof result !== 'string') {
          toast.error(`Operation must return a string, got ${typeof result}`);
          return;
        }
        const finalBits = before + result + after;
        onTransform(finalBits, `Applied ${opDef.name} on range [${range.start}:${range.end}]`);
        return;
      } catch (error) {
        toast.error(`Code error: ${(error as Error).message}`);
        return;
      }
    }
    
    // Built-in operations
    switch (opId) {
      case 'NOT':
        applyTransformation(LogicGates.NOT, 'Applied NOT gate');
        break;
      case 'AND':
        applyTransformation(input => LogicGates.AND(input, operandInput), 'Applied AND gate');
        break;
      case 'OR':
        applyTransformation(input => LogicGates.OR(input, operandInput), 'Applied OR gate');
        break;
      case 'XOR':
        applyTransformation(input => LogicGates.XOR(input, operandInput), 'Applied XOR gate');
        break;
      case 'NAND':
        applyTransformation(input => LogicGates.NAND(input, operandInput), 'Applied NAND gate');
        break;
      case 'NOR':
        applyTransformation(input => LogicGates.NOR(input, operandInput), 'Applied NOR gate');
        break;
      case 'XNOR':
        applyTransformation(input => LogicGates.XNOR(input, operandInput), 'Applied XNOR gate');
        break;
      case 'SHL':
        applyTransformation(input => ShiftOperations.logicalShiftLeft(input, amount), `Shift left ${amount}`);
        break;
      case 'SHR':
        applyTransformation(input => ShiftOperations.logicalShiftRight(input, amount), `Shift right ${amount}`);
        break;
      case 'ROL':
        applyTransformation(input => ShiftOperations.rotateLeft(input, amount), `Rotate left ${amount}`);
        break;
      case 'ROR':
        applyTransformation(input => ShiftOperations.rotateRight(input, amount), `Rotate right ${amount}`);
        break;
      case 'GRAY':
        applyTransformation(AdvancedBitOperations.binaryToGray, 'Converted to Gray code');
        break;
      case 'REVERSE':
        applyTransformation(AdvancedBitOperations.reverseBits, 'Reversed bits');
        break;
      case 'SWAP':
      case 'ENDIAN':
        applyTransformation(AdvancedBitOperations.swapEndianness, 'Swapped endianness');
        break;
      default:
        // Try to use operationsRouter for any unknown operation
        try {
          const { executeOperationOnRange } = require('@/lib/operationsRouter');
          const result = executeOperationOnRange(opId, bits, range.start, range.end, params);
          if (result.success) {
            onTransform(result.bits, `Applied ${opDef.name} on range [${range.start}:${range.end}]`);
          } else {
            toast.error(result.error || `Operation ${opId} failed`);
          }
        } catch (e) {
          toast.info(`Operation ${opId} not yet implemented`);
        }
    }
  };

  const handleExecuteCommand = () => {
    if (!commandInput.trim()) return;
    setCommandResult('');
    
    const parts = commandInput.trim().toUpperCase().split(/\s+/);
    const command = parts[0];
    
    try {
      switch (command) {
        case 'NOT':
          applyTransformation(LogicGates.NOT, 'Applied NOT gate');
          break;
        case 'AND':
        case 'OR':
        case 'XOR':
        case 'NAND':
        case 'NOR':
        case 'XNOR':
          if (!parts[1]) throw new Error('Operand required');
          applyTransformation(input => LogicGates[command as keyof typeof LogicGates](input, parts[1]), `Applied ${command} gate`);
          break;
        case 'SHL':
        case 'SHR':
          const shiftAmt = parseInt(parts[1] || '1');
          applyTransformation(
            input => command === 'SHL' 
              ? ShiftOperations.logicalShiftLeft(input, shiftAmt)
              : ShiftOperations.logicalShiftRight(input, shiftAmt),
            `${command} by ${shiftAmt}`
          );
          break;
        case 'ROL':
        case 'ROR':
          const rotAmt = parseInt(parts[1] || '1');
          applyTransformation(
            input => command === 'ROL'
              ? ShiftOperations.rotateLeft(input, rotAmt)
              : ShiftOperations.rotateRight(input, rotAmt),
            `${command} by ${rotAmt}`
          );
          break;
        case 'REVERSE':
          applyTransformation(AdvancedBitOperations.reverseBits, 'Reversed bits');
          break;
        case 'GRAY':
          applyTransformation(AdvancedBitOperations.binaryToGray, 'To Gray code');
          break;
        default:
          throw new Error(`Unknown command: ${command}`);
      }
      setCommandInput('');
    } catch (error: any) {
      setCommandResult(`Error: ${error.message}`);
    }
  };

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
          {/* Command Interface */}
          <Card className="bg-gradient-to-r from-card to-muted/20 overflow-hidden">
            <CardHeader className="py-3 bg-muted/30">
              <CardTitle className="text-sm flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary" />
                Command Interface
              </CardTitle>
            </CardHeader>
            <CardContent className="py-4 space-y-3">
              <Textarea
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                placeholder="e.g., AND 1010, SHL 3, NOT, REVERSE"
                className="font-mono text-sm min-h-[60px] bg-background"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleExecuteCommand();
                  }
                }}
              />
              <Button onClick={handleExecuteCommand} className="w-full bg-primary hover:bg-primary/90">
                Execute Command
              </Button>
              {commandResult && (
                <div className="p-2 bg-destructive/10 border border-destructive/30 rounded text-xs font-mono text-destructive">
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
                  {ops.map(op => (
                    <Button
                      key={op.id}
                      variant="outline"
                      size="sm"
                      onClick={() => executeOperation(op.id)}
                      className="h-auto py-2 flex flex-col items-start text-left hover:bg-primary/10 hover:border-primary/50"
                    >
                      <span className="font-medium text-xs">{op.id}</span>
                      <span className="text-[10px] text-muted-foreground truncate w-full">
                        {op.name}
                      </span>
                    </Button>
                  ))}
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
                  onClick={() => executeOperation('NOT')}
                  className="h-12 flex-col"
                >
                  <span className="text-lg font-bold">¬</span>
                  <span className="text-[10px]">NOT</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => executeOperation('REVERSE')}
                  className="h-12 flex-col"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="text-[10px]">Reverse</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => executeOperation('GRAY')}
                  className="h-12 flex-col"
                >
                  <Zap className="w-4 h-4" />
                  <span className="text-[10px]">Gray</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => executeOperation('SWAP')}
                  className="h-12 flex-col"
                >
                  <Move className="w-4 h-4" />
                  <span className="text-[10px]">Endian</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Info */}
          <Card className="bg-muted/20 border-muted">
            <CardContent className="py-3">
              <p className="text-xs text-muted-foreground">
                <strong>💡 Tip:</strong> Select bit ranges using the Selection dialog above to apply transformations to specific parts of your data.
                Operations are pulled from the Backend Pre-defined operations list.
              </p>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
};
