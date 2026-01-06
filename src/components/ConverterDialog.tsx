import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { FileSystemManager } from '@/lib/fileSystemManager';
import { BinaryModel } from '@/lib/binaryModel';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';

interface ConverterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConvert: (bits: string, type: 'text-to-binary' | 'binary-to-text' | 'file-to-binary') => void;
}

export const ConverterDialog = ({
  open,
  onOpenChange,
  onConvert,
}: ConverterDialogProps) => {
  const [text, setText] = useState('');
  const [binary, setBinary] = useState('');

  const handleTextToBinary = () => {
    if (!text.trim()) {
      toast.error('Please enter text to convert');
      return;
    }

    const bits = FileSystemManager.textToBinary(text);
    onConvert(bits, 'text-to-binary');
    toast.success(`Converted ${text.length} characters to ${bits.length} bits`);
    setText('');
    onOpenChange(false);
  };

  const handleBinaryToText = () => {
    if (!binary.trim()) {
      toast.error('Please enter binary to convert');
      return;
    }

    const cleanBinary = binary.replace(/[^01]/g, '');
    if (cleanBinary.length === 0) {
      toast.error('No valid binary data found');
      return;
    }

    onConvert(cleanBinary, 'binary-to-text');
    toast.success(`Converted ${cleanBinary.length} bits to text`);
    setBinary('');
    onOpenChange(false);
  };

  const handleFileUpload = async () => {
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
          toast.error('File is empty or could not be read');
          return;
        }

        onConvert(bits, 'file-to-binary');
        toast.success(`Loaded ${bits.length} bits from ${file.name} (${(bits.length / 8 / 1024).toFixed(2)} KB)`);
        onOpenChange(false);
      } catch (error) {
        toast.error('Failed to load file');
      }
    };
    
    input.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Convert Between Formats</DialogTitle>
          <DialogDescription>
            Convert text to binary, binary to text, or upload any file as binary
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="text-to-binary" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="text-to-binary">Text → Binary</TabsTrigger>
            <TabsTrigger value="binary-to-text">Binary → Text</TabsTrigger>
            <TabsTrigger value="file-to-binary">File → Binary</TabsTrigger>
          </TabsList>

          <TabsContent value="text-to-binary" className="space-y-4">
            <div className="space-y-2">
              <Label>Enter Text</Label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type your text here..."
                className="min-h-[200px]"
              />
            </div>
            <Button onClick={handleTextToBinary} className="w-full">
              Convert to Binary
            </Button>
          </TabsContent>

          <TabsContent value="binary-to-text" className="space-y-4">
            <div className="space-y-2">
              <Label>Enter Binary (0s and 1s)</Label>
              <Textarea
                value={binary}
                onChange={(e) => setBinary(e.target.value)}
                placeholder="10101010 11110000 01010101..."
                className="min-h-[200px] font-mono"
              />
            </div>
            <Button onClick={handleBinaryToText} className="w-full">
              Convert to Text
            </Button>
          </TabsContent>

          <TabsContent value="file-to-binary" className="space-y-4">
            <div className="space-y-2">
              <Label>Upload Any File</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4">
                  Upload any file to convert it to binary format
                </p>
                <Button onClick={handleFileUpload} variant="outline">
                  Choose File
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                All file types supported. Each byte will be converted to 8 bits.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
