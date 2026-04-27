import { describe, expect, it } from "vitest";
import { rotateFaceBox90Clockwise } from "./media-rotate-service.js";

describe("rotateFaceBox90Clockwise", () => {
  it("maps full-frame box on a portrait-oriented buffer", () => {
    const W = 100;
    const H = 200;
    const next = rotateFaceBox90Clockwise(
      { x: 0, y: 0, width: W, height: H },
      H,
    );
    expect(next).toEqual({ x: 0, y: 0, width: H, height: W });
  });

  it("maps a horizontal strip to a vertical strip on the right", () => {
    const W = 100;
    const H = 200;
    const next = rotateFaceBox90Clockwise(
      { x: 0, y: 0, width: W, height: 10 },
      H,
    );
    expect(next).toEqual({ x: 190, y: 0, width: 10, height: W });
  });
});
