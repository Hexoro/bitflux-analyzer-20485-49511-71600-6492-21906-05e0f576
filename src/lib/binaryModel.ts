/**
 * Binary Model - Core data structure for binary file manipulation
 */

export interface BitRange {
  start: number;
  end: number;
}

export interface UndoAction {
  type: 'edit' | 'paste' | 'insert' | 'delete';
  range: BitRange;
  oldBits: string;
  newBits: string;
}

export class BinaryModel {
  private originalBits: string = '';
  private workingBits: string = '';
  private undoStack: UndoAction[] = [];
  private redoStack: UndoAction[] = [];
  private listeners: Set<() => void> = new Set();
  private lastEditTimestamp: number = 0;
  private pendingEditBatch: { type: string; count: number } | null = null;

  constructor(initialBits: string = '') {
    this.originalBits = initialBits;
    this.workingBits = initialBits;
  }

  // Get current working bits
  getBits(): string {
    return this.workingBits;
  }

  // Get original bits
  getOriginalBits(): string {
    return this.originalBits;
  }

  // Get bit at position
  getBit(index: number): string {
    return this.workingBits[index] || '0';
  }

  // Get length
  getLength(): number {
    return this.workingBits.length;
  }

  // Insert bits at a specific index
  insertBits(index: number, bits: string): void {
    if (index < 0 || index > this.workingBits.length) return;
    if (!bits) return;

    this.pushUndo({
      type: 'insert',
      range: { start: index, end: index },
      oldBits: '',
      newBits: bits,
    });

    this.workingBits = 
      this.workingBits.substring(0, index) + 
      bits + 
      this.workingBits.substring(index);
    
    this.notifyListeners();
  }

  // Delete bits in a range
  deleteBits(start: number, end: number): void {
    if (start < 0 || end > this.workingBits.length || start >= end) return;

    const deletedBits = this.workingBits.substring(start, end);

    this.pushUndo({
      type: 'delete',
      range: { start, end },
      oldBits: deletedBits,
      newBits: '',
    });

    this.workingBits = 
      this.workingBits.substring(0, start) + 
      this.workingBits.substring(end);
    
    this.notifyListeners();
  }

  // Peek at bits without modifying (read-only)
  peekBits(start: number, length: number): string {
    if (start < 0 || start >= this.workingBits.length) return '';
    return this.workingBits.substring(start, start + length);
  }

  // Move bits from one location to another
  moveBits(srcStart: number, srcEnd: number, destIndex: number): void {
    if (srcStart < 0 || srcEnd > this.workingBits.length || srcStart >= srcEnd) return;
    
    const movedBits = this.workingBits.substring(srcStart, srcEnd);
    const afterDelete = this.workingBits.substring(0, srcStart) + this.workingBits.substring(srcEnd);
    
    if (destIndex < 0) destIndex = 0;
    if (destIndex > afterDelete.length) destIndex = afterDelete.length;
    
    const newBits = afterDelete.substring(0, destIndex) + movedBits + afterDelete.substring(destIndex);

    this.pushUndo({
      type: 'edit',
      range: { start: 0, end: this.workingBits.length },
      oldBits: this.workingBits,
      newBits: newBits,
    });

    this.workingBits = newBits;
    this.notifyListeners();
  }

  // Apply bit mask using AND, OR, or XOR
  applyMask(mask: string, operation: 'AND' | 'OR' | 'XOR'): void {
    if (!mask) return;

    // Extend mask to match length
    const extendedMask = mask.repeat(Math.ceil(this.workingBits.length / mask.length))
      .substring(0, this.workingBits.length);

    let newBits = '';
    for (let i = 0; i < this.workingBits.length; i++) {
      const a = this.workingBits[i];
      const b = extendedMask[i];
      
      switch (operation) {
        case 'AND':
          newBits += (a === '1' && b === '1') ? '1' : '0';
          break;
        case 'OR':
          newBits += (a === '1' || b === '1') ? '1' : '0';
          break;
        case 'XOR':
          newBits += a !== b ? '1' : '0';
          break;
      }
    }

    this.pushUndo({
      type: 'edit',
      range: { start: 0, end: this.workingBits.length },
      oldBits: this.workingBits,
      newBits: newBits,
    });

    this.workingBits = newBits;
    this.notifyListeners();
  }

  // Append bits to the end
  appendBits(bits: string): void {
    if (!bits) return;

    this.pushUndo({
      type: 'insert',
      range: { start: this.workingBits.length, end: this.workingBits.length },
      oldBits: '',
      newBits: bits,
    });

    this.workingBits += bits;
    this.notifyListeners();
  }

