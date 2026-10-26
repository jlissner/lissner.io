import type { Request, Response, NextFunction } from "express";
import { sendApiError } from "../lib/api-error.js";
import { verifyAccessToken } from "./jwt.js";

declare module "express-serve-static-core" {
  interface Request {
    jwtUser?: AuthUser | null;
  }
}

type AuthUser = {
  id: number;
  email: string;
  isAdmin: boolean;
};

function parseCookie(header: string, name: string): string | undefined {
  for (const part of header.split(";")) {
    const [key, ...val] = part.trim().split("=");
    if (key === name) return val.join("=");
  }
  return undefined;
}

export function jwtMiddleware() {
  return async (req: Request, _res: Response, next: NextFunction) => {
    req.jwtUser = null;
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) {
      next();
      return;
    }
    const token = parseCookie(cookieHeader, "access_token");
    if (!token) {
      next();
      return;
    }
    const payload = await verifyAccessToken(token);
    if (payload) {
      req.jwtUser = {
        id: payload.sub,
        email: payload.email,
        isAdmin: payload.isAdmin,
      };
    }
    next();
  };
}

export async function validateSessionFromCookie(
  cookieHeader: string | undefined,
): Promise<AuthUser | null> {
  if (!cookieHeader) {
    return null;
  }
  const token = parseCookie(cookieHeader, "access_token");
  if (!token) {
    return null;
  }
  const payload = await verifyAccessToken(token);
  if (!payload) {
    return null;
  }
  return { id: payload.sub, email: payload.email, isAdmin: payload.isAdmin };
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.jwtUser) {
    next();
  } else {
    sendApiError(res, 401, "Authentication required", "auth_required");
  }
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.jwtUser?.isAdmin) {
    next();
  } else {
    sendApiError(res, 403, "Admin access required", "admin_required");
  }
}

export function getAuthUser(req: Request): AuthUser | null {
  return req.jwtUser ?? null;
}
