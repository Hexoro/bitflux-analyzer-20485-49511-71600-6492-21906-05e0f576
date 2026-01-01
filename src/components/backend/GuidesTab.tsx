/**
 * Comprehensive Guides Tab for Backend Mode
 * Contains detailed guides and examples for writing strategies, anomalies, operations, metrics
 * Includes encoding and compression function documentation
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  BookOpen,
  Code,
  FileCode,
  Zap,
  Activity,
  AlertTriangle,
  Cog,
  Calculator,
  Brain,
  Binary,
  Layers,
} from 'lucide-react';

export const GuidesTab = () => {
  const [activeGuide, setActiveGuide] = useState('overview');

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <Card className="bg-gradient-to-r from-primary/10 to-transparent border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Comprehensive Strategy Writing Guide
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This guide covers everything you need to know about writing strategies, anomalies, operations, metrics, and using the encoding/compression library.
            </p>
          </CardContent>
        </Card>

        <Tabs value={activeGuide} onValueChange={setActiveGuide}>
          <TabsList className="w-full flex-wrap h-auto gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="player">Player Mode</TabsTrigger>
            <TabsTrigger value="scheduler">Scheduler</TabsTrigger>
            <TabsTrigger value="algorithm">Algorithm</TabsTrigger>
            <TabsTrigger value="scoring">Scoring</TabsTrigger>
            <TabsTrigger value="policies">Policies</TabsTrigger>
            <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="encoding">Encoding</TabsTrigger>
            <TabsTrigger value="compression">Compression</TabsTrigger>
          </TabsList>

          {/* Strategy Overview */}
          <TabsContent value="overview" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  How Strategies Work
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-primary/10 rounded border border-primary/30">
                  <h4 className="font-medium mb-2">Strategy Execution Pipeline</h4>
                  <div className="text-xs text-muted-foreground space-y-2">
                    <p><strong>1. Scheduler</strong> → Determines which algorithms to run and in what order</p>
                    <p><strong>2. Algorithm</strong> → Contains the transformation logic that modifies binary data</p>
                    <p><strong>3. Scoring</strong> → Defines budget constraints and success metrics</p>
                    <p><strong>4. Policy</strong> → Enforces constraints and validates algorithm behavior</p>
                  </div>
                </div>

                <Accordion type="multiple" className="space-y-2">
                  <AccordionItem value="creation">
                    <AccordionTrigger>Creating a Strategy</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm">
                        <p>Strategies are created in <strong>Algorithm Mode → Strategy Tab</strong>:</p>
                        <ol className="list-decimal pl-4 space-y-2">
                          <li>Click "New Strategy" to create a new strategy bundle</li>
                          <li>Add files for each component: Scheduler, Algorithm, Scoring, Policy</li>
                          <li>Write Python code in each file using the bitwise_api</li>
                          <li>Save and run your strategy on the active file</li>
                        </ol>
                        <pre className="bg-muted p-3 rounded text-xs overflow-x-auto mt-2">{`# Example: Minimal strategy structure
# scheduler.py
def schedule(bits, context):
    return [{"algorithm": "my_algo", "params": {}}]

# algorithm.py  
def run(bits, params, context):
    return context.execute_op("NOT", bits, {})

# scoring.py
INITIAL_BUDGET = 1000
def calculate_score(context):
    return {"score": context.get_entropy_change(), "success": True}

# policy.py
def validate_all(initial_size, initial_entropy, initial_budget):
    return True, "OK"`}</pre>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="execution">
                    <AccordionTrigger>Strategy Execution Flow</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm">
                        <p>When you click "Run" on a strategy:</p>
                        <ol className="list-decimal pl-4 space-y-2">
                          <li><strong>Load Source:</strong> The active file's bits are loaded as input</li>
                          <li><strong>Run Scheduler:</strong> Scheduler determines algorithm sequence</li>
                          <li><strong>Execute Algorithms:</strong> Each algorithm transforms the bits</li>
                          <li><strong>Track Steps:</strong> Each operation is recorded with before/after states</li>
                          <li><strong>Check Policies:</strong> Constraints are validated after each step</li>
                          <li><strong>Calculate Score:</strong> Final scoring determines success</li>
                          <li><strong>Save Result:</strong> Complete execution is saved for replay</li>
                        </ol>
                        <div className="mt-3 p-2 bg-yellow-500/10 rounded border border-yellow-500/30">
                          <p className="text-xs"><strong>Budget System:</strong> Each operation has a cost. If budget runs out, execution stops.</p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="results">
                    <AccordionTrigger>Understanding Results</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm">
                        <p>After execution, results are saved and can be:</p>
                        <ul className="list-disc pl-4 space-y-1">
                          <li><strong>Viewed in Results Tab:</strong> Summary cards with metrics</li>
                          <li><strong>Opened in Player Mode:</strong> Step-by-step replay</li>
                          <li><strong>Exported as CSV/JSON/ZIP:</strong> For external analysis</li>
                          <li><strong>Compared:</strong> Multiple results side-by-side</li>
                        </ul>
                        <p className="mt-2">Each result stores:</p>
                        <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
                          <li>Initial and final binary data</li>
                          <li>Every transformation step with before/after states</li>
                          <li>Metrics at each step (entropy, balance, etc.)</li>
                          <li>Cost and budget usage</li>
                          <li>Memory windows and bit ranges affected</li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Player Mode Guide */}
          <TabsContent value="player" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileCode className="w-4 h-4" />
                  Player Mode Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Player Mode provides step-by-step replay of strategy executions, allowing deep analysis of each transformation.
                </p>

                <Accordion type="multiple" className="space-y-2">
                  <AccordionItem value="accessing">
                    <AccordionTrigger>Accessing Player Mode</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 text-sm">
                        <p>There are two ways to enter Player Mode:</p>
                        <ol className="list-decimal pl-4 space-y-1">
                          <li>From <strong>Results Tab</strong>: Click the Play button on any result card</li>
                          <li>From <strong>Algorithm Mode</strong>: After running a strategy, click "Open in Player"</li>
                        </ol>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Player Mode creates a temporary file for playback and locks file switching until you exit.
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="controls">
                    <AccordionTrigger>Playback Controls</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 bg-muted rounded flex items-center gap-2">
                            <span>⏮</span>
                            <span>Jump to first step</span>
                          </div>
                          <div className="p-2 bg-muted rounded flex items-center gap-2">
                            <span>⏭</span>
                            <span>Jump to last step</span>
                          </div>
                          <div className="p-2 bg-muted rounded flex items-center gap-2">
                            <span>◀</span>
                            <span>Previous step</span>
                          </div>
                          <div className="p-2 bg-muted rounded flex items-center gap-2">
                            <span>▶</span>
                            <span>Next step</span>
                          </div>
                          <div className="p-2 bg-muted rounded flex items-center gap-2">
                            <span>▶️/⏸</span>
                            <span>Play/Pause auto-playback</span>
                          </div>
                          <div className="p-2 bg-muted rounded flex items-center gap-2">
                            <span>🔄</span>
                            <span>Reset to beginning</span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Use the slider to scrub through steps or adjust playback speed (0.25x to 4x).
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="verification">
                    <AccordionTrigger>Verification Status</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm">
                        <p>Player Mode verifies that replaying all operations produces the same final result:</p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded">
                            <Badge className="bg-green-500/20 text-green-500">✓ Verified</Badge>
                            <span className="text-xs">Replay matches stored final bits exactly</span>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-red-500/10 rounded">
                            <Badge variant="destructive">Replay Mismatch</Badge>
                            <span className="text-xs">Replay differs from stored result (may indicate non-deterministic operations)</span>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-muted rounded">
                            <Badge variant="secondary">Verifying...</Badge>
                            <span className="text-xs">Currently reconstructing steps</span>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="highlights">
                    <AccordionTrigger>Understanding Highlights</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm">
                        <p>During playback, the Binary Viewer shows colored highlights:</p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-4 bg-cyan-500/30 border border-cyan-500/50 rounded"></div>
                            <span className="text-xs"><strong>Cyan:</strong> Bit ranges affected by the current operation</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-4 bg-yellow-500/20 border border-yellow-500/50 rounded"></div>
                            <span className="text-xs"><strong>Gold:</strong> Memory window (algorithm's view area)</span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          These highlights help visualize exactly which bits were accessed and modified at each step.
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="tabs">
                    <AccordionTrigger>Analysis Tabs</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm">
                        <div className="space-y-2">
                          <div className="p-2 bg-muted rounded">
                            <strong>Step Details:</strong> Operation name, parameters, bit ranges, memory window, and metrics at this step
                          </div>
                          <div className="p-2 bg-muted rounded">
                            <strong>Visual Diff:</strong> Side-by-side comparison of bits before and after, with changes highlighted
                          </div>
                          <div className="p-2 bg-muted rounded">
                            <strong>Metrics Timeline:</strong> Chart showing how metrics evolve over all steps
                          </div>
                          <div className="p-2 bg-muted rounded">
                            <strong>Binary Data:</strong> Full binary representation at current step with statistics
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="troubleshooting">
                    <AccordionTrigger>Troubleshooting</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm">
                        <div className="space-y-2">
                          <p><strong>Replay Mismatch:</strong></p>
                          <ul className="list-disc pl-4 text-xs text-muted-foreground">
                            <li>Operations may use randomness - results differ on replay</li>
                            <li>External state may have changed since execution</li>
                            <li>Check the Visual Diff tab to see exact differences</li>
                          </ul>
                        </div>
                        <div className="space-y-2">
                          <p><strong>No Results Available:</strong></p>
                          <ul className="list-disc pl-4 text-xs text-muted-foreground">
                            <li>Run a strategy first in Algorithm Mode</li>
                            <li>Results are stored in browser localStorage</li>
                            <li>Check Results Tab to confirm execution saved</li>
                          </ul>
                        </div>
                        <div className="space-y-2">
                          <p><strong>Highlights Not Showing:</strong></p>
                          <ul className="list-disc pl-4 text-xs text-muted-foreground">
                            <li>Ensure the Binary Viewer is visible</li>
                            <li>Some operations affect entire file (no specific range)</li>
                          </ul>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Encoding Guide */}
          <TabsContent value="encoding" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Binary className="w-4 h-4" />
                  Encoding Functions Guide
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  The encoding library provides functions for converting binary data between different representations. All functions work with binary strings (0s and 1s).
                </p>
                
                <Accordion type="multiple" className="space-y-2">
                  <AccordionItem value="gray">
                    <AccordionTrigger>Gray Code Encoding</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm mb-2">Gray code is a binary numeral system where two successive values differ in only one bit.</p>
                      <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">{`// Binary to Gray Code
