/**
 * Expanded Predefined Items - 100s of operations, metrics, anomalies, strategies, graphs
 */

import { PredefinedMetric, PredefinedOperation } from './predefinedManager';
import { AnomalyDefinition } from './anomaliesManager';
import { GraphDefinition } from './customPresetsManager';

// ============= EXTENDED METRICS (100+) =============
export const EXTENDED_METRICS: PredefinedMetric[] = [
  // Information Theory
  { id: 'conditional_entropy', name: 'Conditional Entropy', description: 'Entropy of X given Y', formula: 'H(X|Y) = -Σ p(x,y) log₂(p(x|y))', unit: 'bits', category: 'Information Theory' },
  { id: 'mutual_info', name: 'Mutual Information', description: 'Information shared between variables', formula: 'I(X;Y) = H(X) - H(X|Y)', unit: 'bits', category: 'Information Theory' },
  { id: 'joint_entropy', name: 'Joint Entropy', description: 'Combined entropy of two variables', formula: 'H(X,Y) = -Σ p(x,y) log₂(p(x,y))', unit: 'bits', category: 'Information Theory' },
  { id: 'cross_entropy', name: 'Cross Entropy', description: 'Entropy of P relative to Q', formula: 'H(P,Q) = -Σ p(x) log₂(q(x))', unit: 'bits', category: 'Information Theory' },
  { id: 'kl_divergence', name: 'KL Divergence', description: 'Relative entropy between distributions', formula: 'D_KL(P||Q) = Σ p(x) log₂(p(x)/q(x))', unit: 'bits', category: 'Information Theory' },
  { id: 'renyi_entropy', name: 'Rényi Entropy', description: 'Generalized entropy measure', formula: 'H_α(X) = 1/(1-α) log₂(Σ p^α)', unit: 'bits', category: 'Information Theory' },
  { id: 'min_entropy', name: 'Min-Entropy', description: 'Worst-case entropy measure', formula: 'H_∞(X) = -log₂(max p(x))', unit: 'bits', category: 'Information Theory' },
  { id: 'collision_entropy', name: 'Collision Entropy', description: 'Rényi entropy with α=2', formula: 'H_2(X) = -log₂(Σ p(x)²)', unit: 'bits', category: 'Information Theory' },

  // Statistics
  { id: 'variance', name: 'Bit Variance', description: 'Variance of bit values', formula: 'σ² = Σ(x - μ)² / n', unit: 'ratio', category: 'Statistics' },
  { id: 'std_dev', name: 'Standard Deviation', description: 'Std deviation of bit values', formula: 'σ = √(Σ(x - μ)² / n)', unit: 'ratio', category: 'Statistics' },
  { id: 'skewness', name: 'Skewness', description: 'Asymmetry of distribution', formula: 'γ₁ = E[(X-μ)³] / σ³', unit: 'coefficient', category: 'Statistics' },
  { id: 'kurtosis', name: 'Kurtosis', description: 'Tailedness of distribution', formula: 'κ = E[(X-μ)⁴] / σ⁴', unit: 'coefficient', category: 'Statistics' },
  { id: 'median', name: 'Median Byte Value', description: 'Median of byte values', formula: 'middle value when sorted', unit: 'value', category: 'Statistics' },
  { id: 'mode', name: 'Mode Byte Value', description: 'Most frequent byte value', formula: 'most frequent value', unit: 'value', category: 'Statistics' },
  { id: 'range', name: 'Byte Value Range', description: 'Range of byte values present', formula: 'max - min', unit: 'value', category: 'Statistics' },
  { id: 'iqr', name: 'Interquartile Range', description: 'IQR of byte values', formula: 'Q3 - Q1', unit: 'value', category: 'Statistics' },
  { id: 'mad', name: 'Mean Absolute Deviation', description: 'Average absolute deviation', formula: 'Σ|x - μ| / n', unit: 'ratio', category: 'Statistics' },
  { id: 'cv', name: 'Coefficient of Variation', description: 'Relative std deviation', formula: 'σ / μ', unit: 'ratio', category: 'Statistics' },

  // Compression
  { id: 'lz77_estimate', name: 'LZ77 Estimate', description: 'Estimated LZ77 compression ratio', formula: 'estimated compressed/original', unit: 'ratio', category: 'Compression' },
  { id: 'rle_ratio', name: 'RLE Compression Ratio', description: 'Run-length encoding ratio', formula: 'RLE encoded size / original', unit: 'ratio', category: 'Compression' },
  { id: 'huffman_estimate', name: 'Huffman Estimate', description: 'Estimated Huffman coding efficiency', formula: 'Σ freq × code_length', unit: 'bits', category: 'Compression' },
  { id: 'bwt_runs', name: 'BWT Run Count', description: 'Runs after BWT transform', formula: 'count(runs in BWT output)', unit: 'count', category: 'Compression' },
  { id: 'mtf_avg', name: 'MTF Average', description: 'Average move-to-front value', formula: 'Σ mtf_value / n', unit: 'value', category: 'Compression' },
  { id: 'zlib_estimate', name: 'ZLIB Estimate', description: 'Estimated ZLIB compression', formula: 'deflate compressed size', unit: 'bytes', category: 'Compression' },

  // Pattern Analysis
  { id: 'longest_repeat', name: 'Longest Repeat', description: 'Longest repeating substring', formula: 'max(len(repeating_substrings))', unit: 'bits', category: 'Pattern Analysis' },
  { id: 'unique_ngrams_2', name: 'Unique 2-grams', description: 'Count of unique 2-bit patterns', formula: 'count(unique 2-bit patterns)', unit: 'count', category: 'Pattern Analysis' },
  { id: 'unique_ngrams_4', name: 'Unique 4-grams', description: 'Count of unique 4-bit patterns', formula: 'count(unique 4-bit patterns)', unit: 'count', category: 'Pattern Analysis' },
  { id: 'unique_ngrams_8', name: 'Unique 8-grams', description: 'Count of unique byte values', formula: 'count(unique bytes)', unit: 'count', category: 'Pattern Analysis' },
  { id: 'pattern_density', name: 'Pattern Density', description: 'Density of detected patterns', formula: 'pattern_bits / total_bits', unit: 'ratio', category: 'Pattern Analysis' },
  { id: 'symmetry_index', name: 'Symmetry Index', description: 'How symmetric is the data', formula: 'matching_symmetric_pairs / total_pairs', unit: 'ratio', category: 'Pattern Analysis' },
  { id: 'periodicity', name: 'Periodicity Score', description: 'Strength of periodic patterns', formula: 'max(autocorrelation peaks)', unit: 'score', category: 'Pattern Analysis' },
  { id: 'fractal_dimension', name: 'Fractal Dimension', description: 'Box-counting dimension estimate', formula: 'log(N(ε)) / log(1/ε)', unit: 'dimension', category: 'Pattern Analysis' },

  // Randomness Tests
  { id: 'monobit_test', name: 'Monobit Test', description: 'NIST monobit frequency test', formula: '|S_n| / √n', unit: 'p-value', category: 'Randomness' },
  { id: 'runs_test', name: 'Runs Test', description: 'NIST runs test for randomness', formula: 'V_n comparison with expected', unit: 'p-value', category: 'Randomness' },
  { id: 'poker_test', name: 'Poker Test', description: 'Chi-square for 4-bit patterns', formula: 'χ² for nibble distribution', unit: 'p-value', category: 'Randomness' },
  { id: 'serial_test', name: 'Serial Test', description: 'Overlapping m-bit pattern test', formula: '∇²ψ_m² test statistic', unit: 'p-value', category: 'Randomness' },
  { id: 'spectral_test', name: 'Spectral Test', description: 'DFT-based periodicity test', formula: 'N_1 - 0.95N_0 / √(0.95×0.05×N_0)', unit: 'score', category: 'Randomness' },
  { id: 'apen', name: 'Approximate Entropy', description: 'ApEn complexity measure', formula: 'ApEn(m, r) = Φ^m(r) - Φ^(m+1)(r)', unit: 'bits', category: 'Randomness' },
  { id: 'sample_entropy', name: 'Sample Entropy', description: 'SampEn regularity measure', formula: '-ln(A/B)', unit: 'bits', category: 'Randomness' },
  { id: 'permutation_entropy', name: 'Permutation Entropy', description: 'Ordinal pattern entropy', formula: 'H(π) / log₂(m!)', unit: 'bits', category: 'Randomness' },

  // Structure
  { id: 'byte_alignment', name: 'Byte Alignment', description: 'Is data byte-aligned', formula: 'length % 8 == 0', unit: 'boolean', category: 'Structure' },
  { id: 'word_alignment', name: 'Word Alignment', description: 'Is data word-aligned (32-bit)', formula: 'length % 32 == 0', unit: 'boolean', category: 'Structure' },
  { id: 'block_regularity', name: 'Block Regularity', description: 'Regularity of block structure', formula: 'std_dev(block_entropies)', unit: 'ratio', category: 'Structure' },
  { id: 'header_size', name: 'Detected Header Size', description: 'Estimated header length', formula: 'first_entropy_transition', unit: 'bits', category: 'Structure' },
  { id: 'footer_size', name: 'Detected Footer Size', description: 'Estimated footer length', formula: 'last_entropy_transition', unit: 'bits', category: 'Structure' },
  { id: 'segment_count', name: 'Segment Count', description: 'Number of detected segments', formula: 'entropy_transition_count', unit: 'count', category: 'Structure' },

  // Bit-level
  { id: 'leading_zeros', name: 'Leading Zeros', description: 'Count of leading zero bits', formula: 'count until first 1', unit: 'count', category: 'Bit Analysis' },
  { id: 'trailing_zeros', name: 'Trailing Zeros', description: 'Count of trailing zero bits', formula: 'count from last 1', unit: 'count', category: 'Bit Analysis' },
  { id: 'bit_reversal_distance', name: 'Bit Reversal Distance', description: 'Hamming distance to reversed', formula: 'hamming(bits, reverse(bits))', unit: 'count', category: 'Bit Analysis' },
  { id: 'complement_distance', name: 'Complement Distance', description: 'Difference from complement', formula: 'hamming(bits, NOT bits)', unit: 'count', category: 'Bit Analysis' },
  { id: 'parity', name: 'Parity', description: 'Overall parity (odd/even)', formula: 'XOR of all bits', unit: 'bit', category: 'Bit Analysis' },
  { id: 'popcount', name: 'Population Count', description: 'Count of set bits (popcount)', formula: 'count(1 bits)', unit: 'count', category: 'Bit Analysis' },

  // Transition Analysis
  { id: 'rise_count', name: 'Rise Count', description: 'Count of 0→1 transitions', formula: 'count(0→1)', unit: 'count', category: 'Transitions' },
  { id: 'fall_count', name: 'Fall Count', description: 'Count of 1→0 transitions', formula: 'count(1→0)', unit: 'count', category: 'Transitions' },
  { id: 'rise_fall_ratio', name: 'Rise/Fall Ratio', description: 'Ratio of rises to falls', formula: 'rise_count / fall_count', unit: 'ratio', category: 'Transitions' },
  { id: 'toggle_rate', name: 'Toggle Rate', description: 'Frequency of bit toggles', formula: 'transitions / (length - 1)', unit: 'ratio', category: 'Transitions' },
  { id: 'max_stable_run', name: 'Max Stable Run', description: 'Longest run without toggle', formula: 'max(run_lengths)', unit: 'count', category: 'Transitions' },
  { id: 'avg_stable_run', name: 'Avg Stable Run', description: 'Average stable run length', formula: 'mean(run_lengths)', unit: 'count', category: 'Transitions' },

  // Frequency Domain
  { id: 'dominant_freq', name: 'Dominant Frequency', description: 'Most prominent frequency', formula: 'argmax(|FFT(bits)|)', unit: 'Hz', category: 'Frequency' },
  { id: 'spectral_flatness', name: 'Spectral Flatness', description: 'How noise-like is spectrum', formula: 'geometric_mean / arithmetic_mean', unit: 'ratio', category: 'Frequency' },
  { id: 'spectral_centroid', name: 'Spectral Centroid', description: 'Center of mass of spectrum', formula: 'Σ(f × |X(f)|) / Σ|X(f)|', unit: 'Hz', category: 'Frequency' },
  { id: 'bandwidth', name: 'Spectral Bandwidth', description: 'Width of spectral content', formula: 'std_dev of spectral distribution', unit: 'Hz', category: 'Frequency' },

  // Complexity Measures
  { id: 'lempel_ziv', name: 'Lempel-Ziv Complexity', description: 'LZ76 normalized complexity', formula: 'c(n) / (n / log₂(n))', unit: 'ratio', category: 'Complexity' },
  { id: 'block_entropy', name: 'Block Entropy', description: 'Entropy of block patterns', formula: 'H(blocks of size k)', unit: 'bits', category: 'Complexity' },
  { id: 't_complexity', name: 'T-Complexity', description: 'Titchener complexity', formula: 'T(string) / length', unit: 'ratio', category: 'Complexity' },
  { id: 'effective_complexity', name: 'Effective Complexity', description: 'Non-random complexity', formula: 'K(regularities)', unit: 'bits', category: 'Complexity' },
  { id: 'logical_depth', name: 'Logical Depth', description: 'Computational depth estimate', formula: 'time to compute from K', unit: 'steps', category: 'Complexity' },
  { id: 'bit_complexity', name: 'Bit Complexity', description: 'Approximate Kolmogorov complexity', formula: 'compression ratio estimate', unit: 'ratio', category: 'Complexity' },

  // Additional Core Metrics (ensuring all 76+ have definitions)
  { id: 'standard_deviation', name: 'Standard Deviation (Bits)', description: 'Standard deviation of bit values', formula: 'σ = √variance', unit: 'ratio', category: 'Statistics' },
  { id: 'serial_correlation', name: 'Serial Correlation', description: 'Correlation between adjacent bits', formula: 'Σ(bit[i] × bit[i+1])', unit: 'coefficient', category: 'Statistics' },
  { id: 'pattern_diversity', name: 'Pattern Diversity', description: 'Ratio of unique 8-bit patterns to 256', formula: 'unique_patterns / 256', unit: 'ratio', category: 'Pattern Analysis' },
  { id: 'bit_density', name: 'Bit Density', description: 'Density of 1-bits in data', formula: 'ones / total', unit: 'ratio', category: 'Statistics' },
  { id: 'longest_run_ones', name: 'Longest Run of Ones', description: 'Longest consecutive 1-bits', formula: 'max(run_length where bit=1)', unit: 'count', category: 'Bit Analysis' },
  { id: 'longest_run_zeros', name: 'Longest Run of Zeros', description: 'Longest consecutive 0-bits', formula: 'max(run_length where bit=0)', unit: 'count', category: 'Bit Analysis' },
  { id: 'runs_count', name: 'Run Count', description: 'Total number of runs', formula: 'count(consecutive same bits)', unit: 'count', category: 'Transitions' },
  { id: 'bias_percentage', name: 'Bias Percentage', description: 'How biased towards 0 or 1', formula: '|balance - 0.5| × 200', unit: 'percent', category: 'Statistics' },
  { id: 'block_entropy_8', name: 'Block Entropy (8-bit)', description: 'Mean entropy of 8-bit blocks', formula: 'mean(H(block_8))', unit: 'bits', category: 'Information Theory' },
  { id: 'block_entropy_16', name: 'Block Entropy (16-bit)', description: 'Mean entropy of 16-bit blocks', formula: 'mean(H(block_16))', unit: 'bits', category: 'Information Theory' },
  { id: 'block_entropy_overlapping', name: 'Overlapping Block Entropy', description: 'Entropy with overlapping windows', formula: 'H(overlapping_blocks)', unit: 'bits', category: 'Information Theory' },
  { id: 'transition_rate', name: 'Transition Rate', description: 'Rate of bit transitions', formula: 'transitions / (n-1)', unit: 'ratio', category: 'Transitions' },
  { id: 'transition_entropy', name: 'Transition Entropy', description: 'Entropy of transition patterns', formula: 'H(00,01,10,11)', unit: 'bits', category: 'Transitions' },
  { id: 'hamming_distance_self', name: 'Hamming Distance (Halves)', description: 'Hamming distance between halves', formula: 'hamming(first_half, second_half)', unit: 'count', category: 'Bit Analysis' },
  { id: 'autocorr_lag1', name: 'Autocorrelation Lag-1', description: 'Autocorrelation at lag 1', formula: 'corr(bits, shift(bits,1))', unit: 'coefficient', category: 'Statistics' },
  { id: 'autocorr_lag2', name: 'Autocorrelation Lag-2', description: 'Autocorrelation at lag 2', formula: 'corr(bits, shift(bits,2))', unit: 'coefficient', category: 'Statistics' },
  { id: 'byte_entropy', name: 'Byte-Level Entropy', description: 'Entropy computed on bytes', formula: 'H(byte_values)', unit: 'bits', category: 'Information Theory' },
  { id: 'nibble_entropy', name: 'Nibble-Level Entropy', description: 'Entropy computed on nibbles', formula: 'H(nibble_values)', unit: 'bits', category: 'Information Theory' },
];

