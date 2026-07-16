import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { applyImport, planApplyImport } from "../src/lib/importer";
import { InMemoryRepository, type RepositoryContext } from "../src/lib/repository";
import { applyManualDecisionOverride, recalculateAutomaticDecisionPreservingOverride } from "../src/lib/decision";
import { generateServerReminders } from "../src/lib/serverReminders";
import { exportBackup, previewRestoreBackup } from "../src/lib/backup";
import type { Opportunity } from "../src/types";

const workbookPath = path.resolve(process.cwd(), getCliFile() ?? process.env.AWARD_FACTORY_XLSX ?? "award-factory-seed.xlsx");
const sourceSheet = "Opportunity Radar";
const assertions: { name: string; expected: unknown; actual: unknown; status: "PASS" | "FAIL" }[] = [];
const userA: RepositoryContext = { userId: "user-a" };
const userB: RepositoryContext = { userId: "user-b" };

if (!fs.existsSync(workbookPath)) {
  console.error(JSON.stringify({ status: "blocked", reason: "Workbook not found", workbookPath }, null, 2));
  process.exit(2);
}

const repository = new InMemoryRepository();
const rows = sheetRows(workbookPath, sourceSheet);

const imported = planApplyImport(rows, [], path.basename(workbookPath), new Date(Date.UTC(2026, 6, 14, 0, 0, 0)));
let userAOpps: Opportunity[] = applyImport(imported, []);
await repository.upsertOpportunities(userA, userAOpps);

assertEqual("empty isolated DB imported 23 opportunities for user A", 23, (await repository.listOpportunities(userA)).length);
assertEqual("user B cannot read user A opportunities", 0, (await repository.listOpportunities(userB)).length);

const af001Before = await repository.getOpportunity(userA, "AF-001");
if (!af001Before) throw new Error("AF-001 missing after import");
const edited = { ...af001Before, notes: "production-persistence-acceptance-edit" };
await repository.updateOpportunity(userA, edited, af001Before.version);
const statusResult = await repository.changeSubmissionStatus(userA, { id: "AF-001", newStatus: "Building", changedBy: "user-a", note: "Acceptance status transaction" });
assertEqual("edit/history committed together status", "Building", statusResult.opportunity.pipelineStatus);
assertEqual("edit/history committed together history count", 1, (await repository.listSubmissionHistory(userA)).length);
assertEqual("edit/history committed together activity count", 1, (await repository.listActivityLogs(userA)).length);

const beforeRollback = await repository.getOpportunity(userA, "AF-001");
try {
  await repository.changeSubmissionStatus(userA, { id: "AF-001", newStatus: "Submitted", changedBy: "user-a", note: "Should roll back", failHistoryWrite: true });
} catch {
  // expected simulated failure
}
assertEqual("history-write failure rolls opportunity status back", beforeRollback?.pipelineStatus, (await repository.getOpportunity(userA, "AF-001"))?.pipelineStatus);
assertEqual("history-write failure does not add history", 1, (await repository.listSubmissionHistory(userA)).length);

const afterRollback = await repository.getOpportunity(userA, "AF-001");
if (!afterRollback) throw new Error("AF-001 missing before manual override");
const manual = applyManualDecisionOverride({ opportunity: afterRollback, decision: "PRIORITY", reason: "Acceptance manual reason", changedBy: "user-a" });
await repository.updateOpportunity(userA, manual, afterRollback.version);
const recalculated = recalculateAutomaticDecisionPreservingOverride({ ...manual, score: { ...manual.score, projectFit: 0, prizeBusinessValue: 0, winability: 0, reusability: 0, deadlineReadiness: 0, exposure: 0, ease: 0 } });
assertEqual("manual override remains effective after automatic recalc", "PRIORITY", recalculated.decision);

userAOpps = await repository.listOpportunities(userA);
const settings = await repository.getSettings(userA);
const reminders1 = generateServerReminders({ context: userA, opportunities: userAOpps, existing: [], settings, now: new Date(Date.UTC(2026, 0, 1)) });
const reminders2 = generateServerReminders({ context: userA, opportunities: userAOpps, existing: reminders1, settings, now: new Date(Date.UTC(2026, 0, 1)) });
assertEqual("generate reminders twice creates no duplicate idempotency keys", unique(reminders2.map((item) => item.idempotencyKey)).length, reminders2.length);

const changing = await repository.getOpportunity(userA, "AF-001");
if (!changing) throw new Error("AF-001 missing before deadline change");
await repository.updateOpportunity(userA, { ...changing, normalizedDeadlineUtc: "2026-12-31T13:00:00.000Z", version: changing.version }, changing.version);
const changedOpps = await repository.listOpportunities(userA);
const reminders3 = generateServerReminders({ context: userA, opportunities: changedOpps, existing: reminders2, settings, now: new Date(Date.UTC(2026, 0, 1)) });
assertEqual("deadline change supersedes old AF-001 reminders", true, reminders3.some((item) => item.opportunityId === "AF-001" && item.status === "superseded") && reminders3.some((item) => item.opportunityId === "AF-001" && item.deadlineUtc === "2026-12-31T13:00:00.000Z" && item.status === "pending"));

await repository.replaceReminders(userA, reminders3);
const backup = exportBackup({
  projects: [],
  opportunities: await repository.listOpportunities(userA),
  verificationHistory: await repository.listVerificationEvents(userA),
  submissionStatusHistory: await repository.listSubmissionHistory(userA),
  reminders: await repository.listReminders(userA),
  settings: await repository.getSettings(userA),
  exportedAt: "2026-07-14T00:00:00.000Z"
});
const restorePreview = previewRestoreBackup(backup, new Set());
assertEqual("preview restore into empty isolated user creates 23 opportunities", 23, restorePreview.create);

const output = {
  status: assertions.every((item) => item.status === "PASS") ? "passed" : "failed",
  databaseIdentifier: "isolated InMemoryRepository acceptance database",
  workbookPath,
  sourceSheet,
  importedCounts: { create: imported.job.createCount, update: imported.job.updateCount, skip: imported.job.skipCount, error: imported.job.errorCount },
  userAOpportunityCount: (await repository.listOpportunities(userA)).length,
  userBVisibleOpportunityCount: (await repository.listOpportunities(userB)).length,
  reminderCountAfterRegeneration: (await repository.listReminders(userA)).length,
  restorePreview,
  assertions
};

console.log(JSON.stringify(output, null, 2));
process.exit(output.status === "passed" ? 0 : 1);

function getCliFile(): string | undefined {
  const fileIndex = process.argv.indexOf("--file");
  if (fileIndex >= 0) return process.argv[fileIndex + 1];
  return process.argv.find((arg) => arg.startsWith("--file="))?.slice("--file=".length);
}

function sheetRows(file: string, sheetName: string): Record<string, unknown>[] {
  const workbook = XLSX.read(fs.readFileSync(file), { type: "buffer", cellDates: true });
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: "", raw: true })
    .filter((row) => {
      const id = String(row.ID ?? "").trim();
      const opportunity = String(row.Opportunity ?? "").trim();
      const sourceUrl = String(row["Source URL"] ?? "").trim();
      return id || opportunity || sourceUrl;
    });
}

function assertEqual(name: string, expected: unknown, actual: unknown) {
  assertions.push({ name, expected, actual, status: JSON.stringify(expected) === JSON.stringify(actual) ? "PASS" : "FAIL" });
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}