import { EncodingFunctions } from '@/lib/encodingFunctions';

const binary = "1010";
const gray = EncodingFunctions.binaryToGray(binary);
// gray = "1111"

// Gray Code to Binary
const decoded = EncodingFunctions.grayToBinary(gray);
// decoded = "1010"

// Use case: Reduces transitions in sequential data
// Useful for error correction and reducing bit flips`}</pre>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="manchester">
                    <AccordionTrigger>Manchester Encoding</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm mb-2">Manchester encoding uses transitions to represent bits: 0→01, 1→10. Always has a transition in the middle of each bit period.</p>
                      <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">{`// Manchester Encode (doubles the length)
const data = "1010";
const encoded = EncodingFunctions.manchesterEncode(data);
// encoded = "10011001" (length doubled)

// Manchester Decode
const decoded = EncodingFunctions.manchesterDecode(encoded);
// decoded = "1010"

// Use case: Self-clocking, no DC component
// Common in Ethernet and RFID`}</pre>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="differential">
                    <AccordionTrigger>Differential Encoding</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm mb-2">Encodes data based on changes rather than absolute values. A change means 1, no change means 0.</p>
                      <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">{`// Differential Encode
const data = "11001010";
const encoded = EncodingFunctions.differentialEncode(data);
// First bit is same, then encode changes