// ============= EXTENDED OPERATIONS (100+) =============
export const EXTENDED_OPERATIONS: PredefinedOperation[] = [
  // Additional Logic Gates
  { id: 'IMPLY', name: 'Implication', description: 'Logical implication (NOT A OR B)', parameters: [{ name: 'mask', type: 'binary', description: 'Implication pattern' }], category: 'Logic Gates' },
  { id: 'NIMPLY', name: 'Non-Implication', description: 'Logical non-implication (A AND NOT B)', parameters: [{ name: 'mask', type: 'binary', description: 'Pattern' }], category: 'Logic Gates' },
  { id: 'CONVERSE', name: 'Converse Implication', description: 'Converse implication (A OR NOT B)', parameters: [{ name: 'mask', type: 'binary', description: 'Pattern' }], category: 'Logic Gates' },
  { id: 'BUFFER', name: 'Buffer', description: 'Identity operation (no change)', parameters: [], category: 'Logic Gates' },
  { id: 'MUX', name: 'Multiplexer', description: '2-to-1 multiplexer operation', parameters: [{ name: 'selector', type: 'binary', description: 'Selector bits' }, { name: 'input1', type: 'binary', description: 'Input if sel=0' }], category: 'Logic Gates' },
  { id: 'DEMUX', name: 'Demultiplexer', description: '1-to-2 demultiplexer', parameters: [{ name: 'selector', type: 'binary', description: 'Selector bits' }], category: 'Logic Gates' },
  { id: 'MAJ', name: 'Majority Gate', description: 'Output 1 if majority are 1', parameters: [{ name: 'a', type: 'binary', description: 'First input' }, { name: 'b', type: 'binary', description: 'Second input' }], category: 'Logic Gates' },
  { id: 'PARITY', name: 'Parity Gate', description: 'XOR reduction (parity)', parameters: [{ name: 'width', type: 'number', description: 'Window width' }], category: 'Logic Gates' },
  { id: 'ODD', name: 'Odd Parity', description: 'Set odd parity per byte', parameters: [], category: 'Logic Gates' },
  { id: 'EVEN', name: 'Even Parity', description: 'Set even parity per byte', parameters: [], category: 'Logic Gates' },

  // Arithmetic
  { id: 'INC', name: 'Increment', description: 'Add 1 to value', parameters: [], category: 'Arithmetic' },
  { id: 'DEC', name: 'Decrement', description: 'Subtract 1 from value', parameters: [], category: 'Arithmetic' },
  { id: 'NEG', name: 'Negate', description: 'Two\'s complement negation', parameters: [], category: 'Arithmetic' },
  { id: 'ABS', name: 'Absolute', description: 'Absolute value (signed)', parameters: [], category: 'Arithmetic' },
  { id: 'MUL', name: 'Multiply', description: 'Binary multiplication', parameters: [{ name: 'multiplier', type: 'binary', description: 'Multiplier value' }], category: 'Arithmetic' },
  { id: 'DIV', name: 'Divide', description: 'Binary division', parameters: [{ name: 'divisor', type: 'binary', description: 'Divisor value' }], category: 'Arithmetic' },
  { id: 'MOD', name: 'Modulo', description: 'Remainder after division', parameters: [{ name: 'divisor', type: 'binary', description: 'Divisor value' }], category: 'Arithmetic' },
  { id: 'SAT_ADD', name: 'Saturating Add', description: 'Add with saturation (no overflow)', parameters: [{ name: 'value', type: 'binary', description: 'Value to add' }], category: 'Arithmetic' },
  { id: 'SAT_SUB', name: 'Saturating Sub', description: 'Subtract with saturation', parameters: [{ name: 'value', type: 'binary', description: 'Value to subtract' }], category: 'Arithmetic' },
  { id: 'CLZ', name: 'Count Leading Zeros', description: 'Count leading zero bits', parameters: [], category: 'Arithmetic' },
  { id: 'CTZ', name: 'Count Trailing Zeros', description: 'Count trailing zero bits', parameters: [], category: 'Arithmetic' },
  { id: 'POPCNT', name: 'Population Count', description: 'Count set bits', parameters: [], category: 'Arithmetic' },

  // Advanced Shifts
  { id: 'ASR', name: 'Arithmetic Shift Right', description: 'Shift right preserving sign', parameters: [{ name: 'count', type: 'number', description: 'Shift amount' }], category: 'Shifts' },
  { id: 'ASL', name: 'Arithmetic Shift Left', description: 'Shift left preserving sign', parameters: [{ name: 'count', type: 'number', description: 'Shift amount' }], category: 'Shifts' },
  { id: 'BSWAP', name: 'Byte Swap', description: 'Reverse byte order', parameters: [], category: 'Shifts' },
  { id: 'WSWAP', name: 'Word Swap', description: 'Reverse word order', parameters: [], category: 'Shifts' },
  { id: 'NIBSWAP', name: 'Nibble Swap', description: 'Swap nibbles in each byte', parameters: [], category: 'Shifts' },
  { id: 'BITREV', name: 'Bit Reverse', description: 'Reverse all bits', parameters: [], category: 'Shifts' },
  { id: 'BYTEREV', name: 'Byte Bit Reverse', description: 'Reverse bits in each byte', parameters: [], category: 'Shifts' },
  { id: 'RCL', name: 'Rotate Left Through Carry', description: 'Rotate left with carry', parameters: [{ name: 'count', type: 'number', description: 'Rotation amount' }], category: 'Shifts' },
  { id: 'RCR', name: 'Rotate Right Through Carry', description: 'Rotate right with carry', parameters: [{ name: 'count', type: 'number', description: 'Rotation amount' }], category: 'Shifts' },
  { id: 'FUNNEL', name: 'Funnel Shift', description: 'Double-width shift', parameters: [{ name: 'count', type: 'number', description: 'Shift amount' }, { name: 'second', type: 'binary', description: 'Second operand' }], category: 'Shifts' },

  // Bit Manipulation
  { id: 'BSET', name: 'Bit Set', description: 'Set specific bit to 1', parameters: [{ name: 'position', type: 'number', description: 'Bit position' }], category: 'Bit Manipulation' },
  { id: 'BCLR', name: 'Bit Clear', description: 'Clear specific bit to 0', parameters: [{ name: 'position', type: 'number', description: 'Bit position' }], category: 'Bit Manipulation' },
  { id: 'BTOG', name: 'Bit Toggle', description: 'Toggle specific bit', parameters: [{ name: 'position', type: 'number', description: 'Bit position' }], category: 'Bit Manipulation' },
  { id: 'BTEST', name: 'Bit Test', description: 'Test specific bit value', parameters: [{ name: 'position', type: 'number', description: 'Bit position' }], category: 'Bit Manipulation' },
  { id: 'BEXTRACT', name: 'Bit Extract', description: 'Extract bit field', parameters: [{ name: 'start', type: 'number', description: 'Start position' }, { name: 'length', type: 'number', description: 'Field length' }], category: 'Bit Manipulation' },
  { id: 'BINSERT', name: 'Bit Insert', description: 'Insert bit field', parameters: [{ name: 'start', type: 'number', description: 'Start position' }, { name: 'value', type: 'binary', description: 'Value to insert' }], category: 'Bit Manipulation' },
  { id: 'BDEPOSIT', name: 'Bit Deposit', description: 'Parallel bit deposit (PDEP)', parameters: [{ name: 'mask', type: 'binary', description: 'Deposit mask' }], category: 'Bit Manipulation' },
  { id: 'BGATHER', name: 'Bit Gather', description: 'Parallel bit extract (PEXT)', parameters: [{ name: 'mask', type: 'binary', description: 'Gather mask' }], category: 'Bit Manipulation' },
  { id: 'INTERLEAVE', name: 'Interleave', description: 'Interleave bits from two sources', parameters: [{ name: 'other', type: 'binary', description: 'Second bit source' }], category: 'Bit Manipulation' },
  { id: 'DEINTERLEAVE', name: 'Deinterleave', description: 'Separate interleaved bits', parameters: [], category: 'Bit Manipulation' },
  { id: 'SHUFFLE', name: 'Bit Shuffle', description: 'Shuffle bits by permutation', parameters: [{ name: 'permutation', type: 'string', description: 'Permutation indices' }], category: 'Bit Manipulation' },
  { id: 'UNSHUFFLE', name: 'Bit Unshuffle', description: 'Reverse bit shuffle', parameters: [{ name: 'permutation', type: 'string', description: 'Original permutation' }], category: 'Bit Manipulation' },

  // Encoding
  { id: 'BASE64_ENC', name: 'Base64 Encode', description: 'Encode to Base64', parameters: [], category: 'Encoding' },
  { id: 'BASE64_DEC', name: 'Base64 Decode', description: 'Decode from Base64', parameters: [], category: 'Encoding' },
  { id: 'HAMMING_ENC', name: 'Hamming Encode', description: 'Add Hamming error correction', parameters: [{ name: 'block_size', type: 'number', description: 'Data block size' }], category: 'Encoding' },
  { id: 'HAMMING_DEC', name: 'Hamming Decode', description: 'Remove Hamming coding', parameters: [{ name: 'block_size', type: 'number', description: 'Code block size' }], category: 'Encoding' },
  { id: 'MANCHESTER', name: 'Manchester Encode', description: 'Manchester line coding', parameters: [], category: 'Encoding' },
  { id: 'DEMANCHESTER', name: 'Manchester Decode', description: 'Decode Manchester coding', parameters: [], category: 'Encoding' },
  { id: 'NRZI', name: 'NRZI Encode', description: 'Non-return-to-zero inverted', parameters: [], category: 'Encoding' },
  { id: 'DENRZI', name: 'NRZI Decode', description: 'Decode NRZI', parameters: [], category: 'Encoding' },
  { id: 'DIFF', name: 'Differential Encode', description: 'Differential encoding', parameters: [], category: 'Encoding' },
  { id: 'DEDIFF', name: 'Differential Decode', description: 'Decode differential', parameters: [], category: 'Encoding' },
  { id: 'RLL', name: 'Run-Length Limit', description: 'RLL encoding for storage', parameters: [{ name: 'd', type: 'number', description: 'Min run length' }, { name: 'k', type: 'number', description: 'Max run length' }], category: 'Encoding' },
  { id: 'DERLL', name: 'RLL Decode', description: 'Decode RLL', parameters: [], category: 'Encoding' },

  // Compression Transforms
  { id: 'BWT', name: 'Burrows-Wheeler Transform', description: 'BWT for compression', parameters: [], category: 'Compression' },
  { id: 'IBWT', name: 'Inverse BWT', description: 'Reverse BWT transform', parameters: [], category: 'Compression' },
  { id: 'MTF', name: 'Move-to-Front', description: 'MTF transform', parameters: [], category: 'Compression' },
  { id: 'IMTF', name: 'Inverse MTF', description: 'Reverse MTF transform', parameters: [], category: 'Compression' },
  { id: 'RLE', name: 'Run-Length Encode', description: 'RLE compression', parameters: [], category: 'Compression' },
  { id: 'DERLE', name: 'Run-Length Decode', description: 'Decompress RLE', parameters: [], category: 'Compression' },
  { id: 'DELTA', name: 'Delta Encode', description: 'Store differences', parameters: [], category: 'Compression' },
  { id: 'DEDELTA', name: 'Delta Decode', description: 'Reconstruct from deltas', parameters: [], category: 'Compression' },
  { id: 'ZIGZAG', name: 'ZigZag Encode', description: 'ZigZag for signed integers', parameters: [], category: 'Compression' },
  { id: 'DEZIGZAG', name: 'ZigZag Decode', description: 'Decode ZigZag', parameters: [], category: 'Compression' },

  // Cryptographic Primitives
  { id: 'SBOX', name: 'S-Box Substitution', description: 'AES-like S-box substitution', parameters: [{ name: 'table', type: 'string', description: 'S-box table (hex)' }], category: 'Crypto' },
  { id: 'PERMUTE', name: 'Bit Permutation', description: 'Permute bits (DES-like)', parameters: [{ name: 'table', type: 'string', description: 'Permutation table' }], category: 'Crypto' },
  { id: 'FEISTEL', name: 'Feistel Round', description: 'One Feistel network round', parameters: [{ name: 'key', type: 'binary', description: 'Round key' }], category: 'Crypto' },
  { id: 'MIXCOL', name: 'Mix Columns', description: 'AES-like column mixing', parameters: [], category: 'Crypto' },
  { id: 'SHIFTROW', name: 'Shift Rows', description: 'AES-like row shifting', parameters: [], category: 'Crypto' },
  { id: 'ADDROUNDKEY', name: 'Add Round Key', description: 'XOR with round key', parameters: [{ name: 'key', type: 'binary', description: 'Round key' }], category: 'Crypto' },

  // Checksums
  { id: 'CRC8', name: 'CRC-8', description: 'Append CRC-8 checksum', parameters: [{ name: 'poly', type: 'binary', description: 'Polynomial' }], category: 'Checksum' },
  { id: 'CRC16', name: 'CRC-16', description: 'Append CRC-16 checksum', parameters: [{ name: 'poly', type: 'binary', description: 'Polynomial' }], category: 'Checksum' },
  { id: 'CRC32', name: 'CRC-32', description: 'Append CRC-32 checksum', parameters: [{ name: 'poly', type: 'binary', description: 'Polynomial' }], category: 'Checksum' },
  { id: 'CHECKSUM8', name: 'Simple Checksum', description: '8-bit sum checksum', parameters: [], category: 'Checksum' },
  { id: 'FLETCHER', name: 'Fletcher Checksum', description: 'Fletcher checksum', parameters: [{ name: 'bits', type: 'number', description: '16 or 32' }], category: 'Checksum' },
  { id: 'ADLER', name: 'Adler-32', description: 'Adler-32 checksum', parameters: [], category: 'Checksum' },
  { id: 'LUHN', name: 'Luhn Check', description: 'Luhn algorithm check digit', parameters: [], category: 'Checksum' },

  // Data Manipulation
  { id: 'COPY', name: 'Copy Region', description: 'Copy bits to another position', parameters: [{ name: 'src', type: 'number', description: 'Source position' }, { name: 'dst', type: 'number', description: 'Dest position' }, { name: 'len', type: 'number', description: 'Length' }], category: 'Data' },
  { id: 'FILL', name: 'Fill Region', description: 'Fill region with pattern', parameters: [{ name: 'start', type: 'number', description: 'Start position' }, { name: 'len', type: 'number', description: 'Length' }, { name: 'pattern', type: 'binary', description: 'Fill pattern' }], category: 'Data' },
  { id: 'SPLICE', name: 'Splice', description: 'Insert data at position', parameters: [{ name: 'position', type: 'number', description: 'Insert position' }, { name: 'data', type: 'binary', description: 'Data to insert' }], category: 'Data' },
  { id: 'TRUNCATE', name: 'Truncate', description: 'Remove trailing bits', parameters: [{ name: 'length', type: 'number', description: 'New length' }], category: 'Data' },
  { id: 'EXTEND', name: 'Extend', description: 'Extend with pattern', parameters: [{ name: 'length', type: 'number', description: 'New length' }, { name: 'pattern', type: 'binary', description: 'Extension pattern' }], category: 'Data' },
  { id: 'CONCAT', name: 'Concatenate', description: 'Append data', parameters: [{ name: 'data', type: 'binary', description: 'Data to append' }], category: 'Data' },
  { id: 'SPLIT', name: 'Split', description: 'Split at position', parameters: [{ name: 'position', type: 'number', description: 'Split position' }], category: 'Data' },
  { id: 'MERGE', name: 'Merge', description: 'Merge two streams', parameters: [{ name: 'other', type: 'binary', description: 'Other stream' }, { name: 'op', type: 'string', description: 'Merge operation (xor/and/or)' }], category: 'Data' },
];

