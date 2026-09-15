# After Task Review（任務完成回顧）

完成一項有意義的任務後，依序確認以下項目：

本檔為通用回顧清單，不得以任務結果覆寫。本次回顧結果寫入 `.amagi/workflow-state.md`，完成後隨軌跡歸檔至 `.amagi/history/`。

## 1. 是否需要新的 skill？
已出現重複需求、方法已穩定，且既有 skill／文件不足以覆蓋時，才在 `.amagi/pending/` 建立 `skill-<任務類型>.md`。單次經驗或尚未定型的做法先不固化；沒有新知時略過。

## 2. 是否需要更新既有 skill？
若使用了某個 skill，並發現更好的做法：
- 補充步驟
- 補充常見錯誤
- 補充範例

## 3. 是否有值得保存的記憶？
專案脈絡、技術決策、踩坑解法，有新增且值得保存的內容時，依 `.amagi/pending/AGENT_INSTRUCTIONS.md` 的記憶投遞指引建立 `memory-<主題>.md`，不重複保存既有記錄。

## 4. Commit 建議
若有程式碼或文件變更：
- 摘要變更的檔案
- 提出 commit message
- **詢問老爺是否 commit（確認前不得自行 commit）**
