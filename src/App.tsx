import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Archive, CalendarClock, Download, Filter, Plus, Upload } from "lucide-react";
import { opportunities as seedOpportunities, projects, sources as seedSources, submissionAssets, submissionHistory } from "./data/seed";
import type { ActivityLog, AppSettings, Decision, ImportJobSummary, Opportunity, PipelineStatus, ProjectProfile, SourceRegistry, SubmissionAsset, SubmissionHistory, VerificationEvent, VerificationStatus, WeeklyTask } from "./types";
import { applyImport, exportCsv, parseCsv, planApplyImport, previewImport, type RowIssue } from "./lib/importer";
import { recalculateOpportunity, totalScore } from "./lib/scoring";
import { formatSydney, daysUntil } from "./lib/time";
import { dueReminders } from "./lib/reminders";
import { staleWarning, verificationStatuses } from "./lib/verification";
import { changeSubmissionStatusApi, verifyOpportunityApi } from "./lib/api";
import "./styles.css";

const storeKey = "award-factory-state-v1";
const pipelineStatuses: PipelineStatus[] = ["Watch", "Open", "Registered", "Building", "Ready for QA", "Submitted", "Finalist", "Won", "Lost", "Closed", "Paused", "Skip"];
const decisions: Decision[] = ["URGENT", "PRIORITY", "VERIFY", "APPLY IF CAPACITY", "WATCH", "SKIP", "CLOSED", "PAUSED"];
const navLabels: Record<string, string> = {
  Dashboard: "總覽",
  "Weekly Plan": "本週行動",
  Radar: "機會雷達",
  Detail: "機會詳情",
  Projects: "專案資料",
  "Submission Kit": "投稿材料",
  Pipeline: "投稿流程",
  Sources: "來源規則",
  Settings: "設定"
};
const decisionLabels: Record<Decision, string> = {
  URGENT: "緊急",
  PRIORITY: "優先",
  VERIFY: "需查證",
  "APPLY IF CAPACITY": "有空再報",
  WATCH: "觀察",
  SKIP: "跳過",
  CLOSED: "已關閉",
  PAUSED: "暫停"
};
const pipelineLabels: Record<PipelineStatus, string> = {
  Watch: "觀察",
  Open: "開放",
  Registered: "已註冊",
  Building: "準備材料",
  "Ready for QA": "可檢查",
  Submitted: "已提交",
  Finalist: "入圍",
  Won: "得獎",
  Lost: "未入選",
  Closed: "已關閉",
  Paused: "暫停",
  Skip: "跳過"
};
const eligibilityLabels: Record<Opportunity["eligibilityStatus"], string> = {
  Eligible: "符合資格",
  Unclear: "資格不明",
  "Likely ineligible": "可能不符合"
};
const verificationLabels: Record<VerificationStatus, string> = {
  Unverified: "未查證",
  Verified: "已查證",
  "Needs Review": "待查證",
  Stale: "需重新查證",
  Invalid: "無效",
  Closed: "已關閉"
};
const scoreLabels: Record<string, string> = {
  projectFit: "專案匹配",
  prizeBusinessValue: "獎項/商業價值",
  winability: "勝算",
  reusability: "可重用程度",
  deadlineReadiness: "期限準備度",
  exposure: "曝光價值",
  ease: "申請難度"
};
const assetLabels: Record<string, string> = {
  "one-line tagline": "一句話標語",
  "50-word summary": "50 字簡介",
  "150-word summary": "150 字簡介",
  "long narrative": "長版故事",
  "demo URL": "Demo 連結",
  "60-second video": "60 秒影片",
  "3-minute video": "3 分鐘影片",
  "pitch deck": "Pitch Deck",
  "architecture diagram": "架構圖",
  "GitHub repository": "GitHub 倉庫",
  README: "README",
  screenshots: "截圖",
  "traction sheet": "成長/用戶證據表",
  "customer evidence": "客戶證據",
  "revenue evidence": "收入證據",
  "privacy and AI safety statement": "隱私與 AI 安全聲明",
  "founder biography": "創辦人簡介",
  "company documents": "公司文件",
  "logos and brand assets": "Logo / 品牌素材"
};

interface AppState {
  opportunities: Opportunity[];
  sources: SourceRegistry[];
  importJobs: ImportJobSummary[];
  statusHistory: SubmissionHistory[];
  verificationEvents: VerificationEvent[];
  activityLogs: ActivityLog[];
  dismissedReminderIds: string[];
  submissionAssets: SubmissionAsset[];
  completedWeeklyTaskIds: string[];
  settings: AppSettings;
}

function loadState(): AppState {
  const stored = localStorage.getItem(storeKey);
  if (!stored) return initialState();
  try {
    return { ...initialState(), ...JSON.parse(stored) } as AppState;
  } catch {
    return initialState();
  }
}

function initialState(): AppState {
  const now = new Date().toISOString();
  return {
    opportunities: seedOpportunities,
    sources: seedSources,
    importJobs: [],
    statusHistory: submissionHistory,
    verificationEvents: [],
    activityLogs: [],
    dismissedReminderIds: [],
    submissionAssets,
    completedWeeklyTaskIds: [],
    settings: {
      id: "settings-local",
      userId: "local-user",
      timezone: "Australia/Sydney",
      staleThresholdDays: 30,
      urgentStaleThresholdDays: 7,
      urgentDeadlineWindowDays: 30,
      reminderOffsets: ["T-30 days", "T-14 days", "T-7 days", "T-3 days", "T-24 hours"],
      emailNotificationsEnabled: false,
      createdAt: now,
      updatedAt: now
    }
  };
}

