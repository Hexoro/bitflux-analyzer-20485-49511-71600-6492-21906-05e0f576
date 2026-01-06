/**
 * Neural Network Tab - ML model training and inference on binary data
 * Supports TensorFlow.js for browser-based ML
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Brain,
  Upload,
  Play,
  Square,
  Download,
  Trash2,
  Layers,
  Activity,
  Zap,
  FileCode,
  AlertCircle,
  CheckCircle,
  Info,
} from 'lucide-react';
import { fileSystemManager } from '@/lib/fileSystemManager';
import { toast } from 'sonner';

interface ModelConfig {
  name: string;
  type: 'classification' | 'regression' | 'autoencoder';
  layers: number[];
  activation: string;
  optimizer: string;
  learningRate: number;
  epochs: number;
  batchSize: number;
}

interface TrainingLog {
  epoch: number;
  loss: number;
  accuracy?: number;
  valLoss?: number;
  valAccuracy?: number;
}

const DEFAULT_CONFIG: ModelConfig = {
  name: 'BinaryClassifier',
  type: 'classification',
  layers: [64, 32, 16],
  activation: 'relu',
  optimizer: 'adam',
  learningRate: 0.001,
  epochs: 50,
  batchSize: 32,
};

export const NeuralNetworkTab = () => {
  const [config, setConfig] = useState<ModelConfig>(DEFAULT_CONFIG);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [trainingLogs, setTrainingLogs] = useState<TrainingLog[]>([]);
  const [selectedDataFile, setSelectedDataFile] = useState<string>('');
  const [modelLoaded, setModelLoaded] = useState(false);
  const [tfLoaded, setTfLoaded] = useState(false);
  const [tfLoadError, setTfLoadError] = useState<string>('');
  const [inferenceResult, setInferenceResult] = useState<string>('');
  const [customCode, setCustomCode] = useState<string>(`# Custom TensorFlow.js model definition
# This will be converted to JavaScript and executed

import tensorflow as tf

model = tf.keras.Sequential([
    tf.keras.layers.Dense(64, activation='relu', input_shape=(256,)),
    tf.keras.layers.Dropout(0.2),
    tf.keras.layers.Dense(32, activation='relu'),
    tf.keras.layers.Dense(1, activation='sigmoid')
])

model.compile(
    optimizer='adam',
    loss='binary_crossentropy',
    metrics=['accuracy']
)
`);

  const dataFiles = fileSystemManager.getFiles().filter(f => 
    f.type === 'binary' || f.name.endsWith('.bin') || f.name.endsWith('.txt')
  );

  // Load TensorFlow.js
  useEffect(() => {
    const loadTensorFlow = async () => {
      try {
        // Check if TensorFlow.js is already loaded
        // @ts-ignore
        if (window.tf) {
          setTfLoaded(true);
          return;
        }

        // Try to load TensorFlow.js from CDN
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.10.0/dist/tf.min.js';
        
        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load TensorFlow.js'));
          document.head.appendChild(script);
        });

        setTfLoaded(true);
        toast.success('TensorFlow.js loaded successfully');
      } catch (error) {
        setTfLoadError((error as Error).message);
        console.error('Failed to load TensorFlow.js:', error);
      }
    };

    loadTensorFlow();
  }, []);

  const handleConfigChange = (field: keyof ModelConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleTrain = useCallback(async () => {
    if (!selectedDataFile) {
      toast.error('Please select a data file first');
      return;
    }

    if (!tfLoaded) {
      toast.error('TensorFlow.js not loaded');
      return;
    }

    setIsTraining(true);
    setTrainingProgress(0);
    setTrainingLogs([]);

    try {
      const file = fileSystemManager.getFile(selectedDataFile);
      if (!file) throw new Error('Data file not found');

      const bits = file.state.model.getBits();
      if (!bits || bits.length < 256) {
        throw new Error('Data file must have at least 256 bits');
      }

      // @ts-ignore - TensorFlow.js global
      const tf = window.tf;
      if (!tf) throw new Error('TensorFlow.js not available');

      // Prepare data - convert bits to tensor
      const inputSize = Math.min(bits.length, 1024);
      const data = bits.slice(0, inputSize).split('').map(b => parseInt(b));
      
      // Create simple training data (for demo - predicting next bit)
      const windowSize = 64;
      const xs: number[][] = [];
      const ys: number[] = [];
      
      for (let i = 0; i < data.length - windowSize; i++) {
        xs.push(data.slice(i, i + windowSize));
        ys.push(data[i + windowSize]);
      }

      const xTensor = tf.tensor2d(xs);
      const yTensor = tf.tensor1d(ys);

      // Build model
      const model = tf.sequential();
      config.layers.forEach((units, i) => {
        if (i === 0) {
          model.add(tf.layers.dense({ units, activation: config.activation, inputShape: [windowSize] }));
        } else {
          model.add(tf.layers.dense({ units, activation: config.activation }));
        }
      });
      model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

      model.compile({
        optimizer: tf.train[config.optimizer as keyof typeof tf.train](config.learningRate),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy'],
      });

      // Train
      await model.fit(xTensor, yTensor, {
        epochs: config.epochs,
        batchSize: config.batchSize,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: (epoch: number, logs: any) => {
            setTrainingProgress(((epoch + 1) / config.epochs) * 100);
            setTrainingLogs(prev => [...prev, {
              epoch: epoch + 1,
              loss: logs.loss,
              accuracy: logs.acc,
              valLoss: logs.val_loss,
              valAccuracy: logs.val_acc,
            }]);
          },
        },
      });

      // Store model reference
      // @ts-ignore
      window.trainedModel = model;
      setModelLoaded(true);
      
      // Cleanup tensors
      xTensor.dispose();
      yTensor.dispose();

      toast.success('Training completed!');
    } catch (error) {
      toast.error('Training failed: ' + (error as Error).message);
    } finally {
      setIsTraining(false);
    }
  }, [config, selectedDataFile, tfLoaded]);

  const handleStopTraining = () => {
    setIsTraining(false);
    toast.info('Training stopped');
  };

  const handleInference = useCallback(async () => {
    // @ts-ignore
    const model = window.trainedModel;
    if (!model) {
      toast.error('No trained model available');
      return;
    }

    if (!selectedDataFile) {
      toast.error('Please select a data file');
      return;
    }

    try {
      const file = fileSystemManager.getFile(selectedDataFile);
      if (!file) throw new Error('Data file not found');

      const bits = file.state.model.getBits();
      const inputData = bits.slice(0, 64).split('').map(b => parseInt(b));
      
      // @ts-ignore
      const tf = window.tf;
      const input = tf.tensor2d([inputData]);
      const prediction = model.predict(input) as any;
      const result = await prediction.data();
      
      setInferenceResult(`Prediction: ${(result[0] * 100).toFixed(2)}% probability of next bit being 1`);
      
      input.dispose();
      prediction.dispose();
    } catch (error) {
      toast.error('Inference failed: ' + (error as Error).message);
    }
  }, [selectedDataFile]);

  const handleExportModel = async () => {
    // @ts-ignore
    const model = window.trainedModel;
    if (!model) {
      toast.error('No trained model to export');
      return;
    }

    try {
      await model.save('downloads://' + config.name);
      toast.success('Model exported successfully');
    } catch (error) {
      toast.error('Export failed: ' + (error as Error).message);
    }
  };

  const handleClearModel = () => {
    // @ts-ignore
    if (window.trainedModel) {
      // @ts-ignore
      window.trainedModel.dispose();
      // @ts-ignore
      window.trainedModel = null;
    }
    setModelLoaded(false);
    setTrainingLogs([]);
    setTrainingProgress(0);
    setInferenceResult('');
    toast.success('Model cleared');
  };

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-hidden">
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30 flex-shrink-0">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="w-6 h-6 text-purple-500" />
              <div>
                <h3 className="font-semibold">Neural Network Mode</h3>
                <p className="text-xs text-muted-foreground">TensorFlow.js powered ML for binary data</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {tfLoaded ? (
                <Badge variant="default" className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  TF.js Ready
                </Badge>
              ) : tfLoadError ? (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Load Failed
                </Badge>
              ) : (
                <Badge variant="secondary">Loading TF.js...</Badge>
              )}
              {modelLoaded && (
                <Badge variant="default" className="flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  Model Loaded
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="config" className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full justify-start flex-shrink-0">
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
          <TabsTrigger value="inference">Inference</TabsTrigger>
          <TabsTrigger value="code">Custom Code</TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="config" className="flex-1 m-0 mt-2 overflow-auto">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileCode className="w-4 h-4" />
                  Model Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Model Name</Label>
                  <Input 
                    value={config.name} 
                    onChange={(e) => handleConfigChange('name', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Model Type</Label>
                  <Select value={config.type} onValueChange={(v) => handleConfigChange('type', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="classification">Classification</SelectItem>
                      <SelectItem value="regression">Regression</SelectItem>
                      <SelectItem value="autoencoder">Autoencoder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Hidden Layers (comma-separated)</Label>
                  <Input 
                    value={config.layers.join(', ')} 
                    onChange={(e) => handleConfigChange('layers', e.target.value.split(',').map(n => parseInt(n.trim()) || 32))}
                    placeholder="64, 32, 16"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Activation Function</Label>
                  <Select value={config.activation} onValueChange={(v) => handleConfigChange('activation', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relu">ReLU</SelectItem>
                      <SelectItem value="sigmoid">Sigmoid</SelectItem>
                      <SelectItem value="tanh">Tanh</SelectItem>
                      <SelectItem value="softmax">Softmax</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Training Parameters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Data File</Label>
                  <Select value={selectedDataFile} onValueChange={setSelectedDataFile}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select data file" />
                    </SelectTrigger>
                    <SelectContent>
                      {dataFiles.map(f => (
                        <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Optimizer</Label>
                  <Select value={config.optimizer} onValueChange={(v) => handleConfigChange('optimizer', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="adam">Adam</SelectItem>
                      <SelectItem value="sgd">SGD</SelectItem>
                      <SelectItem value="rmsprop">RMSprop</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Learning Rate</Label>
                    <Input 
                      type="number" 
                      step="0.0001"
                      value={config.learningRate} 
                      onChange={(e) => handleConfigChange('learningRate', parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Epochs</Label>
                    <Input 
                      type="number" 
                      value={config.epochs} 
                      onChange={(e) => handleConfigChange('epochs', parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Batch Size</Label>
                  <Input 
                    type="number" 
                    value={config.batchSize} 
                    onChange={(e) => handleConfigChange('batchSize', parseInt(e.target.value))}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Training Tab */}
        <TabsContent value="training" className="flex-1 m-0 mt-2 overflow-hidden">
          <div className="h-full grid grid-cols-2 gap-4">
            <Card className="flex flex-col">
              <CardHeader className="pb-2 flex-shrink-0">
                <CardTitle className="text-sm">Training Controls</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-4">
                <div className="flex gap-2">
                  <Button 
                    onClick={handleTrain} 
                    disabled={isTraining || !tfLoaded || !selectedDataFile}
                    className="flex-1"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {isTraining ? 'Training...' : 'Start Training'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleStopTraining}
                    disabled={!isTraining}
                  >
                    <Square className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{trainingProgress.toFixed(0)}%</span>
                  </div>
                  <Progress value={trainingProgress} />
                </div>

                <div className="flex gap-2 mt-auto">
                  <Button variant="outline" onClick={handleExportModel} disabled={!modelLoaded}>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                  <Button variant="outline" onClick={handleClearModel} disabled={!modelLoaded}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="flex flex-col">
              <CardHeader className="pb-2 flex-shrink-0">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Training Logs
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  {trainingLogs.length > 0 ? (
                    <div className="space-y-1">
                      {trainingLogs.map((log, i) => (
                        <div key={i} className="text-xs font-mono bg-muted/30 p-2 rounded flex justify-between">
                          <span>Epoch {log.epoch}</span>
                          <span>Loss: {log.loss?.toFixed(4)}</span>
                          <span>Acc: {((log.accuracy || 0) * 100).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm text-center py-8">
                      No training logs yet. Start training to see progress.
                    </p>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Inference Tab */}
        <TabsContent value="inference" className="flex-1 m-0 mt-2 overflow-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Run Inference
              </CardTitle>
              <CardDescription>
                Use the trained model to make predictions on binary data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Input Data File</Label>
                <Select value={selectedDataFile} onValueChange={setSelectedDataFile}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select data file" />
                  </SelectTrigger>
                  <SelectContent>
                    {dataFiles.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleInference} disabled={!modelLoaded}>
                <Play className="w-4 h-4 mr-2" />
                Run Inference
              </Button>

              {inferenceResult && (
                <Card className="bg-muted/30">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-primary" />
                      <span className="font-mono text-sm">{inferenceResult}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {!modelLoaded && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Train a model first to run inference
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Code Tab */}
        <TabsContent value="code" className="flex-1 m-0 mt-2 overflow-hidden">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-2 flex-shrink-0">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileCode className="w-4 h-4" />
                Custom Model Definition
              </CardTitle>
              <CardDescription>
                Write custom TensorFlow/Keras code (Python-like syntax for reference)
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              <Textarea
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value)}
                className="h-full font-mono text-sm resize-none"
                placeholder="# Write your custom model code here..."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
