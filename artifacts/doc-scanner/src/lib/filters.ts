export type FilterType = 'original' | 'photo' | 'bw' | 'document' | 'magic';

export interface Point {
  x: number;
  y: number;
}

export async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

export async function applyFilter(
  imageSrc: string,
  filterType: FilterType,
  options: {
    rotation?: number;
    brightness?: number;
    contrast?: number;
  } = {}
): Promise<string> {
  const img = await loadImage(imageSrc);
  if (img.width === 0 || img.height === 0) {
    throw new Error('Source image dimensions are zero');
  }

  const rot = options.rotation || 0;
  const br = options.brightness !== undefined ? options.brightness : 100;
  const cr = options.contrast !== undefined ? options.contrast : 100;

  const rotCanvas = document.createElement('canvas');
  if (rot === 90 || rot === 270) {
    rotCanvas.width = img.height;
    rotCanvas.height = img.width;
  } else {
    rotCanvas.width = img.width;
    rotCanvas.height = img.height;
  }
  const rotCtx = rotCanvas.getContext('2d')!;
  rotCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
  rotCtx.rotate((rot * Math.PI) / 180);
  rotCtx.drawImage(img, -img.width / 2, -img.height / 2);

  const adjCanvas = document.createElement('canvas');
  adjCanvas.width = rotCanvas.width;
  adjCanvas.height = rotCanvas.height;
  const adjCtx = adjCanvas.getContext('2d')!;
  adjCtx.filter = `brightness(${br}%) contrast(${cr}%)`;
  adjCtx.drawImage(rotCanvas, 0, 0);

  if (filterType === 'original') {
    return adjCanvas.toDataURL('image/jpeg', 0.9);
  }

  if (filterType === 'photo') {
    const photoCanvas = document.createElement('canvas');
    photoCanvas.width = adjCanvas.width;
    photoCanvas.height = adjCanvas.height;
    const photoCtx = photoCanvas.getContext('2d')!;
    photoCtx.filter = 'saturate(1.2) contrast(1.1)';
    photoCtx.drawImage(adjCanvas, 0, 0);
    return photoCanvas.toDataURL('image/jpeg', 0.9);
  }

  const scale = 0.1;
  const smallW = Math.max(1, Math.floor(adjCanvas.width * scale));
  const smallH = Math.max(1, Math.floor(adjCanvas.height * scale));

  const smallCanvas = document.createElement('canvas');
  smallCanvas.width = smallW;
  smallCanvas.height = smallH;
  const smallCtx = smallCanvas.getContext('2d')!;

  smallCtx.filter = 'blur(4px)';
  smallCtx.drawImage(adjCanvas, 0, 0, smallW, smallH);

  smallCtx.globalCompositeOperation = 'difference';
  smallCtx.fillStyle = 'white';
  smallCtx.fillRect(0, 0, smallW, smallH);

  const normalizedCanvas = document.createElement('canvas');
  normalizedCanvas.width = adjCanvas.width;
  normalizedCanvas.height = adjCanvas.height;
  const normCtx = normalizedCanvas.getContext('2d')!;

  normCtx.drawImage(adjCanvas, 0, 0);
  normCtx.globalCompositeOperation = 'color-dodge';
  normCtx.imageSmoothingEnabled = true;
  normCtx.imageSmoothingQuality = 'high';
  normCtx.drawImage(smallCanvas, 0, 0, smallW, smallH, 0, 0, adjCanvas.width, adjCanvas.height);

  const imageData = normCtx.getImageData(0, 0, adjCanvas.width, adjCanvas.height);
  const data = imageData.data;

  let blackPoint = 120;
  let whitePoint = 230;

  if (filterType === 'magic') {
    blackPoint = 60;
    whitePoint = 245;
  } else if (filterType === 'bw') {
    blackPoint = 140;
    whitePoint = 220;
  }

  const range = whitePoint - blackPoint;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    const lum = r * 0.299 + g * 0.587 + b * 0.114;

    if (filterType === 'bw') {
      let v = 0;
      if (lum < blackPoint) v = 0;
      else if (lum > whitePoint) v = 255;
      else v = ((lum - blackPoint) * 255) / range;

      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
    } else {
      let s = 1;
      if (lum < blackPoint) {
        s = 0;
      } else if (lum > whitePoint) {
        s = 255 / lum;
      } else {
        s = ((lum - blackPoint) * 255) / range / lum;
      }

      const satBoost = filterType === 'magic' ? 1.5 : 1.1;

      r = (r - lum) * satBoost + lum * s;
      g = (g - lum) * satBoost + lum * s;
      b = (b - lum) * satBoost + lum * s;

      data[i] = Math.min(255, Math.max(0, r));
      data[i + 1] = Math.min(255, Math.max(0, g));
      data[i + 2] = Math.min(255, Math.max(0, b));
    }
  }

  normCtx.putImageData(imageData, 0, 0);
  return normalizedCanvas.toDataURL('image/jpeg', 0.9);
}
