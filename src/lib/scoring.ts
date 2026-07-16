import type { Decision, EligibilityStatus, Opportunity, PipelineStatus, ScoreBreakdown } from "../types";

export const SCORE_LIMITS = {
  projectFit: 25,
  prizeBusinessValue: 20,
  winability: 15,
  reusability: 15,
  deadlineReadiness: 10,
  exposure: 10,
  ease: 5
} as const;

export function clampScore(score: ScoreBreakdown): ScoreBreakdown {
  return {
    projectFit: clamp(score.projectFit, SCORE_LIMITS.projectFit),
    prizeBusinessValue: clamp(score.prizeBusinessValue, SCORE_LIMITS.prizeBusinessValue),
    winability: clamp(score.winability, SCORE_LIMITS.winability),
    reusability: clamp(score.reusability, SCORE_LIMITS.reusability),
    deadlineReadiness: clamp(score.deadlineReadiness, SCORE_LIMITS.deadlineReadiness),
    exposure: clamp(score.exposure, SCORE_LIMITS.exposure),
    ease: clamp(score.ease, SCORE_LIMITS.ease)
  };
}

export function totalScore(score: ScoreBreakdown): number {
  const safe = clampScore(score);
  return Object.values(safe).reduce((sum, value) => sum + value, 0);
}

export function decideOpportunity(input: {
  score: ScoreBreakdown;
  deadlineUtc: string | null;
  eligibilityStatus: EligibilityStatus;
  pipelineStatus: PipelineStatus;
  now?: Date;
  decisionOverride?: Decision;
  overrideReason?: string;
}): Decision {
  if (input.decisionOverride) {
    if (!input.overrideReason?.trim()) throw new Error("Manual override requires override reason");
    return input.decisionOverride;
  }
  if (input.pipelineStatus === "Closed") return "CLOSED";
  if (input.pipelineStatus === "Paused") return "PAUSED";
  if (input.eligibilityStatus === "Likely ineligible") return "SKIP";
  if (input.eligibilityStatus === "Unclear") return "VERIFY";

  const score = totalScore(input.score);
  if (input.deadlineUtc && isWithinDays(input.deadlineUtc, 7, input.now) && score >= 65) return "URGENT";
  if (score >= 80) return "PRIORITY";
  if (score >= 65) return "APPLY IF CAPACITY";
  if (score >= 50) return "WATCH";
  return "SKIP";
}

export function recalculateOpportunity(opportunity: Opportunity, now = new Date()): Opportunity {
  const decision = decideOpportunity({
    score: opportunity.score,
    deadlineUtc: opportunity.normalizedDeadlineUtc,
    eligibilityStatus: opportunity.eligibilityStatus,
    pipelineStatus: opportunity.pipelineStatus,
    decisionOverride: opportunity.decisionOverride,
    overrideReason: opportunity.overrideReason,
    now
  });
  return { ...opportunity, score: clampScore(opportunity.score), decision };
}

function clamp(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(max, Math.round(value)));
}

function isWithinDays(deadlineUtc: string, days: number, now = new Date()): boolean {
  const deadline = new Date(deadlineUtc);
  if (Number.isNaN(deadline.getTime())) return false;
  const diff = deadline.getTime() - now.getTime();
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}
