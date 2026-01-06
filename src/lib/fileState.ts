/**
 * File State - Manages all state for a single binary file
 */

import { BinaryModel } from './binaryModel';
import { BinaryStats, BinaryMetrics, SequenceMatch } from './binaryMetrics';
import { HistoryManager, HistoryEntry } from './historyManager';
import { PartitionManager, Partition, Boundary } from './partitionManager';
import { NotesManager } from './notesManager';

export interface BitRange {
  id: string;
  start: number;
  end: number;
}

export interface SavedSequence extends SequenceMatch {
  id: string;
  serialNumber: number;
  color: string;
  highlighted: boolean;
}

export interface HistoryGroup {
  id: string;
  type: string;
  count: number;
  firstTimestamp: Date;
  lastTimestamp: Date;
  entries: HistoryEntry[];
  expanded: boolean;
}

export class FileState {
  public model: BinaryModel;
  public historyManager: HistoryManager;
  public partitionManager: PartitionManager;
  public notesManager: NotesManager;
  public stats: BinaryStats | null = null;
  public savedSequences: SavedSequence[] = [];
  public selectedRanges: BitRange[] = [];

  /**
   * External highlight ranges (e.g. Player step highlights).
   * Kept separate from selection/boundaries so the UI can overlay temporary highlights.
   */
  private externalHighlightRanges: Array<{ start: number; end: number; color: string }> = [];

  private nextSerial: number = 1;
  private listeners: Set<() => void> = new Set();
  private editDebounceTimer: NodeJS.Timeout | null = null;

  constructor(initialBits: string) {
    this.model = new BinaryModel(initialBits);
    this.historyManager = new HistoryManager();
    this.partitionManager = new PartitionManager();
    this.notesManager = new NotesManager();

    // Subscribe to model changes
    this.model.subscribe(() => {
      this.updateStats();
      this.handleModelChange();
      this.notifyListeners();
    });

    // Initial stats
    if (initialBits.length > 0) {
      this.updateStats();
      this.historyManager.addEntry(initialBits, 'File created');
    }
  }

  private handleModelChange(): void {
    // Debounce manual edits to group them together
    if (this.editDebounceTimer) {
      clearTimeout(this.editDebounceTimer);
    }

    this.editDebounceTimer = setTimeout(() => {
      const description = this.model.getBatchedEditDescription();
      if (description !== 'Manual edit') {
        this.historyManager.addEntry(this.model.getBits(), description);
        this.model.clearEditBatch();
      }
    }, 500);
  }

  updateStats(): void {
    const bits = this.model.getBits();
    if (bits.length > 0) {
      this.stats = BinaryMetrics.analyze(bits);
    } else {
      this.stats = null;
    }
  }

  addToHistory(description: string): void {
    this.historyManager.addEntry(this.model.getBits(), description);
  }

  getPartitions(): Partition[] {
    const boundaries = this.partitionManager.getBoundaries();
    if (boundaries.length === 0) return [];
    return this.partitionManager.createPartitions(this.model.getBits());
  }

  getBoundaries(): Boundary[] {
    return this.partitionManager.getBoundaries();
  }

  setExternalHighlightRanges(ranges: Array<{ start: number; end: number; color?: string }>): void {
    this.externalHighlightRanges = ranges.map(r => ({
      start: r.start,
      end: r.end,
      color: r.color || 'hsl(var(--primary) / 0.25)',
    }));
    this.notifyListeners();
  }

  clearExternalHighlightRanges(): void {
    if (this.externalHighlightRanges.length === 0) return;
    this.externalHighlightRanges = [];
    this.notifyListeners();
  }

  getHighlightRanges(): Array<{ start: number; end: number; color: string }> {
    const boundaryRanges = this.partitionManager.getHighlightRanges();
    const sequenceRanges = this.getSequenceHighlightRanges();
    const selectionRanges = this.getSelectionHighlightRanges();
    return [...this.externalHighlightRanges, ...sequenceRanges, ...boundaryRanges, ...selectionRanges];
  }

  private getSelectionHighlightRanges(): Array<{ start: number; end: number; color: string }> {
    return this.selectedRanges.map(range => ({
      start: range.start,
      end: range.end,
      color: '#fbbf24', // amber-400 for selection highlight
    }));
  }

  private getSequenceHighlightRanges(): Array<{ start: number; end: number; color: string }> {
    const ranges: Array<{ start: number; end: number; color: string }> = [];
    const bits = this.model.getBits();
    
    this.savedSequences.forEach(seq => {
      if (seq.highlighted) {
        // Re-search for the sequence in the current bits
        const matches = BinaryMetrics.searchSequence(bits, seq.sequence);
        matches.positions.forEach(pos => {
          ranges.push({
            start: pos,
            end: pos + seq.sequence.length - 1,
            color: seq.color,
          });
        });
      }
    });
    
    return ranges;
  }

  // Sequence management methods
  addSequence(sequence: SequenceMatch, color: string): SavedSequence {
    const savedSeq: SavedSequence = {
      ...sequence,
      id: `seq-${Date.now()}-${Math.random()}`,
      serialNumber: this.nextSerial++,
      color,
      highlighted: true,
    };
    
    this.savedSequences.push(savedSeq);
    this.notifyListeners();
    return savedSeq;
  }

  removeSequence(id: string): void {
    this.savedSequences = this.savedSequences.filter(s => s.id !== id);
    this.notifyListeners();
  }

  toggleSequenceHighlight(id: string): void {
    const seq = this.savedSequences.find(s => s.id === id);
    if (seq) {
      seq.highlighted = !seq.highlighted;
      this.notifyListeners();
    }
  }

  clearAllSequences(): void {
    this.savedSequences = [];
    this.nextSerial = 1;
    this.notifyListeners();
  }

  // Bit range selection methods
  setSelectedRanges(ranges: BitRange[]): void {
    this.selectedRanges = ranges;
    this.notifyListeners();
  }

  getSelectedRanges(): BitRange[] {
    return this.selectedRanges;
  }

  clearSelectedRanges(): void {
    this.selectedRanges = [];
    this.notifyListeners();
  }

  getSequence(id: string): SavedSequence | null {
    return this.savedSequences.find(s => s.id === id) || null;
  }

  getHistoryGroups(): HistoryGroup[] {
    const entries = this.historyManager.getEntries();
    const groups: HistoryGroup[] = [];
    let currentGroup: HistoryGroup | null = null;

    for (const entry of entries) {
      const type = this.getHistoryType(entry.description);
      
      if (!currentGroup || currentGroup.type !== type) {
        // Start new group
        currentGroup = {
          id: `group-${groups.length}`,
          type,
          count: 1,
          firstTimestamp: entry.timestamp,
          lastTimestamp: entry.timestamp,
          entries: [entry],
          expanded: false,
        };
        groups.push(currentGroup);
      } else {
        // Add to existing group
        currentGroup.count++;
        currentGroup.lastTimestamp = entry.timestamp;
        currentGroup.entries.push(entry);
      }
    }

    return groups;
  }

  private getHistoryType(description: string): string {
    const lower = description.toLowerCase();
    if (lower.includes('boundary')) return 'Boundary';
    if (lower.includes('transform') || lower.includes('invert') || lower.includes('reverse') || 
        lower.includes('shift') || lower.includes('xor') || lower.includes('pad')) return 'Transformation';
    if (lower.includes('edit')) return 'Edit';
    if (lower.includes('generated')) return 'Generate';
    if (lower.includes('loaded') || lower.includes('file created')) return 'Load';
    return 'Other';
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}
