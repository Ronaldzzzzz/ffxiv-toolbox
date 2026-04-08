import { useEffect, useMemo, useRef } from 'react';
import { useAlarm } from './useAlarm';
import { useLanguage } from '../../../i18n/LanguageContext';
import { GatheringData, NodeData } from '../types';
import { getLocalizedText, getItemIconUrl } from '../utils';

// Helper to calculate when the next spawn occurs for a given node spawn time
// Eorzea time is based on Unix epoch. 1 Eorzea day = 70 minutes real time.
// Eorzea ratio = 3600 / 175 = 20.57142857...
const EORZEA_MULTIPLIER = 3600 / 175;
const ALARM_SOUND_MIN_INTERVAL_MS = 1200;

export const ALARM_SOUND_ERROR_EVENT = 'ffxiv_toolbox_alarm_sound_error';

type AlarmSoundStatus = 'played' | 'throttled' | 'blocked' | 'missing' | 'failed';

let lastSoundPlayedAt = 0;

function getEorzeaMinutesElapsed(dateMs: number) {
    return Math.floor((dateMs * EORZEA_MULTIPLIER) / 60000);
}

function resolveSoundFile(type: number): string {
    const soundIndex = Math.min(16, Math.max(1, Math.floor(type || 1)));
    return `${import.meta.env.BASE_URL}audio/alarms/se.${soundIndex}.mp3`;
}

function emitSoundError(status: Exclude<AlarmSoundStatus, 'played' | 'throttled'>) {
    window.dispatchEvent(new CustomEvent(ALARM_SOUND_ERROR_EVENT, { detail: { status } }));
}

function playBuiltinSound(type: number): AlarmSoundStatus {
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        if (type === 1) {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1760, audioContext.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } else if (type === 2) {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(1046.50, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.02);
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.1);
            gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.12);
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);
            gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.22);
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.35);
        } else {
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
            oscillator.frequency.linearRampToValueAtTime(800, audioContext.currentTime + 0.2);
            oscillator.frequency.linearRampToValueAtTime(600, audioContext.currentTime + 0.4);
            oscillator.frequency.linearRampToValueAtTime(800, audioContext.currentTime + 0.6);
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime + 0.5);
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.7);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.7);
        }
        lastSoundPlayedAt = Date.now();
        return 'played';
    } catch(e) {
        console.warn('Failed to play built-in sound', e);
        return 'failed';
    }
}

export async function playNotificationSound(type: number = 1): Promise<AlarmSoundStatus> {
    const now = Date.now();
    if (now - lastSoundPlayedAt < ALARM_SOUND_MIN_INTERVAL_MS) {
        return 'throttled';
    }

    if (type >= 101 && type <= 103) {
        return playBuiltinSound(type - 100);
    }

    const audio = new Audio(resolveSoundFile(type));
    audio.preload = 'auto';

    try {
        await audio.play();
        lastSoundPlayedAt = now;
        return 'played';
    } catch(e) {
        const errName = e instanceof DOMException ? e.name : '';
        if (errName === 'NotAllowedError') {
            emitSoundError('blocked');
            return 'blocked';
        }
        if (errName === 'NotSupportedError') {
            emitSoundError('missing');
            return 'missing';
        }
        emitSoundError('failed');
        console.warn('Failed to play notification sound', e);
        return 'failed';
    }
}

