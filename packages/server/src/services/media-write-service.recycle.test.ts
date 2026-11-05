import { beforeEach, describe, expect, it, vi } from "vitest";
import * as db from "../db/media.js";
import { resetMediaTestDb } from "../db/test-media-db.js";
import {
  deleteMediaItem,
  permanentlyDeleteMediaItem,
  restoreMediaItem,
} from "./media-write-service.js";

vi.mock("../s3/sync-schedule.js", () => ({
  scheduleBackupSyncAfterUpload: vi.fn(),
}));

vi.mock("../s3/sync-restore.js", () => ({
  deleteMediaFromS3: vi.fn(async () => undefined),
}));

vi.mock("../lib/fs-best-effort.js", () => ({
  unlinkBestEffort: vi.fn(async () => undefined),
}));

vi.mock("fs/promises", () => ({
  unlink: vi.fn(async () => undefined),
}));

describe("media soft-delete recycle bin", () => {
  beforeEach(async () => {
    await resetMediaTestDb();
    await db.insertMedia("m1", "m1.jpg", "photo.jpg", "image/jpeg", 100, 1);
  });

  it("soft-delete hides from gallery lists and keeps the row", async () => {
    const soft = await deleteMediaItem("m1", { userId: 1, isAdmin: false });
    expect(soft).toEqual({ ok: true });

    const row = await db.getMediaById("m1");
    expect(row?.deletedAt).toBeTruthy();
    expect(await db.getMediaCount()).toBe(0);
    expect(await db.listMediaPaginated(10, 0)).toEqual([]);
    expect(await db.getDeletedMediaCount()).toBe(1);
  });

  it("restore clears deleted_at and returns the item to the gallery", async () => {
    await deleteMediaItem("m1", { userId: 1, isAdmin: false });
    const restored = await restoreMediaItem("m1");
    expect(restored).toEqual({ ok: true });

    const row = await db.getMediaById("m1");
    expect(row?.deletedAt).toBeNull();
    expect(await db.getMediaCount()).toBe(1);
    expect(await db.getDeletedMediaCount()).toBe(0);
  });

  it("permanent delete removes the row", async () => {
    await deleteMediaItem("m1", { userId: 1, isAdmin: false });
    const purged = await permanentlyDeleteMediaItem("m1", {
      userId: 1,
      isAdmin: true,
    });
    expect(purged).toEqual({ ok: true });
    expect(await db.getMediaById("m1")).toBeUndefined();
    expect(await db.getDeletedMediaCount()).toBe(0);
  });
});
