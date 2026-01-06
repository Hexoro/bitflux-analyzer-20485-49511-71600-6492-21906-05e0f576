/**
 * Code File Editor - View and edit metrics/operations JSON files
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileJson,
  Save,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { predefinedManager, PredefinedMetric, PredefinedOperation } from '@/lib/predefinedManager';

type EditorMode = 'metrics' | 'operations';

interface CodeFileEditorProps {
  mode: EditorMode;
}

export const CodeFileEditor = ({ mode }: CodeFileEditorProps) => {
  const [code, setCode] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [, forceUpdate] = useState({});

  // Generate current JSON from predefined manager
  const generateJSON = () => {
    if (mode === 'metrics') {
      const metrics = predefinedManager.getAllMetrics();
      return JSON.stringify({ metrics }, null, 2);
    } else {
      const operations = predefinedManager.getAllOperations();
      return JSON.stringify({ operations }, null, 2);
    }
  };

  // Load initial content
  useEffect(() => {
    setCode(generateJSON());
    setHasChanges(false);
    
    const unsubscribe = predefinedManager.subscribe(() => {
      if (!hasChanges) {
        setCode(generateJSON());
      }
      forceUpdate({});
    });
    
    return unsubscribe;
  }, [mode]);

  // Validate JSON on change
  useEffect(() => {
    try {
      const parsed = JSON.parse(code);
      
      if (mode === 'metrics') {
        if (!parsed.metrics || !Array.isArray(parsed.metrics)) {
          throw new Error('JSON must contain a "metrics" array');
        }
        // Validate metric structure
        for (const m of parsed.metrics) {
          if (!m.id || !m.name || !m.formula) {
            throw new Error(`Metric "${m.id || 'unknown'}" missing required fields (id, name, formula)`);
          }
        }
      } else {
        if (!parsed.operations || !Array.isArray(parsed.operations)) {
          throw new Error('JSON must contain an "operations" array');
        }
        // Validate operation structure
        for (const op of parsed.operations) {
          if (!op.id || !op.name) {
            throw new Error(`Operation "${op.id || 'unknown'}" missing required fields (id, name)`);
          }
        }
      }
      
      setIsValid(true);
      setError('');
    } catch (e) {
      setIsValid(false);
      setError(e instanceof Error ? e.message : 'Invalid JSON');
    }
  }, [code, mode]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!isValid) {
      toast.error('Fix validation errors before saving');
      return;
    }

    try {
      const parsed = JSON.parse(code);

      if (mode === 'metrics') {
        // Clear existing and add all from JSON
        const currentMetrics = predefinedManager.getAllMetrics();
        currentMetrics.forEach(m => predefinedManager.deleteMetric(m.id));
        
        parsed.metrics.forEach((m: PredefinedMetric) => {
          predefinedManager.addMetric(m);
        });
        
        toast.success(`Saved ${parsed.metrics.length} metrics`);
      } else {
        // Clear existing and add all from JSON
        const currentOps = predefinedManager.getAllOperations();
        currentOps.forEach(op => predefinedManager.deleteOperation(op.id));
        
        parsed.operations.forEach((op: PredefinedOperation) => {
          predefinedManager.addOperation(op);
        });
        
        toast.success(`Saved ${parsed.operations.length} operations`);
      }

      setHasChanges(false);
    } catch (e) {
      toast.error('Failed to save: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };

  const handleRefresh = () => {
    setCode(generateJSON());
    setHasChanges(false);
    toast.info('Refreshed from current data');
  };

  const handleDownload = () => {
    const filename = mode === 'metrics' ? 'metrics.json' : 'operations.json';
    const blob = new Blob([code], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  };

  const itemCount = (() => {
    try {
      const parsed = JSON.parse(code);
      return mode === 'metrics' ? parsed.metrics?.length || 0 : parsed.operations?.length || 0;
    } catch {
      return 0;
    }
  })();

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <FileJson className="w-4 h-4" />
            {mode === 'metrics' ? 'Metrics' : 'Operations'} JSON Editor
            <Badge variant="outline">{itemCount} items</Badge>
            {hasChanges && (
              <Badge variant="secondary" className="text-yellow-600">
                Unsaved
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isValid ? (
              <Badge className="bg-green-500/20 text-green-500">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Valid
              </Badge>
            ) : (
              <Badge variant="destructive">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Invalid
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-2">
        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleSave} disabled={!isValid || !hasChanges}>
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-1" />
            Download
          </Button>
        </div>

        {/* Error display */}
        {!isValid && error && (
          <div className="p-2 bg-destructive/10 border border-destructive/30 rounded text-xs text-destructive">
            {error}
          </div>
        )}

        {/* Code editor */}
        <Textarea
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          className="flex-1 font-mono text-xs min-h-[300px] resize-none"
          spellCheck={false}
        />

        {/* Schema hint */}
        <div className="p-2 bg-muted/30 rounded text-xs text-muted-foreground">
          <p className="font-medium mb-1">
            {mode === 'metrics' ? 'Metric Schema:' : 'Operation Schema:'}
          </p>
          {mode === 'metrics' ? (
            <code className="block whitespace-pre">
{`{
  "metrics": [{
    "id": "string (required)",
    "name": "string (required)", 
    "description": "string",
    "formula": "string (required)",
    "unit": "string",
    "category": "string"
  }]
}`}
            </code>
          ) : (
            <code className="block whitespace-pre">
{`{
  "operations": [{
    "id": "string (required)",
    "name": "string (required)",
    "description": "string",
    "parameters": [{"name": "string", "type": "string", "description": "string"}],
    "category": "string"
  }]
}`}
            </code>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
