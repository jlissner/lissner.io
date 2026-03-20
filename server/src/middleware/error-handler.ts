import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { logger } from "../logger.js";
import { isHttpError } from "../lib/http-error.js";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (isHttpError(err)) {
    res.status(err.statusCode).json({
      error: err.message,
      ...(err.code ? { code: err.code } : {}),
    });
    return;
  }
  if (err instanceof ZodError) {
    const message =
      err.issues.map((e) => e.message ?? "Invalid input").join("; ") || "Invalid input";
    res.status(400).json({ error: message, code: "validation_error" });
    return;
  }
  const log = req.log ?? logger;
  log.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
}
