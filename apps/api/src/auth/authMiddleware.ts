import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import invariant from "tiny-invariant";
import { APP_SECRET, NOT_AUTHORIZED } from "../config";

// Extend Express Request type to include user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
}

export function authMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
) {
  const { authorization } = req.headers;

  invariant(authorization, NOT_AUTHORIZED);

  const token = authorization.replace("Bearer ", "");
  console.log("Verifying token:", { token });

  try {
    const user = jwt.verify(token, APP_SECRET);
    console.log("Verified token payload:", user);

    invariant(typeof user !== "string", NOT_AUTHORIZED);
    invariant(user.sub, NOT_AUTHORIZED);

    // Set the user ID in the request for use in routes
    req.user = { id: user.sub };
    console.log("Set user in request:", req.user);

    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    throw error;
  }
}
