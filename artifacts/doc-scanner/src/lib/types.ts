export interface ScannedDocument {
  id: string;
  name: string;
  createdAt: number;
  pages: ScannedPage[];
  thumbnail: string;
  folder?: string;
}

export type FilterType = 'original' | 'photo' | 'bw' | 'document' | 'magic';

export interface ScannedPage {
  id: string;
  originalDataUrl: string;
  croppedDataUrl: string;
  filteredDataUrl: string;
  filter: FilterType;
  brightness: number;
  contrast: number;
  rotation: number;
  corners: Corner[];
}

export interface Corner {
  x: number;
  y: number;
}
