import React from 'react';
import { GatheringData, GatherType, NodeData } from '../../types';
import { getLocalizedText, TIMED_GATHERING_MAP_ICONS, GATHERING_MAP_ICONS, calculateNodeStatus, formatSeconds, getItemIconUrl } from '../../utils';
import { useLanguage } from '../../../../i18n/LanguageContext';
import { AlarmButton, ITEM_ACTION_BUTTON_BASE_CLASS, ITEM_ACTION_ICON_CLASS } from '../AlarmButton';
import { LazyImage } from '../LazyImage';
import { CopyNameButton } from '../shared/CopyNameButton';
import { CollectibleIcon, ItemBadges } from '../shared/ItemBadges';
import { MapItemNameMarquee } from './MapItemNameMarquee';

interface MapSidebarNodeCardProps {
    node: NodeData;
    /** Item ids of this node that pass the whitelist / bookmark filters */
    validNodeItems: number[];
    data: GatheringData;
    /** Epoch ms driving the countdown labels */
    now: number;
    isActive: boolean;
    isLocked: boolean;
    completedItems: Set<number>;
    bookmarkedItems: Set<number>;
    showBookmarks: boolean;
    toggleComplete: (id: number) => void;
    toggleBookmark: (id: number) => void;
    trackedItemSet: Set<number>;
    toggleTrackedItem: (id: number) => void;
    onHoverStart: () => void;
    onHoverEnd: () => void;
    onLockToggle: () => void;
    cardRef: (el: HTMLDivElement | null) => void;
}

/**
 * Sidebar card for one gathering node on the selected map, including the
 * per-item timer bar. Extracted from MapView.tsx (mechanical move).
 */
