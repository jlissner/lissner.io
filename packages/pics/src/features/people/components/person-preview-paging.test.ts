import { describe, expect, it } from "vitest";
import {
  hasMorePersonPhotos,
  remainingPersonPhotos,
} from "./person-preview-paging";

describe("person preview remaining count", () => {
  // Bug: UI used loaded preview length (capped at 100) so remaining was always
  // ~50 even when the person had hundreds of photos.
  it("uses photoCount so remaining reflects hundreds of tags", () => {
    expect(remainingPersonPhotos(300, 50)).toBe(250);
    expect(hasMorePersonPhotos(300, 50)).toBe(true);
  });

  it("hides more when all photos are visible", () => {
    expect(remainingPersonPhotos(50, 50)).toBe(0);
    expect(hasMorePersonPhotos(50, 50)).toBe(false);
  });
});
