import React, { createContext, useContext, useState, ReactNode } from 'react';
import { translations, Translation } from './locales';

type LangCode = 'tw' | 'zh' | 'en' | 'ja';

interface LanguageContextType {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  t: Translation;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<LangCode>(() => {
    const saved = localStorage.getItem('ff14_lang_pref');
    if (saved === 'zh-TW') return 'tw';
    if (saved === 'zh-CN') return 'zh';
    if (saved === 'ja' || saved === 'en') return saved as LangCode;

    // 首次造訪（無 localStorage 記錄）→ 根據瀏覽器語言自動選擇
    const browserLang = (navigator.languages?.[0] ?? navigator.language ?? '').toLowerCase();
    if (/^zh-(tw|hk|mo)/.test(browserLang)) return 'tw';
    if (/^zh/.test(browserLang)) return 'zh';
    if (/^ja/.test(browserLang)) return 'ja';
    // 英文及其他語言（fr、ko、de 等）預設英文介面
    if (browserLang) return 'en';

    return 'tw';
  });

  const setLang = (newLang: LangCode) => {
    setLangState(newLang);
    const pref = newLang === 'tw' ? 'zh-TW' : (newLang === 'zh' ? 'zh-CN' : newLang);
    localStorage.setItem('ff14_lang_pref', pref);
  };

  const t = translations[lang];

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components -- provider + hook co-located by design; splitting is out of scope
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
};
