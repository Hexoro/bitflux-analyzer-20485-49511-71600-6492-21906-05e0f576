import { useState, useEffect } from 'react';
import { NotesManager, Note } from '@/lib/notesManager';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Plus, Pin, PinOff, Trash2, Download, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { Separator } from './ui/separator';

const COMMAND_REFERENCE = `# Binary Operations Command Reference

## LOGIC GATES
AND <operand>         - Bitwise AND (e.g., AND 1010)
OR <operand>          - Bitwise OR (e.g., OR 1100)
XOR <operand>         - Bitwise XOR (e.g., XOR 0110)
NOT                   - Bitwise NOT (no operand)
NAND <operand>        - Bitwise NAND (e.g., NAND 1010)
NOR <operand>         - Bitwise NOR (e.g., NOR 1100)
XNOR <operand>        - Bitwise XNOR (e.g., XNOR 0110)

## SHIFT & ROTATE
SHL <amount>          - Shift Left (logical, fill with 0s) (e.g., SHL 3)
SHR <amount>          - Shift Right (logical, fill with 0s) (e.g., SHR 2)
SAL <amount>          - Shift Arithmetic Left (preserve sign) (e.g., SAL 1)
SAR <amount>          - Shift Arithmetic Right (preserve sign) (e.g., SAR 4)
ROL <amount>          - Rotate Left (circular) (e.g., ROL 5)
ROR <amount>          - Rotate Right (circular) (e.g., ROR 2)

## BIT MANIPULATION
DELETE                - Delete selected bits (requires selection)
INSERT <pos> <bits>   - Insert bits at position (e.g., INSERT 10 1010)
MOVE <dest>           - Move selection to position (requires single selection)
PEEK <start> <length> - View bits without modifying (e.g., PEEK 5 8)
MASK <op> <pattern>   - Apply mask (e.g., MASK AND 11110000)
                        Operations: AND, OR, XOR
REVERSE               - Reverse bit order

## PACKING & ALIGNMENT
PAD <dir> <len> <val> - Pad bits (e.g., PAD LEFT 32 0)
                        Direction: LEFT, RIGHT
                        Value: 0, 1
ALIGN <type>          - Align to boundary (e.g., ALIGN BYTE)
                        Type: BYTE (8-bit), NIBBLE (4-bit)

## ARITHMETIC
ADD <operand>         - Binary addition (e.g., ADD 10 or ADD 1010)
SUB <operand>         - Binary subtraction (e.g., SUB 5)
MUL <operand>         - Binary multiplication (e.g., MUL 3)
DIV <operand>         - Binary division (e.g., DIV 2)
MOD <operand>         - Binary modulo (e.g., MOD 4)
POW <operand>         - Binary power (e.g., POW 2)
Note: Operands can be decimal or binary

## ADVANCED OPERATIONS
GRAY TO               - Convert binary to Gray code
GRAY FROM             - Convert Gray code to binary
ENDIAN                - Swap endianness (byte order)

## FIND & REPLACE
REPLACE <find> <repl> - Replace all occurrences (e.g., REPLACE 01 10)

## NOTES
- Commands are case-insensitive
- Binary patterns must contain only 0s and 1s
- Some operations require bit selection (DELETE, MOVE)
- Press Enter to execute command
- Check command result for errors`;


interface NotesPanelProps {
  notesManager: NotesManager;
  onUpdate?: () => void;
}

