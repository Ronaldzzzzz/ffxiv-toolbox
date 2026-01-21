# FFXIV Toolbox

這是我為 Final Fantasy XIV (FF14) 玩家製作的 Web 輔助工具集。

Here are some web-based tools created to assist FFXIV Warriors of Light.

## 🛠️ 工具列表 / Tools List

### 1. [最短路徑影像辨識系統 (Aether Current Path Finder)](./AetherCurrent/README.md)
*   **功能**：自動辨識地圖截圖上的風脈泉位置，並計算最短採集路徑。
*   **特點**：使用 OpenCV.js 進行影像辨識，支援剪貼簿貼上圖片，視覺化路徑繪製。
*   **Description**: Analyzes map screenshots to find Aether Currents and calculates the shortest route using computer vision.

### 2. [採集手冊 (Gathering Guide)](./GatheringLog/README.md)
*   **功能**：採礦工 (Miner) 與園藝工 (Botanist) 的採集圖鑑檢核表。
*   **特點**：支援多語言 (繁/英/日)、進度自動儲存、等級分組與地區篩選。
*   **狀態**：目前進行系統升級與維護中 (Maintenance Mode)。
*   **資料來源 (Credits)**：Data based on and modified from the [Gathering Log Guide](https://www.reddit.com/r/ffxiv/comments/194oftg/gathering_log_guide/) on Reddit.
*   **Description**: A checklist for tracking Gathering Log progress with multi-language support and region filtering.

### 3. [冒險者分隊計算器 (Squadron Calculator)](./Squadron/index.html)
*   **功能**：冒險者分隊 (Adventurer Squadron) 任務成功率計算。
*   **特點**：自動計算各種隊伍組合的屬性，協助玩家達成 100% 成功率。
*   **Description**: Calculates mission success rates for Adventurer Squadrons and helps optimize team composition.

## 🚀 如何使用 / How to Use

這些是純靜態網頁工具，你可以：
1.  直接用瀏覽器開啟對應資料夾中的 `index.html`。
2.  或是將其部署到 GitHub Pages 等靜態網頁託管服務。

These are static web tools. You can simply open the `index.html` in each folder with your browser, or host them on services like GitHub Pages.