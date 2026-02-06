export interface Translation {
  common: {
    nav_home: string;
    theme_toggle: string;
    version: string;
    loading: string;
    error_loading: string;
    expansions: {
      exp_2: string;
      exp_3: string;
      exp_4: string;
      exp_5: string;
      exp_6: string;
      exp_7: string;
    };
  };
  pages: {
    home: {
      title: string;
      subtitle: string;
    };
    gathering_log: {
      title: string;
      mining: string;
      quarrying: string;
      logging: string;
      harvesting: string;
      progress: string;
      hide_completed: string;
      show_bookmarks: string;
      jump_to: string;
      search_placeholder: string;
      all_regions: string;
      omitted: string;
      back_to_top: string;
    };
    aether_current: {
      title: string;
      desc: string;
    };
    squadron: {
      title: string;
      desc: string;
    };
  };
  footer: {
    copyright: string;
    sources: string;
    repo: string;
  };
}

export type LangCode = 'tw' | 'zh' | 'en' | 'ja';

export const SUPPORTED_LANGUAGES: { code: LangCode; label: string }[] = [
  { code: 'tw', label: '繁' },
  { code: 'zh', label: '简' },
  { code: 'en', label: 'EN' },
  { code: 'ja', label: '日' },
];

export const translations: Record<LangCode, Translation> = {
  'tw': {
    common: {
      nav_home: '回首頁',
      theme_toggle: '切換主題',
      version: '版本',
      loading: '載入中...',
      error_loading: '載入失敗',
      expansions: {
        exp_2: '新生艾歐澤亞 (2.0)',
        exp_3: '蒼天之龍騎士 (3.0)',
        exp_4: '紅蓮之狂潮 (4.0)',
        exp_5: '漆黑之反逆者 (5.0)',
        exp_6: '曉月之終途 (6.0)',
        exp_7: '黃金之遺產 (7.0)'
      }
    },
    pages: {
      home: { title: 'FFXIV Toolbox', subtitle: '為艾歐澤亞的光之戰士提供的網頁輔助工具集' },
      gathering_log: {
        title: 'FFXIV 採集手冊',
        mining: '採掘', quarrying: '碎石', logging: '伐木', harvesting: '割草',
        progress: '目前進度', hide_completed: '隱藏已完成', show_bookmarks: '僅顯示書籤', jump_to: '等級跳轉',
        search_placeholder: '搜尋物品...', all_regions: '全部地區', omitted: '已省略詳細地點', back_to_top: '返回頂部'
      },
      aether_current: { title: '風脈泉路徑', desc: '自動辨識風脈泉並計算最短路徑' },
      squadron: { title: '分隊計算器', desc: '冒險者分隊任務成功率計算' },
    },
    footer: { copyright: '版權所有', sources: '參考資料來源', repo: '原始碼' }
  },
  'en': {
    common: {
      nav_home: 'Home',
      theme_toggle: 'Toggle Theme',
      version: 'Ver',
      loading: 'Loading...',
      error_loading: 'Failed to load',
      expansions: {
        exp_2: 'A Realm Reborn',
        exp_3: 'Heavensward',
        exp_4: 'Stormblood',
        exp_5: 'Shadowbringers',
        exp_6: 'Endwalker',
        exp_7: 'Dawntrail'
      }
    },
    pages: {
      home: { title: 'FFXIV Toolbox', subtitle: 'Web tools for Warriors of Light' },
      gathering_log: {
        title: 'FFXIV Gathering Log',
        mining: 'Mining', quarrying: 'Quarrying', logging: 'Logging', harvesting: 'Harvesting',
        progress: 'Progress', hide_completed: 'Hide Completed', show_bookmarks: 'Bookmarks', jump_to: 'Jump to Level',
        search_placeholder: 'Search items...', all_regions: 'All Regions', omitted: 'Locations omitted', back_to_top: 'Back to Top'
      },
      aether_current: { title: 'Aether Current', desc: 'Pathfinding for currents' },
      squadron: { title: 'Squadron Calc', desc: 'Adventurer Squadron simulator' },
    },
    footer: { copyright: 'All Rights Reserved', sources: 'Sources', repo: 'Repository' }
  },
  'ja': {
    common: {
      nav_home: 'ホーム',
      theme_toggle: 'テーマ切替',
      version: 'Ver',
      loading: '読み込み中...',
      error_loading: '読み込み失敗',
      expansions: {
        exp_2: '新生エオルゼア',
        exp_3: '蒼天のイシュガルド',
        exp_4: '紅蓮のリベレーター',
        exp_5: '漆黒のヴィランズ',
        exp_6: '暁月のフィナーレ',
        exp_7: '黄金のレガシー'
      }
    },
    pages: {
      home: { title: 'FFXIV ツールボックス', subtitle: '光の戦士のためのWebツール' },
      gathering_log: {
        title: 'FFXIV 採集手帳',
        mining: '採掘', quarrying: '砕岩', logging: '伐採', harvesting: '草刈',
        progress: '進捗', hide_completed: '完了を隠す', show_bookmarks: 'ブックマークのみ', jump_to: 'レベルジャンプ',
        search_placeholder: 'アイテムを検索...', all_regions: 'すべての地域', omitted: '場所を省略しました', back_to_top: 'トップに戻る'
      },
      aether_current: { title: '風脈泉パス', desc: '風脈泉の位置を自動認識' },
      squadron: { title: '小隊計算機', desc: '冒険者小隊の任務成功率' },
    },
    footer: { copyright: 'Copyright © SQUARE ENIX', sources: '情報源', repo: 'リポジトリ' }
  },
  'zh': {
    common: {
      nav_home: '回首页',
      theme_toggle: '切换主題',
      version: '版本',
      loading: '加载中...',
      error_loading: '加载失败',
      expansions: {
        exp_2: '新生艾欧泽亚',
        exp_3: '苍穹之禁城',
        exp_4: '红莲之狂潮',
        exp_5: '漆黑之反逆者',
        exp_6: '晓月之终途',
        exp_7: '黄金之遗产'
      }
    },
    pages: {
      home: { title: 'FFXIV Toolbox', subtitle: '为艾欧泽亚的光之战士提供的网页辅助工具集' },
      gathering_log: {
        title: 'FFXIV 采集手册',
        mining: '采掘', quarrying: '碎石', logging: '伐木', harvesting: '割草',
        progress: '进度', hide_completed: '隐藏已完成', show_bookmarks: '仅显示书签', jump_to: '等级跳转',
        search_placeholder: '搜索物品...', all_regions: '全部地区', omitted: '已省略详细地点', back_to_top: '返回顶部'
      },
      aether_current: { title: '风脉泉路径', desc: '自动辨识风脉泉并計算最短路径' },
      squadron: { title: '分队计算器', desc: '冒险者分队任务成功率计算' },
    },
    footer: { copyright: '版权所有', sources: '参考资料来源', repo: '源代码' }
  }
};