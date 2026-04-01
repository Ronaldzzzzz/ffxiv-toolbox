import { useCallback, useEffect, useState } from 'react';

const PROGRESS_STORAGE_KEY = 'ffxiv_gathering_log_progress';
const BOOKMARK_STORAGE_KEY = 'ffxiv_gathering_log_bookmarks';

function restoreSet(storageKey: string): Set<number> {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return new Set<number>();

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set<number>();
    return new Set(parsed.map(value => Number(value)).filter(value => Number.isFinite(value)));
  } catch {
    return new Set<number>();
  }
}

function persistSet(storageKey: string, values: Set<number>) {
  localStorage.setItem(storageKey, JSON.stringify(Array.from(values)));
}

export function useCollectionState() {
  const [completedItems, setCompletedItems] = useState<Set<number>>(new Set());
  const [bookmarkedItems, setBookmarkedItems] = useState<Set<number>>(new Set());

  useEffect(() => {
    setCompletedItems(restoreSet(PROGRESS_STORAGE_KEY));
    setBookmarkedItems(restoreSet(BOOKMARK_STORAGE_KEY));
  }, []);

  const toggleComplete = useCallback((itemId: number) => {
    setCompletedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);

      persistSet(PROGRESS_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const toggleBookmark = useCallback((itemId: number) => {
    setBookmarkedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);

      persistSet(BOOKMARK_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const toggleBatch = useCallback((ids: number[], action: 'add' | 'remove') => {
    setCompletedItems(prev => {
      const next = new Set(prev);
      ids.forEach(id => {
        if (action === 'add') next.add(id);
        else next.delete(id);
      });

      persistSet(PROGRESS_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const bookmarkAll = useCallback((ids: number[]) => {
    setBookmarkedItems(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));

      persistSet(BOOKMARK_STORAGE_KEY, next);
      return next;
    });
  }, []);

  return {
    completedItems,
    bookmarkedItems,
    toggleComplete,
    toggleBookmark,
    toggleBatch,
    bookmarkAll,
  };
}
