import React, { useState, useEffect } from 'react';
import { GatheringData, GatherType, NodeData } from '../types';
import { useLanguage } from '../../../i18n/LanguageContext';
import { useTool } from '../../../context/ToolContext';
import { calculateNodeStatus, getLocalizedText, GATHERING_ICONS, NodeStatus, formatSeconds, UI_ICON_URLS } from '../utils';
import { AlarmButton, ITEM_ACTION_BUTTON_BASE_CLASS, ITEM_ACTION_ICON_CLASS } from './AlarmButton';

interface TimedViewProps {
    data: GatheringData;
    currentType: 'mining' | 'quarrying' | 'logging' | 'harvesting' | 'all';
    completedItems: Set<number>;
    bookmarkedItems: Set<number>;
    toggleBookmark: (id: number) => void;
    toggleComplete: (id: number) => void;
    hideCompleted: boolean;
    showBookmarks: boolean;
}

const TimedItemCopyButton: React.FC<{ text: string; title?: string }> = ({ text, title = 'Copy Name' }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <button
            onClick={handleCopy}
            className={`${ITEM_ACTION_BUTTON_BASE_CLASS} ${copied ? 'text-green-500' : 'text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300'}`}
            title={copied ? 'Copied!' : title}
        >
            {copied ? (
                <svg className={ITEM_ACTION_ICON_CLASS} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            ) : (
                <svg className={ITEM_ACTION_ICON_CLASS} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            )}
        </button>
    );
};

