/**
 * History Manager - Track all edits to binary data
 */

export interface HistoryEntry {
  id: string;
  timestamp: Date;
  description: string;
  bits: string;
  stats?: {
    totalBits: number;
    zeroCount: number;
    oneCount: number;
    entropy: number;
  };
}

export class HistoryManager {
  private entries: HistoryEntry[] = [];
  private maxEntries = 100;
  private lastEntryType: string | null = null;
  private lastEntryTime: number = 0;

  addEntry(bits: string, description: string): void {
    const now = Date.now();
    const entryType = this.getEntryType(description);
    
    // Auto-group if same type and within 30 seconds
    const shouldMerge = this.lastEntryType === entryType && 
                        now - this.lastEntryTime < 30000 &&
                        this.entries.length > 0 &&
                        entryType === 'Manual Edit';
    
    if (shouldMerge && this.entries[0]) {
      // Update the most recent entry
      this.entries[0] = {
        ...this.entries[0],
        bits,
        stats: this.calculateQuickStats(bits),
        description: this.mergeDescriptions(this.entries[0].description, description),
      };
    } else {
      const entry: HistoryEntry = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        description,
        bits,
        stats: this.calculateQuickStats(bits),
      };

      this.entries.unshift(entry);
      
      // Limit history size
      if (this.entries.length > this.maxEntries) {
        this.entries = this.entries.slice(0, this.maxEntries);
      }
    }
    
    this.lastEntryType = entryType;
    this.lastEntryTime = now;
  }

  private getEntryType(description: string): string {
    const lower = description.toLowerCase();
    if (lower.includes('manual edit')) return 'Manual Edit';
    if (lower.includes('boundary')) return 'Boundary';
    if (lower.includes('transform')) return 'Transform';
    return 'Other';
  }

  private mergeDescriptions(old: string, newDesc: string): string {
    // Extract counts from descriptions like "Manual edit: +5 bits"
    const oldMatch = old.match(/([+-])(\d+)/);
    const newMatch = newDesc.match(/([+-])(\d+)/);
    
    if (oldMatch && newMatch && oldMatch[1] === newMatch[1]) {
      const totalCount = parseInt(oldMatch[2]) + parseInt(newMatch[2]);
      const sign = oldMatch[1];
      return `Manual edit: ${sign}${totalCount} bits`;
    }
    
    return newDesc;
  }

  getEntries(): HistoryEntry[] {
    return [...this.entries];
  }

  getEntry(id: string): HistoryEntry | null {
    return this.entries.find(e => e.id === id) || null;
  }

  clear(): void {
    this.entries = [];
  }

  private calculateQuickStats(bits: string) {
    const zeroCount = bits.split('0').length - 1;
    const oneCount = bits.length - zeroCount;
    const p0 = bits.length > 0 ? zeroCount / bits.length : 0;
    const p1 = bits.length > 0 ? oneCount / bits.length : 0;
    
    let entropy = 0;
    if (p0 > 0) entropy -= p0 * Math.log2(p0);
    if (p1 > 0) entropy -= p1 * Math.log2(p1);

    return {
      totalBits: bits.length,
      zeroCount,
      oneCount,
      entropy,
    };
  }
}
