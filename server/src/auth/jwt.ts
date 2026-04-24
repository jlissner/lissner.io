import { SignJWT, jwtVerify } from "jose";
import { randomUUID } from "crypto";
import { SESSION_SECRET } from "../config/env.js";

const SECRET = SESSION_SECRET;
const ACCESS_KEY = new TextEncoder().encode(SECRET + ":access");
const REFRESH_KEY = new TextEncoder().encode(SECRET + ":refresh");

const ACCESS_TOKEN_EXPIRY = "1h";
const REFRESH_TOKEN_EXPIRY = "7d";
const CLOCK_TOLERANCE_SEC = 30;

export interface AccessTokenPayload {
  sub: number;
  email: string;
  isAdmin: boolean;
}

export interface RefreshTokenPayload {
  sub: number;
  familyId: string;
  jti: string;
}

export async function signAccessToken(payload: {
  sub: number;
  email: string;
  isAdmin: boolean;
}): Promise<string> {
  return new SignJWT({ email: payload.email, isAdmin: payload.isAdmin })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(payload.sub))
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(ACCESS_KEY);
}

export async function signRefreshToken(payload: {
  sub: number;
  familyId: string;
}): Promise<string> {
  return new SignJWT({ familyId: payload.familyId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(payload.sub))
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(REFRESH_KEY);
}

export async function verifyAccessToken(
  token: string,
): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, ACCESS_KEY, {
      algorithms: ["HS256"],
      clockTolerance: CLOCK_TOLERANCE_SEC,
    });
    const sub = Number(payload.sub);
    const email = payload.email;
    const isAdmin = payload.isAdmin;
    if (!sub || typeof email !== "string" || typeof isAdmin !== "boolean") {
      return null;
    }
    return { sub, email, isAdmin };
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(
  token: string,
): Promise<RefreshTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, REFRESH_KEY, {
      algorithms: ["HS256"],
      clockTolerance: CLOCK_TOLERANCE_SEC,
    });
    const sub = Number(payload.sub);
    const familyId = payload.familyId;
    const jti = payload.jti;
    if (!sub || typeof familyId !== "string" || typeof jti !== "string") {
      return null;
    }
    return { sub, familyId, jti };
  } catch {
    return null;
  }
}
