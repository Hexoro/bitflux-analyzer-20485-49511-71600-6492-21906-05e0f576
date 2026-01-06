import { useState } from 'react';
import { PatternAnalysis, TransitionAnalysis, CorrelationAnalysis, CompressionAnalysisTools } from '@/lib/bitstreamAnalysis';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Progress } from './ui/progress';
import { Search, TrendingUp, Activity, Sparkles, Binary } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from './ui/badge';

interface BitstreamAnalysisPanelProps {
  bits: string;
  onJumpTo: (index: number) => void;
}

export const BitstreamAnalysisPanel = ({ bits, onJumpTo }: BitstreamAnalysisPanelProps) => {
  const [patternInput, setPatternInput] = useState('');
  const [patternResults, setPatternResults] = useState<{ pattern: string; positions: number[]; frequency: number } | null>(null);
  const [tokenFormat, setTokenFormat] = useState('8');
  const [comparePattern, setComparePattern] = useState('');
  const [correlationResult, setCorrelationResult] = useState<any>(null);
  const [minPatternLength, setMinPatternLength] = useState('4');
  const [minOccurrences, setMinOccurrences] = useState('2');
  const [commonPatterns, setCommonPatterns] = useState<any[]>([]);
  const [autocorrelation, setAutocorrelation] = useState<number[]>([]);

  const handlePatternSearch = () => {
    if (!patternInput.match(/^[01]+$/)) {
      toast.error('Please enter a valid binary pattern');
      return;
    }

    const result = PatternAnalysis.findPattern(bits, patternInput);
    const frequency = PatternAnalysis.patternFrequency(bits, patternInput.length);
    const patternFreq = frequency.get(patternInput) || 0;
    
    setPatternResults({
      pattern: patternInput,
      positions: result.positions,
      frequency: patternFreq / bits.length
    });
    
    toast.success(`Found ${result.positions.length} occurrences`);
  };

  const handleParseTokens = () => {
    const tokenSize = parseInt(tokenFormat);
    if (isNaN(tokenSize) || tokenSize < 1) {
      toast.error('Invalid token size');
      return;
    }

    const tokens = PatternAnalysis.parseTokens(bits, tokenFormat);
    toast.success(`Parsed ${tokens.length} tokens of ${tokenFormat} chars each`);
    // Could display tokens in a dialog or export them
  };

  const handleCompare = () => {
    if (!comparePattern.match(/^[01]+$/)) {
      toast.error('Please enter a valid binary pattern to compare');
      return;
    }

    const hamming = CorrelationAnalysis.hammingDistance(bits, comparePattern);
    const similarityResult = CorrelationAnalysis.calculateSimilarity(bits, comparePattern);
    const alignment = CorrelationAnalysis.findBestAlignment(bits, comparePattern, 100);

    setCorrelationResult({ 
      hamming, 
      similarity: similarityResult.similarity, 
      correlation: similarityResult.similarity,
      bestOffset: alignment.offset,
      bestSimilarity: alignment.similarity
    });
    toast.success('Comparison complete');
  };

  const handleFindCommonPatterns = () => {
    const patternLen = parseInt(minPatternLength);
    const minOcc = parseInt(minOccurrences);
    
    if (isNaN(patternLen) || patternLen < 2) {
      toast.error('Pattern length must be at least 2');
      return;
    }
    
    const patterns = PatternAnalysis.findAllPatterns(bits, patternLen, minOcc);
    setCommonPatterns(patterns.slice(0, 10)); // Top 10 patterns
    toast.success(`Found ${patterns.length} patterns`);
  };

  const handleCalculateAutocorrelation = () => {
    const autoCorr = CorrelationAnalysis.autocorrelation(bits, 20);
    setAutocorrelation(autoCorr);
    toast.success('Autocorrelation calculated');
  };

  const transitionData = TransitionAnalysis.analyzeTransitions(bits);
  const transitionRate = transitionData.transitionRate;
  const runLengths = TransitionAnalysis.runLengthEncode(bits);
  const compressionData = CompressionAnalysisTools.estimateRLECompression(bits);
  const longestRepeated = PatternAnalysis.findLongestRepeatedSubstring(bits, 64);
  const compressibleRegions = CompressionAnalysisTools.findCompressibleRegions(bits, 64, 0.5);
  const redundancy = CompressionAnalysisTools.detectRedundancy(bits, 8);
  
  // Calculate block entropy manually
  const blockSize = 256;
  const numBlocks = Math.floor(bits.length / blockSize);
  const blockEntropyValues: number[] = [];
  for (let i = 0; i < numBlocks; i++) {
    const block = bits.slice(i * blockSize, (i + 1) * blockSize);
    blockEntropyValues.push(CompressionAnalysisTools.calculateEntropy(block));
  }
  const blockEntropy = {
    values: blockEntropyValues,
    average: blockEntropyValues.reduce((a, b) => a + b, 0) / (blockEntropyValues.length || 1),
    min: Math.min(...blockEntropyValues, 0),
    max: Math.max(...blockEntropyValues, 0)
  };

  // Calculate bit distribution
  const onesCount = bits.split('1').length - 1;
  const zerosCount = bits.length - onesCount;
  const bitBalance = Math.abs(0.5 - (onesCount / bits.length));

  return (
    <div className="h-full overflow-auto p-4 space-y-4 scrollbar-thin">
      {/* Quick Stats Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card className="p-3 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <div className="flex items-center gap-2 mb-1">
            <Binary className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase">Entropy</span>
          </div>
          <div className="text-lg font-bold text-foreground">{compressionData.entropy.toFixed(3)}</div>
        </Card>
        
        <Card className="p-3 bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-3.5 h-3.5 text-accent" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase">Transitions</span>
          </div>
          <div className="text-lg font-bold text-foreground">{(transitionRate * 100).toFixed(1)}%</div>
        </Card>
        
        <Card className="p-3 bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-secondary-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase">RLE Ratio</span>
          </div>
          <div className="text-lg font-bold text-foreground">{compressionData.compressionRatio.toFixed(2)}:1</div>
        </Card>
        
        <Card className="p-3 bg-gradient-to-br from-muted/10 to-muted/5 border-border">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase">Balance</span>
          </div>
          <div className="text-lg font-bold text-foreground">{((1 - bitBalance * 2) * 100).toFixed(1)}%</div>
        </Card>
      </div>

      <Accordion type="multiple" defaultValue={['pattern']} className="space-y-2">
        {/* Pattern Analysis */}
        <AccordionItem value="pattern">
          <AccordionTrigger className="text-sm font-medium">Pattern Analysis</AccordionTrigger>
          <AccordionContent className="space-y-3 pt-2">
            <Card className="p-4 bg-card border-border">
              <h4 className="text-xs font-semibold text-primary mb-2">Pattern Search</h4>
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="Enter pattern (e.g., 1010)"
                  value={patternInput}
                  onChange={(e) => setPatternInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePatternSearch()}
                  className="font-mono text-xs flex-1"
                />
                <Button onClick={handlePatternSearch} size="sm">
                  <Search className="w-4 h-4" />
                </Button>
              </div>

              {patternResults && (
                <div className="space-y-2">
                  <div className="p-3 bg-secondary/50 rounded text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pattern:</span>
                      <span className="font-mono">{patternResults.pattern}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Occurrences:</span>
                      <span className="font-mono">{patternResults.positions.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Frequency:</span>
                      <span className="font-mono">{(patternResults.frequency * 100).toFixed(4)}%</span>
                    </div>
                  </div>

                  {patternResults.positions.length > 0 && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">Positions (first 20):</div>
                      <div className="flex flex-wrap gap-2">
                        {patternResults.positions.slice(0, 20).map((pos, idx) => (
                          <Button
                            key={idx}
                            size="sm"
                            variant="outline"
                            onClick={() => onJumpTo(pos)}
                            className="h-6 px-2 text-xs font-mono"
                          >
                            {pos}
                          </Button>
                        ))}
                        {patternResults.positions.length > 20 && (
                          <span className="text-xs text-muted-foreground self-center">
                            +{patternResults.positions.length - 20} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>

            <Card className="p-4 bg-card border-border">
              <h4 className="text-xs font-semibold text-primary mb-2">Common Patterns</h4>
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="Min length"
                  value={minPatternLength}
                  onChange={(e) => setMinPatternLength(e.target.value)}
                  className="font-mono text-xs w-20"
                />
                <Input
                  placeholder="Min count"
                  value={minOccurrences}
                  onChange={(e) => setMinOccurrences(e.target.value)}
                  className="font-mono text-xs w-20"
                />
                <Button onClick={handleFindCommonPatterns} size="sm" className="flex-1">
                  Find
                </Button>
              </div>
              
              {commonPatterns.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-auto">
                  {commonPatterns.map((p, idx) => (
                    <div key={idx} className="p-2 bg-secondary/30 rounded text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <code className="font-mono text-[10px] break-all">{p.pattern}</code>
                        <Badge variant="secondary" className="text-[10px] ml-2">×{p.positions.length}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {p.positions.slice(0, 5).map((pos: number, i: number) => (
                          <Button
                            key={i}
                            size="sm"
                            variant="ghost"
                            onClick={() => onJumpTo(pos)}
                            className="h-5 px-1.5 text-[10px] font-mono"
                          >
                            @{pos}
                          </Button>
                        ))}
                        {p.positions.length > 5 && (
                          <span className="text-[10px] text-muted-foreground self-center">+{p.positions.length - 5}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {longestRepeated && (
              <Card className="p-4 bg-card border-border">
                <h4 className="text-xs font-semibold text-primary mb-3">Longest Repeated Substring</h4>
                <div className="space-y-2 text-xs">
                  <div className="p-2 bg-secondary/30 rounded">
                    <code className="font-mono text-[10px] break-all">{longestRepeated.pattern}</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Length:</span>
                    <span className="font-mono">{longestRepeated.pattern.length} bits</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Occurrences:</span>
                    <span className="font-mono">{longestRepeated.positions.length}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {longestRepeated.positions.slice(0, 8).map((pos, i) => (
                      <Button
                        key={i}
                        size="sm"
                        variant="outline"
                        onClick={() => onJumpTo(pos)}
                        className="h-6 px-2 text-[10px] font-mono"
                      >
                        @{pos}
                      </Button>
                    ))}
                  </div>
                </div>
              </Card>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Transition Analysis */}
        <AccordionItem value="transition">
          <AccordionTrigger className="text-sm font-medium">Transition Analysis</AccordionTrigger>
          <AccordionContent className="space-y-3 pt-2">
            <Card className="p-4 bg-card border-border">
              <h4 className="text-xs font-semibold text-primary mb-3">Bit Transitions</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">0 → 1 transitions:</span>
                  <span className="font-mono">{transitionData.zeroToOne}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">1 → 0 transitions:</span>
                  <span className="font-mono">{transitionData.oneToZero}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total transitions:</span>
                  <span className="font-mono">{transitionData.totalTransitions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transition rate:</span>
                  <span className="font-mono">{(transitionRate * 100).toFixed(2)}%</span>
                </div>
              </div>

              <div className="mt-3">
                <div className="text-xs text-muted-foreground mb-1">Transition Density</div>
                <Progress value={transitionRate * 100} className="h-2" />
              </div>
            </Card>

            <Card className="p-4 bg-card border-border">
              <h4 className="text-xs font-semibold text-primary mb-3">Run Length Analysis</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total runs:</span>
                  <span className="font-mono">{runLengths.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max run length:</span>
                  <span className="font-mono">
                    {Math.max(...runLengths.map(r => r.length), 0)} bits
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg run length:</span>
                  <span className="font-mono">
                    {(runLengths.reduce((a, r) => a + r.length, 0) / (runLengths.length || 1)).toFixed(2)} bits
                  </span>
                </div>
              </div>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Correlation */}
        <AccordionItem value="correlation">
          <AccordionTrigger className="text-sm font-medium">Correlation Analysis</AccordionTrigger>
          <AccordionContent className="space-y-3 pt-2">
            <Card className="p-4 bg-card border-border">
              <h4 className="text-xs font-semibold text-primary mb-2">Compare with Pattern</h4>
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="Enter binary pattern"
                  value={comparePattern}
                  onChange={(e) => setComparePattern(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCompare()}
                  className="font-mono text-xs flex-1"
                />
                <Button onClick={handleCompare} size="sm" variant="outline">
                  Compare
                </Button>
              </div>

              {correlationResult && (
                <div className="space-y-2">
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hamming Distance:</span>
                      <span className="font-mono">{correlationResult.hamming}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Similarity Score:</span>
                      <span className="font-mono">{(correlationResult.similarity * 100).toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Correlation:</span>
                      <span className="font-mono">{correlationResult.correlation.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Best Alignment Offset:</span>
                      <span className="font-mono">{correlationResult.bestOffset}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Best Similarity:</span>
                      <span className="font-mono">{(correlationResult.bestSimilarity * 100).toFixed(2)}%</span>
                    </div>
                  </div>
                  <Progress value={correlationResult.similarity * 100} className="h-2 mt-2" />
                </div>
              )}
            </Card>

            <Card className="p-4 bg-card border-border">
              <h4 className="text-xs font-semibold text-primary mb-2">Autocorrelation</h4>
              <Button onClick={handleCalculateAutocorrelation} size="sm" variant="outline" className="w-full mb-3">
                Calculate Autocorrelation
              </Button>
              
              {autocorrelation.length > 0 && (
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-1 text-[10px]">
                    {autocorrelation.map((val, idx) => (
                      <div key={idx} className="p-1.5 bg-secondary/30 rounded text-center">
                        <div className="text-muted-foreground mb-0.5">lag {idx}</div>
                        <div className="font-mono font-semibold">{val.toFixed(3)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Compression Analysis */}
        <AccordionItem value="compression">
          <AccordionTrigger className="text-sm font-medium">Compression Analysis</AccordionTrigger>
          <AccordionContent className="space-y-3 pt-2">
            <Card className="p-4 bg-card border-border">
              <h4 className="text-xs font-semibold text-primary mb-3">Compression Potential</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">RLE ratio:</span>
                  <span className="font-mono">{compressionData.compressionRatio.toFixed(2)}:1</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Original size:</span>
                  <span className="font-mono">{compressionData.rawLength} bits</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">RLE compressed:</span>
                  <span className="font-mono">{compressionData.compressedLength} bits</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entropy:</span>
                  <span className="font-mono">{compressionData.entropy.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Space saved:</span>
                  <span className="font-mono text-green-600 dark:text-green-400">
                    {((1 - 1/compressionData.compressionRatio) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-card border-border">
              <h4 className="text-xs font-semibold text-primary mb-3">Block Entropy (256-bit blocks)</h4>
              <div className="space-y-2">
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Average:</span>
                    <span className="font-mono">{blockEntropy.average.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Min:</span>
                    <span className="font-mono">{blockEntropy.min.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max:</span>
                    <span className="font-mono">{blockEntropy.max.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Blocks analyzed:</span>
                    <span className="font-mono">{blockEntropy.values.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Variance:</span>
                    <span className="font-mono">
                      {(blockEntropy.max - blockEntropy.min).toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-card border-border">
              <h4 className="text-xs font-semibold text-primary mb-3">Compressible Regions</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Regions found:</span>
                  <span className="font-mono">{compressibleRegions.length}</span>
                </div>
                {compressibleRegions.length > 0 && (
                  <div className="max-h-32 overflow-auto space-y-1">
                    {compressibleRegions.slice(0, 10).map((region, idx) => (
                      <div key={idx} className="p-2 bg-secondary/30 rounded flex justify-between items-center">
                        <div className="flex gap-2 items-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onJumpTo(region.start)}
                            className="h-5 px-1.5 text-[10px] font-mono"
                          >
                            @{region.start}
                          </Button>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            len: {region.end - region.start}
                          </span>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">
                          H={region.entropy.toFixed(2)}
                        </Badge>
                      </div>
                    ))}
                    {compressibleRegions.length > 10 && (
                      <div className="text-center text-[10px] text-muted-foreground pt-1">
                        +{compressibleRegions.length - 10} more regions
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-4 bg-card border-border">
              <h4 className="text-xs font-semibold text-primary mb-3">Redundancy Analysis</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Total potential savings:</span>
                  <span className="font-mono text-green-600 dark:text-green-400">
                    {redundancy.reduce((sum, r) => sum + r.savings, 0)} bits
                  </span>
                </div>
                {redundancy.length > 0 && (
                  <div className="max-h-32 overflow-auto space-y-1">
                    {redundancy.slice(0, 8).map((r, idx) => (
                      <div key={idx} className="p-2 bg-secondary/30 rounded">
                        <div className="flex justify-between items-center mb-1">
                          <code className="font-mono text-[10px] break-all max-w-[120px]">{r.pattern}</code>
                          <Badge variant="outline" className="text-[10px]">
                            -{r.savings}b
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-4 bg-card border-border">
              <h4 className="text-xs font-semibold text-primary mb-3">Bit Distribution</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ones (1):</span>
                  <span className="font-mono">{onesCount} ({((onesCount/bits.length)*100).toFixed(2)}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Zeros (0):</span>
                  <span className="font-mono">{zerosCount} ({((zerosCount/bits.length)*100).toFixed(2)}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Balance score:</span>
                  <span className="font-mono">{((1 - bitBalance * 2) * 100).toFixed(2)}%</span>
                </div>
                <Progress value={(onesCount/bits.length)*100} className="h-2 mt-2" />
              </div>
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
