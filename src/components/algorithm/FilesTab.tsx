/**
 * Files Tab - Python/JS/TS file management with groups and editable preview
 * Groups: Scheduler (1 required), Algorithm, Scoring, Policies, AI, Custom
 */

import { useState, useEffect, useRef } from 'react';
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Upload,
  FileCode,
  Trash2,
  Eye,
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
  Folder,
  FolderPlus,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { pythonModuleSystem, PythonFile } from '@/lib/pythonModuleSystem';
import { 
  EXAMPLE_SCHEDULER, 
  EXAMPLE_ALGORITHM, 
  EXAMPLE_SCORING, 
  EXAMPLE_POLICY,
  EXAMPLE_AI_TENSORFLOW,
  EXAMPLE_AI_NEURAL,
} from '@/lib/exampleAlgorithmFiles';
import { loadUnifiedStrategyFiles } from '@/lib/unifiedStrategy';

interface FilesTabProps {
  onFileSelect?: (file: PythonFile | null) => void;
}

export const FilesTab = ({ onFileSelect }: FilesTabProps) => {
  const [files, setFiles] = useState<PythonFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<PythonFile | null>(null);
  const [uploadGroup, setUploadGroup] = useState<PythonFile['group']>('algorithm');
  const [customGroupName, setCustomGroupName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editName, setEditName] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'group'>('group');
  const [customGroups, setCustomGroups] = useState<string[]>([]);
  const [newGroupDialogOpen, setNewGroupDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFiles(pythonModuleSystem.getAllFiles());
    setCustomGroups(pythonModuleSystem.getCustomGroups());
    const unsubscribe = pythonModuleSystem.subscribe(() => {
      setFiles(pythonModuleSystem.getAllFiles());
      setCustomGroups(pythonModuleSystem.getCustomGroups());
    });
    return unsubscribe;
  }, []);

  const schedulerFiles = files.filter(f => f.group === 'scheduler');
  const algorithmFiles = files.filter(f => f.group === 'algorithm');
  const scoringFiles = files.filter(f => f.group === 'scoring');
  const policyFiles = files.filter(f => f.group === 'policies');
  const aiFiles = files.filter(f => f.group === 'ai');
  const customFiles = files.filter(f => f.group === 'custom');

  // Get files by custom group
  const getFilesByCustomGroup = (groupName: string) => {
    return files.filter(f => f.group === 'custom' && f.customGroup === groupName);
  };

  const sortedFiles = (fileList: PythonFile[]) => {
    switch (sortBy) {
      case 'name':
        return [...fileList].sort((a, b) => a.name.localeCompare(b.name));
      case 'date':
        return [...fileList].sort((a, b) => b.modified.getTime() - a.modified.getTime());
      default:
        return fileList;
    }
  };

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
        toast.error(`${file.name}: Only Python (.py), JavaScript (.js), and TypeScript (.ts) files are allowed`);
        continue;
      }

      try {
        const content = await file.text();
        // For AI and custom groups, handle customGroup properly
        let customGroup: string | undefined = undefined;
        
        if (uploadGroup === 'custom') {
          if (!customGroupName) {
            toast.error(`${file.name}: Please select or create a custom group first`);
            continue;
          }
          customGroup = customGroupName;
        }
        
        pythonModuleSystem.addFile(file.name, content, uploadGroup, customGroup);
        toast.success(`${file.name} uploaded to ${uploadGroup}${customGroup ? ` (${customGroup})` : ''}`);
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

  const handleStartEdit = () => {
    if (selectedFile) {
      setEditContent(selectedFile.content);
      setEditName(selectedFile.name);
      setIsEditing(true);
    }
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

  const handleCancelEdit = () => {
    if (selectedFile) {
      setEditContent(selectedFile.content);
      setEditName(selectedFile.name);
    }
    setIsEditing(false);
  };

  const handleAddExampleFiles = () => {
    pythonModuleSystem.addFile('MasterScheduler.py', EXAMPLE_SCHEDULER, 'scheduler');
    pythonModuleSystem.addFile('EntropyReduction.py', EXAMPLE_ALGORITHM, 'algorithm');
    pythonModuleSystem.addFile('PerformanceScoring.py', EXAMPLE_SCORING, 'scoring');
    pythonModuleSystem.addFile('ExecutionPolicy.py', EXAMPLE_POLICY, 'policies');
    toast.success('Example strategy files added');
  };

  const handleAddAIExampleFiles = () => {
    pythonModuleSystem.addFile('PatternAnalyzer.js', EXAMPLE_AI_TENSORFLOW, 'ai');
    pythonModuleSystem.addFile('NeuralPredictor.js', EXAMPLE_AI_NEURAL, 'ai');
    toast.success('AI example files added (TensorFlow.js)');
  };

  const handleCreateCustomGroup = () => {
    if (!newGroupName.trim()) {
      toast.error('Group name is required');
      return;
    }
    if (customGroups.includes(newGroupName.trim())) {
      toast.error('Group already exists');
      return;
    }
    const groupName = newGroupName.trim();
    // Persist the group immediately
    pythonModuleSystem.registerCustomGroup(groupName);
    setCustomGroupName(groupName);
    setUploadGroup('custom'); // Auto-select custom group
    setNewGroupDialogOpen(false);
    setNewGroupName('');
    toast.success(`Custom group "${groupName}" created - now upload files to it`);
  };

  const getGroupIcon = (group: PythonFile['group']) => {
    switch (group) {
      case 'scheduler': return <Clock className="w-4 h-4 text-purple-500" />;
      case 'algorithm': return <Code className="w-4 h-4 text-primary" />;
      case 'scoring': return <Calculator className="w-4 h-4 text-yellow-500" />;
      case 'policies': return <Shield className="w-4 h-4 text-green-500" />;
      case 'ai': return <Brain className="w-4 h-4 text-cyan-500" />;
      case 'custom': return <Folder className="w-4 h-4 text-orange-500" />;
      default: return <FileCode className="w-4 h-4" />;
    }
  };

  const FileList = ({ files, group }: { files: PythonFile[]; group: PythonFile['group'] }) => (
    <div className="space-y-2">
      {files.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">No files in this group</p>
      ) : (
        sortedFiles(files).map(file => (
          <div
            key={file.id}
            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
              selectedFile?.id === file.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
            }`}
            onClick={() => handleSelect(file)}
          >
            <div className="flex items-center gap-3">
              <FileCode className={`w-4 h-4 ${file.name.endsWith('.py') ? 'text-yellow-500' : 'text-cyan-500'}`} />
              <div>
                <p className="font-medium font-mono text-sm">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {file.content.length} chars • {new Date(file.modified).toLocaleDateString()}
                  {file.customGroup && <span className="ml-2 text-orange-400">[{file.customGroup}]</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(file);
                }}
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(file.id);
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="h-full flex gap-4 p-4">
      {/* Hidden file input - multiple allowed, accepts .py, .js, .ts */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".py,.js,.ts"
        multiple
        className="hidden"
      />

      {/* Left: File List */}
      <div className="w-1/2 flex flex-col gap-4">
        {/* Upload Controls */}
        <Card>
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center gap-2">
              <Select value={uploadGroup} onValueChange={(v) => setUploadGroup(v as PythonFile['group'])}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduler">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Scheduler
                    </div>
                  </SelectItem>
                  <SelectItem value="algorithm">
                    <div className="flex items-center gap-2">
                      <Code className="w-4 h-4" />
                      Algorithm
                    </div>
                  </SelectItem>
                  <SelectItem value="scoring">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-4 h-4" />
                      Scoring
                    </div>
                  </SelectItem>
                  <SelectItem value="policies">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Policies
                    </div>
                  </SelectItem>
                  <SelectItem value="ai">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4" />
                      AI
                    </div>
                  </SelectItem>
                  <SelectItem value="custom">
                    <div className="flex items-center gap-2">
                      <Folder className="w-4 h-4" />
                      Custom
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              {uploadGroup === 'custom' && (
                <Select value={customGroupName} onValueChange={setCustomGroupName}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Sub-group" />
                  </SelectTrigger>
                  <SelectContent>
                    {customGroups.map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                    {customGroups.length === 0 && (
                      <SelectItem value="" disabled>No groups yet</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
              
              <Button onClick={handleUpload} className="flex-1">
                <Upload className="w-4 h-4 mr-2" />
                Upload Files
              </Button>
            </div>

            {/* Custom Group Creation */}
            <div className="flex items-center gap-2">
              <Dialog open={newGroupDialogOpen} onOpenChange={setNewGroupDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="h-7 text-xs">
                    <FolderPlus className="w-3 h-3 mr-1" />
                    New Group
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Custom Group</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Group name (e.g., Utilities, Models)"
                    />
                    <Button onClick={handleCreateCustomGroup} className="w-full">
                      Create Group
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Sort Control */}
              <span className="text-xs text-muted-foreground ml-auto">Sort by:</span>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-24 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="group">Group</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Example Files */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Add examples:</span>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleAddExampleFiles}>
                <Plus className="w-3 h-3 mr-1" />
                Python Strategy
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleAddAIExampleFiles}>
                <Brain className="w-3 h-3 mr-1" />
                AI/TensorFlow
              </Button>
              <Button 
                size="sm" 
                variant="default" 
                className="h-7 text-xs bg-primary"
                onClick={() => {
                  loadUnifiedStrategyFiles(pythonModuleSystem);
                  toast.success('Unified Strategy loaded - tests all operations, metrics, AI, scoring, policies');
                }}
              >
                <Zap className="w-3 h-3 mr-1" />
                Unified Strategy
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* File Groups */}
        <ScrollArea className="flex-1">
          <Accordion type="multiple" defaultValue={['scheduler', 'algorithm', 'scoring', 'policies', 'ai']}>
            <AccordionItem value="scheduler">
              <AccordionTrigger className="py-3">
                <div className="flex items-center gap-2">
                  {getGroupIcon('scheduler')}
                  <span>Scheduler</span>
                  <Badge variant="secondary" className="ml-2">{schedulerFiles.length}</Badge>
                  <Badge variant="outline" className="text-xs">Required: 1</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <FileList files={schedulerFiles} group="scheduler" />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="algorithm">
              <AccordionTrigger className="py-3">
                <div className="flex items-center gap-2">
                  {getGroupIcon('algorithm')}
                  <span>Algorithm</span>
                  <Badge variant="secondary" className="ml-2">{algorithmFiles.length}</Badge>
                  <Badge variant="outline" className="text-xs">Multi</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <FileList files={algorithmFiles} group="algorithm" />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="scoring">
              <AccordionTrigger className="py-3">
                <div className="flex items-center gap-2">
                  {getGroupIcon('scoring')}
                  <span>Scoring</span>
                  <Badge variant="secondary" className="ml-2">{scoringFiles.length}</Badge>
                  <Badge variant="outline" className="text-xs">Multi</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <FileList files={scoringFiles} group="scoring" />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="policies">
              <AccordionTrigger className="py-3">
                <div className="flex items-center gap-2">
                  {getGroupIcon('policies')}
                  <span>Policies</span>
                  <Badge variant="secondary" className="ml-2">{policyFiles.length}</Badge>
                  <Badge variant="outline" className="text-xs">Optional</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <FileList files={policyFiles} group="policies" />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="ai">
              <AccordionTrigger className="py-3">
                <div className="flex items-center gap-2">
                  {getGroupIcon('ai')}
                  <span>AI / TensorFlow</span>
                  <Badge variant="secondary" className="ml-2">{aiFiles.length}</Badge>
                  <Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-400">JS/TS</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <FileList files={aiFiles} group="ai" />
              </AccordionContent>
            </AccordionItem>

            {/* Custom Groups */}
            {customGroups.length > 0 && customGroups.map(groupName => (
              <AccordionItem key={groupName} value={`custom-${groupName}`}>
                <AccordionTrigger className="py-3">
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-orange-500" />
                    <span>{groupName}</span>
                    <Badge variant="secondary" className="ml-2">{getFilesByCustomGroup(groupName).length}</Badge>
                    <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-400">Custom</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <FileList files={getFilesByCustomGroup(groupName)} group="custom" />
                </AccordionContent>
              </AccordionItem>
            ))}

            {/* Ungrouped Custom Files */}
            {customFiles.filter(f => !f.customGroup).length > 0 && (
              <AccordionItem value="custom-ungrouped">
                <AccordionTrigger className="py-3">
                  <div className="flex items-center gap-2">
                    {getGroupIcon('custom')}
                    <span>Custom (Ungrouped)</span>
                    <Badge variant="secondary" className="ml-2">{customFiles.filter(f => !f.customGroup).length}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <FileList files={customFiles.filter(f => !f.customGroup)} group="custom" />
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </ScrollArea>
      </div>

      {/* Right: File Preview with Edit */}
      <Card className="w-1/2 flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              {selectedFile ? (isEditing ? 'Editing: ' : '') + selectedFile.name : 'File Preview'}
            </div>
            {selectedFile && (
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveEdit}>
                      <Save className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" onClick={handleStartEdit}>
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col">
          {selectedFile ? (
            <div className="h-full flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">{selectedFile.group}</Badge>
                {selectedFile.customGroup && (
                  <Badge variant="secondary">{selectedFile.customGroup}</Badge>
                )}
                {isEditing && (
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-7 w-48 font-mono text-sm"
                  />
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                  Modified: {new Date(selectedFile.modified).toLocaleString()}
                </span>
              </div>
              {isEditing ? (
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="flex-1 font-mono text-sm resize-none"
                  placeholder="Code..."
                />
              ) : (
                <ScrollArea className="flex-1 border rounded-lg">
                  <pre className="p-4 text-sm font-mono">
                    <code>{selectedFile.content}</code>
                  </pre>
                </ScrollArea>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a file to preview</p>
                <p className="text-xs mt-2">Supports .py, .js, .ts files</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
