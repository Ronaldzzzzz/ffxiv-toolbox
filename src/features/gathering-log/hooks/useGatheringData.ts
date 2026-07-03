import { useState, useEffect } from 'react';
import { GatheringData, GatherType, SearchIndexEntry, SearchIndexNames } from '../types';
import { getAchievementExclusionReason } from '../utils';

function isCollectionOnlyItemName(item: any): boolean {
  const tw = typeof item?.tw === 'string' ? item.tw : '';
  const zh = typeof item?.zh === 'string' ? item.zh : '';
  const en = typeof item?.en === 'string' ? item.en : '';
  return tw.startsWith('收藏用') || zh.startsWith('收藏用') || en.startsWith('Rarefied');
}

function toSearchIndexNames(item: any): SearchIndexNames {
  const en = typeof item?.en === 'string' ? item.en : '';
  const tw = typeof item?.tw === 'string' ? item.tw : en;
  const zh = typeof item?.zh === 'string' ? item.zh : tw;
  const ja = typeof item?.ja === 'string' ? item.ja : en;

  return {
    tw,
    zh,
    en,
    ja,
  };
}

function normalizeNames(names: SearchIndexNames): SearchIndexNames {
  return {
    tw: names.tw.toLowerCase(),
    zh: names.zh.toLowerCase(),
    en: names.en.toLowerCase(),
    ja: names.ja.toLowerCase(),
  };
}

const AETHERIAL_REDUCTION_ITEM_NAMES = new Set<string>([
  'Fire Moraine', 'Lightning Moraine', 'Pot Marjoram', 'Granular Clay', 'Dravanian Bass', 'Manasail',
  'Bright Fire Rock', 'Bright Lightning Rock', 'Water Mint', 'Peat Moss', 'Caiman', 'Pteranodon', 'Pteranodon (Seafood)',
  'Radiant Fire Moraine', 'Radiant Lightning Moraine', 'Wild Sage', 'Humic Soil', 'Thaliak Caiman', 'Tupuxuara',
  'Radiant Astral Moraine', "Lover's Laurel", 'Rhodolite', 'Doman Yellow', 'False Scad', 'Schorl',
  'Countess Tea Leaves', 'Snow Crab', 'Dacite', 'Torreya Branch', 'Sweatfish', 'Yanxian Soil', 'Yanxian Verbena',
  'Gale Rock', 'White Clay', 'Voeburt Bichir', 'Solarite', 'Sweet Marjoram', 'Poecilia',
  'Shade Quartz', 'Bog Sage', 'Predator', 'Thunder Rock', 'Levin Mint', 'Fuchsia Bloom',
  'Lunar Quartz', 'Ewer Clay', 'Red Bowfin', 'Gilled Topknot', 'Ghostly Umbral Rock', 'Palm Chippings',
  'Eehs Forhnesh', 'Othardian Lumpsucker', 'Earthen Quartz', 'Sophora Roots', 'Verdigris Guppy', 'Nosceasaur',
  'Electrocoal', 'Goldbranch', 'Horned Frog', 'Shovelnose Catfish', 'Sunlit Prism', 'Brightwind Ore',
  'Volcanic Grass', 'Cleyran Carp', 'Longnose Gar', 'Calamus Root', 'Levin Quartz', 'Purple Palate',
]);

