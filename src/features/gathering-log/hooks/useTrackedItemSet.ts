import { useMemo } from 'react';

/**
 * Memoized Set view of the tracked alarm item ids.
 * Replaces the identical useMemo repeated across the views.
 */
export function useTrackedItemSet(trackedItems: number[]): Set<number> {
  return useMemo(() => new Set(trackedItems), [trackedItems]);
}
