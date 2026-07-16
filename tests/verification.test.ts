import { describe, expect, it } from "vitest";
import { opportunities } from "../src/data/seed";
import { changeSubmissionStatusApi, verifyOpportunityApi } from "../src/lib/api";
import { isVerificationStale, staleThresholdDays, staleWarning } from "../src/lib/verification";

describe("verification and stale-data workflow", () => {
  it("records previous/new status, actor, timestamp, source URL, fields, and note", () => {
    const result = verifyOpportunityApi({
      opportunity: opportunities[0],
      newStatus: "Verified",
      verifiedBy: "Tester",
      verifiedAt: new Date("2026-07-14T00:00:00.000Z"),
      changedFields: ["prizeFunding", "eligibility"],
      note: "Official source checked"
    });

    expect(result.opportunity.verificationStatus).toBe("Verified");
    expect(result.event).toMatchObject({
      opportunityId: opportunities[0].id,
      previousStatus: "Needs Review",
      newStatus: "Verified",
      verifiedBy: "Tester",
      verifiedAt: "2026-07-14T00:00:00.000Z",
      sourceUrl: opportunities[0].sourceUrl,
      changedFields: ["prizeFunding", "eligibility"],
      note: "Official source checked"
    });
  });

  it("uses shorter stale threshold for deadlines inside 30 days", () => {
    const opportunity = {
      ...opportunities[2],
      verificationStatus: "Verified" as const,
      verifiedAt: "2026-07-01T00:00:00.000Z",
      normalizedDeadlineUtc: "2026-07-20T00:00:00.000Z"
    };
    const now = new Date("2026-07-14T00:00:00.000Z");

    expect(staleThresholdDays(opportunity, undefined, now)).toBe(7);
    expect(isVerificationStale(opportunity, undefined, now)).toBe(true);
    expect(staleWarning(opportunity, undefined, now)).toContain("不可默認為最新");
  });
});

describe("submission status history API", () => {
  it("records previous/new status, actor, time, and note", () => {
    const result = changeSubmissionStatusApi({
      opportunity: opportunities[0],
      newStatus: "Registered",
      changedBy: "Tester",
      changedAt: new Date("2026-07-14T01:00:00.000Z"),
      note: "Registered on source site"
    });

    expect(result.opportunity.pipelineStatus).toBe("Registered");
    expect(result.history).toMatchObject({
      opportunityId: opportunities[0].id,
      previousStatus: "Open",
      newStatus: "Registered",
      changedBy: "Tester",
      changedAt: "2026-07-14T01:00:00.000Z",
      note: "Registered on source site"
    });
  });
});
