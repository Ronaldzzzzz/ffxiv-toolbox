import React, { useMemo, useState } from 'react';
import { GatheringData, GatherType, BookmarkGroup } from '../types';
import { getLocalizedText, GATHERING_ICONS } from '../utils';
import { useLanguage } from '../../../i18n/LanguageContext';
import { ItemRow } from './ItemRow';
import { GroupHeader } from './GroupHeader';

interface BookmarkViewProps {
  data: GatheringData;
  completedItems: Set<number>;
  bookmarkedItems: Set<number>;
  trackedItems?: number[];
  toggleTrackedItem?: (itemId: number) => void;
  setTrackedItems?: (itemIds: number[], enabled: boolean, options?: { groupId?: string | null }) => void;
  bookmarkGroups: BookmarkGroup[];
  ungroupedBookmarkedItemIds: number[];
  toggleComplete: (id: number) => void;
  toggleBookmark: (id: number) => void;
  hideCompleted: boolean;
  createGroup?: (name: string) => string | null;
  updateGroup?: (groupId: string, patch: Partial<Omit<BookmarkGroup, 'id' | 'itemIds' | 'createdAt' | 'updatedAt'>>) => void;
  removeGroup?: (groupId: string) => void;
  moveBookmarkedItem?: (itemId: number, destinationGroupId: string | null, index?: number) => void;
  maxBookmarkGroups?: number;
}

