import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import {
  Camera, Images, Zap, ZapOff, RefreshCcw, X, Loader2,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAppContext } from '../context/AppContext';
import { Corner, ScannedPage } from '../lib/types';
import { useToast } from '../hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { CropCanvas } from '../components/CropCanvas';

interface CropPreview {
  dataUrl: string;
  corners: Corner[];
}

export default function Capture() {
  const [, setLocation] = useLocation();
  const { dispatch } = useAppContext();
  const { toast } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [flash, setFlash] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);

  // After detection: show crop-adjust screen before applying transform
  const [cropPreview, setCropPreview] = useState<CropPreview | null>(null);
  const [isApplyingCrop, setIsApplyingCrop] = useState(false);

  useEffect(() => {
    startCamera();
    return stopCamera;
  }, [facingMode]);

  const startCamera = async () => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
      streamRef.current = stream;
      setHasCamera(true);
    } catch {
      setHasCamera(false);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const toggleCamera = () =>
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));

  const toggleFlash = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    const caps = track.getCapabilities() as any;
    if (caps.torch) {
      await track.applyConstraints({ advanced: [{ torch: !flash } as any] });
      setFlash(!flash);
    } else {
      toast({ title: 'Flash not supported on this device' });
    }
  };

  /** Step 1: load image → detect corners → show crop preview */
  const detectAndPreview = async (dataUrl: string) => {
    setIsProcessing(true);
    try {
      const { detectDocumentCorners } = await import('../lib/opencv');

      if (!(window as any).openCVReady) {
        toast({ title: 'Initializing engine…', description: 'Please wait a moment.' });
        let attempts = 0;
        while (!(window as any).openCVReady && attempts < 60) {
          await new Promise((r) => setTimeout(r, 100));
          attempts++;
        }
        if (!(window as any).openCVReady) throw new Error('OpenCV timeout');
      }

      const img = new Image();
      img.src = dataUrl;
      await new Promise((r) => (img.onload = r));

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d')!.drawImage(img, 0, 0);

      let corners: Corner[];
      try {
        corners = await detectDocumentCorners(canvas);
      } catch {
        corners = [
          { x: img.width * 0.08, y: img.height * 0.08 },
          { x: img.width * 0.92, y: img.height * 0.08 },
          { x: img.width * 0.92, y: img.height * 0.92 },
          { x: img.width * 0.08, y: img.height * 0.92 },
        ];
      }

      // Stop camera to save resources while user adjusts crop
      stopCamera();
      setCropPreview({ dataUrl, corners });
    } catch (err) {
      console.error(err);
      toast({ title: 'Detection failed', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  /** Step 2: user confirmed the crop corners (and possibly rotated image) → apply transform → go to editor */
  const handleCropConfirm = async (corners: Corner[], rotatedImageSrc: string) => {
    if (!cropPreview) return;
    setIsApplyingCrop(true);
    try {
      const { applyPerspectiveTransform } = await import('../lib/opencv');
      const { applyFilter } = await import('../lib/filters');

      const img = new Image();
      img.src = rotatedImageSrc;
      await new Promise((r) => (img.onload = r));

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d')!.drawImage(img, 0, 0);

      const croppedUrl = await applyPerspectiveTransform(canvas, corners);
      const filteredUrl = await applyFilter(croppedUrl, 'document', {
        brightness: 100,
        contrast: 100,
        rotation: 0,
      });

      const page: ScannedPage = {
        id: uuidv4(),
        originalDataUrl: cropPreview.dataUrl,
        croppedDataUrl: croppedUrl,
        filteredDataUrl: filteredUrl,
        filter: 'document',
        brightness: 100,
        contrast: 100,
        rotation: 0,
        corners,
      };

      dispatch({ type: 'ADD_PAGE', payload: page });
      setCropPreview(null);
      setLocation('/editor');
    } catch (err) {
      console.error(err);
      toast({ title: 'Crop failed', variant: 'destructive' });
      setIsApplyingCrop(false);
    }
  };

  const handleCropCancel = () => {
    setCropPreview(null);
    startCamera();
  };

  const handleCapture = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')!.drawImage(videoRef.current, 0, 0);
    detectAndPreview(canvas.toDataURL('image/jpeg', 0.95));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0]; // capture reference before resetting the input
    e.target.value = '';   // reset so the same file can be re-selected later
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) detectAndPreview(ev.target.result as string);
    };
    reader.readAsDataURL(file);
  };

  // ── Crop adjustment screen (full screen overlay) ──
  if (cropPreview) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        {isApplyingCrop && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-white font-medium">Applying crop…</p>
          </div>
        )}
        <CropCanvas
          imageSrc={cropPreview.dataUrl}
          initialCorners={cropPreview.corners}
          onApply={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      </div>
    );
  }

  // ── Camera viewfinder screen ──
  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50 overflow-hidden">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/70 to-transparent">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation('/')}
          className="text-white hover:bg-white/20"
          data-testid="btn-close-camera"
        >
          <X className="w-6 h-6" />
        </Button>
        <span className="text-white/80 text-sm font-medium tracking-wide">
          {hasCamera ? 'Align document in frame' : 'Upload a photo'}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleFlash}
          disabled={!hasCamera}
          className={`text-white hover:bg-white/20 ${flash ? 'text-yellow-400' : ''}`}
          data-testid="btn-flash"
        >
          {flash ? <Zap className="w-6 h-6" /> : <ZapOff className="w-6 h-6" />}
        </Button>
      </div>

      {/* Viewfinder */}
      <div className="flex-1 relative flex items-center justify-center">
        {hasCamera === false ? (
          /* Camera denied — show prominent upload UI */
          <div className="text-white text-center p-6 flex flex-col items-center gap-4">
            <Camera className="w-14 h-14 opacity-40" />
            <p className="text-white/70 text-sm">Camera access denied or unavailable.</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-primary text-white font-semibold px-6 py-3 rounded-full active:scale-95 transition-transform"
              data-testid="btn-upload-fallback"
            >
              <Images className="w-5 h-5" />
              Choose from Gallery
            </button>
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

        {/* Corner guide overlay */}
        {hasCamera && (
          <div className="absolute inset-10 pointer-events-none">
            <div className="absolute top-0 left-0 w-14 h-14 border-t-[3px] border-l-[3px] border-primary rounded-tl-sm" />
            <div className="absolute top-0 right-0 w-14 h-14 border-t-[3px] border-r-[3px] border-primary rounded-tr-sm" />
            <div className="absolute bottom-0 left-0 w-14 h-14 border-b-[3px] border-l-[3px] border-primary rounded-bl-sm" />
            <div className="absolute bottom-0 right-0 w-14 h-14 border-b-[3px] border-r-[3px] border-primary rounded-br-sm" />
          </div>
        )}

        {/* Processing spinner */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center z-30">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-white font-medium">Detecting document…</p>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="bg-black/90 px-6 pt-5 pb-8 flex items-center justify-between gap-4 z-20">

        {/* Gallery button — prominent, labelled */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          data-testid="btn-gallery"
          className="flex flex-col items-center gap-1.5 text-white disabled:opacity-40"
        >
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center active:bg-white/20 transition-colors">
            <Images className="w-7 h-7" />
          </div>
          <span className="text-[11px] text-white/70 font-medium">Gallery</span>
        </button>

        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />

        {/* Shutter button */}
        <button
          onClick={handleCapture}
          disabled={!hasCamera || isProcessing}
          data-testid="btn-shutter"
          className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40"
        >
          <div className="w-16 h-16 bg-white rounded-full" />
        </button>

        {/* Flip camera */}
        <button
          onClick={toggleCamera}
          disabled={!hasCamera || isProcessing}
          data-testid="btn-flip-camera"
          className="flex flex-col items-center gap-1.5 text-white disabled:opacity-40"
        >
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center active:bg-white/20 transition-colors">
            <RefreshCcw className="w-7 h-7" />
          </div>
          <span className="text-[11px] text-white/70 font-medium">Flip</span>
        </button>
      </div>
    </div>
  );
}
