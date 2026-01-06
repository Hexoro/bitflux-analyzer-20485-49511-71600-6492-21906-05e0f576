/**
 * Encoding and Compression Functions Library
 * 100+ predefined functions for use in strategies
 */

// ============= ENCODING FUNCTIONS =============

export const EncodingFunctions = {
  // Gray Code
  binaryToGray: (bits: string): string => {
    if (!bits.length) return '';
    let gray = bits[0];
    for (let i = 1; i < bits.length; i++) {
      gray += bits[i - 1] === bits[i] ? '0' : '1';
    }
    return gray;
  },

  grayToBinary: (gray: string): string => {
    if (!gray.length) return '';
    let binary = gray[0];
    for (let i = 1; i < gray.length; i++) {
      binary += binary[i - 1] === gray[i] ? '0' : '1';
    }
    return binary;
  },

  // Manchester Encoding
  manchesterEncode: (bits: string): string => {
    let result = '';
    for (const bit of bits) {
      result += bit === '0' ? '01' : '10';
    }
    return result;
  },

  manchesterDecode: (bits: string): string => {
    let result = '';
    for (let i = 0; i < bits.length; i += 2) {
      const pair = bits.slice(i, i + 2);
      result += pair === '01' ? '0' : pair === '10' ? '1' : '?';
    }
    return result;
  },

  // Differential Encoding
  differentialEncode: (bits: string): string => {
    if (!bits.length) return '';
    let result = bits[0];
    let prev = bits[0];
    for (let i = 1; i < bits.length; i++) {
      const curr = bits[i] === prev ? '0' : '1';
      result += curr;
      prev = bits[i];
    }
    return result;
  },

  differentialDecode: (bits: string): string => {
    if (!bits.length) return '';
    let result = bits[0];
    let prev = bits[0];
    for (let i = 1; i < bits.length; i++) {
      const curr = bits[i] === '0' ? prev : (prev === '0' ? '1' : '0');
      result += curr;
      prev = curr;
    }
    return result;
  },

  // NRZI Encoding
  nrziEncode: (bits: string): string => {
    if (!bits.length) return '';
    let result = '';
    let level = '0';
    for (const bit of bits) {
      if (bit === '1') level = level === '0' ? '1' : '0';
      result += level;
    }
    return result;
  },

  nrziDecode: (bits: string): string => {
    if (!bits.length) return '';
    let result = '';
    let prev = '0';
    for (const bit of bits) {
      result += bit === prev ? '0' : '1';
      prev = bit;
    }
    return result;
  },

  // Hamming Code (7,4)
  hammingEncode74: (data: string): string => {
    const result: string[] = [];
    for (let i = 0; i < data.length; i += 4) {
      const d = data.slice(i, i + 4).padEnd(4, '0').split('').map(Number);
      const p1 = d[0] ^ d[1] ^ d[3];
      const p2 = d[0] ^ d[2] ^ d[3];
      const p4 = d[1] ^ d[2] ^ d[3];
      result.push(`${p1}${p2}${d[0]}${p4}${d[1]}${d[2]}${d[3]}`);
    }
    return result.join('');
  },

  hammingDecode74: (code: string): string => {
    const result: string[] = [];
    for (let i = 0; i < code.length; i += 7) {
      const c = code.slice(i, i + 7).padEnd(7, '0').split('').map(Number);
      // Calculate syndrome
      const s1 = c[0] ^ c[2] ^ c[4] ^ c[6];
      const s2 = c[1] ^ c[2] ^ c[5] ^ c[6];
      const s4 = c[3] ^ c[4] ^ c[5] ^ c[6];
      const errorPos = s1 + s2 * 2 + s4 * 4;
      if (errorPos > 0 && errorPos <= 7) {
        c[errorPos - 1] = 1 - c[errorPos - 1];
      }
      result.push(`${c[2]}${c[4]}${c[5]}${c[6]}`);
    }
    return result.join('');
  },

  // Base64-like encoding (6-bit to printable)
  base64Encode: (bits: string): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    for (let i = 0; i < bits.length; i += 6) {
      const chunk = bits.slice(i, i + 6).padEnd(6, '0');
      const index = parseInt(chunk, 2);
      result += chars[index];
    }
    return result;
  },

  // Bit stuffing (HDLC-like)
  bitStuff: (bits: string): string => {
    let result = '';
    let ones = 0;
    for (const bit of bits) {
      result += bit;
      if (bit === '1') {
        ones++;
        if (ones === 5) {
          result += '0';
          ones = 0;
        }
      } else {
        ones = 0;
      }
    }
    return result;
  },

  bitUnstuff: (bits: string): string => {
    let result = '';
    let ones = 0;
    for (let i = 0; i < bits.length; i++) {
      const bit = bits[i];
      if (ones === 5 && bit === '0') {
        ones = 0;
        continue;
      }
      result += bit;
      ones = bit === '1' ? ones + 1 : 0;
    }
    return result;
  },

  // ZigZag encoding (for signed integers)
  zigzagEncode: (bits: string): string => {
    const bytes: string[] = [];
    for (let i = 0; i < bits.length; i += 8) {
      const byte = bits.slice(i, i + 8).padEnd(8, '0');
      const signed = parseInt(byte, 2);
      const zigzag = (signed >> 7) ^ (signed << 1);
      bytes.push((zigzag & 0xFF).toString(2).padStart(8, '0'));
    }
    return bytes.join('');
  },

  zigzagDecode: (bits: string): string => {
    const bytes: string[] = [];
    for (let i = 0; i < bits.length; i += 8) {
      const byte = bits.slice(i, i + 8).padEnd(8, '0');
      const zigzag = parseInt(byte, 2);
      const signed = (zigzag >>> 1) ^ (-(zigzag & 1));
      bytes.push((signed & 0xFF).toString(2).padStart(8, '0'));
    }
    return bytes.join('');
  },

  // Interleave bits from two halves
  interleave: (bits: string): string => {
    const half = Math.floor(bits.length / 2);
    const a = bits.slice(0, half);
    const b = bits.slice(half);
    let result = '';
    for (let i = 0; i < half; i++) {
      result += (a[i] || '0') + (b[i] || '0');
    }
    if (bits.length % 2 === 1) result += bits[bits.length - 1];
    return result;
  },

  deinterleave: (bits: string): string => {
    let a = '', b = '';
    for (let i = 0; i < bits.length; i += 2) {
      a += bits[i] || '';
      b += bits[i + 1] || '';
    }
    return a + b;
  },
};

