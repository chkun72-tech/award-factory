import { describe, expect, it } from "vitest";
import { decideOpportunity, totalScore } from "../src/lib/scoring";
import type { ScoreBreakdown } from "../src/types";

const score = (total: number): ScoreBreakdown => ({
  projectFit: Math.min(25, total),
  prizeBusinessValue: Math.min(20, Math.max(0, total - 25)),
  winability: Math.min(15, Math.max(0, total - 45)),
  reusability: Math.min(15, Math.max(0, total - 60)),
  deadlineReadiness: Math.min(10, Math.max(0, total - 75)),
  exposure: Math.min(10, Math.max(0, total - 85)),
  ease: Math.min(5, Math.max(0, total - 95))
});

describe("scoring and decision rules", () => {
  it("calculates a 100 point model", () => {
    expect(totalScore(score(88))).toBe(88);
  });

  it("maps default score bands", () => {
    expect(decideOpportunity({ score: score(85), deadlineUtc: null, eligibilityStatus: "Eligible", pipelineStatus: "Open" })).toBe("PRIORITY");
    expect(decideOpportunity({ score: score(70), deadlineUtc: null, eligibilityStatus: "Eligible", pipelineStatus: "Open" })).toBe("APPLY IF CAPACITY");
    expect(decideOpportunity({ score: score(55), deadlineUtc: null, eligibilityStatus: "Eligible", pipelineStatus: "Open" })).toBe("WATCH");
    expect(decideOpportunity({ score: score(30), deadlineUtc: null, eligibilityStatus: "Eligible", pipelineStatus: "Open" })).toBe("SKIP");
  });

  it("promotes close qualifying deadlines to urgent", () => {
    expect(decideOpportunity({ score: score(70), deadlineUtc: "2026-07-15T00:00:00.000Z", eligibilityStatus: "Eligible", pipelineStatus: "Open", now: new Date("2026-07-12T00:00:00.000Z") })).toBe("URGENT");
  });

  it("handles unclear, ineligible, closed, paused, and override cases", () => {
    expect(decideOpportunity({ score: score(90), deadlineUtc: null, eligibilityStatus: "Unclear", pipelineStatus: "Open" })).toBe("VERIFY");
    expect(decideOpportunity({ score: score(90), deadlineUtc: null, eligibilityStatus: "Likely ineligible", pipelineStatus: "Open" })).toBe("SKIP");
    expect(decideOpportunity({ score: score(90), deadlineUtc: null, eligibilityStatus: "Eligible", pipelineStatus: "Closed" })).toBe("CLOSED");
    expect(decideOpportunity({ score: score(90), deadlineUtc: null, eligibilityStatus: "Eligible", pipelineStatus: "Paused" })).toBe("PAUSED");
    expect(decideOpportunity({ score: score(90), deadlineUtc: null, eligibilityStatus: "Eligible", pipelineStatus: "Open", decisionOverride: "WATCH", overrideReason: "Capacity limited" })).toBe("WATCH");
    expect(() => decideOpportunity({ score: score(90), deadlineUtc: null, eligibilityStatus: "Eligible", pipelineStatus: "Open", decisionOverride: "WATCH" })).toThrow("override reason");
  });
});
