import { useMemo, useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { AlertCircle, Filter, Grid, List, Settings2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { anomaliesManager, AnomalyDefinition } from '@/lib/anomaliesManager';

interface Anomaly {
  id: string;
  type: string;
  position: number;
  length: number;
  sequence: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

interface AnomaliesPanelProps {
  bits: string;
  onJumpTo: (index: number) => void;
}

export const AnomaliesPanel = ({ bits, onJumpTo }: AnomaliesPanelProps) => {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [minLength, setMinLength] = useState<string>('');
  const [maxLength, setMaxLength] = useState<string>('');
  const [minPosition, setMinPosition] = useState<string>('');
  const [maxPosition, setMaxPosition] = useState<string>('');
  const [definitions, setDefinitions] = useState<AnomalyDefinition[]>([]);

  // Subscribe to anomaliesManager changes
  useEffect(() => {
    setDefinitions(anomaliesManager.getEnabledDefinitions());
    const unsubscribe = anomaliesManager.subscribe(() => {
      setDefinitions(anomaliesManager.getEnabledDefinitions());
    });
    return unsubscribe;
  }, []);

  // Use backend definitions only - no built-in fallback
  const anomalies = useMemo(() => {
    if (bits.length === 0) return [];
    
    const results: Anomaly[] = [];
    
    for (const def of definitions) {
      try {
        const detections = anomaliesManager.executeDetection(def.id, bits);
        for (let i = 0; i < detections.length; i++) {
          const detection = detections[i];
          results.push({
            id: `${def.id}-${detection.position}-${i}`,
            type: def.name,
            position: detection.position,
            length: detection.length,
            sequence: bits.substring(detection.position, Math.min(detection.position + 20, detection.position + detection.length)) + (detection.length > 20 ? '...' : ''),
            description: def.description,
            severity: def.severity,
          });
        }
      } catch (e) {
        console.error(`Failed to execute anomaly detection ${def.name}:`, e);
      }
    }
    
    return results.sort((a, b) => a.position - b.position);
  }, [bits, definitions]);
  
  const filteredAnomalies = useMemo(() => {
    return anomalies.filter(a => {
      if (typeFilter !== 'all' && a.type !== typeFilter) return false;
      if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
      
      // Length filters
      const minLen = parseInt(minLength);
      const maxLen = parseInt(maxLength);
      if (!isNaN(minLen) && a.length < minLen) return false;
      if (!isNaN(maxLen) && a.length > maxLen) return false;
      
      // Position filters
      const minPos = parseInt(minPosition);
      const maxPos = parseInt(maxPosition);
      if (!isNaN(minPos) && a.position < minPos) return false;
      if (!isNaN(maxPos) && a.position > maxPos) return false;
      
      return true;
    });
  }, [anomalies, typeFilter, severityFilter, minLength, maxLength, minPosition, maxPosition]);

  const summary = useMemo(() => {
    const types = anomalies.reduce((acc, a) => {
      acc[a.type] = (acc[a.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const severities = anomalies.reduce((acc, a) => {
      acc[a.severity] = (acc[a.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      total: anomalies.length,
      types,
      severities,
      avgLength: anomalies.length > 0 
        ? (anomalies.reduce((sum, a) => sum + a.length, 0) / anomalies.length).toFixed(2)
        : 0,
      totalAffectedBits: anomalies.reduce((sum, a) => sum + a.length, 0),
      coverage: bits.length > 0 
        ? ((anomalies.reduce((sum, a) => sum + a.length, 0) / bits.length) * 100).toFixed(2)
        : 0,
    };
  }, [anomalies, bits.length]);

  const uniqueTypes = useMemo(() => {
    return Array.from(new Set(anomalies.map(a => a.type)));
  }, [anomalies]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-blue-500';
      default: return 'text-muted-foreground';
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-500/10';
      case 'medium': return 'bg-yellow-500/10';
      case 'low': return 'bg-blue-500/10';
      default: return 'bg-secondary/30';
    }
  };
  
  const uniqueCategories = [...new Set(definitions.map(d => d.category))];
  const totalDefinitions = anomaliesManager.getAllDefinitions().length;

  return (
    <ScrollArea className="h-full p-4">
      <div className="space-y-4">
        {/* Summary Card */}
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-primary">Anomaly Detection Summary</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {definitions.length}/{totalDefinitions} active
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {uniqueCategories.length} categories
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm mb-3">
            <div>
              <div className="text-muted-foreground text-xs">Total</div>
              <div className="text-foreground font-semibold text-lg">{summary.total}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Affected Bits</div>
              <div className="text-foreground font-semibold">{summary.totalAffectedBits}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Coverage</div>
              <div className="text-foreground font-semibold">{summary.coverage}%</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
            <div>
              <div className="text-xs text-muted-foreground mb-2">By Severity:</div>
              <div className="space-y-1">
                {Object.entries(summary.severities).map(([severity, count]) => (
                  <div key={severity} className="flex justify-between text-xs">
                    <span className={getSeverityColor(severity)}>{severity.toUpperCase()}</span>
                    <span className="text-foreground font-mono">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <div className="text-xs text-muted-foreground mb-2">By Type:</div>
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {Object.entries(summary.types).slice(0, 3).map(([type, count]) => (
                  <div key={type} className="flex justify-between text-xs">
                    <span className="text-muted-foreground truncate">{type}</span>
                    <span className="text-foreground font-mono">{count}</span>
                  </div>
                ))}
                {Object.entries(summary.types).length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{Object.entries(summary.types).length - 3} more types
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Filters */}
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </h3>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={viewMode === 'cards' ? 'default' : 'outline'}
                onClick={() => setViewMode('cards')}
                className="h-7 px-2"
              >
                <Grid className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'table' ? 'default' : 'outline'}
                onClick={() => setViewMode('table')}
                className="h-7 px-2"
              >
                <List className="w-3 h-3" />
              </Button>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Type</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {uniqueTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Severity</label>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Min Len</label>
                <Input
                  type="number"
                  value={minLength}
                  onChange={e => setMinLength(e.target.value)}
                  className="h-8 text-xs"
                  placeholder="Min"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Max Len</label>
                <Input
                  type="number"
                  value={maxLength}
                  onChange={e => setMaxLength(e.target.value)}
                  className="h-8 text-xs"
                  placeholder="Max"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Min Pos</label>
                <Input
                  type="number"
                  value={minPosition}
                  onChange={e => setMinPosition(e.target.value)}
                  className="h-8 text-xs"
                  placeholder="Start"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Max Pos</label>
                <Input
                  type="number"
                  value={maxPosition}
                  onChange={e => setMaxPosition(e.target.value)}
                  className="h-8 text-xs"
                  placeholder="End"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* No data message */}
        {bits.length === 0 && (
          <Card className="p-8 bg-card border-border text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No binary data to analyze</p>
            <p className="text-xs text-muted-foreground mt-1">Load or generate data to detect anomalies</p>
          </Card>
        )}

        {/* No anomalies message */}
        {bits.length > 0 && anomalies.length === 0 && (
          <Card className="p-8 bg-card border-border text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
            <p className="text-foreground font-medium">No anomalies detected</p>
            <p className="text-xs text-muted-foreground mt-1">
              {definitions.length === 0 
                ? 'No detectors enabled. Enable detectors in Backend Mode → Anomalies tab.'
                : 'The binary data appears normal according to all active detectors.'}
            </p>
          </Card>
        )}

        {/* Results */}
        {filteredAnomalies.length > 0 && (
          <>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Showing {filteredAnomalies.length} of {anomalies.length} anomalies</span>
            </div>

            {viewMode === 'cards' ? (
              <div className="space-y-2">
                {filteredAnomalies.map(anomaly => (
                  <Card 
                    key={anomaly.id} 
                    className={`p-3 bg-card border-border hover:border-primary/50 cursor-pointer transition-colors ${getSeverityBg(anomaly.severity)}`}
                    onClick={() => onJumpTo(anomaly.position)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className={`w-4 h-4 ${getSeverityColor(anomaly.severity)}`} />
                        <span className="font-medium text-sm text-foreground">{anomaly.type}</span>
                      </div>
                      <span className={`text-xs font-semibold ${getSeverityColor(anomaly.severity)}`}>
                        {anomaly.severity.toUpperCase()}
                      </span>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-2">{anomaly.description}</p>
                    
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Position: </span>
                        <span className="font-mono text-foreground">{anomaly.position}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Length: </span>
                        <span className="font-mono text-foreground">{anomaly.length}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-primary cursor-pointer hover:underline">Jump →</span>
                      </div>
                    </div>
                    
                    <div className="mt-2 p-2 bg-background/50 rounded text-xs font-mono break-all">
                      {anomaly.sequence}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-card border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Type</TableHead>
                      <TableHead className="w-[80px]">Severity</TableHead>
                      <TableHead className="w-[80px]">Position</TableHead>
                      <TableHead className="w-[80px]">Length</TableHead>
                      <TableHead>Sequence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAnomalies.map(anomaly => (
                      <TableRow 
                        key={anomaly.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => onJumpTo(anomaly.position)}
                      >
                        <TableCell className="font-medium">{anomaly.type}</TableCell>
                        <TableCell>
                          <span className={`text-xs font-semibold ${getSeverityColor(anomaly.severity)}`}>
                            {anomaly.severity.toUpperCase()}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono">{anomaly.position}</TableCell>
                        <TableCell className="font-mono">{anomaly.length}</TableCell>
                        <TableCell className="font-mono text-xs max-w-[200px] truncate">
                          {anomaly.sequence}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </>
        )}
      </div>
    </ScrollArea>
  );
};
