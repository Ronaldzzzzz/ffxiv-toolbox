export type JobType = 'miner' | 'botanist';
export type GatherType = 'mining' | 'quarrying' | 'logging' | 'harvesting';
export type ViewMode = 'level' | 'timed' | 'map' | 'bookmark';
export type AlarmTimeMode = 'et' | 'lt';

export const BOOKMARK_STATE_VERSION = 2;

export interface BookmarkGroup {
  id: string;
  name: string;
  itemIds: number[];
  collapsed?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BookmarkState {
  version: typeof BOOKMARK_STATE_VERSION;
  groups: BookmarkGroup[];
  ungroupedItemIds: number[];
}

export interface AlarmState {
  globalEnabled: boolean;
  soundEnabled: boolean;
  soundType: number;
  localLeadTimeMinutes: number;
  macroLeadTimeMinutes: number;
  macroTimeMode: AlarmTimeMode;
  macroRepeat: boolean;
  trackedItemIds: number[];
}

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
  isAetherialReduction?: boolean;
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

export interface SearchIndexNames {
  tw: string;
  zh: string;
  en: string;
  ja: string;
}

export interface SearchIndexEntry {
  id: number;
  level: number;
  type: GatherType;
  isRecipe: boolean;
  icon: string;
  names: SearchIndexNames;
  normalizedNames: SearchIndexNames;
}

export interface GatheringPreIndex {
  searchEntries: SearchIndexEntry[];
  /** 每個 itemId 對應的所有採集節點（含 hiddenItems） */
  nodesByItemId: Record<number, NodeData[]>;
  /** 每個 itemId 對應的限時節點（含 hiddenItems；spawns 非空且 map !== 0） */
  timedNodesByItemId: Record<number, NodeData[]>;
  /** 每個 itemId 在手冊中所屬的採集類型（依 pages 資料決定） */
  pageTypeByItemId: Record<number, GatherType>;
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
  preIndex?: GatheringPreIndex;
}
