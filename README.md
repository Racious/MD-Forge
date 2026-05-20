<p align="center">
  <img src="https://raw.githubusercontent.com/Racious/MD-Forge/main/src-tauri/icons/128x128.png" width="96" alt="MD Forge" style="border-radius: 22px" />
</p>

<h1 align="center">MD Forge</h1>

<p align="center">
  <strong>本地優先的桌面 Markdown 編輯器。</strong><br/>
  即時預覽、多分頁、Mermaid 圖表，所有資料僅存於本機。
</p>

<p align="center">
  <a href="https://github.com/Racious/MD-Forge/releases">
    <img src="https://img.shields.io/github/v/release/Racious/MD-Forge?style=flat-square&color=4f8ef7" alt="Release" />
  </a>
  <img src="https://img.shields.io/badge/platform-Windows-lightgrey?style=flat-square" alt="Platform" />
  <img src="https://img.shields.io/badge/built%20with-Tauri%202-orange?style=flat-square" alt="Tauri 2" />
  <img src="https://img.shields.io/badge/Vue-3-42b883?style=flat-square" alt="Vue 3" />
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/Racious/MD-Forge/main/docs/assets/screenshot-editor.jpg" width="720" alt="MD Forge Editor" />
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/Racious/MD-Forge/main/docs/assets/screenshot-home.jpg" width="480" alt="MD Forge Home Screen" />
</p>

---

## 功能特色

### 編輯器
- **CodeMirror 6** 語法高亮、行號、Tab 縮排、完整 Undo/Redo
- 支援 `.md` / `.markdown` / `.mdx` 格式
- 未儲存狀態即時追蹤（分頁顯示 `●`）

### 多分頁管理
- 同時開啟多個文件，自由切換分頁
- 相同路徑不重複開啟，自動聚焦既有分頁
- 關閉最後一個分頁後自動回到首頁

### 預覽
- **即時 Markdown 渲染**（markdown-it）
- 支援表格、task list、程式碼區塊、引用、刪除線
- **Mermaid 圖表**：流程圖、循序圖、甘特圖等
- 本機圖片（相對路徑）與 Data URI 圖片正確顯示

### 開啟方式
- **雙擊開檔**：安裝後可設為 `.md` 預設程式
- **拖曳開檔**：將 `.md` 檔案拖入視窗直接開啟新分頁
- **單一實例**：應用程式已開啟時，雙擊第二個檔案會開新分頁而非新視窗

### 導覽
- TOC 側邊欄從標題自動生成，點擊捲動至對應段落
- 支援中文、日文等 Unicode 標題錨點
- 側邊欄過長時可上下捲動，標題列保持固定

### 介面
- 三種檢視模式：**Edit** / **Split** / **Preview**
- 亮色 / 暗色主題，設定持久化
- 字體大小、自動換行設定
- 最近開啟檔案清單（最多 20 筆）
- 工具列顯示版本號，首頁顯示最後 Build 時間

### 匯出
- 匯出為獨立 **HTML** 檔案（含完整樣式，可直接開啟）

---

## 下載與安裝（Windows）

前往 [Releases](https://github.com/Racious/MD-Forge/releases) 下載最新版本：

| 檔案 | 說明 |
|------|------|
| `MD.Forge_x.x.x_x64-setup.exe` | 安裝版，建議一般使用者使用 |
| `MD.Forge_x.x.x_x64_en-US.msi` | MSI 安裝包，適合靜默安裝或企業部署 |
| `MD.Forge.exe` | 免安裝版，下載後直接執行 |

<details>
<summary><strong>Windows SmartScreen 警告</strong></summary>

由於目前尚未完成程式碼簽署，首次執行可能出現 SmartScreen 警告。
點擊 **「其他資訊」→「仍要執行」** 即可繼續。

</details>

---

## 鍵盤快捷鍵

| 動作 | 快捷鍵 |
|------|--------|
| 開啟檔案 | `Ctrl + O` |
| 儲存 | `Ctrl + S` |
| 另存新檔 | `Ctrl + Shift + S` |
| 切換檢視模式 | 工具列按鈕 |

---

## 技術棧

| 層級 | 技術 |
|------|------|
| 桌面框架 | [Tauri 2](https://tauri.app/) + Rust |
| 前端框架 | [Vue 3](https://vuejs.org/) + TypeScript |
| 狀態管理 | [Pinia](https://pinia.vuejs.org/) |
| 編輯器 | [CodeMirror 6](https://codemirror.net/) |
| Markdown 渲染 | [markdown-it](https://markdown-it.github.io/) |
| 圖表渲染 | [Mermaid 11](https://mermaid.js.org/) |
| 建構工具 | [Vite 6](https://vite.dev/) |
| 測試 | [Vitest](https://vitest.dev/) |

---

## 開發環境

### 需求

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/)（含 cargo）
- [Tauri 2 prerequisites](https://tauri.app/start/prerequisites/)

### 啟動

```bash
# 安裝依賴
npm install

# 開發模式（啟動 Tauri 視窗）
npm run start

# 執行單元測試
npm run test

# 打包桌面應用程式
npm run package
```

打包產物位於 `src-tauri/target/release/bundle/`。

---

## 更新紀錄

### v0.3.0

- 支援 Markdown 中嵌入 HTML（`<p>`、`<img>`、`<details>` 等）
- 新增 DOMPurify 過濾層，移除危險標籤與事件屬性，確保安全渲染
- 新增 GitHub Pages 展示頁（[racious.github.io/MD-Forge](https://racious.github.io/MD-Forge/)）

### v0.2.1

- 修正視窗啟動時短暫出現於左上角後才移至中央的問題
- 加入視窗狀態記憶，重新開啟時還原上次關閉前的位置與大小
- 若上次關閉時為最大化，重開後直接以最大化顯示

### v0.2.0

- 新增拖曳開檔（`.md` / `.markdown` / `.mdx`）
- 新增單一實例模式，雙擊第二個檔案開新分頁而非新視窗
- 修正本機圖片（相對路徑）無法顯示的問題
- 修正 Data URI Base64 圖片因 URL 編碼損壞的問題
- Mermaid 安全層級調整為 `strict`

### v0.1.0

- 多分頁編輯、即時預覽、Mermaid 圖表
- 版本資訊顯示（工具列 + 首頁）
- 雙擊開檔（`.md` 檔案關聯）
- 側邊欄捲動改善

---

<p align="center">
  <sub>Built with ♥ by <a href="https://github.com/Racious">Racious</a></sub>
</p>
