import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { ScannedPage } from './types';

// A4 dimensions in mm
const A4_PORTRAIT_W = 210;
const A4_PORTRAIT_H = 297;
const A4_LANDSCAPE_W = 297;
const A4_LANDSCAPE_H = 210;

function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

export async function exportToPDF(pages: ScannedPage[], filename = 'document.pdf'): Promise<void> {
  const blob = await generatePDFBlob(pages);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function generatePDFBlob(pages: ScannedPage[]): Promise<Blob> {
  // Use the first page's orientation to initialise the PDF
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

    // Scale image to fill the page while maintaining aspect ratio
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

export async function exportToZip(pages: ScannedPage[], filename = 'scans.zip'): Promise<void> {
  const zip = new JSZip();
  pages.forEach((page, i) => {
    const base64 = page.filteredDataUrl.split(',')[1];
    zip.file(`page_${i + 1}.jpg`, base64, { base64: true });
  });
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function shareAsImages(pages: ScannedPage[], docName: string): Promise<void> {
  const files: File[] = await Promise.all(
    pages.map(async (page, i) => {
      const res = await fetch(page.filteredDataUrl);
      const blob = await res.blob();
      return new File([blob], `${docName}_page_${i + 1}.jpg`, { type: 'image/jpeg' });
    })
  );

  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files })) {
    await navigator.share({ files, title: docName });
  } else {
    // Fallback: download each image individually
    for (const file of files) {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
      await new Promise((r) => setTimeout(r, 200));
    }
  }
}

export async function downloadSingleImage(page: ScannedPage, name: string): Promise<void> {
  const a = document.createElement('a');
  a.href = page.filteredDataUrl;
  a.download = `${name}.jpg`;
  a.click();
}
