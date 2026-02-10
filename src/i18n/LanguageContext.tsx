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
    return 'tw';
  });

  const setLang = (newLang: LangCode) => {
    setLangState(newLang);
    let pref = newLang === 'tw' ? 'zh-TW' : (newLang === 'zh' ? 'zh-CN' : newLang);
    localStorage.setItem('ff14_lang_pref', pref);
  };

  const t = translations[lang];

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
};
