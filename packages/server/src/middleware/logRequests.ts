import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { logger, type Logger } from "../logger.js";

declare module "express-serve-static-core" {
  interface Request {
    log: Logger;
    requestId: string;
  }
}

/** Attach a request-scoped logger (`req.log`) and log the incoming request. */
export function logRequests(req: Request, _res: Response, next: NextFunction) {
  const requestId = randomUUID();
  req.requestId = requestId;
  req.log = logger.child({ requestId });
  req.log.info({ method: req.method, url: req.url }, "request received");

  next();
}
