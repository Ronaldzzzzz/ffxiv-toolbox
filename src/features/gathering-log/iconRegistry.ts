/**
 * iconRegistry.ts
 * Single source of truth for all XIVAPI icon URLs used in the gathering-log feature.
 * - Static UI icons: defined as constants here.
 * - Dynamic item icons: composed via getItemIconUrl() using data.icons[itemId].
 */

export const XIVAPI_BASE = 'https://xivapi.com';
export const XIVAPI_V2_BASE = 'https://v2.xivapi.com';

// Rebuilds a v2 "ui/icon" asset URL from a bare icon number, e.g. 62201 -> .../062000/062201_hr1.tex
function iconNumberToV2Url(iconId: number): string {
  const folder = String(Math.floor(iconId / 1000) * 1000).padStart(6, '0');
  const file = String(iconId).padStart(6, '0');
  return `${XIVAPI_V2_BASE}/api/asset?path=ui/icon/${folder}/${file}_hr1.tex&format=png`;
}

// Profession tab icons (used in type selectors)
export const GATHERING_ICONS = {
  folklore: iconNumberToV2Url(26168),
  mining: iconNumberToV2Url(62201),
  quarrying: iconNumberToV2Url(62202),
  logging: iconNumberToV2Url(62203),
  harvesting: iconNumberToV2Url(62204),
};

// Icons shown as node-type overlays in timed / map views
export const TIMED_GATHERING_MAP_ICONS = {
  mining: iconNumberToV2Url(60464),
  quarrying: iconNumberToV2Url(60463),
  logging: iconNumberToV2Url(60462),
  harvesting: iconNumberToV2Url(60461),
};

// Icons shown as map-pin markers in MapView
export const GATHERING_MAP_ICONS = {
  mining: iconNumberToV2Url(60438),
  quarrying: iconNumberToV2Url(60437),
  logging: iconNumberToV2Url(60433),
  harvesting: iconNumberToV2Url(60432),
};

// Semantic UI icons (not tied to any item id)
export const UI_ICON_URLS = {
  defaultItem: iconNumberToV2Url(66313),
  collectible: iconNumberToV2Url(66472),
  customDelivery: iconNumberToV2Url(61827),
  aetheryteMain: iconNumberToV2Url(60453),
  aetheryteSub: iconNumberToV2Url(60430),
  // "/cj/companion/*" is a v1-only XIVAPI convenience route (curated companion
  // portraits, not a raw game asset path) — there is no v2 equivalent, so this
  // intentionally stays on XIVAPI_BASE.
  jobMiner: `${XIVAPI_BASE}/cj/companion/miner.png`,
  jobBotanist: `${XIVAPI_BASE}/cj/companion/botanist.png`,
};

/**
 * Compose a full item icon URL from the icons data record.
 * Falls back to the generic item icon when no path is found.
 * Optimized data (scripts/optimize_data.cjs) stores the bare icon number;
 * legacy string paths (v1 "/i/..." and v2 "/api/asset?...") are still handled.
 */
export function getItemIconUrl(itemId: number, icons: Record<number, string | number>): string {
  const iconPath = icons[itemId];
  if (!iconPath) return UI_ICON_URLS.defaultItem;
  if (typeof iconPath === 'number') {
    return iconNumberToV2Url(iconPath);
  }
  // Teamcraft switched to XIVAPI v2 paths (/api/asset?path=...) — use v2 base
  const base = iconPath.startsWith('/api/asset?') ? XIVAPI_V2_BASE : XIVAPI_BASE;
  return `${base}${iconPath}`;
}

// Matches the legacy "/m/{shortId}/{shortId}.{variant}.jpg" map image path,
// regardless of which host (xivapi.com or v2.xivapi.com) it's prefixed with.
const LEGACY_MAP_PATH = /\/m\/([^/]+)\/[^/]+\.(\d+)\.\w+$/i;

/**
 * Compose a full map image URL from a raw path or map id.
 * Teamcraft's upstream maps.json still emits the legacy v1 path shape
 * ("/m/{shortId}/{shortId}.{variant}.jpg"), sometimes even prefixed with the
 * v2.xivapi.com host — but XIVAPI v2 only serves map images via
 * /api/asset/map/{shortId}/{variant}, so the legacy shape 404s there. Rewrite
 * any recognized legacy shape into the working v2 endpoint.
 */
export function getMapImageUrl(mapId: string | number, imagePath?: string): string {
  if (imagePath) {
    const legacyMatch = imagePath.match(LEGACY_MAP_PATH);
    if (legacyMatch) {
      const [, shortId, variant] = legacyMatch;
      return `${XIVAPI_V2_BASE}/api/asset/map/${shortId}/${variant}`;
    }
    if (imagePath.includes('xivapi.com')) return imagePath;
    return `${XIVAPI_BASE}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
  }
  // No shortId available to build a v2 asset URL from a bare numeric map id;
  // this branch is unreachable for well-formed data (maps.json always has an image).
  return `${XIVAPI_BASE}/m/${mapId}/${mapId}.00.jpg`;
}
