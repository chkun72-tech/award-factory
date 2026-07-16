import type { Opportunity } from "../types";

export const REMINDER_OFFSETS = [
  { key: "T-30 days", days: 30 },
  { key: "T-14 days", days: 14 },
  { key: "T-7 days", days: 7 },
  { key: "T-3 days", days: 3 },
  { key: "T-24 hours", days: 1 }
] as const;

export interface Reminder {
  id: string;
  opportunityId: string;
  label: string;
  remindAtUtc: string;
  sentAt?: string;
}

export function buildReminders(opportunity: Opportunity): Reminder[] {
  if (["Closed", "Paused", "Skip"].includes(opportunity.pipelineStatus)) return [];
  if (!opportunity.normalizedDeadlineUtc) return [];
  const deadline = new Date(opportunity.normalizedDeadlineUtc);
  if (Number.isNaN(deadline.getTime())) return [];
  if (deadline.getTime() < Date.now()) return [];
  return REMINDER_OFFSETS.map((offset) => ({
    id: `${opportunity.id}-${offset.key}`,
    opportunityId: opportunity.id,
    label: offset.key,
    remindAtUtc: new Date(deadline.getTime() - offset.days * 24 * 60 * 60 * 1000).toISOString()
  }));
}

export function dueReminders(opportunities: Opportunity[], sentIds: Set<string>, now = new Date()): Reminder[] {
  const unique = new Map<string, Reminder>();
  opportunities
    .flatMap(buildReminders)
    .filter((reminder) => !sentIds.has(reminder.id) && new Date(reminder.remindAtUtc).getTime() <= now.getTime())
    .forEach((reminder) => unique.set(reminder.id, reminder));
  return [...unique.values()];
}
