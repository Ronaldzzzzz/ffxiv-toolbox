import React, { useEffect, useRef } from 'react';
import { GatheringData, GatherType } from '../types';
import { ItemRow } from './ItemRow';
import { getLocalizedText } from '../utils';
import { useLanguage } from '../../../i18n/LanguageContext';
import { useTool } from '../../../context/ToolContext';

interface LevelViewProps {
  data: GatheringData;
  currentType: GatherType;
  currentRegion: string;
  hideCompleted: boolean;
  showBookmarks: boolean;
  completedItems: Set<number>;
  bookmarkedItems: Set<number>;
  toggleComplete: (id: number) => void;
  toggleBookmark: (id: number) => void;
  toggleBatch: (ids: number[], action: 'add' | 'remove') => void;
}

export const LevelView: React.FC<LevelViewProps> = ({
  data, currentType, currentRegion, hideCompleted, showBookmarks,
  completedItems, bookmarkedItems, toggleComplete, toggleBookmark, toggleBatch
}) => {
  const { lang, t: i18n } = useLanguage();
  const { highlightItem, setHighlightItem } = useTool();
  const itemRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Handle Scroll to Item
  useEffect(() => {
    if (highlightItem && itemRefs.current[highlightItem]) {
      const element = itemRefs.current[highlightItem];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-2', 'ring-yellow-500', 'ring-offset-2', 'dark:ring-offset-slate-800', 'relative', 'z-30');

        const timer = setTimeout(() => {
          element.classList.remove('ring-2', 'ring-yellow-500', 'ring-offset-2', 'dark:ring-offset-slate-800', 'relative', 'z-30');
          setHighlightItem(null);
        }, 2000);

        return () => clearTimeout(timer);
      }
    }
  }, [highlightItem, setHighlightItem]);

  const typeToIndex: Record<GatherType, number> = {
    mining: 0, quarrying: 1, harvesting: 2, logging: 3
  };

  const pageIndex = typeToIndex[currentType];
  const pages = data.pages[pageIndex] || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
      {pages.map((page) => {
        const filteredItems = page.items.filter(item => {
          // 1. Hide Completed
          if (hideCompleted && completedItems.has(item.itemId)) return false;
          // 2. Show Bookmarks Only
          if (showBookmarks && !bookmarkedItems.has(item.itemId)) return false;

          // 3. Region Filter
          if (currentRegion === 'all') return true;
          const nodes = Object.values(data.nodes).filter(node =>
            node.items.includes(item.itemId) && node.map !== 0
          );
          return nodes.some(node => {
            const map = data.maps[node.map];
            return map && String(map.placename_id) === currentRegion;
          });
        });

        if (filteredItems.length === 0) return null;

        const visibleItemIds = filteredItems.map(i => i.itemId);
        const allVisibleCompleted = visibleItemIds.every(id => completedItems.has(id));

        const completedInPage = page.items.filter(i => completedItems.has(i.itemId)).length;
        const totalInPage = page.items.length;
        const isPageDone = completedInPage === totalInPage;

        // Folklore Detection
        let headerTitle = `Lv. ${page.startLevel} - ${page.startLevel + 4}`;
        const firstItem = page.items[0];
        if (firstItem) {
          const nodes = Object.values(data.nodes).filter(n => n.items.includes(firstItem.itemId));
          const folkloreNode = nodes.find(n => n.folklore);
          if (folkloreNode && folkloreNode.folklore) {
            headerTitle = getLocalizedText(data.items[folkloreNode.folklore], lang);
          }
        }

        return (
          <section
            key={page.id}
            id={`section-${page.id}`}
            className="relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm h-fit pb-1 transition-colors"
          >
            <div className="section-header-sticky px-4 py-2 flex justify-between items-center border-b border-slate-200 dark:border-slate-700 z-10 rounded-t-xl bg-white dark:bg-slate-800">
              <h3 className="font-bold text-slate-800 dark:text-slate-200">{headerTitle}</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleBatch(visibleItemIds, allVisibleCompleted ? 'remove' : 'add')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {allVisibleCompleted ? i18n.pages.gathering_log.deselect_all : i18n.pages.gathering_log.select_all}
                </button>
                <div className="w-px h-3 bg-slate-300 dark:bg-slate-600"></div>
                <span className={`text-xs font-mono ${isPageDone ? 'text-green-600 dark:text-green-400' : 'text-slate-500'}`}>
                  {completedInPage}/{totalInPage}
                </span>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {filteredItems.map((item, index) => (
                <div
                  key={item.itemId}
                  ref={el => itemRefs.current[item.itemId] = el}
                  className={`transition-all duration-300 rounded-lg ${index === filteredItems.length - 1 ? "rounded-b-xl overflow-hidden" : ""}`}
                >
                  <ItemRow
                    item={item}
                    data={data}
                    isCompleted={completedItems.has(item.itemId)}
                    isBookmarked={bookmarkedItems.has(item.itemId)}
                    toggleComplete={toggleComplete}
                    toggleBookmark={toggleBookmark}
                  />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};