export const BookmarkView: React.FC<BookmarkViewProps> = ({
  data,
  completedItems,
  bookmarkedItems,
  trackedItems = [],
  toggleTrackedItem,
  setTrackedItems,
  bookmarkGroups,
  ungroupedBookmarkedItemIds,
  toggleComplete,
  toggleBookmark,
  hideCompleted,
  createGroup,
  updateGroup,
  removeGroup,
  moveBookmarkedItem,
  maxBookmarkGroups = 5,
}) => {
  const { lang, t: i18n } = useLanguage();
  const [isTimedUngroupedCollapsed, setIsTimedUngroupedCollapsed] = useState(false);
  const [isRegularUngroupedCollapsed, setIsRegularUngroupedCollapsed] = useState(false);

  // Drag-and-drop state for item reordering
  const [dragItemId, setDragItemId] = useState<number | null>(null);
  const [dropContainerId, setDropContainerId] = useState<string | null>(null);
  const [dropBeforeItemId, setDropBeforeItemId] = useState<number | null>(null);
  const clearDragState = () => {
    setDragItemId(null);
    setDropContainerId(null);
    setDropBeforeItemId(null);
  };

  // Build item info map
  const bookmarkedItemsList = useMemo(() => {
    const hiddenItemIds = new Set<number>();
    data.pages.forEach(typePages => {
      typePages.forEach(page => {
        page.items.forEach(entry => {
          if (entry.hidden === 1) hiddenItemIds.add(entry.itemId);
        });
      });
    });

    const itemInfoMap = new Map<number, { id: number; name: string; type: GatherType | null; isTimed: boolean; nodeInfo: any; hidden: boolean }>();

    const processItemId = (id: number) => {
      if (itemInfoMap.has(id)) return;

      const itemInfo = data.items[id];
      if (!itemInfo) return;

      let type: GatherType | null = null;
      let isTimed = false;
      let nodeRef = null;

      const nodes = data.preIndex?.nodesByItemId[id] || [];
      const timedNode = nodes.find(n => n.spawns && n.spawns.length > 0);

      if (timedNode) {
        isTimed = true;
        nodeRef = timedNode;
        const typeMapping: Record<number, GatherType> = { 0: 'mining', 1: 'quarrying', 2: 'logging', 3: 'harvesting' };
        type = typeMapping[timedNode.type] || 'mining';
      } else {
        type = data.preIndex?.pageTypeByItemId[id] ?? null;
      }

      itemInfoMap.set(id, {
        id,
        name: getLocalizedText(itemInfo, lang),
        type,
        isTimed,
        nodeInfo: nodeRef,
        hidden: hiddenItemIds.has(id)
      });
    };

    bookmarkedItems.forEach(id => processItemId(id));

    return itemInfoMap;
  }, [bookmarkedItems, data, lang]);

  // Helper to filter displayed items
  type ItemInfo = { id: number; name: string; type: GatherType | null; isTimed: boolean; nodeInfo: any; hidden: boolean };
  const getDisplayItems = (itemIds: number[]): ItemInfo[] => {
    return itemIds
      .map(id => bookmarkedItemsList.get(id))
      .filter((item): item is NonNullable<typeof item> => {
        if (!item) return false;
        if (hideCompleted && completedItems.has(item.id)) return false;
        return true;
      });
  };

  // Check if any bookmarked items exist
  const totalBookmarkedCount = bookmarkedItems.size;
  const hasBookmarkGroups = bookmarkGroups.length > 0;

  const nextDefaultGroupName = useMemo(() => {
    let nextIndex = 1;
    while (bookmarkGroups.some(group => group.name === `${i18n.pages.gathering_log.group_default_prefix}${nextIndex}`)) {
      nextIndex += 1;
    }
    return `${i18n.pages.gathering_log.group_default_prefix}${nextIndex}`;
  }, [bookmarkGroups, i18n.pages.gathering_log.group_default_prefix]);

  const groupDisplaySections = useMemo(() => {
    return bookmarkGroups.map(group => ({
      group,
      displayItems: getDisplayItems(group.itemIds),
    }));
  }, [bookmarkGroups, bookmarkedItemsList, completedItems, hideCompleted]);

  const ungroupedDisplayItems = useMemo(() => {
    return getDisplayItems(ungroupedBookmarkedItemIds);
  }, [ungroupedBookmarkedItemIds, bookmarkedItemsList, completedItems, hideCompleted]);

  const timedUngroupedItems = useMemo(
    () => ungroupedDisplayItems.filter(item => item.isTimed),
    [ungroupedDisplayItems],
  );

  const regularUngroupedItems = useMemo(
    () => ungroupedDisplayItems.filter(item => !item.isTimed),
    [ungroupedDisplayItems],
  );

  const hasAnyVisibleBookmarks =
    groupDisplaySections.some(section => section.displayItems.length > 0) ||
    timedUngroupedItems.length > 0 ||
    regularUngroupedItems.length > 0;

  const trackedItemSet = useMemo(() => new Set(trackedItems), [trackedItems]);

  const maybeAutoScrollOnDrag = (event: React.DragEvent) => {
    const edge = 140;
    const step = 18;
    const { clientY } = event;

    if (clientY < edge) {
      window.scrollBy({ top: -step, behavior: 'auto' });
      return;
    }

    if (clientY > window.innerHeight - edge) {
      window.scrollBy({ top: step, behavior: 'auto' });
    }
  };

  // Render single item card (reusable)
  const renderItemCard = (item: ReturnType<typeof getDisplayItems>[0], currentGroupId: string | null, containerDisplayId: string) => {
    const typeIcons: Record<GatherType, string> = {
      mining: GATHERING_ICONS.mining,
      quarrying: GATHERING_ICONS.quarrying,
      logging: GATHERING_ICONS.logging,
      harvesting: GATHERING_ICONS.harvesting
    };

    const isDragging = dragItemId === item.id;
    const isDropTarget = dropBeforeItemId === item.id && dropContainerId === containerDisplayId;

    return (
      <div
        key={item.id}
        draggable={!!moveBookmarkedItem}
        onDragStart={(e) => {
          if (!moveBookmarkedItem) return;
          setDragItemId(item.id);
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', String(item.id));
        }}
        onDragEnd={clearDragState}
        onDragOver={(e) => {
          if (!dragItemId || dragItemId === item.id || !moveBookmarkedItem) return;
          e.preventDefault();
          e.stopPropagation();
          maybeAutoScrollOnDrag(e);
          e.dataTransfer.dropEffect = 'move';
          setDropContainerId(containerDisplayId);
          setDropBeforeItemId(item.id);
        }}
        onDrop={(e) => {
          if (!dragItemId || !moveBookmarkedItem) return;
          e.preventDefault();
          e.stopPropagation();
          if (dragItemId === item.id) return;
          const targetList = currentGroupId
            ? bookmarkGroups.find(g => g.id === currentGroupId)?.itemIds ?? []
            : ungroupedBookmarkedItemIds;
          const insertIdx = targetList.indexOf(item.id);
          moveBookmarkedItem(dragItemId, currentGroupId, insertIdx >= 0 ? insertIdx : undefined);
          clearDragState();
        }}
        className={`relative group bg-slate-50 dark:bg-slate-900/50 rounded-lg border transition-all overflow-hidden ${
          isDragging
            ? 'opacity-40 cursor-grabbing'
            : isDropTarget
              ? 'ring-2 ring-blue-400 ring-inset border-transparent'
              : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 hover:shadow-sm'
        } ${moveBookmarkedItem ? 'sm:pl-5 sm:cursor-grab' : ''}`}
      >
        <div className="h-full">
          {/* Drag handle (desktop only, pinned to full card height) */}
          {moveBookmarkedItem && (
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
        {moveBookmarkedItem && (hasBookmarkGroups || currentGroupId) && (
          <div className="absolute bottom-2 left-2 sm:left-7 z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <label className="sr-only" htmlFor={`bookmark-group-${item.id}`}>
              {i18n.pages.gathering_log.group_move_item}
            </label>
            <select
              id={`bookmark-group-${item.id}`}
              value={currentGroupId ?? ''}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => {
                event.stopPropagation();
                moveBookmarkedItem(item.id, event.target.value || null);
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
            item={{ itemId: item.id, lvl: item.nodeInfo?.level || 0, ilvl: 0, stars: 0, hidden: item.hidden ? 1 : 0 }}
            data={data}
            isCompleted={completedItems.has(item.id)}
            isBookmarked={true}
            isAlarmTracked={trackedItemSet.has(item.id)}
            toggleComplete={toggleComplete}
            toggleBookmark={toggleBookmark}
            toggleAlarm={toggleTrackedItem || (() => {})}
            disableHover={true}
            disableGrayscale={true}
            autoBookmarkOnAlarm={false}
          />
          {item.type && (
            <div className="absolute top-2 left-2 sm:left-7 opacity-50 group-hover:opacity-100 transition-opacity">
              <img src={typeIcons[item.type]} className="w-5 h-5" alt="" />
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render group section
  const renderGroupSection = (
    group: BookmarkGroup,
    displayItems: ItemInfo[],
    currentGroupId: string | null,
    customCollapseHandler?: (groupId: string, collapsed: boolean) => void,
  ) => {
    const isUngroupedSection = group.id.startsWith('__ungrouped_');
    const timedItemIdsInGroup = group.itemIds.filter(itemId => bookmarkedItemsList.get(itemId)?.isTimed === true);
    const trackedTimedCount = timedItemIdsInGroup.reduce((count, itemId) => count + (trackedItemSet.has(itemId) ? 1 : 0), 0);
    const hasTimedItems = timedItemIdsInGroup.length > 0;

    return (
      <div key={`group-${group.id}`}>
        <GroupHeader
          group={group}
          itemCount={displayItems.length}
          inlineContent={hasTimedItems && setTrackedItems ? (
            <>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                {i18n.pages.gathering_log.bookmark_alarm_status
                  .replace('{tracked}', String(trackedTimedCount))
                  .replace('{total}', String(timedItemIdsInGroup.length))}
              </span>
              <button
                type="button"
                onClick={() => setTrackedItems(timedItemIdsInGroup, true, { groupId: isUngroupedSection ? null : currentGroupId })}
                className="inline-flex items-center rounded-md border border-blue-300 bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 transition-colors whitespace-nowrap"
              >
                {i18n.pages.gathering_log.bookmark_alarm_track_all}
              </button>
              <button
                type="button"
                onClick={() => setTrackedItems(timedItemIdsInGroup, false)}
                className="inline-flex items-center rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
              >
                {i18n.pages.gathering_log.bookmark_alarm_clear_all}
              </button>
            </>
          ) : undefined}
          onCollapse={customCollapseHandler || (updateGroup ? (groupId, collapsed) => {
            updateGroup(groupId, { collapsed });
          } : undefined)}
          onRename={updateGroup ? (groupId, newName) => {
            updateGroup(groupId, { name: newName });
          } : undefined}
          onDelete={isUngroupedSection ? undefined : removeGroup}
          isUngrouped={isUngroupedSection}
        />
        {!group.collapsed && (
          <div
            className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border-b border-slate-200 dark:border-slate-600 transition-colors ${
              dragItemId && dropContainerId === group.id && !dropBeforeItemId
                ? 'bg-blue-50 dark:bg-blue-900/20'
                : 'bg-white dark:bg-slate-800'
            }`}
            onDragOver={(e) => {
              if (!dragItemId || !moveBookmarkedItem) return;
              e.preventDefault();
              maybeAutoScrollOnDrag(e);
              e.dataTransfer.dropEffect = 'move';
              setDropContainerId(group.id);
              setDropBeforeItemId(null);
            }}
            onDrop={(e) => {
              if (!dragItemId || !moveBookmarkedItem) return;
              e.preventDefault();
              moveBookmarkedItem(dragItemId, currentGroupId);
              clearDragState();
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                if (dropContainerId === group.id) {
                  setDropContainerId(null);
                  setDropBeforeItemId(null);
                }
              }
            }}
          >
            {displayItems.length > 0 ? displayItems.map(item => renderItemCard(item, currentGroupId, group.id)) : (
              <div className="col-span-full rounded-lg border border-dashed border-slate-300 bg-slate-50/80 px-4 py-5 text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-900/20 dark:text-slate-400">
                {i18n.pages.gathering_log.group_empty}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Empty state
  if (totalBookmarkedCount === 0 && bookmarkGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 dark:text-slate-500">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-50"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
        <p className="text-lg font-bold">{i18n.pages.gathering_log.no_bookmarks}</p>
      </div>
    );
  }

  return (
    <div
      className="space-y-8 fade-in px-4 py-6"
      onDragOverCapture={(event) => {
        if (!dragItemId || !moveBookmarkedItem) return;
        maybeAutoScrollOnDrag(event);
      }}
    >
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 bg-violet-50 dark:bg-violet-900/10 border-b border-violet-100 dark:border-violet-900/30 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🗂️</span>
            <h2 className="text-lg font-bold text-violet-800 dark:text-violet-300">{i18n.pages.gathering_log.group_overview}</h2>
          </div>

          {createGroup && (
            <div className="flex w-full flex-col items-start gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <span className="w-full text-xs text-violet-700 dark:text-violet-300 break-words sm:w-auto">
                {`${i18n.pages.gathering_log.group_count_status.replace('{current}', String(bookmarkGroups.length)).replace('{max}', String(maxBookmarkGroups))}${bookmarkGroups.length >= maxBookmarkGroups ? ` ${i18n.pages.gathering_log.group_limit_reached}` : ''}`}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (bookmarkGroups.length >= maxBookmarkGroups) return;
                  createGroup(nextDefaultGroupName);
                }}
                disabled={bookmarkGroups.length >= maxBookmarkGroups}
                className={`inline-flex items-center gap-1 self-start rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors sm:self-auto ${bookmarkGroups.length >= maxBookmarkGroups
                  ? 'cursor-not-allowed border-violet-200 bg-violet-100/70 text-violet-400 dark:border-violet-800 dark:bg-violet-900/30 dark:text-violet-500'
                  : 'border-violet-300 bg-white/80 text-violet-700 hover:bg-violet-100 dark:border-violet-700 dark:bg-violet-900/30 dark:text-violet-200 dark:hover:bg-violet-900/50'}`}
                title={bookmarkGroups.length >= maxBookmarkGroups ? i18n.pages.gathering_log.group_limit_reached : i18n.pages.gathering_log.group_add}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                {i18n.pages.gathering_log.group_add}
              </button>
            </div>
          )}
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-600">
          {groupDisplaySections.map(({ group, displayItems }) => renderGroupSection(group, displayItems, group.id))}
        </div>
      </div>

      {(timedUngroupedItems.length > 0 || regularUngroupedItems.length > 0) && (
        <div className="space-y-8">
          {timedUngroupedItems.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-6 py-4 bg-yellow-50 dark:bg-yellow-900/10 border-b border-yellow-100 dark:border-yellow-900/30 flex items-center gap-2">
                <span className="text-xl">⏱️</span>
                <h2 className="text-lg font-bold text-yellow-800 dark:text-yellow-500">{i18n.pages.gathering_log.timed_legend_bookmarks}</h2>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-600">
                {renderGroupSection(
                  {
                    id: '__ungrouped_timed__',
                    name: i18n.pages.gathering_log.ungrouped || '[未分組]',
                    itemIds: timedUngroupedItems.map(item => item.id),
                    collapsed: isTimedUngroupedCollapsed,
                    createdAt: new Date(0).toISOString(),
                    updatedAt: new Date(0).toISOString(),
                  },
                  timedUngroupedItems,
                  null,
                  (_, collapsed) => {
                    setIsTimedUngroupedCollapsed(collapsed);
                  },
                )}
              </div>
            </div>
          )}

          {regularUngroupedItems.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-6 py-4 bg-blue-50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-900/30 flex items-center gap-2">
                <span className="text-xl">📋</span>
                <h2 className="text-lg font-bold text-blue-800 dark:text-blue-400">{i18n.pages.gathering_log.regular_bookmarks}</h2>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-600">
                {renderGroupSection(
                  {
                    id: '__ungrouped_regular__',
                    name: i18n.pages.gathering_log.ungrouped || '[未分組]',
                    itemIds: regularUngroupedItems.map(item => item.id),
                    collapsed: isRegularUngroupedCollapsed,
                    createdAt: new Date(0).toISOString(),
                    updatedAt: new Date(0).toISOString(),
                  },
                  regularUngroupedItems,
                  null,
                  (_, collapsed) => {
                    setIsRegularUngroupedCollapsed(collapsed);
                  },
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {!hasAnyVisibleBookmarks && bookmarkGroups.length > 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-6 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/20 dark:text-slate-400">
          {i18n.pages.gathering_log.group_empty_bookmarks_hint}
        </div>
      )}
    </div>
  );
};
