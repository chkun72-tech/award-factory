import type { Opportunity, PipelineStatus, SubmissionHistory } from "../types";

export const submissionStatuses: PipelineStatus[] = ["Watch", "Open", "Registered", "Building", "Ready for QA", "Submitted", "Finalist", "Won", "Lost", "Closed", "Paused", "Skip"];

export function createSubmissionStatusHistory(params: {
  opportunity: Opportunity;
  newStatus: PipelineStatus;
  changedBy: string;
  changedAt?: Date;
  note: string;
}): SubmissionHistory | null {
  if (params.opportunity.pipelineStatus === params.newStatus) return null;
  const changedAt = params.changedAt ?? new Date();
  return {
    id: `hist-${changedAt.getTime()}`,
    opportunityId: params.opportunity.id,
    previousStatus: params.opportunity.pipelineStatus,
    newStatus: params.newStatus,
    changedBy: params.changedBy,
    changedAt: changedAt.toISOString(),
    note: params.note
  };
}