// Differential Decode
const decoded = EncodingFunctions.differentialDecode(encoded);

// Use case: Immunity to polarity inversion
// Common in telecommunications`}</pre>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="nrzi">
                    <AccordionTrigger>NRZI Encoding</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm mb-2">Non-Return-to-Zero Inverted: transition on 1, no transition on 0.</p>
                      <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">{`// NRZI Encode
const data = "10110";
const encoded = EncodingFunctions.nrziEncode(data);
// Signal inverts on each 1

// NRZI Decode
const decoded = EncodingFunctions.nrziDecode(encoded);

// Use case: Used in USB, Fiber Channel
// Good for long strings of zeros`}</pre>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="hamming">
                    <AccordionTrigger>Hamming (7,4) Error Correction</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm mb-2">Adds parity bits to detect and correct single-bit errors. 4 data bits → 7 code bits.</p>
                      <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">{`// Hamming Encode (4 bits → 7 bits)
const data = "1011";
const encoded = EncodingFunctions.hammingEncode74(data);
// Adds 3 parity bits

// Hamming Decode (can correct 1-bit error)
const decoded = EncodingFunctions.hammingDecode74(encoded);

// Use case: Error detection and correction
// Used in memory systems, data transmission`}</pre>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="bitstuff">
                    <AccordionTrigger>Bit Stuffing (HDLC)</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm mb-2">Inserts a 0 after every five consecutive 1s to ensure sync patterns are unique.</p>
                      <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">{`// Bit Stuff (insert 0 after five 1s)
