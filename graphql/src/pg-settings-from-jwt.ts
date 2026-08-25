import { jwtVerify, type JWTPayload } from "jose";
import type { IncomingMessage } from "node:http";

const CLAIM_KEY_PATTERN = /^[a-z_][a-z0-9_]*$/i;
const MAX_CLAIM_KEY_LENGTH = 52;

export type PgSettings = Record<string, string>;

const isValidClaimKey = (key: string): boolean =>
  CLAIM_KEY_PATTERN.test(key) && key.length <= MAX_CLAIM_KEY_LENGTH;

const isNonEmpty = (value: unknown): value is string | number | boolean =>
  value != null && value !== "";

export const claimsToPgSettings = (claims: JWTPayload): PgSettings => {
  const claimEntries = Object.entries(claims)
    .filter(([key, value]) => isValidClaimKey(key) && isNonEmpty(value))
    .map(([key, value]) => [`jwt.claims.${key}`, String(value)] as const);

  return Object.fromEntries([
    ...(typeof claims.role === "string" ? [["role", claims.role]] : []),
    ...claimEntries,
  ]);
};

const encoder = new TextEncoder();
const secretKey = (secret: string): Uint8Array => encoder.encode(secret);

export const pgSettingsFromAuthorization = async (
  authorization: string | undefined,
  secret: string,
  defaultRole: string,
): Promise<PgSettings> => {
  const defaultSettings: PgSettings = { role: defaultRole };
  if (!authorization) {
    return defaultSettings;
  }

  const [bearer, token] = authorization.split(" ");
  if (bearer?.toLowerCase() !== "bearer" || !token) {
    return defaultSettings;
  }

  const { payload } = await jwtVerify(token, secretKey(secret), {
    algorithms: ["HS256", "HS384"],
    audience: "postgraphile",
  });

  return {
    ...defaultSettings,
    ...claimsToPgSettings(payload),
  };
};

export const pgSettingsFromRequest = async (
  req: IncomingMessage | undefined,
  secret: string,
  defaultRole: string,
): Promise<PgSettings> =>
  pgSettingsFromAuthorization(req?.headers.authorization, secret, defaultRole);
