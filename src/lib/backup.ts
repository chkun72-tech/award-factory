import type { AppSettings, Opportunity, StoredReminder, SubmissionHistory, VerificationEvent } from "../types";

export interface AwardFactoryBackupV1 {
  version: 1;
  exportedAt: string;
  projects: unknown[];
  opportunities: Opportunity[];
  scores: Opportunity["score"][];
  matches: { opportunityId: string; projectId: string }[];
  verificationHistory: VerificationEvent[];
  submissionStatusHistory: SubmissionHistory[];
  reminders: StoredReminder[];
  settings: AppSettings;
}

export function exportBackup(input: Omit<AwardFactoryBackupV1, "version" | "exportedAt" | "scores" | "matches"> & { exportedAt?: string }): AwardFactoryBackupV1 {
  return {
    version: 1,
    exportedAt: input.exportedAt ?? new Date().toISOString(),
    projects: input.projects,
    opportunities: input.opportunities,
    scores: input.opportunities.map((opportunity) => opportunity.score),
    matches: input.opportunities.map((opportunity) => ({ opportunityId: opportunity.id, projectId: opportunity.matchedProjectId })),
    verificationHistory: input.verificationHistory,
    submissionStatusHistory: input.submissionStatusHistory,
    reminders: input.reminders,
    settings: input.settings
  };
}

export function previewRestoreBackup(backup: AwardFactoryBackupV1, existingOpportunityIds = new Set<string>()) {
  if (backup.version !== 1) throw new Error(`Unsupported backup version ${backup.version}`);
  const create = backup.opportunities.filter((opportunity) => !existingOpportunityIds.has(opportunity.id)).length;
  const update = backup.opportunities.length - create;
  return {
    version: backup.version,
    create,
    update,
    skip: 0,
    error: 0,
    opportunities: backup.opportunities.length,
    reminders: backup.reminders.length,
    verificationHistory: backup.verificationHistory.length,
    submissionStatusHistory: backup.submissionStatusHistory.length
  };
}
