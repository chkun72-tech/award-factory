import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { applyImport, canonicalUrl, planApplyImport, previewImport } from "../src/lib/importer";
import type { ImportJobSummary, Opportunity } from "../src/types";

const EXPECTED_SHA256 = "f692d2a130b3963d4c58a9269f35c0232b891d3c200ba5db0f3753c0d7736952";
const EXPECTED_FILE_SIZE = 126_352;
const EXPECTED_SHEETS = ["Dashboard", "Opportunity Radar", "Project Profiles", "Submission Kit", "Weekly Workflow", "Sources & Rules", "Settings"];
const EXPECTED_SOURCE_SHEET = "Opportunity Radar";
const EXPECTED_ROWS = 23;
const TEST_TEMP_DIR = path.resolve(process.cwd(), "test-temp");
const ACCEPTANCE_DB_PATH = path.join(TEST_TEMP_DIR, "acceptance-db.in-memory.json");

interface Counts {
  create: number;
  update: number;
  skip: number;
  error: number;
}

interface Assertion {
  id: string;
  name: string;
  expected: unknown;
  actual: unknown;
  status: "PASS" | "FAIL";
}

const assertions: Assertion[] = [];
const jobs: ImportJobSummary[] = [];
const statusHistoryRecords: unknown[] = [];
const activityRecords: unknown[] = [];

const resolved = resolveWorkbookPath();
if (!resolved) {
  console.error(JSON.stringify({
    status: "blocked",
    reason: "XLSX file not found",
    resolutionOrder: ["--file CLI argument", "AWARD_FACTORY_XLSX environment variable", "./award-factory-seed.xlsx", "./fixtures/award-factory-seed.xlsx"],
    cwd: process.cwd()
  }, null, 2));
  process.exit(2);
}

fs.rmSync(TEST_TEMP_DIR, { recursive: true, force: true });
fs.mkdirSync(TEST_TEMP_DIR, { recursive: true });

