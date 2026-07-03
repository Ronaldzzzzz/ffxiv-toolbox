import { useEffect, useState } from 'react';

/**
 * Returns the current epoch ms, refreshed every `intervalMs`.
 * Unifies the view-level countdown tick pattern (TimedView / MapView).
 */
export function useNowTick(intervalMs: number): number {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);

  return now;
}
