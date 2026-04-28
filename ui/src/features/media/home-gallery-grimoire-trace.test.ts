import { describe, expect, it } from "vitest";
import {
  MEDIA_URL_QUERY_KEY,
  parseMediaIdFromSearchString,
} from "./lib/media-viewer-url";

describe("Gherkin: Home media gallery and viewer (features/media/home-gallery.feature)", () => {
  it.todo(
    "Scenario: Media appears in the gallery — see ui/src/features/media/components/home-page.tsx, media-list.tsx",
  );

  it.todo(
    "Scenario: Open a media item from the grid — see ui/src/features/media/components/media-list.tsx, media-viewer/",
  );

  describe("Scenario: Deep link opens the viewer", () => {
    it("parses media id from query when ?media= is present", () => {
      expect(parseMediaIdFromSearchString("?media=item-1")).toBe("item-1");
    });

    it("still reads media when other params are present", () => {
      expect(parseMediaIdFromSearchString("?person=1&media=abc&sort=1")).toBe(
        "abc",
      );
    });
  });

  describe("Scenario: Close the viewer clears the deep link", () => {
    it("after removing the media param, parse returns null while other params can remain", () => {
      const params = new URLSearchParams("person=1&media=to-clear&sort=1");
      params.delete(MEDIA_URL_QUERY_KEY);
      const search = params.toString() === "" ? "" : `?${params.toString()}`;
      expect(parseMediaIdFromSearchString(search)).toBeNull();
      expect(params.has("person")).toBe(true);
    });
  });

  it.todo(
    "Scenario: Rotate a still image — server: server/src/services/media-rotate-service.test.ts; UI: ui/src/features/media/components/media-viewer/media-viewer-content.tsx",
  );

  it.todo(
    "Scenario: Bulk selection for actions — see ui/src/features/media/components/home-page.tsx, media-list.tsx",
  );

  it.todo(
    "Scenario: Timeline navigation on wide layout — see ui/src/features/media/components/TimelineScrubber.tsx",
  );
});
