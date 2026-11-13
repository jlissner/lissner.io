import { afterEach, describe, expect, it, vi } from "vitest";

describe("getMagicLinkBaseUrl", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("../config/env.js");
  });

  it("uses the pics UI host in production, not the API host", async () => {
    vi.doMock("../config/env.js", () => ({
      VITE_PICS_UI_HOST: "pics.lissner.io",
      VITE_PICS_UI_PORT: 443,
    }));
    const { getMagicLinkBaseUrl } = await import("./auth-service.js");
    expect(getMagicLinkBaseUrl()).toBe("https://pics.lissner.io");
  });

  it("includes the pics UI port for localhost", async () => {
    vi.doMock("../config/env.js", () => ({
      VITE_PICS_UI_HOST: "localhost",
      VITE_PICS_UI_PORT: 5173,
    }));
    const { getMagicLinkBaseUrl } = await import("./auth-service.js");
    expect(getMagicLinkBaseUrl()).toBe("http://localhost:5173");
  });
});
