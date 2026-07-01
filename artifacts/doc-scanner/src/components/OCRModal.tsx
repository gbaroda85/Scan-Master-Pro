import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from './ui/dialog';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Copy, Check, Loader2 } from 'lucide-react';
import { runOCR } from '../lib/ocr';
import { useToast } from '../hooks/use-toast';

interface OCRModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
}

export function OCRModal({ open, onOpenChange, imageUrl }: OCRModalProps) {
  const [text, setText] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && status === 'idle' && imageUrl) {
      handleRunOCR();
    }
  }, [open, imageUrl, status]);

  useEffect(() => {
    if (!open) {
      // Reset when closed
      setTimeout(() => {
        setText('');
        setProgress(0);
        setStatus('idle');
        setCopied(false);
      }, 300);
    }
  }, [open]);

  const handleRunOCR = async () => {
    setStatus('running');
    setProgress(0);
    
    try {
      // Load image into canvas
      const img = new Image();
      img.src = imageUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not get canvas context");
      ctx.drawImage(img, 0, 0);
      
      const result = await runOCR(canvas, (pct) => setProgress(pct));
      setText(result);
      setStatus('done');
      
    } catch (err) {
      console.error(err);
      setStatus('error');
      toast({
        title: "OCR Failed",
        description: "Could not extract text from this image.",
        variant: "destructive"
      });
    }
  };

  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Extract Text (OCR)</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4 min-h-[300px]">
          {status === 'running' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <div className="w-full max-w-[200px] space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground">Recognizing text... {Math.round(progress)}%</p>
              </div>
            </div>
          )}
          
          {status === 'error' && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-destructive font-medium">Failed to extract text. Try again later.</p>
            </div>
          )}
          
          {status === 'done' && (
            <div className="flex-1 bg-muted/50 rounded-md border border-border p-4 overflow-y-auto font-mono text-sm whitespace-pre-wrap">
              {text || <span className="text-muted-foreground italic">No text found in this image.</span>}
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-center pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button 
            onClick={handleCopy} 
            disabled={status !== 'done' || !text}
            className="w-32"
          >
            {copied ? <><Check className="w-4 h-4 mr-2" /> Copied</> : <><Copy className="w-4 h-4 mr-2" /> Copy Text</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}