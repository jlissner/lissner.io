import { describe, expect, it } from "vitest";
import { buildDatabaseUrl } from "./buildDatabaseUrl.js";

describe("buildDatabaseUrl", () => {
  it("builds a postgres URL from connection parts", () => {
    expect(
      buildDatabaseUrl({
        user: "u",
        password: "p",
        host: "127.0.0.1",
        port: "5433",
        databaseName: "media",
      }),
    ).toBe("postgres://u:p@127.0.0.1:5433/media");
  });

  it("percent-encodes special characters in the password", () => {
    expect(
      buildDatabaseUrl({
        user: "lissner",
        password: "Xi3xi3jo#SQL",
        host: "127.0.0.1",
        port: "5432",
        databaseName: "dev_media",
      }),
    ).toBe("postgres://lissner:Xi3xi3jo%23SQL@127.0.0.1:5432/dev_media");
  });
});
