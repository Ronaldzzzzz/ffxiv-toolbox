import React, { useState, useEffect } from 'react';
import { useFavicon } from '../../../hooks/useFavicon';
import { useSeoMeta } from '../../../hooks/useSeoMeta';
import { useGatheringData } from '../hooks/useGatheringData';
import { Sidebar } from './Sidebar';
import { LevelView } from './LevelView';
import { LevelNav } from './LevelNav';
import { MapModal } from './MapModal';
import { TimedView } from './TimedView';
import { MapView } from './MapView';
import { BookmarkView } from './BookmarkView';
import { useTool } from '../../../context/ToolContext';
import { useLanguage } from '../../../i18n/LanguageContext';
import { getEorzeaTime, GATHERING_ICONS } from '../utils';
import { GatherType, ViewMode } from '../types';
import { RecipeModal } from './RecipeModal';
import { AlarmSettingsModal } from './AlarmSettingsModal';
import { useAlarmTrigger } from '../hooks/useAlarmTrigger';
import { useCollectionState } from '../hooks/useCollectionState';
import { useAlarm } from '../hooks/useAlarm';

export const GatheringLogPage: React.FC = () => {
  const { data, loading, error } = useGatheringData();
  const { setProgress, setToolInfo, setHeaderActions, setCenterActions, setEtTime } = useTool();
  const { t: i18n } = useLanguage();
  useFavicon('/favicon_gatheringlog.svg');
  useSeoMeta({
    canonicalPath: '/ffxiv-toolbox/gathering-log',
    langs: {
      tw: { title: '採集手冊 | FFXIV Toolbox', description: 'FF14採集手冊。追蹤採礦工、碎石工、採伐工、園藝工的採集進度，支援限時節點鬧鐘、書籤群組管理與遊戲內巨集生成。' },
      zh: { title: '采集手册 | FFXIV Toolbox', description: 'FF14采集手册。追踪采矿工、碎石工、采伐工、园艺工的进度，支持限时节点闹钟、书签分组管理与游戏内宏生成。' },
      en: { title: 'Gathering Log | FFXIV Toolbox', description: 'FF14 gathering log tracker. Track mining & botany progress with timed node alarms, bookmark groups, and in-game macro generation.' },
      ja: { title: '採集手帳 | FFXIV Toolbox', description: 'FF14採集手帳。採掘師・園芸師の進捗管理、時限採集ノードのアラーム、ブックマークグループ、マクロ生成に対応。' },
    },
  });

  const [currentType, setCurrentType] = useState<GatherType>('mining');
  const [timedType, setTimedType] = useState<GatherType | 'all'>('all'); // Independent state for Timed View
  const [currentRegion, setCurrentRegion] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('level');
  const [hideCompleted, setHideCompleted] = useState<boolean>(false);
  const [showBookmarks, setShowBookmarks] = useState<boolean>(false);
  const {
    completedItems,
    bookmarkedItems,
    bookmarkGroups,
    ungroupedBookmarkedItemIds,
    toggleComplete,
    toggleBookmark,
    toggleBatch,
    bookmarkAll,
    createGroup,
    updateGroup,
    removeGroup,
    moveBookmarkedItem,
    maxBookmarkGroups,
  } = useCollectionState();
  const { trackedItems, toggleTrackedItem, setTrackedItems } = useAlarm();
  const [recipeModalItemId, setRecipeModalItemId] = useState<number | null>(null);
  const [isAlarmModalOpen, setIsAlarmModalOpen] = useState<boolean>(false);

  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Initialize background alarm trigger
  useAlarmTrigger(data);

  // Eorzea Time Timer
  useEffect(() => {
    setEtTime(getEorzeaTime());
    const timer = setInterval(() => setEtTime(getEorzeaTime()), 1000);
    return () => { clearInterval(timer); setEtTime(null); };
  }, [setEtTime]);

  // Sync Header Info & Actions
  useEffect(() => {
    if (!data) return;

    const typeToIndex: Record<GatherType, number> = { mining: 0, quarrying: 1, logging: 2, harvesting: 3 };
    const isAchievementTrackedItem = (itemId: number) => data.items[itemId]?.isAchievementExcluded !== true;

    const getTypeItemIds = (type: GatherType) => {
      const pages = data.pages[typeToIndex[type]] || [];
      const itemIds = new Set<number>();

      pages.forEach(page => {
        page.items.forEach(item => {
          if (isAchievementTrackedItem(item.itemId)) {
            itemIds.add(item.itemId);
          }
        });
      });

      return itemIds;
    };

    const countProgressFromSet = (itemIds: Set<number>) => {
      let current = 0;
      itemIds.forEach(itemId => {
        if (completedItems.has(itemId)) current += 1;
      });

      return { current, total: itemIds.size };
    };

    const countTypeProgress = (type: GatherType) => {
      const itemIds = getTypeItemIds(type);
      return countProgressFromSet(itemIds);
    };

    const mergeItemSets = (...sets: Set<number>[]) => {
      const merged = new Set<number>();
      sets.forEach(set => {
        set.forEach(itemId => merged.add(itemId));
      });

      return merged;
    };

    const miningItemIds = getTypeItemIds('mining');
    const quarryingItemIds = getTypeItemIds('quarrying');
    const loggingItemIds = getTypeItemIds('logging');
    const harvestingItemIds = getTypeItemIds('harvesting');

    const miningProgress = countTypeProgress('mining');
    const quarryingProgress = countTypeProgress('quarrying');
    const loggingProgress = countTypeProgress('logging');
    const harvestingProgress = countTypeProgress('harvesting');

    const miningGroupProgress = countProgressFromSet(mergeItemSets(miningItemIds, quarryingItemIds));
    const botanyGroupProgress = countProgressFromSet(mergeItemSets(loggingItemIds, harvestingItemIds));
    const overallProgress = countProgressFromSet(
      mergeItemSets(miningItemIds, quarryingItemIds, loggingItemIds, harvestingItemIds)
    );

    const current = overallProgress.current;
    const total = overallProgress.total;

    // 0. 設定資訊
    setProgress({
      current,
      total,
      currentPrimary: miningGroupProgress.current,
      currentSecondary: botanyGroupProgress.current,
      totalPrimary: miningGroupProgress.total,
      totalSecondary: botanyGroupProgress.total,
      currentMining: miningProgress.current,
      currentQuarrying: quarryingProgress.current,
      totalMining: miningProgress.total,
      totalQuarrying: quarryingProgress.total,
      currentLogging: loggingProgress.current,
      currentHarvesting: harvestingProgress.current,
      totalLogging: loggingProgress.total,
      totalHarvesting: harvestingProgress.total,
    });
    setToolInfo({ version: 'V3.6.2' });

    // 1. 中間：視角切換按鈕
    setCenterActions(
      <div className="flex items-center bg-slate-200 dark:bg-slate-700 p-1 rounded-lg">
        {[
          { id: 'level', label: i18n.pages.gathering_log.view_level, icon: '📊' },
          { id: 'timed', label: i18n.pages.gathering_log.view_timed, icon: '⏱️' },
          { id: 'map', label: i18n.pages.gathering_log.view_map, icon: '🗺️' },
          { id: 'bookmark', label: i18n.pages.gathering_log.view_bookmark, icon: '⭐' }
        ].map(mode => (
          <button
            key={mode.id}
            onClick={() => setViewMode(mode.id as ViewMode)}
            className={`px-2 py-1 md:px-4 md:py-1.5 rounded-md text-xs md:text-base font-bold transition-all flex items-center gap-1 md:gap-2 ${viewMode === mode.id ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-300' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
          >
            <span className="text-sm md:text-xl">{mode.icon}</span>
            <span>{mode.label}</span>
          </button>
        ))}
      </div>
    );

    // 2. 左側：功能開關
    setHeaderActions(
      <div className="flex items-center gap-1">
        <button
          onClick={() => setHideCompleted(p => !p)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
            hideCompleted
              ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
          }`}
          title={i18n.pages.gathering_log.hide_completed}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {hideCompleted
              ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
              : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
          </svg>
          <span className="hidden sm:inline">{i18n.pages.gathering_log.hide_completed}</span>
        </button>

        <button
          onClick={() => setShowBookmarks(p => !p)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
            showBookmarks
              ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-500 dark:text-yellow-300'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
          }`}
          title={i18n.pages.gathering_log.show_bookmarks}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={showBookmarks ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          <span className="hidden sm:inline">{i18n.pages.gathering_log.show_bookmarks}</span>
        </button>

        <button 
          onClick={() => setIsAlarmModalOpen(true)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap"
          title={i18n.pages.gathering_log.alarm_settings}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          <span className="hidden sm:inline">{i18n.pages.gathering_log.alarm_settings}</span>
        </button>
      </div>
    );

    return () => {
      setProgress(null);
      setToolInfo(null);
      setHeaderActions(null);
      setCenterActions(null);
    };
  }, [data, completedItems, hideCompleted, showBookmarks, viewMode, i18n, setProgress, setToolInfo, setHeaderActions, setCenterActions]);

  const typeToIndex: Record<GatherType, number> = { mining: 0, quarrying: 1, logging: 2, harvesting: 3 };
  const pages = data ? data.pages[typeToIndex[currentType]] || [] : [];

  // Show loading, error, or null states
  if (loading) return <div className="p-8 text-center text-slate-500">{i18n.common.loading}</div>;
  if (error) return <div className="p-8 text-center text-red-500">{i18n.common.error_loading}: {error.message}</div>;
  if (!data) return null;

  return (
    <div className="max-w-[1600px] mx-auto p-4 flex flex-col md:flex-row gap-6 items-start">
      {/* Mobile Filter Toggle */}
      {viewMode === 'level' && (
        <div className="md:hidden w-full">
          <button 
            onClick={() => setShowMobileSidebar(true)}
            className="w-full flex items-center justify-center gap-2 p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold active:scale-[0.98] transition-transform"
          >
            <span className="text-xl">🔍</span>
            <span>{i18n.pages.gathering_log.regions_header} / {i18n.pages.gathering_log.filter}</span>
          </button>
        </div>
      )}

      <Sidebar 
        data={data} 
        currentRegion={currentRegion} 
        setCurrentRegion={setCurrentRegion} 
        pages={pages} 
        visible={viewMode === 'level'}
        isOpen={showMobileSidebar}
        onClose={() => setShowMobileSidebar(false)}
      />
      <main className="flex-grow w-full min-w-0 relative">
        {viewMode === 'level' && (
          <>
            <LevelNav
              data={data}
              currentType={currentType}
              setCurrentType={setCurrentType}
              pages={pages}
              completedItems={completedItems}
              onOpenRecipe={setRecipeModalItemId}
            />
            <LevelView
              data={data}
              currentType={currentType}
              currentRegion={currentRegion}
              hideCompleted={hideCompleted}
              showBookmarks={showBookmarks}
              completedItems={completedItems}
              bookmarkedItems={bookmarkedItems}
              toggleComplete={toggleComplete}
              toggleBookmark={toggleBookmark}
              toggleBatch={toggleBatch}
            />
          </>
        )}

        {viewMode === 'timed' && (
          <div className="px-4 py-6">
            <div className="flex gap-4 mb-6 sticky top-[calc(var(--app-header-height)+0.5rem)] bg-slate-100 dark:bg-slate-900 z-20 py-2 px-1 overflow-x-auto">
              {/* Type Toggles for Timed View */}
              {(['all', 'mining', 'quarrying', 'logging', 'harvesting'] as const).map(type => {
                const isAll = type === 'all';
                // @ts-ignore
                const label = isAll ? i18n.pages.gathering_log.all_types : i18n.pages.gathering_log[type];
                const icon = isAll ? null : GATHERING_ICONS[type];
                
                return (
                  <button
                    key={type}
                    onClick={() => setTimedType(type)}
                    className={`px-4 py-1.5 rounded-full text-sm font-bold border transition-all flex items-center gap-2 shrink-0 ${timedType === type
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20 scale-105'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                  >
                    {icon && <img src={icon} className="w-5 h-5" alt="" />}
                    {label}
                  </button>
                );
              })}
            </div>
            <TimedView
              data={data}
              currentType={timedType}
              completedItems={completedItems}
              bookmarkedItems={bookmarkedItems}
              toggleBookmark={toggleBookmark}
              toggleComplete={toggleComplete}
              hideCompleted={hideCompleted}
              showBookmarks={showBookmarks}
            />
          </div>
        )}



        {viewMode === 'map' && (
          <div className="px-4 py-6">

            <MapView
              data={data}
              completedItems={completedItems}
              bookmarkedItems={bookmarkedItems}
              toggleBookmark={toggleBookmark}
              toggleComplete={toggleComplete}
              hideCompleted={hideCompleted}
              showBookmarks={showBookmarks}
            />
          </div>
        )}

        {viewMode === 'bookmark' && (
           <BookmarkView
              data={data}
              completedItems={completedItems}
              bookmarkedItems={bookmarkedItems}
              bookmarkGroups={bookmarkGroups}
              ungroupedBookmarkedItemIds={ungroupedBookmarkedItemIds}
              toggleComplete={toggleComplete}
              toggleBookmark={toggleBookmark}
              hideCompleted={hideCompleted}
              createGroup={createGroup}
              updateGroup={updateGroup}
              removeGroup={removeGroup}
                moveBookmarkedItem={moveBookmarkedItem}
                trackedItems={trackedItems}
                 toggleTrackedItem={toggleTrackedItem}
                setTrackedItems={setTrackedItems}
                maxBookmarkGroups={maxBookmarkGroups}
           />
        )}

        {/* Go to Top Button */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-8 right-8 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-600/30 transition-all active:scale-95 z-50 group"
          title={i18n.pages.gathering_log.back_to_top}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-y-1 transition-transform duration-300">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      </main>

      <MapModal data={data} />
      
      {recipeModalItemId !== null && (
        <RecipeModal
          data={data}
          itemId={recipeModalItemId}
          bookmarkedItems={bookmarkedItems}
          onClose={() => setRecipeModalItemId(null)}
          onBookmarkAll={bookmarkAll}
        />
      )}

      <AlarmSettingsModal
          isOpen={isAlarmModalOpen}
          onClose={() => setIsAlarmModalOpen(false)}
          data={data}
          bookmarkGroups={bookmarkGroups}
          ungroupedBookmarkedItemIds={ungroupedBookmarkedItemIds}
      />
    </div >
  );
};
