import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAppContext } from '../context/AppContext';
import { Button } from '../components/ui/button';
import { ChevronLeft, Check, Crop, Type, Loader2, Stamp } from 'lucide-react';
import { PageStrip } from '../components/PageStrip';
import { FilterBar } from '../components/FilterBar';
import { CropCanvas } from '../components/CropCanvas';
import { OCRModal } from '../components/OCRModal';
import { WatermarkModal } from '../components/WatermarkModal';
import { FilterType, WatermarkSettings } from '../lib/types';
import { useToast } from '../hooks/use-toast';

export default function Editor() {
  const [, setLocation] = useLocation();
  const { state, dispatch, saveCurrentSessionAsDocument } = useAppContext();
  const { toast } = useToast();

  const [isCropping, setIsCropping] = useState(false);
  const [ocrOpen, setOcrOpen] = useState(false);
  const [watermarkOpen, setWatermarkOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'filter' | 'adjust' | 'rotate'>('filter');

  const { currentSession, currentPageIndex } = state;
  const currentPage = currentSession[currentPageIndex];

  useEffect(() => {
    if (currentSession.length === 0 && !isSaving) setLocation('/');
  }, [currentSession.length, isSaving]);

  if (!currentPage) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const defaultName = `Scan ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
      await saveCurrentSessionAsDocument(defaultName);
      toast({ title: 'Document saved' });
      setLocation('/');
    } catch (err) {
      console.error(err);
      toast({ title: 'Error saving document', variant: 'destructive' });
      setIsSaving(false);
    }
  };

  const reapplyFilter = async (
    croppedDataUrl: string,
    filter: FilterType,
    brightness: number,
    contrast: number,
    rotation: number
  ): Promise<string> => {
    const { applyFilter } = await import('../lib/filters');
    return applyFilter(croppedDataUrl, filter, { brightness, contrast, rotation });
  };

  const handleApplyCrop = async (corners: { x: number; y: number }[]) => {
    setIsCropping(false);
    try {
      const { applyPerspectiveTransform } = await import('../lib/opencv');
      const img = new Image();
      img.src = currentPage.originalDataUrl;
      await new Promise((r) => (img.onload = r));
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d')!.drawImage(img, 0, 0);
      const croppedUrl = await applyPerspectiveTransform(canvas, corners);
      const filteredUrl = await reapplyFilter(
        croppedUrl, currentPage.filter, currentPage.brightness, currentPage.contrast, currentPage.rotation
      );
      dispatch({
        type: 'UPDATE_PAGE',
        payload: {
          index: currentPageIndex,
          page: { ...currentPage, corners, croppedDataUrl: croppedUrl, filteredDataUrl: filteredUrl },
        },
      });
    } catch (err) {
      console.error('Crop error', err);
      toast({ title: 'Failed to apply crop', variant: 'destructive' });
    }
  };

  const handleUpdateFilter = async (
    filter: FilterType, brightness: number, contrast: number, rotation: number
  ) => {
    try {
      const filteredUrl = await reapplyFilter(
        currentPage.croppedDataUrl, filter, brightness, contrast, rotation
      );
      dispatch({
        type: 'UPDATE_PAGE',
        payload: {
          index: currentPageIndex,
          page: { ...currentPage, filter, brightness, contrast, rotation, filteredDataUrl: filteredUrl },
        },
      });
    } catch (err) {
      console.error('Filter error', err);
    }
  };

  const handleApplyWatermark = async (settings: WatermarkSettings) => {
    setWatermarkOpen(false);
    toast({ title: 'Applying watermark…' });
    try {
      const { applyWatermark } = await import('../lib/watermark');
      // Apply to every page in the session
      for (let i = 0; i < currentSession.length; i++) {
        const page = currentSession[i];
        const watermarked = await applyWatermark(page.filteredDataUrl, settings);
        dispatch({
          type: 'UPDATE_PAGE',
          payload: {
            index: i,
            page: { ...page, filteredDataUrl: watermarked },
          },
        });
      }
      toast({ title: `Watermark applied to ${currentSession.length} page(s)` });
    } catch (err) {
      console.error('Watermark error', err);
      toast({ title: 'Failed to apply watermark', variant: 'destructive' });
    }
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col z-50 overflow-hidden">
      {/* Top Bar */}
      <div className="h-14 border-b border-border flex items-center justify-between px-2 bg-card">
        <Button
          variant="ghost"
          data-testid="btn-discard"
          onClick={() => setLocation('/')}
          className="text-muted-foreground"
        >
          <ChevronLeft className="w-5 h-5 mr-1" /> Discard
        </Button>
        <span className="font-semibold text-sm">
          Page {currentPageIndex + 1} of {currentSession.length}
        </span>
        <Button
          data-testid="btn-done"
          onClick={handleSave}
          disabled={isSaving}
          size="sm"
          className="bg-primary text-primary-foreground"
        >
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
            data-testid="img-current-page"
            className="max-w-full max-h-full object-contain shadow-md"
            style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' }}
          />
        </div>

        {/* Floating Tools */}
        <div className="absolute right-4 top-4 flex flex-col gap-2">
          <Button
            variant="secondary"
            size="icon"
            data-testid="btn-crop"
            title="Crop / Adjust corners"
            className="w-10 h-10 rounded-full shadow-md bg-background text-foreground"
            onClick={() => setIsCropping(true)}
          >
            <Crop className="w-5 h-5" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            data-testid="btn-watermark"
            title="Add Watermark"
            className="w-10 h-10 rounded-full shadow-md bg-background text-foreground"
            onClick={() => setWatermarkOpen(true)}
          >
            <Stamp className="w-5 h-5" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            data-testid="btn-ocr"
            title="Recognize Text (OCR)"
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
          rotation={currentPage.rotation}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onFilterChange={(f) =>
            handleUpdateFilter(f, currentPage.brightness, currentPage.contrast, currentPage.rotation)
          }
          onBrightnessChange={(b) =>
            handleUpdateFilter(currentPage.filter, b, currentPage.contrast, currentPage.rotation)
          }
          onContrastChange={(c) =>
            handleUpdateFilter(currentPage.filter, currentPage.brightness, c, currentPage.rotation)
          }
          onRotate={(deg) =>
            handleUpdateFilter(currentPage.filter, currentPage.brightness, currentPage.contrast, deg)
          }
        />
        <PageStrip
          pages={currentSession}
          currentIndex={currentPageIndex}
          onSelect={(idx) => dispatch({ type: 'SET_CURRENT_PAGE_INDEX', payload: idx })}
          onDelete={(idx) => dispatch({ type: 'DELETE_PAGE', payload: idx })}
          onAdd={() => setLocation('/capture')}
        />
      </div>

      {/* Crop overlay */}
      {isCropping && (
        <CropCanvas
          imageSrc={currentPage.originalDataUrl}
          initialCorners={currentPage.corners}
          onApply={handleApplyCrop}
          onCancel={() => setIsCropping(false)}
        />
      )}

      {/* OCR Modal */}
      <OCRModal open={ocrOpen} onOpenChange={setOcrOpen} imageUrl={currentPage.filteredDataUrl} />

      {/* Watermark Modal */}
      <WatermarkModal
        open={watermarkOpen}
        previewImageUrl={currentPage.filteredDataUrl}
        onApply={handleApplyWatermark}
        onCancel={() => setWatermarkOpen(false)}
      />
    </div>
  );
}
