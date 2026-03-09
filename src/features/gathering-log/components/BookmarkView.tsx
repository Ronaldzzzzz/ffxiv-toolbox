import React, { useMemo } from 'react';
import { GatheringData, GatherType } from '../types';
import { getLocalizedText, GATHERING_ICONS } from '../utils';
import { useLanguage } from '../../../i18n/LanguageContext';
import { ItemRow } from './ItemRow';

interface BookmarkViewProps {
  data: GatheringData;
  completedItems: Set<number>;
  bookmarkedItems: Set<number>;
  toggleComplete: (id: number) => void;
  toggleBookmark: (id: number) => void;
  hideCompleted: boolean;
}

export const BookmarkView: React.FC<BookmarkViewProps> = ({
  data, completedItems, bookmarkedItems, toggleComplete, toggleBookmark, hideCompleted
}) => {
  const { lang } = useLanguage();

  const bookmarkedItemsList = useMemo(() => {
    return Array.from(bookmarkedItems)
      .map(id => {
        const itemInfo = data.items[id];
        if (!itemInfo) return null;

        // 決定這個物品屬於哪個職業/分類 (用來歸類或顯示)
        let type: GatherType | null = null;
        let isTimed = false;
        let nodeRef = null;

        // 檢查是否為限時節點
        const nodes = Object.values(data.nodes).filter(n => n.items.includes(id));
        const timedNode = nodes.find(n => n.spawns && n.spawns.length > 0);
        
        if (timedNode) {
            isTimed = true;
            nodeRef = timedNode;
            const typeMapping: Record<number, GatherType> = { 0: 'mining', 1: 'quarrying', 2: 'logging', 3: 'harvesting' };
            type = typeMapping[timedNode.type] || 'mining';
        } else {
            // 從 pages 找職業
            const types: GatherType[] = ['mining', 'quarrying', 'logging', 'harvesting'];
            for (let i = 0; i < types.length; i++) {
                const typePages = data.pages[i] || [];
                if (typePages.some(p => p.items.some(it => it.itemId === id))) {
                    type = types[i];
                    break;
                }
            }
        }

        return {
          id,
          name: getLocalizedText(itemInfo, lang),
          type,
          isTimed,
          nodeInfo: nodeRef
        };
      })
      .filter(item => item !== null) as { id: number; name: string; type: GatherType | null; isTimed: boolean; nodeInfo: any }[];
  }, [bookmarkedItems, data, lang]);

  // 過濾掉隱藏已完成的
  const displayItems = bookmarkedItemsList.filter(item => {
      if (hideCompleted && completedItems.has(item.id)) return false;
      return true;
  });

  if (displayItems.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400 dark:text-slate-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-50"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              <p className="text-lg font-bold">目前沒有釘選的書籤</p>
          </div>
      );
  }

  // 分群: 常規 與 限時
  const regularItems = displayItems.filter(i => !i.isTimed);
  const timedItems = displayItems.filter(i => i.isTimed);

  const typeIcons: Record<GatherType, string> = {
    mining: GATHERING_ICONS.mining,
    quarrying: GATHERING_ICONS.quarrying,
    logging: GATHERING_ICONS.logging,
    harvesting: GATHERING_ICONS.harvesting
  };

  return (
    <div className="space-y-8 fade-in px-4 py-6">
        
      {/* 限時採集書籤 */}
      {timedItems.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
             <div className="px-6 py-4 bg-yellow-50 dark:bg-yellow-900/10 border-b border-yellow-100 dark:border-yellow-900/30 flex items-center gap-2">
                 <span className="text-xl">⏱️</span>
                 <h2 className="text-lg font-bold text-yellow-800 dark:text-yellow-500">限時/傳說 書籤</h2>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
               {timedItems.map(item => (
                   <div key={item.id} className="relative group bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-yellow-400 dark:hover:border-yellow-500 hover:bg-yellow-50/50 dark:hover:bg-yellow-900/20 hover:shadow-sm transition-all overflow-hidden">
                       <ItemRow 
                          item={{ itemId: item.id, lvl: item.nodeInfo?.level || 0, ilvl: 0, stars: 0, hidden: 0 }}
                          data={data}
                          isCompleted={completedItems.has(item.id)}
                          isBookmarked={true}
                          toggleComplete={toggleComplete}
                          toggleBookmark={toggleBookmark}
                          disableHover={true}
                       />
                       {item.type && (
                         <div className="absolute top-2 right-2 opacity-50 group-hover:opacity-100 transition-opacity">
                             <img src={typeIcons[item.type]} className="w-4 h-4" alt="" />
                         </div>
                       )}
                   </div>
               ))}
             </div>
          </div>
      )}

      {/* 常規採集書籤 */}
      {regularItems.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
             <div className="px-6 py-4 bg-blue-50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-900/30 flex items-center gap-2">
                 <span className="text-xl">📋</span>
                 <h2 className="text-lg font-bold text-blue-800 dark:text-blue-400">常規採集 書籤</h2>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
               {regularItems.map(item => (
                    <div key={item.id} className="relative group bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 hover:shadow-sm transition-all overflow-hidden">
                       <ItemRow 
                          item={{ itemId: item.id, lvl: 0, ilvl: 0, stars: 0, hidden: 0 }}
                          data={data}
                          isCompleted={completedItems.has(item.id)}
                          isBookmarked={true}
                          toggleComplete={toggleComplete}
                          toggleBookmark={toggleBookmark}
                          disableHover={true}
                       />
                       {item.type && (
                         <div className="absolute top-2 right-2 opacity-50 group-hover:opacity-100 transition-opacity">
                             <img src={typeIcons[item.type]} className="w-4 h-4" alt="" />
                         </div>
                       )}
                   </div>
               ))}
             </div>
          </div>
      )}

    </div>
  );
};
