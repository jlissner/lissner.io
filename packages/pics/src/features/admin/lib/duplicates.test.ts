import { describe, expect, it } from "vitest";
import { mediaIdsToDeleteFromDecisions } from "./duplicates.js";

describe("mediaIdsToDeleteFromDecisions", () => {
  it("returns unique delete IDs derived from decisions", () => {
    const duplicates = [
      { mediaId: "A", duplicateOfId: "B", hammingDistance: 1 },
      { mediaId: "A", duplicateOfId: "C", hammingDistance: 2 },
      { mediaId: "D", duplicateOfId: "B", hammingDistance: 3 },
    ];
    const decisionsByKey = {
      "A:B": "keep_left", // delete B
      "A:C": "skip",
      "D:B": "keep_right", // delete D
    } as const;

    expect(mediaIdsToDeleteFromDecisions(duplicates, decisionsByKey)).toEqual([
      "B",
      "D",
    ]);
  });

  it("ignores rows with no decision or skip", () => {
    const duplicates = [
      { mediaId: "A", duplicateOfId: "B", hammingDistance: 1 },
      { mediaId: "C", duplicateOfId: "D", hammingDistance: 2 },
    ];
    const decisionsByKey = { "A:B": undefined, "C:D": "skip" } as const;

    expect(mediaIdsToDeleteFromDecisions(duplicates, decisionsByKey)).toEqual(
      [],
    );
  });
});
