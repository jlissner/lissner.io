import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { sendApiError } from "../lib/api-error.js";
import * as authDb from "../db/auth.js";
import { sendMagicLink } from "../email.js";
import { getMagicLinkBaseUrl } from "../services/auth-service.js";
import { logger } from "../logger.js";
import { parseWithSchema } from "../validation/parse.js";
import { magicLinkBodySchema, updateMyPeopleBodySchema } from "../validation/auth-schemas.js";

export const authRouter = Router();

authRouter.get("/config", (_req, res) => {
  res.json({ authEnabled: process.env.AUTH_ENABLED === "true" });
});

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session?.userId) next();
  else sendApiError(res, 401, "Authentication required", "auth_required");
}

authRouter.post("/magic-link", async (req, res) => {
  const { email } = parseWithSchema(magicLinkBodySchema, req.body);

  const normalized = email.toLowerCase();
  if (!authDb.isEmailWhitelisted(normalized)) {
    sendApiError(
      res,
      403,
      "Email not on whitelist. Contact an admin to get access.",
      "not_whitelisted"
    );
    return;
  }

  const { token } = authDb.createMagicLinkToken(normalized);
  const baseUrl = getMagicLinkBaseUrl();
  const link = `${baseUrl}/api/auth/verify?token=${token}`;

  try {
    await sendMagicLink(normalized, link);
    res.json({ sent: true });
  } catch (err) {
    logger.error({ err, email: normalized }, "Magic link send error");
    sendApiError(res, 500, "Failed to send magic link", "magic_link_send_failed");
  }
});

authRouter.get("/verify", async (req, res) => {
  const token = req.query.token as string;
  const baseUrl = getMagicLinkBaseUrl();
  if (!token) {
    res.redirect(`${baseUrl}/?error=missing_token`);
    return;
  }

  const result = authDb.consumeMagicLinkToken(token);
  if (!result) {
    res.redirect(`${baseUrl}/?error=invalid_token`);
    return;
  }

  const isAdmin = authDb.isEmailAdmin(result.email);
  const user = authDb.getOrCreateUser(result.email, isAdmin);

  req.session!.userId = user.id;
  req.session!.email = user.email;
  req.session!.isAdmin = user.isAdmin;

  res.redirect(`${baseUrl}/`);
});

authRouter.post("/logout", (req, res) => {
  if (!req.session) {
    res.json({ ok: true });
    return;
  }
  req.session.destroy((err) => {
    if (err) {
      logger.error({ err }, "Session destroy failed");
      sendApiError(res, 500, "Logout failed", "internal_error");
      return;
    }
    res.json({ ok: true });
  });
});

authRouter.get("/me", (req, res) => {
  const user = req.session?.userId
    ? {
        id: req.session.userId,
        email: req.session.email,
        isAdmin: req.session.isAdmin,
      }
    : null;

  if (!user) {
    sendApiError(res, 401, "Not authenticated", "not_authenticated");
    return;
  }

  res.json(user);
});

authRouter.get("/me/people", requireAuth, (req, res) => {
  const userId = req.session!.userId!;
  const personIds = authDb.getUserPeople(userId);
  res.json({ personIds });
});

authRouter.put("/me/people", requireAuth, (req, res) => {
  const userId = req.session!.userId!;
  const { personIds } = parseWithSchema(updateMyPeopleBodySchema, req.body);
  const ids = personIds ?? [];

  authDb.setUserPeople(userId, ids);
  const stored = authDb.getUserPeople(userId);
  res.json({ personIds: stored });
});
