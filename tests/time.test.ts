import { describe, expect, it } from "vitest";
import { daysUntil, formatSydney } from "../src/lib/time";

describe("timezone helpers", () => {
  it("formats UTC dates in Australia/Sydney", () => {
    expect(formatSydney("2026-07-21T00:00:00.000Z")).toContain("AEST");
  });

  it("handles rolling and past deadlines", () => {
    expect(formatSydney(null)).toBe("Rolling / TBC");
    expect(daysUntil("2026-07-10T00:00:00.000Z", new Date("2026-07-12T00:00:00.000Z"))).toBe(-2);
  });
});
