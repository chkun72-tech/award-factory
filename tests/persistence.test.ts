import { describe, expect, it } from "vitest";
import { opportunities } from "../src/data/seed";
import { InMemoryRepository, OptimisticConcurrencyError } from "../src/lib/repository";

describe("production persistence repository", () => {
  it("isolates opportunities by user", async () => {
    const repo = new InMemoryRepository();
    await repo.upsertOpportunities({ userId: "a" }, [opportunities[0]]);
    expect(await repo.listOpportunities({ userId: "a" })).toHaveLength(1);
    expect(await repo.listOpportunities({ userId: "b" })).toHaveLength(0);
  });

  it("detects optimistic concurrency conflicts", async () => {
    const repo = new InMemoryRepository();
    await repo.upsertOpportunities({ userId: "a" }, [opportunities[0]]);
    const first = await repo.getOpportunity({ userId: "a" }, opportunities[0].id);
    const second = await repo.getOpportunity({ userId: "a" }, opportunities[0].id);
    if (!first || !second) throw new Error("seed missing");
    await repo.updateOpportunity({ userId: "a" }, { ...first, notes: "first" }, first.version);
    await expect(repo.updateOpportunity({ userId: "a" }, { ...second, notes: "second" }, second.version)).rejects.toBeInstanceOf(OptimisticConcurrencyError);
  });

  it("persists settings defaults and updates", async () => {
    const repo = new InMemoryRepository();
    const settings = await repo.getSettings({ userId: "a" });
    expect(settings.staleThresholdDays).toBe(30);
    const saved = await repo.saveSettings({ userId: "a" }, { ...settings, staleThresholdDays: 45 });
    expect(saved.staleThresholdDays).toBe(45);
    expect((await repo.getSettings({ userId: "a" })).staleThresholdDays).toBe(45);
  });
});