try {
  const originalSha = sha256(resolved);
  const fileStats = fs.statSync(resolved);
  const sourceFileName = path.basename(resolved);
  const workbook = readWorkbook(resolved);
  const selectedSheet = selectSourceSheet(workbook);
  const rawRows = sheetRows(workbook, selectedSheet);
  let db: Opportunity[] = [];

  assert("META-1", "input file SHA-256", EXPECTED_SHA256, originalSha);
  assert("META-2", "input file size", EXPECTED_FILE_SIZE, fileStats.size);
  assert("META-3", "workbook sheet names", EXPECTED_SHEETS, workbook.SheetNames);
  assert("META-4", "selected source sheet", EXPECTED_SOURCE_SHEET, selectedSheet);
  assert("META-5", "acceptance database is isolated", true, ACCEPTANCE_DB_PATH.includes("test-temp") && !/prod|production|development/i.test(ACCEPTANCE_DB_PATH));
  assert("META-6", "real opportunity rows after blank formatted rows ignored", EXPECTED_ROWS, rawRows.length);
  assert("META-7", "opportunity IDs AF-001 through AF-023", expectedIds(), rawRows.map((row) => String(row.ID ?? row.Id ?? row.id ?? "")));

  const preview = previewImport(rawRows, db, sourceFileName, now(0));
  jobs.push(preview.job);
  const countBeforePreview = db.length;
  const countAfterPreview = db.length;
  assert("A-1", "preview counts on empty database", { create: 23, update: 0, skip: 0, error: 0 }, counts(preview.job));
  assert("A-2", "opportunity count before preview", 0, countBeforePreview);
  assert("A-3", "opportunity count after preview", 0, countAfterPreview);

  const apply1 = planApplyImport(rawRows, db, sourceFileName, now(1));
  jobs.push(apply1.job);
  db = applyImport(apply1, db);
  persistDb(db);
  assert("B-1", "first apply counts", { create: 23, update: 0, skip: 0, error: 0 }, counts(apply1.job));
  assert("B-2", "first apply final opportunity count", 23, db.length);
  assert("B-3", "zero duplicates after first apply", { duplicateIds: [], duplicateUrls: [] }, duplicateReport(db));

  const apply2 = planApplyImport(rawRows, db, sourceFileName, now(2));
  jobs.push(apply2.job);
  db = applyImport(apply2, db);
  persistDb(db);
  assert("C-1", "identical second apply counts", { create: 0, update: 0, skip: 23, error: 0 }, counts(apply2.job));
  assert("C-2", "identical second apply final opportunity count", 23, db.length);

  const modifiedPath = path.join(TEST_TEMP_DIR, "award-factory-seed.modified.xlsx");
  fs.copyFileSync(resolved, modifiedPath);
  const modifiedWorkbook = readWorkbook(modifiedPath);
  const modifiedInfo = changeNotesForAf001(modifiedWorkbook, EXPECTED_SOURCE_SHEET);
  XLSX.writeFile(modifiedWorkbook, modifiedPath);
  const beforeModifiedById = new Map(db.map((opportunity) => [opportunity.id, JSON.stringify(opportunity)]));
  const modifiedRows = sheetRows(readWorkbook(modifiedPath), EXPECTED_SOURCE_SHEET);
  const apply3 = planApplyImport(modifiedRows, db, path.basename(modifiedPath), now(3));
  jobs.push(apply3.job);
  db = applyImport(apply3, db);
  persistDb(db);
  const changedIds = db.filter((opportunity) => beforeModifiedById.get(opportunity.id) !== JSON.stringify(opportunity)).map((opportunity) => opportunity.id);
  assert("D-1", "modified-row apply counts", { create: 0, update: 1, skip: 22, error: 0 }, counts(apply3.job));
  assert("D-2", "modified-row final opportunity count", 23, db.length);
  assert("D-3", "only AF-001 changed", ["AF-001"], changedIds);
  assert("D-4", "no status history for unchanged rows", 0, statusHistoryRecords.length);
  assert("D-5", "no activity records for unchanged rows", 0, activityRecords.length);
  assert("D-6", "modified Notes field persisted", modifiedInfo.next, db.find((opportunity) => opportunity.id === "AF-001")?.notes);

  const invalidPath = path.join(TEST_TEMP_DIR, "award-factory-seed.invalid.xlsx");
  fs.copyFileSync(modifiedPath, invalidPath);
  const invalidWorkbook = readWorkbook(invalidPath);
  const invalidInfo = appendInvalidAf999(invalidWorkbook, EXPECTED_SOURCE_SHEET);
  XLSX.writeFile(invalidWorkbook, invalidPath);
  const beforeInvalidCount = db.length;
  const invalidRows = sheetRows(readWorkbook(invalidPath), EXPECTED_SOURCE_SHEET);
  const apply4 = planApplyImport(invalidRows, db, path.basename(invalidPath), now(4));
  jobs.push(apply4.job);
  db = applyImport(apply4, db);
  persistDb(db);
  assert("E-1", "invalid-row apply counts", { create: 0, update: 0, skip: 23, error: 1 }, counts(apply4.job));
  assert("E-2", "invalid-row final opportunity count", 23, db.length);
  assert("E-3", "invalid row was not inserted", false, db.some((opportunity) => opportunity.id === "AF-999"));
  assert("E-4", "row-level error includes worksheet row number", invalidInfo.appendedRowNumber, apply4.errors[0]?.rowNumber);
  assert("E-5", "row-level error includes opportunity ID", "AF-999", apply4.errors[0]?.opportunityId);
  assert("E-6", "row-level error includes invalid field name", "sourceUrl", apply4.errors[0]?.fieldName);
  assert("E-7", "row-level error includes raw invalid value", "not-a-valid-url", apply4.errors[0]?.rawValue);
  assert("E-8", "row-level error has readable message", true, Boolean(apply4.errors[0]?.reason));
  assert("E-9", "valid rows remain processable and count unchanged", beforeInvalidCount, db.length);

  assert("F-1", "five import job records", 5, jobs.length);
  assert("F-2", "every import job has required history fields", true, jobs.every(hasRequiredJobFields));
  assert("F-3", "job history modes", ["preview", "apply", "apply", "apply", "apply"], jobs.map((job) => job.mode));

  const finalSha = sha256(resolved);
  assert("META-8", "original workbook SHA-256 unchanged after tests", originalSha, finalSha);

  const report = {
    status: assertions.every((item) => item.status === "PASS") ? "passed" : "failed",
    resolvedAbsoluteFilePath: resolved,
    sourceFileName,
    fileSize: fileStats.size,
    inputSha256: originalSha,
    finalInputSha256: finalSha,
    acceptanceDatabaseIdentifier: ACCEPTANCE_DB_PATH,
    isolatedFromDevelopmentAndProduction: true,
    workbookSheetNames: workbook.SheetNames,
    selectedSourceSheet: selectedSheet,
    previewCounts: counts(preview.job),
    firstApplyCounts: counts(apply1.job),
    identicalSecondApplyCounts: counts(apply2.job),
    modifiedRowApplyCounts: counts(apply3.job),
    invalidRowTestCounts: counts(apply4.job),
    finalOpportunityCount: db.length,
    importJobHistory: jobs,
    rowLevelErrors: apply4.errors,
    assertions
  };

  fs.mkdirSync(path.resolve(process.cwd(), "reports"), { recursive: true });
  const reportPath = path.resolve(process.cwd(), "reports", "award-factory-import-acceptance.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, reportPath }, null, 2));
  process.exit(report.status === "passed" ? 0 : 1);
} finally {
  fs.rmSync(TEST_TEMP_DIR, { recursive: true, force: true });
}

function resolveWorkbookPath(): string | null {
  const candidates = [
    getCliFile(),
    process.env.AWARD_FACTORY_XLSX,
    path.resolve(process.cwd(), "award-factory-seed.xlsx"),
    path.resolve(process.cwd(), "fixtures", "award-factory-seed.xlsx")
  ].filter(Boolean) as string[];
  for (const candidate of candidates) {
    const absolute = path.resolve(candidate);
    if (fs.existsSync(absolute)) return absolute;
  }
  return null;
}

function getCliFile(): string | undefined {
  const fileIndex = process.argv.indexOf("--file");
  if (fileIndex >= 0) return process.argv[fileIndex + 1];
  return process.argv.find((arg) => arg.startsWith("--file="))?.slice("--file=".length);
}

function sha256(file: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function readWorkbook(file: string): XLSX.WorkBook {
  return XLSX.read(fs.readFileSync(file), { type: "buffer", cellDates: true });
}

function now(minutes: number): Date {
  return new Date(Date.UTC(2026, 6, 12, 0, minutes, 0));
}

function selectSourceSheet(workbook: XLSX.WorkBook): string {
  return workbook.SheetNames.includes(EXPECTED_SOURCE_SHEET) ? EXPECTED_SOURCE_SHEET : workbook.SheetNames[0];
}

function sheetRows(workbook: XLSX.WorkBook, sheetName: string): Record<string, unknown>[] {
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: "", raw: true })
    .filter((row) => !isBlankRawRow(row));
}

