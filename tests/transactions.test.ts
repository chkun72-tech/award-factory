import { describe, expect, it } from "vitest";
import { opportunities } from "../src/data/seed";
import { InMemoryRepository } from "../src/lib/repository";

describe("transactional history", () => {
  it("commits status update, status history and activity together", async () => {
    const repo = new InMemoryRepository();
    await repo.upsertOpportunities({ userId: "a" }, [opportunities[0]]);
    await repo.changeSubmissionStatus({ userId: "a" }, { id: opportunities[0].id, newStatus: "Building", changedBy: "tester", note: "move" });
    expect((await repo.getOpportunity({ userId: "a" }, opportunities[0].id))?.pipelineStatus).toBe("Building");
    expect(await repo.listSubmissionHistory({ userId: "a" })).toHaveLength(1);
    expect(await repo.listActivityLogs({ userId: "a" })).toHaveLength(1);
  });

  it("rolls back status update when history write fails", async () => {
    const repo = new InMemoryRepository();
    await repo.upsertOpportunities({ userId: "a" }, [opportunities[0]]);
    await expect(repo.changeSubmissionStatus({ userId: "a" }, { id: opportunities[0].id, newStatus: "Submitted", changedBy: "tester", note: "fail", failHistoryWrite: true })).rejects.toThrow();
    expect((await repo.getOpportunity({ userId: "a" }, opportunities[0].id))?.pipelineStatus).toBe(opportunities[0].pipelineStatus);
    expect(await repo.listSubmissionHistory({ userId: "a" })).toHaveLength(0);
  });

  it("rolls back verification update when history write fails", async () => {
    const repo = new InMemoryRepository();
    await repo.upsertOpportunities({ userId: "a" }, [opportunities[0]]);
    await expect(repo.verifyOpportunity({ userId: "a" }, { id: opportunities[0].id, newStatus: "Verified", verifiedBy: "tester", note: "fail", failHistoryWrite: true })).rejects.toThrow();
    expect((await repo.getOpportunity({ userId: "a" }, opportunities[0].id))?.verificationStatus).toBe(opportunities[0].verificationStatus);
    expect(await repo.listVerificationEvents({ userId: "a" })).toHaveLength(0);
  });
});
