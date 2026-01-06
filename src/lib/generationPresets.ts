/**
 * Binary Generation Presets
 * Pre-configured settings for common binary data generation scenarios
 */

export interface GenerationConfig {
  mode: 'random' | 'pattern' | 'structured' | 'file-format';
  length: number;
  
  // Random mode
  probability?: number;
  seed?: string;
  distribution?: 'uniform' | 'bernoulli' | 'gaussian';
  targetEntropy?: number;
  
  // Pattern mode
  pattern?: string;
  patterns?: string[]; // Support for multiple patterns
  repetitions?: number;
  noise?: number;
  patternMode?: 'sequential' | 'interleave' | 'random';
  
  // Structured mode
  template?: 'zeros' | 'ones' | 'alternating' | 'blocks' | 'gray-code' | 'fibonacci' | 'custom-rle';
  runLengthEncoding?: string;
  blockSize?: number;
  
  // File format mode
  includeHeader?: boolean;
  headerPattern?: string;
  includeChecksum?: boolean;
  includePadding?: boolean;
}

export const GENERATION_PRESETS: Record<string, GenerationConfig> = {
  'highly-compressible': {
    mode: 'structured',
    length: 1024,
    template: 'blocks',
    blockSize: 64,
    probability: 0.1,
  },
  
  'random-noise': {
    mode: 'random',
    length: 1024,
    probability: 0.5,
    distribution: 'uniform',
  },
  
  'structured-document': {
    mode: 'file-format',
    length: 2048,
    includeHeader: true,
    headerPattern: '11111111',
    includeChecksum: true,
    includePadding: true,
  },
  
  'test-pattern': {
    mode: 'pattern',
    length: 1024,
    pattern: '10101010',
    repetitions: 128,
    noise: 0.01,
  },
  
  'binary-file-simulation': {
    mode: 'file-format',
    length: 4096,
    includeHeader: true,
    headerPattern: '01010011', // 'S' in binary
    includeChecksum: true,
    includePadding: true,
  },
  
  'alternating-bits': {
    mode: 'structured',
    length: 512,
    template: 'alternating',
  },
  
  'all-zeros': {
    mode: 'structured',
    length: 512,
    template: 'zeros',
  },
  
  'all-ones': {
    mode: 'structured',
    length: 512,
    template: 'ones',
  },
  
  'gray-code': {
    mode: 'structured',
    length: 512,
    template: 'gray-code',
  },
  
  'fibonacci-sequence': {
    mode: 'structured',
    length: 512,
    template: 'fibonacci',
  },
  
  'low-entropy': {
    mode: 'random',
    length: 1024,
    probability: 0.1,
    distribution: 'bernoulli',
  },
  
  'high-entropy': {
    mode: 'random',
    length: 1024,
    probability: 0.5,
    distribution: 'uniform',
    targetEntropy: 0.99,
  },
  
  'balanced-random': {
    mode: 'random',
    length: 1024,
    probability: 0.5,
    distribution: 'uniform',
  },
};

export const PRESET_DESCRIPTIONS: Record<string, string> = {
  'highly-compressible': 'Low entropy data with many repeating patterns - ideal for testing compression',
  'random-noise': 'High entropy random data - difficult to compress',
  'structured-document': 'Simulates a structured file with header, data, and checksum',
  'test-pattern': 'Alternating pattern with minimal noise for testing',
  'binary-file-simulation': 'Realistic binary file structure with headers and checksums',
  'alternating-bits': 'Simple 01010101... pattern',
  'all-zeros': 'All bits set to 0',
  'all-ones': 'All bits set to 1',
  'gray-code': 'Gray code sequence',
  'fibonacci-sequence': 'Fibonacci-based binary sequence',
  'low-entropy': 'Mostly zeros with few ones',
  'high-entropy': 'Maximum randomness and information density',
  'balanced-random': 'Equal probability of 0s and 1s',
};

export const QUICK_SIZES = [
  { label: '512 bits', value: 512 },
  { label: '1 KB', value: 1024 * 8 },
  { label: '10 KB', value: 10 * 1024 * 8 },
  { label: '100 KB', value: 100 * 1024 * 8 },
  { label: '1 MB', value: 1024 * 1024 * 8 },
];
