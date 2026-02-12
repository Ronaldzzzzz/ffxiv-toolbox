# FFXIV Toolbox

這是為 Final Fantasy XIV (FF14) 光之戰士們製作的 Web 輔助工具箱。資料與數據版本主要以繁體中文版為主。

Here are some web-based tools created to assist FFXIV Warriors of Light. The data and version information are mainly based on the Traditional Chinese version.

## 🛠️ 工具列表 / Tools List

### 1. [採集手冊 (Gathering Log)](./src/features/gathering-log)

- **狀態 (Status)**: ✅ 重構完成，使用中
- **功能**: 提供多種視角，協助採礦工 (Miner) 與園藝工 (Botanist) 的採集圖鑑檢核表。
- **特點**:
  - React + TypeScript 架構
  - 支援多語言 (繁/英/日)
  - 現代化 UI (Tailwind CSS)
  - 進度自動儲存
- **Description**: A checklist for tracking Gathering Log progress.

### 2. [最短路徑影像辨識系統 (Aether Current Path Finder)](./public/AetherCurrent/index.html)

- **狀態 (Status)**: 🏛️ 舊版維護 (Legacy)
- **功能**: 自動辨識地圖截圖上的風脈泉位置，並計算最短採集路徑。
- **特點**: 使用 OpenCV.js 進行影像辨識，支援剪貼簿貼上圖片。
- **Description**: Analyzes map screenshots to find Aether Currents and calculates the shortest route using computer vision.

### 3. [冒險者分隊計算器 (Squadron Calculator)](./public/Squadron/index.html)

- **狀態 (Status)**: 🏛️ 舊版維護 (Legacy)
- **功能**: 冒險者分隊 (Adventurer Squadron) 任務成功率計算。
- **Description**: Calculates mission success rates for Adventurer Squadrons and helps optimize team composition.

### 4. and more...

## 💻 開發指南 / Development Guide

本專案使用 React + TypeScript + Vite 進行開發。
This project is built using React, TypeScript, and Vite.

### 前置需求 (Prerequisites)

- Node.js (LTS recommended)

### 安裝 (Installation)

```bash
# 安裝依賴 / Install dependencies
npm install
```

### 啟動開發伺服器 (Development)

```bash
# 啟動本地伺服器 / Start local dev server
npm run dev
```

### 部署至 GitHub Pages (Deployment)

```bash
# 部署 / Deploy
npm run deploy
```

### 專案結構 (Project Structure)

- `src/`: 現代化 React 原始碼 (Modern React source code)
  - `features/gathering-log`: 採集手冊相關代碼
- `public/`: 靜態資源與舊版工具 (Static assets and legacy tools)
  - `AetherCurrent/`: 風脈泉工具 (Legacy)
  - `Squadron/`: 冒險者分隊工具 (Legacy)
- `GatheringLog_backup/`: 舊版採集手冊備份 (Backup of legacy Gathering Log)

## 🤝 貢獻 / Contributing

歡迎提交 Pull Request 或 Issue 來協助改進此工具箱。
Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 授權 / License

MIT

## ⚠️ 免責聲明 / Disclaimer

本專案為玩家自製的非官方工具，與 SQUARE ENIX CO., LTD. 無關。
This is an unofficial fan-made tool and is not affiliated with SQUARE ENIX CO., LTD.
FINAL FANTASY XIV © 2010 - 2025 SQUARE ENIX CO., LTD. All Rights Reserved.