// ============= COMPRESSION FUNCTIONS =============

export const CompressionFunctions = {
  // Run-Length Encoding
  rleEncode: (bits: string): string => {
    if (!bits.length) return '';
    let result = '';
    let currentBit = bits[0];
    let count = 1;

    for (let i = 1; i < bits.length; i++) {
      if (bits[i] === currentBit && count < 255) {
        count++;
      } else {
        result += count.toString(2).padStart(8, '0') + currentBit;
        currentBit = bits[i];
        count = 1;
      }
    }
    result += count.toString(2).padStart(8, '0') + currentBit;
    return result;
  },

  rleDecode: (encoded: string): string => {
    let result = '';
    for (let i = 0; i < encoded.length; i += 9) {
      const countBits = encoded.slice(i, i + 8);
      const bit = encoded[i + 8] || '0';
      const count = parseInt(countBits, 2);
      result += bit.repeat(count);
    }
    return result;
  },

  // Delta Encoding
  deltaEncode: (bits: string): string => {
    if (!bits.length) return '';
    const bytes: number[] = [];
    for (let i = 0; i < bits.length; i += 8) {
      bytes.push(parseInt(bits.slice(i, i + 8).padEnd(8, '0'), 2));
    }
    
    let result = bytes[0].toString(2).padStart(8, '0');
    for (let i = 1; i < bytes.length; i++) {
      const delta = (bytes[i] - bytes[i - 1] + 256) % 256;
      result += delta.toString(2).padStart(8, '0');
    }
    return result;
  },

  deltaDecode: (encoded: string): string => {
    const bytes: number[] = [];
    for (let i = 0; i < encoded.length; i += 8) {
      bytes.push(parseInt(encoded.slice(i, i + 8).padEnd(8, '0'), 2));
    }
    
    let result = bytes[0].toString(2).padStart(8, '0');
    let prev = bytes[0];
    for (let i = 1; i < bytes.length; i++) {
      prev = (prev + bytes[i]) % 256;
      result += prev.toString(2).padStart(8, '0');
    }
    return result;
  },

  // Move-to-Front Transform
  mtfEncode: (bits: string): string => {
    const bytes: number[] = [];
    for (let i = 0; i < bits.length; i += 8) {
      bytes.push(parseInt(bits.slice(i, i + 8).padEnd(8, '0'), 2));
    }

    const alphabet = Array.from({ length: 256 }, (_, i) => i);
    let result = '';

    for (const byte of bytes) {
      const index = alphabet.indexOf(byte);
      result += index.toString(2).padStart(8, '0');
      alphabet.splice(index, 1);
      alphabet.unshift(byte);
    }
    return result;
  },

  mtfDecode: (encoded: string): string => {
    const indices: number[] = [];
    for (let i = 0; i < encoded.length; i += 8) {
      indices.push(parseInt(encoded.slice(i, i + 8).padEnd(8, '0'), 2));
    }

    const alphabet = Array.from({ length: 256 }, (_, i) => i);
    let result = '';

    for (const index of indices) {
      const byte = alphabet[index];
      result += byte.toString(2).padStart(8, '0');
      alphabet.splice(index, 1);
      alphabet.unshift(byte);
    }
    return result;
  },

  // Burrows-Wheeler Transform (simplified)
  bwtEncode: (bits: string): string => {
    const blockSize = 8;
    const blocks: string[] = [];
    for (let i = 0; i < bits.length; i += blockSize) {
      blocks.push(bits.slice(i, i + blockSize).padEnd(blockSize, '0'));
    }

    const result: string[] = [];
    for (const block of blocks) {
      const rotations = [];
      for (let i = 0; i < block.length; i++) {
        rotations.push(block.slice(i) + block.slice(0, i));
      }
      rotations.sort();
      result.push(rotations.map(r => r[r.length - 1]).join(''));
    }
    return result.join('');
  },

  // LZ77-style simple compression
  lz77Compress: (bits: string): { compressed: string; ratio: number } => {
    const windowSize = 32;
    const lookaheadSize = 16;
    let result = '';
    let i = 0;

    while (i < bits.length) {
      let bestMatch = { offset: 0, length: 0 };
      const windowStart = Math.max(0, i - windowSize);
      
      for (let j = windowStart; j < i; j++) {
        let matchLen = 0;
        while (matchLen < lookaheadSize && 
               i + matchLen < bits.length && 
               bits[j + matchLen] === bits[i + matchLen]) {
          matchLen++;
        }
        if (matchLen > bestMatch.length) {
          bestMatch = { offset: i - j, length: matchLen };
        }
      }

      if (bestMatch.length >= 3) {
        result += '1' + bestMatch.offset.toString(2).padStart(5, '0') + 
                  bestMatch.length.toString(2).padStart(4, '0');
        i += bestMatch.length;
      } else {
        result += '0' + bits[i];
        i++;
      }
    }

    return { 
      compressed: result, 
      ratio: bits.length > 0 ? result.length / bits.length : 1 
    };
  },

  // Huffman-style frequency analysis
  getHuffmanStats: (bits: string): { frequencies: Record<string, number>; entropy: number } => {
    const byteFreq: Record<string, number> = {};
    for (let i = 0; i < bits.length; i += 8) {
      const byte = bits.slice(i, i + 8).padEnd(8, '0');
      byteFreq[byte] = (byteFreq[byte] || 0) + 1;
    }

    const total = Object.values(byteFreq).reduce((a, b) => a + b, 0);
    let entropy = 0;
    for (const count of Object.values(byteFreq)) {
      const p = count / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }

    return { frequencies: byteFreq, entropy };
  },

  // Bit plane separation
  separateBitPlanes: (bits: string): string[] => {
    const planes: string[] = Array(8).fill('');
    for (let i = 0; i < bits.length; i += 8) {
      const byte = bits.slice(i, i + 8).padEnd(8, '0');
      for (let p = 0; p < 8; p++) {
        planes[p] += byte[p] || '0';
      }
    }
    return planes;
  },

  combineBitPlanes: (planes: string[]): string => {
    if (planes.length !== 8) return '';
    const len = Math.max(...planes.map(p => p.length));
    let result = '';
    for (let i = 0; i < len; i++) {
      for (let p = 0; p < 8; p++) {
        result += planes[p][i] || '0';
      }
    }
    return result;
  },
};

