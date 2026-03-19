import type { Request, Response, NextFunction } from "express";
import session from "express-session";
import * as authDb from "./auth-db.js";
import { sendMagicLink } from "./email.js";

declare module "express-session" {
  interface SessionData {
    userId?: number;
    email?: string;
    isAdmin?: boolean;
  }
}

export interface AuthUser {
  id: number;
  email: string;
  isAdmin: boolean;
}

export function sessionMiddleware() {
  return session({
    secret: process.env.SESSION_SECRET ?? "family-media-manager-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  });
}

/** When AUTH_ENABLED=false, treat all requests as the FIRST_ADMIN_EMAIL user. */
export function impersonateFirstAdminWhenAuthDisabled(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (process.env.AUTH_ENABLED === "true") {
    next();
    return;
  }
  const email = process.env.FIRST_ADMIN_EMAIL?.trim();
  if (email) {
    const user = authDb.getOrCreateUser(email, true);
    req.session!.userId = user.id;
    req.session!.email = user.email;
    req.session!.isAdmin = user.isAdmin;
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (process.env.AUTH_ENABLED !== "true") {
    next();
    return;
  }
  if (req.session?.userId) {
    next();
  } else {
    res.status(401).json({ error: "Authentication required" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (process.env.AUTH_ENABLED !== "true") {
    next();
    return;
  }
  if (req.session?.isAdmin) {
    next();
  } else {
    res.status(403).json({ error: "Admin access required" });
  }
}

export function getAuthUser(req: Request): AuthUser | null {
  if (!req.session?.userId || !req.session?.email) return null;
  return {
    id: req.session.userId,
    email: req.session.email,
    isAdmin: !!req.session.isAdmin,
  };
}