// ============= EXTENDED ANOMALIES =============
export const EXTENDED_ANOMALIES: Omit<AnomalyDefinition, 'id'>[] = [
  {
    name: 'Entropy Spike',
    description: 'Detects sudden increases in local entropy',
    category: 'Entropy',
    severity: 'high',
    minLength: 32,
    enabled: true,
    detectFn: `function detect(bits, windowSize) {
  const results = [];
  const step = windowSize / 2;
  let prevEntropy = 0;
  
  for (let i = 0; i <= bits.length - windowSize; i += step) {
    const window = bits.substring(i, i + windowSize);
    const ones = (window.match(/1/g) || []).length;
    const p = ones / windowSize;
    const entropy = p > 0 && p < 1 ? -p * Math.log2(p) - (1-p) * Math.log2(1-p) : 0;
    
    if (prevEntropy > 0 && entropy - prevEntropy > 0.3) {
      results.push({ position: i, length: windowSize, entropyChange: entropy - prevEntropy });
    }
    prevEntropy = entropy;
  }
  return results;
}`,
  },
  {
    name: 'Magic Bytes',
    description: 'Detects common file signatures',
    category: 'Structure',
    severity: 'medium',
    minLength: 8,
    enabled: true,
    detectFn: `function detect(bits, minLength) {
  const results = [];
  const signatures = {
    '01010000010010110000001100000100': 'ZIP',
    '11111111110110001111111111100000': 'JPEG',
    '10001001010100000100111001000111': 'PNG',
    '01000111010010010100011000111000': 'GIF',
    '00100101010100000100010001000110': 'PDF',
  };
  
  for (const [sig, type] of Object.entries(signatures)) {
    const idx = bits.indexOf(sig);
    if (idx !== -1) {
      results.push({ position: idx, length: sig.length, type: type });
    }
  }
  return results;
}`,
  },
  {
    name: 'Null Region',
    description: 'Detects regions of all zeros',
    category: 'Pattern',
    severity: 'low',
    minLength: 32,
    enabled: true,
    detectFn: `function detect(bits, minLength) {
  const results = [];
  const pattern = '0'.repeat(minLength);
  let pos = 0;
  
  while (pos < bits.length) {
    const idx = bits.indexOf(pattern, pos);
    if (idx === -1) break;
    
    let end = idx + minLength;
    while (end < bits.length && bits[end] === '0') end++;
    
    results.push({ position: idx, length: end - idx });
    pos = end;
  }
  return results;
}`,
  },
  {
    name: 'All Ones Region',
    description: 'Detects regions of all ones',
    category: 'Pattern',
    severity: 'low',
    minLength: 32,
    enabled: true,
    detectFn: `function detect(bits, minLength) {
  const results = [];
  const pattern = '1'.repeat(minLength);
  let pos = 0;
  
  while (pos < bits.length) {
    const idx = bits.indexOf(pattern, pos);
    if (idx === -1) break;
    
    let end = idx + minLength;
    while (end < bits.length && bits[end] === '1') end++;
    
    results.push({ position: idx, length: end - idx });
    pos = end;
  }
  return results;
}`,
  },
  {
    name: 'Counting Sequence',
    description: 'Detects incrementing byte sequences',
    category: 'Pattern',
    severity: 'medium',
    minLength: 24,
    enabled: true,
    detectFn: `function detect(bits, minLength) {
  const results = [];
  if (bits.length < minLength) return results;
  
  for (let i = 0; i <= bits.length - 24; i += 8) {
    let consecutive = 0;
    for (let j = 0; j < 10 && i + (j+1)*8 <= bits.length; j++) {
      const b1 = parseInt(bits.substr(i + j*8, 8), 2);
      const b2 = parseInt(bits.substr(i + (j+1)*8, 8), 2);
      if (b2 === b1 + 1) consecutive++;
      else break;
    }
    if (consecutive >= 2) {
      results.push({ position: i, length: (consecutive + 1) * 8, type: 'counting' });
      i += consecutive * 8;
    }
  }
  return results;
}`,
  },
  {
    name: 'Checksum Pattern',
    description: 'Detects potential checksum bytes at regular intervals',
    category: 'Structure',
    severity: 'low',
    minLength: 64,
    enabled: true,
    detectFn: `function detect(bits, blockSize) {
  const results = [];
  // Look for bytes that look like checksums at block boundaries
  for (let i = blockSize; i < bits.length; i += blockSize) {
    if (i + 8 <= bits.length) {
      const prevBlock = bits.substring(i - blockSize, i);
      const checkByte = bits.substring(i, i + 8);
      
      // Simple sum check
      let sum = 0;
      for (let j = 0; j < prevBlock.length; j += 8) {
        sum = (sum + parseInt(prevBlock.substr(j, 8), 2)) & 0xFF;
      }
      
      if (parseInt(checkByte, 2) === sum) {
        results.push({ position: i, length: 8, type: 'checksum' });
      }
    }
  }
  return results;
}`,
  },
  {
    name: 'ASCII Text',
    description: 'Detects printable ASCII character sequences',
    category: 'Content',
    severity: 'low',
    minLength: 32,
    enabled: true,
    detectFn: `function detect(bits, minLength) {
  const results = [];
  let start = -1;
  let len = 0;
  
  for (let i = 0; i < bits.length; i += 8) {
    const byte = parseInt(bits.substr(i, 8), 2);
    if (byte >= 32 && byte < 127) {
      if (start === -1) start = i;
      len += 8;
    } else {
      if (len >= minLength) {
        results.push({ position: start, length: len });
      }
      start = -1;
      len = 0;
    }
  }
  if (len >= minLength) {
    results.push({ position: start, length: len });
  }
  return results;
}`,
  },
  {
    name: 'Bit Stuffing',
    description: 'Detects bit stuffing patterns (HDLC-like)',
    category: 'Protocol',
    severity: 'medium',
    minLength: 6,
    enabled: true,
    detectFn: `function detect(bits, minLength) {
  const results = [];
  // HDLC uses 0 insertion after 5 consecutive 1s
  const stuffPattern = /11111[0]/g;
  let match;
  
  while ((match = stuffPattern.exec(bits)) !== null) {
    results.push({ position: match.index, length: 6, type: 'bit-stuffing' });
  }
  return results;
}`,
  },
  {
    name: 'Frame Delimiter',
    description: 'Detects HDLC frame delimiters (01111110)',
    category: 'Protocol',
    severity: 'medium',
    minLength: 8,
    enabled: true,
    detectFn: `function detect(bits, minLength) {
  const results = [];
  const flag = '01111110';
  let pos = 0;
  
  while (pos < bits.length) {
    const idx = bits.indexOf(flag, pos);
    if (idx === -1) break;
    results.push({ position: idx, length: 8, type: 'frame-flag' });
    pos = idx + 1;
  }
  return results;
}`,
  },
  {
    name: 'Fibonacci Pattern',
    description: 'Detects Fibonacci-like number sequences',
    category: 'Pattern',
    severity: 'low',
    minLength: 24,
    enabled: true,
    detectFn: `function detect(bits, minLength) {
  const results = [];
  
  for (let i = 0; i <= bits.length - 24; i += 8) {
    if (i + 24 > bits.length) break;
    
    const n1 = parseInt(bits.substr(i, 8), 2);
    const n2 = parseInt(bits.substr(i + 8, 8), 2);
    const n3 = parseInt(bits.substr(i + 16, 8), 2);
    
    if (n1 + n2 === n3 && n1 > 0 && n2 > 0) {
      // Check for more Fibonacci numbers
      let len = 24;
      let a = n2, b = n3;
      for (let j = i + 24; j + 8 <= bits.length; j += 8) {
        const next = parseInt(bits.substr(j, 8), 2);
        if (a + b === next) {
          len += 8;
          a = b;
          b = next;
        } else break;
      }
      if (len >= minLength) {
        results.push({ position: i, length: len, type: 'fibonacci' });
      }
    }
  }
  return results;
}`,
  },
];

