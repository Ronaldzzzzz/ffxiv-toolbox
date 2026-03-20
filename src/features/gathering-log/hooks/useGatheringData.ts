import { useState, useEffect } from 'react';
import { GatheringData } from '../types';

export function useGatheringData() {
  const [data, setData] = useState<GatheringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [pages, items, icons, places, nodes, maps, aetherytes, recipes] = await Promise.all([
          fetch(`${import.meta.env.BASE_URL}data/gathering-log/gathering-log-pages.json`).then(res => res.json()),
          fetch(`${import.meta.env.BASE_URL}data/gathering-log/items.json`).then(res => res.json()),
          fetch(`${import.meta.env.BASE_URL}data/gathering-log/icons.json`).then(res => res.json()),
          fetch(`${import.meta.env.BASE_URL}data/gathering-log/places.json`).then(res => res.json()),
          fetch(`${import.meta.env.BASE_URL}data/gathering-log/nodes.json`).then(res => res.json()),
          fetch(`${import.meta.env.BASE_URL}data/gathering-log/maps.json`).then(res => res.json()),
          fetch(`${import.meta.env.BASE_URL}data/gathering-log/aetherytes.json`).then(res => res.json()),
          fetch(`${import.meta.env.BASE_URL}data/gathering-log/recipes-per-item.json`).then(res => res.json()),
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

        setData({
          pages,
          items,
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