  // Truncate to specified length
  truncateTo(length: number): void {
    if (length < 0 || length >= this.workingBits.length) return;

    const truncatedBits = this.workingBits.substring(length);

    this.pushUndo({
      type: 'delete',
      range: { start: length, end: this.workingBits.length },
      oldBits: truncatedBits,
      newBits: '',
    });

    this.workingBits = this.workingBits.substring(0, length);
    this.notifyListeners();
  }

  // Set bit at position
  setBit(index: number, value: '0' | '1'): void {
    if (index < 0 || index >= this.workingBits.length) return;
    
    const oldBit = this.workingBits[index];
    if (oldBit === value) return;

    this.pushUndo({
      type: 'edit',
      range: { start: index, end: index },
      oldBits: oldBit,
      newBits: value,
    });

    this.workingBits = 
      this.workingBits.substring(0, index) + 
      value + 
      this.workingBits.substring(index + 1);
    
    this.notifyListeners();
  }

  // Set multiple bits
  setBits(start: number, bits: string): void {
    if (start < 0 || start >= this.workingBits.length) return;
    
    const end = Math.min(start + bits.length - 1, this.workingBits.length - 1);
    const oldBits = this.workingBits.substring(start, end + 1);

    this.pushUndo({
      type: 'paste',
      range: { start, end },
      oldBits,
      newBits: bits,
    });

    this.workingBits = 
      this.workingBits.substring(0, start) + 
      bits + 
      this.workingBits.substring(start + bits.length);
    
    this.notifyListeners();
  }

  // Undo last action
  undo(): boolean {
    const action = this.undoStack.pop();
    if (!action) return false;

    this.redoStack.push(action);
    this.workingBits = 
      this.workingBits.substring(0, action.range.start) + 
      action.oldBits + 
      this.workingBits.substring(action.range.start + action.newBits.length);
    
    this.notifyListeners();
    return true;
  }

  // Redo last undone action
  redo(): boolean {
    const action = this.redoStack.pop();
    if (!action) return false;

    this.undoStack.push(action);
    this.workingBits = 
      this.workingBits.substring(0, action.range.start) + 
      action.newBits + 
      this.workingBits.substring(action.range.start + action.oldBits.length);
    
    this.notifyListeners();
    return true;
  }

  // Load new file - with optional history tracking
  loadBits(bits: string, addToHistory: boolean = false): void {
    if (!addToHistory) {
      this.originalBits = bits;
      this.undoStack = [];
      this.redoStack = [];
    }
    
    const oldLength = this.workingBits.length;
    const newLength = bits.length;
    
    // Track edit type for batching
    if (addToHistory) {
      const now = Date.now();
      const editType = newLength > oldLength ? 'insert' : newLength < oldLength ? 'delete' : 'replace';
      
      // If within 500ms of last edit, batch them
      if (now - this.lastEditTimestamp < 500 && this.pendingEditBatch?.type === editType) {
        this.pendingEditBatch.count++;
      } else {
        this.pendingEditBatch = { type: editType, count: 1 };
      }
      
      this.lastEditTimestamp = now;
    }
    
    this.workingBits = bits;
    this.notifyListeners();
  }

  // Load bits without adding to history or resetting undo/redo
  loadBitsNoHistory(bits: string): void {
    this.workingBits = bits;
    this.notifyListeners();
  }

  // Get description of batched edits
  getBatchedEditDescription(): string {
    if (!this.pendingEditBatch) return 'Manual edit';
    
    const { type, count } = this.pendingEditBatch;
    const plural = count > 1 ? 's' : '';
    
    switch (type) {
      case 'insert': return `Manual edit: +${count} bit${plural}`;
      case 'delete': return `Manual edit: -${count} bit${plural}`;
      case 'replace': return `Manual edit: ${count} change${plural}`;
      default: return 'Manual edit';
    }
  }

  // Clear pending edit batch
  clearEditBatch(): void {
    this.pendingEditBatch = null;
  }

  // Reset to original
  reset(): void {
    this.workingBits = this.originalBits;
    this.undoStack = [];
    this.redoStack = [];
    this.notifyListeners();
  }

  // Save working as original
  commit(): void {
    this.originalBits = this.workingBits;
    this.undoStack = [];
    this.redoStack = [];
    this.notifyListeners();
  }

