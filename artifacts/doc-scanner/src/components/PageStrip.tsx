import React, { useRef, useEffect } from 'react';
import { ScannedPage } from '../lib/types';
import { Button } from './ui/button';
import { Trash2, Plus } from 'lucide-react';
import { cn } from '../lib/utils';

interface PageStripProps {
  pages: ScannedPage[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onDelete: (index: number) => void;
  onAdd: () => void;
}

export function PageStrip({ pages, currentIndex, onSelect, onDelete, onAdd }: PageStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const activeEl = container.children[currentIndex] as HTMLElement;
      if (activeEl) {
        const scrollLeft = activeEl.offsetLeft - container.clientWidth / 2 + activeEl.clientWidth / 2;
        container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      }
    }
  }, [currentIndex]);

  return (
    <div className="w-full bg-card border-t border-border flex flex-col">
      <div className="px-4 py-2 text-xs font-medium text-muted-foreground flex justify-between items-center">
        <span>Pages ({pages.length})</span>
        <span>{currentIndex + 1} / {pages.length}</span>
      </div>
      <div 
        ref={scrollRef}
        className="flex overflow-x-auto gap-3 px-4 pb-4 pt-2 no-scrollbar"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {pages.map((page, index) => (
          <div 
            key={page.id} 
            className={cn(
              "relative flex-shrink-0 w-20 aspect-[3/4] rounded-md overflow-hidden border-2 transition-all cursor-pointer group",
              currentIndex === index ? "border-primary shadow-sm" : "border-transparent opacity-60 hover:opacity-100 bg-muted"
            )}
            onClick={() => onSelect(index)}
            style={{ scrollSnapAlign: 'start' }}
          >
            <img 
              src={page.filteredDataUrl || page.croppedDataUrl || page.originalDataUrl} 
              alt={`Page ${index + 1}`} 
              className="w-full h-full object-cover"
            />
            <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full backdrop-blur-sm">
              {index + 1}
            </div>
            
            {pages.length > 1 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(index);
                }}
                className="absolute bottom-1 right-1 bg-black/60 text-white p-1 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity hover:bg-destructive"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
        
        <button 
          onClick={onAdd}
          className="flex-shrink-0 w-20 aspect-[3/4] rounded-md border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground transition-colors cursor-pointer bg-muted/30"
          style={{ scrollSnapAlign: 'start' }}
        >
          <Plus className="w-6 h-6 mb-1" />
          <span className="text-xs font-medium">Add</span>
        </button>
      </div>
    </div>
  );
}