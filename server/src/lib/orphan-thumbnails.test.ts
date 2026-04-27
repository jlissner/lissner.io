import { describe, expect, it } from "vitest";
import { thumbnailFilenameToMediaId } from "./orphan-thumbnails.js";

describe("thumbnailFilenameToMediaId", () => {
  it("strips _thumb suffix for image thumbnails", () => {
    expect(thumbnailFilenameToMediaId("abc-uuid_thumb.jpg")).toBe("abc-uuid");
  });

  it("strips .jpg for video thumbnails", () => {
    expect(thumbnailFilenameToMediaId("abc-uuid.jpg")).toBe("abc-uuid");
  });

  it("returns null for non-jpeg", () => {
    expect(thumbnailFilenameToMediaId("x.png")).toBeNull();
  });
});
