import { createHash } from "crypto";
import { Router } from "express";
import { sendApiError } from "../lib/api-error.js";
import * as authDb from "../db/auth.js";
import { sendMagicLink } from "../email.js";
import { getMagicLinkBaseUrl } from "../services/auth-service.js";
import {
  issueTokens,
  refreshTokens,
  revokeSession,
  setTokenCookies,
  clearTokenCookies,
} from "../services/jwt-auth-service.js";
import { requireAuth } from "../auth/middleware.js";
import { checkCodeRateLimit } from "../auth/rate-limit.js";
import { logger } from "../logger.js";
import { parseWithSchema } from "../validation/parse.js";
import {
  magicLinkBodySchema,
  verifyCodeBodySchema,
  updateMyPeopleBodySchema,
} from "../validation/auth-schemas.js";

export const authRouter = Router();

authRouter.get("/config", (_req, res) => {
  res.json({ authEnabled: process.env.AUTH_ENABLED === "true" });
});

authRouter.post("/magic-link", async (req, res) => {
  const { email } = parseWithSchema(magicLinkBodySchema, req.body);

  const normalized = email.toLowerCase();
  if (!authDb.isEmailWhitelisted(normalized)) {
    sendApiError(
      res,
      403,
      "Email not on whitelist. Contact an admin to get access.",
      "not_whitelisted",
    );
    return;
  }

  const { token, code } = authDb.createMagicLinkToken(normalized);
  const baseUrl = getMagicLinkBaseUrl();
  const link = `${baseUrl}/?code=${code}`;

  try {
    await sendMagicLink(normalized, link, code);
    res.json({ sent: true });
  } catch (err) {
    logger.error({ err, email: normalized }, "Magic link send error");
    sendApiError(
      res,
      500,
      "Failed to send magic link",
      "magic_link_send_failed",
    );
  }
});

authRouter.post("/verify-code", async (req, res) => {
  const { email, code } = parseWithSchema(verifyCodeBodySchema, req.body);
  const normalized = email.toLowerCase();

  const rateCheck = checkCodeRateLimit(normalized);
  if (!rateCheck.allowed) {
    sendApiError(res, 429, "Too many attempts", "rate_limited", {
      retryAfter: rateCheck.retryAfterSec,
    });
    return;
  }

  const codeHash = createHash("sha256").update(code).digest("hex");
  const result = authDb.consumeLoginCode(normalized, codeHash);
  if (!result) {
    sendApiError(res, 401, "Invalid or expired code", "invalid_code");
    return;
  }

  const isAdmin = authDb.isEmailAdmin(result.email);
  const user = authDb.getOrCreateUser(result.email, isAdmin);

  const tokens = await issueTokens(user);
  setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
  res.json({ ok: true });
});

authRouter.post("/refresh", async (req, res) => {
  const cookieHeader = req.headers.cookie ?? "";
  const refreshCookie = parseCookie(cookieHeader, "refresh_token");
  if (!refreshCookie) {
    clearTokenCookies(res);
    sendApiError(res, 401, "No refresh token", "refresh_failed");
    return;
  }

  const result = await refreshTokens(refreshCookie);
  if ("error" in result) {
    clearTokenCookies(res);
    const code =
      result.error === "reused"
        ? ("token_reused" as const)
        : ("refresh_failed" as const);
    sendApiError(res, 401, "Refresh failed", code);
    return;
  }

  setTokenCookies(res, result.accessToken, result.refreshToken);
  res.json({ ok: true });
});

authRouter.post("/logout", async (req, res) => {
  const cookieHeader = req.headers.cookie ?? "";
  const refreshCookie = parseCookie(cookieHeader, "refresh_token");
  if (refreshCookie) {
    await revokeSession(refreshCookie);
  }
  clearTokenCookies(res);
  res.json({ ok: true });
});

authRouter.get("/me", (req, res) => {
  const user = req.jwtUser;
  if (!user) {
    sendApiError(res, 401, "Not authenticated", "not_authenticated");
    return;
  }
  res.json({ id: user.id, email: user.email, isAdmin: user.isAdmin });
});

authRouter.get("/me/people", requireAuth, (req, res) => {
  const userId = req.jwtUser!.id;
  const personIds = authDb.getUserPeople(userId);
  res.json({ personIds });
});

authRouter.put("/me/people", requireAuth, (req, res) => {
  const userId = req.jwtUser!.id;
  const { personIds } = parseWithSchema(updateMyPeopleBodySchema, req.body);
  const ids = personIds ?? [];

  authDb.setUserPeople(userId, ids);
  const stored = authDb.getUserPeople(userId);
  res.json({ personIds: stored });
});

function parseCookie(header: string, name: string): string | undefined {
  for (const part of header.split(";")) {
    const [key, ...val] = part.trim().split("=");
    if (key === name) return val.join("=");
  }
  return undefined;
}
