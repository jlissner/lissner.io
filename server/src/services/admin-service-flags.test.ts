import { afterEach, describe, expect, it, vi } from "vitest";

describe("admin explorer env flags", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("enables SQL explorer only when env true and not production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SQL_EXPLORER_ENABLED", "true");
    const { isSqlExplorerEnabled } = await import("./admin-service.js");
    expect(isSqlExplorerEnabled()).toBe(true);
  });

  it("disables SQL explorer in production even if env is true", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SQL_EXPLORER_ENABLED", "true");
    const { isSqlExplorerEnabled } = await import("./admin-service.js");
    expect(isSqlExplorerEnabled()).toBe(false);
  });

  it("disables SQL explorer when env is not true", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SQL_EXPLORER_ENABLED", "0");
    const { isSqlExplorerEnabled } = await import("./admin-service.js");
    expect(isSqlExplorerEnabled()).toBe(false);
  });

  it("mirrors data explorer gate on NODE_ENV and DATA_EXPLORER_ENABLED", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DATA_EXPLORER_ENABLED", "true");
    const { isDataExplorerEnabled } = await import("./admin-service.js");
    expect(isDataExplorerEnabled()).toBe(true);

    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATA_EXPLORER_ENABLED", "true");
    const { isDataExplorerEnabled: dataProd } = await import("./admin-service.js");
    expect(dataProd()).toBe(false);
  });
});
