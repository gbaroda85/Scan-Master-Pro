import { FilterType } from "./types";

export function applyFilter(
  canvas: HTMLCanvasElement,
  filter: FilterType,
  brightness = 0,
  contrast = 0
): void {
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  const bFactor = (brightness / 100) * 255;
  const cFactor = (contrast + 100) / 100;
  
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i], g = data[i+1], b = data[i+2];
    
    if (filter === 'grayscale' || filter === 'bw' || filter === 'magic') {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      
      if (filter === 'bw') {
        const threshold = gray > 128 ? 255 : 0;
        r = g = b = threshold;
      } else if (filter === 'grayscale') {
        r = g = b = gray;
      } else if (filter === 'magic') {
        // Enhance: boost contrast heavily, make bg white
        const enhanced = Math.min(255, Math.max(0, (gray - 128) * 1.8 + 170));
        r = g = b = enhanced;
      }
    }
    
    // Apply brightness and contrast
    r = Math.min(255, Math.max(0, (r - 128) * cFactor + 128 + bFactor));
    g = Math.min(255, Math.max(0, (g - 128) * cFactor + 128 + bFactor));
    b = Math.min(255, Math.max(0, (b - 128) * cFactor + 128 + bFactor));
    
    data[i] = r; data[i+1] = g; data[i+2] = b;
  }
  ctx.putImageData(imageData, 0, 0);
}