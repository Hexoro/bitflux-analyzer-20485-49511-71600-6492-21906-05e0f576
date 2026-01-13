import React, { useState, useEffect, useCallback, useRef } from 'react';
import { fileSystemManager, BinaryFile } from '@/lib/fileSystemManager';
import { BinaryMetrics } from '@/lib/binaryMetrics';
import { BinaryModel } from '@/lib/binaryModel';
import { HistoryEntry } from '@/lib/historyManager';
import { BinaryViewer } from '@/components/BinaryViewer';
import { AnalysisPanel } from '@/components/AnalysisPanel';
import { SequencesPanel } from '@/components/SequencesPanel';
import { BoundariesPanel } from '@/components/BoundariesPanel';
import { PartitionsPanel } from '@/components/PartitionsPanel';
import { HistoryPanelNew } from '@/components/HistoryPanelNew';
import { TransformationsPanel } from '@/components/TransformationsPanel';
import { AnomaliesPanel } from '@/components/AnomaliesPanel';
import { NotesPanel } from '@/components/NotesPanel';
import { BitstreamAnalysisPanel } from '@/components/BitstreamAnalysisPanel';
import { ComparisonDialog } from '@/components/ComparisonDialog';
import { GenerateDialog } from '@/components/GenerateDialog';
import { JumpToDialog } from '@/components/JumpToDialog';
import { ConverterDialog } from '@/components/ConverterDialog';
import { FileSystemSidebar } from '@/components/FileSystemSidebar';
import { Toolbar, AppMode } from '@/components/Toolbar';
import { AlgorithmPanel } from '@/components/AlgorithmPanel';
import { BackendPanel } from '@/components/BackendPanel';
import { PlayerModePanel } from '@/components/PlayerModePanel';
import { DataGraphsDialog } from '@/components/DataGraphsDialog';
import { AudioVisualizerDialog } from '@/components/AudioVisualizerDialog';
import { PatternHeatmapDialog } from '@/components/PatternHeatmapDialog';
import { BitSelectionDialog } from '@/components/BitSelectionDialog';
import { JobsDialog } from '@/components/JobsDialog';
import { StartupTestSuite } from '@/components/StartupTestSuite';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { toast } from 'sonner';
import { BitRange } from '@/lib/fileState';

