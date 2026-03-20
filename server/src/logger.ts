import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import pino from "pino";
import { pinoHttp } from "pino-http";

const level =
  process.env.LOG_LEVEL ??
  (process.env.NODE_ENV === "production" ? "info" : "debug");

export const logger = pino({ level });

/** HTTP request logging + `x-request-id` (incoming header or generated). */
export const requestLogger = pinoHttp({
  logger,
  genReqId: (req: IncomingMessage, res: ServerResponse) => {
    const raw = req.headers["x-request-id"];
    const fromHeader = Array.isArray(raw) ? raw[0] : raw;
    const id =
      typeof fromHeader === "string" && fromHeader.trim() ? fromHeader.trim() : randomUUID();
    res.setHeader("x-request-id", id);
    return id;
  },
});