export function useAlarmTrigger(data: GatheringData | null) {
    const { globalEnabled, soundEnabled, soundType, localLeadTimeMinutes, trackedItems, getTrackedGroupForItem } = useAlarm();
    const { lang, t } = useLanguage();

    const timedNodesByItemId = useMemo(() => {
        const mapping = new Map<number, NodeData[]>();
        if (!data) return mapping;

        Object.values(data.nodes).forEach(node => {
            if (!node.spawns || node.map === 0) return;

            node.items.forEach(itemId => {
                const nodes = mapping.get(itemId) || [];
                nodes.push(node);
                mapping.set(itemId, nodes);
            });
        });

        return mapping;
    }, [data]);

    // Keep refs updated every render so interval callbacks always use the latest lang/t
    const langRef = useRef(lang);
    const tRef = useRef(t);
    langRef.current = lang;
    tRef.current = t;

    // Keep track of which spawn occurrences we've already alarmed for 
    // to prevent duplicate alerts within the same Eorzea period
    const alarmedSpawnsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (!globalEnabled || !data || trackedItems.length === 0) return;

        const checkAlarms = () => {
            const nowRealMs = Date.now();
            const currentEorzeaMinutesTotal = getEorzeaMinutesElapsed(nowRealMs);
            const currentEorzeaDay = Math.floor(currentEorzeaMinutesTotal / (24 * 60));
            const currentEorzeaMinuteOfDay = currentEorzeaMinutesTotal % (24 * 60);

            // Convert local lead time (real minutes) to Eorzea minutes
            const leadTimeEorzeaMinutes = Math.round(localLeadTimeMinutes * EORZEA_MULTIPLIER);

            trackedItems.forEach(itemId => {
                const item = data.items[itemId];
                if (!item) return;

                const nodes = timedNodesByItemId.get(itemId) || [];
                
                nodes.forEach(node => {
                    node.spawns!.forEach(spawnHour => {
                        // Spawn hour is 0-23. Target Eorzea Minute is spawnHour * 60
                        let targetEorzeaMinute = spawnHour * 60;
                        
                        const triggers = [targetEorzeaMinute];
                        if (leadTimeEorzeaMinutes > 0) {
                            triggers.push(targetEorzeaMinute - leadTimeEorzeaMinutes);
                        }
                        
                        triggers.forEach((triggerEorzeaMinute, triggerIdx) => {
                            // Handle wrap around (e.g. trigger is yesterday in ET)
                            let currentTrigger = triggerEorzeaMinute;
                            if (currentTrigger < 0) {
                                currentTrigger += (24 * 60);
                            }
                            
                            // We need to check if we are currently at the trigger minute
                            // Because real-world intervals might miss exact minutes, we use a small window
                            // Eorzea day is 24 * 60 = 1440 minutes.
                            let timeDiff = (currentTrigger - currentEorzeaMinuteOfDay);
                            
                            // Handle midnight wrapping for the diff
                            if (timeDiff < -720) timeDiff += 1440;
                            if (timeDiff > 720) timeDiff -= 1440;
    
                            // Check if current time is within [trigger, trigger + 2] Eorzea minutes
                            // This allows a 2 ET minute window (~6 real seconds) to catch the interval
                            if (timeDiff <= 0 && timeDiff >= -2) {
                                // Create a unique key for this specific alarm occurrence
                                // Use absolute day number and the trigger minute to be unique per Eorzea day
                                const occurrenceKey = `${itemId}-${currentEorzeaDay}-${currentTrigger}`;
                                
                                if (!alarmedSpawnsRef.current.has(occurrenceKey)) {
                                    alarmedSpawnsRef.current.add(occurrenceKey);
                                    
                                    // Clean up old keys to prevent memory leak
                                    if (alarmedSpawnsRef.current.size > 100) {
                                        const iterator = alarmedSpawnsRef.current.values();
                                        for(let i=0; i<50; i++) {
                                             const nextVal = iterator.next().value;
                                             if (nextVal !== undefined) {
                                                 alarmedSpawnsRef.current.delete(nextVal);
                                             }
                                        }
                                    }
    
                                    // TRIGGER ALARM
                                    const itemName = getLocalizedText(item, langRef.current as any) || 'Unknown Item';
                                    const spawnTimeStr = `${spawnHour.toString().padStart(2, '0')}:00`;
                                    const isLeadTime = triggerIdx > 0;
                                    const trackedGroup = getTrackedGroupForItem(itemId);
                                    const groupLabel = (trackedGroup?.groupName || '').trim() || tRef.current.pages.gathering_log.ungrouped;
                                    const effectiveSoundEnabled = typeof trackedGroup?.soundEnabled === 'boolean'
                                        ? trackedGroup.soundEnabled
                                        : soundEnabled;
                                    const effectiveSoundType = Number.isFinite(trackedGroup?.soundType)
                                        ? Number(trackedGroup?.soundType)
                                        : soundType;
                                    const customNotificationTemplate = trackedGroup?.notificationText?.trim();

                                    const resolveNotificationBody = () => {
                                        if (customNotificationTemplate) {
                                            return customNotificationTemplate
                                                .replace('{group}', groupLabel)
                                                .replace('{item}', itemName)
                                                .replace('{time}', spawnTimeStr)
                                                .replace('{minutes}', String(localLeadTimeMinutes));
                                        }

                                        const gl = tRef.current.pages.gathering_log;
                                        const baseBody = isLeadTime
                                            ? gl.alarm_notification_body_lead
                                                .replace('{item}', itemName)
                                                .replace('{time}', spawnTimeStr)
                                                .replace('{minutes}', String(localLeadTimeMinutes))
                                            : gl.alarm_notification_body
                                                .replace('{item}', itemName)
                                                .replace('{time}', spawnTimeStr);

                                        return `[${groupLabel}] ${baseBody}`;
                                    };

                                    if (effectiveSoundEnabled) {
                                        void playNotificationSound(effectiveSoundType);
                                    }

                                    // Browser Notification (i18n + lead-time indication)
                                    if ('Notification' in window && Notification.permission === 'granted') {
                                        try {
                                            const gl = tRef.current.pages.gathering_log;
                                            const notifBody = resolveNotificationBody();
                                            new Notification(gl.alarm_notification_title, {
                                                body: notifBody,
                                                icon: getItemIconUrl(itemId, data.icons)
                                            });
                                        } catch (err) {
                                            console.error('Failed to show gathering notification', err);
                                        }
                                    }
                                }
                            }
                        });
                    });
                });
            });
        };

        // Check every 2 seconds (real time)
        // 2 seconds real time = ~41 seconds Eorzea Time, so we won't miss a minute
        const intervalId = setInterval(checkAlarms, 2000);
        
        // Initial check
        checkAlarms();

        return () => clearInterval(intervalId);
    }, [globalEnabled, soundEnabled, soundType, localLeadTimeMinutes, trackedItems, getTrackedGroupForItem, data, timedNodesByItemId]);
}
