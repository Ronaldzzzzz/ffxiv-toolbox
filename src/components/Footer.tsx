import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto py-8 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-center text-slate-500 dark:text-slate-400 text-[10px] md:text-xs leading-relaxed transition-colors">
      <div className="max-w-[1600px] mx-auto px-4">
        <p>FINAL FANTASY XIV © 2010 - 2026 SQUARE ENIX CO., LTD. 版權所有。</p>
        <p>FINAL FANTASY is a registered trademark of Square Enix Holdings Co., Ltd.</p>
        <p className="mt-2 flex flex-wrap justify-center gap-x-2 gap-y-1">
          <span>參考資料來源:</span>
          <a href="https://ff14.huijiwiki.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 dark:text-blue-400 hover:underline">Huiji Wiki</a>
          <span className="opacity-30">|</span>
          <a href="https://cafemaker.wakingsands.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 dark:text-blue-400 hover:underline">Cafemaker</a>
          <span className="opacity-30">|</span>
          <a href="https://ffxivteamcraft.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 dark:text-blue-400 hover:underline">Teamcraft</a>
          <span className="opacity-30">|</span>
          <a href="https://xivapi.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 dark:text-blue-400 hover:underline">XIVAPI</a>
        </p>
        <p className="mt-2 opacity-50">
          Repository: <a href="https://github.com/ronaldzzzzz/ffxiv-toolbox" target="_blank" rel="noopener noreferrer" className="text-blue-500 dark:text-blue-400 hover:underline">GitHub</a>
        </p>
      </div>
    </footer>
  );
};
