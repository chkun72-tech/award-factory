import type { Decision, Opportunity, ScoreBreakdown } from "../types";
import { decideOpportunity, totalScore } from "./scoring";

export function effectiveDecision(opportunity: Pick<Opportunity, "automaticDecision" | "manualDecisionOverride" | "decision">): Decision {
  return opportunity.manualDecisionOverride ?? opportunity.automaticDecision ?? opportunity.decision;
}

export function applyManualDecisionOverride(params: {
  opportunity: Opportunity;
  decision: Decision;
  reason: string;
  changedBy: string;
  changedAt?: Date;
}): Opportunity {
  if (!params.reason.trim()) throw new Error("Manual decision override requires a non-empty reason");
  const changedAt = params.changedAt ?? new Date();
  return {
    ...params.opportunity,
    manualDecisionOverride: params.decision,
    manualOverrideReason: params.reason.trim(),
    manualOverrideBy: params.changedBy,
    manualOverrideAt: changedAt.toISOString(),
    decisionOverride: params.decision,
    overrideReason: params.reason.trim(),
    decision: params.decision
  };
}

export function recalculateAutomaticDecisionPreservingOverride(opportunity: Opportunity, score?: ScoreBreakdown, now = new Date()): Opportunity {
  const nextScore = score ?? opportunity.score;
  const automaticDecision = decideOpportunity({
    score: nextScore,
    deadlineUtc: opportunity.normalizedDeadlineUtc,
    eligibilityStatus: opportunity.eligibilityStatus,
    pipelineStatus: opportunity.pipelineStatus,
    now
  });
  return {
    ...opportunity,
    score: nextScore,
    automaticDecision,
    decision: opportunity.manualDecisionOverride ?? automaticDecision
  };
}

export function decisionSummary(opportunity: Opportunity): { automatic: Decision; manual: Decision | null; effective: Decision; totalScore: number } {
  const automatic = opportunity.automaticDecision ?? opportunity.decision;
  const manual = opportunity.manualDecisionOverride ?? null;
  return { automatic, manual, effective: manual ?? automatic, totalScore: totalScore(opportunity.score) };
}
