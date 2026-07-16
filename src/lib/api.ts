import type { Opportunity, PipelineStatus, VerificationStatus } from "../types";
import { applyVerificationStatus, createVerificationEvent } from "./verification";
import { createSubmissionStatusHistory } from "./workflow";

export function verifyOpportunityApi(params: {
  opportunity: Opportunity;
  newStatus: VerificationStatus;
  verifiedBy: string;
  note: string;
  changedFields?: string[];
  verifiedAt?: Date;
}) {
  const event = createVerificationEvent(params);
  return {
    opportunity: applyVerificationStatus(params.opportunity, event),
    event
  };
}

export function changeSubmissionStatusApi(params: {
  opportunity: Opportunity;
  newStatus: PipelineStatus;
  changedBy: string;
  note: string;
  changedAt?: Date;
}) {
  const history = createSubmissionStatusHistory(params);
  return {
    opportunity: { ...params.opportunity, pipelineStatus: params.newStatus },
    history
  };
}
