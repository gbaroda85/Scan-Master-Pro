import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Input } from './ui/input';
import { Stamp, Check } from 'lucide-react';
import { WatermarkSettings, WatermarkPosition } from '../lib/types';
import { drawWatermarkPreview } from '../lib/watermark';
import { cn } from '../lib/utils';

interface WatermarkModalProps {
  open: boolean;
  previewImageUrl: string;
  onApply: (settings: WatermarkSettings) => void;
  onCancel: () => void;
}

const POSITION_GRID: { id: WatermarkPosition; label: string }[][] = [
  [
    { id: 'top-left',   label: '↖' },
    { id: 'top-center', label: '↑' },
    { id: 'top-right',  label: '↗' },
  ],
  [
    { id: 'mid-left',   label: '←' },
    { id: 'center',     label: '⊙' },
    { id: 'mid-right',  label: '→' },
  ],
  [
    { id: 'bot-left',   label: '↙' },
    { id: 'bot-center', label: '↓' },
    { id: 'bot-right',  label: '↘' },
  ],
];

const PRESET_COLORS = [
  '#000000', '#ffffff', '#ef4444', '#3b82f6',
  '#22c55e', '#f59e0b', '#8b5cf6', '#6b7280',
];

const DEFAULT_SETTINGS: WatermarkSettings = {
  text: 'CONFIDENTIAL',
  position: 'center',
  color: '#6b7280',
  opacity: 35,
  fontSize: 72,
  margin: 60,
  angle: -30,
};

export function WatermarkModal({ open, previewImageUrl, onApply, onCancel }: WatermarkModalProps) {
  const [settings, setSettings] = useState<WatermarkSettings>(DEFAULT_SETTINGS);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewScale = useRef(1);

  const up = (patch: Partial<WatermarkSettings>) =>
    setSettings((prev) => ({ ...prev, ...patch }));

  const updatePreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !previewImageUrl) return;
    drawWatermarkPreview(canvas, previewImageUrl, settings, previewScale.current);
  }, [settings, previewImageUrl]);

  // Measure image to set canvas size on open
  useEffect(() => {
    if (!open || !previewImageUrl) return;
    setSettings(DEFAULT_SETTINGS);
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const maxW = 320;
      const scale = Math.min(1, maxW / img.naturalWidth);
      const cssW = img.naturalWidth * scale;
      const cssH = img.naturalHeight * scale;
      const dpr = window.devicePixelRatio || 1;

      // Backing store at devicePixelRatio resolution, CSS size stays at the
      // (smaller) display size — keeps the live preview sharp on retina screens.
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      previewScale.current = scale;
      updatePreview();
    };
    img.src = previewImageUrl;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, previewImageUrl]);

  // Redraw whenever settings change
  useEffect(() => {
    updatePreview();
  }, [updatePreview]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stamp className="w-5 h-5 text-primary" /> Watermark
          </DialogTitle>
        </DialogHeader>

        {/* Live preview */}
        <div className="flex justify-center bg-muted rounded-lg p-2 mb-2">
          <canvas
            ref={canvasRef}
            className="max-w-full rounded shadow-sm"
            style={{ imageRendering: 'auto' }}
          />
        </div>

        <div className="space-y-4">
          {/* Text */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Watermark Text
            </label>
            <Input
              value={settings.text}
              onChange={(e) => up({ text: e.target.value })}
              placeholder="e.g. CONFIDENTIAL"
              className="font-medium"
            />
          </div>

          {/* Position grid */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Position
            </label>
            <div className="flex gap-2 items-start">
              <div className="grid grid-cols-3 gap-1 flex-shrink-0">
                {POSITION_GRID.flat().map((pos) => (
                  <button
                    key={pos.id}
                    onClick={() => up({ position: pos.id })}
                    className={cn(
                      'w-10 h-10 rounded-md text-lg font-mono border-2 transition-all flex items-center justify-center',
                      settings.position === pos.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-muted text-muted-foreground hover:border-primary/50'
                    )}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => up({ position: 'diagonal' })}
                className={cn(
                  'flex-1 h-32 rounded-md border-2 transition-all flex flex-col items-center justify-center gap-1 text-sm font-medium',
                  settings.position === 'diagonal'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-muted text-muted-foreground hover:border-primary/50'
                )}
              >
                <span className="text-xl rotate-[-30deg] inline-block opacity-40">TEXT</span>
                <span className="text-xl rotate-[-30deg] inline-block">TEXT</span>
                <span className="text-xl rotate-[-30deg] inline-block opacity-40">TEXT</span>
                <span className="text-[10px] mt-1">Diagonal</span>
              </button>
            </div>
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Color
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => up({ color: c })}
                  className={cn(
                    'w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center flex-shrink-0',
                    settings.color === c ? 'border-primary scale-110' : 'border-transparent hover:scale-105'
                  )}
                  style={{ backgroundColor: c, boxShadow: c === '#ffffff' ? 'inset 0 0 0 1px #ddd' : undefined }}
                >
                  {settings.color === c && (
                    <Check className="w-3.5 h-3.5" style={{ color: c === '#ffffff' ? '#000' : '#fff' }} />
                  )}
                </button>
              ))}
              <input
                type="color"
                value={settings.color}
                onChange={(e) => up({ color: e.target.value })}
                className="w-8 h-8 rounded-full border-2 border-border cursor-pointer overflow-hidden bg-transparent p-0"
                title="Custom color"
              />
            </div>
          </div>

          {/* Opacity */}
          <SliderRow
            label="Opacity"
            value={settings.opacity}
            min={5} max={100} step={1}
            display={`${settings.opacity}%`}
            onChange={(v) => up({ opacity: v })}
          />

          {/* Font Size */}
          <SliderRow
            label="Font Size"
            value={settings.fontSize}
            min={12} max={200} step={2}
            display={`${settings.fontSize}px`}
            onChange={(v) => up({ fontSize: v })}
          />

          {/* Margin */}
          <SliderRow
            label="Margin"
            value={settings.margin}
            min={0} max={300} step={4}
            display={`${settings.margin}px`}
            onChange={(v) => up({ margin: v })}
          />

          {/* Angle */}
          <SliderRow
            label="Angle"
            value={settings.angle}
            min={-180} max={180} step={1}
            display={`${settings.angle}°`}
            onChange={(v) => up({ angle: v })}
          />
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
          <Button onClick={() => onApply(settings)} className="flex-1">
            <Stamp className="w-4 h-4 mr-2" /> Apply to All Pages
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SliderRow({
  label, value, min, max, step, display, onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {label}
        </label>
        <span className="text-xs font-mono text-foreground tabular-nums">{display}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}
