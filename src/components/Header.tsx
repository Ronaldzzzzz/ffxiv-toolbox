import React, { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon, Home as HomeIcon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useTool } from '../context/ToolContext';
import { useLanguage } from '../i18n/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../i18n/locales';
import { UI_ICON_URLS } from '../features/gathering-log/iconRegistry';

interface HeaderProps {
  title: string;
  version: string;
}

export const Header: React.FC<HeaderProps> = ({ title: defaultTitle, version: defaultVersion }) => {
  const { jobMiner: MINER_ICON_URL, jobBotanist: BOTANIST_ICON_URL } = UI_ICON_URLS;
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const { progress, toolInfo, headerActions, centerActions, etTime } = useTool();
  const { lang, setLang, t } = useLanguage();

  const displayTitle = toolInfo?.title || (location.pathname === '/gathering-log' ? t.pages.gathering_log.title : defaultTitle);
  const displayVersion = toolInfo?.version || defaultVersion;
  const navRef = useRef<HTMLElement | null>(null);
  const progressPercent = progress && progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;
  const hasDetailedGroupProgress = Boolean(
    progress
    && progress.currentMining !== undefined
    && progress.currentQuarrying !== undefined
    && progress.totalMining !== undefined
    && progress.totalQuarrying !== undefined
    && progress.currentLogging !== undefined
    && progress.currentHarvesting !== undefined
    && progress.totalLogging !== undefined
    && progress.totalHarvesting !== undefined
  );
  const miningGroupPercent = progress && progress.totalPrimary && progress.totalPrimary > 0
    ? Math.round(((progress.currentPrimary || 0) / progress.totalPrimary) * 100)
    : 0;
  const botanyGroupPercent = progress && progress.totalSecondary && progress.totalSecondary > 0
    ? Math.round(((progress.currentSecondary || 0) / progress.totalSecondary) * 100)
    : 0;

  useEffect(() => {
    const navElement = navRef.current;
    if (!navElement) return;

    const updateHeaderHeight = () => {
      document.documentElement.style.setProperty('--app-header-height', `${navElement.offsetHeight}px`);
    };

    updateHeaderHeight();
    const resizeObserver = new ResizeObserver(updateHeaderHeight);
    resizeObserver.observe(navElement);
    window.addEventListener('resize', updateHeaderHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateHeaderHeight);
    };
  }, []);

  return (
    <nav ref={navRef} className="sticky top-0 z-50 bg-white/95 dark:bg-slate-800/95 shadow-md border-b border-slate-200 dark:border-slate-700 transition-all">
      <div className="max-w-[1600px] mx-auto px-4 py-2">
        <div className="flex items-center justify-between relative min-h-[3rem]">
          
          {/* Left: Title & Progress */}
          <div className="flex flex-col justify-center min-w-0 flex-shrink mr-2">
            <div className="flex items-center gap-2">
              <Link to="/" className="text-lg md:text-xl font-bold text-slate-800 dark:text-yellow-500 flex items-center gap-2 tracking-tight truncate">
                <span className="truncate">{displayTitle}</span>
                {displayVersion && (
                  <span className="text-[10px] md:text-[12px] px-1.5 py-0.5 md:px-2 md:py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-700 font-bold leading-none shrink-0">
                    {displayVersion}
                  </span>
                )}
              </Link>
            </div>

            {(progress || etTime || headerActions) && (
              <div className="mt-1 text-slate-400 dark:text-slate-500">
                {(progress || etTime) && (
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mask-gradient-right">
                    {progress && (
                      hasDetailedGroupProgress ? (
                        <div className="flex items-center gap-2 shrink-0 text-[10px] md:text-[12px] font-mono text-blue-600 dark:text-blue-300 font-bold">
                          <img src={MINER_ICON_URL} alt="" className="w-4 h-4 shrink-0" />
                          <span title={`${progress.currentMining}+${progress.currentQuarrying}/${progress.totalMining}+${progress.totalQuarrying}`}>
                            {progress.currentPrimary}/{progress.totalPrimary} {miningGroupPercent}%
                          </span>
                          <div className="w-8 md:w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden hidden sm:block">
                            <div className="h-full bg-blue-500" style={{ width: `${miningGroupPercent}%` }} />
                          </div>
                          <span className="text-xs opacity-50">|</span>
                          <img src={BOTANIST_ICON_URL} alt="" className="w-4 h-4 shrink-0" />
                          <span title={`${progress.currentLogging}+${progress.currentHarvesting}/${progress.totalLogging}+${progress.totalHarvesting}`}>
                            {progress.currentSecondary}/{progress.totalSecondary} {botanyGroupPercent}%
                          </span>
                          <div className="w-8 md:w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden hidden sm:block">
                            <div className="h-full bg-blue-500" style={{ width: `${botanyGroupPercent}%` }} />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-[10px] md:text-[12px] font-mono text-blue-600 dark:text-blue-300 font-bold">
                            {progress.current}/{progress.total} {progressPercent}%
                          </div>
                          <div className="w-8 md:w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden hidden sm:block">
                            <div className="h-full bg-blue-500" style={{ width: `${progressPercent}%` }} />
                          </div>
                        </div>
                      )
                    )}

                    {etTime && (
                      <>
                        <span className="text-xs opacity-50 shrink-0">|</span>
                        <div className="text-[10px] md:text-[12px] font-mono font-bold text-slate-700 dark:text-slate-300 shrink-0">
                          ET {etTime}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {headerActions && (
                  <div className={`flex items-center overflow-x-auto no-scrollbar mask-gradient-right ${progress || etTime ? 'mt-1' : ''}`}>
                    {headerActions}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Center: Desktop View Switcher (Absolute Centered) */}
          <div className="hidden xl:flex absolute left-1/2 -translate-x-1/2 items-center">
            {centerActions}
          </div>

          {/* Right: Nav & Settings */}
          <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-3">
                {location.pathname !== '/' && (
                <Link 
                    to="/" 
                    className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1"
                >
                    <HomeIcon size={14} />
                    <span>{t.common.nav_home}</span>
                </Link>
                )}

                <div className="flex space-x-0.5 md:space-x-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded border border-slate-300 dark:border-slate-700">
                {SUPPORTED_LANGUAGES.map((l) => (
                    <button 
                    key={l.code}
                    onClick={() => setLang(l.code)}
                    className={`px-1.5 md:px-2 py-0.5 text-[10px] font-bold rounded transition-all ${lang === l.code ? 'bg-blue-600 text-white font-bold shadow-sm' : 'opacity-50 hover:opacity-100 text-slate-700 dark:text-slate-300'}`}
                    >
                    {l.label}
                    </button>
                ))}
                </div>

                <button 
                onClick={toggleTheme}
                className="border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 p-1 md:p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                {isDark ? <Sun size={14} className="md:w-4 md:h-4" /> : <Moon size={14} className="md:w-4 md:h-4" />}
                </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden relative group">
                <button className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                </button>
                {/* Mobile Dropdown */}
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden hidden group-hover:block hover:block z-[9999]">
                    <div className="p-2 flex flex-col gap-2">
                        {location.pathname !== '/' && (
                            <Link 
                                to="/" 
                                className="px-3 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2"
                            >
                                <HomeIcon size={16} />
                                <span>{t.common.nav_home}</span>
                            </Link>
                        )}
                        
                        <div className="px-3 py-2">
                            <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">{t.common.language || 'Language'}</div>
                            <div className="flex flex-col gap-1">
                                {SUPPORTED_LANGUAGES.map((l) => (
                                    <button 
                                        key={l.code}
                                        onClick={() => setLang(l.code)}
                                        className={`text-left px-2 py-1.5 rounded text-xs font-bold ${lang === l.code ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                    >
                                        {l.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="border-t border-slate-100 dark:border-slate-700 pt-2 mt-1">
                            <button 
                                onClick={toggleTheme}
                                className="w-full text-left px-3 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2"
                            >
                                {isDark ? (
                                    <>
                                        <Sun size={16} />
                                        <span>Light Mode</span>
                                    </>
                                ) : (
                                    <>
                                        <Moon size={16} />
                                        <span>Dark Mode</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </div>

        {/* Mobile View Switcher (New Row) */}
        {centerActions && (
          <div className="xl:hidden flex justify-center pb-2 pt-1 border-t border-slate-100 dark:border-slate-700/50 mt-1">
            {centerActions}
          </div>
        )}
      </div>
    </nav>
  );
};