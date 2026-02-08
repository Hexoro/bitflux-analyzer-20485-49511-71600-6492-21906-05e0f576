/**
 * Strategy View Tab - Browse, search, filter strategies
 * Extracted from StrategyTabV7 for maintainability
 */

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Code,
  Calculator,
  Shield,
  Clock,
  Search,
  FileCode,
  ChevronDown,
  ChevronUp,
  Star,
  StarOff,
  Pin,
  PinOff,
  Copy,
  MoreVertical,
  Edit,
  Tag,
  Activity,
  TrendingUp,
  Check,
  Package,
  Puzzle,
} from 'lucide-react';
import { toast } from 'sonner';

interface StrategyTag {
  id: string;
  name: string;
  color: string;
}

interface EnhancedStrategy {
  id: string;
  name: string;
  description?: string;
  schedulerFile: string;
  algorithmFiles: string[];
  scoringFiles: string[];
  policyFiles: string[];
  customFiles: string[];
  tags: string[];
  starred: boolean;
  pinned?: boolean;
  createdAt: number;
  created: Date | number;
  lastRun?: number;
  runCount: number;
  avgScore?: number;
  avgDuration?: number;
  version?: number;
  breakpoints?: string[];
}

const TAG_COLORS = [
  'bg-red-500/20 text-red-400 border-red-500/30',
  'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'bg-lime-500/20 text-lime-400 border-lime-500/30',
  'bg-green-500/20 text-green-400 border-green-500/30',
  'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'bg-teal-500/20 text-teal-400 border-teal-500/30',
  'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  'bg-sky-500/20 text-sky-400 border-sky-500/30',
  'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  'bg-violet-500/20 text-violet-400 border-violet-500/30',
  'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30',
  'bg-pink-500/20 text-pink-400 border-pink-500/30',
];

interface StrategyViewTabProps {
  strategies: EnhancedStrategy[];
  tags: StrategyTag[];
  selectedStrategy: EnhancedStrategy | null;
  unsavedChanges: Record<string, string[]>;
  files: { name: string; group: string }[];
  onSelectStrategy: (s: EnhancedStrategy) => void;
  onToggleStar: (id: string) => void;
  onTogglePin: (id: string) => void;
  onDuplicate: (s: EnhancedStrategy) => void;
  onDelete: (id: string) => void;
  onEdit: (s: EnhancedStrategy) => void;
  onCreateNew: () => void;
  onAddTag: (name: string, color: string) => void;
}

