import { z } from "zod";
import type { ImportJobSummary, Opportunity } from "../types";
import { recalculateOpportunity } from "./scoring";

const SYDNEY_TIMEZONE = "Australia/Sydney";

const pipelineStatuses = ["Watch", "Open", "Registered", "Building", "Ready for QA", "Submitted", "Finalist", "Won", "Lost", "Closed", "Paused", "Skip"] as const;
const eligibilityStatuses = ["Eligible", "Unclear", "Likely ineligible"] as const;

const rowSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  organizer: z.string().default("Unknown"),
  type: z.string().default("Award"),
  sourceUrl: z.string().url(),
  eligibility: z.string().default("TBC"),
  eligibilityStatus: z.enum(eligibilityStatuses).default("Unclear"),
  countryRegion: z.string().default("Global"),
  companyStageRestrictions: z.string().default("TBC"),
  prizeFunding: z.preprocess(moneyToNumber, z.number()).default(0),
  entryFee: z.preprocess(moneyToNumber, z.number()).default(0),
  rawDeadlineText: z.preprocess(textValue, z.string()).default("TBC"),
  nextCriticalDeadline: z.union([z.string(), z.number(), z.date()]).nullable().optional(),
  finalDeadline: z.union([z.string(), z.number(), z.date()]).nullable().optional(),
  deadline: z.union([z.string(), z.number(), z.date()]).optional(),
  normalizedDeadlineUtc: z.string().nullable().optional(),
  timezone: z.string().default(SYDNEY_TIMEZONE),
  requiredTechnology: z.string().default("TBC"),
  requiredDeliverables: z.string().default("TBC"),
  ipLicenseNotes: z.string().default("Check source before applying"),
  travelRequirements: z.string().default("TBC"),
  matchedProjectId: z.string().default("handyman-ai"),
  pipelineStatus: z.enum(pipelineStatuses).default("Watch"),
  projectFit: z.coerce.number().default(12),
  prizeBusinessValue: z.coerce.number().default(10),
  winability: z.coerce.number().default(7),
  reusability: z.coerce.number().default(8),
  deadlineReadiness: z.coerce.number().default(4),
  exposure: z.coerce.number().default(5),
  ease: z.coerce.number().default(3),
  nextAction: z.string().default("Review official source and verify eligibility"),
  owner: z.string().default("User"),
  notes: z.string().default(""),
  verificationStatus: z.enum(["Unverified", "Needs Review", "Verified", "Stale", "Invalid", "Closed"]).default("Needs Review")
});

export interface RowIssue {
  rowNumber: number;
  row: unknown;
  reason: string;
  opportunityId?: string;
  fieldName?: string;
  rawValue?: unknown;
}

export interface ImportPreview {
  create: Opportunity[];
  update: Opportunity[];
  skip: RowIssue[];
  errors: RowIssue[];
  job: ImportJobSummary;
}

export function parseCsv(text: string): Record<string, string>[] {
  const [headerLine, ...lines] = text.trim().split(/\r?\n/);
  if (!headerLine) return [];
  const headers = splitCsvLine(headerLine);
  return lines.filter(Boolean).map((line) => {
    const cells = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header.trim(), cells[index]?.trim() ?? ""]));
  });
}

export function previewImport(rows: unknown[], existing: Opportunity[], sourceFileName: string, now = new Date()): ImportPreview {
  return buildImportPlan(rows, existing, sourceFileName, "preview", now);
}

export function planApplyImport(rows: unknown[], existing: Opportunity[], sourceFileName: string, now = new Date()): ImportPreview {
  return buildImportPlan(rows, existing, sourceFileName, "apply", now);
}

export function applyImport(preview: ImportPreview, existing: Opportunity[]): Opportunity[] {
  const byId = new Map(preview.update.map((opportunity) => [opportunity.id, opportunity]));
  const byUrl = new Map(preview.update.map((opportunity) => [canonicalUrl(opportunity.sourceUrl), opportunity]));
  const kept = existing.map((opportunity) => byId.get(opportunity.id) ?? byUrl.get(canonicalUrl(opportunity.sourceUrl)) ?? opportunity);
  return [...kept, ...preview.create];
}

export function exportCsv(opportunities: Opportunity[]): string {
  const headers = ["id", "name", "organizer", "type", "sourceUrl", "decision", "pipelineStatus", "normalizedDeadlineUtc", "matchedProjectId", "verificationStatus"];
  return [headers.join(","), ...opportunities.map((opportunity) => headers.map((header) => csvEscape(String(opportunity[header as keyof Opportunity] ?? ""))).join(","))].join("\n");
}

