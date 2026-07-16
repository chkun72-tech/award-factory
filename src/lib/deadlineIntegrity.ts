import type { DeadlineOverrideEvent, Opportunity } from "../types";

export function withDeadlineIntegrity(opportunity: Opportunity): Opportunity {
  const deadlineTimezone = opportunity.deadlineTimezone ?? opportunity.timezone ?? "Australia/Sydney";
  const normalized = opportunity.normalizedDeadlineUtc;
  return {
    ...opportunity,
    deadlineTimezone,
    deadlineParseStatus: normalized ? (opportunity.deadlineParseStatus ?? "parsed") : (opportunity.rawDeadlineText?.trim() ? "unparseable" : "not_provided"),
    deadlineParseNote: opportunity.deadlineParseNote ?? (normalized ? "System-calculated from raw deadline text." : "No normalized deadline was produced.")
  };
}

export function overrideNormalizedDeadline(params: {
  opportunity: Opportunity;
  newValue: string | null;
  reason: string;
  changedBy: string;
  changedAt?: Date;
}): { opportunity: Opportunity; event: DeadlineOverrideEvent } {
  if (!params.reason.trim()) throw new Error("Deadline override requires a non-empty reason");
  if (params.newValue && Number.isNaN(new Date(params.newValue).getTime())) throw new Error("Deadline override must be a valid UTC timestamp");
  const changedAt = params.changedAt ?? new Date();
  const event: DeadlineOverrideEvent = {
    id: `deadline-override-${params.opportunity.id}-${changedAt.getTime()}`,
    opportunityId: params.opportunity.id,
    previousValue: params.opportunity.normalizedDeadlineUtc,
    newValue: params.newValue,
    reason: params.reason.trim(),
    changedBy: params.changedBy,
    changedAt: changedAt.toISOString()
  };
  return {
    event,
    opportunity: {
      ...params.opportunity,
      normalizedDeadlineUtc: params.newValue,
      deadlineParseStatus: "manual_override",
      deadlineParseNote: params.reason.trim(),
      updatedAt: changedAt.toISOString(),
      version: (params.opportunity.version ?? 0) + 1
    }
  };
}
