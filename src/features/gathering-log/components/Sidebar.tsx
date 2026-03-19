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
  visible?: boolean;
}

export const Sidebar: React.FC<SidebarProps & { isOpen?: boolean; onClose?: () => void }> = ({ 
  data, currentRegion, setCurrentRegion, pages, visible = true, isOpen = false, onClose 
}) => {
  const { lang, t: i18n } = useLanguage();
  const [collapsedExpansions, setCollapsedExpansions] = useState<Set<string>>(new Set());
  const [dataUpdated, setDataUpdated] = useState<string | null>(null);

  React.useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/gathering-log/metadata.json`)
      .then(res => res.json())
      .then(data => setDataUpdated(data.lastUpdated))
      .catch(() => {});
  }, []);
  
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

  if (!visible) return null;

  // Mobile Overlay Logic
  const overlayClass = isOpen ? 'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden animation-fade-in' : 'hidden';
  
  // Combine desktop (sticky) and mobile (drawer) styles
  // md:sticky md:translate-x-0 md:shadow-lg md:z-40 ...
  // Mobile defaults to hidden unless isOpen is handled? 
  // Actually, we want it to be ALWAYS visible on desktop, and toggleable on mobile.
  
  return (
    <>
      {/* Mobile Backdrop */}
      <div className={overlayClass} onClick={onClose} aria-hidden="true" />

      <aside className={`
        bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 
        md:w-56 md:shrink-0 md:rounded-lg md:p-4 
        md:sticky md:top-[calc(var(--app-header-height)+0.5rem)] md:max-h-[calc(100vh-var(--app-header-height)-1rem)] md:translate-x-0 md:block md:z-30
        overflow-y-auto thin-scrollbar overscroll-contain
        
        /* Mobile Specifics */
        ${isOpen ? 'fixed inset-y-0 left-0 z-50 w-64 p-4 block' : 'hidden'}
      `}>
        <div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">
            <h3 className="text-slate-800 dark:text-yellow-500 font-bold uppercase text-xs tracking-wider">
                {i18n.pages.gathering_log.regions_header}
            </h3>
            {/* Close Button Mobile Only */}
            <button onClick={onClose} className="md:hidden text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>
      
      <button 
        onClick={() => { setCurrentRegion('all'); onClose?.(); }}
        className={`w-full text-left px-2 py-1.5 rounded text-xs font-medium transition-colors mb-2 ${currentRegion === 'all' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-300 dark:ring-blue-800' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
      >
        {i18n.pages.gathering_log.all_regions}
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
                <span>{i18n.common.expansions[expKey as keyof typeof i18n.common.expansions]}</span>
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
                          onClick={() => { setCurrentRegion(String(pid)); onClose?.(); }}
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
      
      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 text-[10px] text-slate-400 text-center">
        {dataUpdated && (
          <div>
            {i18n.pages.gathering_log.data_updated.replace('{date}', new Date(dataUpdated).toLocaleDateString())}
          </div>
        )}
      </div>
    </aside>
    </>
  );
};