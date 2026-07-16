import type { ActivityLog, AppSettings, Opportunity, PipelineStatus, StoredReminder, SubmissionHistory, VerificationEvent, VerificationStatus } from "../types";
import { verifyOpportunityApi } from "./api";
import { recalculateAutomaticDecisionPreservingOverride } from "./decision";
import { createSubmissionStatusHistory } from "./workflow";

export interface RepositoryContext {
  userId: string;
  workspaceId?: string;
}

export interface OpportunityRepository {
  listOpportunities(context: RepositoryContext): Promise<Opportunity[]>;
  getOpportunity(context: RepositoryContext, id: string): Promise<Opportunity | null>;
  upsertOpportunities(context: RepositoryContext, opportunities: Opportunity[]): Promise<void>;
  updateOpportunity(context: RepositoryContext, opportunity: Opportunity, expectedVersion?: number): Promise<Opportunity>;
  changeSubmissionStatus(context: RepositoryContext, params: { id: string; newStatus: PipelineStatus; changedBy: string; note: string; failHistoryWrite?: boolean }): Promise<{ opportunity: Opportunity; history: SubmissionHistory | null; activity: ActivityLog }>;
  verifyOpportunity(context: RepositoryContext, params: { id: string; newStatus: VerificationStatus; verifiedBy: string; note: string; changedFields?: string[]; failHistoryWrite?: boolean }): Promise<{ opportunity: Opportunity; event: VerificationEvent; activity: ActivityLog }>;
  listSubmissionHistory(context: RepositoryContext): Promise<SubmissionHistory[]>;
  listVerificationEvents(context: RepositoryContext): Promise<VerificationEvent[]>;
  listActivityLogs(context: RepositoryContext): Promise<ActivityLog[]>;
  listReminders(context: RepositoryContext): Promise<StoredReminder[]>;
  replaceReminders(context: RepositoryContext, reminders: StoredReminder[]): Promise<void>;
  getSettings(context: RepositoryContext): Promise<AppSettings>;
  saveSettings(context: RepositoryContext, settings: AppSettings): Promise<AppSettings>;
}

interface Store {
  opportunities: Opportunity[];
  statusHistory: SubmissionHistory[];
  verificationEvents: VerificationEvent[];
  activityLogs: ActivityLog[];
  reminders: StoredReminder[];
  settings: AppSettings[];
}

export class OptimisticConcurrencyError extends Error {
  constructor(public readonly id: string) {
    super(`Record ${id} changed after it was loaded. Reload latest before saving.`);
  }
}

export class InMemoryRepository implements OpportunityRepository {
  private store: Store;

  constructor(seed?: Partial<Store>) {
    this.store = {
      opportunities: seed?.opportunities ?? [],
      statusHistory: seed?.statusHistory ?? [],
      verificationEvents: seed?.verificationEvents ?? [],
      activityLogs: seed?.activityLogs ?? [],
      reminders: seed?.reminders ?? [],
      settings: seed?.settings ?? []
    };
  }

  async listOpportunities(context: RepositoryContext): Promise<Opportunity[]> {
    return this.visible(this.store.opportunities, context).map(clone);
  }

  async getOpportunity(context: RepositoryContext, id: string): Promise<Opportunity | null> {
    const found = this.store.opportunities.find((item) => item.id === id && belongsTo(item, context));
    return found ? clone(found) : null;
  }

  async upsertOpportunities(context: RepositoryContext, opportunities: Opportunity[]): Promise<void> {
    for (const opportunity of opportunities) {
      const owned = stampOwnership(opportunity, context);
      const index = this.store.opportunities.findIndex((item) => item.id === owned.id && belongsTo(item, context));
      if (index >= 0) this.store.opportunities[index] = { ...owned, version: (this.store.opportunities[index].version ?? 0) + 1, updatedAt: nowIso() };
      else this.store.opportunities.push({ ...owned, version: owned.version ?? 1, createdAt: owned.createdAt ?? nowIso(), updatedAt: owned.updatedAt ?? nowIso() });
    }
  }

