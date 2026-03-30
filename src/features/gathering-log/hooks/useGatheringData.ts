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

export function useGatheringData() {
  const [data, setData] = useState<GatheringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [pages, items, icons, places, nodes, maps, aetherytes, recipes, satisfactionThresholds] = await Promise.all([
          fetch(`${import.meta.env.BASE_URL}data/gathering-log/gathering-log-pages.json`).then(res => res.json()),
          fetch(`${import.meta.env.BASE_URL}data/gathering-log/items.json`).then(res => res.json()),
          fetch(`${import.meta.env.BASE_URL}data/gathering-log/icons.json`).then(res => res.json()),
          fetch(`${import.meta.env.BASE_URL}data/gathering-log/places.json`).then(res => res.json()),
          fetch(`${import.meta.env.BASE_URL}data/gathering-log/nodes.json`).then(res => res.json()),
          fetch(`${import.meta.env.BASE_URL}data/gathering-log/maps.json`).then(res => res.json()),
          fetch(`${import.meta.env.BASE_URL}data/gathering-log/aetherytes.json`).then(res => res.json()),
          fetch(`${import.meta.env.BASE_URL}data/gathering-log/recipes-per-item.json`).then(res => res.json()),
          fetch(`${import.meta.env.BASE_URL}data/gathering-log/satisfaction-thresholds.json`).then(res => res.json()),
        ]);

        const processedNodes = Object.fromEntries(
          Object.entries(nodes).map(([key, node]: [string, any]) => [
            key,
            {
              ...node,
              id: Number(key),
            },
          ])
        );

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

        const processedItems = Object.fromEntries(
          Object.entries(items).map(([id, item]: [string, any]) => {
            const numericId = Number(id);
            const isCustomDelivery = customDeliveryIds.has(id);
            const enName = typeof item?.en === 'string' ? item.en : '';
            const isAetherialReduction = AETHERIAL_REDUCTION_ITEM_NAMES.has(enName);
            const achievementExclusionReason = getAchievementExclusionReason(numericId, isCustomDelivery);
            const achievementMetadata = achievementExclusionReason
              ? {
                  isAchievementExcluded: true,
                  achievementExclusionReason,
                }
              : {};

            if (customDeliveryIds.has(id) && item && typeof item === 'object') {
              return [
                id,
                {
                  ...item,
                  isCustomDelivery: true,
                  isCollectible: true,
                  collectibleType: 'general' as const,
                  ...achievementMetadata,
                },
              ];
            }
            if (collectionOnlyIds.has(id) && item && typeof item === 'object') {
              return [
                id,
                {
                  ...item,
                  isCollectible: true,
                  collectibleType: 'collection-only' as const,
                  ...achievementMetadata,
                },
              ];
            }
            if (isAetherialReduction && item && typeof item === 'object') {
              return [
                id,
                {
                  ...item,
                  isCollectible: true,
                  collectibleType: 'general' as const,
                  isAetherialReduction: true,
                  ...achievementMetadata,
                },
              ];
            }
            if (item && typeof item === 'object') {
              return [
                id,
                {
                  ...item,
                  ...achievementMetadata,
                },
              ];
            }
            return [id, item];
          })
        );

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

        Object.entries(processedItems).forEach(([itemIdStr, itemInfo]: [string, any]) => {
          const itemId = Number(itemIdStr);
          if (addedItems.has(itemId)) return;

          const recipeList = recipes?.[itemId] || recipes?.[itemIdStr];
          if (!recipeList || recipeList.length === 0) return;

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

        setData({
          pages,
          items: processedItems,
          icons,
          places,
          nodes: processedNodes,
          maps,
          aetherytes,
          recipes,
          preIndex: {
            searchEntries,
          },
        });
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return { data, loading, error };
}
