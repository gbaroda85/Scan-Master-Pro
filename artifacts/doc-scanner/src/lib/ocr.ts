import Tesseract from 'tesseract.js';

export async function runOCR(
  canvas: HTMLCanvasElement,
  onProgress: (pct: number) => void
): Promise<string> {
  const { data } = await Tesseract.recognize(canvas, 'eng', {
    logger: (m) => { if (m.status === 'recognizing text') onProgress(m.progress * 100); }
  });
  return data.text;
}