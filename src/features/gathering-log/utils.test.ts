import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  calculateNodeStatus,
  formatSeconds,
  getEorzeaTime,
  getNodeItemIds,
  getAchievementExclusionReason,
} from './utils';

// Eorzea time runs at 1440/70 real speed: 4,200,000 real ms = exactly one Eorzea day.
// Setting system time to a multiple of 4,200,000 ms puts Eorzea time at 00:00.
const REAL_MS_PER_EORZEA_DAY = 4_200_000;
// 175,000 real ms = 1 Eorzea hour
const REAL_MS_PER_EORZEA_HOUR = 175_000;

describe('calculateNodeStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(REAL_MS_PER_EORZEA_DAY); // ET 00:00
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports active when current ET is inside the spawn window', () => {
    const result = calculateNodeStatus([0], 60);
    expect(result.status).toBe('active');
    expect(result.secondsUntil).toBe(0);
    // 1 Eorzea hour window remaining = 175 real seconds
    expect(result.secondsRemaining).toBe(175);
    expect(result.progressPercent).toBeCloseTo(0, 3);
    expect(result.spawnTime).toBe('00:00');
  });

  it('reports soon when next spawn is within 5 real minutes', () => {
    const result = calculateNodeStatus([1], 60); // 1 ET hour away = 175 real seconds
    expect(result.status).toBe('soon');
    expect(result.secondsUntil).toBe(175);
    expect(result.secondsRemaining).toBe(0);
    expect(result.spawnTime).toBe('01:00');
  });

  it('reports later when next spawn is more than 5 real minutes away', () => {
    const result = calculateNodeStatus([12], 60); // 12 ET hours = 2100 real seconds
    expect(result.status).toBe('later');
    expect(result.secondsUntil).toBe(2100);
    expect(result.spawnTime).toBe('12:00');
  });

  it('handles windows wrapping across the Eorzea day boundary', () => {
    // Spawn at 23:00 ET for 2 ET hours → window 23:00–01:00; at ET 00:00 it is active and half elapsed
    const result = calculateNodeStatus([23], 120);
    expect(result.status).toBe('active');
    expect(result.secondsRemaining).toBe(175); // 1 ET hour remaining
    expect(result.progressPercent).toBeCloseTo(50, 3);
    expect(result.spawnTime).toBe('23:00');
  });

  it('picks the nearest upcoming spawn among several', () => {
    const result = calculateNodeStatus([12, 4, 20], 60);
    expect(result.spawnTime).toBe('04:00');
    expect(result.secondsUntil).toBe(4 * (REAL_MS_PER_EORZEA_HOUR / 1000));
  });
});

describe('getEorzeaTime', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats the current Eorzea time as HH:MM', () => {
    vi.useFakeTimers();
    vi.setSystemTime(REAL_MS_PER_EORZEA_DAY / 2); // half an Eorzea day = 12:00
    expect(getEorzeaTime()).toBe('12:00');

    vi.setSystemTime(REAL_MS_PER_EORZEA_DAY); // full day wraps to 00:00
    expect(getEorzeaTime()).toBe('00:00');
  });
});

describe('formatSeconds', () => {
  it('formats minutes and zero-padded seconds', () => {
    expect(formatSeconds(0)).toBe('0:00');
    expect(formatSeconds(65)).toBe('1:05');
    expect(formatSeconds(600)).toBe('10:00');
  });

  it('clamps negative input to 00:00', () => {
    expect(formatSeconds(-5)).toBe('00:00');
  });
});

describe('getNodeItemIds', () => {
  it('merges items and hiddenItems preserving order and removing duplicates', () => {
    expect(getNodeItemIds({ items: [1, 2, 3], hiddenItems: [3, 4] })).toEqual([1, 2, 3, 4]);
  });

  it('works when hiddenItems is absent', () => {
    expect(getNodeItemIds({ items: [5, 5, 6] })).toEqual([5, 6]);
  });
});

describe('getAchievementExclusionReason', () => {
  it('classifies known exclusion categories', () => {
    expect(getAchievementExclusionReason(2, false)).toBe('crystal-related');
    expect(getAchievementExclusionReason(5814, false)).toBe('pigment');
    expect(getAchievementExclusionReason(5599, false)).toBe('grade-1-carbonized-matter');
    expect(getAchievementExclusionReason(26752, false)).toBe('manual-special-case');
  });

  it('prioritizes custom delivery over manual special cases', () => {
    expect(getAchievementExclusionReason(26752, true)).toBe('custom-delivery');
    expect(getAchievementExclusionReason(99999, true)).toBe('custom-delivery');
  });

  it('returns undefined for ordinary items', () => {
    expect(getAchievementExclusionReason(99999, false)).toBeUndefined();
  });
});
