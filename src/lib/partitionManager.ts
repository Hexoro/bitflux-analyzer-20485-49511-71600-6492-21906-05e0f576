/**
 * Partition Manager - Handle boundary-based partitions
 */

import { BinaryMetrics, BinaryStats } from './binaryMetrics';

export interface Boundary {
  id: string;
  sequence: string;
  positions: number[];
  color: string;
  description: string;
}

export interface Partition {
  id: string;
  startIndex: number;
  endIndex: number;
  bits: string;
  stats: BinaryStats;
  boundaryBefore?: string;
  boundaryAfter?: string;
}

export class PartitionManager {
  private boundaries: Boundary[] = [];
  private deletedBoundaries: Boundary[] = [];
  private highlightEnabled: Map<string, boolean> = new Map();

  addBoundary(sequence: string, description: string, color: string = '#FF00FF'): Boundary {
    const boundary: Boundary = {
      id: `boundary-${Date.now()}-${Math.random()}`,
      sequence,
      positions: [],
      color,
      description,
    };

    this.boundaries.push(boundary);
    this.highlightEnabled.set(boundary.id, true);
    return boundary;
  }

  removeBoundary(id: string): Boundary | null {
    const boundary = this.boundaries.find(b => b.id === id);
    if (boundary) {
      this.boundaries = this.boundaries.filter(b => b.id !== id);
      this.deletedBoundaries.push(boundary);
      this.highlightEnabled.delete(id);
      return boundary;
    }
    return null;
  }

  restoreBoundary(id: string): boolean {
    const boundary = this.deletedBoundaries.find(b => b.id === id);
    if (boundary) {
      this.deletedBoundaries = this.deletedBoundaries.filter(b => b.id !== id);
      this.boundaries.push(boundary);
      this.highlightEnabled.set(boundary.id, true);
      return true;
    }
    return false;
  }

  getDeletedBoundaries(): Boundary[] {
    return [...this.deletedBoundaries];
  }

  setHighlightEnabled(id: string, enabled: boolean): void {
    this.highlightEnabled.set(id, enabled);
  }

  isHighlightEnabled(id: string): boolean {
    return this.highlightEnabled.get(id) ?? true;
  }

  getBoundaries(): Boundary[] {
    return [...this.boundaries];
  }

  updateBoundaryPositions(bits: string): void {
    // Update positions for all boundaries
    for (const boundary of this.boundaries) {
      boundary.positions = this.findAllOccurrences(bits, boundary.sequence);
    }
  }

  private findAllOccurrences(bits: string, sequence: string): number[] {
    const positions: number[] = [];
    let pos = bits.indexOf(sequence);
    
    while (pos !== -1) {
      positions.push(pos);
      pos = bits.indexOf(sequence, pos + 1);
    }
    
    return positions;
  }

  createPartitions(bits: string): Partition[] {
    this.updateBoundaryPositions(bits);
    
    // Collect all boundary positions
    const allPositions = new Set<number>();
    for (const boundary of this.boundaries) {
      boundary.positions.forEach(pos => {
        allPositions.add(pos);
        allPositions.add(pos + boundary.sequence.length);
      });
    }

    // Sort positions
    const sortedPositions = Array.from(allPositions).sort((a, b) => a - b);
    
    // If no boundaries, return single partition
    if (sortedPositions.length === 0) {
      return [{
        id: 'partition-0',
        startIndex: 0,
        endIndex: bits.length - 1,
        bits: bits,
        stats: BinaryMetrics.analyze(bits),
      }];
    }

    // Create partitions between boundaries
    const partitions: Partition[] = [];
    let prevPos = 0;

    for (const pos of sortedPositions) {
      if (pos > prevPos) {
        const partBits = bits.substring(prevPos, pos);
        partitions.push({
          id: `partition-${partitions.length}`,
          startIndex: prevPos,
          endIndex: pos - 1,
          bits: partBits,
          stats: BinaryMetrics.analyze(partBits),
        });
      }
      prevPos = pos;
    }

    // Add final partition
    if (prevPos < bits.length) {
      const partBits = bits.substring(prevPos);
      partitions.push({
        id: `partition-${partitions.length}`,
        startIndex: prevPos,
        endIndex: bits.length - 1,
        bits: partBits,
        stats: BinaryMetrics.analyze(partBits),
      });
    }

    return partitions;
  }

  getHighlightRanges(): Array<{ start: number; end: number; color: string }> {
    const ranges: Array<{ start: number; end: number; color: string }> = [];
    
    for (const boundary of this.boundaries) {
      if (this.isHighlightEnabled(boundary.id)) {
        for (const pos of boundary.positions) {
          ranges.push({
            start: pos,
            end: pos + boundary.sequence.length - 1,
            color: boundary.color,
          });
        }
      }
    }

    return ranges;
  }

  appendBoundaryToFile(bits: string, boundary: string): string {
    return bits + boundary;
  }

  insertBoundaryAt(bits: string, boundary: string, position: number): string {
    if (position < 0 || position > bits.length) return bits;
    return bits.substring(0, position) + boundary + bits.substring(position);
  }
}
