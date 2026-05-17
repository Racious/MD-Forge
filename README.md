# MD Forge

> 本地優先的桌面 Markdown 編輯器，基於 Tauri 2 + Vue 3 + TypeScript 構建。

**目前版本：v0.2.0**

---

## 更新紀錄

### v0.2.0

**拖曳開檔**
- 將 `.md` / `.markdown` / `.mdx` 檔案直接拖入視窗即可在新分頁開啟

**單一實例模式**
- 應用程式已開啟時，雙擊第二個 `.md` 檔案會在現有視窗的新分頁開啟，而非重複啟動新視窗

**圖片顯示修正**
- 本機圖片（相對路徑）現可正確顯示（啟用 Tauri asset protocol）
- Data URI 圖片（Base64）不再因 URL 編碼損壞而無法顯示

**資安強化**
- Mermaid 安全層級從 `loose` 調整為 `strict`，防止圖表內嵌任意 HTML

---

### v0.1.0

**多分頁編輯**
- 同時開啟多個 Markdown 文件，以分頁列切換
- 開啟相同檔案時自動切換至已存在的分頁，不重複開啟
- 關閉最後一個分頁後自動回到首頁
- 關閉含未儲存變更的分頁時顯示確認提示

**版本資訊顯示**
- 工具列左上角顯示目前版本號
- 首頁顯示版本號與最後 Build 時間

**雙擊開檔**
- 安裝後設為預設程式，雙擊 `.md` 檔案可直接啟動並載入

**側邊欄改善**
- TOC 與最近檔案清單過長時支援上下捲動
- 標題列固定於頂端不隨內容捲動

**初始功能（基礎版）**
- CodeMirror 6 編輯器、即時 Markdown 預覽
- Mermaid 圖表、本機圖片、TOC 導覽
- 亮色 / 暗色主題、檔案匯出為 HTML

---

## 功能特色

**編輯器**
- CodeMirror 6 語法高亮、行號、Tab 縮排、歷史記錄
- 支援 `.md` / `.markdown` / `.mdx` 檔案格式
- 多分頁管理，同時開啟多個文件
- 未儲存狀態追蹤（分頁與標題列顯示 `●`）
- 鍵盤快捷鍵：`Ctrl+O` 開啟、`Ctrl+S` 儲存、`Ctrl+Shift+S` 另存新檔

**預覽**
- 即時 Markdown 渲染（markdown-it）
- 支援表格、task list、程式碼區塊、引用、刪除線
- Mermaid 圖表渲染：流程圖、循序圖、甘特圖
- 本機圖片正確顯示（支援相對路徑）

**導覽**
- TOC 側邊欄自動從標題生成，點擊捲動至對應位置
- 支援中文、日文等 Unicode 標題錨點
- 側邊欄內容過長時可上下捲動

**介面**
- 三種檢視模式：Edit / Split / Preview
- 亮色 / 暗色主題切換，設定持久化
- 字體大小、自動換行設定
- 最近開啟檔案清單（最多 20 筆）
- 工具列顯示版本號，首頁顯示 Build 時間

**匯出**
- 匯出為獨立 HTML 檔案（含完整樣式）

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

## 開發環境需求

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/)（含 cargo）
- [Tauri CLI prerequisites](https://tauri.app/start/prerequisites/)

---

## 安裝與執行

```bash
# 安裝依賴
npm install

# 開發模式（啟動 Tauri 視窗）
npm run start

# 執行單元測試
npm run test

# 打包桌面應用程式（產生安裝檔 + 執行檔）
npm run package
```

打包產物位於 `src-tauri/target/release/bundle/`。

---

## 專案結構

```
MD Forge/
├── src/
│   ├── components/       # Vue 元件
│   ├── pages/            # 頁面（HomePage、EditorPage、SettingsPage）
│   ├── stores/           # Pinia stores（editor、settings、file）
│   ├── services/         # 業務邏輯（markdown 渲染、檔案存取、匯出）
│   ├── domain/           # TypeScript 型別定義
│   └── styles/           # 全域樣式與主題
├── src-tauri/
│   ├── src/lib.rs        # Rust 後端命令
│   └── tauri.conf.json   # Tauri 應用程式設定
└── test-sample.md        # 功能測試文件
```
