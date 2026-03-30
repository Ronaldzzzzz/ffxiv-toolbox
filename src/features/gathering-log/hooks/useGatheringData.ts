import { useState, useEffect } from 'react';
import { GatheringData } from '../types';
import { getAchievementExclusionReason } from '../utils';

function isCollectionOnlyItemName(item: any): boolean {
  const tw = typeof item?.tw === 'string' ? item.tw : '';
  const zh = typeof item?.zh === 'string' ? item.zh : '';
  const en = typeof item?.en === 'string' ? item.en : '';
  return tw.startsWith('收藏用') || zh.startsWith('收藏用') || en.startsWith('Rarefied');
}

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

        setData({
          pages,
          items: processedItems,
          icons,
          places,
          nodes: processedNodes,
          maps,
          aetherytes,
          recipes,
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