export const MapSidebarNodeCard: React.FC<MapSidebarNodeCardProps> = ({
    node,
    validNodeItems,
    data,
    now,
    isActive,
    isLocked,
    completedItems,
    bookmarkedItems,
    showBookmarks,
    toggleComplete,
    toggleBookmark,
    trackedItemSet,
    toggleTrackedItem,
    onHoverStart,
    onHoverEnd,
    onLockToggle,
    cardRef,
}) => {
    const { lang, t: i18n } = useLanguage();

    // Determine Icon type for the node header
    let iconKey: GatherType = 'mining';
    if (node.type === 0) iconKey = 'mining';
    else if (node.type === 1) iconKey = 'quarrying';
    else if (node.type === 2) iconKey = 'logging';
    else if (node.type === 3) iconKey = 'harvesting';

    const jobName = i18n.pages.gathering_log[iconKey];

    const isAllCompleted = validNodeItems.every(id => completedItems.has(id));
    const isTimed = node.spawns && node.spawns.length > 0;
    const iconSet = isTimed ? TIMED_GATHERING_MAP_ICONS : GATHERING_MAP_ICONS;

    return (
        <div
            ref={cardRef}
            onMouseEnter={onHoverStart}
            onMouseLeave={onHoverEnd}
            onClick={(e) => {
                e.stopPropagation();
                onLockToggle();
            }}
            className={`rounded-lg p-2 border transition-all duration-200 cursor-pointer ${isActive
                ? 'bg-blue-50 border-blue-300 shadow-md ring-1 dark:bg-blue-900/30 dark:border-blue-500 dark:ring-blue-500'
                : 'bg-slate-50 border-slate-100 dark:bg-slate-700/30 dark:border-slate-700/50'
                } ${isLocked ? 'ring-blue-400 dark:ring-blue-300' : (isActive ? 'ring-blue-200' : '')} ${isAllCompleted ? 'grayscale opacity-60' : ''}`}
        >
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200 dark:border-slate-600">
                <img src={iconSet[iconKey]} className="w-4 h-4 object-contain" alt="" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Lv.{node.level} {jobName}</span>
                <span className="ml-auto text-[10px] font-mono text-slate-400 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                    X:{node.x}, Y:{node.y}
                </span>
            </div>
            <div className="space-y-1">
                {validNodeItems.map(itemId => {
                    const item = data.items[itemId];
                    if (!item) return null;
                    const itemName = getLocalizedText(item, lang);

                    const isBookmarked = bookmarkedItems.has(itemId);
                    if (showBookmarks && !isBookmarked) return null;

                    const isCompleted = completedItems.has(itemId);
                    const collectibleType = item.collectibleType;
                    const isCollectible = Boolean(item.isCollectible);
                    const isCustomDelivery = item.isCustomDelivery === true;
                    const isAetherialReduction = item.isAetherialReduction === true;
                    const showCollectibleIcon = isCollectible || isCustomDelivery;
                    const isCollectionOnly = collectibleType === 'collection-only';
                    const isHidden = (node.hiddenItems || []).includes(itemId);

                    // Timer Logic (ONLY for items in a timed node)
                    let timerElement = null;
                    if (node.spawns && node.spawns.length > 0) {
                        const status = calculateNodeStatus(node.spawns, node.duration || 60);

                        const isActiveWindow = status.status === 'active';
                        const isSoon = status.status === 'soon';
                        const isLater = status.status === 'later';

                        if (isActiveWindow || isSoon || isLater) {
                            const remainingMs = status.endRealTimestamp - now;
                            const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
                            const timeLabel = formatSeconds(seconds);

                            // Progress Bar Calculation
                            let progressPercent = 0;
                            if (isActiveWindow && status.durationRealMs > 0) {
                                progressPercent = Math.max(0, (1 - (now - status.startRealTimestamp) / status.durationRealMs)) * 100;
                            }

                            let barColor = 'bg-slate-300 dark:bg-slate-600';
                            let textColor = 'text-slate-500 dark:text-slate-400';

                            if (isActiveWindow) {
                                barColor = 'bg-green-500';
                                textColor = 'text-green-600 dark:text-green-400';
                            } else if (isSoon) {
                                barColor = 'bg-amber-500';
                                textColor = 'text-amber-600 dark:text-amber-400';
                            }

                            const label = isActiveWindow ? `${i18n.pages.gathering_log.active} ${timeLabel}` : `${i18n.pages.gathering_log.wait} ${formatSeconds(status.secondsUntil)}`;

                            timerElement = (
                                <div className="mt-1 w-full">
                                    <div className={`text-[10px] font-mono font-bold flex justify-between ${textColor}`}>
                                        <span>{label}</span>
                                        {isActiveWindow && <span>{Math.round(progressPercent)}%</span>}
                                    </div>
                                    {isActiveWindow && (
                                        <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden mt-0.5">
                                            <div
                                                className={`h-full ${barColor} transition-all duration-1000 ease-linear rounded-full`}
                                                style={{ width: `${progressPercent}%` }}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        }
                    }

                    return (
                        <div key={itemId} className="flex flex-col gap-1 group/item">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={isCompleted}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={() => toggleComplete(itemId)}
                                    className="custom-checkbox w-3.5 h-3.5 rounded-sm text-blue-500 border-slate-300 focus:ring-offset-0 focus:ring-0 cursor-pointer"
                                />

                                <LazyImage
                                    src={getItemIconUrl(itemId, data.icons)}
                                    className="w-5 h-5 rounded-sm"
                                    alt=""
                                />
                                <div className={`text-xs transition-colors flex-1 min-w-0 ${isCompleted ? 'text-slate-400' : isCollectionOnly ? 'text-slate-500 dark:text-slate-400 italic' : 'text-slate-700 dark:text-slate-200 group-hover/item:text-blue-500'}`}>
                                    <div className="flex items-stretch gap-2 min-w-0">
                                        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                            <div className={`${isCompleted ? 'line-through decoration-slate-400/50' : ''}`}>
                                                <MapItemNameMarquee text={itemName}>
                                                    {showCollectibleIcon && <CollectibleIcon className="w-4 h-4 flex-shrink-0" />}
                                                </MapItemNameMarquee>
                                            </div>

                                            {(isCustomDelivery || isAetherialReduction || isCollectionOnly || isHidden) && (
                                                <div className="flex flex-wrap items-center gap-1">
                                                    <ItemBadges
                                                        isCustomDelivery={isCustomDelivery}
                                                        isAetherialReduction={isAetherialReduction}
                                                        isCollectionOnly={isCollectionOnly}
                                                        isHidden={isHidden}
                                                        badgeClassName="not-italic"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0 self-center">
                                            <CopyNameButton text={itemName} />
                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleBookmark(itemId); }}
                                                className={`${ITEM_ACTION_BUTTON_BASE_CLASS} ${isBookmarked ? 'text-yellow-500' : 'text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                                title="Bookmark"
                                            >
                                                <svg className={ITEM_ACTION_ICON_CLASS} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                            </button>
                                            {isTimed && (
                                                <AlarmButton
                                                    itemId={itemId}
                                                    isTracked={trackedItemSet.has(itemId)}
                                                    onToggleTracked={toggleTrackedItem}
                                                    autoBookmarkOnEnable={true}
                                                    isBookmarked={isBookmarked}
                                                    onToggleBookmark={toggleBookmark}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {timerElement}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
