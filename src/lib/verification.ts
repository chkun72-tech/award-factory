import type { Opportunity, VerificationEvent, VerificationStatus } from "../types";

export interface StaleConfig {
  defaultDays: number;
  urgentDays: number;
  urgentDeadlineWindowDays: number;
}

export const defaultStaleConfig: StaleConfig = {
  defaultDays: 30,
  urgentDays: 7,
  urgentDeadlineWindowDays: 30
};

export const verificationStatuses: VerificationStatus[] = ["Unverified", "Needs Review", "Verified", "Stale", "Invalid", "Closed"];

export function createVerificationEvent(params: {
  opportunity: Opportunity;
  newStatus: VerificationStatus;
  verifiedBy: string;
  verifiedAt?: Date;
  changedFields?: string[];
  note: string;
}): VerificationEvent {
  const verifiedAt = params.verifiedAt ?? new Date();
  return {
    id: `ver-${verifiedAt.getTime()}`,
    opportunityId: params.opportunity.id,
    previousStatus: params.opportunity.verificationStatus,
    newStatus: params.newStatus,
    verifiedBy: params.verifiedBy,
    verifiedAt: verifiedAt.toISOString(),
    sourceUrl: params.opportunity.sourceUrl,
    changedFields: [...new Set(params.changedFields ?? [])],
    note: params.note
  };
}

export function applyVerificationStatus(opportunity: Opportunity, event: VerificationEvent): Opportunity {
  return {
    ...opportunity,
    verificationStatus: event.newStatus,
    verifiedAt: event.verifiedAt
  };
}

export function staleThresholdDays(opportunity: Opportunity, config: StaleConfig = defaultStaleConfig, now = new Date()): number {
  const days = daysUntilDeadline(opportunity, now);
  return days !== null && days >= 0 && days <= config.urgentDeadlineWindowDays ? config.urgentDays : config.defaultDays;
}

export function isVerificationStale(opportunity: Opportunity, config: StaleConfig = defaultStaleConfig, now = new Date()): boolean {
  if (opportunity.verificationStatus !== "Verified" || !opportunity.verifiedAt) return false;
  const verifiedAt = new Date(opportunity.verifiedAt);
  if (Number.isNaN(verifiedAt.getTime())) return true;
  const ageDays = Math.floor((now.getTime() - verifiedAt.getTime()) / (24 * 60 * 60 * 1000));
  return ageDays > staleThresholdDays(opportunity, config, now);
}

export function staleWarning(opportunity: Opportunity, config: StaleConfig = defaultStaleConfig, now = new Date()): string | null {
  if (!isVerificationStale(opportunity, config, now)) return null;
  const threshold = staleThresholdDays(opportunity, config, now);
  return `查證已超過 ${threshold} 天。獎金、資格與截止資訊不可默認為最新，請重新查證官方來源。`;
}

function daysUntilDeadline(opportunity: Opportunity, now: Date): number | null {
  if (!opportunity.normalizedDeadlineUtc) return null;
  const deadline = new Date(opportunity.normalizedDeadlineUtc);
  if (Number.isNaN(deadline.getTime())) return null;
  return Math.ceil((deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}
