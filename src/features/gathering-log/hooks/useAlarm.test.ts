import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, normalizeAlarmState, normalizeItemIds } from './useAlarm';

// Guards the localStorage schema for `ffxiv_toolbox_alarm_settings`:
// old v2 ({ trackedItems }) and v3 ({ ungroupedTrackedItemIds, alarmGroups })
// payloads must keep migrating into the flat { trackedItemIds } shape.

describe('normalizeItemIds', () => {
  it('coerces to numbers and removes duplicates preserving order', () => {
    expect(normalizeItemIds([3, '1', 3, 2, '2'])).toEqual([3, 1, 2]);
  });

  it('drops non-finite values and rejects non-arrays', () => {
    expect(normalizeItemIds([1, 'abc', NaN, Infinity, 2])).toEqual([1, 2]);
    expect(normalizeItemIds('not-an-array')).toEqual([]);
    expect(normalizeItemIds(undefined)).toEqual([]);
  });
});

describe('normalizeAlarmState', () => {
  it('returns defaults for garbage input', () => {
    expect(normalizeAlarmState(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeAlarmState('junk')).toEqual(DEFAULT_SETTINGS);
    expect(normalizeAlarmState(42)).toEqual(DEFAULT_SETTINGS);
  });

  it('migrates v2 format ({ trackedItems })', () => {
    const result = normalizeAlarmState({ trackedItems: [1, 2, 2, '3'] });
    expect(result.trackedItemIds).toEqual([1, 2, 3]);
  });

  it('migrates v3 group format ({ ungroupedTrackedItemIds, alarmGroups })', () => {
    const result = normalizeAlarmState({
      ungroupedTrackedItemIds: [1],
      alarmGroups: [
        { trackedItemIds: [2, 1] },
        { trackedItemIds: [3] },
        'garbage-entry',
      ],
    });
    expect(result.trackedItemIds).toEqual([1, 2, 3]);
  });

  it('merges new format with leftover legacy fields, new field first', () => {
    const result = normalizeAlarmState({
      trackedItemIds: [5],
      trackedItems: [6, 5],
      ungroupedTrackedItemIds: [7],
    });
    expect(result.trackedItemIds).toEqual([5, 7, 6]);
  });

  it('keeps valid scalar settings and falls back to defaults for invalid ones', () => {
    const result = normalizeAlarmState({
      globalEnabled: true,
      soundEnabled: false,
      soundType: 105,
      localLeadTimeMinutes: 5,
      macroLeadTimeMinutes: 'oops',
      macroTimeMode: 'lt',
      macroRepeat: 'not-a-bool',
    });
    expect(result.globalEnabled).toBe(true);
    expect(result.soundEnabled).toBe(false);
    expect(result.soundType).toBe(105);
    expect(result.localLeadTimeMinutes).toBe(5);
    expect(result.macroLeadTimeMinutes).toBe(DEFAULT_SETTINGS.macroLeadTimeMinutes);
    expect(result.macroTimeMode).toBe('lt');
    expect(result.macroRepeat).toBe(DEFAULT_SETTINGS.macroRepeat);
  });

  it('normalizes unknown macroTimeMode to the default (et)', () => {
    expect(normalizeAlarmState({ macroTimeMode: 'weird' }).macroTimeMode).toBe('et');
  });
});
