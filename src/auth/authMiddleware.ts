import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { APP_SECRET } from "../config";
import invariant from "tiny-invariant";

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const userToken = req.session.userToken;

  if (!userToken) {
    res.status(401).send();
    return;
  }

  try {
    const user = jwt.verify(userToken, APP_SECRET);

    invariant(typeof user !== 'string', "Token unable to decode into JWT payload");

    req.session.user = user;

    next();
  } catch {
    res.status(401).send();
  }
}
