import { describe, expect, it } from "vitest";
import {
  filterTagSuggestions,
  parseActiveSearchToken,
  personSearchHandle,
} from "./search-autocomplete.js";

describe("parseActiveSearchToken", () => {
  it("parses # prefix before cursor", () => {
    const q = "beach #su";
    const t = parseActiveSearchToken(q, q.length);
    expect(t).toEqual({ kind: "tag", at: 6, end: 9, prefix: "su" });
  });

  it("parses @ after opening paren", () => {
    const q = "(@jo";
    const t = parseActiveSearchToken(q, q.length);
    expect(t).toEqual({ kind: "person", at: 1, end: 4, prefix: "jo" });
  });

  it("returns null when # is part of a word", () => {
    const q = "foo#bar";
    expect(parseActiveSearchToken(q, q.length)).toBeNull();
  });
});

describe("personSearchHandle", () => {
  it("matches server-side normalization", () => {
    expect(personSearchHandle("Joe Lissner")).toBe("joelissner");
  });
});

describe("filterTagSuggestions", () => {
  it("filters by prefix", () => {
    expect(filterTagSuggestions(["apple", "apricot", "berry"], "ap")).toEqual([
      "apple",
      "apricot",
    ]);
  });
});
