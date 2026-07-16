# AF-003｜Qwen Cloud Global AI Hackathon 投稿材料包

狀態：本週優先準備  
來源：`award-factory-seed.xlsx` / Opportunity Radar  
官方頁：https://qwencloud-hackathon.devpost.com/  
截止時間：2026-07-20 21:00 UTC，約 Australia/Sydney 2026-07-21 07:00  
目前決策：VERIFY  
總分：82 / 100  
匹配專案：Handyman AI  

## 先做結論

建議投稿方向：Autopilot Agent。

作品主題：

> Handyman Quote-to-Follow-up Autopilot  
> 幫澳洲本地維修/服務商，把客戶詢問自動整理成工作需求、報價草稿、後續提醒與成交跟進。

這個方向比重新做一個全新產品更穩，因為可以沿用現有 Handyman AI 的業務場景與 UI 思路，只補一條可展示的 agent workflow。

## 必須先查證

不要跳過這一步。現在 eligibility status 仍是 `Unclear`。

投稿前先在官方頁確認：

- 澳洲參賽者是否可參加。
- 是否要求使用指定 Qwen / Alibaba Cloud 服務。
- repo 是否必須 public open-source。
- demo video 是否必須公開。
- IP / licence 條款是否允許未來商業化。
- 是否有 team size、公司/個人身份限制。

如果以上任一條不符合，就不要硬投，改把材料轉用到 OpenAI Build Week 或 Pinch 50K。

## 作品定位

一句話：

> An AI autopilot that turns messy customer repair enquiries into structured job scopes, quote drafts, follow-up tasks, and owner-ready actions for local service businesses.

中文理解：

> 一個給本地服務商的小型 AI 營運助理：客戶一問，它就幫你整理需求、估報價草稿、安排下一步，讓老闆不用一直手動回覆和追單。

## Demo 流程

用一個具體情境展示，不要做太散。

情境：

客戶傳來一段模糊訊息：

> Hi, my bathroom tap is leaking and I may also need a cabinet fixed. Can someone come this week? I am in Parramatta.

Agent 應完成：

1. 判斷這是 plumbing + handyman mixed request。
2. 提出缺失資訊：
   - 漏水嚴重程度
   - 是否有照片
   - 可到場時間
   - 是否需要 emergency call-out
3. 生成 job scope。
4. 生成 quote draft。
5. 生成給客戶的回覆草稿。
6. 建立 follow-up task。
7. 顯示 owner dashboard：下一步該做什麼。

## 3 分鐘 Demo 影片腳本

### 0:00–0:20 Problem

Local service businesses lose time and leads because customer enquiries arrive as messy messages. Owners need to ask follow-up questions, prepare quote drafts, track jobs, and remember who to follow up with.

### 0:20–0:45 Product

This is Handyman Quote-to-Follow-up Autopilot. It uses an AI agent to turn a raw customer message into a structured job brief, quote draft, customer reply, and follow-up task.

### 0:45–1:30 Agent workflow

Show the input message. Then show the agent extracting:

- service type
- suburb
- urgency
- missing information
- possible deliverables
- next best action

### 1:30–2:10 Business output

Show:

- quote draft
- customer reply
- internal owner note
- follow-up reminder

### 2:10–2:40 Technical explanation

Explain that the app uses an agent workflow with:

- structured extraction
- task planning
- draft generation
- persistent job memory
- cloud-backed execution/logging if required by competition rules

Keep this part simple. Judges should understand the value before the architecture.

### 2:40–3:00 Closing

Handyman businesses do not need another dashboard. They need an assistant that helps them respond faster, quote better, and follow up reliably. This project shows how an AI agent can become that operator.

## Submission description draft

Title:

Handyman Quote-to-Follow-up Autopilot

Short description:

An AI agent workflow for local service businesses that converts messy customer enquiries into structured job scopes, quote drafts, customer replies, and follow-up tasks.

Longer description:

Local handyman and home-service businesses often receive customer requests through SMS, email, phone notes, and social messages. These messages are rarely complete. Owners need to clarify details, prepare quotes, remember follow-ups, and avoid losing jobs.

Handyman Quote-to-Follow-up Autopilot demonstrates an AI agent that acts as a lightweight operations assistant. Given a raw customer enquiry, it extracts the job type, urgency, location, missing information, and likely next action. It then generates a quote draft, a customer response, and an internal follow-up task.

The goal is not to replace the business owner. The goal is to reduce repetitive admin work so the owner can respond faster and make better decisions.

## Architecture note

Suggested simple architecture:

```text
Customer message
  -> Intake parser
  -> Service classifier
  -> Missing-info checker
  -> Quote draft generator
  -> Customer reply generator
  -> Follow-up task creator
  -> Owner dashboard
```

If the hackathon requires Qwen / Alibaba Cloud proof, add one visible integration point:

- Qwen model call for extraction and response generation.
- Alibaba Cloud storage/database/logging for job records.
- Public repo README section showing setup and architecture.

## Required assets checklist

Minimum pack:

- Public GitHub repo
- README with setup instructions
- Architecture diagram
- 3-minute demo video
- Working prototype or hosted demo
- Submission text
- Licence file
- Screenshot of main workflow

Recommended extra:

- Before/after customer message example
- One-page product explanation
- Short risk note: AI drafts require human approval before sending to customers

## This-week execution plan

### Day 1

- Verify official rules and eligibility.
- Confirm required Qwen / Alibaba Cloud usage.
- Freeze project scope: only one workflow, customer enquiry to follow-up.

### Day 2

- Build or polish demo flow.
- Prepare 2–3 sample customer messages.
- Make output cards: job scope, quote draft, reply, follow-up.

### Day 3

- Add README and architecture diagram.
- Record rough demo video.

### Day 4

- Polish submission copy.
- Re-record final 3-minute video.
- Final checklist and submit manually.

## Do not do

- Do not build a full CRM.
- Do not add payments, invoicing, or scheduling unless already working.
- Do not promise legally binding quotes.
- Do not auto-send messages to real customers.
- Do not overbuild the backend just for the demo.

## Acceptance standard for submission readiness

Ready to submit only when:

- Official eligibility confirmed.
- Demo runs end-to-end.
- Repo is public if required.
- README explains setup and architecture.
- 3-minute video clearly shows input -> agent reasoning -> business output.
- Human approval boundary is stated.

