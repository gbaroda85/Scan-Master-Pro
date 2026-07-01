import React from 'react';
import { FilterType } from '../lib/types';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Wand2, Image as ImageIcon, Sparkles, Droplet } from 'lucide-react';
import { cn } from '../lib/utils';

interface FilterBarProps {
  currentFilter: FilterType;
  brightness: number;
  contrast: number;
  onFilterChange: (filter: FilterType) => void;
  onBrightnessChange: (val: number) => void;
  onContrastChange: (val: number) => void;
  activeTab: 'filter' | 'adjust';
  onTabChange: (tab: 'filter' | 'adjust') => void;
}

export function FilterBar({
  currentFilter,
  brightness,
  contrast,
  onFilterChange,
  onBrightnessChange,
  onContrastChange,
  activeTab,
  onTabChange
}: FilterBarProps) {
  const filters: { id: FilterType; label: string; icon: React.ReactNode }[] = [
    { id: 'original', label: 'Original', icon: <ImageIcon className="w-5 h-5 mb-1" /> },
    { id: 'magic', label: 'Magic', icon: <Wand2 className="w-5 h-5 mb-1" /> },
    { id: 'bw', label: 'B&W', icon: <Droplet className="w-5 h-5 mb-1" /> },
    { id: 'grayscale', label: 'Gray', icon: <Sparkles className="w-5 h-5 mb-1" /> },
  ];

  return (
    <div className="w-full bg-card border-t border-border flex flex-col">
      <div className="h-24">
        {activeTab === 'filter' && (
          <div className="flex w-full h-full p-4 gap-2 overflow-x-auto no-scrollbar">
            {filters.map((f) => (
              <button
                key={f.id}
                onClick={() => onFilterChange(f.id)}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 min-w-[70px] rounded-lg border-2 transition-all",
                  currentFilter === f.id 
                    ? "border-primary bg-primary/10 text-primary" 
                    : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted"
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
                value={[brightness]} 
                min={-100} 
                max={100} 
                step={1} 
                onValueChange={(vals) => onBrightnessChange(vals[0])} 
                className="flex-1"
              />
              <span className="text-xs font-medium w-8 text-right">{brightness > 0 ? `+${brightness}` : brightness}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs font-medium w-16 text-muted-foreground text-right">Contrast</span>
              <Slider 
                value={[contrast]} 
                min={-100} 
                max={100} 
                step={1} 
                onValueChange={(vals) => onContrastChange(vals[0])} 
                className="flex-1"
              />
              <span className="text-xs font-medium w-8 text-right">{contrast > 0 ? `+${contrast}` : contrast}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex border-t border-border h-12">
        <button
          className={cn(
            "flex-1 text-sm font-medium transition-colors border-b-2",
            activeTab === 'filter' ? "text-primary border-primary bg-primary/5" : "text-muted-foreground border-transparent hover:bg-muted/50 hover:text-foreground"
          )}
          onClick={() => onTabChange('filter')}
        >
          Filters
        </button>
        <button
          className={cn(
            "flex-1 text-sm font-medium transition-colors border-b-2",
            activeTab === 'adjust' ? "text-primary border-primary bg-primary/5" : "text-muted-foreground border-transparent hover:bg-muted/50 hover:text-foreground"
          )}
          onClick={() => onTabChange('adjust')}
        >
          Adjust
        </button>
      </div>
    </div>
  );
}