export const NotesPanel = ({ notesManager, onUpdate }: NotesPanelProps) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteTags, setNewNoteTags] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    refreshNotes();
    // Add command reference note on first load
    const existingNotes = notesManager.getNotes();
    const hasCommandRef = existingNotes.some(n => n.tags?.includes('command-reference'));
    if (!hasCommandRef) {
      notesManager.addNote(COMMAND_REFERENCE, ['command-reference', 'documentation']);
      refreshNotes();
    }
  }, [notesManager]);

  const refreshNotes = () => {
    const allNotes = searchQuery 
      ? notesManager.searchNotes(searchQuery)
      : notesManager.getNotes();
    setNotes(allNotes);
  };

  const handleAddNote = () => {
    if (!newNoteContent.trim()) {
      toast.error('Note content cannot be empty');
      return;
    }

    const tags = newNoteTags.split(',').map(t => t.trim()).filter(t => t);
    notesManager.addNote(newNoteContent, tags);
    setNewNoteContent('');
    setNewNoteTags('');
    refreshNotes();
    onUpdate?.();
    toast.success('Note added');
  };

  const handleUpdateNote = (id: string) => {
    if (!editContent.trim()) {
      toast.error('Note content cannot be empty');
      return;
    }

    const tags = editTags.split(',').map(t => t.trim()).filter(t => t);
    notesManager.updateNote(id, editContent, tags);
    setEditingNoteId(null);
    setEditContent('');
    setEditTags('');
    refreshNotes();
    onUpdate?.();
    toast.success('Note updated');
  };

  const handleDeleteNote = (id: string) => {
    notesManager.deleteNote(id);
    refreshNotes();
    onUpdate?.();
    toast.success('Note deleted');
  };

  const handleTogglePin = (id: string) => {
    notesManager.togglePin(id);
    refreshNotes();
    onUpdate?.();
  };

  const handleExport = () => {
    const markdown = notesManager.exportToMarkdown();
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Notes exported');
  };

  const startEdit = (note: Note) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
    setEditTags(note.tags?.join(', ') || '');
  };

  const cancelEdit = () => {
    setEditingNoteId(null);
    setEditContent('');
    setEditTags('');
  };

  return (
    <div className="h-full overflow-auto p-4 space-y-4 scrollbar-thin">
      <Card className="p-4 bg-card border-border">
        <h3 className="text-sm font-semibold text-primary mb-3">Add New Note</h3>
        <div className="space-y-3">
          <Textarea
            placeholder="Write your note here (Markdown supported)..."
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            className="min-h-[100px] font-mono text-xs"
          />
          <Input
            placeholder="Tags (comma-separated)"
            value={newNoteTags}
            onChange={(e) => setNewNoteTags(e.target.value)}
            className="text-xs"
          />
          <Button onClick={handleAddNote} size="sm" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Note
          </Button>
        </div>
      </Card>

      <Card className="p-4 bg-card border-border">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                refreshNotes();
              }}
              className="pl-8 text-xs"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => {
                  setSearchQuery('');
                  refreshNotes();
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </Card>

      <div className="space-y-3">
        {notes.map((note) => (
          <Card key={note.id} className="p-4 bg-card border-border">
            {editingNoteId === note.id ? (
              <div className="space-y-3">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[100px] font-mono text-xs"
                />
                <Input
                  placeholder="Tags (comma-separated)"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="text-xs"
                />
                <div className="flex gap-2">
                  <Button onClick={() => handleUpdateNote(note.id)} size="sm" className="flex-1">
                    Save
                  </Button>
                  <Button onClick={cancelEdit} variant="outline" size="sm" className="flex-1">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {note.pinned && <Pin className="w-4 h-4 text-primary" />}
                    <span className="text-xs text-muted-foreground">
                      {note.timestamp.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      onClick={() => handleTogglePin(note.id)}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      title={note.pinned ? 'Unpin' : 'Pin'}
                    >
                      {note.pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                    </Button>
                    <Button
                      onClick={() => startEdit(note)}
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDeleteNote(note.id)}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <div className="prose prose-sm max-w-none text-foreground">
                  <pre className="whitespace-pre-wrap font-mono text-xs bg-muted/30 p-3 rounded">
                    {note.content}
                  </pre>
                </div>

                {note.tags && note.tags.length > 0 && (
                  <>
                    <Separator className="my-3" />
                    <div className="flex flex-wrap gap-2">
                      {note.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-primary/10 text-primary px-2 py-1 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </Card>
        ))}
      </div>

      {notes.length === 0 && (
        <div className="text-center text-muted-foreground text-sm py-8">
          {searchQuery ? 'No notes found matching your search' : 'No notes yet. Add your first note above!'}
        </div>
      )}
    </div>
  );
};