export function canonicalUrl(value: string): string {
  try {
    const url = new URL(value.trim());
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) url.port = "";
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.toString();
  } catch {
    return value.trim().toLowerCase();
  }
}

export function normalizeRows(rawRows: unknown[]): Record<string, unknown>[] {
  return rawRows.map((row) => {
    if (!row || typeof row !== "object") return {};
    const entries = Object.entries(row as Record<string, unknown>).map(([key, value]) => [normalizeHeader(key), value]);
    const normalized = Object.fromEntries(entries);
    return {
      id: firstValue(normalized, ["id", "opportunityId", "opportunityID"]),
      name: firstValue(normalized, ["name", "opportunity", "opportunityName", "title", "competitionName"]),
      organizer: firstValue(normalized, ["organizer", "organisation", "organization"]),
      type: firstValue(normalized, ["type", "opportunityType", "category"]),
      sourceUrl: firstValue(normalized, ["sourceUrl", "officialSourceUrl", "url", "link", "officialUrl"]),
      eligibility: firstValue(normalized, ["eligibility", "eligibilityNotes"]),
      eligibilityStatus: normalizeEligibility(firstValue(normalized, ["eligibilityStatus", "eligibilityDecision"])),
      countryRegion: firstValue(normalized, ["countryRegion", "region", "country", "countries", "regionEligibilityNotes"]),
      companyStageRestrictions: firstValue(normalized, ["companyStageRestrictions", "stageRestrictions"]),
      prizeFunding: firstValue(normalized, ["prizeFunding", "prize", "funding", "prizeAmount"]),
      entryFee: firstValue(normalized, ["entryFee", "fee", "applicationFee"]),
      rawDeadlineText: firstValue(normalized, ["rawDeadlineText", "deadlineText", "deadline", "finalDeadlineSydney", "nextCriticalDeadlineSydney"]),
      nextCriticalDeadline: firstValue(normalized, ["nextCriticalDeadline", "nextCriticalDeadlineSydney"]),
      finalDeadline: firstValue(normalized, ["finalDeadline", "finalDeadlineSydney"]),
      deadline: firstValue(normalized, ["deadline", "finalDeadline", "finalDeadlineSydney", "nextCriticalDeadline", "nextCriticalDeadlineSydney"]),
      normalizedDeadlineUtc: firstValue(normalized, ["normalizedDeadlineUtc", "deadlineUtc"]),
      timezone: firstValue(normalized, ["timezone", "timeZone"]),
      requiredTechnology: firstValue(normalized, ["requiredTechnology", "technology"]),
      requiredDeliverables: firstValue(normalized, ["requiredDeliverables", "deliverables", "submissionRequirements"]),
      ipLicenseNotes: firstValue(normalized, ["ipLicenseNotes", "ipLicenceNotes", "ipNotes"]),
      travelRequirements: firstValue(normalized, ["travelRequirements", "travel"]),
      matchedProjectId: firstValue(normalized, ["matchedProjectId", "projectId", "matchedProject", "project", "bestProject"]),
      pipelineStatus: normalizePipeline(firstValue(normalized, ["pipelineStatus", "pipeline", "status"])),
      projectFit: firstValue(normalized, ["projectFit", "fit25", "fit"]),
      prizeBusinessValue: firstValue(normalized, ["prizeBusinessValue", "businessValue", "value20", "value"]),
      winability: firstValue(normalized, ["winability", "winability15"]),
      reusability: firstValue(normalized, ["reusability", "reuse15", "reuse"]),
      deadlineReadiness: firstValue(normalized, ["deadlineReadiness", "deadline10"]),
      exposure: firstValue(normalized, ["exposure", "exposure10"]),
      ease: firstValue(normalized, ["ease", "ease5"]),
      nextAction: firstValue(normalized, ["nextAction"]),
      owner: firstValue(normalized, ["owner"]),
      notes: firstValue(normalized, ["notes", "internalNotes"]),
      verificationStatus: normalizeVerification(firstValue(normalized, ["verificationStatus", "verifiedStatus", "verified"]))
    };
  });
}

