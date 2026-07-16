import type { ImportJobSummary, Opportunity } from "../types";
import type { RepositoryContext, OpportunityRepository } from "./repository";

export interface LocalStorageMigrationPlan {
  backupJson: string;
  create: Opportunity[];
  update: Opportunity[];
  skip: Opportunity[];
  errors: { id?: string; reason: string }[];
  job: ImportJobSummary;
}

export async function previewLocalStorageMigration(params: {
  context: RepositoryContext;
  repository: OpportunityRepository;
  rawLocalStorageState: string;
  sourceName?: string;
  now?: Date;
}): Promise<LocalStorageMigrationPlan> {
  const now = params.now ?? new Date();
  const parsed = safeParseState(params.rawLocalStorageState);
  const existing = await params.repository.listOpportunities(params.context);
  const byId = new Map(existing.map((item) => [item.id, item]));
  const create: Opportunity[] = [];
  const update: Opportunity[] = [];
  const skip: Opportunity[] = [];
  const errors: { id?: string; reason: string }[] = [];

  for (const opportunity of parsed.opportunities) {
    if (!opportunity.id || !opportunity.name || !opportunity.sourceUrl) {
      errors.push({ id: opportunity.id, reason: "Missing required opportunity id, name or sourceUrl" });
      continue;
    }
    const existingRecord = byId.get(opportunity.id);
    if (!existingRecord) create.push(opportunity);
    else if (JSON.stringify(comparable(existingRecord)) === JSON.stringify(comparable(opportunity))) skip.push(opportunity);
    else update.push(opportunity);
  }

  return {
    backupJson: JSON.stringify(parsed, null, 2),
    create,
    update,
    skip,
    errors,
    job: {
      id: `local-storage-migration-${now.getTime()}`,
      sourceFileName: params.sourceName ?? "browser-localStorage",
      mode: "preview",
      createdAt: now.toISOString(),
      completedAt: now.toISOString(),
      status: "completed",
      createCount: create.length,
      updateCount: update.length,
      skipCount: skip.length,
      errorCount: errors.length
    }
  };
}

function comparable(opportunity: Opportunity): Record<string, unknown> {
  const { userId, workspaceId, createdAt, updatedAt, version, ...rest } = opportunity;
  return rest;
}

export async function applyLocalStorageMigration(params: {
  context: RepositoryContext;
  repository: OpportunityRepository;
  plan: LocalStorageMigrationPlan;
}): Promise<ImportJobSummary> {
  await params.repository.upsertOpportunities(params.context, [...params.plan.create, ...params.plan.update]);
  return { ...params.plan.job, id: params.plan.job.id.replace("preview", "apply"), mode: "apply" };
}

function safeParseState(raw: string): { opportunities: Opportunity[]; migratedAt?: string } {
  const parsed = JSON.parse(raw) as { opportunities?: Opportunity[]; migratedAt?: string };
  return { opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities : [], migratedAt: parsed.migratedAt };
}
