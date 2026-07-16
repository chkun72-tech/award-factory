# Award Factory｜國際競賽工廠

## 專案目標

建立一個可運行、可測試、可持續迭代的競賽機會管理 Web Application，用來收集國際競賽/Grant/Accelerator/Open Call，追蹤來源、期限、資格、評分、配對專案、投稿素材與提醒。

## 當前階段

Phase 1：MVP 本地可運行版本。

## Scope

- Dashboard、Opportunity Radar、Opportunity Detail、Project Profiles、Submission Kit、Pipeline、Sources。
- 評分模型、決策規則、Sydney 時區顯示、提醒計算。
- CSV/Excel 匯入預覽與去重邏輯。
- SQL migration、seed data、測試、README、架構說明。
- 人工確認與人工提交；不自動替使用者提交外部表單。

## Out of Scope

- 不自動爬取大規模網站。
- 不自動接受競賽條款。
- 不自動提交外部競賽。
- 不啟用付費 API、郵件 provider 或真實登入服務，除非使用者批准。

## Agent 分工

- Codex：總控、實作、測試、最小修補、整合交付。
- ChatGPT：策略、風險、驗收標準。
- Claude：長文投稿材料與敘事整理。
- Gemini：圖片/影片素材與 Google 生態資料整理。
- Manus：大量競賽研究與來源清單擴充。

## 工作流程

1. 先完成可運行 MVP。
2. 每個 milestone 後跑 lint、typecheck、tests、build。
3. 新 opportunity 先進 Review / Verify，不直接視為 verified。
4. 所有 external submission 必須人工確認。

## 驗收標準

- 本地能啟動 Web Application。
- 能看到 seed opportunities/projects/sources。
- 能新增、編輯、篩選、排序、匯入預覽、匯出 CSV。
- 評分與決策規則有測試。
- build / lint / typecheck / tests 通過或有明確 blocker。

## 下一步

Phase 2：接 PostgreSQL/Supabase auth、真實 Excel seed workbook、email digest provider、少量合法 source adapters。