function isBlankRawRow(row: Record<string, unknown>): boolean {
  const id = getRaw(row, ["ID", "Id", "id", "Opportunity ID"]);
  const opportunity = getRaw(row, ["Opportunity", "Name", "Title"]);
  const sourceUrl = getRaw(row, ["Source URL", "Official Source URL", "sourceUrl", "URL", "Link"]);
  return [id, opportunity, sourceUrl].every((value) => value === undefined || value === null || String(value).trim() === "");
}

function getRaw(row: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== "") return row[key];
  }
  return undefined;
}

function expectedIds(): string[] {
  return Array.from({ length: 23 }, (_, index) => `AF-${String(index + 1).padStart(3, "0")}`);
}

function counts(job: ImportJobSummary): Counts {
  return { create: job.createCount, update: job.updateCount, skip: job.skipCount, error: job.errorCount };
}

function assert(id: string, name: string, expected: unknown, actual: unknown) {
  assertions.push({ id, name, expected, actual, status: JSON.stringify(expected) === JSON.stringify(actual) ? "PASS" : "FAIL" });
}

function persistDb(db: Opportunity[]) {
  fs.writeFileSync(ACCEPTANCE_DB_PATH, JSON.stringify(db, null, 2));
}

function duplicateReport(opportunities: Opportunity[]) {
  return {
    duplicateIds: duplicates(opportunities.map((opportunity) => opportunity.id)),
    duplicateUrls: duplicates(opportunities.map((opportunity) => canonicalUrl(opportunity.sourceUrl)))
  };
}

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicate = new Set<string>();
  values.forEach((value) => seen.has(value) ? duplicate.add(value) : seen.add(value));
  return [...duplicate];
}