// ============= EXAMPLE GRAPH DEFINITIONS =============
export const EXAMPLE_GRAPHS: Omit<GraphDefinition, 'id'>[] = [
  {
    name: 'Bit Balance Over Time',
    description: 'Shows 1s ratio across the file',
    type: 'line',
    enabled: true,
    dataFn: `function getData(bits) {
  const windowSize = Math.max(64, Math.floor(bits.length / 100));
  const data = [];
  
  for (let i = 0; i < bits.length; i += windowSize) {
    const window = bits.slice(i, Math.min(i + windowSize, bits.length));
    const ones = (window.match(/1/g) || []).length;
    data.push({
      position: i,
      balance: (ones / window.length * 100).toFixed(2),
      expected: 50
    });
  }
  return data;
}`,
  },
  {
    name: 'Transition Density',
    description: 'Bit transition frequency across file',
    type: 'area',
    enabled: true,
    dataFn: `function getData(bits) {
  const windowSize = Math.max(32, Math.floor(bits.length / 80));
  const data = [];
  
  for (let i = 0; i < bits.length - 1; i += windowSize) {
    const window = bits.slice(i, Math.min(i + windowSize, bits.length));
    let transitions = 0;
    for (let j = 1; j < window.length; j++) {
      if (window[j] !== window[j-1]) transitions++;
    }
    data.push({
      position: i,
      density: (transitions / window.length * 100).toFixed(2)
    });
  }
  return data;
}`,
  },
  {
    name: 'Autocorrelation Peaks',
    description: 'Shows pattern periodicity',
    type: 'line',
    enabled: true,
    dataFn: `function getData(bits) {
  const sample = bits.slice(0, Math.min(2000, bits.length));
  const data = [];
  
  for (let lag = 1; lag < Math.min(100, sample.length / 2); lag++) {
    let correlation = 0;
    for (let i = 0; i < sample.length - lag; i++) {
      const v1 = sample[i] === '1' ? 1 : -1;
      const v2 = sample[i + lag] === '1' ? 1 : -1;
      correlation += v1 * v2;
    }
    data.push({
      lag,
      correlation: (correlation / (sample.length - lag)).toFixed(4)
    });
  }
  return data;
}`,
  },
  {
    name: 'Nibble Frequency',
    description: 'Frequency of 4-bit patterns',
    type: 'bar',
    enabled: true,
    dataFn: `function getData(bits) {
  const freq = {};
  for (let i = 0; i < bits.length; i += 4) {
    const nibble = bits.slice(i, i + 4).padEnd(4, '0');
    freq[nibble] = (freq[nibble] || 0) + 1;
  }
  
  return Object.entries(freq)
    .map(([pattern, count]) => ({
      pattern,
      decimal: parseInt(pattern, 2),
      count
    }))
    .sort((a, b) => a.decimal - b.decimal);
}`,
  },
  {
    name: 'Complexity Heatmap',
    description: 'Local complexity measure',
    type: 'area',
    enabled: true,
    dataFn: `function getData(bits) {
  const windowSize = 128;
  const data = [];
  
  for (let i = 0; i < bits.length - windowSize; i += windowSize/2) {
    const window = bits.slice(i, i + windowSize);
    
    // Count unique 4-grams
    const patterns = new Set();
    for (let j = 0; j < window.length - 4; j++) {
      patterns.add(window.slice(j, j + 4));
    }
    
    // Count transitions
    let trans = 0;
    for (let j = 1; j < window.length; j++) {
      if (window[j] !== window[j-1]) trans++;
    }
    
    data.push({
      position: i,
      uniquePatterns: patterns.size,
      transitions: trans,
      complexity: ((patterns.size / 16) * (trans / window.length) * 100).toFixed(2)
    });
  }
  return data;
}`,
  },
];