const data = "01111110111111";
const stuffed = EncodingFunctions.bitStuff(data);
// "011111010111110" (0 inserted after each 11111)

// Bit Unstuff
const unstuffed = EncodingFunctions.bitUnstuff(stuffed);

// Use case: Frame synchronization
// Used in HDLC, USB`}</pre>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="interleave">
                    <AccordionTrigger>Bit Interleaving</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm mb-2">Interleaves bits from two halves of data to spread burst errors.</p>
                      <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">{`// Interleave (spread bits)
const data = "11110000"; // first half: 1111, second: 0000
const interleaved = EncodingFunctions.interleave(data);
// "10101010"

// Deinterleave
const original = EncodingFunctions.deinterleave(interleaved);
// "11110000"

// Use case: Burst error protection
// Common in CD/DVD, wireless`}</pre>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compression Guide */}
          <TabsContent value="compression" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Compression Functions Guide
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  The compression library provides functions for reducing data size through various algorithms.
                </p>
                
                <Accordion type="multiple" className="space-y-2">
                  <AccordionItem value="rle">
                    <AccordionTrigger>Run-Length Encoding (RLE)</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm mb-2">Encodes sequences of identical bits as count + bit pairs.</p>
                      <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">{`import { CompressionFunctions } from '@/lib/encodingFunctions';

// RLE Encode
const data = "111111110000000011111111";
const encoded = CompressionFunctions.rleEncode(data);
// Format: 8-bit count + bit value
// "00001000 1 00000111 0 00001000 1"

// RLE Decode
const decoded = CompressionFunctions.rleDecode(encoded);

// Best for: Data with long runs of same bit
// Ratio: Excellent for sparse data, poor for random`}</pre>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="delta">
                    <AccordionTrigger>Delta Encoding</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm mb-2">Stores differences between consecutive bytes rather than absolute values.</p>
                      <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">{`// Delta Encode
const data = "0000000100000010000001000000011";
const encoded = CompressionFunctions.deltaEncode(data);
// Stores: first byte, then differences

// Delta Decode
const decoded = CompressionFunctions.deltaDecode(encoded);

// Best for: Sequential or slowly changing data
// Common in: Audio, sensor data, time series`}</pre>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="mtf">
                    <AccordionTrigger>Move-to-Front Transform</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm mb-2">Maintains a list of symbols and outputs their position, moving used symbols to front.</p>
                      <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">{`// MTF Encode
const data = "0000000000000001"; // Two bytes
const encoded = CompressionFunctions.mtfEncode(data);
// Repeated bytes become 0 (at front of list)