async function fetchAndBuildGatheringData(): Promise<GatheringData> {
  const [pages, items, icons, places, nodes, maps, aetherytes, recipeItemIds, satisfactionThresholds] = await Promise.all([
    fetch(`${import.meta.env.BASE_URL}data/gathering-log/gathering-log-pages.json`).then(res => res.json()),
    fetch(`${import.meta.env.BASE_URL}data/gathering-log/items.json`).then(res => res.json()),
    fetch(`${import.meta.env.BASE_URL}data/gathering-log/icons.json`).then(res => res.json()),
    fetch(`${import.meta.env.BASE_URL}data/gathering-log/places.json`).then(res => res.json()),
    fetch(`${import.meta.env.BASE_URL}data/gathering-log/nodes.json`).then(res => res.json()),
    fetch(`${import.meta.env.BASE_URL}data/gathering-log/maps.json`).then(res => res.json()),
    fetch(`${import.meta.env.BASE_URL}data/gathering-log/aetherytes.json`).then(res => res.json()),
    fetch(`${import.meta.env.BASE_URL}data/gathering-log/recipe-item-ids.json`).then(res => res.json()),
    fetch(`${import.meta.env.BASE_URL}data/gathering-log/satisfaction-thresholds.json`).then(res => res.json()),
  ]);

  // Annotate nodes in place (the parse result is owned by this loader)
  Object.entries(nodes).forEach(([key, node]: [string, any]) => {
    node.id = Number(key);
  });
  const processedNodes = nodes;

  const handbookItemIds = new Set<string>();
  for (const jobPages of pages as any[]) {
    for (const page of jobPages || []) {
      for (const entry of page.items || []) {
        handbookItemIds.add(String(entry.itemId));
      }
    }
  }

  const gatherableItemIds = new Set<string>();
  for (const node of Object.values(processedNodes) as any[]) {
    const candidateIds = [...(node.items || []), ...(node.hiddenItems || [])];
    candidateIds.forEach((id: number | string) => gatherableItemIds.add(String(id)));
  }

  const customDeliveryIds = new Set<string>(
    Object.keys(satisfactionThresholds || {}).filter(
      id => handbookItemIds.has(id) && gatherableItemIds.has(id)
    )
  );

  const collectionOnlyIds = new Set<string>(
    Array.from(gatherableItemIds).filter(id => {
      const item = items[id];
      if (!item || customDeliveryIds.has(id)) return false;
      return isCollectionOnlyItemName(item);
    })
  );

  // Annotate special items in place instead of cloning all ~52k entries.
  // Branch priority mirrors the original clone-based logic:
  // custom delivery > collection-only > aetherial reduction > exclusion-only.
  Object.entries(items).forEach(([id, item]: [string, any]) => {
    if (!item || typeof item !== 'object') return;

    const isCustomDelivery = customDeliveryIds.has(id);
    const achievementExclusionReason = getAchievementExclusionReason(Number(id), isCustomDelivery);

    if (isCustomDelivery) {
      item.isCustomDelivery = true;
      item.isCollectible = true;
      item.collectibleType = 'general';
    } else if (collectionOnlyIds.has(id)) {
      item.isCollectible = true;
      item.collectibleType = 'collection-only';
    } else if (AETHERIAL_REDUCTION_ITEM_NAMES.has(typeof item.en === 'string' ? item.en : '')) {
      item.isCollectible = true;
      item.collectibleType = 'general';
      item.isAetherialReduction = true;
    }

    if (achievementExclusionReason) {
      item.isAchievementExcluded = true;
      item.achievementExclusionReason = achievementExclusionReason;
    }
  });
  const processedItems = items;

  // ── Pre-index: O(nodes) 建立，供各元件 O(1) 查詢 ──────────────────────
  const nodesByItemId: Record<number, typeof processedNodes[string][]> = {};
  const timedNodesByItemId: Record<number, typeof processedNodes[string][]> = {};

  Object.values(processedNodes).forEach((node: any) => {
    const allItemIds: number[] = [
      ...(node.items || []),
      ...(node.hiddenItems || []),
    ];
    const isTimed =
      Array.isArray(node.spawns) && node.spawns.length > 0 && node.map !== 0;

    allItemIds.forEach((id: number) => {
      if (!nodesByItemId[id]) nodesByItemId[id] = [];
      nodesByItemId[id].push(node);

      if (isTimed) {
        if (!timedNodesByItemId[id]) timedNodesByItemId[id] = [];
        timedNodesByItemId[id].push(node);
      }
    });
  });

  const pageTypeByItemId: Record<number, GatherType> = {};
  const pageGatherTypes: GatherType[] = ['mining', 'quarrying', 'logging', 'harvesting'];
  (pages as any[][]).forEach((typePages: any[], typeIndex: number) => {
    typePages.forEach((page: any) => {
      (page.items || []).forEach((entry: any) => {
        const itemId = Number(entry.itemId);
        if (!(itemId in pageTypeByItemId)) {
          pageTypeByItemId[itemId] = pageGatherTypes[typeIndex];
        }
      });
    });
  });
  // ──────────────────────────────────────────────────────────────────────

  const types: GatherType[] = ['mining', 'quarrying', 'logging', 'harvesting'];
  const searchEntries: SearchIndexEntry[] = [];
  const addedItems = new Set<number>();

  types.forEach((type, typeIndex) => {
    const typePages = pages[typeIndex] || [];
    typePages.forEach((page: any) => {
      page.items.forEach((entry: any) => {
        const itemId = Number(entry.itemId);
        if (addedItems.has(itemId)) return;

        const itemInfo = processedItems[itemId];
        if (!itemInfo) return;

        const names = toSearchIndexNames(itemInfo);
        searchEntries.push({
          id: itemId,
          level: entry.lvl || 0,
          type,
          isRecipe: false,
          icon: icons[itemId] || '',
          names,
          normalizedNames: normalizeNames(names),
        });

        addedItems.add(itemId);
      });
    });
  });

  const nodeTypeMap: Record<number, GatherType> = {
    0: 'mining',
    1: 'quarrying',
    2: 'logging',
    3: 'harvesting',
  };

  Object.values(processedNodes).forEach((node: any) => {
    const type = nodeTypeMap[node.type];
    if (!type) return;

    const candidateIds = [...(node.items || []), ...(node.hiddenItems || [])];
    candidateIds.forEach((id: number | string) => {
      const itemId = Number(id);
      if (addedItems.has(itemId)) return;

      const itemInfo = processedItems[itemId];
      if (!itemInfo) return;

      const names = toSearchIndexNames(itemInfo);
      searchEntries.push({
        id: itemId,
        level: node.level || 0,
        type,
        isRecipe: false,
        icon: icons[itemId] || '',
        names,
        normalizedNames: normalizeNames(names),
      });

      addedItems.add(itemId);
    });
  });

  // Craftable-only items (searchable, resolved via the derived recipe id list;
  // the full recipes-per-item.json is lazy-loaded by useRecipes on demand)
  (recipeItemIds as number[]).forEach(itemId => {
    if (addedItems.has(itemId)) return;

    const itemInfo = processedItems[itemId];
    if (!itemInfo) return;

    const names = toSearchIndexNames(itemInfo);
    searchEntries.push({
      id: itemId,
      level: 0,
      type: 'mining',
      isRecipe: true,
      icon: icons[itemId] || '',
      names,
      normalizedNames: normalizeNames(names),
    });

    addedItems.add(itemId);
  });

  return {
    pages,
    items: processedItems,
    icons,
    places,
    nodes: processedNodes,
    maps,
    aetherytes,
    recipes: null,
    preIndex: {
      searchEntries,
      nodesByItemId,
      timedNodesByItemId,
      pageTypeByItemId,
    },
  };
}

// Module-level cache: survives route round-trips and StrictMode double effects,
// so the ~19MB dataset is fetched and indexed at most once per session.
let gatheringDataPromise: Promise<GatheringData> | null = null;

export function loadGatheringData(): Promise<GatheringData> {
  if (!gatheringDataPromise) {
    gatheringDataPromise = fetchAndBuildGatheringData().catch(err => {
      gatheringDataPromise = null; // allow retry after a failed load
      throw err;
    });
  }
  return gatheringDataPromise;
}

export function resetGatheringDataCache() {
  gatheringDataPromise = null;
}

export function useGatheringData() {
  const [data, setData] = useState<GatheringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadGatheringData()
      .then(result => {
        if (!cancelled) setData(result);
      })
      .catch(err => {
        if (!cancelled) setError(err as Error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
