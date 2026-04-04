import type { Request } from "express";

const UI_PORT = process.env.UI_PORT ?? "5173";

/** Public URL for magic-link redirects and email links (from env or request). */
export function getMagicLinkBaseUrl(req: Request): string {
  const env = process.env.MAGIC_LINK_BASE_URL;
  if (env) return env.replace(/\/$/, "");

  const protocol = req.protocol ?? "http";
  const rawHost = typeof req.get === "function" ? req.get("host") : undefined;
  const host = rawHost === "localhost:3000" ? `localhost:${UI_PORT}` : rawHost;
  return `${protocol}://${host ?? `localhost:${UI_PORT}`}`;
}
