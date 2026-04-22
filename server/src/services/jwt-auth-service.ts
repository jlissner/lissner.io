import { randomUUID, createHash } from "crypto";
import type { Response } from "express";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../auth/jwt.js";
import * as authDb from "../db/auth.js";

const IS_PROD = process.env.NODE_ENV === "production";
const ACCESS_MAX_AGE = 3600;
const REFRESH_MAX_AGE = 7 * 24 * 3600;

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function issueTokens(
  user: { id: number; email: string; isAdmin: boolean },
  familyId?: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const fid = familyId ?? randomUUID();
  const accessToken = await signAccessToken({
    sub: user.id,
    email: user.email,
    isAdmin: user.isAdmin,
  });
  const refreshToken = await signRefreshToken({ sub: user.id, familyId: fid });
  const expiresAt = new Date(Date.now() + REFRESH_MAX_AGE * 1000).toISOString();
  authDb.createRefreshToken(hashToken(refreshToken), user.id, fid, expiresAt);
  return { accessToken, refreshToken };
}

type RefreshResult =
  | { accessToken: string; refreshToken: string }
  | { error: "invalid" | "revoked" | "reused" };

export async function refreshTokens(
  rawRefreshToken: string,
): Promise<RefreshResult> {
  const claims = await verifyRefreshToken(rawRefreshToken);
  if (!claims) return { error: "invalid" };

  const tokenHash = hashToken(rawRefreshToken);
  const row = authDb.consumeRefreshToken(tokenHash);

  if (!row) {
    if (authDb.isRefreshTokenRevoked(tokenHash)) {
      authDb.revokeTokenFamily(claims.familyId);
      return { error: "reused" };
    }
    return { error: "invalid" };
  }

  const user = authDb.getUserById(row.userId);
  if (!user) return { error: "invalid" };

  const tokens = await issueTokens(user, row.familyId);
  return tokens;
}

export async function revokeSession(rawRefreshToken: string): Promise<void> {
  const claims = await verifyRefreshToken(rawRefreshToken);
  if (!claims) return;
  authDb.revokeTokenFamily(claims.familyId);
}

export function setTokenCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
): void {
  res.cookie("access_token", accessToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_MAX_AGE * 1000,
  });
  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: REFRESH_MAX_AGE * 1000,
  });
}

export function clearTokenCookies(res: Response): void {
  res.clearCookie("access_token", { path: "/" });
  res.clearCookie("refresh_token", { path: "/api/auth" });
}
