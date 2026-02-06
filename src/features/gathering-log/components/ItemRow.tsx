import React from 'react';
import { GatheringItemEntry, GatheringData, NodeData } from '../types';
import { getLocalizedText } from '../utils';
import { useLanguage } from '../../../i18n/LanguageContext';

interface ItemRowProps {
  item: GatheringItemEntry;
  data: GatheringData;
  isCompleted: boolean;
  isBookmarked: boolean;
  toggleComplete: (id: number) => void;
  toggleBookmark: (id: number) => void;
}

export const ItemRow: React.FC<ItemRowProps> = ({ 
  item, data, isCompleted, isBookmarked, toggleComplete, toggleBookmark 
}) => {
  const { lang, t: i18n } = useLanguage();
  const itemInfo = data.items[item.itemId];
  const iconPath = data.icons[item.itemId];
  const iconUrl = iconPath ? `https://xivapi.com${iconPath}` : 'https://xivapi.com/i/066000/066313_hr1.png';

  const itemNodes: NodeData[] = Object.values(data.nodes).filter(node => 
    node.items.includes(item.itemId)
  );

  const isCrystal = item.itemId >= 2 && item.itemId <= 19;

  return (
    <div className={`group flex items-start p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all ${isCompleted ? 'checked-item bg-slate-50/50 dark:bg-slate-800/30' : ''}`}>
      <div className="mr-3 mt-1 shrink-0 flex items-center">
        <input 
          type="checkbox" 
          checked={isCompleted}
          onChange={() => toggleComplete(item.itemId)}
          className="custom-checkbox w-5 h-5 cursor-pointer text-slate-800 dark:text-slate-200"
        />
      </div>

      <div className="flex-grow min-w-0 flex items-center gap-3">
        <img 
          src={iconUrl} 
          alt="" 
          className="w-10 h-10 rounded border border-slate-300 dark:border-slate-600 shadow-sm shrink-0 bg-slate-800"
          loading="lazy"
          onClick={() => toggleComplete(item.itemId)}
        />

        <div className="flex-grow min-w-0 flex flex-col justify-center" onClick={() => toggleComplete(item.itemId)}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-800 dark:text-slate-100 item-name text-base leading-tight">
              {getLocalizedText(itemInfo, lang)}
            </span>
            <button 
              onClick={(e) => { e.stopPropagation(); toggleBookmark(item.itemId); }}
              className={`transition-colors ${isBookmarked ? 'text-yellow-500' : 'text-slate-300 dark:text-slate-600 hover:text-yellow-500'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            </button>
            {item.stars > 0 && (
              <span className="text-yellow-500 text-xs font-bold border border-yellow-500/30 px-1 rounded">★{item.stars}</span>
            )}
            {item.hidden === 1 && (
              <span className="text-red-400 text-xs border border-red-400/30 px-1 rounded">Hidden</span>
            )}
          </div>
          
          <div className="mt-1 space-y-0.5">
            {isCrystal ? (
              <div className="text-xs text-slate-400 opacity-75 italic">📍 {i18n.pages.gathering_log.omitted}</div>
            ) : itemNodes.length > 0 ? (
              itemNodes.map((node, idx) => {
                const map = data.maps[node.map];
                const placeName = map ? getLocalizedText(data.places[map.placename_id], lang) : 'Unknown Location';
                return (
                  <div key={idx} className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2">
                    <span className="flex items-center gap-1">📍 {placeName}</span>
                    {node.x && node.y && (
                      <span className="opacity-75 font-mono">(X:{node.x}, Y:{node.y})</span>
                    )}
                    {node.spawns && (
                      <span className="text-amber-600 dark:text-amber-500 font-mono">⏰ {node.spawns.map(s => `${String(s).padStart(2, '0')}:00`).join('/')}</span>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-xs text-slate-400">📍 未知區域</div>
            )}
          </div>
          
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
            Lv. {item.lvl}
          </div>
        </div>
      </div>
    </div>
  );
};
