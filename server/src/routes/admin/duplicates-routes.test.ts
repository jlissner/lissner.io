import { describe, expect, it, vi } from "vitest";
import { createAdminDuplicatesBulkDeleteHandler } from "./duplicates-routes.js";

function mockRes(): { json: ReturnType<typeof vi.fn> } {
  return { json: vi.fn() };
}

describe("admin duplicates bulk delete", () => {
  it("returns one result per requested ID and preserves mediaId", async () => {
    const deleteMediaItem = vi.fn(async (mediaId: string) => {
      if (mediaId === "a") return { ok: true } as const;
      if (mediaId === "b") return { ok: false, reason: "forbidden" } as const;
      return { ok: false, reason: "delete_failed" } as const;
    });

    const handler = createAdminDuplicatesBulkDeleteHandler({ deleteMediaItem });
    const res = mockRes();

    await handler(
      {
        body: { mediaIds: ["a", "b", "c"] },
        jwtUser: { id: 123, isAdmin: true },
      },
      res,
    );

    expect(res.json).toHaveBeenCalledWith({
      results: [
        { mediaId: "a", ok: true },
        { mediaId: "b", ok: false, reason: "forbidden" },
        { mediaId: "c", ok: false, reason: "delete_failed" },
      ],
    });

    expect(deleteMediaItem).toHaveBeenCalledTimes(3);
    expect(deleteMediaItem).toHaveBeenNthCalledWith(
      1,
      "a",
      expect.objectContaining({ userId: 123, isAdmin: true }),
    );
  });

  it("does not fail the whole request when one delete fails", async () => {
    const deleteMediaItem = vi.fn(async (mediaId: string) => {
      if (mediaId === "fail")
        return { ok: false, reason: "not_found" } as const;
      return { ok: true } as const;
    });

    const handler = createAdminDuplicatesBulkDeleteHandler({ deleteMediaItem });
    const res = mockRes();

    await handler(
      {
        body: { mediaIds: ["ok", "fail", "ok2"] },
        jwtUser: { id: 1, isAdmin: true },
      },
      res,
    );

    const payload = res.json.mock.calls[0]?.[0] as {
      results: Array<{ mediaId: string; ok: boolean }>;
    };
    expect(payload.results).toHaveLength(3);
    expect(payload.results.map((r) => r.mediaId)).toEqual([
      "ok",
      "fail",
      "ok2",
    ]);
    expect(payload.results.find((r) => r.mediaId === "fail")?.ok).toBe(false);
  });
});
