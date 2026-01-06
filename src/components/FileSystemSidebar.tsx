import { useState, useEffect } from 'react';
import { BinaryFile, fileSystemManager } from '@/lib/fileSystemManager';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import {
  File,
  FileText,
  Plus,
  Trash2,
  Edit2,
  FileCode,
  X,
  Folder,
  FolderPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface FileSystemSidebarProps {
  onFileChange?: () => void;
}

export const FileSystemSidebar = ({ onFileChange }: FileSystemSidebarProps) => {
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [, forceUpdate] = useState({});

  // Subscribe to file system changes
  useEffect(() => {
    const unsubscribe = fileSystemManager.subscribe(() => {
      forceUpdate({});
      onFileChange?.();
    });
    return unsubscribe;
  }, [onFileChange]);

  const files = fileSystemManager.getFiles();
  const activeFile = fileSystemManager.getActiveFile();
  const groups = fileSystemManager.getGroups();
  
  const filteredFiles = selectedGroup === 'all' 
    ? files 
    : files.filter(f => f.group === selectedGroup || (!f.group && selectedGroup === 'ungrouped'));

  const handleCreateFile = () => {
    const name = `untitled_${files.length + 1}.txt`;
    fileSystemManager.createFile(name, '', 'binary');
    toast.success('New file created');
  };

  const handleSelectFile = (id: string) => {
    fileSystemManager.setActiveFile(id);
  };

  const handleDeleteFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (files.length === 1) {
      toast.error('Cannot delete the last file');
      return;
    }

    fileSystemManager.deleteFile(id);
    toast.success('File deleted');
  };

  const handleStartRename = (id: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFileId(id);
    setNewFileName(currentName);
  };

  const handleRename = (id: string) => {
    if (newFileName.trim()) {
      fileSystemManager.renameFile(id, newFileName.trim());
      toast.success('File renamed');
    }
    setEditingFileId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      handleRename(id);
    } else if (e.key === 'Escape') {
      setEditingFileId(null);
    }
  };

  const handleCreateGroup = () => {
    if (newGroupName.trim()) {
      fileSystemManager.addGroup(newGroupName.trim());
      toast.success(`Group "${newGroupName}" created`);
      setNewGroupName('');
      setCreatingGroup(false);
    }
  };

  const handleSetFileGroup = (fileId: string, group: string) => {
    fileSystemManager.setFileGroup(fileId, group === 'none' ? '' : group);
    toast.success('File group updated');
  };

  const getFileIcon = (file: BinaryFile) => {
    if (file.type === 'text') {
      return <FileText className="w-4 h-4" />;
    }
    return <FileCode className="w-4 h-4" />;
  };

  return (
    <div className="h-full flex flex-col bg-panel-bg border-r border-border">
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-foreground">Files</h2>
          <Button
            onClick={handleCreateFile}
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            title="New File"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger className="h-7 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Files</SelectItem>
              <SelectItem value="ungrouped">Ungrouped</SelectItem>
              {groups.map(group => (
                <SelectItem key={group} value={group}>
                  <Folder className="w-3 h-3 inline mr-1" />
                  {group}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              onClick={() => handleSelectFile(file.id)}
              className={`
                group flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer
                transition-colors
                ${activeFile?.id === file.id 
                  ? 'bg-accent/20 text-accent' 
                  : 'hover:bg-muted/50 text-foreground'
                }
              `}
            >
              {getFileIcon(file)}
              
              {editingFileId === file.id ? (
                <Input
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, file.id)}
                  onBlur={() => handleRename(file.id)}
                  className="h-6 text-xs flex-1"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs truncate">{file.name}</div>
                    {file.group && (
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Folder className="w-2 h-2" />
                        {file.group}
                      </div>
                    )}
                  </div>
                  <div className="hidden group-hover:flex items-center gap-1">
                    <Select value={file.group || 'none'} onValueChange={(g) => handleSetFileGroup(file.id, g)}>
                      <SelectTrigger className="h-5 w-5 p-0 border-0">
                        <Folder className="w-3 h-3" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Group</SelectItem>
                        {groups.map(group => (
                          <SelectItem key={group} value={group}>{group}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={(e) => handleStartRename(file.id, file.name, e)}
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      title="Rename"
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button
                      onClick={(e) => handleDeleteFile(file.id, e)}
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-2 border-t border-border">
        <div className="text-xs text-muted-foreground mb-2">
          {filteredFiles.length} of {files.length} file{files.length !== 1 ? 's' : ''}
        </div>
        {!creatingGroup ? (
          <Button
            onClick={() => setCreatingGroup(true)}
            variant="outline"
            size="sm"
            className="w-full h-7 text-xs"
          >
            <FolderPlus className="w-3 h-3 mr-1" />
            New Group
          </Button>
        ) : (
          <div className="flex gap-1">
            <Input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
              placeholder="Group name..."
              className="h-7 text-xs flex-1"
              autoFocus
            />
            <Button onClick={handleCreateGroup} size="sm" className="h-7 px-2">
              <Plus className="w-3 h-3" />
            </Button>
            <Button onClick={() => setCreatingGroup(false)} size="sm" variant="ghost" className="h-7 px-2">
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
