import React, { useState, useEffect, useRef, MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { GatheringData, GatheringLogPageData, GatherType } from '../types';
import { getLocalizedText, GATHERING_ICONS } from '../utils';
import { useLanguage } from '../../../i18n/LanguageContext';
import { useTool } from '../../../context/ToolContext';

interface LevelNavProps {
  data: GatheringData;
  currentType: GatherType;
  setCurrentType: (type: GatherType) => void;
  pages: GatheringLogPageData[];
  completedItems: Set<number>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const LevelNav: React.FC<LevelNavProps> = ({
  data, currentType, setCurrentType, pages, completedItems, searchQuery, setSearchQuery
}) => {
  const { lang, t: i18n } = useLanguage();
  const { setHighlightItem } = useTool();
  const [isSticky, setIsSticky] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search State
  // searchQuery moved to props

  const [searchResults, setSearchResults] = useState<{ id: number; name: string; level: number; icon: string }[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [inputRect, setInputRect] = useState<DOMRect | null>(null);

  // Drag Scroll State
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const updateInputRect = () => {
    if (inputRef.current) {
      setInputRect(inputRef.current.getBoundingClientRect());
    }
  };

  // Search Logic
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const results: { id: number; name: string; level: number; icon: string }[] = [];
    const lowerQuery = searchQuery.toLowerCase();

    pages.forEach(page => {
      page.items.forEach(item => {
        const itemInfo = data.items[item.itemId];
        const name = getLocalizedText(itemInfo, lang);
        if (name.toLowerCase().includes(lowerQuery)) {
          const iconPath = data.icons[item.itemId];
          const iconUrl = iconPath ? `https://xivapi.com${iconPath}` : 'https://xivapi.com/i/066000/066313_hr1.png';
          results.push({ id: item.itemId, name, level: item.lvl, icon: iconUrl });
        }
      });
    });

    setSearchResults(results.slice(0, 20));
    setShowResults(true);
    updateInputRect();
  }, [searchQuery, data, lang, pages]);

  const handleSearchResultClick = (itemId: number) => {
    setHighlightItem(itemId);
    setShowResults(false);
    setSearchQuery('');
  };

  useEffect(() => {
    const handleScroll = () => {
      // Manual toggle requested
      /*
      const offset = window.scrollY;
      if (!isSticky && offset > 310) {
        setIsSticky(true);
      } else if (isSticky && offset < 60) {
        setIsSticky(false);
      }
      */
      if (showResults) updateInputRect();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateInputRect);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateInputRect);
    };
  }, [isSticky, showResults]);

  const scrollToSection = (id: string) => {
    if (isDragging) return;
    const element = document.getElementById(id);
    if (element) {
      const offset = 140;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
    }
  };

  const handleMouseDown = (e: MouseEvent) => {
    if (!scrollContainerRef.current || !isSticky) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const types: GatherType[] = ['mining', 'quarrying', 'logging', 'harvesting'];
  const typeLabels: Record<GatherType, string> = {
    mining: i18n.pages.gathering_log.mining,
    quarrying: i18n.pages.gathering_log.quarrying,
    logging: i18n.pages.gathering_log.logging,
    harvesting: i18n.pages.gathering_log.harvesting
  };
  const typeIcons: Record<GatherType, string> = {
    mining: GATHERING_ICONS.mining,
    quarrying: GATHERING_ICONS.quarrying,
    logging: GATHERING_ICONS.logging,
    harvesting: GATHERING_ICONS.harvesting
  };

  return (
    <div
      className={`sticky z-30 mb-6 bg-slate-50/95 dark:bg-slate-900/95 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md transition-all duration-300 top-[4.5rem] ${isSticky ? 'rounded-t-none border-t-0 shadow-lg py-2 px-4' : 'p-4'} relative group/nav`}
    >


      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: isSticky ? '0px' : '200px',
          opacity: isSticky ? 0 : 1,
          marginBottom: isSticky ? '0' : '1rem'
        }}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-1 px-1">
          <div className="flex flex-wrap gap-2">
            {types.map((type) => (
              <button
                key={type}
                onClick={() => setCurrentType(type)}
                className={`px-4 py-1.5 rounded-full text-sm font-bold border transition-all flex items-center gap-2 ${currentType === type ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20 scale-105' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
              >
                <img src={typeIcons[type]} className="w-5 h-5" alt="" />
                {typeLabels[type]}
              </button>
            ))}
          </div>

          <div className="w-full md:w-64 relative">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { updateInputRect(); if (searchQuery) setShowResults(true); }}
              onBlur={() => setTimeout(() => setShowResults(false), 200)}
              placeholder={i18n.pages.gathering_log.search_placeholder}
              className="w-full px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
        <div className="flex justify-between items-center mt-4 px-1">
          <h3 className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">{i18n.pages.gathering_log.jump_to}</h3>
        </div>
      </div>

      <div className="flex items-center gap-0">
        {isSticky && (
          <div className="relative group shrink-0 h-10 flex items-center pr-4 mr-2 border-r border-slate-200 dark:border-slate-700 animation-fade-in z-50">
            <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200 text-sm whitespace-nowrap cursor-pointer hover:text-blue-500 transition-colors">
              <img src={typeIcons[currentType]} className="w-6 h-6" alt="" />
              <span>{typeLabels[currentType]}</span>
              <span className="text-[10px] opacity-50">▼</span>
            </div>

            <div className="absolute top-full left-0 mt-0 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-left translate-y-1">
              <div className="p-1">
                {types.map((type) => (
                  <button
                    key={type}
                    onClick={() => setCurrentType(type)}
                    className={`w-full text-left px-3 py-2 rounded text-xs font-bold flex items-center gap-2 ${currentType === type ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                  >
                    <img src={typeIcons[type]} className="w-4 h-4" alt="" />
                    {typeLabels[type]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div
          ref={scrollContainerRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          className={`flex gap-2 flex-grow transition-all duration-300 overflow-y-hidden ${isSticky ? 'overflow-x-auto pb-2 thin-scrollbar flex-nowrap items-center cursor-grab active:cursor-grabbing' : 'flex-wrap'}`}
        >
          {pages.map((page, index) => {
            let label = `Lv.${page.startLevel}~${page.startLevel + 4}`;
            let isFolklore = false;

            const getPageLabelAndFolklore = (p: typeof page) => {
              const firstItemWithFolklore = p.items.find(item => {
                const nodes = Object.values(data.nodes).filter(n => n.items.includes(item.itemId));
                return nodes.some(n => n.folklore);
              });

              let pLabel = `Lv.${p.startLevel}~${p.startLevel + 4}`;
              let pIsFolklore = false;

              if (firstItemWithFolklore) {
                const nodes = Object.values(data.nodes).filter(n => n.items.includes(firstItemWithFolklore.itemId));
                const folkloreNode = nodes.find(n => n.folklore);
                if (folkloreNode && folkloreNode.folklore) {
                  pLabel = getLocalizedText(data.items[folkloreNode.folklore], lang);
                  pIsFolklore = true;
                }
              }
              return { label: pLabel, isFolklore: pIsFolklore };
            };

            const current = getPageLabelAndFolklore(page);
            label = current.label;
            isFolklore = current.isFolklore;

            let showBreak = false;
            if (!isSticky && index > 0) {
              const prev = getPageLabelAndFolklore(pages[index - 1]);
              // Only break when transitioning from normal levels to folklore
              if (isFolklore && !prev.isFolklore) {
                showBreak = true;
              }
            }

            const completedInPage = page.items.filter(i => completedItems.has(i.itemId)).length;
            const totalInPage = page.items.length;
            const percent = totalInPage > 0 ? Math.round((completedInPage / totalInPage) * 100) : 0;
            const isDone = completedInPage === totalInPage && totalInPage > 0;

            let btnClass = "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600";
            let progressColor = "text-slate-400 dark:text-slate-500";

            if (isDone) {
              btnClass = "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700/50";
              progressColor = "text-green-600 dark:text-green-300";
            } else if (percent > 0) {
              btnClass = "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700/50";
              progressColor = "text-blue-600 dark:text-blue-300";
            }

            let displayName = label;

            if (isFolklore) {
              const separators = ['·', '・', '-', ':'];
              const separator = separators.find(s => label.includes(s));
              if (separator) {
                const parts = label.split(separator);
                if (parts.length > 1) {
                  displayName = parts[parts.length - 1]; // Take the last part (e.g., "星外天域篇")
                }
              }
            }

            return (
              <React.Fragment key={page.id}>
                {showBreak && (
                    <div className="basis-full h-8 flex items-center gap-2 px-2 mt-2 mb-1">
                      <div className="h-px bg-slate-200 dark:bg-slate-700 flex-grow"></div>
                      <div className="flex items-center gap-1 text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        <img src={GATHERING_ICONS.folklore} className="w-3 h-3 opacity-70" alt="" />
                        {label.split(/·|・|-|:/)[0]}
                      </div>
                      <div className="h-px bg-slate-200 dark:bg-slate-700 flex-grow"></div>
                    </div>
                )}
                <button
                  onClick={() => scrollToSection(`section-${page.id}`)}
                  className={`px-3 py-1.5 rounded-md border text-xs transition-all flex items-center gap-2 shrink-0 shadow-sm select-none ${btnClass}`}
                  title={label}
                >
                  <span className="truncate max-w-[150px]">{displayName}</span>
                  <span className={`font-mono text-[10px] border-l pl-2 ${progressColor} border-slate-300 dark:border-white/10 opacity-80`}>
                    {percent}%
                  </span>
                </button>
              </React.Fragment>
            );
          })}
        </div>


        <button
          onClick={() => setIsSticky(!isSticky)}
          className={`p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 transition-colors z-40 ${isSticky ? 'ml-2 shrink-0 relative' : 'absolute bottom-2 right-2'}`}
          title={isSticky ? "Expand" : "Collapse"}
        >
          {isSticky ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
          )}
        </button>
      </div>

      {
        showResults && inputRect && createPortal(
          <div
            className="fixed bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xl overflow-hidden z-[9999] flex flex-col"
            style={{
              top: `${inputRect.bottom + window.scrollY + 4}px`,
              left: `${inputRect.left + window.scrollX}px`,
              width: `${Math.max(inputRect.width, 250)}px`,
              position: 'absolute'
            }}
          >
            <div className="max-h-[350px] overflow-y-auto thin-scrollbar">
              {searchResults.length > 0 ? (
                searchResults.map(result => (
                  <div
                    key={result.id}
                    onClick={() => handleSearchResultClick(result.id)}
                    className="px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                  >
                    <img src={result.icon} className="w-8 h-8 rounded border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-900 shrink-0" alt="" />
                    <div className="flex-grow min-w-0">
                      <div className="font-bold truncate">{result.name}</div>
                      <div className="text-[10px] text-slate-400">Lv.{result.level}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 text-center text-sm text-slate-500 italic">No results</div>
              )}
            </div>
          </div>,
          document.body
        )
      }
    </div >
  );
};
