import { useEffect, useState } from 'react';
import { RecipesMap } from '../types';

// Module-level cache: the full recipes-per-item.json (~14.8MB) is fetched
// at most once per session, and only when a recipe modal is first opened.
let recipesPromise: Promise<RecipesMap> | null = null;

export function loadRecipes(): Promise<RecipesMap> {
  if (!recipesPromise) {
    recipesPromise = fetch(`${import.meta.env.BASE_URL}data/gathering-log/recipes-per-item.json`)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load recipes (${res.status})`);
        return res.json();
      })
      .catch(err => {
        recipesPromise = null; // allow retry after a failed load
        throw err;
      });
  }
  return recipesPromise;
}

export function useRecipes() {
  const [recipes, setRecipes] = useState<RecipesMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadRecipes()
      .then(result => {
        if (!cancelled) setRecipes(result);
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

  return { recipes, loading, error };
}
