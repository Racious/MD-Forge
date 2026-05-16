# MD Forge

> 本地優先的桌面 Markdown 編輯器，基於 Tauri 2 + Vue 3 + TypeScript 構建。

---

## 功能特色

**編輯器**
- CodeMirror 6 語法高亮、行號、Tab 縮排、歷史記錄
- 支援 `.md` / `.markdown` / `.mdx` 檔案格式
- 未儲存狀態追蹤（標題列顯示 `●`）
- 鍵盤快捷鍵：`Ctrl+O` 開啟、`Ctrl+S` 儲存、`Ctrl+Shift+S` 另存新檔

**預覽**
- 即時 Markdown 渲染（markdown-it）
- 支援表格、task list、程式碼區塊、引用、刪除線
- Mermaid 圖表渲染：流程圖、循序圖、甘特圖
- 本機圖片正確顯示（支援相對路徑）

**導覽**
- TOC 側邊欄自動從標題生成，點擊捲動至對應位置
- 支援中文、日文等 Unicode 標題錨點

**介面**
- 三種檢視模式：Edit / Split / Preview
- 亮色 / 暗色主題切換，設定持久化
- 字體大小、自動換行設定
- 最近開啟檔案清單（最多 20 筆）

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