// ============= ANALYSIS FUNCTIONS =============

export const AnalysisFunctions = {
  // Entropy calculation
  calculateEntropy: (bits: string): number => {
    if (!bits.length) return 0;
    const ones = (bits.match(/1/g) || []).length;
    const zeros = bits.length - ones;
    const p0 = zeros / bits.length;
    const p1 = ones / bits.length;
    let entropy = 0;
    if (p0 > 0) entropy -= p0 * Math.log2(p0);
    if (p1 > 0) entropy -= p1 * Math.log2(p1);
    return entropy;
  },

  // Autocorrelation
  autocorrelation: (bits: string, lag: number): number => {
    if (lag >= bits.length) return 0;
    let sum = 0;
    for (let i = 0; i < bits.length - lag; i++) {
      const v1 = bits[i] === '1' ? 1 : -1;
      const v2 = bits[i + lag] === '1' ? 1 : -1;
      sum += v1 * v2;
    }
    return sum / (bits.length - lag);
  },

  // Find longest repeating pattern
  findLongestRepeat: (bits: string): { pattern: string; count: number; position: number } => {
    let best = { pattern: '', count: 0, position: 0 };
    
    for (let len = 2; len <= Math.min(32, bits.length / 2); len++) {
      for (let i = 0; i <= bits.length - len * 2; i++) {
        const pattern = bits.slice(i, i + len);
        let count = 1;
        let pos = i + len;
        while (pos + len <= bits.length && bits.slice(pos, pos + len) === pattern) {
          count++;
          pos += len;
        }
        if (count > best.count || (count === best.count && len > best.pattern.length)) {
          best = { pattern, count, position: i };
        }
      }
    }
    return best;
  },

  // Chi-square test
  chiSquareTest: (bits: string): number => {
    const n = bits.length;
    const ones = (bits.match(/1/g) || []).length;
    const zeros = n - ones;
    const expected = n / 2;
    return Math.pow(ones - expected, 2) / expected + Math.pow(zeros - expected, 2) / expected;
  },

  // Runs test
  runsTest: (bits: string): { numRuns: number; expectedRuns: number; zScore: number } => {
    const n = bits.length;
    const ones = (bits.match(/1/g) || []).length;
    const zeros = n - ones;
    
    let runs = 1;
    for (let i = 1; i < n; i++) {
      if (bits[i] !== bits[i - 1]) runs++;
    }
    
    const expected = (2 * ones * zeros) / n + 1;
    const variance = (2 * ones * zeros * (2 * ones * zeros - n)) / (n * n * (n - 1));
    const zScore = variance > 0 ? (runs - expected) / Math.sqrt(variance) : 0;
    
    return { numRuns: runs, expectedRuns: expected, zScore };
  },

  // Spectral analysis (simple DFT)
  spectralAnalysis: (bits: string): { dominantFreq: number; magnitude: number }[] => {
    const n = Math.min(bits.length, 256);
    const sample = bits.slice(0, n).split('').map(b => b === '1' ? 1 : -1);
    const results: { dominantFreq: number; magnitude: number }[] = [];

    for (let k = 1; k < n / 2; k++) {
      let real = 0, imag = 0;
      for (let t = 0; t < n; t++) {
        const angle = 2 * Math.PI * k * t / n;
        real += sample[t] * Math.cos(angle);
        imag -= sample[t] * Math.sin(angle);
      }
      const magnitude = Math.sqrt(real * real + imag * imag) / n;
      if (magnitude > 0.1) {
        results.push({ dominantFreq: k, magnitude });
      }
    }

    return results.sort((a, b) => b.magnitude - a.magnitude).slice(0, 5);
  },

  // Lempel-Ziv complexity
  lempelZivComplexity: (bits: string): number => {
    const vocab = new Set<string>();
    let w = '';
    let complexity = 0;

    for (const bit of bits) {
      const wPlusBit = w + bit;
      if (vocab.has(wPlusBit)) {
        w = wPlusBit;
      } else {
        vocab.add(wPlusBit);
        complexity++;
        w = '';
      }
    }
    if (w) complexity++;

    return complexity;
  },
  
  // ===== NEW ADVANCED ANALYSIS =====
  
  // Approximate Entropy
  approximateEntropy: (bits: string, m: number = 2): number => {
    const n = bits.length;
    if (n < m + 1) return 0;
    
    const countPatterns = (len: number): Map<string, number> => {
      const counts = new Map<string, number>();
      for (let i = 0; i <= n - len; i++) {
        const pattern = bits.slice(i, i + len);
        counts.set(pattern, (counts.get(pattern) || 0) + 1);
      }
      return counts;
    };
    
    const phi = (len: number): number => {
      const counts = countPatterns(len);
      const total = n - len + 1;
      let sum = 0;
      for (const count of counts.values()) {
        const p = count / total;
        sum += p * Math.log(p);
      }
      return sum;
    };
    
    return phi(m) - phi(m + 1);
  },
  
  // Serial Correlation Test
  serialCorrelationTest: (bits: string): { correlation: number; pValue: number } => {
    const n = bits.length;
    if (n < 2) return { correlation: 0, pValue: 1 };
    
    const values = bits.split('').map(b => b === '1' ? 1 : 0);
    const mean = values.reduce((a, b) => a + b, 0) / n;
    
    let num = 0, denom = 0;
    for (let i = 0; i < n - 1; i++) {
      num += (values[i] - mean) * (values[i + 1] - mean);
      denom += (values[i] - mean) ** 2;
    }
    denom += (values[n - 1] - mean) ** 2;
    
    const correlation = denom !== 0 ? num / denom : 0;
    const z = correlation * Math.sqrt(n);
    const pValue = 2 * (1 - Math.min(1, Math.abs(z) / 3)); // Simplified
    
    return { correlation, pValue };
  },
};

