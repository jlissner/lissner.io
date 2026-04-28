import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/media.js", () => ({
  getEmbeddings: vi.fn(),
  getEmbedding: vi.fn(),
  getMediaByIds: vi.fn(),
  getImagePeople: vi.fn(),
  getIndexedMediaIds: vi.fn(),
  getPersonNames: vi.fn(),
  getMediaForPerson: vi.fn(),
  getMediaIdsForTag: vi.fn(),
  listVisibleGalleryMediaIds: vi.fn(),
}));

vi.mock("../embeddings.js", () => ({
  getEmbedding: vi.fn(),
  cosineSimilarity: vi.fn(),
}));

import * as db from "../db/media.js";
import * as embeddings from "../embeddings.js";
import { searchMediaByQuery } from "./search-service.js";

describe("searchMediaByQuery", () => {
  beforeEach(() => {
    vi.mocked(db.getEmbeddings).mockReset();
    vi.mocked(db.getMediaByIds).mockReset();
    vi.mocked(db.getImagePeople).mockReset();
    vi.mocked(db.getIndexedMediaIds).mockReset();
    vi.mocked(db.getPersonNames).mockReset();
    vi.mocked(db.getMediaForPerson).mockReset();
    vi.mocked(db.getMediaIdsForTag).mockReset();
    vi.mocked(db.listVisibleGalleryMediaIds).mockReset();
    vi.mocked(embeddings.getEmbedding).mockReset();
    vi.mocked(embeddings.cosineSimilarity).mockReset();
  });

  it("returns missing_query for blank input", async () => {
    expect(await searchMediaByQuery("   ")).toEqual({
      ok: false,
      reason: "missing_query",
    });
  });

  it("legacy path runs embedding over full string and merges substring people", async () => {
    vi.mocked(db.getPersonNames).mockReturnValue(
      new Map([
        [1, "Joe Holiday"],
        [2, "Other"],
      ]),
    );
    vi.mocked(db.getMediaForPerson).mockImplementation((pid: number) => {
      if (pid === 1) {
        return [{ id: "m-person", hideFromGallery: 0 } as never];
      }
      return [];
    });
    vi.mocked(db.getEmbeddings).mockReturnValue([
      { mediaId: "m-emb", embedding: JSON.stringify([1, 0, 0]) },
    ]);
    vi.mocked(embeddings.getEmbedding).mockResolvedValue([1, 0, 0]);
    vi.mocked(embeddings.cosineSimilarity).mockReturnValue(0.99);
    vi.mocked(db.getMediaByIds).mockImplementation((ids: string[]) =>
      ids.map((id) => ({
        id,
        filename: `${id}.jpg`,
        originalName: `${id}.jpg`,
        mimeType: "image/jpeg",
        size: 1,
        uploadedAt: "t",
        hideFromGallery: 0,
      })),
    );
    vi.mocked(db.getImagePeople).mockReturnValue([]);
    vi.mocked(db.getIndexedMediaIds).mockReturnValue(
      new Set(["m-person", "m-emb"]),
    );

    const r = await searchMediaByQuery("holiday");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.items.map((i) => i.id)).toContain("m-person");
    expect(r.items.map((i) => i.id)).toContain("m-emb");
    expect(embeddings.getEmbedding).toHaveBeenCalledWith("holiday");
  });

  it("structured (#a OR #b) unions tag results", async () => {
    vi.mocked(db.getMediaIdsForTag).mockImplementation((tag: string) => {
      if (tag === "a") return ["m1"];
      if (tag === "b") return ["m2"];
      return [];
    });
    vi.mocked(db.getMediaByIds).mockImplementation((ids: string[]) =>
      ids.map((id) => ({
        id,
        filename: `${id}.jpg`,
        originalName: `${id}.jpg`,
        mimeType: "image/jpeg",
        size: 1,
        uploadedAt: "t",
        hideFromGallery: 0,
      })),
    );
    vi.mocked(db.getImagePeople).mockReturnValue([]);
    vi.mocked(db.getIndexedMediaIds).mockReturnValue(new Set());

    const r = await searchMediaByQuery("(#a OR #b)");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const ids = r.items.map((i) => i.id).sort();
    expect(ids).toEqual(["m1", "m2"]);
    expect(embeddings.getEmbedding).not.toHaveBeenCalled();
  });

  it("returns invalid_query for broken structured syntax", async () => {
    const r = await searchMediaByQuery("(#oops");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("invalid_query");
  });

  it("person handle leaf returns video ids from getMediaForPerson", async () => {
    vi.mocked(db.getPersonNames).mockReturnValue(new Map([[7, "Joe Lissner"]]));
    vi.mocked(db.getMediaForPerson).mockReturnValue([
      { id: "v1", mimeType: "video/mp4", hideFromGallery: 0 } as never,
    ]);
    vi.mocked(db.getMediaByIds).mockReturnValue([
      {
        id: "v1",
        filename: "v1.mp4",
        originalName: "v1.mp4",
        mimeType: "video/mp4",
        size: 1,
        uploadedAt: "t",
        hideFromGallery: 0,
      },
    ]);
    vi.mocked(db.getImagePeople).mockReturnValue([7]);
    vi.mocked(db.getIndexedMediaIds).mockReturnValue(new Set());

    const r = await searchMediaByQuery("@joelissner");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.items.map((i) => i.id)).toContain("v1");
    expect(r.items.map((i) => i.mimeType)).toContain("video/mp4");
  });

  it("AND NOT excludes second person from first within visible universe", async () => {
    vi.mocked(db.listVisibleGalleryMediaIds).mockReturnValue([
      "m1",
      "m2",
      "m3",
    ]);
    vi.mocked(db.getPersonNames).mockReturnValue(
      new Map([
        [1, "Alpha"],
        [2, "Beta"],
      ]),
    );
    vi.mocked(db.getMediaForPerson).mockImplementation((pid: number) => {
      if (pid === 1) {
        return [{ id: "m1", hideFromGallery: 0 } as never];
      }
      if (pid === 2) {
        return [{ id: "m2", hideFromGallery: 0 } as never];
      }
      return [];
    });
    vi.mocked(db.getMediaByIds).mockImplementation((ids: string[]) =>
      ids.map((id) => ({
        id,
        filename: `${id}.jpg`,
        originalName: `${id}.jpg`,
        mimeType: "image/jpeg",
        size: 1,
        uploadedAt: "t",
        hideFromGallery: 0,
      })),
    );
    vi.mocked(db.getImagePeople).mockReturnValue([]);
    vi.mocked(db.getIndexedMediaIds).mockReturnValue(new Set());

    const r = await searchMediaByQuery("@alpha AND NOT @beta");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.items.map((i) => i.id)).toEqual(["m1"]);
  });
});
