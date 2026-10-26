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
import { searchMediaByQuery, searchTimelineMonths } from "./search-service.js";

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
    expect(await searchMediaByQuery("   ", { limit: 50, offset: 0 })).toEqual({
      ok: false,
      reason: "missing_query",
    });
  });

  it("bare query merges person-name-substring matches with text embedding results", async () => {
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

    const r = await searchMediaByQuery("holiday", { limit: 50, offset: 0 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.total).toBe(2);
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

    const r = await searchMediaByQuery("(#a OR #b)", { limit: 50, offset: 0 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const ids = r.items.map((i) => i.id).sort();
    expect(ids).toEqual(["m1", "m2"]);
    expect(embeddings.getEmbedding).not.toHaveBeenCalled();
  });

  it("returns invalid_query for broken structured syntax", async () => {
    const r = await searchMediaByQuery("(#oops", { limit: 50, offset: 0 });
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

    const r = await searchMediaByQuery("@joelissner", { limit: 50, offset: 0 });
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

    const r = await searchMediaByQuery("@alpha AND NOT @beta", {
      limit: 50,
      offset: 0,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.items.map((i) => i.id)).toEqual(["m1"]);
  });

  it("paginates tag search results", async () => {
    vi.mocked(db.getMediaIdsForTag).mockReturnValue(["m1", "m2", "m3"]);
    vi.mocked(db.getMediaByIds).mockImplementation((ids: string[]) =>
      ids.map((id) => ({
        id,
        filename: `${id}.jpg`,
        originalName: `${id}.jpg`,
        mimeType: "image/jpeg",
        size: 1,
        uploadedAt: "2024-03-15T12:00:00.000Z",
        dateTaken: "2024-01-10T12:00:00.000Z",
        hideFromGallery: 0,
      })),
    );
    vi.mocked(db.getImagePeople).mockReturnValue([]);
    vi.mocked(db.getIndexedMediaIds).mockReturnValue(new Set());

    const page1 = await searchMediaByQuery("#tag", { limit: 2, offset: 0 });
    expect(page1.ok).toBe(true);
    if (!page1.ok) return;
    expect(page1.total).toBe(3);
    expect(page1.items.map((i) => i.id)).toEqual(["m1", "m2"]);

    const page2 = await searchMediaByQuery("#tag", { limit: 2, offset: 2 });
    expect(page2.ok).toBe(true);
    if (!page2.ok) return;
    expect(page2.items.map((i) => i.id)).toEqual(["m3"]);
  });

  it("searchTimelineMonths returns months for all matches", async () => {
    vi.mocked(db.getMediaIdsForTag).mockReturnValue(["m1", "m2"]);
    vi.mocked(db.getMediaByIds).mockReturnValue([
      {
        id: "m1",
        filename: "m1.jpg",
        originalName: "m1.jpg",
        mimeType: "image/jpeg",
        size: 1,
        uploadedAt: "2024-03-15T12:00:00.000Z",
        dateTaken: "2024-01-10T12:00:00.000Z",
        hideFromGallery: 0,
      },
      {
        id: "m2",
        filename: "m2.jpg",
        originalName: "m2.jpg",
        mimeType: "image/jpeg",
        size: 1,
        uploadedAt: "2023-12-01T12:00:00.000Z",
        hideFromGallery: 0,
      },
    ]);
    const r = await searchTimelineMonths("#tag", "taken");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.months).toEqual(["2024-01", "2023-12"]);
  });
});
