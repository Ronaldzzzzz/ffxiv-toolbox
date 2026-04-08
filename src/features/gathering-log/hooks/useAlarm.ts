import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlarmGroupSettings, AlarmState, ALARM_STATE_VERSION } from '../types';

// Use a custom event to sync state across multiple components/hooks
const ALARM_STORAGE_EVENT = 'ffxiv_toolbox_alarm_update';
const STORAGE_KEY = 'ffxiv_toolbox_alarm_settings';

type AlarmSettingsUpdate = Partial<AlarmState> & {
    trackedItems?: number[];
};

const DEFAULT_SETTINGS: AlarmState = {
    version: ALARM_STATE_VERSION,
    globalEnabled: false,
    soundEnabled: true,
    soundType: 101,
    localLeadTimeMinutes: 3,
    macroLeadTimeMinutes: 3,
    macroTimeMode: 'et',
    macroRepeat: false,
    ungroupedTrackedItemIds: [],
    alarmGroups: [],
};

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

function normalizeAlarmGroupSettings(input: unknown, assignedIds: Set<number>, index: number): AlarmGroupSettings | null {
    if (!input || typeof input !== 'object') return null;

    const source = input as Partial<AlarmGroupSettings>;
    const trackedItemIds = normalizeItemIds(source.trackedItemIds).filter(itemId => {
        if (assignedIds.has(itemId)) return false;
        assignedIds.add(itemId);
        return true;
    });

    return {
        groupId: typeof source.groupId === 'string' && source.groupId ? source.groupId : `alarm-group-${index}`,
        groupName: typeof source.groupName === 'string' && source.groupName.trim() ? source.groupName.trim() : undefined,
        trackedItemIds,
        notificationText: typeof source.notificationText === 'string' && source.notificationText.trim() ? source.notificationText.trim() : undefined,
        macroLabel: typeof source.macroLabel === 'string' && source.macroLabel.trim() ? source.macroLabel.trim() : undefined,
        soundEnabled: typeof source.soundEnabled === 'boolean' ? source.soundEnabled : null,
        soundType: Number.isFinite(source.soundType) ? Number(source.soundType) : null,
    };
}

