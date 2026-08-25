import { resolveLissnerCorsOrigin } from "@shared/lissner-cors.js";
import type { IncomingMessage, ServerResponse } from "node:http";

const setCorsHeaders = (
  req: IncomingMessage,
  res: ServerResponse,
  allowedOrigin: string,
): void => {
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Vary", "Origin");
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, POST, OPTIONS");
    const requestHeaders = req.headers["access-control-request-headers"];
    if (requestHeaders) {
      res.setHeader("Access-Control-Allow-Headers", requestHeaders);
    }
  }
};

export const handleCors = (
  req: IncomingMessage,
  res: ServerResponse,
): boolean => {
  const resolved = resolveLissnerCorsOrigin(req.headers.origin);
  if (resolved === false) {
    if (req.method === "OPTIONS") {
      res.writeHead(403);
      res.end();
      return true;
    }
    return false;
  }

  if (typeof resolved === "string") {
    setCorsHeaders(req, res, resolved);
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return true;
  }

  return false;
};
