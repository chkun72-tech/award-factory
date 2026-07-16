import { describe, expect, it } from "vitest";
import { buildReminders, dueReminders } from "../src/lib/reminders";
import { opportunities } from "../src/data/seed";

describe("deadline reminders", () => {
  it("builds five reminder offsets without duplicates", () => {
    const reminders = buildReminders(opportunities[2]);
    expect(reminders).toHaveLength(5);
    expect(new Set(reminders.map((item) => item.id)).size).toBe(5);
  });

  it("does not resend already sent reminders", () => {
    const reminders = buildReminders(opportunities[2]);
    const due = dueReminders([opportunities[2]], new Set([reminders[0].id]), new Date("2026-07-20T00:00:00.000Z"));
    expect(due.some((item) => item.id === reminders[0].id)).toBe(false);
  });
});
