import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import * as authDb from "../db/auth.js";
import { sendMagicLink } from "../email.js";
import { getMagicLinkBaseUrl } from "../services/auth-service.js";
import { logger } from "../logger.js";

export const authRouter = Router();

authRouter.get("/config", (_req, res) => {
  res.json({ authEnabled: process.env.AUTH_ENABLED === "true" });
});

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session?.userId) next();
  else res.status(401).json({ error: "Authentication required" });
}

authRouter.post("/magic-link", async (req, res) => {
  const email = req.body?.email?.trim();
  if (!email) {
    res.status(400).json({ error: "Email required" });
    return;
  }

  const normalized = email.toLowerCase();
  if (!authDb.isEmailWhitelisted(normalized)) {
    res.status(403).json({ error: "Email not on whitelist. Contact an admin to get access." });
    return;
  }

  const { token } = authDb.createMagicLinkToken(normalized);
  const baseUrl = getMagicLinkBaseUrl(req);
  const link = `${baseUrl}/api/auth/verify?token=${token}`;

  try {
    await sendMagicLink(normalized, link);
    res.json({ sent: true });
  } catch (err) {
    logger.error({ err, email: normalized }, "Magic link send error");
    res.status(500).json({ error: "Failed to send magic link" });
  }
});

authRouter.get("/verify", async (req, res) => {
  const token = req.query.token as string;
  const baseUrl = getMagicLinkBaseUrl(req);
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
  req.session?.destroy(() => {});
  res.json({ ok: true });
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
    res.status(401).json({ error: "Not authenticated" });
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
  const personIds = Array.isArray(req.body?.personIds)
    ? (req.body.personIds as number[]).filter((p: unknown) => typeof p === "number")
    : [];

  authDb.setUserPeople(userId, personIds);
  const stored = authDb.getUserPeople(userId);
  res.json({ personIds: stored });
});
