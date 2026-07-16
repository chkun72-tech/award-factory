import { describe, expect, it } from "vitest";
import { applyImport, parseCsv, planApplyImport, previewImport } from "../src/lib/importer";
import { opportunities } from "../src/data/seed";

describe("CSV/Excel import logic", () => {
  it("previews create, update, skip, and validation errors", () => {
    const rows = parseCsv(`name,organizer,type,sourceUrl,eligibilityStatus
New Award,Org,Award,https://example.com/new,Eligible
Duplicate New,Org,Award,https://example.com/new,Eligible
Existing,Org,Award,https://example.com/startup-pitch-sprint,Eligible
Bad,Org,Award,not-a-url,Eligible`);
    const preview = previewImport(rows, opportunities, "test.csv", new Date("2026-07-12T00:00:00.000Z"));
    expect(preview.create).toHaveLength(1);
    expect(preview.update).toHaveLength(1);
    expect(preview.skip).toHaveLength(1);
    expect(preview.errors).toHaveLength(1);
  });

  it("updates existing records instead of creating duplicates", () => {
    const preview = previewImport([{ name: "Updated Pitch", sourceUrl: "https://example.com/startup-pitch-sprint" }], opportunities, "test.csv");
    const next = applyImport(preview, opportunities);
    expect(next).toHaveLength(opportunities.length);
    expect(next.find((item) => item.sourceUrl === "https://example.com/startup-pitch-sprint")?.name).toBe("Updated Pitch");
  });

  it("counts unchanged re-import rows as skips instead of updates", () => {
    const rows = [{ id: "AF-100", name: "Acceptance Stable", sourceUrl: "https://example.com/stable", notes: "same" }];
    const first = planApplyImport(rows, [], "test.csv", new Date("2026-07-12T00:00:00.000Z"));
    const db = applyImport(first, []);
    const second = planApplyImport(rows, db, "test.csv", new Date("2026-07-12T00:01:00.000Z"));
    expect(second.job.createCount).toBe(0);
    expect(second.job.updateCount).toBe(0);
    expect(second.job.skipCount).toBe(1);
  });
});
