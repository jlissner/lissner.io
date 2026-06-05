import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { apiErrorCodeForHttpStatus } from "../lib/api-error.js";
import { isHttpError } from "../lib/http-error.js";
import { logger } from "../logger.js";

/** Multer/busboy when the client disconnects or the socket closes before the body finishes. */
function isUploadClientDisconnect(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (err.message === "Request aborted" || err.message === "Request closed")
    return true;
  const code = (err as NodeJS.ErrnoException).code;
  return code === "ECONNRESET" || code === "EPIPE" || code === "ECONNABORTED";
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const log = req.log ?? logger;
  if (isHttpError(err)) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code ?? apiErrorCodeForHttpStatus(err.statusCode),
    });
    return;
  }
  if (err instanceof ZodError) {
    const message =
      err.issues.map((e) => e.message ?? "Invalid input").join("; ") ||
      "Invalid input";
    res.status(400).json({ error: message, code: "validation_error" });
    return;
  }
  if (isUploadClientDisconnect(err)) {
    log.warn(
      { err },
      "Upload interrupted (client disconnected or connection closed)",
    );
    if (!res.headersSent) {
      res.status(400).json({
        error: "The upload was interrupted (connection closed). Try again.",
        code: "upload_interrupted",
      });
    }
    return;
  }

  log.error({ err }, "Unhandled error");

  res
    .status(500)
    .json({ error: "Internal server error", code: "internal_error" });
}
