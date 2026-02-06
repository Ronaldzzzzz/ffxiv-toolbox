import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon, Home as HomeIcon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useTool } from '../context/ToolContext';
import { useLanguage } from '../i18n/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../i18n/locales';

interface HeaderProps {
  title: string;
  version: string;
}

export const Header: React.FC<HeaderProps> = ({ title: defaultTitle, version: defaultVersion }) => {
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const { progress, toolInfo, headerActions, centerActions, etTime } = useTool();
  const { lang, setLang, t } = useLanguage();

  const displayTitle = toolInfo?.title || (location.pathname === '/gathering-log' ? t.pages.gathering_log.title : defaultTitle);
  const displayVersion = toolInfo?.version || defaultVersion;

  return (
    <nav className="sticky top-0 z-50 bg-white/95 dark:bg-slate-800/95 shadow-md border-b border-slate-200 dark:border-slate-700 transition-all">
      <div className="max-w-[1600px] mx-auto px-4 py-2">
        <div className="flex items-center justify-between relative min-h-[3rem]">
          
          {/* 左側：上(標題) 下(進度|ET|動作) */}
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <Link to="/" className="text-xl font-bold text-slate-800 dark:text-yellow-500 flex items-center gap-2 tracking-tight">
                {displayTitle}
                {displayVersion && (
                  <span className="text-[12px] px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-700 font-bold leading-none">
                    {displayVersion}
                  </span>
                )}
              </Link>
            </div>

            {(progress || etTime || headerActions) && (
              <div className="flex items-center gap-2 mt-1 text-slate-400 dark:text-slate-500">
                {progress && (
                  <div className="flex items-center gap-2">
                    <div className="text-[12px] font-mono text-blue-600 dark:text-blue-300 font-bold">
                      {progress.current}/{progress.total} ({Math.round(progress.current / progress.total * 100)}%)
                    </div>
                    <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden hidden sm:block">
                      <div className="h-full bg-blue-500" style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }} />
                    </div>
                  </div>
                )}

                {etTime && (
                  <>
                    <span className="text-xs opacity-50">|</span>
                    <div className="text-[12px] font-mono font-bold text-slate-700 dark:text-slate-300">
                      ET {etTime}
                    </div>
                  </>
                )}

                {headerActions && (
                  <>
                    <span className="text-xs opacity-50">|</span>
                    <div className="flex items-center">
                      {headerActions}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* 中間：視角切換 (絕對定位居中) */}
          <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center">
            {centerActions}
          </div>

          {/* 右側：導覽與設定 */}
          <div className="flex items-center gap-3">
            {location.pathname !== '/' && (
              <Link 
                to="/" 
                className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1"
              >
                <HomeIcon size={14} />
                <span>{t.common.nav_home}</span>
              </Link>
            )}

            <div className="flex space-x-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded border border-slate-300 dark:border-slate-700">
              {SUPPORTED_LANGUAGES.map((l) => (
                <button 
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all ${lang === l.code ? 'bg-blue-600 text-white font-bold shadow-sm' : 'opacity-50 hover:opacity-100 text-slate-700 dark:text-slate-300'}`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            <button 
              onClick={toggleTheme}
              className="border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};