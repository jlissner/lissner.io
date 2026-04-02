import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import pino from "pino";
import { pinoHttp } from "pino-http";

/**
 * Env:
 * - `LOG_LEVEL` — pino level (default `info`; use `debug` when tracing app code).
 * - `HTTP_LOG_VERBOSE=1` — log full req/res (headers, etc.) for each HTTP line.
 * - `HTTP_ACCESS_LOG=1` — in non-production, log successful requests (2xx/3xx); default off so
 *   `logger.info` / `req.log.info` scratch logs are easy to spot.
 */
const level = process.env.LOG_LEVEL ?? "info";

const httpLogVerbose =
  process.env.HTTP_LOG_VERBOSE === "1" || process.env.HTTP_LOG_VERBOSE === "true";

const logHttpSuccessInDev =
  process.env.HTTP_ACCESS_LOG === "1" || process.env.HTTP_ACCESS_LOG === "true";

const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({ level });

const minimalSerializers: pino.LoggerOptions["serializers"] = {
  err: pino.stdSerializers.err,
  req: (req: IncomingMessage) => {
    const r = req as IncomingMessage & { id?: string };
    return {
      id: r.id,
      method: r.method,
      url: r.url,
    };
  },
  res: (res: ServerResponse) => ({
    statusCode: res.statusCode,
  }),
};

const verboseSerializers: pino.LoggerOptions["serializers"] = {
  err: pino.stdSerializers.err,
  req: pino.stdSerializers.req,
  res: pino.stdSerializers.res,
};

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
  serializers: httpLogVerbose ? verboseSerializers : minimalSerializers,
  quietReqLogger: !httpLogVerbose,
  customSuccessMessage: (req, res, responseTime) =>
    `${req.method} ${req.url ?? ""} ${res.statusCode} ${responseTime}ms`,
  customLogLevel: (_req, res, err) => {
    if (err) return "error";
    const code = res.statusCode;
    if (code >= 500) return "error";
    if (code >= 400) return "warn";
    if (!isProduction && !logHttpSuccessInDev) return "silent";
    return "info";
  },
});
