/**
 * Metrics Code Editor - Write and edit metric formulas with full documentation
 * Supports both formula documentation mode and executable JavaScript code mode
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Calculator,
  Save,
  Plus,
  Trash2,
  Code,
  Info,
  Link,
  Play,
  CheckCircle2,
  XCircle,
  FileCode,
} from 'lucide-react';
import { toast } from 'sonner';
import { predefinedManager, PredefinedMetric } from '@/lib/predefinedManager';
import { fileSystemManager } from '@/lib/fileSystemManager';

interface MetricReference {
  usedIn: string[];
  dependsOn: string[];
  formula: string;
}

const DEFAULT_METRIC_CODE = `function calculate(bits) {
  // bits is a string of '0' and '1'
  // Return a number
  let ones = 0;
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') ones++;
  }
  return ones / bits.length;
}`;

// Built-in metric code snippets for display - ALL metrics with implementations
const BUILTIN_METRIC_CODE: Record<string, string> = {
  'entropy': `function calculate(bits) {
  if (bits.length === 0) return 0;
  const ones = (bits.match(/1/g) || []).length;
  const p1 = ones / bits.length;
  const p0 = 1 - p1;
  if (p1 === 0 || p1 === 1) return 0;
  return -(p1 * Math.log2(p1) + p0 * Math.log2(p0));
}`,
  'balance': `function calculate(bits) {
  if (bits.length === 0) return 0.5;
  const ones = (bits.match(/1/g) || []).length;
  return ones / bits.length;
}`,
  'hamming_weight': `function calculate(bits) {
  return (bits.match(/1/g) || []).length;
}`,
  'transition_count': `function calculate(bits) {
  let transitions = 0;
  for (let i = 1; i < bits.length; i++) {
    if (bits[i] !== bits[i-1]) transitions++;
  }
  return transitions;
}`,
  'run_length_avg': `function calculate(bits) {
  if (bits.length === 0) return 0;
  let runs = 1;
  for (let i = 1; i < bits.length; i++) {
    if (bits[i] !== bits[i-1]) runs++;
  }
  return bits.length / runs;
}`,
  'compression_ratio': `function calculate(bits) {
  const patterns = new Set();
  for (let i = 0; i <= bits.length - 8; i++) {
    patterns.add(bits.slice(i, i + 8));
  }
  const uniqueRatio = patterns.size / Math.max(1, bits.length / 8);
  return 1 / Math.max(0.01, uniqueRatio);
}`,
  'longest_run_zeros': `function calculate(bits) {
  let max = 0, current = 0;
  for (const bit of bits) {
    if (bit === '0') { current++; max = Math.max(max, current); }
    else current = 0;
  }
  return max;
}`,
  'longest_run_ones': `function calculate(bits) {
  let max = 0, current = 0;
  for (const bit of bits) {
    if (bit === '1') { current++; max = Math.max(max, current); }
    else current = 0;
  }
  return max;
}`,
  'bit_density': `function calculate(bits) {
  if (bits.length === 0) return 0;
  const ones = (bits.match(/1/g) || []).length;
  return ones / bits.length;
}`,
  'runs_count': `function calculate(bits) {
  if (bits.length === 0) return 0;
  let runs = 1;
  for (let i = 1; i < bits.length; i++) {
    if (bits[i] !== bits[i-1]) runs++;
  }
  return runs;
}`,
  'chi_square': `function calculate(bits) {
  const n = bits.length;
  const ones = (bits.match(/1/g) || []).length;
  const zeros = n - ones;
  const expected = n / 2;
  return Math.pow(ones - expected, 2) / expected + Math.pow(zeros - expected, 2) / expected;
}`,
  'serial_correlation': `function calculate(bits) {
  if (bits.length < 2) return 0;
  let sum = 0, sumSq = 0, sumProd = 0;
  for (let i = 0; i < bits.length - 1; i++) {
    const a = bits[i] === '1' ? 1 : 0;
    const b = bits[i+1] === '1' ? 1 : 0;
    sum += a; sumSq += a*a; sumProd += a*b;
  }
  const mean = sum / (bits.length - 1);
  const variance = sumSq / (bits.length - 1) - mean * mean;
  if (variance === 0) return 0;
  return (sumProd / (bits.length - 1) - mean * mean) / variance;
}`,
  'autocorrelation': `function calculate(bits) {
  if (bits.length < 2) return 0;
  let matches = 0;
  for (let i = 0; i < bits.length - 1; i++) {
    if (bits[i] === bits[i + 1]) matches++;
  }
  return matches / (bits.length - 1);
}`,
  'variance': `function calculate(bits) {
  const mean = (bits.match(/1/g) || []).length / bits.length;
  let sum = 0;
  for (const bit of bits) {
    const val = bit === '1' ? 1 : 0;
    sum += (val - mean) ** 2;
  }
  return sum / bits.length;
}`,
  'standard_deviation': `function calculate(bits) {
  const mean = (bits.match(/1/g) || []).length / bits.length;
  let sum = 0;
  for (const bit of bits) {
    const val = bit === '1' ? 1 : 0;
    sum += (val - mean) ** 2;
  }
  return Math.sqrt(sum / bits.length);
}`,
  'skewness': `function calculate(bits) {
  const n = bits.length;
  const ones = (bits.match(/1/g) || []).length;
  const mean = ones / n;
  const variance = mean * (1 - mean);
  if (variance === 0) return 0;
  let m3 = 0;
  for (const bit of bits) {
    const val = bit === '1' ? 1 : 0;
    m3 += (val - mean) ** 3;
  }
  return (m3 / n) / Math.pow(variance, 1.5);
}`,
  'kurtosis': `function calculate(bits) {
  const n = bits.length;
  const ones = (bits.match(/1/g) || []).length;
  const mean = ones / n;
  const variance = mean * (1 - mean);
  if (variance === 0) return 0;
  let m4 = 0;
  for (const bit of bits) {
    const val = bit === '1' ? 1 : 0;
    m4 += (val - mean) ** 4;
  }
  return (m4 / n) / (variance ** 2) - 3;
}`,
  'transition_rate': `function calculate(bits) {
  if (bits.length < 2) return 0;
  let transitions = 0;
  for (let i = 1; i < bits.length; i++) {
    if (bits[i] !== bits[i-1]) transitions++;
  }
  return transitions / (bits.length - 1);
}`,
  'transition_entropy': `function calculate(bits) {
  if (bits.length < 2) return 0;
  let trans = {t00: 0, t01: 0, t10: 0, t11: 0};
  for (let i = 0; i < bits.length - 1; i++) {
    const key = 't' + bits[i] + bits[i+1];
    trans[key]++;
  }
  const total = bits.length - 1;
  let entropy = 0;
  for (const key in trans) {
    const p = trans[key] / total;
    if (p > 0) entropy -= p * Math.log2(p);
  }
  return entropy;
}`,
  'pattern_diversity': `function calculate(bits) {
  if (bits.length < 8) return 0;
  const patterns = new Set();
  for (let i = 0; i <= bits.length - 8; i++) {
    patterns.add(bits.substring(i, i + 8));
  }
  return patterns.size / 256;
}`,
  'ideality': `function calculate(bits) {
  const ones = (bits.match(/1/g) || []).length;
  const ratio = bits.length > 0 ? ones / bits.length : 0.5;
  return 1 - Math.abs(ratio - 0.5) * 2;
}`,
  'kolmogorov_estimate': `function calculate(bits) {
  const seen = new Set();
  let complexity = 0;
  let current = '';
  for (const bit of bits) {
    current += bit;
    if (!seen.has(current)) {
      seen.add(current);
      complexity++;
      current = '';
    }
  }
  return complexity * 8;
}`,
  'bias_percentage': `function calculate(bits) {
  const ones = (bits.match(/1/g) || []).length;
  const ratio = ones / bits.length;
  return Math.abs(ratio - 0.5) * 200;
}`,
  'block_entropy_8': `function calculate(bits) {
  if (bits.length < 8) return 0;
  const blocks = [];
  for (let i = 0; i < bits.length - 7; i += 8) {
    blocks.push(bits.substring(i, i + 8));
  }
  let totalEntropy = 0;
  for (const block of blocks) {
    const ones = (block.match(/1/g) || []).length;
    const p = ones / 8;
    if (p > 0 && p < 1) {
      totalEntropy += -p * Math.log2(p) - (1-p) * Math.log2(1-p);
    }
  }
  return blocks.length > 0 ? totalEntropy / blocks.length : 0;
}`,
  'block_entropy_16': `function calculate(bits) {
  if (bits.length < 16) return 0;
  const blocks = [];
  for (let i = 0; i < bits.length - 15; i += 16) {
    blocks.push(bits.substring(i, i + 16));
  }
  let totalEntropy = 0;
  for (const block of blocks) {
    const ones = (block.match(/1/g) || []).length;
    const p = ones / 16;
    if (p > 0 && p < 1) {
      totalEntropy += -p * Math.log2(p) - (1-p) * Math.log2(1-p);
    }
  }
  return blocks.length > 0 ? totalEntropy / blocks.length : 0;
}`,
  'conditional_entropy': `function calculate(bits) {
  const pairs = {};
  const singles = {};
  for (let i = 0; i < bits.length - 1; i++) {
    const pair = bits[i] + bits[i + 1];
    pairs[pair] = (pairs[pair] || 0) + 1;
    singles[bits[i + 1]] = (singles[bits[i + 1]] || 0) + 1;
  }
  const total = bits.length - 1;
  let jointEntropy = 0;
  for (const p of Object.values(pairs)) {
    const prob = p / total;
    if (prob > 0) jointEntropy -= prob * Math.log2(prob);
  }
  let singlesEntropy = 0;
  for (const s of Object.values(singles)) {
    const prob = s / total;
    if (prob > 0) singlesEntropy -= prob * Math.log2(prob);
  }
  return jointEntropy - singlesEntropy;
}`,
  'mutual_info': `function calculate(bits) {
  const ones = (bits.match(/1/g) || []).length;
  const p1 = ones / bits.length;
  const p0 = 1 - p1;
  const hx = p1 > 0 && p1 < 1 ? -p1 * Math.log2(p1) - p0 * Math.log2(p0) : 0;
  const pairs = {};
  for (let i = 0; i < bits.length - 1; i++) {
    const pair = bits[i] + bits[i + 1];
    pairs[pair] = (pairs[pair] || 0) + 1;
  }
  const total = bits.length - 1;
  let jointEntropy = 0;
  for (const p of Object.values(pairs)) {
    const prob = p / total;
    if (prob > 0) jointEntropy -= prob * Math.log2(prob);
  }
  return Math.max(0, 2 * hx - jointEntropy);
}`,
  'joint_entropy': `function calculate(bits) {
  const pairs = {};
  for (let i = 0; i < bits.length - 1; i++) {
    const pair = bits[i] + bits[i + 1];
    pairs[pair] = (pairs[pair] || 0) + 1;
  }
  const total = bits.length - 1;
  let entropy = 0;
  for (const p of Object.values(pairs)) {
    const prob = p / total;
    if (prob > 0) entropy -= prob * Math.log2(prob);
  }
  return entropy;
}`,
  'lempel_ziv': `function calculate(bits) {
  const seen = new Set();
  let complexity = 0;
  let current = '';
  for (const bit of bits) {
    current += bit;
    if (!seen.has(current)) {
      seen.add(current);
      complexity++;
      current = '';
    }
  }
  if (current.length > 0) complexity++;
  return complexity / (bits.length / Math.log2(bits.length + 1));
}`,
  'min_entropy': `function calculate(bits) {
  const ones = (bits.match(/1/g) || []).length;
  const zeros = bits.length - ones;
  const maxProb = Math.max(ones, zeros) / bits.length;
  return -Math.log2(maxProb);
}`,
  'leading_zeros': `function calculate(bits) {
  let count = 0;
  for (const bit of bits) {
    if (bit === '1') break;
    count++;
  }
  return count;
}`,
  'trailing_zeros': `function calculate(bits) {
  let count = 0;
  for (let i = bits.length - 1; i >= 0; i--) {
    if (bits[i] === '1') break;
    count++;
  }
  return count;
}`,
  'parity': `function calculate(bits) {
  let parity = 0;
  for (const bit of bits) {
    if (bit === '1') parity ^= 1;
  }
  return parity;
}`,
  'rise_count': `function calculate(bits) {
  let count = 0;
  for (let i = 1; i < bits.length; i++) {
    if (bits[i - 1] === '0' && bits[i] === '1') count++;
  }
  return count;
}`,
  'fall_count': `function calculate(bits) {
  let count = 0;
  for (let i = 1; i < bits.length; i++) {
    if (bits[i - 1] === '1' && bits[i] === '0') count++;
  }
  return count;
}`,
  'toggle_rate': `function calculate(bits) {
  let transitions = 0;
  for (let i = 1; i < bits.length; i++) {
    if (bits[i] !== bits[i - 1]) transitions++;
  }
  return transitions / (bits.length - 1);
}`,
  'symmetry_index': `function calculate(bits) {
  let matches = 0;
  const half = Math.floor(bits.length / 2);
  for (let i = 0; i < half; i++) {
    if (bits[i] === bits[bits.length - 1 - i]) matches++;
  }
  return matches / half;
}`,
  'monobit_test': `function calculate(bits) {
  const ones = (bits.match(/1/g) || []).length;
  const s = Math.abs(ones - (bits.length - ones));
  return s / Math.sqrt(bits.length);
}`,
  'runs_test': `function calculate(bits) {
  let runs = 1;
  for (let i = 1; i < bits.length; i++) {
    if (bits[i] !== bits[i - 1]) runs++;
  }
  return runs;
}`,
  'poker_test': `function calculate(bits) {
  const counts = {};
  for (let i = 0; i <= bits.length - 4; i += 4) {
    const pattern = bits.slice(i, i + 4);
    counts[pattern] = (counts[pattern] || 0) + 1;
  }
  const m = Math.floor(bits.length / 4);
  if (m === 0) return 0;
  let sum = 0;
  for (const count of Object.values(counts)) {
    sum += count * count;
  }
  return (16 / m) * sum - m;
}`,
  'renyi_entropy': `function calculate(bits) {
  const ones = bits.split('').filter(b => b === '1').length;
  const zeros = bits.length - ones;
  if (ones === 0 || zeros === 0) return 0;
  const p1 = ones / bits.length;
  const p0 = zeros / bits.length;
  return -Math.log2(p0 * p0 + p1 * p1);
}`,
  'popcount': `function calculate(bits) {
  return (bits.match(/1/g) || []).length;
}`,
  'unique_ngrams_2': `function calculate(bits) {
  const seen = new Set();
  for (let i = 0; i <= bits.length - 2; i++) {
    seen.add(bits.slice(i, i + 2));
  }
  return seen.size;
}`,
  'unique_ngrams_4': `function calculate(bits) {
  const seen = new Set();
  for (let i = 0; i <= bits.length - 4; i++) {
    seen.add(bits.slice(i, i + 4));
  }
  return seen.size;
}`,
  'unique_ngrams_8': `function calculate(bits) {
  const seen = new Set();
  for (let i = 0; i <= bits.length - 8; i++) {
    seen.add(bits.slice(i, i + 8));
  }
  return seen.size;
}`,
  'median': `function calculate(bits) {
  const bytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8).padEnd(8, '0'), 2));
  }
  if (bytes.length === 0) return 0;
  bytes.sort((a, b) => a - b);
  const mid = Math.floor(bytes.length / 2);
  return bytes.length % 2 !== 0 ? bytes[mid] : (bytes[mid - 1] + bytes[mid]) / 2;
}`,
  'mode': `function calculate(bits) {
  const counts = {};
  for (let i = 0; i < bits.length; i += 8) {
    const byte = parseInt(bits.slice(i, i + 8).padEnd(8, '0'), 2);
    counts[byte] = (counts[byte] || 0) + 1;
  }
  let maxCount = 0, mode = 0;
  for (const [val, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      mode = parseInt(val);
    }
  }
  return mode;
}`,
  'range': `function calculate(bits) {
  let min = 255, max = 0;
  for (let i = 0; i < bits.length; i += 8) {
    const byte = parseInt(bits.slice(i, i + 8).padEnd(8, '0'), 2);
    if (byte < min) min = byte;
    if (byte > max) max = byte;
  }
  return max - min;
}`,
  'iqr': `function calculate(bits) {
  const bytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8).padEnd(8, '0'), 2));
  }
  if (bytes.length < 4) return 0;
  bytes.sort((a, b) => a - b);
  const q1 = bytes[Math.floor(bytes.length * 0.25)];
  const q3 = bytes[Math.floor(bytes.length * 0.75)];
  return q3 - q1;
}`,
  'std_dev': `function calculate(bits) {
  const bytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8).padEnd(8, '0'), 2));
  }
  if (bytes.length === 0) return 0;
  const mean = bytes.reduce((a, b) => a + b, 0) / bytes.length;
  const variance = bytes.reduce((sum, b) => sum + Math.pow(b - mean, 2), 0) / bytes.length;
  return Math.sqrt(variance);
}`,
  'longest_repeat': `function calculate(bits) {
  let maxLen = 0;
  for (let len = 1; len <= bits.length / 2; len++) {
    for (let i = 0; i <= bits.length - len * 2; i++) {
      const pattern = bits.slice(i, i + len);
      if (bits.indexOf(pattern, i + len) !== -1) {
        maxLen = len;
      }
    }
    if (maxLen < len - 1) break;
  }
  return maxLen;
}`,
  'periodicity': `function calculate(bits) {
  for (let period = 1; period <= bits.length / 2; period++) {
    let match = true;
    for (let i = period; i < bits.length && match; i++) {
      if (bits[i] !== bits[i % period]) match = false;
    }
    if (match) return period;
  }
  return bits.length;
}`,
  'rise_fall_ratio': `function calculate(bits) {
  let rises = 0, falls = 0;
  for (let i = 1; i < bits.length; i++) {
    if (bits[i - 1] === '0' && bits[i] === '1') rises++;
    if (bits[i - 1] === '1' && bits[i] === '0') falls++;
  }
  if (falls === 0) return rises > 0 ? 999 : 1;
  return rises / falls;
}`,
  'max_stable_run': `function calculate(bits) {
  let maxRun = 1, currentRun = 1;
  for (let i = 1; i < bits.length; i++) {
    if (bits[i] === bits[i - 1]) {
      currentRun++;
      if (currentRun > maxRun) maxRun = currentRun;
    } else {
      currentRun = 1;
    }
  }
  return maxRun;
}`,
  'avg_stable_run': `function calculate(bits) {
  let runs = 0, totalLen = 0, currentLen = 1;
  for (let i = 1; i <= bits.length; i++) {
    if (i < bits.length && bits[i] === bits[i - 1]) {
      currentLen++;
    } else {
      runs++;
      totalLen += currentLen;
      currentLen = 1;
    }
  }
  return runs > 0 ? totalLen / runs : 0;
}`,
  'byte_entropy': `function calculate(bits) {
  const counts = {};
  let total = 0;
  for (let i = 0; i < bits.length; i += 8) {
    const byte = parseInt(bits.slice(i, i + 8).padEnd(8, '0'), 2);
    counts[byte] = (counts[byte] || 0) + 1;
    total++;
  }
  if (total === 0) return 0;
  let entropy = 0;
  for (const count of Object.values(counts)) {
    const p = count / total;
    if (p > 0) entropy -= p * Math.log2(p);
  }
  return entropy;
}`,
  'nibble_entropy': `function calculate(bits) {
  const counts = {};
  let total = 0;
  for (let i = 0; i < bits.length; i += 4) {
    const nibble = parseInt(bits.slice(i, i + 4).padEnd(4, '0'), 2);
    counts[nibble] = (counts[nibble] || 0) + 1;
    total++;
  }
  if (total === 0) return 0;
  let entropy = 0;
  for (const count of Object.values(counts)) {
    const p = count / total;
    if (p > 0) entropy -= p * Math.log2(p);
  }
  return entropy;
}`,
  'spectral_flatness': `function calculate(bits) {
  const bytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8).padEnd(8, '0'), 2));
  }
  if (bytes.length === 0) return 0;
  const geoMean = Math.exp(bytes.reduce((sum, b) => sum + Math.log(b + 1), 0) / bytes.length);
  const arithMean = bytes.reduce((sum, b) => sum + b, 0) / bytes.length;
  if (arithMean === 0) return 0;
  return geoMean / (arithMean + 1);
}`,
  'byte_alignment': `function calculate(bits) {
  return bits.length % 8 === 0 ? 1 : 0;
}`,
  'word_alignment': `function calculate(bits) {
  return bits.length % 32 === 0 ? 1 : 0;
}`,
  'header_size': `function calculate(bits) {
  // Detect first entropy transition point
  const blockSize = 64;
  let prevEntropy = null;
  for (let i = 0; i < bits.length - blockSize; i += blockSize) {
    const block = bits.slice(i, i + blockSize);
    const ones = (block.match(/1/g) || []).length;
    const p = ones / blockSize;
    const entropy = p > 0 && p < 1 ? -p * Math.log2(p) - (1-p) * Math.log2(1-p) : 0;
    if (prevEntropy !== null && Math.abs(entropy - prevEntropy) > 0.3) {
      return i;
    }
    prevEntropy = entropy;
  }
  return 0;
}`,
  'footer_size': `function calculate(bits) {
  const blockSize = 64;
  let prevEntropy = null;
  let lastTransition = bits.length;
  for (let i = bits.length - blockSize; i >= 0; i -= blockSize) {
    const block = bits.slice(i, i + blockSize);
    const ones = (block.match(/1/g) || []).length;
    const p = ones / blockSize;
    const entropy = p > 0 && p < 1 ? -p * Math.log2(p) - (1-p) * Math.log2(1-p) : 0;
    if (prevEntropy !== null && Math.abs(entropy - prevEntropy) > 0.3) {
      return bits.length - i - blockSize;
    }
    prevEntropy = entropy;
  }
  return 0;
}`,
  'fractal_dimension': `function calculate(bits) {
  // Box-counting dimension approximation
  const sizes = [4, 8, 16, 32, 64];
  const counts = [];
  for (const size of sizes) {
    const boxes = new Set();
    for (let i = 0; i < bits.length; i += size) {
      const box = bits.slice(i, i + size);
      if (box.includes('1')) boxes.add(i / size);
    }
    counts.push({ size, count: boxes.size });
  }
  if (counts.length < 2) return 1;
  // Linear regression on log-log
  const logData = counts.map(c => ({ x: Math.log(1/c.size), y: Math.log(c.count) }));
  const n = logData.length;
  const sumX = logData.reduce((s, d) => s + d.x, 0);
  const sumY = logData.reduce((s, d) => s + d.y, 0);
  const sumXY = logData.reduce((s, d) => s + d.x * d.y, 0);
  const sumX2 = logData.reduce((s, d) => s + d.x * d.x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return Math.abs(slope);
}`,
  'logical_depth': `function calculate(bits) {
  // Estimate computational depth based on structure
  const lzComplexity = (() => {
    const seen = new Set();
    let c = 0, current = '';
    for (const bit of bits) {
      current += bit;
      if (!seen.has(current)) { seen.add(current); c++; current = ''; }
    }
    return c;
  })();
  const entropy = (() => {
    const ones = (bits.match(/1/g) || []).length;
    const p = ones / bits.length;
    return p > 0 && p < 1 ? -p * Math.log2(p) - (1-p) * Math.log2(1-p) : 0;
  })();
  return lzComplexity * entropy;
}`,
  'effective_complexity': `function calculate(bits) {
  // Non-random complexity estimate
  const entropy = (() => {
    const ones = (bits.match(/1/g) || []).length;
    const p = ones / bits.length;
    return p > 0 && p < 1 ? -p * Math.log2(p) - (1-p) * Math.log2(1-p) : 0;
  })();
  const patterns = new Set();
  for (let i = 0; i <= bits.length - 8; i++) {
    patterns.add(bits.slice(i, i + 8));
  }
  const diversity = patterns.size / 256;
  return entropy * diversity * bits.length / 8;
}`,
  'spectral_test': `function calculate(bits) {
  // DFT-based periodicity test
  const n = Math.min(bits.length, 512);
  let sumCos = 0, sumSin = 0;
  for (let k = 1; k <= n / 2; k++) {
    let realSum = 0, imagSum = 0;
    for (let j = 0; j < n; j++) {
      const angle = 2 * Math.PI * k * j / n;
      const val = bits[j] === '1' ? 1 : -1;
      realSum += val * Math.cos(angle);
      imagSum += val * Math.sin(angle);
    }
    const magnitude = Math.sqrt(realSum * realSum + imagSum * imagSum);
    if (magnitude > Math.sqrt(n) * 0.95) sumCos++;
  }
  return sumCos / (n / 2);
}`,
  'block_entropy': `function calculate(bits) {
  const blockSize = 16;
  const blocks = [];
  for (let i = 0; i < bits.length; i += blockSize) {
    blocks.push(bits.slice(i, i + blockSize));
  }
  const counts = {};
  for (const block of blocks) {
    counts[block] = (counts[block] || 0) + 1;
  }
  const total = blocks.length;
  let entropy = 0;
  for (const count of Object.values(counts)) {
    const p = count / total;
    if (p > 0) entropy -= p * Math.log2(p);
  }
  return entropy;
}`,
  'time_stamp': `function calculate(bits) {
  return Date.now();
}`,
  'mad': `function calculate(bits) {
  const bytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8).padEnd(8, '0'), 2));
  }
  if (bytes.length === 0) return 0;
  const mean = bytes.reduce((a, b) => a + b, 0) / bytes.length;
  return bytes.reduce((sum, b) => sum + Math.abs(b - mean), 0) / bytes.length;
}`,
  'cv': `function calculate(bits) {
  const bytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8).padEnd(8, '0'), 2));
  }
  if (bytes.length === 0) return 0;
  const mean = bytes.reduce((a, b) => a + b, 0) / bytes.length;
  if (mean === 0) return 0;
  const variance = bytes.reduce((sum, b) => sum + Math.pow(b - mean, 2), 0) / bytes.length;
  return Math.sqrt(variance) / mean;
}`,
  'lz77_estimate': `function calculate(bits) {
  const seen = new Map();
  let compressedBits = 0;
  let i = 0;
  while (i < bits.length) {
    let maxLen = 0;
    for (let len = 1; len <= Math.min(255, bits.length - i); len++) {
      const pattern = bits.slice(i, i + len);
      if (seen.has(pattern)) maxLen = len;
    }
    if (maxLen >= 3) {
      compressedBits += 16;
      i += maxLen;
    } else {
      compressedBits += 9;
      seen.set(bits.slice(i, i + 1), i);
      i++;
    }
  }
  return bits.length / Math.max(1, compressedBits);
}`,
  'rle_ratio': `function calculate(bits) {
  let runs = 0;
  if (bits.length === 0) return 0;
  for (let i = 1; i < bits.length; i++) {
    if (bits[i] !== bits[i - 1]) runs++;
  }
  runs++;
  const rleSize = runs * 9;
  return bits.length / Math.max(1, rleSize);
}`,
  'huffman_estimate': `function calculate(bits) {
  const counts = {};
  for (let i = 0; i < bits.length; i += 8) {
    const byte = parseInt(bits.slice(i, i + 8).padEnd(8, '0'), 2);
    counts[byte] = (counts[byte] || 0) + 1;
  }
  const total = Math.ceil(bits.length / 8);
  if (total === 0) return 0;
  let huffmanBits = 0;
  const sorted = Object.values(counts).sort((a, b) => a - b);
  sorted.forEach((count, i) => {
    const codeLen = Math.max(1, Math.ceil(Math.log2(sorted.length - i + 1)));
    huffmanBits += count * codeLen;
  });
  return bits.length / Math.max(1, huffmanBits);
}`,
  'block_regularity': `function calculate(bits) {
  const blockSize = 64;
  const entropies = [];
  for (let i = 0; i < bits.length; i += blockSize) {
    const block = bits.slice(i, i + blockSize);
    const ones = block.split('').filter(b => b === '1').length;
    const p = ones / block.length;
    const entropy = p > 0 && p < 1 ? -p * Math.log2(p) - (1 - p) * Math.log2(1 - p) : 0;
    entropies.push(entropy);
  }
  if (entropies.length === 0) return 0;
  const mean = entropies.reduce((a, b) => a + b, 0) / entropies.length;
  const variance = entropies.reduce((sum, e) => sum + Math.pow(e - mean, 2), 0) / entropies.length;
  return 1 - Math.sqrt(variance);
}`,
  'hamming_distance_self': `function calculate(bits) {
  const half = Math.floor(bits.length / 2);
  let distance = 0;
  for (let i = 0; i < half; i++) {
    if (bits[i] !== bits[i + half]) distance++;
  }
  return distance;
}`,
  'autocorr_lag1': `function calculate(bits) {
  let sum = 0;
  for (let i = 0; i < bits.length - 1; i++) {
    const a = bits[i] === '1' ? 1 : -1;
    const b = bits[i + 1] === '1' ? 1 : -1;
    sum += a * b;
  }
  return sum / (bits.length - 1);
}`,
  'autocorr_lag2': `function calculate(bits) {
  let sum = 0;
  for (let i = 0; i < bits.length - 2; i++) {
    const a = bits[i] === '1' ? 1 : -1;
    const b = bits[i + 2] === '1' ? 1 : -1;
    sum += a * b;
  }
  return sum / (bits.length - 2);
}`,
  'bit_complexity': `function calculate(bits) {
  const seen = new Set();
  let complexity = 0;
  let current = '';
  for (const bit of bits) {
    current += bit;
    if (!seen.has(current)) {
      seen.add(current);
      complexity++;
      current = '';
    }
  }
  if (current.length > 0) complexity++;
  return complexity / Math.log2(bits.length + 1);
}`,
  'cross_entropy': `function calculate(bits) {
  // Cross entropy of first half relative to second half
  const half = Math.floor(bits.length / 2);
  const p = bits.slice(0, half);
  const q = bits.slice(half);
  const pOnes = (p.match(/1/g) || []).length / half;
  const qOnes = (q.match(/1/g) || []).length / (bits.length - half);
  if (qOnes === 0 || qOnes === 1) return 0;
  return -(pOnes * Math.log2(qOnes) + (1 - pOnes) * Math.log2(1 - qOnes));
}`,
  'kl_divergence': `function calculate(bits) {
  // KL divergence of first half from second half
  const half = Math.floor(bits.length / 2);
  const p = bits.slice(0, half);
  const q = bits.slice(half);
  const pOnes = (p.match(/1/g) || []).length / half;
  const qOnes = (q.match(/1/g) || []).length / (bits.length - half);
  if (pOnes === 0 || pOnes === 1 || qOnes === 0 || qOnes === 1) return 0;
  return pOnes * Math.log2(pOnes / qOnes) + (1 - pOnes) * Math.log2((1 - pOnes) / (1 - qOnes));
}`,
  'collision_entropy': `function calculate(bits) {
  const ones = bits.split('').filter(b => b === '1').length;
  const zeros = bits.length - ones;
  if (ones === 0 || zeros === 0) return 0;
  const p1 = ones / bits.length;
  const p0 = zeros / bits.length;
  return -Math.log2(p0 * p0 + p1 * p1);
}`,
  'segment_count': `function calculate(bits) {
  // Count entropy transitions
  const blockSize = 64;
  let prevEntropy = null;
  let transitions = 0;
  for (let i = 0; i < bits.length - blockSize; i += blockSize) {
    const block = bits.slice(i, i + blockSize);
    const ones = (block.match(/1/g) || []).length;
    const p = ones / blockSize;
    const entropy = p > 0 && p < 1 ? -p * Math.log2(p) - (1-p) * Math.log2(1-p) : 0;
    if (prevEntropy !== null && Math.abs(entropy - prevEntropy) > 0.2) {
      transitions++;
    }
    prevEntropy = entropy;
  }
  return transitions + 1;
}`,
};

export const MetricsCodeEditor = () => {
  const [selectedMetric, setSelectedMetric] = useState<PredefinedMetric | null>(null);
  const [editForm, setEditForm] = useState<Partial<PredefinedMetric>>({});
  const [isNew, setIsNew] = useState(false);
  const [, forceUpdate] = useState({});
  const [testResult, setTestResult] = useState<{ success: boolean; value?: number; error?: string } | null>(null);

  useEffect(() => {
    const unsubscribe = predefinedManager.subscribe(() => forceUpdate({}));
    return unsubscribe;
  }, []);

  const metrics = predefinedManager.getAllMetrics();

  const getMetricReferences = (metricId: string): MetricReference => {
    const usedIn: string[] = [];
    const dependsOn: string[] = [];
    
    const metric = predefinedManager.getMetric(metricId);
    if (!metric) return { usedIn: [], dependsOn: [], formula: '' };

    metrics.forEach(m => {
      if (m.id !== metricId && m.formula.includes(metricId)) {
        usedIn.push(m.name);
      }
      if (metric.formula.includes(m.id)) {
        dependsOn.push(m.name);
      }
    });

    if (localStorage.getItem('bitwise_strategies')?.includes(metricId)) {
      usedIn.push('Strategy Files');
    }

    return { usedIn, dependsOn, formula: metric.formula };
  };

  const handleSelectMetric = (metric: PredefinedMetric) => {
    setSelectedMetric(metric);
    setEditForm({ ...metric });
    setIsNew(false);
    setTestResult(null);
  };

  const handleNewMetric = () => {
    setSelectedMetric(null);
    setEditForm({
      id: '',
      name: '',
      description: '',
      formula: '',
      unit: '',
      category: 'Custom',
      isCodeBased: false,
      code: DEFAULT_METRIC_CODE,
    });
    setIsNew(true);
    setTestResult(null);
  };

  const handleSave = () => {
    if (!editForm.id || !editForm.name) {
      toast.error('ID and Name are required');
      return;
    }

    if (!editForm.isCodeBased && !editForm.formula) {
      toast.error('Formula is required in formula mode');
      return;
    }

    if (editForm.isCodeBased && !editForm.code) {
      toast.error('Code is required in code mode');
      return;
    }

    const metric: PredefinedMetric = {
      id: editForm.id,
      name: editForm.name,
      description: editForm.description || '',
      formula: editForm.formula || '',
      unit: editForm.unit,
      category: editForm.category,
      isCodeBased: editForm.isCodeBased,
      code: editForm.isCodeBased ? editForm.code : undefined,
    };

    if (isNew) {
      predefinedManager.addMetric(metric);
      toast.success('Metric created');
    } else {
      predefinedManager.updateMetric(metric.id, metric);
      toast.success('Metric updated');
    }

    setSelectedMetric(metric);
    setIsNew(false);
  };

  const handleDelete = () => {
    if (selectedMetric) {
      predefinedManager.deleteMetric(selectedMetric.id);
      setSelectedMetric(null);
      setEditForm({});
      toast.success('Metric deleted');
    }
  };

  const handleTestCode = () => {
    if (!editForm.code) {
      setTestResult({ success: false, error: 'No code to test' });
      return;
    }

    // Get bits from active file
    const activeFile = fileSystemManager.getActiveFile();
    let testBits = '10101010'; // Default test bits
    if (activeFile?.state?.model) {
      const modelBits = activeFile.state.model.getBits();
      testBits = modelBits.slice(0, 1000); // Use first 1000 bits
    }

    try {
      const fn = new Function('bits', editForm.code + '\nreturn calculate(bits);');
      const value = fn(testBits);
      if (typeof value !== 'number') {
        setTestResult({ success: false, error: `Must return a number, got ${typeof value}` });
      } else {
        setTestResult({ success: true, value });
      }
    } catch (error) {
      setTestResult({ success: false, error: (error as Error).message });
    }
  };

  const categories = predefinedManager.getMetricCategories();

  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      {/* Left: Metric List with References */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">Metrics ({metrics.length})</h3>
          <Button size="sm" variant="outline" onClick={handleNewMetric}>
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <Accordion type="multiple" className="space-y-2">
            {categories.map(category => (
              <AccordionItem key={category} value={category} className="border rounded-lg">
                <AccordionTrigger className="px-3 py-2 text-xs hover:no-underline">
                  <span className="uppercase text-muted-foreground">{category}</span>
                </AccordionTrigger>
                <AccordionContent className="px-2 pb-2">
                  <div className="space-y-1">
                    {metrics.filter(m => m.category === category).map(metric => {
                      const refs = getMetricReferences(metric.id);
                      return (
                        <div
                          key={metric.id}
                          className={`p-2 rounded cursor-pointer transition-colors ${
                            selectedMetric?.id === metric.id
                              ? 'bg-primary/20 border border-primary'
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => handleSelectMetric(metric)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {metric.isCodeBased ? (
                                <FileCode className="w-4 h-4 text-cyan-500" />
                              ) : (
                                <Calculator className="w-4 h-4 text-purple-500" />
                              )}
                              <span className="font-medium text-sm">{metric.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {metric.isCodeBased && (
                                <Badge variant="secondary" className="text-xs">Code</Badge>
                              )}
                              {metric.unit && (
                                <Badge variant="outline" className="text-xs">{metric.unit}</Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
                          
                          <div className="flex flex-wrap gap-1 mt-2">
                            {refs.usedIn.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                <Link className="w-3 h-3 mr-1" />
                                Used by {refs.usedIn.length}
                              </Badge>
                            )}
                            {refs.dependsOn.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                Depends on {refs.dependsOn.length}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>
      </div>

      {/* Right: Code Editor */}
      <div className="flex flex-col">
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4" />
                {isNew ? 'New Metric' : selectedMetric?.name || 'Select a metric'}
              </div>
              <div className="flex gap-1">
                {(selectedMetric || isNew) && (
                  <>
                    <Button size="sm" variant="outline" onClick={handleSave}>
                      <Save className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                    {selectedMetric && (
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={handleDelete}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col space-y-3 overflow-auto">
            {(selectedMetric || isNew) ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">ID (unique)</Label>
                    <Input
                      value={editForm.id || ''}
                      onChange={e => setEditForm({ ...editForm, id: e.target.value })}
                      placeholder="entropy"
                      disabled={!isNew}
                      className="h-8 text-sm font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Category</Label>
                    <Input
                      value={editForm.category || ''}
                      onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                      placeholder="Statistics"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={editForm.name || ''}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Shannon Entropy"
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Description</Label>
                  <Input
                    value={editForm.description || ''}
                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Measures information density"
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Unit</Label>
                  <Input
                    value={editForm.unit || ''}
                    onChange={e => setEditForm({ ...editForm, unit: e.target.value })}
                    placeholder="bits"
                    className="h-8 text-sm"
                  />
                </div>

                {/* Code Mode Toggle */}
                <div className="flex items-center justify-between p-2 bg-muted/30 rounded border">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-cyan-500" />
                    <div>
                      <Label className="text-sm font-medium">Code Mode</Label>
                      <p className="text-xs text-muted-foreground">Write executable JavaScript</p>
                    </div>
                  </div>
                  <Switch
                    checked={editForm.isCodeBased || false}
                    onCheckedChange={(checked) => {
                      setEditForm({ 
                        ...editForm, 
                        isCodeBased: checked,
                        code: checked && !editForm.code ? DEFAULT_METRIC_CODE : editForm.code,
                      });
                      setTestResult(null);
                    }}
                  />
                </div>

                {editForm.isCodeBased ? (
                  /* Code Editor */
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">JavaScript Code</Label>
                      <Button size="sm" variant="outline" onClick={handleTestCode}>
                        <Play className="w-3 h-3 mr-1" />
                        Test
                      </Button>
                    </div>
                    <Textarea
                      value={editForm.code || ''}
                      onChange={e => {
                        setEditForm({ ...editForm, code: e.target.value });
                        setTestResult(null);
                      }}
                      placeholder={DEFAULT_METRIC_CODE}
                      className="flex-1 min-h-[150px] font-mono text-xs"
                    />
                    
                    {/* Test Result */}
                    {testResult && (
                      <div className={`p-2 rounded text-xs flex items-center gap-2 ${
                        testResult.success 
                          ? 'bg-green-500/10 text-green-500 border border-green-500/30' 
                          : 'bg-red-500/10 text-red-500 border border-red-500/30'
                      }`}>
                        {testResult.success ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Result: {testResult.value?.toFixed(6)}</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4" />
                            <span>Error: {testResult.error}</span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Code Hints */}
                    <div className="p-2 bg-muted/30 rounded text-xs space-y-1">
                      <p className="font-medium">Function Signature:</p>
                      <code className="text-cyan-500">function calculate(bits: string): number</code>
                      <p className="text-muted-foreground mt-1">
                        <span className="font-medium">bits</span> - Binary string of '0' and '1'
                      </p>
                      <p className="text-muted-foreground">
                        <span className="font-medium">return</span> - Number (the metric value)
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Formula Editor */
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Formula (Documentation)</Label>
                    <Textarea
                      value={editForm.formula || ''}
                      onChange={e => setEditForm({ ...editForm, formula: e.target.value })}
                      placeholder="-Σ(p(x) * log₂(p(x))) for all symbols x"
                      className="flex-1 min-h-[100px] font-mono text-sm"
                    />
                  </div>
                )}

                {/* Show built-in code for non-code-based metrics */}
                {!editForm.isCodeBased && selectedMetric && BUILTIN_METRIC_CODE[selectedMetric.id] && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Built-in Implementation (Read-only)</Label>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          // Test built-in metric
                          const activeFile = fileSystemManager.getActiveFile();
                          let testBits = '10101010';
                          if (activeFile?.state?.model) {
                            testBits = activeFile.state.model.getBits().slice(0, 1000);
                          }
                          try {
                            const fn = new Function('bits', BUILTIN_METRIC_CODE[selectedMetric.id] + '\nreturn calculate(bits);');
                            const value = fn(testBits);
                            setTestResult({ success: true, value });
                          } catch (e) {
                            setTestResult({ success: false, error: (e as Error).message });
                          }
                        }}
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Test
                      </Button>
                    </div>
                    <pre className="p-2 bg-muted/30 rounded text-xs font-mono overflow-auto max-h-32 whitespace-pre-wrap">
                      {BUILTIN_METRIC_CODE[selectedMetric.id]}
                    </pre>
                    
                    {/* Test Result */}
                    {testResult && (
                      <div className={`p-2 rounded text-xs flex items-center gap-2 ${
                        testResult.success 
                          ? 'bg-green-500/10 text-green-500 border border-green-500/30' 
                          : 'bg-red-500/10 text-red-500 border border-red-500/30'
                      }`}>
                        {testResult.success ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Result: {testResult.value?.toFixed(6)}</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4" />
                            <span>Error: {testResult.error}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Documentation for this metric */}
                {selectedMetric && (
                  <div className="p-2 bg-muted/30 rounded text-xs space-y-1">
                    <div className="flex items-center gap-1 font-medium">
                      <Info className="w-3 h-3" />
                      Reference Info
                    </div>
                    <p><span className="text-muted-foreground">Access in code:</span> <code className="text-cyan-500">get_metric("{selectedMetric.id}")</code></p>
                    <p><span className="text-muted-foreground">Returns:</span> number{selectedMetric.unit ? ` (${selectedMetric.unit})` : ''}</p>
                    {getMetricReferences(selectedMetric.id).usedIn.length > 0 && (
                      <p><span className="text-muted-foreground">Used in:</span> {getMetricReferences(selectedMetric.id).usedIn.join(', ')}</p>
                    )}
                    {selectedMetric.isCodeBased && (
                      <p className="text-yellow-500 font-medium mt-2">⚡ Custom code takes priority over built-in implementation</p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Calculator className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>Select a metric to edit or create new</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};