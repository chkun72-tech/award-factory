import type { AppSettings, Opportunity, StoredReminder } from "../types";
import type { RepositoryContext } from "./repository";

const OFFSET_DAYS: Record<string, number> = {
  "T-30 days": 30,
  "T-14 days": 14,
  "T-7 days": 7,
  "T-3 days": 3,
  "T-24 hours": 1
};

export function generateServerReminders(params: {
  context: RepositoryContext;
  opportunities: Opportunity[];
  existing: StoredReminder[];
  settings: AppSettings;
  now?: Date;
}): StoredReminder[] {
  const now = params.now ?? new Date();
  const active: StoredReminder[] = params.existing.map((reminder) => ({ ...reminder, status: reminder.status === "sent" ? "sent" : "superseded", updatedAt: now.toISOString() }));
  const byKey = new Map(active.map((reminder) => [reminder.idempotencyKey, reminder]));

  for (const opportunity of params.opportunities) {
    if (["Closed", "Paused", "Skip"].includes(opportunity.pipelineStatus)) continue;
    const deadlineUtc = opportunity.normalizedDeadlineUtc;
    if (!deadlineUtc) continue;
    const deadline = new Date(deadlineUtc);
    if (Number.isNaN(deadline.getTime()) || deadline.getTime() < now.getTime()) continue;
    const version = opportunity.version ?? 1;

    for (const offsetKey of params.settings.reminderOffsets) {
      const days = OFFSET_DAYS[offsetKey];
      if (!days) continue;
      const idempotencyKey = [
        params.context.workspaceId ?? params.context.userId,
        opportunity.id,
        "final",
        deadline.toISOString(),
        version,
        offsetKey
      ].join("|");
      const existing = byKey.get(idempotencyKey);
      byKey.set(idempotencyKey, {
        id: existing?.id ?? `rem-${hashKey(idempotencyKey)}`,
        userId: params.context.userId,
        workspaceId: params.context.workspaceId,
        opportunityId: opportunity.id,
        deadlineType: "final",
        deadlineUtc: deadline.toISOString(),
        offsetKey,
        remindAtUtc: new Date(deadline.getTime() - days * 24 * 60 * 60 * 1000).toISOString(),
        idempotencyKey,
        status: existing?.status === "sent" ? "sent" : "pending",
        createdAt: existing?.createdAt ?? now.toISOString(),
        updatedAt: now.toISOString()
      });
    }
  }

  return [...byKey.values()].sort((a, b) => a.remindAtUtc.localeCompare(b.remindAtUtc));
}

function hashKey(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  return Math.abs(hash).toString(36);
}
