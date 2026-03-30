export type JobType = 'miner' | 'botanist';
export type GatherType = 'mining' | 'quarrying' | 'logging' | 'harvesting';
export type ViewMode = 'level' | 'timed' | 'map' | 'bookmark';

export interface LocalizedText {
  en: string;
  ja: string;
  tw: string;
  zh?: string;
  de?: string;
  fr?: string;
  isCollectible?: boolean;
  collectibleType?: 'general' | 'collection-only';
  isCustomDelivery?: boolean;
  isAchievementExcluded?: boolean;
  achievementExclusionReason?: 'crystal-related' | 'pigment' | 'grade-1-carbonized-matter' | 'custom-delivery' | 'manual-special-case';
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
  hiddenItems?: number[];
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

export interface RecipeIngredient {
  id: number;
  amount: number;
  quality?: number;
}

export interface Recipe {
  id: number;
  job: number;
  level: number;
  yields: number;
  ingredients: RecipeIngredient[];
}

export interface GatheringData {
  pages: GatheringLogPageData[][];
  items: Record<string, LocalizedText>;
  icons: Record<string, string>;
  places: Record<string, PlaceData>;
  nodes: Record<string, NodeData>;
  maps: Record<string, MapData>;
  aetherytes: Aetheryte[];
  recipes: Record<string, Recipe[]>;
}
