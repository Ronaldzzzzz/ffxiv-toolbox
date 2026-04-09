import { useEffect } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

type LangCode = 'tw' | 'zh' | 'en' | 'ja';

interface SeoMetaLang {
  title: string;
  description: string;
}

interface SeoMeta {
  langs: Record<LangCode, SeoMetaLang>;
  canonicalPath: string; // e.g. '/ffxiv-toolbox/gathering-log'
}

const HTML_LANG_MAP: Record<LangCode, string> = {
  tw: 'zh-TW',
  zh: 'zh-CN',
  en: 'en',
  ja: 'ja',
};

function setMetaContent(selector: string, content: string) {
  const el = document.querySelector(selector);
  if (el) el.setAttribute('content', content);
}

export function useSeoMeta({ langs, canonicalPath }: SeoMeta) {
  const { lang } = useLanguage();

  useEffect(() => {
    const BASE = 'https://ronaldzzzzz.github.io';
    const url = `${BASE}${canonicalPath}`;
    const { title, description } = langs[lang] ?? langs.en;

    document.title = title;
    document.documentElement.lang = HTML_LANG_MAP[lang];

    setMetaContent('meta[name="description"]', description);
    setMetaContent('meta[property="og:title"]', title);
    setMetaContent('meta[property="og:description"]', description);
    setMetaContent('meta[property="og:url"]', url);
    setMetaContent('meta[name="twitter:title"]', title);
    setMetaContent('meta[name="twitter:description"]', description);

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', url);
  }, [lang, langs, canonicalPath]);
}
