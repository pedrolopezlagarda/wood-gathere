export type AppView = 'map' | 'pixel';

export type LayerType = 'ground' | 'objects' | 'shadows' | 'lighting';

export interface LightSource {
  id: string;
  x: number;
  y: number;
  radius: number;
  intensity: number;
  color: string;
  pulse?: boolean;
}

export interface TileData {
  type: string;
  mask: number; // For autotiling
  imageUrl?: string; // Support for custom PNGs
  variant?: 'rounded' | 'square' | 'inner' | 'outer';
  frameCount?: number; // For animated tiles
  sway?: boolean; // For wind sway animation
}

export interface Layer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  data: (TileData | null)[][];
  groupId?: string;
}

export interface MapData {
  width: number; // in pixels
  height: number; // in pixels
  tileSize: number;
  layers: Layer[];
  lights?: LightSource[];
  ambientLight?: {
    color: string;
    intensity: number;
  };
  tileGroups?: Record<string, { name: string; tiles: string[] }>;
  tileMetadata?: Record<string, { priority: number; role?: string; frameCount?: number; hasShadow?: boolean }>;
}

export interface EditorConfig {
  activeLayerId: string;
  selectedTile: string;
  showGrid: boolean;
  cornerStyle: 'rounded' | 'square';
  tileSize: number;
}

export interface TileLibrary {
  id: string;
  name: string;
  groups: Record<string, { name: string; tiles: string[]; priority: number }>;
  tiles: Record<string, string>;
  metadata: Record<string, { priority: number; role?: string; hasShadow?: boolean }>;
}
