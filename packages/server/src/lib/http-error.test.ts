import { describe, expect, it } from "vitest";
import { HttpError, isHttpError } from "./http-error.js";

describe("HttpError", () => {
  it("exposes statusCode and optional code", () => {
    const err = new HttpError(404, "missing", "not_found");
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("missing");
    expect(err.code).toBe("not_found");
  });
});

describe("isHttpError", () => {
  it("narrows HttpError instances", () => {
    const err = new HttpError(400, "bad");
    expect(isHttpError(err)).toBe(true);
    expect(isHttpError(new Error("x"))).toBe(false);
    expect(isHttpError("x")).toBe(false);
  });
});