// Strategy card as standalone component to avoid re-render issues
const StrategyCard = ({
  strategy,
  isSelected,
  tags,
  unsavedFiles,
  validationErrors,
  expandedId,
  onSelect,
  onToggleStar,
  onTogglePin,
  onDuplicate,
  onDelete,
  onEdit,
  onToggleExpand,
}: {
  strategy: EnhancedStrategy;
  isSelected: boolean;
  tags: StrategyTag[];
  unsavedFiles: string[];
  validationErrors: string[];
  expandedId: string | null;
  onSelect: () => void;
  onToggleStar: () => void;
  onTogglePin: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onToggleExpand: () => void;
}) => {
  const isExpanded = expandedId === strategy.id;
  const totalFiles = 1 + strategy.algorithmFiles.length + strategy.scoringFiles.length +
    strategy.policyFiles.length + (strategy.customFiles?.length || 0);
  const hasUnsaved = unsavedFiles.length > 0;
  const isValid = validationErrors.length === 0;

  return (
    <Card className={`border transition-colors ${isSelected ? 'border-cyan-500/50 bg-cyan-950/20' : 'hover:border-muted-foreground/30'}`}>
      <CardContent className="p-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 cursor-pointer" onClick={onSelect}>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="shrink-0 p-0.5 rounded hover:bg-muted/50"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onToggleStar(); }}
              >
                {strategy.starred
                  ? <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                  : <StarOff className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>
              {strategy.pinned && <Pin className="w-3 h-3 text-blue-400 shrink-0" />}
              <h3 className="font-medium text-sm truncate">{strategy.name}</h3>
              {hasUnsaved && (
                <Badge className="text-[9px] h-4 bg-amber-500/20 text-amber-400 border-amber-500/30 shrink-0">
                  Unsaved
                </Badge>
              )}
              {!isValid && <AlertCircle className="w-3 h-3 text-destructive shrink-0" />}
            </div>
            {strategy.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{strategy.description}</p>
            )}
          </div>

          {/* Three-dot menu */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="shrink-0 p-1 rounded hover:bg-muted/50"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onSelect={() => onEdit()}>
                <Edit className="w-3 h-3 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onDuplicate()}>
                <Copy className="w-3 h-3 mr-2" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onTogglePin()}>
                {strategy.pinned ? <PinOff className="w-3 h-3 mr-2" /> : <Pin className="w-3 h-3 mr-2" />}
                {strategy.pinned ? 'Unpin' : 'Pin'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onSelect={() => onDelete()}>
                <Trash2 className="w-3 h-3 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tags */}
        {strategy.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {strategy.tags.map(tagId => {
              const tag = tags.find(t => t.id === tagId);
              return tag ? (
                <Badge key={tagId} className={`text-[9px] h-4 ${tag.color}`}>{tag.name}</Badge>
              ) : null;
            })}
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileCode className="w-3 h-3" /> {totalFiles} files
          </span>
          {strategy.runCount > 0 && (
            <>
              <Separator orientation="vertical" className="h-3" />
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3" /> {strategy.runCount} runs
              </span>
              {strategy.avgScore !== undefined && (
                <>
                  <Separator orientation="vertical" className="h-3" />
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> {strategy.avgScore.toFixed(1)}
                  </span>
                </>
              )}
            </>
          )}
        </div>

        {/* Show/hide details button */}
        <button
          type="button"
          className="w-full mt-2 h-7 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded transition-colors"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
        >
          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {isExpanded ? 'Hide details' : 'Show details'}
        </button>

        {/* Expanded details */}
        {isExpanded && (
          <div className="mt-2 space-y-2 animate-in fade-in-0 slide-in-from-top-1 duration-200">
            <DetailBlock icon={<Clock className="w-3 h-3 text-blue-400" />} label="Scheduler" color="blue">
              <p className="text-xs ml-5 mt-1">{strategy.schedulerFile}</p>
            </DetailBlock>

            {strategy.algorithmFiles.length > 0 && (
              <DetailBlock icon={<Code className="w-3 h-3 text-cyan-400" />} label={`Algorithms (${strategy.algorithmFiles.length})`} color="cyan">
                {strategy.algorithmFiles.map(f => <p key={f} className="text-xs ml-5">{f}</p>)}
              </DetailBlock>
            )}

            {strategy.scoringFiles.length > 0 && (
              <DetailBlock icon={<Calculator className="w-3 h-3 text-amber-400" />} label={`Scoring (${strategy.scoringFiles.length})`} color="amber">
                {strategy.scoringFiles.map(f => <p key={f} className="text-xs ml-5">{f}</p>)}
              </DetailBlock>
            )}

            {strategy.policyFiles.length > 0 && (
              <DetailBlock icon={<Shield className="w-3 h-3 text-emerald-400" />} label={`Policies (${strategy.policyFiles.length})`} color="emerald">
                {strategy.policyFiles.map(f => <p key={f} className="text-xs ml-5">{f}</p>)}
              </DetailBlock>
            )}

            {strategy.customFiles?.length > 0 && (
              <DetailBlock icon={<Puzzle className="w-3 h-3 text-purple-400" />} label={`Custom (${strategy.customFiles.length})`} color="purple">
                {strategy.customFiles.map(f => <p key={f} className="text-xs ml-5">{f}</p>)}
              </DetailBlock>
            )}

            {strategy.lastRun && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Last run: {new Date(strategy.lastRun).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const DETAIL_COLORS: Record<string, string> = {
  blue: 'bg-blue-500/10 border-blue-500/20 [&_.detail-label]:text-blue-400',
  cyan: 'bg-cyan-500/10 border-cyan-500/20 [&_.detail-label]:text-cyan-400',
  amber: 'bg-amber-500/10 border-amber-500/20 [&_.detail-label]:text-amber-400',
  emerald: 'bg-emerald-500/10 border-emerald-500/20 [&_.detail-label]:text-emerald-400',
  purple: 'bg-purple-500/10 border-purple-500/20 [&_.detail-label]:text-purple-400',
};

const DetailBlock = ({ icon, label, color, children }: { icon: React.ReactNode; label: string; color: string; children: React.ReactNode }) => (
  <div className={`p-2 rounded border ${DETAIL_COLORS[color] || DETAIL_COLORS.blue}`}>
    <div className="flex items-center gap-2 text-xs">
      {icon}
      <span className="detail-label font-medium">{label}</span>
    </div>
    {children}
  </div>
);

export const StrategyViewTab = ({
  strategies,
  tags,
  selectedStrategy,
  unsavedChanges,
  files,
  onSelectStrategy,
  onToggleStar,
  onTogglePin,
  onDuplicate,
  onDelete,
  onEdit,
  onCreateNew,
  onAddTag,
}: StrategyViewTabProps) => {
  const [strategySearch, setStrategySearch] = useState('');
  const [viewFilter, setViewFilter] = useState<'all' | 'starred' | 'pinned' | 'recent'>('all');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [expandedStrategy, setExpandedStrategy] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'recent' | 'score' | 'runs'>('name');
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);

  const validateStrategy = useCallback((strategy: EnhancedStrategy): string[] => {
    const errors: string[] = [];
    if (!files.find(f => f.name === strategy.schedulerFile)) errors.push(`Scheduler "${strategy.schedulerFile}" not found`);
    strategy.algorithmFiles.forEach(name => { if (!files.find(f => f.name === name)) errors.push(`Algorithm "${name}" not found`); });
    strategy.scoringFiles.forEach(name => { if (!files.find(f => f.name === name)) errors.push(`Scoring "${name}" not found`); });
    strategy.policyFiles.forEach(name => { if (!files.find(f => f.name === name)) errors.push(`Policy "${name}" not found`); });
    (strategy.customFiles || []).forEach(name => { if (!files.find(f => f.name === name)) errors.push(`Custom "${name}" not found`); });
    return errors;
  }, [files]);

  const filteredStrategies = useMemo(() => {
    let result = strategies.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(strategySearch.toLowerCase()) ||
        s.description?.toLowerCase().includes(strategySearch.toLowerCase());
      const matchesView = viewFilter === 'all' ||
        (viewFilter === 'starred' && s.starred) ||
        (viewFilter === 'pinned' && !!s.pinned) ||
        (viewFilter === 'recent' && s.lastRun && Date.now() - s.lastRun < 7 * 24 * 60 * 60 * 1000);
      const matchesTag = !tagFilter || s.tags.includes(tagFilter);
      return matchesSearch && matchesView && matchesTag;
    });

    // Sort pinned first, then by chosen sort
    result.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      switch (sortBy) {
        case 'recent': return (b.lastRun || b.createdAt) - (a.lastRun || a.createdAt);
        case 'score': return (b.avgScore || 0) - (a.avgScore || 0);
        case 'runs': return b.runCount - a.runCount;
        default: return a.name.localeCompare(b.name);
      }
    });

    return result;
  }, [strategies, strategySearch, viewFilter, tagFilter, sortBy]);

  const handleAddTag = () => {
    if (!newTagName.trim()) return;
    onAddTag(newTagName, newTagColor);
    setNewTagName('');
    setShowTagDialog(false);
  };

  return (
    <div className="h-full flex flex-col gap-3 p-3">
      {/* Filters Row */}
      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={strategySearch}
            onChange={(e) => setStrategySearch(e.target.value)}
            placeholder="Search strategies..."
            className="pl-8 h-8 text-sm"
          />
        </div>

        <Select value={viewFilter} onValueChange={(v: any) => setViewFilter(v)}>
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="starred">⭐ Starred</SelectItem>
            <SelectItem value="pinned">📌 Pinned</SelectItem>
            <SelectItem value="recent">🕐 Recent</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="score">Top Score</SelectItem>
            <SelectItem value="runs">Most Runs</SelectItem>
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs">
              <Tag className="w-3 h-3 mr-1" />
              Tags
              {tagFilter && <Badge className="ml-1 text-[9px] h-4">1</Badge>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setTagFilter(null)}>
              <Check className={`w-3 h-3 mr-2 ${!tagFilter ? '' : 'invisible'}`} />
              All Tags
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {tags.map(tag => (
              <DropdownMenuItem key={tag.id} onClick={() => setTagFilter(tagFilter === tag.id ? null : tag.id)}>
                <Check className={`w-3 h-3 mr-2 ${tagFilter === tag.id ? '' : 'invisible'}`} />
                <Badge className={`${tag.color} text-[10px]`}>{tag.name}</Badge>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowTagDialog(true)}>
              <Plus className="w-3 h-3 mr-2" /> Create Tag
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Strategy Count */}
      <div className="flex items-center justify-between flex-shrink-0">
        <p className="text-xs text-muted-foreground">
          {filteredStrategies.length} of {strategies.length} strategies
        </p>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onCreateNew}>
          <Plus className="w-3 h-3 mr-1" /> New
        </Button>
      </div>

      {/* Strategy List */}
      <ScrollArea className="flex-1">
        <div className="space-y-2 pr-2">
          {filteredStrategies.map(strategy => (
            <StrategyCard
              key={strategy.id}
              strategy={strategy}
              isSelected={selectedStrategy?.id === strategy.id}
              tags={tags}
              unsavedFiles={unsavedChanges[strategy.id] || []}
              validationErrors={validateStrategy(strategy)}
              expandedId={expandedStrategy}
              onSelect={() => onSelectStrategy(strategy)}
              onToggleStar={() => onToggleStar(strategy.id)}
              onTogglePin={() => onTogglePin(strategy.id)}
              onDuplicate={() => onDuplicate(strategy)}
              onDelete={() => onDelete(strategy.id)}
              onEdit={() => onEdit(strategy)}
              onToggleExpand={() => setExpandedStrategy(expandedStrategy === strategy.id ? null : strategy.id)}
            />
          ))}
          {filteredStrategies.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground">No strategies found</p>
              <Button variant="outline" className="mt-4" onClick={onCreateNew}>
                <Plus className="w-4 h-4 mr-2" /> Create Strategy
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Tag Dialog */}
      <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Tag name"
              onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
            />
            <div className="flex flex-wrap gap-1">
              {TAG_COLORS.map((color, i) => (
                <button
                  key={i}
                  className={`w-6 h-6 rounded ${color} ${newTagColor === color ? 'ring-2 ring-white' : ''}`}
                  onClick={() => setNewTagColor(color)}
                />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddTag} disabled={!newTagName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
