import { useCallback, useEffect, useState } from 'react';
import { AlarmState } from '../types';

// Use a custom event to sync state across multiple components/hooks
const ALARM_STORAGE_EVENT = 'ffxiv_toolbox_alarm_update';
const STORAGE_KEY = 'ffxiv_toolbox_alarm_settings';

export const DEFAULT_SETTINGS: AlarmState = {
    globalEnabled: false,
    soundEnabled: true,
    soundType: 101,
    localLeadTimeMinutes: 3,
    macroLeadTimeMinutes: 3,
    macroTimeMode: 'et',
    macroRepeat: false,
    trackedItemIds: [],
};

export function normalizeItemIds(values: unknown): number[] {
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

export function normalizeAlarmState(input: unknown): AlarmState {
    // Support for reading old formats:
    //   v3: { ungroupedTrackedItemIds, alarmGroups[].trackedItemIds }
    //   v2: { trackedItems }
    //   new: { trackedItemIds }
    const source = (input && typeof input === 'object')
        ? input as Record<string, unknown>
        : null;

    // Migration: collect all tracked item ids from old format
    const seen = new Set<number>();
    const merged: number[] = [];

    const addIds = (ids: number[]) => {
        ids.forEach(id => {
            if (!seen.has(id)) { seen.add(id); merged.push(id); }
        });
    };

    // New field takes priority
    addIds(normalizeItemIds(source?.trackedItemIds));
    // Old v3 ungrouped field
    addIds(normalizeItemIds(source?.ungroupedTrackedItemIds));
    // Old v3 groups
    if (Array.isArray(source?.alarmGroups)) {
        (source!.alarmGroups as unknown[]).forEach(group => {
            if (group && typeof group === 'object') {
                addIds(normalizeItemIds((group as Record<string, unknown>).trackedItemIds));
            }
        });
    }
    // Old v2 flat field
    addIds(normalizeItemIds(source?.trackedItems));

    return {
        globalEnabled: typeof source?.globalEnabled === 'boolean' ? source.globalEnabled : DEFAULT_SETTINGS.globalEnabled,
        soundEnabled: typeof source?.soundEnabled === 'boolean' ? source.soundEnabled : DEFAULT_SETTINGS.soundEnabled,
        soundType: Number.isFinite(source?.soundType) ? Number(source?.soundType) : DEFAULT_SETTINGS.soundType,
        localLeadTimeMinutes: Number.isFinite(source?.localLeadTimeMinutes) ? Number(source?.localLeadTimeMinutes) : DEFAULT_SETTINGS.localLeadTimeMinutes,
        macroLeadTimeMinutes: Number.isFinite(source?.macroLeadTimeMinutes) ? Number(source?.macroLeadTimeMinutes) : DEFAULT_SETTINGS.macroLeadTimeMinutes,
        macroTimeMode: source?.macroTimeMode === 'lt' ? 'lt' : DEFAULT_SETTINGS.macroTimeMode,
        macroRepeat: typeof source?.macroRepeat === 'boolean' ? source.macroRepeat : DEFAULT_SETTINGS.macroRepeat,
        trackedItemIds: merged,
    };
}

function getStoredSettings(): AlarmState {
    try {
        const item = localStorage.getItem(STORAGE_KEY);
        if (item) {
            return normalizeAlarmState(JSON.parse(item));
        }
    } catch (e) {
        console.warn('Failed to parse alarm settings', e);
    }
    return DEFAULT_SETTINGS;
}

function persistSettings(settings: AlarmState) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function emitAlarmUpdate() {
    setTimeout(() => window.dispatchEvent(new Event(ALARM_STORAGE_EVENT)), 0);
}

function isSameAlarmState(a: AlarmState, b: AlarmState): boolean {
    return (
        a.globalEnabled === b.globalEnabled &&
        a.soundEnabled === b.soundEnabled &&
        a.soundType === b.soundType &&
        a.localLeadTimeMinutes === b.localLeadTimeMinutes &&
        a.macroLeadTimeMinutes === b.macroLeadTimeMinutes &&
        a.macroTimeMode === b.macroTimeMode &&
        a.macroRepeat === b.macroRepeat &&
        a.trackedItemIds.length === b.trackedItemIds.length &&
        a.trackedItemIds.every((id, index) => id === b.trackedItemIds[index])
    );
}

export function useAlarm() {
    const [settings, setSettings] = useState<AlarmState>(getStoredSettings);

    useEffect(() => {
        const handleStorageUpdate = () => {
            // Bail out when nothing changed so sibling hook instances on the
            // same page don't cascade re-renders on every alarm update event
            setSettings(previous => {
                const stored = getStoredSettings();
                return isSameAlarmState(previous, stored) ? previous : stored;
            });
        };

        const handleStorage = (event: StorageEvent) => {
            if (!event.key || event.key === STORAGE_KEY) {
                handleStorageUpdate();
            }
        };

        window.addEventListener(ALARM_STORAGE_EVENT, handleStorageUpdate);
        window.addEventListener('storage', handleStorage);
        return () => {
            window.removeEventListener(ALARM_STORAGE_EVENT, handleStorageUpdate);
            window.removeEventListener('storage', handleStorage);
        };
    }, []);

    const writeSettings = useCallback((updater: (previous: AlarmState) => AlarmState) => {
        setSettings(previous => {
            const updated = normalizeAlarmState(updater(previous));
            persistSettings(updated);
            emitAlarmUpdate();
            return updated;
        });
    }, []);

    const updateSettings = useCallback((newSettings: Partial<AlarmState>) => {
        writeSettings(previous => ({
            ...previous,
            ...newSettings,
            macroTimeMode: newSettings.macroTimeMode === 'lt' ? 'lt' : (newSettings.macroTimeMode === 'et' ? 'et' : previous.macroTimeMode),
        }));
    }, [writeSettings]);

    // _options is kept for call-site compatibility (groupId is no longer used)
    const toggleTrackedItem = useCallback((itemId: number, _options?: { groupId?: string | null }) => {
        writeSettings(previous => {
            const tracked = previous.trackedItemIds;
            if (tracked.includes(itemId)) {
                return { ...previous, trackedItemIds: tracked.filter(id => id !== itemId) };
            }
            return { ...previous, trackedItemIds: [...tracked, itemId] };
        });
    }, [writeSettings]);

    // _options is kept for call-site compatibility (groupId is no longer used)
    const setTrackedItems = useCallback((itemIds: number[], enabled: boolean, _options?: { groupId?: string | null }) => {
        const normalizedItemIds = normalizeItemIds(itemIds);
        if (normalizedItemIds.length === 0) return;

        writeSettings(previous => {
            const currentSet = new Set(previous.trackedItemIds);
            if (enabled) {
                normalizedItemIds.forEach(id => currentSet.add(id));
            } else {
                normalizedItemIds.forEach(id => currentSet.delete(id));
            }
            return { ...previous, trackedItemIds: Array.from(currentSet) };
        });
    }, [writeSettings]);

    const requestNotificationPermission = useCallback(async () => {
        if (!('Notification' in window)) return false;

        if (Notification.permission === 'granted') return true;

        if (Notification.permission !== 'denied') {
            try {
                const permissionPromise = Notification.requestPermission();
                if (permissionPromise !== undefined) {
                    const permission = await permissionPromise;
                    return permission === 'granted';
                }

                return new Promise<boolean>((resolve) => {
                    Notification.requestPermission((permission) => {
                        resolve(permission === 'granted');
                    });
                });
            } catch (error) {
                console.error('Failed to request notification permission:', error);
                return false;
            }
        }

        return false;
    }, []);

    return {
        ...settings,
        /** Alias for trackedItemIds — kept for consumer compatibility */
        trackedItems: settings.trackedItemIds,
        updateSettings,
        toggleTrackedItem,
        setTrackedItems,
        requestNotificationPermission,
    };
}
