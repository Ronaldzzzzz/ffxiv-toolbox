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
    language: string;
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
      regions_header: string;
      all_regions: string;
      omitted: string;
      back_to_top: string;
      select_all: string;
      deselect_all: string;
      active: string;
      wait: string;
      in_label: string;
      mins_left: string;
      mins: string;
      timed_active: string;
      timed_soon: string;
      timed_later: string;
      no_timed_nodes: string;
      all_types: string;
      items_list: string;
      items_select_prompt: string;
      maps_available: string;
      nodes_incomplete: string;
      unknown_region: string;
      map_select_prompt: string;
      level_short: string;
      data_updated: string;
      view_level: string;
      view_timed: string;
      view_map: string;
      filter: string;
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
        exp_2: '2.0 新生艾奧傑亞',
        exp_3: '3.0 蒼天伊修加爾德',
        exp_4: '4.0 紅蓮解放者',
        exp_5: '5.0 漆黑反逆者',
        exp_6: '6.0 曉月之終途',
        exp_7: '7.0 黃金遺產'
      },
      language: '語言'
    },
    pages: {
      home: {
        title: 'FFXIV Toolbox',
        subtitle: '為艾歐澤亞的光之戰士提供的網頁輔助工具集'
      },
      gathering_log: {
        title: 'FFXIV 採集手冊',
        mining: '採掘',
        quarrying: '碎石',
        logging: '採伐',
        harvesting: '割草',
        progress: '目前進度',
        hide_completed: '隱藏已完成',
        show_bookmarks: '僅顯示書籤',
        jump_to: '等級跳轉',
        search_placeholder: '搜尋物品...',
        regions_header: '區域',
        all_regions: '全部地區',
        omitted: '已省略詳細地點',
        back_to_top: '返回頂部',
        select_all: '全選',
        deselect_all: '取消全選',
        active: '可採集',
        wait: '等待',
        in_label: '還有',
        mins_left: '剩餘',
        mins: '分',
        timed_active: '正在進行',
        timed_soon: '即將出現',
        timed_later: '稍後出現',
        no_timed_nodes: '沒有可顯示的限時節點',
        all_types: '全部',
        items_list: '物品列表',
        items_select_prompt: '請選擇地圖以檢視物品',
        maps_available: '{count} 張地圖',
        nodes_incomplete: '{count} 個未完成節點',
        unknown_region: '未知區域',
        map_select_prompt: '請從側邊欄選擇地圖以檢視節點',
        level_short: 'Lv.',
        data_updated: '資料最後更新於：{date}',
        view_level: '等級視角',
        view_timed: '限時視角',
        view_map: '地圖視角',
        filter: '篩選'
      },
      aether_current: {
        title: '風脈泉路徑',
        desc: '自動辨識風脈泉並計算最短路徑'
      },
      squadron: {
        title: '分隊計算器',
        desc: '冒險者分隊任務成功率計算'
      },
    },
    footer: {
      copyright: '版權所有',
      sources: '參考資料來源',
      repo: '原始碼'
    }
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
      },
      language: 'Language'
    },
    pages: {
      home: {
        title: 'FFXIV Toolbox',
        subtitle: 'Web tools for Warriors of Light'
      },
      gathering_log: {
        title: 'FFXIV Gathering Log',
        mining: 'Mining',
        quarrying: 'Quarrying',
        logging: 'Logging',
        harvesting: 'Harvesting',
        progress: 'Progress',
        hide_completed: 'Hide Completed',
        show_bookmarks: 'Bookmarks',
        jump_to: 'Jump to Level',
        search_placeholder: 'Search items...',
        regions_header: 'Regions',
        all_regions: 'All Regions',
        omitted: 'Locations omitted',
        back_to_top: 'Back to Top',
        select_all: 'Select All',
        deselect_all: 'Deselect All',
        active: 'Active',
        wait: 'Wait',
        in_label: 'In',
        mins_left: 'left',
        mins: 'm',
        timed_active: 'Currently Active',
        timed_soon: 'Coming Soon',
        timed_later: 'Later',
        no_timed_nodes: 'No timed nodes to display',
        all_types: 'All',
        items_list: 'Items',
        items_select_prompt: 'Select a map to view items',
        maps_available: '{count} Maps Available',
        nodes_incomplete: '{count} Nodes Incomplete',
        unknown_region: 'Unknown Region',
        map_select_prompt: 'Select a map from the sidebar to view nodes',
        level_short: 'Lv.',
        data_updated: 'Data Updated: {date}',
        view_level: 'Level View',
        view_timed: 'Timed View',
        view_map: 'Map View',
        filter: 'Filter'
      },
      aether_current: {
        title: 'Aether Current',
        desc: 'Pathfinding for currents'
      },
      squadron: {
        title: 'Squadron Calc',
        desc: 'Adventurer Squadron simulator'
      },
    },
    footer: {
      copyright: 'All Rights Reserved',
      sources: 'Sources',
      repo: 'Repository'
    }
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
      },
      language: '言語'
    },
    pages: {
      home: {
        title: 'FFXIV ツールボックス',
        subtitle: '光の戦士のためのWebツール'
      },
      gathering_log: {
        title: 'FFXIV 採集手帳',
        mining: '採掘',
        quarrying: '砕岩',
        logging: '伐採',
        harvesting: '草刈',
        progress: '進捗',
        hide_completed: '完了を隠す',
        show_bookmarks: 'ブックマークのみ',
        jump_to: 'レベルジャンプ',
        search_placeholder: 'アイテムを検索...',
        regions_header: 'エリア',
        all_regions: 'すべての地域',
        omitted: '場所を省略しました',
        back_to_top: 'トップに戻る',
        select_all: 'すべて選択',
        deselect_all: 'すべて解除',
        active: '出現中',
        wait: '待機',
        in_label: 'あと',
        mins_left: '残り',
        mins: '分',
        timed_active: '現在アクティブ',
        timed_soon: 'もうすぐ出現',
        timed_later: '後で出現',
        no_timed_nodes: '表示する限時ノードがありません',
        all_types: 'すべて',
        items_list: 'アイテム',
        items_select_prompt: 'マップを選択してアイテムを表示',
        maps_available: '{count} マップ',
        nodes_incomplete: '未完了 {count}',
        unknown_region: '不明な地域',
        map_select_prompt: 'サイドバーからマップを選択してノードを表示',
        level_short: 'Lv.',
        data_updated: 'データ更新日：{date}',
        view_level: 'レベル別',
        view_timed: '時間別',
        view_map: 'マップ',
        filter: 'フィルタ'
      },
      aether_current: {
        title: '風脈泉パス',
        desc: '風脈泉の位置を自動認識'
      },
      squadron: {
        title: '小隊計算機',
        desc: '冒険者小隊の任務成功率'
      },
    },
    footer: {
      copyright: 'Copyright © SQUARE ENIX',
      sources: '情報源',
      repo: 'リポジトリ'
    }
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
      },
      language: '语言'
    },
    pages: {
      home: {
        title: 'FFXIV Toolbox',
        subtitle: '为艾欧泽亚的光之战士提供的网页辅助工具集'
      },
      gathering_log: {
        title: 'FFXIV 采集手册',
        mining: '采掘',
        quarrying: '碎石',
        logging: '伐木',
        harvesting: '割草',
        progress: '进度',
        hide_completed: '隐藏已完成',
        show_bookmarks: '仅显示书签',
        jump_to: '等级跳转',
        search_placeholder: '搜索物品...',
        regions_header: '区域',
        all_regions: '全部地区',
        omitted: '已省略详细地点',
        back_to_top: '返回顶部',
        select_all: '全选',
        deselect_all: '取消全选',
        active: '可采集',
        wait: '等待',
        in_label: '还有',
        mins_left: '剩余',
        mins: '分',
        timed_active: '正在进行',
        timed_soon: '即将出现',
        timed_later: '稍后出现',
        no_timed_nodes: '没有可显示的限时节点',
        all_types: '全部',
        items_list: '物品列表',
        items_select_prompt: '请选择地图以查看物品',
        maps_available: '{count} 张地图',
        nodes_incomplete: '{count} 个未完成节点',
        unknown_region: '未知区域',
        map_select_prompt: '请从侧边栏选择地图以查看节点',
        level_short: 'Lv.',
        data_updated: '资料最后更新于：{date}',
        view_level: '等级视角',
        view_timed: '限时视角',
        view_map: '地图视角',
        filter: '过滤'
      },
      aether_current: {
        title: '风脉泉路径',
        desc: '自动辨识风脉泉并計算最短路径'
      },
      squadron: {
        title: '分队计算器',
        desc: '冒险者分队任务成功率计算'
      },
    },
    footer: {
      copyright: '版权所有',
      sources: '参考资料来源',
      repo: '源代码'
    }
  }
};