/**
 * iconRegistry.ts
 * Single source of truth for all XIVAPI icon URLs used in the gathering-log feature.
 * - Static UI icons: defined as constants here.
 * - Dynamic item icons: composed via getItemIconUrl() using data.icons[itemId].
 */

export const XIVAPI_BASE = 'https://xivapi.com';
export const XIVAPI_V2_BASE = 'https://v2.xivapi.com';

// Profession tab icons (used in type selectors)
export const GATHERING_ICONS = {
  folklore: `${XIVAPI_BASE}/i/026000/026168_hr1.png`,
  mining: `${XIVAPI_BASE}/i/062000/062201_hr1.png`,
  quarrying: `${XIVAPI_BASE}/i/062000/062202_hr1.png`,
  logging: `${XIVAPI_BASE}/i/062000/062203_hr1.png`,
  harvesting: `${XIVAPI_BASE}/i/062000/062204_hr1.png`,
};

// Icons shown as node-type overlays in timed / map views
export const TIMED_GATHERING_MAP_ICONS = {
  mining: `${XIVAPI_BASE}/i/060000/060464_hr1.png`,
  quarrying: `${XIVAPI_BASE}/i/060000/060463_hr1.png`,
  logging: `${XIVAPI_BASE}/i/060000/060462_hr1.png`,
  harvesting: `${XIVAPI_BASE}/i/060000/060461_hr1.png`,
};

// Icons shown as map-pin markers in MapView
export const GATHERING_MAP_ICONS = {
  mining: `${XIVAPI_BASE}/i/060000/060438_hr1.png`,
  quarrying: `${XIVAPI_BASE}/i/060000/060437_hr1.png`,
  logging: `${XIVAPI_BASE}/i/060000/060433_hr1.png`,
  harvesting: `${XIVAPI_BASE}/i/060000/060432_hr1.png`,
};

// Semantic UI icons (not tied to any item id)
export const UI_ICON_URLS = {
  defaultItem: `${XIVAPI_BASE}/i/066000/066313_hr1.png`,
  collectible: `${XIVAPI_BASE}/i/066000/066472_hr1.png`,
  customDelivery: `${XIVAPI_BASE}/i/061000/061827_hr1.png`,
  aetheryteMain: `${XIVAPI_BASE}/i/060000/060453_hr1.png`,
  aetheryteSub: `${XIVAPI_BASE}/i/060000/060430_hr1.png`,
  jobMiner: `${XIVAPI_BASE}/cj/companion/miner.png`,
  jobBotanist: `${XIVAPI_BASE}/cj/companion/botanist.png`,
};

/**
 * Compose a full item icon URL from the icons data record.
 * Falls back to the generic item icon when no path is found.
 */
export function getItemIconUrl(itemId: number, icons: Record<number, string>): string {
  const iconPath = icons[itemId];
  if (!iconPath) return UI_ICON_URLS.defaultItem;
  // Teamcraft switched to XIVAPI v2 paths (/api/asset?path=...) — use v2 base
  const base = iconPath.startsWith('/api/asset?') ? XIVAPI_V2_BASE : XIVAPI_BASE;
  return `${base}${iconPath}`;
}

/**
 * Compose a full map image URL from a raw path or map id.
 * Handles cases where the path may already be a full URL.
 */
export function getMapImageUrl(mapId: string, imagePath?: string): string {
  if (imagePath) {
    if (imagePath.includes('xivapi.com')) return imagePath;
    return `${XIVAPI_BASE}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
  }
  return `${XIVAPI_BASE}/m/${mapId}/${mapId}.00.jpg`;
}