// MTF Decode
const decoded = CompressionFunctions.mtfDecode(encoded);

// Best for: Data with repeated patterns
// Often combined with BWT`}</pre>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="bwt">
                    <AccordionTrigger>Burrows-Wheeler Transform</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm mb-2">Reorganizes data to group similar characters together, improving compression.</p>
                      <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">{`// BWT Encode (block-based)
const data = "1010101010101010";
const transformed = CompressionFunctions.bwtEncode(data);
// Groups similar patterns together

// Note: This is a simplified implementation
// Full BWT requires storing the original index

// Best for: Text and structured data
// Used in: bzip2 compression`}</pre>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="lz77">
                    <AccordionTrigger>LZ77 Compression</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm mb-2">Dictionary-based compression using back-references to previously seen data.</p>
                      <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">{`// LZ77 Compress
const data = "10101010101010101010";
const { compressed, ratio } = CompressionFunctions.lz77Compress(data);
// Returns compressed data and compression ratio

// Format:
// 0 + literal bit (for new data)
// 1 + 5-bit offset + 4-bit length (for match)

// Best for: Data with repeated patterns
// Used in: ZIP, gzip, PNG`}</pre>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="bitplane">
                    <AccordionTrigger>Bit Plane Separation</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm mb-2">Separates bytes into 8 bit planes, grouping MSBs together, LSBs together.</p>
                      <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">{`// Separate into bit planes
const data = "1010101001010101"; // 2 bytes
const planes = CompressionFunctions.separateBitPlanes(data);
// planes[0] = all bit 7s
// planes[1] = all bit 6s
// ...
// planes[7] = all bit 0s

// Combine bit planes
const combined = CompressionFunctions.combineBitPlanes(planes);

// Best for: Image compression
// MSB planes often more compressible`}</pre>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="huffman">
                    <AccordionTrigger>Huffman Statistics</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm mb-2">Analyzes byte frequencies and calculates theoretical entropy.</p>
                      <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">{`// Get Huffman statistics
const data = "11111111000000001111111100000000";
const stats = CompressionFunctions.getHuffmanStats(data);

// stats.frequencies: Record of byte → count
// stats.entropy: Shannon entropy in bits/symbol

// Use for: Estimating compression potential
// Lower entropy = better compression possible`}</pre>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <div className="mt-4 p-3 bg-primary/10 rounded border border-primary/30">
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Using in Strategies
                  </h4>
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">{`// Import in your algorithm files
import { EncodingFunctions, CompressionFunctions, AnalysisFunctions } from '@/lib/encodingFunctions';

// In algorithm:
function optimize(bits) {
  // Try different encodings
  const gray = EncodingFunctions.binaryToGray(bits);
  const grayEntropy = AnalysisFunctions.calculateEntropy(gray);
  
  // Try compression
  const { compressed, ratio } = CompressionFunctions.lz77Compress(bits);
  
  // Choose best transformation
  if (grayEntropy < originalEntropy) {
    return gray;
  }
  return bits;
}`}</pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scheduler Guide */}
          <TabsContent value="scheduler" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileCode className="w-4 h-4" />
                  Scheduler Files Guide
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Schedulers orchestrate the execution flow of your strategy. They determine which algorithms to run and in what order.
                </p>
                
                <Accordion type="multiple" className="space-y-2">
                  <AccordionItem value="ex1">
                    <AccordionTrigger>Example 1: Simple Sequential Scheduler</AccordionTrigger>
                    <AccordionContent>
                      <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">{`# Simple Sequential Scheduler
# Runs algorithms one after another

def schedule(bits, context):
    """
    Main scheduler entry point
    Args:
        bits: Current binary string
        context: Execution context with helpers
    Returns:
        List of algorithm calls to execute
    """
    return [
        {"algorithm": "entropy_reducer", "params": {}},
        {"algorithm": "pattern_optimizer", "params": {"min_length": 4}},
        {"algorithm": "cleanup", "params": {}}
    ]`}</pre>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="ex2">
                    <AccordionTrigger>Example 2: Conditional Scheduler</AccordionTrigger>
                    <AccordionContent>
                      <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">{`# Conditional Scheduler
