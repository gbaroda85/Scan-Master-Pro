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

const CORNER_TOUCH_RADIUS = 28;
const CORNER_VISUAL_RADIUS = 10;

export function CropCanvas({ imageSrc, initialCorners, onApply, onCancel }: CropCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(new Image());

  const [corners, setCorners] = useState<Corner[]>(initialCorners);
  const [activeCorner, setActiveCorner] = useState<number | null>(null);
  const [displayScale, setDisplayScale] = useState({ x: 1, y: 1 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);

  const layoutRef = useRef<() => void>(() => {});

  // Load image and set up canvas, reserving space so it never sits under the header/footer bars
  useEffect(() => {
    const img = imgRef.current;

    const layout = () => {
      if (!containerRef.current || !canvasRef.current || !img.naturalWidth) return;

      const container = containerRef.current;
      const canvas = canvasRef.current;
      const headerH = headerRef.current?.offsetHeight ?? 0;
      const footerH = footerRef.current?.offsetHeight ?? 0;

      const cw = container.clientWidth;
      const chAvail = Math.max(container.clientHeight - headerH - footerH, 50);
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;

      const scale = Math.min(cw / iw, chAvail / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      const dpr = window.devicePixelRatio || 1;

      // High-resolution backing store so the preview is crisp on retina screens,
      // while CSS size stays at the (lower) display size.
      canvas.width = Math.round(dw * dpr);
      canvas.height = Math.round(dh * dpr);
      canvas.style.width = `${dw}px`;
      canvas.style.height = `${dh}px`;

      const ox = (cw - dw) / 2;
      const oy = headerH + (chAvail - dh) / 2;

      const prevScale = displayScale.x || 1;
      setDisplayScale({ x: scale, y: scale });
      setOffset({ x: ox, y: oy });

      // Re-scale existing corners proportionally when re-laying out (e.g. rotate/resize)
      setCorners((prev) => {
        if (prev.length !== 4) return prev;
        const ratio = scale / prevScale;
        return prev.map((c) => ({ x: c.x * ratio, y: c.y * ratio }));
      });
    };

    layoutRef.current = layout;

    img.src = imageSrc;
    img.onload = () => {
      if (initialCorners && initialCorners.length === 4) {
        // Corners come in at natural-image scale; convert once we know the scale in layout()
        const container = containerRef.current;
        if (container) {
          const headerH = headerRef.current?.offsetHeight ?? 0;
          const footerH = footerRef.current?.offsetHeight ?? 0;
          const cw = container.clientWidth;
          const chAvail = Math.max(container.clientHeight - headerH - footerH, 50);
          const scale = Math.min(cw / img.naturalWidth, chAvail / img.naturalHeight);
          setCorners(initialCorners.map((c) => ({ x: c.x * scale, y: c.y * scale })));
        }
      } else {
        setCorners([]);
      }
      layout();
    };

    window.addEventListener('resize', layout);
    window.addEventListener('orientationchange', layout);
    return () => {
      window.removeEventListener('resize', layout);
      window.removeEventListener('orientationchange', layout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageSrc, initialCorners]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || corners.length !== 4) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cssW = canvas.width / dpr;
    const cssH = canvas.height / dpr;

    ctx.clearRect(0, 0, cssW, cssH);

    // Draw original image (coordinates are in CSS pixel space thanks to the transform above)
    ctx.drawImage(imgRef.current, 0, 0, cssW, cssH);

    // Draw mask overlay outside the selection
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.rect(0, 0, cssW, cssH);
    ctx.moveTo(corners[0].x, corners[0].y);
    ctx.lineTo(corners[1].x, corners[1].y);
    ctx.lineTo(corners[2].x, corners[2].y);
    ctx.lineTo(corners[3].x, corners[3].y);
    ctx.closePath();
    ctx.fill('evenodd');

    // Draw connecting lines
    ctx.strokeStyle = '#7DA88B';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    ctx.lineTo(corners[1].x, corners[1].y);
    ctx.lineTo(corners[2].x, corners[2].y);
    ctx.lineTo(corners[3].x, corners[3].y);
    ctx.closePath();
    ctx.stroke();

    // Draw corners with a larger, more grabbable halo
    corners.forEach((corner, i) => {
      const isActive = i === activeCorner;

      // Outer halo (visual affordance for the touch target)
      ctx.beginPath();
      ctx.arc(corner.x, corner.y, isActive ? 24 : 18, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? 'rgba(125,168,139,0.35)' : 'rgba(255,255,255,0.25)';
      ctx.fill();

      // Inner solid dot
      ctx.beginPath();
      ctx.arc(corner.x, corner.y, isActive ? CORNER_VISUAL_RADIUS + 2 : CORNER_VISUAL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? '#ffffff' : '#7DA88B';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    });
  }, [corners, activeCorner]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const getEventPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();

    let clientX: number;
    let clientY: number;
    if ('touches' in e) {
      const touch = e.touches[0] ?? (e as TouchEvent).changedTouches?.[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = (e as React.MouseEvent | MouseEvent).clientX;
      clientY = (e as React.MouseEvent | MouseEvent).clientY;
    }

    // rect.width/height are CSS pixels, matching our CSS-space corner coordinates
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pos = getEventPos(e);

    let closestIdx = -1;
    let minDist = Infinity;

    corners.forEach((corner, i) => {
      const dist = Math.hypot(corner.x - pos.x, corner.y - pos.y);
      if (dist < minDist && dist < CORNER_TOUCH_RADIUS) {
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
    const cssW = parseFloat(canvasRef.current.style.width || '0');
    const cssH = parseFloat(canvasRef.current.style.height || '0');

    pos.x = Math.max(0, Math.min(pos.x, cssW));
    pos.y = Math.max(0, Math.min(pos.y, cssH));

    setCorners((prev) => {
      const next = [...prev];
      next[activeCorner] = pos;
      return next;
    });
    setDragPos(pos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCorner]);

  const handlePointerUp = useCallback(() => {
    setActiveCorner(null);
    setDragPos(null);
  }, []);

  useEffect(() => {
    if (activeCorner === null) return;
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
  }, [activeCorner, handlePointerMove, handlePointerUp]);

  const handleApply = () => {
    const originalScaleCorners = corners.map((c) => ({
      x: c.x / displayScale.x,
      y: c.y / displayScale.y,
    }));
    onApply(originalScaleCorners);
  };

  return (
    <div className="absolute inset-0 bg-black flex flex-col z-50">
      <div
        ref={headerRef}
        className="p-4 flex justify-between items-center bg-black/60 text-white absolute top-0 left-0 right-0 z-10"
      >
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
          style={{ position: 'absolute', top: 0, left: 0, transform: `translate(${offset.x}px, ${offset.y}px)` }}
          className="touch-none"
        />

        {/* Magnifier */}
        {activeCorner !== null && dragPos && canvasRef.current && (
          <div
            className="absolute z-20 pointer-events-none rounded-full border-2 border-primary shadow-xl overflow-hidden bg-black flex items-center justify-center"
            style={{
              width: 120,
              height: 120,
              left: offset.x + dragPos.x - 60,
              top: Math.max(20, offset.y + dragPos.y - 150),
            }}
          >
            <div
              className="absolute pointer-events-none"
              style={{
                width: parseFloat(canvasRef.current.style.width || '0'),
                height: parseFloat(canvasRef.current.style.height || '0'),
                transformOrigin: 'top left',
                transform: `scale(2) translate(${-(dragPos.x - 30)}px, ${-(dragPos.y - 30)}px)`,
              }}
            >
              <img src={imageSrc} className="w-full h-full" alt="magnified view" />
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <path
                  d={`M ${corners[0].x} ${corners[0].y} L ${corners[1].x} ${corners[1].y} L ${corners[2].x} ${corners[2].y} L ${corners[3].x} ${corners[3].y} Z`}
                  fill="rgba(0,0,0,0.5)"
                  stroke="#7DA88B"
                  strokeWidth="1.5"
                  fillRule="evenodd"
                />
                <circle cx={dragPos.x} cy={dragPos.y} r="4" fill="#7DA88B" />
              </svg>
            </div>
            <div className="absolute inset-0 rounded-full border border-white/20 shadow-inner"></div>
            <div className="absolute left-1/2 top-1/2 w-8 h-8 -ml-4 -mt-4 border border-white/50 rounded-full"></div>
            <div className="absolute left-1/2 top-1/2 w-1 h-1 -ml-0.5 -mt-0.5 bg-primary rounded-full"></div>
          </div>
        )}
      </div>

      <div
        ref={footerRef}
        className="p-4 bg-black/80 text-white/70 text-center text-xs absolute bottom-0 left-0 right-0 pointer-events-none"
      >
        Drag corners to adjust document boundaries
      </div>
    </div>
  );
}