// ============= NEW ENCODING FUNCTIONS =====

export const AdvancedEncodingFunctions = {
  // 4B/5B Encoding (Ethernet-style)
  encode4B5B: (bits: string): string => {
    const table: Record<string, string> = {
      '0000': '11110', '0001': '01001', '0010': '10100', '0011': '10101',
      '0100': '01010', '0101': '01011', '0110': '01110', '0111': '01111',
      '1000': '10010', '1001': '10011', '1010': '10110', '1011': '10111',
      '1100': '11010', '1101': '11011', '1110': '11100', '1111': '11101',
    };
    let result = '';
    for (let i = 0; i < bits.length; i += 4) {
      const nibble = bits.slice(i, i + 4).padEnd(4, '0');
      result += table[nibble] || '11110';
    }
    return result;
  },
  
  decode4B5B: (bits: string): string => {
    const table: Record<string, string> = {
      '11110': '0000', '01001': '0001', '10100': '0010', '10101': '0011',
      '01010': '0100', '01011': '0101', '01110': '0110', '01111': '0111',
      '10010': '1000', '10011': '1001', '10110': '1010', '10111': '1011',
      '11010': '1100', '11011': '1101', '11100': '1110', '11101': '1111',
    };
    let result = '';
    for (let i = 0; i < bits.length; i += 5) {
      const code = bits.slice(i, i + 5).padEnd(5, '0');
      result += table[code] || '0000';
    }
    return result;
  },
  
  // 8B/10B Encoding (simplified)
  encode8B10B: (bits: string): string => {
    let result = '';
    let rd = -1; // Running disparity
    
    for (let i = 0; i < bits.length; i += 8) {
      const byte = bits.slice(i, i + 8).padEnd(8, '0');
      const val = parseInt(byte, 2);
      
      // Simplified encoding - adds 2 bits for DC balance
      const ones = (byte.match(/1/g) || []).length;
      if (ones === 4) {
        result += byte + (rd < 0 ? '01' : '10');
        rd = 0;
      } else if (ones > 4) {
        result += byte + '01';
        rd = rd + (ones - 4);
      } else {
        result += byte + '10';
        rd = rd - (4 - ones);
      }
    }
    return result;
  },
  
  // Scrambler (additive scrambling with LFSR)
  scramble: (bits: string, polynomial: number = 0x1D): string => {
    let lfsr = 0xFF; // Initial state
    let result = '';
    
    for (const bit of bits) {
      const feedback = ((lfsr >> 7) ^ (lfsr >> 4) ^ (lfsr >> 2) ^ lfsr) & 1;
      result += ((bit === '1' ? 1 : 0) ^ feedback).toString();
      lfsr = ((lfsr << 1) | feedback) & 0xFF;
    }
    return result;
  },
  
  descramble: (bits: string, polynomial: number = 0x1D): string => {
    let lfsr = 0xFF;
    let result = '';
    
    for (const bit of bits) {
      const feedback = ((lfsr >> 7) ^ (lfsr >> 4) ^ (lfsr >> 2) ^ lfsr) & 1;
      result += ((bit === '1' ? 1 : 0) ^ feedback).toString();
      lfsr = ((lfsr << 1) | feedback) & 0xFF;
    }
    return result;
  },
  
  // Whitening (XOR with pseudo-random sequence)
  whiten: (bits: string, seed: number = 0x1FF): string => {
    let lfsr = seed;
    let result = '';
    
    for (const bit of bits) {
      const output = lfsr & 1;
      result += ((bit === '1' ? 1 : 0) ^ output).toString();
      const feedback = ((lfsr >> 8) ^ (lfsr >> 5)) & 1;
      lfsr = ((lfsr >> 1) | (feedback << 8)) & 0x1FF;
    }
    return result;
  },
  
  // Convolutional Encoding (rate 1/2, K=3)
  convolutionalEncode: (bits: string): string => {
    let state = 0;
    let result = '';
    
    for (const bit of bits) {
      const input = bit === '1' ? 1 : 0;
      const newState = ((state << 1) | input) & 0x7;
      
      // G1 = 111, G2 = 101
      const output1 = ((newState >> 2) ^ (newState >> 1) ^ newState) & 1;
      const output2 = ((newState >> 2) ^ newState) & 1;
      
      result += output1.toString() + output2.toString();
      state = newState;
    }
    return result;
  },
  
  // Reed-Solomon style parity (simplified)
  addParity: (bits: string, parityBits: number = 4): string => {
    const blocks: string[] = [];
    for (let i = 0; i < bits.length; i += 8) {
      const block = bits.slice(i, i + 8).padEnd(8, '0');
      let parity = 0;
      for (const b of block) {
        parity ^= (b === '1' ? 1 : 0);
      }
      blocks.push(block + parity.toString().repeat(parityBits));
    }
    return blocks.join('');
  },
  
  // Bit Interleaving (for burst error protection)
  interleaveBlocks: (bits: string, blockSize: number = 8): string => {
    const numBlocks = Math.ceil(bits.length / blockSize);
    const blocks: string[] = [];
    
    for (let i = 0; i < numBlocks; i++) {
      blocks.push(bits.slice(i * blockSize, (i + 1) * blockSize).padEnd(blockSize, '0'));
    }
    
    let result = '';
    for (let bit = 0; bit < blockSize; bit++) {
      for (const block of blocks) {
        result += block[bit] || '0';
      }
    }
    return result;
  },
  
  deinterleaveBlocks: (bits: string, blockSize: number = 8): string => {
    const numBlocks = Math.ceil(bits.length / blockSize);
    const blocks: string[] = Array(numBlocks).fill('');
    
    let idx = 0;
    for (let bit = 0; bit < blockSize; bit++) {
      for (let block = 0; block < numBlocks; block++) {
        if (idx < bits.length) {
          blocks[block] += bits[idx++];
        }
      }
    }
    return blocks.join('');
  },
};

