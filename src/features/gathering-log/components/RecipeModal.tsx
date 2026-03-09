import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { GatheringData } from '../types';
import { getLocalizedText } from '../utils';
import { useLanguage } from '../../../i18n/LanguageContext';

interface RecipeModalProps {
  itemId: number;
  data: GatheringData;
  onClose: () => void;
  onBookmarkAll: (itemIds: number[]) => void;
  bookmarkedItems: Set<number>;
}

// 遞迴節點的介面
interface RecipeNode {
    id: number;
    amount: number;
    isGatherable: boolean;
    parentId?: number;
    children: RecipeNode[];
}

export const RecipeModal: React.FC<RecipeModalProps> = ({ itemId, data, onClose, onBookmarkAll, bookmarkedItems }) => {
  const { lang } = useLanguage();

  const itemInfo = data.items[itemId];
  const name = itemInfo ? getLocalizedText(itemInfo, lang) : 'Unknown Item';

  // 1. 建立樹狀結構
  const recipeTree = useMemo(() => {
    const processing = new Set<number>();

    const buildNode = (currentId: number, multiplier = 1, parentId?: number): RecipeNode | null => {
      // 避免無窮迴圈
      if (processing.has(currentId)) return null;
      processing.add(currentId);

      const recipes = data.recipes && data.recipes[currentId];
      
      const isGatherable = [0, 1, 2, 3].some(typeIndex => {
        const pages = data.pages[typeIndex] || [];
        return pages.some(p => p.items.some(i => i.itemId === currentId));
      });

      // 如果沒有配方了，這就是一個底層材料
      if (!recipes || recipes.length === 0) {
        processing.delete(currentId);
        return {
            id: currentId,
            amount: multiplier,
            isGatherable,
            parentId,
            children: []
        };
      }

      // 預設取第一個配方
      const primaryRecipe = recipes[0];
      const yieldAmount = primaryRecipe.yields || 1;

      // 每次製作產出 yieldAmount 個。如果我們需要 multiplier 個，需要作多少次？ (概算)
      const craftTimes = Math.ceil(multiplier / yieldAmount);

      const children: RecipeNode[] = [];
      primaryRecipe.ingredients.forEach(ing => {
        const childNode = buildNode(ing.id, ing.amount * craftTimes, currentId);
        if (childNode) children.push(childNode);
      });
      
      processing.delete(currentId);

      return {
          id: currentId,
          amount: multiplier,
          isGatherable,
          parentId,
          children
      };
    };

    return buildNode(itemId);
  }, [itemId, data]);

  // 取出所有是 Gathering Item 的唯一 ID 供預設全選
  const allGatherableIds = useMemo(() => {
      const ids = new Set<number>();
      const collect = (node: RecipeNode) => {
          if (node.isGatherable) ids.add(node.id);
          node.children.forEach(collect);
      };
      if (recipeTree) collect(recipeTree);
      return Array.from(ids);
  }, [recipeTree]);

  // 管理勾選狀態
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  // 初始化勾選狀態：預設全選可採集且尚未加入書籤的
  useEffect(() => {
     const initial = new Set<number>();
     allGatherableIds.forEach(id => {
         // 我們讓所有可採集的都可以被勾選，甚至已經書籤的也可以顯示為已勾選但可能 disabled，
         // 這裡選擇簡單做法：預設全勾。
         initial.add(id);
     });
     setSelectedItems(initial);
  }, [allGatherableIds]);

  const toggleSelection = (id: number) => {
      const next = new Set(selectedItems);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectedItems(next);
  };

  const handleBookmarkSelected = () => {
      if (selectedItems.size > 0) {
          onBookmarkAll(Array.from(selectedItems));
          onClose();
      }
  };

  // 遞迴渲染樹狀節點
  const renderNode = (node: RecipeNode, depth: number = 0) => {
       const matData = data.items[node.id];
       const matName = matData ? getLocalizedText(matData, lang) : `Unknown (${node.id})`;
       const iconPath = data.icons[node.id];
       const iconUrl = iconPath ? `https://xivapi.com${iconPath}` : 'https://xivapi.com/i/066000/066313_hr1.png';
       const isBookmarked = bookmarkedItems.has(node.id);
       const isSelected = selectedItems.has(node.id);

       return (
           <div 
               key={`${node.id}-${depth}`} 
               className={`group/tree flex flex-col gap-1 rounded-lg transition-colors duration-200 
                   ${depth > 0 ? 'hover:bg-slate-200 dark:hover:bg-slate-700 px-2 py-1 -mx-2' : ''}`}
               style={depth === 0 ? {} : { marginLeft: '0.1rem' }}
           >
               <div 
                   className={`group/node relative flex items-center justify-between p-2 rounded border transition-colors ${depth === 0 ? 'bg-slate-100 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600' : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500'} ${depth > 0 && node.isGatherable ? 'cursor-pointer' : ''}`}
                   onClick={(e) => {
                       // 避免點擊外部 hover 區塊時觸發多個事件，我們只綁定在該行本身
                       e.stopPropagation();
                       if (node.isGatherable && depth > 0) toggleSelection(node.id);
                   }}
               >
                   <div className="flex items-center gap-3">
                       {/* 只有可採集的才顯示 checkbox */}
                       {node.isGatherable && depth > 0 ? (
                           <input 
                              type="checkbox" 
                              checked={isSelected || isBookmarked} 
                              disabled={isBookmarked}
                              onChange={() => {}} // 由上層 div onClick 處理
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                           />
                       ) : (
                           // 排版佔位
                           <div className="w-4 h-4" />
                       )}
                       
                       <img src={iconUrl} className="w-8 h-8 rounded border border-slate-200 dark:border-slate-600 bg-black/20" alt="" />
                       <div>
                           <div className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1">
                               {matName}
                               {node.isGatherable && (
                                   <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded ml-1">可採集</span>
                               )}
                               {node.children.length > 0 && depth > 0 && (
                                   <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-500 px-1.5 py-0.5 rounded ml-1">配方產物</span>
                               )}
                           </div>
                           <div className="text-xs text-slate-500 flex items-center gap-1">
                               <span>需要數量: {node.amount}</span>
                           </div>
                       </div>
                   </div>
                   {isBookmarked && node.isGatherable && (
                       <span className="text-yellow-500 flex items-center gap-1 text-xs">
                           <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                           已釘選
                       </span>
                   )}
               </div>
               
               {node.children.length > 0 && (
                   <div className="mt-1">
                       {node.children.map(child => renderNode(child, depth + 1))}
                   </div>
               )}
           </div>
       );
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            配方解析：{name}
          </h2>
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-grow thin-scrollbar">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            製作一份此物品所需的最底層材料清單。其中標示綠色勾勾的為可採集項目。
          </p>
          
          <div className="space-y-4">
            {recipeTree ? renderNode(recipeTree) : <div className="text-center text-red-500">解析配方失敗</div>}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex gap-2">
            <button 
                onClick={handleBookmarkSelected}
                disabled={selectedItems.size === 0}
                className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-sm transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                加入書籤 ({selectedItems.size})
            </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
