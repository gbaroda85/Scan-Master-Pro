import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { ScannedPage } from './types';

export async function exportToPDF(pages: ScannedPage[], filename = 'document.pdf'): Promise<void> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, H = 297;
  
  for (let i = 0; i < pages.length; i++) {
    if (i > 0) pdf.addPage();
    pdf.addImage(pages[i].filteredDataUrl, 'JPEG', 0, 0, W, H);
  }
  
  pdf.save(filename);
}

export async function generatePDFBlob(pages: ScannedPage[]): Promise<Blob> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, H = 297;
  
  for (let i = 0; i < pages.length; i++) {
    if (i > 0) pdf.addPage();
    pdf.addImage(pages[i].filteredDataUrl, 'JPEG', 0, 0, W, H);
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
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}