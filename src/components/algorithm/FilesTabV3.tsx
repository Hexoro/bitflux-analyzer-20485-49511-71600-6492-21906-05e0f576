/**
 * Files Tab V3 - With drag-and-drop, unified strategy only, better add button
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Upload,
  FileCode,
  Trash2,
  FolderOpen,
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
  Grid,
  List,
  GripVertical,
  MoreVertical,
} from 'lucide-react';
import { toast } from 'sonner';
import { pythonModuleSystem, PythonFile } from '@/lib/pythonModuleSystem';
import { 
  UNIFIED_SCHEDULER_V2, 
  UNIFIED_ALGORITHM_V2, 
  UNIFIED_SCORING_V2,
  UNIFIED_POLICY_V2,
} from '@/lib/unifiedStrategy';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface FilesTabV3Props {
  onFileSelect?: (file: PythonFile | null) => void;
}

export const FilesTabV3 = ({ onFileSelect }: FilesTabV3Props) => {
  const [files, setFiles] = useState<PythonFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<PythonFile | null>(null);
  const [uploadGroup, setUploadGroup] = useState<PythonFile['group']>('algorithm');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editName, setEditName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileGroup, setNewFileGroup] = useState<PythonFile['group']>('algorithm');
  
  // Drag state
  const [draggedFile, setDraggedFile] = useState<PythonFile | null>(null);
  const [dragOverFile, setDragOverFile] = useState<string | null>(null);

  useEffect(() => {
    // Load unified strategy files if not present
    const hasUnifiedScheduler = pythonModuleSystem.getFileByName('UnifiedScheduler.py');
    if (!hasUnifiedScheduler) {
      pythonModuleSystem.addFile('UnifiedScheduler.py', UNIFIED_SCHEDULER_V2, 'scheduler');
      pythonModuleSystem.addFile('UnifiedAlgorithm.py', UNIFIED_ALGORITHM_V2, 'algorithm');
      pythonModuleSystem.addFile('UnifiedScoring.py', UNIFIED_SCORING_V2, 'scoring');
      pythonModuleSystem.addFile('UnifiedPolicy.py', UNIFIED_POLICY_V2, 'policies');
    }
    
    setFiles(pythonModuleSystem.getAllFiles());
    const unsubscribe = pythonModuleSystem.subscribe(() => {
      setFiles(pythonModuleSystem.getAllFiles());
    });
    return unsubscribe;
  }, []);

  const groups = useMemo(() => {
    const counts: Record<string, number> = {
      scheduler: 0,
      algorithm: 0,
      scoring: 0,
      policies: 0,
      ai: 0,
      custom: 0,
    };
    files.forEach(f => {
      if (f.group in counts) counts[f.group]++;
    });
    return counts;
  }, [files]);

  const filteredFiles = useMemo(() => {
    return files.filter(f => {
      const matchesSearch = searchQuery === '' ||
        f.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGroup = filterGroup === 'all' || f.group === filterGroup;
      return matchesSearch && matchesGroup;
    });
  }, [files, searchQuery, filterGroup]);

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles) return;

    for (const file of Array.from(uploadedFiles)) {
      const validExtensions = ['.py', '.js', '.ts'];
      const hasValidExt = validExtensions.some(ext => file.name.endsWith(ext));
      
      if (!hasValidExt) {
        toast.error(`${file.name}: Only .py, .js, .ts files`);
        continue;
      }

      try {
        const content = await file.text();
        pythonModuleSystem.addFile(file.name, content, uploadGroup);
        toast.success(`${file.name} uploaded`);
      } catch (error) {
        toast.error(`Failed to read ${file.name}`);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = (id: string) => {
    pythonModuleSystem.deleteFile(id);
    if (selectedFile?.id === id) {
      setSelectedFile(null);
      setIsEditing(false);
      onFileSelect?.(null);
    }
    toast.success('File deleted');
  };

  const handleSelect = (file: PythonFile) => {
    setSelectedFile(file);
    setIsEditing(false);
    setEditContent(file.content);
    setEditName(file.name);
    onFileSelect?.(file);
  };

  const handleSaveEdit = () => {
    if (selectedFile) {
      pythonModuleSystem.updateFile(selectedFile.id, {
        content: editContent,
        name: editName
      });
      setIsEditing(false);
      toast.success('File saved');
    }
  };

  const handleCreateNewFile = () => {
    if (!newFileName.trim()) {
      toast.error('Enter a file name');
      return;
    }
    
    let fileName = newFileName.trim();
    if (!fileName.endsWith('.py') && !fileName.endsWith('.js') && !fileName.endsWith('.ts')) {
      fileName += '.py';
    }
    
    const templateContent = `"""
${fileName} - Created ${new Date().toLocaleString()}
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
    
    pythonModuleSystem.addFile(fileName, templateContent, newFileGroup);
    toast.success(`File "${fileName}" created`);
    setNewFileName('');
    setShowNewFileDialog(false);
  };

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, file: PythonFile) => {
    setDraggedFile(file);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', file.id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, fileId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverFile(fileId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverFile(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetFile: PythonFile) => {
    e.preventDefault();
    setDragOverFile(null);
    
    if (!draggedFile || draggedFile.id === targetFile.id) {
      setDraggedFile(null);
      return;
    }
    
    // Reorder files by changing the group to match target (simple reorder)
    if (draggedFile.group !== targetFile.group) {
      pythonModuleSystem.updateFile(draggedFile.id, { group: targetFile.group });
      toast.success(`Moved ${draggedFile.name} to ${targetFile.group}`);
    }
    
    setDraggedFile(null);
  }, [draggedFile]);

  const handleDragEnd = useCallback(() => {
    setDraggedFile(null);
    setDragOverFile(null);
  }, []);

  // Handle file drop from desktop
  const handleFileDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = e.dataTransfer.files;
    
    for (const file of Array.from(droppedFiles)) {
      const validExtensions = ['.py', '.js', '.ts'];
      const hasValidExt = validExtensions.some(ext => file.name.endsWith(ext));
      
      if (!hasValidExt) {
        toast.error(`${file.name}: Only .py, .js, .ts files`);
        continue;
      }

      try {
        const content = await file.text();
        pythonModuleSystem.addFile(file.name, content, uploadGroup);
        toast.success(`${file.name} added`);
      } catch (error) {
        toast.error(`Failed to read ${file.name}`);
      }
    }
  }, [uploadGroup]);

  const getGroupIcon = (group: PythonFile['group']) => {
    switch (group) {
      case 'scheduler': return <Clock className="w-3.5 h-3.5 text-purple-400" />;
      case 'algorithm': return <Code className="w-3.5 h-3.5 text-blue-400" />;
      case 'scoring': return <Calculator className="w-3.5 h-3.5 text-yellow-400" />;
      case 'policies': return <Shield className="w-3.5 h-3.5 text-green-400" />;
      case 'ai': return <Brain className="w-3.5 h-3.5 text-cyan-400" />;
      default: return <FileCode className="w-3.5 h-3.5 text-orange-400" />;
    }
  };

  const getGroupStyle = (group: PythonFile['group']) => {
    switch (group) {
      case 'scheduler': return 'border-purple-500/30 hover:border-purple-500/60';
      case 'algorithm': return 'border-blue-500/30 hover:border-blue-500/60';
      case 'scoring': return 'border-yellow-500/30 hover:border-yellow-500/60';
      case 'policies': return 'border-green-500/30 hover:border-green-500/60';
      case 'ai': return 'border-cyan-500/30 hover:border-cyan-500/60';
      default: return 'border-orange-500/30 hover:border-orange-500/60';
    }
  };

  return (
    <div 
      className="h-full flex gap-3 p-3 bg-gradient-to-br from-emerald-950/20 via-background to-cyan-950/20"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleFileDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".py,.js,.ts"
        multiple
        className="hidden"
      />

      {/* Left: File Browser */}
      <div className="w-1/2 flex flex-col gap-2">
        {/* Header with Add Button */}
        <div className="flex items-center justify-between pb-2 border-b border-cyan-400/30">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-400/30">
              <FolderOpen className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-medium text-cyan-100 text-sm">Algorithm Files</h3>
              <p className="text-[10px] text-muted-foreground">{files.length} files • Drag to reorder</p>
            </div>
          </div>
          
          <Button 
            size="sm" 
            className="h-8 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 shadow-[0_0_10px_rgba(0,255,255,0.2)]"
            onClick={() => setShowNewFileDialog(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            New File
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="pl-7 h-7 text-xs bg-background/50 border-cyan-400/30"
            />
          </div>
          <Select value={filterGroup} onValueChange={setFilterGroup}>
            <SelectTrigger className="w-24 h-7 text-xs bg-background/50 border-cyan-400/30">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="scheduler">Scheduler</SelectItem>
              <SelectItem value="algorithm">Algorithm</SelectItem>
              <SelectItem value="scoring">Scoring</SelectItem>
              <SelectItem value="policies">Policies</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1 bg-background/50 rounded-md p-0.5 border border-cyan-400/30">
            <Button
              size="icon"
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              className="h-6 w-6"
              onClick={() => setViewMode('list')}
            >
              <List className="w-3 h-3" />
            </Button>
            <Button
              size="icon"
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              className="h-6 w-6"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Upload Area */}
        <div className="flex items-center gap-2">
          <Select value={uploadGroup} onValueChange={(v) => setUploadGroup(v as PythonFile['group'])}>
            <SelectTrigger className="w-24 h-7 text-xs bg-background/50 border-cyan-400/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="scheduler">Scheduler</SelectItem>
              <SelectItem value="algorithm">Algorithm</SelectItem>
              <SelectItem value="scoring">Scoring</SelectItem>
              <SelectItem value="policies">Policies</SelectItem>
              <SelectItem value="ai">AI</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="h-7 text-xs border-cyan-400/30" onClick={handleUpload}>
            <Upload className="w-3 h-3 mr-1" />
            Upload
          </Button>
        </div>

        {/* Group Stats */}
        <div className="flex gap-1 flex-wrap">
          {Object.entries(groups).filter(([, count]) => count > 0).map(([group, count]) => (
            <Badge
              key={group}
              variant="outline"
              className={`text-[10px] cursor-pointer transition-all ${
                filterGroup === group 
                  ? 'bg-cyan-500/20 border-cyan-400' 
                  : 'border-border hover:border-cyan-400/50'
              }`}
              onClick={() => setFilterGroup(filterGroup === group ? 'all' : group)}
            >
              {getGroupIcon(group as PythonFile['group'])}
              <span className="ml-1 capitalize">{group}</span>
              <span className="ml-1 opacity-60">({count})</span>
            </Badge>
          ))}
        </div>

        {/* Files List */}
        <ScrollArea className="flex-1">
          <div className="space-y-1 pr-2">
            {filteredFiles.map(file => (
              <div
                key={file.id}
                draggable
                onDragStart={(e) => handleDragStart(e, file)}
                onDragOver={(e) => handleDragOver(e, file.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, file)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all group ${
                  selectedFile?.id === file.id 
                    ? 'border-cyan-400 bg-cyan-500/20 shadow-lg shadow-cyan-500/10' 
                    : `bg-background/30 ${getGroupStyle(file.group)}`
                } ${
                  dragOverFile === file.id ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-background' : ''
                } ${
                  draggedFile?.id === file.id ? 'opacity-50' : ''
                }`}
                onClick={() => handleSelect(file)}
              >
                <GripVertical className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab" />
                <div className={`p-1.5 rounded ${
                  selectedFile?.id === file.id ? 'bg-cyan-500/30' : 'bg-background/50'
                }`}>
                  {getGroupIcon(file.group)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-xs truncate">{file.name}</div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="capitalize">{file.group}</span>
                    <span>•</span>
                    <span>{(file.content.length / 1024).toFixed(1)}KB</span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSelect(file); setIsEditing(true); }}>
                      <Edit2 className="w-3 h-3 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }}
                    >
                      <Trash2 className="w-3 h-3 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Right: File Preview/Editor */}
      <div className="flex-1 flex flex-col">
        {selectedFile ? (
          <Card className="flex-1 flex flex-col bg-background/50 border-cyan-400/20">
            <CardHeader className="py-2 px-3 flex-row items-center justify-between border-b border-cyan-400/20">
              <div className="flex items-center gap-2">
                {getGroupIcon(selectedFile.group)}
                {isEditing ? (
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-6 text-xs w-40"
                  />
                ) : (
                  <span className="font-mono text-sm">{selectedFile.name}</span>
                )}
                <Badge variant="outline" className="text-[10px] capitalize">{selectedFile.group}</Badge>
              </div>
              <div className="flex gap-1">
                {isEditing ? (
                  <>
                    <Button size="sm" variant="ghost" className="h-6" onClick={() => setIsEditing(false)}>
                      <X className="w-3 h-3 mr-1" />
                      Cancel
                    </Button>
                    <Button size="sm" className="h-6 bg-cyan-600 hover:bg-cyan-500" onClick={handleSaveEdit}>
                      <Save className="w-3 h-3 mr-1" />
                      Save
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="ghost" className="h-6" onClick={() => setIsEditing(true)}>
                    <Edit2 className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              {isEditing ? (
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="h-full w-full resize-none rounded-none border-0 font-mono text-xs p-3"
                  spellCheck={false}
                />
              ) : (
                <ScrollArea className="h-full">
                  <pre className="p-3 text-xs font-mono whitespace-pre-wrap">{selectedFile.content}</pre>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="flex-1 flex items-center justify-center bg-background/30 border-dashed border-cyan-400/20">
            <div className="text-center">
              <FileCode className="w-12 h-12 mx-auto mb-3 text-cyan-400/30" />
              <p className="text-muted-foreground text-sm">Select a file to view</p>
              <p className="text-muted-foreground text-xs mt-1">or drag files from your computer</p>
            </div>
          </Card>
        )}
      </div>

      {/* New File Dialog */}
      <Dialog open={showNewFileDialog} onOpenChange={setShowNewFileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New File</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>File Name</Label>
              <Input
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="my_file.py"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Group</Label>
              <Select value={newFileGroup} onValueChange={(v) => setNewFileGroup(v as PythonFile['group'])}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduler">Scheduler</SelectItem>
                  <SelectItem value="algorithm">Algorithm</SelectItem>
                  <SelectItem value="scoring">Scoring</SelectItem>
                  <SelectItem value="policies">Policies</SelectItem>
                  <SelectItem value="ai">AI</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFileDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateNewFile}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
