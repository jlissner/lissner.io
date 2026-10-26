import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import {
  claimsToPgSettings,
  pgSettingsFromAuthorization,
} from "./pg-settings-from-jwt.js";

const secret = "test-jwt-secret";
const secretKey = new TextEncoder().encode(secret);

const signToken = async (
  claims: Record<string, string | number>,
): Promise<string> =>
  new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setAudience("postgraphile")
    .sign(secretKey);

describe("claimsToPgSettings", () => {
  it("maps role and custom claims to pgSettings keys", () => {
    expect(
      claimsToPgSettings({
        role: "person",
        person_fk: 42,
        exp: 9999999999,
      }),
    ).toEqual({
      role: "person",
      "jwt.claims.role": "person",
      "jwt.claims.person_fk": "42",
      "jwt.claims.exp": "9999999999",
    });
  });
});

describe("pgSettingsFromAuthorization", () => {
  it("defaults to unauthorized when no header is sent", async () => {
    await expect(
      pgSettingsFromAuthorization(undefined, secret, "unauthorized"),
    ).resolves.toEqual({ role: "unauthorized" });
  });

  it("applies JWT role and person_fk from Bearer token", async () => {
    const token = await signToken({ role: "person", person_fk: 7 });
    await expect(
      pgSettingsFromAuthorization(`Bearer ${token}`, secret, "unauthorized"),
    ).resolves.toEqual({
      role: "person",
      "jwt.claims.aud": "postgraphile",
      "jwt.claims.role": "person",
      "jwt.claims.person_fk": "7",
    });
  });
});
