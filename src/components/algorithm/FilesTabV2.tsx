/**
 * Files Tab V2 - Redesigned with custom group management
 * Features: Create custom groups, better file organization, distinct styling
 */

import { useState, useEffect, useRef, useMemo } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  FolderPlus,
  Tag,
  Sparkles,
  File,
  MoreVertical,
} from 'lucide-react';
import { toast } from 'sonner';
import { pythonModuleSystem, PythonFile } from '@/lib/pythonModuleSystem';
import { 
  EXAMPLE_SCHEDULER, 
  EXAMPLE_ALGORITHM, 
  EXAMPLE_SCORING, 
  EXAMPLE_POLICY,
} from '@/lib/exampleAlgorithmFiles';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface FilesTabV2Props {
  onFileSelect?: (file: PythonFile | null) => void;
}

export const FilesTabV2 = ({ onFileSelect }: FilesTabV2Props) => {
  const [files, setFiles] = useState<PythonFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<PythonFile | null>(null);
  const [uploadGroup, setUploadGroup] = useState<PythonFile['group']>('algorithm');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editName, setEditName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Custom groups
  const [customGroups, setCustomGroups] = useState<string[]>([]);
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileGroup, setNewFileGroup] = useState<PythonFile['group']>('algorithm');
  const [newFileCustomGroup, setNewFileCustomGroup] = useState('');

  useEffect(() => {
    setFiles(pythonModuleSystem.getAllFiles());
    setCustomGroups(pythonModuleSystem.getCustomGroups());
    const unsubscribe = pythonModuleSystem.subscribe(() => {
      setFiles(pythonModuleSystem.getAllFiles());
      setCustomGroups(pythonModuleSystem.getCustomGroups());
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

  const handleAddExamples = () => {
    pythonModuleSystem.addFile('MasterScheduler.py', EXAMPLE_SCHEDULER, 'scheduler');
    pythonModuleSystem.addFile('EntropyReduction.py', EXAMPLE_ALGORITHM, 'algorithm');
    pythonModuleSystem.addFile('PerformanceScoring.py', EXAMPLE_SCORING, 'scoring');
    pythonModuleSystem.addFile('ExecutionPolicy.py', EXAMPLE_POLICY, 'policies');
    toast.success('Example files added');
  };

  const handleCreateGroup = () => {
    if (newGroupName.trim() && !customGroups.includes(newGroupName.trim())) {
      pythonModuleSystem.registerCustomGroup(newGroupName.trim());
      toast.success(`Group "${newGroupName.trim()}" created`);
      setNewGroupName('');
      setShowCreateGroupDialog(false);
    } else if (customGroups.includes(newGroupName.trim())) {
      toast.error('Group already exists');
    }
  };

  const handleDeleteGroup = (groupName: string) => {
    pythonModuleSystem.unregisterCustomGroup(groupName);
    toast.success(`Group "${groupName}" deleted`);
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
    
    pythonModuleSystem.addFile(fileName, templateContent, newFileGroup, newFileCustomGroup || undefined);
    toast.success(`File "${fileName}" created`);
    setNewFileName('');
    setNewFileCustomGroup('');
    setShowNewFileDialog(false);
  };

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
    <div className="h-full flex gap-3 p-3 bg-gradient-to-br from-emerald-950/20 via-background to-teal-950/20">
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
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-emerald-500/30">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
              <FolderOpen className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-medium text-emerald-100 text-sm">Algorithm Files</h3>
              <p className="text-[10px] text-muted-foreground">{files.length} files</p>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="pl-8 h-8 bg-background/50 border-emerald-500/30"
            />
          </div>
          <Select value={filterGroup} onValueChange={setFilterGroup}>
            <SelectTrigger className="w-28 h-8 bg-background/50 border-emerald-500/30">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              <SelectItem value="scheduler">Scheduler</SelectItem>
              <SelectItem value="algorithm">Algorithm</SelectItem>
              <SelectItem value="scoring">Scoring</SelectItem>
              <SelectItem value="policies">Policies</SelectItem>
              <SelectItem value="ai">AI</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="icon"
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            className="h-8 w-8"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            className="h-8 w-8"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="w-4 h-4" />
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Select value={uploadGroup} onValueChange={(v) => setUploadGroup(v as PythonFile['group'])}>
            <SelectTrigger className="w-24 h-7 text-xs bg-background/50 border-emerald-500/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="scheduler">Scheduler</SelectItem>
              <SelectItem value="algorithm">Algorithm</SelectItem>
              <SelectItem value="scoring">Scoring</SelectItem>
              <SelectItem value="policies">Policies</SelectItem>
              <SelectItem value="ai">AI</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500" onClick={handleUpload}>
            <Upload className="w-3 h-3 mr-1" />
            Upload
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-500/30" onClick={() => setShowNewFileDialog(true)}>
            <Plus className="w-3 h-3 mr-1" />
            New
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-500/30" onClick={handleAddExamples}>
            <Sparkles className="w-3 h-3 mr-1" />
            Examples
          </Button>
        </div>

        {/* Custom Groups Section */}
        <div className="flex items-center gap-2 py-2 border-y border-emerald-500/20">
          <Tag className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-xs text-muted-foreground">Custom Groups:</span>
          <div className="flex flex-wrap gap-1 flex-1">
            {customGroups.map(group => (
              <Badge 
                key={group} 
                variant="outline" 
                className="text-[10px] border-orange-500/50 text-orange-300 group cursor-pointer"
              >
                {group}
                <button
                  className="ml-1 opacity-0 group-hover:opacity-100 hover:text-destructive"
                  onClick={() => handleDeleteGroup(group)}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </Badge>
            ))}
          </div>
          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setShowCreateGroupDialog(true)}>
            <FolderPlus className="w-3 h-3 mr-1" />
            Add
          </Button>
        </div>

        {/* Group Stats */}
        <div className="flex gap-1 flex-wrap">
          {Object.entries(groups).map(([group, count]) => (
            <Badge
              key={group}
              variant="outline"
              className={`text-[10px] cursor-pointer transition-all ${
                filterGroup === group 
                  ? 'bg-emerald-500/20 border-emerald-400' 
                  : 'border-border hover:border-emerald-500/50'
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
          {viewMode === 'list' ? (
            <div className="space-y-1 pr-2">
              {filteredFiles.map(file => (
                <div
                  key={file.id}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all group ${
                    selectedFile?.id === file.id 
                      ? 'border-emerald-400 bg-emerald-500/20 shadow-lg shadow-emerald-500/10' 
                      : `bg-background/30 ${getGroupStyle(file.group)}`
                  }`}
                  onClick={() => handleSelect(file)}
                >
                  <div className={`p-1.5 rounded ${
                    selectedFile?.id === file.id ? 'bg-emerald-500/30' : 'bg-background/50'
                  }`}>
                    {getGroupIcon(file.group)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs truncate">{file.name}</div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="capitalize">{file.group}</span>
                      {file.customGroup && (
                        <Badge variant="outline" className="h-3 text-[8px] border-orange-500/50 text-orange-300">
                          {file.customGroup}
                        </Badge>
                      )}
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
          ) : (
            <div className="grid grid-cols-2 gap-2 pr-2">
              {filteredFiles.map(file => (
                <Card
                  key={file.id}
                  className={`cursor-pointer transition-all ${
                    selectedFile?.id === file.id 
                      ? 'border-emerald-400 bg-emerald-500/20' 
                      : `bg-background/30 ${getGroupStyle(file.group)}`
                  }`}
                  onClick={() => handleSelect(file)}
                >
                  <CardContent className="p-2">
                    <div className="flex items-center gap-2 mb-1">
                      {getGroupIcon(file.group)}
                      <span className="font-mono text-xs truncate flex-1">{file.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground capitalize">{file.group}</span>
                      <span className="text-[10px] text-muted-foreground">{(file.content.length / 1024).toFixed(1)}KB</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {filteredFiles.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No files found</p>
              <Button size="sm" variant="link" onClick={handleAddExamples}>
                Load example files
              </Button>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right: File Preview/Editor */}
      <Card className="w-1/2 flex flex-col overflow-hidden bg-background/30 border-emerald-500/20">
        <CardHeader className="py-2 px-3 border-b border-emerald-500/20 flex-shrink-0 bg-gradient-to-r from-emerald-500/10 to-transparent">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              {selectedFile ? (
                <>
                  {getGroupIcon(selectedFile.group)}
                  {isEditing ? (
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-6 text-xs font-mono w-40 bg-background/50"
                    />
                  ) : (
                    <span className="font-mono truncate text-emerald-100">{selectedFile.name}</span>
                  )}
                </>
              ) : (
                <>
                  <File className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">No file selected</span>
                </>
              )}
            </div>
            {selectedFile && (
              <div className="flex items-center gap-1">
                {isEditing ? (
                  <>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setIsEditing(false)}>
                      <X className="w-3 h-3 mr-1" />
                      Cancel
                    </Button>
                    <Button size="sm" className="h-6 px-2 text-xs bg-emerald-600 hover:bg-emerald-500" onClick={handleSaveEdit}>
                      <Save className="w-3 h-3 mr-1" />
                      Save
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" className="h-6 px-2 text-xs border-emerald-500/30" onClick={() => {
                    setEditContent(selectedFile.content);
                    setEditName(selectedFile.name);
                    setIsEditing(true);
                  }}>
                    <Edit2 className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          {selectedFile ? (
            isEditing ? (
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="h-full w-full font-mono text-xs resize-none rounded-none border-0 bg-background/30 focus:ring-0"
                style={{ minHeight: '100%' }}
              />
            ) : (
              <ScrollArea className="h-full">
                <pre className="p-3 text-xs font-mono text-emerald-100/90">
                  <code>{selectedFile.content}</code>
                </pre>
              </ScrollArea>
            )
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm mb-2">Select a file to preview</p>
                <p className="text-xs">or create a new file to get started</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Group Dialog */}
      <Dialog open={showCreateGroupDialog} onOpenChange={setShowCreateGroupDialog}>
        <DialogContent className="sm:max-w-[350px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-emerald-400" />
              Create Custom Group
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm">Group Name</Label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g., helpers, utils, tests"
                className="mt-1"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Custom groups help you organize files beyond the default categories. 
              Files can belong to both a standard group and a custom group.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateGroupDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateGroup} className="bg-emerald-600 hover:bg-emerald-500">
              <Plus className="w-4 h-4 mr-1" />
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create New File Dialog */}
      <Dialog open={showNewFileDialog} onOpenChange={setShowNewFileDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <File className="w-5 h-5 text-emerald-400" />
              Create New File
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm">File Name</Label>
              <Input
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="MyAlgorithm.py"
                className="mt-1 font-mono"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Supports .py, .js, .ts extensions
              </p>
            </div>
            <div>
              <Label className="text-sm">Group</Label>
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
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {customGroups.length > 0 && (
              <div>
                <Label className="text-sm">Custom Group Tag (optional)</Label>
                <Select value={newFileCustomGroup} onValueChange={setNewFileCustomGroup}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {customGroups.map(group => (
                      <SelectItem key={group} value={group}>{group}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFileDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateNewFile} className="bg-emerald-600 hover:bg-emerald-500">
              <Plus className="w-4 h-4 mr-1" />
              Create File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};