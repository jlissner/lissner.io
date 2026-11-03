import { describe, expect, it } from "vitest";
import { buildDatabaseUrl } from "./buildDatabaseUrl.js";

describe("buildDatabaseUrl", () => {
  it("inserts the database name before query params", () => {
    expect(
      buildDatabaseUrl(
        "postgres://u:p@127.0.0.1:5433?sslmode=disable",
        "media",
      ),
    ).toBe("postgres://u:p@127.0.0.1:5433/media?sslmode=disable");
  });

  it("accepts a trailing slash with no db name", () => {
    expect(buildDatabaseUrl("postgres://u:p@host:5432/", "lissner")).toBe(
      "postgres://u:p@host:5432/lissner",
    );
  });

  it("rejects a server URL that already has a database path", () => {
    expect(() =>
      buildDatabaseUrl("postgres://u:p@host:5432/lissner", "media"),
    ).toThrow(/must not include a database path/);
  });

  it("rejects an empty database name", () => {
    expect(() => buildDatabaseUrl("postgres://u:p@host:5432", "  ")).toThrow(
      /non-empty/,
    );
  });
});
