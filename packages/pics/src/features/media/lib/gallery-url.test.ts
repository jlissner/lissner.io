import { describe, expect, it } from "vitest";
import {
  GALLERY_PERSON_KEY,
  GALLERY_QUERY_KEY,
  GALLERY_SORT_KEY,
  gallerySearchStringFromParams,
  parseGalleryUrlState,
} from "./gallery-url.js";

describe("parseGalleryUrlState", () => {
  it("parses search, sort, and person from query string", () => {
    expect(
      parseGalleryUrlState("?q=beach+party&sort=uploaded&person=42&media=abc"),
    ).toEqual({
      q: "beach party",
      sortBy: "uploaded",
      personId: 42,
    });
  });

  it("defaults sort to taken and ignores invalid person id", () => {
    expect(parseGalleryUrlState("?person=not-a-id")).toEqual({
      q: null,
      sortBy: "taken",
      personId: null,
    });
  });

  it("treats empty q as null", () => {
    expect(parseGalleryUrlState("?q=%20%20")).toEqual({
      q: null,
      sortBy: "taken",
      personId: null,
    });
  });
});

describe("gallerySearchStringFromParams", () => {
  it("extracts only gallery filter params", () => {
    const params = new URLSearchParams(
      `${GALLERY_QUERY_KEY}=x&${GALLERY_SORT_KEY}=uploaded&${GALLERY_PERSON_KEY}=1&media=item-1`,
    );
    expect(gallerySearchStringFromParams(params)).toBe(
      `${GALLERY_QUERY_KEY}=x&${GALLERY_SORT_KEY}=uploaded&${GALLERY_PERSON_KEY}=1`,
    );
  });
});
