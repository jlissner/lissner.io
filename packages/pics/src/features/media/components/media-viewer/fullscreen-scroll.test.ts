import { describe, expect, it } from "vitest";
import { clampScrollOffset, normalizedClickAnchor } from "./fullscreen-scroll";

describe("normalizedClickAnchor", () => {
  it("returns normalized coordinates inside the element", () => {
    expect(
      normalizedClickAnchor(150, 250, {
        left: 100,
        top: 200,
        width: 200,
        height: 400,
      }),
    ).toEqual({
      x: 0.25,
      y: 0.125,
    });
  });

  it("returns null for zero-sized elements", () => {
    expect(
      normalizedClickAnchor(0, 0, { left: 0, top: 0, width: 0, height: 100 }),
    ).toBeNull();
  });
});

describe("clampScrollOffset", () => {
  it("centers the anchor within scroll bounds", () => {
    expect(clampScrollOffset(0.5, 1000, 400)).toBe(300);
  });

  it("returns zero when content fits", () => {
    expect(clampScrollOffset(0.5, 200, 400)).toBe(0);
  });
});
