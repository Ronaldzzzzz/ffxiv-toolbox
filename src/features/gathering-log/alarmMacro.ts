import { AlarmTimeMode } from './types';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface AlarmMacroEntry {
    itemName: string;
    /** 4-digit Eorzea time strings, e.g. ['0000', '0800', '1600'] */
    eorzeaTimeStrs: string[];
}

export interface AlarmMacroGroup {
    groupId: string;
    groupLabel: string;
    entries: AlarmMacroEntry[];
}

export interface AlarmMacroOptions {
    leadTimeMinutes: number;
    timeMode: AlarmTimeMode;
    repeat: boolean;
    soundEnabled: boolean;
    soundType: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EORZEA_MULTIPLIER = 3600 / 175;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveSoundArg(soundEnabled: boolean, soundType: number): string {
    if (!soundEnabled) return ' mute';
    // Built-in tones (101–103) map to <se.1> in the FFXIV alarm command
    if (soundType >= 101 && soundType <= 103) return ' <se.1> mute';
    return ` <se.${String(soundType).padStart(2, '0')}> mute`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generates an FFXIV `/alarm` macro string from pre-grouped node data.
 *
 * @param groups  Grouped entries, each with a label and a list of timed items.
 *                Groups / entries with no timed nodes are silently skipped.
 * @param options Macro generation settings (time mode, lead time, sound, etc.).
 * @returns       Multi-line macro string ready to paste into FFXIV, or '' if
 *                there are no entries to generate.
 */
export function buildAlarmMacro(
    groups: AlarmMacroGroup[],
    options: AlarmMacroOptions,
): string {
    const { leadTimeMinutes, timeMode, repeat, soundEnabled, soundType } = options;

    const groupsWithEntries = groups.filter(g => g.entries.length > 0);
    if (groupsWithEntries.length === 0) return '';

    const lines: string[] = ['/alarm clear'];
    const soundArg = resolveSoundArg(soundEnabled, soundType);

    const nowRealMs = Date.now();
    const currentEorzeaMinutesTotal = Math.floor((nowRealMs * EORZEA_MULTIPLIER) / 60000);
    const currentEorzeaMinuteOfDay = currentEorzeaMinutesTotal % (24 * 60);

    groupsWithEntries.forEach(groupInfo => {
        groupInfo.entries.forEach(entry => {
            entry.eorzeaTimeStrs.forEach(etStr => {
                const alarmName = `${groupInfo.groupLabel}/${entry.itemName}/${etStr}`;

                if (timeMode === 'lt') {
                    // Convert next ET spawn to local wall-clock time
                    const spawnHour = parseInt(etStr.substring(0, 2), 10);
                    const targetEorzeaMinute = spawnHour * 60;
                    let minutesUntilNextSpawnET = targetEorzeaMinute - currentEorzeaMinuteOfDay;
                    if (minutesUntilNextSpawnET <= 0) minutesUntilNextSpawnET += 24 * 60;
                    const nextSpawnRealMs = nowRealMs + (minutesUntilNextSpawnET / EORZEA_MULTIPLIER) * 60000;
                    const date = new Date(nextSpawnRealMs);
                    const ltStr =
                        date.getHours().toString().padStart(2, '0') +
                        date.getMinutes().toString().padStart(2, '0');
                    // Local-time alarms do not support /alarm repeat
                    lines.push(`/alarm "${alarmName}" lt ${ltStr} ${leadTimeMinutes}${soundArg}`);
                } else {
                    // Eorzea-time alarm
                    let targetEorzeaMinute = parseInt(etStr.substring(0, 2), 10) * 60;
                    // FFXIV reminder arg is ET minutes (max 60); if lead time exceeds
                    // 60 ET minutes we shift the target time back instead.
                    let etReminder = Math.round(leadTimeMinutes * EORZEA_MULTIPLIER);
                    if (etReminder > 60) {
                        targetEorzeaMinute -= etReminder;
                        if (targetEorzeaMinute < 0) targetEorzeaMinute += 24 * 60;
                        etReminder = 0;
                    }
                    const finalEtStr =
                        Math.floor(targetEorzeaMinute / 60).toString().padStart(2, '0') +
                        (targetEorzeaMinute % 60).toString().padStart(2, '0');
                    const rpArg = repeat ? 'repeat ' : '';
                    lines.push(`/alarm "${alarmName}" et ${rpArg}${finalEtStr} ${etReminder}${soundArg}`);
                }
            });
        });
    });

    return lines.join('\n');
}
