import { describe, expect, it } from "vitest";
import { opportunities } from "../src/data/seed";
import { exportBackup, previewRestoreBackup } from "../src/lib/backup";
import { applyLocalStorageMigration, previewLocalStorageMigration } from "../src/lib/localStorageMigration";
import { defaultSettings, InMemoryRepository } from "../src/lib/repository";

describe("localStorage migration and backup", () => {
  it("previews and applies browser data migration idempotently", async () => {
    const repo = new InMemoryRepository();
    const rawLocalStorageState = JSON.stringify({ opportunities: [opportunities[0]] });
    const preview = await previewLocalStorageMigration({ context: { userId: "a" }, repository: repo, rawLocalStorageState });
    expect(preview.create).toHaveLength(1);
    expect(preview.backupJson).toContain(opportunities[0].id);
    await applyLocalStorageMigration({ context: { userId: "a" }, repository: repo, plan: preview });
    const second = await previewLocalStorageMigration({ context: { userId: "a" }, repository: repo, rawLocalStorageState });
    expect(second.create).toHaveLength(0);
    expect(second.update).toHaveLength(0);
    expect(second.skip).toHaveLength(1);
  });

  it("exports a versioned backup and supports preview-only restore counts", () => {
    const backup = exportBackup({
      projects: [],
      opportunities: opportunities.slice(0, 2),
      verificationHistory: [],
      submissionStatusHistory: [],
      reminders: [],
      settings: defaultSettings({ userId: "a" }),
      exportedAt: "2026-07-14T00:00:00.000Z"
    });
    expect(backup.version).toBe(1);
    expect(previewRestoreBackup(backup, new Set())).toMatchObject({ create: 2, update: 0, error: 0 });
    expect(previewRestoreBackup(backup, new Set([opportunities[0].id]))).toMatchObject({ create: 1, update: 1, error: 0 });
  });
});
