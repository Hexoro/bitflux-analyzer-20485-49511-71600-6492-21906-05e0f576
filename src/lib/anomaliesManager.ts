/**
 * Anomalies Manager - Manages custom anomaly definitions
 * Allows adding custom anomaly detection code via Backend mode
 */

export interface AnomalyDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high';
  minLength: number;
  enabled: boolean;
  detectFn: string; // JavaScript function code as string
}

const STORAGE_KEY = 'bsee_anomaly_definitions';

const DEFAULT_ANOMALIES: AnomalyDefinition[] = [
  {
    id: 'palindrome',
    name: 'Palindrome',
    description: 'Detects palindromic bit sequences',
    category: 'Pattern',
    severity: 'medium',
    minLength: 5,
    enabled: true,
    detectFn: `function detect(bits, minLength) {
  const results = [];
  for (let i = 0; i < bits.length; i++) {
    let len = 1;
    while (i - len >= 0 && i + len < bits.length && bits[i - len] === bits[i + len]) {
      len++;
    }
    if (len * 2 - 1 >= minLength) {
      results.push({ position: i - len + 1, length: len * 2 - 1 });
    }
  }
  return results;
}`,
  },
  {
    id: 'repeating_pattern',
    name: 'Repeating Pattern',
    description: 'Detects sequences that repeat consecutively',
    category: 'Pattern',
    severity: 'medium',
    minLength: 4,
    enabled: true,
    detectFn: `function detect(bits, minLength) {
  const results = [];
  for (let patternLen = minLength; patternLen <= 20; patternLen++) {
    for (let i = 0; i <= bits.length - patternLen * 3; i++) {
      const pattern = bits.substring(i, i + patternLen);
      let repeats = 1;
      let pos = i + patternLen;
      while (pos + patternLen <= bits.length && bits.substring(pos, pos + patternLen) === pattern) {
        repeats++;
        pos += patternLen;
      }
      if (repeats >= 3) {
        results.push({ position: i, length: patternLen * repeats, pattern, repeats });
      }
    }
  }
  return results;
}`,
  },
  {
    id: 'alternating',
    name: 'Alternating Sequence',
    description: 'Detects alternating 0101... or 1010... patterns',
    category: 'Pattern',
    severity: 'low',
    minLength: 8,
    enabled: true,
    detectFn: `function detect(bits, minLength) {
  const results = [];
  let start = 0;
  let length = 1;
  for (let i = 1; i < bits.length; i++) {
    if (bits[i] !== bits[i - 1]) {
      length++;
    } else {
      if (length >= minLength) {
        results.push({ position: start, length });
      }
      start = i;
      length = 1;
    }
  }
  if (length >= minLength) {
    results.push({ position: start, length });
  }
  return results;
}`,
  },
  {
    id: 'long_run',
    name: 'Long Run',
    description: 'Detects long sequences of consecutive identical bits',
    category: 'Run',
    severity: 'high',
    minLength: 10,
    enabled: true,
    detectFn: `function detect(bits, minLength) {
  const results = [];
  let currentBit = bits[0];
  let start = 0;
  let length = 1;
  for (let i = 1; i < bits.length; i++) {
    if (bits[i] === currentBit) {
      length++;
    } else {
      if (length >= minLength) {
        results.push({ position: start, length, bit: currentBit });
      }
      currentBit = bits[i];
      start = i;
      length = 1;
    }
  }
  if (length >= minLength) {
    results.push({ position: start, length, bit: currentBit });
  }
  return results;
}`,
  },
  {
    id: 'sparse_region',
    name: 'Sparse Region',
    description: 'Detects regions with extremely low or high bit density',
    category: 'Density',
    severity: 'medium',
    minLength: 64,
    enabled: true,
    detectFn: `function detect(bits, windowSize) {
  const results = [];
  for (let i = 0; i <= bits.length - windowSize; i += windowSize / 2) {
    const window = bits.substring(i, i + windowSize);
    const ones = (window.match(/1/g) || []).length;
    const onesPercent = (ones / windowSize) * 100;
    if (onesPercent < 15 || onesPercent > 85) {
      results.push({ position: i, length: windowSize, density: onesPercent });
    }
  }
  return results;
}`,
  },
  {
    id: 'byte_misalignment',
    name: 'Byte Misalignment',
    description: 'Detects when data is not aligned to byte boundaries',
    category: 'Structure',
    severity: 'low',
    minLength: 1,
    enabled: true,
    detectFn: `function detect(bits, minLength) {
  const results = [];
  if (bits.length % 8 !== 0) {
    results.push({ position: bits.length - (bits.length % 8), length: bits.length % 8 });
  }
  return results;
}`,
  },
  // Additional preset anomalies
  {
    id: 'zero_block',
    name: 'Zero Block',
    description: 'Detects large blocks of consecutive zeros',
    category: 'Run',
    severity: 'medium',
    minLength: 32,
    enabled: true,
    detectFn: `function detect(bits, minLength) {
  const results = [];
  const regex = new RegExp('0{' + minLength + ',}', 'g');
  let match;
  while ((match = regex.exec(bits)) !== null) {
    results.push({ position: match.index, length: match[0].length });
  }
  return results;
}`,
  },
  {
    id: 'one_block',
    name: 'One Block',
    description: 'Detects large blocks of consecutive ones',
    category: 'Run',
    severity: 'medium',
    minLength: 32,
    enabled: true,
    detectFn: `function detect(bits, minLength) {
  const results = [];
  const regex = new RegExp('1{' + minLength + ',}', 'g');
  let match;
  while ((match = regex.exec(bits)) !== null) {
    results.push({ position: match.index, length: match[0].length });
  }
  return results;
}`,
  },
  {
    id: 'header_signature',
    name: 'Header Signature',
    description: 'Detects common file header patterns',
    category: 'Structure',
    severity: 'low',
    minLength: 8,
    enabled: true,
    detectFn: `function detect(bits, minLength) {
  const results = [];
  // Common signatures (in binary)
  const signatures = [
    '11111111110110001010101000010110', // JPEG FF D8
    '0100011101001001010001100011100', // GIF
    '1000100101010000010011100100011', // PNG header
  ];
  for (const sig of signatures) {
    const idx = bits.indexOf(sig);
    if (idx !== -1) {
      results.push({ position: idx, length: sig.length, type: 'file_header' });
    }
  }
  return results;
}`,
  },
  {
    id: 'entropy_spike',
    name: 'Entropy Spike',
    description: 'Detects sudden changes in local entropy',
    category: 'Entropy',
    severity: 'high',
    minLength: 64,
    enabled: true,
    detectFn: `function detect(bits, windowSize) {
  const results = [];
  const step = windowSize / 2;
  let prevEntropy = null;
  
  for (let i = 0; i <= bits.length - windowSize; i += step) {
    const window = bits.substring(i, i + windowSize);
    const ones = (window.match(/1/g) || []).length;
    const p1 = ones / windowSize;
    const p0 = 1 - p1;
    let entropy = 0;
    if (p0 > 0) entropy -= p0 * Math.log2(p0);
    if (p1 > 0) entropy -= p1 * Math.log2(p1);
    
    if (prevEntropy !== null && Math.abs(entropy - prevEntropy) > 0.3) {
      results.push({ position: i, length: windowSize, entropyChange: entropy - prevEntropy });
    }
    prevEntropy = entropy;
  }
  return results;
}`,
  },
  {
    id: 'nibble_repeat',
    name: 'Nibble Repeat',
    description: 'Detects repeating 4-bit patterns',
    category: 'Pattern',
    severity: 'low',
    minLength: 16,
    enabled: true,
    detectFn: `function detect(bits, minLength) {
  const results = [];
  for (let i = 0; i <= bits.length - 8; i += 4) {
    const nibble = bits.substring(i, i + 4);
    let repeats = 1;
    let j = i + 4;
    while (j + 4 <= bits.length && bits.substring(j, j + 4) === nibble) {
      repeats++;
      j += 4;
    }
    if (repeats >= minLength / 4) {
      results.push({ position: i, length: repeats * 4, nibble, repeats });
    }
  }
  return results;
}`,
  },
  {
    id: 'transition_burst',
    name: 'Transition Burst',
    description: 'Detects regions with unusually high bit transitions',
    category: 'Transitions',
    severity: 'medium',
    minLength: 32,
    enabled: true,
    detectFn: `function detect(bits, windowSize) {
  const results = [];
  for (let i = 0; i <= bits.length - windowSize; i += windowSize / 2) {
    const window = bits.substring(i, i + windowSize);
    let transitions = 0;
    for (let j = 1; j < window.length; j++) {
      if (window[j] !== window[j-1]) transitions++;
    }
    const rate = transitions / (windowSize - 1);
    if (rate > 0.8) { // More than 80% transitions
      results.push({ position: i, length: windowSize, transitionRate: rate });
    }
  }
  return results;
}`,
  },
];

