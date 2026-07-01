import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Corner } from '../lib/types';
import { Button } from './ui/button';
import { Check, X } from 'lucide-react';

interface CropCanvasProps {
  imageSrc: string;
  initialCorners: Corner[];
  onApply: (corners: Corner[]) => void;
  onCancel: () => void;
}

const CORNER_RADIUS = 20;

export function CropCanvas({ imageSrc, initialCorners, onApply, onCancel }: CropCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(new Image());
  
  const [corners, setCorners] = useState<Corner[]>(initialCorners);
  const [activeCorner, setActiveCorner] = useState<number | null>(null);
  const [displayScale, setDisplayScale] = useState({ x: 1, y: 1 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragPos, setDragPos] = useState<{x: number, y: number} | null>(null);

  // Load image and set up canvas
  useEffect(() => {
    const img = imgRef.current;
    img.src = imageSrc;
    img.onload = () => {
      if (!containerRef.current || !canvasRef.current) return;
      
      const container = containerRef.current;
      const canvas = canvasRef.current;
      
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      
      const scale = Math.min(cw / iw, ch / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      
      canvas.width = dw;
      canvas.height = dh;
      
      const ox = (cw - dw) / 2;
      const oy = (ch - dh) / 2;
      
      setDisplayScale({ x: scale, y: scale });
      setOffset({ x: ox, y: oy });
      
      // Initialize scaled corners
      if (initialCorners && initialCorners.length === 4) {
        setCorners(initialCorners.map(c => ({
          x: c.x * scale,
          y: c.y * scale
        })));
      } else {
        // Default corners
        const m = 20;
        setCorners([
          { x: m, y: m },
          { x: dw - m, y: m },
          { x: dw - m, y: dh - m },
          { x: m, y: dh - m }
        ]);
      }
      
      drawCanvas();
    };
  }, [imageSrc, initialCorners]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || corners.length !== 4) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw original image
    ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
    
    // Draw mask overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.moveTo(corners[0].x, corners[0].y);
    ctx.lineTo(corners[1].x, corners[1].y);
    ctx.lineTo(corners[2].x, corners[2].y);
    ctx.lineTo(corners[3].x, corners[3].y);
    ctx.closePath();
    ctx.fill('evenodd');
    
    // Draw connecting lines
    ctx.strokeStyle = '#0ea5e9'; // primary color
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    ctx.lineTo(corners[1].x, corners[1].y);
    ctx.lineTo(corners[2].x, corners[2].y);
    ctx.lineTo(corners[3].x, corners[3].y);
    ctx.closePath();
    ctx.stroke();
    
    // Draw corners
    corners.forEach((corner, i) => {
      ctx.beginPath();
      ctx.arc(corner.x, corner.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = i === activeCorner ? '#ffffff' : '#0ea5e9';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Invisible larger touch target
      ctx.beginPath();
      ctx.arc(corner.x, corner.y, CORNER_RADIUS, 0, Math.PI * 2);
    });
  }, [corners, activeCorner]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const getEventPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent | MouseEvent).clientX;
      clientY = (e as React.MouseEvent | MouseEvent).clientY;
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pos = getEventPos(e);
    
    // Find closest corner
    let closestIdx = -1;
    let minDist = Infinity;
    
    corners.forEach((corner, i) => {
      const dist = Math.hypot(corner.x - pos.x, corner.y - pos.y);
      if (dist < minDist && dist < CORNER_RADIUS * 2) {
        minDist = dist;
        closestIdx = i;
      }
    });
    
    if (closestIdx !== -1) {
      setActiveCorner(closestIdx);
      setDragPos(pos);
    }
  };

  const handlePointerMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (activeCorner === null || !canvasRef.current) return;
    
    e.preventDefault();
    const pos = getEventPos(e);
    
    // Constrain to canvas
    pos.x = Math.max(0, Math.min(pos.x, canvasRef.current.width));
    pos.y = Math.max(0, Math.min(pos.y, canvasRef.current.height));
    
    const newCorners = [...corners];
    newCorners[activeCorner] = pos;
    setCorners(newCorners);
    setDragPos(pos);
  }, [activeCorner, corners]);

  const handlePointerUp = useCallback(() => {
    setActiveCorner(null);
    setDragPos(null);
  }, []);

  useEffect(() => {
    if (activeCorner !== null) {
      window.addEventListener('mousemove', handlePointerMove, { passive: false });
      window.addEventListener('touchmove', handlePointerMove, { passive: false });
      window.addEventListener('mouseup', handlePointerUp);
      window.addEventListener('touchend', handlePointerUp);
      
      return () => {
        window.removeEventListener('mousemove', handlePointerMove);
        window.removeEventListener('touchmove', handlePointerMove);
        window.removeEventListener('mouseup', handlePointerUp);
        window.removeEventListener('touchend', handlePointerUp);
      };
    }
  }, [activeCorner, handlePointerMove, handlePointerUp]);

  const handleApply = () => {
    // Map corners back to original image scale
    const originalScaleCorners = corners.map(c => ({
      x: c.x / displayScale.x,
      y: c.y / displayScale.y
    }));
    onApply(originalScaleCorners);
  };

  return (
    <div className="absolute inset-0 bg-black flex flex-col z-50">
      <div className="p-4 flex justify-between items-center bg-black/50 text-white absolute top-0 left-0 right-0 z-10">
        <Button variant="ghost" size="icon" onClick={onCancel} className="text-white hover:bg-white/20">
          <X className="w-6 h-6" />
        </Button>
        <span className="font-medium text-sm">Adjust Boundaries</span>
        <Button variant="ghost" size="icon" onClick={handleApply} className="text-primary hover:bg-primary/20">
          <Check className="w-6 h-6" />
        </Button>
      </div>
      
      <div 
        ref={containerRef} 
        className="flex-1 relative flex items-center justify-center overflow-hidden touch-none"
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handlePointerDown}
          onTouchStart={handlePointerDown}
          style={{ transform: `translate(${offset.x}px, ${offset.y}px)`, position: 'absolute', top: 0, left: 0 }}
          className="touch-none"
        />
        
        {/* Magnifier */}
        {activeCorner !== null && dragPos && (
          <div 
            className="absolute z-20 pointer-events-none rounded-full border-2 border-primary shadow-xl overflow-hidden bg-black flex items-center justify-center"
            style={{
              width: 120,
              height: 120,
              left: offset.x + dragPos.x - 60,
              top: Math.max(20, offset.y + dragPos.y - 150), // Position above finger
            }}
          >
            <div 
              className="absolute pointer-events-none"
              style={{
                width: canvasRef.current?.width || 0,
                height: canvasRef.current?.height || 0,
                transformOrigin: 'top left',
                transform: `scale(2) translate(${-(dragPos.x - 30)}px, ${-(dragPos.y - 30)}px)`,
              }}
            >
              <img src={imageSrc} className="w-full h-full" alt="magnified view" />
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                 <path 
                    d={`M ${corners[0].x} ${corners[0].y} L ${corners[1].x} ${corners[1].y} L ${corners[2].x} ${corners[2].y} L ${corners[3].x} ${corners[3].y} Z`} 
                    fill="rgba(0,0,0,0.5)" 
                    stroke="#0ea5e9" 
                    strokeWidth="1.5"
                    fillRule="evenodd"
                 />
                 {/* Crosshair */}
                 <circle cx={dragPos.x} cy={dragPos.y} r="4" fill="#0ea5e9" />
              </svg>
            </div>
            <div className="absolute inset-0 rounded-full border border-white/20 shadow-inner"></div>
            <div className="absolute left-1/2 top-1/2 w-8 h-8 -ml-4 -mt-4 border border-white/50 rounded-full"></div>
            <div className="absolute left-1/2 top-1/2 w-1 h-1 -ml-0.5 -mt-0.5 bg-primary rounded-full"></div>
          </div>
        )}
      </div>
      
      <div className="p-6 bg-black/80 text-white/70 text-center text-sm absolute bottom-0 left-0 right-0 pointer-events-none">
        Drag corners to adjust document boundaries
      </div>
    </div>
  );
}