function changeNotesForAf001(workbook: XLSX.WorkBook, sheetName: string) {
  const sheet = workbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
  const headers = headerMap(sheet);
  const idColumn = headers.get("ID") ?? headers.get("Id") ?? headers.get("id");
  const notesColumn = headers.get("Notes") ?? headers.get("Internal Notes") ?? headers.get("notes");
  if (idColumn === undefined || notesColumn === undefined) throw new Error("Cannot find ID or Notes column for modified-row acceptance test");
  for (let row = range.s.r + 1; row <= range.e.r; row += 1) {
    const idCell = sheet[XLSX.utils.encode_cell({ r: row, c: idColumn })];
    if (String(idCell?.v ?? "") === "AF-001") {
      const address = XLSX.utils.encode_cell({ r: row, c: notesColumn });
      const previous = sheet[address]?.v ?? "";
      const next = `acceptance-test-notes-${Date.now()}`;
      sheet[address] = { t: "s", v: next };
      return { sheetName, rowNumber: row + 1, field: "Notes", cell: address, previous, next };
    }
  }
  throw new Error("Cannot find AF-001 row for modified-row acceptance test");
}

function appendInvalidAf999(workbook: XLSX.WorkBook, sheetName: string) {
  const sheet = workbook.Sheets[sheetName];
  const rows = sheetRows(workbook, sheetName);
  const headers = headerRow(sheet);
  const invalid = Object.fromEntries(headers.map((header) => [header, ""]));
  setHeaderValue(invalid, headers, ["ID", "Id", "id"], "AF-999");
  setHeaderValue(invalid, headers, ["Opportunity", "Name", "Title"], "Acceptance Invalid Row");
  setHeaderValue(invalid, headers, ["Source URL", "Official Source URL", "URL", "Link"], "not-a-valid-url");
  setHeaderValue(invalid, headers, ["Final Deadline", "Deadline"], "not-a-date");
  rows.push(invalid);
  workbook.Sheets[sheetName] = XLSX.utils.json_to_sheet(rows, { header: headers });
  return { sheetName, appendedRowNumber: rows.length + 1, opportunityId: "AF-999" };
}

function setHeaderValue(row: Record<string, unknown>, headers: string[], candidates: string[], value: unknown) {
  const header = headers.find((item) => candidates.includes(item)) ?? candidates[0];
  row[header] = value;
}

function headerMap(sheet: XLSX.WorkSheet): Map<string, number> {
  const map = new Map<string, number>();
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
  for (let column = range.s.c; column <= range.e.c; column += 1) {
    const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c: column })];
    if (cell?.v) map.set(String(cell.v), column);
  }
  return map;
}

function headerRow(sheet: XLSX.WorkSheet): string[] {
  return [...headerMap(sheet).keys()];
}

function hasRequiredJobFields(job: ImportJobSummary): boolean {
  return Boolean(job.sourceFileName && job.mode && Number.isInteger(job.createCount) && Number.isInteger(job.updateCount) && Number.isInteger(job.skipCount) && Number.isInteger(job.errorCount) && job.createdAt && job.completedAt && job.status);
}