function buildImportPlan(rawRows: unknown[], existing: Opportunity[], sourceFileName: string, mode: "preview" | "apply", now: Date): ImportPreview {
  const rows = normalizeRows(rawRows)
    .map((row, originalIndex) => ({ row, originalIndex }))
    .filter(({ row }) => !isBlankOpportunityRow(row));
  const byId = new Map(existing.map((opportunity) => [opportunity.id, opportunity]));
  const byUrl = new Map(existing.map((opportunity) => [canonicalUrl(opportunity.sourceUrl), opportunity]));
  const seenIds = new Set<string>();
  const seenUrls = new Set<string>();
  const preview: ImportPreview = {
    create: [],
    update: [],
    skip: [],
    errors: [],
    job: {
      id: `import-${now.getTime()}-${mode}`,
      sourceFileName,
      mode,
      createdAt: now.toISOString(),
      completedAt: now.toISOString(),
      status: "completed",
      createCount: 0,
      updateCount: 0,
      skipCount: 0,
      errorCount: 0
    }
  };

  rows.forEach(({ row, originalIndex }) => {
    const rowNumber = originalIndex + 2;
    const parsed = rowSchema.safeParse(row);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const fieldName = String(issue.path[0] ?? "row");
        preview.errors.push({
          rowNumber,
          row,
          reason: `${fieldName}: ${issue.message}`,
          opportunityId: String((row as Record<string, unknown>).id ?? ""),
          fieldName,
          rawValue: (row as Record<string, unknown>)[fieldName]
        });
      }
      return;
    }

    const id = parsed.data.id?.trim() || slugify(parsed.data.name);
    const url = canonicalUrl(parsed.data.sourceUrl);
    if (seenIds.has(id) || seenUrls.has(url)) {
      preview.skip.push({ rowNumber, row, reason: "Duplicate row inside import file" });
      return;
    }
    seenIds.add(id);
    seenUrls.add(url);

    const imported = recalculateOpportunity({
      id,
      name: parsed.data.name,
      organizer: parsed.data.organizer,
      type: parsed.data.type,
      sourceUrl: url,
      eligibility: parsed.data.eligibility,
      eligibilityStatus: parsed.data.eligibilityStatus,
      countryRegion: parsed.data.countryRegion,
      companyStageRestrictions: parsed.data.companyStageRestrictions,
      prizeFunding: parsed.data.prizeFunding,
      entryFee: parsed.data.entryFee,
      rawDeadlineText: parsed.data.rawDeadlineText,
      nextCriticalDeadlineUtc: normalizeDeadlineUtc(parsed.data.nextCriticalDeadline, parsed.data.timezone),
      finalDeadlineUtc: normalizeDeadlineUtc(parsed.data.finalDeadline, parsed.data.timezone),
      normalizedDeadlineUtc: normalizeDeadlineUtc(parsed.data.normalizedDeadlineUtc ?? parsed.data.deadline ?? parsed.data.rawDeadlineText, parsed.data.timezone),
      timezone: parsed.data.timezone || SYDNEY_TIMEZONE,
      requiredTechnology: parsed.data.requiredTechnology,
      requiredDeliverables: parsed.data.requiredDeliverables,
      ipLicenseNotes: parsed.data.ipLicenseNotes,
      travelRequirements: parsed.data.travelRequirements,
      matchedProjectId: normalizeProjectId(parsed.data.matchedProjectId),
      score: {
        projectFit: parsed.data.projectFit,
        prizeBusinessValue: parsed.data.prizeBusinessValue,
        winability: parsed.data.winability,
        reusability: parsed.data.reusability,
        deadlineReadiness: parsed.data.deadlineReadiness,
        exposure: parsed.data.exposure,
        ease: parsed.data.ease
      },
      decision: "WATCH",
      nextAction: parsed.data.nextAction,
      owner: parsed.data.owner,
      notes: parsed.data.notes,
      verificationStatus: parsed.data.verificationStatus,
      pipelineStatus: parsed.data.pipelineStatus,
      importedAt: now.toISOString(),
      sourceFileName
    }, now);

    const existingRecord = byId.get(imported.id) ?? byUrl.get(url);
    if (!existingRecord) preview.create.push(imported);
    else if (isMeaningfullyEqual(existingRecord, imported)) preview.skip.push({ rowNumber, row, reason: "Unchanged existing record" });
    else preview.update.push(imported);
  });

  preview.job.createCount = preview.create.length;
  preview.job.updateCount = preview.update.length;
  preview.job.skipCount = preview.skip.length;
  preview.job.errorCount = preview.errors.length;
  return preview;
}

