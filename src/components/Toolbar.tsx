import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import {
  FileUp,
  Save,
  Download,
  Sparkles,
  Undo,
  Redo,
  Search,
  Navigation,
  ArrowLeftRight,
  Edit,
  BarChart3,
  Music,
  Grid3x3,
  Layers,
  ChevronDown,
  Briefcase,
  FileText,
  Puzzle,
  Brain,
} from 'lucide-react';

export type AppMode = 'analysis' | 'algorithm' | 'backend' | 'player' | 'ai';

interface ToolbarProps {
  onLoad: () => void;
  onSave: () => void;
  onExport: () => void;
  onGenerate: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onJumpTo: () => void;
  onFind: () => void;
  onConvert: () => void;
  onToggleEdit: () => void;
  onDataGraphs: () => void;
  onAudioVisualizer: () => void;
  onPatternHeatmap: () => void;
  onJobs: () => void;
  onReports: () => void;
  onPlugins: () => void;
  canUndo: boolean;
  canRedo: boolean;
  editMode: boolean;
  currentMode: AppMode;
  onModeChange: (mode: AppMode) => void;
  pluginCount?: number;
}

export const Toolbar = ({
  onLoad, onSave, onExport, onGenerate,
  onUndo, onRedo, onJumpTo, onFind,
  onConvert, onToggleEdit,
  onDataGraphs, onAudioVisualizer, onPatternHeatmap,
  onJobs, onReports, onPlugins,
  canUndo, canRedo, editMode,
  currentMode, onModeChange, pluginCount = 0,
}: ToolbarProps) => {
  const modeLabels: Record<AppMode, string> = {
    analysis: 'Analysis',
    algorithm: 'Algorithm',
    backend: 'Backend',
    player: 'Player',
    ai: 'AI Mode',
  };

  return (
    <div className="flex items-center gap-1.5 p-1.5 bg-card border-b border-border overflow-x-auto">
      {/* File */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 text-xs">
            File <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-popover border border-border z-50">
          <DropdownMenuItem onClick={onLoad}><FileUp className="w-3.5 h-3.5 mr-2" />Load</DropdownMenuItem>
          <DropdownMenuItem onClick={onSave}><Save className="w-3.5 h-3.5 mr-2" />Save</DropdownMenuItem>
          <DropdownMenuItem onClick={onExport}><Download className="w-3.5 h-3.5 mr-2" />Export</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="h-5" />

      {/* Edit */}
      <div className="flex items-center gap-0.5">
        <Button onClick={onUndo} variant="ghost" size="sm" disabled={!canUndo} title="Undo (Ctrl+Z)" className="h-7 w-7 p-0">
          <Undo className="w-3.5 h-3.5" />
        </Button>
        <Button onClick={onRedo} variant="ghost" size="sm" disabled={!canRedo} title="Redo (Ctrl+Y)" className="h-7 w-7 p-0">
          <Redo className="w-3.5 h-3.5" />
        </Button>
        <Button onClick={onToggleEdit} variant={editMode ? "default" : "ghost"} size="sm" title="Toggle Edit (E)" className="h-7 text-xs px-2">
          <Edit className="w-3.5 h-3.5 mr-1" />Edit
        </Button>
      </div>

      <Separator orientation="vertical" className="h-5" />

      {/* Navigate */}
      <div className="flex items-center gap-0.5">
        <Button onClick={onJumpTo} variant="ghost" size="sm" className="h-7 text-xs px-2">
          <Navigation className="w-3.5 h-3.5 mr-1" />Jump
        </Button>
        <Button onClick={onFind} variant="ghost" size="sm" className="h-7 text-xs px-2">
          <Search className="w-3.5 h-3.5 mr-1" />Find
        </Button>
      </div>

      <Separator orientation="vertical" className="h-5" />

      {/* Tools */}
      <div className="flex items-center gap-0.5">
        <Button onClick={onGenerate} variant="ghost" size="sm" className="h-7 text-xs px-2">
          <Sparkles className="w-3.5 h-3.5 mr-1" />Generate
        </Button>
        <Button onClick={onConvert} variant="ghost" size="sm" className="h-7 text-xs px-2">
          <ArrowLeftRight className="w-3.5 h-3.5 mr-1" />Convert
        </Button>
      </div>

      <Separator orientation="vertical" className="h-5" />

      {/* View */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 text-xs">
            View <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-popover border border-border z-50">
          <DropdownMenuItem onClick={onDataGraphs}><BarChart3 className="w-3.5 h-3.5 mr-2" />Graphs</DropdownMenuItem>
          <DropdownMenuItem onClick={onAudioVisualizer}><Music className="w-3.5 h-3.5 mr-2" />Audio</DropdownMenuItem>
          <DropdownMenuItem onClick={onPatternHeatmap}><Grid3x3 className="w-3.5 h-3.5 mr-2" />Heatmap</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="h-5" />

      {/* System */}
      <div className="flex items-center gap-0.5">
        <Button onClick={onReports} variant="ghost" size="sm" className="h-7 text-xs px-2">
          <FileText className="w-3.5 h-3.5 mr-1" />Reports
        </Button>
        <Button onClick={onPlugins} variant="ghost" size="sm" className="h-7 text-xs px-2 relative">
          <Puzzle className="w-3.5 h-3.5 mr-1" />Plugins
          {pluginCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[9px] bg-primary text-primary-foreground">
              {pluginCount}
            </Badge>
          )}
        </Button>
        <Button onClick={onJobs} variant="ghost" size="sm" className="h-7 text-xs px-2">
          <Briefcase className="w-3.5 h-3.5 mr-1" />Jobs
        </Button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Mode Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 text-xs">
            <Layers className="w-3.5 h-3.5 mr-1" />
            {modeLabels[currentMode]}
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-popover border border-border z-50">
          <DropdownMenuItem onClick={() => onModeChange('analysis')} className={currentMode === 'analysis' ? 'bg-accent' : ''}>
            Analysis Mode
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onModeChange('algorithm')} className={currentMode === 'algorithm' ? 'bg-accent' : ''}>
            Algorithm Mode
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onModeChange('backend')} className={currentMode === 'backend' ? 'bg-accent' : ''}>
            Backend Mode
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onModeChange('player')} className={currentMode === 'player' ? 'bg-accent' : ''}>
            File Player
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onModeChange('ai')} className={currentMode === 'ai' ? 'bg-accent' : ''}>
            <Brain className="w-3.5 h-3.5 mr-2" />
            AI Mode
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