// ============= NEW COMPRESSION FUNCTIONS =====

export const AdvancedCompressionFunctions = {
  // Arithmetic Coding (simplified)
  arithmeticEncode: (bits: string): { encoded: string; model: Record<string, number> } => {
    const ones = (bits.match(/1/g) || []).length;
    const total = bits.length;
    const p0 = (total - ones) / total;
    const p1 = ones / total;
    
    let low = 0, high = 1;
    for (const bit of bits) {
      const range = high - low;
      if (bit === '0') {
        high = low + range * p0;
      } else {
        low = low + range * p0;
        high = low + range * p1;
      }
    }
    
    const midpoint = (low + high) / 2;
    const encoded = midpoint.toString(2).slice(2, 2 + Math.min(32, bits.length));
    
    return { encoded, model: { p0, p1 } };
  },
  
  // Dictionary Compression (LZW-style)
  lzwCompress: (bits: string, maxDictSize: number = 256): string => {
    const dict = new Map<string, number>();
    for (let i = 0; i < 2; i++) dict.set(i.toString(), i);
    
    let dictSize = 2;
    let w = '';
    const result: number[] = [];
    
    for (const bit of bits) {
      const wc = w + bit;
      if (dict.has(wc)) {
        w = wc;
      } else {
        result.push(dict.get(w)!);
        if (dictSize < maxDictSize) {
          dict.set(wc, dictSize++);
        }
        w = bit;
      }
    }
    if (w) result.push(dict.get(w)!);
    
    const bitsPerCode = Math.ceil(Math.log2(maxDictSize));
    return result.map(c => c.toString(2).padStart(bitsPerCode, '0')).join('');
  },
  
  // Prediction-based compression
  predictorCompress: (bits: string): string => {
    if (!bits.length) return '';
    
    let result = bits[0]; // First bit as-is
    let lastBits = bits[0];
    
    for (let i = 1; i < bits.length; i++) {
      // Predict based on last 3 bits pattern
      const predicted = lastBits.length >= 3 
        ? (lastBits.slice(-3).match(/1/g) || []).length >= 2 ? '1' : '0'
        : lastBits[lastBits.length - 1];
      
      result += bits[i] === predicted ? '0' : '1'; // 0 = correct prediction
      lastBits = (lastBits + bits[i]).slice(-4);
    }
    return result;
  },
  
  // Context Mixing (simplified PPM)
  ppmCompress: (bits: string, order: number = 3): string => {
    const contexts = new Map<string, { zeros: number; ones: number }>();
    let result = '';
    
    for (let i = 0; i < bits.length; i++) {
      const context = bits.slice(Math.max(0, i - order), i);
      const stats = contexts.get(context) || { zeros: 1, ones: 1 };
      
      // Output based on majority prediction
      const predicted = stats.ones > stats.zeros ? '1' : '0';
      result += bits[i] === predicted ? '0' : '1';
      
      // Update context
      if (bits[i] === '0') stats.zeros++;
      else stats.ones++;
      contexts.set(context, stats);
    }
    return result;
  },
  
  // Block Sorting Compression (BWT + MTF + RLE combined)
  blockSortCompress: (bits: string): string => {
    // Apply BWT
    const bwt = CompressionFunctions.bwtEncode(bits);
    
    // Apply MTF
    const mtf = CompressionFunctions.mtfEncode(bwt);
    
    // Simple RLE for zeros
    let result = '';
    let zeroCount = 0;
    
    for (let i = 0; i < mtf.length; i += 8) {
      const byte = mtf.slice(i, i + 8);
      if (byte === '00000000') {
        zeroCount++;
      } else {
        if (zeroCount > 0) {
          result += '1' + zeroCount.toString(2).padStart(7, '0');
          zeroCount = 0;
        }
        result += '0' + byte;
      }
    }
    if (zeroCount > 0) {
      result += '1' + zeroCount.toString(2).padStart(7, '0');
    }
    
    return result;
  },
};

