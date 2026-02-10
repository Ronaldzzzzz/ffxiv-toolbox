export type JobType = 'miner' | 'botanist';
export type GatherType = 'mining' | 'quarrying' | 'logging' | 'harvesting';
export type ViewMode = 'level' | 'timed' | 'map';

export interface LocalizedText {
  en: string;
  ja: string;
  tw: string;
  zh?: string;
  de?: string;
  fr?: string;
}

export interface GatheringItemEntry {
  itemId: number;
  ilvl: number;
  lvl: number;
  stars: number;
  hidden: number;
}

export interface GatheringLogPageData {
  id: number;
  startLevel: number;
  items: GatheringItemEntry[];
}

export interface NodeData {
  id: string;
  map: number;
  x: number;
  y: number;
  level: number;
  type: number;
  items: number[];
  spawns?: number[];
  duration?: number;
  limited?: number;
  folklore?: number;
  zoneid?: number;
}

export interface PlaceData extends LocalizedText {}

export interface MapData {
  image: string;
  region_id: number;
  placename_id: number;
  size_factor: number;
}

export interface Aetheryte {
  id: number;
  zoneid: number;
  map: number;
  x: number;
  y: number;
  z: number;
  type: number;
  nameid: number;
}

export interface GatheringData {
  pages: GatheringLogPageData[][];
  items: Record<string, LocalizedText>;
  icons: Record<string, string>;
  places: Record<string, PlaceData>;
  nodes: Record<string, NodeData>;
  maps: Record<string, MapData>;
  aetherytes: Aetheryte[];
  uiLocales: Record<string, Record<string, string>>;
}
