/**
 * Notes Manager - Manage user notes for binary analysis
 */

export interface Note {
  id: string;
  timestamp: Date;
  content: string;
  tags?: string[];
  pinned: boolean;
}

export class NotesManager {
  private notes: Note[] = [];
  private prePopulatedAdded = false;

  constructor() {
    this.addPrePopulatedNotes();
  }

  private addPrePopulatedNotes(): void {
    if (this.prePopulatedAdded) return;
    
    const prePopulated: Omit<Note, 'id' | 'timestamp'>[] = [
      {
        content: `# Binary Analysis Cheat Sheet

## Common File Signatures (Magic Numbers)
- **PNG**: \`89 50 4E 47\` (‰PNG)
- **JPEG**: \`FF D8 FF\`
- **GIF**: \`47 49 46 38\` (GIF8)
- **PDF**: \`25 50 44 46\` (%PDF)
- **ZIP**: \`50 4B 03 04\` (PK)
- **EXE**: \`4D 5A\` (MZ)

## Encoding Schemes
- **ASCII**: 7-bit encoding (0-127)
- **UTF-8**: Variable-length (1-4 bytes)
- **UTF-16**: Fixed 16-bit units
- **Base64**: 6-bit groups → ASCII

## Analysis Techniques
1. Entropy analysis for randomness
2. Pattern recognition for repeating structures
3. Boundary detection for file sections
4. Sequence searching for specific patterns`,
        tags: ['reference', 'file-formats'],
        pinned: true,
      },
    ];

    prePopulated.forEach(note => {
      this.notes.push({
        ...note,
        id: `pre-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
      });
    });

    this.prePopulatedAdded = true;
  }

  addNote(content: string, tags?: string[], pinned: boolean = false): Note {
    const note: Note = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      content,
      tags,
      pinned,
    };
    
    if (pinned) {
      this.notes.unshift(note);
    } else {
      // Insert after pinned notes
      const firstUnpinnedIndex = this.notes.findIndex(n => !n.pinned);
      if (firstUnpinnedIndex === -1) {
        this.notes.push(note);
      } else {
        this.notes.splice(firstUnpinnedIndex, 0, note);
      }
    }
    
    return note;
  }

  updateNote(id: string, content: string, tags?: string[]): boolean {
    const note = this.notes.find(n => n.id === id);
    if (!note) return false;
    
    note.content = content;
    note.tags = tags;
    return true;
  }

  deleteNote(id: string): boolean {
    const index = this.notes.findIndex(n => n.id === id);
    if (index === -1) return false;
    
    this.notes.splice(index, 1);
    return true;
  }

  togglePin(id: string): boolean {
    const note = this.notes.find(n => n.id === id);
    if (!note) return false;
    
    note.pinned = !note.pinned;
    
    // Reorder notes
    this.notes.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });
    
    return true;
  }

  getNotes(): Note[] {
    return [...this.notes];
  }

  getNote(id: string): Note | null {
    return this.notes.find(n => n.id === id) || null;
  }

  searchNotes(query: string): Note[] {
    const lowerQuery = query.toLowerCase();
    return this.notes.filter(note => 
      note.content.toLowerCase().includes(lowerQuery) ||
      note.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  exportToMarkdown(): string {
    return this.notes.map(note => {
      const pinIndicator = note.pinned ? '📌 ' : '';
      const tags = note.tags?.length ? `\nTags: ${note.tags.join(', ')}` : '';
      return `${pinIndicator}${note.content}${tags}\n\n---\n`;
    }).join('\n');
  }

  clear(): void {
    this.notes = [];
    this.prePopulatedAdded = false;
  }
}
