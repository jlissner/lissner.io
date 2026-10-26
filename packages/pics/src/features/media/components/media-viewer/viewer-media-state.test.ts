import { describe, expect, it } from "vitest";
import {
  deriveStillImageView,
  hasMotionCompanion,
  isMediaPreviewUnavailable,
  stillImageActionFlags,
  viewerImageClassName,
} from "./viewer-media-state";

describe("hasMotionCompanion", () => {
  it("is false for empty values", () => {
    expect(hasMotionCompanion(null)).toBe(false);
    expect(hasMotionCompanion(undefined)).toBe(false);
    expect(hasMotionCompanion("")).toBe(false);
  });

  it("is true when an id is present", () => {
    expect(hasMotionCompanion("abc")).toBe(true);
  });
});

describe("deriveStillImageView", () => {
  const base = {
    mimeType: "image/jpeg",
    originalName: "photo.jpg",
    pixelMp: false,
    pixelIsVideo: false,
    hasMotionPair: false,
    motionPairView: "still" as const,
  };

  it("shows regular still images when not a motion pair", () => {
    expect(deriveStillImageView(base)).toMatchObject({
      isRegularStillImage: true,
      isPixelStillImage: false,
      isItemImage: true,
      canTagFaces: true,
    });
  });

  it("hides still frame while motion pair video is active", () => {
    expect(
      deriveStillImageView({
        ...base,
        hasMotionPair: true,
        motionPairView: "video",
      }),
    ).toMatchObject({
      showingStillFrame: false,
      isRegularStillImage: false,
      isItemImage: false,
    });
  });
});

describe("stillImageActionFlags", () => {
  it("blocks rotate for motion pairs but allows fullscreen", () => {
    expect(
      stillImageActionFlags({
        isItemImage: true,
        taggingMode: false,
        assigningFace: null,
        reassigningFace: null,
        hasMotionPair: true,
        deleting: false,
      }),
    ).toEqual({ canOpenFullscreen: true, canRotateImage: false });
  });
});

describe("viewerImageClassName", () => {
  it("adds modifier classes when requested", () => {
    expect(viewerImageClassName({ taggingMode: true, zoomable: true })).toBe(
      "viewer-content__image viewer-content__image--tagging viewer-content__image--zoomable",
    );
  });
});

describe("isMediaPreviewUnavailable", () => {
  it("is true for unknown binary types", () => {
    expect(
      isMediaPreviewUnavailable(
        "application/octet-stream",
        "archive.zip",
        false,
      ),
    ).toBe(true);
  });
});
