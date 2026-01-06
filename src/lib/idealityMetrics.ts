/**
 * File Ideality Metrics - Analyzes repeating sequences in binary data
 */

export interface IdealityResult {
  windowSize: number;
  repeatingCount: number;
  totalBits: number;
  idealityPercentage: number;
  idealBitIndices: number[]; // Global indices of bits that are part of repeating sequences
}

export class IdealityMetrics {
  /**
   * Calculate file ideality for a specific window size
   * Ideality = (number of bits in repeating sequences / total bits) * 100
   * 
   * A repeating sequence is a pattern that occurs consecutively
   * e.g., 1010 is 10+10 (repeating), but 100110 is not
   */
  static calculateIdeality(
    bits: string,
    windowSize: number,
    startIndex: number = 0,
    endIndex?: number,
    excludedBitIndices: Set<number> = new Set()
  ): IdealityResult {
    const end = endIndex ?? bits.length - 1;
    const section = bits.substring(startIndex, end + 1);
    
    if (section.length < windowSize * 2) {
      return {
        windowSize,
        repeatingCount: 0,
        totalBits: section.length,
        idealityPercentage: 0,
        idealBitIndices: [],
      };
    }

    // Track which bits are part of repeating sequences
    const isIdealBit = new Array(section.length).fill(false);

    // Sliding window approach - try all starting positions
    for (let n = 0; n <= section.length - windowSize * 2; n++) {
      // Skip if this position is already marked in a higher window size
      const globalIndex = startIndex + n;
      if (excludedBitIndices.has(globalIndex)) {
        continue;
      }

      const pattern = section.substring(n, n + windowSize);
      const nextPattern = section.substring(n + windowSize, n + windowSize * 2);
      
      if (pattern === nextPattern) {
        // Check if any bits in this potential sequence are already excluded
        let hasExcludedBit = false;
        for (let i = n; i < n + windowSize * 2; i++) {
          if (excludedBitIndices.has(startIndex + i)) {
            hasExcludedBit = true;
            break;
          }
        }
        
        if (hasExcludedBit) {
          continue;
        }

        // Found a repeating sequence, mark all bits in it
        let currentPos = n;
        
        // Mark the first two patterns
        for (let i = n; i < n + windowSize * 2; i++) {
          isIdealBit[i] = true;
        }
        
        // Check for more consecutive repetitions
        currentPos = n + windowSize * 2;
        while (currentPos + windowSize <= section.length) {
          const testPattern = section.substring(currentPos, currentPos + windowSize);
          if (testPattern === pattern) {
            // Check if this repetition has excluded bits
            let hasExcluded = false;
            for (let i = currentPos; i < currentPos + windowSize; i++) {
              if (excludedBitIndices.has(startIndex + i)) {
                hasExcluded = true;
                break;
              }
            }
            
            if (hasExcluded) {
              break;
            }

            // Mark this repetition too
            for (let i = currentPos; i < currentPos + windowSize; i++) {
              isIdealBit[i] = true;
            }
            currentPos += windowSize;
          } else {
            break;
          }
        }
      }
    }

    // Count marked bits and get their global indices
    const repeatingCount = isIdealBit.filter(Boolean).length;
    const idealBitIndices = isIdealBit
      .map((isIdeal, idx) => (isIdeal ? startIndex + idx : -1))
      .filter(idx => idx !== -1);
    const idealityPercentage = Math.floor((repeatingCount / section.length) * 100);

    return {
      windowSize,
      repeatingCount,
      totalBits: section.length,
      idealityPercentage,
      idealBitIndices,
    };
  }

  /**
   * Calculate ideality for all window sizes from 1 to half of file size
   * Higher window sizes take precedence - bits counted in larger patterns
   * are excluded from smaller pattern calculations
   */
  static calculateAllIdealities(
    bits: string,
    startIndex: number = 0,
    endIndex?: number
  ): IdealityResult[] {
    const end = endIndex ?? bits.length - 1;
    const sectionLength = end - startIndex + 1;
    const maxWindowSize = Math.floor(sectionLength / 2);
    
    if (maxWindowSize < 1) {
      return [];
    }

    const results: IdealityResult[] = [];
    const excludedBits = new Set<number>();
    
    // Process from largest window size to smallest
    // so larger patterns take precedence
    for (let windowSize = maxWindowSize; windowSize >= 1; windowSize--) {
      const result = this.calculateIdeality(bits, windowSize, startIndex, endIndex, excludedBits);
      
      // Add this window size's ideal bits to the excluded set
      result.idealBitIndices.forEach(idx => excludedBits.add(idx));
      
      // Insert at the beginning to maintain ascending order by window size
      results.unshift(result);
    }

    return results;
  }

  /**
   * Get top N window sizes with highest ideality
   */
  static getTopIdealityWindows(
    bits: string,
    topN: number = 10,
    startIndex: number = 0,
    endIndex?: number
  ): IdealityResult[] {
    const allResults = this.calculateAllIdealities(bits, startIndex, endIndex);
    
    return allResults
      .sort((a, b) => b.idealityPercentage - a.idealityPercentage)
      .slice(0, topN);
  }
}
