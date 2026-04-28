import { describe, expect, it } from "vitest";
import {
  MEDIA_URL_QUERY_KEY,
  parseMediaIdFromSearchString,
} from "./media-viewer-url";

// Gherkin trace: features/media/home-gallery.feature — scenario "Deep link opens the viewer".
// URL sync and clearing `media=` on dismiss live in use-media-viewer-url-sync.ts (browser history).
describe("features/media/home-gallery.feature — Scenario: Deep link opens the viewer", () => {
  it("uses MEDIA_URL_QUERY_KEY and parses ?media= for deep links", () => {
    expect(MEDIA_URL_QUERY_KEY).toBe("media");
    expect(parseMediaIdFromSearchString("?media=test-id")).toBe("test-id");
  });
});

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
