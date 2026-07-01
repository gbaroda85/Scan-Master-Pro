import React from 'react';
import { FilterType } from '../lib/types';
import { Slider } from './ui/slider';
import { Wand2, Image as ImageIcon, Sparkles, FileText, Camera, RotateCcw, RotateCw, FlipHorizontal } from 'lucide-react';
import { cn } from '../lib/utils';

interface FilterBarProps {
  currentFilter: FilterType;
  brightness: number;
  contrast: number;
  rotation: number;
  onFilterChange: (filter: FilterType) => void;
  onBrightnessChange: (val: number) => void;
  onContrastChange: (val: number) => void;
  onRotate: (deg: number) => void;
  activeTab: 'filter' | 'adjust' | 'rotate';
  onTabChange: (tab: 'filter' | 'adjust' | 'rotate') => void;
}

export function FilterBar({
  currentFilter,
  brightness,
  contrast,
  rotation,
  onFilterChange,
  onBrightnessChange,
  onContrastChange,
  onRotate,
  activeTab,
  onTabChange,
}: FilterBarProps) {
  const filters: { id: FilterType; label: string; icon: React.ReactNode }[] = [
    { id: 'original', label: 'Original', icon: <ImageIcon className="w-5 h-5 mb-1" /> },
    { id: 'photo',    label: 'Photo',    icon: <Camera className="w-5 h-5 mb-1" /> },
    { id: 'document', label: 'Document', icon: <FileText className="w-5 h-5 mb-1" /> },
    { id: 'bw',       label: 'B&W',      icon: <Sparkles className="w-5 h-5 mb-1" /> },
    { id: 'magic',    label: 'Magic',    icon: <Wand2 className="w-5 h-5 mb-1" /> },
  ];

  const brightnessOffset = brightness - 100;
  const contrastOffset = contrast - 100;

  return (
    <div className="w-full bg-card border-t border-border flex flex-col">
      <div className="h-24">
        {activeTab === 'filter' && (
          <div className="flex w-full h-full p-4 gap-2 overflow-x-auto no-scrollbar">
            {filters.map((f) => (
              <button
                key={f.id}
                data-testid={`filter-btn-${f.id}`}
                onClick={() => onFilterChange(f.id)}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 min-w-[70px] rounded-lg border-2 transition-all',
                  currentFilter === f.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted'
                )}
              >
                {f.icon}
                <span className="text-xs font-medium">{f.label}</span>
              </button>
            ))}
          </div>
        )}

        {activeTab === 'adjust' && (
          <div className="flex flex-col w-full h-full p-4 gap-4 justify-center">
            <div className="flex items-center gap-4">
              <span className="text-xs font-medium w-16 text-muted-foreground text-right">Brightness</span>
              <Slider
                data-testid="slider-brightness"
                value={[brightness]}
                min={0}
                max={200}
                step={1}
                onValueChange={(vals) => onBrightnessChange(vals[0])}
                className="flex-1"
              />
              <span className="text-xs font-medium w-10 text-right tabular-nums">
                {brightnessOffset > 0 ? `+${brightnessOffset}` : brightnessOffset}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs font-medium w-16 text-muted-foreground text-right">Contrast</span>
              <Slider
                data-testid="slider-contrast"
                value={[contrast]}
                min={0}
                max={200}
                step={1}
                onValueChange={(vals) => onContrastChange(vals[0])}
                className="flex-1"
              />
              <span className="text-xs font-medium w-10 text-right tabular-nums">
                {contrastOffset > 0 ? `+${contrastOffset}` : contrastOffset}
              </span>
            </div>
          </div>
        )}

        {activeTab === 'rotate' && (
          <div className="flex w-full h-full items-center justify-center gap-6 px-4">
            <button
              data-testid="btn-rotate-ccw"
              onClick={() => onRotate((rotation - 90 + 360) % 360)}
              className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="w-6 h-6" />
              <span className="text-xs">Rotate Left</span>
            </button>
            <button
              data-testid="btn-rotate-cw"
              onClick={() => onRotate((rotation + 90) % 360)}
              className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCw className="w-6 h-6" />
              <span className="text-xs">Rotate Right</span>
            </button>
            <button
              data-testid="btn-flip"
              onClick={() => onRotate((rotation + 180) % 360)}
              className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <FlipHorizontal className="w-6 h-6" />
              <span className="text-xs">Flip 180°</span>
            </button>
            <div className="ml-auto text-xs text-muted-foreground tabular-nums">
              {rotation}°
            </div>
          </div>
        )}
      </div>

      <div className="flex border-t border-border h-12">
        {(['filter', 'adjust', 'rotate'] as const).map((tab) => (
          <button
            key={tab}
            data-testid={`tab-${tab}`}
            className={cn(
              'flex-1 text-sm font-medium transition-colors border-b-2 capitalize',
              activeTab === tab
                ? 'text-primary border-primary bg-primary/5'
                : 'text-muted-foreground border-transparent hover:bg-muted/50 hover:text-foreground'
            )}
            onClick={() => onTabChange(tab)}
          >
            {tab === 'filter' ? 'Filters' : tab === 'adjust' ? 'Adjust' : 'Rotate'}
          </button>
        ))}
      </div>
    </div>
  );
}
