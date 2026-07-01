export interface ScannedDocument {
  id: string;           // uuid
  name: string;
  createdAt: number;
  pages: ScannedPage[];
  thumbnail: string;    // base64 dataURL of first page
}

export type FilterType = 'original' | 'magic' | 'bw' | 'grayscale';

export interface ScannedPage {
  id: string;
  originalDataUrl: string;   // raw captured image
  croppedDataUrl: string;    // after perspective transform
  filteredDataUrl: string;   // after filter applied
  filter: FilterType;
  brightness: number;        // -100 to 100
  contrast: number;          // -100 to 100
  corners: Corner[];         // the 4 detected/adjusted corners
}

export interface Corner {
  x: number;
  y: number;
}
