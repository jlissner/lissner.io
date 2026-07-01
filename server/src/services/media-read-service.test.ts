import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/media.js", () => ({
  getMediaById: vi.fn(),
  updateMediaMimeType: vi.fn(),
}));

vi.mock("../config/paths.js", () => ({
  mediaDir: "/tmp/media",
  thumbnailsDir: "/tmp/thumbs",
}));

vi.mock("../s3/sync-restore.js", () => ({
  tryRestoreMediaFromBackup: vi.fn(),
  tryRestoreVideoThumbnailFromBackup: vi.fn(),
}));

vi.mock("fs/promises", () => ({
  access: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn(),
}));

vi.mock("../lib/effective-image.js", () => ({
  effectiveImageResponseMimeType: vi.fn(
    ({ mimeType }: { mimeType: string }) => mimeType,
  ),
  isEffectiveImageItem: vi.fn(),
  isPixelMotionPhotoExtension: vi.fn(() => false),
  sniffAndPersistMediaMime: vi.fn(),
}));

vi.mock("sharp", () => ({
  default: vi.fn(() => ({
    rotate: vi.fn().mockReturnValue({
      toBuffer: vi
        .fn()
        .mockRejectedValue(new Error("unsupported image format")),
    }),
  })),
}));

import * as db from "../db/media.js";
import { sniffAndPersistMediaMime } from "../lib/effective-image.js";
import { getMediaPreviewFile } from "./media-read-service.js";

const baseItem = {
  id: "m1",
  filename: "m1.bin",
  originalName: "doc.pdf",
  mimeType: "application/pdf",
  size: 1,
  uploadedAt: "2026-01-01T00:00:00.000Z",
};

describe("getMediaPreviewFile", () => {
  beforeEach(() => {
    vi.mocked(db.getMediaById).mockReset();
    vi.mocked(sniffAndPersistMediaMime).mockReset();
  });

  it("returns bad_type for non-image, non-video files", async () => {
    vi.mocked(db.getMediaById).mockReturnValue(baseItem);
    vi.mocked(sniffAndPersistMediaMime).mockResolvedValue({
      sniffed: null,
      persistedUpdate: false,
      mimeTypePreview: "application/pdf",
      mimeTypeForKind: "application/pdf",
    });

    await expect(getMediaPreviewFile("m1")).resolves.toEqual({
      ok: false,
      reason: "bad_type",
    });
  });

  it("returns preview_failed when Sharp cannot decode an image", async () => {
    vi.mocked(db.getMediaById).mockReturnValue({
      ...baseItem,
      originalName: "photo.heic",
      mimeType: "image/heic",
    });
    vi.mocked(sniffAndPersistMediaMime).mockResolvedValue({
      sniffed: null,
      persistedUpdate: false,
      mimeTypePreview: "image/heic",
      mimeTypeForKind: "image/heic",
    });

    await expect(getMediaPreviewFile("m1")).resolves.toEqual({
      ok: false,
      reason: "preview_failed",
    });
  });
});