const Index = () => {
  // Test suite runs in background - no approval gate needed
  
  // Use the singleton fileSystemManager instead of creating new instance
  const fileSystem = fileSystemManager;
  const [, forceUpdate] = useState({});
  const [activeFile, setActiveFile] = useState<BinaryFile | null>(null);
  const [bitsPerRow] = useState(128);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [jumpDialogOpen, setJumpDialogOpen] = useState(false);
  const [converterDialogOpen, setConverterDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('analysis');
  const [compareFile, setCompareFile] = useState<{ bits: string; stats: any } | null>(null);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(true);
  const [historyGroups, setHistoryGroups] = useState<any[]>([]);
  const [graphsDialogOpen, setGraphsDialogOpen] = useState(false);
  const [audioDialogOpen, setAudioDialogOpen] = useState(false);
  const [heatmapDialogOpen, setHeatmapDialogOpen] = useState(false);
  const [jobsDialogOpen, setJobsDialogOpen] = useState(false);
  const [idealBitIndices, setIdealBitIndices] = useState<number[]>([]);
  const [appMode, setAppMode] = useState<AppMode>('analysis');
  const [isPlayerMode, setIsPlayerMode] = useState(false);
  const [playerResultId, setPlayerResultId] = useState<string | null>(null);
  const viewerRef = useRef<any>(null);
  const currentYear = new Date().getFullYear();

  // Subscribe to file system changes
  useEffect(() => {
    const updateActiveFile = () => {
      const file = fileSystem.getActiveFile();
      setActiveFile(file);
      if (file) {
        setHistoryGroups(file.state.getHistoryGroups());
      }
      forceUpdate({});
    };

    const unsubscribe = fileSystem.subscribe(updateActiveFile);
    updateActiveFile();
    
    return unsubscribe;
  }, [fileSystem]);

  // Subscribe to active file's state changes
  useEffect(() => {
    if (!activeFile) return;

    const unsubscribe = activeFile.state.subscribe(() => {
      setHistoryGroups(activeFile.state.getHistoryGroups());
      forceUpdate({});
    });

    return unsubscribe;
  }, [activeFile]);

  const handleLoadFile = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '*/*';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const arrayBuffer = await file.arrayBuffer();
        const bits = BinaryModel.fromBinaryFile(arrayBuffer);
        
        if (bits.length === 0) {
          toast.error('File contains no valid binary data');
          return;
        }

        fileSystem.createFile(file.name, bits, 'binary');
        toast.success(`Loaded ${bits.length} bits from ${file.name}`);
      } catch (error) {
        toast.error('Failed to load file');
      }
    };
    
    input.click();
  };

  const handleSaveFile = () => {
    if (!activeFile) return;
    
    const bits = activeFile.state.model.getBits();
    if (bits.length === 0) {
      toast.error('No data to save');
      return;
    }

    const blob = new Blob([bits], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.name;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('File saved');
  };

  const handleExportBinary = () => {
    if (!activeFile) return;
    
    const bits = activeFile.state.model.getBits();
    if (bits.length === 0) {
      toast.error('No data to export');
      return;
    }

    const bytes = BinaryModel.toBinaryFile(bits);
    const blob = new Blob([new Uint8Array(bytes)], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.name.replace(/\.[^/.]+$/, '.bin');
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Binary file exported');
  };

  const handleExportComplete = async () => {
    if (!activeFile) return;
    
    const bits = activeFile.state.model.getBits();
    const stats = activeFile.state.stats;
    const boundaries = activeFile.state.getBoundaries();
    const partitions = activeFile.state.getPartitions();
    const history = activeFile.state.historyManager.getEntries();
    
    // Create export package
    const exportData = {
      file: {
        name: activeFile.name,
        bits: bits,
        created: activeFile.created,
        modified: activeFile.modified,
      },
      analysis: stats,
      boundaries: boundaries.map(b => ({
        sequence: b.sequence,
        description: b.description,
        color: b.color,
        occurrences: b.positions.length,
        positions: b.positions,
      })),
      partitions: partitions.map(p => ({
        start: p.startIndex,
        end: p.endIndex,
        length: p.bits.length,
        stats: p.stats,
      })),
      history: history.map(h => ({
        timestamp: h.timestamp,
        description: h.description,
        stats: h.stats,
      })),
    };
    
    // Create zip-like structure (JSON for simplicity)
    const exportJson = JSON.stringify(exportData, null, 2);
    const blob = new Blob([exportJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeFile.name.replace(/\.[^/.]+$/, '')}_export.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    // Also export the binary file
    const bytes = BinaryModel.toBinaryFile(bits);
    const binBlob = new Blob([new Uint8Array(bytes)], { type: 'application/octet-stream' });
    const binUrl = URL.createObjectURL(binBlob);
    const binA = document.createElement('a');
    binA.href = binUrl;
    binA.download = activeFile.name.replace(/\.[^/.]+$/, '.bin');
    binA.click();
    URL.revokeObjectURL(binUrl);
    
    toast.success('Complete export package downloaded');
  };

  const handleGenerate = (bits: string) => {
    if (activeFile) {
      // Check if active file already has data - prevent accidental overwrite
      const existingBits = activeFile.state.model.getBits();
      if (existingBits && existingBits.length > 0) {
        toast.error('Cannot generate data in a file that already contains data. Create a new file instead.');
        return;
      }
      activeFile.state.model.loadBits(bits);
      activeFile.state.addToHistory(`Generated ${bits.length} bits`);
    } else {
      fileSystem.createFile(`generated_${Date.now()}.txt`, bits, 'binary');
    }
    toast.success(`Generated ${bits.length} bits`);
  };

  const handleConvert = (bits: string, type: 'text-to-binary' | 'binary-to-text' | 'file-to-binary') => {
    if (activeFile) {
      activeFile.state.model.loadBits(bits);
      activeFile.state.addToHistory(`Converted: ${type}`);
    } else {
      const fileName = type === 'text-to-binary' ? 'converted.txt' : 
                       type === 'binary-to-text' ? 'decoded.txt' : 'uploaded.bin';
      fileSystem.createFile(fileName, bits, 'binary');
    }
  };

  const handleJumpTo = (index: number) => {
    viewerRef.current?.jumpTo(index);
  };

  const handleAppendBoundary = (boundary: string, description: string, color: string) => {
    if (!activeFile) return;
    
    const newBits = activeFile.state.partitionManager.appendBoundaryToFile(
      activeFile.state.model.getBits(), 
      boundary
    );
    activeFile.state.model.loadBits(newBits);
    activeFile.state.partitionManager.addBoundary(boundary, description, color);
    activeFile.state.addToHistory(`Appended boundary: ${description}`);
    toast.success('Boundary appended');
  };

  const handleInsertBoundary = (boundary: string, description: string, color: string, position: number) => {
    if (!activeFile) return;
    
    const newBits = activeFile.state.partitionManager.insertBoundaryAt(
      activeFile.state.model.getBits(), 
      boundary, 
      position
    );
    activeFile.state.model.loadBits(newBits);
    activeFile.state.partitionManager.addBoundary(boundary, description, color);
    activeFile.state.addToHistory(`Inserted boundary at ${position}: ${description}`);
    toast.success('Boundary inserted');
  };

  const handleRemoveBoundary = (id: string) => {
    if (!activeFile) return;
    const boundary = activeFile.state.partitionManager.removeBoundary(id);
    if (boundary) {
      activeFile.state.addToHistory(`Deleted boundary: ${boundary.description}`);
    }
    forceUpdate({});
    toast.success('Boundary removed');
  };

  const handleToggleBoundaryHighlight = (id: string) => {
    if (!activeFile) return;
    const currentState = activeFile.state.partitionManager.isHighlightEnabled(id);
    activeFile.state.partitionManager.setHighlightEnabled(id, !currentState);
    forceUpdate({});
    toast.success(`Boundary highlight ${!currentState ? 'enabled' : 'disabled'}`);
  };

  const handleTransform = (newBits: string, description: string) => {
    if (!activeFile) return;
    activeFile.state.model.loadBits(newBits);
    activeFile.state.addToHistory(description);
    toast.success(description);
  };

  const handleRestoreVersion = (entry: HistoryEntry) => {
    if (!activeFile) return;
    activeFile.state.model.loadBits(entry.bits);
    toast.success(`Restored: ${entry.description}`);
  };

  const handleRestoreToNewFile = (entry: HistoryEntry) => {
    const timestamp = entry.timestamp.toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const fileName = `restored_${timestamp}_${entry.description.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}.txt`;
    fileSystem.createFile(fileName, entry.bits, 'binary');
    toast.success(`Created new file: ${fileName}`);
  };

  const handleCompareVersion = (entry: HistoryEntry) => {
    setCompareFile({
      bits: entry.bits,
      stats: BinaryMetrics.analyze(entry.bits),
    });
    setCompareDialogOpen(true);
  };

  const handleToggleHistoryGroup = (groupId: string) => {
    setHistoryGroups(prev => 
      prev.map(g => g.id === groupId ? { ...g, expanded: !g.expanded } : g)
    );
  };

  const handleApplySelection = (ranges: BitRange[]) => {
    if (!activeFile) return;
    activeFile.state.setSelectedRanges(ranges);
    if (ranges.length > 0) {
      const totalBits = ranges.reduce((sum, r) => sum + (r.end - r.start + 1), 0);
      toast.success(`Selected ${totalBits} bits in ${ranges.length} range${ranges.length !== 1 ? 's' : ''}`);
    } else {
      toast.info('Selection cleared');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeFile) return;
      
      // Check if we're focused on an input element
      const activeElement = document.activeElement;
      const isInputFocused = activeElement?.tagName === 'INPUT' || 
                            activeElement?.tagName === 'TEXTAREA' ||
                            activeElement?.hasAttribute('contenteditable');
      
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          if (activeFile.state.model.undo()) toast.success('Undo');
        } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          if (activeFile.state.model.redo()) toast.success('Redo');
        } else if (e.key === 's') {
          e.preventDefault();
          handleSaveFile();
        } else if (e.key === 'o') {
          e.preventDefault();
          handleLoadFile();
        }
      } else if (e.key === 'e' && !isInputFocused && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setEditMode(prev => !prev);
        toast.success(`Edit mode ${!editMode ? 'enabled' : 'disabled'}`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile, editMode]);

  // Tests run in background - no blocking gate

  if (!activeFile) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">No file loaded</p>
          <button onClick={handleLoadFile} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded">
            Load File
          </button>
        </div>
      </div>
    );
  }

  const bits = activeFile.state.model.getBits();
  const stats = activeFile.state.stats;
  const boundaries = activeFile.state.getBoundaries();
  const partitions = activeFile.state.getPartitions();
  const highlightRanges = activeFile.state.getHighlightRanges();
  const selectedRanges = activeFile.state.getSelectedRanges();

  const handleEnterPlayerMode = (resultId?: string) => {
    setPlayerResultId(resultId || null);
    setIsPlayerMode(true);
    setAppMode('player');
  };

  const handleExitPlayerMode = () => {
    setIsPlayerMode(false);
    setPlayerResultId(null);
    setAppMode('analysis');
  };

  // Handle mode change - check for player mode
  const handleModeChange = (mode: AppMode) => {
    if (mode === 'player') {
      handleEnterPlayerMode();
    } else {
      if (isPlayerMode) {
        handleExitPlayerMode();
      }
      setAppMode(mode);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      {/* Header - Thin single line with neon logo */}
      <div className="border-b border-border bg-background/80 backdrop-blur-sm animate-slide-in">
        <div className="flex items-center justify-center py-1.5 px-4">
          <div className="flex items-center gap-3">
            {/* Neon Logo */}
            <div className="relative">
              <div className="w-6 h-6 rounded border border-primary/60 bg-primary/10 flex items-center justify-center overflow-hidden">
                <span className="text-primary font-black text-xs neon-pulse">B</span>
              </div>
              <div className="absolute inset-0 rounded border border-primary/30 blur-sm" />
            </div>
            {/* Title - All in one line */}
            <div className="flex items-baseline gap-2">
              <h1 className="text-sm font-bold tracking-tight flex items-baseline" style={{ fontFamily: 'Outfit, sans-serif' }}>
                <span className="text-primary neon-text neon-pulse">BSEE</span>
                <span className="text-muted-foreground font-normal mx-2">—</span>
                <span className="text-foreground/90 font-medium">Binary Structural Exploration Engine</span>
              </h1>
            </div>
          </div>
        </div>
      </div>

      <Toolbar
        onLoad={handleLoadFile}
        onSave={handleSaveFile}
        onExport={handleExportComplete}
        onGenerate={() => setGenerateDialogOpen(true)}
        onUndo={() => activeFile.state.model.undo() && toast.success('Undo')}
        onRedo={() => activeFile.state.model.redo() && toast.success('Redo')}
        onJumpTo={() => setJumpDialogOpen(true)}
        onFind={() => setActiveTab('sequences')}
        onConvert={() => setConverterDialogOpen(true)}
        onToggleEdit={() => setEditMode(!editMode)}
        onDataGraphs={() => setGraphsDialogOpen(true)}
        onAudioVisualizer={() => setAudioDialogOpen(true)}
        onPatternHeatmap={() => setHeatmapDialogOpen(true)}
        onJobs={() => setJobsDialogOpen(true)}
        canUndo={(activeFile.state.model as any).undoStack?.length > 0}
        canRedo={(activeFile.state.model as any).redoStack?.length > 0}
        editMode={editMode}
        currentMode={appMode}
        onModeChange={handleModeChange}
      />

      {/* Main Content */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left Sidebar - File System */}
        <ResizablePanel defaultSize={15} minSize={10} maxSize={25}>
          <FileSystemSidebar />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Center - Binary Viewer */}
        <ResizablePanel defaultSize={45} minSize={30}>
          <BinaryViewer
            ref={viewerRef}
            model={activeFile.state.model}
            bitsPerRow={bitsPerRow}
            highlightRanges={highlightRanges}
            editMode={editMode}
            idealBitIndices={idealBitIndices}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel - Mode-dependent */}
        <ResizablePanel defaultSize={40} minSize={25}>
          {appMode === 'algorithm' ? (
            <AlgorithmPanel />
          ) : appMode === 'backend' ? (
            <BackendPanel />
          ) : appMode === 'player' ? (
            <PlayerModePanel 
              onExitPlayer={handleExitPlayerMode} 
              selectedResultId={playerResultId}
            />
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="w-full justify-start rounded-none border-b overflow-x-auto flex-shrink-0">
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
                <TabsTrigger value="sequences">Sequences</TabsTrigger>
                <TabsTrigger value="boundaries">Boundaries</TabsTrigger>
                <TabsTrigger value="partitions">Partitions</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
                <TabsTrigger value="transforms">Transforms</TabsTrigger>
                <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
                <TabsTrigger value="bitstream">Bitstream</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-hidden">
                <TabsContent value="analysis" className="h-full m-0">
                  <AnalysisPanel 
                    bits={bits} 
                    stats={stats}
                    bitsPerRow={bitsPerRow}
                    onJumpTo={handleJumpTo}
                    onIdealityChange={setIdealBitIndices}
                    partitions={partitions}
                    boundaries={boundaries}
                    history={historyGroups.flatMap(g => g.entries)}
                  />
                </TabsContent>

                <TabsContent value="sequences" className="h-full m-0">
                  <SequencesPanel fileState={activeFile.state} onJumpTo={handleJumpTo} />
                </TabsContent>

                <TabsContent value="boundaries" className="h-full m-0">
                  <BoundariesPanel
                    bits={bits}
                    stats={stats}
                    boundaries={boundaries}
                    partitionManager={activeFile.state.partitionManager}
                    onJumpTo={handleJumpTo}
                    onAppendBoundary={handleAppendBoundary}
                    onInsertBoundary={handleInsertBoundary}
                    onRemoveBoundary={handleRemoveBoundary}
                    onToggleHighlight={handleToggleBoundaryHighlight}
                  />
                </TabsContent>

                <TabsContent value="partitions" className="h-full m-0">
                  <PartitionsPanel partitions={partitions} onJumpTo={handleJumpTo} />
                </TabsContent>

                <TabsContent value="history" className="h-full m-0">
                  <HistoryPanelNew
                    groups={historyGroups}
                    onRestoreVersion={handleRestoreVersion}
                    onRestoreToNewFile={handleRestoreToNewFile}
                    onCompareVersion={handleCompareVersion}
                    onToggleGroup={handleToggleHistoryGroup}
                  />
                </TabsContent>

                <TabsContent value="transforms" className="h-full m-0">
                  <TransformationsPanel
                    bits={bits}
                    selectedRanges={selectedRanges}
                    onTransform={handleTransform}
                  />
                </TabsContent>

                <TabsContent value="anomalies" className="h-full m-0">
                  <AnomaliesPanel bits={bits} onJumpTo={handleJumpTo} />
                </TabsContent>

                <TabsContent value="bitstream" className="h-full m-0">
                  <BitstreamAnalysisPanel bits={bits} onJumpTo={handleJumpTo} />
                </TabsContent>

                <TabsContent value="notes" className="h-full m-0">
                  <NotesPanel notesManager={activeFile.state.notesManager} />
                </TabsContent>
              </div>
            </Tabs>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Footer */}
      <div className="border-t border-border bg-card/50 px-4 py-1.5 text-xs text-muted-foreground flex items-center justify-between">
        <span>
          {activeFile?.name} • {bits.length.toLocaleString()} bits • {Math.ceil(bits.length / 8).toLocaleString()} bytes
        </span>
        <div className="flex items-center gap-3">
          {/* Test Suite Button - runs in background */}
          <StartupTestSuite />
          <span>
            © {currentYear} BSEE • Binary Structural Exploration Engine
          </span>
        </div>
      </div>

      {/* Dialogs */}
      <GenerateDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        onGenerate={handleGenerate}
      />

      <JumpToDialog
        open={jumpDialogOpen}
        onOpenChange={setJumpDialogOpen}
        maxPosition={bits.length}
        onJump={handleJumpTo}
      />

      <ConverterDialog
        open={converterDialogOpen}
        onOpenChange={setConverterDialogOpen}
        onConvert={handleConvert}
      />

      {compareFile && (
        <ComparisonDialog
          open={compareDialogOpen}
          onOpenChange={setCompareDialogOpen}
          currentBits={bits}
          currentStats={stats}
          compareBits={compareFile.bits}
          compareStats={compareFile.stats}
        />
      )}

      <DataGraphsDialog
        open={graphsDialogOpen}
        onOpenChange={setGraphsDialogOpen}
        binaryData={bits}
        partitions={partitions}
      />

      <AudioVisualizerDialog
        open={audioDialogOpen}
        onOpenChange={setAudioDialogOpen}
        binaryData={bits}
      />

      <PatternHeatmapDialog
        open={heatmapDialogOpen}
        onOpenChange={setHeatmapDialogOpen}
        binaryData={bits}
      />

      <JobsDialog
        open={jobsDialogOpen}
        onOpenChange={setJobsDialogOpen}
      />
    </div>
  );
};

export default Index;
