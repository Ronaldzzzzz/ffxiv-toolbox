import React, { useMemo, useState } from 'react';
import { GatheringData, GatheringLogPageData } from '../types';
import { getLocalizedText, EXPANSION_MAP } from '../utils';
import { useLanguage } from '../../../i18n/LanguageContext';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface SidebarProps {
  data: GatheringData;
  currentRegion: string;
  setCurrentRegion: (region: string) => void;
  pages: GatheringLogPageData[];
}

export const Sidebar: React.FC<SidebarProps> = ({ data, currentRegion, setCurrentRegion, pages }) => {
  const { lang, t } = useLanguage();
  const [collapsedExpansions, setCollapsedExpansions] = useState<Set<string>>(new Set());
  
  const toggleExpansion = (expKey: string) => {
    const newCollapsed = new Set(collapsedExpansions);
    if (newCollapsed.has(expKey)) {
      newCollapsed.delete(expKey);
    } else {
      newCollapsed.add(expKey);
    }
    setCollapsedExpansions(newCollapsed);
  };

  // Memoize the filtering to avoid heavy calculation on every render
  const regions = useMemo(() => {
    const relevantRegions: Record<string, Record<number, Set<number>>> = {};
    const relevantMapIds = new Set<number>();

    const activeItemIds = new Set<number>();
    pages.forEach(p => p.items.forEach(i => activeItemIds.add(i.itemId)));

    Object.values(data.nodes).forEach(node => {
      const hasActiveItem = node.items.some(id => activeItemIds.has(id));
      if (hasActiveItem) {
        relevantMapIds.add(node.map);
      }
    });

    relevantMapIds.forEach(mapId => {
      const map = data.maps[mapId];
      if (map) {
        const rid = map.region_id;
        const pid = map.placename_id;
        const expKey = EXPANSION_MAP[rid] || EXPANSION_MAP[pid] || 'exp_2';

        if (!relevantRegions[expKey]) relevantRegions[expKey] = {};
        if (!relevantRegions[expKey][rid]) relevantRegions[expKey][rid] = new Set();
        relevantRegions[expKey][rid].add(pid);
      }
    });

    return relevantRegions;
  }, [data, pages]);

  const expOrder = ['exp_2', 'exp_3', 'exp_4', 'exp_5', 'exp_6', 'exp_7'];
  const EXPANSION_COLORS: Record<string, string> = {
    'exp_2': '#666666',
    'exp_3': '#4C7EE8',
    'exp_4': '#A22A3E',
    'exp_5': '#2E1D4A',
    'exp_6': '#3D4E99',
    'exp_7': '#9B853F',
  };

  return (
    <aside className="w-full md:w-56 shrink-0 bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto thin-scrollbar shadow-lg z-40 overscroll-contain">
      <h3 className="text-slate-800 dark:text-yellow-500 font-bold mb-3 uppercase text-xs tracking-wider border-b border-slate-200 dark:border-slate-700 pb-2">
        {t.pages.gathering_log.regions_header}
      </h3>
      
      <button 
        onClick={() => setCurrentRegion('all')}
        className={`w-full text-left px-2 py-1.5 rounded text-xs font-medium transition-colors mb-2 ${currentRegion === 'all' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-300 dark:ring-blue-800' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
      >
        {t.pages.gathering_log.all_regions}
      </button>

      <div className="space-y-1">
        {expOrder.map(expKey => {
          const expRegions = regions[expKey];
          if (!expRegions) return null;

          const isCollapsed = collapsedExpansions.has(expKey);

          return (
            <div key={expKey} className="mb-2">
              {/* Expansion Header / Toggle Button */}
              <button 
                onClick={() => toggleExpansion(expKey)}
                className="w-full text-left text-xs font-extrabold mt-4 mb-2 px-3 py-1.5 rounded shadow-sm text-white flex items-center justify-between group transition-all hover:brightness-110 active:scale-[0.98]"
                style={{ backgroundColor: EXPANSION_COLORS[expKey] }}
              >
                <span>{t.common.expansions[expKey as keyof typeof t.common.expansions]}</span>
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              </button>
              
              {/* Accordion Content */}
              {!isCollapsed && (
                <div className="space-y-3 animation-fade-in">
                  {Object.entries(expRegions).sort(([a], [b]) => Number(a) - Number(b)).map(([rid, pids]) => (
                    <div key={rid} className="mb-2">
                      <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-2 mb-1 px-2">
                        {getLocalizedText(data.places[rid], lang)}
                      </div>
                      {Array.from(pids).sort((a, b) => a - b).map(pid => (
                        <button
                          key={pid}
                          onClick={() => setCurrentRegion(String(pid))}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all truncate mb-0.5 ${currentRegion === String(pid) ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                        >
                          <span className="mr-1 opacity-50">•</span>
                          {getLocalizedText(data.places[pid], lang)}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};