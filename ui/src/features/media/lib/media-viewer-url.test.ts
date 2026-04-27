import { describe, expect, it } from "vitest";
import { parseMediaIdFromSearchString } from "./media-viewer-url";

describe("parseMediaIdFromSearchString", () => {
  it("returns null for empty or missing media param", () => {
    expect(parseMediaIdFromSearchString("")).toBeNull();
    expect(parseMediaIdFromSearchString("?")).toBeNull();
    expect(parseMediaIdFromSearchString("?foo=1")).toBeNull();
  });

  it("parses media id with or without leading ?", () => {
    expect(parseMediaIdFromSearchString("?media=abc-123")).toBe("abc-123");
    expect(parseMediaIdFromSearchString("media=abc-123")).toBe("abc-123");
  });

  it("preserves other params when reading media", () => {
    expect(parseMediaIdFromSearchString("?person=1&media=xyz&sort=1")).toBe(
      "xyz",
    );
  });
});