class AnomaliesManager {
  private definitions: AnomalyDefinition[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        this.definitions = JSON.parse(data);
      } else {
        this.definitions = [...DEFAULT_ANOMALIES];
        this.saveToStorage();
      }
    } catch (e) {
      console.error('Failed to load anomaly definitions:', e);
      this.definitions = [...DEFAULT_ANOMALIES];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.definitions));
    } catch (e) {
      console.error('Failed to save anomaly definitions:', e);
    }
  }

  getAllDefinitions(): AnomalyDefinition[] {
    return [...this.definitions];
  }

  getEnabledDefinitions(): AnomalyDefinition[] {
    return this.definitions.filter(d => d.enabled);
  }

  getDefinition(id: string): AnomalyDefinition | undefined {
    return this.definitions.find(d => d.id === id);
  }

  addDefinition(definition: Omit<AnomalyDefinition, 'id'>): AnomalyDefinition {
    const id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newDef: AnomalyDefinition = { ...definition, id };
    this.definitions.push(newDef);
    this.saveToStorage();
    this.notifyListeners();
    return newDef;
  }

  updateDefinition(id: string, updates: Partial<AnomalyDefinition>): void {
    const index = this.definitions.findIndex(d => d.id === id);
    if (index !== -1) {
      this.definitions[index] = { ...this.definitions[index], ...updates };
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  deleteDefinition(id: string): void {
    this.definitions = this.definitions.filter(d => d.id !== id);
    this.saveToStorage();
    this.notifyListeners();
  }

  toggleEnabled(id: string): void {
    const def = this.definitions.find(d => d.id === id);
    if (def) {
      def.enabled = !def.enabled;
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  resetToDefaults(): void {
    this.definitions = [...DEFAULT_ANOMALIES];
    this.saveToStorage();
    this.notifyListeners();
  }

  getCategories(): string[] {
    return [...new Set(this.definitions.map(d => d.category))];
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l());
  }

  /**
   * Execute an anomaly detection function on binary data
   */
  executeDetection(id: string, bits: string): Array<{ position: number; length: number; [key: string]: any }> {
    const def = this.definitions.find(d => d.id === id);
    if (!def || !def.enabled) return [];

    try {
      // Create a safe function from the stored code
      const detectFn = new Function('bits', 'minLength', `
        ${def.detectFn}
        return detect(bits, minLength);
      `);
      return detectFn(bits, def.minLength) || [];
    } catch (e) {
      console.error(`Error executing anomaly detection "${def.name}":`, e);
      return [];
    }
  }

  /**
   * Run all enabled anomaly detections on bits
   */
  runAllDetections(bits: string): Array<{ anomalyId: string; anomalyName: string; results: Array<{ position: number; length: number; [key: string]: any }> }> {
    const allResults: Array<{ anomalyId: string; anomalyName: string; results: Array<{ position: number; length: number; [key: string]: any }> }> = [];
    
    for (const def of this.getEnabledDefinitions()) {
      const results = this.executeDetection(def.id, bits);
      if (results.length > 0) {
        allResults.push({
          anomalyId: def.id,
          anomalyName: def.name,
          results,
        });
      }
    }
    
    return allResults;
  }
}

export const anomaliesManager = new AnomaliesManager();
