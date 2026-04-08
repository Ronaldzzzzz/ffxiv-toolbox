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
      view_bookmark: string;
      filter: string;
      search_no_results: string;
      copied: string;
      copy_name: string;
      add_bookmark: string;
      remove_bookmark: string;
      timed_nodes: string;
      select_map: string;
      calculate_path: string;
      optimal_path: string;
      gathering_nodes: string;
      unknown_location: string;
      no_bookmarks: string;
      timed_legend_bookmarks: string;
      regular_bookmarks: string;
      unknown_item: string;
      gatherable_tag: string;
      recipe_product_tag: string;
      amount_needed: string;
      bookmarked_status: string;
      recipe_parsing_title: string;
      recipe_description: string;
      recipe_parsing_failed: string;
      
      collectible_tag: string;
      custom_delivery_tag: string;
      collection_only_tag: string;
      aetherial_reduction_tag: string;
      collectibles_header: string;
      hidden_tag: string;

      alarm_settings: string;
      alarm_enable: string;
      alarm_sound: string;
      alarm_lead_time: string;
      alarm_sound_type: string;
      alarm_sound_type_1: string;
      alarm_sound_type_2: string;
      alarm_sound_type_3: string;
      alarm_test_notification: string;
      alarm_test_sound: string;
      alarm_macro_time_mode: string;
      alarm_macro_time_mode_et: string;
      alarm_macro_time_mode_lt: string;
      alarm_macro_repeat: string;
      alarm_macro_gen: string;
      alarm_copy_macro: string;
      alarm_browser_permission_denied: string;
      alarm_sound_blocked_warning: string;
      alarm_sound_unavailable_warning: string;
      alarm_notification_title: string;
      alarm_notification_body: string;
      alarm_notification_body_lead: string;
      alarm_test_notification_body: string;
      alarm_sound_builtin_group: string;
      alarm_sound_mp3_group: string;
      alarm_macro_all_groups: string;

      group_add: string;
      group_rename: string;
      group_delete: string;
      group_unnamed: string;
      group_default_prefix: string;
      group_overview: string;
      group_empty: string;
      group_count_status: string;
      group_limit_reached: string;
      group_empty_bookmarks_hint: string;
      ungrouped: string;
      group_move_item: string;
      bookmark_alarm_status: string;
      bookmark_alarm_track_all: string;
      bookmark_alarm_clear_all: string;
      confirm_delete_group: string;
      save: string;
      cancel: string;
      expand: string;
      collapse: string;
      more_options: string;
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
        view_bookmark: '書籤',
        filter: '篩選',
        search_no_results: '找不到符合的物品',
        copied: '已複製',
        copy_name: '複製名稱',
        add_bookmark: '加入書籤',
        remove_bookmark: '移除書籤',
        timed_nodes: '限時點',
        select_map: '選擇地圖',
        calculate_path: '計算路徑',
        optimal_path: '最佳路徑',
        gathering_nodes: '採集點',
        unknown_location: '未知區域',
        no_bookmarks: '目前沒有釘選的書籤',
        timed_legend_bookmarks: '限時/傳說 書籤',
        regular_bookmarks: '常規採集 書籤',
        unknown_item: '未知物品',
        gatherable_tag: '可採集',
        recipe_product_tag: '配方產物',
        amount_needed: '需要數量: ',
        bookmarked_status: '已釘選',
        recipe_parsing_title: '配方解析：',
        recipe_description: '製作此物品所需的最底層材料清單。綠色標示的為可採集項目。',
        recipe_parsing_failed: '解析配方失敗',

        collectible_tag: '收藏物',
        custom_delivery_tag: '老主顧',
        collection_only_tag: '收藏用',
        aetherial_reduction_tag: '精選',
        collectibles_header: '收藏品採集',
        hidden_tag: '隱藏',

        alarm_settings: '鬧鐘與巨集',
        alarm_enable: '啟用瀏覽器鬧鐘通知',
        alarm_sound: '啟用音效提示',
        alarm_lead_time: '提前通知 (現實分鐘)',
        alarm_sound_type: '提示音效',
        alarm_sound_type_1: '和弦聲 (Chime)',
        alarm_sound_type_2: '三連音 (Triple Beep)',
        alarm_sound_type_3: '警報聲 (Alarm)',
        alarm_test_notification: '測試通知',
        alarm_test_sound: '測試音效',
        alarm_macro_time_mode: '巨集時間格式',
        alarm_macro_time_mode_et: '艾歐澤亞時間 (ET)',
        alarm_macro_time_mode_lt: '本地時間 (LT)',
        alarm_macro_repeat: '巨集重複提醒 (循環)',
        alarm_macro_gen: '遊戲內 /alarm 巨集生成',
        alarm_copy_macro: '複製巨集',
        alarm_browser_permission_denied: '瀏覽器通知已被封鎖，請在瀏覽器設定中解除封鎖',
        alarm_sound_blocked_warning: '音效播放被瀏覽器阻擋。請先與頁面互動，並確認網站音訊權限已開啟。',
        alarm_sound_unavailable_warning: '找不到音效檔或音訊裝置不可用，請確認 public/audio/alarms 下已有 se.1.mp3 ~ se.16.mp3。',
        alarm_notification_title: '採集鬧鐘',
        alarm_notification_body: '{item} 正在出現！ET {time}',
        alarm_notification_body_lead: '{item} 將在 {minutes} 分鐘後出現 (ET {time})',
        alarm_test_notification_body: '這是一則測試通知。',
        alarm_sound_builtin_group: '內建音效',
        alarm_sound_mp3_group: 'MP3 音效檔',
        alarm_macro_all_groups: '全部群組',

        group_add: '新增群組',
        group_rename: '重命名',
        group_delete: '刪除',
        group_unnamed: '(未命名群組)',
        group_default_prefix: '群組',
        group_overview: '群組總覽',
        group_empty: '此群組目前沒有書籤。',
        group_count_status: '群組數量：{current}/{max}',
        group_limit_reached: '最多只能建立 5 個群組。',
        group_empty_bookmarks_hint: '目前沒有書籤項目，但你建立的群組已保留在上方。',
        ungrouped: '[未分組]',
        group_move_item: '移動到群組',
        bookmark_alarm_status: '鬧鐘追蹤：{tracked}/{total}',
        bookmark_alarm_track_all: '追蹤本群組限時',
        bookmark_alarm_clear_all: '清除本群組追蹤',
        confirm_delete_group: '確定刪除此群組嗎？其中的物品將移至未分組。',
        save: '保存',
        cancel: '取消',
        expand: '展開',
        collapse: '收摺',
        more_options: '更多選項'
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
        view_bookmark: 'Bookmarks',
        filter: 'Filter',
        search_no_results: 'No items found',
        copied: 'Copied',
        copy_name: 'Copy name',
        add_bookmark: 'Add Bookmark',
        remove_bookmark: 'Remove Bookmark',
        timed_nodes: 'Timed Nodes',
        select_map: 'Select Map',
        calculate_path: 'Calculate Path',
        optimal_path: 'Optimal Path',
        gathering_nodes: 'Gathering Nodes',
        unknown_location: 'Unknown Location',
        no_bookmarks: 'No pinned bookmarks',
        timed_legend_bookmarks: 'Timed/Legendary Bookmarks',
        regular_bookmarks: 'Regular Gathering Bookmarks',
        unknown_item: 'Unknown Item',
        gatherable_tag: 'Gatherable',
        recipe_product_tag: 'Crafted',
        amount_needed: 'Amount needed: ',
        bookmarked_status: 'Pinned',
        recipe_parsing_title: 'Recipe Analysis: ',
        recipe_description: 'Base materials needed to craft this item. Gatherable items are marked in green.',
        recipe_parsing_failed: 'Failed to parse recipe',
        collectible_tag: 'Collectible',
        custom_delivery_tag: 'Custom Delivery',
        collection_only_tag: 'Collectible Only',
        aetherial_reduction_tag: 'Reduction',
        collectibles_header: 'Collectible Gathering',
        hidden_tag: 'Hidden',
        alarm_settings: 'Alarm & Macro',
        alarm_enable: 'Enable Browser Notifications',
        alarm_sound: 'Enable Sound Alerts',
        alarm_lead_time: 'Lead Time (Real Minutes)',
        alarm_sound_type: 'Alert Sound',
        alarm_sound_type_1: 'Chime',
        alarm_sound_type_2: 'Triple Beep',
        alarm_sound_type_3: 'Alarm Bell',
        alarm_test_notification: 'Test Notification',
        alarm_test_sound: 'Test Sound',
        alarm_macro_time_mode: 'Macro Time Format',
        alarm_macro_time_mode_et: 'Eorzea Time (ET)',
        alarm_macro_time_mode_lt: 'Local Time (LT)',
        alarm_macro_repeat: 'Macro Repeat (Hourly)',
        alarm_macro_gen: 'In-Game /alarm Macro Generator',
        alarm_copy_macro: 'Copy Macro',
        alarm_browser_permission_denied: 'Notifications blocked. Please enable in browser settings.',
        alarm_sound_blocked_warning: 'Sound playback is blocked by the browser. Interact with the page and make sure site audio permission is enabled.',
        alarm_sound_unavailable_warning: 'Sound file or audio output is unavailable. Please make sure se.1.mp3 ~ se.16.mp3 exist under public/audio/alarms.',
        alarm_notification_title: 'FFXIV Gathering Alarm',
        alarm_notification_body: '{item} is now spawning! ET {time}',
        alarm_notification_body_lead: '{item} spawning in {minutes} min (ET {time})',
        alarm_test_notification_body: 'This is a test notification.',
        alarm_sound_builtin_group: 'Built-in Sounds',
        alarm_sound_mp3_group: 'MP3 Sound Files',
        alarm_macro_all_groups: 'All Groups',

        group_add: 'Add Group',
        group_rename: 'Rename',
        group_delete: 'Delete',
        group_unnamed: '(Unnamed Group)',
        group_default_prefix: 'Group ',
        group_overview: 'Group Overview',
        group_empty: 'This group does not contain any bookmarks yet.',
        group_count_status: 'Groups: {current}/{max}',
        group_limit_reached: 'You can create up to 5 groups.',
        group_empty_bookmarks_hint: 'There are no bookmarked items right now, but your groups are kept above.',
        ungrouped: '[Ungrouped]',
        group_move_item: 'Move to group',
        bookmark_alarm_status: 'Alarm Tracking: {tracked}/{total}',
        bookmark_alarm_track_all: 'Track Timed in Group',
        bookmark_alarm_clear_all: 'Clear Group Tracking',
        confirm_delete_group: 'Delete this group? Items will be moved to ungrouped.',
        save: 'Save',
        cancel: 'Cancel',
        expand: 'Expand',
        collapse: 'Collapse',
        more_options: 'More Options'
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
        view_bookmark: 'ブックマーク',
        filter: 'フィルタ',
        search_no_results: 'アイテムが見つかりません',
        copied: 'コピーしました',
        copy_name: '名前をコピー',
        add_bookmark: 'ブックマーク追加',
        remove_bookmark: 'ブックマーク解除',
        timed_nodes: '限時ノード',
        select_map: 'マップを選択',
        calculate_path: 'ルート計算',
        optimal_path: '最適ルート',
        gathering_nodes: '採集ポイント',
        unknown_location: '未知の場所',
        no_bookmarks: 'ブックマークされていません',
        timed_legend_bookmarks: '未知/伝説 ブックマーク',
        regular_bookmarks: '通常採集 ブックマーク',
        unknown_item: '不明なアイテム',
        gatherable_tag: '採集可能',
        recipe_product_tag: '製作物',
        amount_needed: '必要数: ',
        bookmarked_status: 'ブックマーク済み',
        recipe_parsing_title: 'レシピ解析: ',
        recipe_description: 'このアイテムを製作するための基本素材のリストです。緑色でマークされたアイテムは採集可能です。',
        recipe_parsing_failed: 'レシピの解析に失敗しました',
        collectible_tag: 'コレクティブル',
        custom_delivery_tag: 'カスタムデリバリー',
        collection_only_tag: 'コレクション用',
        aetherial_reduction_tag: '精選',
        collectibles_header: 'コレクティブル採集',
        hidden_tag: '隠し',
        alarm_settings: 'アラーム＆マクロ',
        alarm_enable: 'ブラウザ通知を有効にする',
        alarm_sound: '効果音を有効にする',
        alarm_lead_time: '事前通知（リアル分数）',
        alarm_sound_type: '効果音の種類',
        alarm_sound_type_1: 'チャイム (Chime)',
        alarm_sound_type_2: 'トリプルビープ (Triple Beep)',
        alarm_sound_type_3: 'アラーム (Alarm)',
        alarm_test_notification: '通知テスト',
        alarm_test_sound: '効果音テスト',
        alarm_macro_time_mode: 'マクロの時間形式',
        alarm_macro_time_mode_et: 'エオルゼア時間 (ET)',
        alarm_macro_time_mode_lt: 'ローカル時間 (LT)',
        alarm_macro_repeat: 'マクロ 繰り返し (毎分/毎時)',
        alarm_macro_gen: 'ゲーム内 /alarm マクロ生成',
        alarm_copy_macro: 'マクロをコピー',
        alarm_browser_permission_denied: '通知がブロックされています。ブラウザの設定を変更してください。',
        alarm_sound_blocked_warning: 'ブラウザにより効果音の再生がブロックされました。ページ操作後に、サイトの音声権限を確認してください。',
        alarm_sound_unavailable_warning: '効果音ファイルまたは音声出力が利用できません。public/audio/alarms に se.1.mp3 ~ se.16.mp3 があるか確認してください。',
        alarm_notification_title: 'FFXIV 採集アラーム',
        alarm_notification_body: '{item} が出現しました！ET {time}',
        alarm_notification_body_lead: '{item} が {minutes} 分後に出現します (ET {time})',
        alarm_test_notification_body: 'これはテスト通知です。',
        alarm_sound_builtin_group: '内蔵サウンド',
        alarm_sound_mp3_group: 'MP3 サウンドファイル',
        alarm_macro_all_groups: '全グループ',

        group_add: 'グループを追加',
        group_rename: '名前を変更',
        group_delete: '削除',
        group_unnamed: '(名前なしグループ)',
        group_default_prefix: 'グループ',
        group_overview: 'グループ一覧',
        group_empty: 'このグループにはまだブックマークがありません。',
        group_count_status: 'グループ数：{current}/{max}',
        group_limit_reached: '作成できるグループは最大 5 個です。',
        group_empty_bookmarks_hint: 'ブックマーク項目はまだありませんが、作成したグループは上に保持されています。',
        ungrouped: '[グループ化されていない]',
        group_move_item: 'グループへ移動',
        bookmark_alarm_status: 'アラーム追跡：{tracked}/{total}',
        bookmark_alarm_track_all: 'このグループの限時を追跡',
        bookmark_alarm_clear_all: 'このグループの追跡を解除',
        confirm_delete_group: 'このグループを削除していいですか？アイテムはグループ化されていない場所に移動されます。',
        save: '保存',
        cancel: 'キャンセル',
        expand: '展開',
        collapse: '隐す',
        more_options: 'その他のオプション'
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
        view_bookmark: '书签',
        filter: '过滤',
        search_no_results: '找不到符合的物品',
        copied: '已复制',
        copy_name: '复制名称',
        add_bookmark: '加入书签',
        remove_bookmark: '移除书签',
        timed_nodes: '限时点',
        select_map: '选择地图',
        calculate_path: '计算路径',
        optimal_path: '最佳路径',
        gathering_nodes: '采集点',
        unknown_location: '未知区域',
        no_bookmarks: '目前没有钉选的书签',
        timed_legend_bookmarks: '限时/传说 书签',
        regular_bookmarks: '常规采集 书签',
        unknown_item: '未知物品',
        gatherable_tag: '可采集',
        recipe_product_tag: '配方产物',
        amount_needed: '需要数量: ',
        bookmarked_status: '已钉选',
        recipe_parsing_title: '配方解析：',
        recipe_description: '制作此物品所需的最底层材料清单。绿色标示的为可采集项目。',
        recipe_parsing_failed: '解析配方失败',

        collectible_tag: '收藏物',
        custom_delivery_tag: '老主顾',
        collection_only_tag: '收藏用',
        aetherial_reduction_tag: '精选',
        collectibles_header: '收藏品采集',
        hidden_tag: '隐藏',

        alarm_settings: '闹钟与宏',
        alarm_enable: '启用浏览器闹钟通知',
        alarm_sound: '启用音效提示',
        alarm_lead_time: '提前通知 (现实分钟)',
        alarm_sound_type: '提示音效',
        alarm_sound_type_1: '和弦声 (Chime)',
        alarm_sound_type_2: '三连音 (Triple Beep)',
        alarm_sound_type_3: '警报声 (Alarm)',
        alarm_test_notification: '测试通知',
        alarm_test_sound: '测试音效',
        alarm_macro_time_mode: '宏时间格式',
        alarm_macro_time_mode_et: '艾欧泽亚时间 (ET)',
        alarm_macro_time_mode_lt: '本地时间 (LT)',
        alarm_macro_repeat: '宏重复提醒 (循环)',
        alarm_macro_gen: '游戏内 /alarm 宏生成',
        alarm_copy_macro: '复制宏',
        alarm_browser_permission_denied: '浏览器通知已被拦截，请在浏览器设置中解除拦截',
        alarm_sound_blocked_warning: '音效播放被浏览器拦截。请先与页面交互，并确认网站音频权限已开启。',
        alarm_sound_unavailable_warning: '找不到音效文件或音频设备不可用，请确认 public/audio/alarms 下已有 se.1.mp3 ~ se.16.mp3。',
        alarm_notification_title: '采集闹钟',
        alarm_notification_body: '{item} 正在出现！ET {time}',
        alarm_notification_body_lead: '{item} 将在 {minutes} 分钟后出现 (ET {time})',
        alarm_test_notification_body: '这是一则测试通知。',
        alarm_sound_builtin_group: '内置音效',
        alarm_sound_mp3_group: 'MP3 音效文件',
        alarm_macro_all_groups: '全部群组',

        group_add: '新增群组',
        group_rename: '重命名',
        group_delete: '删除',
        group_unnamed: '(未命名群组)',
        group_default_prefix: '群组',
        group_overview: '群组总览',
        group_empty: '此群组目前没有书签。',
        group_count_status: '群组数量：{current}/{max}',
        group_limit_reached: '最多只能建立 5 个群组。',
        group_empty_bookmarks_hint: '目前没有书签项目，但你建立的群组会保留在上方。',
        ungrouped: '[未分组]',
        group_move_item: '移动到群组',
        bookmark_alarm_status: '闹钟追踪：{tracked}/{total}',
        bookmark_alarm_track_all: '追踪本群组限时',
        bookmark_alarm_clear_all: '清除本群组追踪',
        confirm_delete_group: '确定删除此群组吗？其中的物品将移至未分组。',
        save: '保存',
        cancel: '取消',
        expand: '展开',
        collapse: '收起',
        more_options: '更多选项'
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