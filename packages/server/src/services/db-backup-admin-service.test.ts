import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../s3/sync-transfer.js", () => ({
  listS3ObjectsWithMetadata: vi.fn(),
  downloadS3ObjectToFile: vi.fn(),
}));

vi.mock("../logger.js", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { listS3ObjectsWithMetadata } from "../s3/sync-transfer.js";
import { listDbBackupsForAdmin } from "./db-backup-admin-service.js";

describe("listDbBackupsForAdmin", () => {
  beforeEach(() => {
    vi.mocked(listS3ObjectsWithMetadata).mockReset();
  });

  it("returns dump objects sorted by key", async () => {
    vi.mocked(listS3ObjectsWithMetadata).mockResolvedValue([
      {
        key: "backup/db/z.dump",
        size: 2,
        lastModified: "2026-02-01T00:00:00.000Z",
      },
      {
        key: "backup/db/a.dump",
        size: 1,
        lastModified: "2026-01-01T00:00:00.000Z",
      },
      {
        key: "backup/db/notes.txt",
        size: 3,
        lastModified: "2026-03-01T00:00:00.000Z",
      },
    ]);

    const result = await listDbBackupsForAdmin();
    expect(result).toEqual({
      ok: true,
      backups: [
        {
          key: "backup/db/a.dump",
          size: 1,
          lastModified: "2026-01-01T00:00:00.000Z",
        },
        {
          key: "backup/db/z.dump",
          size: 2,
          lastModified: "2026-02-01T00:00:00.000Z",
        },
      ],
    });
  });

  it("returns list_failed when S3 listing throws", async () => {
    vi.mocked(listS3ObjectsWithMetadata).mockRejectedValue(
      new Error("PermanentRedirect"),
    );

    await expect(listDbBackupsForAdmin()).resolves.toEqual({
      ok: false,
      reason: "list_failed",
    });
  });
});
