import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Camera, Image as ImageIcon, Zap, ZapOff, RefreshCcw, X, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAppContext } from '../context/AppContext';
import { Corner, ScannedPage } from '../lib/types';
import { useToast } from '../hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

export default function Capture() {
  const [, setLocation] = useLocation();
  const { dispatch } = useAppContext();
  const { toast } = useToast();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [flash, setFlash] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);

  useEffect(() => {
    startCamera();
    return stopCamera;
  }, [facingMode]);

  const startCamera = async () => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setHasCamera(true);
    } catch (err) {
      console.error("Camera error:", err);
      setHasCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const toggleFlash = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    const capabilities = track.getCapabilities() as any;
    
    if (capabilities.torch) {
      try {
        await track.applyConstraints({
          advanced: [{ torch: !flash } as any]
        });
        setFlash(!flash);
      } catch (err) {
        console.error("Flash error:", err);
      }
    } else {
      toast({ title: "Flash not supported on this device", variant: "destructive" });
    }
  };

  const processImage = async (dataUrl: string) => {
    setIsProcessing(true);
    try {
      const { detectDocumentCorners, applyPerspectiveTransform } = await import('../lib/opencv');
      
      // We need to wait for OpenCV if not loaded
      if (!(window as any).openCVReady) {
        toast({ title: "Initializing engine...", description: "Please wait a moment." });
        let attempts = 0;
        while (!(window as any).openCVReady && attempts < 50) {
          await new Promise(r => setTimeout(r, 100));
          attempts++;
        }
        if (!(window as any).openCVReady) throw new Error("OpenCV timeout");
      }

      // Load image to canvas for OpenCV
      const img = new Image();
      img.src = dataUrl;
      await new Promise(r => img.onload = r);
      
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      // Detect corners
      let corners: Corner[];
      try {
        corners = await detectDocumentCorners(canvas);
      } catch (e) {
        console.error("Corner detection failed, using fallback", e);
        corners = [
          { x: img.width * 0.1, y: img.height * 0.1 },
          { x: img.width * 0.9, y: img.height * 0.1 },
          { x: img.width * 0.9, y: img.height * 0.9 },
          { x: img.width * 0.1, y: img.height * 0.9 }
        ];
      }

      // Auto-crop
      const croppedUrl = await applyPerspectiveTransform(canvas, corners);
      
      // Default filter
      const filterCanvas = document.createElement('canvas');
      const croppedImg = new Image();
      croppedImg.src = croppedUrl;
      await new Promise(r => croppedImg.onload = r);
      filterCanvas.width = croppedImg.width;
      filterCanvas.height = croppedImg.height;
      const fCtx = filterCanvas.getContext('2d')!;
      fCtx.drawImage(croppedImg, 0, 0);
      
      const { applyFilter } = await import('../lib/filters');
      applyFilter(filterCanvas, 'magic', 0, 0);
      const filteredUrl = filterCanvas.toDataURL('image/jpeg', 0.9);

      const page: ScannedPage = {
        id: uuidv4(),
        originalDataUrl: dataUrl,
        croppedDataUrl: croppedUrl,
        filteredDataUrl: filteredUrl,
        filter: 'magic',
        brightness: 0,
        contrast: 0,
        corners
      };

      dispatch({ type: 'ADD_PAGE', payload: page });
      setLocation('/editor');
      
    } catch (err) {
      console.error(err);
      toast({ title: "Processing failed", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCapture = () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    processImage(dataUrl);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0]; // Take first for now
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        processImage(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/60 to-transparent">
        <Button variant="ghost" size="icon" onClick={() => setLocation('/')} className="text-white hover:bg-white/20">
          <X className="w-6 h-6" />
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={toggleFlash} className={`text-white hover:bg-white/20 ${flash ? 'text-yellow-400' : ''}`}>
            {flash ? <Zap className="w-6 h-6" /> : <ZapOff className="w-6 h-6" />}
          </Button>
        </div>
      </div>

      <div className="flex-1 relative flex items-center justify-center">
        {hasCamera === false ? (
          <div className="text-white text-center p-6">
            <Camera className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="mb-4">Camera access denied or unavailable.</p>
            <Button onClick={() => fileInputRef.current?.click()} variant="secondary">
              Upload from Gallery
            </Button>
          </div>
        ) : (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        
        {/* Viewfinder overlay */}
        {hasCamera && (
          <div className="absolute inset-8 border-2 border-white/30 rounded-lg pointer-events-none flex items-center justify-center">
            <div className="w-16 h-16 border-t-2 border-l-2 border-primary absolute top-0 left-0" />
            <div className="w-16 h-16 border-t-2 border-r-2 border-primary absolute top-0 right-0" />
            <div className="w-16 h-16 border-b-2 border-l-2 border-primary absolute bottom-0 left-0" />
            <div className="w-16 h-16 border-b-2 border-r-2 border-primary absolute bottom-0 right-0" />
          </div>
        )}

        {isProcessing && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-30">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-white font-medium">Processing document...</p>
          </div>
        )}
      </div>

      <div className="h-32 bg-black flex items-center justify-around px-8 pb-safe z-20">
        <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} className="text-white hover:bg-white/20 w-12 h-12">
          <ImageIcon className="w-7 h-7" />
        </Button>
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
        />
        
        <button 
          onClick={handleCapture}
          disabled={!hasCamera || isProcessing}
          className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
        >
          <div className="w-16 h-16 bg-white rounded-full"></div>
        </button>
        
        <Button variant="ghost" size="icon" onClick={toggleCamera} disabled={!hasCamera} className="text-white hover:bg-white/20 w-12 h-12">
          <RefreshCcw className="w-7 h-7" />
        </Button>
      </div>
    </div>
  );
}