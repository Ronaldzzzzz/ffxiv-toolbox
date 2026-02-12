import React, { useState, useEffect } from 'react';
import { useFavicon } from '../../../hooks/useFavicon';
import { useGatheringData } from '../hooks/useGatheringData';
import { Sidebar } from './Sidebar';
import { ItemList } from './ItemList';
import { LevelNav } from './LevelNav';
import { MapModal } from './MapModal';
import { TimedView } from './TimedView';
import { MapView } from './MapView';
import { useTool } from '../../../context/ToolContext';
import { useLanguage } from '../../../i18n/LanguageContext';
import { getEorzeaTime, GATHERING_ICONS } from '../utils';
import { GatherType, ViewMode } from '../types';

export const GatheringLogPage: React.FC = () => {
  const { data, loading, error } = useGatheringData();
  const { setProgress, setToolInfo, setHeaderActions, setCenterActions, setEtTime } = useTool();
  const { t: i18n } = useLanguage();
  useFavicon('/favicon_gatheringlog.svg');

  const [currentType, setCurrentType] = useState<GatherType>('mining');
  const [timedType, setTimedType] = useState<GatherType | 'all'>('all'); // Independent state for Timed View
  const [currentRegion, setCurrentRegion] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('level');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hideCompleted, setHideCompleted] = useState<boolean>(false);
  const [showBookmarks, setShowBookmarks] = useState<boolean>(false);
  const [completedItems, setCompletedItems] = useState<Set<number>>(new Set());
  const [bookmarkedItems, setBookmarkedItems] = useState<Set<number>>(new Set());

  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Restore LocalStorage
  useEffect(() => {
    const savedProgress = localStorage.getItem('ffxiv_gathering_log_progress');
    if (savedProgress) setCompletedItems(new Set(JSON.parse(savedProgress)));

    const savedBookmarks = localStorage.getItem('ffxiv_gathering_log_bookmarks');
    if (savedBookmarks) setBookmarkedItems(new Set(JSON.parse(savedBookmarks)));
  }, []);

  // Eorzea Time Timer
  useEffect(() => {
    setEtTime(getEorzeaTime());
    const timer = setInterval(() => setEtTime(getEorzeaTime()), 1000);
    return () => { clearInterval(timer); setEtTime(null); };
  }, [setEtTime]);

  // Sync Header Info & Actions
  useEffect(() => {
    if (!data) return;

    const typeToIndex: Record<GatherType, number> = { mining: 0, quarrying: 1, harvesting: 2, logging: 3 };
    const pages = data.pages[typeToIndex[currentType]] || [];
    let total = 0;
    pages.forEach(p => total += p.items.length);
    const current = Array.from(completedItems).filter(id => {
      return pages.some(p => p.items.some(i => i.itemId === id));
    }).length;

    setProgress({ current, total });
    setToolInfo({ version: 'V3.1' });

    // 1. 中間：視角切換按鈕
    setCenterActions(
      <div className="flex items-center bg-slate-200 dark:bg-slate-700 p-1 rounded-lg">
        {[
          { id: 'level', label: i18n.pages.gathering_log.view_level, icon: '📊' },
          { id: 'timed', label: i18n.pages.gathering_log.view_timed, icon: '⏱️' },
          { id: 'map', label: i18n.pages.gathering_log.view_map, icon: '🗺️' }
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
      <div className="flex items-center gap-5">
        <label className="inline-flex items-center cursor-pointer gap-2 group">
          <input type="checkbox" checked={hideCompleted} onChange={() => setHideCompleted(p => !p)} className="sr-only peer" />
          <div className="relative w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
          <span className="text-[13px] font-bold text-slate-500 dark:text-slate-400 group-hover:text-blue-500 transition-colors uppercase whitespace-nowrap">{i18n.pages.gathering_log.hide_completed}</span>
        </label>

        <label className="inline-flex items-center cursor-pointer gap-2 group">
          <input type="checkbox" checked={showBookmarks} onChange={() => setShowBookmarks(p => !p)} className="sr-only peer" />
          <div className="relative w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:bg-yellow-500 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
          <span className="text-[13px] font-bold text-slate-500 dark:text-slate-400 group-hover:text-yellow-500 transition-colors uppercase whitespace-nowrap">⭐ {i18n.pages.gathering_log.show_bookmarks}</span>
        </label>
      </div>
    );

    return () => {
      setProgress(null);
      setToolInfo(null);
      setHeaderActions(null);
      setCenterActions(null);
    };
  }, [data, currentType, completedItems, hideCompleted, showBookmarks, viewMode, i18n, setProgress, setToolInfo, setHeaderActions, setCenterActions]);

  const toggleComplete = (itemId: number) => {
    const newSet = new Set(completedItems);
    if (newSet.has(itemId)) newSet.delete(itemId);
    else newSet.add(itemId);
    setCompletedItems(newSet);
    localStorage.setItem('ffxiv_gathering_log_progress', JSON.stringify(Array.from(newSet)));
  };

  const toggleBookmark = (itemId: number) => {
    const newSet = new Set(bookmarkedItems);
    if (newSet.has(itemId)) newSet.delete(itemId);
    else newSet.add(itemId);
    setBookmarkedItems(newSet);
    localStorage.setItem('ffxiv_gathering_log_bookmarks', JSON.stringify(Array.from(newSet)));
  };

  const toggleBatch = (ids: number[], action: 'add' | 'remove') => {
    const newSet = new Set(completedItems);
    ids.forEach(id => {
      if (action === 'add') newSet.add(id);
      else newSet.delete(id);
    });
    setCompletedItems(newSet);
    localStorage.setItem('ffxiv_gathering_log_progress', JSON.stringify(Array.from(newSet)));
  };

  if (loading) return <div className="p-8 text-center text-slate-500">{i18n.common.loading}</div>;
  if (error) return <div className="p-8 text-center text-red-500">{i18n.common.error_loading}: {error.message}</div>;
  if (!data) return null;

  const typeToIndex: Record<GatherType, number> = { mining: 0, quarrying: 1, harvesting: 2, logging: 3 };
  const pages = data.pages[typeToIndex[currentType]] || [];

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
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
            <ItemList
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
            <div className="flex gap-4 mb-6 sticky top-0 bg-slate-100 dark:bg-slate-900 z-20 py-2 px-1 overflow-x-auto">
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
              toggleComplete={toggleComplete}
              hideCompleted={hideCompleted}
            />
          </div>
        )}



        {viewMode === 'map' && (
          <div className="px-4 py-6">

            <MapView
              data={data}
              completedItems={completedItems}
              toggleComplete={toggleComplete}
              hideCompleted={hideCompleted}
            />
          </div>
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
    </div >
  );
};
