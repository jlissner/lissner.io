import type { Request, Response, NextFunction } from "express";
import session from "express-session";
import { sendApiError } from "../lib/api-error.js";
import * as authDb from "../db/auth.js";

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

let _sessionStore: session.Store | null = null;

export function sessionMiddleware() {
  const middleware = session({
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
  return (req: Request, res: Response, next: NextFunction) => {
    middleware(req, res, () => {
      _sessionStore = req.sessionStore;
      next();
    });
  };
}

export async function validateSessionFromCookie(
  cookieHeader: string | undefined
): Promise<AuthUser | null> {
  if (process.env.AUTH_ENABLED !== "true") {
    return null;
  }
  if (!cookieHeader || !_sessionStore) {
    return null;
  }

  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [key, ...val] = c.trim().split("=");
      return [key, val.join("=")];
    })
  );

  const sid = cookies["connect.sid"];
  if (!sid) {
    return null;
  }

  const sessionId = decodeURIComponent(sid);

  return new Promise((resolve) => {
    _sessionStore!.get(sessionId, (err, session) => {
      if (err || !session?.userId || !session?.email) {
        resolve(null);
        return;
      }
      resolve({
        id: session.userId,
        email: session.email,
        isAdmin: !!session.isAdmin,
      });
    });
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
    sendApiError(res, 401, "Authentication required", "auth_required");
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
    sendApiError(res, 403, "Admin access required", "admin_required");
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
