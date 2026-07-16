import { describe, expect, it } from "vitest";
import { opportunities } from "../src/data/seed";
import { applyManualDecisionOverride, recalculateAutomaticDecisionPreservingOverride } from "../src/lib/decision";
import { overrideNormalizedDeadline, withDeadlineIntegrity } from "../src/lib/deadlineIntegrity";

describe("decision and deadline integrity", () => {
  it("requires a reason for manual decision override", () => {
    expect(() => applyManualDecisionOverride({ opportunity: opportunities[0], decision: "PRIORITY", reason: " ", changedBy: "tester" })).toThrow(/reason/i);
  });

  it("preserves manual override after automatic score recalculation", () => {
    const manual = applyManualDecisionOverride({ opportunity: { ...opportunities[0], eligibilityStatus: "Eligible" }, decision: "PRIORITY", reason: "strategic fit", changedBy: "tester" });
    const recalculated = recalculateAutomaticDecisionPreservingOverride({ ...manual, score: { projectFit: 0, prizeBusinessValue: 0, winability: 0, reusability: 0, deadlineReadiness: 0, exposure: 0, ease: 0 } });
    expect(recalculated.automaticDecision).toBe("SKIP");
    expect(recalculated.decision).toBe("PRIORITY");
  });

  it("keeps deadline parse metadata and records manual override", () => {
    const normalized = withDeadlineIntegrity(opportunities[0]);
    expect(normalized.deadlineTimezone).toBeTruthy();
    const { opportunity, event } = overrideNormalizedDeadline({ opportunity: normalized, newValue: "2026-12-31T13:00:00.000Z", reason: "official page changed", changedBy: "tester" });
    expect(opportunity.deadlineParseStatus).toBe("manual_override");
    expect(event.previousValue).toBe(normalized.normalizedDeadlineUtc);
    expect(event.newValue).toBe("2026-12-31T13:00:00.000Z");
  });
});
