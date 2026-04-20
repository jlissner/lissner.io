import Database from "better-sqlite3";
import { mkdtemp, readFile, unlink, writeFile } from "fs/promises";
import os from "os";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./sync-client.js", () => {
  return {
    getS3Config: vi.fn(() => ({ configured: true, missingVars: [] as string[] })),
    createS3Client: vi.fn(() => ({
      send: vi.fn(async () => ({ Body: { mocked: true } })),
    })),
  };
});

vi.mock("./sync-transfer.js", () => {
  return {
    listAllS3Keys: vi.fn(async () => new Set<string>()),
    downloadS3ObjectToFile: vi.fn(async (_body: unknown, targetPath: string) => {
      await writeFile(targetPath, "not-a-db");
    }),
  };
});

vi.mock("../config/paths.js", async () => {
  const realPath = await import("path");
  const tempRoot = await mkdtemp(realPath.default.join(os.tmpdir(), "fim-startup-restore-"));
  return {
    dbDir: realPath.default.join(tempRoot, "db"),
    dbPath: realPath.default.join(tempRoot, "db", "media.db"),
  };
});

describe("maybeRestoreDbFromLatestS3BackupOnStartup", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.S3_BUCKET = "test-bucket";
    process.env.AWS_ACCESS_KEY_ID = "x";
    process.env.AWS_SECRET_ACCESS_KEY = "y";
    process.env.AWS_REGION = "us-test-1";
  });
  beforeEach(async () => {
    const { dbPath } = await import("../config/paths.js");
    await unlink(dbPath).catch(() => {});
  });
  beforeEach(async () => {
    const { createS3Client, getS3Config } = await import("./sync-client.js");
    (getS3Config as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      configured: true,
      missingVars: [],
    });
    (createS3Client as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      send: vi.fn(async () => ({ Body: { mocked: true } })),
    });
  });
  beforeEach(async () => {
    const { downloadS3ObjectToFile, listAllS3Keys } = await import("./sync-transfer.js");
    (listAllS3Keys as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(new Set<string>());
    (downloadS3ObjectToFile as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async (_body: unknown, targetPath: string) => {
        await writeFile(targetPath, "not-a-db");
      }
    );
  });

  it("continues when no DB backups exist", async () => {
    const mod = await import("./startup-db-restore.js");
    const res = await mod.maybeRestoreDbFromLatestS3BackupOnStartup();
    expect(res).toEqual({ restored: false, reason: "no_backups" });
  });

  it("uses the newest backup key when local DB is missing", async () => {
    const { listAllS3Keys, downloadS3ObjectToFile } = await import("./sync-transfer.js");
    const keys = new Set([
      "backup/db/media_2026-01-01T00-00-00-000Z.db",
      "backup/db/media_2026-02-01T00-00-00-000Z.db",
    ]);
    (listAllS3Keys as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(keys);

    const mod = await import("./startup-db-restore.js");

    // Make the mocked download write a valid sqlite file
    (downloadS3ObjectToFile as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async (_body: unknown, targetPath: string) => {
        const db = new Database(targetPath);
        db.exec("CREATE TABLE IF NOT EXISTS media(id TEXT PRIMARY KEY);");
        db.close();
      }
    );

    const res = await mod.maybeRestoreDbFromLatestS3BackupOnStartup();
    expect(res.restored).toBe(true);
    if (res.restored) expect(res.key).toBe("backup/db/media_2026-02-01T00-00-00-000Z.db");

    const { dbPath } = await import("../config/paths.js");
    const content = await readFile(dbPath);
    expect(content.length).toBeGreaterThan(0);
  });

  it("is skipped when S3 backup is not configured", async () => {
    const { getS3Config } = await import("./sync-client.js");
    (getS3Config as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      configured: false,
      missingVars: ["S3_BUCKET"],
    });

    const mod = await import("./startup-db-restore.js");
    const res = await mod.maybeRestoreDbFromLatestS3BackupOnStartup();
    expect(res).toEqual({ restored: false, reason: "not_configured" });
  });

  it("falls back when downloaded DB is invalid", async () => {
    const { listAllS3Keys } = await import("./sync-transfer.js");
    (listAllS3Keys as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Set(["backup/db/media_2026-02-01T00-00-00-000Z.db"])
    );

    const mod = await import("./startup-db-restore.js");
    const res = await mod.maybeRestoreDbFromLatestS3BackupOnStartup();
    expect(res).toEqual({ restored: false, reason: "invalid_db" });

    const { dbPath } = await import("../config/paths.js");
    const exists = await readFile(dbPath).then(
      () => true,
      () => false
    );
    expect(exists).toBe(false);
  });
});