function saveState(state: AppState) {
  localStorage.setItem(storeKey, JSON.stringify(state));
}

export default function App() {
  const [state, setState] = useState<AppState>(loadState);
  const [active, setActive] = useState("Dashboard");
  const [selectedId, setSelectedId] = useState(state.opportunities[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [decisionFilter, setDecisionFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [importText, setImportText] = useState("");
  const [lastImportPreview, setLastImportPreview] = useState("");
  const [lastImportErrors, setLastImportErrors] = useState<RowIssue[]>([]);

  const setOpportunities = (opportunities: Opportunity[]) => {
    const next = { ...state, opportunities };
    setState(next);
    saveState(next);
  };

  const setSources = (sources: SourceRegistry[]) => {
    const next = { ...state, sources };
    setState(next);
    saveState(next);
  };

  const filtered = useMemo(() => state.opportunities.filter((opportunity) => {
    const haystack = `${opportunity.name} ${opportunity.organizer} ${opportunity.type} ${opportunity.countryRegion}`.toLowerCase();
    return haystack.includes(query.toLowerCase())
      && (decisionFilter === "All" || opportunity.decision === decisionFilter)
      && (statusFilter === "All" || opportunity.pipelineStatus === statusFilter)
      && !opportunity.archived;
  }).sort((a, b) => (daysUntil(a.normalizedDeadlineUtc) ?? 9999) - (daysUntil(b.normalizedDeadlineUtc) ?? 9999)), [state.opportunities, query, decisionFilter, statusFilter]);

  const selected = state.opportunities.find((opportunity) => opportunity.id === selectedId) ?? filtered[0];

  const dashboard = useMemo(() => {
    const open = state.opportunities.filter((item) => ["Open", "Registered", "Building", "Ready for QA"].includes(item.pipelineStatus));
    return {
      total: state.opportunities.length,
      open: open.length,
      urgent: state.opportunities.filter((item) => item.decision === "URGENT").length,
      priority: state.opportunities.filter((item) => item.decision === "PRIORITY").length,
      submitted: state.opportunities.filter((item) => item.pipelineStatus === "Submitted").length,
      finalist: state.opportunities.filter((item) => item.pipelineStatus === "Finalist").length,
      won: state.opportunities.filter((item) => item.pipelineStatus === "Won").length,
      reminders: dueReminders(state.opportunities, new Set(state.dismissedReminderIds)).slice(0, 5)
    };
  }, [state.opportunities, state.dismissedReminderIds]);

  const weeklyTasks = useMemo(() => buildWeeklyTasks(state.opportunities, state.submissionAssets, state.completedWeeklyTaskIds), [state.opportunities, state.submissionAssets, state.completedWeeklyTaskIds]);

  function updateOpportunity(id: string, patch: Partial<Opportunity>, note = "Updated in app") {
    const current = state.opportunities.find((opportunity) => opportunity.id === id);
    if (!current) return;
    const updated = recalculateOpportunity({ ...current, ...patch });
    const statusChanged = patch.pipelineStatus !== undefined && patch.pipelineStatus !== current.pipelineStatus;
    const statusEntry = statusChanged ? changeSubmissionStatusApi({ opportunity: current, newStatus: updated.pipelineStatus, changedBy: "Codex/User", note }).history : undefined;
    const activity: ActivityLog = {
      id: `act-${Date.now()}`,
      actor: "Codex/User",
      action: statusChanged ? "pipeline_status_changed" : "opportunity_updated",
      entityType: "opportunity",
      entityId: id,
      createdAt: new Date().toISOString(),
      metadata: statusChanged ? { previousStatus: current.pipelineStatus, newStatus: updated.pipelineStatus } : { fields: Object.keys(patch) }
    };
    const next = {
      ...state,
      opportunities: state.opportunities.map((opportunity) => opportunity.id === id ? updated : opportunity),
      statusHistory: statusEntry ? [statusEntry, ...state.statusHistory] : state.statusHistory,
      activityLogs: [activity, ...state.activityLogs].slice(0, 100)
    };
    setState(next);
    saveState(next);
  }

  function verifyOpportunity(id: string, result: VerificationStatus, notes: string) {
    const current = state.opportunities.find((opportunity) => opportunity.id === id);
    if (!current) return;
    const now = new Date().toISOString();
    const verified = verifyOpportunityApi({ opportunity: current, newStatus: result, verifiedBy: "Codex/User", verifiedAt: new Date(now), changedFields: ["verificationStatus", "verifiedAt", "sourceUrl"], note: notes });
    const verification = verified.event;
    const updated = recalculateOpportunity(verified.opportunity);
    const activity: ActivityLog = { id: `act-${Date.now()}`, actor: "Codex/User", action: "verification_recorded", entityType: "opportunity", entityId: id, createdAt: now, metadata: { previousStatus: verification.previousStatus, newStatus: verification.newStatus, changedFields: verification.changedFields } };
    const next = {
      ...state,
      opportunities: state.opportunities.map((opportunity) => opportunity.id === id ? updated : opportunity),
      verificationEvents: [verification, ...state.verificationEvents],
      activityLogs: [activity, ...state.activityLogs].slice(0, 100)
    };
    setState(next);
    saveState(next);
  }

  function dismissReminder(id: string) {
    const next = { ...state, dismissedReminderIds: [...new Set([...state.dismissedReminderIds, id])], activityLogs: [{ id: `act-${Date.now()}`, actor: "Codex/User", action: "reminder_dismissed", entityType: "reminder" as const, entityId: id, createdAt: new Date().toISOString() }, ...state.activityLogs].slice(0, 100) };
    setState(next);
    saveState(next);
  }

  function updateSubmissionAsset(id: string, patch: Partial<SubmissionAsset>) {
    const current = state.submissionAssets.find((asset) => asset.id === id);
    if (!current) return;
    const updated = { ...current, ...patch };
    const activity: ActivityLog = {
      id: `act-${Date.now()}`,
      actor: "Codex/User",
      action: "submission_asset_updated",
      entityType: "submission_asset",
      entityId: id,
      createdAt: new Date().toISOString(),
      metadata: { fields: Object.keys(patch), projectId: current.projectId, assetName: current.name }
    };
    const next = {
      ...state,
      submissionAssets: state.submissionAssets.map((asset) => asset.id === id ? updated : asset),
      activityLogs: [activity, ...state.activityLogs].slice(0, 100)
    };
    setState(next);
    saveState(next);
  }

  function completeWeeklyTask(id: string) {
    const activity: ActivityLog = { id: `act-${Date.now()}`, actor: "Codex/User", action: "weekly_task_completed", entityType: "weekly_task", entityId: id, createdAt: new Date().toISOString() };
    const next = { ...state, completedWeeklyTaskIds: [...new Set([...state.completedWeeklyTaskIds, id])], activityLogs: [activity, ...state.activityLogs].slice(0, 100) };
    setState(next);
    saveState(next);
  }

  function updateSettings(patch: Partial<AppSettings>) {
    const next = { ...state, settings: { ...state.settings, ...patch, updatedAt: new Date().toISOString() } };
    setState(next);
    saveState(next);
  }

  function addOpportunity() {
    const draft = recalculateOpportunity({
      ...seedOpportunities[0],
      id: `manual-${Date.now()}`,
      name: "新的競賽機會",
      sourceUrl: "https://example.com/new-opportunity",
      verificationStatus: "Needs Review",
      eligibilityStatus: "Unclear",
      decision: "WATCH",
      notes: "人工新增草稿；報名前請先查證來源與資格。"
    });
    setOpportunities([draft, ...state.opportunities]);
    setSelectedId(draft.id);
    setActive("Detail");
  }

  function runImport(apply: boolean) {
    const rows = parseCsv(importText);
    runRowsImport(rows, "browser-paste.csv", apply);
  }

  async function importFile(file: File, apply: boolean) {
    const buffer = await file.arrayBuffer();
    let rows: unknown[];
    if (file.name.toLowerCase().endsWith(".csv")) {
      rows = parseCsv(new TextDecoder().decode(buffer));
    } else {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(buffer);
      const sheetName = workbook.SheetNames.find((name) => /opportunity radar|opportunit|競賽|機會/i.test(name)) ?? workbook.SheetNames[0];
      rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
    }
    runRowsImport(rows, file.name, apply);
  }

  function runRowsImport(rows: unknown[], sourceFileName: string, apply: boolean) {
    const planned = apply ? planApplyImport(rows, state.opportunities, sourceFileName) : previewImport(rows, state.opportunities, sourceFileName);
    const opportunities = apply ? applyImport(planned, state.opportunities) : state.opportunities;
    const activity: ActivityLog = {
      id: `act-${Date.now()}`,
      actor: "Codex/User",
      action: apply ? "import_applied" : "import_previewed",
      entityType: "import",
      entityId: planned.job.id,
      createdAt: new Date().toISOString(),
      metadata: { sourceFileName, create: planned.job.createCount, update: planned.job.updateCount, skip: planned.job.skipCount, error: planned.job.errorCount }
    };
    const next = {
      ...state,
      opportunities,
      importJobs: [planned.job, ...(state.importJobs ?? [])].slice(0, 20),
      activityLogs: [activity, ...state.activityLogs].slice(0, 100)
    };
    setState(next);
    saveState(next);
    setLastImportErrors(planned.errors);
    setLastImportPreview(`新增：${planned.job.createCount} · 更新：${planned.job.updateCount} · 跳過：${planned.job.skipCount} · 錯誤：${planned.job.errorCount}`);
  }

  return (
    <main>
      <aside>
        <div className="brand">Award Factory<span>國際競賽工廠</span></div>
        {["Dashboard", "Weekly Plan", "Radar", "Detail", "Projects", "Submission Kit", "Pipeline", "Sources", "Settings"].map((item) => (
          <button className={active === item ? "nav active" : "nav"} key={item} onClick={() => setActive(item)}>{navLabels[item]}</button>
        ))}
        <div className="guardrail">只做人工提交 · Sydney 時間 · 來源優先查證</div>
      </aside>

      <section className="content">
        {active === "Dashboard" && (
          <>
            <Header title="總覽 Dashboard" subtitle="推薦行動、期限、狀態和專案覆蓋，一眼看清下一步。" />
            <div className="metrics">
              <Metric label="全部機會" value={dashboard.total} />
              <Metric label="開放中" value={dashboard.open} />
              <Metric label="緊急" value={dashboard.urgent} />
              <Metric label="優先" value={dashboard.priority} />
              <Metric label="已提交" value={dashboard.submitted} />
              <Metric label="入圍" value={dashboard.finalist} />
              <Metric label="得獎" value={dashboard.won} />
            </div>
            <div className="grid two">
              <Panel title="優先推薦行動">
                {state.opportunities.slice().sort((a, b) => totalScore(b.score) - totalScore(a.score)).slice(0, 5).map((item) => (
                  <OpportunityRow key={item.id} opportunity={item} onClick={() => { setSelectedId(item.id); setActive("Detail"); }} />
                ))}
              </Panel>
              <Panel title="本週執行清單">
                {weeklyTasks.slice(0, 3).map((task) => <TaskCard key={task.id} task={task} onOpen={() => { setSelectedId(task.opportunityId); setActive("Detail"); }} onDone={() => completeWeeklyTask(task.id)} />)}
              </Panel>
              <Panel title="近期截止與提醒">
                {dashboard.reminders.map((reminder) => {
                  const item = state.opportunities.find((opportunity) => opportunity.id === reminder.opportunityId);
                  return <div className="line" key={reminder.id}><CalendarClock size={16} /> {reminder.label} · {item?.name}<button className="mini" onClick={() => dismissReminder(reminder.id)}>完成</button></div>;
                })}
                {state.opportunities.filter((item) => item.normalizedDeadlineUtc).slice(0, 6).map((item) => (
                  <div className="line" key={item.id}><CalendarClock size={16} /> {item.name}<span>{formatSydney(item.normalizedDeadlineUtc)}</span></div>
                ))}
              </Panel>
              <Panel title="機會決策分布">
                {decisions.map((decision) => <Bar key={decision} label={decisionText(decision)} count={state.opportunities.filter((item) => item.decision === decision).length} total={state.opportunities.length} />)}
              </Panel>
              <Panel title="專案覆蓋">
                {projects.map((project) => <Bar key={project.id} label={project.name} count={state.opportunities.filter((item) => item.matchedProjectId === project.id).length} total={Math.max(1, state.opportunities.length)} />)}
              </Panel>
            </div>
          </>
        )}

        {active === "Weekly Plan" && (
          <>
            <Header title="本週執行清單" subtitle="根據決策、截止日、狀態與投稿材料缺口，自動整理本週可執行任務。" />
            <div className="task-list">
              {weeklyTasks.map((task) => <TaskCard key={task.id} task={task} onOpen={() => { setSelectedId(task.opportunityId); setActive("Detail"); }} onDone={() => completeWeeklyTask(task.id)} />)}
              {weeklyTasks.length === 0 && <Panel title="目前沒有本週任務"><p>目前沒有需要本週處理的機會。可以先匯入 seed workbook，或把更多機會設為「開放 / 需查證 / 優先」。</p></Panel>}
            </div>
          </>
        )}

        {active === "Radar" && (
          <>
            <Header title="機會雷達 Opportunity Radar" subtitle="搜尋、篩選、批次匯入、匯出與人工封存。" action={<button onClick={addOpportunity}><Plus size={16} />新增</button>} />
            <div className="toolbar">
              <input placeholder="搜尋競賽名稱 / 主辦方 / 類型 / 地區" value={query} onChange={(event) => setQuery(event.target.value)} />
              <select value={decisionFilter} onChange={(event) => setDecisionFilter(event.target.value)}><option value="All">全部決策</option>{decisions.map((item) => <option key={item} value={item}>{decisionText(item)}</option>)}</select>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="All">全部狀態</option>{pipelineStatuses.map((item) => <option key={item} value={item}>{pipelineText(item)}</option>)}</select>
              <button onClick={() => download("award-factory-export.csv", exportCsv(filtered))}><Download size={16} />匯出 CSV</button>
            </div>
            <table>
              <thead><tr><th>競賽 / 機會</th><th>類型</th><th>決策</th><th>流程狀態</th><th>匹配專案</th><th>Sydney 截止時間</th><th>分數</th><th /></tr></thead>
              <tbody>{filtered.map((item) => <tr key={item.id}>
                <td><button className="link" onClick={() => { setSelectedId(item.id); setActive("Detail"); }}>{item.name}</button><small>{item.organizer}</small></td>
                <td>{item.type}</td><td><Badge value={item.decision} /></td><td>{pipelineText(item.pipelineStatus)}</td>
                <td>{projectName(item.matchedProjectId)}</td><td>{formatSydney(item.normalizedDeadlineUtc)}</td><td>{totalScore(item.score)}</td>
                <td><button className="ghost" onClick={() => updateOpportunity(item.id, { archived: true })}><Archive size={16} /></button></td>
              </tr>)}</tbody>
            </table>
            <Panel title="CSV / Excel 匯入預覽">
              <p className="muted">貼上 CSV，或直接選取 `.xlsx/.csv`。匯入會先以 id 或 sourceUrl 去重，新增/更新/跳過/錯誤會留下紀錄。</p>
              <textarea value={importText} onChange={(event) => setImportText(event.target.value)} placeholder="name,organizer,type,sourceUrl&#10;Example Award,Org,Award,https://example.com/award" />
              <div className="toolbar">
                <button onClick={() => runImport(false)}><Filter size={16} />預覽貼上的 CSV</button>
                <button onClick={() => runImport(true)}><Upload size={16} />套用貼上的 CSV</button>
                <label className="file-button">預覽檔案<input type="file" accept=".xlsx,.csv" onChange={(event) => event.target.files?.[0] && importFile(event.target.files[0], false)} /></label>
                <label className="file-button apply">套用檔案<input type="file" accept=".xlsx,.csv" onChange={(event) => event.target.files?.[0] && importFile(event.target.files[0], true)} /></label>
              </div>
              {lastImportPreview && <p className="notice">{lastImportPreview}</p>}
              {lastImportErrors.length > 0 && <div className="error-list">
                {lastImportErrors.slice(0, 8).map((error) => <div key={`${error.rowNumber}-${error.fieldName}-${error.reason}`} className="error-row">第 {error.rowNumber} 列 · {error.fieldName ?? "整列"} · {String(error.rawValue ?? "")} · {error.reason}</div>)}
              </div>}
              <div className="import-history">
                {(state.importJobs ?? []).map((job) => <div className="line" key={job.id}>{job.mode === "preview" ? "預覽" : "套用"} · {job.sourceFileName}<span>新增 {job.createCount} / 更新 {job.updateCount} / 跳過 {job.skipCount} / 錯誤 {job.errorCount}</span></div>)}
              </div>
            </Panel>
          </>
        )}

        {active === "Detail" && selected && <Detail opportunity={selected} projects={projects} statusHistory={state.statusHistory} verificationEvents={state.verificationEvents} activityLogs={state.activityLogs} onVerify={(result, notes) => verifyOpportunity(selected.id, result, notes)} onChange={(patch, note) => updateOpportunity(selected.id, patch, note)} />}
        {active === "Projects" && <ProjectsView projects={projects} />}
        {active === "Submission Kit" && <AssetsView projects={projects} assets={state.submissionAssets} onChange={updateSubmissionAsset} />}
        {active === "Pipeline" && <PipelineView opportunities={state.opportunities} onChange={updateOpportunity} />}
        {active === "Sources" && <SourcesView sources={state.sources} onChange={setSources} />}
        {active === "Settings" && <SettingsView settings={state.settings} onChange={updateSettings} />}
      </section>
    </main>
  );
}

function Header({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return <header><div><h1>{title}</h1><p>{subtitle}</p></div>{action}</header>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="panel"><h2>{title}</h2>{children}</section>;
}

function OpportunityRow({ opportunity, onClick }: { opportunity: Opportunity; onClick: () => void }) {
  return <button className="op-row" onClick={onClick}><span>{opportunity.name}<small>{projectName(opportunity.matchedProjectId)} · {formatSydney(opportunity.normalizedDeadlineUtc)}</small></span><Badge value={opportunity.decision} /></button>;
}

function TaskCard({ task, onOpen, onDone }: { task: WeeklyTask; onOpen: () => void; onDone: () => void }) {
  return <div className="task-card">
    <div>
      <strong>{task.title}</strong>
      <p>{task.reason}</p>
      <small>{task.dueLabel} · 優先分 {task.priority}</small>
      {task.missingAssets.length > 0 && <div className="missing-assets">缺少材料：{task.missingAssets.map(assetText).join(", ")}</div>}
    </div>
    <div className="task-actions">
      <button onClick={onOpen}>打開</button>
      <button className="ghost-button" onClick={onDone}>完成</button>
    </div>
  </div>;
}

function Bar({ label, count, total }: { label: string; count: number; total: number }) {
  return <div className="bar"><span>{label}</span><div><i style={{ width: `${Math.round((count / Math.max(1, total)) * 100)}%` }} /></div><b>{count}</b></div>;
}

function Badge({ value }: { value: string }) {
  return <span className={`badge ${value.toLowerCase().replaceAll(" ", "-")}`}>{badgeText(value)}</span>;
}

function Detail({ opportunity, projects, statusHistory, verificationEvents, activityLogs, onVerify, onChange }: { opportunity: Opportunity; projects: ProjectProfile[]; statusHistory: SubmissionHistory[]; verificationEvents: VerificationEvent[]; activityLogs: ActivityLog[]; onVerify: (result: VerificationStatus, notes: string) => void; onChange: (patch: Partial<Opportunity>, note?: string) => void }) {
  const localHistory = statusHistory.filter((item) => item.opportunityId === opportunity.id);
  const localVerifications = verificationEvents.filter((item) => item.opportunityId === opportunity.id);
  const localActivity = activityLogs.filter((item) => item.entityId === opportunity.id);
  const [verificationNote, setVerificationNote] = useState("");
  const staleMessage = staleWarning(opportunity);
  return <>
    <Header title="機會詳情 Opportunity Detail" subtitle="來源、資格、分數、決策、狀態與查證記錄。" />
    {staleMessage && <div className="warning stale-warning">{staleMessage}</div>}
    <div className="detail">
      <Panel title={opportunity.name}>
        <Field label="名稱" value={opportunity.name} onChange={(name) => onChange({ name })} />
        <Field label="主辦方" value={opportunity.organizer} onChange={(organizer) => onChange({ organizer })} />
        <Field label="競賽/機會類型" value={opportunity.type} onChange={(type) => onChange({ type })} />
        <Field label="官方來源 URL" value={opportunity.sourceUrl} onChange={(sourceUrl) => onChange({ sourceUrl })} />
        <Field label="參賽資格" value={opportunity.eligibility} onChange={(eligibility) => onChange({ eligibility })} />
        <Field label="國家/實體限制" value={opportunity.countryRegion} onChange={(countryRegion) => onChange({ countryRegion })} />
        <Field label="公司階段限制" value={opportunity.companyStageRestrictions} onChange={(companyStageRestrictions) => onChange({ companyStageRestrictions })} />
        <NumberField label="獎金/資金" value={opportunity.prizeFunding} onChange={(prizeFunding) => onChange({ prizeFunding })} />
        <NumberField label="報名費" value={opportunity.entryFee} onChange={(entryFee) => onChange({ entryFee })} />
        <Field label="下一個關鍵截止 UTC" value={opportunity.nextCriticalDeadlineUtc ?? ""} onChange={(nextCriticalDeadlineUtc) => onChange({ nextCriticalDeadlineUtc: nextCriticalDeadlineUtc || null })} />
        <Field label="最終截止 UTC" value={opportunity.finalDeadlineUtc ?? ""} onChange={(finalDeadlineUtc) => onChange({ finalDeadlineUtc: finalDeadlineUtc || null })} />
        <Field label="原始截止描述" value={opportunity.rawDeadlineText} onChange={(rawDeadlineText) => onChange({ rawDeadlineText })} />
        <Field label="UTC 截止時間" value={opportunity.normalizedDeadlineUtc ?? ""} onChange={(normalizedDeadlineUtc) => onChange({ normalizedDeadlineUtc: normalizedDeadlineUtc || null })} />
        <p className="muted">Australia/Sydney 顯示時間：{formatSydney(opportunity.normalizedDeadlineUtc)}</p>
        <Field label="所需交付物" value={opportunity.requiredDeliverables} onChange={(requiredDeliverables) => onChange({ requiredDeliverables })} textarea />
        <Field label="所需技術" value={opportunity.requiredTechnology} onChange={(requiredTechnology) => onChange({ requiredTechnology })} />
        <Field label="IP / licence 注意事項" value={opportunity.ipLicenseNotes} onChange={(ipLicenseNotes) => onChange({ ipLicenseNotes })} textarea />
        <Field label="旅行/到場要求" value={opportunity.travelRequirements} onChange={(travelRequirements) => onChange({ travelRequirements })} />
        <Field label="下一步行動" value={opportunity.nextAction} onChange={(nextAction) => onChange({ nextAction })} />
        <Field label="負責人" value={opportunity.owner} onChange={(owner) => onChange({ owner })} />
        <Field label="內部備註" value={opportunity.notes} onChange={(notes) => onChange({ notes })} textarea />
      </Panel>
      <Panel title="決策與分數">
        <div className="decision-card"><Badge value={opportunity.decision} /><strong>{totalScore(opportunity.score)}/100</strong><span>{formatSydney(opportunity.normalizedDeadlineUtc)}</span></div>
        <p className="muted">自動決策：{decisionText(opportunity.decision)}</p>
        <label>匹配專案<select value={opportunity.matchedProjectId} onChange={(event) => onChange({ matchedProjectId: event.target.value })}>{projects.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select></label>
        <label>投稿流程狀態<select value={opportunity.pipelineStatus} onChange={(event) => onChange({ pipelineStatus: event.target.value as PipelineStatus }, "Pipeline status changed from detail page")}>{pipelineStatuses.map((status) => <option key={status} value={status}>{pipelineText(status)}</option>)}</select></label>
        <label>資格狀態<select value={opportunity.eligibilityStatus} onChange={(event) => onChange({ eligibilityStatus: event.target.value as Opportunity["eligibilityStatus"] })}>{Object.entries(eligibilityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {Object.entries(opportunity.score).map(([key, value]) => <label key={key}>{scoreLabels[key] ?? key}<input type="number" value={value} onChange={(event) => onChange({ score: { ...opportunity.score, [key]: Number(event.target.value) } })} /></label>)}
        <label>人工覆寫決策<select value={opportunity.decisionOverride ?? ""} onChange={(event) => onChange({ decisionOverride: event.target.value ? event.target.value as Decision : undefined })}><option value="">自動計算</option>{decisions.map((decision) => <option key={decision} value={decision}>{decisionText(decision)}</option>)}</select></label>
        <Field label="覆寫原因" value={opportunity.overrideReason ?? ""} onChange={(overrideReason) => onChange({ overrideReason })} />
      </Panel>
    </div>
    <Panel title="查證歷史與流程活動">
      <p>查證狀態：{verificationText(opportunity.verificationStatus)} · 查證時間：{opportunity.verifiedAt ? formatSydney(opportunity.verifiedAt) : "尚未查證"} · 時區：{opportunity.timezone}</p>
      <Field label="查證備註" value={verificationNote} onChange={setVerificationNote} />
      <div className="toolbar">
        {verificationStatuses.map((status) => <button key={status} onClick={() => { onVerify(status, verificationNote || `Verification changed to ${status}`); setVerificationNote(""); }}>{verificationText(status)}</button>)}
      </div>
      <h2>狀態歷史</h2>
      {localHistory.map((item) => <div className="line" key={item.id}>{pipelineText(item.previousStatus)} → {pipelineText(item.newStatus)} · {item.changedBy} · {item.note}<span>{formatSydney(item.changedAt)}</span></div>)}
      <h2>查證紀錄</h2>
      {localVerifications.map((item) => <div className="line" key={item.id}>{verificationText(item.previousStatus)} → {verificationText(item.newStatus)} · {item.verifiedBy} · {item.changedFields.join(", ")} · {item.note}<span>{formatSydney(item.verifiedAt)}</span></div>)}
      <h2>活動紀錄</h2>
      {localActivity.map((item) => <div className="line" key={item.id}>{item.action}<span>{formatSydney(item.createdAt)}</span></div>)}
    </Panel>
  </>;
}

function Field({ label, value, onChange, textarea }: { label: string; value: string; onChange: (value: string) => void; textarea?: boolean }) {
  return <label>{label}{textarea ? <textarea value={value} onChange={(event) => onChange(event.target.value)} /> : <input value={value} onChange={(event) => onChange(event.target.value)} />}</label>;
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label>{label}<input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function ProjectsView({ projects }: { projects: ProjectProfile[] }) {
  return <><Header title="專案資料 Project Profiles" subtitle="四個既有專案的競賽定位、證據與缺口。" /><div className="grid two">{projects.map((project) => <Panel key={project.id} title={project.name}><p>{project.positioning}</p><p><b>階段：</b> {project.stage}</p><p><b>問題：</b> {project.problem}</p><p><b>解法：</b> {project.solution}</p><p><b>證據：</b> {project.evidence}</p><p className="warning">缺少證據：{project.missingEvidence}</p></Panel>)}</div></>;
}

function AssetsView({ projects, assets, onChange }: { projects: ProjectProfile[]; assets: SubmissionAsset[]; onChange: (id: string, patch: Partial<SubmissionAsset>) => void }) {
  const statusOptions: SubmissionAsset["status"][] = ["待確認", "未開始", "草稿", "可提交", "需更新"];
  return <>
    <Header title="投稿材料 Submission Kit" subtitle="追蹤並編輯每個專案的投稿材料狀態、連結與備註。" />
    {projects.map((project) => {
      const projectAssets = assets.filter((asset) => asset.projectId === project.id);
      const ready = projectAssets.filter((asset) => asset.status === "可提交").length;
      return <Panel key={project.id} title={`${project.name} · ${ready}/${projectAssets.length} 可提交`}>
        <div className="asset-editor-grid">
          {projectAssets.map((asset) => <div className="asset-editor" key={asset.id}>
            <div className="asset-editor-head">
              <strong>{assetText(asset.name)}</strong>
              <Badge value={asset.status} />
            </div>
            <label>狀態<select value={asset.status} onChange={(event) => onChange(asset.id, { status: event.target.value as SubmissionAsset["status"] })}>{statusOptions.map((status) => <option key={status}>{status}</option>)}</select></label>
            <label>材料連結<input value={asset.url ?? ""} placeholder="Demo、簡報、文件、截圖或證據 URL" onChange={(event) => onChange(asset.id, { url: event.target.value })} /></label>
            <label>備註<textarea value={asset.note ?? ""} placeholder="缺什麼？誰負責？下一步是什麼？" onChange={(event) => onChange(asset.id, { note: event.target.value })} /></label>
          </div>)}
        </div>
      </Panel>;
    })}
  </>;
}

function PipelineView({ opportunities, onChange }: { opportunities: Opportunity[]; onChange: (id: string, patch: Partial<Opportunity>, note?: string) => void }) {
  return <><Header title="投稿流程 Submission Pipeline" subtitle="點卡片會推進到下一個狀態，並保存前後狀態與備註。" /><div className="columns">{pipelineStatuses.map((status, index) => <section className="column" key={status}><h2>{pipelineText(status)}</h2>{opportunities.filter((item) => item.pipelineStatus === status).map((item) => {
    const nextStatus = pipelineStatuses[Math.min(index + 1, pipelineStatuses.length - 1)];
    return <button className="card" key={item.id} onClick={() => onChange(item.id, { pipelineStatus: nextStatus }, `Pipeline moved from ${status} to ${nextStatus}`)}>{item.name}<small>點擊 → {pipelineText(nextStatus)}</small><Badge value={item.decision} /></button>;
  })}</section>)}</div></>;
}

function SourcesView({ sources, onChange }: { sources: SourceRegistry[]; onChange: (sources: SourceRegistry[]) => void }) {
  return <><Header title="來源規則 Sources" subtitle="來源清單：掃描頻率、最後檢查、啟用狀態與備註。" />{sources.map((source) => <Panel key={source.id} title={source.name}><p>{source.url}</p><p>{source.type} · {source.scanFrequency} · {source.active ? "啟用" : "停用"}</p><textarea value={source.notes} onChange={(event) => onChange(sources.map((item) => item.id === source.id ? { ...item, notes: event.target.value } : item))} /></Panel>)}</>;
}

function SettingsView({ settings, onChange }: { settings: AppSettings; onChange: (patch: Partial<AppSettings>) => void }) {
  const offsets = ["T-30 days", "T-14 days", "T-7 days", "T-3 days", "T-24 hours"];
  const toggleOffset = (offset: string) => {
    const next = settings.reminderOffsets.includes(offset)
      ? settings.reminderOffsets.filter((item) => item !== offset)
      : [...settings.reminderOffsets, offset];
    onChange({ reminderOffsets: next });
  };
  return <><Header title="設定 Settings" subtitle="控制時區、查證過期門檻、提醒節點與 Email 通知。這些設定之後會存進 PostgreSQL。" />
    <Panel title="時間與查證過期">
      <Field label="顯示時區" value={settings.timezone} onChange={(timezone) => onChange({ timezone })} />
      <NumberField label="一般資料幾天後視為過期" value={settings.staleThresholdDays} onChange={(staleThresholdDays) => onChange({ staleThresholdDays: Math.max(1, staleThresholdDays) })} />
      <NumberField label="30 天內截止的機會，幾天後視為過期" value={settings.urgentStaleThresholdDays} onChange={(urgentStaleThresholdDays) => onChange({ urgentStaleThresholdDays: Math.max(1, urgentStaleThresholdDays) })} />
      <NumberField label="緊急截止窗口（天）" value={settings.urgentDeadlineWindowDays} onChange={(urgentDeadlineWindowDays) => onChange({ urgentDeadlineWindowDays: Math.max(1, urgentDeadlineWindowDays) })} />
    </Panel>
    <Panel title="截止提醒">
      <p className="muted">提醒由伺服器/排程程序產生，避免重複提醒；儲存 UTC，畫面用 Australia/Sydney 顯示。</p>
      <div className="toolbar">
        {offsets.map((offset) => <label className="check" key={offset}><input type="checkbox" checked={settings.reminderOffsets.includes(offset)} onChange={() => toggleOffset(offset)} />{offset}</label>)}
      </div>
    </Panel>
    <Panel title="Email 通知">
      <label className="check"><input type="checkbox" checked={settings.emailNotificationsEnabled} onChange={(event) => onChange({ emailNotificationsEnabled: event.target.checked })} />啟用 Email digest（目前可用 disabled / console provider；未設定付費 provider 也能正常使用）</label>
    </Panel>
  </>;
}

function projectName(id: string): string {
  return projects.find((project) => project.id === id)?.name ?? id;
}

function decisionText(value: Decision): string {
  return `${decisionLabels[value]} (${value})`;
}

function pipelineText(value: PipelineStatus): string {
  return `${pipelineLabels[value]} (${value})`;
}

function verificationText(value: VerificationStatus): string {
  return `${verificationLabels[value]} (${value})`;
}

function assetText(value: string): string {
  return assetLabels[value] ?? value;
}

function badgeText(value: string): string {
  if (value in decisionLabels) return decisionText(value as Decision);
  if (value in pipelineLabels) return pipelineText(value as PipelineStatus);
  if (value in verificationLabels) return verificationText(value as VerificationStatus);
  return value;
}

function download(filename: string, text: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function buildWeeklyTasks(opportunities: Opportunity[], assets: SubmissionAsset[], completedIds: string[]): WeeklyTask[] {
  const completed = new Set(completedIds);
  return opportunities
    .filter((opportunity) => !opportunity.archived && !["SKIP", "CLOSED", "PAUSED"].includes(opportunity.decision))
    .map((opportunity) => {
      const projectAssets = assets.filter((asset) => asset.projectId === opportunity.matchedProjectId);
      const missingAssets = projectAssets
        .filter((asset) => ["待確認", "未開始", "需更新"].includes(asset.status))
        .slice(0, 4)
        .map((asset) => asset.name);
      const days = daysUntil(opportunity.normalizedDeadlineUtc);
      const deadlinePriority = days === null ? 0 : Math.max(0, 30 - days);
      const decisionPriority = opportunity.decision === "URGENT" ? 60 : opportunity.decision === "PRIORITY" ? 45 : opportunity.decision === "VERIFY" ? 35 : 20;
      const verificationPenalty = opportunity.verificationStatus === "Verified" ? 0 : 10;
      const priority = decisionPriority + deadlinePriority + verificationPenalty + Math.min(10, missingAssets.length * 2);
      const action = opportunity.decision === "VERIFY"
        ? "先查證資格、官方來源、獎項、IP 條款與截止日，再投入投稿製作。"
        : missingAssets.length > 0
          ? `準備或更新投稿材料：${missingAssets.map(assetText).join(", ")}。`
          : opportunity.nextAction;
      return {
        id: `weekly-${opportunity.id}-${opportunity.decision}-${opportunity.pipelineStatus}`,
        opportunityId: opportunity.id,
        projectId: opportunity.matchedProjectId,
        title: opportunity.name,
        reason: `${decisionText(opportunity.decision)} · ${projectName(opportunity.matchedProjectId)} · ${pipelineText(opportunity.pipelineStatus)}`,
        action,
        priority,
        dueLabel: days === null ? "持續開放 / 待確認" : `剩 ${days} 天 · ${formatSydney(opportunity.normalizedDeadlineUtc)}`,
        missingAssets
      };
    })
    .filter((task) => !completed.has(task.id))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 12);
}
