import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { ScannedPage } from './types';

const A4_PORTRAIT_W = 210;
const A4_PORTRAIT_H = 297;
const A4_LANDSCAPE_W = 297;
const A4_LANDSCAPE_H = 210;

/** Safely converts a data URL to a Blob without using fetch() */
function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(',');
  const mime = meta.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function generatePDFBlob(pages: ScannedPage[]): Promise<Blob> {
  const firstDims = await getImageDimensions(pages[0].filteredDataUrl);
  const firstIsLandscape = firstDims.width > firstDims.height;

  const pdf = new jsPDF({
    orientation: firstIsLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  for (let i = 0; i < pages.length; i++) {
    const dims = await getImageDimensions(pages[i].filteredDataUrl);
    const isLandscape = dims.width > dims.height;

    if (i > 0) {
      pdf.addPage('a4', isLandscape ? 'landscape' : 'portrait');
    }

    const W = isLandscape ? A4_LANDSCAPE_W : A4_PORTRAIT_W;
    const H = isLandscape ? A4_LANDSCAPE_H : A4_PORTRAIT_H;

    // Fit image to page preserving aspect ratio
    const imgRatio = dims.width / dims.height;
    const pageRatio = W / H;
    let imgW = W;
    let imgH = H;
    if (imgRatio > pageRatio) {
      imgH = W / imgRatio;
    } else {
      imgW = H * imgRatio;
    }
    const offsetX = (W - imgW) / 2;
    const offsetY = (H - imgH) / 2;

    pdf.addImage(pages[i].filteredDataUrl, 'JPEG', offsetX, offsetY, imgW, imgH);
  }

  return pdf.output('blob');
}

export async function exportToPDF(pages: ScannedPage[], filename = 'document.pdf'): Promise<void> {
  const blob = await generatePDFBlob(pages);
  triggerDownload(blob, filename);
}

export async function exportToZip(pages: ScannedPage[], filename = 'scans.zip'): Promise<void> {
  const zip = new JSZip();
  pages.forEach((page, i) => {
    const base64 = page.filteredDataUrl.split(',')[1];
    zip.file(`page_${i + 1}.jpg`, base64, { base64: true });
  });
  const blob = await zip.generateAsync({ type: 'blob' });
  triggerDownload(blob, filename);
}

/** Share PDF via Web Share API, download as fallback */
export async function sharePDF(pages: ScannedPage[], docName: string): Promise<void> {
  const blob = await generatePDFBlob(pages);
  const file = new File([blob], `${docName}.pdf`, { type: 'application/pdf' });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: docName });
      return;
    }
  } catch {
    // fall through to download
  }
  triggerDownload(blob, `${docName}.pdf`);
}

/** Share images via Web Share API, download individually as fallback */
export async function shareAsImages(pages: ScannedPage[], docName: string): Promise<void> {
  // Convert data URLs using atob — never use fetch() on data URLs
  const files = pages.map((page, i) => {
    const blob = dataUrlToBlob(page.filteredDataUrl);
    return new File([blob], `${docName}_page_${i + 1}.jpg`, { type: 'image/jpeg' });
  });

  try {
    if (navigator.canShare?.({ files })) {
      await navigator.share({ files, title: docName });
      return;
    }
  } catch {
    // fall through to download
  }

  // Fallback: download each file one by one
  for (const file of files) {
    triggerDownload(file, file.name);
    await new Promise((r) => setTimeout(r, 300));
  }
}
