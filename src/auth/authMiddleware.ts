import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import invariant from "tiny-invariant";
import { APP_SECRET, NOT_AUTHORIZED } from "../config";

export function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const userToken = req.headers.authorization;

  invariant(userToken, NOT_AUTHORIZED);

  const user = jwt.verify(userToken.replace('Bearer ', ''), APP_SECRET);

  invariant(typeof user !== "string", NOT_AUTHORIZED);

  req.session.user = user;

  next();
}
