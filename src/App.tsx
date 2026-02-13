import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { GatheringLogPage } from './features/gathering-log';
import { useLanguage } from './i18n/LanguageContext';
import { useFavicon } from './hooks/useFavicon';

function Home() {
  const { t } = useLanguage();
  useFavicon('/favicon.svg');
  return (
    <div className="max-w-[1200px] mx-auto p-8 flex-grow">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-slate-800 dark:text-yellow-500 tracking-tight">
          {t.pages.home.title}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-lg">
          {t.pages.home.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        <Link
          to="/gathering-log"
          className="group relative p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-xl hover:shadow-2xl transition-all border border-slate-200 dark:border-slate-700 overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <img src={`${import.meta.env.BASE_URL}favicon_gatheringlog.svg`} alt="Gathering Log" className="w-16 h-16" />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-slate-800 dark:text-slate-100">{t.pages.gathering_log.title}</h2>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
            採礦工與園藝工的圖鑑檢核。支援多語言、限時點計時與地圖查看。
          </p>
          <div className="mt-6 text-blue-600 dark:text-blue-400 font-bold flex items-center gap-2">
            立即開啟 <span>→</span>
          </div>
        </Link>

        <a
          href={`${import.meta.env.BASE_URL}AetherCurrent/index.html`}
          className="group relative p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-xl hover:shadow-2xl transition-all border border-slate-200 dark:border-slate-700 overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <span className="text-6xl">🧭</span>
          </div>
          <h2 className="text-2xl font-bold mb-3 text-slate-800 dark:text-slate-100">{t.pages.aether_current.title}</h2>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
            {t.pages.aether_current.desc}
          </p>
          <div className="mt-6 text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2">
            立即開啟 <span>→</span>
          </div>
        </a>

        <a
          href={`${import.meta.env.BASE_URL}Squadron/index.html`}
          className="group relative p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-xl hover:shadow-2xl transition-all border border-slate-200 dark:border-slate-700 overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <img src={`${import.meta.env.BASE_URL}favicon_squadron.svg`} alt="Squadron" className="w-16 h-16" />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-slate-800 dark:text-slate-100">{t.pages.squadron.title}</h2>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
            {t.pages.squadron.desc}
          </p>
          <div className="mt-6 text-amber-600 dark:text-amber-400 font-bold flex items-center gap-2">
            立即開啟 <span>→</span>
          </div>
        </a>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        <Header title="FFXIV Toolbox" version="" />
        <div className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/gathering-log" element={<GatheringLogPage />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;