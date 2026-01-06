import { useState, useEffect, useMemo } from 'react';
import { BinaryMetrics } from '@/lib/binaryMetrics';
import { FileState, SavedSequence } from '@/lib/fileState';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Search, X, Grid, List, Eye, EyeOff, Sparkles, TrendingUp, Code, Play, Palette, Terminal, HelpCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';

interface SequencesPanelProps {
  fileState: FileState;
  onJumpTo: (index: number) => void;
}

// Python command parser for sequence filtering
interface CommandResult {
  type: 'filter' | 'highlight' | 'color' | 'find' | 'stats' | 'error';
  message: string;
  sequences?: SavedSequence[];
}

const parseAndExecuteCommand = (
  command: string, 
  sequences: SavedSequence[], 
  bits: string
): CommandResult => {
  const cmd = command.trim().toLowerCase();
  
  // Help command
  if (cmd === 'help' || cmd === '?') {
    return {
      type: 'stats',
      message: `Available commands:
• filter(count > 5) - Filter sequences by count
• filter(length >= 4) - Filter by sequence length  
• filter(zeros > 3) - Filter by number of zeros in sequence
• filter(gap > 5) - Find sequences with gaps > 5 between occurrences
• highlight(all) - Highlight all sequences
• highlight(none) - Unhighlight all
• find("0000") - Find new pattern in data
• stats() - Show statistics
• color(#, "#FF0000") - Set color of sequence #`
    };
  }
  
  // Filter commands
  const filterMatch = cmd.match(/filter\s*\(\s*(\w+)\s*(>|<|>=|<=|==|!=)\s*(\d+)\s*\)/);
  if (filterMatch) {
    const [, field, operator, valueStr] = filterMatch;
    const value = parseInt(valueStr);
    
    const filtered = sequences.filter(seq => {
      let fieldValue: number;
      
      switch (field) {
        case 'count':
          fieldValue = seq.count;
          break;
        case 'length':
          fieldValue = seq.sequence.length;
          break;
        case 'zeros':
          fieldValue = (seq.sequence.match(/0/g) || []).length;
          break;
        case 'ones':
          fieldValue = (seq.sequence.match(/1/g) || []).length;
          break;
        case 'gap':
        case 'meandistance':
          fieldValue = seq.meanDistance;
          break;
        case 'variance':
          fieldValue = seq.varianceDistance;
          break;
        default:
          return true;
      }
      
      switch (operator) {
        case '>': return fieldValue > value;
        case '<': return fieldValue < value;
        case '>=': return fieldValue >= value;
        case '<=': return fieldValue <= value;
        case '==': return fieldValue === value;
        case '!=': return fieldValue !== value;
        default: return true;
      }
    });
    
    return {
      type: 'filter',
      message: `Found ${filtered.length} sequences matching ${field} ${operator} ${value}`,
      sequences: filtered
    };
  }
  
  // Find command
  const findMatch = cmd.match(/find\s*\(\s*["']?([01]+)["']?\s*\)/);
  if (findMatch) {
    const pattern = findMatch[1];
    const matches = BinaryMetrics.searchMultipleSequences(bits, [pattern]);
    
    if (matches.length > 0) {
      return {
        type: 'find',
        message: `Found "${pattern}" ${matches[0].count} times at positions: ${matches[0].positions.slice(0, 5).join(', ')}${matches[0].positions.length > 5 ? '...' : ''}`,
        sequences: []
      };
    }
    return {
      type: 'find',
      message: `Pattern "${pattern}" not found in data`
    };
  }
  
  // Highlight command
  const highlightMatch = cmd.match(/highlight\s*\(\s*(\w+)\s*\)/);
  if (highlightMatch) {
    const target = highlightMatch[1];
    if (target === 'all') {
      return {
        type: 'highlight',
        message: `Highlighting all ${sequences.length} sequences`,
        sequences: sequences.map(s => ({ ...s, highlighted: true }))
      };
    } else if (target === 'none') {
      return {
        type: 'highlight',
        message: 'Unhighlighted all sequences',
        sequences: sequences.map(s => ({ ...s, highlighted: false }))
      };
    }
  }
  
  // Stats command
  if (cmd.startsWith('stats')) {
    const totalOccurrences = sequences.reduce((sum, s) => sum + s.count, 0);
    const avgLength = sequences.reduce((sum, s) => sum + s.sequence.length, 0) / (sequences.length || 1);
    const avgGap = sequences.reduce((sum, s) => sum + s.meanDistance, 0) / (sequences.length || 1);
    
    return {
      type: 'stats',
      message: `📊 Sequence Statistics:
• Total sequences: ${sequences.length}
• Total occurrences: ${totalOccurrences}
• Average length: ${avgLength.toFixed(1)} bits
• Average gap: ${avgGap.toFixed(1)} bits
• Coverage: ${((totalOccurrences / bits.length) * 100).toFixed(2)}%`
    };
  }
  
  // Color command
  const colorMatch = cmd.match(/color\s*\(\s*(\d+)\s*,\s*["']?(#[0-9a-fA-F]{6})["']?\s*\)/);
  if (colorMatch) {
    const seqNum = parseInt(colorMatch[1]);
    const color = colorMatch[2];
    
    const targetSeq = sequences.find(s => s.serialNumber === seqNum);
    if (targetSeq) {
      return {
        type: 'color',
        message: `Set color of sequence #${seqNum} to ${color}`,
        sequences: sequences.map(s => 
          s.serialNumber === seqNum ? { ...s, color } : s
        )
      };
    }
    return {
      type: 'error',
      message: `Sequence #${seqNum} not found`
    };
  }
  
  return {
    type: 'error',
    message: `Unknown command: "${cmd}". Type "help" for available commands.`
  };
};

export const SequencesPanel = ({ fileState, onJumpTo }: SequencesPanelProps) => {
  const [searchInput, setSearchInput] = useState('');
  const [colorInput, setColorInput] = useState('#00FFFF');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [sortFilter, setSortFilter] = useState<string>('serial');
  const [savedSequences, setSavedSequences] = useState<SavedSequence[]>([]);
  const [activeTab, setActiveTab] = useState<'search' | 'templates' | 'python'>('search');
  
  // Python command mode
  const [commandInput, setCommandInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [commandOutput, setCommandOutput] = useState<string[]>([]);
  const [filteredSequences, setFilteredSequences] = useState<SavedSequence[] | null>(null);
  
  // Color picker state
  const [editingColorId, setEditingColorId] = useState<string | null>(null);

  const bits = fileState.model.getBits();

  useEffect(() => {
    setSavedSequences(Array.isArray(fileState.savedSequences) ? fileState.savedSequences : []);
  }, [fileState.savedSequences]);

  useEffect(() => {
    const unsubscribe = fileState.subscribe(() => {
      setSavedSequences(Array.isArray(fileState.savedSequences) ? [...fileState.savedSequences] : []);
    });
    return unsubscribe;
  }, [fileState]);

  const handleSearch = () => {
    const sequences = searchInput
      .split(/[,\s]+/)
      .map(s => s.trim())
      .filter(s => /^[01]+$/.test(s));

    if (sequences.length === 0) {
      toast.error('Please enter valid binary sequences');
      return;
    }

    const matches = BinaryMetrics.searchMultipleSequences(bits, sequences);
    
    let addedCount = 0;
    matches.forEach(match => {
      if (!fileState.savedSequences.find(s => s.sequence === match.sequence)) {
        fileState.addSequence(match, colorInput);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      toast.success(`Added ${addedCount} sequence${addedCount > 1 ? 's' : ''}`);
    } else {
      toast.info('All sequences already added');
    }

    setSearchInput('');
  };

  const handleRunCommand = () => {
    if (!commandInput.trim()) return;
    
    const result = parseAndExecuteCommand(commandInput, savedSequences, bits);
    
    setCommandHistory(prev => [...prev, `>>> ${commandInput}`]);
    setCommandOutput(prev => [...prev, result.message]);
    
    if (result.type === 'filter' && result.sequences) {
      setFilteredSequences(result.sequences);
    } else if (result.type === 'highlight' && result.sequences) {
      result.sequences.forEach(seq => {
        fileState.toggleSequenceHighlight(seq.id);
      });
      setFilteredSequences(null);
    } else if (result.type === 'color' && result.sequences) {
      result.sequences.forEach(seq => {
        const original = savedSequences.find(s => s.id === seq.id);
        if (original && original.color !== seq.color) {
          fileState.updateSequenceColor(seq.id, seq.color);
        }
      });
    }
    
    setCommandInput('');
  };

  const handleFindAll = () => {
    if (savedSequences.length === 0) {
      toast.info('No sequences to find');
      return;
    }

    const allSequences = savedSequences.map(s => s.sequence);
    const matches = BinaryMetrics.searchMultipleSequences(bits, allSequences);
    
    matches.forEach(match => {
      const existing = fileState.savedSequences.find(s => s.sequence === match.sequence);
      if (existing) {
        fileState.removeSequence(existing.id);
        fileState.addSequence(match, existing.color);
      }
    });

    toast.success('Updated all sequence positions');
  };

  const handleExportSequences = () => {
    if (savedSequences.length === 0) {
      toast.info('No sequences to export');
      return;
    }

    const exportData = savedSequences.map(seq => ({
      sequence: seq.sequence,
      color: seq.color,
      count: seq.count,
      positions: seq.positions,
      meanDistance: seq.meanDistance,
      varianceDistance: seq.varianceDistance
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sequences_export_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Sequences exported');
  };

  const handleToggleHighlight = (id: string) => {
    fileState.toggleSequenceHighlight(id);
  };

  const handleRemoveSequence = (id: string) => {
    fileState.removeSequence(id);
    toast.success('Sequence removed');
  };

  const handleClearAll = () => {
    fileState.clearAllSequences();
    toast.success('All sequences cleared');
  };

  const handleColorChange = (id: string, newColor: string) => {
    fileState.updateSequenceColor(id, newColor);
    setEditingColorId(null);
  };

  const displaySequences = filteredSequences || savedSequences;
  
  const sortedSequences = useMemo(() => {
    return [...displaySequences].sort((a, b) => {
      switch (sortFilter) {
        case 'serial': return a.serialNumber - b.serialNumber;
        case 'count': return b.count - a.count;
        case 'length': return b.sequence.length - a.sequence.length;
        case 'position': return (a.positions[0] || 0) - (b.positions[0] || 0);
        default: return 0;
      }
    });
  }, [displaySequences, sortFilter]);

  const totalOccurrences = savedSequences.reduce((sum, s) => sum + s.count, 0);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Header Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-gradient-to-br from-primary/20 to-transparent border-primary/30">
            <CardContent className="py-3">
              <div className="text-xs text-muted-foreground">Sequences</div>
              <div className="text-2xl font-bold text-primary">{savedSequences.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-cyan-500/20 to-transparent border-cyan-500/30">
            <CardContent className="py-3">
              <div className="text-xs text-muted-foreground">Total Occurrences</div>
              <div className="text-2xl font-bold text-cyan-400">{totalOccurrences}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/20 to-transparent border-green-500/30">
            <CardContent className="py-3">
              <div className="text-xs text-muted-foreground">Coverage</div>
              <div className="text-2xl font-bold text-green-400">
                {bits.length > 0 ? ((totalOccurrences / bits.length) * 100).toFixed(1) : 0}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Search/Command Interface */}
        <Card className="bg-gradient-to-r from-card to-muted/20 border-border overflow-hidden">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <CardHeader className="py-2 bg-muted/30">
              <TabsList className="grid grid-cols-3 w-full max-w-[400px]">
                <TabsTrigger value="search" className="text-xs">
                  <Search className="w-3 h-3 mr-1" />
                  Search
                </TabsTrigger>
                <TabsTrigger value="templates" className="text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Templates
                </TabsTrigger>
                <TabsTrigger value="python" className="text-xs">
                  <Terminal className="w-3 h-3 mr-1" />
                  Commands
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            
            <TabsContent value="search" className="mt-0">
              <CardContent className="py-4 space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter binary sequences (e.g., 1010, 0011)"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="font-mono flex-1 bg-background"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={colorInput}
                      onChange={(e) => setColorInput(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border border-border bg-transparent"
                      title="Choose highlight color"
                    />
                    <Button onClick={handleSearch} className="bg-primary hover:bg-primary/90">
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {savedSequences.length > 0 && (
                  <div className="flex gap-2">
                    <Button onClick={handleFindAll} variant="outline" size="sm" className="flex-1">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Refresh All
                    </Button>
                    <Button onClick={handleExportSequences} variant="outline" size="sm" className="flex-1">
                      Export
                    </Button>
                    <Button onClick={handleClearAll} variant="outline" size="sm" className="flex-1 text-destructive hover:text-destructive">
                      Clear
                    </Button>
                  </div>
                )}
              </CardContent>
            </TabsContent>
            
            <TabsContent value="templates" className="mt-0">
              <CardContent className="py-4 space-y-3">
                <p className="text-xs text-muted-foreground mb-2">
                  Quick templates for common binary patterns. Click to add.
                </p>
                
                {/* Common Header Patterns */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-primary">File Headers & Markers</div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { name: 'Sync Byte', pattern: '01111110', desc: 'HDLC sync' },
                      { name: 'Start of Frame', pattern: '10101010', desc: 'Preamble' },
                      { name: 'Null Byte', pattern: '00000000', desc: 'Padding' },
                      { name: 'All Ones', pattern: '11111111', desc: 'Fill pattern' },
                      { name: 'Alternating', pattern: '01010101', desc: 'Clock recovery' },
                    ].map(template => (
                      <Button
                        key={template.pattern}
                        size="sm"
                        variant="outline"
                        className="h-auto py-1 px-2 text-[10px]"
                        onClick={() => {
                          const matches = BinaryMetrics.searchMultipleSequences(bits, [template.pattern]);
                          if (matches.length > 0 && !fileState.savedSequences.find(s => s.sequence === template.pattern)) {
                            fileState.addSequence(matches[0], colorInput);
                            toast.success(`Added "${template.name}" pattern`);
                          } else if (matches.length === 0) {
                            toast.info(`Pattern not found in data`);
                          } else {
                            toast.info(`Pattern already added`);
                          }
                        }}
                      >
                        <div className="text-left">
                          <div className="font-medium">{template.name}</div>
                          <div className="font-mono text-muted-foreground">{template.pattern}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Checksum & Error Detection */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-cyan-400">Checksum & Control</div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { name: 'CRC Start', pattern: '1000000100001', desc: 'CRC-16 poly' },
                      { name: 'ETX', pattern: '00000011', desc: 'End of Text' },
                      { name: 'STX', pattern: '00000010', desc: 'Start of Text' },
                      { name: 'EOT', pattern: '00000100', desc: 'End Transmission' },
                    ].map(template => (
                      <Button
                        key={template.pattern}
                        size="sm"
                        variant="outline"
                        className="h-auto py-1 px-2 text-[10px] border-cyan-500/30"
                        onClick={() => {
                          const matches = BinaryMetrics.searchMultipleSequences(bits, [template.pattern]);
                          if (matches.length > 0 && !fileState.savedSequences.find(s => s.sequence === template.pattern)) {
                            fileState.addSequence(matches[0], '#00FFFF');
                            toast.success(`Added "${template.name}" pattern`);
                          } else if (matches.length === 0) {
                            toast.info(`Pattern not found in data`);
                          } else {
                            toast.info(`Pattern already added`);
                          }
                        }}
                      >
                        <div className="text-left">
                          <div className="font-medium">{template.name}</div>
                          <div className="font-mono text-muted-foreground">{template.pattern}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Run Length Patterns */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-green-400">Run Patterns</div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { name: 'Long Zero Run', pattern: '0000000000', desc: '10 zeros' },
                      { name: 'Long One Run', pattern: '1111111111', desc: '10 ones' },
                      { name: 'Nibble Zero', pattern: '0000', desc: '4 zeros' },
                      { name: 'Nibble One', pattern: '1111', desc: '4 ones' },
                    ].map(template => (
                      <Button
                        key={template.pattern}
                        size="sm"
                        variant="outline"
                        className="h-auto py-1 px-2 text-[10px] border-green-500/30"
                        onClick={() => {
                          const matches = BinaryMetrics.searchMultipleSequences(bits, [template.pattern]);
                          if (matches.length > 0 && !fileState.savedSequences.find(s => s.sequence === template.pattern)) {
                            fileState.addSequence(matches[0], '#00FF00');
                            toast.success(`Added "${template.name}" pattern`);
                          } else if (matches.length === 0) {
                            toast.info(`Pattern not found in data`);
                          } else {
                            toast.info(`Pattern already added`);
                          }
                        }}
                      >
                        <div className="text-left">
                          <div className="font-medium">{template.name}</div>
                          <div className="font-mono text-muted-foreground">{template.pattern}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Custom Length */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-yellow-400">Generate Pattern</div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-yellow-500/30"
                      onClick={() => {
                        const pattern = '0'.repeat(16);
                        const matches = BinaryMetrics.searchMultipleSequences(bits, [pattern]);
                        if (matches.length > 0) {
                          fileState.addSequence(matches[0], '#FFFF00');
                          toast.success(`Found ${matches[0].count} occurrences of 16 zeros`);
                        } else {
                          toast.info('Pattern not found');
                        }
                      }}
                    >
                      16-bit Zero
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-yellow-500/30"
                      onClick={() => {
                        const pattern = '1'.repeat(16);
                        const matches = BinaryMetrics.searchMultipleSequences(bits, [pattern]);
                        if (matches.length > 0) {
                          fileState.addSequence(matches[0], '#FFFF00');
                          toast.success(`Found ${matches[0].count} occurrences of 16 ones`);
                        } else {
                          toast.info('Pattern not found');
                        }
                      }}
                    >
                      16-bit One
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-yellow-500/30"
                      onClick={() => {
                        const pattern = '10'.repeat(8);
                        const matches = BinaryMetrics.searchMultipleSequences(bits, [pattern]);
                        if (matches.length > 0) {
                          fileState.addSequence(matches[0], '#FF00FF');
                          toast.success(`Found ${matches[0].count} occurrences of alternating 16-bit`);
                        } else {
                          toast.info('Pattern not found');
                        }
                      }}
                    >
                      16-bit Alt
                    </Button>
                  </div>
                </div>
              </CardContent>
            </TabsContent>
            
            <TabsContent value="python" className="mt-0">
              <CardContent className="py-4 space-y-3">
                {/* Command Output Area */}
                <div className="bg-black/50 rounded-lg p-3 font-mono text-xs max-h-40 overflow-y-auto">
                  {commandHistory.length === 0 && commandOutput.length === 0 ? (
                    <div className="text-muted-foreground">
                      <p className="mb-2">Python-like command interface for sequence filtering.</p>
                      <p className="text-green-400">Type "help" for available commands.</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {commandHistory.map((cmd, i) => (
                        <div key={i}>
                          <div className="text-green-400">{cmd}</div>
                          {commandOutput[i] && (
                            <div className="text-gray-300 whitespace-pre-wrap ml-2">{commandOutput[i]}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Command Input */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-400 font-mono text-sm">{'>>>'}</span>
                    <Input
                      value={commandInput}
                      onChange={(e) => setCommandInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRunCommand()}
                      placeholder="filter(count > 5)"
                      className="font-mono pl-10 bg-black/30 border-green-500/30 text-green-100 placeholder:text-green-500/50"
                    />
                  </div>
                  <Button onClick={handleRunCommand} className="bg-green-600 hover:bg-green-500">
                    <Play className="w-4 h-4" />
                  </Button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon" className="border-green-500/30">
                        <HelpCircle className="w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 text-xs">
                      <h4 className="font-semibold mb-2">Command Examples</h4>
                      <div className="space-y-1 font-mono text-[10px]">
                        <p className="text-green-400">filter(count {">"} 5)</p>
                        <p className="text-muted-foreground ml-2">Show sequences appearing more than 5 times</p>
                        <p className="text-green-400">filter(zeros {">"} 3)</p>
                        <p className="text-muted-foreground ml-2">Sequences with more than 3 zeros</p>
                        <p className="text-green-400">find("10101")</p>
                        <p className="text-muted-foreground ml-2">Find new pattern in data</p>
                        <p className="text-green-400">color(1, "#FF0000")</p>
                        <p className="text-muted-foreground ml-2">Set sequence #1 color to red</p>
                        <p className="text-green-400">highlight(all)</p>
                        <p className="text-muted-foreground ml-2">Highlight all sequences</p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                
                {filteredSequences && (
                  <div className="flex items-center justify-between text-xs">
                    <Badge variant="secondary" className="bg-green-500/20 text-green-300">
                      Showing {filteredSequences.length} filtered results
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 text-xs"
                      onClick={() => setFilteredSequences(null)}
                    >
                      Clear Filter
                    </Button>
                  </div>
                )}
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>

        {savedSequences.length > 0 && (
          <>
            {/* Controls */}
            <Card className="bg-card border-border">
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-muted-foreground">Sort by:</div>
                    <Select value={sortFilter} onValueChange={setSortFilter}>
                      <SelectTrigger className="h-8 w-32 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="serial">Serial #</SelectItem>
                        <SelectItem value="count">Count</SelectItem>
                        <SelectItem value="length">Length</SelectItem>
                        <SelectItem value="position">Position</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={viewMode === 'cards' ? 'default' : 'outline'}
                      onClick={() => setViewMode('cards')}
                      className="h-7 px-2"
                    >
                      <Grid className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant={viewMode === 'table' ? 'default' : 'outline'}
                      onClick={() => setViewMode('table')}
                      className="h-7 px-2"
                    >
                      <List className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {viewMode === 'cards' ? (
              <div className="space-y-3">
                {sortedSequences.map((seq) => (
                  <Card key={seq.id} className="bg-gradient-to-r from-card to-transparent border-border hover:border-primary/50 transition-all overflow-hidden group">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                            style={{ backgroundColor: seq.color + '30', color: seq.color }}
                          >
                            #{seq.serialNumber}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              onClick={() => handleToggleHighlight(seq.id)}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title={seq.highlighted ? 'Hide highlights' : 'Show highlights'}
                            >
                              {seq.highlighted ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4" />}
                            </Button>
                            {/* Color Picker */}
                            <Popover open={editingColorId === seq.id} onOpenChange={(open) => setEditingColorId(open ? seq.id : null)}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  title="Change color"
                                >
                                  <Palette className="w-4 h-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-3">
                                <div className="space-y-2">
                                  <p className="text-xs font-medium">Choose color</p>
                                  <div className="flex gap-2 flex-wrap">
                                    {['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FF8000', '#8000FF'].map(color => (
                                      <button
                                        key={color}
                                        className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                                        style={{ backgroundColor: color }}
                                        onClick={() => handleColorChange(seq.id, color)}
                                      />
                                    ))}
                                  </div>
                                  <input
                                    type="color"
                                    defaultValue={seq.color}
                                    onChange={(e) => handleColorChange(seq.id, e.target.value)}
                                    className="w-full h-8 rounded cursor-pointer"
                                  />
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleRemoveSequence(seq.id)}
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="mb-3">
                        <div 
                          className="text-sm font-mono break-all p-2 rounded-lg"
                          style={{ backgroundColor: seq.color + '15' }}
                        >
                          {seq.sequence}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary">{seq.count} match{seq.count !== 1 ? 'es' : ''}</Badge>
                          <Badge variant="outline">{seq.sequence.length} bits</Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                        <div className="p-2 bg-muted/30 rounded-lg">
                          <span className="text-muted-foreground text-xs">Mean Distance</span>
                          <div className="font-mono text-primary">{seq.meanDistance.toFixed(2)}</div>
                        </div>
                        <div className="p-2 bg-muted/30 rounded-lg">
                          <span className="text-muted-foreground text-xs">Variance</span>
                          <div className="font-mono text-primary">{seq.varianceDistance.toFixed(2)}</div>
                        </div>
                      </div>

                      {seq.positions.length > 0 && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-2">
                            Positions (first 8):
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {seq.positions.slice(0, 8).map((pos, posIdx) => (
                              <Button
                                key={posIdx}
                                size="sm"
                                variant="outline"
                                onClick={() => onJumpTo(pos)}
                                className="h-6 px-2 text-xs font-mono hover:bg-primary/20"
                              >
                                {pos}
                              </Button>
                            ))}
                            {seq.positions.length > 8 && (
                              <Badge variant="secondary" className="text-xs">
                                +{seq.positions.length - 8} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-card border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-12">#</TableHead>
                      <TableHead className="w-12">
                        <Eye className="w-4 h-4" />
                      </TableHead>
                      <TableHead className="w-12">Color</TableHead>
                      <TableHead>Sequence</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">Length</TableHead>
                      <TableHead className="text-right">Mean Dist</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedSequences.map((seq) => (
                      <TableRow key={seq.id} className="hover:bg-muted/20">
                        <TableCell className="font-bold text-primary">
                          {seq.serialNumber}
                        </TableCell>
                        <TableCell>
                          <Checkbox
                            checked={seq.highlighted}
                            onCheckedChange={() => handleToggleHighlight(seq.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                className="w-5 h-5 rounded-md border border-border cursor-pointer hover:scale-110 transition-transform"
                                style={{ backgroundColor: seq.color }}
                              />
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-3">
                              <div className="space-y-2">
                                <p className="text-xs font-medium">Choose color</p>
                                <div className="flex gap-2 flex-wrap">
                                  {['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FF8000', '#8000FF'].map(color => (
                                    <button
                                      key={color}
                                      className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                                      style={{ backgroundColor: color }}
                                      onClick={() => handleColorChange(seq.id, color)}
                                    />
                                  ))}
                                </div>
                                <input
                                  type="color"
                                  defaultValue={seq.color}
                                  onChange={(e) => handleColorChange(seq.id, e.target.value)}
                                  className="w-full h-8 rounded cursor-pointer"
                                />
                              </div>
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                        <TableCell className="font-mono text-xs max-w-[200px] truncate">
                          {seq.sequence}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {seq.count}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {seq.sequence.length}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {seq.meanDistance.toFixed(1)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => seq.positions[0] && onJumpTo(seq.positions[0])}
                              className="h-6 text-xs px-2"
                            >
                              Jump
                            </Button>
                            <Button
                              onClick={() => handleRemoveSequence(seq.id)}
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-destructive"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </>
        )}

        {savedSequences.length === 0 && (
          <Card className="bg-card border-border">
            <CardContent className="py-8 text-center">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">No sequences saved yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Search for binary patterns above to analyze their distribution
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
};