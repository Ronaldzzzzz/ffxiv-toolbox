import { useState, useEffect, useCallback } from 'react';

// Use a custom event to sync state across multiple components/hooks
const ALARM_STORAGE_EVENT = 'ffxiv_toolbox_alarm_update';

interface AlarmSettings {
    globalEnabled: boolean;
    soundEnabled: boolean;
    soundType: number; // 1, 2, or 3
    localLeadTimeMinutes: number; // For Browser Notification (0-15 real minutes)
    macroLeadTimeMinutes: number; // For FFXIV Macro (0-15 real minutes)
    macroTimeMode: 'et' | 'lt';
    macroRepeat: boolean;
    trackedItems: number[];
}

const DEFAULT_SETTINGS: AlarmSettings = {
    globalEnabled: false,
    soundEnabled: true,
    soundType: 101,
    localLeadTimeMinutes: 3, // Default 3 real minutes for browser
    macroLeadTimeMinutes: 3, // Default 3 real minutes for macro
    macroTimeMode: 'et',
    macroRepeat: false,
    trackedItems: [],
};

const STORAGE_KEY = 'ffxiv_toolbox_alarm_settings';

function getStoredSettings(): AlarmSettings {
    try {
        const item = localStorage.getItem(STORAGE_KEY);
        if (item) {
            return { ...DEFAULT_SETTINGS, ...JSON.parse(item) };
        }
    } catch (e) {
        console.warn('Failed to parse alarm settings', e);
    }
    return DEFAULT_SETTINGS;
}

export function useAlarm() {
    const [settings, setSettings] = useState<AlarmSettings>(getStoredSettings());

    // Listen for custom events to sync state across different instances of the hook
    useEffect(() => {
        const handleStorageUpdate = () => {
            setSettings(getStoredSettings());
        };
        
        window.addEventListener(ALARM_STORAGE_EVENT, handleStorageUpdate);
        return () => window.removeEventListener(ALARM_STORAGE_EVENT, handleStorageUpdate);
    }, []);

    const updateSettings = useCallback((newSettings: Partial<AlarmSettings>) => {
        setSettings(prev => {
            const updated = { ...prev, ...newSettings };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
        // Dispatch event asynchronously so other components update outside the current render cycle
        setTimeout(() => window.dispatchEvent(new Event(ALARM_STORAGE_EVENT)), 0);
    }, []);

    const toggleTrackedItem = useCallback((itemId: number) => {
        setSettings(prev => {
            const tracking = prev.trackedItems.includes(itemId);
            const newTracked = tracking 
                ? prev.trackedItems.filter(id => id !== itemId)
                : [...prev.trackedItems, itemId];
            
            const updated = { ...prev, trackedItems: newTracked };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
        setTimeout(() => window.dispatchEvent(new Event(ALARM_STORAGE_EVENT)), 0);
    }, []);

    // Helper to request notification permission
    const requestNotificationPermission = useCallback(async () => {
        if (!('Notification' in window)) return false;
        
        if (Notification.permission === 'granted') return true;
        
        if (Notification.permission !== 'denied') {
            try {
                const permissionPromise = Notification.requestPermission();
                if (permissionPromise !== undefined) {
                    const permission = await permissionPromise;
                    return permission === 'granted';
                } else {
                    // Fallback for older browsers (e.g. old Safari)
                    return new Promise<boolean>((resolve) => {
                        Notification.requestPermission((permission) => {
                            resolve(permission === 'granted');
                        });
                    });
                }
            } catch (error) {
                console.error('Failed to request notification permission:', error);
                // Can happen in insecure contexts (HTTP) or special embedded environments
                return false;
            }
        }
        
        return false;
    }, []);

    return {
        ...settings,
        updateSettings,
        toggleTrackedItem,
        requestNotificationPermission
    };
}
