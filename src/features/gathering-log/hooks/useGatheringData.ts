import { useState, useEffect } from 'react';
import { GatheringData } from '../types';

export function useGatheringData() {
  const [data, setData] = useState<GatheringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [pages, items, icons, places, nodes, maps, uiLocales, aetherytes] = await Promise.all([
          fetch('/data/gathering-log/gathering-log-pages.json').then(res => res.json()),
          fetch('/data/gathering-log/items.json').then(res => res.json()),
          fetch('/data/gathering-log/icons.json').then(res => res.json()),
          fetch('/data/gathering-log/places.json').then(res => res.json()),
          fetch('/data/gathering-log/nodes.json').then(res => res.json()),
          fetch('/data/gathering-log/maps.json').then(res => res.json()),
          fetch('/data/gathering-log/ui_locales.json').then(res => res.json()),
          fetch('/data/gathering-log/aetherytes.json').then(res => res.json()),
        ]);

        // Preprocess nodes to include hiddenItems in the main items list and inject ID

        const processedNodes = { ...nodes };
        Object.entries(processedNodes).forEach(([key, node]: [string, any]) => {
          node.id = Number(key); // Inject ID from key

          if (node.hiddenItems && Array.isArray(node.hiddenItems)) {
            // Merge hiddenItems into items if not already present
            node.hiddenItems.forEach((hiddenId: number) => {
              if (!node.items.includes(hiddenId)) {
                node.items.push(hiddenId);
              }
            });
          }
        });

        setData({
          pages,
          items,
          icons,
          places,
          nodes: processedNodes,
          maps,
          uiLocales,
          aetherytes,
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