  async updateOpportunity(context: RepositoryContext, opportunity: Opportunity, expectedVersion?: number): Promise<Opportunity> {
    const index = this.requireIndex(context, opportunity.id);
    const current = this.store.opportunities[index];
    if (expectedVersion !== undefined && (current.version ?? 0) !== expectedVersion) throw new OptimisticConcurrencyError(opportunity.id);
    const updated = stampOwnership({ ...opportunity, updatedAt: nowIso(), version: (current.version ?? 0) + 1 }, context);
    this.store.opportunities[index] = updated;
    return clone(updated);
  }

  async changeSubmissionStatus(context: RepositoryContext, params: { id: string; newStatus: PipelineStatus; changedBy: string; note: string; failHistoryWrite?: boolean }) {
    return this.transaction(() => {
      const index = this.requireIndex(context, params.id);
      const current = this.store.opportunities[index];
      const history = createSubmissionStatusHistory({ opportunity: current, newStatus: params.newStatus, changedBy: params.changedBy, note: params.note });
      const updated = recalculateAutomaticDecisionPreservingOverride({ ...current, pipelineStatus: params.newStatus });
      this.store.opportunities[index] = { ...updated, updatedAt: nowIso(), version: (current.version ?? 0) + 1 };
      if (params.failHistoryWrite) throw new Error("Simulated status history write failure");
      if (history) this.store.statusHistory.unshift(stampOwnership(history, context));
      const activity = this.log(context, params.changedBy, "pipeline_status_changed", "opportunity", params.id, { previousStatus: current.pipelineStatus, newStatus: params.newStatus });
      return { opportunity: clone(this.store.opportunities[index]), history: history ? clone(history) : null, activity };
    });
  }

  async verifyOpportunity(context: RepositoryContext, params: { id: string; newStatus: VerificationStatus; verifiedBy: string; note: string; changedFields?: string[]; failHistoryWrite?: boolean }) {
    return this.transaction(() => {
      const index = this.requireIndex(context, params.id);
      const current = this.store.opportunities[index];
      const verified = verifyOpportunityApi({ opportunity: current, newStatus: params.newStatus, verifiedBy: params.verifiedBy, note: params.note, changedFields: params.changedFields });
      this.store.opportunities[index] = { ...verified.opportunity, updatedAt: nowIso(), version: (current.version ?? 0) + 1 };
      if (params.failHistoryWrite) throw new Error("Simulated verification history write failure");
      this.store.verificationEvents.unshift(stampOwnership(verified.event, context));
      const activity = this.log(context, params.verifiedBy, "verification_recorded", "opportunity", params.id, { previousStatus: verified.event.previousStatus, newStatus: verified.event.newStatus });
      return { opportunity: clone(this.store.opportunities[index]), event: clone(verified.event), activity };
    });
  }

  async listSubmissionHistory(context: RepositoryContext): Promise<SubmissionHistory[]> {
    return this.visible(this.store.statusHistory, context).map(clone);
  }

  async listVerificationEvents(context: RepositoryContext): Promise<VerificationEvent[]> {
    return this.visible(this.store.verificationEvents, context).map(clone);
  }

  async listActivityLogs(context: RepositoryContext): Promise<ActivityLog[]> {
    return this.visible(this.store.activityLogs, context).map(clone);
  }

  async listReminders(context: RepositoryContext): Promise<StoredReminder[]> {
    return this.visible(this.store.reminders, context).map(clone);
  }

  async replaceReminders(context: RepositoryContext, reminders: StoredReminder[]): Promise<void> {
    this.store.reminders = [
      ...this.store.reminders.filter((item) => !belongsTo(item, context)),
      ...reminders.map((item) => stampOwnership(item, context))
    ];
  }

  async getSettings(context: RepositoryContext): Promise<AppSettings> {
    const found = this.store.settings.find((item) => belongsTo(item, context));
    if (found) return clone(found);
    const settings = defaultSettings(context);
    this.store.settings.push(settings);
    return clone(settings);
  }

