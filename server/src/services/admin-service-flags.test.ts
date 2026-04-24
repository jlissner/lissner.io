import { afterEach, describe, expect, it, vi } from "vitest";

/** `admin-service` → `auth` → `config/env.js` loads dotenv with override and clobbers stubbed env. */
vi.mock("../config/env.js", () => ({
  PROJECT_ROOT: "/tmp/family-image-manager-test-root",
  AWS_ACCESS_KEY_ID: "test-access",
  AWS_SECRET_ACCESS_KEY: "test-secret",
  AWS_REGION: "us-east-1",
  DATA_DIR: "/tmp/family-image-manager-test-data",
  FIRST_ADMIN_EMAIL: "admin@test.local",
  OLLAMA_HOST: "http://127.0.0.1:11434",
  OLLAMA_VISION_MODEL: "llava",
  S3_BUCKET: "test-bucket",
  SERVER_HOST: "localhost",
  SERVER_PORT: 3000,
  SERVER_PROTOCOL: "http",
  SESSION_SECRET: "test-session-secret",
  SES_FROM_EMAIL: "ses@test.local",
  UI_PORT: 8042,
}));

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
    const { isDataExplorerEnabled: dataProd } =
      await import("./admin-service.js");
    expect(dataProd()).toBe(false);
  });
});
