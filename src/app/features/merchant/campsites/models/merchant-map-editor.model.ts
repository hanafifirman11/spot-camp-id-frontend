import Konva from 'konva';

export interface UploadBackgroundResponse {
  url?: string;
  message?: string;
}

export interface MapSummary {
  id?: number;
  mapCode?: string;
  mapName?: string;
  productIds?: number[];
  imageWidth?: number;
  imageHeight?: number;
  backgroundImageUrl?: string;
}

export interface SpotShape {
  polygon: Konva.Line;
  label?: Konva.Text;
}

export interface StagePoint {
  x: number;
  y: number;
}
