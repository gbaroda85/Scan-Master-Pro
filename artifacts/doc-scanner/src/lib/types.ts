export interface ScannedDocument {
  id: string;
  name: string;
  createdAt: number;
  pages: ScannedPage[];
  thumbnail: string;
  folder?: string;
  pinHash?: string;       // SHA-256 hex of the PIN (undefined = unlocked)
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

export type WatermarkPosition =
  | 'top-left' | 'top-center' | 'top-right'
  | 'mid-left' | 'center'    | 'mid-right'
  | 'bot-left' | 'bot-center'| 'bot-right'
  | 'diagonal';

export interface WatermarkSettings {
  text: string;
  position: WatermarkPosition;
  color: string;       // CSS color e.g. '#ff0000'
  opacity: number;     // 0–100
  fontSize: number;    // 12–120 px (on full-res canvas)
  margin: number;      // 0–200 px from edge
  angle: number;       // degrees, -180 to 180
}
