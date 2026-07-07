import { describe, expect, it } from "vitest";
import {
  isTapGesture,
  resolveEdgeTapNav,
  resolveSwipeNav,
} from "./viewer-gesture-math";

describe("resolveSwipeNav", () => {
  it("returns next for left swipes", () => {
    expect(resolveSwipeNav(-80, 5)).toBe("next");
  });

  it("returns prev for right swipes", () => {
    expect(resolveSwipeNav(80, 5)).toBe("prev");
  });

  it("ignores vertical movement", () => {
    expect(resolveSwipeNav(10, 80)).toBeNull();
  });
});

describe("isTapGesture", () => {
  it("accepts small quick taps", () => {
    expect(isTapGesture(2, 3, 100)).toBe(true);
  });

  it("rejects long presses", () => {
    expect(isTapGesture(0, 0, 500)).toBe(false);
  });
});

describe("resolveEdgeTapNav", () => {
  it("maps edge taps to navigation", () => {
    expect(resolveEdgeTapNav(10, 200)).toBe("prev");
    expect(resolveEdgeTapNav(190, 200)).toBe("next");
    expect(resolveEdgeTapNav(100, 200)).toBeNull();
  });
});
