import { describe, expect, it } from "vitest";
import { searchIndexBodySchema, searchListQuerySchema } from "./search-schemas.js";

describe("searchListQuerySchema", () => {
  it("accepts empty query object", () => {
    expect(searchListQuerySchema.parse({})).toEqual({});
  });

  it("parses q when present", () => {
    expect(searchListQuerySchema.parse({ q: "cats" })).toEqual({ q: "cats" });
  });
});

describe("searchIndexBodySchema", () => {
  it("accepts undefined body", () => {
    expect(searchIndexBodySchema.parse(undefined)).toBeUndefined();
  });

  it("accepts mediaIds", () => {
    expect(searchIndexBodySchema.parse({ mediaIds: ["a", "b"] })).toEqual({
      mediaIds: ["a", "b"],
    });
  });
});
