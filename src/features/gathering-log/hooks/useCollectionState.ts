import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookmarkGroup, BookmarkState, BOOKMARK_STATE_VERSION } from '../types';

const PROGRESS_STORAGE_KEY = 'ffxiv_gathering_log_progress';
const BOOKMARK_STORAGE_KEY = 'ffxiv_gathering_log_bookmarks';
const COLLECTION_STORAGE_EVENT = 'ffxiv_toolbox_collection_update';
const MAX_BOOKMARK_GROUPS = 15;

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

function emitCollectionUpdate() {
  setTimeout(() => window.dispatchEvent(new Event(COLLECTION_STORAGE_EVENT)), 0);
}

function createStorageId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeItemIds(values: unknown): number[] {
  if (!Array.isArray(values)) return [];

  const seen = new Set<number>();
  const normalized: number[] = [];

  values.forEach(value => {
    const itemId = Number(value);
    if (!Number.isFinite(itemId) || seen.has(itemId)) return;
    seen.add(itemId);
    normalized.push(itemId);
  });

  return normalized;
}

function createBookmarkGroup(name = 'New Group'): BookmarkGroup {
  const timestamp = new Date().toISOString();
  return {
    id: createStorageId('bookmark-group'),
    name,
    itemIds: [],
    collapsed: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function normalizeBookmarkState(input: unknown): BookmarkState {
  if (Array.isArray(input)) {
    return {
      version: BOOKMARK_STATE_VERSION,
      groups: [],
      ungroupedItemIds: normalizeItemIds(input),
    };
  }

  const source = (input && typeof input === 'object') ? input as Partial<BookmarkState> & { groups?: unknown; ungroupedItemIds?: unknown } : null;
  const assignedIds = new Set<number>();
  const groups: BookmarkGroup[] = [];

  if (source && Array.isArray(source.groups)) {
    source.groups.forEach((group, index) => {
      if (!group || typeof group !== 'object') return;

      const rawGroup = group as Partial<BookmarkGroup>;
      const itemIds = normalizeItemIds(rawGroup.itemIds).filter(itemId => {
        if (assignedIds.has(itemId)) return false;
        assignedIds.add(itemId);
        return true;
      });
      const timestamp = typeof rawGroup.createdAt === 'string' ? rawGroup.createdAt : new Date().toISOString();

      groups.push({
        id: typeof rawGroup.id === 'string' && rawGroup.id ? rawGroup.id : createStorageId(`bookmark-group-${index}`),
        name: typeof rawGroup.name === 'string' && rawGroup.name.trim() ? rawGroup.name.trim() : `Group ${index + 1}`,
        itemIds,
        collapsed: rawGroup.collapsed === true,
        createdAt: timestamp,
        updatedAt: typeof rawGroup.updatedAt === 'string' ? rawGroup.updatedAt : timestamp,
      });
    });
  }

  const ungroupedItemIds = normalizeItemIds(source?.ungroupedItemIds).filter(itemId => {
    if (assignedIds.has(itemId)) return false;
    assignedIds.add(itemId);
    return true;
  });

  return {
    version: BOOKMARK_STATE_VERSION,
    groups,
    ungroupedItemIds,
  };
}

function restoreBookmarkState(): BookmarkState {
  const raw = localStorage.getItem(BOOKMARK_STORAGE_KEY);
  if (!raw) {
    return normalizeBookmarkState(null);
  }

  try {
    return normalizeBookmarkState(JSON.parse(raw));
  } catch {
    return normalizeBookmarkState(null);
  }
}

function persistBookmarkState(state: BookmarkState) {
  localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(state));
}

function hasBookmarkedItem(state: BookmarkState, itemId: number) {
  return state.ungroupedItemIds.includes(itemId) || state.groups.some(group => group.itemIds.includes(itemId));
}

function removeBookmarkedItem(state: BookmarkState, itemId: number): BookmarkState {
  const timestamp = new Date().toISOString();

  return {
    ...state,
    groups: state.groups.map(group => {
      if (!group.itemIds.includes(itemId)) return group;
      return {
        ...group,
        itemIds: group.itemIds.filter(id => id !== itemId),
        updatedAt: timestamp,
      };
    }),
    ungroupedItemIds: state.ungroupedItemIds.filter(id => id !== itemId),
  };
}

function insertItem(itemIds: number[], itemId: number, index?: number) {
  const next = itemIds.filter(id => id !== itemId);
  if (typeof index !== 'number' || index < 0 || index > next.length) {
    next.push(itemId);
    return next;
  }

  next.splice(index, 0, itemId);
  return next;
}

function addBookmarkedItem(state: BookmarkState, itemId: number, targetGroupId?: string | null, index?: number): BookmarkState {
  const baseState = removeBookmarkedItem(state, itemId);
  const timestamp = new Date().toISOString();

  if (!targetGroupId) {
    return {
      ...baseState,
      ungroupedItemIds: insertItem(baseState.ungroupedItemIds, itemId, index),
    };
  }

  let matchedGroup = false;
  const groups = baseState.groups.map(group => {
    if (group.id !== targetGroupId) return group;
    matchedGroup = true;
    return {
      ...group,
      itemIds: insertItem(group.itemIds, itemId, index),
      updatedAt: timestamp,
    };
  });

  if (!matchedGroup) {
    return {
      ...baseState,
      ungroupedItemIds: insertItem(baseState.ungroupedItemIds, itemId, index),
    };
  }

  return {
    ...baseState,
    groups,
  };
}

export function useCollectionState() {
  const [completedItems, setCompletedItems] = useState<Set<number>>(new Set());
  const [bookmarkState, setBookmarkState] = useState<BookmarkState>(() => normalizeBookmarkState(null));

  useEffect(() => {
    setCompletedItems(restoreSet(PROGRESS_STORAGE_KEY));
    setBookmarkState(restoreBookmarkState());

    const syncFromStorage = () => {
      setCompletedItems(restoreSet(PROGRESS_STORAGE_KEY));
      setBookmarkState(restoreBookmarkState());
    };

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === PROGRESS_STORAGE_KEY || event.key === BOOKMARK_STORAGE_KEY) {
        syncFromStorage();
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(COLLECTION_STORAGE_EVENT, syncFromStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(COLLECTION_STORAGE_EVENT, syncFromStorage);
    };
  }, []);

  const bookmarkedItems = useMemo(() => {
    const allIds = new Set<number>(bookmarkState.ungroupedItemIds);
    bookmarkState.groups.forEach(group => {
      group.itemIds.forEach(itemId => allIds.add(itemId));
    });
    return allIds;
  }, [bookmarkState]);

  const updateBookmarkState = useCallback((updater: (previous: BookmarkState) => BookmarkState) => {
    setBookmarkState(previous => {
      const next = normalizeBookmarkState(updater(previous));
      persistBookmarkState(next);
      emitCollectionUpdate();
      return next;
    });
  }, []);

  const toggleComplete = useCallback((itemId: number) => {
    setCompletedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);

      persistSet(PROGRESS_STORAGE_KEY, next);
      emitCollectionUpdate();
      return next;
    });
  }, []);

  const toggleBookmark = useCallback((itemId: number, targetGroupId?: string | null) => {
    updateBookmarkState(previous => {
      if (hasBookmarkedItem(previous, itemId)) {
        return removeBookmarkedItem(previous, itemId);
      }

      return addBookmarkedItem(previous, itemId, targetGroupId);
    });
  }, [updateBookmarkState]);

  const toggleBatch = useCallback((ids: number[], action: 'add' | 'remove') => {
    setCompletedItems(prev => {
      const next = new Set(prev);
      ids.forEach(id => {
        if (action === 'add') next.add(id);
        else next.delete(id);
      });

      persistSet(PROGRESS_STORAGE_KEY, next);
      emitCollectionUpdate();
      return next;
    });
  }, []);

  const bookmarkAll = useCallback((ids: number[], targetGroupId?: string | null) => {
    updateBookmarkState(previous => ids.reduce(
      (state, itemId) => hasBookmarkedItem(state, itemId) ? state : addBookmarkedItem(state, itemId, targetGroupId),
      previous,
    ));
  }, [updateBookmarkState]);

  const createGroup = useCallback((name = 'New Group') => {
    let createdGroupId: string | null = null;
    updateBookmarkState(previous => {
      if (previous.groups.length >= MAX_BOOKMARK_GROUPS) {
        return previous;
      }

      const nextGroup = createBookmarkGroup(name);
      createdGroupId = nextGroup.id;
      return {
        ...previous,
        groups: [...previous.groups, nextGroup],
      };
    });
    return createdGroupId;
  }, [updateBookmarkState]);

  const updateGroup = useCallback((groupId: string, patch: Partial<Omit<BookmarkGroup, 'id' | 'itemIds' | 'createdAt' | 'updatedAt'>>) => {
    updateBookmarkState(previous => ({
      ...previous,
      groups: previous.groups.map(group => {
        if (group.id !== groupId) return group;
        return {
          ...group,
          ...patch,
          name: typeof patch.name === 'string' && patch.name.trim() ? patch.name.trim() : group.name,
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
  }, [updateBookmarkState]);

  const removeGroup = useCallback((groupId: string, options?: { moveItemsToUngrouped?: boolean }) => {
    const moveItemsToUngrouped = options?.moveItemsToUngrouped !== false;
    updateBookmarkState(previous => {
      const targetGroup = previous.groups.find(group => group.id === groupId);
      if (!targetGroup) return previous;

      return {
        ...previous,
        groups: previous.groups.filter(group => group.id !== groupId),
        ungroupedItemIds: moveItemsToUngrouped
          ? [...previous.ungroupedItemIds, ...targetGroup.itemIds.filter(itemId => !previous.ungroupedItemIds.includes(itemId))]
          : previous.ungroupedItemIds,
      };
    });
  }, [updateBookmarkState]);

  const moveBookmarkedItem = useCallback((itemId: number, destinationGroupId: string | null, index?: number) => {
    updateBookmarkState(previous => addBookmarkedItem(previous, itemId, destinationGroupId, index));
  }, [updateBookmarkState]);

  return {
    completedItems,
    bookmarkState,
    bookmarkGroups: bookmarkState.groups,
    maxBookmarkGroups: MAX_BOOKMARK_GROUPS,
    ungroupedBookmarkedItemIds: bookmarkState.ungroupedItemIds,
    bookmarkedItems,
    toggleComplete,
    toggleBookmark,
    toggleBatch,
    bookmarkAll,
    createGroup,
    updateGroup,
    removeGroup,
    moveBookmarkedItem,
  };
}
