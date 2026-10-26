import { describe, expect, it } from "vitest";
import { buildSyncDoneProgress } from "./sync-progress.js";

describe("buildSyncDoneProgress", () => {
  it("mentions merged backup rows when tally nonzero", () => {
    const msg = buildSyncDoneProgress({
      uploadedMedia: 0,
      uploadedThumbs: 0,
      downloadedMedia: 0,
      downloadedThumbs: 0,
      mergedMedia: 3,
      deletedOrphanThumbsS3: 0,
      deletedOrphanThumbsLocal: 0,
    });
    expect(msg.phase).toBe("done");
    expect(msg.message).toContain("Added 3 from backup");
  });

  it("omits zero counters from summary", () => {
    const msg = buildSyncDoneProgress({
      uploadedMedia: 1,
      uploadedThumbs: 0,
      downloadedMedia: 0,
      downloadedThumbs: 0,
      mergedMedia: 0,
      deletedOrphanThumbsS3: 0,
      deletedOrphanThumbsLocal: 0,
    });
    expect(msg.message).toContain("Uploaded 1 media");
    expect(msg.message).not.toContain("from backup");
  });
});