  // Subscribe to changes
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Private methods
  private pushUndo(action: UndoAction): void {
    this.undoStack.push(action);
    this.redoStack = []; // Clear redo stack on new action
    
    // Limit undo stack size
    if (this.undoStack.length > 100) {
      this.undoStack.shift();
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  // Static utility methods
  
  /**
   * Generate random binary string
   */
  static generateRandom(length: number, probability: number = 0.5, seed?: string): string {
    // Simple seeded random if seed is provided
    let random = Math.random;
    if (seed) {
      let seedValue = 0;
      for (let i = 0; i < seed.length; i++) {
        seedValue = ((seedValue << 5) - seedValue) + seed.charCodeAt(i);
        seedValue = seedValue & seedValue;
      }
      random = () => {
        seedValue = (seedValue * 9301 + 49297) % 233280;
        return seedValue / 233280;
      };
    }
    
    let bits = '';
    for (let i = 0; i < length; i++) {
      bits += random() < probability ? '1' : '0';
    }
    return bits;
  }

  /**
   * Generate from a repeating pattern
   */
  static generateFromPattern(pattern: string, length: number, noise: number = 0): string {
    if (!pattern) return '';
    
    let bits = '';
    for (let i = 0; i < length; i++) {
      const patternBit = pattern[i % pattern.length];
      // Add noise if specified
      if (noise > 0 && Math.random() < noise) {
        bits += patternBit === '1' ? '0' : '1';
      } else {
        bits += patternBit;
      }
    }
    return bits;
  }

  /**
   * Generate structured data from templates
   */
  static generateStructured(template: string, length: number, blockSize?: number): string {
    switch (template) {
      case 'zeros':
        return '0'.repeat(length);
      
      case 'ones':
        return '1'.repeat(length);
      
      case 'alternating':
        return '01'.repeat(Math.ceil(length / 2)).substring(0, length);
      
      case 'blocks': {
        const size = blockSize || 8;
        let bits = '';
        let current = '0';
        for (let i = 0; i < length; i += size) {
          bits += current.repeat(Math.min(size, length - i));
          current = current === '0' ? '1' : '0';
        }
        return bits;
      }
      
      case 'gray-code': {
        let bits = '';
        for (let i = 0; i < length; i++) {
          const grayCode = i ^ (i >> 1);
          const bit = (grayCode >> (i % 8)) & 1;
          bits += bit.toString();
        }
        return bits;
      }
      
      case 'fibonacci': {
        let bits = '';
        let a = 0, b = 1;
        for (let i = 0; i < length; i++) {
          bits += (b % 2).toString();
          const temp = a + b;
          a = b;
          b = temp;
        }
        return bits;
      }
      
      default:
        return this.generateRandom(length, 0.5);
    }
  }

  /**
   * Generate data with target entropy
   */
  static generateWithEntropy(length: number, targetEntropy: number): string {
    // Entropy is maximized at p=0.5, minimized at p=0 or p=1
    // For binary, entropy H = -p*log2(p) - (1-p)*log2(1-p)
    // Solve for p given target entropy
    
    if (targetEntropy >= 1) {
      return this.generateRandom(length, 0.5);
    }
    
    if (targetEntropy <= 0) {
      return '0'.repeat(length);
    }
    
    // Binary search for probability that gives target entropy
    let low = 0, high = 0.5;
    let bestP = 0.5;
    
    for (let iter = 0; iter < 20; iter++) {
      const p = (low + high) / 2;
      const entropy = p > 0 && p < 1 
        ? -p * Math.log2(p) - (1 - p) * Math.log2(1 - p)
        : 0;
      
      if (Math.abs(entropy - targetEntropy) < 0.01) {
        bestP = p;
        break;
      }
      
      if (entropy < targetEntropy) {
        low = p;
      } else {
        high = p;
      }
      bestP = p;
    }
    
    return this.generateRandom(length, bestP);
  }

  /**
   * Generate file format with header, data, and checksum
   */
  static generateFileFormat(length: number, headerPattern: string = '11111111'): string {
    const headerLength = headerPattern.length;
    const checksumLength = 8;
    const dataLength = length - headerLength - checksumLength;
    
    if (dataLength <= 0) {
      return this.generateRandom(length, 0.5);
    }
    
    const data = this.generateRandom(dataLength, 0.5);
    
    // Simple checksum (count of 1s modulo 256)
    const onesCount = data.split('').filter(b => b === '1').length;
    const checksum = (onesCount % 256).toString(2).padStart(8, '0');
    
    return headerPattern + data + checksum;
  }

  // Utility: Load from file (text format: only 0s and 1s)
  static fromTextFile(content: string): string {
    return content.replace(/[^01]/g, '');
  }

  // Utility: Load from binary file (each byte becomes 8 bits)
  static fromBinaryFile(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let bits = '';
    for (const byte of bytes) {
      bits += byte.toString(2).padStart(8, '0');
    }
    return bits;
  }

  // Utility: Export to binary file
  static toBinaryFile(bits: string): Uint8Array {
    const paddedBits = bits.padEnd(Math.ceil(bits.length / 8) * 8, '0');
    const bytes = new Uint8Array(paddedBits.length / 8);
    
    for (let i = 0; i < bytes.length; i++) {
      const byte = paddedBits.substring(i * 8, i * 8 + 8);
      bytes[i] = parseInt(byte, 2);
    }
    
    return new Uint8Array(bytes);
  }
}
