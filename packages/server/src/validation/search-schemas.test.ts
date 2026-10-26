import { describe, expect, it } from "vitest";
import {
  searchIndexBodySchema,
  searchListQuerySchema,
  searchTimelineQuerySchema,
} from "./search-schemas.js";

describe("searchListQuerySchema", () => {
  it("requires q", () => {
    expect(() => searchListQuerySchema.parse({})).toThrow();
  });

  it("parses q with default pagination", () => {
    expect(searchListQuerySchema.parse({ q: "cats" })).toEqual({
      q: "cats",
      limit: 50,
      offset: 0,
    });
  });

  it("parses limit and offset", () => {
    expect(
      searchListQuerySchema.parse({ q: "cats", limit: "10", offset: "50" }),
    ).toEqual({
      q: "cats",
      limit: 10,
      offset: 50,
    });
  });
});

describe("searchTimelineQuerySchema", () => {
  it("parses q and default sortBy", () => {
    expect(searchTimelineQuerySchema.parse({ q: "beach" })).toEqual({
      q: "beach",
      sortBy: "taken",
    });
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
