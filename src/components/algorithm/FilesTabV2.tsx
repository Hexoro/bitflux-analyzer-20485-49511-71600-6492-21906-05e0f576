/**
 * Files Tab V2 - Redesigned for many files with grid view
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
  Search,
  Grid,
  List,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { pythonModuleSystem, PythonFile } from '@/lib/pythonModuleSystem';
import { 
  EXAMPLE_SCHEDULER, 
  EXAMPLE_ALGORITHM, 
  EXAMPLE_SCORING, 
  EXAMPLE_POLICY,
} from '@/lib/exampleAlgorithmFiles';

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
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

  const handleAddExamples = () => {
    pythonModuleSystem.addFile('MasterScheduler.py', EXAMPLE_SCHEDULER, 'scheduler');
    pythonModuleSystem.addFile('EntropyReduction.py', EXAMPLE_ALGORITHM, 'algorithm');
    pythonModuleSystem.addFile('PerformanceScoring.py', EXAMPLE_SCORING, 'scoring');
    pythonModuleSystem.addFile('ExecutionPolicy.py', EXAMPLE_POLICY, 'policies');
    toast.success('Example files added');
  };

  const getGroupIcon = (group: PythonFile['group']) => {
    switch (group) {
      case 'scheduler': return <Clock className="w-3 h-3 text-purple-500" />;
      case 'algorithm': return <Code className="w-3 h-3 text-primary" />;
      case 'scoring': return <Calculator className="w-3 h-3 text-yellow-500" />;
      case 'policies': return <Shield className="w-3 h-3 text-green-500" />;
      case 'ai': return <Brain className="w-3 h-3 text-cyan-500" />;
      default: return <FileCode className="w-3 h-3 text-orange-500" />;
    }
  };

  const getGroupColor = (group: PythonFile['group']) => {
    switch (group) {
      case 'scheduler': return 'bg-purple-500/10 border-purple-500/30';
      case 'algorithm': return 'bg-primary/10 border-primary/30';
      case 'scoring': return 'bg-yellow-500/10 border-yellow-500/30';
      case 'policies': return 'bg-green-500/10 border-green-500/30';
      case 'ai': return 'bg-cyan-500/10 border-cyan-500/30';
      default: return 'bg-orange-500/10 border-orange-500/30';
    }
  };

  return (
    <div className="h-full flex gap-3 p-3">
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
        {/* Controls */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="pl-8 h-8"
            />
          </div>
          <Select value={filterGroup} onValueChange={setFilterGroup}>
            <SelectTrigger className="w-28 h-8">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
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
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            className="h-8 w-8"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            className="h-8 w-8"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>

        {/* Upload Controls */}
        <div className="flex items-center gap-2">
          <Select value={uploadGroup} onValueChange={(v) => setUploadGroup(v as PythonFile['group'])}>
            <SelectTrigger className="w-28 h-7 text-xs">
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
          <Button size="sm" className="h-7 text-xs" onClick={handleUpload}>
            <Upload className="w-3 h-3 mr-1" />
            Upload
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleAddExamples}>
            <Plus className="w-3 h-3 mr-1" />
            Examples
          </Button>
        </div>

        {/* Group Stats */}
        <div className="flex gap-1 flex-wrap">
          {Object.entries(groups).map(([group, count]) => (
            <Badge
              key={group}
              variant="outline"
              className={`text-[10px] cursor-pointer ${filterGroup === group ? 'bg-primary/10' : ''}`}
              onClick={() => setFilterGroup(filterGroup === group ? 'all' : group)}
            >
              {getGroupIcon(group as PythonFile['group'])}
              <span className="ml-1">{count}</span>
            </Badge>
          ))}
        </div>

        {/* Files */}
        <ScrollArea className="flex-1">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 gap-2 pr-2">
              {filteredFiles.map(file => (
                <div
                  key={file.id}
                  className={`p-2 rounded-lg border cursor-pointer transition-all ${
                    selectedFile?.id === file.id 
                      ? 'border-primary bg-primary/10' 
                      : `${getGroupColor(file.group)} hover:shadow-sm`
                  }`}
                  onClick={() => handleSelect(file)}
                >
                  <div className="flex items-center gap-2">
                    {getGroupIcon(file.group)}
                    <span className="font-mono text-xs truncate flex-1">{file.name}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground">
                      {(file.content.length / 1024).toFixed(1)}KB
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5 opacity-0 hover:opacity-100 -mr-1"
                      onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1 pr-2">
              {filteredFiles.map(file => (
                <div
                  key={file.id}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                    selectedFile?.id === file.id 
                      ? 'border-primary bg-primary/10' 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => handleSelect(file)}
                >
                  {getGroupIcon(file.group)}
                  <span className="font-mono text-xs truncate flex-1">{file.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {(file.content.length / 1024).toFixed(1)}KB
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5"
                    onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }}
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {filteredFiles.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No files found</p>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right: File Preview */}
      <Card className="w-1/2 flex flex-col overflow-hidden">
        <CardHeader className="py-2 px-3 border-b flex-shrink-0">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              {selectedFile ? (
                <>
                  {getGroupIcon(selectedFile.group)}
                  <span className="font-mono truncate">{selectedFile.name}</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  <span>Preview</span>
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
                    <Button size="sm" className="h-6 px-2 text-xs" onClick={handleSaveEdit}>
                      <Save className="w-3 h-3 mr-1" />
                      Save
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => {
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
                className="h-full w-full font-mono text-xs resize-none rounded-none border-0"
              />
            ) : (
              <ScrollArea className="h-full">
                <pre className="p-3 text-xs font-mono">
                  <code>{selectedFile.content}</code>
                </pre>
              </ScrollArea>
            )
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a file to preview</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
