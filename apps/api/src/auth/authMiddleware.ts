import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import invariant from "tiny-invariant";
import { APP_SECRET, NOT_AUTHORIZED } from "../config";

export function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const { authorization } = req.headers;

  invariant(authorization, NOT_AUTHORIZED);

  const token = authorization.replace('Bearer ', '');
  const user = jwt.verify(token, APP_SECRET);

  invariant(typeof user !== "string", NOT_AUTHORIZED);

  req.session.user = user;

  next();
}