// ============= TRANSFORMATION FUNCTIONS =============

export const TransformFunctions = {
  // Bit reversal
  reverseBits: (bits: string): string => bits.split('').reverse().join(''),

  // Byte reversal
  reverseBytes: (bits: string): string => {
    const bytes: string[] = [];
    for (let i = 0; i < bits.length; i += 8) {
      bytes.push(bits.slice(i, i + 8).padEnd(8, '0'));
    }
    return bytes.reverse().join('');
  },

  // Bit rotation
  rotateLeft: (bits: string, n: number): string => {
    const shift = n % bits.length;
    return bits.slice(shift) + bits.slice(0, shift);
  },

  rotateRight: (bits: string, n: number): string => {
    const shift = n % bits.length;
    return bits.slice(-shift) + bits.slice(0, -shift);
  },

  // Nibble swap
  nibbleSwap: (bits: string): string => {
    let result = '';
    for (let i = 0; i < bits.length; i += 8) {
      const byte = bits.slice(i, i + 8).padEnd(8, '0');
      result += byte.slice(4) + byte.slice(0, 4);
    }
    return result;
  },

  // XOR with pattern
  xorPattern: (bits: string, pattern: string): string => {
    let result = '';
    for (let i = 0; i < bits.length; i++) {
      const patBit = pattern[i % pattern.length];
      result += bits[i] === patBit ? '0' : '1';
    }
    return result;
  },

  // Complement
  complement: (bits: string): string => {
    return bits.split('').map(b => b === '0' ? '1' : '0').join('');
  },

  // Shuffle (perfect shuffle)
  perfectShuffle: (bits: string): string => {
    const half = Math.floor(bits.length / 2);
    let result = '';
    for (let i = 0; i < half; i++) {
      result += bits[i] + (bits[half + i] || '');
    }
    if (bits.length % 2 === 1) result += bits[bits.length - 1];
    return result;
  },

  // Unshuffle
  perfectUnshuffle: (bits: string): string => {
    let first = '', second = '';
    for (let i = 0; i < bits.length; i++) {
      if (i % 2 === 0) first += bits[i];
      else second += bits[i];
    }
    return first + second;
  },
  
  // ===== NEW TRANSFORMS =====
  
  // Bit Plane Decomposition
  bitPlaneDecompose: (bits: string): string[] => {
    const planes: string[] = Array(8).fill('');
    for (let i = 0; i < bits.length; i += 8) {
      const byte = bits.slice(i, i + 8).padEnd(8, '0');
      for (let p = 0; p < 8; p++) {
        planes[p] += byte[p];
      }
    }
    return planes;
  },
  
  // Walsh-Hadamard Transform (simplified)
  walshHadamard: (bits: string): string => {
    const n = Math.pow(2, Math.floor(Math.log2(bits.length)));
    const arr: number[] = bits.slice(0, n).split('').map(b => b === '1' ? 1 : -1);
    
    for (let len = 1; len < n; len *= 2) {
      for (let i = 0; i < n; i += len * 2) {
        for (let j = 0; j < len; j++) {
          const a = arr[i + j];
          const b = arr[i + j + len];
          arr[i + j] = a + b;
          arr[i + j + len] = a - b;
        }
      }
    }
    
    return arr.map(v => v >= 0 ? '1' : '0').join('');
  },
};