# Chooses algorithms based on data analysis

def schedule(bits, context):
    entropy = context.get_metric("entropy", bits)
    
    algorithms = []
    
    if entropy > 0.9:
        # High entropy - need aggressive reduction
        algorithms.append({"algorithm": "aggressive_reducer", "params": {"iterations": 5}})
    elif entropy > 0.5:
        # Medium entropy - standard approach
        algorithms.append({"algorithm": "standard_optimizer", "params": {}})
    else:
        # Low entropy - light touch
        algorithms.append({"algorithm": "pattern_enhancer", "params": {}})
    
    # Always run cleanup at the end
    algorithms.append({"algorithm": "cleanup", "params": {}})
    
    return algorithms`}</pre>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="ex3">
                    <AccordionTrigger>Example 3: Budget-Aware Scheduler</AccordionTrigger>
                    <AccordionContent>
                      <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">{`# Budget-Aware Scheduler
# Manages algorithm execution within budget constraints

def schedule(bits, context):
    budget = context.get_budget()
    algorithms = []
    
    # High-cost but effective algorithm
    if budget > 500:
        algorithms.append({
            "algorithm": "deep_analysis",
            "params": {},
            "estimated_cost": 300
        })
        budget -= 300
    
    # Medium-cost algorithms
    while budget > 50:
        algorithms.append({
            "algorithm": "quick_optimize",
            "params": {},
            "estimated_cost": 50
        })
        budget -= 50
    
    return algorithms`}</pre>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Algorithm Guide */}
          <TabsContent value="algorithm" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  Algorithm Files Guide
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Algorithm files contain the transformation logic that modifies binary data.
                </p>
                
                <Accordion type="multiple" className="space-y-2">
                  <AccordionItem value="ex1">
                    <AccordionTrigger>Example 1: Entropy Reducer</AccordionTrigger>
                    <AccordionContent>
                      <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">{`# Entropy Reducer Algorithm
