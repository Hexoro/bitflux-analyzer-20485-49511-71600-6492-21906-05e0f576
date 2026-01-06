/**
 * Operations Guide - Comprehensive guide for all 106+ operations
 * Shows categorized operations with syntax, examples, and tips
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Search,
  Binary,
  ChevronRight,
  RotateCcw,
  Zap,
  Calculator,
  GitBranch,
  Layers,
  Copy,
  Code,
  BookOpen,
  Terminal,
} from 'lucide-react';
import { predefinedManager, PredefinedOperation } from '@/lib/predefinedManager';
import { getAvailableOperations } from '@/lib/operationsRouter';
import { toast } from 'sonner';
import { Button } from './ui/button';

interface OperationsGuideProps {
  onInsertCommand?: (command: string) => void;
}

export const OperationsGuide = ({ onInsertCommand }: OperationsGuideProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const allOperations = useMemo(() => predefinedManager.getAllOperations(), []);
  const availableOps = useMemo(() => getAvailableOperations(), []);

  const categories = useMemo(() => {
    const cats = new Map<string, PredefinedOperation[]>();
    allOperations.forEach(op => {
      const cat = op.category || 'Other';
      if (!cats.has(cat)) cats.set(cat, []);
      cats.get(cat)!.push(op);
    });
    return cats;
  }, [allOperations]);

  const filteredOperations = useMemo(() => {
    let ops = allOperations;
    
    if (selectedCategory !== 'all') {
      ops = ops.filter(op => op.category === selectedCategory);
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      ops = ops.filter(op => 
        op.id.toLowerCase().includes(q) ||
        op.name.toLowerCase().includes(q) ||
        op.description?.toLowerCase().includes(q)
      );
    }
    
    return ops;
  }, [allOperations, selectedCategory, searchQuery]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Logic Gates': return <Binary className="w-4 h-4" />;
      case 'Shifts': return <ChevronRight className="w-4 h-4" />;
      case 'Rotations': return <RotateCcw className="w-4 h-4" />;
      case 'Manipulation': return <Layers className="w-4 h-4" />;
      case 'Advanced': return <Zap className="w-4 h-4" />;
      case 'Arithmetic': return <Calculator className="w-4 h-4" />;
      default: return <GitBranch className="w-4 h-4" />;
    }
  };

  const getExampleCommand = (op: PredefinedOperation): string => {
    const needsMask = ['AND', 'OR', 'XOR', 'NAND', 'NOR', 'XNOR', 'IMPLY', 'NIMPLY', 'CONVERSE'].includes(op.id);
    const needsCount = ['SHL', 'SHR', 'ROL', 'ROR', 'ASHL', 'ASHR', 'ASL', 'ASR'].includes(op.id);
    
    if (needsMask) return `${op.id} 10101010`;
    if (needsCount) return `${op.id} 4`;
    return op.id;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const categoryStats = useMemo(() => {
    const stats: Record<string, { total: number; implemented: number }> = {};
    categories.forEach((ops, cat) => {
      stats[cat] = {
        total: ops.length,
        implemented: ops.filter(op => availableOps.includes(op.id)).length,
      };
    });
    return stats;
  }, [categories, availableOps]);

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Header */}
      <Card className="bg-gradient-to-r from-primary/10 via-accent/5 to-transparent border-primary/20">
        <CardContent className="py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold">Operations Reference Guide</h2>
              <p className="text-xs text-muted-foreground">
                {availableOps.length} of {allOperations.length} operations implemented • Click to copy command syntax
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              <Terminal className="w-3 h-3 mr-1" />
              Command Interface
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Search & Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search operations..."
            className="pl-9"
          />
        </div>
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="h-9">
            <TabsTrigger value="all" className="text-xs px-2">All</TabsTrigger>
            {Array.from(categories.keys()).slice(0, 4).map(cat => (
              <TabsTrigger key={cat} value={cat} className="text-xs px-2 gap-1">
                {getCategoryIcon(cat)}
                <span className="hidden sm:inline">{cat.split(' ')[0]}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Category Stats */}
      <div className="grid grid-cols-6 gap-2">
        {Array.from(categories.entries()).map(([cat, ops]) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`p-2 rounded-lg border text-left transition-colors ${
              selectedCategory === cat 
                ? 'bg-primary/10 border-primary/30' 
                : 'bg-card hover:bg-muted/50'
            }`}
          >
            <div className="flex items-center gap-1 mb-1">
              {getCategoryIcon(cat)}
              <span className="text-xs font-medium truncate">{cat}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {categoryStats[cat]?.implemented}/{categoryStats[cat]?.total}
            </div>
          </button>
        ))}
      </div>

      {/* Operations List */}
      <ScrollArea className="flex-1">
        <div className="space-y-2 pr-4">
          {filteredOperations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No operations found</p>
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-1">
              {filteredOperations.map(op => {
                const isImplemented = availableOps.includes(op.id);
                const example = getExampleCommand(op);
                
                return (
                  <AccordionItem key={op.id} value={op.id} className="border rounded-lg px-3">
                    <AccordionTrigger className="py-2 hover:no-underline">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-mono font-bold ${
                          isImplemented 
                            ? 'bg-primary/20 text-primary' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {op.id.slice(0, 3)}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium">{op.id}</span>
                            {!isImplemented && (
                              <Badge variant="outline" className="text-[10px]">pending</Badge>
                            )}
                            <Badge variant="secondary" className="text-[10px]">{op.category}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{op.name}</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-0 pb-3">
                      <div className="space-y-3 ml-11">
                        {/* Description */}
                        <p className="text-sm text-muted-foreground">
                          {op.description || 'No description available.'}
                        </p>
                        
                        {/* Command Syntax */}
                        <div className="p-3 bg-muted/50 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-muted-foreground">Command Syntax</span>
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-6 px-2 text-xs"
                                onClick={() => copyToClipboard(example)}
                              >
                                <Copy className="w-3 h-3 mr-1" />
                                Copy
                              </Button>
                              {onInsertCommand && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-6 px-2 text-xs"
                                  onClick={() => onInsertCommand(example)}
                                >
                                  <Terminal className="w-3 h-3 mr-1" />
                                  Insert
                                </Button>
                              )}
                            </div>
                          </div>
                          <code className="font-mono text-sm text-primary">{example}</code>
                        </div>
                        
                        {/* Parameters */}
                        {op.parameters && op.parameters.length > 0 && (
                          <div>
                            <span className="text-xs font-medium text-muted-foreground block mb-1">Parameters</span>
                            <div className="space-y-1">
                              {op.parameters.map((param, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs">
                                  <code className="font-mono bg-muted px-1 rounded">{param.name}</code>
                                  <span className="text-muted-foreground">({param.type})</span>
                                  <span className="text-muted-foreground text-[10px]">{param.description}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Code Implementation */}
                        {op.code && (
                          <div>
                            <span className="text-xs font-medium text-muted-foreground block mb-1">Implementation</span>
                            <pre className="text-xs bg-muted/30 p-2 rounded overflow-x-auto max-h-32">
                              <code>{op.code.slice(0, 300)}{op.code.length > 300 ? '...' : ''}</code>
                            </pre>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