// ============= CODE-BASED GENERATION PRESETS =============
export const CODE_GENERATION_PRESETS = [
  {
    name: 'PRNG (Linear Congruential)',
    description: 'Classic LCG pseudo-random generator',
    code: `function generate(length) {
  let seed = Date.now() % 2147483647;
  const a = 1103515245;
  const c = 12345;
  const m = 2147483648;
  let bits = '';
  
  while (bits.length < length) {
    seed = (a * seed + c) % m;
    bits += (seed >>> 16).toString(2).padStart(16, '0');
  }
  return bits.slice(0, length);
}`,
  },
  {
    name: 'XorShift Generator',
    description: 'Fast XorShift pseudo-random',
    code: `function generate(length) {
  let state = Date.now() | 1;
  let bits = '';
  
  while (bits.length < length) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    bits += (state >>> 0).toString(2).padStart(32, '0');
  }
  return bits.slice(0, length);
}`,
  },
  {
    name: 'Perlin-like Noise',
    description: 'Smooth noise-like pattern',
    code: `function generate(length) {
  let bits = '';
  const freq = 0.1;
  
  for (let i = 0; i < length; i++) {
    const t = i * freq;
    const value = Math.sin(t) * Math.sin(t * 1.5) * Math.sin(t * 0.7);
    bits += value > 0 ? '1' : '0';
  }
  return bits;
}`,
  },
  {
    name: 'Markov Chain',
    description: 'State-based probabilistic generation',
    code: `function generate(length) {
  // Transition probabilities: P(1|0) = 0.3, P(1|1) = 0.7
  let bits = Math.random() > 0.5 ? '1' : '0';
  
  for (let i = 1; i < length; i++) {
    const prev = bits[i-1];
    const p = prev === '0' ? 0.3 : 0.7;
    bits += Math.random() < p ? '1' : '0';
  }
  return bits;
}`,
  },
  {
    name: 'Sierpinski Pattern',
    description: 'Fractal triangle pattern',
    code: `function generate(length) {
  const width = Math.ceil(Math.sqrt(length));
  let bits = '';
  
  for (let i = 0; i < length; i++) {
    const row = Math.floor(i / width);
    const col = i % width;
    bits += (row & col) === 0 ? '1' : '0';
  }
  return bits.slice(0, length);
}`,
  },
  {
    name: 'Cellular Automaton (Rule 30)',
    description: 'Wolfram Rule 30 CA',
    code: `function generate(length) {
  const width = 128;
  let row = new Array(width).fill(0);
  row[width >> 1] = 1;
  let bits = '';
  
  while (bits.length < length) {
    bits += row.join('');
    const next = new Array(width).fill(0);
    for (let i = 1; i < width - 1; i++) {
      const pattern = (row[i-1] << 2) | (row[i] << 1) | row[i+1];
      next[i] = (30 >> pattern) & 1;
    }
    row = next;
  }
  return bits.slice(0, length);
}`,
  },
];