def run(bits, params, context):
    result = bits
    
    # Find repeating patterns
    patterns = context.find_patterns(result, min_length=4)
    
    for pattern in patterns:
        if pattern.count > 3:
            # Apply XOR to reduce pattern entropy
            mask = pattern.sequence * (len(result) // len(pattern.sequence))
            result = context.execute_op("XOR", result, {"mask": mask})
    
    return result`}</pre>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="ex2">
                    <AccordionTrigger>Example 2: Run Length Optimizer</AccordionTrigger>
                    <AccordionContent>
                      <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">{`# Run Length Optimizer
def run(bits, params, context):
    min_run = params.get("min_run", 8)
    result = bits
    
    # Find long runs of 1s or 0s
    runs = context.find_runs(result, min_length=min_run)
    
    for run in runs:
        if run.length > min_run * 2:
            mid = run.start + run.length // 2
            segment_length = run.length // 4
            result = context.execute_op_range(
                "NOT", result,
                {"start": mid, "end": mid + segment_length}
            )
    
    return result`}</pre>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scoring Guide */}
          <TabsContent value="scoring" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Scoring Files Guide
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Scoring files define the budget system and success metrics.
                </p>
                
                <Accordion type="multiple" className="space-y-2">
                  <AccordionItem value="ex1">
                    <AccordionTrigger>Budget Configuration</AccordionTrigger>
                    <AccordionContent>
                      <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">{`# Budget is defined in scoring files
INITIAL_BUDGET = 1000

OPERATION_COSTS = {
    "NOT": 1,
    "AND": 2,
    "OR": 2,
    "XOR": 2,
    "left_shift": 1,
    "right_shift": 1
}

def calculate_score(context):
    budget_used = context.get_total_cost()
    budget_remaining = INITIAL_BUDGET - budget_used
    entropy_reduction = context.get_entropy_change()
    
    return {
        "score": entropy_reduction * budget_remaining,
        "budget_remaining": budget_remaining,
        "success": budget_remaining >= 100
    }`}</pre>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Policies Guide */}
          <TabsContent value="policies" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Policy Files Guide
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Policy files enforce constraints and validate algorithm behavior.
                </p>
                
                <Accordion type="multiple" className="space-y-2">
                  <AccordionItem value="ex1">
                    <AccordionTrigger>Example: Validation Policy</AccordionTrigger>
                    <AccordionContent>
                      <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">{`POLICY_CONFIG = {
    "max_size_multiplier": 2.0,
    "min_size_multiplier": 0.1,
    "max_entropy": 0.999,
    "min_budget_remaining": 0.05,
}

def validate_all(initial_size, initial_entropy, initial_budget):
    bits = get_bits()
    
    # Size check
    ratio = len(bits) / initial_size
    if ratio > POLICY_CONFIG["max_size_multiplier"]:
        return False, "Size exceeded"
    
    return True, "All checks passed"`}</pre>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Anomalies Guide */}
          <TabsContent value="anomalies" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Custom Anomaly Detection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Define custom anomaly detection functions in Backend → Anomalies tab.
                </p>
                
                <Accordion type="multiple" className="space-y-2">
                  <AccordionItem value="ex1">
                    <AccordionTrigger>Detection Function Structure</AccordionTrigger>
                    <AccordionContent>
                      <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">{`function detect(bits, minLength) {
  // bits: string of 0s and 1s
  // minLength: minimum length to detect
  
  const results = [];
  
  // Your detection logic here
  // Example: find long runs
  let start = 0, len = 1;
  for (let i = 1; i < bits.length; i++) {
    if (bits[i] === bits[i-1]) {
      len++;
    } else {
      if (len >= minLength) {
        results.push({ position: start, length: len });
      }
      start = i;
      len = 1;
    }
  }
  
  return results;
}`}</pre>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Operations Guide */}
          <TabsContent value="operations" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Cog className="w-4 h-4" />
                  Operations Reference
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Available operations for use in algorithms.
                </p>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-muted rounded">
                    <Badge variant="outline" className="mb-1">NOT</Badge>
                    <p className="text-muted-foreground">Invert all bits</p>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <Badge variant="outline" className="mb-1">XOR</Badge>
                    <p className="text-muted-foreground">XOR with mask</p>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <Badge variant="outline" className="mb-1">AND</Badge>
                    <p className="text-muted-foreground">AND with mask</p>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <Badge variant="outline" className="mb-1">OR</Badge>
                    <p className="text-muted-foreground">OR with mask</p>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <Badge variant="outline" className="mb-1">left_shift</Badge>
                    <p className="text-muted-foreground">Shift bits left</p>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <Badge variant="outline" className="mb-1">right_shift</Badge>
                    <p className="text-muted-foreground">Shift bits right</p>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <Badge variant="outline" className="mb-1">reverse</Badge>
                    <p className="text-muted-foreground">Reverse bit order</p>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <Badge variant="outline" className="mb-1">rotate_left</Badge>
                    <p className="text-muted-foreground">Circular shift left</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Metrics Guide */}
          <TabsContent value="metrics" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  Metrics Reference
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Available metrics for analysis and scoring.
                </p>
                
                <div className="space-y-2 text-xs">
                  <div className="p-2 bg-muted rounded flex justify-between">
                    <span className="font-medium">entropy</span>
                    <span className="text-muted-foreground">Shannon entropy (0-1)</span>
                  </div>
                  <div className="p-2 bg-muted rounded flex justify-between">
                    <span className="font-medium">balance</span>
                    <span className="text-muted-foreground">Ratio of 1s to total</span>
                  </div>
                  <div className="p-2 bg-muted rounded flex justify-between">
                    <span className="font-medium">run_count</span>
                    <span className="text-muted-foreground">Number of consecutive runs</span>
                  </div>
                  <div className="p-2 bg-muted rounded flex justify-between">
                    <span className="font-medium">longest_run</span>
                    <span className="text-muted-foreground">Longest same-bit sequence</span>
                  </div>
                  <div className="p-2 bg-muted rounded flex justify-between">
                    <span className="font-medium">transitions</span>
                    <span className="text-muted-foreground">Count of 0↔1 changes</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
};
