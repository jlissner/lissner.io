import { describe, expect, it, vi } from "vitest";
import {
  REFRESH_COOKIE_PATH,
  setTokenCookies,
  clearTokenCookies,
} from "./jwt-auth-service.js";

describe("token cookie paths", () => {
  it("scopes refresh_token to /auth so production refresh requests include the cookie", () => {
    const cookies: Array<{ name: string; options: { path?: string } }> = [];
    const res = {
      cookie: vi.fn(
        (name: string, _value: string, options: { path?: string }) => {
          cookies.push({ name, options });
        },
      ),
      clearCookie: vi.fn(),
    };

    setTokenCookies(res as never, "access", "refresh");

    expect(REFRESH_COOKIE_PATH).toBe("/auth");
    expect(cookies).toEqual([
      { name: "access_token", options: expect.objectContaining({ path: "/" }) },
      {
        name: "refresh_token",
        options: expect.objectContaining({ path: "/auth" }),
      },
    ]);
  });

  it("clears refresh_token using the same path", () => {
    const res = { cookie: vi.fn(), clearCookie: vi.fn() };

    clearTokenCookies(res as never);

    expect(res.clearCookie).toHaveBeenCalledWith("refresh_token", {
      path: "/auth",
    });
  });
});