// ============= EXAMPLE STRATEGIES =============
export const EXAMPLE_STRATEGIES = [
  {
    name: 'Entropy Minimizer',
    language: 'lua',
    description: 'Reduces entropy through strategic bit manipulation',
    code: `-- Entropy Minimizer Strategy
-- Applies operations to reduce overall entropy

function execute()
  log("Starting entropy minimizer")
  local initial = get_metric("entropy")
  log("Initial entropy: " .. string.format("%.4f", initial))
  
  local ops = 0
  local max_ops = 50
  
  while ops < max_ops and budget > 0 do
    local entropy = get_metric("entropy")
    
    -- Try XOR with common pattern
    if entropy > 0.8 and is_operation_allowed("XOR") then
      apply_operation("XOR", {mask = "10101010"})
      ops = ops + 1
    elseif entropy > 0.5 and is_operation_allowed("AND") then
      apply_operation("AND", {mask = "11110000"})
      ops = ops + 1
    elseif is_operation_allowed("OR") then
      apply_operation("OR", {mask = "00001111"})
      ops = ops + 1
    else
      break
    end
  end
  
  local final = get_metric("entropy")
  log("Final entropy: " .. string.format("%.4f", final))
  log("Reduction: " .. string.format("%.2f%%", (initial - final) * 100))
end

execute()`,
  },
  {
    name: 'Pattern Detector',
    language: 'lua',
    description: 'Analyzes and logs pattern characteristics',
    code: `-- Pattern Detector Strategy
-- Logs various pattern metrics without modification

function execute()
  log("Pattern Detection Analysis")
  log("========================")
  
  local entropy = get_metric("entropy")
  local balance = get_metric("balance")
  local transitions = get_metric("transition_count")
  local run_avg = get_metric("run_length_avg")
  
  log("Entropy: " .. string.format("%.4f", entropy))
  log("Balance: " .. string.format("%.2f%%", balance * 100))
  log("Transitions: " .. tostring(transitions))
  log("Avg Run Length: " .. string.format("%.2f", run_avg))
  
  -- Analyze pattern type
  if entropy < 0.3 then
    log("Pattern: Highly structured/compressible")
  elseif entropy < 0.7 then
    log("Pattern: Moderate structure")
  elseif entropy < 0.95 then
    log("Pattern: Near-random")
  else
    log("Pattern: Maximum entropy (random)")
  end
  
  if balance < 0.3 or balance > 0.7 then
    log("Warning: Significant bit imbalance")
  end
  
  if run_avg > 10 then
    log("Note: Long runs detected")
  end
end

execute()`,
  },
  {
    name: 'Compression Optimizer',
    language: 'lua',
    description: 'Prepares data for better compression',
    code: `-- Compression Optimizer
-- Applies transforms to improve compressibility

function execute()
  log("Compression optimization starting")
  
  local initial_ratio = get_metric("compression_ratio")
  log("Initial compression ratio: " .. string.format("%.2f", initial_ratio))
  
  -- Apply BWT-like transforms if available
  if is_operation_allowed("ROL") then
    for i = 1, 8 do
      apply_operation("ROL", {count = i})
      local ratio = get_metric("compression_ratio")
      if ratio < initial_ratio then
        log("Rotation " .. i .. " improved ratio to " .. string.format("%.2f", ratio))
        initial_ratio = ratio
      end
    end
  end
  
  -- Try XOR with common patterns
  local patterns = {"00000000", "11111111", "01010101", "10101010"}
  for _, pat in ipairs(patterns) do
    if is_operation_allowed("XOR") and budget > 5 then
      apply_operation("XOR", {mask = pat})
      local ratio = get_metric("compression_ratio")
      log("XOR with " .. pat .. ": ratio = " .. string.format("%.2f", ratio))
    end
  end
  
  log("Optimization complete")
end

execute()`,
  },
];