function normalizeAlarmState(input: unknown): AlarmState {
    const source = (input && typeof input === 'object') ? input as Partial<AlarmState> & { trackedItems?: unknown; alarmGroups?: unknown; ungroupedTrackedItemIds?: unknown; macroTimeMode?: unknown } : null;
    const assignedIds = new Set<number>();
    const alarmGroups: AlarmGroupSettings[] = [];

    if (source && Array.isArray(source.alarmGroups)) {
        source.alarmGroups.forEach((group, index) => {
            const normalizedGroup = normalizeAlarmGroupSettings(group, assignedIds, index);
            if (normalizedGroup) {
                alarmGroups.push(normalizedGroup);
            }
        });
    }

    const legacyTrackedItems = normalizeItemIds(source?.trackedItems).filter(itemId => {
        if (assignedIds.has(itemId)) return false;
        assignedIds.add(itemId);
        return true;
    });

    const ungroupedTrackedItemIds = normalizeItemIds(source?.ungroupedTrackedItemIds).filter(itemId => {
        if (assignedIds.has(itemId)) return false;
        assignedIds.add(itemId);
        return true;
    });

    return {
        version: ALARM_STATE_VERSION,
        globalEnabled: source?.globalEnabled ?? DEFAULT_SETTINGS.globalEnabled,
        soundEnabled: source?.soundEnabled ?? DEFAULT_SETTINGS.soundEnabled,
        soundType: Number.isFinite(source?.soundType) ? Number(source?.soundType) : DEFAULT_SETTINGS.soundType,
        localLeadTimeMinutes: Number.isFinite(source?.localLeadTimeMinutes) ? Number(source?.localLeadTimeMinutes) : DEFAULT_SETTINGS.localLeadTimeMinutes,
        macroLeadTimeMinutes: Number.isFinite(source?.macroLeadTimeMinutes) ? Number(source?.macroLeadTimeMinutes) : DEFAULT_SETTINGS.macroLeadTimeMinutes,
        macroTimeMode: source?.macroTimeMode === 'lt' ? 'lt' : DEFAULT_SETTINGS.macroTimeMode,
        macroRepeat: source?.macroRepeat ?? DEFAULT_SETTINGS.macroRepeat,
        ungroupedTrackedItemIds: ungroupedTrackedItemIds.length > 0 ? ungroupedTrackedItemIds : legacyTrackedItems,
        alarmGroups,
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

function hasTrackedItem(state: AlarmState, itemId: number) {
    return state.ungroupedTrackedItemIds.includes(itemId) || state.alarmGroups.some(group => group.trackedItemIds.includes(itemId));
}

function removeTrackedItem(state: AlarmState, itemId: number): AlarmState {
    return {
        ...state,
        ungroupedTrackedItemIds: state.ungroupedTrackedItemIds.filter(id => id !== itemId),
        alarmGroups: state.alarmGroups.map(group => {
            if (!group.trackedItemIds.includes(itemId)) return group;
            return {
                ...group,
                trackedItemIds: group.trackedItemIds.filter(id => id !== itemId),
            };
        }),
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

function addTrackedItem(state: AlarmState, itemId: number, targetGroupId?: string | null, index?: number): AlarmState {
    const baseState = removeTrackedItem(state, itemId);

    if (!targetGroupId) {
        return {
            ...baseState,
            ungroupedTrackedItemIds: insertItem(baseState.ungroupedTrackedItemIds, itemId, index),
        };
    }

    let matchedGroup = false;
    const alarmGroups = baseState.alarmGroups.map(group => {
        if (group.groupId !== targetGroupId) return group;
        matchedGroup = true;
        return {
            ...group,
            trackedItemIds: insertItem(group.trackedItemIds, itemId, index),
        };
    });

    if (!matchedGroup) {
        return {
            ...baseState,
            ungroupedTrackedItemIds: insertItem(baseState.ungroupedTrackedItemIds, itemId, index),
        };
    }

    return {
        ...baseState,
        alarmGroups,
    };
}

export function useAlarm() {
    const [settings, setSettings] = useState<AlarmState>(getStoredSettings);

    useEffect(() => {
        const handleStorageUpdate = () => {
            setSettings(getStoredSettings());
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

    const trackedItems = useMemo(() => {
        const allIds = new Set<number>(settings.ungroupedTrackedItemIds);
        settings.alarmGroups.forEach(group => {
            group.trackedItemIds.forEach(itemId => allIds.add(itemId));
        });
        return Array.from(allIds);
    }, [settings]);

    const writeSettings = useCallback((updater: (previous: AlarmState) => AlarmState) => {
        setSettings(previous => {
            const updated = normalizeAlarmState(updater(previous));
            persistSettings(updated);
            emitAlarmUpdate();
            return updated;
        });
    }, []);

    const updateSettings = useCallback((newSettings: AlarmSettingsUpdate) => {
        writeSettings(previous => {
            const baseNext: AlarmState = {
                ...previous,
                ...newSettings,
                version: ALARM_STATE_VERSION,
                ungroupedTrackedItemIds: 'trackedItems' in newSettings
                    ? normalizeItemIds(newSettings.trackedItems)
                    : previous.ungroupedTrackedItemIds,
                alarmGroups: Array.isArray(newSettings.alarmGroups) ? newSettings.alarmGroups : previous.alarmGroups,
                macroTimeMode: newSettings.macroTimeMode === 'lt' ? 'lt' : (newSettings.macroTimeMode === 'et' ? 'et' : previous.macroTimeMode),
            };

            return baseNext;
        });
    }, [writeSettings]);

    const toggleTrackedItem = useCallback((itemId: number, options?: { groupId?: string | null }) => {
        writeSettings(previous => {
            if (hasTrackedItem(previous, itemId)) {
                return removeTrackedItem(previous, itemId);
            }

            return addTrackedItem(previous, itemId, options?.groupId);
        });
    }, [writeSettings]);

    const setTrackedItems = useCallback((itemIds: number[], enabled: boolean, options?: { groupId?: string | null }) => {
        const normalizedItemIds = normalizeItemIds(itemIds);
        if (normalizedItemIds.length === 0) return;

        writeSettings(previous => {
            let next = previous;

            normalizedItemIds.forEach(itemId => {
                if (enabled) {
                    if (!hasTrackedItem(next, itemId)) {
                        next = addTrackedItem(next, itemId, options?.groupId);
                    }
                    return;
                }

                if (hasTrackedItem(next, itemId)) {
                    next = removeTrackedItem(next, itemId);
                }
            });

            return next;
        });
    }, [writeSettings]);

    const ensureAlarmGroup = useCallback((groupId: string, defaults?: Partial<Omit<AlarmGroupSettings, 'groupId' | 'trackedItemIds'>>) => {
        writeSettings(previous => {
            if (previous.alarmGroups.some(group => group.groupId === groupId)) {
                return previous;
            }

            return {
                ...previous,
                alarmGroups: [
                    ...previous.alarmGroups,
                    {
                        groupId,
                        groupName: defaults?.groupName,
                        trackedItemIds: [],
                        notificationText: defaults?.notificationText,
                        macroLabel: defaults?.macroLabel,
                        soundEnabled: typeof defaults?.soundEnabled === 'boolean' ? defaults.soundEnabled : null,
                        soundType: Number.isFinite(defaults?.soundType) ? Number(defaults?.soundType) : null,
                    },
                ],
            };
        });
    }, [writeSettings]);

    const updateAlarmGroup = useCallback((groupId: string, patch: Partial<Omit<AlarmGroupSettings, 'groupId' | 'trackedItemIds'>>) => {
        writeSettings(previous => ({
            ...previous,
            alarmGroups: previous.alarmGroups.map(group => {
                if (group.groupId !== groupId) return group;
                return {
                    ...group,
                    ...patch,
                    groupName: typeof patch.groupName === 'string' && patch.groupName.trim() ? patch.groupName.trim() : group.groupName,
                    notificationText: typeof patch.notificationText === 'string'
                        ? (patch.notificationText.trim() || undefined)
                        : group.notificationText,
                    macroLabel: typeof patch.macroLabel === 'string'
                        ? (patch.macroLabel.trim() || undefined)
                        : group.macroLabel,
                    soundEnabled: typeof patch.soundEnabled === 'boolean' ? patch.soundEnabled : (patch.soundEnabled === null ? null : group.soundEnabled),
                    soundType: Number.isFinite(patch.soundType) ? Number(patch.soundType) : (patch.soundType === null ? null : group.soundType),
                };
            }),
        }));
    }, [writeSettings]);

    const removeAlarmGroup = useCallback((groupId: string, options?: { moveItemsToUngrouped?: boolean }) => {
        const moveItemsToUngrouped = options?.moveItemsToUngrouped !== false;
        writeSettings(previous => {
            const targetGroup = previous.alarmGroups.find(group => group.groupId === groupId);
            if (!targetGroup) return previous;

            return {
                ...previous,
                alarmGroups: previous.alarmGroups.filter(group => group.groupId !== groupId),
                ungroupedTrackedItemIds: moveItemsToUngrouped
                    ? [...previous.ungroupedTrackedItemIds, ...targetGroup.trackedItemIds.filter(itemId => !previous.ungroupedTrackedItemIds.includes(itemId))]
                    : previous.ungroupedTrackedItemIds,
            };
        });
    }, [writeSettings]);

    const getTrackedGroupForItem = useCallback((itemId: number) => {
        return settings.alarmGroups.find(group => group.trackedItemIds.includes(itemId)) ?? null;
    }, [settings.alarmGroups]);

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
        trackedItems,
        updateSettings,
        toggleTrackedItem,
        setTrackedItems,
        ensureAlarmGroup,
        updateAlarmGroup,
        removeAlarmGroup,
        getTrackedGroupForItem,
        requestNotificationPermission,
    };
}
