import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/media.js", () => ({
  getPersonNames: vi.fn(),
  getAllPersonIds: vi.fn(),
  getMediaForPerson: vi.fn(),
}));

vi.mock("./person-merge-suggestions.js", () => ({
  collectDescriptorsForPerson: vi.fn(),
  isPlaceholderPersonName: (name: string) => name.trim().startsWith("Person"),
  mergeSuggestionsFromDescriptors: vi.fn(),
}));

vi.mock("../faces.js", () => ({
  getFaceSimilarityFn: vi.fn().mockResolvedValue(() => 0.9),
}));

import * as db from "../db/media.js";
import * as pms from "./person-merge-suggestions.js";
import { runFaceMatchBatch } from "./person-face-match.js";

describe("runFaceMatchBatch", () => {
  beforeEach(() => {
    vi.mocked(db.getPersonNames).mockReset();
    vi.mocked(db.getAllPersonIds).mockReset();
    vi.mocked(db.getMediaForPerson).mockReset();
    vi.mocked(pms.collectDescriptorsForPerson).mockReset();
    vi.mocked(pms.mergeSuggestionsFromDescriptors).mockReset();
  });

  it("never auto-merges and returns review queue entries", async () => {
    vi.mocked(db.getPersonNames).mockReturnValue(
      new Map([
        [1, "Person 1"],
        [2, "Alice"],
      ]),
    );
    vi.mocked(db.getAllPersonIds).mockReturnValue([1, 2]);
    vi.mocked(pms.collectDescriptorsForPerson).mockImplementation(
      async (id: number) => (id === 1 ? [[0.1, 0.2]] : [[0.3, 0.4]]),
    );
    vi.mocked(pms.mergeSuggestionsFromDescriptors).mockReturnValue([
      { personId: 2, name: "Alice", score: 0.999 },
    ]);
    vi.mocked(db.getMediaForPerson).mockReturnValue([
      {
        id: "m1",
        filename: "a.jpg",
        originalName: "a",
        mimeType: "image/jpeg",
        size: 1,
        uploadedAt: "t",
        dateTaken: null,
        latitude: null,
        longitude: null,
        backedUpAt: null,
        motionCompanionId: null,
        hideFromGallery: null,
        x: 0,
        y: 0,
        width: 10,
        height: 10,
      },
    ]);

    const out = await runFaceMatchBatch();
    expect(out.autoMerged).toEqual([]);
    expect(out.reviewQueue).toHaveLength(1);
    expect(out.reviewQueue[0]?.placeholderPersonId).toBe(1);
    expect(out.reviewQueue[0]?.topMatch?.personId).toBe(2);
  });
});