function normalizeHeader(value: string): string {
  const spaced = value.trim().replace(/^\uFEFF/, "").replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  const tokens = spaced.match(/[a-zA-Z0-9]+/g) ?? [];
  return tokens.map((token, index) => {
    const lower = token.toLowerCase();
    return index === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join("");
}

function firstValue(row: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function isBlankOpportunityRow(row: Record<string, unknown>): boolean {
  const id = firstValue(row, ["id", "opportunityId", "opportunityID"]);
  const name = firstValue(row, ["name", "opportunity", "opportunityName", "title", "competitionName"]);
  const sourceUrl = firstValue(row, ["sourceUrl", "officialSourceUrl", "url", "link", "officialUrl"]);
  return [id, name, sourceUrl].every((value) => value === undefined || value === null || String(value).trim() === "");
}

function normalizeEligibility(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const lower = value.toLowerCase();
  if (lower.includes("ineligible")) return "Likely ineligible";
  if (lower.includes("unclear") || lower.includes("verify") || lower.includes("conditional")) return "Unclear";
  if (lower.includes("eligible")) return "Eligible";
  return value;
}

function normalizeVerification(value: unknown): unknown {
  if (value instanceof Date) return "Verified";
  if (typeof value !== "string") return value;
  const lower = value.toLowerCase();
  if (lower.includes("reject") || lower.includes("invalid")) return "Invalid";
  if (lower.includes("stale")) return "Stale";
  if (lower.includes("verified") || lower.includes("yes")) return "Verified";
  if (lower.includes("review") || lower.includes("check")) return "Needs Review";
  if (lower.includes("unverified") || lower.includes("no")) return "Unverified";
  return value;
}

function moneyToNumber(value: unknown): unknown {
  if (value === undefined || value === null || value === "") return 0;
  if (typeof value === "number") return value;
  const text = String(value).trim();
  if (!text || /^free$/i.test(text) || /no fee|n\/a|none/i.test(text)) return 0;
  const match = text.match(/[\d,.]+/);
  if (!match) return 0;
  let amount = Number(match[0].replace(/,/g, ""));
  if (/k\b/i.test(text)) amount *= 1_000;
  if (/\bm\b/i.test(text)) amount *= 1_000_000;
  return Number.isFinite(amount) ? amount : 0;
}

function textValue(value: unknown): unknown {
  if (value === undefined || value === null || value === "") return "TBC";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normalizePipeline(value: unknown): unknown {
  if (typeof value !== "string") return value;
  if (/rolling|ongoing/i.test(value)) return "Watch";
  const found = pipelineStatuses.find((status) => status.toLowerCase() === value.toLowerCase());
  return found ?? value;
}

function normalizeProjectId(value: string): string {
  const lower = value.toLowerCase();
  if (lower.includes("handyman")) return "handyman-ai";
  if (lower.includes("etf")) return "etf-backtesting";
  if (lower.includes("ai os")) return "ai-os-factory";
  if (lower.includes("australian") || lower.includes("service website")) return "australian-service-website";
  return value;
}

function normalizeDeadlineUtc(value: unknown, timezone = SYDNEY_TIMEZONE): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (value instanceof Date) return dateInTimezoneToUtc(value, timezone);
  if (typeof value === "number") {
    const excelEpoch = Date.UTC(1899, 11, 30);
    return dateInTimezoneToUtc(new Date(excelEpoch + value * 24 * 60 * 60 * 1000), timezone);
  }
  const text = String(value).trim();
  if (!text || /rolling|tbc|n\/a|ongoing/i.test(text)) return null;
  if (/[zZ]|[+-]\d{2}:?\d{2}/.test(text)) {
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return dateInTimezoneToUtc(parsed, timezone || SYDNEY_TIMEZONE);
}

function dateInTimezoneToUtc(localDate: Date, timezone: string): string {
  const assumedUtc = new Date(Date.UTC(localDate.getFullYear(), localDate.getMonth(), localDate.getDate(), localDate.getHours(), localDate.getMinutes(), localDate.getSeconds()));
  const offset = timezoneOffsetMs(assumedUtc, timezone);
  return new Date(assumedUtc.getTime() - offset).toISOString();
}

function timezoneOffsetMs(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - date.getTime();
}

function isMeaningfullyEqual(a: Opportunity, b: Opportunity): boolean {
  return JSON.stringify(stableComparable(a)) === JSON.stringify(stableComparable(b));
}

function stableComparable(opportunity: Opportunity): Record<string, unknown> {
  const { importedAt, sourceFileName, decision, ...rest } = opportunity;
  return { ...rest, sourceUrl: canonicalUrl(opportunity.sourceUrl), decision };
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (const char of line) {
    if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else current += char;
  }
  cells.push(current);
  return cells;
}

function csvEscape(value: string): string {
  if (!/[",\n]/.test(value)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
