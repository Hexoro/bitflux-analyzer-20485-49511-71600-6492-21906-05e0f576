import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { BinaryModel } from '@/lib/binaryModel';
import { GENERATION_PRESETS, PRESET_DESCRIPTIONS, QUICK_SIZES, GenerationConfig } from '@/lib/generationPresets';
import { customPresetsManager, CustomPreset } from '@/lib/customPresetsManager';
import { toast } from 'sonner';
import { ChevronDown, Code, Sparkles, Plus } from 'lucide-react';

interface GenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (bits: string) => void;
}

export const GenerateDialog = ({ open, onOpenChange, onGenerate }: GenerateDialogProps) => {
  const [mode, setMode] = useState<'random' | 'pattern' | 'structured' | 'file-format' | 'code'>('random');
  const [length, setLength] = useState(1024);
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([]);
  
  // Random mode
  const [probability, setProbability] = useState(0.5);
  const [seed, setSeed] = useState('');
  const [targetEntropy, setTargetEntropy] = useState<number | null>(null);
  
  // Pattern mode - support multiple patterns
  const [patterns, setPatterns] = useState<string[]>(['1010']);
  const [noise, setNoise] = useState(0);
  const [patternMode, setPatternMode] = useState<'sequential' | 'interleave' | 'random'>('sequential');
  
  // Structured mode
  const [template, setTemplate] = useState<string>('alternating');
  const [blockSize, setBlockSize] = useState(8);
  
  // File format mode
  const [headerPattern, setHeaderPattern] = useState('11111111');
  
  // Code mode
  const [customCode, setCustomCode] = useState(`// Custom generation function
// Available: length, seed, probability
// Must return a string of only 0s and 1s

function generate(length, seed, probability) {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += Math.random() < probability ? '1' : '0';
  }
  return result;
}

return generate(length, seed, probability);`);
  
  // Advanced options
  const [showAdvanced, setShowAdvanced] = useState(false);

  const addPattern = () => {
    if (patterns.length < 8) {
      setPatterns([...patterns, '01']);
    }
  };

  const removePattern = (index: number) => {
    if (patterns.length > 1) {
      setPatterns(patterns.filter((_, i) => i !== index));
    }
  };

  const updatePattern = (index: number, value: string) => {
    const newPatterns = [...patterns];
    newPatterns[index] = value;
    setPatterns(newPatterns);
  };

  const generateMultiPattern = (patternsArr: string[], len: number, mode: string, noiseLevel: number): string => {
    let result = '';
    const validPatterns = patternsArr.filter(p => /^[01]+$/.test(p));
    if (validPatterns.length === 0) return '0'.repeat(len);
    
    if (mode === 'sequential') {
      // Each pattern fills a portion
      const perPattern = Math.ceil(len / validPatterns.length);
      for (const p of validPatterns) {
        const repetitions = Math.ceil(perPattern / p.length);
        result += p.repeat(repetitions).slice(0, perPattern);
      }
    } else if (mode === 'interleave') {
      // Interleave patterns bit by bit
      let patternIndex = 0;
      const patternPositions = validPatterns.map(() => 0);
      for (let i = 0; i < len; i++) {
        const p = validPatterns[patternIndex];
        result += p[patternPositions[patternIndex] % p.length];
        patternPositions[patternIndex]++;
        patternIndex = (patternIndex + 1) % validPatterns.length;
      }
    } else {
      // Random selection from patterns
      for (let i = 0; i < len; ) {
        const p = validPatterns[Math.floor(Math.random() * validPatterns.length)];
        result += p;
        i += p.length;
      }
    }
    
    result = result.slice(0, len);
    
    // Apply noise
    if (noiseLevel > 0) {
      const chars = result.split('');
      for (let i = 0; i < chars.length; i++) {
        if (Math.random() < noiseLevel) {
          chars[i] = chars[i] === '0' ? '1' : '0';
        }
      }
      result = chars.join('');
    }
    
    return result;
  };

  // Load custom presets from customPresetsManager
  useEffect(() => {
    if (open) {
      setCustomPresets(customPresetsManager.getCustomPresets());
      const unsubscribe = customPresetsManager.subscribe(() => {
        setCustomPresets(customPresetsManager.getCustomPresets());
      });
      return unsubscribe;
    }
  }, [open]);

  const calculateExpectedMetrics = () => {
    const p = probability;
    const entropy = p > 0 && p < 1 ? -p * Math.log2(p) - (1 - p) * Math.log2(1 - p) : 0;
    const hammingWeight = (p * 100).toFixed(1);
    const compressionRatio = length > 0 ? (length / Math.max(entropy * length, 1)).toFixed(2) : '1.00';
    
    return { entropy, hammingWeight, compressionRatio };
  };

  const executeCustomCode = (): string => {
    try {
      // Create a safe execution context
      const fn = new Function('length', 'seed', 'probability', customCode);
      const result = fn(length, seed, probability);
      
      // Validate result
      if (typeof result !== 'string') {
        throw new Error('Code must return a string');
      }
      if (!/^[01]*$/.test(result)) {
        throw new Error('Result must contain only 0s and 1s');
      }
      
      return result;
    } catch (error) {
      throw new Error(`Code execution failed: ${(error as Error).message}`);
    }
  };

  const handleGenerate = () => {
    if (length < 8 || length > 10000000) {
      toast.error('Length must be between 8 and 10,000,000 bits');
      return;
    }

    let bits = '';
    
    try {
      switch (mode) {
        case 'random':
          if (targetEntropy !== null && targetEntropy >= 0) {
            bits = BinaryModel.generateWithEntropy(length, targetEntropy);
          } else {
            bits = BinaryModel.generateRandom(length, probability, seed || undefined);
          }
          break;
          
        case 'pattern':
          const invalidPatterns = patterns.filter(p => !p || !/^[01]+$/.test(p));
          if (invalidPatterns.length > 0) {
            toast.error('All patterns must contain only 0s and 1s');
            return;
          }
          bits = generateMultiPattern(patterns, length, patternMode, noise);
          break;
          
        case 'structured':
          bits = BinaryModel.generateStructured(template, length, blockSize);
          break;
          
        case 'file-format':
          if (!headerPattern || !/^[01]+$/.test(headerPattern)) {
            toast.error('Header pattern must contain only 0s and 1s');
            return;
          }
          bits = BinaryModel.generateFileFormat(length, headerPattern);
          break;
          
        case 'code':
          bits = executeCustomCode();
          if (bits.length === 0) {
            toast.error('Generated code produced empty result');
            return;
          }
          break;
      }
      
      onGenerate(bits);
      toast.success(`Generated ${bits.length} bits using ${mode} mode`);
      onOpenChange(false);
    } catch (error) {
      toast.error((error as Error).message || 'Failed to generate binary data');
      console.error(error);
    }
  };

  const applyPreset = (presetKey: string) => {
    // Check built-in presets first
    const preset = GENERATION_PRESETS[presetKey];
    if (preset) {
      setLength(preset.length);
      setMode(preset.mode);
      if (preset.probability !== undefined) setProbability(preset.probability);
      if (preset.pattern) setPatterns([preset.pattern]);
      if (preset.patterns) setPatterns(preset.patterns);
      if (preset.noise !== undefined) setNoise(preset.noise);
      if (preset.template) setTemplate(preset.template);
      if (preset.blockSize) setBlockSize(preset.blockSize);
      if (preset.headerPattern) setHeaderPattern(preset.headerPattern);
      toast.success(`Applied preset: ${presetKey.replace(/-/g, ' ')}`);
      return;
    }
    
    // Check custom presets
    const customPreset = customPresets.find(p => p.id === presetKey);
    if (customPreset) {
      const cfg = customPreset.config;
      setLength(cfg.length);
      
      // Check if it's code-based first
      if (customPreset.isCodeBased && customPreset.code) {
        setCustomCode(customPreset.code);
        setMode('code');
      } else {
        setMode(cfg.mode as any);
      }
      
      if (cfg.probability !== undefined) setProbability(cfg.probability);
      if (cfg.pattern) setPatterns([cfg.pattern]);
      if (cfg.patterns) setPatterns(cfg.patterns);
      if (cfg.noise !== undefined) setNoise(cfg.noise);
      if (cfg.template) setTemplate(cfg.template);
      if (cfg.blockSize) setBlockSize(cfg.blockSize);
      if (cfg.headerPattern) setHeaderPattern(cfg.headerPattern);
      toast.success(`Applied custom preset: ${customPreset.name}`);
    }
  };

  const applyQuickSize = (size: number) => {
    setLength(size);
  };

  const metrics = calculateExpectedMetrics();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-primary flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Generate Binary Data
          </DialogTitle>
          <DialogDescription>
            Create custom binary data with advanced generation options
          </DialogDescription>
        </DialogHeader>

        {/* Presets */}
        <div className="space-y-2">
          <Label>Quick Presets</Label>
          <Select onValueChange={applyPreset}>
            <SelectTrigger className="bg-input border-border">
              <SelectValue placeholder="Choose a preset..." />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border z-50 max-h-60">
              {/* Built-in Presets */}
              {Object.keys(GENERATION_PRESETS).map(key => (
                <SelectItem key={key} value={key} className="hover:bg-secondary">
                  <div className="flex flex-col">
                    <span className="font-medium">{key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                    <span className="text-xs text-muted-foreground">{PRESET_DESCRIPTIONS[key]}</span>
                  </div>
                </SelectItem>
              ))}
              {/* Custom Presets */}
              {customPresets.length > 0 && (
                <>
                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase border-t mt-1 pt-1">
                    Custom Presets
                  </div>
                  {customPresets.map(preset => (
                    <SelectItem key={preset.id} value={preset.id} className="hover:bg-secondary">
                      <div className="flex flex-col">
                        <span className="font-medium text-primary">{preset.name}</span>
                        <span className="text-xs text-muted-foreground">{preset.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Length */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="length">Length (bits)</Label>
            <div className="flex gap-1">
              {QUICK_SIZES.map(({ label, value }) => (
                <Button
                  key={value}
                  variant="outline"
                  size="sm"
                  onClick={() => applyQuickSize(value)}
                  className="text-xs h-6 px-2"
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
          <Input
            id="length"
            type="number"
            min={8}
            max={10000000}
            value={length}
            onChange={(e) => setLength(parseInt(e.target.value) || 0)}
            className="font-mono bg-input border-border"
          />
          <p className="text-xs text-muted-foreground">
            {(length / 8).toFixed(0)} bytes • {(length / 1024).toFixed(2)} KB • {(length / (1024 * 1024)).toFixed(2)} MB
          </p>
        </div>

        {/* Generation Modes */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-muted">
            <TabsTrigger value="random">Random</TabsTrigger>
            <TabsTrigger value="pattern">Pattern</TabsTrigger>
            <TabsTrigger value="structured">Structured</TabsTrigger>
            <TabsTrigger value="file-format">File Format</TabsTrigger>
            <TabsTrigger value="code" className="flex items-center gap-1">
              <Code className="w-3 h-3" />
              Code
            </TabsTrigger>
          </TabsList>

          <TabsContent value="random" className="space-y-4 mt-4">
            <div className="space-y-3">
              <Label htmlFor="probability">
                Probability of 1s: {(probability * 100).toFixed(0)}%
              </Label>
              <Slider
                id="probability"
                min={0}
                max={1}
                step={0.01}
                value={[probability]}
                onValueChange={(values) => setProbability(values[0])}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>All 0s</span>
                <span>Balanced</span>
                <span>All 1s</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="seed">Seed (optional)</Label>
              <Input
                id="seed"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                placeholder="Enter seed for reproducible generation"
                className="bg-input border-border"
              />
              <p className="text-xs text-muted-foreground">Leave empty for random generation</p>
            </div>
          </TabsContent>

          <TabsContent value="pattern" className="space-y-4 mt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Patterns ({patterns.length})</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPattern}
                  disabled={patterns.length >= 8}
                  className="h-7"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Pattern
                </Button>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {patterns.map((p, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={p}
                      onChange={(e) => updatePattern(index, e.target.value)}
                      placeholder="e.g., 1010"
                      className="font-mono bg-input border-border flex-1"
                    />
                    {patterns.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removePattern(index)}
                        className="h-8 w-8 text-destructive"
                      >
                        ×
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {patterns.length > 1 ? 'Multiple patterns will be combined based on mode' : 'Pattern will repeat to fill length'}
              </p>
            </div>

            {patterns.length > 1 && (
              <div className="space-y-2">
                <Label>Combination Mode</Label>
                <Select value={patternMode} onValueChange={(v: any) => setPatternMode(v)}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    <SelectItem value="sequential">Sequential (one after another)</SelectItem>
                    <SelectItem value="interleave">Interleave (alternate bits)</SelectItem>
                    <SelectItem value="random">Random (pick patterns randomly)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-3">
              <Label htmlFor="noise">
                Noise Level: {(noise * 100).toFixed(0)}%
              </Label>
              <Slider
                id="noise"
                min={0}
                max={0.5}
                step={0.01}
                value={[noise]}
                onValueChange={(values) => setNoise(values[0])}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">Randomly flip bits at this rate</p>
            </div>
          </TabsContent>

          <TabsContent value="structured" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={template} onValueChange={setTemplate}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  <SelectItem value="zeros">All Zeros</SelectItem>
                  <SelectItem value="ones">All Ones</SelectItem>
                  <SelectItem value="alternating">Alternating (010101...)</SelectItem>
                  <SelectItem value="blocks">Alternating Blocks</SelectItem>
                  <SelectItem value="gray-code">Gray Code Sequence</SelectItem>
                  <SelectItem value="fibonacci">Fibonacci Sequence</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {template === 'blocks' && (
              <div className="space-y-2">
                <Label htmlFor="blockSize">Block Size</Label>
                <Input
                  id="blockSize"
                  type="number"
                  min={1}
                  max={256}
                  value={blockSize}
                  onChange={(e) => setBlockSize(parseInt(e.target.value) || 8)}
                  className="font-mono bg-input border-border"
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="file-format" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="headerPattern">Header Pattern (8 bits)</Label>
              <Input
                id="headerPattern"
                value={headerPattern}
                onChange={(e) => setHeaderPattern(e.target.value)}
                placeholder="e.g., 11111111"
                className="font-mono bg-input border-border"
                maxLength={8}
              />
              <p className="text-xs text-muted-foreground">
                Will generate: Header (8 bits) + Random Data + Checksum (8 bits)
              </p>
            </div>
          </TabsContent>

          <TabsContent value="code" className="space-y-4 mt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Custom Generation Code</Label>
                <Badge variant="secondary" className="text-xs">JavaScript</Badge>
              </div>
              <Textarea
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value)}
                className="font-mono text-xs bg-input border-border min-h-[200px]"
                placeholder="Write your custom generation function..."
              />
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Available variables:</strong> length, seed, probability</p>
                <p><strong>Must return:</strong> A string containing only 0s and 1s</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Advanced Options */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              Advanced Options
              <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            {/* Random mode advanced options */}
            {mode === 'random' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="targetEntropy">Target Entropy (optional)</Label>
                  <Input
                    id="targetEntropy"
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={targetEntropy ?? ''}
                    onChange={(e) => setTargetEntropy(e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="0.0 to 1.0"
                    className="font-mono bg-input border-border"
                  />
                  <p className="text-xs text-muted-foreground">Generate data with a specific entropy level</p>
                </div>
              </>
            )}
            
            {/* Pattern mode advanced options */}
            {mode === 'pattern' && (
              <>
                <div className="space-y-2">
                  <Label>Quick Pattern Variations</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {['1010', '1100', '11110000', '10101010'].map(p => (
                      <Button
                        key={p}
                        variant="outline"
                        size="sm"
                        className="font-mono text-xs"
                        onClick={() => setPatterns([p])}
                      >
                        {p}
                      </Button>
                    ))}
                  </div>
                </div>
              </>
            )}
            
            {/* Structured mode advanced options */}
            {mode === 'structured' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="blockSize">Block Size</Label>
                  <Input
                    id="blockSize"
                    type="number"
                    min={1}
                    max={256}
                    value={blockSize}
                    onChange={(e) => setBlockSize(parseInt(e.target.value) || 8)}
                    className="font-mono bg-input border-border"
                  />
                  <p className="text-xs text-muted-foreground">Size of each block in structured templates</p>
                </div>
              </>
            )}
            
            {/* File format advanced options */}
            {mode === 'file-format' && (
              <>
                <div className="space-y-2">
                  <Label>Common Headers</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { name: 'All 1s', pattern: '11111111' },
                      { name: 'All 0s', pattern: '00000000' },
                      { name: 'Alt', pattern: '10101010' },
                    ].map(h => (
                      <Button
                        key={h.name}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setHeaderPattern(h.pattern)}
                      >
                        {h.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </>
            )}
            
            {/* Code mode - no additional options needed */}
            {mode === 'code' && (
              <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded">
                <p><strong>Tip:</strong> Use the code editor above to write custom generation logic.</p>
                <p className="mt-1">Variables available: <code>length</code>, <code>seed</code>, <code>probability</code></p>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Preview */}
        <div className="p-3 bg-secondary/30 rounded-lg space-y-2 text-xs">
          <div className="font-semibold text-sm text-foreground">Expected Metrics:</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shannon Entropy:</span>
              <span className="font-mono text-foreground">{metrics.entropy.toFixed(3)} bits/symbol</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Hamming Weight:</span>
              <span className="font-mono text-foreground">~{metrics.hammingWeight}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Compression Ratio:</span>
              <span className="font-mono text-foreground">~{metrics.compressionRatio}:1</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expected Size:</span>
              <span className="font-mono text-foreground">{((metrics.entropy * length) / 8).toFixed(0)} bytes</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleGenerate} className="flex-1">
            <Sparkles className="w-4 h-4 mr-2" />
            Generate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
