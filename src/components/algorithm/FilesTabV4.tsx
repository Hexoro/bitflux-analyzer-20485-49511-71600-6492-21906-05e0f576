/**
 * Files Tab V4 - VS Code-like editor with folder tree, custom groups,
 * markdown preview, and keyboard shortcuts
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Upload,
  FileCode,
  Trash2,
  FolderOpen,
  FolderPlus,
  Code,
  Calculator,
  Shield,
  Clock,
  Save,
  Edit2,
  X,
  Plus,
  Brain,
  Search,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Eye,
  EyeOff,
  File,
  Pencil,
  Download,
  Copy,
  FolderClosed,
} from 'lucide-react';
import { toast } from 'sonner';
import { pythonModuleSystem, PythonFile } from '@/lib/pythonModuleSystem';
import {
  UNIFIED_SCHEDULER_V2,
  UNIFIED_ALGORITHM_V2,
  UNIFIED_SCORING_V2,
  UNIFIED_POLICY_V2,
} from '@/lib/unifiedStrategy';

type EditorTab = { fileId: string; fileName: string; preview?: boolean };

const GROUP_META: Record<string, { icon: typeof Clock; color: string; label: string }> = {
  scheduler: { icon: Clock, color: 'text-purple-400', label: 'Schedulers' },
  algorithm: { icon: Code, color: 'text-blue-400', label: 'Algorithms' },
  scoring: { icon: Calculator, color: 'text-amber-400', label: 'Scoring' },
  policies: { icon: Shield, color: 'text-emerald-400', label: 'Policies' },
  ai: { icon: Brain, color: 'text-cyan-400', label: 'AI' },
  custom: { icon: FileCode, color: 'text-orange-400', label: 'Custom' },
};

interface FilesTabV4Props {
  onFileSelect?: (file: PythonFile | null) => void;
}

export const FilesTabV4 = ({ onFileSelect }: FilesTabV4Props) => {
  const [files, setFiles] = useState<PythonFile[]>([]);
  const [openTabs, setOpenTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [editContents, setEditContents] = useState<Record<string, string>>({});
  const [dirtyFiles, setDirtyFiles] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [customGroups, setCustomGroups] = useState<string[]>([]);
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [showNewGroupDialog, setShowNewGroupDialog] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileGroup, setNewFileGroup] = useState<string>('algorithm');
  const [newGroupName, setNewGroupName] = useState('');
  const [renameFileId, setRenameFileId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize unified strategy files
  useEffect(() => {
    if (!pythonModuleSystem.getFileByName('UnifiedScheduler.py')) {
      pythonModuleSystem.addFile('UnifiedScheduler.py', UNIFIED_SCHEDULER_V2, 'scheduler');
      pythonModuleSystem.addFile('UnifiedAlgorithm.py', UNIFIED_ALGORITHM_V2, 'algorithm');
      pythonModuleSystem.addFile('UnifiedScoring.py', UNIFIED_SCORING_V2, 'scoring');
      pythonModuleSystem.addFile('UnifiedPolicy.py', UNIFIED_POLICY_V2, 'policies');
    }
    setFiles(pythonModuleSystem.getAllFiles());
    setCustomGroups(pythonModuleSystem.getCustomGroups());

    const unsub = pythonModuleSystem.subscribe(() => {
      setFiles(pythonModuleSystem.getAllFiles());
      setCustomGroups(pythonModuleSystem.getCustomGroups());
    });
    return unsub;
  }, []);

  // Group files into a tree structure
  const fileTree = useMemo(() => {
    const builtinGroups = ['scheduler', 'algorithm', 'scoring', 'policies', 'ai', 'custom'];
    const allGroups = [...builtinGroups, ...customGroups.filter(g => !builtinGroups.includes(g))];

    const tree: Record<string, PythonFile[]> = {};
    for (const group of allGroups) {
      tree[group] = [];
    }

    for (const file of files) {
      const groupKey = file.customGroup || file.group;
      if (!tree[groupKey]) tree[groupKey] = [];
      tree[groupKey].push(file);
    }

    // Filter empty groups (except custom ones user explicitly created)
    const filtered: Record<string, PythonFile[]> = {};
    for (const [key, groupFiles] of Object.entries(tree)) {
      if (groupFiles.length > 0 || customGroups.includes(key)) {
        // Apply search filter
        if (searchQuery) {
          const matching = groupFiles.filter(f =>
            f.name.toLowerCase().includes(searchQuery.toLowerCase())
          );
          if (matching.length > 0 || customGroups.includes(key)) {
            filtered[key] = matching;
          }
        } else {
          filtered[key] = groupFiles;
        }
      }
    }
    return filtered;
  }, [files, customGroups, searchQuery]);

  const activeFile = useMemo(() => {
    if (!activeTabId) return null;
    const tab = openTabs.find(t => t.fileId === activeTabId);
    if (!tab) return null;
    return files.find(f => f.id === tab.fileId) || null;
  }, [activeTabId, openTabs, files]);

  const isPreviewTab = useMemo(() => {
    return openTabs.find(t => t.fileId === activeTabId)?.preview || false;
  }, [activeTabId, openTabs]);

  // Open file in editor
  const openFile = useCallback((file: PythonFile, preview = false) => {
    setOpenTabs(prev => {
      const exists = prev.find(t => t.fileId === file.id);
      if (exists) {
        // Update preview flag if explicitly opening as non-preview
        if (!preview && exists.preview) {
          return prev.map(t => t.fileId === file.id ? { ...t, preview: false } : t);
        }
        return prev;
      }
      return [...prev, { fileId: file.id, fileName: file.name, preview }];
    });
    setActiveTabId(file.id);
    if (!editContents[file.id]) {
      setEditContents(prev => ({ ...prev, [file.id]: file.content }));
    }
    onFileSelect?.(file);
  }, [editContents, onFileSelect]);

  // Close tab
  const closeTab = useCallback((fileId: string) => {
    if (dirtyFiles.has(fileId)) {
      if (!confirm('Unsaved changes will be lost. Close anyway?')) return;
    }
    setOpenTabs(prev => prev.filter(t => t.fileId !== fileId));
    setEditContents(prev => { const n = { ...prev }; delete n[fileId]; return n; });
    setDirtyFiles(prev => { const n = new Set(prev); n.delete(fileId); return n; });
    if (activeTabId === fileId) {
      setActiveTabId(prev => {
        const remaining = openTabs.filter(t => t.fileId !== fileId);
        return remaining.length > 0 ? remaining[remaining.length - 1].fileId : null;
      });
    }
  }, [activeTabId, openTabs, dirtyFiles]);

  // Save current file
  const saveFile = useCallback((fileId?: string) => {
    const id = fileId || activeTabId;
    if (!id) return;
    const content = editContents[id];
    if (content === undefined) return;
    pythonModuleSystem.updateFile(id, { content });
    setDirtyFiles(prev => { const n = new Set(prev); n.delete(id); return n; });
    toast.success('File saved');
  }, [activeTabId, editContents]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveFile();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        if (activeTabId) closeTab(activeTabId);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        // Quick file search focus
        document.getElementById('files-tab-search')?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [saveFile, closeTab, activeTabId]);

  // Handle content change
  const handleContentChange = useCallback((fileId: string, newContent: string) => {
    setEditContents(prev => ({ ...prev, [fileId]: newContent }));
    const original = files.find(f => f.id === fileId);
    if (original && original.content !== newContent) {
      setDirtyFiles(prev => new Set(prev).add(fileId));
    } else {
      setDirtyFiles(prev => { const n = new Set(prev); n.delete(fileId); return n; });
    }
  }, [files]);

  // Create new file
  const handleCreateFile = useCallback(() => {
    if (!newFileName.trim()) { toast.error('Enter a file name'); return; }
    let name = newFileName.trim();
    if (!name.endsWith('.py') && !name.endsWith('.js') && !name.endsWith('.ts')) name += '.py';

    const builtinGroups = ['scheduler', 'algorithm', 'scoring', 'policies', 'ai', 'custom'];
    const isBuiltin = builtinGroups.includes(newFileGroup);
    const group: PythonFile['group'] = isBuiltin ? newFileGroup as PythonFile['group'] : 'custom';
    const customGroup = isBuiltin ? undefined : newFileGroup;

    const template = `"""
${name} - Created ${new Date().toLocaleString()}
"""

from bitwise_api import get_bits, log, get_all_metrics

def execute():
    """Main execution function"""
    bits = get_bits()
    log(f"Processing {len(bits)} bits")
    
    # Add your logic here
    
    return {}

result = execute()
`;
    const file = pythonModuleSystem.addFile(name, template, group, customGroup);
    openFile(file);
    setNewFileName('');
    setShowNewFileDialog(false);
    toast.success(`Created ${name}`);
  }, [newFileName, newFileGroup, openFile]);

  // Create custom group
  const handleCreateGroup = useCallback(() => {
    if (!newGroupName.trim()) { toast.error('Enter a group name'); return; }
    const name = newGroupName.trim().toLowerCase().replace(/\s+/g, '_');
    pythonModuleSystem.registerCustomGroup(name);
    setNewGroupName('');
    setShowNewGroupDialog(false);
    toast.success(`Group "${name}" created`);
  }, [newGroupName]);

  // Delete file
  const handleDeleteFile = useCallback((fileId: string) => {
    pythonModuleSystem.deleteFile(fileId);
    closeTab(fileId);
    toast.success('File deleted');
  }, [closeTab]);

  // Upload file
  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles) return;
    for (const file of Array.from(uploadedFiles)) {
      if (!['.py', '.js', '.ts'].some(ext => file.name.endsWith(ext))) {
        toast.error(`${file.name}: Only .py, .js, .ts files`);
        continue;
      }
      try {
        const content = await file.text();
        const created = pythonModuleSystem.addFile(file.name, content, 'custom');
        openFile(created);
      } catch { toast.error(`Failed to read ${file.name}`); }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [openFile]);

  // Rename file
  const handleRename = useCallback((fileId: string) => {
    if (!renameValue.trim()) return;
    pythonModuleSystem.updateFile(fileId, { name: renameValue.trim() });
    setOpenTabs(prev => prev.map(t => t.fileId === fileId ? { ...t, fileName: renameValue.trim() } : t));
    setRenameFileId(null);
    toast.success('File renamed');
  }, [renameValue]);

  // Toggle preview for active tab
  const togglePreview = useCallback(() => {
    if (!activeTabId) return;
    setOpenTabs(prev => prev.map(t =>
      t.fileId === activeTabId ? { ...t, preview: !t.preview } : t
    ));
  }, [activeTabId]);

  const getGroupMeta = (group: string) => {
    return GROUP_META[group] || { icon: FolderClosed, color: 'text-orange-400', label: group };
  };

  return (
    <div className="h-full flex">
      {/* Sidebar - File Tree */}
      <div className="w-56 flex-shrink-0 border-r border-border flex flex-col bg-muted/20">
        {/* Sidebar header */}
        <div className="p-2 border-b border-border flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Explorer</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowNewFileDialog(true)} title="New File (Ctrl+N)">
              <Plus className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowNewGroupDialog(true)} title="New Group">
              <FolderPlus className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => fileInputRef.current?.click()} title="Upload">
              <Upload className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="p-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              id="files-tab-search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search files (Ctrl+P)"
              className="pl-7 h-6 text-xs"
            />
          </div>
        </div>

        {/* File Tree */}
        <ScrollArea className="flex-1">
          <div className="p-1">
            {Object.entries(fileTree).map(([group, groupFiles]) => {
              const meta = getGroupMeta(group);
              const Icon = meta.icon;
              const isCollapsed = collapsedGroups.has(group);
              const isCustom = customGroups.includes(group);

              return (
                <div key={group} className="mb-0.5">
                  <button
                    className="w-full flex items-center gap-1.5 px-2 py-1 text-xs hover:bg-muted/50 rounded transition-colors"
                    onClick={() => setCollapsedGroups(prev => {
                      const next = new Set(prev);
                      if (next.has(group)) next.delete(group); else next.add(group);
                      return next;
                    })}
                  >
                    {isCollapsed ? <ChevronRight className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                    <Icon className={`w-3 h-3 ${meta.color}`} />
                    <span className={`font-medium capitalize ${meta.color}`}>{meta.label}</span>
                    <Badge variant="outline" className="text-[9px] h-3.5 px-1 ml-auto">{groupFiles.length}</Badge>
                  </button>

                  {!isCollapsed && (
                    <div className="ml-3 border-l border-border/50 pl-1">
                      {groupFiles.map(file => (
                        <div
                          key={file.id}
                          className={`flex items-center gap-1 px-2 py-0.5 text-xs cursor-pointer rounded group transition-colors ${
                            activeTabId === file.id ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/40'
                          }`}
                          onClick={() => openFile(file)}
                          onDoubleClick={() => openFile(file, false)}
                        >
                          <File className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          {renameFileId === file.id ? (
                            <Input
                              value={renameValue}
                              onChange={e => setRenameValue(e.target.value)}
                              onBlur={() => handleRename(file.id)}
                              onKeyDown={e => { if (e.key === 'Enter') handleRename(file.id); if (e.key === 'Escape') setRenameFileId(null); }}
                              className="h-5 text-xs px-1 flex-1"
                              autoFocus
                            />
                          ) : (
                            <span className="truncate flex-1">{file.name}</span>
                          )}
                          {dirtyFiles.has(file.id) && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />}

                          {/* Context menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover:opacity-100 flex-shrink-0"
                                onClick={e => e.stopPropagation()}>
                                <MoreVertical className="w-2.5 h-2.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="text-xs">
                              <DropdownMenuItem onSelect={() => { setRenameFileId(file.id); setRenameValue(file.name); }}>
                                <Pencil className="w-3 h-3 mr-2" /> Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => { navigator.clipboard.writeText(file.content); toast.success('Copied'); }}>
                                <Copy className="w-3 h-3 mr-2" /> Copy Content
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => {
                                const blob = new Blob([file.content], { type: 'text/plain' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a'); a.href = url; a.download = file.name; a.click();
                                URL.revokeObjectURL(url);
                              }}>
                                <Download className="w-3 h-3 mr-2" /> Download
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onSelect={() => handleDeleteFile(file.id)}>
                                <Trash2 className="w-3 h-3 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ))}
                      {groupFiles.length === 0 && (
                        <p className="text-[10px] text-muted-foreground px-2 py-1 italic">Empty</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Shortcuts hint */}
        <div className="p-2 border-t border-border">
          <p className="text-[9px] text-muted-foreground">
            <kbd className="px-1 bg-muted rounded">Ctrl+S</kbd> Save &nbsp;
            <kbd className="px-1 bg-muted rounded">Ctrl+W</kbd> Close
          </p>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tabs Bar */}
        {openTabs.length > 0 && (
          <div className="flex items-center border-b border-border bg-muted/10 overflow-x-auto flex-shrink-0">
            {openTabs.map(tab => (
              <div
                key={tab.fileId}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs border-r border-border cursor-pointer transition-colors whitespace-nowrap ${
                  activeTabId === tab.fileId
                    ? 'bg-background text-foreground border-b-2 border-b-primary'
                    : 'text-muted-foreground hover:bg-muted/30'
                }`}
                onClick={() => setActiveTabId(tab.fileId)}
              >
                {dirtyFiles.has(tab.fileId) && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                <span>{tab.fileName}</span>
                {tab.preview && <Badge variant="outline" className="text-[8px] h-3 px-1 ml-1">Preview</Badge>}
                <button
                  className="ml-1 hover:bg-muted rounded p-0.5"
                  onClick={e => { e.stopPropagation(); closeTab(tab.fileId); }}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Editor / Preview Content */}
        {activeFile ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Editor toolbar */}
            <div className="flex items-center justify-between px-3 py-1 bg-muted/10 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{activeFile.name}</span>
                <Separator orientation="vertical" className="h-3" />
                <span>{(editContents[activeFile.id] || activeFile.content).split('\n').length} lines</span>
                <Separator orientation="vertical" className="h-3" />
                <span className="capitalize">{activeFile.customGroup || activeFile.group}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={togglePreview}>
                  {isPreviewTab ? <Edit2 className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {isPreviewTab ? 'Edit' : 'Preview'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs gap-1"
                  disabled={!dirtyFiles.has(activeFile.id)}
                  onClick={() => saveFile()}
                >
                  <Save className="w-3 h-3" />
                  Save
                </Button>
              </div>
            </div>

            {/* Content area */}
            {isPreviewTab ? (
              <ScrollArea className="flex-1 p-4">
                <pre className="text-xs font-mono whitespace-pre-wrap text-foreground leading-relaxed">
                  {renderMarkdownPreview(editContents[activeFile.id] || activeFile.content)}
                </pre>
              </ScrollArea>
            ) : (
              <div className="flex-1 relative min-h-0">
                <textarea
                  ref={textareaRef}
                  value={editContents[activeFile.id] || activeFile.content}
                  onChange={e => handleContentChange(activeFile.id, e.target.value)}
                  className="absolute inset-0 w-full h-full bg-background text-foreground text-xs font-mono p-4 resize-none outline-none border-none leading-relaxed"
                  spellCheck={false}
                  placeholder="Start typing..."
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <FolderOpen className="w-16 h-16 mx-auto opacity-20 mb-4" />
              <p className="text-sm">Open a file from the explorer</p>
              <p className="text-xs mt-1">or press <kbd className="px-1 bg-muted rounded">Ctrl+P</kbd> to search</p>
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" multiple accept=".py,.js,.ts" className="hidden" onChange={handleUpload} />

      {/* New File Dialog */}
      <Dialog open={showNewFileDialog} onOpenChange={setShowNewFileDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">New File</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">File Name</Label>
              <Input
                value={newFileName}
                onChange={e => setNewFileName(e.target.value)}
                placeholder="my_script.py"
                className="h-8 text-sm mt-1"
                onKeyDown={e => { if (e.key === 'Enter') handleCreateFile(); }}
              />
            </div>
            <div>
              <Label className="text-xs">Group</Label>
              <Select value={newFileGroup} onValueChange={setNewFileGroup}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduler">Scheduler</SelectItem>
                  <SelectItem value="algorithm">Algorithm</SelectItem>
                  <SelectItem value="scoring">Scoring</SelectItem>
                  <SelectItem value="policies">Policies</SelectItem>
                  <SelectItem value="ai">AI</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                  {customGroups.map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowNewFileDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreateFile}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Group Dialog */}
      <Dialog open={showNewGroupDialog} onOpenChange={setShowNewGroupDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">New Custom Group</DialogTitle>
          </DialogHeader>
          <div>
            <Label className="text-xs">Group Name</Label>
            <Input
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              placeholder="utilities"
              className="h-8 text-sm mt-1"
              onKeyDown={e => { if (e.key === 'Enter') handleCreateGroup(); }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowNewGroupDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreateGroup}>Create Group</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/** Simple markdown-like preview for Python files: highlights comments, docstrings, defs */
function renderMarkdownPreview(content: string): React.ReactNode {
  const lines = content.split('\n');
  return lines.map((line, i) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('"""') || trimmed.startsWith("'''")) {
      return <span key={i} className="text-emerald-400">{line}{'\n'}</span>;
    }
    if (trimmed.startsWith('#')) {
      return <span key={i} className="text-muted-foreground italic">{line}{'\n'}</span>;
    }
    if (trimmed.startsWith('def ') || trimmed.startsWith('class ')) {
      return <span key={i} className="text-blue-400 font-semibold">{line}{'\n'}</span>;
    }
    if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
      return <span key={i} className="text-amber-400">{line}{'\n'}</span>;
    }
    if (trimmed.startsWith('return ')) {
      return <span key={i} className="text-purple-400">{line}{'\n'}</span>;
    }
    return <span key={i}>{line}{'\n'}</span>;
  });
}
