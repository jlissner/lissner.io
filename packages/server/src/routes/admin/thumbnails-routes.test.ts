import { describe, expect, it, vi } from "vitest";
import { createAdminThumbnailsRepairHandler } from "./thumbnails-routes.js";

function mockRes(): { json: ReturnType<typeof vi.fn> } {
  return { json: vi.fn() };
}

describe("admin thumbnails repair", () => {
  it("parses maxGenerations and returns repair payload", async () => {
    const repairMissingThumbnails = vi.fn(async () => ({
      scanned: 3,
      missingFound: 1,
      generated: 1,
      skippedAlreadyOk: 2,
      skippedNoLocalFile: 0,
      skippedIneligible: 0,
      skippedDueToCap: 0,
      maxGenerations: 50,
      failed: [] as const,
    }));

    const handler = createAdminThumbnailsRepairHandler({
      repairMissingThumbnails,
    });
    const res = mockRes();

    await handler({ body: { maxGenerations: 50 } }, res);

    expect(repairMissingThumbnails).toHaveBeenCalledWith({
      maxGenerations: 50,
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ scanned: 3, generated: 1 }),
    );
  });

  it("defaults maxGenerations when body empty", async () => {
    const repairMissingThumbnails = vi.fn(async () => ({
      scanned: 0,
      missingFound: 0,
      generated: 0,
      skippedAlreadyOk: 0,
      skippedNoLocalFile: 0,
      skippedIneligible: 0,
      skippedDueToCap: 0,
      maxGenerations: 100,
      failed: [],
    }));

    const handler = createAdminThumbnailsRepairHandler({
      repairMissingThumbnails,
    });
    const res = mockRes();

    await handler({ body: {} }, res);

    expect(repairMissingThumbnails).toHaveBeenCalledWith({
      maxGenerations: 100,
    });
  });
});
