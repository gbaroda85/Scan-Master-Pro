import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useAppContext } from '../context/AppContext';
import { Button } from '../components/ui/button';
import { ChevronLeft, Check, Crop, Type, Loader2 } from 'lucide-react';
import { PageStrip } from '../components/PageStrip';
import { FilterBar } from '../components/FilterBar';
import { CropCanvas } from '../components/CropCanvas';
import { OCRModal } from '../components/OCRModal';
import { FilterType } from '../lib/types';
import { useToast } from '../hooks/use-toast';

export default function Editor() {
  const [, setLocation] = useLocation();
  const { state, dispatch, saveCurrentSessionAsDocument } = useAppContext();
  const { toast } = useToast();
  
  const [isCropping, setIsCropping] = useState(false);
  const [ocrOpen, setOcrOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'filter' | 'adjust'>('filter');
  
  const { currentSession, currentPageIndex } = state;
  const currentPage = currentSession[currentPageIndex];

  // If no pages, go back home
  useEffect(() => {
    if (currentSession.length === 0 && !isSaving) {
      setLocation('/');
    }
  }, [currentSession.length, isSaving]);

  if (!currentPage) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const defaultName = `Scan ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
      await saveCurrentSessionAsDocument(defaultName);
      toast({ title: "Document saved" });
      setLocation('/');
    } catch (err) {
      console.error(err);
      toast({ title: "Error saving document", variant: "destructive" });
      setIsSaving(false);
    }
  };

  const handleApplyCrop = async (corners: any[]) => {
    setIsCropping(false);
    
    // Process new crop
    try {
      const { applyPerspectiveTransform } = await import('../lib/opencv');
      const { applyFilter } = await import('../lib/filters');
      
      const img = new Image();
      img.src = currentPage.originalDataUrl;
      await new Promise(r => img.onload = r);
      
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      
      const croppedUrl = await applyPerspectiveTransform(canvas, corners);
      
      // Reapply current filter
      const filterCanvas = document.createElement('canvas');
      const croppedImg = new Image();
      croppedImg.src = croppedUrl;
      await new Promise(r => croppedImg.onload = r);
      filterCanvas.width = croppedImg.width;
      filterCanvas.height = croppedImg.height;
      const fCtx = filterCanvas.getContext('2d')!;
      fCtx.drawImage(croppedImg, 0, 0);
      
      applyFilter(filterCanvas, currentPage.filter, currentPage.brightness, currentPage.contrast);
      const filteredUrl = filterCanvas.toDataURL('image/jpeg', 0.9);
      
      dispatch({
        type: 'UPDATE_PAGE',
        payload: {
          index: currentPageIndex,
          page: {
            ...currentPage,
            corners,
            croppedDataUrl: croppedUrl,
            filteredDataUrl: filteredUrl
          }
        }
      });
      
    } catch (err) {
      console.error("Crop error", err);
      toast({ title: "Failed to apply crop", variant: "destructive" });
    }
  };

  const handleUpdateFilter = async (
    filter: FilterType, 
    brightness: number, 
    contrast: number
  ) => {
    try {
      const { applyFilter } = await import('../lib/filters');
      
      const filterCanvas = document.createElement('canvas');
      const croppedImg = new Image();
      croppedImg.src = currentPage.croppedDataUrl;
      await new Promise(r => croppedImg.onload = r);
      filterCanvas.width = croppedImg.width;
      filterCanvas.height = croppedImg.height;
      const fCtx = filterCanvas.getContext('2d')!;
      fCtx.drawImage(croppedImg, 0, 0);
      
      applyFilter(filterCanvas, filter, brightness, contrast);
      const filteredUrl = filterCanvas.toDataURL('image/jpeg', 0.9);
      
      dispatch({
        type: 'UPDATE_PAGE',
        payload: {
          index: currentPageIndex,
          page: {
            ...currentPage,
            filter,
            brightness,
            contrast,
            filteredDataUrl: filteredUrl
          }
        }
      });
    } catch (err) {
      console.error("Filter error", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col z-50 overflow-hidden">
      {/* Top Bar */}
      <div className="h-14 border-b border-border flex items-center justify-between px-2 bg-card">
        <Button variant="ghost" onClick={() => setLocation('/')} className="text-muted-foreground">
          <ChevronLeft className="w-5 h-5 mr-1" /> Discard
        </Button>
        <span className="font-semibold text-sm">
          Page {currentPageIndex + 1} of {currentSession.length}
        </span>
        <Button onClick={handleSave} disabled={isSaving} size="sm" className="bg-primary text-primary-foreground">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
          Done
        </Button>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative bg-muted flex items-center justify-center overflow-hidden p-4">
        <div className="relative w-full h-full flex items-center justify-center">
          <img 
            src={currentPage.filteredDataUrl} 
            alt="Current document" 
            className="max-w-full max-h-full object-contain shadow-md"
            style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))' }}
          />
        </div>

        {/* Floating Canvas Tools */}
        <div className="absolute right-4 top-4 flex flex-col gap-2">
          <Button 
            variant="secondary" 
            size="icon" 
            className="w-10 h-10 rounded-full shadow-md bg-background text-foreground"
            onClick={() => setIsCropping(true)}
          >
            <Crop className="w-5 h-5" />
          </Button>
          <Button 
            variant="secondary" 
            size="icon" 
            className="w-10 h-10 rounded-full shadow-md bg-background text-foreground"
            onClick={() => setOcrOpen(true)}
          >
            <Type className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Bottom Tools */}
      <div className="flex flex-col bg-card">
        <FilterBar 
          currentFilter={currentPage.filter}
          brightness={currentPage.brightness}
          contrast={currentPage.contrast}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onFilterChange={(f) => handleUpdateFilter(f, currentPage.brightness, currentPage.contrast)}
          onBrightnessChange={(b) => handleUpdateFilter(currentPage.filter, b, currentPage.contrast)}
          onContrastChange={(c) => handleUpdateFilter(currentPage.filter, currentPage.brightness, c)}
        />
        
        <PageStrip 
          pages={currentSession}
          currentIndex={currentPageIndex}
          onSelect={(idx) => dispatch({ type: 'SET_CURRENT_PAGE_INDEX', payload: idx })}
          onDelete={(idx) => dispatch({ type: 'DELETE_PAGE', payload: idx })}
          onAdd={() => setLocation('/capture')}
        />
      </div>

      {/* Fullscreen Crop Mode */}
      {isCropping && (
        <CropCanvas
          imageSrc={currentPage.originalDataUrl}
          initialCorners={currentPage.corners}
          onApply={handleApplyCrop}
          onCancel={() => setIsCropping(false)}
        />
      )}

      {/* OCR Modal */}
      <OCRModal 
        open={ocrOpen} 
        onOpenChange={setOcrOpen} 
        imageUrl={currentPage.filteredDataUrl} 
      />
    </div>
  );
}