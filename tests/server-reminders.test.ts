import { describe, expect, it } from "vitest";
import { opportunities } from "../src/data/seed";
import { defaultSettings } from "../src/lib/repository";
import { generateServerReminders } from "../src/lib/serverReminders";

describe("server-side reminders", () => {
  it("is idempotent and avoids closed paused skip expired opportunities", () => {
    const context = { userId: "a" };
    const settings = defaultSettings(context);
    const future = { ...opportunities[0], normalizedDeadlineUtc: "2026-12-31T13:00:00.000Z", pipelineStatus: "Open" as const, version: 1 };
    const closed = { ...opportunities[1], normalizedDeadlineUtc: "2026-12-31T13:00:00.000Z", pipelineStatus: "Closed" as const };
    const expired = { ...opportunities[2], normalizedDeadlineUtc: "2025-01-01T00:00:00.000Z", pipelineStatus: "Open" as const };
    const first = generateServerReminders({ context, opportunities: [future, closed, expired], existing: [], settings, now: new Date("2026-01-01T00:00:00.000Z") });
    const second = generateServerReminders({ context, opportunities: [future, closed, expired], existing: first, settings, now: new Date("2026-01-01T00:00:00.000Z") });
    expect(first).toHaveLength(5);
    expect(new Set(second.map((item) => item.idempotencyKey)).size).toBe(second.length);
    expect(second.filter((item) => item.status === "pending")).toHaveLength(5);
  });

  it("supersedes old reminders when a deadline changes", () => {
    const context = { userId: "a" };
    const settings = defaultSettings(context);
    const oldDeadline = { ...opportunities[0], normalizedDeadlineUtc: "2026-10-01T00:00:00.000Z", pipelineStatus: "Open" as const, version: 1 };
    const existing = generateServerReminders({ context, opportunities: [oldDeadline], existing: [], settings, now: new Date("2026-01-01T00:00:00.000Z") });
    const newDeadline = { ...oldDeadline, normalizedDeadlineUtc: "2026-12-01T00:00:00.000Z", version: 2 };
    const regenerated = generateServerReminders({ context, opportunities: [newDeadline], existing, settings, now: new Date("2026-01-02T00:00:00.000Z") });
    expect(regenerated.filter((item) => item.status === "superseded")).toHaveLength(5);
    expect(regenerated.filter((item) => item.status === "pending" && item.deadlineUtc === "2026-12-01T00:00:00.000Z")).toHaveLength(5);
  });
});
