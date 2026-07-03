import React from 'react';
import { BookmarkGroup, GatheringData, GatherType } from '../types';
import { GATHERING_ICONS } from '../utils';
import { useLanguage } from '../../../i18n/LanguageContext';
import { ItemRow } from './ItemRow';

export interface ItemInfo {
    id: number;
    name: string;
    type: GatherType | null;
    isTimed: boolean;
    nodeInfo: any;
    hidden: boolean;
}

interface BookmarkItemCardProps {
    item: ItemInfo;
    currentGroupId: string | null;
    containerDisplayId: string;
    /** Ordered list of item ids in this container — used to compute insert index on drop. */
    itemListInContainer: number[];
    // DnD shared state (from useBookmarkDragAndDrop)
    activeDragItemId: number | null;
    dropContainerId: string | null;
    dropBeforeItemId: number | null;
    canDrag: boolean;
    setDragItemId: (id: number | null) => void;
    setDropContainerId: (id: string | null) => void;
    setDropBeforeItemId: (id: number | null) => void;
    clearDragState: () => void;
    maybeAutoScrollOnDrag: (clientY: number) => void;
    onDropItem?: (draggedId: number, targetGroupId: string | null, insertIdx?: number) => void;
    // Group selector
    bookmarkGroups: BookmarkGroup[];
    onMoveToGroup?: (itemId: number, groupId: string | null) => void;
    showGroupSelector: boolean;
    // Item state + actions
    data: GatheringData;
    isCompleted: boolean;
    isAlarmTracked: boolean;
    toggleComplete: (id: number) => void;
    toggleBookmark: (id: number) => void;
    toggleAlarm: (id: number) => void;
}

const typeIcons: Record<GatherType, string> = {
    mining: GATHERING_ICONS.mining,
    quarrying: GATHERING_ICONS.quarrying,
    logging: GATHERING_ICONS.logging,
    harvesting: GATHERING_ICONS.harvesting,
};

export const BookmarkItemCard: React.FC<BookmarkItemCardProps> = ({
    item,
    currentGroupId,
    containerDisplayId,
    itemListInContainer,
    activeDragItemId,
    dropContainerId,
    dropBeforeItemId,
    canDrag,
    setDragItemId,
    setDropContainerId,
    setDropBeforeItemId,
    clearDragState,
    maybeAutoScrollOnDrag,
    onDropItem,
    bookmarkGroups,
    onMoveToGroup,
    showGroupSelector,
    data,
    isCompleted,
    isAlarmTracked,
    toggleComplete,
    toggleBookmark,
    toggleAlarm,
}) => {
    const { t: i18n } = useLanguage();

    // Stable entry object so ItemRow's React.memo isn't defeated by a fresh
    // object literal on every render
    const itemRowEntry = React.useMemo(
        () => ({ itemId: item.id, lvl: item.nodeInfo?.level || 0, ilvl: 0, stars: 0, hidden: item.hidden ? 1 : 0 }),
        [item.id, item.nodeInfo?.level, item.hidden]
    );

    const isDragging = activeDragItemId === item.id;
    const isDropTarget = dropBeforeItemId === item.id && dropContainerId === containerDisplayId;

    return (
        <div
            draggable={canDrag}
            onDragStart={(e) => {
                setDragItemId(item.id);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', String(item.id));
            }}
            onDragEnd={clearDragState}
            onDragOver={(e) => {
                if (!activeDragItemId || activeDragItemId === item.id || !onDropItem) return;
                e.preventDefault();
                e.stopPropagation();
                maybeAutoScrollOnDrag(e.clientY);
                e.dataTransfer.dropEffect = 'move';
                setDropContainerId(containerDisplayId);
                setDropBeforeItemId(item.id);
            }}
            onDrop={(e) => {
                if (!activeDragItemId || !onDropItem) return;
                e.preventDefault();
                e.stopPropagation();
                if (activeDragItemId === item.id) return;
                const insertIdx = itemListInContainer.indexOf(item.id);
                onDropItem(activeDragItemId, currentGroupId, insertIdx >= 0 ? insertIdx : undefined);
                clearDragState();
            }}
            className={`relative group bg-slate-50 dark:bg-slate-900/50 rounded-lg border transition-all overflow-hidden ${
                isDragging
                    ? 'opacity-40 cursor-grabbing'
                    : isDropTarget
                        ? 'ring-2 ring-blue-400 ring-inset border-transparent'
                        : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 hover:shadow-sm'
            } ${canDrag ? 'sm:pl-5 sm:cursor-grab' : ''}`}
        >
            <div className="h-full">
                {/* Drag handle (desktop only) */}
                {canDrag && (
                    <div
                        className="absolute inset-y-0 left-0 z-10 hidden w-5 sm:flex items-center justify-center border-r border-slate-200/70 dark:border-slate-700/70 bg-slate-100/70 dark:bg-slate-800/40 text-slate-300 dark:text-slate-600 hover:text-slate-400 dark:hover:text-slate-500 select-none cursor-grab active:cursor-grabbing"
                        aria-hidden="true"
                    >
                        <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" className="pointer-events-none">
                            <circle cx="2" cy="2" r="1.5"/>
                            <circle cx="8" cy="2" r="1.5"/>
                            <circle cx="2" cy="7" r="1.5"/>
                            <circle cx="8" cy="7" r="1.5"/>
                            <circle cx="2" cy="12" r="1.5"/>
                            <circle cx="8" cy="12" r="1.5"/>
                        </svg>
                    </div>
                )}

                {/* Group selector (move to group) */}
                {showGroupSelector && onMoveToGroup && (
                    <div className="absolute bottom-2 left-2 sm:left-7 z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <label className="sr-only" htmlFor={`bookmark-group-${item.id}`}>
                            {i18n.pages.gathering_log.group_move_item}
                        </label>
                        <select
                            id={`bookmark-group-${item.id}`}
                            value={currentGroupId ?? ''}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                                e.stopPropagation();
                                onMoveToGroup(item.id, e.target.value || null);
                            }}
                            className="max-w-[140px] rounded-md border border-slate-300 bg-white/95 px-2 py-1 text-[11px] text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none dark:border-slate-600 dark:bg-slate-800/95 dark:text-slate-200"
                            title={i18n.pages.gathering_log.group_move_item}
                        >
                            <option value="">{i18n.pages.gathering_log.ungrouped}</option>
                            {bookmarkGroups.map(group => (
                                <option key={group.id} value={group.id}>{group.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                <ItemRow
                    item={itemRowEntry}
                    data={data}
                    isCompleted={isCompleted}
                    isBookmarked={true}
                    isAlarmTracked={isAlarmTracked}
                    toggleComplete={toggleComplete}
                    toggleBookmark={toggleBookmark}
                    toggleAlarm={toggleAlarm}
                    disableHover={true}
                    disableGrayscale={true}
                    autoBookmarkOnAlarm={false}
                />

                {/* Gather type icon */}
                {item.type && (
                    <div className="absolute top-2 left-2 sm:left-7 opacity-50 group-hover:opacity-100 transition-opacity">
                        <img src={typeIcons[item.type]} className="w-5 h-5" alt="" />
                    </div>
                )}
            </div>
        </div>
    );
};
