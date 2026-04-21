import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken } from "./jwt.js";

describe("signAccessToken / verifyAccessToken", () => {
  it("round-trips with correct payload", async () => {
    const token = await signAccessToken({ sub: 42, email: "a@b.com", isAdmin: true });
    const result = await verifyAccessToken(token);
    expect(result).toEqual({ sub: 42, email: "a@b.com", isAdmin: true });
  });

  it("returns null for an expired token", async () => {
    const SECRET = process.env.SESSION_SECRET ?? "family-media-manager-dev-secret";
    const key = new TextEncoder().encode(SECRET + ":access");
    const token = await new SignJWT({ email: "a@b.com", isAdmin: false })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("1")
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
      .sign(key);
    const result = await verifyAccessToken(token);
    expect(result).toBeNull();
  });

  it("returns null for a token signed with wrong secret", async () => {
    const wrongKey = new TextEncoder().encode("wrong-secret:access");
    const token = await new SignJWT({ email: "a@b.com", isAdmin: false })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("1")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(wrongKey);
    const result = await verifyAccessToken(token);
    expect(result).toBeNull();
  });
});

describe("signRefreshToken / verifyRefreshToken", () => {
  it("round-trips with correct payload", async () => {
    const token = await signRefreshToken({ sub: 7, familyId: "fam-1" });
    const result = await verifyRefreshToken(token);
    expect(result).not.toBeNull();
    expect(result!.sub).toBe(7);
    expect(result!.familyId).toBe("fam-1");
    expect(typeof result!.jti).toBe("string");
    expect(result!.jti.length).toBeGreaterThan(0);
  });
});

describe("cross-verification", () => {
  it("access token is rejected by verifyRefreshToken", async () => {
    const token = await signAccessToken({ sub: 1, email: "a@b.com", isAdmin: false });
    const result = await verifyRefreshToken(token);
    expect(result).toBeNull();
  });

  it("refresh token is rejected by verifyAccessToken", async () => {
    const token = await signRefreshToken({ sub: 1, familyId: "fam-1" });
    const result = await verifyAccessToken(token);
    expect(result).toBeNull();
  });
});
