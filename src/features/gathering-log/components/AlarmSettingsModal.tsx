import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../../i18n/LanguageContext';
import { useAlarm } from '../hooks/useAlarm';
import { ALARM_SOUND_ERROR_EVENT, playNotificationSound } from '../hooks/useAlarmTrigger';
import { GatheringData } from '../types';
import { getLocalizedText, getNodeItemIds } from '../utils';

interface AlarmSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: GatheringData;
}

export const AlarmSettingsModal: React.FC<AlarmSettingsModalProps> = ({ isOpen, onClose, data }) => {
    const { lang, t } = useLanguage();
    const { 
        globalEnabled, soundEnabled, soundType, localLeadTimeMinutes, macroLeadTimeMinutes, macroTimeMode, macroRepeat, trackedItems, 
        updateSettings, toggleTrackedItem, requestNotificationPermission 
    } = useAlarm();
    
    const [copySuccess, setCopySuccess] = useState(false);
    const [soundWarning, setSoundWarning] = useState<'blocked' | 'missing' | 'failed' | null>(null);

    useEffect(() => {
        const handler = (event: Event) => {
            const customEvent = event as CustomEvent<{ status?: string }>;
            const status = customEvent.detail?.status;
            if (status === 'blocked' || status === 'missing' || status === 'failed') {
                setSoundWarning(status);
            }
        };

        window.addEventListener(ALARM_SOUND_ERROR_EVENT, handler as EventListener);
        return () => window.removeEventListener(ALARM_SOUND_ERROR_EVENT, handler as EventListener);
    }, []);

    const resolveSoundWarningText = () => {
        if (soundWarning === 'blocked') {
            return t.pages.gathering_log.alarm_sound_blocked_warning;
        }
        return t.pages.gathering_log.alarm_sound_unavailable_warning;
    };

    // Filter to get node definitions for tracked items
    const trackedNodesInfo = useMemo(() => {
        const info: { itemName: string, eorzeaTimeStrs: string[] }[] = [];
        
        trackedItems.forEach(itemId => {
            const item = data.items[itemId];
            if (!item) return;
            const localizedName = getLocalizedText(item, lang);
            
            // Find nodes containing this item that have spawn times and valid map
            const nodes = Object.values(data.nodes).filter(node => 
                getNodeItemIds(node).includes(itemId) && node.spawns && node.spawns.length > 0 && node.map !== 0
            );
            
            if (nodes.length > 0) {
                // Collect all spawn times across all nodes for this item
                const allSpawns = new Set<number>();
                nodes.forEach(n => {
                    n.spawns!.forEach(s => allSpawns.add(s));
                });
                
                // Format spawns to FFXIV format: 2400-clock
                // The spawn 's' is the hour (0-23). To make it a 4-digit time (e.g. 4 -> 0400), we multiply by 100.
                const eorzeaTimeStrs = Array.from(allSpawns).sort((a,b) => a-b).map(s => {
                    return (s * 100).toString().padStart(4, '0');
                });
                
                info.push({ itemName: localizedName, eorzeaTimeStrs });
            }
        });
        
        return info;
    }, [trackedItems, data, lang]);

    const generatedMacroText = useMemo(() => {
        if (trackedNodesInfo.length === 0) return '';
        
        const lines: string[] = ['/alarm clear']; // Clear first if generating a full list
        
        const nowRealMs = Date.now();
        const EORZEA_MULTIPLIER = 3600 / 175;
        const currentEorzeaMinutesTotal = Math.floor((nowRealMs * EORZEA_MULTIPLIER) / 60000);
        const currentEorzeaMinuteOfDay = currentEorzeaMinutesTotal % (24 * 60);

        trackedNodesInfo.forEach(info => {
            info.eorzeaTimeStrs.forEach(etStr => {
                // Macro format requested by user: /alarm "name/time" et repeat [time] [reminder_minutes] <se.02> mute
                const soundArg = soundEnabled 
                  ? (soundType >= 101 && soundType <= 103 ? ' <se.1> mute' : ` <se.${String(soundType).padStart(2, '0')}> mute`)
                  : ' mute';
                const alarmName = `${info.itemName}/${etStr}`;
                
                if (macroTimeMode === 'lt') {
                     const spawnHour = parseInt(etStr.substring(0,2), 10);
                     let targetEorzeaMinute = spawnHour * 60;
                     let minutesUntilNextSpawnET = targetEorzeaMinute - currentEorzeaMinuteOfDay;
                     if (minutesUntilNextSpawnET <= 0) {
                         minutesUntilNextSpawnET += 24 * 60;
                     }
                     const minutesUntilNextSpawnReal = minutesUntilNextSpawnET / EORZEA_MULTIPLIER;
                     const nextSpawnRealMs = nowRealMs + (minutesUntilNextSpawnReal * 60000);
                     const date = new Date(nextSpawnRealMs);
                     const ltHours = date.getHours().toString().padStart(2, '0');
                     const ltMins = date.getMinutes().toString().padStart(2, '0');
                     
                     // Local time does not support repeat mutually with our new logic
                     const ltStr = `${ltHours}${ltMins}`;
                     
                     lines.push(`/alarm "${alarmName}" lt ${ltStr} ${macroLeadTimeMinutes}${soundArg}`);
                } else {
                     // FFXIV /alarm et [time] [reminder 0-60]
                     let targetEorzeaMinute = parseInt(etStr.substring(0, 2), 10) * 60;
                     let etReminder = Math.round(macroLeadTimeMinutes * EORZEA_MULTIPLIER);
                     
                     if (etReminder > 60) {
                         // Shift target time back by the total ET minute reminder
                         targetEorzeaMinute -= etReminder;
                         if (targetEorzeaMinute < 0) targetEorzeaMinute += 24 * 60;
                         // Set reminder argument to 0 since we adjusted the target clock
                         etReminder = 0;
                     }
                     
                     const etHours = Math.floor(targetEorzeaMinute / 60).toString().padStart(2, '0');
                     const etMinsStr = (targetEorzeaMinute % 60).toString().padStart(2, '0');
                     
                     // Keep the full 4-digit time even when repeating, because node spawns depend on the specific hour
                     const finalEtStr = `${etHours}${etMinsStr}`;
                     const rpArg = macroRepeat ? 'repeat ' : '';
                     
                     lines.push(`/alarm "${alarmName}" et ${rpArg}${finalEtStr} ${etReminder}${soundArg}`);
                }
            });
        });
        
        return lines.join('\n');
    }, [trackedNodesInfo, macroLeadTimeMinutes, localLeadTimeMinutes, soundEnabled, soundType, macroTimeMode, macroRepeat, isOpen]);

    const handleCopyMacro = () => {
        navigator.clipboard.writeText(generatedMacroText).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        });
    };

    const handleToggleGlobal = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        if (checked) {
            const hasPermission = await requestNotificationPermission();
            if (!hasPermission) {
                alert(t.pages.gathering_log.alarm_browser_permission_denied);
                return;
            }
        }
        updateSettings({ globalEnabled: checked });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                        {t.pages.gathering_log.alarm_settings}
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-grow thin-scrollbar space-y-6">
                    
                    {/* Settings Toggles */}
                    <div className="space-y-4">
                        <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center justify-between group">
                                <span className="font-bold text-slate-700 dark:text-slate-300">{t.pages.gathering_log.alarm_enable}</span>
                                <div className="flex items-center gap-3 z-10">
                                    <button 
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            if (!('Notification' in window)) {
                                                alert(t.pages.gathering_log.alarm_browser_permission);
                                                return;
                                            }
                                            let permission = Notification.permission;
                                            if (permission === 'default') {
                                                const granted = await requestNotificationPermission();
                                                permission = granted ? 'granted' : 'denied';
                                            }
                                            
                                            if (permission === 'granted') {
                                                try {
                                                        const testNotif = new Notification(t.pages.gathering_log.alarm_notification_title, { body: t.pages.gathering_log.alarm_test_notification_body });
                                                    testNotif.onclick = () => window.focus();
                                                } catch (err) {
                                                    console.error('Failed to create notification:', err);
                                                    alert('Cannot show notification. If on mobile Chrome, this requires a PWA/ServiceWorker. Otherwise, ensure you are on HTTPS.');
                                                }
                                            } else {
                                                alert(t.pages.gathering_log.alarm_browser_permission_denied || t.pages.gathering_log.alarm_browser_permission);
                                            }
                                        }}
                                        className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                                    >
                                        {t.pages.gathering_log.alarm_test_notification}
                                    </button>
                                    <label className="relative cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={globalEnabled} onChange={handleToggleGlobal} />
                                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-500 peer-checked:bg-green-500"></div>
                                    </label>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                                <label className="font-bold text-slate-700 dark:text-slate-300 text-sm whitespace-nowrap w-full sm:w-1/3 flex-shrink-0">{t.pages.gathering_log.alarm_lead_time}</label>
                                <div className="flex items-center gap-3 w-full sm:w-2/3">
                                    <input 
                                        type="range" 
                                        min="0" max="10" step="1"
                                        value={localLeadTimeMinutes} 
                                        onChange={(e) => updateSettings({ localLeadTimeMinutes: parseInt(e.target.value) })}
                                        className="flex-grow accent-blue-500"
                                    />
                                    <span className="text-sm font-mono w-8 text-right bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400">{localLeadTimeMinutes}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center justify-between group">
                                <span className="font-bold text-slate-700 dark:text-slate-300">{t.pages.gathering_log.alarm_sound}</span>
                                <div className="flex items-center gap-3 z-10">
                                    <button 
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            const result = await playNotificationSound(soundType);
                                            if (result === 'blocked') {
                                                setSoundWarning('blocked');
                                                alert(t.pages.gathering_log.alarm_sound_blocked_warning);
                                            } else if (result === 'missing' || result === 'failed') {
                                                setSoundWarning(result);
                                                alert(t.pages.gathering_log.alarm_sound_unavailable_warning);
                                            }
                                        }}
                                        className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                                    >
                                        {t.pages.gathering_log.alarm_test_sound}
                                    </button>
                                    <label className="relative cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={soundEnabled} onChange={(e) => updateSettings({ soundEnabled: e.target.checked })} />
                                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-500 peer-checked:bg-green-500"></div>
                                    </label>
                                </div>
                            </div>

                            {soundEnabled && (
                                <div className="flex flex-col gap-1.5 pt-2">
                                    <label className="font-bold text-slate-700 dark:text-slate-300 text-sm">{t.pages.gathering_log.alarm_sound_type}</label>
                                    <select 
                                        value={soundType}
                                        onChange={(e) => updateSettings({ soundType: parseInt(e.target.value) })}
                                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    >
                                        <optgroup label={t.pages.gathering_log.alarm_sound_builtin_group}>
                                            <option value={101}>{t.pages.gathering_log.alarm_sound_type_1}</option>
                                            <option value={102}>{t.pages.gathering_log.alarm_sound_type_2}</option>
                                            <option value={103}>{t.pages.gathering_log.alarm_sound_type_3}</option>
                                        </optgroup>
                                        <optgroup label={t.pages.gathering_log.alarm_sound_mp3_group}>
                                            {Array.from({ length: 16 }, (_, i) => i + 1).map(n => (
                                                <option key={n} value={n}>{`<se.${n}>`}</option>
                                            ))}
                                        </optgroup>
                                    </select>
                                    {soundWarning && (
                                        <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md px-2.5 py-2 mt-1">
                                            {resolveSoundWarningText()}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        
                    </div>

                    <hr className="border-slate-200 dark:border-slate-700" />

                    {/* Macro Section */}
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center justify-between">
                            <span>{t.pages.gathering_log.alarm_macro_gen}</span>
                            <span className="text-xs font-normal text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                {t.pages.gathering_log.alarm_tracked_nodes}{trackedItems.length}
                            </span>
                        </h3>
                        
                        {trackedItems.length === 0 ? (
                            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-500 text-sm rounded-lg border border-yellow-200 dark:border-yellow-900/50">
                                {t.pages.gathering_log.alarm_no_tracked}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <label className="font-bold text-slate-700 dark:text-slate-300 text-sm whitespace-nowrap w-full sm:w-1/3 flex-shrink-0">{t.pages.gathering_log.alarm_lead_time}</label>
                                        <div className="flex items-center gap-3 w-full sm:w-2/3">
                                            <input 
                                                type="range" 
                                                min="0" max="10" step="1"
                                                value={macroLeadTimeMinutes} 
                                                onChange={(e) => updateSettings({ macroLeadTimeMinutes: parseInt(e.target.value) })}
                                                className="flex-grow accent-blue-500"
                                            />
                                            <span className="text-sm font-mono w-8 text-right bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400">{macroLeadTimeMinutes}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{t.pages.gathering_log.alarm_macro_time_mode}</span>
                                    <div className="flex bg-slate-200 dark:bg-slate-700 rounded-lg p-1">
                                        <button 
                                            onClick={() => updateSettings({ macroTimeMode: 'et' })}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${macroTimeMode === 'et' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                        >
                                            {t.pages.gathering_log.alarm_macro_time_mode_et}
                                        </button>
                                        <button 
                                            onClick={() => updateSettings({ macroTimeMode: 'lt', macroRepeat: false })}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${macroTimeMode === 'lt' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                        >
                                            {t.pages.gathering_log.alarm_macro_time_mode_lt}
                                        </button>
                                    </div>
                                </div>
                                
                                <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group">
                                    <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{t.pages.gathering_log.alarm_macro_repeat}</span>
                                    <div className="relative">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer" 
                                            checked={macroRepeat} 
                                            onChange={(e) => {
                                                const isChecked = e.target.checked;
                                                if (isChecked && macroTimeMode === 'lt') {
                                                    updateSettings({ macroRepeat: true, macroTimeMode: 'et' });
                                                } else {
                                                    updateSettings({ macroRepeat: isChecked });
                                                }
                                            }} 
                                        />
                                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-500 peer-checked:bg-blue-500"></div>
                                    </div>
                                </label>

                                <div className="relative">
                                    <pre className="p-3 bg-slate-900 text-slate-300 text-xs font-mono rounded-lg overflow-x-auto border border-slate-700 whitespace-pre-wrap max-h-40 overflow-y-auto thin-scrollbar">
                                        {generatedMacroText}
                                    </pre>
                                    <button 
                                        onClick={handleCopyMacro}
                                        className="absolute top-2 right-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded shadow transition-colors"
                                        title={t.pages.gathering_log.alarm_copy_macro}
                                    >
                                        {copySuccess ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {/* List of tracked items for quick toggle removal */}
                        {trackedItems.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {trackedItems.map(itemId => {
                                    const item = data.items[itemId];
                                    if (!item) return null;
                                    return (
                                        <div key={itemId} className="flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded">
                                            <span className="max-w-[120px] truncate" title={getLocalizedText(item, lang)}>
                                                {getLocalizedText(item, lang)}
                                            </span>
                                            <button 
                                                onClick={() => toggleTrackedItem(itemId)}
                                                className="hover:text-red-500 transition-colors ml-1"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