  async saveSettings(context: RepositoryContext, settings: AppSettings): Promise<AppSettings> {
    const stamped = stampOwnership({ ...settings, updatedAt: nowIso() }, context);
    const index = this.store.settings.findIndex((item) => belongsTo(item, context));
    if (index >= 0) this.store.settings[index] = stamped;
    else this.store.settings.push(stamped);
    return clone(stamped);
  }

  private transaction<T>(operation: () => T): T {
    const snapshot = clone(this.store);
    try {
      return operation();
    } catch (error) {
      this.store = snapshot;
      throw error;
    }
  }

  private requireIndex(context: RepositoryContext, id: string): number {
    const index = this.store.opportunities.findIndex((item) => item.id === id && belongsTo(item, context));
    if (index < 0) throw new Error(`Opportunity ${id} not found for current user/workspace`);
    return index;
  }

  private visible<T>(items: T[], context: RepositoryContext): T[] {
    return items.filter((item) => belongsTo(item as T & { userId?: string; workspaceId?: string }, context));
  }

  private log(context: RepositoryContext, actor: string, action: string, entityType: ActivityLog["entityType"], entityId: string, metadata?: Record<string, unknown>): ActivityLog {
    const activity = stampOwnership({ id: `act-${Date.now()}-${this.store.activityLogs.length}`, actor, action, entityType, entityId, createdAt: nowIso(), metadata }, context);
    this.store.activityLogs.unshift(activity);
    return clone(activity);
  }
}

export class SupabaseRepositoryUnavailable implements OpportunityRepository {
  constructor(private readonly reason = "Supabase adapter requires server-side configuration before production use.") {}
  private unavailable(): never {
    throw new Error(this.reason);
  }
  async listOpportunities(): Promise<Opportunity[]> { return this.unavailable(); }
  async getOpportunity(): Promise<Opportunity | null> { return this.unavailable(); }
  async upsertOpportunities(): Promise<void> { return this.unavailable(); }
  async updateOpportunity(): Promise<Opportunity> { return this.unavailable(); }
  async changeSubmissionStatus(): Promise<{ opportunity: Opportunity; history: SubmissionHistory | null; activity: ActivityLog }> { return this.unavailable(); }
  async verifyOpportunity(): Promise<{ opportunity: Opportunity; event: VerificationEvent; activity: ActivityLog }> { return this.unavailable(); }
  async listSubmissionHistory(): Promise<SubmissionHistory[]> { return this.unavailable(); }
  async listVerificationEvents(): Promise<VerificationEvent[]> { return this.unavailable(); }
  async listActivityLogs(): Promise<ActivityLog[]> { return this.unavailable(); }
  async listReminders(): Promise<StoredReminder[]> { return this.unavailable(); }
  async replaceReminders(): Promise<void> { return this.unavailable(); }
  async getSettings(): Promise<AppSettings> { return this.unavailable(); }
  async saveSettings(): Promise<AppSettings> { return this.unavailable(); }
}

export function defaultSettings(context: RepositoryContext): AppSettings {
  const createdAt = nowIso();
  return {
    id: `settings-${context.workspaceId ?? context.userId}`,
    userId: context.userId,
    workspaceId: context.workspaceId,
    timezone: "Australia/Sydney",
    staleThresholdDays: 30,
    urgentStaleThresholdDays: 7,
    urgentDeadlineWindowDays: 30,
    reminderOffsets: ["T-30 days", "T-14 days", "T-7 days", "T-3 days", "T-24 hours"],
    emailNotificationsEnabled: false,
    createdAt,
    updatedAt: createdAt
  };
}

function belongsTo(item: { userId?: string; workspaceId?: string }, context: RepositoryContext): boolean {
  if (context.workspaceId) return item.workspaceId === context.workspaceId;
  return item.userId === context.userId && !item.workspaceId;
}

function stampOwnership<T extends object>(item: T, context: RepositoryContext): T & RepositoryContext {
  return { ...item, userId: context.userId, workspaceId: context.workspaceId };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}
