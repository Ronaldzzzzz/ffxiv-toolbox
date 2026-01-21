# FFXIV Gathering Guide (採集手冊)

這是一個專為 Final Fantasy XIV 採集職業（採礦工 Miner / 園藝工 Botanist）設計的 Web 版採集圖鑑檢核表。協助玩家追蹤採集手冊的完成進度。

## ✨ 主要功能

*   **職業切換**：快速切換 **Miner (採礦)** 與 **Botanist (園藝)** 的採集列表。
*   **進度追蹤**：
    *   點擊物品或核取方塊即可標記為「已完成」。
    *   進度自動儲存於瀏覽器 (LocalStorage)，關閉網頁後資料不會遺失。
    *   顯示各等級區間與整體的完成百分比。
*   **智慧篩選與導航**：
    *   **等級分組**：物品依等級區間 (如 Lv 1-5, Lv 50-55) 分組顯示。
    *   **地區篩選**：側邊欄提供地區 (Region) 篩選功能，僅顯示特定區域的採集物。
    *   **快速跳轉**：頂部提供等級標籤，可快速捲動至特定等級區塊。
*   **多語言支援**：
    *   支援 **繁體中文**、**English**、**日本語** 三種語言介面與物品名稱。
*   **RWD 設計**：基於 Tailwind CSS，支援桌面與行動裝置瀏覽。

## 🚀 如何使用

1.  開啟 `index.html`。
2.  選擇職業 (Miner 或 Botanist)。
3.  (可選) 切換偏好的語言 (右上角)。
4.  瀏覽列表，勾選你已經採集過的物品。
5.  使用側邊欄篩選特定地圖，查看該區缺少的圖鑑。

## 🛠️ 技術細節

*   **核心技術**：HTML5, Vanilla JavaScript
*   **樣式框架**：[Tailwind CSS](https://tailwindcss.com/) (CDN)
*   **資料來源**：
    *   `items.json`: 採集物品資料庫。
    *   `locales.json`: 介面與物品名稱的翻譯資料。
*   **資料儲存**：`localStorage` (Key: `ff14_gathering_progress_v2`)

## 📢 致謝 / Credits

本工具的靈感來源，以及核心資料 (Data) 皆擷取並修改自 Reddit 社群討論串：
**[Gathering Log Guide](https://www.reddit.com/r/ffxiv/comments/194oftg/gathering_log_guide/)**。

Data extraction, modification, and inspiration for this project are credited to the [Gathering Log Guide](https://www.reddit.com/r/ffxiv/comments/194oftg/gathering_log_guide/) thread on Reddit. Special thanks to the community for the comprehensive data compilation.

## 📁 檔案結構

*   `index.html`: 主應用程式。
*   `items.json`: 物品資料 (包含 ID, 等級, 地區, 時間等資訊)。
*   `locales.json`: 介面與物品名稱的翻譯資料。
*   `script.py`: (開發用) 用於處理或生成資料的 Python 腳本。