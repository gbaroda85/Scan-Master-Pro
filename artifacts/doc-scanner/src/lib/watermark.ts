import { WatermarkSettings, WatermarkPosition } from './types';

interface Align {
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  x: (w: number, m: number) => number;
  y: (h: number, m: number) => number;
}

const POSITIONS: Record<Exclude<WatermarkPosition, 'diagonal'>, Align> = {
  'top-left':    { textAlign: 'left',   textBaseline: 'top',    x: (_w, m) => m,       y: (_h, m) => m },
  'top-center':  { textAlign: 'center', textBaseline: 'top',    x: (w)     => w / 2,   y: (_h, m) => m },
  'top-right':   { textAlign: 'right',  textBaseline: 'top',    x: (w, m)  => w - m,   y: (_h, m) => m },
  'mid-left':    { textAlign: 'left',   textBaseline: 'middle', x: (_w, m) => m,       y: (h)     => h / 2 },
  'center':      { textAlign: 'center', textBaseline: 'middle', x: (w)     => w / 2,   y: (h)     => h / 2 },
  'mid-right':   { textAlign: 'right',  textBaseline: 'middle', x: (w, m)  => w - m,   y: (h)     => h / 2 },
  'bot-left':    { textAlign: 'left',   textBaseline: 'bottom', x: (_w, m) => m,       y: (h, m)  => h - m },
  'bot-center':  { textAlign: 'center', textBaseline: 'bottom', x: (w)     => w / 2,   y: (h, m)  => h - m },
  'bot-right':   { textAlign: 'right',  textBaseline: 'bottom', x: (w, m)  => w - m,   y: (h, m)  => h - m },
};

function drawWatermarkOnContext(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  settings: WatermarkSettings
) {
  const { text, position, color, opacity, fontSize, margin, angle } = settings;
  if (!text.trim()) return;

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, opacity / 100));
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.fillStyle = color;

  if (position === 'diagonal') {
    // Tile repeating watermark at 45° across entire canvas
    const rad = (-45 * Math.PI) / 180;
    const textW = ctx.measureText(text).width;
    const step = (textW + fontSize * 3);

    ctx.rotate(rad);
    // After rotation, cover the entire canvas area
    const diag = Math.ceil(Math.sqrt(w * w + h * h));
    for (let row = -diag; row < diag; row += fontSize * 3) {
      for (let col = -diag; col < diag * 2; col += step) {
        ctx.fillText(text, col, row);
      }
    }
  } else {
    const align = POSITIONS[position];
    const cx = align.x(w, margin);
    const cy = align.y(h, margin);
    ctx.textAlign = align.textAlign;
    ctx.textBaseline = align.textBaseline;
    ctx.translate(cx, cy);
    ctx.rotate((angle * Math.PI) / 180);
    // Subtle text shadow for readability
    ctx.shadowColor = color === '#ffffff' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)';
    ctx.shadowBlur = 3;
    ctx.fillText(text, 0, 0);
  }

  ctx.restore();
}

/** Apply watermark to a dataUrl and return the new dataUrl */
export async function applyWatermark(
  imageDataUrl: string,
  settings: WatermarkSettings
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      drawWatermarkOnContext(ctx, canvas.width, canvas.height, settings);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => reject(new Error('Failed to load image for watermark'));
    img.src = imageDataUrl;
  });
}

/** Draw a preview watermark on a small canvas element for live preview */
export function drawWatermarkPreview(
  canvas: HTMLCanvasElement,
  previewImageUrl: string,
  settings: WatermarkSettings,
  previewFontScale: number
) {
  const img = new Image();
  img.onload = () => {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Scale settings for the preview canvas size
    const scaled: WatermarkSettings = {
      ...settings,
      fontSize: Math.max(8, settings.fontSize * previewFontScale),
      margin: settings.margin * previewFontScale,
    };
    drawWatermarkOnContext(ctx, canvas.width, canvas.height, scaled);
  };
  img.src = previewImageUrl;
}