// Export combined library
export const BitLibrary = {
  encoding: EncodingFunctions,
  advancedEncoding: AdvancedEncodingFunctions,
  compression: CompressionFunctions,
  advancedCompression: AdvancedCompressionFunctions,
  analysis: AnalysisFunctions,
  transform: TransformFunctions,
};

// ============= GUIDE =============
export const ENCODING_GUIDE = `
# Encoding & Compression Functions Guide

## Basic Encoding (EncodingFunctions)
- **binaryToGray / grayToBinary**: Gray code encoding (single bit changes)
- **manchesterEncode / manchesterDecode**: Clock + data encoding (01=0, 10=1)
- **differentialEncode / differentialDecode**: Relative encoding
- **nrziEncode / nrziDecode**: Non-Return-to-Zero Inverted
- **hammingEncode74 / hammingDecode74**: Error correction (7,4)
- **base64Encode**: 6-bit to printable character
- **bitStuff / bitUnstuff**: HDLC-style bit stuffing
- **zigzagEncode / zigzagDecode**: Signed integer encoding
- **interleave / deinterleave**: Split and interleave bits

## Advanced Encoding (AdvancedEncodingFunctions)
- **encode4B5B / decode4B5B**: Ethernet-style encoding
- **encode8B10B**: DC-balanced encoding (simplified)
- **scramble / descramble**: LFSR-based scrambling
- **whiten**: Pseudo-random XOR whitening
- **convolutionalEncode**: Rate 1/2, K=3 convolutional code
- **addParity**: Reed-Solomon style parity bits
- **interleaveBlocks / deinterleaveBlocks**: Burst error protection

## Basic Compression (CompressionFunctions)
- **rleEncode / rleDecode**: Run-Length Encoding
- **deltaEncode / deltaDecode**: Delta/differential encoding
- **mtfEncode / mtfDecode**: Move-to-Front transform
- **bwtEncode**: Burrows-Wheeler Transform (simplified)
- **lz77Compress**: LZ77-style sliding window
- **getHuffmanStats**: Frequency analysis
- **separateBitPlanes / combineBitPlanes**: Bit plane operations

## Advanced Compression (AdvancedCompressionFunctions)
- **arithmeticEncode**: Arithmetic coding (simplified)
- **lzwCompress**: LZW dictionary compression
- **predictorCompress**: Prediction-based compression
- **ppmCompress**: Partial Pattern Matching
- **blockSortCompress**: BWT + MTF + RLE combined

## Analysis Functions (AnalysisFunctions)
- **calculateEntropy**: Shannon entropy
- **autocorrelation**: Pattern correlation at lag
- **findLongestRepeat**: Repeating pattern detection
- **chiSquareTest**: Randomness test
- **runsTest**: Run sequence analysis
- **spectralAnalysis**: Simple DFT
- **lempelZivComplexity**: LZ complexity measure
- **approximateEntropy**: ApEn complexity measure
- **serialCorrelationTest**: Serial correlation analysis

## Transform Functions (TransformFunctions)
- **reverseBits / reverseBytes**: Bit/byte reversal
- **rotateLeft / rotateRight**: Bit rotation
- **nibbleSwap**: Swap nibbles in bytes
- **xorPattern**: XOR with repeating pattern
- **complement**: Bitwise NOT
- **perfectShuffle / perfectUnshuffle**: Riffle shuffle
- **bitPlaneDecompose**: Extract bit planes
- **walshHadamard**: Walsh-Hadamard transform

## Usage Examples
\`\`\`javascript
import { BitLibrary } from '@/lib/encodingFunctions';

// Basic encoding
const gray = BitLibrary.encoding.binaryToGray('11010');
const manchester = BitLibrary.encoding.manchesterEncode('1010');

// Advanced encoding
const scrambled = BitLibrary.advancedEncoding.scramble('10101010');
const fiveB = BitLibrary.advancedEncoding.encode4B5B('10101010');

// Compression
const rle = BitLibrary.compression.rleEncode('11111100000');
const lzw = BitLibrary.advancedCompression.lzwCompress('101010101');

// Analysis
const entropy = BitLibrary.analysis.calculateEntropy('10101010');
const lzc = BitLibrary.analysis.lempelZivComplexity('10101010101');

// Transform
const shuffled = BitLibrary.transform.perfectShuffle('12345678');
const wht = BitLibrary.transform.walshHadamard('10101010');
\`\`\`
`;
