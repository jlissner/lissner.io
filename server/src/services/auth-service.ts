import type { Request } from "express";

/** Public URL for magic-link redirects and email links (from env or request). */
export function getMagicLinkBaseUrl(req: Request): string {
  const env = process.env.MAGIC_LINK_BASE_URL;
  if (env) return env.replace(/\/$/, "");

  const protocol = req.protocol ?? "http";
  const rawHost = typeof req.get === "function" ? req.get("host") : undefined;
  const host = rawHost === "localhost:3000" ? "localhost:5173" : rawHost;
  return `${protocol}://${host ?? "localhost:5173"}`;
}
