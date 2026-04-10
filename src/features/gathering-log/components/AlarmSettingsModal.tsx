import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../../i18n/LanguageContext';
import { useAlarm } from '../hooks/useAlarm';
import { ALARM_SOUND_ERROR_EVENT, playNotificationSound } from '../hooks/useAlarmTrigger';
import { BookmarkGroup, GatheringData } from '../types';
import { getLocalizedText } from '../utils';
import { buildAlarmMacro } from '../alarmMacro';

interface AlarmSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: GatheringData;
    bookmarkGroups: BookmarkGroup[];
    ungroupedBookmarkedItemIds: number[];
}

export const AlarmSettingsModal: React.FC<AlarmSettingsModalProps> = ({
    isOpen,
    onClose,
    data,
    bookmarkGroups,
    ungroupedBookmarkedItemIds,
}) => {
    const { lang, t } = useLanguage();
    const {
        globalEnabled, soundEnabled, soundType, localLeadTimeMinutes, macroLeadTimeMinutes, macroTimeMode, macroRepeat,
        trackedItems,
        updateSettings, requestNotificationPermission
    } = useAlarm();

    const [copySuccess, setCopySuccess] = useState(false);
    const [soundWarning, setSoundWarning] = useState<'blocked' | 'missing' | 'failed' | null>(null);
    const [selectedMacroGroupId, setSelectedMacroGroupId] = useState<string>('__all__');

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

    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const resolveSoundWarningText = () => {
        if (soundWarning === 'blocked') {
            return t.pages.gathering_log.alarm_sound_blocked_warning;
        }
        return t.pages.gathering_log.alarm_sound_unavailable_warning;
    };

    // itemId → bookmark group id lookup (O(1) after build)
    const bookmarkGroupByItemId = useMemo(() => {
        const mapping = new Map<number, string>();
        bookmarkGroups.forEach(group => {
            group.itemIds.forEach(itemId => mapping.set(itemId, group.id));
        });
        return mapping;
    }, [bookmarkGroups]);

    // Build per-group timed-node entries for the macro and group selector
    const groupedTrackedNodesInfo = useMemo(() => {
        const resolveEntry = (itemId: number) => {
            const item = data.items[itemId];
            if (!item) return null;
            const nodes = data.preIndex?.timedNodesByItemId[itemId] || [];
            if (nodes.length === 0) return null;

            const allSpawns = new Set<number>();
            nodes.forEach(node => node.spawns!.forEach(h => allSpawns.add(h)));

            return {
                itemId,
                itemName: getLocalizedText(item, lang),
                eorzeaTimeStrs: Array.from(allSpawns)
                    .sort((a, b) => a - b)
                    .map(h => (h * 100).toString().padStart(4, '0')),
            };
        };

        const entriesByGroupId = new Map<string, ReturnType<typeof resolveEntry>[]>();
        const trackedItemSet = new Set(trackedItems);

        const allBookmarkedItemIds = [
            ...bookmarkGroups.flatMap(g => g.itemIds),
            ...ungroupedBookmarkedItemIds,
        ];

        allBookmarkedItemIds.forEach(itemId => {
            if (!trackedItemSet.has(itemId)) return;
            const resolved = resolveEntry(itemId);
            if (!resolved) return;
            const groupId = bookmarkGroupByItemId.get(itemId) || '__ungrouped__';
            const list = entriesByGroupId.get(groupId) || [];
            list.push(resolved);
            entriesByGroupId.set(groupId, list);
        });

        const grouped = bookmarkGroups.map(group => ({
            groupId: group.id,
            groupLabel: group.name.trim() || t.pages.gathering_log.group_unnamed,
            entries: (entriesByGroupId.get(group.id) || []).filter(Boolean) as NonNullable<ReturnType<typeof resolveEntry>>[],
        }));

        grouped.push({
            groupId: '__ungrouped__',
            groupLabel: t.pages.gathering_log.ungrouped,
            entries: (entriesByGroupId.get('__ungrouped__') || []).filter(Boolean) as NonNullable<ReturnType<typeof resolveEntry>>[],
        });

        return grouped;
    }, [bookmarkGroups, ungroupedBookmarkedItemIds, bookmarkGroupByItemId, trackedItems, data, lang, t.pages.gathering_log.group_unnamed, t.pages.gathering_log.ungrouped]);

    const macroGroupOptions = useMemo(
        () => groupedTrackedNodesInfo.map(({ groupId, groupLabel }) => ({ groupId, groupLabel })),
        [groupedTrackedNodesInfo],
    );

    useEffect(() => {
        if (selectedMacroGroupId === '__all__') return;
        if (!macroGroupOptions.some(g => g.groupId === selectedMacroGroupId)) {
            setSelectedMacroGroupId('__all__');
        }
    }, [macroGroupOptions, selectedMacroGroupId]);

    const generatedMacroText = useMemo(() => {
        const targetGroups = selectedMacroGroupId === '__all__'
            ? groupedTrackedNodesInfo
            : groupedTrackedNodesInfo.filter(g => g.groupId === selectedMacroGroupId);

        return buildAlarmMacro(targetGroups, {
            leadTimeMinutes: macroLeadTimeMinutes,
            timeMode: macroTimeMode,
            repeat: macroRepeat,
            soundEnabled,
            soundType,
        });
    }, [groupedTrackedNodesInfo, selectedMacroGroupId, macroLeadTimeMinutes, macroTimeMode, macroRepeat, soundEnabled, soundType]);

    const handleCopyMacro = () => {
        navigator.clipboard.writeText(generatedMacroText).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        });
    };

    const handleToggleGlobal = async (checked: boolean) => {
        if (checked) {
            const hasPermission = await requestNotificationPermission();
            if (!hasPermission) {
                alert(t.pages.gathering_log.alarm_browser_permission_denied);
                return;
            }
        }
        updateSettings({ globalEnabled: checked });
    };

    const handleTestNotification = async () => {
        if (!('Notification' in window)) return;
        const hasPermission = await requestNotificationPermission();
        if (!hasPermission) {
            alert(t.pages.gathering_log.alarm_browser_permission_denied);
            return;
        }
        new Notification(t.pages.gathering_log.alarm_notification_title, {
            body: t.pages.gathering_log.alarm_test_notification_body,
        });
    };

    const handleTestSound = async () => {
        const result = await playNotificationSound(soundType);
        if (result === 'blocked') {
            setSoundWarning('blocked');
            alert(t.pages.gathering_log.alarm_sound_blocked_warning);
        } else if (result === 'missing' || result === 'failed') {
            setSoundWarning(result);
            alert(t.pages.gathering_log.alarm_sound_unavailable_warning);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>

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
                                        onClick={() => { void handleTestNotification(); }}
                                        className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                                    >
                                        {t.pages.gathering_log.alarm_test_notification}
                                    </button>
                                    <label className="relative cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={globalEnabled}
                                            onChange={(e) => { void handleToggleGlobal(e.target.checked); }}
                                        />
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
                                        onClick={() => { void handleTestSound(); }}
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
                            <div className="flex items-center gap-2">
                                <select
                                    value={selectedMacroGroupId}
                                    onChange={(event) => setSelectedMacroGroupId(event.target.value)}
                                    className="text-xs rounded border border-slate-300 bg-white px-2 py-1 text-slate-700 focus:border-blue-400 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                                    title={t.pages.gathering_log.group_overview}
                                >
                                    <option value="__all__">{t.pages.gathering_log.alarm_macro_all_groups}</option>
                                    {macroGroupOptions.map(group => (
                                        <option key={group.groupId} value={group.groupId}>{group.groupLabel}</option>
                                    ))}
                                </select>
                            </div>
                        </h3>

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
                    </div>
                </div>
            </div>
        </div>
    );
};
