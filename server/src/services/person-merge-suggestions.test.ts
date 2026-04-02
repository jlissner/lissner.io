import { describe, expect, it } from "vitest";
import {
  isPlaceholderPersonName,
  maxPairwiseSimilarity,
  mergeSuggestionsFromDescriptors,
  type MergeSuggestion,
} from "./person-merge-suggestions.js";

describe("isPlaceholderPersonName", () => {
  it("matches Person-prefixed auto names", () => {
    expect(isPlaceholderPersonName("Person 12")).toBe(true);
    expect(isPlaceholderPersonName("  Person X")).toBe(true);
    expect(isPlaceholderPersonName("Alice")).toBe(false);
  });
});

describe("maxPairwiseSimilarity", () => {
  it("returns 0 for empty descriptor lists", () => {
    expect(maxPairwiseSimilarity([], [[1]], (x, y) => x[0]! + y[0]!)).toBe(0);
    expect(maxPairwiseSimilarity([[1]], [], (x, y) => x[0]! + y[0]!)).toBe(0);
  });

  it("returns the maximum pairwise score", () => {
    const sim = (x: number[], y: number[]) => x[0]! * y[0]!;
    expect(
      maxPairwiseSimilarity(
        [
          [2, 0],
          [1, 0],
        ],
        [
          [3, 0],
          [5, 0],
        ],
        sim
      )
    ).toBe(10);
  });
});

describe("mergeSuggestionsFromDescriptors", () => {
  it("sorts by score desc and caps suggestions", () => {
    const names = new Map<number, string>([
      [10, "Ann"],
      [11, "Bob"],
    ]);
    const namedDescriptors = new Map<number, number[][]>([
      [10, [[1, 0]]],
      [11, [[0.5, 0]]],
    ]);
    const sim = (a: number[], b: number[]) => a[0]! * b[0]!;
    const out: MergeSuggestion[] = mergeSuggestionsFromDescriptors(
      [[1, 0]],
      [10, 11],
      names,
      namedDescriptors,
      sim
    );
    expect(out.map((x) => x.personId)).toEqual([10, 11]);
    expect(out[0]!.score).toBeGreaterThanOrEqual(out[1]!.score);
  });

  it("drops candidates below similarity threshold", () => {
    const names = new Map<number, string>([[20, "Zed"]]);
    const namedDescriptors = new Map<number, number[][]>([[20, [[0.01, 0]]]]);
    const sim = (a: number[], b: number[]) => a[0]! + b[0]!;
    expect(mergeSuggestionsFromDescriptors([[0.01]], [20], names, namedDescriptors, sim)).toEqual(
      []
    );
  });
});
