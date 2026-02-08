/**
 * Strategy Create Tab - Wizard-style preset maker with group sorting and custom groups
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Code,
  Calculator,
  Shield,
  Clock,
  Search,
  FolderOpen,
  Layers,
  Sparkles,
  FileCode,
  Wrench,
  Puzzle,
  X,
  SortAsc,
  SortDesc,
  Grid3X3,
  List,
  Tag,
} from 'lucide-react';
import { PythonFile, pythonModuleSystem } from '@/lib/pythonModuleSystem';

interface StrategyTag {
  id: string;
  name: string;
  color: string;
}

type FileGroup = 'all' | 'scheduler' | 'algorithm' | 'scoring' | 'policies' | 'custom' | string;

interface StrategyCreateTabProps {
  files: PythonFile[];
  tags: StrategyTag[];
  selectedScheduler: string;
  selectedAlgorithms: string[];
  selectedScoring: string[];
  selectedPolicies: string[];
  selectedCustomFiles: string[];
  selectedTags: string[];
  strategyName: string;
  strategyDescription: string;
  onSetScheduler: (f: string) => void;
  onSetAlgorithms: (f: string[]) => void;
  onSetScoring: (f: string[]) => void;
  onSetPolicies: (f: string[]) => void;
  onSetCustomFiles: (f: string[]) => void;
  onSetTags: (t: string[]) => void;
  onSetName: (n: string) => void;
  onSetDescription: (d: string) => void;
  onCreate: () => void;
}

const GROUP_COLORS: Record<string, string> = {
  scheduler: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
  algorithm: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30',
  scoring: 'text-amber-400 bg-amber-500/20 border-amber-500/30',
  policies: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30',
  custom: 'text-purple-400 bg-purple-500/20 border-purple-500/30',
  ai: 'text-pink-400 bg-pink-500/20 border-pink-500/30',
};

const GROUP_ICONS: Record<string, React.ReactNode> = {
  scheduler: <Clock className="w-3 h-3" />,
  algorithm: <Code className="w-3 h-3" />,
  scoring: <Calculator className="w-3 h-3" />,
  policies: <Shield className="w-3 h-3" />,
  custom: <Puzzle className="w-3 h-3" />,
  ai: <Sparkles className="w-3 h-3" />,
};

const getGroupMeta = (group: string) => ({
  icon: GROUP_ICONS[group] || <FolderOpen className="w-3 h-3" />,
  label: group.charAt(0).toUpperCase() + group.slice(1),
  colorClass: GROUP_COLORS[group] || 'text-slate-400 bg-slate-500/20 border-slate-500/30',
});

export const StrategyCreateTab = ({
  files,
  tags,
  selectedScheduler,
  selectedAlgorithms,
  selectedScoring,
  selectedPolicies,
  selectedCustomFiles,
  selectedTags,
  strategyName,
  strategyDescription,
  onSetScheduler,
  onSetAlgorithms,
  onSetScoring,
  onSetPolicies,
  onSetCustomFiles,
  onSetTags,
  onSetName,
  onSetDescription,
  onCreate,
}: StrategyCreateTabProps) => {
  const [fileSearch, setFileSearch] = useState('');
  const [fileGroupFilter, setFileGroupFilter] = useState<FileGroup>('all');
  const [sortBy, setSortBy] = useState<'name' | 'lines' | 'date' | 'group'>('group');
  const [sortAsc, setSortAsc] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Get all groups including user-made custom groups
  const customGroups = useMemo(() => pythonModuleSystem.getCustomGroups(), [files]);

  // Standard + custom groups for the filter
  const allGroups = useMemo(() => {
    const standard = ['all', 'scheduler', 'algorithm', 'scoring', 'policies', 'custom'];
    // Add user-made custom groups that aren't in the standard list
    const extra = customGroups.filter(g => !standard.includes(g) && g !== 'ai');
    return [...standard, 'ai', ...extra];
  }, [customGroups]);

  // Build group counts
  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = { all: files.length };
    files.forEach(f => {
      const g = f.customGroup || f.group;
      counts[g] = (counts[g] || 0) + 1;
    });
    // Also count the "custom" bucket (files with group=custom, group=ai, or unrecognized groups)
    counts['custom'] = files.filter(f =>
      f.group === 'custom' || (!['scheduler', 'algorithm', 'scoring', 'policies', 'ai'].includes(f.group) && !f.customGroup)
    ).length;
    return counts;
  }, [files]);

  // Filtered and sorted files
  const filteredFiles = useMemo(() => {
    let result = files.filter(f => {
      const matchesSearch = f.name.toLowerCase().includes(fileSearch.toLowerCase());
      if (fileGroupFilter === 'all') return matchesSearch;
      if (fileGroupFilter === 'custom') {
        return matchesSearch && (f.group === 'custom' || (!['scheduler', 'algorithm', 'scoring', 'policies', 'ai'].includes(f.group) && !f.customGroup));
      }
      // Match by group or customGroup
      const effectiveGroup = f.customGroup || f.group;
      return matchesSearch && effectiveGroup === fileGroupFilter;
    });

    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortBy === 'lines') cmp = a.content.split('\n').length - b.content.split('\n').length;
      else if (sortBy === 'date') cmp = new Date(b.modified).getTime() - new Date(a.modified).getTime();
      else if (sortBy === 'group') {
        const ga = a.customGroup || a.group;
        const gb = b.customGroup || b.group;
        cmp = ga.localeCompare(gb) || a.name.localeCompare(b.name);
      }
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [files, fileSearch, fileGroupFilter, sortBy, sortAsc]);

  // Determine which group a file belongs to for selection purposes
  const getEffectiveGroup = (file: PythonFile): string => file.customGroup || file.group;

  const isFileSelected = (file: PythonFile): boolean => {
    const g = getEffectiveGroup(file);
    if (g === 'scheduler') return selectedScheduler === file.name;
    if (g === 'algorithm') return selectedAlgorithms.includes(file.name);
    if (g === 'scoring') return selectedScoring.includes(file.name);
    if (g === 'policies') return selectedPolicies.includes(file.name);
    return selectedCustomFiles.includes(file.name);
  };

  const toggleFile = (file: PythonFile) => {
    const g = getEffectiveGroup(file);
    if (g === 'scheduler') {
      onSetScheduler(selectedScheduler === file.name ? '' : file.name);
    } else if (g === 'algorithm') {
      onSetAlgorithms(selectedAlgorithms.includes(file.name)
        ? selectedAlgorithms.filter(f => f !== file.name)
        : [...selectedAlgorithms, file.name]);
    } else if (g === 'scoring') {
      onSetScoring(selectedScoring.includes(file.name)
        ? selectedScoring.filter(f => f !== file.name)
        : [...selectedScoring, file.name]);
    } else if (g === 'policies') {
      onSetPolicies(selectedPolicies.includes(file.name)
        ? selectedPolicies.filter(f => f !== file.name)
        : [...selectedPolicies, file.name]);
    } else {
      onSetCustomFiles(selectedCustomFiles.includes(file.name)
        ? selectedCustomFiles.filter(f => f !== file.name)
        : [...selectedCustomFiles, file.name]);
    }
  };

  // Group files for display when sorting by group
  const groupedFiles = useMemo(() => {
    if (sortBy !== 'group') return null;
    const groups: Record<string, PythonFile[]> = {};
    filteredFiles.forEach(f => {
      const g = f.customGroup || f.group;
      if (!groups[g]) groups[g] = [];
      groups[g].push(f);
    });
    return groups;
  }, [filteredFiles, sortBy]);

  const getColorClass = (group: string) => {
    const meta = getGroupMeta(group);
    return meta.colorClass;
  };

  return (
    <div className="h-full flex gap-3 p-3 overflow-hidden">
      {/* Left: File Browser */}
      <div className="w-1/2 h-full flex flex-col">
        <Card className="h-full flex flex-col">
          <CardHeader className="py-2 px-3 flex-shrink-0">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-xs flex items-center gap-2">
                <FolderOpen className="w-3 h-3 text-cyan-400" />
                Files
                <Badge variant="outline" className="text-[10px] h-4">{filteredFiles.length}</Badge>
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
                  {viewMode === 'grid' ? <List className="w-3 h-3" /> : <Grid3X3 className="w-3 h-3" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSortAsc(!sortAsc)}>
                  {sortAsc ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />}
                </Button>
              </div>
            </div>

            {/* Search */}
            <div className="relative mt-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input
                value={fileSearch}
                onChange={(e) => setFileSearch(e.target.value)}
                placeholder="Search files..."
                className="pl-7 h-7 text-xs"
              />
            </div>

            {/* Sort by */}
            <div className="flex items-center gap-2 mt-2">
              <Label className="text-[10px] text-muted-foreground shrink-0">Sort:</Label>
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="h-6 text-[10px] flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="group">By Group</SelectItem>
                  <SelectItem value="name">By Name</SelectItem>
                  <SelectItem value="lines">By Size</SelectItem>
                  <SelectItem value="date">By Date</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Group filter chips */}
            <div className="flex flex-wrap gap-1 mt-2">
              {allGroups.map(group => {
                const meta = getGroupMeta(group);
                const count = groupCounts[group] || 0;
                return (
                  <Button
                    key={group}
                    variant={fileGroupFilter === group ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={() => setFileGroupFilter(group)}
                  >
                    {group === 'all' ? <Layers className="w-3 h-3 mr-1" /> : meta.icon}
                    <span className="ml-1 capitalize">{group === 'all' ? 'All' : meta.label}</span>
                    {count > 0 && (
                      <Badge variant="outline" className="ml-1 text-[9px] h-4 px-1">{count}</Badge>
                    )}
                  </Button>
                );
              })}
            </div>
          </CardHeader>

          <CardContent className="p-2 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              {groupedFiles && sortBy === 'group' ? (
                // Render grouped
                <div className="space-y-3">
                  {Object.entries(groupedFiles).map(([group, groupFiles]) => {
                    const meta = getGroupMeta(group);
                    return (
                      <div key={group}>
                        <div className="flex items-center gap-2 mb-1 px-1">
                          {meta.icon}
                          <span className={`text-xs font-medium capitalize ${meta.colorClass.split(' ')[0]}`}>{meta.label}</span>
                          <Badge variant="outline" className="text-[9px] h-4">{groupFiles.length}</Badge>
                        </div>
                        <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-1' : 'space-y-0.5'}>
                          {groupFiles.map(file => (
                            <FileItem
                              key={file.id}
                              file={file}
                              selected={isFileSelected(file)}
                              viewMode={viewMode}
                              colorClass={getColorClass(getEffectiveGroup(file))}
                              onClick={() => toggleFile(file)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Render flat
                <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-1' : 'space-y-0.5'}>
                  {filteredFiles.map(file => (
                    <FileItem
                      key={file.id}
                      file={file}
                      selected={isFileSelected(file)}
                      viewMode={viewMode}
                      colorClass={getColorClass(getEffectiveGroup(file))}
                      onClick={() => toggleFile(file)}
                    />
                  ))}
                </div>
              )}
              {filteredFiles.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">No files found</p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Right: Strategy Form + Selected Files */}
      <ScrollArea className="w-1/2">
        <div className="flex flex-col gap-3">
          {/* Strategy Form */}
          <Card>
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-xs flex items-center gap-2">
                <Wrench className="w-3 h-3 text-purple-400" /> New Strategy
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Name</Label>
                <Input value={strategyName} onChange={(e) => onSetName(e.target.value)} placeholder="My Strategy" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description (optional)</Label>
                <Textarea value={strategyDescription} onChange={(e) => onSetDescription(e.target.value)} placeholder="What does this strategy do?" className="text-sm resize-none h-16" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tags</Label>
                <div className="flex flex-wrap gap-1">
                  {tags.map(tag => (
                    <Badge
                      key={tag.id}
                      className={`cursor-pointer ${tag.color} ${selectedTags.includes(tag.id) ? 'ring-2 ring-white/50' : 'opacity-50'}`}
                      onClick={() => onSetTags(selectedTags.includes(tag.id) ? selectedTags.filter(t => t !== tag.id) : [...selectedTags, tag.id])}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selected Files Summary */}
          <Card>
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-xs flex items-center gap-2">
                <Layers className="w-3 h-3 text-cyan-400" /> Selected Files
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="space-y-2">
                <SelectedGroup label="Scheduler" color="blue" icon={<Clock className="w-3 h-3 text-blue-400" />} required>
                  {selectedScheduler
                    ? <SelectedFile name={selectedScheduler} onRemove={() => onSetScheduler('')} />
                    : <p className="text-xs text-muted-foreground ml-5">Select from file browser</p>}
                </SelectedGroup>

                <SelectedGroup label="Algorithms" color="cyan" icon={<Code className="w-3 h-3 text-cyan-400" />} count={selectedAlgorithms.length}>
                  {selectedAlgorithms.length > 0
                    ? selectedAlgorithms.map(f => <SelectedFile key={f} name={f} onRemove={() => onSetAlgorithms(selectedAlgorithms.filter(x => x !== f))} />)
                    : <p className="text-xs text-muted-foreground ml-5">Select from file browser</p>}
                </SelectedGroup>

                <SelectedGroup label="Scoring" color="amber" icon={<Calculator className="w-3 h-3 text-amber-400" />} count={selectedScoring.length}>
                  {selectedScoring.length > 0
                    ? selectedScoring.map(f => <SelectedFile key={f} name={f} onRemove={() => onSetScoring(selectedScoring.filter(x => x !== f))} />)
                    : <p className="text-xs text-muted-foreground ml-5">Optional</p>}
                </SelectedGroup>

                <SelectedGroup label="Policies" color="emerald" icon={<Shield className="w-3 h-3 text-emerald-400" />} count={selectedPolicies.length}>
                  {selectedPolicies.length > 0
                    ? selectedPolicies.map(f => <SelectedFile key={f} name={f} onRemove={() => onSetPolicies(selectedPolicies.filter(x => x !== f))} />)
                    : <p className="text-xs text-muted-foreground ml-5">Optional</p>}
                </SelectedGroup>

                <SelectedGroup label="Custom" color="purple" icon={<Puzzle className="w-3 h-3 text-purple-400" />} count={selectedCustomFiles.length}>
                  {selectedCustomFiles.length > 0
                    ? selectedCustomFiles.map(f => <SelectedFile key={f} name={f} onRemove={() => onSetCustomFiles(selectedCustomFiles.filter(x => x !== f))} />)
                    : <p className="text-xs text-muted-foreground ml-5">Optional</p>}
                </SelectedGroup>
              </div>
            </CardContent>
          </Card>

          {/* Create Button */}
          <Button
            size="lg"
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
            onClick={onCreate}
            disabled={!strategyName.trim() || !selectedScheduler}
          >
            <Sparkles className="w-4 h-4 mr-2" /> Create Strategy
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
};

// Sub-components
const FileItem = ({ file, selected, viewMode, colorClass, onClick }: {
  file: PythonFile;
  selected: boolean;
  viewMode: 'list' | 'grid';
  colorClass: string;
  onClick: () => void;
}) => {
  const lineCount = file.content.split('\n').length;
  const group = file.customGroup || file.group;
  const meta = getGroupMeta(group);

  return (
    <div
      className={`
        ${viewMode === 'grid' ? 'p-2' : 'flex items-center gap-2 p-1.5'}
        rounded cursor-pointer transition-colors border
        ${selected ? colorClass : 'border-transparent hover:bg-muted/30'}
      `}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 min-w-0">
        {group === 'scheduler' ? (
          <div className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 ${selected ? 'bg-blue-400 border-blue-400' : 'border-muted-foreground'}`} />
        ) : (
          <Checkbox checked={selected} className="h-3.5 w-3.5 shrink-0" />
        )}
        <div className={`p-0.5 rounded ${colorClass}`}>{meta.icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs truncate font-medium">{file.name}</p>
          {viewMode === 'grid' && (
            <p className="text-[10px] text-muted-foreground">{lineCount} lines</p>
          )}
        </div>
      </div>
      {viewMode === 'list' && (
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
          <Badge variant="secondary" className="text-[9px] h-4 capitalize">{meta.label}</Badge>
          <Badge variant="outline" className="text-[9px] h-4">{lineCount}L</Badge>
        </div>
      )}
    </div>
  );
};

const SelectedGroup = ({ label, color, icon, required, count, children }: {
  label: string;
  color: string;
  icon: React.ReactNode;
  required?: boolean;
  count?: number;
  children: React.ReactNode;
}) => (
  <div className={`p-2 rounded bg-${color}-500/10 border border-${color}-500/20`}>
    <div className="flex items-center gap-2 text-xs mb-1">
      {icon}
      <span className={`text-${color}-400 font-medium`}>{label}</span>
      {required && <Badge variant="outline" className="text-[9px] h-4">Required</Badge>}
      {count !== undefined && count > 0 && <Badge variant="outline" className="text-[9px] h-4">{count}</Badge>}
    </div>
    <div className="ml-5 space-y-1">{children}</div>
  </div>
);

const SelectedFile = ({ name, onRemove }: { name: string; onRemove: () => void }) => (
  <div className="flex items-center justify-between">
    <span className="text-xs">{name}</span>
    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onRemove}>
      <X className="w-3 h-3" />
    </Button>
  </div>
);
