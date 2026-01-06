import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Play, Pause, Square, Volume2, Download, Repeat } from 'lucide-react';
import { AudioExporter } from '@/lib/audioExport';
import { useToast } from '@/hooks/use-toast';
import { BinaryAudioGenerator } from '@/lib/audioUtils';

interface AudioVisualizerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  binaryData: string;
}

type AudioMode = 'pcm' | 'rhythm' | 'frequency' | 'melody';
type VisualizerStyle = 'waveform' | 'bars' | 'circle' | 'particles' | 'spiral';

export const AudioVisualizerDialog = ({ open, onOpenChange, binaryData }: AudioVisualizerDialogProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const generatorRef = useRef<BinaryAudioGenerator | null>(null);
  const animationRef = useRef<number>();
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number }>>([]);
  const { toast } = useToast();

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([50]);
  const [playbackRate, setPlaybackRate] = useState([25]);
  const [audioMode, setAudioMode] = useState<AudioMode>('frequency');
  const [visualStyle, setVisualStyle] = useState<VisualizerStyle>('bars');
  const [showMirror, setShowMirror] = useState(false);
  const [colorCycle, setColorCycle] = useState(false);
  const [sensitivity, setSensitivity] = useState([100]);
  const [smoothing, setSmoothing] = useState([80]);
  const [barSpacing, setBarSpacing] = useState([2]);
  const [glowIntensity, setGlowIntensity] = useState([15]);
  const [progress, setProgress] = useState(0);
  const [isLooping, setIsLooping] = useState(false);

  // Initialize audio generator
  useEffect(() => {
    if (open && !generatorRef.current) {
      generatorRef.current = new BinaryAudioGenerator();
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (generatorRef.current) {
        generatorRef.current.cleanup();
        generatorRef.current = null;
      }
    };
  }, [open]);

  // Generate audio buffer when data or mode changes - auto refresh on data change
  useEffect(() => {
    if (!generatorRef.current || !open || !binaryData || binaryData.length === 0) {
      audioBufferRef.current = null;
      return;
    }
    
    // Stop current playback if data changes
    if (isPlaying) {
      generatorRef.current.stop();
      setIsPlaying(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
    
    try {
      const buffer = generatorRef.current.generateFromBinary(binaryData.slice(0, 50000), audioMode);
      audioBufferRef.current = buffer;
      setProgress(0);
    } catch (error) {
      console.error('Failed to generate audio buffer:', error);
      audioBufferRef.current = null;
    }
  }, [binaryData, audioMode, open]);

  // Start idle visualization when dialog opens
  useEffect(() => {
    if (!open || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateCanvasSize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    
    updateCanvasSize();
    
    // Draw idle state
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    
    // Draw center line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    
  }, [open]);

  const handlePlay = () => {
    if (!generatorRef.current || !audioBufferRef.current) return;
    if (generatorRef.current.getIsPlaying()) {
      generatorRef.current.resume(audioBufferRef.current, volume[0] / 100, playbackRate[0] / 100);
    } else {
      generatorRef.current.play(audioBufferRef.current, volume[0] / 100, playbackRate[0] / 100);
    }
    setIsPlaying(true);
    startVisualization();
  };

  const handlePause = () => {
    if (!generatorRef.current) return;
    generatorRef.current.pause();
    setIsPlaying(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const handleStop = () => {
    if (!generatorRef.current) return;
    generatorRef.current.stop();
    setIsPlaying(false);
    setProgress(0);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const handleSeek = (value: number[]) => {
    if (!generatorRef.current || !audioBufferRef.current) return;
    const duration = generatorRef.current.getDuration();
    const seekTime = (value[0] / 100) * duration;
    generatorRef.current.seek(audioBufferRef.current, seekTime, volume[0] / 100, playbackRate[0] / 100);
    setProgress(value[0]);
  };

  const handleExportWAV = async () => {
    if (!audioBufferRef.current) return;
    try {
      const blob = AudioExporter.toWAV(audioBufferRef.current);
      AudioExporter.downloadBlob(blob, 'binary-audio.wav');
      toast({ title: 'Success', description: 'Audio exported as WAV' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to export audio', variant: 'destructive' });
    }
  };

  const handleExportMP3 = async () => {
    if (!audioBufferRef.current) return;
    try {
      const blob = await AudioExporter.toMP3(audioBufferRef.current);
      AudioExporter.downloadBlob(blob, 'binary-audio.mp3');
      toast({ title: 'Success', description: 'Audio exported as MP3' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to export audio', variant: 'destructive' });
    }
  };

  const handleToggleLoop = () => {
    if (generatorRef.current) {
      const newLoopState = !isLooping;
      setIsLooping(newLoopState);
      generatorRef.current.setLoop(newLoopState);
    }
  };

  const startVisualization = () => {
    const canvas = canvasRef.current;
    const analyser = generatorRef.current?.getAnalyser();
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    analyser.smoothingTimeConstant = smoothing[0] / 100;

    const updateCanvasSize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    
    updateCanvasSize();

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let colorIndex = 0;
    const colors = ['#00FFFF', '#FF0000', '#C0C0C0', '#808080'];

  const draw = () => {
      if (!canvas || !ctx) return;

      // Update progress
      if (generatorRef.current) {
        const currentTime = generatorRef.current.getCurrentTime();
        const duration = generatorRef.current.getDuration();
        if (duration > 0) {
          const progressPercent = (currentTime / duration) * 100;
          setProgress(Math.min(progressPercent, 100));
          
          // Stop when reaching end (if not looping)
          if (progressPercent >= 99.9 && !generatorRef.current.getLoop()) {
            handleStop();
          }
        }
      }

      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;

      // Clear canvas differently based on visual style
      if (visualStyle === 'particles') {
        // Trail effect for particles
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, 0, width, height);
      } else {
        // Full clear for other styles
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
      }

      if (colorCycle) {
        colorIndex = (colorIndex + 0.01) % colors.length;
      }

      // Get appropriate data for visualization
      switch (visualStyle) {
        case 'waveform':
          drawWaveform(ctx, analyser, width, height, colors);
          break;
        case 'bars':
          analyser.getByteFrequencyData(dataArray);
          drawBars(ctx, dataArray, width, height, colors, colorIndex);
          break;
        case 'circle':
          analyser.getByteFrequencyData(dataArray);
          drawCircle(ctx, dataArray, width, height, colors, colorIndex);
          break;
        case 'particles':
          analyser.getByteFrequencyData(dataArray);
          drawParticles(ctx, dataArray, width, height, colors, colorIndex);
          break;
        case 'spiral':
          analyser.getByteFrequencyData(dataArray);
          drawSpiral(ctx, dataArray, width, height, colors, colorIndex);
          break;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

  const drawWaveform = (ctx: CanvasRenderingContext2D, analyser: AnalyserNode, width: number, height: number, colors: string[]) => {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    const sens = sensitivity[0] / 100;

    ctx.lineWidth = 2;
    ctx.shadowBlur = glowIntensity[0];

    const sliceWidth = width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = ((dataArray[i] / 128.0) - 1) * sens;
      const y = (v * height / 2) + (height / 2);

      const color = colors[Math.floor((i / bufferLength) * colors.length)];
      ctx.strokeStyle = color;
      ctx.shadowColor = color;

      ctx.beginPath();
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.moveTo(x - sliceWidth, height / 2);
        ctx.lineTo(x, y);
      }
      ctx.stroke();

      x += sliceWidth;
    }

    if (showMirror) {
      ctx.save();
      ctx.scale(1, -1);
      ctx.translate(0, -height);
      ctx.globalAlpha = 0.3;
      x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = ((dataArray[i] / 128.0) - 1) * sens;
        const y = (v * height / 2) + (height / 2);
        ctx.beginPath();
        ctx.moveTo(x - sliceWidth, height / 2);
        ctx.lineTo(x, y);
        ctx.stroke();
        x += sliceWidth;
      }
      ctx.restore();
    }
  };

  const drawBars = (ctx: CanvasRenderingContext2D, dataArray: Uint8Array, width: number, height: number, colors: string[], colorIndex: number) => {
    const barCount = Math.min(dataArray.length, 64);
    const barWidth = (width / barCount) - barSpacing[0];
    const sens = sensitivity[0] / 100;

    for (let i = 0; i < barCount; i++) {
      const barHeight = (dataArray[i] / 255) * height * sens;
      const x = i * (barWidth + barSpacing[0]);
      
      const color = colorCycle 
        ? colors[Math.floor((colorIndex + (i / barCount)) % colors.length)]
        : colors[i % colors.length];
      
      ctx.fillStyle = color;
      ctx.shadowBlur = glowIntensity[0];
      ctx.shadowColor = color;
      
      ctx.fillRect(x, height - barHeight, barWidth, barHeight);

      if (showMirror) {
        ctx.globalAlpha = 0.4;
        ctx.fillRect(x, 0, barWidth, barHeight);
        ctx.globalAlpha = 1;
      }
    }
  };

  const drawCircle = (ctx: CanvasRenderingContext2D, dataArray: Uint8Array, width: number, height: number, colors: string[], colorIndex: number) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 3;
    const barCount = Math.min(dataArray.length, 128);
    const sens = sensitivity[0] / 100;

    for (let i = 0; i < barCount; i++) {
      const angle = (i / barCount) * Math.PI * 2;
      const barLength = (dataArray[i] / 255) * radius * sens;
      
      const x1 = centerX + Math.cos(angle) * radius;
      const y1 = centerY + Math.sin(angle) * radius;
      const x2 = centerX + Math.cos(angle) * (radius + barLength);
      const y2 = centerY + Math.sin(angle) * (radius + barLength);

      const color = colorCycle 
        ? colors[Math.floor((colorIndex + (i / barCount)) % colors.length)]
        : colors[i % colors.length];
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowBlur = glowIntensity[0];
      ctx.shadowColor = color;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      if (showMirror) {
        const innerX = centerX + Math.cos(angle) * (radius - barLength);
        const innerY = centerY + Math.sin(angle) * (radius - barLength);
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(innerX, innerY);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  };

  const drawParticles = (ctx: CanvasRenderingContext2D, dataArray: Uint8Array, width: number, height: number, colors: string[], colorIndex: number) => {
    const sens = sensitivity[0] / 100;

    // Add new particles based on audio
    for (let i = 0; i < dataArray.length; i += 10) {
      const amplitude = (dataArray[i] / 255) * sens;
      if (amplitude > 0.3 && Math.random() > 0.7) {
        particlesRef.current.push({
          x: (i / dataArray.length) * width,
          y: height / 2,
          vx: (Math.random() - 0.5) * 5,
          vy: (Math.random() - 0.5) * 5 - amplitude * 5,
          life: 1,
        });
      }
    }

    // Update and draw particles
    particlesRef.current = particlesRef.current.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2; // gravity
      p.life -= 0.01;

      if (p.life <= 0) return false;

      const size = p.life * 6;
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      ctx.fillStyle = color;
      ctx.globalAlpha = p.life * 0.8;
      ctx.shadowBlur = glowIntensity[0];
      ctx.shadowColor = color;

      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      return true;
    });

    // Limit particles
    if (particlesRef.current.length > 500) {
      particlesRef.current = particlesRef.current.slice(-500);
    }
  };

  const drawSpiral = (ctx: CanvasRenderingContext2D, dataArray: Uint8Array, width: number, height: number, colors: string[], colorIndex: number) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const barCount = Math.min(dataArray.length, 128);
    const sens = sensitivity[0] / 100;

    ctx.beginPath();
    for (let i = 0; i < barCount; i++) {
      const angle = (i / barCount) * Math.PI * 8;
      const radius = (i / barCount) * Math.min(width, height) / 2;
      const amplitude = (dataArray[i] / 255) * 50 * sens;
      
      const x = centerX + Math.cos(angle) * (radius + amplitude);
      const y = centerY + Math.sin(angle) * (radius + amplitude);

      const color = colorCycle 
        ? colors[Math.floor((colorIndex + (i / barCount)) % colors.length)]
        : colors[i % colors.length];
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowBlur = glowIntensity[0];
      ctx.shadowColor = color;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  };

  useEffect(() => {
    if (generatorRef.current) {
      generatorRef.current.setVolume(volume[0] / 100);
    }
  }, [volume]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh]">
        <DialogHeader>
          <DialogTitle>Audio Visualizer & Generator</DialogTitle>
        </DialogHeader>

        {!binaryData || binaryData.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">No binary data available. Please load or generate data first.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-4">
            <div className="space-y-2">
              <canvas ref={canvasRef} className="w-full h-80 bg-black rounded border border-border" />
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span>{progress.toFixed(1)}%</span>
                </div>
                <Slider 
                  value={[progress]} 
                  onValueChange={handleSeek}
                  min={0} 
                  max={100} 
                  step={0.1}
                  className="cursor-pointer"
                />
              </div>
            </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Audio Generation Mode</Label>
              <Select value={audioMode} onValueChange={(v) => setAudioMode(v as AudioMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pcm">Direct PCM (Raw)</SelectItem>
                  <SelectItem value="rhythm">Binary Rhythm (Beats)</SelectItem>
                  <SelectItem value="frequency">Frequency Mapping</SelectItem>
                  <SelectItem value="melody">Partition Melody</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Visualizer Style</Label>
              <Select value={visualStyle} onValueChange={(v) => setVisualStyle(v as VisualizerStyle)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="waveform">Waveform (Oscilloscope)</SelectItem>
                  <SelectItem value="bars">Frequency Bars</SelectItem>
                  <SelectItem value="circle">Radial Spectrum</SelectItem>
                  <SelectItem value="particles">Particle System</SelectItem>
                  <SelectItem value="spiral">Spiral Galaxy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Switch id="mirror" checked={showMirror} onCheckedChange={setShowMirror} />
                <Label htmlFor="mirror" className="text-xs">Mirror Effect</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="color-cycle" checked={colorCycle} onCheckedChange={setColorCycle} />
                <Label htmlFor="color-cycle" className="text-xs">Color Cycling</Label>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                <Volume2 className="w-3 h-3" />
                Volume: {volume[0]}%
              </Label>
              <Slider value={volume} onValueChange={setVolume} min={0} max={100} step={1} />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                Playback Speed: {(playbackRate[0] / 100).toFixed(2)}x
              </Label>
              <Slider value={playbackRate} onValueChange={setPlaybackRate} min={10} max={200} step={5} />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                Visual Sensitivity: {sensitivity[0]}%
              </Label>
              <Slider value={sensitivity} onValueChange={setSensitivity} min={10} max={300} step={10} />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                Smoothing: {smoothing[0]}%
              </Label>
              <Slider value={smoothing} onValueChange={setSmoothing} min={0} max={95} step={5} />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                Bar Spacing: {barSpacing[0]}px
              </Label>
              <Slider value={barSpacing} onValueChange={setBarSpacing} min={0} max={10} step={1} />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                Glow Intensity: {glowIntensity[0]}
              </Label>
              <Slider value={glowIntensity} onValueChange={setGlowIntensity} min={0} max={40} step={5} />
            </div>
          </div>

          <div className="flex gap-2 justify-center pt-2 flex-wrap">
            <div className="flex gap-2">
              <Button onClick={handlePlay} disabled={isPlaying} size="lg">
                <Play className="w-4 h-4 mr-2" />
                Play
              </Button>
              <Button onClick={handlePause} disabled={!isPlaying} variant="outline" size="lg">
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </Button>
              <Button onClick={handleStop} variant="outline" size="lg">
                <Square className="w-4 h-4 mr-2" />
                Stop
              </Button>
              <Button 
                onClick={handleToggleLoop} 
                variant={isLooping ? "default" : "outline"} 
                size="lg"
              >
                <Repeat className="w-4 h-4 mr-2" />
                Loop
              </Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleExportWAV} variant="secondary" size="lg">
                <Download className="w-4 h-4 mr-2" />
                Export WAV
              </Button>
              <Button onClick={handleExportMP3} variant="secondary" size="lg">
                <Download className="w-4 h-4 mr-2" />
                Export MP3
              </Button>
            </div>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