export const TimedView: React.FC<TimedViewProps> = ({ data, currentType, completedItems, bookmarkedItems, toggleBookmark, toggleComplete, hideCompleted, showBookmarks }) => {
    const { lang, t: i18n } = useLanguage();
    const { setMapModal } = useTool();
    const [now, setNow] = useState(Date.now());

    // Update current time every 200ms for smooth countdown display
    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Date.now());
        }, 200);
        return () => clearInterval(interval);
    }, []);

    // Filter nodes for current type with spawns
    const targetTypeMap: Record<string, number> = { mining: 0, quarrying: 1, logging: 2, harvesting: 3 };
    const targetIds = currentType === 'all' ? [0, 1, 2, 3] : [targetTypeMap[currentType]];

    const typeNodes = Object.values(data.nodes).filter(node =>
        targetIds.includes(node.type) && node.spawns && node.spawns.length > 0 && node.map !== 0
    );

    // Calculate status for each node (provides anchored timestamps)
    const nodesWithStatus = typeNodes.map(node => {
        const status = calculateNodeStatus(node.spawns!, node.duration || 60);
        return { ...node, statusInfo: status };
    });

    // Group by status: Active > Soon > Later
    const activeNodes = nodesWithStatus.filter(n => n.statusInfo.status === 'active').sort((a, b) => a.statusInfo.secondsRemaining - b.statusInfo.secondsRemaining);
    const soonNodes = nodesWithStatus.filter(n => n.statusInfo.status === 'soon').sort((a, b) => a.statusInfo.secondsUntil - b.statusInfo.secondsUntil);
    const laterNodes = nodesWithStatus.filter(n => n.statusInfo.status === 'later').sort((a, b) => a.statusInfo.secondsUntil - b.statusInfo.secondsUntil);

    const renderNodeCard = (node: NodeData & { statusInfo: NodeStatus }) => {
        const itemId = node.items[0];
        const item = data.items[itemId]; // Assume primary item for now
        if (!item) return null;

        const isCompleted = completedItems.has(itemId);
        const isBookmarked = bookmarkedItems.has(itemId);
        const isCollectible = Boolean(item.isCollectible);
        const isCustomDelivery = item.isCustomDelivery === true;
        const isAetherialReduction = item.isAetherialReduction === true;
        const showCollectibleIcon = isCollectible || isCustomDelivery;
        const isHidden = (node.hiddenItems || []).includes(itemId);
        if (hideCompleted && isCompleted) return null;
        if (showBookmarks && !isBookmarked) return null;

        // Determine Job Info
        const jobKey = (['mining', 'quarrying', 'logging', 'harvesting'][node.type] || 'mining') as GatherType;
        const jobIcon = GATHERING_ICONS[jobKey];
        // @ts-ignore
        const jobName = i18n.pages.gathering_log[jobKey];

        // Determine Folklore / Group Name
        const groupName = node.folklore ? getLocalizedText(data.items[node.folklore], lang) : 'General / Base Game';

        const map = data.maps[node.map];
        const mapName = map ? getLocalizedText(data.places[map.placename_id], lang) : 'Unknown';
        const zoneName = (node.zoneid && data.places[node.zoneid]) ? getLocalizedText(data.places[node.zoneid], lang) : '';
        const locationName = (zoneName && zoneName !== mapName) ? `${mapName} - ${zoneName}` : mapName;

        const isActive = node.statusInfo.status === 'active';
        const isSoon = node.statusInfo.status === 'soon';

        const progressColor = isActive ? 'bg-green-500' : (isSoon ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600');
        const borderColor = isActive ? 'border-green-500/50 shadow-green-500/20' : (isSoon ? 'border-amber-500/50 shadow-amber-500/20' : 'border-slate-200 dark:border-slate-700');
        const badgeColor = isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : (isSoon ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400');

        // Timer Logic - use anchored timestamps for perfectly even 1-second countdown
        const remainingMs = node.statusInfo.endRealTimestamp - now;
        const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
        const timeLabel = formatSeconds(seconds);

        // Dynamic Breathing Frequency
        const getPulseDuration = (secs: number) => {
            if (secs <= 60) return 0.75; // Critical
            if (secs <= 180) return 1.5;  // Urgent
            if (secs <= 300) return 3;  // Warning
            return 4;                   // Normal
        };
        const pulseDuration = isActive ? getPulseDuration(seconds) : 0;
        const isAnimating = isActive && !isCompleted;

        return (
            <div
                key={node.id}
                className={`relative bg-white dark:bg-slate-800 rounded-lg border flex flex-col justify-between ${borderColor} shadow-sm overflow-hidden hover:shadow-md transition-all h-full ${isCompleted ? 'opacity-40 grayscale' : ''}`}
            >
                <div className="p-3 flex-grow flex flex-col">
                    {/* Header: Spawn Time & Status Badge */}
                    <div className="flex justify-between items-start mb-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
                            {node.statusInfo.spawnTime}
                        </span>

                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                            {isActive ? (
                                <>
                                    <span className="relative flex h-2 w-2">
                                        {isAnimating && (
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" style={{ animationDuration: `${pulseDuration}s` }}></span>
                                        )}
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                    </span>
                                    {i18n.pages.gathering_log.active}
                                </>
                            ) : (isSoon ? i18n.pages.gathering_log.timed_soon : i18n.pages.gathering_log.wait)}
                        </div>
                    </div>

                    {/* Content: Icon & Info */}
                    <div className="flex items-start gap-3 mb-2">
                        <div className="flex flex-col items-center gap-2 self-center shrink-0">
                            <input
                                type="checkbox"
                                checked={isCompleted}
                                onChange={() => toggleComplete(itemId)}
                                className="custom-checkbox w-5 h-5 cursor-pointer text-slate-800 dark:text-slate-200"
                            />

                        </div>
                        <img src={data.icons[itemId] ? `https://xivapi.com${data.icons[itemId]}` : UI_ICON_URLS.defaultItem} className="w-10 h-10 object-contain rounded shrink-0 bg-slate-100 dark:bg-slate-700" />
                        <div className="flex-grow min-w-0">
                            <div className="mb-1 flex items-center gap-2 min-w-0" title={getLocalizedText(item, lang)}>
                                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate leading-tight min-w-0">
                                    {getLocalizedText(item, lang)}
                                </h4>
                                {showCollectibleIcon && (
                                    <img
                                        src={UI_ICON_URLS.collectible}
                                        className="w-4 h-4 shrink-0"
                                        alt="Collectible"
                                        title={i18n.pages.gathering_log.collectible_tag}
                                    />
                                )}
                                {isCustomDelivery && (
                                    <span className="inline-flex items-center gap-1 text-[10px] px-1 rounded border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 w-fit shrink-0">
                                        <img
                                            src={UI_ICON_URLS.customDelivery}
                                            className="w-3 h-3"
                                            alt="Custom Delivery"
                                            title={i18n.pages.gathering_log.custom_delivery_tag}
                                        />
                                        {i18n.pages.gathering_log.custom_delivery_tag}
                                    </span>
                                )}
                                {isAetherialReduction && (
                                    <span className="text-[10px] px-1 rounded border border-teal-300 dark:border-teal-700 text-teal-600 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/20 w-fit shrink-0">
                                        {i18n.pages.gathering_log.aetherial_reduction_tag}
                                    </span>
                                )}
                                {isHidden && (
                                    <span className="inline-flex items-center text-[10px] px-1 rounded border border-red-300 dark:border-red-700 text-red-500 dark:text-red-300 bg-red-50 dark:bg-red-900/20 w-fit shrink-0">
                                        {i18n.pages.gathering_log.hidden_tag}
                                    </span>
                                )}
                                <div className="flex items-center gap-1 shrink-0 ml-auto pl-1">
                                    <TimedItemCopyButton text={getLocalizedText(item, lang)} />
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleBookmark(itemId); }}
                                        className={`${ITEM_ACTION_BUTTON_BASE_CLASS} ${isBookmarked ? 'text-yellow-500' : 'text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                        title="Bookmark"
                                    >
                                        <svg className={ITEM_ACTION_ICON_CLASS} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                    </button>
                                    <AlarmButton itemId={itemId} />
                                </div>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-col gap-0.5">
                                {/* Job Icon & Name */}
                                <div className="flex items-center gap-1 mb-0.5 text-slate-600 dark:text-slate-300">
                                    <img src={jobIcon} className="w-3.5 h-3.5" alt="" />
                                    <span>{jobName}</span>
                                </div>
                                {node.x && node.y && (
                                    <button
                                        onClick={() => setMapModal({ isOpen: true, mapId: node.map, x: node.x, y: node.y, itemName: getLocalizedText(item, lang), type: node.type })}
                                        className="text-blue-500 hover:underline cursor-pointer text-left truncate"
                                    >
                                        <div className="flex items-center gap-1 truncate" title={locationName}>
                                            <span>📍 {locationName}</span>
                                        </div>
                                        (X:{node.x}, Y:{node.y})
                                    </button>
                                )}
                                {node.folklore && (
                                    <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 truncate mt-0.5" title={groupName}>
                                        <img src={GATHERING_ICONS.folklore} className="w-3 h-3" />
                                        {groupName}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto"></div>

                    {/* Timer Display at Bottom */}
                    <div className={`text-center font-mono font-bold text-2xl tracking-tight mb-3 ${isActive ? 'text-green-600 dark:text-green-400' : (isSoon ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400')}`} style={isAnimating ? { animation: `pulse ${pulseDuration}s cubic-bezier(0.4, 0, 0.6, 1) infinite` } : {}}>
                        <span className="text-[10px] mr-1 opacity-70 font-sans font-normal align-middle">
                            {isActive ? i18n.pages.gathering_log.mins_left : ""}
                        </span>
                        {timeLabel}
                    </div>

                    {/* Rounded Progress Bar Bottom */}
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                        <div
                            className={`h-full ${progressColor} transition-all duration-300 ease-linear rounded-full`}
                            style={{ width: `${isActive && node.statusInfo.durationRealMs > 0 ? Math.max(0, (1 - (now - node.statusInfo.startRealTimestamp) / node.statusInfo.durationRealMs)) * 100 : 0}%` }}
                        />
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Active Section */}
            {activeNodes.length > 0 && (
                <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-2 mb-3 px-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 dark:text-green-400 shadow-sm rounded-full bg-green-100 dark:bg-green-900/20 p-0.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        <h3 className="font-bold text-green-700 dark:text-green-400 text-lg">{i18n.pages.gathering_log.timed_active}</h3>
                        <span className="ml-auto bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs font-bold px-2 py-0.5 rounded-full">{activeNodes.length}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-2">
                        {activeNodes.map(renderNodeCard)}
                    </div>
                </section>
            )}

            {/* Soon Section */}
            {soonNodes.length > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-3 px-2 mt-6 border-t border-slate-200 dark:border-slate-700 pt-4">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 dark:text-amber-400 shadow-sm rounded-full bg-amber-100 dark:bg-amber-900/20 p-0.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        <h3 className="font-bold text-amber-700 dark:text-amber-400 text-lg">{i18n.pages.gathering_log.timed_soon}</h3>
                        <span className="ml-auto bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-xs font-bold px-2 py-0.5 rounded-full">{soonNodes.length}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-2">
                        {soonNodes.map(renderNodeCard)}
                    </div>
                </section>
            )}

            {/* Later Section */}
            {laterNodes.length > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-3 px-2 mt-6 border-t border-slate-200 dark:border-slate-700 pt-4 opacity-75">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500 dark:text-slate-400 shadow-sm rounded-full bg-slate-100 dark:bg-slate-800 p-0.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                        <h3 className="font-bold text-slate-700 dark:text-slate-400 text-lg">{i18n.pages.gathering_log.timed_later}</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-2 opacity-90">
                        {laterNodes.map(renderNodeCard)}
                    </div>
                </section>
            )}


            {activeNodes.filter(n => {
                const itemId = n.items[0];
                if (hideCompleted && completedItems.has(itemId)) return false;
                if (showBookmarks && !bookmarkedItems.has(itemId)) return false;
                return true;
            }).length === 0 &&
                soonNodes.filter(n => {
                    const itemId = n.items[0];
                    if (hideCompleted && completedItems.has(itemId)) return false;
                    if (showBookmarks && !bookmarkedItems.has(itemId)) return false;
                    return true;
                }).length === 0 &&
                laterNodes.filter(n => {
                    const itemId = n.items[0];
                    if (hideCompleted && completedItems.has(itemId)) return false;
                    if (showBookmarks && !bookmarkedItems.has(itemId)) return false;
                    return true;
                }).length === 0 && (
                    <div className="text-center p-10 text-slate-500">{i18n.pages.gathering_log.no_timed_nodes}</div>
                )}
        </div>
    );
};
